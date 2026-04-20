import React, { useContext, useState, useEffect, useRef } from "react";
import "./AllListings.css";
import { ShopContext } from "../context/ShopContext";
import Item from "../components/Item";
import {
  FaSearch, FaFilter, FaTimes, FaChevronDown,
  FaChevronUp, FaTh, FaList, FaSlidersH
} from "react-icons/fa";
import { useLocation } from "react-router-dom";

const CATEGORIES = [
  "Electronics", "Property", "Vehicles", "Home & Furniture",
  "Fashion & Beauty", "Hobbies & Entertainment", "Services",
  "Garden & Outdoor", "Jobs", "Agriculture & Food",
  "Gadgets & Accessories", "Baby & Kids", "Misc & Others", "Adult"
];

const REGIONS = [
  "Abia","Adamawa","Akwa-Ibom","Anambra","Bauchi","Bayelsa","Benue",
  "Borno","Cross-River","Delta","Ebonyi","Edo","Ekiti","Enugu","Gombe",
  "Imo","Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara",
  "Lagos","Nasarawa","Niger","Ogun","Ondo","Osun","Oyo","Plateau",
  "Rivers","Sokoto","Taraba","Yobe","Zamfara","Abuja (FCT)"
];

const CONDITIONS = ["New", "Used"];
const TRANSACTIONS = ["Sell", "Buy", "Rent", "Exchange"];
const SORT_OPTIONS = [
  { label: "Newest first", value: "newest" },
  { label: "Oldest first", value: "oldest" },
  { label: "Price: Low to High", value: "price_asc" },
  { label: "Price: High to Low", value: "price_desc" },
];

const useQuery = () => new URLSearchParams(useLocation().search);

