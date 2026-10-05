// ─────────────────────────────────────────────────────────────────────────────
//  Escrow engine. Money flow:
//
//    buyer ──pays──▶ Paystack (your balance)  ── held ──▶  seller delivers ──▶ buyer confirms
//                                                                    │                │
//                                                         (no delivery in N days)     ▼
//                                                                    ▼        payout to seller (minus commission)
//                                                              refund to buyer
//
//  RULES THAT KEEP MONEY SAFE
//   • Amounts are always computed on the server from the listing price in the database.
//   • Every state change is ONE atomic update guarded by the current status ("only if still paid"),
//     so double clicks, retried webhooks and two servers can never pay out or refund twice.
//   • A payment only counts after Paystack confirms it AND the amount equals the order total.
//   • Payout reference is deterministic ("gmpo-<orderId>") so a retry can never double-pay.
// ─────────────────────────────────────────────────────────────────────────────
const mongoose = require("mongoose");
const Order = require("../schema/order");
const Product = require("../schema/product");
const User = require("../schema/user");
const Counter = require("../schema/counter");
const L = require("./listings");
const fees = require("./fees");
const ps = require("./paystack");
const { notify } = require("./notify");

const DAY = 24 * 60 * 60 * 1000;
const num = (v, d) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : d; };
const settings = () => ({
  payWindowMs: num(process.env.ESCROW_PAY_WINDOW_MIN, 30) * 60 * 1000,        // time to complete payment
  deliverDays: num(process.env.ESCROW_SELLER_DELIVER_DAYS, 7),                 // seller must deliver within this
  confirmDays: num(process.env.ESCROW_CONFIRM_DAYS, 3),                        // buyer must confirm / dispute within this
});

class EscrowError extends Error {
  constructor(message, status = 400, code = "bad_request") { super(message); this.status = status; this.code = code; }
}
const plain = (d) => (d && typeof d.toObject === "function" ? d.toObject() : d);
const ev = (type, by, role, note) => ({ at: new Date(), by: by || undefined, role, type, note });
const idStr = (x) => String(x?._id || x);
const FAR = () => new Date(Date.now() + 3650 * DAY);

async function nextSeq(name) {
  const c = await Counter.findOneAndUpdate({ _id: name }, { $inc: { seq: 1 } }, { new: true, upsert: true });
  return c.seq;
}

// ── reservations (stop two buyers paying for the same item) ──────────────────
async function reserve(products, orderId, until) {
  const done = [];
  for (const p of products) {
    const r = await Product.updateOne(
      { _id: p._id, $or: [{ reservedUntil: null }, { reservedUntil: { $lt: new Date() } }, { reservedBy: orderId }] },
      { $set: { reservedBy: orderId, reservedUntil: until } }
    );
    if (!r.matchedCount) {
      if (done.length) await Product.updateMany({ _id: { $in: done }, reservedBy: orderId }, { $set: { reservedBy: null, reservedUntil: null } });
      throw new EscrowError(`"${p.title}" is being bought by someone else right now. Please try again later.`, 409, "reserved");
    }
    done.push(p._id);
  }
}
const unreserve = (order) =>
  Product.updateMany({ _id: { $in: order.items.map((i) => i.listing) }, reservedBy: order._id }, { $set: { reservedBy: null, reservedUntil: null } });

