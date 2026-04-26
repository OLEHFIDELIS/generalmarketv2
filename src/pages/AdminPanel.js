import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import logo from "../assets/gmarketlogo.png";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) => Number(n || 0).toLocaleString();
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-NG", { day:"numeric", month:"short", year:"numeric" }) : "—";

const CATEGORIES = [
  "electronics","property","vehicles","home & furniture","fashion & beauty",
  "hobbies & entertainment","services","garden & outdoor","jobs",
  "agriculture & food","gadgets & accessories","baby & kids","misc & others","adult"
];
const REGIONS = [
  "abia","adamawa","akwa-ibom","anambra","bauchi","bayelsa","benue","borno",
  "cross-river","delta","ebonyi","edo","ekiti","enugu","gombe","imo","jigawa",
  "kaduna","kano","katsina","kebbi","kogi","kwara","lagos","nasarawa","niger",
  "ogun","ondo","osun","oyo","plateau","rivers","sokoto","taraba","yobe","zamfara","fct"
];

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'DM Sans',sans-serif;background:#f1f5f9;color:#1e293b;}

/* Layout */
.ap{display:flex;flex-direction:column;min-height:100vh;}
.ap-nav{display:flex;align-items:center;justify-content:space-between;padding:0 32px;height:72px;background:#0f172a;box-shadow:0 2px 8px rgba(0,0,0,0.3);position:sticky;top:0;z-index:100;}
.ap-nav-logo{height:48px;width:auto;object-fit:contain;background:#1e293b;border-radius:8px;padding:4px 10px;}
.ap-nav-title{font-family:'Syne',sans-serif;font-size:18px;font-weight:800;color:#f97316;}
.ap-nav-badge{background:#f97316;color:white;font-size:11px;font-weight:700;padding:3px 10px;border-radius:999px;}
.ap-body{display:flex;flex:1;}

/* Sidebar */
.ap-sidebar{width:240px;background:#1e293b;min-height:calc(100vh - 72px);display:flex;flex-direction:column;padding:24px 0;position:sticky;top:72px;height:calc(100vh - 72px);overflow-y:auto;}
.ap-sidebar-section{padding:0 16px;margin-bottom:24px;}
.ap-sidebar-label{font-size:10px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:1px;padding:0 8px;margin-bottom:8px;}
.ap-nav-item{display:flex;align-items:center;gap:12px;padding:11px 12px;border-radius:10px;cursor:pointer;font-size:14px;font-weight:500;color:#94a3b8;transition:all 0.15s;margin-bottom:2px;}
.ap-nav-item:hover{background:rgba(255,255,255,0.06);color:#e2e8f0;}
.ap-nav-item.active{background:#f97316;color:white;}
.ap-nav-item .nav-icon{font-size:17px;width:20px;text-align:center;flex-shrink:0;}

/* Main content */
.ap-main{flex:1;padding:28px 32px;overflow-y:auto;}
.ap-page-title{font-family:'Syne',sans-serif;font-size:1.6rem;font-weight:800;color:#0f172a;margin-bottom:24px;}

/* ── Dashboard stats ── */
.stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:28px;min-width:0;}
.stat-card{background:white;border-radius:14px;padding:20px 22px;border:1.5px solid #e2e8f0;display:flex;flex-direction:column;gap:8px;min-width:0;overflow:hidden;}
.stat-card .sc-label{font-size:12px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;}
.stat-card .sc-value{font-family:'Syne',sans-serif;font-size:clamp(1rem,3vw,1.8rem);font-weight:800;color:#0f172a;word-break:break-all;overflow-wrap:anywhere;line-height:1.2;}
.stat-card .sc-sub{font-size:12px;color:#64748b;}
.stat-card .sc-icon{font-size:28px;margin-bottom:4px;}

/* ── Recent listings table ── */
.ap-card{background:white;border-radius:14px;border:1.5px solid #e2e8f0;overflow:hidden;margin-bottom:24px;}
.ap-card-header{display:flex;align-items:center;justify-content:space-between;padding:18px 24px;border-bottom:1px solid #f1f5f9;}
.ap-card-title{font-family:'Syne',sans-serif;font-size:15px;font-weight:700;color:#0f172a;}

/* Category breakdown */
.cat-breakdown{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;padding:20px 24px;}
.cat-item{display:flex;align-items:center;justify-content:space-between;background:#f8fafc;border-radius:8px;padding:10px 14px;}
.cat-item-name{font-size:13px;font-weight:600;color:#334155;text-transform:capitalize;}
.cat-item-count{font-size:13px;font-weight:700;color:#f97316;background:#fff7ed;padding:2px 10px;border-radius:999px;}

/* ── List Products ── */
.lp-toolbar{display:flex;align-items:center;gap:12px;padding:16px 24px;border-bottom:1px solid #f1f5f9;flex-wrap:wrap;}
.lp-search{display:flex;align-items:center;gap:8px;background:#f1f5f9;border:1.5px solid #e2e8f0;border-radius:8px;padding:0 12px;flex:1;min-width:200px;}
.lp-search input{border:none;background:none;outline:none;font-family:'DM Sans',sans-serif;font-size:14px;color:#1e293b;padding:10px 0;width:100%;}
.lp-filter-select{border:1.5px solid #e2e8f0;border-radius:8px;padding:9px 12px;font-family:'DM Sans',sans-serif;font-size:13px;color:#475569;outline:none;background:white;cursor:pointer;}
.lp-count{font-size:13px;color:#64748b;margin-left:auto;white-space:nowrap;}

.lp-table{width:100%;border-collapse:collapse;}
.lp-table th{text-align:left;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;padding:12px 16px;background:#f8fafc;border-bottom:1px solid #e2e8f0;}
.lp-table td{padding:12px 16px;border-bottom:1px solid #f8fafc;font-size:13.5px;vertical-align:middle;}
.lp-table tr:last-child td{border-bottom:none;}
.lp-table tr:hover td{background:#fafafa;}
.lp-thumb{width:52px;height:40px;object-fit:cover;border-radius:6px;background:#f1f5f9;}
.lp-title{font-weight:600;color:#1e293b;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.lp-price{font-weight:700;color:#f97316;}
.lp-badge{display:inline-block;font-size:11px;font-weight:600;padding:3px 8px;border-radius:999px;}
.lp-badge.avail{background:#dcfce7;color:#166534;}
.lp-badge.unavail{background:#fee2e2;color:#991b1b;}
.lp-del-btn{background:none;border:1.5px solid #fee2e2;color:#ef4444;border-radius:6px;padding:5px 10px;cursor:pointer;font-size:12px;font-weight:600;transition:all 0.2s;}
.lp-del-btn:hover{background:#fee2e2;}
.lp-empty{text-align:center;padding:48px;color:#94a3b8;}

/* ── Load more ── */
.lp-load-wrap{display:flex;flex-direction:column;align-items:center;gap:10px;padding:24px;border-top:1px solid #f1f5f9;}
.lp-load-progress{width:100%;max-width:280px;height:4px;background:#e2e8f0;border-radius:999px;overflow:hidden;}
.lp-load-bar{height:100%;background:#f97316;border-radius:999px;transition:width 0.3s;}
.lp-load-label{font-size:12px;color:#94a3b8;}
.lp-load-label strong{color:#475569;}
.lp-load-btn{background:white;border:2px solid #f97316;color:#f97316;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:700;padding:10px 28px;border-radius:8px;cursor:pointer;transition:all 0.2s;}
.lp-load-btn:hover{background:#f97316;color:white;}

/* ── Mobile card layout (replaces table on small screens) ── */
.lp-card-list{display:none;flex-direction:column;gap:10px;padding:16px;}
.lp-card{display:flex;gap:12px;background:white;border-radius:12px;border:1.5px solid #e2e8f0;padding:12px;align-items:flex-start;}
.lp-card-img{width:70px;height:60px;object-fit:cover;border-radius:8px;flex-shrink:0;background:#f1f5f9;}
.lp-card-body{flex:1;min-width:0;}
.lp-card-title{font-size:14px;font-weight:700;color:#1e293b;margin-bottom:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.lp-card-meta{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-bottom:6px;}
.lp-card-price{font-size:14px;font-weight:800;color:#f97316;}
.lp-card-cat{font-size:11px;color:#64748b;background:#f1f5f9;padding:2px 8px;border-radius:999px;text-transform:capitalize;}
.lp-card-actions{display:flex;align-items:center;gap:8px;margin-top:4px;}

@media(max-width:640px){
  .lp-table-wrap{display:none;}
  .lp-card-list{display:flex;}
  .lp-toolbar{padding:12px 16px;gap:8px;}
  .lp-search{min-width:0;}
}

/* ── Add Listing Form ── */
.al-form-wrap{max-width:800px;}
.al-section{background:white;border-radius:14px;border:1.5px solid #e2e8f0;padding:24px;margin-bottom:20px;}
.al-section-title{font-family:'Syne',sans-serif;font-size:15px;font-weight:700;color:#0f172a;margin-bottom:18px;display:flex;align-items:center;gap:8px;}
.al-section-title span{background:#fff7ed;color:#f97316;width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:14px;}
.al-grid-2{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
.al-field{display:flex;flex-direction:column;gap:6px;}
.al-label{font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.4px;}
.al-input{border:1.5px solid #e2e8f0;border-radius:8px;padding:11px 14px;font-family:'DM Sans',sans-serif;font-size:14px;color:#1e293b;outline:none;transition:border-color 0.2s;width:100%;}
.al-input:focus{border-color:#f97316;box-shadow:0 0 0 3px rgba(249,115,22,0.08);}
textarea.al-input{resize:vertical;min-height:100px;}
.al-price-wrap{display:flex;align-items:center;gap:0;border:1.5px solid #e2e8f0;border-radius:8px;overflow:hidden;transition:border-color 0.2s;}
.al-price-wrap:focus-within{border-color:#f97316;}
.al-price-sym{background:#f1f5f9;padding:11px 14px;font-weight:700;color:#64748b;font-size:15px;border-right:1.5px solid #e2e8f0;}
.al-price-wrap input{border:none;outline:none;padding:11px 14px;font-family:'DM Sans',sans-serif;font-size:14px;color:#1e293b;flex:1;}

/* Upload */
.al-upload-zone{border:2px dashed #e2e8f0;border-radius:12px;padding:36px;text-align:center;cursor:pointer;transition:all 0.2s;background:#f8fafc;}
.al-upload-zone:hover,.al-upload-zone.dragover{border-color:#f97316;background:#fff7ed;}
.al-upload-icon{font-size:36px;margin-bottom:10px;}
.al-upload-text{font-size:15px;font-weight:600;color:#475569;margin-bottom:4px;}
.al-upload-sub{font-size:13px;color:#94a3b8;}
.al-upload-zone input{display:none;}
.al-preview{display:flex;flex-wrap:wrap;gap:10px;margin-top:14px;}
.al-preview-item{position:relative;width:90px;height:90px;}
.al-preview-item img{width:100%;height:100%;object-fit:cover;border-radius:8px;border:1.5px solid #e2e8f0;}
.al-preview-remove{position:absolute;top:-6px;right:-6px;background:#ef4444;color:white;border:none;border-radius:50%;width:20px;height:20px;font-size:11px;cursor:pointer;display:flex;align-items:center;justify-content:center;}

/* Submit */
.al-submit{background:linear-gradient(135deg,#f97316,#ea580c);color:white;border:none;border-radius:10px;padding:15px;width:100%;font-family:'DM Sans',sans-serif;font-size:16px;font-weight:700;cursor:pointer;transition:opacity 0.2s;}
.al-submit:hover{opacity:0.88;}
.al-submit:disabled{opacity:0.5;cursor:not-allowed;}
.al-success{background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:10px;padding:16px;text-align:center;color:#166534;font-weight:600;margin-top:12px;}
.al-error{background:#fef2f2;border:1.5px solid #fecaca;border-radius:10px;padding:16px;text-align:center;color:#991b1b;font-weight:600;margin-top:12px;}

@media(max-width:900px){
  .ap-sidebar{display:none;}
  .ap-main{padding:20px 16px 90px;}
  .stats-grid{grid-template-columns:repeat(2,1fr);}
  .cat-breakdown{grid-template-columns:repeat(2,1fr);}
  .al-grid-2{grid-template-columns:1fr;}
  .ap-bottom-nav{display:flex;}
}
@media(max-width:540px){
  .stats-grid{grid-template-columns:1fr 1fr;}
  .lp-count{display:none;}
}

/* ── Hamburger button (mobile only) ── */
.ap-hamburger{display:none;background:none;border:none;cursor:pointer;padding:6px;border-radius:8px;color:#94a3b8;transition:color 0.2s;}
.ap-hamburger:hover{color:white;}
.ap-hamburger span{display:block;width:22px;height:2px;background:currentColor;margin:5px 0;border-radius:2px;transition:all 0.3s;}
.ap-hamburger.open span:nth-child(1){transform:rotate(45deg) translate(5px,5px);}
.ap-hamburger.open span:nth-child(2){opacity:0;}
.ap-hamburger.open span:nth-child(3){transform:rotate(-45deg) translate(5px,-5px);}

/* ── Mobile drawer overlay ── */
.ap-drawer-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:500;animation:fadeIn 0.2s ease;}
.ap-drawer-overlay.open{display:block;}
.ap-drawer{position:fixed;top:0;left:0;bottom:0;width:260px;background:#1e293b;z-index:501;transform:translateX(-100%);transition:transform 0.3s ease;display:flex;flex-direction:column;padding:24px 0;overflow-y:auto;}
.ap-drawer.open{transform:translateX(0);}
.ap-drawer-close{position:absolute;top:16px;right:16px;background:rgba(255,255,255,0.08);border:none;color:#94a3b8;width:32px;height:32px;border-radius:8px;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;}
.ap-drawer-close:hover{color:white;background:rgba(255,255,255,0.15);}
.ap-drawer-logo{height:40px;width:auto;object-fit:contain;background:#0f172a;border-radius:8px;padding:4px 10px;margin:0 16px 24px;}

@keyframes fadeIn{from{opacity:0;}to{opacity:1;}}

@media(max-width:900px){
  .ap-hamburger{display:block;}
}

/* ── Mobile bottom tab bar ── */
.ap-bottom-nav{
  display:none;
  position:fixed;
  bottom:0;left:0;right:0;
  height:68px;
  background:#1e293b;
  border-top:1px solid #334155;
  z-index:200;
  align-items:center;
  justify-content:space-around;
  padding:0 8px;
  box-shadow:0 -4px 20px rgba(0,0,0,0.3);
}
.ap-tab-item{
  display:flex;flex-direction:column;align-items:center;
  gap:4px;cursor:pointer;flex:1;
  padding:8px 4px;border-radius:10px;
  transition:all 0.15s;color:#64748b;
  font-family:'DM Sans',sans-serif;font-size:11px;font-weight:600;
}
.ap-tab-item.active{color:#f97316;}
.ap-tab-item:hover{color:#e2e8f0;}
.ap-tab-icon{font-size:22px;line-height:1;}
.ap-tab-dot{
  width:4px;height:4px;border-radius:50%;
  background:#f97316;margin-top:-2px;
  opacity:0;transition:opacity 0.15s;
}
.ap-tab-item.active .ap-tab-dot{opacity:1;}
`;

// ─── Dashboard ────────────────────────────────────────────────────────────────
const Dashboard = ({ products }) => {
  const total     = products.length;
  const totalVal  = products.reduce((s, p) => s + Number(p.price || 0), 0);
  const available = products.filter(p => p.available).length;
  const today     = new Date().toDateString();
  const todayNew  = products.filter(p => new Date(p.createdAt).toDateString() === today).length;

  // Category breakdown
  const catMap = {};
  products.forEach(p => { const c = p.category || "other"; catMap[c] = (catMap[c] || 0) + 1; });
  const topCats = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 9);

  // Recent 5
  const recent = [...products].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);

  return (
    <>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="sc-icon">📦</div>
          <div className="sc-label">Total Listings</div>
          <div className="sc-value">{fmt(total)}</div>
          <div className="sc-sub">{available} available</div>
        </div>
        <div className="stat-card">
          <div className="sc-icon">💰</div>
          <div className="sc-label">Total Value</div>
          <div className="sc-value">₦{fmt(totalVal)}</div>
          <div className="sc-sub">across all listings</div>
        </div>
        <div className="stat-card">
          <div className="sc-icon">✅</div>
          <div className="sc-label">Available</div>
          <div className="sc-value">{available}</div>
          <div className="sc-sub">{total - available} unavailable</div>
        </div>
        <div className="stat-card">
          <div className="sc-icon">🆕</div>
          <div className="sc-label">Added Today</div>
          <div className="sc-value">{todayNew}</div>
          <div className="sc-sub">new listings today</div>
        </div>
      </div>

      {/* Recent listings */}
      <div className="ap-card">
        <div className="ap-card-header">
          <span className="ap-card-title">Recent Listings</span>
          <span style={{fontSize:12,color:"#94a3b8"}}>Last 5 added</span>
        </div>
        <table className="lp-table">
          <thead>
            <tr>
              <th>Image</th><th>Title</th><th>Price</th><th>Category</th><th>Date</th>
            </tr>
          </thead>
          <tbody>
            {recent.map(p => (
              <tr key={p._id}>
                <td><img className="lp-thumb" src={p.images?.[0] || "/placeholder.jpg"} alt="" onError={e => e.target.src="/placeholder.jpg"} /></td>
                <td><div className="lp-title">{p.title}</div></td>
                <td><span className="lp-price">₦{fmt(p.price)}</span></td>
                <td style={{textTransform:"capitalize",fontSize:12}}>{p.category}</td>
                <td style={{fontSize:12,color:"#94a3b8"}}>{fmtDate(p.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Category breakdown */}
      <div className="ap-card">
        <div className="ap-card-header">
          <span className="ap-card-title">Listings by Category</span>
        </div>
        <div className="cat-breakdown">
          {topCats.map(([cat, count]) => (
            <div key={cat} className="cat-item">
              <span className="cat-item-name">{cat}</span>
              <span className="cat-item-count">{count}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

// ─── List Products ────────────────────────────────────────────────────────────
const PAGE_SIZE_LIST = 15;

const ListProducts = ({ products, onDelete }) => {
  const [search,    setSearch]   = useState("");
  const [catFilter, setCat]      = useState("");
  const [confirm,   setConfirm]  = useState(null);
  const [visible,   setVisible]  = useState(PAGE_SIZE_LIST);

  const filtered = products.filter(p => {
    const ok_s = !search || (p.title || "").toLowerCase().includes(search.toLowerCase());
    const ok_c = !catFilter || p.category === catFilter;
    return ok_s && ok_c;
  });

  // Reset pagination when search/filter changes
  const handleSearch = (val) => { setSearch(val); setVisible(PAGE_SIZE_LIST); };
  const handleCat    = (val) => { setCat(val);    setVisible(PAGE_SIZE_LIST); };

  const shown   = filtered.slice(0, visible);
  const hasMore = visible < filtered.length;

  const handleDelete = async (id) => {
    await fetch("/api/removeproduct", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setConfirm(null);
    onDelete();
  };

  const DeleteBtns = ({ id }) => confirm === id ? (
    <div style={{display:"flex",gap:6}}>
      <button onClick={() => handleDelete(id)} style={{background:"#ef4444",color:"white",border:"none",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:12,fontWeight:600}}>Yes</button>
      <button onClick={() => setConfirm(null)} style={{background:"#f1f5f9",border:"none",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:12}}>No</button>
    </div>
  ) : (
    <button className="lp-del-btn" onClick={() => setConfirm(id)}>Delete</button>
  );

  return (
    <div className="ap-card">
      {/* Toolbar */}
      <div className="lp-toolbar">
        <div className="lp-search">
          <span>🔍</span>
          <input
            placeholder="Search listings..."
            value={search}
            onChange={e => handleSearch(e.target.value)}
          />
          {search && <button onClick={() => handleSearch("")} style={{background:"none",border:"none",cursor:"pointer",color:"#94a3b8"}}>✕</button>}
        </div>
        <select className="lp-filter-select" value={catFilter} onChange={e => handleCat(e.target.value)}>
          <option value="">All categories</option>
          {CATEGORIES.map(c => <option key={c} value={c} style={{textTransform:"capitalize"}}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
        </select>
        <span className="lp-count"><strong>{filtered.length}</strong> listing{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {filtered.length === 0 ? (
        <div className="lp-empty">
          <div style={{fontSize:36,marginBottom:12}}>📭</div>
          <div style={{fontWeight:600,color:"#475569"}}>No listings found</div>
        </div>
      ) : (
        <>
          {/* ── Desktop table ── */}
          <div className="lp-table-wrap" style={{overflowX:"auto"}}>
            <table className="lp-table">
              <thead>
                <tr>
                  <th>Image</th><th>Title</th><th>Price</th>
                  <th>Category</th><th>Status</th><th>Date</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {shown.map(p => (
                  <tr key={p._id}>
                    <td><img className="lp-thumb" src={p.images?.[0]||"/placeholder.jpg"} alt={p.title} onError={e=>e.target.src="/placeholder.jpg"} /></td>
                    <td><div className="lp-title" title={p.title}>{p.title}</div></td>
                    <td><span className="lp-price">₦{fmt(p.price)}</span></td>
                    <td style={{textTransform:"capitalize",fontSize:12,color:"#64748b"}}>{p.category}</td>
                    <td><span className={`lp-badge ${p.available?"avail":"unavail"}`}>{p.available?"Active":"Inactive"}</span></td>
                    <td style={{fontSize:12,color:"#94a3b8"}}>{fmtDate(p.createdAt)}</td>
                    <td><DeleteBtns id={p._id} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Mobile card list ── */}
          <div className="lp-card-list">
            {shown.map(p => (
              <div key={p._id} className="lp-card">
                <img className="lp-card-img" src={p.images?.[0]||"/placeholder.jpg"} alt={p.title} onError={e=>e.target.src="/placeholder.jpg"} />
                <div className="lp-card-body">
                  <div className="lp-card-title" title={p.title}>{p.title}</div>
                  <div className="lp-card-meta">
                    <span className="lp-card-price">₦{fmt(p.price)}</span>
                    <span className="lp-card-cat">{p.category}</span>
                    <span className={`lp-badge ${p.available?"avail":"unavail"}`}>{p.available?"Active":"Inactive"}</span>
                  </div>
                  <div className="lp-card-actions">
                    <DeleteBtns id={p._id} />
                    <span style={{fontSize:11,color:"#94a3b8",marginLeft:"auto"}}>{fmtDate(p.createdAt)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Load more ── */}
          {hasMore && (
            <div className="lp-load-wrap">
              <div className="lp-load-progress">
                <div className="lp-load-bar" style={{width:`${(visible/filtered.length)*100}%`}} />
              </div>
              <p className="lp-load-label">Showing <strong>{shown.length}</strong> of <strong>{filtered.length}</strong></p>
              <button className="lp-load-btn" onClick={() => setVisible(v => v + PAGE_SIZE_LIST)}>
                Load more →
              </button>
            </div>
          )}
          {!hasMore && filtered.length > PAGE_SIZE_LIST && (
            <div style={{textAlign:"center",padding:16,fontSize:13,color:"#94a3b8",borderTop:"1px solid #f1f5f9"}}>
              ✅ All <strong>{filtered.length}</strong> listings shown
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ─── Add Listing ──────────────────────────────────────────────────────────────
const AddListing = () => {
  const empty = { category:"", title:"", description:"", price:"", transaction:"", condition:"", region:"", city:"", address:"", zip:"", phone:"", email:"" };
  const [form,      setForm]      = useState(empty);
  const [images,    setImages]    = useState([]);
  const [previews,  setPreviews]  = useState([]);
  const [status,    setStatus]    = useState(null); // null | "loading" | "success" | "error"
  const [dragging,  setDragging]  = useState(false);

  const handleChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const addImages = (files) => {
    const arr = Array.from(files).slice(0, 12 - images.length);
    setImages(p => [...p, ...arr]);
    setPreviews(p => [...p, ...arr.map(f => URL.createObjectURL(f))]);
  };

  const removeImage = (i) => {
    setImages(p => p.filter((_, idx) => idx !== i));
    setPreviews(p => p.filter((_, idx) => idx !== i));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!images.length) { setStatus("error"); return; }
    setStatus("loading");
    try {
      const fd = new FormData();
      images.forEach(img => fd.append("images", img));
      const { data: uploadData } = await axios.post("/api/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      const urls = uploadData.urls || uploadData;
      await axios.post("/api/addproduct", { ...form, images: urls });
      setStatus("success");
      setForm(empty);
      setImages([]);
      setPreviews([]);
      setTimeout(() => setStatus(null), 4000);
    } catch {
      setStatus("error");
      setTimeout(() => setStatus(null), 4000);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="al-form-wrap">

      {/* Photos */}
      <div className="al-section">
        <div className="al-section-title"><span>📷</span> Photos</div>
        <div
          className={`al-upload-zone ${dragging ? "dragover" : ""}`}
          onClick={() => document.getElementById("al-file").click()}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); addImages(e.dataTransfer.files); }}
        >
          <input id="al-file" type="file" multiple accept="image/*" onChange={e => addImages(e.target.files)} />
          <div className="al-upload-icon">📤</div>
          <div className="al-upload-text">Click or drag images here</div>
          <div className="al-upload-sub">Up to 12 images · JPG, PNG, GIF</div>
        </div>
        {previews.length > 0 && (
          <div className="al-preview">
            {previews.map((src, i) => (
              <div key={i} className="al-preview-item">
                <img src={src} alt={`preview-${i}`} />
                <button type="button" className="al-preview-remove" onClick={() => removeImage(i)}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* About */}
      <div className="al-section">
        <div className="al-section-title"><span>📝</span> About the Item</div>
        <div className="al-field" style={{marginBottom:14}}>
          <label className="al-label">Category *</label>
          <select name="category" className="al-input" value={form.category} onChange={handleChange} required>
            <option value="">Select category</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
          </select>
        </div>
        <div className="al-field" style={{marginBottom:14}}>
          <label className="al-label">Title *</label>
          <input name="title" className="al-input" placeholder="e.g. iPhone 14 Pro 256GB" value={form.title} onChange={handleChange} required />
        </div>
        <div className="al-field">
          <label className="al-label">Description *</label>
          <textarea name="description" className="al-input" placeholder="Describe your item — condition, specs, reason for selling..." value={form.description} onChange={handleChange} required rows={4} />
        </div>
      </div>

      {/* Pricing */}
      <div className="al-section">
        <div className="al-section-title"><span>💰</span> Pricing & Status</div>
        <div className="al-field" style={{marginBottom:14}}>
          <label className="al-label">Price (₦) *</label>
          <div className="al-price-wrap">
            <span className="al-price-sym">₦</span>
            <input name="price" type="number" placeholder="0" value={form.price} onChange={handleChange} required />
          </div>
        </div>
        <div className="al-grid-2">
          <div className="al-field">
            <label className="al-label">Transaction</label>
            <select name="transaction" className="al-input" value={form.transaction} onChange={handleChange}>
              <option value="">Any</option>
              {["sell","buy","rent","exchange"].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
            </select>
          </div>
          <div className="al-field">
            <label className="al-label">Condition</label>
            <select name="condition" className="al-input" value={form.condition} onChange={handleChange}>
              <option value="">Any</option>
              <option value="new">New</option>
              <option value="used">Used</option>
            </select>
          </div>
        </div>
      </div>

      {/* Location */}
      <div className="al-section">
        <div className="al-section-title"><span>📍</span> Location</div>
        <div className="al-grid-2" style={{marginBottom:14}}>
          <div className="al-field">
            <label className="al-label">State / Region</label>
            <select name="region" className="al-input" value={form.region} onChange={handleChange}>
              <option value="">Select state</option>
              {REGIONS.map(r => <option key={r} value={r}>{r === "fct" ? "Abuja (FCT)" : r.charAt(0).toUpperCase()+r.slice(1)}</option>)}
            </select>
          </div>
          <div className="al-field">
            <label className="al-label">City</label>
            <input name="city" className="al-input" placeholder="e.g. Enugu" value={form.city} onChange={handleChange} />
          </div>
        </div>
        <div className="al-grid-2">
          <div className="al-field">
            <label className="al-label">Address</label>
            <input name="address" className="al-input" placeholder="Street address" value={form.address} onChange={handleChange} />
          </div>
          <div className="al-field">
            <label className="al-label">ZIP / Postcode</label>
            <input name="zip" className="al-input" placeholder="Optional" value={form.zip} onChange={handleChange} />
          </div>
        </div>
      </div>

      {/* Seller */}
      <div className="al-section">
        <div className="al-section-title"><span>👤</span> Seller Details</div>
        <div className="al-grid-2">
          <div className="al-field">
            <label className="al-label">Phone Number</label>
            <input name="phone" className="al-input" placeholder="+234..." value={form.phone} onChange={handleChange} />
          </div>
          <div className="al-field">
            <label className="al-label">Email Address *</label>
            <input name="email" type="email" className="al-input" placeholder="seller@email.com" value={form.email} onChange={handleChange} required />
          </div>
        </div>
      </div>

      <button type="submit" className="al-submit" disabled={status === "loading"}>
        {status === "loading" ? "⏳ Uploading & submitting..." : "✅ Submit Listing"}
      </button>

      {status === "success" && <div className="al-success">🎉 Listing submitted successfully!</div>}
      {status === "error"   && <div className="al-error">❌ {images.length === 0 ? "Please add at least one image." : "Something went wrong. Please try again."}</div>}
    </form>
  );
};

// ─── AdminPanel (main) ────────────────────────────────────────────────────────
const AdminPanel = () => {
  const [page,     setPage]     = useState("dashboard");
  const [products, setProducts] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fetchProducts = useCallback(async () => {
    try {
      const res  = await fetch("/api/allproduct");
      const data = await res.json();
      setProducts(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const navItems = [
    { id: "dashboard", icon: "📊", label: "Dashboard"    },
    { id: "add",       icon: "➕", label: "Add Listing"  },
    { id: "list",      icon: "📋", label: "All Listings" },
  ];

  const pageTitle = {
    dashboard: "Dashboard",
    add:       "Add New Listing",
    list:      `All Listings (${products.length})`,
  };

  return (
    <>
      <style>{S}</style>
      <div className="ap">
        {/* Navbar */}
        <nav className="ap-nav">
          <button
            className={`ap-hamburger ${sidebarOpen ? "open" : ""}`}
            onClick={() => setSidebarOpen(o => !o)}
            aria-label="Toggle menu"
          >
            <span/><span/><span/>
          </button>
          <span className="ap-nav-badge">Admin</span>
        </nav>

        {/* ── Mobile sidebar drawer ── */}
        <div className={`ap-drawer-overlay ${sidebarOpen ? "open" : ""}`} onClick={() => setSidebarOpen(false)} />
        <aside className={`ap-drawer ${sidebarOpen ? "open" : ""}`}>
          <button className="ap-drawer-close" onClick={() => setSidebarOpen(false)}>✕</button>
          <img src={logo} alt="GeneralMarket" className="ap-drawer-logo" />
          <div className="ap-sidebar-section">
            <div className="ap-sidebar-label">Menu</div>
            {navItems.map(item => (
              <div
                key={item.id}
                className={`ap-nav-item ${page === item.id ? "active" : ""}`}
                onClick={() => { setPage(item.id); setSidebarOpen(false); }}
              >
                <span className="nav-icon">{item.icon}</span>
                {item.label}
              </div>
            ))}
          </div>
          <div className="ap-sidebar-section" style={{marginTop:"auto",paddingTop:24}}>
            <div className="ap-sidebar-label">Quick Stats</div>
            <div style={{padding:"12px",background:"rgba(255,255,255,0.05)",borderRadius:10,color:"#94a3b8",fontSize:13}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                <span>Total</span><span style={{color:"#f1f5f9",fontWeight:700}}>{products.length}</span>
              </div>
              <div style={{display:"flex",justifyContent:"space-between"}}>
                <span>Active</span>
                <span style={{color:"#4ade80",fontWeight:700}}>{products.filter(p=>p.available).length}</span>
              </div>
            </div>
          </div>
        </aside>

        <div className="ap-body">
          {/* Sidebar */}
          <aside className="ap-sidebar">
            <div className="ap-sidebar-section">
              <div className="ap-sidebar-label">Menu</div>
              {navItems.map(item => (
                <div
                  key={item.id}
                  className={`ap-nav-item ${page === item.id ? "active" : ""}`}
                  onClick={() => setPage(item.id)}
                >
                  <span className="nav-icon">{item.icon}</span>
                  {item.label}
                </div>
              ))}
            </div>

            <div className="ap-sidebar-section" style={{marginTop:"auto",paddingTop:24}}>
              <div className="ap-sidebar-label">Quick Stats</div>
              <div style={{padding:"12px",background:"rgba(255,255,255,0.05)",borderRadius:10,color:"#94a3b8",fontSize:13}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                  <span>Total</span><span style={{color:"#f1f5f9",fontWeight:700}}>{products.length}</span>
                </div>
                <div style={{display:"flex",justifyContent:"space-between"}}>
                  <span>Active</span>
                  <span style={{color:"#4ade80",fontWeight:700}}>{products.filter(p=>p.available).length}</span>
                </div>
              </div>
            </div>
          </aside>

          {/* Main */}
          <main className="ap-main">
            <div className="ap-page-title">{pageTitle[page]}</div>

            {loading ? (
              <div style={{textAlign:"center",padding:60,color:"#94a3b8",fontSize:18}}>Loading...</div>
            ) : (
              <>
                {page === "dashboard" && <Dashboard products={products} />}
                {page === "add"       && <AddListing />}
                {page === "list"      && <ListProducts products={products} onDelete={fetchProducts} />}
              </>
            )}
          </main>
        </div>

        {/* ── Mobile bottom tab bar ── */}
        <nav className="ap-bottom-nav">
          {navItems.map(item => (
            <div
              key={item.id}
              className={`ap-tab-item ${page === item.id ? "active" : ""}`}
              onClick={() => setPage(item.id)}
            >
              <span className="ap-tab-icon">{item.icon}</span>
              <span>{item.label}</span>
              <div className="ap-tab-dot" />
            </div>
          ))}
        </nav>
      </div>
    </>
  );
};

export default AdminPanel;