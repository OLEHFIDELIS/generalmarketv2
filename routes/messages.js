const express = require("express");
const mongoose = require("mongoose");
const Thread = require("../schema/thread");
const Message = require("../schema/message");
const User = require("../schema/user");
const Product = require("../schema/product");
const { fetchUser } = require("../lib/auth");
const { isId, userCard } = require("../lib/profile");
const rateLimit = require("../lib/rateLimit");

const router = express.Router();
// Mounted at /api, so scope auth to our own paths only (must not block public /api routes)
router.use(["/me/unread-count", "/me/threads", "/threads"], fetchUser);

const sendLimiter = rateLimit({ windowMs: 60 * 1000, max: 30, key: (r) => `msg:${r.user?.id}`, message: "You're sending messages too quickly." });
const pairKey = (a, b, listing) => [String(a), String(b)].sort().join("_") + ":" + (listing ? String(listing) : "none");
const other = (t, me) => t.participants.find((p) => String(p._id || p) !== String(me));

async function post(thread, sender, text, extra = {}) {
  const to = other(thread, sender);
  const msg = await Message.create({ thread: thread._id, sender, to: to._id || to, text, ...extra });
  thread.lastMessage = { text: text.slice(0, 120), sender, at: msg.createdAt };
  thread.deletedFor = []; // new activity resurfaces the thread for both sides
  await thread.save();
  return msg;
}

// GET /api/me/unread-count
router.get("/me/unread-count", async (req, res) => {
  res.json({ success: true, count: await Message.countDocuments({ to: req.user.id, readAt: null }) });
});

// GET /api/me/threads  – my conversations
router.get("/me/threads", async (req, res) => {
  const uid = new mongoose.Types.ObjectId(req.user.id);
  const threads = await Thread.find({ participants: uid, deletedFor: { $ne: uid } })
    .sort({ updatedAt: -1 }).limit(100).populate("participants", "name username avatar idVerification.status");
  const unread = await Message.aggregate([
    { $match: { to: uid, readAt: null, thread: { $in: threads.map((t) => t._id) } } },
    { $group: { _id: "$thread", n: { $sum: 1 } } },
  ]);
  const u = Object.fromEntries(unread.map((x) => [String(x._id), x.n]));
  res.json({
    success: true,
    threads: threads.map((t) => ({
      id: t.id, with: userCard(other(t, uid)), listing: t.listing ? { id: t.listing, title: t.listingTitle, image: t.listingImage } : null,
      lastMessage: t.lastMessage, unread: u[String(t._id)] || 0, blocked: t.blockedBy.length > 0, blockedByMe: t.blockedBy.some((b) => String(b) === req.user.id),
      updatedAt: t.updatedAt,
    })),
  });
});

// POST /api/threads   { toUserId, listingId?, text }  – start (or reuse) a conversation
router.post("/threads", sendLimiter, async (req, res) => {
  const { toUserId, listingId } = req.body;
  const text = String(req.body.text || "").trim().slice(0, 2000);
  if (!isId(String(toUserId)) || !text) return res.status(400).json({ success: false, message: "Recipient and message are required." });
  if (String(toUserId) === req.user.id) return res.status(400).json({ success: false, message: "You can't message yourself." });
  const recipient = await User.findById(toUserId).select("_id status");
  if (!recipient || recipient.status === "suspended") return res.status(404).json({ success: false, message: "User not found." });

  let listing = null;
  if (listingId) {
    if (!isId(String(listingId))) return res.status(400).json({ success: false, message: "Invalid listing." });
    listing = await Product.findById(listingId).select("title images");
  }
  const key = pairKey(req.user.id, toUserId, listing?._id);
  let thread = await Thread.findOne({ pairKey: key });
  if (!thread) {
    thread = await Thread.create({
      pairKey: key, participants: [req.user.id, toUserId],
      listing: listing?._id, listingTitle: listing?.title, listingImage: listing?.images?.[0],
    });
  }
  if (thread.blockedBy.length) return res.status(403).json({ success: false, message: "You can't send messages in this conversation." });
  await post(thread, req.user.id, text);
  res.status(201).json({ success: true, threadId: thread.id });
});

async function loadThread(req, res) {
  if (!isId(req.params.id)) { res.status(400).json({ success: false, message: "Invalid id" }); return null; }
  const t = await Thread.findOne({ _id: req.params.id, participants: req.user.id });
  if (!t) { res.status(404).json({ success: false, message: "Conversation not found" }); return null; }
  return t;
}

// GET /api/threads/:id/messages?after=ISO  – marks incoming messages as read
router.get("/threads/:id/messages", async (req, res) => {
  const t = await loadThread(req, res); if (!t) return;
  const filter = { thread: t._id };
  if (req.query.after && !isNaN(Date.parse(req.query.after))) filter.createdAt = { $gt: new Date(req.query.after) };
  const messages = await Message.find(filter).sort({ createdAt: 1 }).limit(300);
  await Message.updateMany({ thread: t._id, to: req.user.id, readAt: null }, { $set: { readAt: new Date() } });
  await t.populate("participants", "name username avatar idVerification.status");
  res.json({
    success: true,
    with: userCard(other(t, req.user.id)),
    listing: t.listing ? { id: t.listing, title: t.listingTitle, image: t.listingImage } : null,
    blocked: t.blockedBy.length > 0, blockedByMe: t.blockedBy.some((b) => String(b) === req.user.id),
    messages: messages.map((m) => ({ id: m.id, mine: String(m.sender) === req.user.id, kind: m.kind, text: m.text, createdAt: m.createdAt, readAt: m.readAt })),
  });
});

// POST /api/threads/:id/messages  { text }
router.post("/threads/:id/messages", sendLimiter, async (req, res) => {
  const t = await loadThread(req, res); if (!t) return;
  const text = String(req.body.text || "").trim().slice(0, 2000);
  if (!text) return res.status(400).json({ success: false, message: "Message can't be empty." });
  if (t.blockedBy.length) return res.status(403).json({ success: false, message: "You can't send messages in this conversation." });
  const m = await post(t, req.user.id, text);
  res.status(201).json({ success: true, message: { id: m.id, mine: true, kind: m.kind, text: m.text, createdAt: m.createdAt } });
});

// POST /api/threads/:id/block  – toggle block for me
router.post("/threads/:id/block", async (req, res) => {
  const t = await loadThread(req, res); if (!t) return;
  const has = t.blockedBy.some((b) => String(b) === req.user.id);
  t.blockedBy = has ? t.blockedBy.filter((b) => String(b) !== req.user.id) : [...t.blockedBy, req.user.id];
  await t.save();
  res.json({ success: true, blockedByMe: !has });
});

// DELETE /api/threads/:id  – hide for me
router.delete("/threads/:id", async (req, res) => {
  const t = await loadThread(req, res); if (!t) return;
  if (!t.deletedFor.some((d) => String(d) === req.user.id)) t.deletedFor.push(req.user.id);
  await t.save();
  res.json({ success: true });
});

module.exports = router;
module.exports.post = post;
module.exports.pairKey = pairKey;
