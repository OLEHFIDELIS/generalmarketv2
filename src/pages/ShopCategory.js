import React, { useContext, useState, useMemo } from "react";
import "./ShopCategory.css";
import { ShopContext } from "../context/ShopContext";
import Item from "../components/Item";
import { FaChevronRight, FaTh, FaList, FaSlidersH, FaTimes, FaChevronDown } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const PAGE_SIZE = 12;

const SORT_OPTIONS = [
  { label: "Newest first",       value: "newest"     },
  { label: "Oldest first",       value: "oldest"     },
  { label: "Price: Low to High", value: "price_asc"  },
  { label: "Price: High to Low", value: "price_desc" },
];

const CONDITIONS   = ["New", "Used"];
const TRANSACTIONS = ["Sell", "Buy", "Rent", "Exchange"];

const CATEGORY_META = {
  "electronics":             { icon: "📱", color: "#3b82f6", bg: "#eff6ff"  },
  "vehicles":                { icon: "🚗", color: "#f97316", bg: "#fff7ed"  },
  "property":                { icon: "🏠", color: "#10b981", bg: "#f0fdf4"  },
  "fashion & beauty":        { icon: "👗", color: "#ec4899", bg: "#fdf2f8"  },
  "services":                { icon: "💼", color: "#8b5cf6", bg: "#f5f3ff"  },
  "jobs":                    { icon: "👔", color: "#06b6d4", bg: "#ecfeff"  },
  "hobbies & entertainment": { icon: "🎮", color: "#f59e0b", bg: "#fffbeb"  },
  "home & furniture":        { icon: "🛋️", color: "#84cc16", bg: "#f7fee7"  },
  "garden & outdoor":        { icon: "🌿", color: "#22c55e", bg: "#f0fdf4"  },
  "agriculture & food":      { icon: "🚜", color: "#a3e635", bg: "#f7fee7"  },
  "baby & kids":             { icon: "👶", color: "#fb923c", bg: "#fff7ed"  },
  "misc & others":           { icon: "📦", color: "#94a3b8", bg: "#f8fafc"  },
  "gadgets & accessories":   { icon: "🔌", color: "#818cf8", bg: "#eef2ff"  },
  "adult":                   { icon: "🔞", color: "#f43f5e", bg: "#fff1f2"  },
};