// ── 1. Quote + create ────────────────────────────────────────────────────────
// lines: [{ listingId, qty }]   → validated products + totals (nothing is saved)
async function buildQuote(buyerId, lines) {
  if (!ps.enabled()) throw new EscrowError("Secure checkout isn't available yet.", 503, "payments_off");
  if (!Array.isArray(lines) || !lines.length || lines.length > 10) throw new EscrowError("Choose between 1 and 10 items.");
  const ids = [];
  for (const l of lines) {
    if (!mongoose.isValidObjectId(l?.listingId)) throw new EscrowError("One of the items is invalid.");
    if (ids.includes(String(l.listingId))) throw new EscrowError("An item is listed twice.");
    ids.push(String(l.listingId));
  }
  const products = await Product.find({ $and: [L.liveQuery(), { _id: { $in: ids } }] });
  if (products.length !== ids.length) throw new EscrowError("One of the items is no longer available.", 409, "unavailable");

  const sellerIds = new Set(products.map((p) => (p.owner ? String(p.owner) : "")));
  if (sellerIds.has("")) throw new EscrowError("This item is sold by GeneralMarket directly and can't be bought with escrow yet.", 400, "no_seller");
  if (sellerIds.size > 1) throw new EscrowError("Items from different sellers must be paid for separately.");
  const sellerId = [...sellerIds][0];
  if (sellerId === String(buyerId)) throw new EscrowError("You can't buy your own listing.", 400, "own_listing");

  const seller = plain(await User.findById(sellerId).select("name username avatar payout status idVerification"));
  if (!seller || seller.status === "suspended") throw new EscrowError("This seller can't receive payments right now.", 400, "seller_unavailable");
  if (!seller.payout?.recipientCode) throw new EscrowError("This seller hasn't set up a payout account yet, so escrow isn't available. You can message them instead.", 400, "seller_no_payout");
  if (process.env.ESCROW_REQUIRE_VERIFIED_SELLER === "true" && seller.idVerification?.status !== "verified") throw new EscrowError("Escrow is only available for ID-verified sellers.", 400, "seller_unverified");

  const byId = new Map(products.map((p) => [String(p._id), p]));
  const items = lines.map((l) => {
    const p = byId.get(String(l.listingId));
    const qty = Number(l.qty ?? 1);
    if (!Number.isInteger(qty) || qty < 1 || qty > 10) throw new EscrowError("Quantity must be between 1 and 10.");
    if ((p.priceType || "fixed") !== "fixed" || !(p.price > 0)) throw new EscrowError(`"${p.title}" has no fixed price, so it can't be bought with escrow. Message the seller to agree a price.`, 400, "no_price");
    if (p.reservedUntil && p.reservedUntil > new Date()) throw new EscrowError(`"${p.title}" is being bought by someone else right now.`, 409, "reserved");
    return { listing: p._id, pid: p.id, title: p.title, image: p.images?.[0], unitPrice: Math.round(p.price * 100), qty };
  });

  const cfg = fees.config();
  const itemTotal = items.reduce((s, i) => s + i.unitPrice * i.qty, 0);
  if (itemTotal < cfg.minOrder) throw new EscrowError(`The minimum escrow order is ₦${(cfg.minOrder / 100).toLocaleString()}.`, 400, "too_small");
  if (itemTotal > cfg.maxOrder) throw new EscrowError(`The maximum escrow order is ₦${(cfg.maxOrder / 100).toLocaleString()}. For larger purchases please contact support.`, 400, "too_large");

  return { products, items, seller: { id: sellerId, name: seller.name, username: seller.username, avatar: seller.avatar, verified: seller.idVerification?.status === "verified" }, ...fees.breakdown(itemTotal, cfg) };
}

