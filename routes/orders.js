const express = require("express");
const mongoose = require("mongoose");
const Order = require("../schema/order");
const Product = require("../schema/product");
const User = require("../schema/user");
const E = require("../lib/escrow");
const rateLimit = require("../lib/rateLimit");
const { fetchUser } = require("../lib/auth");

const router = express.Router();
router.use(fetchUser);

const publicBase = (req) => (process.env.APP_URL || `${req.protocol}://${req.get("host")}`).replace(/\/+$/, "");
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch((e) => {
  if (e instanceof E.EscrowError) return res.status(e.status).json({ success: false, message: e.message, code: e.code });
  next(e);
});
const isId = (v) => mongoose.isValidObjectId(v) && String(v).length === 24;
const createLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 15, key: (r) => `order:${r.user?.id}`, message: "You're creating orders too quickly. Please wait a few minutes." });
const actionLimiter = rateLimit({ windowMs: 60 * 1000, max: 30, key: (r) => `orderact:${r.user?.id}` });

// Turn the request body into [{listingId, qty}]. Supports a single listing, or "everything from seller X in my cart".
async function linesFrom(req) {
  const b = req.body || {};
  if (b.fromCartSeller) {
    if (!isId(b.fromCartSeller)) throw new E.EscrowError("Invalid seller.");
    const u = await User.findById(req.user.id).select("cart");
    const cart = u?.cart || {};
    const pids = Object.keys(cart).filter((k) => Number(cart[k]) > 0).map(Number);
    const prods = pids.length ? await Product.find({ id: { $in: pids }, owner: b.fromCartSeller }).select("_id id") : [];
    if (!prods.length) throw new E.EscrowError("Your cart has no items from this seller.", 400, "empty");
    return prods.map((p) => ({ listingId: String(p._id), qty: Math.min(10, Number(cart[p.id]) || 1) }));
  }
  return (Array.isArray(b.items) ? b.items : []).map((i) => ({ listingId: i?.listingId, qty: i?.qty ?? 1 }));
}

// POST /api/orders/quote → fee breakdown, nothing is saved
router.post("/quote", wrap(async (req, res) => {
  const q = await E.buildQuote(req.user.id, await linesFrom(req));
  res.json({ success: true, seller: q.seller, items: q.items.map((i) => ({ listing: String(i.listing), title: i.title, image: i.image, unitPrice: i.unitPrice, qty: i.qty })), itemTotal: q.itemTotal, buyerFee: q.buyerFee, total: q.total });
}));

// POST /api/orders → create the order and return the payment link
router.post("/", createLimiter, wrap(async (req, res) => {
  const { order, authorizationUrl } = await E.createOrder({ buyerId: req.user.id, lines: await linesFrom(req), delivery: req.body.delivery, appUrl: publicBase(req) });
  res.status(201).json({ success: true, orderId: String(order._id), orderNo: order.orderNo, authorizationUrl });
}));

// GET /api/orders?role=buying|selling&state=active|closed
router.get("/", wrap(async (req, res) => {
  const role = req.query.role === "selling" ? "seller" : "buyer";
  const closed = ["completed", "refunded", "cancelled", "expired"];
  const filter = { [role]: req.user.id };
  if (req.query.state === "active") filter.status = { $nin: closed };
  else if (req.query.state === "closed") filter.status = { $in: closed };
  const rows = await Order.find(filter).sort({ createdAt: -1 }).limit(100);
  const orders = await Promise.all(rows.map((o) => E.view(o, req.user)));
  const todo = orders.filter((o) => (o.role === "seller" && o.status === "paid") || (o.role === "buyer" && ["delivered", "awaiting_payment"].includes(o.status))).length;
  res.json({ success: true, orders, todo });
}));

// GET /api/orders/summary → numbers for the dashboard badge and the Escrow header
router.get("/summary", wrap(async (req, res) => {
  const uid = req.user.id;
  const [toShip, toConfirm, held] = await Promise.all([
    Order.countDocuments({ seller: uid, status: "paid" }),
    Order.countDocuments({ buyer: uid, status: "delivered" }),
    Order.find({ $or: [{ buyer: uid }, { seller: uid }], status: { $in: ["paid", "delivered", "disputed"] } }),
  ]);
  const mine = (o, f) => String(o[f]) === uid;
  res.json({
    success: true, toShip, toConfirm, todo: toShip + toConfirm,
    buyerHeld: held.filter((o) => mine(o, "buyer")).reduce((s, o) => s + o.total, 0),
    sellerPending: held.filter((o) => mine(o, "seller")).reduce((s, o) => s + o.sellerReceives, 0),
  });
}));

router.get("/:id", wrap(async (req, res) => {
  if (!isId(req.params.id)) return res.status(404).json({ success: false, message: "Order not found." });
  const o = await Order.findById(req.params.id);
  if (!o) return res.status(404).json({ success: false, message: "Order not found." });
  res.json({ success: true, order: await E.view(o, req.user) });
}));

// Buyer came back from the payment page (or pressed "I've paid, refresh")
router.post("/:id/verify", actionLimiter, wrap(async (req, res) => {
  const o0 = await Order.findOne({ _id: req.params.id, buyer: req.user.id });
  if (!o0) return res.status(404).json({ success: false, message: "Order not found." });
  const r = await E.verifyAndMark(o0._id);
  res.json({ success: true, order: await E.view(r.order || o0, req.user) });
}));

const act = (name, fn) => router.post(`/:id/${name}`, actionLimiter, wrap(async (req, res) => {
  if (!isId(req.params.id)) return res.status(404).json({ success: false, message: "Order not found." });
  const out = await fn(req);
  res.json({ success: true, order: await E.view(out, req.user) });
}));
act("ship", (req) => E.markDelivered(req.params.id, req.user.id, req.body.note));
act("confirm", (req) => E.confirmReceived(req.params.id, req.user.id));
act("dispute", (req) => E.openDispute(req.params.id, req.user.id, req.body.reason, req.body.details));
act("cancel", async (req) => {
  const o = await Order.findById(req.params.id);
  if (!o) throw new E.EscrowError("Order not found.", 404);
  if (String(o.buyer) === req.user.id) return E.cancelUnpaid(o._id, req.user.id);
  if (String(o.seller) === req.user.id) return E.sellerCancel(o._id, req.user.id, req.body.reason);
  throw new E.EscrowError("Order not found.", 404);
});

module.exports = router;
