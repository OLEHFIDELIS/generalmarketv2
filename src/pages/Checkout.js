import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { FaLock, FaShieldAlt } from "react-icons/fa";
import "./Dashboard/Escrow.css";
import { api, kobo } from "../api";
import { useAuth } from "../context/AuthContext";
import { Alert, Avatar, Spinner, VerifiedBadge } from "../components/dash/ui";

// /checkout/:listingId  (buy one listing)   or   /checkout/cart/:sellerId  (everything from one seller in my cart)
export default function Checkout() {
  const { listingId, sellerId } = useParams();
  const { user, loading } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [cfg, setCfg] = useState(null);
  const [quote, setQuote] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [agree, setAgree] = useState(false);
  const [form, setForm] = useState({ method: "meetup", address: "", phone: "", note: "" });
  const body = sellerId ? { fromCartSeller: sellerId } : { items: [{ listingId, qty: 1 }] };

  useEffect(() => { if (!loading && !user) navigate(`/login?next=${encodeURIComponent(pathname)}`, { replace: true }); }, [loading, user, navigate, pathname]);
  useEffect(() => { if (user?.phone) setForm((f) => (f.phone ? f : { ...f, phone: user.phone })); }, [user]);
  useEffect(() => {
    if (!user) return;
    api("/payments/config").then(setCfg).catch(() => {});
    api("/orders/quote", { method: "POST", body }).then(setQuote).catch((e) => setErr(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, listingId, sellerId]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const pay = async (e) => {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      const r = await api("/orders", { method: "POST", body: { ...body, delivery: form } });
      window.location.assign(r.authorizationUrl);          // off to Paystack (or the demo checkout page)
    } catch (e2) { setErr(e2.message); setBusy(false); }
  };

  if (loading || !user || (!quote && !err)) return <div className="sp-wrap"><Spinner /></div>;

  return (
    <div className="sp-wrap" style={{ maxWidth: 980 }}>
      <h1 style={{ font: "800 1.4rem 'Syne',sans-serif", margin: "0 0 14px" }}><FaLock style={{ color: "#f97316" }} /> Secure checkout</h1>
      {cfg?.mode === "demo" && <div className="es-demo"><b>Demo mode:</b> you'll see a fake payment page. No real money moves.</div>}
      <Alert>{err}</Alert>
      {!quote ? <Link to="/all" className="dx-btn dx-btn-ghost">Back to listings</Link> : (
        <form className="es-grid" onSubmit={pay}>
          <div>
            <section className="dx-panel">
              <h3>Your order</h3>
              <div className="es-list">
                {quote.items.map((i) => (
                  <div className="es-row" key={i.listing} style={{ cursor: "default" }}>
                    {i.image ? <img src={i.image} alt="" /> : <div className="es-img" />}
                    <div className="es-row-main"><div className="es-row-title">{i.title}</div><div className="es-row-sub">Qty {i.qty} · {kobo(i.unitPrice)} each</div></div>
                    <div className="es-row-amt">{kobo(i.unitPrice * i.qty)}</div>
                  </div>
                ))}
              </div>
              <p className="dx-hint" style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
                Seller: <Avatar src={quote.seller.avatar} name={quote.seller.name} size={22} /> <b>{quote.seller.name}</b> {quote.seller.verified && <VerifiedBadge />}
              </p>
            </section>

            <section className="dx-panel">
              <h3>How will you get it?</h3>
              <div className="dx-chips" style={{ marginBottom: 12 }}>
                {[["meetup", "Meet up with the seller"], ["delivery", "Seller delivers to me"]].map(([v, l]) => (
                  <button type="button" key={v} className={`dx-chip${form.method === v ? " on" : ""}`} onClick={() => setForm({ ...form, method: v })}>{l}</button>
                ))}
              </div>
              {form.method === "delivery" && (
                <div className="dx-field"><label>Delivery address</label><textarea className="dx-textarea" rows={2} maxLength={300} value={form.address} onChange={set("address")} placeholder="House number, street, area, city" required /></div>
              )}
              <div className="dx-field"><label>Your phone number</label><input className="dx-input" type="tel" value={form.phone} onChange={set("phone")} placeholder="0801 234 5678" required /><span className="dx-hint">Shared with the seller so you can arrange the handover.</span></div>
              <div className="dx-field"><label>Note to seller (optional)</label><textarea className="dx-textarea" rows={2} maxLength={500} value={form.note} onChange={set("note")} placeholder="e.g. I can meet at Ikeja City Mall on Saturday" /></div>
            </section>
          </div>

          <aside>
            <section className="dx-panel">
              <h3>Payment summary</h3>
              <div className="es-sum">
                <div><span>Items</span><span>{kobo(quote.itemTotal)}</span></div>
                <div><span>Buyer protection fee</span><span>{kobo(quote.buyerFee)}</span></div>
                <div className="total"><span>You pay</span><span>{kobo(quote.total)}</span></div>
              </div>
              <label style={{ display: "flex", gap: 8, fontSize: 13, margin: "14px 0", color: "#334155", cursor: "pointer" }}>
                <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
                <span>I understand my money is held by GeneralMarket until I confirm I received the item.</span>
              </label>
              <button className="dx-btn dx-btn-primary es-pay" disabled={busy || !agree}>{busy ? "Please wait…" : `Pay ${kobo(quote.total)} securely`}</button>
              <p className="dx-hint" style={{ textAlign: "center", marginTop: 8 }}>You'll finish on Paystack's secure page.</p>
            </section>

            <section className="dx-panel">
              <h3><FaShieldAlt style={{ color: "#16a34a" }} /> How escrow protects you</h3>
              <ul className="es-trust">
                <li><i>1</i><span>You pay GeneralMarket, <b>not the seller</b>. The seller can see your payment is secured.</span></li>
                <li><i>2</i><span>The seller hands over the item{cfg ? ` within ${cfg.deliverDays} days` : ""}. If they don't, you're refunded automatically.</span></li>
                <li><i>3</i><span>Check the item, then tap <b>Confirm</b>. Only then is the seller paid.</span></li>
                <li><i>4</i><span>Something wrong? Open a dispute and we review it before any money moves.</span></li>
              </ul>
              <p className="dx-hint" style={{ marginTop: 12 }}><b>Only confirm after you have the item in your hands.</b> Never confirm because someone asked you to.</p>
            </section>
          </aside>
        </form>
      )}
    </div>
  );
}