async function createOrder({ buyerId, lines, delivery = {}, appUrl }) {
  const q = await buildQuote(buyerId, lines);
  const buyer = plain(await User.findById(buyerId).select("name email phone status"));
  if (!buyer || buyer.status === "suspended") throw new EscrowError("Your account can't make payments.", 403);
  if (!buyer.email) throw new EscrowError("Add an email address to your profile before paying.", 400);

  const method = delivery.method === "delivery" ? "delivery" : "meetup";
  const address = String(delivery.address || "").trim().slice(0, 300);
  const phone = String(delivery.phone || buyer.phone || "").trim().slice(0, 30);
  if (method === "delivery" && address.length < 8) throw new EscrowError("Enter the delivery address.");
  if (phone.replace(/\D/g, "").length < 7) throw new EscrowError("Enter a phone number the seller can reach you on.");

  const s = settings();
  const _id = new mongoose.Types.ObjectId();
  await reserve(q.products, _id, new Date(Date.now() + s.payWindowMs + 5 * 60 * 1000));

  const orderNo = "GM" + String(100000 + (await nextSeq("order")));
  const reference = `gm-${orderNo.toLowerCase()}-${Math.random().toString(36).slice(2, 8)}`;
  let order;
  try {
    order = plain(await Order.create({
      _id, orderNo, buyer: buyerId, seller: q.seller.id, items: q.items,
      itemTotal: q.itemTotal, buyerFee: q.buyerFee, sellerCommission: q.sellerCommission, total: q.total, sellerReceives: q.sellerReceives,
      delivery: { method, address, phone, note: String(delivery.note || "").trim().slice(0, 500) },
      paystack: { reference }, expiresAt: new Date(Date.now() + s.payWindowMs),
      events: [ev("created", buyerId, "buyer", `Order placed for ₦${(q.total / 100).toLocaleString()}`)],
    }));
  } catch (e) { await Product.updateMany({ _id: { $in: q.products.map((p) => p._id) }, reservedBy: _id }, { $set: { reservedBy: null, reservedUntil: null } }); throw e; }

  try {
    const init = await ps.initialize({ email: buyer.email, amount: order.total, reference, callbackUrl: `${appUrl}/api/payments/callback`, appUrl, metadata: { orderId: String(order._id), orderNo } });
    await Order.updateOne({ _id: order._id }, { $set: { "paystack.accessCode": init.accessCode, "paystack.authorizationUrl": init.authorizationUrl } });
    return { order: { ...order, paystack: { ...order.paystack, authorizationUrl: init.authorizationUrl } }, authorizationUrl: init.authorizationUrl };
  } catch (e) {
    await Order.updateOne({ _id: order._id }, { $set: { status: "cancelled" }, $push: { events: ev("cancelled", null, "system", `Could not start payment: ${e.message}`) } });
    await unreserve(order);
    throw new EscrowError("We couldn't start the payment. Please try again in a moment.", 502, "gateway");
  }
}

// ── 2. Payment confirmed ─────────────────────────────────────────────────────
// Called from the webhook, the browser callback and the maintenance job: all idempotent.
async function markPaid(reference, gw, via = "webhook") {
  const order = plain(await Order.findOne({ "paystack.reference": reference }));
  if (!order) return { ignored: true };
  if (!["awaiting_payment", "expired", "cancelled"].includes(order.status)) return { order, already: true };
  if (!gw || gw.status !== "success") return { order, pending: true };

  if (Number(gw.amount) !== order.total || String(gw.currency || "NGN") !== "NGN") {
    await Order.updateOne({ _id: order._id, status: { $in: ["awaiting_payment", "expired", "cancelled"] } }, { $set: { status: "review" }, $addToSet: { flags: "amount_mismatch" }, $push: { events: ev("review", null, "system", `Paystack reported ${gw.amount} ${gw.currency} but the order total is ${order.total}`) } });
    return { order: plain(await Order.findById(order._id)), mismatch: true };
  }

  const now = new Date();
  const common = { "paystack.fees": Number(gw.fees) || 0, "paystack.channel": gw.channel || null, "paystack.txId": gw.id || null, "paystack.paidAt": gw.paid_at ? new Date(gw.paid_at) : now, paidAt: now };

  if (order.status !== "awaiting_payment") {
    // The buyer paid after we had already expired/cancelled the order → give the money straight back.
    await Order.updateOne({ _id: order._id }, { $set: common, $addToSet: { flags: "late_payment" } });
    try { await refundOrder(order._id, "Payment arrived after the order had expired", null, "system"); } catch { /* recorded on the order */ }
    return { order: plain(await Order.findById(order._id)), lateRefund: true };
  }

  const updated = plain(await Order.findOneAndUpdate(
    { _id: order._id, status: "awaiting_payment" },
    { $set: { ...common, status: "paid", sellerDeadline: new Date(now.getTime() + settings().deliverDays * DAY) }, $push: { events: ev("paid", order.buyer, "buyer", `Payment received (${via}). Funds are held in escrow.`) } },
    { new: true }
  ));
  if (!updated) return { order: plain(await Order.findById(order._id)), already: true };

  await Product.updateMany({ _id: { $in: updated.items.map((i) => i.listing) }, reservedBy: updated._id }, { $set: { reservedUntil: FAR() } });
  await User.updateOne({ _id: updated.buyer }, { $unset: Object.fromEntries(updated.items.map((i) => [`cart.${i.pid}`, ""])) });
  await notify(updated.buyer, updated.seller, updated.items[0]?.listing && { _id: updated.items[0].listing, title: updated.items[0].title, image: updated.items[0].image },
    `💰 Order ${updated.orderNo} is paid. The money is held safely in escrow. Please deliver the item (${updated.delivery.method === "delivery" ? "to " + updated.delivery.address : "meet up"}) and mark it as delivered in Dashboard → Escrow. You'll be paid when I confirm.`);
  return { order: updated };
}

