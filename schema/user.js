const mongoose = require("mongoose");
const { Schema } = mongoose;

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const ID_DOCS = ["nin", "drivers_license", "voters_card", "passport", "cac"];

const OpeningHourSchema = new Schema(
  {
    day: { type: String, enum: DAYS, required: true },
    open: { type: String, default: "09:00" },
    close: { type: String, default: "18:00" },
    closed: { type: Boolean, default: false },
  },
  { _id: false }
);

const UserSchema = new Schema(
  {
    // ── Original fields (unchanged, so existing accounts keep working) ──────
    name: { type: String, trim: true },
    email: { type: String, unique: true, trim: true },
    // select:false → never returned by default. Routes that need it use .select("+password").
    // Legacy accounts hold plaintext here; they are upgraded to bcrypt on next login (or via scripts/migrate.js).
    password: { type: String, select: false },
    cart: { type: Object },
    date: { type: Date, default: Date.now }, // legacy "created" stamp; createdAt (below) supersedes it

    // ── Public identity ─────────────────────────────────────────────────────
    username: { type: String, lowercase: true, trim: true, unique: true, sparse: true, match: /^[a-z0-9_-]{3,30}$/ },
    avatar: String,
    bio: { type: String, maxlength: 500 },
    phone: { type: String, trim: true },
    whatsapp: { type: String, trim: true },
    location: {
      state: { type: String, trim: true },
      city: { type: String, trim: true },
      address: { type: String, trim: true },
    },

    // ── Account ─────────────────────────────────────────────────────────────
    accountType: { type: String, enum: ["individual", "business"], default: "individual" },
    role: { type: String, enum: ["user", "admin"], default: "user", index: true },
    status: { type: String, enum: ["active", "suspended"], default: "active" },
    emailVerified: { type: Boolean, default: false },
    phoneVerified: { type: Boolean, default: false },
    lastLoginAt: Date,

    // ── ID verification (documents live in a private Cloudinary folder and are deleted once reviewed) ──
    idVerification: {
      status: { type: String, enum: ["none", "pending", "verified", "rejected"], default: "none", index: true },
      documentType: { type: String, enum: ID_DOCS },
      frontId: String,
      backId: String,
      selfieId: String,
      submittedAt: Date,
      reviewedAt: Date,
      reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
      rejectionReason: String,
    },

    // ── Business profile (Faji "Business profile" + public company page) ────
    business: {
      name: { type: String, trim: true },
      description: String,
      category: String,
      logo: String,
      address: String,
      phone: String,
      email: String,
      website: String,
      paymentMethods: [String],
      openingHours: [OpeningHourSchema],
      gallery: [String],
    },

    // ── Preferences ─────────────────────────────────────────────────────────
    notifications: {
      email: { type: Boolean, default: true },
      messages: { type: Boolean, default: true },
      offers: { type: Boolean, default: true },
      alerts: { type: Boolean, default: true },
    },

    // ── Seller payout account (escrow payouts). The full account number is NOT stored: only the
    //    last 4 digits for display; Paystack keeps the account behind `recipientCode`.
    payout: {
      bankCode: String,
      bankName: String,
      accountLast4: String,
      accountName: String,
      recipientCode: String,
      verifiedAt: Date,
    },

    // ── Referrals ───────────────────────────────────────────────────────────
    referral: {
      code: { type: String, uppercase: true, unique: true, sparse: true },
      referredBy: { type: Schema.Types.ObjectId, ref: "User", index: true },
    },

    // ── Reputation (denormalised from the Rating collection by routes/ratings.js) ──
    rating: {
      avg: { type: Number, default: 0, min: 0, max: 5 },
      count: { type: Number, default: 0, min: 0 },
    },

    // ── Favourites (Product _ids) ───────────────────────────────────────────
    favorites: [{ type: Schema.Types.ObjectId, ref: "Product" }],
  },
  {
    timestamps: true,
    minimize: false, // keep cart's zero entries ({0:0,1:0,...}) exactly as before
  }
);

// "N likes" on a listing = how many users have it in favorites
UserSchema.index({ favorites: 1 });

// Public company directory lookups
UserSchema.index({ accountType: 1, "business.name": 1 });

const User = mongoose.model("User", UserSchema);
User.DAYS = DAYS;
User.ID_DOCS = ID_DOCS;
module.exports = User;