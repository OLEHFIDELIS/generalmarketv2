import React, { useContext, useState, useCallback } from "react";
import "./AllListings.css";
import { ShopContext } from "../context/ShopContext";
import Item from "../components/Item";
import {
  FaSearch, FaFilter, FaTimes, FaChevronDown,
  FaChevronUp, FaTh, FaList, FaSlidersH, FaChevronRight
} from "react-icons/fa";
import { useLocation } from "react-router-dom";

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORIES = [
  "Electronics","Property","Vehicles","Home & Furniture",
  "Fashion & Beauty","Hobbies & Entertainment","Services",
  "Garden & Outdoor","Jobs","Agriculture & Food",
  "Gadgets & Accessories","Baby & Kids","Misc & Others","Adult"
];
const REGIONS = [
  "Abia","Adamawa","Akwa-Ibom","Anambra","Bauchi","Bayelsa","Benue",
  "Borno","Cross-River","Delta","Ebonyi","Edo","Ekiti","Enugu","Gombe",
  "Imo","Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara",
  "Lagos","Nasarawa","Niger","Ogun","Ondo","Osun","Oyo","Plateau",
  "Rivers","Sokoto","Taraba","Yobe","Zamfara","Abuja (FCT)"
];
const CONDITIONS   = ["New", "Used"];
const TRANSACTIONS = ["Sell", "Buy", "Rent", "Exchange"];
const SORT_OPTIONS = [
  { label: "Newest first",        value: "newest"     },
  { label: "Oldest first",        value: "oldest"     },
  { label: "Price: Low to High",  value: "price_asc"  },
  { label: "Price: High to Low",  value: "price_desc" },
];
const PAGE_SIZE = 12; // items per page load

const useQuery = () => new URLSearchParams(useLocation().search);

