const mongoose = require("mongoose");
const { Schema } = mongoose;

const REASONS = ["spam", "misclassified", "duplicate", "expired", "offensive", "scam"];

// "Report listing" (Faji: Spam / Misclassified / Duplicated / Expired / Offensive)
const ReportSchema = new Schema(
  {
    listing: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    reporter: { type: Schema.Types.ObjectId, ref: "User" },   // absent for guests
    ip: String,
    reason: { type: String, enum: REASONS, required: true },
    details: { type: String, maxlength: 500 },
    status: { type: String, enum: ["open", "resolved"], default: "open", index: true },
    resolvedAt: Date,
  },
  { timestamps: true }
);
// One report per signed-in user per listing
ReportSchema.index({ listing: 1, reporter: 1 }, { unique: true, partialFilterExpression: { reporter: { $type: "objectId" } } });

const Report = mongoose.model("Report", ReportSchema);
Report.REASONS = REASONS;
module.exports = Report;
