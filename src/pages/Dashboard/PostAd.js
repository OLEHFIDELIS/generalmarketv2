import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import { api } from "../../api";
import { useAuth } from "../../context/AuthContext";
import { categories } from "../../data/categories";
import { REGIONS, regionLabel } from "../../data/regions";
import { Alert, PageHead, Spinner } from "../../components/dash/ui";

const EMPTY = { category: "", title: "", description: "", price: "", transaction: "sell", condition: "", region: "", city: "", address: "", phone: "", email: "" };
const MAX_IMAGES = 12;

// Create (/dashboard/post) and edit (/dashboard/post/:id) a listing
export default function PostAd() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { reloadDash } = useOutletContext() || {};
  const fileRef = useRef(null);

  const [form, setForm] = useState({ ...EMPTY, phone: user?.phone || "", email: user?.email || "", region: (user?.location?.state || "").toLowerCase().replace(/\s+/g, "-"), city: user?.location?.city || "" });
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(!!id);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(null);

  useEffect(() => {
    if (!id) return;
    api(`/me/listings/${id}`)
      .then(({ listing: l }) => {
        setForm({ ...EMPTY, ...Object.fromEntries(Object.keys(EMPTY).map((k) => [k, l[k] ?? ""])) });
        setImages(l.images || []);
      })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const set = (e) => { setForm((f) => ({ ...f, [e.target.name]: e.target.value })); setErr(""); };

  const pick = async (e) => {
    const files = Array.from(e.target.files || []).slice(0, MAX_IMAGES - images.length);
    e.target.value = "";
    if (!files.length) return;
    const bad = files.find((f) => !/^image\/(jpe?g|png|gif|webp)$/i.test(f.type) || f.size > 8 * 1024 * 1024);
    if (bad) return setErr("Photos must be JPG, PNG, GIF or WebP and under 8 MB each.");
    setUploading(true); setErr("");
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append("images", f));
      const { urls } = await api("/me/upload", { method: "POST", form: fd });
      setImages((prev) => [...prev, ...urls].slice(0, MAX_IMAGES));
    } catch (er) { setErr(er.message); }
    finally { setUploading(false); }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!images.length) return setErr("Add at least one photo.");
    setSaving(true); setErr("");
    try {
      const body = { ...form, price: Number(form.price), images };
      const res = id
        ? await api(`/me/listings/${id}`, { method: "PUT", body })
        : await api("/me/listings", { method: "POST", body });
      reloadDash && reloadDash();
      setDone({ review: res.needsReview, id: res.listing._id });
    } catch (er) { setErr(er.message); }
    finally { setSaving(false); }
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

  return (
    <form onSubmit={submit}>
      <PageHead title={id ? "Edit ad" : "Post an ad"} sub="Clear photos and an honest description sell faster" />
      <Alert>{err}</Alert>

      <div className="dx-panel">
        <h3>Photos</h3>
        <label className="dx-drop">
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" multiple onChange={pick} disabled={uploading || images.length >= MAX_IMAGES} />
          {uploading ? "Uploading…" : images.length >= MAX_IMAGES ? "Maximum photos reached" : `📷 Tap to add photos (${images.length}/${MAX_IMAGES})`}
        </label>
        {images.length > 0 && (
          <div className="dx-thumbs">
            {images.map((u, i) => (
              <div className="dx-thumb" key={u}>
                <img src={u} alt="" />
                {i === 0 && <span className="main">Cover</span>}
                <button type="button" onClick={() => setImages(images.filter((x) => x !== u))} aria-label="Remove photo">×</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="dx-panel">
        <h3>Details</h3>
        <div className="dx-grid2">
          <div className="dx-field"><label>Category</label>
            <select className="dx-select" name="category" value={form.category.toLowerCase()} onChange={set} required>
              <option value="">Select category</option>
              {categories.map((c) => <option key={c} value={c.toLowerCase()}>{c}</option>)}
            </select></div>
          <div className="dx-field"><label>Price (₦)</label>
            <input className="dx-input" type="number" min="0" step="any" name="price" value={form.price} onChange={set} required placeholder="0" /></div>
        </div>
        <div className="dx-field"><label>Title</label>
          <input className="dx-input" name="title" value={form.title} onChange={set} required maxLength={120} placeholder="e.g. iPhone 12 Pro 128GB, clean" /></div>
        <div className="dx-field"><label>Description</label>
          <textarea className="dx-textarea" name="description" value={form.description} onChange={set} required maxLength={5000} rows={5} placeholder="Condition, specs, reason for selling…" /></div>
        <div className="dx-grid2">
          <div className="dx-field"><label>Transaction</label>
            <select className="dx-select" name="transaction" value={form.transaction} onChange={set}>
              {["sell", "buy", "rent", "exchange"].map((t) => <option key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</option>)}
            </select></div>
          <div className="dx-field"><label>Condition</label>
            <select className="dx-select" name="condition" value={form.condition} onChange={set}>
              <option value="">Not applicable</option><option value="new">New</option><option value="used">Used</option>
            </select></div>
        </div>
      </div>

      <div className="dx-panel">
        <h3>Location & contact</h3>
        <div className="dx-grid2">
          <div className="dx-field"><label>State</label>
            <select className="dx-select" name="region" value={form.region} onChange={set}>
              <option value="">Select state</option>
              {REGIONS.map((r) => <option key={r} value={r}>{regionLabel(r)}</option>)}
            </select></div>
          <div className="dx-field"><label>City / area</label>
            <input className="dx-input" name="city" value={form.city} onChange={set} maxLength={80} placeholder="e.g. Ikeja" /></div>
        </div>
        <div className="dx-grid2">
          <div className="dx-field"><label>Phone</label>
            <input className="dx-input" name="phone" value={form.phone} onChange={set} inputMode="tel" placeholder="080…" /></div>
          <div className="dx-field"><label>Email</label>
            <input className="dx-input" type="email" name="email" value={form.email} onChange={set} /></div>
        </div>
        <p className="dx-hint">Your phone and email are shown on the listing. Use the ones you want buyers to see.</p>
      </div>

      <div className="dx-actions">
        <button className="dx-btn dx-btn-primary" disabled={saving || uploading}>{saving ? "Saving…" : id ? "Save changes" : "Publish ad"}</button>
        <button type="button" className="dx-btn dx-btn-ghost" onClick={() => navigate("/dashboard/items")}>Cancel</button>
      </div>
    </form>
  );
}
