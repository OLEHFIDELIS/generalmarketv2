const mongoose = require("mongoose");
const { Schema } = mongoose;

const MessageSchema = new Schema(
  {
    thread: { type: Schema.Types.ObjectId, ref: "Thread", required: true, index: true },
    sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
    to: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    kind: { type: String, enum: ["text", "offer"], default: "text" },
    text: { type: String, required: true, maxlength: 2000 },
    offer: { type: Schema.Types.ObjectId, ref: "Offer" },
    readAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
MessageSchema.index({ thread: 1, createdAt: 1 });
MessageSchema.index({ to: 1, readAt: 1 });

module.exports = mongoose.model("Message", MessageSchema);
