import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import "./Escrow.css";
import { api, dateShort, kobo, timeAgo } from "../../api";
import { Alert, Avatar, Spinner, VerifiedBadge } from "../../components/dash/ui";
import { StatusPill } from "./Escrow";

const STEPS = ["Paid", "Delivered", "Confirmed", "Seller paid"];
const stepOf = (o) => ({ awaiting_payment: -1, paid: 0, delivered: 1, disputed: 1, completed: o.payout?.status === "paid" || o.role === "buyer" ? 3 : 2, refunded: -2, cancelled: -2, expired: -2, review: -1 }[o.status]);
const REASONS = ["Item not as described", "Item not received", "Item is faulty or damaged", "Seller is unresponsive", "Other"];

function nextText(o) {
  const by = (d) => (d ? ` by ${dateShort(d)}` : "");
  if (o.role === "buyer") return ({
    awaiting_payment: "Finish paying to secure this item. Unpaid orders are cancelled automatically.",
    paid: `Your money is safe with GeneralMarket. The seller has been told to deliver${by(o.sellerDeadline)}. If they don't, you're refunded automatically. Got the item already? You can confirm below.`,
    delivered: `The seller says it's handed over. Check it carefully, then confirm. If you don't respond, the money goes to the seller${by(o.autoReleaseAt)}. Not happy? Open a dispute first.`,
    disputed: "We're reviewing your dispute. The money is frozen until we decide. We may contact you for details.",
    completed: "All done. The seller has been paid. Thanks for using escrow!",
    refunded: "You've been refunded. It can take a few days to show in your bank.",
    review: "Your payment needs a quick manual check by our team. You won't lose your money.",
  })[o.status];
  if (o.role === "seller") return ({
    paid: `The buyer has paid and the money is held safely. Deliver the item${by(o.sellerDeadline)}, then tap “Mark as delivered”. You're paid once the buyer confirms.`,
    delivered: `Waiting for the buyer to confirm. If they don't respond, your payout is released automatically${by(o.autoReleaseAt)}.`,
    disputed: "The buyer opened a dispute. Your payout is paused while GeneralMarket reviews it.",
    completed: o.payout?.status === "paid" ? "You've been paid. Check your bank account." : "Confirmed! Your payout is being sent to your bank account.",
    refunded: "This order was refunded to the buyer.",
    awaiting_payment: "Waiting for the buyer to pay. Don't hand over the item until the status shows “Paid”.",
  })[o.status];
  return "";
}

