// Tiny in-memory rate limiter (no extra dependency). Fine for a single Node process.
module.exports = function rateLimit({ windowMs, max, key, message }) {
  const buckets = new Map();
  setInterval(() => {
    const now = Date.now();
    for (const [k, b] of buckets) if (b.reset < now) buckets.delete(k);
  }, 10 * 60 * 1000).unref();

  return (req, res, next) => {
    const k = key ? key(req) : req.ip;
    const now = Date.now();
    let b = buckets.get(k);
    if (!b || b.reset < now) b = { count: 0, reset: now + windowMs };
    b.count += 1;
    buckets.set(k, b);
    if (b.count > max) {
      res.set("Retry-After", String(Math.ceil((b.reset - now) / 1000)));
      return res.status(429).json({ success: false, message: message || "Too many requests. Please try again later." });
    }
    next();
  };
};