const AllListings = () => {
  const { all_product } = useContext(ShopContext);
  const queryParam = useQuery().get("q") || "";
  const [search, setSearch] = useState(queryParam);
  const [inputVal, setInputVal] = useState(queryParam);
  const [selectedCats, setSelectedCats] = useState([]);
  const [selectedRegions, setSelectedRegions] = useState([]);
  const [selectedConditions, setSelectedConditions] = useState([]);
  const [selectedTx, setSelectedTx] = useState([]);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sort, setSort] = useState("newest");
  const [view, setView] = useState("grid");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [openSections, setOpenSections] = useState({
    category: true, region: true, price: true, condition: true, transaction: true
  });

  const toggleSection = (s) => setOpenSections(p => ({ ...p, [s]: !p[s] }));

  const toggleItem = (list, setList, val) =>
    setList(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);

  const activeFilterCount = selectedCats.length + selectedRegions.length +
    selectedConditions.length + selectedTx.length +
    (minPrice ? 1 : 0) + (maxPrice ? 1 : 0);

  const clearAll = () => {
    setSelectedCats([]); setSelectedRegions([]); setSelectedConditions([]);
    setSelectedTx([]); setMinPrice(""); setMaxPrice(""); setSearch(""); setInputVal("");
  };

  const filtered = (all_product || [])
    .filter(p => {
      const q = search.toLowerCase();
      const matchSearch = !q ||
        (p.title || "").toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q) ||
        (p.category || "").toLowerCase().includes(q) ||
        (p.city || "").toLowerCase().includes(q) ||
        (p.region || "").toLowerCase().includes(q);
      const matchCat = !selectedCats.length || selectedCats.includes(p.category);
      const matchRegion = !selectedRegions.length ||
        selectedRegions.some(r => (p.region || "").toLowerCase().includes(r.toLowerCase()));
      const matchCond = !selectedConditions.length || selectedConditions.includes(p.condition);
      const matchTx = !selectedTx.length || selectedTx.includes(p.transaction);
      const matchMin = !minPrice || p.price >= Number(minPrice);
      const matchMax = !maxPrice || p.price <= Number(maxPrice);
      return matchSearch && matchCat && matchRegion && matchCond && matchTx && matchMin && matchMax;
    })
    .sort((a, b) => {
      if (sort === "newest") return new Date(b.createdAt) - new Date(a.createdAt);
      if (sort === "oldest") return new Date(a.createdAt) - new Date(b.createdAt);
      if (sort === "price_asc") return a.price - b.price;
      if (sort === "price_desc") return b.price - a.price;
      return 0;
    });

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(inputVal);
  };

  const FiltersPanel = () => (
    <div className="filters-panel">
      <div className="fp-header">
        <span className="fp-title"><FaSlidersH /> Filters</span>
        {activeFilterCount > 0 && (
          <button className="fp-clear" onClick={clearAll}>Clear all ({activeFilterCount})</button>
        )}
      </div>

      {/* Category */}
      <div className="fp-section">
        <button className="fp-section-title" onClick={() => toggleSection("category")}>
          Category {openSections.category ? <FaChevronUp /> : <FaChevronDown />}
        </button>
        {openSections.category && (
          <div className="fp-checkboxes">
            {CATEGORIES.map(c => (
              <label key={c} className={`fp-check-label ${selectedCats.includes(c) ? "active" : ""}`}>
                <input type="checkbox" checked={selectedCats.includes(c)}
                  onChange={() => toggleItem(selectedCats, setSelectedCats, c)} />
                {c}
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Price */}
      <div className="fp-section">
        <button className="fp-section-title" onClick={() => toggleSection("price")}>
          Price Range {openSections.price ? <FaChevronUp /> : <FaChevronDown />}
        </button>
        {openSections.price && (
          <div className="fp-price-row">
            <input type="number" placeholder="Min ₦" value={minPrice}
              onChange={e => setMinPrice(e.target.value)} className="fp-price-input" />
            <span className="fp-price-sep">—</span>
            <input type="number" placeholder="Max ₦" value={maxPrice}
              onChange={e => setMaxPrice(e.target.value)} className="fp-price-input" />
          </div>
        )}
      </div>

      {/* Condition */}
      <div className="fp-section">
        <button className="fp-section-title" onClick={() => toggleSection("condition")}>
          Condition {openSections.condition ? <FaChevronUp /> : <FaChevronDown />}
        </button>
        {openSections.condition && (
          <div className="fp-pills">
            {CONDITIONS.map(c => (
              <button key={c}
                className={`fp-pill ${selectedConditions.includes(c) ? "active" : ""}`}
                onClick={() => toggleItem(selectedConditions, setSelectedConditions, c)}>
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Transaction */}
      <div className="fp-section">
        <button className="fp-section-title" onClick={() => toggleSection("transaction")}>
          Transaction {openSections.transaction ? <FaChevronUp /> : <FaChevronDown />}
        </button>
        {openSections.transaction && (
          <div className="fp-pills">
            {TRANSACTIONS.map(t => (
              <button key={t}
                className={`fp-pill ${selectedTx.includes(t) ? "active" : ""}`}
                onClick={() => toggleItem(selectedTx, setSelectedTx, t)}>
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Region */}
      <div className="fp-section">
        <button className="fp-section-title" onClick={() => toggleSection("region")}>
          Location {openSections.region ? <FaChevronUp /> : <FaChevronDown />}
        </button>
        {openSections.region && (
          <div className="fp-checkboxes scrollable">
            {REGIONS.map(r => (
              <label key={r} className={`fp-check-label ${selectedRegions.includes(r) ? "active" : ""}`}>
                <input type="checkbox" checked={selectedRegions.includes(r)}
                  onChange={() => toggleItem(selectedRegions, setSelectedRegions, r)} />
                {r}
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="al-wrapper">

      {/* ── Search bar ── */}
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
            <button type="submit">Search</button>
          </form>
        </div>
      </div>

      <div className="al-body">

        {/* ── Desktop sidebar ── */}
        <aside className="al-sidebar">
          <FiltersPanel />
        </aside>

        {/* ── Results ── */}
        <main className="al-main">

          {/* toolbar */}
          <div className="al-toolbar">
            <div className="al-toolbar-left">
              <span className="al-count">
                <strong>{filtered.length}</strong> listing{filtered.length !== 1 ? "s" : ""} found
                {search && <span className="al-search-term"> for "<em>{search}</em>"</span>}
              </span>

              {/* Active filter chips */}
              <div className="al-chips">
                {selectedCats.map(c => (
                  <span key={c} className="al-chip">
                    {c} <button onClick={() => toggleItem(selectedCats, setSelectedCats, c)}><FaTimes /></button>
                  </span>
                ))}
                {selectedConditions.map(c => (
                  <span key={c} className="al-chip">
                    {c} <button onClick={() => toggleItem(selectedConditions, setSelectedConditions, c)}><FaTimes /></button>
                  </span>
                ))}
                {selectedTx.map(t => (
                  <span key={t} className="al-chip">
                    {t} <button onClick={() => toggleItem(selectedTx, setSelectedTx, t)}><FaTimes /></button>
                  </span>
                ))}
                {(minPrice || maxPrice) && (
                  <span className="al-chip">
                    ₦{minPrice || "0"} – ₦{maxPrice || "∞"}
                    <button onClick={() => { setMinPrice(""); setMaxPrice(""); }}><FaTimes /></button>
                  </span>
                )}
              </div>
            </div>

            <div className="al-toolbar-right">
              {/* Mobile filter btn */}
              <button className="al-filter-btn" onClick={() => setDrawerOpen(true)}>
                <FaFilter /> Filters {activeFilterCount > 0 && <span className="filter-badge">{activeFilterCount}</span>}
              </button>

              {/* Sort */}
              <select className="al-sort" value={sort} onChange={e => setSort(e.target.value)}>
                {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>

              {/* View toggle */}
              <div className="al-view-toggle">
                <button className={view === "grid" ? "active" : ""} onClick={() => setView("grid")}><FaTh /></button>
                <button className={view === "list" ? "active" : ""} onClick={() => setView("list")}><FaList /></button>
              </div>
            </div>
          </div>

          {/* Results grid / list */}
          {filtered.length === 0 ? (
            <div className="al-empty">
              <div className="al-empty-icon">🔍</div>
              <h3>No listings found</h3>
              <p>Try adjusting your search or filters</p>
              <button className="al-empty-clear" onClick={clearAll}>Clear all filters</button>
            </div>
          ) : (
            <div className={`al-results ${view === "list" ? "list-view" : "grid-view"}`}>
              {filtered.map((item) => (
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
          )}
        </main>
      </div>

      {/* ── Mobile filter drawer ── */}
      {drawerOpen && (
        <div className="al-drawer-overlay" onClick={() => setDrawerOpen(false)}>
          <div className="al-drawer" onClick={e => e.stopPropagation()}>
            <div className="al-drawer-header">
              <span>Filters</span>
              <button onClick={() => setDrawerOpen(false)}><FaTimes /></button>
            </div>
            <div className="al-drawer-body">
              <FiltersPanel />
            </div>
            <div className="al-drawer-footer">
              <button className="al-drawer-apply" onClick={() => setDrawerOpen(false)}>
                Show {filtered.length} results
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllListings;
