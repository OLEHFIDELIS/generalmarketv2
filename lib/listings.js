const Product = require("../schema/product");
const Counter = require("../schema/counter");
const cloudinary = require("../cloudinary");

const HIDDEN = ["pending", "rejected", "expired", "sold"];
const LISTING_DAYS = Number(process.env.LISTING_DAYS) || 30;
const MODERATE = String(process.env.MODERATE_LISTINGS || "").toLowerCase() === "true";

// Publicly visible listings. Legacy listings (no status / no expiresAt) count as live.
// If you need your own $or, combine with { $and: [liveQuery(), yours] }.
const liveQuery = () => ({
  status: { $nin: HIDDEN },
  $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
});

const newExpiry = () => new Date(Date.now() + LISTING_DAYS * 24 * 60 * 60 * 1000);

// Flip active listings whose expiry has passed to "expired"
const expireStale = (ownerId) =>
  Product.updateMany(
    { status: "active", expiresAt: { $lte: new Date() }, ...(ownerId ? { owner: ownerId } : {}) },
    { $set: { status: "expired" } }
  );

// Atomic incrementing numeric id (Product.id is what the cart uses). Seeds from the current max.
async function nextProductId() {
  const existing = await Counter.findById("product");
  if (!existing) {
    const top = await Product.findOne().sort({ id: -1 }).select("id").lean();
    try { await Counter.create({ _id: "product", seq: top ? top.id : 0 }); } catch { /* created concurrently */ }
  }
  const c = await Counter.findOneAndUpdate({ _id: "product" }, { $inc: { seq: 1 } }, { new: true });
  return c.seq;
}

// https://res.cloudinary.com/x/image/upload/v123/generalmarket/abc.jpg -> generalmarket/abc
const publicIdFromUrl = (url) => {
  const m = /\/upload\/(?:[^/]+\/)*?(?:v\d+\/)?(generalmarket\/[^.]+)\.[a-z0-9]+$/i.exec(url || "");
  return m ? m[1] : null;
};

async function destroyImages(urls = []) {
  await Promise.all(
    urls.map((u) => {
      const id = publicIdFromUrl(u);
      return id ? cloudinary.uploader.destroy(id).catch(() => null) : null;
    })
  );
}

const isHttpUrl = (u) => typeof u === "string" && /^https?:\/\//i.test(u) && u.length < 600;

// What the public may see of a listing: phone / email are removed when the seller chose to hide them.
// (undefined = legacy listing = visible, as before.) Pass { owner: true } to keep everything.
function publicListing(p, { owner = false } = {}) {
  if (!p) return p;
  const o = typeof p.toObject === "function" ? p.toObject() : { ...p };
  if (!owner) {
    if (o.showPhone === false) o.phone = "";
    if (o.showEmail === false) o.email = "";
  }
  return o;
}

module.exports = { publicListing, HIDDEN, LISTING_DAYS, MODERATE, liveQuery, newExpiry, expireStale, nextProductId, destroyImages, publicIdFromUrl, isHttpUrl };