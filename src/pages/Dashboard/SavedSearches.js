import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FaBell, FaPlus, FaTrash } from "react-icons/fa";
import { api, money } from "../../api";
import { categories } from "../../data/categories";
import { REGIONS, regionLabel } from "../../data/regions";
import { Alert, Empty, PageHead, Spinner } from "../../components/dash/ui";

const describe = (q) =>
  [q.q && `“${q.q}”`, q.categories?.join(", "), q.regions?.map((r) => regionLabel(r.toLowerCase().replace(/\s+/g, "-"))).join(", "),
   q.minPrice != null && `from ${money(q.minPrice)}`, q.maxPrice != null && `up to ${money(q.maxPrice)}`, q.conditions?.join(", "), q.transactions?.join(", ")]
    .filter(Boolean).join(" · ");

export default function SavedSearches() {
  const [alerts, setAlerts] = useState(null);
  const [err, setErr] = useState("");
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ q: "", category: "", region: "", minPrice: "", maxPrice: "" });
  const [results, setResults] = useState(null);

  const load = useCallback(() => api("/me/alerts").then((d) => setAlerts(d.alerts)).catch((e) => { setErr(e.message); setAlerts([]); }), []);
  useEffect(() => { load(); }, [load]);

  const create = async (e) => {
    e.preventDefault(); setErr("");
    try {
      await api("/me/alerts", { method: "POST", body: { query: { q: f.q, categories: f.category ? [f.category] : [], regions: f.region ? [f.region] : [], minPrice: f.minPrice, maxPrice: f.maxPrice } } });
      setF({ q: "", category: "", region: "", minPrice: "", maxPrice: "" }); setAdding(false); load();
    } catch (er) { setErr(er.message); }
  };

  const view = async (a) => {
    try { const d = await api(`/me/alerts/${a._id}/results`); setResults({ alert: a, listings: d.listings }); load(); }
    catch (er) { setErr(er.message); }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this saved search?")) return;
    try { await api(`/me/alerts/${id}`, { method: "DELETE" }); setResults(null); load(); } catch (er) { setErr(er.message); }
  };

  if (results) {
    return (
      <>
        <PageHead title={results.alert.name} sub={describe(results.alert.query)}>
          <button className="dx-btn dx-btn-ghost" onClick={() => setResults(null)}>← Back</button>
        </PageHead>
        {results.listings.length === 0 ? <Empty icon={<FaBell />} title="No matches right now" sub="We'll show new matches here as they're posted." /> : (
          <div className="dx-cards">
            {results.listings.map((p) => (
              <Link key={p._id} className="dx-lcard" to={`/product/${p._id}`}>
                <img src={p.images?.[0] || "/placeholder.jpg"} alt="" />
                <div className="dx-lcard-body"><div className="dx-lcard-title">{p.title}</div><div className="dx-lcard-price">{money(p.price)}</div></div>
              </Link>
            ))}
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <PageHead title="Saved searches" sub="See new listings that match what you're looking for">
        <button className="dx-btn dx-btn-primary" onClick={() => setAdding(!adding)}><FaPlus /> New search</button>
      </PageHead>
      <Alert>{err}</Alert>

      {adding && (
        <form className="dx-panel" onSubmit={create}>
          <h3>New saved search</h3>
          <div className="dx-field"><label>Keywords</label><input className="dx-input" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} placeholder="e.g. iphone" /></div>
          <div className="dx-grid2">
            <div className="dx-field"><label>Category</label>
              <select className="dx-select" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}><option value="">Any</option>{categories.map((c) => <option key={c}>{c}</option>)}</select></div>
            <div className="dx-field"><label>State</label>
              <select className="dx-select" value={f.region} onChange={(e) => setF({ ...f, region: e.target.value })}><option value="">Anywhere</option>{REGIONS.map((r) => <option key={r} value={r}>{regionLabel(r)}</option>)}</select></div>
            <div className="dx-field"><label>Min price (₦)</label><input className="dx-input" type="number" min="0" value={f.minPrice} onChange={(e) => setF({ ...f, minPrice: e.target.value })} /></div>
            <div className="dx-field"><label>Max price (₦)</label><input className="dx-input" type="number" min="0" value={f.maxPrice} onChange={(e) => setF({ ...f, maxPrice: e.target.value })} /></div>
          </div>
          <div className="dx-actions"><button className="dx-btn dx-btn-primary">Save search</button><button type="button" className="dx-btn dx-btn-ghost" onClick={() => setAdding(false)}>Cancel</button></div>
        </form>
      )}

      {!alerts ? <Spinner /> : alerts.length === 0 && !adding ? (
        <Empty icon={<FaBell />} title="No saved searches" sub="Save a search from the listings page, or create one here." />
      ) : (
        <div className="dx-rows">
          {alerts.map((a) => (
            <div className="dx-row" key={a._id}>
              <div className="dx-row-main">
                <div className="dx-row-title">{a.name}</div>
                <div className="dx-row-meta"><span>{describe(a.query)}</span></div>
              </div>
              {a.newCount > 0 && <span className="dx-unread">{a.newCount} new</span>}
              <div className="dx-row-actions">
                <button className="dx-btn dx-btn-ghost dx-btn-sm" onClick={() => view(a)}>View matches</button>
                <button className="dx-btn dx-btn-danger dx-btn-sm" onClick={() => remove(a._id)} aria-label="Delete"><FaTrash /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
