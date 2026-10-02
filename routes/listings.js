const express = require("express");
const mongoose = require("mongoose");
const Product = require("../schema/product");
const User = require("../schema/user");
const Rating = require("../schema/rating");
const { fetchUser, optionalAuth } = require("../lib/auth");
const { isId, publicProfile, userCard } = require("../lib/profile");
const L = require("../lib/listings");

// ───────────────────────── Owner: /api/me/listings ─────────────────────────
const mine = express.Router();
mine.use(fetchUser);

const C = require("../lib/categories");
const CATEGORIES = C.TOP_IDS;
const TRANSACTIONS = ["sell", "buy", "rent", "exchange"];
const CONDITIONS = ["new", "used"];
const PRICE_TYPES = ["fixed", "free", "contact"];
const MAX_ACTIVE = Number(process.env.MAX_ACTIVE_LISTINGS) || 100;
const s = (v, max) => String(v ?? "").trim().slice(0, max);
const bool = (v) => v === true || v === "true" || v === 1 || v === "1";

// Validates + normalises listing fields. Returns { error } or { data }
// Category rules (leaf required, detail fields, hidden controls) come from lib/categories.js – the same data the form uses.
function cleanListing(b, { partial = false } = {}) {
  const d = {};
  const need = (cond, msg) => { if (!cond) throw new Error(msg); };
  try {
    let spec = null;
    if (!partial || b.categoryPath !== undefined || b.category !== undefined) {
      const input = Array.isArray(b.categoryPath) && b.categoryPath.length ? b.categoryPath.map((x) => s(x, 60)) : b.category ? [s(b.category, 60)] : [];
      const w = C.walk(input);
      need(w, "Choose a valid category.");
      need(w.leaf, "Choose a more specific category.");
      d.category = w.top;
      d.categoryPath = w.path;
      spec = C.specFor(w.path);
      const at = C.cleanAttributes(spec, b.attributes);
      need(!at.error, at.error);
      d.attributes = at.attributes;
    }
    if (!partial || b.title !== undefined) {
      const t = s(b.title, 120);
      need(t.length >= 5, "Title must be at least 5 characters.");
      d.title = t;
    }
    if (!partial || b.description !== undefined) {
      const t = s(b.description, 5000);
      need(t.length >= 10, "Description must be at least 10 characters.");
      d.description = t;
    }
    if (!partial || b.price !== undefined || b.priceType !== undefined) {
      const pt = s(b.priceType || "fixed", 10).toLowerCase();
      need(PRICE_TYPES.includes(pt), "Choose a valid price option.");
      d.priceType = pt;
      if (pt === "fixed") {
        const p = Number(b.price);
        need(b.price !== "" && b.price !== null && b.price !== undefined && Number.isFinite(p) && p > 0 && p <= 1e12, "Enter a valid price, or choose Free / Contact for price.");
        d.price = p;
      } else {
        d.price = 0;
      }
    }
    if (!partial || b.images !== undefined) {
      const imgs = Array.isArray(b.images) ? b.images.filter(L.isHttpUrl).slice(0, 12) : [];
      need(imgs.length >= 1, "Add at least one photo.");
      d.images = imgs;
    }
    if (b.transaction !== undefined || spec) {
      const t = s(b.transaction, 20).toLowerCase();
      need(!t || TRANSACTIONS.includes(t), "Invalid transaction type.");
      d.transaction = spec?.hide.includes("transaction") ? "" : t;
    }
    if (b.condition !== undefined || spec) {
      const c = s(b.condition, 20).toLowerCase();
      need(!c || CONDITIONS.includes(c), "Invalid condition.");
      d.condition = spec?.hide.includes("condition") ? "" : c;
    }
    for (const [k, max] of [["region", 40], ["city", 80], ["address", 200], ["zip", 12], ["phone", 20], ["email", 120]]) {
      if (b[k] !== undefined) d[k] = s(b[k], max);
    }
    if (d.phone) need(/^\+?[\d\s()-]{7,20}$/.test(d.phone) && d.phone.replace(/\D/g, "").length >= 7, "Enter a valid phone number.");
    if (d.email) need(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email), "Enter a valid email address.");
    if (b.showPhone !== undefined) d.showPhone = bool(b.showPhone);
    if (b.showEmail !== undefined) d.showEmail = bool(b.showEmail);
    return { data: d };
  } catch (e) {
    return { error: e.message };
  }
}

