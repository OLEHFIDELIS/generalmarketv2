const express = require("express");
const mongoose = require("mongoose");
const User = require("../schema/user");
const Order = require("../schema/order");
const ps = require("../lib/paystack");
const E = require("../lib/escrow");
const fees = require("../lib/fees");
const rateLimit = require("../lib/rateLimit");
const { fetchUser } = require("../lib/auth");

const router = express.Router();
const publicBase = (req) => (process.env.APP_URL || `${req.protocol}://${req.get("host")}`).replace(/\/+$/, "");
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch((e) => {
  if (e instanceof E.EscrowError) return res.status(e.status).json({ success: false, message: e.message, code: e.code });
  next(e);
});
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// ── GET /api/payments/config : what the checkout UI needs (public, no secrets) ──
router.get("/config", (req, res) => {
  const c = fees.config(), s = E.settings();
  res.json({
    success: true, enabled: ps.enabled(), mode: ps.mode(),
    minOrder: c.minOrder, maxOrder: c.maxOrder,
    buyerFee: { percent: c.buyerPercent, flat: c.buyerFlat, max: c.buyerMax },
    sellerCommission: { percent: c.sellerPercent, min: c.sellerMin, max: c.sellerMax },
    deliverDays: s.deliverDays, confirmDays: s.confirmDays, payWindowMin: Math.round(s.payWindowMs / 60000),
  });
});

// ── Seller payout account ────────────────────────────────────────────────────
router.get("/banks", fetchUser, wrap(async (req, res) => {
  if (!ps.enabled()) return res.status(503).json({ success: false, message: "Payments aren't switched on yet." });
  res.json({ success: true, banks: await ps.listBanks() });
}));

const resolveLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 20, key: (r) => `resolve:${r.user?.id}`, message: "Too many account lookups. Try again in a few minutes." });
const cleanAcct = (v) => String(v || "").replace(/\s+/g, "");

router.post("/resolve-account", fetchUser, resolveLimiter, wrap(async (req, res) => {
  const accountNumber = cleanAcct(req.body.accountNumber), bankCode = String(req.body.bankCode || "");
  if (!/^\d{10}$/.test(accountNumber)) return res.status(400).json({ success: false, message: "Account numbers have 10 digits." });
  if (!bankCode) return res.status(400).json({ success: false, message: "Choose a bank." });
  try {
    const r = await ps.resolveAccount(accountNumber, bankCode);
    res.json({ success: true, accountName: r.account_name });
  } catch (e) { res.status(400).json({ success: false, message: "We couldn't find that account. Check the number and the bank." }); }
}));

router.get("/payout", fetchUser, wrap(async (req, res) => {
  const u = await User.findById(req.user.id).select("payout");
  res.json({ success: true, payout: u?.payout?.recipientCode ? { bankName: u.payout.bankName, accountLast4: u.payout.accountLast4, accountName: u.payout.accountName, verifiedAt: u.payout.verifiedAt } : null });
}));

router.put("/payout", fetchUser, resolveLimiter, wrap(async (req, res) => {
  if (!ps.enabled()) return res.status(503).json({ success: false, message: "Payments aren't switched on yet." });
  const accountNumber = cleanAcct(req.body.accountNumber), bankCode = String(req.body.bankCode || "");
  if (!/^\d{10}$/.test(accountNumber) || !bankCode) return res.status(400).json({ success: false, message: "Enter a 10-digit account number and choose a bank." });
  const open = await Order.countDocuments({ seller: req.user.id, status: { $in: ["paid", "delivered", "disputed"] } });
  if (open) return res.status(409).json({ success: false, message: "You can change your payout account once your open escrow orders are finished." });
  const bank = (await ps.listBanks()).find((b) => b.code === bankCode);
  if (!bank) return res.status(400).json({ success: false, message: "Choose a bank from the list." });
  let resolved;
  try { resolved = await ps.resolveAccount(accountNumber, bankCode); } catch { return res.status(400).json({ success: false, message: "We couldn't verify that account. Check the number and the bank." }); }
  let rec;
  try { rec = await ps.createRecipient({ name: resolved.account_name, accountNumber, bankCode }); } catch (e) { return res.status(502).json({ success: false, message: "We couldn't save that account right now. Please try again." }); }
  await User.updateOne({ _id: req.user.id }, { $set: { payout: { bankCode, bankName: bank.name, accountLast4: accountNumber.slice(-4), accountName: resolved.account_name, recipientCode: rec.recipient_code, verifiedAt: new Date() } } });
  res.json({ success: true, payout: { bankName: bank.name, accountLast4: accountNumber.slice(-4), accountName: resolved.account_name } });
}));

