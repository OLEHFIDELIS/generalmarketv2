const mongoose = require("mongoose");
const { Schema } = mongoose;

const RatingSchema = new Schema(
  {
    rater: { type: Schema.Types.ObjectId, ref: "User", required: true },
    ratee: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    stars: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, maxlength: 500 },
  },
  { timestamps: true }
);
RatingSchema.index({ rater: 1, ratee: 1 }, { unique: true }); // one rating per pair (editable)

module.exports = mongoose.model("Rating", RatingSchema);
