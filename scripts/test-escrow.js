// Run:  node scripts/test-escrow.js
// Tests the money logic (fees, escrow states, payouts, refunds, webhooks) against a tiny in-memory database,
// so it needs no MongoDB, no internet and no Paystack account. Safe to run any time.
process.env.NODE_ENV = "test";
process.env.PAYMENTS_DEMO = "true";
process.env.JWT_SECRET = "test-secret";
process.env.PAYSTACK_SECRET_KEY = "";
const assert = require("assert");
const path = require("path");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const R = (p) => require(path.join(__dirname, "..", p));

// ───────────── in-memory database ─────────────
const clone = (v) => {
  if (v === null || typeof v !== "object") return v;
  if (v instanceof Date) return new Date(v);
  if (v._bsontype || v instanceof mongoose.Types.ObjectId) return v;
  if (Array.isArray(v)) return v.map(clone);
  const o = {}; for (const k of Object.keys(v)) o[k] = clone(v[k]); return o;
};
const getp = (o, p) => p.split(".").reduce((x, k) => (x == null ? undefined : x[k]), o);
const same = (a, b) => (a instanceof Date || b instanceof Date) ? +new Date(a) === +new Date(b) : String(a) === String(b);
function cond(val, c) {
  if (c !== null && typeof c === "object" && !(c instanceof Date) && !c._bsontype && Object.keys(c).some((k) => k[0] === "$")) {
    return Object.entries(c).every(([op, x]) => {
      const vs = Array.isArray(val) ? val : [val];
      switch (op) {
        case "$in": return x.some((y) => (y === null ? val == null : vs.some((v) => same(v, y))));
        case "$nin": return !x.some((y) => vs.some((v) => v != null && same(v, y)));
        case "$ne": return !vs.some((v) => same(v, x));
        case "$gt": return val != null && +new Date(val) > +new Date(x) || (typeof val === "number" && val > x);
        case "$gte": return val != null && (typeof val === "number" ? val >= x : +new Date(val) >= +new Date(x));
        case "$lt": return val != null && (typeof val === "number" ? val < x : +new Date(val) < +new Date(x));
        case "$lte": return val != null && (typeof val === "number" ? val <= x : +new Date(val) <= +new Date(x));
        case "$exists": return (val !== undefined) === x;
        default: throw new Error("fake db: unsupported operator " + op);
      }
    });
  }
  if (c === null) return val == null;
  return (Array.isArray(val) ? val : [val]).some((v) => v != null && same(v, c));
}
function match(doc, q) {
  return Object.entries(q || {}).every(([k, c]) => {
    if (k === "$or") return c.some((s) => match(doc, s));
    if (k === "$and") return c.every((s) => match(doc, s));
    return cond(getp(doc, k), c);
  });
}
function apply(doc, u) {
  const set = (p, v) => { const ks = p.split("."); let o = doc; ks.slice(0, -1).forEach((k) => { if (o[k] == null || typeof o[k] !== "object") o[k] = {}; o = o[k]; }); o[ks.at(-1)] = v; };
  for (const [p, v] of Object.entries(u.$set || {})) set(p, clone(v));
  for (const p of Object.keys(u.$unset || {})) { const ks = p.split("."); let o = doc; for (const k of ks.slice(0, -1)) { o = o && o[k]; } if (o) delete o[ks.at(-1)]; }
  for (const [p, v] of Object.entries(u.$inc || {})) set(p, (getp(doc, p) || 0) + v);
  for (const [p, v] of Object.entries(u.$push || {})) { const a = getp(doc, p) || []; set(p, [...a, clone(v)]); }
  for (const [p, v] of Object.entries(u.$addToSet || {})) { const a = getp(doc, p) || []; if (!a.some((x) => same(x, v))) set(p, [...a, clone(v)]); }
}
function fake(Model) {
  const rows = [];
  const mk = (data) => { const d = new Model(data).toObject(); d.createdAt ||= new Date(); d.updatedAt ||= new Date(); if (Model.modelName === "User") d.id = String(d._id); /* real documents expose an id string */ return d; };
  const q = (fn) => { const o = { _sort: null, _lim: 0, sort(s) { this._sort = s; return this; }, limit(n) { this._lim = n; return this; }, skip() { return this; }, select() { return this; }, lean() { return this; }, populate() { return this; },
    then(res, rej) { try { let r = fn(); if (Array.isArray(r)) { if (this._sort) { const [[k, dir]] = Object.entries(this._sort); r = [...r].sort((a, b) => (a[k] > b[k] ? 1 : -1) * dir); } if (this._lim) r = r.slice(0, this._lim); } res(r); } catch (e) { rej ? rej(e) : (() => { throw e; })(); } } }; return o; };
  Model.__rows = rows;
  Model.create = async (d) => { const x = mk(d); rows.push(x); return clone(x); };
  Model.find = (f) => q(() => rows.filter((r) => match(r, f)).map(clone));
  Model.findOne = (f) => q(() => { const r = rows.find((x) => match(x, f)); return r ? clone(r) : null; });
  Model.findById = (id) => Model.findOne({ _id: id });
  Model.countDocuments = async (f) => rows.filter((r) => match(r, f)).length;
  Model.findOneAndUpdate = async (f, u, o = {}) => { let r = rows.find((x) => match(x, f)); if (!r && o.upsert) { r = mk({ _id: f._id }); rows.push(r); } if (!r) return null; const before = clone(r); apply(r, u); return clone(o.new ? r : before); };
  Model.updateOne = async (f, u) => { const r = rows.find((x) => match(x, f)); if (!r) return { matchedCount: 0, modifiedCount: 0 }; apply(r, u); return { matchedCount: 1, modifiedCount: 1 }; };
  Model.updateMany = async (f, u) => { const hit = rows.filter((x) => match(x, f)); hit.forEach((r) => apply(r, u)); return { matchedCount: hit.length, modifiedCount: hit.length }; };
  return Model;
}

