const mongoose = require("mongoose");
const { Schema } = mongoose;

const SavedSearchSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, trim: true, maxlength: 80 },
    query: {
      q: { type: String, trim: true, maxlength: 100 },
      categories: [String],
      regions: [String],
      conditions: [String],
      transactions: [String],
      minPrice: Number,
      maxPrice: Number,
    },
    lastCheckedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SavedSearch", SavedSearchSchema);
