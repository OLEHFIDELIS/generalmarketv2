import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FaHeart, FaTimes } from "react-icons/fa";
import { api, priceText } from "../../api";
import { Alert, Empty, PageHead, Spinner } from "../../components/dash/ui";

export default function Favorites() {
  const [items, setItems] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => { api("/me/favorites").then((d) => setItems(d.listings)).catch((e) => { setErr(e.message); setItems([]); }); }, []);

  const remove = async (id) => {
    const prev = items;
    setItems(items.filter((p) => p._id !== id));
    try { await api(`/me/favorites/${id}`, { method: "POST" }); } catch (e) { setItems(prev); setErr(e.message); }
  };

  return (
    <>
      <PageHead title="Favorite listings" sub="Ads you've saved to come back to" />
      <Alert>{err}</Alert>
      {!items ? <Spinner /> : items.length === 0 ? (
        <Empty icon={<FaHeart />} title="No favorites yet" sub="Tap the heart on any listing to save it here.">
          <Link className="dx-btn dx-btn-primary" to="/all">Browse listings</Link>
        </Empty>
      ) : (
        <div className="dx-cards">
          {items.map((p) => (
            <div key={p._id} style={{ position: "relative" }}>
              <Link className={`dx-lcard${p.unavailable ? " off" : ""}`} to={`/product/${p._id}`}>
                <img src={p.images?.[0] || "/placeholder.jpg"} alt="" onError={(e) => { e.currentTarget.src = "/placeholder.jpg"; }} />
                <div className="dx-lcard-body">
                  <div className="dx-lcard-title">{p.title}</div>
                  <div className="dx-lcard-price">{priceText(p)}</div>
                  {p.unavailable && <div className="dx-hint">No longer available</div>}
                </div>
              </Link>
              <button className="dx-lcard-x" onClick={() => remove(p._id)} aria-label="Remove from favorites"><FaTimes /></button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
