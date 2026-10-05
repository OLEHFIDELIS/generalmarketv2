// ─────────────────────────────────────────────────────────────────────────────
//  How the platform makes money on every escrow order
//
//    buyer pays        = itemTotal + buyerFee            (this is what Paystack charges the card/bank)
//    seller is paid    = itemTotal - sellerCommission
//    platform revenue  = buyerFee + sellerCommission
//    platform profit   = revenue - Paystack charge fee - Paystack payout (transfer) fee
//
//  The buyer fee is sized to cover Paystack's charge fee; the seller commission is the margin.
//  Everything is configurable with environment variables (₦ values, percentages as plain numbers).
//  All amounts are INTEGER KOBO. Fees are rounded to whole naira so buyers never see odd kobo.
// ─────────────────────────────────────────────────────────────────────────────

const num = (v, d) => { const n = Number(v); return Number.isFinite(n) && v !== "" && v != null ? n : d; };
const naira = (n) => Math.round(n * 100);
const wholeNaira = (kobo) => Math.round(kobo / 100) * 100;

function config() {
  return {
    sellerPercent: num(process.env.SELLER_COMMISSION_PERCENT, 5),     // % of item total taken from the seller
    sellerMin: naira(num(process.env.SELLER_COMMISSION_MIN, 200)),     // never less than this …
    sellerMax: naira(num(process.env.SELLER_COMMISSION_MAX, 100000)),  // … never more than this (keeps big-ticket items sane)
    buyerPercent: num(process.env.BUYER_FEE_PERCENT, 2),              // % service fee added for the buyer
    buyerFlat: naira(num(process.env.BUYER_FEE_FLAT, 100)),            // + flat amount
    buyerMax: naira(num(process.env.BUYER_FEE_MAX, 3000)),
    minOrder: naira(num(process.env.MIN_ORDER_NGN, 1000)),             // tiny orders can't be profitable
    maxOrder: naira(num(process.env.MAX_ORDER_NGN, 20000000)),
  };
}

// Paystack's published local rate: 1.5% + ₦100 (₦100 waived under ₦2,500), capped at ₦2,000.
function estGatewayFee(chargeKobo) {
  const flat = chargeKobo >= naira(2500) ? naira(100) : 0;
  return Math.min(Math.round(chargeKobo * 0.015) + flat, naira(2000));
}

// Paystack transfer (payout) cost: ₦10 up to ₦5k, ₦25 up to ₦50k, ₦50 above; +₦50 stamp duty from ₦10k.
function estPayoutCost(amountKobo) {
  const base = amountKobo <= naira(5000) ? naira(10) : amountKobo <= naira(50000) ? naira(25) : naira(50);
  return base + (amountKobo >= naira(10000) ? naira(50) : 0);
}

function breakdown(itemTotal, cfg = config()) {
  if (!Number.isInteger(itemTotal) || itemTotal <= 0) throw new Error("itemTotal must be a positive integer (kobo)");
  const buyerFee = Math.min(wholeNaira(Math.round((itemTotal * cfg.buyerPercent) / 100) + cfg.buyerFlat), cfg.buyerMax);
  const raw = Math.round((itemTotal * cfg.sellerPercent) / 100);
  const sellerCommission = Math.min(Math.max(wholeNaira(raw), cfg.sellerMin), cfg.sellerMax, itemTotal);
  const total = itemTotal + buyerFee;
  const sellerReceives = itemTotal - sellerCommission;
  const revenue = buyerFee + sellerCommission;
  const gateway = estGatewayFee(total);
  const payout = estPayoutCost(sellerReceives);
  return { itemTotal, buyerFee, sellerCommission, total, sellerReceives, revenue, estGatewayFee: gateway, estPayoutCost: payout, estProfit: revenue - gateway - payout };
}

module.exports = { config, breakdown, estGatewayFee, estPayoutCost, naira };
