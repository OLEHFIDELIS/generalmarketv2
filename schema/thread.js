const mongoose = require("mongoose");
const { Schema } = mongoose;

const ThreadSchema = new Schema(
  {
    participants: { type: [{ type: Schema.Types.ObjectId, ref: "User" }], validate: (v) => v.length === 2 },
    // sorted "idA_idB:listingId|none" – guarantees one thread per pair per listing
    pairKey: { type: String, unique: true, required: true },
    listing: { type: Schema.Types.ObjectId, ref: "Product" },
    listingTitle: String,
    listingImage: String,
    lastMessage: { text: String, sender: { type: Schema.Types.ObjectId, ref: "User" }, at: Date },
    blockedBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
    deletedFor: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);
ThreadSchema.index({ participants: 1, updatedAt: -1 });

module.exports = mongoose.model("Thread", ThreadSchema);
