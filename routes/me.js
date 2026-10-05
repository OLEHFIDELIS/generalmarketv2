const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../schema/user");
const Product = require("../schema/product");
const SavedSearch = require("../schema/savedSearch");
const Message = require("../schema/message");
const Order = require("../schema/order");
const Offer = require("../schema/offer");
const cloudinary = require("../cloudinary");
const { fetchUser } = require("../lib/auth");
const { privateProfile } = require("../lib/profile");
const { expireStale, isHttpUrl } = require("../lib/listings");
const { upload, avatarUpload, privateUpload } = require("../lib/uploads");
const { DAYS, ID_DOCS } = User;

const router = express.Router();
router.use(fetchUser);

const str = (v, max) => String(v ?? "").trim().slice(0, max);
const PHONE_RE = /^[+\d][\d\s()-]{6,19}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const PAYMENT_METHODS = ["cash", "bank transfer", "pos", "mobile money", "cheque", "card"];

// ── GET /api/me ─────────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  const user = await User.findById(req.user.id);
  res.json({ success: true, user: privateProfile(user) });
});

// ── PUT /api/me  (personal profile) ─────────────────────────────────────────
router.put("/", async (req, res) => {
  const user = await User.findById(req.user.id);
  const b = req.body || {};

  if (b.name !== undefined) {
    const name = str(b.name, 80);
    if (name.length < 2) return res.status(400).json({ success: false, message: "Name is too short." });
    user.name = name;
  }
  if (b.username !== undefined) {
    const username = str(b.username, 30).toLowerCase();
    if (!/^[a-z0-9_-]{3,30}$/.test(username))
      return res.status(400).json({ success: false, message: "Username must be 3–30 characters: letters, numbers, - or _." });
    if (username !== user.username && (await User.exists({ username })))
      return res.status(400).json({ success: false, message: "That username is taken." });
    user.username = username;
  }
  for (const key of ["phone", "whatsapp"]) {
    if (b[key] !== undefined) {
      const v = str(b[key], 20);
      if (v && !PHONE_RE.test(v)) return res.status(400).json({ success: false, message: `Enter a valid ${key} number.` });
      if (key === "phone" && v !== (user.phone || "")) user.phoneVerified = false;
      user[key] = v;
    }
  }
  if (b.bio !== undefined) user.bio = str(b.bio, 500);
  if (b.location) {
    user.location = {
      state: str(b.location.state, 60),
      city: str(b.location.city, 80),
      address: str(b.location.address, 200),
    };
  }
  if (b.accountType !== undefined) {
    if (!["individual", "business"].includes(b.accountType)) return res.status(400).json({ success: false, message: "Invalid account type." });
    user.accountType = b.accountType;
  }
  if (b.avatar !== undefined) {
    if (b.avatar && !isHttpUrl(b.avatar)) return res.status(400).json({ success: false, message: "Invalid image URL." });
    user.avatar = b.avatar || undefined;
  }
  if (b.notifications && typeof b.notifications === "object") {
    for (const k of ["email", "messages", "offers", "alerts"]) {
      if (typeof b.notifications[k] === "boolean") user.notifications[k] = b.notifications[k];
    }
  }
  await user.save();
  res.json({ success: true, user: privateProfile(user) });
});

// ── POST /api/me/avatar  (multipart: avatar) ────────────────────────────────
router.post("/avatar", avatarUpload.single("avatar"), async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: "No image uploaded." });
  const user = await User.findByIdAndUpdate(req.user.id, { avatar: req.file.path }, { new: true });
  res.json({ success: true, avatar: req.file.path, user: privateProfile(user) });
});

// ── POST /api/me/upload  (multipart: images[]) authenticated listing/gallery upload ──
router.post("/upload", upload.array("images", 12), (req, res) => {
  if (!req.files?.length) return res.status(400).json({ success: false, message: "No files uploaded." });
  res.json({ success: true, urls: req.files.map((f) => f.path) });
});

