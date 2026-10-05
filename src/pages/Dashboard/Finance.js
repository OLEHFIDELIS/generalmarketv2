import React, { useCallback, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import "./Escrow.css";
import { api, dateShort, kobo } from "../../api";
import { useAuth } from "../../context/AuthContext";
import { Alert, Empty, PageHead, Spinner, Tabs } from "../../components/dash/ui";
import { StatusPill } from "./Escrow";

function Overview() {
  const [days, setDays] = useState(30);
  const [s, setS] = useState(null);
  useEffect(() => { setS(null); api(`/admin/finance?days=${days}`).then((d) => setS(d.summary)); }, [days]);
  if (!s) return <Spinner />;
  const Stat = ({ label, v, cls, money = true }) => <div className={`es-stat ${cls || ""}`}><span>{label}</span><b>{money ? kobo(v) : v}</b></div>;
  return (
    <>
      <div className="dx-chips" style={{ marginBottom: 14 }}>{[7, 30, 90].map((d) => <button key={d} className={`dx-chip${days === d ? " on" : ""}`} onClick={() => setDays(d)}>Last {d} days</button>)}</div>
      <div className="es-stats">
        <Stat label="Net profit" v={s.netProfit} cls={s.netProfit >= 0 ? "good" : "bad"} />
        <Stat label="Revenue (commission + buyer fees)" v={s.revenue} />
        <Stat label="Goods sold through escrow" v={s.gmv} />
        <Stat label="Orders" v={s.orders} money={false} />
      </div>
      <section className="dx-panel">
        <h3>Where the money goes</h3>
        <div className="es-sum">
          <div><span>Seller commission</span><span className="plus">+ {kobo(s.commission)}</span></div>
          <div><span>Buyer protection fees</span><span className="plus">+ {kobo(s.buyerFees)}</span></div>
          <div className="minus"><span>Paystack charge fees</span><span>− {kobo(s.gatewayFees)}</span></div>
          <div className="minus"><span>Payout (transfer) costs, estimated</span><span>− {kobo(s.payoutCosts)}</span></div>
          <div className="minus"><span>Fees lost on refunds (Paystack keeps them)</span><span>− {kobo(s.lostOnRefunds)}</span></div>
          <div className="total"><span>Net profit</span><span>{kobo(s.netProfit)}</span></div>
          <div className="note">Counts completed orders only. Money still in escrow isn't your profit yet.</div>
        </div>
      </section>
      <div className="es-stats">
        <Stat label="Held in escrow right now (owed to buyers/sellers)" v={s.heldInEscrow} cls="warn" />
        <Stat label="Waiting to be paid out" v={s.awaitingPayout} cls={s.awaitingPayout ? "warn" : ""} />
        <Stat label="Open disputes" v={s.disputes} money={false} cls={s.disputes ? "bad" : ""} />
        <Stat label="Failed payouts" v={s.failedPayouts} money={false} cls={s.failedPayouts ? "bad" : ""} />
      </div>
      <p className="dx-hint">Keep at least “held in escrow” + “waiting to be paid out” available in your Paystack balance, because that money belongs to your users.</p>
    </>
  );
}

function OrderRow({ o, reload, setErr }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const go = async (path, body) => {
    setBusy(true); setErr("");
    try { await api(`/admin/orders/${o.id}/${path}`, { method: "POST", body }); await reload(); } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  const has = (a) => o.actions.includes(a);
  return (
    <section className="dx-panel">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <div><Link to={`/dashboard/escrow/${o.id}`}><b>{o.orderNo}</b></Link> <StatusPill status={o.status} />
          <div className="dx-hint">{o.items[0]?.title} · {o.buyer?.name} → {o.seller?.name} · {dateShort(o.createdAt)}</div></div>
        <b>{kobo(o.total)}</b>
      </div>
      {o.dispute && <p style={{ fontSize: 13, margin: "10px 0 0" }}><b>Dispute:</b> {o.dispute.reason}{o.dispute.details ? ` — ${o.dispute.details}` : ""}</p>}
      {o.payout?.lastError && <p style={{ fontSize: 13, color: "#b91c1c", margin: "6px 0 0" }}>Payout: {o.payout.lastError}</p>}
      {(o.flags || []).length > 0 && <p className="dx-hint">Flags: {o.flags.join(", ")}</p>}
      {has("resolve") && (
        <div style={{ marginTop: 10 }}>
          <input className="dx-input" placeholder="Your decision note (the buyer and seller will see it)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
          <div className="es-btnrow">
            <button className="dx-btn dx-btn-primary dx-btn-sm" disabled={busy} onClick={() => window.confirm(`Pay ${o.seller?.name} ${kobo(o.sellerReceives)}?`) && go("resolve", { decision: "release", note })}>Release to seller</button>
            <button className="dx-btn dx-btn-danger dx-btn-sm" disabled={busy} onClick={() => window.confirm(`Refund ${o.buyer?.name} ${kobo(o.total)}?`) && go("resolve", { decision: "refund", note })}>Refund buyer</button>
          </div>
        </div>
      )}
      <div className="es-btnrow">
        {has("retry_payout") && <button className="dx-btn dx-btn-primary dx-btn-sm" disabled={busy} onClick={() => go("retry-payout")}>Retry payout</button>}
        {o.status === "completed" && o.payout?.status === "processing" && <button className="dx-btn dx-btn-ghost dx-btn-sm" disabled={busy} onClick={() => go("sync-payout")}>Check payout status</button>}
        {has("retry_refund") && <button className="dx-btn dx-btn-primary dx-btn-sm" disabled={busy} onClick={() => go("retry-refund")}>Retry refund</button>}
      </div>
    </section>
  );
}

function Orders({ attention }) {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const load = useCallback(() => api(`/admin/orders?${attention ? "attention=1" : q ? "q=" + encodeURIComponent(q) : ""}`).then((d) => setRows(d.orders)).catch((e) => { setErr(e.message); setRows([]); }), [attention, q]);
  useEffect(() => { load(); }, [load]);
  return (
    <>
      {!attention && <input className="dx-input" style={{ marginBottom: 12 }} placeholder="Search by order number, e.g. GM100012" value={q} onChange={(e) => setQ(e.target.value.trim())} />}
      <Alert>{err}</Alert>
      {!rows ? <Spinner /> : rows.length === 0 ? <Empty title={attention ? "Nothing needs your attention 🎉" : "No orders found"} /> : rows.map((o) => <OrderRow key={o.id} o={o} reload={load} setErr={setErr} />)}
    </>
  );
}

export default function Finance() {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState("overview");
  if (loading) return <Spinner />;
  if (user?.role !== "admin") return <Navigate to="/dashboard" replace />;
  return (
    <>
      <PageHead title="Finance" sub="Your earnings, disputes and payouts" />
      <Tabs tabs={[{ key: "overview", label: "Overview" }, { key: "attention", label: "Needs attention" }, { key: "orders", label: "All orders" }]} value={tab} onChange={setTab} />
      {tab === "overview" && <Overview />}
      {tab === "attention" && <Orders attention />}
      {tab === "orders" && <Orders />}
    </>
  );
}