const Order = fake(R("schema/order")), Product = fake(R("schema/product")), User = fake(R("schema/user")), Counter = fake(R("schema/counter")), Thread = fake(R("schema/thread")), Message = fake(R("schema/message"));
const ps = R("lib/paystack"), fees = R("lib/fees"), E = R("lib/escrow");

// ───────────── Paystack spies ─────────────
const calls = { transfer: [], refund: [], init: [] };
const orig = { transfer: ps.transfer, refund: ps.refund, initialize: ps.initialize, verifyTransfer: ps.verifyTransfer };
let behave = {};
ps.transfer = async (a) => { calls.transfer.push(a); if (behave.transfer) return behave.transfer(a); return orig.transfer(a); };
ps.refund = async (a) => { calls.refund.push(a); if (behave.refund) return behave.refund(a); return orig.refund(a); };
ps.initialize = async (a) => { calls.init.push(a); if (behave.init) return behave.init(a); return orig.initialize(a); };
ps.verifyTransfer = async (r) => (behave.verifyTransfer ? behave.verifyTransfer(r) : orig.verifyTransfer(r));
const reset = () => { calls.transfer.length = calls.refund.length = calls.init.length = 0; behave = {}; };

// ───────────── fixtures ─────────────
const oid = () => new mongoose.Types.ObjectId();
let pidSeq = 1000;
async function user(o = {}) { return User.create({ name: "User " + Math.random().toString(36).slice(2, 5), email: `u${Math.random().toString(36).slice(2, 8)}@x.com`, phone: "08011112222", ...o }); }
async function seller(o = {}) { return user({ name: "Sam Seller", payout: { bankCode: "058", bankName: "GTBank", accountLast4: "1234", accountName: "SAM SELLER", recipientCode: "RCP_sam", verifiedAt: new Date() }, ...o }); }
async function listing(owner, o = {}) { return Product.create({ id: ++pidSeq, category: "electronics", title: "iPhone " + pidSeq, description: "Clean phone, no issues.", price: 100000, images: ["https://x/1.jpg"], owner: owner._id, status: "active", priceType: "fixed", ...o }); }
async function placed(buyer, sel, o = {}) { const l = await listing(sel, o.listing); const r = await E.createOrder({ buyerId: buyer._id, lines: [{ listingId: l._id, qty: o.qty || 1 }], delivery: { method: "meetup", phone: "08099998888" }, appUrl: "http://test" }); return { l, order: r.order, ref: r.order.paystack.reference }; }
async function paid(buyer, sel, o) { const x = await placed(buyer, sel, o); ps.demoMarkPaid(x.ref); await E.markPaid(x.ref, { status: "success", amount: x.order.total, currency: "NGN", fees: 150000, id: 1 }); return x; }
const get = async (id) => Order.findById(id);
const throwsAsync = async (fn, re) => { try { await fn(); } catch (e) { if (re) assert.match(e.message, re); return e; } assert.fail("expected an error"); };