// ── PUT /api/me/business ────────────────────────────────────────────────────
router.put("/business", async (req, res) => {
  const user = await User.findById(req.user.id);
  const b = req.body || {};
  const biz = user.business || {};

  if (!str(b.name, 100)) return res.status(400).json({ success: false, message: "Business name is required." });
  if (b.phone && !PHONE_RE.test(str(b.phone, 20))) return res.status(400).json({ success: false, message: "Enter a valid business phone." });
  if (b.website && !/^https?:\/\//i.test(str(b.website, 200))) return res.status(400).json({ success: false, message: "Website must start with http:// or https://" });
  if (b.logo && !isHttpUrl(b.logo)) return res.status(400).json({ success: false, message: "Invalid logo URL." });

  const hours = Array.isArray(b.openingHours) ? b.openingHours : [];
  const cleanHours = [];
  for (const h of hours) {
    if (!DAYS.includes(h.day)) continue;
    if (!h.closed && (!TIME_RE.test(h.open) || !TIME_RE.test(h.close)))
      return res.status(400).json({ success: false, message: `Invalid opening hours for ${h.day}.` });
    cleanHours.push({ day: h.day, open: h.open || "09:00", close: h.close || "18:00", closed: !!h.closed });
  }

  const gallery = (Array.isArray(b.gallery) ? b.gallery : []).filter(isHttpUrl).slice(0, 10);
  const methods = (Array.isArray(b.paymentMethods) ? b.paymentMethods : [])
    .map((m) => String(m).toLowerCase()).filter((m) => PAYMENT_METHODS.includes(m));

  user.business = {
    name: str(b.name, 100),
    description: str(b.description, 1000),
    category: str(b.category, 60),
    logo: b.logo || biz.logo,
    address: str(b.address, 200),
    phone: str(b.phone, 20),
    email: str(b.email, 120).toLowerCase(),
    website: str(b.website, 200),
    paymentMethods: [...new Set(methods)],
    openingHours: cleanHours,
    gallery,
  };
  if (b.logo === "") user.business.logo = undefined;
  await user.save();
  res.json({ success: true, user: privateProfile(user) });
});

// ── POST /api/me/password ───────────────────────────────────────────────────
router.post("/password", async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (typeof newPassword !== "string" || newPassword.length < 8 || newPassword.length > 72)
    return res.status(400).json({ success: false, message: "New password must be 8–72 characters." });
  const user = await User.findById(req.user.id).select("+password");
  const stored = user.password || "";
  const ok = stored.startsWith("$2") ? await bcrypt.compare(String(currentPassword || ""), stored) : stored === String(currentPassword || "");
  if (!ok) return res.status(400).json({ success: false, message: "Current password is incorrect." });
  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();
  res.json({ success: true, message: "Password updated." });
});

// ── GET /api/me/dashboard  (counts for the overview cards + nav badges) ─────
router.get("/dashboard", async (req, res) => {
  const uid = req.user.id;
  await expireStale(uid);
  const [user, statusAgg, alerts, unread, offersPending, escrowShip, escrowConfirm] = await Promise.all([
    User.findById(uid),
    Product.aggregate([{ $match: { owner: new mongoose.Types.ObjectId(uid) } }, { $group: { _id: "$status", n: { $sum: 1 } } }]),
    SavedSearch.countDocuments({ user: uid }),
    Message.countDocuments({ to: uid, readAt: null }),
    Offer.countDocuments({ seller: uid, status: "pending" }),
    Order.countDocuments({ seller: uid, status: "paid" }),
    Order.countDocuments({ buyer: uid, status: "delivered" }),
  ]);
  const by = Object.fromEntries(statusAgg.map((s) => [s._id, s.n]));
  res.json({
    success: true,
    user: privateProfile(user),
    counts: {
      active: by.active || 0,
      pending: by.pending || 0,
      expired: by.expired || 0,
      sold: by.sold || 0,
      rejected: by.rejected || 0,
      alerts,
      favorites: user.favorites.length,
      unreadMessages: unread,
      pendingOffers: offersPending,
      escrowTodo: escrowShip + escrowConfirm,
    },
  });
});

// ── GET /api/me/referrals ───────────────────────────────────────────────────
router.get("/referrals", async (req, res) => {
  const user = await User.findById(req.user.id);
  const referred = await User.find({ "referral.referredBy": user._id }).select("name createdAt date").sort({ createdAt: -1 }).limit(100);
  res.json({
    success: true,
    code: user.referral?.code || null,
    total: referred.length,
    referred: referred.map((r) => ({ name: (r.name || "New user").split(" ")[0], joinedAt: r.createdAt || r.date })),
  });
});

// ── ID verification ─────────────────────────────────────────────────────────
router.get("/verification", async (req, res) => {
  const user = await User.findById(req.user.id);
  res.json({ success: true, verification: privateProfile(user).verification });
});

router.post("/verification", privateUpload.fields([{ name: "front", maxCount: 1 }, { name: "back", maxCount: 1 }, { name: "selfie", maxCount: 1 }]), async (req, res) => {
  const user = await User.findById(req.user.id);
  const status = user.idVerification?.status || "none";
  const docs = ["front", "back", "selfie"].map((k) => req.files?.[k]?.[0]);
  const destroy = () => Promise.all(docs.filter(Boolean).map((f) => cloudinary.uploader.destroy(f.filename, { type: "authenticated" }).catch(() => null)));

  if (status === "pending" || status === "verified") {
    await destroy();
    return res.status(400).json({ success: false, message: status === "verified" ? "You are already verified." : "Your documents are already under review." });
  }
  const documentType = String(req.body.documentType || "");
  if (!ID_DOCS.includes(documentType) || !docs[0] || !docs[2]) {
    await destroy();
    return res.status(400).json({ success: false, message: "Choose a document type and upload the document (front) and a selfie." });
  }
  user.idVerification = {
    status: "pending", documentType, submittedAt: new Date(),
    frontId: docs[0].filename, backId: docs[1]?.filename, selfieId: docs[2].filename,
  };
  await user.save();
  res.json({ success: true, verification: privateProfile(user).verification });
});

module.exports = router;
