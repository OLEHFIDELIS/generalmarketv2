const express = require("express");
const app = express();
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 4000;

const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("./cloudinary");

const Product = require("./schema/product");
const User = require("./schema/user");
const { mongoUri } = require("./lib/db");
const { fetchUser } = require("./lib/auth");
const L = require("./lib/listings");

// Behind Hostinger's proxy every request would otherwise share one IP, which breaks the rate limiters.
app.set("trust proxy", 1);

// --------------------------------------------------
// CORS + body parsing
// --------------------------------------------------
app.use(cors({ origin: "*", credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/images", express.static("uploads/images"));

// --------------------------------------------------
// MongoDB
// --------------------------------------------------
mongoose
  .connect(mongoUri())
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB error:", err.message));

// --------------------------------------------------
// Dashboard API (auth, profile, listings, messages, offers, ratings, favourites, alerts, admin)
// Order matters: the specific /api/me/* routers go before the generic /api/me router.
// --------------------------------------------------
const listingRoutes = require("./routes/listings");

app.use("/api", require("./routes/auth"));                     // POST /signup, /login
app.use("/api/me/listings", listingRoutes.mine);
app.use("/api/me/favorites", require("./routes/favorites"));
app.use("/api/me/alerts", require("./routes/alerts"));
app.use("/api/me", require("./routes/me"));                    // /, /avatar, /upload, /business, /password, /dashboard, /referrals, /verification
app.use("/api", require("./routes/messages"));                 // /me/threads, /me/unread-count, /threads/*
app.use("/api", require("./routes/offers"));                   // /offers, /me/offers
app.use("/api", require("./routes/ratings"));                  // /ratings, /me/ratings
app.use("/api", listingRoutes.pub);                            // /listings/:id, /sellers/:username, /companies
app.use("/api/admin", require("./routes/admin"));

// --------------------------------------------------
// Legacy storefront API (kept as-is for the shop pages + Admin panel)
// --------------------------------------------------
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "generalmarket",
    allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"],
    transformation: [{ width: 1000, height: 1000, crop: "limit" }],
  },
});
const upload = multer({ storage, limits: { fileSize: 8 * 1024 * 1024, files: 12 } });

// Upload images (used by the Admin panel; dashboard users use the authenticated /api/me/upload)
app.post("/api/upload", upload.array("images", 12), (req, res) => {
  if (!req.files || req.files.length === 0) return res.status(400).json({ success: false, message: "No files uploaded" });
  res.json({ success: true, urls: req.files.map((f) => f.path) });
});

// Add product (Admin panel). Listings created here have no owner and never expire.
app.post("/api/addproduct", async (req, res) => {
  try {
    const { category, title, description, price, transaction, condition, region, city, address, zip, phone, email, images } = req.body;
    const product = new Product({
      id: await L.nextProductId(),
      category, title, description, price, transaction, condition, region, city, address, zip, phone, email, images,
      status: "active", createdAt: new Date(), available: true,
    });
    await product.save();
    res.json({ success: true, message: "Product created successfully", product });
  } catch (err) {
    console.error("❌ Error creating product:", err.message);
    res.status(500).json({ success: false });
  }
});

// Remove product (Admin panel)
app.post("/api/removeproduct", async (req, res) => {
  try {
    const product = await Product.findById(req.body.id);
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });
    await Product.findByIdAndDelete(product._id);
    await L.destroyImages(product.images);
    res.json({ success: true, message: "Product deleted successfully" });
  } catch (error) {
    console.error("REMOVE PRODUCT ERROR:", error);
    res.status(500).json({ success: false, message: "Failed to delete product" });
  }
});

// Seeded Fisher-Yates so "popular" / "new" rotate once a day
function dailyShuffle(list, offset = 0) {
  const t = new Date();
  let s = t.getFullYear() * 10000 + (t.getMonth() + 1) * 100 + t.getDate() + offset;
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const j = Math.abs(s) % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// All publicly visible products (hides pending / rejected / expired / sold)
app.get("/api/allproduct", async (req, res) => {
  res.send(await Product.find(L.liveQuery()));
});

app.get("/api/newcollection", async (req, res) => {
  const recent = await Product.find(L.liveQuery()).sort({ createdAt: -1 }).limit(20);
  res.send(dailyShuffle(recent, 7).slice(0, 8));
});

app.get("/api/popular", async (req, res) => {
  res.send(dailyShuffle(await Product.find(L.liveQuery())).slice(0, 8));
});

// Cart (same behaviour as before, now using the shared auth middleware)
app.post("/api/addtocart", fetchUser, async (req, res) => {
  const u = await User.findById(req.user.id).select("cart");
  const cart = { ...(u.cart || {}) };
  cart[req.body.itemId] = (Number(cart[req.body.itemId]) || 0) + 1;
  await User.updateOne({ _id: req.user.id }, { cart });
  res.send("Added");
});

app.post("/api/removefromcart", fetchUser, async (req, res) => {
  const u = await User.findById(req.user.id).select("cart");
  const cart = { ...(u.cart || {}) };
  if (cart[req.body.itemId] > 0) cart[req.body.itemId] -= 1;
  await User.updateOne({ _id: req.user.id }, { cart });
  res.send("Removed");
});

app.get("/api/getcart", fetchUser, async (req, res) => {
  const u = await User.findById(req.user.id).select("cart");
  res.json({ cartData: u.cart });
});

// Related products
app.get("/api/related-products/:id", async (req, res) => {
  if (!/^[a-f\d]{24}$/i.test(req.params.id)) return res.status(400).json({ message: "Invalid id" });
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: "Product not found" });
  const category = String(product.category || "").trim();
  const base = { _id: { $ne: product._id } };
  const live = (extra) => Product.find({ $and: [L.liveQuery(), base, extra] }).limit(6);
  let related = await live({ category: { $regex: `^${require("./lib/profile").escapeRegex(category)}$`, $options: "i" }, price: { $gte: product.price * 0.8, $lte: product.price * 1.2 } });
  if (!related.length) related = await live({ category: { $regex: `^${require("./lib/profile").escapeRegex(category)}$`, $options: "i" } });
  if (!related.length) related = await live({});
  res.json(related);
});

// --------------------------------------------------
// Unknown /api routes → JSON 404 (instead of falling through to the React app)
// --------------------------------------------------
app.use("/api", (req, res) => res.status(404).json({ success: false, message: "Not found" }));

// JSON error handler (Express 5 forwards rejected async handlers here)
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const message = err.code === "LIMIT_FILE_SIZE" ? "That file is too large." : "Upload failed.";
    return res.status(400).json({ success: false, message });
  }
  if (err?.name === "CastError" || err?.name === "ValidationError") {
    return res.status(400).json({ success: false, message: err.message });
  }
  console.error("Server error:", err);
  if (res.headersSent) return next(err);
  res.status(500).json({ success: false, message: "Something went wrong on our side. Please try again." });
});

// --------------------------------------------------
// Serve React build (production)
// --------------------------------------------------
app.use(express.static(path.join(__dirname, "build")));
app.get("/{*path}", (req, res) => {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});

app.listen(port, () => {
  console.log(`✅ Server running on port ${port}`);
});