// ─── FiltersPanel (outside AllListings so it never re-mounts) ─────────────────
const FiltersPanel = ({
  selectedCats, setSelectedCats,
  selectedRegions, setSelectedRegions,
  selectedConditions, setSelectedConditions,
  selectedTx, setSelectedTx,
  minPrice, setMinPrice,
  maxPrice, setMaxPrice,
  activeFilterCount, clearAll,
}) => {
  const [open, setOpen] = useState({
    category: true, price: true, condition: true, transaction: true, region: false
  });
  const toggle = (s) => setOpen(p => ({ ...p, [s]: !p[s] }));

  const toggleItem = (list, setList, val) =>
    setList(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);

  return (
    <div className="filters-panel">
      <div className="fp-header">
        <span className="fp-title"><FaSlidersH /> Filters</span>
        {activeFilterCount > 0 && (
          <button className="fp-clear" onClick={clearAll}>
            Clear all ({activeFilterCount})
          </button>
        )}
      </div>

      {/* ── Category ── */}
      <div className="fp-section">
        <button className="fp-section-title" onClick={() => toggle("category")}>
          <span>Category</span>
          {open.category ? <FaChevronUp /> : <FaChevronDown />}
        </button>
        {open.category && (
          <div className="fp-checkboxes">
            {CATEGORIES.map(c => (
              <label
                key={c}
                className={`fp-check-label ${selectedCats.includes(c) ? "active" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={selectedCats.includes(c)}
                  onChange={() => toggleItem(selectedCats, setSelectedCats, c)}
                />
                <span>{c}</span>
                {selectedCats.includes(c) && <span className="fp-tick">✓</span>}
              </label>
            ))}
          </div>
        )}
      </div>

      {/* ── Price ── */}
      <div className="fp-section">
        <button className="fp-section-title" onClick={() => toggle("price")}>
          <span>Price Range</span>
          {open.price ? <FaChevronUp /> : <FaChevronDown />}
        </button>
        {open.price && (
          <div className="fp-price-row">
            <input
              type="number"
              placeholder="Min ₦"
              value={minPrice}
              onChange={e => setMinPrice(e.target.value)}
              className="fp-price-input"
            />
            <span className="fp-price-sep">—</span>
            <input
              type="number"
              placeholder="Max ₦"
              value={maxPrice}
              onChange={e => setMaxPrice(e.target.value)}
              className="fp-price-input"
            />
          </div>
        )}
      </div>

      {/* ── Condition ── */}
      <div className="fp-section">
        <button className="fp-section-title" onClick={() => toggle("condition")}>
          <span>Condition</span>
          {open.condition ? <FaChevronUp /> : <FaChevronDown />}
        </button>
        {open.condition && (
          <div className="fp-pills">
            {CONDITIONS.map(c => (
              <button
                key={c}
                type="button"
                className={`fp-pill ${selectedConditions.includes(c) ? "active" : ""}`}
                onClick={() => toggleItem(selectedConditions, setSelectedConditions, c)}
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Transaction ── */}
      <div className="fp-section">
        <button className="fp-section-title" onClick={() => toggle("transaction")}>
          <span>Transaction</span>
          {open.transaction ? <FaChevronUp /> : <FaChevronDown />}
        </button>
        {open.transaction && (
          <div className="fp-pills">
            {TRANSACTIONS.map(t => (
              <button
                key={t}
                type="button"
                className={`fp-pill ${selectedTx.includes(t) ? "active" : ""}`}
                onClick={() => toggleItem(selectedTx, setSelectedTx, t)}
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Location ── */}
      <div className="fp-section">
        <button className="fp-section-title" onClick={() => toggle("region")}>
          <span>Location</span>
          {open.region ? <FaChevronUp /> : <FaChevronDown />}
        </button>
        {open.region && (
          <div className="fp-checkboxes scrollable">
            {REGIONS.map(r => (
              <label
                key={r}
                className={`fp-check-label ${selectedRegions.includes(r) ? "active" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={selectedRegions.includes(r)}
                  onChange={() => toggleItem(selectedRegions, setSelectedRegions, r)}
                />
                <span>{r}</span>
                {selectedRegions.includes(r) && <span className="fp-tick">✓</span>}
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── AllListings ──────────────────────────────────────────────────────────────
const AllListings = () => {
  const { all_product } = useContext(ShopContext);
  const queryParam = useQuery().get("q") || "";

  // search
  const [search,   setSearch]   = useState(queryParam);
  const [inputVal, setInputVal] = useState(queryParam);

  // filters
  const [selectedCats,       setSelectedCats]       = useState([]);
  const [selectedRegions,    setSelectedRegions]    = useState([]);
  const [selectedConditions, setSelectedConditions] = useState([]);
  const [selectedTx,         setSelectedTx]         = useState([]);
  const [minPrice,           setMinPrice]           = useState("");
  const [maxPrice,           setMaxPrice]           = useState("");

  // ui
  const [sort,        setSort]        = useState("newest");
  const [view,        setView]        = useState("grid");
  const [drawerOpen,  setDrawerOpen]  = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const activeFilterCount =
    selectedCats.length + selectedRegions.length +
    selectedConditions.length + selectedTx.length +
    (minPrice ? 1 : 0) + (maxPrice ? 1 : 0);

  const clearAll = useCallback(() => {
    setSelectedCats([]);
    setSelectedRegions([]);
    setSelectedConditions([]);
    setSelectedTx([]);
    setMinPrice("");
    setMaxPrice("");
    setSearch("");
    setInputVal("");
    setVisibleCount(PAGE_SIZE);
  }, []);

  // reset pagination whenever filters/sort/search change
  const resetAndSet = (setter) => (val) => {
    setter(val);
    setVisibleCount(PAGE_SIZE);
  };

  // ── filtering + sorting ──
  const filtered = (all_product || [])
    .filter(p => {
      const q = search.toLowerCase();
      const ok_search = !q ||
        (p.title       || "").toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q) ||
        (p.category    || "").toLowerCase().includes(q) ||
        (p.city        || "").toLowerCase().includes(q) ||
        (p.region      || "").toLowerCase().includes(q);

      // category — case-insensitive exact match
      const ok_cat = !selectedCats.length ||
        selectedCats.some(c => (p.category || "").toLowerCase() === c.toLowerCase());

      // region — partial match (handles "akwa-ibom" vs "Akwa Ibom" etc.)
      const ok_region = !selectedRegions.length ||
        selectedRegions.some(r =>
          (p.region || "").toLowerCase().replace(/[-\s]/g, "")
            .includes(r.toLowerCase().replace(/[-\s]/g, ""))
        );

      // condition — case-insensitive
      const ok_cond = !selectedConditions.length ||
        selectedConditions.some(c => (p.condition || "").toLowerCase() === c.toLowerCase());

      // transaction — case-insensitive
      const ok_tx = !selectedTx.length ||
        selectedTx.some(t => (p.transaction || "").toLowerCase() === t.toLowerCase());

      const ok_min = !minPrice || Number(p.price) >= Number(minPrice);
      const ok_max = !maxPrice || Number(p.price) <= Number(maxPrice);

      return ok_search && ok_cat && ok_region && ok_cond && ok_tx && ok_min && ok_max;
    })
    .sort((a, b) => {
      if (sort === "newest")    return new Date(b.createdAt) - new Date(a.createdAt);
      if (sort === "oldest")    return new Date(a.createdAt) - new Date(b.createdAt);
      if (sort === "price_asc") return Number(a.price) - Number(b.price);
      if (sort === "price_desc") return Number(b.price) - Number(a.price);
      return 0;
    });

  // ── pagination slice ──
  const visible  = filtered.slice(0, visibleCount);
  const hasMore  = visibleCount < filtered.length;
  const loadMore = () => setVisibleCount(c => c + PAGE_SIZE);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(inputVal);
    setVisibleCount(PAGE_SIZE);
  };

  const filterProps = {
    selectedCats,       setSelectedCats:       resetAndSet(setSelectedCats),
    selectedRegions,    setSelectedRegions:    resetAndSet(setSelectedRegions),
    selectedConditions, setSelectedConditions: resetAndSet(setSelectedConditions),
    selectedTx,         setSelectedTx:         resetAndSet(setSelectedTx),
    minPrice,           setMinPrice:           resetAndSet(setMinPrice),
    maxPrice,           setMaxPrice:           resetAndSet(setMaxPrice),
    activeFilterCount,  clearAll,
  };

  const removeChip = (setter, val) =>
    setter(prev => prev.filter(v => v !== val));

  return (
    <div className="al-wrapper">

      {/* ── Sticky search bar ── */}
      <div className="al-search-bar">
        <div className="al-search-inner">
          <form className="al-search-form" onSubmit={handleSearch}>
            <FaSearch className="al-search-icon" />
            <input
              type="text"
              placeholder="Search listings, categories, locations..."
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
            />
            {inputVal && (
              <button
                type="button"
                className="al-clear-input"
                onClick={() => { setInputVal(""); setSearch(""); setVisibleCount(PAGE_SIZE); }}
              >
                <FaTimes />
              </button>
            )}
            <button type="submit" className="al-search-btn">Search</button>
          </form>
        </div>
      </div>

      <div className="al-body">

        {/* ── Desktop sidebar ── */}
        <aside className="al-sidebar">
          <FiltersPanel {...filterProps} />
        </aside>

        {/* ── Results ── */}
        <main className="al-main">

          {/* toolbar */}
          <div className="al-toolbar">
            <div className="al-toolbar-left">
              <span className="al-count">
                <strong>{filtered.length}</strong> listing{filtered.length !== 1 ? "s" : ""} found
                {search && (
                  <span className="al-search-term"> for "<em>{search}</em>"</span>
                )}
              </span>

              {/* active chips */}
              {activeFilterCount > 0 && (
                <div className="al-chips">
                  {selectedCats.map(c => (
                    <span key={c} className="al-chip">
                      {c}
                      <button onClick={() => removeChip(setSelectedCats, c)}><FaTimes /></button>
                    </span>
                  ))}
                  {selectedConditions.map(c => (
                    <span key={c} className="al-chip">
                      {c}
                      <button onClick={() => removeChip(setSelectedConditions, c)}><FaTimes /></button>
                    </span>
                  ))}
                  {selectedTx.map(t => (
                    <span key={t} className="al-chip">
                      {t}
                      <button onClick={() => removeChip(setSelectedTx, t)}><FaTimes /></button>
                    </span>
                  ))}
                  {selectedRegions.map(r => (
                    <span key={r} className="al-chip">
                      {r}
                      <button onClick={() => removeChip(setSelectedRegions, r)}><FaTimes /></button>
                    </span>
                  ))}
                  {(minPrice || maxPrice) && (
                    <span className="al-chip">
                      ₦{minPrice || "0"} – ₦{maxPrice || "∞"}
                      <button onClick={() => { setMinPrice(""); setMaxPrice(""); setVisibleCount(PAGE_SIZE); }}>
                        <FaTimes />
                      </button>
                    </span>
                  )}
                  <button className="al-chip-clearall" onClick={clearAll}>Clear all</button>
                </div>
              )}
            </div>

            <div className="al-toolbar-right">
              {/* mobile filter btn */}
              <button className="al-filter-btn" onClick={() => setDrawerOpen(true)}>
                <FaFilter />
                Filters
                {activeFilterCount > 0 && (
                  <span className="filter-badge">{activeFilterCount}</span>
                )}
              </button>

              {/* sort */}
              <select
                className="al-sort"
                value={sort}
                onChange={e => { setSort(e.target.value); setVisibleCount(PAGE_SIZE); }}
              >
                {SORT_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>

              {/* view toggle */}
              <div className="al-view-toggle">
                <button
                  className={view === "grid" ? "active" : ""}
                  onClick={() => setView("grid")}
                  title="Grid view"
                ><FaTh /></button>
                <button
                  className={view === "list" ? "active" : ""}
                  onClick={() => setView("list")}
                  title="List view"
                ><FaList /></button>
              </div>
            </div>
          </div>

          {/* results */}
          {filtered.length === 0 ? (
            <div className="al-empty">
              <div className="al-empty-icon">🔍</div>
              <h3>No listings found</h3>
              <p>Try adjusting your search or removing some filters</p>
              {activeFilterCount > 0 && (
                <button className="al-empty-clear" onClick={clearAll}>
                  Clear all filters
                </button>
              )}
            </div>
          ) : (
            <>
              <div className={`al-results ${view === "list" ? "list-view" : "grid-view"}`}>
                {visible.map((item) => (
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

              {/* ── View More ── */}
              {hasMore && (
                <div className="al-load-more-wrap">
                  <div className="al-load-progress">
                    <div
                      className="al-load-bar"
                      style={{ width: `${(visibleCount / filtered.length) * 100}%` }}
                    />
                  </div>
                  <p className="al-load-label">
                    Showing <strong>{visible.length}</strong> of <strong>{filtered.length}</strong> listings
                  </p>
                  <button className="al-load-more-btn" onClick={loadMore}>
                    Load more listings <FaChevronRight className="lm-icon" />
                  </button>
                </div>
              )}

              {!hasMore && filtered.length > PAGE_SIZE && (
                <div className="al-end-msg">
                  ✅ You've seen all <strong>{filtered.length}</strong> listings
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* ── Mobile drawer ── */}
      {drawerOpen && (
        <div className="al-drawer-overlay" onClick={() => setDrawerOpen(false)}>
          <div className="al-drawer" onClick={e => e.stopPropagation()}>
            <div className="al-drawer-header">
              <span>Filters</span>
              <button onClick={() => setDrawerOpen(false)}><FaTimes /></button>
            </div>
            <div className="al-drawer-body">
              <FiltersPanel {...filterProps} />
            </div>
            <div className="al-drawer-footer">
              <button
                className="al-drawer-apply"
                onClick={() => setDrawerOpen(false)}
              >
                Show {filtered.length} result{filtered.length !== 1 ? "s" : ""}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllListings;