export default function EscrowOrder() {
  const { id } = useParams();
  const q = new URLSearchParams(useLocation().search);
  const [o, setO] = useState(null);
  const [err, setErr] = useState("");
  const [note, setNote] = useState(null);
  const [ask, setAsk] = useState(null);                 // which action is waiting for "are you sure?"
  const [f, setF] = useState({ reason: REASONS[0], details: "", note: "" });
  const [busy, setBusy] = useState(false);
  const tries = useRef(0);

  const load = useCallback(() => api(`/orders/${id}`).then((d) => setO(d.order)).catch((e) => setErr(e.message)), [id]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (q.get("paid")) setNote({ type: "success", text: "Payment received. Your money is now held safely in escrow." }); else if (q.get("pay")) setNote({ type: "info", text: "We haven't received confirmation from your bank yet. This page checks automatically." }); }, []); // eslint-disable-line

  // if we are still waiting for the payment confirmation, ask the server to re-check for up to ~2 minutes
  useEffect(() => {
    if (o?.status !== "awaiting_payment" || o.role !== "buyer") return;
    const t = setInterval(() => {
      if (++tries.current > 24) return clearInterval(t);
      api(`/orders/${id}/verify`, { method: "POST" }).then((d) => setO(d.order)).catch(() => {});
    }, 5000);
    return () => clearInterval(t);
  }, [o?.status, o?.role, id]);

  const run = async (action, body) => {
    setBusy(true); setErr(""); setNote(null);
    try { const d = await api(`/orders/${id}/${action}`, { method: "POST", body }); setO(d.order); setAsk(null); }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  if (err && !o) return <><Link to="/dashboard/escrow" className="dx-back"><FaArrowLeft /> Escrow</Link><Alert>{err}</Alert></>;
  if (!o) return <Spinner />;

  const step = stepOf(o), can = (a) => o.actions.includes(a);
  const other = o.role === "buyer" ? o.seller : o.buyer;
  const confirmBox = (key, text, label, onYes, danger) => ask === key && (
    <div className="es-confirm"><span>{text}</span>
      <button className={`dx-btn dx-btn-sm ${danger ? "dx-btn-danger" : "dx-btn-primary"}`} disabled={busy} onClick={onYes}>{busy ? "Please wait…" : label}</button>
      <button className="dx-btn dx-btn-ghost dx-btn-sm" onClick={() => setAsk(null)}>Not yet</button></div>
  );

  return (
    <>
      <Link to="/dashboard/escrow" className="dx-back"><FaArrowLeft /> Escrow</Link>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, margin: "6px 0 14px" }}>
        <h2 style={{ font: "800 1.3rem 'Syne',sans-serif", margin: 0 }}>Order {o.orderNo}</h2><StatusPill status={o.status} />
      </div>
      {note && <Alert type={note.type}>{note.text}</Alert>}
      <Alert>{err}</Alert>

      <div className="es-grid">
        <div>
          <section className="dx-panel">
            {step >= -1 && <div className="es-steps">{STEPS.map((s, i) => <div key={s} className={`es-step${i <= step ? " done" : ""}${i === step + 1 ? " now" : ""}`}>{s}</div>)}</div>}
            {o.status === "disputed" && o.dispute && <Alert type="warn"><b>Dispute:</b> {o.dispute.reason}{o.dispute.details ? ` — ${o.dispute.details}` : ""}</Alert>}
            {o.dispute?.adminNote && <Alert type="info"><b>Our decision:</b> {o.dispute.adminNote}</Alert>}
            {o.payout?.status === "failed" && o.role === "seller" && <Alert type="warn">Your payout hit a snag and we're retrying. Make sure your bank details in Escrow are correct.</Alert>}
            <div className="es-next">{nextText(o)}</div>

            <div className="es-btnrow" style={{ marginTop: 0 }}>
              {can("pay") && o.payUrl && <a className="dx-btn dx-btn-primary" href={o.payUrl}>Pay {kobo(o.total)}</a>}
              {can("confirm") && <button className="dx-btn dx-btn-primary" onClick={() => setAsk("confirm")}>I received the item. Release payment</button>}
              {can("dispute") && <button className="dx-btn dx-btn-ghost" onClick={() => setAsk("dispute")}>Something's wrong</button>}
              {can("ship") && <button className="dx-btn dx-btn-primary" onClick={() => setAsk("ship")}>Mark as delivered</button>}
              {can("cancel") && <button className="dx-btn dx-btn-ghost" onClick={() => setAsk("cancel")}>{o.role === "seller" ? "Cancel & refund buyer" : "Cancel order"}</button>}
              {can("resolve") && <Link className="dx-btn dx-btn-primary" to="/dashboard/finance">Resolve in Finance</Link>}
            </div>

            {confirmBox("confirm", "Only confirm if you have the item and it's what you paid for. This releases your money to the seller and can't be undone.", "Yes, release payment", () => run("confirm"))}
            {ask === "ship" && (
              <div className="es-confirm" style={{ display: "block" }}>
                <div className="dx-field"><label>Note for the buyer (optional)</label><input className="dx-input" maxLength={300} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="e.g. Handed over at Ikeja City Mall" /></div>
                <button className="dx-btn dx-btn-primary dx-btn-sm" disabled={busy} onClick={() => run("ship", { note: f.note })}>{busy ? "Please wait…" : "Yes, it's been delivered"}</button>{" "}
                <button className="dx-btn dx-btn-ghost dx-btn-sm" onClick={() => setAsk(null)}>Not yet</button>
              </div>
            )}
            {ask === "dispute" && (
              <div className="es-confirm" style={{ display: "block" }}>
                <div className="dx-field"><label>What went wrong?</label><select className="dx-select" value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })}>{REASONS.map((r) => <option key={r}>{r}</option>)}</select></div>
                <div className="dx-field"><label>Tell us more</label><textarea className="dx-textarea" rows={3} maxLength={1500} value={f.details} onChange={(e) => setF({ ...f, details: e.target.value })} placeholder="What happened? Include dates and anything the seller said." /></div>
                <button className="dx-btn dx-btn-danger dx-btn-sm" disabled={busy} onClick={() => run("dispute", { reason: f.reason, details: f.details })}>{busy ? "Please wait…" : "Open dispute and freeze payment"}</button>{" "}
                <button className="dx-btn dx-btn-ghost dx-btn-sm" onClick={() => setAsk(null)}>Cancel</button>
              </div>
            )}
            {confirmBox("cancel", o.role === "seller" ? "The buyer will be refunded in full and the order closed." : "This cancels the order before you pay.", o.role === "seller" ? "Yes, cancel and refund" : "Yes, cancel", () => run("cancel", {}), true)}
          </section>

          <section className="dx-panel">
            <h3>Items</h3>
            <div className="es-list">
              {o.items.map((i) => (
                <Link className="es-row" key={i.listing} to={`/product/${i.listing}`}>
                  {i.image ? <img src={i.image} alt="" /> : <div className="es-img" />}
                  <div className="es-row-main"><div className="es-row-title">{i.title}</div><div className="es-row-sub">Qty {i.qty} · {kobo(i.unitPrice)} each</div></div>
                  <div className="es-row-amt">{kobo(i.unitPrice * i.qty)}</div>
                </Link>
              ))}
            </div>
          </section>

          <section className="dx-panel">
            <h3>History</h3>
            <ul className="es-timeline">{[...o.events].reverse().map((e, i) => <li key={i}><span>{e.note || e.type.replace(/_/g, " ")}<small>{e.role} · {timeAgo(e.at)}</small></span></li>)}</ul>
          </section>
        </div>

        <aside>
          <section className="dx-panel">
            <h3>{o.role === "buyer" ? "Seller" : o.role === "seller" ? "Buyer" : "People"}</h3>
            {other && <div style={{ display: "flex", gap: 10, alignItems: "center" }}><Avatar src={other.avatar} name={other.name} size={40} />
              <div>{other.username ? <Link to={`/seller/${other.username}`}><b>{other.name}</b></Link> : <b>{other.name}</b>} {other.verified && <VerifiedBadge />}</div></div>}
            {o.role === "seller" && o.delivery?.phone && <p className="dx-hint" style={{ marginTop: 10 }}>Buyer's phone: <b>{o.delivery.phone}</b></p>}
            <p className="dx-hint" style={{ marginTop: 10 }}>{o.delivery?.method === "delivery" ? <>Deliver to: <b>{o.delivery.address}</b></> : "Meet up in a public place."}{o.delivery?.note ? <><br />Note: “{o.delivery.note}”</> : null}</p>
          </section>

          <section className="dx-panel">
            <h3>Payment</h3>
            <div className="es-sum">
              <div><span>Items</span><span>{kobo(o.itemTotal)}</span></div>
              {o.role === "buyer" && <><div><span>Buyer protection fee</span><span>{kobo(o.buyerFee)}</span></div><div className="total"><span>You paid</span><span>{kobo(o.total)}</span></div></>}
              {o.role !== "buyer" && <>
                <div className="minus"><span>GeneralMarket commission</span><span>− {kobo(o.sellerCommission)}</span></div>
                <div className="total"><span>{o.role === "seller" ? "You receive" : "Seller receives"}</span><span>{kobo(o.sellerReceives)}</span></div>
                {o.role === "admin" && <div className="note">Buyer paid {kobo(o.total)} · est. profit {kobo(o.estProfit)}</div>}
              </>}
            </div>
            {o.refund && <p className="dx-hint" style={{ marginTop: 10 }}>Refund: <b>{o.refund.status}</b> · {kobo(o.refund.amount)}</p>}
          </section>
        </aside>
      </div>
    </>
  );
}
