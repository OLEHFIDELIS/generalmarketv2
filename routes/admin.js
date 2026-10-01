const express = require("express");
const User = require("../schema/user");
const Product = require("../schema/product");
const cloudinary = require("../cloudinary");
const { fetchUser, requireAdmin } = require("../lib/auth");
const { isId, userCard } = require("../lib/profile");
const L = require("../lib/listings");

const router = express.Router();
router.use(fetchUser, requireAdmin);

// ── Listing moderation (only used when MODERATE_LISTINGS=true) ──────────────
router.get("/listings", async (req, res) => {
  const status = String(req.query.status || "pending");
  const listings = await Product.find({ status }).sort({ createdAt: 1 }).limit(100).populate("owner", "name username email");
  res.json({ success: true, listings });
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

module.exports = router;
