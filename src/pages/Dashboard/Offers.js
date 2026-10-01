import React, { useCallback, useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { FaGavel } from "react-icons/fa";
import { api, money, timeAgo } from "../../api";
import { Alert, Avatar, Empty, PageHead, Spinner, StatusBadge, Tabs } from "../../components/dash/ui";

export default function Offers() {
  const [type, setType] = useState("received");
  const [offers, setOffers] = useState(null);
  const [err, setErr] = useState("");
  const { reloadDash } = useOutletContext() || {};

  const load = useCallback(() => { setOffers(null); api(`/me/offers?type=${type}`).then((d) => setOffers(d.offers)).catch((e) => { setErr(e.message); setOffers([]); }); }, [type]);
  useEffect(() => { load(); }, [load]);

  const act = async (path, body, confirmMsg) => {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    setErr("");
    try { await api(path, { method: "POST", body }); load(); reloadDash && reloadDash(); } catch (e) { setErr(e.message); }
  };

  return (
    <>
      <PageHead title="Offers" sub="Price offers on your ads, and offers you've made" />
      <Tabs tabs={[{ key: "received", label: "Received" }, { key: "sent", label: "Sent" }]} value={type} onChange={setType} />
      <Alert>{err}</Alert>
      {!offers ? <Spinner /> : offers.length === 0 ? (
        <Empty icon={<FaGavel />} title={type === "received" ? "No offers received" : "You haven't made any offers"} sub={type === "sent" ? "Use “Make an offer” on any listing to negotiate." : "Offers on your ads will appear here."} />
      ) : (
        <div className="dx-rows">
          {offers.map((o) => (
            <div className="dx-row" key={o.id}>
              <img className="dx-row-img" src={o.listing.image || "/placeholder.jpg"} alt="" />
              <div className="dx-row-main">
                <Link className="dx-row-title" to={`/product/${o.listing.id}`}>{o.listing.title}</Link>
                <div className="dx-row-meta">
                  <span className="dx-row-price">{money(o.amount)}</span>
                  <span>asking {money(o.listing.price)}</span>
                  <StatusBadge status={o.status} />
                  <span>{timeAgo(o.createdAt)}</span>
                </div>
                <div className="dx-row-meta">
                  <Avatar src={o.user?.avatar} name={o.user?.name} size={20} />
                  <span>{type === "received" ? "From" : "To"} {o.user?.username ? <Link to={`/seller/${o.user.username}`}>{o.user.name}</Link> : o.user?.name}</span>
                </div>
                {o.message && <div className="dx-hint" style={{ marginTop: 4 }}>“{o.message}”</div>}
              </div>
              <div className="dx-row-actions">
                {o.status === "pending" && type === "received" && (<>
                  <button className="dx-btn dx-btn-primary dx-btn-sm" onClick={() => act(`/offers/${o.id}/respond`, { action: "accept" }, `Accept ${money(o.amount)}? The buyer will be notified in Messages.`)}>Accept</button>
                  <button className="dx-btn dx-btn-danger dx-btn-sm" onClick={() => act(`/offers/${o.id}/respond`, { action: "decline" })}>Decline</button>
                </>)}
                {o.status === "pending" && type === "sent" && (
                  <button className="dx-btn dx-btn-ghost dx-btn-sm" onClick={() => act(`/offers/${o.id}/withdraw`, undefined, "Withdraw this offer?")}>Withdraw</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
