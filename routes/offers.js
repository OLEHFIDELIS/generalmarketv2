const express = require("express");
const mongoose = require("mongoose");
const Offer = require("../schema/offer");
const Product = require("../schema/product");
const Thread = require("../schema/thread");
const { fetchUser } = require("../lib/auth");
const { isId, userCard } = require("../lib/profile");
const { liveQuery } = require("../lib/listings");
const rateLimit = require("../lib/rateLimit");
const { post, pairKey } = require("./messages");

const router = express.Router();
router.use(["/me/offers", "/offers"], fetchUser);
const offerLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 30, key: (r) => `offer:${r.user?.id}`, message: "Too many offers. Try again later." });
const naira = (n) => "₦" + Number(n).toLocaleString("en-NG");

// POST /api/offers  { listingId, amount, message? }
router.post("/offers", offerLimiter, async (req, res) => {
  const { listingId } = req.body;
  const amount = Number(req.body.amount);
  const message = String(req.body.message || "").trim().slice(0, 500);
  if (!isId(String(listingId))) return res.status(400).json({ success: false, message: "Invalid listing." });
  if (!Number.isFinite(amount) || amount < 1 || amount > 1e12) return res.status(400).json({ success: false, message: "Enter a valid offer amount." });

  const listing = await Product.findOne({ _id: listingId, ...liveQuery() });
  if (!listing) return res.status(404).json({ success: false, message: "This listing is no longer available." });
  if (!listing.owner) return res.status(400).json({ success: false, message: "Offers aren't available for this listing. Please contact the seller directly." });
  if (String(listing.owner) === req.user.id) return res.status(400).json({ success: false, message: "You can't make an offer on your own listing." });
  if (await Offer.exists({ listing: listing._id, buyer: req.user.id, status: "pending" }))
    return res.status(400).json({ success: false, message: "You already have a pending offer on this listing. Withdraw it first." });

  const offer = await Offer.create({
    listing: listing._id, listingTitle: listing.title, listingPrice: listing.price, listingImage: listing.images?.[0],
    buyer: req.user.id, seller: listing.owner, amount, message,
  });

  // Drop it into the conversation so the seller sees it in Messages too
  const key = pairKey(req.user.id, listing.owner, listing._id);
  let thread = await Thread.findOne({ pairKey: key });
  if (!thread) {
    thread = await Thread.create({ pairKey: key, participants: [req.user.id, listing.owner], listing: listing._id, listingTitle: listing.title, listingImage: listing.images?.[0] });
  }
  if (!thread.blockedBy.length) await post(thread, req.user.id, `Offer: ${naira(amount)}${message ? " — " + message : ""}`, { kind: "offer", offer: offer._id });

  res.status(201).json({ success: true, offer });
});

// GET /api/me/offers?type=received|sent
router.get("/me/offers", async (req, res) => {
  const uid = new mongoose.Types.ObjectId(req.user.id);
  const received = req.query.type !== "sent";
  const offers = await Offer.find(received ? { seller: uid } : { buyer: uid })
    .sort({ createdAt: -1 }).limit(100).populate(received ? "buyer" : "seller", "name username avatar idVerification.status");
  res.json({
    success: true,
    offers: offers.map((o) => ({
      id: o.id, listing: { id: o.listing, title: o.listingTitle, price: o.listingPrice, image: o.listingImage },
      amount: o.amount, message: o.message, status: o.status, createdAt: o.createdAt, respondedAt: o.respondedAt,
      user: userCard(received ? o.buyer : o.seller),
    })),
  });
});

// POST /api/offers/:id/respond  { action: "accept"|"decline" }   (seller)
router.post("/offers/:id/respond", async (req, res) => {
  if (!isId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid id" });
  const action = req.body.action;
  if (!["accept", "decline"].includes(action)) return res.status(400).json({ success: false, message: "Invalid action." });
  const o = await Offer.findOne({ _id: req.params.id, seller: req.user.id });
  if (!o) return res.status(404).json({ success: false, message: "Offer not found" });
  if (o.status !== "pending") return res.status(400).json({ success: false, message: `This offer was already ${o.status}.` });
  o.status = action === "accept" ? "accepted" : "declined";
  o.respondedAt = new Date();
  await o.save();
  const thread = await Thread.findOne({ pairKey: pairKey(o.buyer, o.seller, o.listing) });
  if (thread && !thread.blockedBy.length)
    await post(thread, req.user.id, action === "accept" ? `I accepted your offer of ${naira(o.amount)}. Let's arrange the deal.` : `I declined your offer of ${naira(o.amount)}.`);
  res.json({ success: true, offer: o });
});

// POST /api/offers/:id/withdraw   (buyer)
router.post("/offers/:id/withdraw", async (req, res) => {
  if (!isId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid id" });
  const o = await Offer.findOne({ _id: req.params.id, buyer: req.user.id });
  if (!o) return res.status(404).json({ success: false, message: "Offer not found" });
  if (o.status !== "pending") return res.status(400).json({ success: false, message: `This offer was already ${o.status}.` });
  o.status = "withdrawn";
  o.respondedAt = new Date();
  await o.save();
  res.json({ success: true, offer: o });
});

module.exports = router;