// ── Browser comes back from Paystack ─────────────────────────────────────────
router.get("/callback", wrap(async (req, res) => {
  const ref = String(req.query.reference || req.query.trxref || "").slice(0, 80);
  const base = publicBase(req);
  const order = /^[\w.=-]+$/.test(ref) ? await Order.findOne({ "paystack.reference": ref }).select("_id") : null;
  if (!order) return res.redirect(`${base}/#/dashboard/escrow`);
  const r = await E.verifyAndMark(order._id);
  const ok = r.order && !["awaiting_payment", "cancelled", "expired"].includes(r.order.status);
  res.redirect(`${base}/#/dashboard/escrow/${order._id}?${ok ? "paid=1" : "pay=pending"}`);
}));

// ── Paystack → us (server to server). Needs the RAW body to check the signature ──
router.post("/webhook", wrap(async (req, res) => {
  if (!ps.verifySignature(req.rawBody, req.get("x-paystack-signature"))) return res.status(401).send("bad signature");
  const { event, data } = req.body || {};
  try {
    if (event === "charge.success") await E.markPaid(data.reference, data, "webhook");
    else if (event === "transfer.success" || event === "transfer.failed" || event === "transfer.reversed") await E.applyTransferEvent(event, data);
    else if (event === "refund.processed" || event === "refund.failed") await E.applyRefundEvent(event, data);
  } catch (e) { console.error("webhook error:", event, e.message); return res.status(500).send("error"); }   // 500 → Paystack retries
  res.sendStatus(200);
}));

// ── DEMO checkout (only exists when mode === "demo": never in production) ───
router.get("/demo/checkout", wrap(async (req, res) => {
  if (ps.mode() !== "demo") return res.status(404).send("Not found");
  const order = await Order.findOne({ "paystack.reference": String(req.query.reference || "") });
  if (!order) return res.status(404).send("Order not found");
  res.type("html").send(`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Demo payment</title>
  <body style="font-family:system-ui;max-width:420px;margin:48px auto;padding:0 16px;color:#0f172a">
  <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:10px;padding:10px 14px;font-size:13px">DEMO MODE: no real money moves.</div>
  <h2>Pay ₦${(order.total / 100).toLocaleString()}</h2><p>Order ${esc(order.orderNo)}</p>
  <form method="POST" action="/api/payments/demo/confirm"><input type="hidden" name="reference" value="${esc(order.paystack.reference)}">
  <button name="outcome" value="success" style="width:100%;padding:14px;border:0;border-radius:10px;background:#16a34a;color:#fff;font-size:16px;cursor:pointer">Simulate successful payment</button>
  <button name="outcome" value="abandon" style="width:100%;padding:14px;margin-top:10px;border:1px solid #cbd5e1;border-radius:10px;background:#fff;font-size:16px;cursor:pointer">Cancel</button></form></body>`);
}));
router.post("/demo/confirm", express.urlencoded({ extended: false }), wrap(async (req, res) => {
  if (ps.mode() !== "demo") return res.status(404).send("Not found");
  const ref = String(req.body.reference || "");
  if (req.body.outcome === "success") ps.demoMarkPaid(ref);
  res.redirect(`/api/payments/callback?reference=${encodeURIComponent(ref)}`);
}));

module.exports = router;
