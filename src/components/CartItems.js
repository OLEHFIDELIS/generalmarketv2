import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaMinus, FaPlus, FaTrashAlt, FaWhatsapp, FaComments, FaShoppingCart, FaExclamationTriangle, FaShieldAlt, FaCheckCircle, FaImage } from "react-icons/fa";
import "./CartItems.css";
import { ShopContext } from "../context/ShopContext";
import { useAuth } from "../context/AuthContext";
import { api, money } from "../api";

const SUPPORT_WA = "2348141846896";

// 0801… / +234801… / 234801… → 234801… (wa.me wants digits only, with country code)
const waNumber = (raw) => {
  const d = String(raw || "").replace(/\D/g, "");
  if (!d) return SUPPORT_WA;
  if (d.startsWith("234")) return d;
  if (d.startsWith("0") && d.length === 11) return "234" + d.slice(1);
  return d;
};

const orderText = (g) =>
  `Hello${g.seller ? " " + g.seller.name : ""}, I'd like to buy the following from GeneralMarket:\n` +
  g.lines.map((l) => `• ${l.qty} × ${l.info.title} — ${money(l.info.price * l.qty)}`).join("\n") +
  `\nTotal: ${money(g.subtotal)}\nAre these still available?`;

function Thumb({ src, title }) {
  return src
    ? <img className="ct-img" src={src} alt={title} loading="lazy" />
    : <div className="ct-img ct-noimg"><FaImage /></div>;
}

function Stepper({ qty, max, onChange, label }) {
  return (
    <div className="ct-step" role="group" aria-label={`Quantity for ${label}`}>
      <button type="button" onClick={() => onChange(qty - 1)} disabled={qty <= 1} aria-label="Decrease quantity"><FaMinus /></button>
      <span aria-live="polite">{qty}</span>
      <button type="button" onClick={() => onChange(qty + 1)} disabled={qty >= max} aria-label="Increase quantity"><FaPlus /></button>
    </div>
  );
}