// ── 3. State changes by people ───────────────────────────────────────────────
async function move(id, from, filter, set, event) {
  const o = plain(await Order.findOneAndUpdate({ _id: id, status: { $in: from }, ...filter }, { $set: set, $push: { events: event } }, { new: true }));
  if (!o) {
    const cur = plain(await Order.findById(id));
    throw new EscrowError(cur ? `This order can't be changed right now (it is "${cur.status.replace("_", " ")}").` : "Order not found.", cur ? 409 : 404, "bad_state");
  }
  return o;
}
const firstItem = (o) => o.items[0] && { _id: o.items[0].listing, title: o.items[0].title, image: o.items[0].image };

async function markDelivered(orderId, sellerId, note) {
  const now = new Date();
  const o = await move(orderId, ["paid"], { seller: sellerId },
    { status: "delivered", deliveredAt: now, autoReleaseAt: new Date(now.getTime() + settings().confirmDays * DAY) },
    ev("delivered", sellerId, "seller", note ? String(note).slice(0, 300) : "Seller marked the item as delivered"));
  await notify(o.seller, o.buyer, firstItem(o), `📦 The seller marked order ${o.orderNo} as delivered. Please check the item and confirm in Dashboard → Escrow. If you do nothing, the payment is released to the seller automatically in ${settings().confirmDays} days. Found a problem? Open a dispute before then.`);
  return o;
}

async function confirmReceived(orderId, buyerId) {
  const o = await move(orderId, ["paid", "delivered"], { buyer: buyerId }, { status: "completed", completedAt: new Date() }, ev("confirmed", buyerId, "buyer", "Buyer confirmed the item was received"));
  return finalize(o, "buyer");
}

async function openDispute(orderId, buyerId, reason, details) {
  const r = String(reason || "").trim().slice(0, 100);
  if (!r) throw new EscrowError("Choose a reason for the dispute.");
  const o = await move(orderId, ["paid", "delivered"], { buyer: buyerId },
    { status: "disputed", "dispute.openedBy": buyerId, "dispute.reason": r, "dispute.details": String(details || "").trim().slice(0, 1500), "dispute.openedAt": new Date() },
    ev("disputed", buyerId, "buyer", r));
  await notify(o.buyer, o.seller, firstItem(o), `⚠️ I opened a dispute on order ${o.orderNo}: ${r}. The payment is frozen until GeneralMarket reviews it.`);
  return o;
}

async function cancelUnpaid(orderId, buyerId) {
  const o = await move(orderId, ["awaiting_payment"], { buyer: buyerId }, { status: "cancelled" }, ev("cancelled", buyerId, "buyer", "Buyer cancelled before paying"));
  await unreserve(o);
  return o;
}

async function sellerCancel(orderId, sellerId, reason) {
  const cur = plain(await Order.findOne({ _id: orderId, seller: sellerId }));
  if (!cur) throw new EscrowError("Order not found.", 404);
  if (cur.status !== "paid") throw new EscrowError("You can only cancel before marking the order as delivered.", 409, "bad_state");
  return refundOrder(orderId, String(reason || "Seller cancelled the order").slice(0, 200), sellerId, "seller");
}

// ── 4. Closing an order ──────────────────────────────────────────────────────
async function finalize(order, role) {
  await Product.updateMany({ _id: { $in: order.items.map((i) => i.listing) }, owner: order.seller }, { $set: { status: "sold", soldAt: new Date(), reservedBy: null, reservedUntil: null } });
  await notify(order.buyer, order.seller, firstItem(order), role === "admin"
    ? `✅ Order ${order.orderNo} was reviewed and released to you. Your payout is on its way.`
    : `✅ Order ${order.orderNo} is confirmed. Your payout of ₦${(order.sellerReceives / 100).toLocaleString()} is being sent to your bank account.`);
  return release(order._id);
}

