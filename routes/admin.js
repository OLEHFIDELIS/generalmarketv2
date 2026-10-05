const express = require("express");
const User = require("../schema/user");
const Product = require("../schema/product");
const cloudinary = require("../cloudinary");
const { fetchUser, requireAdmin } = require("../lib/auth");
const { isId, userCard } = require("../lib/profile");
const L = require("../lib/listings");
const Order = require("../schema/order");
const E = require("../lib/escrow");

const router = express.Router();
router.use(fetchUser, requireAdmin);

// ── Listing moderation (only used when MODERATE_LISTINGS=true) ──────────────
router.get("/listings", async (req, res) => {
  const status = String(req.query.status || "pending");
  const listings = await Product.find({ status }).sort({ createdAt: 1 }).limit(100).populate("owner", "name username email");
  res.json({ success: true, listings });
});

// ── Listing reports (from the "Report" button on a product page) ──────────
router.get("/reports", async (req, res) => {
  const Report = require("../schema/report");
  const status = req.query.status === "resolved" ? "resolved" : "open";
  const reports = await Report.find({ status }).sort({ createdAt: -1 }).limit(100)
    .populate("listing", "id title status owner").populate("reporter", "name username");
  res.json({ success: true, reports });
});

router.post("/reports/:id/resolve", async (req, res) => {
  const Report = require("../schema/report");
  if (!isId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid id" });
  const r = await Report.findByIdAndUpdate(req.params.id, { status: "resolved", resolvedAt: new Date() }, { new: true });
  if (!r) return res.status(404).json({ success: false, message: "Report not found" });
  res.json({ success: true, report: r });
});

router.post("/listings/:id/moderate", async (req, res) => {
  if (!isId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid id" });
  const { action, reason } = req.body;
  const p = await Product.findById(req.params.id);
  if (!p) return res.status(404).json({ success: false, message: "Listing not found" });
  if (action === "approve") { p.status = "active"; p.rejectionReason = undefined; p.expiresAt = L.newExpiry(); }
  else if (action === "reject") { p.status = "rejected"; p.rejectionReason = String(reason || "Does not meet our posting guidelines.").slice(0, 300); }
  else return res.status(400).json({ success: false, message: "Invalid action." });
  await p.save();
  res.json({ success: true, listing: p });
});

// ── ID verification review ──────────────────────────────────────────────────
const signed = (publicId) => publicId ? cloudinary.url(publicId, { type: "authenticated", sign_url: true, secure: true, resource_type: "image" }) : null;

router.get("/verifications", async (req, res) => {
  const users = await User.find({ "idVerification.status": String(req.query.status || "pending") }).sort({ "idVerification.submittedAt": 1 }).limit(50);
  res.json({
    success: true,
    verifications: users.map((u) => ({
      user: { ...userCard(u), email: u.email, phone: u.phone },
      documentType: u.idVerification.documentType, submittedAt: u.idVerification.submittedAt,
      front: signed(u.idVerification.frontId), back: signed(u.idVerification.backId), selfie: signed(u.idVerification.selfieId),
    })),
  });
});

router.post("/verifications/:userId", async (req, res) => {
  if (!isId(req.params.userId)) return res.status(400).json({ success: false, message: "Invalid id" });
  const { action, reason } = req.body;
  if (!["approve", "reject"].includes(action)) return res.status(400).json({ success: false, message: "Invalid action." });
  const u = await User.findById(req.params.userId);
  if (!u || u.idVerification?.status !== "pending") return res.status(400).json({ success: false, message: "No pending verification for this user." });

  // Data minimisation: delete the ID images as soon as a decision is made
  const ids = [u.idVerification.frontId, u.idVerification.backId, u.idVerification.selfieId].filter(Boolean);
  await Promise.all(ids.map((id) => cloudinary.uploader.destroy(id, { type: "authenticated" }).catch(() => null)));

  u.idVerification.status = action === "approve" ? "verified" : "rejected";
  u.idVerification.reviewedAt = new Date();
  u.idVerification.reviewedBy = req.user.id;
  u.idVerification.rejectionReason = action === "reject" ? String(reason || "Documents were unclear or did not match.").slice(0, 300) : undefined;
  u.idVerification.frontId = u.idVerification.backId = u.idVerification.selfieId = undefined;
  await u.save();
  res.json({ success: true });
});

// ── Account controls ────────────────────────────────────────────────────────
router.post("/users/:userId/suspend", async (req, res) => {
  if (!isId(req.params.userId)) return res.status(400).json({ success: false, message: "Invalid id" });
  if (req.params.userId === req.user.id) return res.status(400).json({ success: false, message: "You can't suspend yourself." });
  const u = await User.findByIdAndUpdate(req.params.userId, { status: req.body.suspended === false ? "active" : "suspended" }, { new: true });
  if (!u) return res.status(404).json({ success: false, message: "User not found" });
  res.json({ success: true, status: u.status });
});


// ── Escrow / finance (admin only: the whole router is behind requireAdmin) ──────────────────────
const asyncRoute = (fn) => (req, res, next) => fn(req, res, next).catch((e) => (e instanceof E.EscrowError ? res.status(e.status).json({ success: false, message: e.message }) : next(e)));
const adminView = (o, req) => E.view(o, req.user);

router.get("/finance", asyncRoute(async (req, res) => {
  const days = Math.min(365, Math.max(1, parseInt(req.query.days) || 30));
  res.json({ success: true, summary: await E.financeSummary(days) });
}));

router.get("/orders", asyncRoute(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = String(req.query.status);
  if (req.query.attention === "1") filter.$or = [{ status: { $in: ["disputed", "review"] } }, { status: "completed", "payout.status": { $in: ["failed", "processing"] } }, { "refund.status": "failed" }];
  if (req.query.q) filter.orderNo = new RegExp("^" + String(req.query.q).replace(/[^\w]/g, ""), "i");
  const rows = await Order.find(filter).sort({ createdAt: -1 }).limit(100);
  res.json({ success: true, orders: await Promise.all(rows.map((o) => adminView(o, req))) });
}));

router.get("/orders/:id", asyncRoute(async (req, res) => {
  if (!isId(req.params.id)) return res.status(404).json({ success: false, message: "Order not found" });
  const o = await Order.findById(req.params.id);
  if (!o) return res.status(404).json({ success: false, message: "Order not found" });
  res.json({ success: true, order: await adminView(o, req) });
}));

router.post("/orders/:id/resolve", asyncRoute(async (req, res) => {
  const o = await E.resolveDispute(req.params.id, req.user.id, req.body.decision, req.body.note);
  res.json({ success: true, order: await adminView(o, req) });
}));
router.post("/orders/:id/retry-payout", asyncRoute(async (req, res) => {
  const o = await E.release(req.params.id);
  res.json({ success: true, order: await adminView(o, req) });
}));
router.post("/orders/:id/sync-payout", asyncRoute(async (req, res) => {
  const o = await E.syncPayout(req.params.id);
  res.json({ success: true, order: await adminView(o, req) });
}));
router.post("/orders/:id/retry-refund", asyncRoute(async (req, res) => {
  const o = await E.refundOrder(req.params.id, "Refund retried by admin", req.user.id, "admin");
  res.json({ success: true, order: await adminView(o, req) });
}));

module.exports = router;
