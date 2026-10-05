// Thin Paystack client (https://paystack.com/docs/api). Uses Node's built-in fetch: no extra dependency.
//
// MODES
//   live / test : PAYSTACK_SECRET_KEY is set (sk_live_… / sk_test_…)
//   demo        : no key AND PAYMENTS_DEMO=true AND NODE_ENV is not "production". A fake checkout page lets you
//                 try the whole escrow flow with no money moving. It can never switch on in production.
//   off         : nothing configured, escrow checkout is hidden.
const crypto = require("crypto");

const BASE = "https://api.paystack.co";
const secret = () => process.env.PAYSTACK_SECRET_KEY || "";

function mode() {
  if (secret()) return secret().startsWith("sk_live") ? "live" : "test";
  if (process.env.PAYMENTS_DEMO === "true" && process.env.NODE_ENV !== "production") return "demo";
  return "off";
}
const enabled = () => mode() !== "off";

async function call(method, path, body) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  try {
    const res = await fetch(BASE + path, {
      method,
      headers: { Authorization: `Bearer ${secret()}`, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.status === false) {
      const e = new Error(json.message || `Paystack error (${res.status})`);
      e.status = res.status; e.paystack = json;
      throw e;
    }
    return json.data;
  } catch (e) {
    if (e.name === "AbortError") throw new Error("Paystack took too long to respond. Please try again.");
    throw e;
  } finally { clearTimeout(timer); }
}

// ── demo-mode state (in memory, only used when mode() === "demo") ─────────────
const demoPaid = new Set();
const DEMO_BANKS = [
  ["Access Bank", "044"], ["Guaranty Trust Bank", "058"], ["First Bank of Nigeria", "011"], ["United Bank for Africa", "033"],
  ["Zenith Bank", "057"], ["Fidelity Bank", "070"], ["Sterling Bank", "232"], ["Union Bank", "032"], ["Wema Bank", "035"], ["Kuda Microfinance Bank", "50211"],
].map(([name, code]) => ({ name, code }));

// amount in kobo; reference must be unique per attempt (letters, digits, - . = only)
async function initialize({ email, amount, reference, callbackUrl, metadata, appUrl }) {
  if (mode() === "demo") return { authorizationUrl: `${appUrl}/api/payments/demo/checkout?reference=${encodeURIComponent(reference)}`, accessCode: "demo", reference };
  const d = await call("POST", "/transaction/initialize", { email, amount, reference, callback_url: callbackUrl, currency: "NGN", metadata });
  return { authorizationUrl: d.authorization_url, accessCode: d.access_code, reference: d.reference };
}

// Always verify with Paystack before giving value (never trust the browser redirect alone).
async function verify(reference, hint = {}) {
  if (mode() === "demo") {
    const paid = demoPaid.has(reference);
    const amount = hint.amount || 0;
    return { status: paid ? "success" : "abandoned", amount, currency: "NGN", fees: Math.min(Math.round(amount * 0.015) + (amount >= 250000 ? 10000 : 0), 200000), channel: "demo", id: Date.now(), paid_at: new Date().toISOString(), reference };
  }
  return call("GET", `/transaction/verify/${encodeURIComponent(reference)}`);
}
const demoMarkPaid = (reference) => demoPaid.add(reference);

let bankCache = { at: 0, list: [] };
async function listBanks() {
  if (mode() === "demo") return DEMO_BANKS;
  if (Date.now() - bankCache.at < 6 * 3600 * 1000 && bankCache.list.length) return bankCache.list;
  const seen = new Map();
  for (let page = 1; page <= 5; page++) {      // Nigeria has more banks than one page returns
    const d = await call("GET", `/bank?country=nigeria&currency=NGN&perPage=100&page=${page}`);
    let added = 0;
    for (const b of d || []) if (b.code && b.active !== false && !seen.has(b.code)) { seen.set(b.code, { name: b.name, code: b.code }); added++; }
    if (!d || d.length < 100 || !added) break;
  }
  bankCache = { at: Date.now(), list: [...seen.values()].sort((a, b) => a.name.localeCompare(b.name)) };
  return bankCache.list;
}

async function resolveAccount(accountNumber, bankCode) {
  if (mode() === "demo") return { account_name: "DEMO ACCOUNT HOLDER", account_number: accountNumber };
  return call("GET", `/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`);
}

async function createRecipient({ name, accountNumber, bankCode }) {
  if (mode() === "demo") return { recipient_code: `RCP_demo_${accountNumber.slice(-4)}` };
  return call("POST", "/transferrecipient", { type: "nuban", name, account_number: accountNumber, bank_code: bankCode, currency: "NGN" });
}

// reference: 16–50 chars, lowercase letters, digits, "-" and "_". Retrying with the SAME reference never pays twice.
async function transfer({ amount, recipient, reference, reason }) {
  if (mode() === "demo") return { status: "success", transferCode: "TRF_demo", reference };
  const d = await call("POST", "/transfer", { source: "balance", amount, recipient, reference, reason });
  return { status: d.status, transferCode: d.transfer_code, reference: d.reference || reference };
}
async function verifyTransfer(reference) {
  if (mode() === "demo") return { status: "success" };
  return call("GET", `/transfer/verify/${encodeURIComponent(reference)}`);
}

async function refund({ reference, amount }) {
  if (mode() === "demo") return { status: "processed" };
  const d = await call("POST", "/refund", { transaction: reference, amount });
  return { status: d.status || "pending" };
}

// Paystack signs the RAW request body with HMAC-SHA512 using your secret key (header: x-paystack-signature).
function verifySignature(rawBody, signature) {
  if (!secret() || !rawBody || !signature) return false;
  const expected = crypto.createHmac("sha512", secret()).update(rawBody).digest("hex");
  const a = Buffer.from(expected), b = Buffer.from(String(signature));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

module.exports = { mode, enabled, initialize, verify, demoMarkPaid, listBanks, resolveAccount, createRecipient, transfer, verifyTransfer, refund, verifySignature };