// Send the seller their money (itemTotal − commission). Safe to call repeatedly.
async function release(orderId) {
  const order = plain(await Order.findById(orderId));
  if (!order || order.status !== "completed") throw new EscrowError("Only completed orders can be paid out.", 409);
  if (order.payout?.status === "paid") return order;
  const seller = plain(await User.findById(order.seller).select("payout"));
  const recipient = seller?.payout?.recipientCode;
  const reference = `gmpo-${order._id}`;

  const claimed = plain(await Order.findOneAndUpdate(
    { _id: order._id, status: "completed", "payout.status": { $in: ["none", "failed"] } },
    { $set: { "payout.status": "processing", "payout.reference": reference, "payout.recipientCode": recipient || null, "payout.amount": order.sellerReceives, "payout.fee": fees.estPayoutCost(order.sellerReceives), "payout.requestedAt": new Date() }, $inc: { "payout.attempts": 1 }, $push: { events: ev("payout_started", null, "system", "Payout started") } },
    { new: true }
  ));
  if (!claimed) return plain(await Order.findById(orderId));   // already being paid, or paid

  const fail = (msg) => Order.updateOne({ _id: order._id }, { $set: { "payout.status": "failed", "payout.lastError": String(msg).slice(0, 300) }, $push: { events: ev("payout_failed", null, "system", String(msg).slice(0, 300)) } });
  if (!recipient) { await fail("Seller has no payout account"); return plain(await Order.findById(orderId)); }
  try {
    const t = await ps.transfer({ amount: order.sellerReceives, recipient, reference, reason: `GeneralMarket order ${order.orderNo}` });
    if (t.status === "success") await Order.updateOne({ _id: order._id }, { $set: { "payout.status": "paid", "payout.paidAt": new Date() }, $push: { events: ev("payout_paid", null, "system", "Seller paid") } });
    else if (t.status === "otp") await fail("Paystack needs an OTP to approve transfers. Turn off transfer OTP in your Paystack dashboard (Settings → Preferences).");
    else await Order.updateOne({ _id: order._id }, { $push: { events: ev("payout_pending", null, "system", "Transfer submitted, waiting for the bank") } });
  } catch (e) { await fail(e.message); }
  return plain(await Order.findById(orderId));
}

// Paystack tells us how a transfer ended (webhook).
async function applyTransferEvent(event, data) {
  const reference = data?.reference;
  if (!reference) return { ignored: true };
  const order = plain(await Order.findOne({ "payout.reference": reference }));
  if (!order) return { ignored: true };
  if (event === "transfer.success") {
    if (order.payout.status !== "paid") await Order.updateOne({ _id: order._id }, { $set: { "payout.status": "paid", "payout.paidAt": new Date() }, $push: { events: ev("payout_paid", null, "system", "Seller paid") } });
  } else if (event === "transfer.failed" || event === "transfer.reversed") {
    await Order.updateOne({ _id: order._id }, { $set: { "payout.status": "failed", "payout.lastError": `Transfer ${event.split(".")[1]}: ${data.reason || data.message || "bank rejected it"}`.slice(0, 300) }, $addToSet: { flags: event === "transfer.reversed" ? "payout_reversed" : "payout_failed" }, $push: { events: ev("payout_failed", null, "system", `Transfer ${event.split(".")[1]}`) } });
  }
  return { order: plain(await Order.findById(order._id)) };
}

async function applyRefundEvent(event, data) {
  const reference = data?.transaction_reference || data?.reference;
  const order = reference && plain(await Order.findOne({ "paystack.reference": reference }));
  if (!order) return { ignored: true };
  if (event === "refund.processed") await Order.updateOne({ _id: order._id }, { $set: { "refund.status": "processed" }, $push: { events: ev("refund_processed", null, "system", "Refund reached the buyer's bank") } });
  else if (event === "refund.failed") await Order.updateOne({ _id: order._id }, { $set: { "refund.status": "failed", "refund.error": "Paystack could not complete the refund" }, $addToSet: { flags: "refund_failed" }, $push: { events: ev("refund_failed", null, "system", "Refund failed. Admin action needed") } });
  return { order: plain(await Order.findById(order._id)) };
}