const ShopCategory = ({ category }) => {
  const { all_product } = useContext(ShopContext);
  const navigate = useNavigate();

  const [sort,       setSort]       = useState("newest");
  const [view,       setView]       = useState("grid");
  const [visible,    setVisible]    = useState(PAGE_SIZE);
  const [conditions, setConditions] = useState([]);
  const [txTypes,    setTxTypes]    = useState([]);
  const [showFilter, setShowFilter] = useState(false);
  const [minPrice,   setMinPrice]   = useState("");
  const [maxPrice,   setMaxPrice]   = useState("");

  const catKey  = (category || "").toLowerCase();
  const meta    = CATEGORY_META[catKey] || { icon: "📦", color: "#f97316", bg: "#fff7ed" };
  const catLabel = category;

  const toggleArr = (arr, setArr, val) =>
    setArr(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);

  const activeFilters = conditions.length + txTypes.length + (minPrice ? 1 : 0) + (maxPrice ? 1 : 0);

  const clearFilters = () => {
    setConditions([]); setTxTypes([]);
    setMinPrice(""); setMaxPrice("");
    setVisible(PAGE_SIZE);
  };

  const filtered = useMemo(() => {
    return (all_product || [])
      .filter(p => {
        const matchCat  = (p.category || "").toLowerCase() === catKey;
        const matchCond = !conditions.length || conditions.some(c => (p.condition || "").toLowerCase() === c.toLowerCase());
        const matchTx   = !txTypes.length    || txTypes.some(t => (p.transaction || "").toLowerCase() === t.toLowerCase());
        const matchMin  = !minPrice || Number(p.price) >= Number(minPrice);
        const matchMax  = !maxPrice || Number(p.price) <= Number(maxPrice);
        return matchCat && matchCond && matchTx && matchMin && matchMax;
      })
      .sort((a, b) => {
        if (sort === "newest")     return new Date(b.createdAt) - new Date(a.createdAt);
        if (sort === "oldest")     return new Date(a.createdAt) - new Date(b.createdAt);
        if (sort === "price_asc")  return Number(a.price) - Number(b.price);
        if (sort === "price_desc") return Number(b.price) - Number(a.price);
        return 0;
      });
  }, [all_product, catKey, sort, conditions, txTypes, minPrice, maxPrice]);

  const shown  = filtered.slice(0, visible);
  const hasMore = visible < filtered.length;

  return (
    <div className="sc-wrapper">

      {/* ── Hero banner ── */}
      <div className="sc-hero" style={{ background: `linear-gradient(135deg, ${meta.color}18, ${meta.color}08)`, borderBottom: `3px solid ${meta.color}30` }}>
        <div className="sc-hero-inner">
          <nav className="sc-breadcrumb">
            <span className="sc-bc-link" onClick={() => navigate("/")}>Home</span>
            <FaChevronRight className="sc-bc-sep" />
            <span className="sc-bc-current">{catLabel}</span>
          </nav>
          <div className="sc-hero-content">
            <div className="sc-hero-icon" style={{ background: meta.bg, border: `2px solid ${meta.color}30` }}>
              {meta.icon}
            </div>
            <div>
              <h1 className="sc-hero-title" style={{ color: meta.color }}>{catLabel}</h1>
              <p className="sc-hero-sub">
                {filtered.length} listing{filtered.length !== 1 ? "s" : ""} available
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="sc-body">

        {/* ── Toolbar ── */}
        <div className="sc-toolbar">
          <div className="sc-toolbar-left">
            <span className="sc-result-count">
              Showing <strong>{shown.length}</strong> of <strong>{filtered.length}</strong>
            </span>

            {/* Active filter chips */}
            {activeFilters > 0 && (
              <div className="sc-chips">
                {conditions.map(c => (
                  <span key={c} className="sc-chip">
                    {c} <button onClick={() => toggleArr(conditions, setConditions, c)}><FaTimes /></button>
                  </span>
                ))}
                {txTypes.map(t => (
                  <span key={t} className="sc-chip">
                    {t} <button onClick={() => toggleArr(txTypes, setTxTypes, t)}><FaTimes /></button>
                  </span>
                ))}
                {(minPrice || maxPrice) && (
                  <span className="sc-chip">
                    ₦{minPrice || "0"}–₦{maxPrice || "∞"}
                    <button onClick={() => { setMinPrice(""); setMaxPrice(""); }}><FaTimes /></button>
                  </span>
                )}
                <button className="sc-chip-clear" onClick={clearFilters}>Clear all</button>
              </div>
            )}
          </div>

          <div className="sc-toolbar-right">
            {/* Filter toggle */}
            <button
              className={`sc-filter-btn ${showFilter ? "active" : ""}`}
              onClick={() => setShowFilter(s => !s)}
            >
              <FaSlidersH />
              Filter
              {activeFilters > 0 && <span className="sc-filter-badge">{activeFilters}</span>}
              <FaChevronDown className={`sc-filter-chevron ${showFilter ? "open" : ""}`} />
            </button>

            {/* Sort */}
            <select
              className="sc-sort"
              value={sort}
              onChange={e => { setSort(e.target.value); setVisible(PAGE_SIZE); }}
            >
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>

            {/* View toggle */}
            <div className="sc-view-toggle">
              <button className={view === "grid" ? "active" : ""} onClick={() => setView("grid")}><FaTh /></button>
              <button className={view === "list" ? "active" : ""} onClick={() => setView("list")}><FaList /></button>
            </div>
          </div>
        </div>

        {/* ── Inline filter panel ── */}
        {showFilter && (
          <div className="sc-filter-panel">
            <div className="sc-fp-group">
              <span className="sc-fp-label">Condition</span>
              <div className="sc-fp-pills">
                {CONDITIONS.map(c => (
                  <button
                    key={c}
                    className={`sc-fp-pill ${conditions.includes(c) ? "active" : ""}`}
                    style={{ "--pc": meta.color }}
                    onClick={() => { toggleArr(conditions, setConditions, c); setVisible(PAGE_SIZE); }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div className="sc-fp-group">
              <span className="sc-fp-label">Transaction</span>
              <div className="sc-fp-pills">
                {TRANSACTIONS.map(t => (
                  <button
                    key={t}
                    className={`sc-fp-pill ${txTypes.includes(t) ? "active" : ""}`}
                    style={{ "--pc": meta.color }}
                    onClick={() => { toggleArr(txTypes, setTxTypes, t); setVisible(PAGE_SIZE); }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="sc-fp-group">
              <span className="sc-fp-label">Price Range</span>
              <div className="sc-fp-price">
                <input type="number" placeholder="Min ₦" value={minPrice}
                  onChange={e => { setMinPrice(e.target.value); setVisible(PAGE_SIZE); }} />
                <span>—</span>
                <input type="number" placeholder="Max ₦" value={maxPrice}
                  onChange={e => { setMaxPrice(e.target.value); setVisible(PAGE_SIZE); }} />
              </div>
            </div>
          </div>
        )}

        {/* ── Results ── */}
        {filtered.length === 0 ? (
          <div className="sc-empty">
            <div className="sc-empty-icon">{meta.icon}</div>
            <h3>No listings in {catLabel} yet</h3>
            <p>Be the first to post in this category</p>
            <a
              href="https://wa.me/+2348141846896"
              target="_blank"
              rel="noopener noreferrer"
              className="sc-post-btn"
              style={{ background: meta.color }}
            >
              + Post a free ad
            </a>
          </div>
        ) : (
          <>
            <div className={`sc-grid ${view === "list" ? "list-view" : ""}`}>
              {shown.map((item) => (
                <Item
                  key={item._id || item.id}
                  id={item.id}
                  name={item.title}
                  images={item.images}
                  new_price={item.price}
                  address={item.address || item.city}
                />
              ))}
            </div>

            {hasMore && (
              <div className="sc-load-wrap">
                <div className="sc-load-progress">
                  <div className="sc-load-bar" style={{ width: `${(visible / filtered.length) * 100}%`, background: meta.color }} />
                </div>
                <p className="sc-load-label">
                  Showing <strong>{shown.length}</strong> of <strong>{filtered.length}</strong> listings
                </p>
                <button
                  className="sc-load-btn"
                  style={{ borderColor: meta.color, color: meta.color }}
                  onClick={() => setVisible(v => v + PAGE_SIZE)}
                >
                  Load more listings →
                </button>
              </div>
            )}

            {!hasMore && filtered.length > PAGE_SIZE && (
              <div className="sc-end">✅ You've seen all <strong>{filtered.length}</strong> listings</div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ShopCategory;