const CartItems = () => {
  const { cartLines, cartReady, cartError, lookupFailed, refreshLookup, maxQty, setQuantity, removeItem, clearCart, getTotalCartAmount, getTotalCartItems } = useContext(ShopContext);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState("");
  const [msgErr, setMsgErr] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);

  const [removed, setRemoved] = useState(null);           // last removed line, for Undo
  const undoTimer = useRef(null);

  // Prices / availability may have changed since the cart was last looked at
  useEffect(() => { refreshLookup(); }, [refreshLookup]);
  useEffect(() => () => clearTimeout(undoTimer.current), []);

  const unavailable = useMemo(() => cartLines.filter((l) => l.available === false), [cartLines]);
  const buyable = useMemo(() => cartLines.filter((l) => l.available !== false), [cartLines]);

  const remove = (l) => {
    clearTimeout(undoTimer.current);
    setRemoved({ id: l.id, qty: l.qty, title: l.info?.title || "Item" });
    removeItem(l.id);
    undoTimer.current = setTimeout(() => setRemoved(null), 7000);
  };
  const undo = () => { if (removed) setQuantity(removed.id, removed.qty); setRemoved(null); clearTimeout(undoTimer.current); };

  // Group buyable lines by seller (each seller is paid separately, so each gets its own order)
  const groups = useMemo(() => {
    const map = new Map();
    for (const l of buyable) {
      if (!l.info) continue;                                   // still loading details
      const key = l.info.seller?.id ? `s:${l.info.seller.id}` : `p:${waNumber(l.info.phone)}`;
      if (!map.has(key)) map.set(key, { key, seller: l.info.seller, phone: l.info.phone, lines: [], subtotal: 0 });
      const g = map.get(key);
      g.lines.push(l);
      g.subtotal += l.info.price * l.qty;
    }
    return [...map.values()];
  }, [buyable]);
  const loadingDetails = buyable.some((l) => !l.info);

  const messageSeller = async (g) => {
    if (!user) return navigate("/login");
    setBusy(g.key); setMsgErr("");
    try {
      const r = await api("/threads", { method: "POST", body: { toUserId: g.seller.id, listingId: g.lines[0].info._id, text: orderText(g) } });
      navigate(`/dashboard/messages/${r.threadId}`);
    } catch (e) { setMsgErr(e.message); } finally { setBusy(""); }
  };

  const toast = removed && (
    <div className="ct-toast" role="status">
      <span>Removed “{removed.title}”</span>
      <button type="button" onClick={undo}>Undo</button>
    </div>
  );

  if (!cartReady) return <div className="ct-wrap"><p className="ct-muted">Loading your cart…</p></div>;

  if (cartLines.length === 0) {
    return (
      <div className="ct-wrap">
        <div className="ct-empty">
          <div className="ct-empty-ico"><FaShoppingCart /></div>
          <h2>Your cart is empty</h2>
          <p>Add items you like and order from sellers in one place.</p>
          <Link to="/all" className="ct-btn ct-btn-primary">Browse listings</Link>
        </div>
        {toast}
      </div>
    );
  }

  const totalItems = getTotalCartItems();

  return (
    <div className="ct-wrap">
      <div className="ct-head">
        <h1>Your cart <span>({totalItems} {totalItems === 1 ? "item" : "items"})</span></h1>
        {confirmClear ? (
          <div className="ct-confirm">
            Remove everything?
            <button className="ct-link danger" onClick={() => { clearCart(); setConfirmClear(false); }}>Yes, clear</button>
            <button className="ct-link" onClick={() => setConfirmClear(false)}>Cancel</button>
          </div>
        ) : (
          <button className="ct-link" onClick={() => setConfirmClear(true)}>Clear cart</button>
        )}
      </div>

      {(cartError || msgErr) && <div className="ct-alert ct-alert-error" role="alert">{cartError || msgErr}</div>}

      <div className="ct-layout">
        <div className="ct-main">
          {unavailable.length > 0 && (
            <section className="ct-card ct-unavail">
              <h3><FaExclamationTriangle /> No longer available</h3>
              <p className="ct-muted">These were sold, expired or removed by the seller. They aren't included in your total.</p>
              {unavailable.map((l) => (
                <div className="ct-row ct-row-off" key={l.id}>
                  <Thumb src={l.info?.image} title={l.info?.title || "Listing"} />
                  <div className="ct-info">
                    <div className="ct-title">{l.info?.title || "This listing was removed"}</div>
                    <div className="ct-sub">Unavailable</div>
                  </div>
                  <button className="ct-icon-btn" onClick={() => remove(l)} aria-label="Remove from cart"><FaTrashAlt /></button>
                </div>
              ))}
            </section>
          )}

          {groups.map((g) => {
            const wa = `https://wa.me/${waNumber(g.phone || g.seller?.business?.phone)}?text=${encodeURIComponent(orderText(g))}`;
            return (
              <section className="ct-card" key={g.key}>
                <header className="ct-seller">
                  <div className="ct-seller-av">{(g.seller?.name || "G")[0].toUpperCase()}</div>
                  <div>
                    <div className="ct-seller-name">
                      {g.seller?.username ? <Link to={`/seller/${g.seller.username}`}>{g.seller.name}</Link> : (g.seller?.name || "GeneralMarket seller")}
                      {g.seller?.verified && <FaCheckCircle className="ct-verified" title="ID verified" />}
                    </div>
                    <div className="ct-muted">{g.lines.length} {g.lines.length === 1 ? "listing" : "listings"}</div>
                  </div>
                </header>

                {g.lines.map((l) => (
                  <div className="ct-row" key={l.id}>
                    <Link to={`/product/${l.info._id}`}><Thumb src={l.info.image} title={l.info.title} /></Link>
                    <div className="ct-info">
                      <Link className="ct-title" to={`/product/${l.info._id}`}>{l.info.title}</Link>
                      <div className="ct-sub">{money(l.info.price)} each{l.info.city ? ` · ${l.info.city}` : ""}</div>
                      <Stepper qty={l.qty} max={maxQty} label={l.info.title} onChange={(q) => setQuantity(l.id, q)} />
                    </div>
                    <div className="ct-line-total">{money(l.info.price * l.qty)}</div>
                    <button className="ct-icon-btn" onClick={() => remove(l)} aria-label={`Remove ${l.info.title}`}><FaTrashAlt /></button>
                  </div>
                ))}

                <footer className="ct-order">
                  <div className="ct-order-total"><span>Subtotal</span><strong>{money(g.subtotal)}</strong></div>
                  <div className="ct-order-btns">
                    {(g.phone || g.seller?.business?.phone || !g.seller) && (
                      <a className="ct-btn ct-btn-wa" href={wa} target="_blank" rel="noopener noreferrer"><FaWhatsapp /> Order on WhatsApp</a>
                    )}
                    {g.seller?.id && (
                      <Link className="ct-btn ct-btn-primary" to={`/checkout/cart/${g.seller.id}`}><FaShieldAlt /> Pay securely (escrow)</Link>
                    )}
                    {g.seller?.id && (
                      <button className="ct-btn ct-btn-ghost" disabled={busy === g.key} onClick={() => messageSeller(g)}>
                        <FaComments /> {busy === g.key ? "Sending…" : user ? "Message seller" : "Log in to message"}
                      </button>
                    )}
                  </div>
                </footer>
              </section>
            );
          })}

          {loadingDetails && (lookupFailed ? (
            <div className="ct-alert ct-alert-error" role="alert">
              We couldn't load your item details. Check your connection and try again.
              <button type="button" className="ct-link" onClick={refreshLookup}>Try again</button>
            </div>
          ) : <p className="ct-muted">Checking availability…</p>)}
        </div>

        <aside className="ct-side">
          <div className="ct-card ct-summary">
            <h3>Order summary</h3>
            <div className="ct-sum-row"><span>Items ({totalItems})</span><span>{money(getTotalCartAmount())}</span></div>
            <div className="ct-sum-row ct-muted"><span>Delivery</span><span>Agreed with seller</span></div>
            <div className="ct-sum-total"><span>Total</span><strong>{money(getTotalCartAmount())}</strong></div>
            {groups.length > 1 && <p className="ct-note">Your items are from <b>{groups.length} sellers</b>. Place one order per seller using the buttons on each card.</p>}
            {unavailable.length > 0 && <p className="ct-note warn">{unavailable.length} unavailable {unavailable.length === 1 ? "item isn't" : "items aren't"} included.</p>}
          </div>
          <div className="ct-card ct-safe">
            <h4><FaShieldAlt /> Buy safely</h4>
            <ul>
              <li>Pay on delivery or meet in a public place.</li>
              <li>Inspect the item before you pay.</li>
              <li>Never send money to someone you haven't met.</li>
            </ul>
          </div>
        </aside>
      </div>
      {toast}
    </div>
  );
};

export default CartItems;