// Give the buyer their money back (seller cancelled, never delivered, dispute lost, late payment).
async function refundOrder(orderId, reason, byUserId, role = "system") {
  const order = plain(await Order.findById(orderId));
  if (!order) throw new EscrowError("Order not found.", 404);
  if (!order.paystack?.paidAt) throw new EscrowError("This order was never paid, so there is nothing to refund.", 409);
  const claimed = plain(await Order.findOneAndUpdate(
    { _id: order._id, status: { $in: ["paid", "delivered", "disputed", "expired", "cancelled", "review"] }, "refund.status": { $in: ["none", "failed"] }, "payout.status": { $in: ["none", "failed"] } },
    { $set: { "refund.status": "processing", "refund.reason": reason, "refund.amount": order.total, "refund.at": new Date(), "refund.error": null }, $push: { events: ev("refund_started", byUserId, role, reason) } },
    { new: true }
  ));
  if (!claimed) throw new EscrowError("This order can't be refunded (already refunded or paid out).", 409, "bad_state");
  try {
    const r = await ps.refund({ reference: order.paystack.reference, amount: order.total });
    const done = ["processed", "success", "successful"].includes(String(r.status).toLowerCase());
    const o = plain(await Order.findOneAndUpdate({ _id: order._id }, { $set: { status: "refunded", refundedAt: new Date(), "refund.status": done ? "processed" : "submitted" }, $push: { events: ev("refunded", byUserId, role, "Money returned to the buyer") } }, { new: true }));
    await unreserve(o);
    await notify(o.seller, o.buyer, firstItem(o), `↩️ Order ${o.orderNo} was cancelled and your payment of ₦${(o.total / 100).toLocaleString()} is being refunded (${reason}). It can take a few days to show in your bank.`);
    return o;
  } catch (e) {
    await Order.updateOne({ _id: order._id }, { $set: { "refund.status": "failed", "refund.error": String(e.message).slice(0, 300) }, $addToSet: { flags: "refund_failed" }, $push: { events: ev("refund_failed", byUserId, role, e.message) } });
    throw new EscrowError("The refund could not be processed yet. It has been flagged for the admin.", 502, "gateway");
  }
}

// Admin decides a dispute.
async function resolveDispute(orderId, adminId, decision, note) {
  if (!["release", "refund"].includes(decision)) throw new EscrowError("Decision must be release or refund.");
  const n = String(note || "").trim().slice(0, 500);
  if (decision === "refund") {
    const cur = plain(await Order.findById(orderId));
    if (!cur || cur.status !== "disputed") throw new EscrowError("Only disputed orders can be resolved.", 409, "bad_state");
    await Order.updateOne({ _id: orderId, status: "disputed" }, { $set: { "dispute.resolvedBy": adminId, "dispute.resolvedAt": new Date(), "dispute.decision": "refund", "dispute.adminNote": n } });
    return refundOrder(orderId, n || "Dispute resolved in the buyer's favour", adminId, "admin");
  }
  const o = await move(orderId, ["disputed"], {}, { status: "completed", completedAt: new Date(), "dispute.resolvedBy": adminId, "dispute.resolvedAt": new Date(), "dispute.decision": "release", "dispute.adminNote": n }, ev("dispute_resolved", adminId, "admin", `Released to seller. ${n}`));
  return finalize(o, "admin");
}

// ── 5. Verify with Paystack (browser redirect, "refresh" button, safety net) ──
async function verifyAndMark(orderId) {
  const order = plain(await Order.findById(orderId));
  if (!order || !order.paystack?.reference) return { order };
  if (!["awaiting_payment", "expired", "cancelled"].includes(order.status)) return { order };
  let gw;
  try { gw = await ps.verify(order.paystack.reference, { amount: order.total }); } catch { return { order, pending: true }; }
  return markPaid(order.paystack.reference, gw, "verify");
}

