// Best-effort in-app notification: drops a message into the buyer/seller conversation about the listing,
// so order updates show up in Dashboard → Messages (and in the unread badge). Never throws.
const Thread = require("../schema/thread");
const Message = require("../schema/message");

const pairKey = (a, b, listing) => [String(a), String(b)].sort().join("_") + ":" + (listing ? String(listing) : "none");

async function notify(fromId, toId, listing, text) {
  try {
    if (!fromId || !toId || String(fromId) === String(toId)) return;
    const key = pairKey(fromId, toId, listing?._id || listing);
    let thread = await Thread.findOne({ pairKey: key });
    if (!thread) {
      thread = await Thread.create({
        participants: [fromId, toId], pairKey: key, listing: listing?._id || listing || undefined,
        listingTitle: listing?.title, listingImage: listing?.image,
      });
    }
    if ((thread.blockedBy || []).length) return;
    const msg = await Message.create({ thread: thread._id, sender: fromId, to: toId, text: String(text).slice(0, 1900) });
    await Thread.updateOne({ _id: thread._id }, { $set: { lastMessage: { text: String(text).slice(0, 120), sender: fromId, at: msg.createdAt || new Date() }, deletedFor: [] } });
  } catch (e) { console.warn("notify failed:", e.message); }
}

module.exports = { notify };
