const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const User = require("../schema/user");
const { signToken } = require("../lib/auth");
const { ciEmail, uniqueUsername, uniqueReferralCode } = require("../lib/profile");
const rateLimit = require("../lib/rateLimit");

const router = express.Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const signupLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 20, message: "Too many sign-ups from this network. Try again later." });
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  key: (req) => `${req.ip}:${String(req.body?.email || "").toLowerCase()}`,
  message: "Too many login attempts. Please wait a few minutes and try again.",
});

const safeEqual = (a, b) => {
  const A = Buffer.from(String(a)), B = Buffer.from(String(b));
  return A.length === B.length && crypto.timingSafeEqual(A, B);
};

// POST /api/signup  { name, email, password, ref? }
router.post("/signup", signupLimiter, async (req, res) => {
  const name = String(req.body.name || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  const ref = String(req.body.ref || "").trim().toUpperCase();

  if (name.length < 2) return res.status(400).json({ success: false, errors: "Please enter your full name." });
  if (!EMAIL_RE.test(email)) return res.status(400).json({ success: false, errors: "Please enter a valid email address." });
  if (password.length < 8) return res.status(400).json({ success: false, errors: "Password must be at least 8 characters." });
  if (password.length > 72) return res.status(400).json({ success: false, errors: "Password must be 72 characters or fewer." });

  if (await User.exists({ email: ciEmail(email) })) {
    return res.status(400).json({ success: false, errors: "email address already exist" });
  }

  let referredBy = null;
  if (ref) {
    const referrer = await User.findOne({ "referral.code": ref }).select("_id");
    if (referrer) referredBy = referrer._id;
  }

  const cart = {};
  for (let i = 0; i < 300; i++) cart[i] = 0;

  try {
    const user = await User.create({
      name, email, cart,
      password: await bcrypt.hash(password, 10),
      username: await uniqueUsername(name || email),
      referral: { code: await uniqueReferralCode(), referredBy },
      lastLoginAt: new Date(),
    });
    res.json({ success: true, token: signToken(user) });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ success: false, errors: "email address already exist" });
    throw err;
  }
});

// POST /api/login  { email, password }
router.post("/login", loginLimiter, async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  const fail = () => res.status(401).json({ success: false, error: "Wrong Email or Password" });
  if (!email || !password) return fail();

  const user = await User.findOne({ email: ciEmail(email) }).select("+password status");
  if (!user || !user.password) return fail();

  let ok = false;
  if (user.password.startsWith("$2")) {
    ok = await bcrypt.compare(password, user.password);
  } else {
    // Legacy plaintext account: verify, then upgrade to a bcrypt hash transparently
    ok = safeEqual(password, user.password);
    if (ok) user.password = await bcrypt.hash(password, 10);
  }
  if (!ok) return fail();
  if (user.status === "suspended") return res.status(403).json({ success: false, error: "This account has been suspended." });

  user.lastLoginAt = new Date();
  await user.save();
  res.json({ success: true, token: signToken(user) });
});

module.exports = router;