// ── 6. Background job: runs every few minutes ────────────────────────────────
let running = false;
async function runMaintenance() {
  if (running || !ps.enabled()) return;
  running = true;
  const now = new Date();
  const each = async (list, fn) => { for (const o of list) { try { await fn(plain(o)); } catch (e) { console.warn("maintenance:", o.orderNo, e.message); } } };
  try {
    // a) unpaid orders past their window: check Paystack one last time, then expire
    await each(await Order.find({ status: "awaiting_payment", expiresAt: { $lt: now } }).limit(100), async (o) => {
      const r = await verifyAndMark(o._id);
      if (r.order?.status === "awaiting_payment") {
        const u = plain(await Order.findOneAndUpdate({ _id: o._id, status: "awaiting_payment" }, { $set: { status: "expired" }, $push: { events: ev("expired", null, "system", "Not paid in time") } }, { new: true }));
        if (u) await unreserve(u);
      }
    });
    // b) delivered + buyer silent → release to the seller
    await each(await Order.find({ status: "delivered", autoReleaseAt: { $lt: now } }).limit(100), async (o) => {
      const done = await move(o._id, ["delivered"], {}, { status: "completed", completedAt: new Date() }, ev("auto_released", null, "system", "Buyer did not respond, so the payment was released automatically"));
      await finalize(done, "system");
    });
    // c) paid but never delivered → refund the buyer
    await each(await Order.find({ status: "paid", sellerDeadline: { $lt: now } }).limit(100), (o) => refundOrder(o._id, "The seller did not deliver in time", null, "system"));
    // d) payouts stuck "processing" → ask Paystack how it ended
    await each(await Order.find({ "payout.status": "processing", "payout.requestedAt": { $lt: new Date(now - 30 * 60 * 1000) } }).limit(50), (o) => syncPayout(o._id));
    // e) failed payouts → retry a few times automatically
    await each(await Order.find({ status: "completed", "payout.status": "failed", "payout.attempts": { $lt: 3 }, "payout.requestedAt": { $lt: new Date(now - 10 * 60 * 1000) } }).limit(50), (o) => release(o._id));
  } finally { running = false; }
}

async function syncPayout(orderId) {
  const o = plain(await Order.findById(orderId));
  if (!o?.payout?.reference) throw new EscrowError("No payout to check.", 409);
  const t = await ps.verifyTransfer(o.payout.reference);
  if (t.status === "success") await applyTransferEvent("transfer.success", { reference: o.payout.reference });
  else if (["failed", "reversed"].includes(t.status)) await applyTransferEvent(`transfer.${t.status}`, { reference: o.payout.reference, reason: t.reason });
  return plain(await Order.findById(orderId));
}

// ── 7. What the API shows to each person ─────────────────────────────────────
const party = (u) => (u ? { id: String(u._id), name: u.name, username: u.username || null, avatar: u.avatar || "", verified: u.idVerification?.status === "verified" } : null);

function actionsFor(o, role) {
  const a = [];
  if (role === "buyer") {
    if (o.status === "awaiting_payment" && new Date(o.expiresAt) > new Date()) a.push("pay", "cancel");
    if (o.status === "paid" || o.status === "delivered") a.push("confirm", "dispute");
  } else if (role === "seller") {
    if (o.status === "paid") a.push("ship", "cancel");
  } else if (role === "admin") {
    if (o.status === "disputed") a.push("resolve");
    if (o.status === "completed" && ["failed", "processing"].includes(o.payout?.status)) a.push("retry_payout");
    if (o.refund?.status === "failed") a.push("retry_refund");
  }
  return a;
}

