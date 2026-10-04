import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, money } from "../../api";
import { Alert } from "../dash/ui";

// "Send message" and "Make an offer" – one dialog, works the same on desktop and mobile (bottom sheet)
export default function ContactModal({ mode, p, seller, onClose, onOfferSent }) {
  const navigate = useNavigate();
  const first = useRef(null);
  const offer = mode === "offer";
  const [amount, setAmount] = useState("");
  const [text, setText] = useState(offer ? "" : "Hi, is this still available?");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    first.current?.focus();
    const key = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      if (offer) {
        await api("/offers", { method: "POST", body: { listingId: p._id, amount: Number(amount), message: text.trim() } });
        onOfferSent();
      } else {
        const r = await api("/threads", { method: "POST", body: { toUserId: seller.id, listingId: p._id, text: text.trim() } });
        navigate(`/dashboard/messages/${r.threadId}`);
      }
    } catch (er) { setErr(er.message); setBusy(false); }
  };

  return (
    <div className="pv-modal-back sheet" onClick={onClose}>
      <form className="pv-modal" role="dialog" aria-modal="true" aria-label={offer ? "Make an offer" : "Send message"} onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h3>{offer ? "Make an offer" : `Message ${seller?.name || "seller"}`}</h3>
        <p className="pv-muted pv-modal-sub">{p.title}</p>
        <Alert>{err}</Alert>
        {offer && (
          <div className="dx-field">
            <label htmlFor="pv-offer">Your offer (₦)</label>
            <input id="pv-offer" ref={first} className="dx-input" type="number" min="1" required value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={p.priceType === "fixed" || !p.priceType ? `Asking price ${money(p.price)}` : "Enter your offer"} />
          </div>
        )}
        {!offer && (
          <div className="pv-chips" aria-label="Quick messages">
            {["Is this still available?", "What's your best price?", "Can we meet today?", "Can you share more photos?"].map((q) => (
              <button key={q} type="button" className="pv-chip" onClick={() => setText(q)}>{q}</button>
            ))}
          </div>
        )}
        <div className="dx-field">
          <label htmlFor="pv-msg">{offer ? "Message (optional)" : "Message"}</label>
          <textarea id="pv-msg" ref={offer ? null : first} className="dx-textarea" rows={4} maxLength={offer ? 500 : 2000} required={!offer} value={text} onChange={(e) => setText(e.target.value)} placeholder={offer ? "Add a note to the seller…" : "Write your message…"} />
        </div>
        <div className="dx-actions">
          <button className="pv-btn primary" disabled={busy}>{busy ? "Sending…" : offer ? "Send offer" : "Send message"}</button>
          <button type="button" className="pv-btn" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
