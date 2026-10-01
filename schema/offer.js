const mongoose = require("mongoose");
const { Schema } = mongoose;

const OfferSchema = new Schema(
  {
    listing: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    listingTitle: String,
    listingPrice: Number,
    listingImage: String,
    buyer: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    seller: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    amount: { type: Number, required: true, min: 1 },
    message: { type: String, maxlength: 500 },
    status: { type: String, enum: ["pending", "accepted", "declined", "withdrawn"], default: "pending", index: true },
    respondedAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Offer", OfferSchema);