async function view(orderDoc, viewer, { full = false } = {}) {
  const o = plain(orderDoc);
  const role = viewer.role === "admin" && String(o.buyer) !== viewer.id && String(o.seller) !== viewer.id ? "admin" : String(o.buyer) === viewer.id ? "buyer" : String(o.seller) === viewer.id ? "seller" : viewer.role === "admin" ? "admin" : null;
  if (!role) throw new EscrowError("Order not found.", 404);
  const out = {
    id: String(o._id), orderNo: o.orderNo, role, status: o.status, createdAt: o.createdAt,
    items: o.items.map((i) => ({ listing: String(i.listing), pid: i.pid, title: i.title, image: i.image, unitPrice: i.unitPrice, qty: i.qty })),
    itemTotal: o.itemTotal, total: o.total, buyerFee: o.buyerFee,
    ...(role !== "buyer" ? { sellerCommission: o.sellerCommission, sellerReceives: o.sellerReceives } : {}),
    expiresAt: o.expiresAt, sellerDeadline: o.sellerDeadline, autoReleaseAt: o.autoReleaseAt, paidAt: o.paidAt, deliveredAt: o.deliveredAt, completedAt: o.completedAt,
    delivery: o.delivery,
    payout: role === "buyer" ? undefined : { status: o.payout?.status, lastError: role === "admin" ? o.payout?.lastError : undefined, paidAt: o.payout?.paidAt },
    refund: o.refund?.status && o.refund.status !== "none" ? { status: o.refund.status, reason: o.refund.reason, amount: o.refund.amount } : undefined,
    dispute: o.dispute?.openedAt ? { reason: o.dispute.reason, details: o.dispute.details, openedAt: o.dispute.openedAt, decision: o.dispute.decision, adminNote: o.dispute.adminNote, resolvedAt: o.dispute.resolvedAt } : undefined,
    flags: role === "admin" ? o.flags : undefined,
    events: (o.events || []).map((e) => ({ at: e.at, role: e.role, type: e.type, note: e.note })),
    actions: actionsFor(o, role),
    payUrl: role === "buyer" && o.status === "awaiting_payment" ? o.paystack?.authorizationUrl : undefined,
    ...(role === "admin" ? { paystack: { reference: o.paystack?.reference, fees: o.paystack?.fees }, estProfit: fees.breakdown(o.itemTotal).estProfit } : {}),
  };
  if (full || true) {
    const users = await User.find({ _id: { $in: [o.buyer, o.seller] } }).select("name username avatar idVerification");
    const by = new Map(users.map((u) => [String(u._id), plain(u)]));
    out.buyer = party(by.get(String(o.buyer))); out.seller = party(by.get(String(o.seller)));
  }
  return out;
}

// ── 8. Money report for the admin dashboard (all amounts in kobo) ────────────
async function financeSummary(days = 30) {
  const since = new Date(Date.now() - days * DAY);
  const orders = (await Order.find({ createdAt: { $gte: since } })).map(plain);
  const sum = (arr, f) => arr.reduce((s, o) => s + (f(o) || 0), 0);
  const paidish = orders.filter((o) => o.paystack?.paidAt);
  const completed = orders.filter((o) => o.status === "completed");
  const refunded = orders.filter((o) => o.status === "refunded");
  const held = orders.filter((o) => ["paid", "delivered", "disputed"].includes(o.status));
  const owed = orders.filter((o) => o.status === "completed" && o.payout?.status !== "paid");
  const commission = sum(completed, (o) => o.sellerCommission), buyerFees = sum(completed, (o) => o.buyerFee);
  const gateway = sum(completed, (o) => o.paystack?.fees), payoutCost = sum(completed.filter((o) => o.payout?.status === "paid"), (o) => o.payout?.fee);
  const lostOnRefunds = sum(refunded, (o) => o.paystack?.fees);   // Paystack does not return its fee on refunds
  const count = {}; for (const o of orders) count[o.status] = (count[o.status] || 0) + 1;
  return {
    days, orders: orders.length, count,
    gmv: sum(paidish, (o) => o.itemTotal),
    revenue: commission + buyerFees, commission, buyerFees,
    gatewayFees: gateway, payoutCosts: payoutCost, lostOnRefunds,
    netProfit: commission + buyerFees - gateway - payoutCost - lostOnRefunds,
    heldInEscrow: sum(held, (o) => o.total), awaitingPayout: sum(owed, (o) => o.sellerReceives),
    disputes: count.disputed || 0, failedPayouts: orders.filter((o) => o.status === "completed" && o.payout?.status === "failed").length,
    needsReview: orders.filter((o) => o.status === "review" || (o.flags || []).includes("refund_failed")).length,
  };
}

module.exports = {
  EscrowError, settings, buildQuote, createOrder, markPaid, verifyAndMark, markDelivered, confirmReceived, openDispute, cancelUnpaid, sellerCancel,
  release, refundOrder, resolveDispute, applyTransferEvent, applyRefundEvent, syncPayout, runMaintenance, view, financeSummary,
};