import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FaBuilding, FaMapMarkerAlt, FaSearch } from "react-icons/fa";
import "./SellerProfile.css";
import "./Companies.css";
import { api } from "../api";
import { Alert, Avatar, Empty, Spinner, Stars, VerifiedBadge } from "../components/dash/ui";

export default function Companies() {
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    setData(null); setErr("");
    api(`/companies?page=${page}&q=${encodeURIComponent(term)}`).then(setData).catch((e) => { setErr(e.message); setData({ companies: [], pages: 1 }); });
  }, [page, term]);

  const submit = (e) => { e.preventDefault(); setPage(1); setTerm(q.trim()); };

  return (
    <div className="sp-wrap">
      <div className="co-head">
        <div><h1>Companies</h1><p>Businesses selling on GeneralMarket</p></div>
        <form className="co-search" onSubmit={submit}>
          <FaSearch /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search companies…" />
          <button className="dx-btn dx-btn-primary dx-btn-sm">Search</button>
        </form>
      </div>
      <Alert>{err}</Alert>

      {!data ? <Spinner /> : data.companies.length === 0 ? (
        <Empty icon={<FaBuilding />} title="No companies found" sub={term ? "Try a different name." : "Business accounts will appear here once they set up a business profile."} />
      ) : (
        <>
          <div className="co-grid">
            {data.companies.map((c) => (
              <Link className="co-card" key={c.username} to={`/seller/${c.username}`}>
                <Avatar src={c.logo} name={c.name} size={56} />
                <div className="co-body">
                  <div className="co-name">{c.name} {c.verified && <VerifiedBadge />}</div>
                  {c.category && <div className="co-cat">{c.category}</div>}
                  {(c.address || c.location?.city) && <div className="co-loc"><FaMapMarkerAlt /> {c.address || [c.location.city, c.location.state].filter(Boolean).join(", ")}</div>}
                  {c.description && <p>{c.description}</p>}
                  <div className="co-foot"><Stars value={c.rating.avg} count={c.rating.count} size={12} /><span>{c.listings} {c.listings === 1 ? "listing" : "listings"}</span></div>
                </div>
              </Link>
            ))}
          </div>
          {data.pages > 1 && (
            <div className="co-pager">
              <button className="dx-btn dx-btn-ghost dx-btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
              <span>Page {page} of {data.pages}</span>
              <button className="dx-btn dx-btn-ghost dx-btn-sm" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}