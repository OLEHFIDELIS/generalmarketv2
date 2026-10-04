const mongoose = require("mongoose");
const { Schema } = mongoose;

// Public comments under a listing (Faji "Comments" block)
const CommentSchema = new Schema(
  {
    listing: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true, trim: true, minlength: 2, maxlength: 600 },
  },
  { timestamps: true }
);
CommentSchema.index({ listing: 1, createdAt: -1 });

module.exports = mongoose.model("Comment", CommentSchema);