// GET /api/me/listings?status=active|pending|expired|sold|rejected|all&q=&page=&limit=
mine.get("/", async (req, res) => {
  const uid = new mongoose.Types.ObjectId(req.user.id);
  await L.expireStale(uid);
  const status = String(req.query.status || "active");
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
  const filter = { owner: uid };
  if (status !== "all") filter.status = status;
  if (req.query.q) filter.title = { $regex: String(req.query.q).slice(0, 60).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };

  const [listings, total, agg] = await Promise.all([
    Product.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Product.countDocuments(filter),
    Product.aggregate([{ $match: { owner: uid } }, { $group: { _id: "$status", n: { $sum: 1 } } }]),
  ]);
  const counts = Object.fromEntries(agg.map((a) => [a._id, a.n]));
  res.json({ success: true, listings, total, page, pages: Math.ceil(total / limit), counts });
});

// GET /api/me/listings/:id  (for the edit form)
mine.get("/:id", async (req, res) => {
  if (!isId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid id" });
  const p = await Product.findOne({ _id: req.params.id, owner: req.user.id });
  if (!p) return res.status(404).json({ success: false, message: "Listing not found" });
  res.json({ success: true, listing: p });
});

// POST /api/me/listings
mine.post("/", async (req, res) => {
  const { data, error } = cleanListing(req.body);
  if (error) return res.status(400).json({ success: false, message: error });

  const live = await Product.countDocuments({ owner: req.user.id, status: { $in: ["active", "pending"] } });
  if (live >= MAX_ACTIVE) return res.status(400).json({ success: false, message: `You can have up to ${MAX_ACTIVE} live listings.` });

  const seller = await User.findById(req.user.id).select("phone email name");
  const product = await Product.create({
    ...data,
    phone: data.phone || seller.phone || "",
    email: data.email || seller.email || "",
    contactName: seller.name || "",
    showPhone: data.showPhone ?? true,
    showEmail: data.showEmail ?? false,
    id: await L.nextProductId(),
    owner: req.user.id,
    status: L.MODERATE ? "pending" : "active",
    expiresAt: L.newExpiry(),
    createdAt: new Date(),
    available: true,
  });
  res.status(201).json({ success: true, listing: product, needsReview: L.MODERATE });
});

// PUT /api/me/listings/:id
mine.put("/:id", async (req, res) => {
  if (!isId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid id" });
  const p = await Product.findOne({ _id: req.params.id, owner: req.user.id });
  if (!p) return res.status(404).json({ success: false, message: "Listing not found" });
  const { data, error } = cleanListing(req.body, { partial: true });
  if (error) return res.status(400).json({ success: false, message: error });

  const oldImages = p.images;
  p.set(data);
  if (L.MODERATE && ["active", "rejected"].includes(p.status)) { p.status = "pending"; p.rejectionReason = undefined; }
  await p.save();
  if (data.images) await L.destroyImages(oldImages.filter((u) => !data.images.includes(u)));
  res.json({ success: true, listing: p, needsReview: p.status === "pending" });
});

// POST /api/me/listings/:id/renew   (expired, or expiring within 7 days)
mine.post("/:id/renew", async (req, res) => {
  if (!isId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid id" });
  const p = await Product.findOne({ _id: req.params.id, owner: req.user.id });
  if (!p) return res.status(404).json({ success: false, message: "Listing not found" });
  const soon = p.expiresAt && p.expiresAt.getTime() - Date.now() < 7 * 24 * 3600 * 1000;
  if (!(p.status === "expired" || (p.status === "active" && soon)))
    return res.status(400).json({ success: false, message: "Only expired or soon-to-expire listings can be renewed." });
  p.status = L.MODERATE && p.status === "expired" ? "pending" : "active";
  p.expiresAt = L.newExpiry();
  p.renewedAt = new Date();
  await p.save();
  res.json({ success: true, listing: p });
});

// POST /api/me/listings/:id/sold   { sold: true|false }  – mark sold / relist
mine.post("/:id/sold", async (req, res) => {
  if (!isId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid id" });
  const p = await Product.findOne({ _id: req.params.id, owner: req.user.id });
  if (!p) return res.status(404).json({ success: false, message: "Listing not found" });
  if (req.body.sold === false) {
    if (p.status !== "sold") return res.status(400).json({ success: false, message: "Listing is not marked as sold." });
    p.status = L.MODERATE ? "pending" : "active";
    p.soldAt = undefined;
    p.expiresAt = L.newExpiry();
  } else {
    if (p.status !== "active") return res.status(400).json({ success: false, message: "Only active listings can be marked as sold." });
    p.status = "sold";
    p.soldAt = new Date();
  }
  await p.save();
  res.json({ success: true, listing: p });
});

// DELETE /api/me/listings/:id
mine.delete("/:id", async (req, res) => {
  if (!isId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid id" });
  const p = await Product.findOneAndDelete({ _id: req.params.id, owner: req.user.id });
  if (!p) return res.status(404).json({ success: false, message: "Listing not found" });
  await L.destroyImages(p.images);
  res.json({ success: true });
});

// ───────────────────────── Public: /api/listings, /api/sellers ─────────────
const pub = express.Router();

// GET /api/listings/:id  – by Mongo _id or numeric id. Includes the seller's public card.
pub.get("/listings/:id", optionalAuth, async (req, res) => {
  const key = req.params.id;
  const p = isId(key) ? await Product.findById(key) : /^\d+$/.test(key) ? await Product.findOne({ id: Number(key) }) : null;
  if (!p) return res.status(404).json({ success: false, message: "Listing not found" });
  const isOwner = req.user && p.owner && String(p.owner) === req.user.id;
  const visible = !L.HIDDEN.includes(p.status || "active") && (!p.expiresAt || p.expiresAt > new Date());
  if (!visible && !isOwner && p.status !== "sold") return res.status(404).json({ success: false, message: "Listing not found" });

  const seller = p.owner ? await User.findById(p.owner) : null;
  res.json({
    success: true,
    listing: L.publicListing(p, { owner: !!isOwner }),
    isOwner: !!isOwner,
    seller: seller ? { ...publicProfile(seller), id: seller.id } : null,
  });
});

// GET /api/categories – category tree + per-category rules for the Post Ad form
pub.get("/categories", (req, res) => {
  res.set("Cache-Control", "public, max-age=3600");
  res.json({ success: true, ...C.publicTree() });
});

// POST /api/listings/:id/view – bump view counter (client de-dupes per session)
pub.post("/listings/:id/view", async (req, res) => {
  if (isId(req.params.id)) await Product.updateOne({ _id: req.params.id }, { $inc: { views: 1 } });
  res.json({ success: true });
});

// GET /api/sellers/:username – public profile page
pub.get("/sellers/:username", async (req, res) => {
  const user = await User.findOne({ username: String(req.params.username).toLowerCase() });
  if (!user || user.status === "suspended") return res.status(404).json({ success: false, message: "Seller not found" });
  const [listings, ratings] = await Promise.all([
    Product.find({ owner: user._id, ...L.liveQuery() }).sort({ createdAt: -1 }).limit(60),
    Rating.find({ ratee: user._id }).sort({ createdAt: -1 }).limit(20).populate("rater", "name username avatar idVerification.status"),
  ]);
  res.json({
    success: true,
    seller: publicProfile(user),
    listings: listings.map((l) => L.publicListing(l)),
    ratings: ratings.map((r) => ({ id: r.id, stars: r.stars, comment: r.comment, createdAt: r.createdAt, rater: userCard(r.rater) })),
  });
});

// GET /api/companies?q=&category=&page=&limit=  – public directory of business accounts
pub.get("/companies", async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(48, Math.max(1, parseInt(req.query.limit) || 24));
  const filter = { accountType: "business", "business.name": { $exists: true, $ne: "" }, status: { $ne: "suspended" } };
  if (req.query.q) filter["business.name"] = { $regex: String(req.query.q).slice(0, 60).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
  if (req.query.category) filter["business.category"] = String(req.query.category).slice(0, 60);

  const [users, total] = await Promise.all([
    User.find(filter).sort({ "idVerification.status": -1, "rating.avg": -1, createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    User.countDocuments(filter),
  ]);
  const counts = await Product.aggregate([
    { $match: { owner: { $in: users.map((u) => u._id) }, ...L.liveQuery() } },
    { $group: { _id: "$owner", n: { $sum: 1 } } },
  ]);
  const byOwner = Object.fromEntries(counts.map((c) => [String(c._id), c.n]));
  res.json({
    success: true,
    total, page, pages: Math.ceil(total / limit),
    companies: users.map((u) => {
      const p = publicProfile(u);
      return {
        username: p.username, name: p.name, logo: p.avatar, category: p.business?.category, description: (p.business?.description || "").slice(0, 160),
        address: p.business?.address, location: p.location, verified: p.verified, rating: p.rating, listings: byOwner[String(u._id)] || 0,
      };
    }),
  });
});

module.exports = { mine, pub, CATEGORIES };