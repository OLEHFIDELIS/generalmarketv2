# Escrow & payments: setup (Paystack)

## 0. Try it first, no Paystack account needed
1. In `.env` add `PAYMENTS_DEMO=true` (and make sure `NODE_ENV` is not `production`), restart the server.
2. Dashboard → Escrow → "Add bank account" (any bank + any 10 digits works in demo).
3. As another user, open that seller's ad → **Buy with escrow** → "Simulate successful payment".
4. Seller: Mark as delivered → Buyer: Confirm → seller is "paid" (simulated). Log in as an admin → Dashboard → **Finance**.
Run `npm run test:escrow` any time to re-check the money logic (no database or internet needed).

## 1. Go live
1. Create a Paystack business account and complete their verification (CAC/ID + settlement account).
2. Paystack Dashboard → Settings → API Keys: copy the **Secret key** into `.env` as `PAYSTACK_SECRET_KEY` (use `sk_test_…` first, `sk_live_…` when ready). Never put it in the React app.
3. Set `APP_URL=https://generalmarket.ng` (your real address).
4. Paystack Dashboard → Settings → API Keys & Webhooks → **Webhook URL**: `https://generalmarket.ng/api/payments/webhook`
5. **Payouts need transfers enabled.** Paystack Dashboard → Settings → Preferences → turn OFF "Confirm transfers before sending" (OTP), otherwise payouts stop at an OTP step. Transfers may need a Registered Business account and must be funded: see "Your balance" below.
6. `npm run build`, restart the server, then make one small real test purchase with two of your own accounts.

## 2. How you earn (all in `.env`, defaults shown)
| Setting | Default | Meaning |
|---|---|---|
| SELLER_COMMISSION_PERCENT / _MIN / _MAX | 5 / ₦200 / ₦100,000 | Taken from the seller's payout |
| BUYER_FEE_PERCENT / _FLAT / _MAX | 2 / ₦100 / ₦3,000 | Service fee added to the buyer's total (covers Paystack's ~1.5% + ₦100) |
| MIN_ORDER_NGN / MAX_ORDER_NGN | ₦1,000 / ₦20,000,000 | Allowed escrow order size |
Example, ₦100,000 item: buyer pays ₦102,100 · seller receives ₦95,000 · you keep ₦7,100 revenue (about ₦5,300 after Paystack costs).

## 3. Your balance: IMPORTANT
Money a buyer pays sits in YOUR Paystack balance until you pay the seller. That money belongs to your users, so keep your Paystack balance ≥ "Held in escrow" + "Waiting to be paid out" (shown in Finance). Don't withdraw it to spend.

## 4. Other timing settings
`ESCROW_PAY_WINDOW_MIN` (30), `ESCROW_SELLER_DELIVER_DAYS` (7, then auto-refund), `ESCROW_CONFIRM_DAYS` (3, then auto-release), `ESCROW_REQUIRE_VERIFIED_SELLER` (false).

## 5. Legal check before you launch
Holding customers' money for other people can be a regulated activity in Nigeria. Before going live, confirm with a Nigerian fintech lawyer and with Paystack (they may need to approve marketplace/escrow use on your account), and publish clear Terms covering fees, refunds, disputes and the auto-release rules.