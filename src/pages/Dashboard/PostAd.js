import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { FaArrowLeft, FaArrowRight, FaCheckCircle, FaStar, FaTimes } from "react-icons/fa";
import "./PostAd.css";
import { api } from "../../api";
import { useAuth } from "../../context/AuthContext";
import { REGIONS, regionLabel } from "../../data/regions";
import { CITIES } from "../../data/cities";
import { PageHead, Spinner } from "../../components/dash/ui";

const MAX_IMAGES = 12;
const OTHER = "__other";
const slug = (s) => String(s || "").toLowerCase().trim().replace(/\s+/g, "-");

// The category tree + per-category rules come from the server (lib/categories.js), so form and validation never drift apart.
let catCache = null;
const loadCategories = () => (catCache ||= api("/categories").catch((e) => { catCache = null; throw e; }));

const walkNodes = (tree, path) => {
  let nodes = tree, node = null;
  for (const label of path) {
    node = (nodes || []).find((n) => n.label === label);
    if (!node) return null;
    nodes = node.children;
  }
  return node;
};

const blankForm = (user) => ({
  title: "", description: "", priceType: "fixed", price: "", transaction: "sell", condition: "",
  region: slug(user?.location?.state), city: user?.location?.city || "", address: "",
  phone: user?.phone || "", showPhone: true, showEmail: false,
});

