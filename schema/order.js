const mongoose = require("mongoose");
const { Schema } = mongoose;

// All money is stored as INTEGER KOBO (₦1 = 100 kobo) so there is never a rounding error.
const STATUSES = [
  "awaiting_payment", // order created, buyer has not paid yet (expires after 30 min)
  "paid",             // money is held in escrow, waiting for the seller to deliver
  "delivered",        // seller says the item was handed over; buyer has a few days to confirm / dispute
  "disputed",         // buyer raised a problem; an admin decides (release or refund)
  "completed",        // buyer confirmed (or auto-released); seller is paid out minus commission
  "refunded",         // buyer got their money back
  "cancelled",        // cancelled before payment
  "expired",          // not paid in time
  "review",           // payment received but amount didn't match: needs an admin to look
];

const ItemSchema = new Schema({
  listing: { type: Schema.Types.ObjectId, ref: "Product" },
  pid: Number,           // public numeric id of the listing (matches the cart)
  title: String,
  image: String,
  unitPrice: Number,     // kobo, price at the moment of purchase
  qty: Number,
}, { _id: false });

const EventSchema = new Schema({
  at: { type: Date, default: Date.now },
  by: { type: Schema.Types.ObjectId, ref: "User" },
  role: String,          // buyer | seller | admin | system
  type: String,
  note: String,
}, { _id: false });

const OrderSchema = new Schema({
  orderNo: { type: String, unique: true, required: true },
  buyer: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  seller: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  items: [ItemSchema],

  // ── Money (kobo) ───────────────────────────────────────────────
  itemTotal: { type: Number, required: true },        // what the goods cost
  buyerFee: { type: Number, default: 0 },             // service fee the buyer pays on top   -> platform revenue
  sellerCommission: { type: Number, default: 0 },     // commission kept from the seller      -> platform revenue
  total: { type: Number, required: true },            // itemTotal + buyerFee  = what Paystack charges the buyer
  sellerReceives: { type: Number, required: true },   // itemTotal - sellerCommission = what the seller is paid
  currency: { type: String, default: "NGN" },

  status: { type: String, enum: STATUSES, default: "awaiting_payment", index: true },

  delivery: {
    method: { type: String, enum: ["meetup", "delivery"], default: "meetup" },
    address: String,
    phone: String,
    note: String,
  },

  paystack: {
    reference: { type: String, unique: true, sparse: true },
    accessCode: String,
    authorizationUrl: String,
    channel: String,
    fees: { type: Number, default: 0 },               // what Paystack actually charged us (kobo), from verify
    txId: Number,
    paidAt: Date,
  },

  payout: {
    status: { type: String, enum: ["none", "processing", "paid", "failed"], default: "none" },
    reference: String,
    recipientCode: String,
    amount: Number,
    fee: { type: Number, default: 0 },                // transfer cost (kobo)
    attempts: { type: Number, default: 0 },
    lastError: String,
    requestedAt: Date,
    paidAt: Date,
  },

  refund: {
    status: { type: String, enum: ["none", "processing", "submitted", "processed", "failed"], default: "none" },
    amount: Number,
    reason: String,
    error: String,
    at: Date,
  },

  dispute: {
    openedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reason: String,
    details: String,
    openedAt: Date,
    resolvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    resolvedAt: Date,
    decision: { type: String, enum: ["release", "refund"] },
    adminNote: String,
  },

  flags: [String],                                    // amount_mismatch, late_payment, payout_reversed …

  expiresAt: Date,        // pay-by time while awaiting_payment
  sellerDeadline: Date,   // seller must mark delivered before this or the buyer is refunded automatically
  autoReleaseAt: Date,    // after "delivered": release to the seller automatically at this time
  paidAt: Date,
  deliveredAt: Date,
  completedAt: Date,
  refundedAt: Date,

  events: [EventSchema],
}, { timestamps: true });

OrderSchema.index({ status: 1, expiresAt: 1 });
OrderSchema.index({ status: 1, autoReleaseAt: 1 });
OrderSchema.index({ status: 1, sellerDeadline: 1 });
OrderSchema.index({ "payout.status": 1, status: 1 });

const Order = mongoose.model("Order", OrderSchema);
Order.STATUSES = STATUSES;
module.exports = Order;
