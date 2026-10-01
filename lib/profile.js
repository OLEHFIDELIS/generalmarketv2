const crypto = require("crypto");
const User = require("../schema/user");

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const ciEmail = (email) => new RegExp(`^${escapeRegex(email)}$`, "i"); // legacy accounts may have mixed-case emails
const isId = (v) => typeof v === "string" && /^[a-f\d]{24}$/i.test(v);

const slug = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 24);

async function uniqueUsername(seed) {
  let base = slug(String(seed).split("@")[0]);
  if (base.length < 3) base = (base + "user").slice(0, 8);
  let candidate = base;
  for (let i = 0; i < 8; i++) {
    if (!(await User.exists({ username: candidate }))) return candidate;
    candidate = `${base}${Math.floor(1000 + Math.random() * 9000)}`;
  }
  return `${base}${crypto.randomBytes(3).toString("hex")}`;
}

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
async function uniqueReferralCode() {
  for (let i = 0; i < 10; i++) {
    let code = "";
    const bytes = crypto.randomBytes(8);
    for (let j = 0; j < 8; j++) code += CODE_CHARS[bytes[j] % CODE_CHARS.length];
    if (!(await User.exists({ "referral.code": code }))) return code;
  }
  throw new Error("Could not generate referral code");
}

// What's missing from the profile (shown as "Your profile is not complete! (N issues)")
function profileIssues(u) {
  const issues = [];
  if (!u.phone) issues.push("Add a phone number");
  if (!u.avatar) issues.push("Upload a profile photo");
  if (!u.location?.state || !u.location?.city) issues.push("Set your location");
  if (!u.bio) issues.push("Write a short bio");
  if (u.accountType === "business" && !u.business?.name) issues.push("Complete your business profile");
  return issues;
}

const plain = (v) => (v && typeof v.toObject === "function" ? v.toObject() : v);

// Everything the owner may see about themselves (never password or verification document ids)
function privateProfile(u) {
  const iv = u.idVerification || {};
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    username: u.username,
    phone: u.phone || "",
    whatsapp: u.whatsapp || "",
    avatar: u.avatar || "",
    bio: u.bio || "",
    location: { state: u.location?.state || "", city: u.location?.city || "", address: u.location?.address || "" },
    accountType: u.accountType || "individual",
    role: u.role || "user",
    emailVerified: !!u.emailVerified,
    phoneVerified: !!u.phoneVerified,
    verification: {
      status: iv.status || "none",
      documentType: iv.documentType || null,
      submittedAt: iv.submittedAt || null,
      reviewedAt: iv.reviewedAt || null,
      rejectionReason: iv.rejectionReason || null,
    },
    business: plain(u.business) || {},
    notifications: plain(u.notifications) || {},
    referralCode: u.referral?.code || null,
    rating: { avg: u.rating?.avg || 0, count: u.rating?.count || 0 },
    favoritesCount: (u.favorites || []).length,
    memberSince: u.createdAt || u.date || null,
    profileIssues: profileIssues(u),
  };
}

// What other people may see (no email, no personal phone)
function publicProfile(u) {
  const b = plain(u.business) || {};
  const isBusiness = u.accountType === "business" && b.name;
  return {
    id: u.id,
    name: isBusiness ? b.name : u.name,
    username: u.username,
    avatar: (isBusiness && b.logo) || u.avatar || "",
    bio: u.bio || "",
    location: { state: u.location?.state || "", city: u.location?.city || "" },
    accountType: u.accountType || "individual",
    verified: u.idVerification?.status === "verified",
    rating: { avg: u.rating?.avg || 0, count: u.rating?.count || 0 },
    memberSince: u.createdAt || u.date || null,
    business: isBusiness
      ? {
          name: b.name, description: b.description, category: b.category, logo: b.logo, address: b.address,
          phone: b.phone, email: b.email, website: b.website, paymentMethods: b.paymentMethods || [],
          openingHours: b.openingHours || [], gallery: b.gallery || [],
        }
      : null,
  };
}

// Small card used in lists (threads, offers, ratings)
const userCard = (u) =>
  u ? { id: u.id || String(u._id), name: u.name, username: u.username, avatar: u.avatar || "", verified: u.idVerification?.status === "verified" } : null;

module.exports = { escapeRegex, ciEmail, isId, uniqueUsername, uniqueReferralCode, profileIssues, privateProfile, publicProfile, userCard };