// ───────────── runner ─────────────
const tests = []; const t = (name, fn) => tests.push([name, fn]);

t("fees: totals add up, commission min/max apply, profit is positive for every price", async () => {
  for (const p of [1000, 1999, 2500, 49999, 100000, 1e6, 5e6, 2e7]) {
    const b = fees.breakdown(fees.naira(p));
    assert.strictEqual(b.total, b.itemTotal + b.buyerFee);
    assert.strictEqual(b.sellerReceives, b.itemTotal - b.sellerCommission);
    assert.ok(b.sellerCommission >= fees.naira(200) && b.sellerCommission <= fees.naira(100000), "commission within min/max at " + p);
    assert.ok(b.estProfit > 0, "profit positive at ₦" + p);
    assert.strictEqual(b.buyerFee % 100, 0); assert.strictEqual(b.sellerCommission % 100, 0);
  }
  const b = fees.breakdown(fees.naira(100000));
  assert.strictEqual(b.sellerCommission, fees.naira(5000)); assert.strictEqual(b.buyerFee, fees.naira(2100));
  assert.strictEqual(fees.breakdown(fees.naira(15e6)).sellerCommission, fees.naira(100000));   // cap on big items
});

t("fees: configurable from environment", async () => {
  process.env.SELLER_COMMISSION_PERCENT = "10"; process.env.BUYER_FEE_PERCENT = "0"; process.env.BUYER_FEE_FLAT = "0";
  const b = fees.breakdown(fees.naira(50000));
  delete process.env.SELLER_COMMISSION_PERCENT; delete process.env.BUYER_FEE_PERCENT; delete process.env.BUYER_FEE_FLAT;
  assert.strictEqual(b.sellerCommission, fees.naira(5000)); assert.strictEqual(b.buyerFee, 0);
});

t("quote: rejects own listing, seller without payout, contact-price, too small, sold, mixed sellers, bad qty", async () => {
  const buyer = await user(), sel = await seller(), noPay = await user();
  const own = await listing(buyer); await throwsAsync(() => E.buildQuote(buyer._id, [{ listingId: own._id }]), /own listing/);
  const l1 = await listing(noPay); await throwsAsync(() => E.buildQuote(buyer._id, [{ listingId: l1._id }]), /payout account/);
  const l2 = await listing(sel, { priceType: "contact", price: 0 }); await throwsAsync(() => E.buildQuote(buyer._id, [{ listingId: l2._id }]), /no fixed price/);
  const l3 = await listing(sel, { price: 500 }); await throwsAsync(() => E.buildQuote(buyer._id, [{ listingId: l3._id }]), /minimum/);
  const l4 = await listing(sel, { status: "sold" }); await throwsAsync(() => E.buildQuote(buyer._id, [{ listingId: l4._id }]), /no longer available/);
  const s2 = await seller(), a = await listing(sel), b = await listing(s2);
  await throwsAsync(() => E.buildQuote(buyer._id, [{ listingId: a._id }, { listingId: b._id }]), /different sellers/);
  await throwsAsync(() => E.buildQuote(buyer._id, [{ listingId: a._id, qty: 11 }]), /Quantity/);
  const q = await E.buildQuote(buyer._id, [{ listingId: a._id, qty: 2 }]);
  assert.strictEqual(q.itemTotal, 20000000); assert.strictEqual(q.total, q.itemTotal + q.buyerFee);
});

