const jwt = require("jsonwebtoken");
const User = require("../schema/user");

const JWT_SECRET = process.env.JWT_SECRET || "secret_ecom_dev";
if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
  console.warn("⚠️  JWT_SECRET is not set — using an insecure default. Set it in your environment variables.");
}

// Same payload shape as before ({ user: { id } }) so tokens already issued keep working.
const signToken = (user) => jwt.sign({ user: { id: user.id } }, JWT_SECRET, { expiresIn: "30d" });

const readToken = (req) =>
  req.header("auth-token") || (req.header("authorization") || "").replace(/^Bearer\s+/i, "") || null;

async function loadUser(req) {
  const token = readToken(req);
  if (!token) return null;
  let data;
  try { data = jwt.verify(token, JWT_SECRET); } catch { return null; }
  const id = data?.user?.id;
  if (!id) return null;
  const u = await User.findById(id).select("role status");
  if (!u) return null;
  return { id: u.id, role: u.role || "user", status: u.status || "active" };
}

// Requires a valid token (keeps the legacy response shape: { errors })
const fetchUser = async (req, res, next) => {
  const u = await loadUser(req);
  if (!u) return res.status(401).send({ success: false, errors: "Please authenticate using a valid token" });
  if (u.status === "suspended") return res.status(403).send({ success: false, errors: "This account has been suspended." });
  req.user = u;
  next();
};

// Attaches req.user if a valid token exists, otherwise continues anonymously
const optionalAuth = async (req, res, next) => {
  req.user = (await loadUser(req)) || null;
  next();
};

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") return res.status(403).json({ success: false, message: "Admins only" });
  next();
};

module.exports = { JWT_SECRET, signToken, fetchUser, optionalAuth, requireAdmin };
