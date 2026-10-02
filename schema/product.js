const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema({
    id:{ 
        type: Number, 
        required: true 
    },
    category: {
        type: String,
        required: true
    },
    title: {
        type: String,
        required: true,
    },
    description:{
        type: String,
        required: true
    },
    price:{
        type: Number,
        required: true 
    },
    transaction:{
        type: String,
    },
    condition:{
        type: String,
    },
    region:{
        type: String,
    },
    city:{
        type: String,
    },
    address: {
        type: String,
    },
    zip:{
        type: String,
    },
    phone:{
        type: String,
    },
    email:{
        type: String,
    },
    images: {
        type: [String],
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    available: {
        type: Boolean,
        default: true
    },

    // ── Dashboard / marketplace fields ─────────────────────────────────────
    // Legacy listings have none of these; lib/listings.js treats "no status / no expiresAt" as live.
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        index: true
    },
    status: {
        type: String,
        enum: ["active", "pending", "rejected", "expired", "sold"],
        default: "active",
        index: true
    },
    expiresAt: { type: Date, index: true },
    renewedAt: Date,
    soldAt: Date,
    rejectionReason: String,
    views: { type: Number, default: 0 },

    // ── Post Ad form (dynamic categories / price options / contact visibility) ──
    // category (above) stays the lowercase top-level name; categoryPath is the full path of display labels.
    categoryPath: [String],
    // Category-specific details, validated against lib/categories.js and stored with a label snapshot
    attributes: [{ _id: false, key: String, label: String, value: String, unit: String }],
    priceType: { type: String, enum: ["fixed", "free", "contact"], default: "fixed" },
    // undefined (legacy listings) is treated as "show", so existing ads keep working
    showPhone: Boolean,
    showEmail: Boolean,
    contactName: String
});

ProductSchema.index({ owner: 1, status: 1, createdAt: -1 });
ProductSchema.index({ id: 1 });

const Product = mongoose.model("Product", ProductSchema);

module.exports = Product;
