// Cart API. Cart shape (unchanged): User.cart = { [Product.id]: quantity }, now sparse (no 301 zero slots).
//   GET    /api/cart            -> { cart }
//   PUT    /api/cart/item       -> set ONE line to an absolute quantity (0 removes). Idempotent, so retries/out-of-order clicks can't drift.
//   POST   /api/cart/merge      -> merge a guest cart into the account cart (per-item max, so nothing is double counted)
//   DELETE /api/cart            -> empty the cart
//   POST   /api/cart/lookup     -> public: product + seller details (and availability) for a list of product ids
// plus the old /addtocart, /removefromcart, /getcart endpoints, now validated, for browsers still running an old bundle.
const express = require("express");
const Product = require("../schema/product");
const User = require("../schema/user");
const { fetchUser } = require("../lib/auth");
const L = require("../lib/listings");
const { publicProfile } = require("../lib/profile");

const MAX_QTY = 10;     // per line
const MAX_LINES = 50;   // distinct listings per cart

const cleanCart = (raw) => {
  const out = {};
  for (const [k, v] of Object.entries(raw || {})) {
    const id = Number(k);
    const q = Math.min(MAX_QTY, Math.floor(Number(v)));
    if (Number.isInteger(id) && id >= 0 && q > 0) out[id] = q;
    if (Object.keys(out).length >= MAX_LINES) break;
  }
  return out;
};

const getCart = async (userId) => cleanCart((await User.findById(userId).select("cart"))?.cart);
const saveCart = (userId, cart) => User.updateOne({ _id: userId }, { $set: { cart } });

// null if the listing can be added, otherwise a user-facing reason
async function whyNotAddable(itemId, userId) {
  const p = await Product.findOne({ $and: [{ id: itemId }, L.liveQuery()] }).select("owner");
  if (!p) return "This listing is no longer available.";
  if (p.owner && String(p.owner) === String(userId)) return "You can't add your own listing to the cart.";
  return null;
}

async function setLine(userId, itemId, qty) {
  const cart = await getCart(userId);
  if (qty > 0) {
    if (!(itemId in cart) && Object.keys(cart).length >= MAX_LINES) return { error: `Your cart is full (max ${MAX_LINES} different items).` };
    const why = await whyNotAddable(itemId, userId);
    if (why) return { error: why };
    cart[itemId] = qty;
  } else {
    delete cart[itemId];
  }
  await saveCart(userId, cart);
  return { cart };
}

const router = express.Router();

router.get("/", fetchUser, async (req, res) => {
  res.json({ success: true, cart: await getCart(req.user.id) });
});

router.put("/item", fetchUser, async (req, res) => {
  const itemId = Number(req.body.itemId);
  const qty = Number(req.body.qty);
  if (!Number.isInteger(itemId) || itemId < 0) return res.status(400).json({ success: false, message: "Invalid item." });
  if (!Number.isInteger(qty) || qty < 0 || qty > MAX_QTY) return res.status(400).json({ success: false, message: `Quantity must be between 0 and ${MAX_QTY}.` });
  const r = await setLine(req.user.id, itemId, qty);
  if (r.error) return res.status(400).json({ success: false, message: r.error });
  res.json({ success: true, cart: r.cart });
});

router.post("/merge", fetchUser, async (req, res) => {
  const incoming = cleanCart(req.body.items);
  const cart = await getCart(req.user.id);
  const ids = Object.keys(incoming).map(Number);
  if (ids.length) {
    const ok = await Product.find({ $and: [{ id: { $in: ids } }, L.liveQuery()] }).select("id owner");
    for (const p of ok) {
      if (p.owner && String(p.owner) === String(req.user.id)) continue;
      if (!(p.id in cart) && Object.keys(cart).length >= MAX_LINES) continue;
      cart[p.id] = Math.max(cart[p.id] || 0, incoming[p.id]);
    }
    await saveCart(req.user.id, cart);
  }
  res.json({ success: true, cart });
});

router.delete("/", fetchUser, async (req, res) => {
  await saveCart(req.user.id, {});
  res.json({ success: true, cart: {} });
});

// Public. Unknown ids come back in `missing`; sold / expired / removed / suspended-seller listings come back with available:false
router.post("/lookup", async (req, res) => {
  const ids = [...new Set((Array.isArray(req.body.ids) ? req.body.ids : []).map(Number).filter((n) => Number.isInteger(n) && n >= 0))].slice(0, MAX_LINES);
  if (!ids.length) return res.json({ success: true, items: [], missing: [] });

  const [all, live] = await Promise.all([
    Product.find({ id: { $in: ids } }).populate("owner"),
    Product.find({ $and: [{ id: { $in: ids } }, L.liveQuery()] }).select("id"),
  ]);
  const liveIds = new Set(live.map((p) => p.id));
  const items = all.map((p) => {
    const o = p.owner && p.owner.name !== undefined ? p.owner : null;
    const seller = o ? publicProfile(o) : null;
    const available = liveIds.has(p.id) && !(o && o.status === "suspended");
    return {
      id: p.id, _id: String(p._id), title: p.title, price: p.price, image: p.images?.[0] || "", category: p.category,
      city: p.city, region: p.region, phone: p.phone || seller?.business?.phone || "",
      available,
      seller: seller ? { id: seller.id, name: seller.name, username: seller.username, verified: seller.verified } : null,
    };
  });
  const found = new Set(items.map((i) => i.id));
  res.json({ success: true, items, missing: ids.filter((i) => !found.has(i)) });
});

// ── Legacy endpoints (old bundles) ─────────────────────────────────────────
const legacy = express.Router();
legacy.get("/getcart", fetchUser, async (req, res) => res.json({ cartData: await getCart(req.user.id) }));
legacy.post("/addtocart", fetchUser, async (req, res) => {
  const itemId = Number(req.body.itemId);
  if (!Number.isInteger(itemId) || itemId < 0) return res.status(400).send("Invalid item");
  const cart = await getCart(req.user.id);
  const r = await setLine(req.user.id, itemId, Math.min(MAX_QTY, (cart[itemId] || 0) + 1));
  if (r.error) return res.status(400).send(r.error);
  res.send("Added");
});
legacy.post("/removefromcart", fetchUser, async (req, res) => {
  const itemId = Number(req.body.itemId);
  if (!Number.isInteger(itemId) || itemId < 0) return res.status(400).send("Invalid item");
  const cart = await getCart(req.user.id);
  await setLine(req.user.id, itemId, Math.max(0, (cart[itemId] || 0) - 1));
  res.send("Removed");
});

module.exports = { router, legacy, cleanCart, MAX_QTY, MAX_LINES };