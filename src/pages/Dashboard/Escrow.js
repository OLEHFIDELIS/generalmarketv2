import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FaLock, FaUniversity } from "react-icons/fa";
import "./Escrow.css";
import { api, dateShort, kobo } from "../../api";
import { Alert, Empty, PageHead, Spinner, Tabs } from "../../components/dash/ui";

export const STATUS_LABEL = {
  awaiting_payment: "Awaiting payment", paid: "Paid · in escrow", delivered: "Delivered", disputed: "Dispute", completed: "Completed",
  refunded: "Refunded", cancelled: "Cancelled", expired: "Expired", review: "Under review",
};
export const StatusPill = ({ status }) => <span className={`es-badge es-${status}`}>{STATUS_LABEL[status] || status}</span>;

// ── Seller: where do I get paid? ───────────────────────────────────────────
function PayoutPanel({ enabled }) {
  const [payout, setPayout] = useState(undefined);
  const [editing, setEditing] = useState(false);
  const [banks, setBanks] = useState([]);
  const [f, setF] = useState({ bankCode: "", accountNumber: "" });
  const [name, setName] = useState("");
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { api("/payments/payout").then((d) => setPayout(d.payout)).catch(() => setPayout(null)); }, []);
  useEffect(() => { if (editing && !banks.length) api("/payments/banks").then((d) => setBanks(d.banks)).catch((e) => setMsg({ type: "error", text: e.message })); }, [editing, banks.length]);

  // look the name up as soon as the account number is complete
  useEffect(() => {
    setName("");
    if (f.accountNumber.length !== 10 || !f.bankCode) return;
    let live = true;
    api("/payments/resolve-account", { method: "POST", body: f }).then((d) => live && (setName(d.accountName), setMsg(null))).catch((e) => live && setMsg({ type: "error", text: e.message }));
    return () => { live = false; };
  }, [f]);

  const save = async () => {
    setBusy(true); setMsg(null);
    try { const d = await api("/payments/payout", { method: "PUT", body: f }); setPayout(d.payout); setEditing(false); setF({ bankCode: "", accountNumber: "" }); setMsg({ type: "success", text: "Payout account saved. You can now receive escrow payments." }); }
    catch (e) { setMsg({ type: "error", text: e.message }); } finally { setBusy(false); }
  };

  if (payout === undefined) return null;
  return (
    <section className="dx-panel">
      <h3><FaUniversity /> Where you get paid</h3>
      {msg && <Alert type={msg.type}>{msg.text}</Alert>}
      {payout && !editing ? (
        <div className="es-bank">
          <div><b>{payout.bankName}</b> · ••••{payout.accountLast4}<div className="dx-hint">{payout.accountName}</div></div>
          <button className="dx-btn dx-btn-ghost dx-btn-sm" onClick={() => setEditing(true)}>Change</button>
        </div>
      ) : !enabled ? <p className="dx-hint">Payments aren't switched on yet.</p> : !editing ? (
        <>
          <p className="dx-hint" style={{ margin: "0 0 10px" }}>Add your bank account so buyers can pay you through escrow. Without it, the “Buy with escrow” button won't appear on your ads.</p>
          <button className="dx-btn dx-btn-primary" onClick={() => setEditing(true)}>Add bank account</button>
        </>
      ) : (
        <>
          <div className="dx-field"><label>Bank</label>
            <select className="dx-select" value={f.bankCode} onChange={(e) => setF({ ...f, bankCode: e.target.value })}>
              <option value="">{banks.length ? "Choose your bank" : "Loading banks…"}</option>
              {banks.map((b) => <option key={b.code} value={b.code}>{b.name}</option>)}
            </select></div>
          <div className="dx-field"><label>Account number</label>
            <input className="dx-input" inputMode="numeric" maxLength={10} value={f.accountNumber} onChange={(e) => setF({ ...f, accountNumber: e.target.value.replace(/\D/g, "") })} placeholder="10 digits" />
            {name && <span className="dx-hint" style={{ color: "#15803d", fontWeight: 700 }}>✓ {name}</span>}</div>
          <div className="es-btnrow">
            <button className="dx-btn dx-btn-primary" disabled={busy || !name} onClick={save}>{busy ? "Saving…" : "Save account"}</button>
            <button className="dx-btn dx-btn-ghost" onClick={() => { setEditing(false); setMsg(null); }}>Cancel</button>
          </div>
        </>
      )}
    </section>
  );
}

