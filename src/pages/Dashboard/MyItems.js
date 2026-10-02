import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useOutletContext, useSearchParams } from "react-router-dom";
import { FaEdit, FaRedo, FaTrash, FaCheck, FaPlus, FaEye, FaUndo, FaList } from "react-icons/fa";
import { api, priceText, dateShort } from "../../api";
import { Alert, Empty, PageHead, Spinner, StatusBadge, Tabs } from "../../components/dash/ui";

const STATUSES = ["active", "pending", "expired", "sold", "rejected"];

export default function MyItems() {
  const [params, setParams] = useSearchParams();
  const status = STATUSES.includes(params.get("status")) ? params.get("status") : "active";
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState("");
  const { reloadDash } = useOutletContext() || {};
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setErr("");
    try { setData(await api(`/me/listings?status=${status}&page=${page}&limit=15`)); }
    catch (e) { setErr(e.message); setData({ listings: [], counts: {}, pages: 1 }); }
  }, [status, page]);

  useEffect(() => { setData(null); load(); }, [load]);
  useEffect(() => { setPage(1); }, [status]);

  const act = async (id, key, fn, confirmMsg) => {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    setBusy(id + key); setErr("");
    try { await fn(); await load(); reloadDash && reloadDash(); }
    catch (e) { setErr(e.message); }
    finally { setBusy(""); }
  };

  const counts = data?.counts || {};
  const tabs = STATUSES.filter((s) => s !== "rejected" || counts.rejected).map((s) => ({ key: s, label: s[0].toUpperCase() + s.slice(1), count: counts[s] || 0 }));
  const daysLeft = (d) => (d ? Math.ceil((new Date(d) - Date.now()) / 86400000) : null);

  return (
    <>
      <PageHead title="My ads" sub="Manage, renew and mark your listings as sold">
        <Link className="dx-btn dx-btn-primary" to="/dashboard/post"><FaPlus /> Post an ad</Link>
      </PageHead>
      <Tabs tabs={tabs} value={status} onChange={(k) => setParams({ status: k })} />
      <Alert>{err}</Alert>

      {!data ? <Spinner /> : data.listings.length === 0 ? (
        <Empty icon={<FaList />} title={`No ${status} listings`} sub={status === "active" ? "Post your first ad — it takes about two minutes." : "Nothing here right now."}>
          {status === "active" && <Link className="dx-btn dx-btn-primary" to="/dashboard/post">Post an ad</Link>}
        </Empty>
      ) : (
        <>
          <div className="dx-rows">
            {data.listings.map((p) => {
              const left = daysLeft(p.expiresAt);
              const soon = p.status === "active" && left !== null && left <= 7;
              const b = (k) => busy === p._id + k;
              return (
                <div className="dx-row" key={p._id}>
                  <img className="dx-row-img" src={p.images?.[0] || "/placeholder.jpg"} alt="" onError={(e) => { e.currentTarget.src = "/placeholder.jpg"; }} />
                  <div className="dx-row-main">
                    <Link className="dx-row-title" to={`/product/${p._id}`}>{p.title}</Link>
                    <div className="dx-row-meta">
                      <span className="dx-row-price">{priceText(p)}</span>
                      <StatusBadge status={p.status} />
                      <span><FaEye /> {p.views || 0}</span>
                      <span>Posted {dateShort(p.createdAt)}</span>
                      {p.status === "active" && left !== null && <span style={{ color: soon ? "#ea580c" : undefined }}>{left > 0 ? `${left} day${left > 1 ? "s" : ""} left` : "expires today"}</span>}
                    </div>
                    {p.status === "rejected" && p.rejectionReason && <div className="dx-hint" style={{ color: "#b91c1c", marginTop: 4 }}>Reason: {p.rejectionReason}</div>}
                    {p.status === "pending" && <div className="dx-hint" style={{ marginTop: 4 }}>Waiting for review — it will appear in search once approved.</div>}
                  </div>
                  <div className="dx-row-actions">
                    {(p.status === "expired" || soon) && (
                      <button className="dx-btn dx-btn-primary dx-btn-sm" disabled={b("r")} onClick={() => act(p._id, "r", () => api(`/me/listings/${p._id}/renew`, { method: "POST" }))}><FaRedo /> Renew</button>
                    )}
                    {p.status === "active" && (
                      <button className="dx-btn dx-btn-ghost dx-btn-sm" disabled={b("s")} onClick={() => act(p._id, "s", () => api(`/me/listings/${p._id}/sold`, { method: "POST", body: { sold: true } }), "Mark this ad as sold? It will be removed from search.")}><FaCheck /> Sold</button>
                    )}
                    {p.status === "sold" && (
                      <button className="dx-btn dx-btn-ghost dx-btn-sm" disabled={b("s")} onClick={() => act(p._id, "s", () => api(`/me/listings/${p._id}/sold`, { method: "POST", body: { sold: false } }))}><FaUndo /> Relist</button>
                    )}
                    <button className="dx-btn dx-btn-ghost dx-btn-sm" onClick={() => navigate(`/dashboard/post/${p._id}`)}><FaEdit /> Edit</button>
                    <button className="dx-btn dx-btn-danger dx-btn-sm" disabled={b("d")} onClick={() => act(p._id, "d", () => api(`/me/listings/${p._id}`, { method: "DELETE" }), "Delete this ad permanently? This can't be undone.")}><FaTrash /></button>
                  </div>
                </div>
              );
            })}
          </div>
          {data.pages > 1 && (
            <div className="dx-pager">
              <button className="dx-btn dx-btn-ghost dx-btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
              Page {page} of {data.pages}
              <button className="dx-btn dx-btn-ghost dx-btn-sm" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next</button>
            </div>
          )}
        </>
      )}
    </>
  );
}
