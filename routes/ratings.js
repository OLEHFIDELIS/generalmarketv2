const express = require("express");
const mongoose = require("mongoose");
const Rating = require("../schema/rating");
const Thread = require("../schema/thread");
const User = require("../schema/user");
const { fetchUser } = require("../lib/auth");
const { isId, userCard } = require("../lib/profile");

const router = express.Router();
router.use(["/me/ratings", "/ratings"], fetchUser);

async function refreshStats(rateeId) {
  const [agg] = await Rating.aggregate([
    { $match: { ratee: new mongoose.Types.ObjectId(String(rateeId)) } },
    { $group: { _id: "$ratee", avg: { $avg: "$stars" }, count: { $sum: 1 } } },
  ]);
  await User.updateOne({ _id: rateeId }, { $set: { "rating.avg": agg ? Math.round(agg.avg * 10) / 10 : 0, "rating.count": agg ? agg.count : 0 } });
}

// POST /api/ratings  { rateeId, stars, comment? }  – create or edit my rating of someone
router.post("/ratings", async (req, res) => {
  const { rateeId } = req.body;
  const stars = Number(req.body.stars);
  const comment = String(req.body.comment || "").trim().slice(0, 500);
  if (!isId(String(rateeId))) return res.status(400).json({ success: false, message: "Invalid user." });
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) return res.status(400).json({ success: false, message: "Choose 1 to 5 stars." });
  if (String(rateeId) === req.user.id) return res.status(400).json({ success: false, message: "You can't rate yourself." });
  if (!(await User.exists({ _id: rateeId }))) return res.status(404).json({ success: false, message: "User not found." });

  // Anti-fake-review rule: you can only rate people you've actually chatted with
  const talked = await Thread.exists({ participants: { $all: [req.user.id, rateeId] } });
  if (!talked) return res.status(403).json({ success: false, message: "You can only rate people you've chatted with on GeneralMarket." });

  const r = await Rating.findOneAndUpdate(
    { rater: req.user.id, ratee: rateeId },
    { $set: { stars, comment } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  await refreshStats(rateeId);
  res.json({ success: true, rating: r });
});

router.delete("/ratings/:id", async (req, res) => {
  if (!isId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid id" });
  const r = await Rating.findOneAndDelete({ _id: req.params.id, rater: req.user.id });
  if (!r) return res.status(404).json({ success: false, message: "Rating not found" });
  await refreshStats(r.ratee);
  res.json({ success: true });
});

// GET /api/me/ratings?type=received|given
router.get("/me/ratings", async (req, res) => {
  const received = req.query.type !== "given";
  const rows = await Rating.find(received ? { ratee: req.user.id } : { rater: req.user.id })
    .sort({ createdAt: -1 }).limit(100).populate(received ? "rater" : "ratee", "name username avatar idVerification.status");
  const me = await User.findById(req.user.id).select("rating");
  res.json({
    success: true,
    summary: { avg: me.rating?.avg || 0, count: me.rating?.count || 0 },
    ratings: rows.map((r) => ({ id: r.id, stars: r.stars, comment: r.comment, createdAt: r.createdAt, user: userCard(received ? r.rater : r.ratee) })),
  });
});

// GET /api/me/ratings/mine/:userId  – my existing rating for someone (to prefill the form)
router.get("/me/ratings/mine/:userId", async (req, res) => {
  if (!isId(req.params.userId)) return res.status(400).json({ success: false, message: "Invalid user." });
  const r = await Rating.findOne({ rater: req.user.id, ratee: req.params.userId });
  res.json({ success: true, rating: r });
});

module.exports = router;
