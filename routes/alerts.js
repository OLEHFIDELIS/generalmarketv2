const express = require("express");
const SavedSearch = require("../schema/savedSearch");
const Product = require("../schema/product");
const { fetchUser } = require("../lib/auth");
const { isId } = require("../lib/profile");
const { liveQuery } = require("../lib/listings");
const { matchesQuery } = require("../lib/matchListing");

const router = express.Router();
router.use(fetchUser);
const MAX_ALERTS = 20;

const arr = (v) => (Array.isArray(v) ? v.map((x) => String(x).trim().slice(0, 60)).filter(Boolean).slice(0, 20) : []);
const num = (v) => (v === "" || v == null || !Number.isFinite(Number(v)) ? undefined : Number(v));

// Matching listings created after `since` (scans the newest 500 live listings)
async function matchesSince(query, since) {
  const cond = since ? { $and: [liveQuery(), { createdAt: { $gt: since } }] } : liveQuery();
  const candidates = await Product.find(cond).sort({ createdAt: -1 }).limit(500);
  return candidates.filter((p) => matchesQuery(p, query));
}

// GET /api/me/alerts  – saved searches + how many new matches each has
router.get("/", async (req, res) => {
  const alerts = await SavedSearch.find({ user: req.user.id }).sort({ createdAt: -1 });
  const out = await Promise.all(
    alerts.map(async (a) => {
      const fresh = await matchesSince(a.query, a.lastCheckedAt);
      return { ...a.toObject(), newCount: fresh.length, preview: fresh.slice(0, 3).map((p) => ({ _id: p._id, id: p.id, title: p.title, price: p.price, image: p.images?.[0] })) };
    })
  );
  res.json({ success: true, alerts: out });
});

// POST /api/me/alerts   { name?, query: {...} }
router.post("/", async (req, res) => {
  if ((await SavedSearch.countDocuments({ user: req.user.id })) >= MAX_ALERTS)
    return res.status(400).json({ success: false, message: `You can save up to ${MAX_ALERTS} searches.` });
  const q = req.body.query || {};
  const query = {
    q: String(q.q || "").trim().slice(0, 100),
    categories: arr(q.categories), regions: arr(q.regions), conditions: arr(q.conditions), transactions: arr(q.transactions),
    minPrice: num(q.minPrice), maxPrice: num(q.maxPrice),
  };
  const empty = !query.q && !query.categories.length && !query.regions.length && !query.conditions.length && !query.transactions.length && query.minPrice == null && query.maxPrice == null;
  if (empty) return res.status(400).json({ success: false, message: "Add a search term or at least one filter first." });
  const name = String(req.body.name || "").trim().slice(0, 80) || query.q || query.categories[0] || "My search";
  const alert = await SavedSearch.create({ user: req.user.id, name, query });
  res.status(201).json({ success: true, alert });
});

// GET /api/me/alerts/:id/results – all current matches; also marks the alert as seen
router.get("/:id/results", async (req, res) => {
  if (!isId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid id" });
  const a = await SavedSearch.findOne({ _id: req.params.id, user: req.user.id });
  if (!a) return res.status(404).json({ success: false, message: "Saved search not found" });
  const listings = await matchesSince(a.query, null);
  a.lastCheckedAt = new Date();
  await a.save();
  res.json({ success: true, alert: a, listings });
});

router.delete("/:id", async (req, res) => {
  if (!isId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid id" });
  const r = await SavedSearch.deleteOne({ _id: req.params.id, user: req.user.id });
  if (!r.deletedCount) return res.status(404).json({ success: false, message: "Saved search not found" });
  res.json({ success: true });
});

module.exports = router;