t("createOrder: server computes the price, reserves the item, blocks a second buyer", async () => {
  reset(); const b1 = await user(), b2 = await user(), sel = await seller(); const l = await listing(sel, { price: 250000 });
  const r = await E.createOrder({ buyerId: b1._id, lines: [{ listingId: l._id, qty: 1, price: 1 }], delivery: { phone: "08033334444" }, appUrl: "http://test" });
  assert.strictEqual(r.order.itemTotal, 25000000);                       // client-sent "price: 1" is ignored
  assert.strictEqual(r.order.status, "awaiting_payment"); assert.match(r.order.paystack.reference, /^gm-gm\d+-[a-z0-9]+$/);
  assert.ok((await Product.findById(l._id)).reservedUntil > new Date());
  await throwsAsync(() => E.createOrder({ buyerId: b2._id, lines: [{ listingId: l._id }], delivery: { phone: "08033334444" }, appUrl: "http://test" }), /being bought by someone else/);
  assert.strictEqual(calls.init.length, 1); assert.strictEqual(calls.init[0].amount, r.order.total);
});

t("createOrder: if the payment provider fails the order is cancelled and the item is released", async () => {
  reset(); behave.init = async () => { throw new Error("gateway down"); };
  const b = await user(), sel = await seller(), l = await listing(sel);
  const e = await throwsAsync(() => E.createOrder({ buyerId: b._id, lines: [{ listingId: l._id }], delivery: { phone: "08033334444" }, appUrl: "http://t" }), /couldn't start the payment/); assert.strictEqual(e.status, 502);
  assert.strictEqual((await Product.findById(l._id)).reservedUntil, null);
  assert.ok((await Order.find({ buyer: b._id })).every((o) => o.status === "cancelled"));
});

t("markPaid: wrong amount is NOT accepted (goes to review)", async () => {
  reset(); const b = await user(), sel = await seller(); const x = await placed(b, sel);
  const r = await E.markPaid(x.ref, { status: "success", amount: x.order.total - 100, currency: "NGN" });
  assert.ok(r.mismatch); const o = await get(x.order._id); assert.strictEqual(o.status, "review"); assert.ok(o.flags.includes("amount_mismatch"));
});

t("markPaid: holds funds, clears cart line, notifies seller, and is idempotent (webhook + callback both fire)", async () => {
  reset(); const b = await user({ cart: { 777: 1 } }), sel = await seller(); const x = await placed(b, sel); await User.updateOne({ _id: b._id }, { $set: { cart: { [x.l.id]: 2, 5: 1 } } });
  const gw = { status: "success", amount: x.order.total, currency: "NGN", fees: 150000, channel: "card", id: 99 };
  await Promise.all([E.markPaid(x.ref, gw, "webhook"), E.markPaid(x.ref, gw, "callback"), E.markPaid(x.ref, gw, "verify")]);
  const o = await get(x.order._id);
  assert.strictEqual(o.status, "paid"); assert.strictEqual(o.paystack.fees, 150000); assert.ok(o.sellerDeadline > new Date());
  assert.strictEqual(o.events.filter((e) => e.type === "paid").length, 1, "paid event recorded exactly once");
  const u = await User.findById(b._id); assert.ok(!(x.l.id in u.cart) && u.cart[5] === 1, "only the purchased item left the cart");
  assert.ok((await Message.find({ to: sel._id })).some((m) => /held safely in escrow/.test(m.text)));
});

t("markPaid: a payment that arrives AFTER expiry is refunded automatically", async () => {
  reset(); const b = await user(), sel = await seller(); const x = await placed(b, sel);
  await Order.updateOne({ _id: x.order._id }, { $set: { status: "expired" } });
  const r = await E.markPaid(x.ref, { status: "success", amount: x.order.total, currency: "NGN", fees: 100 });
  assert.ok(r.lateRefund); assert.strictEqual(calls.refund.length, 1); assert.strictEqual(calls.refund[0].amount, x.order.total);
  assert.strictEqual((await get(x.order._id)).status, "refunded");
});

t("delivery + confirmation: only the right people can act; payout happens exactly once", async () => {
  reset(); const b = await user(), sel = await seller(), stranger = await user(); const x = await paid(b, sel);
  await throwsAsync(() => E.markDelivered(x.order._id, stranger._id), /can't be changed/);
  await throwsAsync(() => E.confirmReceived(x.order._id, sel._id), /can't be changed/);          // seller can't release their own money
  await E.markDelivered(x.order._id, sel._id, "Handed over");
  assert.ok((await get(x.order._id)).autoReleaseAt > new Date());
  await Promise.all([E.confirmReceived(x.order._id, b._id).catch(() => {}), E.confirmReceived(x.order._id, b._id).catch(() => {}), E.confirmReceived(x.order._id, b._id).catch(() => {})]);
  const o = await get(x.order._id);
  assert.strictEqual(o.status, "completed"); assert.strictEqual(o.payout.status, "paid");
  assert.strictEqual(calls.transfer.length, 1, "triple-click must still pay once");
  assert.strictEqual(calls.transfer[0].amount, o.sellerReceives); assert.strictEqual(calls.transfer[0].recipient, "RCP_sam");
  assert.strictEqual(calls.transfer[0].reference, `gmpo-${o._id}`);
  assert.strictEqual((await Product.findById(x.l._id)).status, "sold");
  assert.ok(o.sellerReceives < o.itemTotal, "platform kept its commission");
});

t("payout failures: failed transfer can be retried, OTP-required is explained, pending → paid via webhook", async () => {
  reset(); const b = await user(), sel = await seller();
  let x = await paid(b, sel); behave.transfer = async () => { throw new Error("Insufficient balance"); };
  await E.confirmReceived(x.order._id, b._id); let o = await get(x.order._id);
  assert.strictEqual(o.status, "completed"); assert.strictEqual(o.payout.status, "failed"); assert.match(o.payout.lastError, /Insufficient/);
  behave.transfer = null; await E.release(x.order._id); o = await get(x.order._id); assert.strictEqual(o.payout.status, "paid"); assert.strictEqual(o.payout.attempts, 2);
  assert.strictEqual(calls.transfer.at(-1).reference, calls.transfer[0].reference, "retry reuses the same reference");

  reset(); x = await paid(b, sel); behave.transfer = async () => ({ status: "otp" }); await E.confirmReceived(x.order._id, b._id);
  o = await get(x.order._id); assert.strictEqual(o.payout.status, "failed"); assert.match(o.payout.lastError, /OTP/);

  reset(); x = await paid(b, sel); behave.transfer = async () => ({ status: "pending" }); await E.confirmReceived(x.order._id, b._id);
  o = await get(x.order._id); assert.strictEqual(o.payout.status, "processing");
  await E.applyTransferEvent("transfer.success", { reference: o.payout.reference }); await E.applyTransferEvent("transfer.success", { reference: o.payout.reference });
  assert.strictEqual((await get(x.order._id)).payout.status, "paid");
  await E.applyTransferEvent("transfer.reversed", { reference: o.payout.reference, reason: "bank" });
  o = await get(x.order._id); assert.strictEqual(o.payout.status, "failed"); assert.ok(o.flags.includes("payout_reversed"));
});

t("a seller with no payout account at release time is flagged, not lost", async () => {
  reset(); const b = await user(), sel = await seller(); const x = await paid(b, sel);
  await User.updateOne({ _id: sel._id }, { $set: { "payout.recipientCode": null } });
  await E.confirmReceived(x.order._id, b._id); const o = await get(x.order._id);
  assert.strictEqual(o.payout.status, "failed"); assert.match(o.payout.lastError, /no payout account/); assert.strictEqual(calls.transfer.length, 0);
});

t("disputes: freezes auto-release; admin can refund (once) or release", async () => {
  reset(); const b = await user(), sel = await seller(), admin = await user({ role: "admin" });
  let x = await paid(b, sel); await E.markDelivered(x.order._id, sel._id);
  await E.openDispute(x.order._id, b._id, "Item not as described", "Screen cracked");
  await Order.updateOne({ _id: x.order._id }, { $set: { autoReleaseAt: new Date(Date.now() - 1000) } });
  await E.runMaintenance(); assert.strictEqual((await get(x.order._id)).status, "disputed", "maintenance must not release a disputed order");
  await throwsAsync(() => E.resolveDispute(x.order._id, admin._id, "maybe"), /release or refund/);
  await E.resolveDispute(x.order._id, admin._id, "refund", "Buyer is right");
  let o = await get(x.order._id); assert.strictEqual(o.status, "refunded"); assert.strictEqual(calls.refund.length, 1); assert.strictEqual(calls.refund[0].amount, o.total);
  await throwsAsync(() => E.refundOrder(x.order._id, "again"), /can't be refunded/); assert.strictEqual(calls.refund.length, 1, "no second refund");
  assert.strictEqual((await Product.findById(x.l._id)).reservedUntil, null, "item is available again");

  reset(); x = await paid(b, sel); await E.openDispute(x.order._id, b._id, "Seller unresponsive");
  await E.resolveDispute(x.order._id, admin._id, "release", "Item delivered"); o = await get(x.order._id);
  assert.strictEqual(o.status, "completed"); assert.strictEqual(o.payout.status, "paid"); assert.strictEqual(calls.transfer.length, 1);
  await throwsAsync(() => E.resolveDispute(x.order._id, admin._id, "release"), /can.t be changed/);
});

t("payout and refund can never both happen", async () => {
  reset(); const b = await user(), sel = await seller(); const x = await paid(b, sel);
  await E.confirmReceived(x.order._id, b._id);
  await throwsAsync(() => E.refundOrder(x.order._id, "too late"), /can't be refunded/); assert.strictEqual(calls.refund.length, 0);
  const y = await paid(b, sel); await E.sellerCancel(y.order._id, sel._id, "Out of stock");
  assert.strictEqual((await get(y.order._id)).status, "refunded");
  await throwsAsync(() => E.confirmReceived(y.order._id, b._id), /can't be changed/);
});

t("seller can cancel only before delivery; buyer can cancel only before paying", async () => {
  reset(); const b = await user(), sel = await seller();
  const x = await paid(b, sel); await E.markDelivered(x.order._id, sel._id);
  await throwsAsync(() => E.sellerCancel(x.order._id, sel._id), /only cancel before/);
  const y = await placed(b, sel); await E.cancelUnpaid(y.order._id, b._id);
  assert.strictEqual((await get(y.order._id)).status, "cancelled"); assert.strictEqual((await Product.findById(y.l._id)).reservedBy, null);
  const z = await paid(b, sel); await throwsAsync(() => E.cancelUnpaid(z.order._id, b._id), /can't be changed/);
});

t("maintenance: expires unpaid, recovers missed payments, auto-releases, auto-refunds, syncs stuck payouts", async () => {
  reset(); const b = await user(), sel = await seller();
  const unpaid = await placed(b, sel); await Order.updateOne({ _id: unpaid.order._id }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
  const missed = await placed(b, sel); ps.demoMarkPaid(missed.ref); await Order.updateOne({ _id: missed.order._id }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
  const quiet = await paid(b, sel); await E.markDelivered(quiet.order._id, sel._id); await Order.updateOne({ _id: quiet.order._id }, { $set: { autoReleaseAt: new Date(Date.now() - 1000) } });
  const ghost = await paid(b, sel); await Order.updateOne({ _id: ghost.order._id }, { $set: { sellerDeadline: new Date(Date.now() - 1000) } });
  const stuck = await paid(b, sel); behave.transfer = async () => ({ status: "pending" }); await E.confirmReceived(stuck.order._id, b._id); behave.transfer = null;
  await Order.updateOne({ _id: stuck.order._id }, { $set: { "payout.requestedAt": new Date(Date.now() - 3600 * 1000) } });
  await E.runMaintenance();
  assert.strictEqual((await get(unpaid.order._id)).status, "expired"); assert.strictEqual((await Product.findById(unpaid.l._id)).reservedBy, null);
  assert.strictEqual((await get(missed.order._id)).status, "paid", "payment the webhook missed is recovered");
  assert.strictEqual((await get(quiet.order._id)).status, "completed"); assert.strictEqual((await get(quiet.order._id)).payout.status, "paid");
  assert.strictEqual((await get(ghost.order._id)).status, "refunded");
  assert.strictEqual((await get(stuck.order._id)).payout.status, "paid");
  const before = calls.transfer.length; await E.runMaintenance(); assert.strictEqual(calls.transfer.length, before, "second run changes nothing");
});

t("refund failure is recorded and can be retried by an admin", async () => {
  reset(); const b = await user(), sel = await seller(); const x = await paid(b, sel);
  behave.refund = async () => { throw new Error("Paystack down"); };
  await throwsAsync(() => E.sellerCancel(x.order._id, sel._id), /could not be processed/);
  let o = await get(x.order._id); assert.strictEqual(o.status, "paid"); assert.strictEqual(o.refund.status, "failed"); assert.ok(o.flags.includes("refund_failed"));
  behave.refund = null; await E.refundOrder(x.order._id, "Retry", null, "admin"); o = await get(x.order._id); assert.strictEqual(o.status, "refunded");
});

t("views: buyer can't see the platform's commission; seller sees what they get; strangers get 404", async () => {
  reset(); const b = await user(), sel = await seller(), other = await user(), admin = await user({ role: "admin" }); const x = await paid(b, sel);
  const o = await get(x.order._id);
  const bv = await E.view(o, { id: String(b._id), role: "user" }), sv = await E.view(o, { id: String(sel._id), role: "user" }), av = await E.view(o, { id: String(admin._id), role: "admin" });
  assert.strictEqual(bv.role, "buyer"); assert.ok(!("sellerCommission" in bv)); assert.ok(!("sellerReceives" in bv)); assert.deepStrictEqual(bv.actions.sort(), ["confirm", "dispute"]);
  assert.strictEqual(sv.role, "seller"); assert.strictEqual(sv.sellerReceives, o.sellerReceives); assert.deepStrictEqual(sv.actions.sort(), ["cancel", "ship"]);
  assert.strictEqual(av.role, "admin"); assert.ok(av.paystack.reference);
  await throwsAsync(() => E.view(o, { id: String(other._id), role: "user" }), /not found/i);
  assert.ok(!JSON.stringify(bv).includes("RCP_"), "no payout recipient codes leak");
});

t("finance summary: profit = commission + buyer fees − Paystack fees − payout cost − fees lost on refunds", async () => {
  reset(); Order.__rows.length = 0; const b = await user(), sel = await seller();
  const a = await paid(b, sel, { listing: { price: 100000 } }); await E.confirmReceived(a.order._id, b._id);
  const c = await paid(b, sel, { listing: { price: 50000 } }); await E.sellerCancel(c.order._id, sel._id);
  const d = await paid(b, sel, { listing: { price: 20000 } });
  const s = await E.financeSummary(30); const oa = await get(a.order._id);
  assert.strictEqual(s.commission, oa.sellerCommission); assert.strictEqual(s.buyerFees, oa.buyerFee);
  assert.strictEqual(s.gatewayFees, 150000); assert.strictEqual(s.payoutCosts, oa.payout.fee); assert.strictEqual(s.lostOnRefunds, 150000);
  assert.strictEqual(s.netProfit, oa.sellerCommission + oa.buyerFee - 150000 - oa.payout.fee - 150000);
  assert.strictEqual(s.heldInEscrow, (await get(d.order._id)).total); assert.strictEqual(s.count.refunded, 1);
});

// ───────────── HTTP layer (real Express routers on the fake database) ─────────────
t("HTTP: full flow through the API incl. demo checkout, webhook signature, auth and ownership", async () => {
  reset(); Order.__rows.length = 0;
  const express = require("express"); const crypto = require("crypto");
  const app = express();
  app.use(express.json({ verify: (req, res, buf) => { if (req.originalUrl.startsWith("/api/payments/webhook")) req.rawBody = buf; } }));
  app.use("/api/payments", R("routes/payments")); app.use("/api/orders", R("routes/orders"));
  app.use((err, req, res, next) => res.status(500).json({ success: false, message: err.message }));
  const srv = await new Promise((r) => { const s = app.listen(0, () => r(s)); }); const base = `http://127.0.0.1:${srv.address().port}`;
  try {
    const b = await user(), sel = await seller(), other = await user();
    const tok = (u) => jwt.sign({ user: { id: String(u._id) } }, "test-secret");
    const call = async (m, u, who, body, raw) => { const r = await fetch(base + u, { method: m, redirect: "manual", headers: { "Content-Type": raw ? "application/x-www-form-urlencoded" : "application/json", ...(who ? { "auth-token": tok(who) } : {}) }, body: body ? (raw ? body : JSON.stringify(body)) : undefined }); let j = null; try { j = await r.json(); } catch {} return [r.status, j, r]; };
    assert.strictEqual((await call("POST", "/api/orders", null, {}))[0], 401);
    const cfg = (await call("GET", "/api/payments/config"))[1]; assert.strictEqual(cfg.mode, "demo"); assert.ok(!JSON.stringify(cfg).includes("sk_"));
    const l = await listing(sel, { price: 80000 });
    const [qs, q] = await call("POST", "/api/orders/quote", b, { items: [{ listingId: String(l._id), qty: 1 }] }); assert.strictEqual(qs, 200); assert.strictEqual(q.total, q.itemTotal + q.buyerFee);
    const [cs, c] = await call("POST", "/api/orders", b, { items: [{ listingId: String(l._id) }], delivery: { method: "meetup", phone: "08012345678" } }); assert.strictEqual(cs, 201, JSON.stringify(c));
    assert.ok(c.authorizationUrl.includes("/api/payments/demo/checkout"));
    // buyer pays on the demo checkout page → comes back through the callback
    const [, , cb] = await call("POST", "/api/payments/demo/confirm", null, `reference=${encodeURIComponent((await get(c.orderId)).paystack.reference)}&outcome=success`, true);
    const back = await fetch(base + cb.headers.get("location"), { redirect: "manual" }); assert.match(back.headers.get("location"), /#\/dashboard\/escrow\/.+\?paid=1/);
    let [, d] = await call("GET", `/api/orders/${c.orderId}`, b); assert.strictEqual(d.order.status, "paid"); assert.ok(!("sellerCommission" in d.order));
    assert.strictEqual((await call("GET", `/api/orders/${c.orderId}`, other))[0], 404);                       // strangers can't peek
    assert.strictEqual((await call("POST", `/api/orders/${c.orderId}/confirm`, sel))[0], 409);               // seller can't release funds
    assert.strictEqual((await call("POST", `/api/orders/${c.orderId}/ship`, b))[0], 409);                    // buyer can't mark delivered
    assert.strictEqual((await call("POST", `/api/orders/${c.orderId}/ship`, sel, { note: "done" }))[0], 200);
    const [, sm] = await call("GET", "/api/orders/summary", b); assert.strictEqual(sm.toConfirm, 1);
    assert.strictEqual((await call("POST", `/api/orders/${c.orderId}/confirm`, b))[0], 200);
    [, d] = await call("GET", `/api/orders/${c.orderId}`, sel); assert.strictEqual(d.order.status, "completed"); assert.strictEqual(d.order.payout.status, "paid");
    const [, list] = await call("GET", "/api/orders?role=selling", sel); assert.strictEqual(list.orders.length, 1);

    // webhook: signature is required (secret key present → live-style verification)
    process.env.PAYSTACK_SECRET_KEY = "sk_test_unit"; 
    const evt = JSON.stringify({ event: "charge.success", data: { reference: "nope" } });
    const post = (sig) => fetch(base + "/api/payments/webhook", { method: "POST", headers: { "Content-Type": "application/json", ...(sig ? { "x-paystack-signature": sig } : {}) }, body: evt });
    assert.strictEqual((await post(null)).status, 401); assert.strictEqual((await post("deadbeef")).status, 401);
    assert.strictEqual((await post(crypto.createHmac("sha512", "sk_test_unit").update(evt).digest("hex"))).status, 200);
    delete process.env.PAYSTACK_SECRET_KEY;
    // the demo checkout page must not exist outside demo mode
    process.env.PAYSTACK_SECRET_KEY = "sk_test_unit"; assert.strictEqual((await fetch(base + "/api/payments/demo/checkout?reference=x")).status, 404); delete process.env.PAYSTACK_SECRET_KEY;
  } finally { srv.close(); }
});

(async () => {
  let pass = 0, fail = 0;
  for (const [name, fn] of tests) {
    try { await fn(); pass++; console.log("  ✓", name); } catch (e) { fail++; console.log("  ✗", name, "\n     ", (e.stack || e.message).split("\n").slice(0, 4).join("\n      ")); }
  }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();