// Create (/dashboard/post) and edit (/dashboard/post/:id) a listing
export default function PostAd() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { reloadDash } = useOutletContext() || {};
  const topRef = useRef(null);

  const [cats, setCats] = useState(null);
  const [path, setPath] = useState([]);
  const [attrs, setAttrs] = useState({});
  const [form, setForm] = useState(() => blankForm(user));
  const [otherCity, setOtherCity] = useState(() => {
    const f = blankForm(user);
    return !!f.city && !(CITIES[f.region] || []).includes(f.city);
  });
  const [images, setImages] = useState([]);
  const [dragFrom, setDragFrom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState([]);
  const [done, setDone] = useState(null);

  // ── Load category rules (and the listing when editing) ──
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [c, mine] = await Promise.all([loadCategories(), id ? api(`/me/listings/${id}`) : null]);
        if (!alive) return;
        setCats(c);
        if (mine) {
          const l = mine.listing;
          const top = c.tree.find((t) => t.label.toLowerCase() === String(l.category || "").toLowerCase());
          setPath(l.categoryPath?.length ? l.categoryPath : top ? [top.label] : []);
          setAttrs(Object.fromEntries((l.attributes || []).map((a) => [a.key, a.value])));
          setImages(l.images || []);
          setOtherCity(!!l.city && !(CITIES[l.region] || []).includes(l.city));
          setForm({
            title: l.title || "", description: l.description || "", priceType: l.priceType || "fixed",
            price: l.priceType && l.priceType !== "fixed" ? "" : String(l.price ?? ""),
            transaction: l.transaction || "", condition: l.condition || "",
            region: l.region || "", city: l.city || "", address: l.address || "",
            phone: l.phone || "", showPhone: l.showPhone !== false, showEmail: l.showEmail !== false, // legacy ads (unset) were showing both
          });
        }
      } catch (e) {
        if (alive) setErrors([e.message || "Couldn't load the form. Please refresh."]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id]);

  // ── Derived category state ──
  const levels = useMemo(() => {
    if (!cats) return [];
    const out = [];
    let nodes = cats.tree;
    for (let i = 0; nodes; i++) {
      out.push({ nodes, value: path[i] || "" });
      const sel = nodes.find((n) => n.label === path[i]);
      nodes = sel && sel.children ? sel.children : null;
    }
    return out;
  }, [cats, path]);

  const leaf = useMemo(() => {
    if (!cats || !path.length) return null;
    const n = walkNodes(cats.tree, path);
    return n && !n.children ? n : null;
  }, [cats, path]);
  const spec = leaf ? cats.specs[leaf.s] : null;

  // When the category changes: keep answers for fields that still exist, drop hidden controls
  useEffect(() => {
    if (!spec) return;
    const keys = new Set(spec.fields.map((f) => f.key));
    setAttrs((a) => Object.fromEntries(Object.entries(a).filter(([k]) => keys.has(k))));
    setForm((f) => ({
      ...f,
      condition: spec.hide.includes("condition") ? "" : f.condition,
      transaction: spec.hide.includes("transaction") ? "" : f.transaction || "sell",
    }));
  }, [spec]);

  const pickLevel = (i, label) => { setPath(label ? [...path.slice(0, i), label] : path.slice(0, i)); setErrors([]); };
  const set = (e) => { const { name, value } = e.target; setForm((f) => ({ ...f, [name]: value })); setErrors([]); };
  const setAttr = (key, value) => { setAttrs((a) => ({ ...a, [key]: value })); setErrors([]); };
  const setRegion = (e) => { setForm((f) => ({ ...f, region: e.target.value, city: "" })); setOtherCity(false); };
  const setCitySel = (e) => {
    if (e.target.value === OTHER) { setOtherCity(true); setForm((f) => ({ ...f, city: "" })); }
    else { setOtherCity(false); setForm((f) => ({ ...f, city: e.target.value })); }
  };

  // ── Photos ──
  const pick = async (e) => {
    const files = Array.from(e.target.files || []).slice(0, MAX_IMAGES - images.length);
    e.target.value = "";
    if (!files.length) return;
    const bad = files.find((f) => !/^image\/(jpe?g|png|gif|webp)$/i.test(f.type) || f.size > 8 * 1024 * 1024);
    if (bad) return setErrors(["Photos must be JPG, PNG, GIF or WebP and under 8 MB each."]);
    setUploading(true); setErrors([]);
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append("images", f));
      const { urls } = await api("/me/upload", { method: "POST", form: fd });
      setImages((prev) => [...prev, ...urls].slice(0, MAX_IMAGES));
    } catch (er) { setErrors([er.message]); }
    finally { setUploading(false); }
  };
  const move = (from, to) => {
    if (from == null || to < 0 || to >= images.length || from === to) return;
    setImages((arr) => { const c = [...arr]; const [x] = c.splice(from, 1); c.splice(to, 0, x); return c; });
  };

  // ── Validate + submit ──
  const validate = () => {
    const e = [];
    if (!leaf) e.push("Category: choose a category, then keep choosing until there are no more options.");
    if (form.title.trim().length < 5) e.push("Title: enter at least 5 characters.");
    if (form.description.trim().length < 10) e.push("Description: enter at least 10 characters.");
    if (!images.length) e.push("Photos: upload at least 1 picture.");
    if (form.priceType === "fixed" && !(Number(form.price) > 0)) e.push("Price: enter a price, or choose “Item for free” / “Contact for price”.");
    for (const f of spec?.fields || []) if (f.required && !String(attrs[f.key] ?? "").trim()) e.push(`${f.label}: this field is required.`);
    if (form.phone.trim() && form.phone.replace(/\D/g, "").length < 7) e.push("Phone: enter a valid phone number.");
    return e;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    const e = validate();
    if (e.length) { setErrors(e); topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
    setSaving(true); setErrors([]);
    try {
      const body = {
        categoryPath: path, attributes: attrs,
        title: form.title.trim(), description: form.description.trim(),
        priceType: form.priceType, price: form.priceType === "fixed" ? Number(form.price) : 0,
        transaction: form.transaction, condition: form.condition,
        region: form.region, city: form.city.trim(), address: form.address.trim(),
        phone: form.phone.trim(), email: user?.email || "", showPhone: form.showPhone, showEmail: form.showEmail,
        images,
      };
      const res = id
        ? await api(`/me/listings/${id}`, { method: "PUT", body })
        : await api("/me/listings", { method: "POST", body });
      reloadDash && reloadDash();
      setDone({ review: res.needsReview, id: res.listing._id });
    } catch (er) {
      setErrors([er.message]);
      topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } finally { setSaving(false); }
  };

  if (loading) return <Spinner />;

  if (done) {
    return (
      <div className="dx-panel" style={{ textAlign: "center", padding: 40 }}>
        <div style={{ fontSize: 44 }}>{done.review ? "⏳" : "🎉"}</div>
        <h3 style={{ fontSize: 18 }}>{id ? "Ad updated" : "Ad posted!"}</h3>
        <p className="dx-hint" style={{ marginBottom: 18 }}>
          {done.review ? "Your ad is waiting for review and will show up in search once approved." : "Your ad is live and visible in search."}
        </p>
        <div className="dx-actions" style={{ justifyContent: "center" }}>
          {!done.review && <button className="dx-btn dx-btn-ghost" onClick={() => navigate(`/product/${done.id}`)}>View ad</button>}
          <button className="dx-btn dx-btn-primary" onClick={() => navigate("/dashboard/items")}>My ads</button>
        </div>
      </div>
    );
  }

  const cities = CITIES[form.region] || [];
  const showTransaction = spec && !spec.hide.includes("transaction");
  const showCondition = spec && !spec.hide.includes("condition");

  return (
    <form onSubmit={submit} noValidate>
      <span ref={topRef} />
      <PageHead title={id ? "Edit ad" : "Post an ad"} sub="Clear photos and an honest description sell faster" />

      {errors.length > 0 && (
        <div className="dx-alert dx-alert-error pa-errors" role="alert">
          <strong>{errors.length === 1 ? "Please fix this:" : "Please fix these:"}</strong>
          <ul>{errors.map((m) => <li key={m}>{m}</li>)}</ul>
        </div>
      )}

      {/* ── Photos ── */}
      <div className="dx-panel">
        <h3>Photos</h3>
        <p className="dx-hint" style={{ marginBottom: 10 }}>Up to {MAX_IMAGES} pictures. The first photo is the cover — drag photos or use the arrows to reorder.</p>
        <label className="dx-drop">
          <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" multiple onChange={pick} disabled={uploading || images.length >= MAX_IMAGES} />
          {uploading ? "Uploading…" : images.length >= MAX_IMAGES ? "Maximum photos reached" : `📷 Tap to add photos (${images.length}/${MAX_IMAGES})`}
        </label>
        {images.length > 0 && (
          <div className="pa-photos">
            {images.map((u, i) => (
              <div
                key={u} className={`pa-photo${dragFrom === i ? " dragging" : ""}`} draggable
                onDragStart={() => setDragFrom(i)} onDragOver={(e) => e.preventDefault()}
                onDrop={() => { move(dragFrom, i); setDragFrom(null); }} onDragEnd={() => setDragFrom(null)}
              >
                <img src={u} alt={`Upload ${i + 1}`} draggable={false} />
                {i === 0 && <span className="pa-cover">Cover</span>}
                <button type="button" className="pa-x" onClick={() => setImages(images.filter((x) => x !== u))} aria-label="Remove photo"><FaTimes /></button>
                <div className="pa-photo-ctl">
                  <button type="button" onClick={() => move(i, i - 1)} disabled={i === 0} aria-label="Move left"><FaArrowLeft /></button>
                  {i > 0 && <button type="button" onClick={() => move(i, 0)} aria-label="Make cover" title="Make cover"><FaStar /></button>}
                  <button type="button" onClick={() => move(i, i + 1)} disabled={i === images.length - 1} aria-label="Move right"><FaArrowRight /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── About the item ── */}
      <div className="dx-panel">
        <h3>About the item</h3>

        <div className="dx-field">
          <label htmlFor="cat-0">Category <span className="pa-req">*</span></label>
          <div className="pa-cats">
            {levels.map((lv, i) => (
              <select key={i} id={`cat-${i}`} className="dx-select" value={lv.value} onChange={(e) => pickLevel(i, e.target.value)} aria-label={i === 0 ? "Category" : `Subcategory ${i}`}>
                <option value="">{i === 0 ? "Select category" : "Select subcategory"}</option>
                {lv.nodes.map((n) => <option key={n.label} value={n.label}>{n.label}</option>)}
              </select>
            ))}
          </div>
          {leaf
            ? <span className="pa-crumb ok"><FaCheckCircle /> {path.join(" › ")}</span>
            : path.length > 0 && <span className="pa-crumb">Keep choosing — pick the most specific option.</span>}
        </div>

        <div className="dx-field">
          <label htmlFor="title">Listing title <span className="pa-req">*</span></label>
          <input id="title" className="dx-input" name="title" value={form.title} onChange={set} maxLength={120} placeholder="Summarize your offer, e.g. iPhone 12 Pro 128GB, clean" />
          <span className="pa-count">{form.title.length}/120</span>
        </div>
        <div className="dx-field">
          <label htmlFor="description">Description <span className="pa-req">*</span></label>
          <textarea id="description" className="dx-textarea" name="description" value={form.description} onChange={set} maxLength={5000} rows={6} placeholder="Detailed description of your offer: condition, what's included, reason for selling…" />
          <span className="pa-count">{form.description.length}/5000</span>
        </div>
      </div>

      {/* ── Price & status ── */}
      <div className="dx-panel">
        <h3>Pricing options &amp; status</h3>
        <div className="dx-field">
          <label>{spec?.priceLabel || "Price (₦)"} <span className="pa-req">*</span></label>
          <div className="pa-seg" role="group" aria-label="Price option">
            {[["fixed", "Set a price"], ["free", "Item for free"], ["contact", "Contact for price"]].map(([v, t]) => (
              <button key={v} type="button" aria-pressed={form.priceType === v} className={form.priceType === v ? "on" : ""} onClick={() => { setForm((f) => ({ ...f, priceType: v })); setErrors([]); }}>{t}</button>
            ))}
          </div>
          {form.priceType === "fixed" && (
            <div className="pa-money">
              <span>₦</span>
              <input className="dx-input" inputMode="decimal" name="price" value={form.price} onChange={(e) => { if (/^\d*\.?\d*$/.test(e.target.value)) set(e); }} placeholder="0" aria-label="Price in naira" />
            </div>
          )}
          {form.priceType === "free" && <span className="dx-hint">Buyers will see “Free”.</span>}
          {form.priceType === "contact" && <span className="dx-hint">Buyers will see “Contact for price” and can message you or make an offer.</span>}
        </div>

        {(showTransaction || showCondition) && (
          <div className="dx-grid2">
            {showTransaction && (
              <div className="dx-field"><label htmlFor="transaction">Transaction</label>
                <select id="transaction" className="dx-select" name="transaction" value={form.transaction} onChange={set}>
                  {["sell", "buy", "rent", "exchange"].map((t) => <option key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</option>)}
                </select></div>
            )}
            {showCondition && (
              <div className="dx-field"><label htmlFor="condition">Condition</label>
                <select id="condition" className="dx-select" name="condition" value={form.condition} onChange={set}>
                  <option value="">Not specified</option><option value="new">New</option><option value="used">Used</option>
                </select></div>
            )}
          </div>
        )}
      </div>

      {/* ── Category-specific details ── */}
      {spec && spec.fields.length > 0 && (
        <div className="dx-panel">
          <h3>Details &amp; attributes</h3>
          <div className="dx-grid2">
            {spec.fields.map((f) => (
              <div className="dx-field" key={f.key}>
                <label htmlFor={`a-${f.key}`}>{f.label}{f.unit ? ` (${f.unit})` : ""} {f.required && <span className="pa-req">*</span>}</label>
                {f.type === "select" ? (
                  <select id={`a-${f.key}`} className="dx-select" value={attrs[f.key] || ""} onChange={(e) => setAttr(f.key, e.target.value)}>
                    <option value="">Select…</option>
                    {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input
                    id={`a-${f.key}`} className="dx-input" maxLength={80} placeholder={f.placeholder || ""}
                    type={f.type === "date" ? "date" : "text"} inputMode={f.type === "number" ? "decimal" : undefined}
                    value={attrs[f.key] || ""}
                    onChange={(e) => { if (f.type !== "number" || /^\d*\.?\d*$/.test(e.target.value)) setAttr(f.key, e.target.value); }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Location ── */}
      <div className="dx-panel">
        <h3>Listing location</h3>
        <div className="dx-grid2">
          <div className="dx-field"><label htmlFor="region">Region</label>
            <select id="region" className="dx-select" name="region" value={form.region} onChange={setRegion}>
              <option value="">Select a region…</option>
              {REGIONS.map((r) => <option key={r} value={r}>{regionLabel(r)}</option>)}
            </select></div>
          <div className="dx-field"><label htmlFor="city">City / area</label>
            <select id="city" className="dx-select" value={otherCity ? OTHER : form.city} onChange={setCitySel} disabled={!form.region}>
              <option value="">{form.region ? "Select a city…" : "Choose a region first"}</option>
              {cities.map((c) => <option key={c} value={c}>{c}</option>)}
              {form.region && <option value={OTHER}>Other (type it)…</option>}
            </select>
            {otherCity && <input className="dx-input" name="city" value={form.city} onChange={set} maxLength={80} placeholder="Type your city or area" aria-label="City or area" />}
          </div>
        </div>
        <div className="dx-field"><label htmlFor="address">Address <span className="dx-hint" style={{ textTransform: "none", fontWeight: 400 }}>(optional)</span></label>
          <input id="address" className="dx-input" name="address" value={form.address} onChange={set} maxLength={200} placeholder="Street, landmark…" /></div>
      </div>

      {/* ── Seller details ── */}
      <div className="dx-panel">
        <h3>Seller's details</h3>
        <div className="dx-grid2">
          <div className="dx-field"><label htmlFor="cname">Contact name</label>
            <input id="cname" className="dx-input" value={user?.name || ""} readOnly /></div>
          <div className="dx-field"><label htmlFor="cemail">Email</label>
            <input id="cemail" className="dx-input" value={user?.email || ""} readOnly />
            <label className="pa-check"><input type="checkbox" checked={form.showEmail} onChange={(e) => setForm((f) => ({ ...f, showEmail: e.target.checked }))} /> Email visible on ad</label></div>
        </div>
        <div className="dx-field"><label htmlFor="phone">Phone number</label>
          <input id="phone" className="dx-input" name="phone" value={form.phone} onChange={set} inputMode="tel" maxLength={20} placeholder="080…" />
          <label className="pa-check"><input type="checkbox" checked={form.showPhone} onChange={(e) => setForm((f) => ({ ...f, showPhone: e.target.checked }))} /> Phone visible on ad</label>
          {!form.showPhone && <span className="dx-hint">Buyers can still reach you through in-app messages.</span>}
        </div>
        <Link className="pa-link" to="/dashboard/profile">Update your profile here →</Link>
      </div>

      <div className="dx-actions">
        <button className="dx-btn dx-btn-primary" disabled={saving || uploading}>{saving ? "Saving…" : id ? "Save changes" : "Publish ad"}</button>
        <button type="button" className="dx-btn dx-btn-ghost" onClick={() => navigate("/dashboard/items")}>Cancel</button>
      </div>
    </form>
  );
}