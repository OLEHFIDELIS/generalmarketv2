/**
 * One-off migration for the dashboard release. Safe to run more than once.
 *
 *   node scripts/migrate.js                   # backfill usernames/referral codes/product status, create indexes
 *   node scripts/migrate.js --hash-passwords  # additionally bcrypt every remaining plaintext password
 *   node scripts/migrate.js --make-admin you@example.com
 *
 * Legacy listings are left WITHOUT an expiry date on purpose (they never expire),
 * otherwise every listing older than 30 days would vanish on the first run.
 */
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { mongoUri } = require("../lib/db");
const User = require("../schema/user");
const Product = require("../schema/product");
const Counter = require("../schema/counter");
const { uniqueUsername, uniqueReferralCode, ciEmail } = require("../lib/profile");

(async () => {
  await mongoose.connect(mongoUri());
  console.log("Connected");

  // 1. usernames + referral codes for existing users
  const users = await User.find({ $or: [{ username: null }, { "referral.code": null }] }).select("name email username referral");
  for (const u of users) {
    if (!u.username) u.username = await uniqueUsername(u.name || u.email || "user");
    if (!u.referral?.code) u.referral = { ...(u.referral?.toObject?.() || {}), code: await uniqueReferralCode() };
    await u.save();
  }
  console.log(`Backfilled ${users.length} user(s)`);

  // 2. products: explicit status for legacy rows
  const r = await Product.updateMany({ status: { $exists: false } }, { $set: { status: "active" } });
  console.log(`Products given status "active": ${r.modifiedCount}`);

  // 3. seed the id counter from the current max product id
  const top = await Product.findOne().sort({ id: -1 }).select("id").lean();
  await Counter.findOneAndUpdate({ _id: "product" }, { $max: { seq: top ? top.id : 0 } }, { upsert: true });
  console.log(`Product id counter seeded at ${top ? top.id : 0}`);

  // 4. optional: hash remaining plaintext passwords now (otherwise they upgrade on next login)
  if (process.argv.includes("--hash-passwords")) {
    const legacy = await User.find({ password: { $not: /^\$2/ } }).select("+password");
    for (const u of legacy) {
      if (!u.password) continue;
      u.password = await bcrypt.hash(u.password, 10);
      await u.save();
    }
    console.log(`Hashed ${legacy.length} plaintext password(s)`);
  }

  // 5. optional: promote an admin
  const i = process.argv.indexOf("--make-admin");
  if (i > -1 && process.argv[i + 1]) {
    const u = await User.findOneAndUpdate({ email: ciEmail(process.argv[i + 1]) }, { role: "admin" }, { new: true });
    console.log(u ? `${u.email} is now an admin` : "Admin email not found");
  }

  // 6. indexes (createIndexes never drops anything)
  await Promise.all([User.createIndexes(), Product.createIndexes()]);
  console.log("Indexes ensured. Done.");
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
