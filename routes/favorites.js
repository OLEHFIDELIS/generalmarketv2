const express = require("express");
const User = require("../schema/user");
const Product = require("../schema/product");
const { fetchUser } = require("../lib/auth");
const { isId } = require("../lib/profile");
const { HIDDEN } = require("../lib/listings");

const router = express.Router();
router.use(fetchUser);
const MAX_FAVORITES = 500;

// GET /api/me/favorites/ids  – lightweight list for filling hearts
router.get("/ids", async (req, res) => {
  const u = await User.findById(req.user.id).select("favorites");
  res.json({ success: true, ids: u.favorites.map(String) });
});

// GET /api/me/favorites  – full listings (dangling ids are pruned)
router.get("/", async (req, res) => {
  const u = await User.findById(req.user.id).select("favorites");
  const products = await Product.find({ _id: { $in: u.favorites } });
  const found = new Set(products.map((p) => String(p._id)));
  if (found.size !== u.favorites.length) {
    u.favorites = u.favorites.filter((id) => found.has(String(id)));
    await u.save();
  }
  const order = new Map(u.favorites.map((id, i) => [String(id), i]));
  products.sort((a, b) => order.get(String(b._id)) - order.get(String(a._id))); // most recently saved first
  res.json({
    success: true,
    listings: products.map((p) => ({ ...p.toObject(), unavailable: HIDDEN.includes(p.status || "active") || (p.expiresAt && p.expiresAt < new Date()) })),
  });
});

// POST /api/me/favorites/:productId  – toggle
router.post("/:productId", async (req, res) => {
  const { productId } = req.params;
  if (!isId(productId)) return res.status(400).json({ success: false, message: "Invalid listing id" });
  const u = await User.findById(req.user.id).select("favorites");
  const has = u.favorites.some((id) => String(id) === productId);
  if (has) {
    u.favorites = u.favorites.filter((id) => String(id) !== productId);
  } else {
    if (!(await Product.exists({ _id: productId }))) return res.status(404).json({ success: false, message: "Listing not found" });
    if (u.favorites.length >= MAX_FAVORITES) return res.status(400).json({ success: false, message: "Favorites limit reached." });
    u.favorites.push(productId);
  }
  await u.save();
  res.json({ success: true, favorited: !has, count: u.favorites.length });
});

module.exports = router;