export default function Escrow() {
  const [cfg, setCfg] = useState(null);
  const [sum, setSum] = useState(null);
  const [role, setRole] = useState("buying");
  const [orders, setOrders] = useState(null);
  const [err, setErr] = useState("");

  const load = useCallback(() => {
    setOrders(null);
    api(`/orders?role=${role}`).then((d) => setOrders(d.orders)).catch((e) => { setErr(e.message); setOrders([]); });
  }, [role]);
  useEffect(() => { api("/payments/config").then(setCfg).catch(() => {}); api("/orders/summary").then(setSum).catch(() => {}); }, []);
  useEffect(load, [load]);

  return (
    <>
      <PageHead title="Escrow" sub="Pay safely. Get paid safely." />
      {cfg?.mode === "demo" && <div className="es-demo"><b>Demo mode:</b> payments are simulated and no real money moves.</div>}
      {cfg && !cfg.enabled && <Alert type="info">Escrow isn't switched on yet. Ask the site owner to connect a Paystack account.</Alert>}

      {sum && (
        <div className="es-stats">
          <div className={`es-stat ${sum.toShip ? "warn" : ""}`}><span>To deliver</span><b>{sum.toShip}</b></div>
          <div className={`es-stat ${sum.toConfirm ? "warn" : ""}`}><span>Waiting for you to confirm</span><b>{sum.toConfirm}</b></div>
          <div className="es-stat"><span>You've paid, held in escrow</span><b>{kobo(sum.buyerHeld)}</b></div>
          <div className="es-stat good"><span>Coming to you</span><b>{kobo(sum.sellerPending)}</b></div>
        </div>
      )}

      <PayoutPanel enabled={!!cfg?.enabled} />

      <Tabs tabs={[{ key: "buying", label: "My purchases" }, { key: "selling", label: "My sales" }]} value={role} onChange={setRole} />
      <Alert>{err}</Alert>
      {!orders ? <Spinner /> : orders.length === 0 ? (
        <Empty icon={<FaLock />} title={role === "buying" ? "No purchases yet" : "No sales yet"}
          sub={role === "buying" ? "When you tap “Buy with escrow” on an ad, your order appears here." : "When a buyer pays for one of your ads through escrow, it appears here."}>
          <Link className="dx-btn dx-btn-ghost" to={role === "buying" ? "/all" : "/dashboard/items"}>{role === "buying" ? "Browse listings" : "My ads"}</Link>
        </Empty>
      ) : (
        <div className="es-list">
          {orders.map((o) => {
            const todo = (o.role === "seller" && o.status === "paid") || (o.role === "buyer" && ["delivered", "awaiting_payment"].includes(o.status));
            const other = o.role === "buyer" ? o.seller : o.buyer;
            return (
              <Link className="es-row" key={o.id} to={`/dashboard/escrow/${o.id}`}>
                {o.items[0]?.image ? <img src={o.items[0].image} alt="" /> : <div className="es-img" />}
                <div className="es-row-main">
                  <div className="es-row-title">{o.items[0]?.title}{o.items.length > 1 ? ` + ${o.items.length - 1} more` : ""}</div>
                  <div className="es-row-sub">{o.orderNo} · {role === "buying" ? "from" : "to"} {other?.name} · {dateShort(o.createdAt)}</div>
                  <div style={{ marginTop: 6 }}><StatusPill status={o.status} />{todo && <span className="es-todo">{o.role === "seller" ? "Deliver it" : o.status === "delivered" ? "Confirm" : "Pay"}</span>}</div>
                </div>
                <div className="es-row-amt">{kobo(o.role === "seller" ? o.sellerReceives : o.total)}<div className="es-row-sub" style={{ fontWeight: 500 }}>{o.role === "seller" ? "you receive" : "total"}</div></div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
