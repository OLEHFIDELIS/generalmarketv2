import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FaStar } from "react-icons/fa";
import { api, timeAgo } from "../../api";
import { Alert, Avatar, Empty, PageHead, Spinner, Stars, Tabs } from "../../components/dash/ui";

export default function Ratings() {
  const [type, setType] = useState("received");
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  const load = () => { setData(null); api(`/me/ratings?type=${type}`).then(setData).catch((e) => { setErr(e.message); setData({ ratings: [], summary: {} }); }); };
  useEffect(load, [type]); // eslint-disable-line react-hooks/exhaustive-deps

  const remove = async (id) => {
    if (!window.confirm("Delete this rating?")) return;
    try { await api(`/ratings/${id}`, { method: "DELETE" }); load(); } catch (e) { setErr(e.message); }
  };

  return (
    <>
      <PageHead title="Ratings" sub="Reviews from people you've dealt with on GeneralMarket" />
      {data?.summary?.count > 0 && (
        <div className="dx-panel" style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ fontFamily: "Syne", fontSize: 34, fontWeight: 800 }}>{data.summary.avg.toFixed(1)}</div>
          <div><Stars value={data.summary.avg} size={18} /><div className="dx-hint">Based on {data.summary.count} rating{data.summary.count > 1 ? "s" : ""}</div></div>
        </div>
      )}
      <Tabs tabs={[{ key: "received", label: "Received" }, { key: "given", label: "Given" }]} value={type} onChange={setType} />
      <Alert>{err}</Alert>
      {!data ? <Spinner /> : data.ratings.length === 0 ? (
        <Empty icon={<FaStar />} title={type === "received" ? "No ratings yet" : "You haven't rated anyone"} sub={type === "given" ? "After chatting with someone, open the conversation and tap Rate." : "Ratings appear here after buyers or sellers you've chatted with review you."} />
      ) : (
        <div className="dx-rows">
          {data.ratings.map((r) => (
            <div className="dx-row" key={r.id}>
              <Avatar src={r.user?.avatar} name={r.user?.name} size={44} />
              <div className="dx-row-main">
                <div className="dx-row-title">{r.user?.username ? <Link to={`/seller/${r.user.username}`} style={{ color: "inherit" }}>{r.user.name}</Link> : r.user?.name}</div>
                <div className="dx-row-meta"><Stars value={r.stars} /><span>{timeAgo(r.createdAt)}</span></div>
                {r.comment && <div style={{ fontSize: 13.5, color: "#475569", marginTop: 6 }}>{r.comment}</div>}
              </div>
              {type === "given" && <button className="dx-btn dx-btn-danger dx-btn-sm" onClick={() => remove(r.id)}>Delete</button>}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
