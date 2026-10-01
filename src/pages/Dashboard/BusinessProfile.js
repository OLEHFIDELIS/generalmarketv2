import React, { useEffect, useState } from "react";
import { api } from "../../api";
import { useAuth } from "../../context/AuthContext";
import { categories } from "../../data/categories";
import { Alert, PageHead } from "../../components/dash/ui";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const METHODS = ["cash", "bank transfer", "pos", "mobile money", "cheque", "card"];
const defaultHours = () => DAYS.map((day) => ({ day, open: "09:00", close: "18:00", closed: day === "sunday" }));

export default function BusinessProfile() {
  const { user, setUser } = useAuth();
  const [f, setF] = useState(null);
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user || f) return;
    const b = user.business || {};
    const byDay = Object.fromEntries((b.openingHours || []).map((h) => [h.day, h]));
    setF({
      name: b.name || "", description: b.description || "", category: b.category || "", logo: b.logo || "", address: b.address || "",
      phone: b.phone || "", email: b.email || "", website: b.website || "", paymentMethods: b.paymentMethods || [],
      openingHours: defaultHours().map((h) => byDay[h.day] || h), gallery: b.gallery || [],
    });
  }, [user, f]);
  if (!f) return null;

  const set = (e) => { setF({ ...f, [e.target.name]: e.target.value }); setMsg({ type: "", text: "" }); };
  const setHour = (i, patch) => setF({ ...f, openingHours: f.openingHours.map((h, j) => (j === i ? { ...h, ...patch } : h)) });
  const toggleMethod = (m) => setF({ ...f, paymentMethods: f.paymentMethods.includes(m) ? f.paymentMethods.filter((x) => x !== m) : [...f.paymentMethods, m] });

  const upload = async (files, max) => {
    const list = Array.from(files || []).slice(0, max);
    if (!list.length) return [];
    if (list.some((x) => !/^image\/(jpe?g|png|gif|webp)$/i.test(x.type) || x.size > 8 * 1024 * 1024)) { setMsg({ type: "error", text: "Images must be JPG, PNG, GIF or WebP under 8 MB." }); return []; }
    const fd = new FormData(); list.forEach((x) => fd.append("images", x));
    try { return (await api("/me/upload", { method: "POST", form: fd })).urls; } catch (e) { setMsg({ type: "error", text: e.message }); return []; }
  };

  const save = async (e) => {
    e.preventDefault(); setBusy(true); setMsg({ type: "", text: "" });
    try { const { user: u } = await api("/me/business", { method: "PUT", body: f }); setUser(u); setMsg({ type: "success", text: "Business profile saved." }); }
    catch (er) { setMsg({ type: "error", text: er.message }); }
    finally { setBusy(false); }
  };

  return (
    <form onSubmit={save}>
      <PageHead title="Business profile" sub="Details customers see on your public profile" />
      <Alert type={msg.type}>{msg.text}</Alert>

      <div className="dx-panel">
        <h3>About your business</h3>
        <div className="dx-field"><label>Logo</label>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {f.logo && <img src={f.logo} alt="" style={{ width: 64, height: 64, borderRadius: 10, objectFit: "cover" }} />}
            <input type="file" accept="image/*" onChange={async (e) => { const [u] = await upload(e.target.files, 1); if (u) setF({ ...f, logo: u }); e.target.value = ""; }} />
            {f.logo && <button type="button" className="dx-btn dx-btn-ghost dx-btn-sm" onClick={() => setF({ ...f, logo: "" })}>Remove</button>}
          </div></div>
        <div className="dx-grid2">
          <div className="dx-field"><label>Business name</label><input className="dx-input" name="name" value={f.name} onChange={set} required maxLength={100} /></div>
          <div className="dx-field"><label>Category</label>
            <select className="dx-select" name="category" value={f.category} onChange={set}><option value="">Select</option>{categories.map((c) => <option key={c}>{c}</option>)}</select></div>
        </div>
        <div className="dx-field"><label>Description</label><textarea className="dx-textarea" name="description" value={f.description} onChange={set} maxLength={1000} rows={4} /></div>
        <div className="dx-grid2">
          <div className="dx-field"><label>Business phone</label><input className="dx-input" name="phone" value={f.phone} onChange={set} inputMode="tel" /></div>
          <div className="dx-field"><label>Business email</label><input className="dx-input" type="email" name="email" value={f.email} onChange={set} /></div>
          <div className="dx-field"><label>Website</label><input className="dx-input" name="website" value={f.website} onChange={set} placeholder="https://" /></div>
          <div className="dx-field"><label>Address</label><input className="dx-input" name="address" value={f.address} onChange={set} maxLength={200} /></div>
        </div>
      </div>

      <div className="dx-panel">
        <h3>Payment methods</h3>
        <div className="dx-chips">{METHODS.map((m) => <button type="button" key={m} className={`dx-chip${f.paymentMethods.includes(m) ? " on" : ""}`} onClick={() => toggleMethod(m)} style={{ textTransform: "capitalize" }}>{m}</button>)}</div>
      </div>

      <div className="dx-panel">
        <h3>Opening hours</h3>
        {f.openingHours.map((h, i) => (
          <div className="dx-hours" key={h.day}>
            <strong>{h.day}</strong>
            <input className="dx-input" type="time" value={h.open} disabled={h.closed} onChange={(e) => setHour(i, { open: e.target.value })} />
            <input className="dx-input" type="time" value={h.close} disabled={h.closed} onChange={(e) => setHour(i, { close: e.target.value })} />
            <label className="dx-check"><input type="checkbox" checked={h.closed} onChange={(e) => setHour(i, { closed: e.target.checked })} /> Closed</label>
          </div>
        ))}
      </div>

      <div className="dx-panel">
        <h3>Gallery <span className="dx-hint">({f.gallery.length}/10)</span></h3>
        <input type="file" accept="image/*" multiple disabled={f.gallery.length >= 10}
          onChange={async (e) => { const urls = await upload(e.target.files, 10 - f.gallery.length); if (urls.length) setF({ ...f, gallery: [...f.gallery, ...urls] }); e.target.value = ""; }} />
        {f.gallery.length > 0 && (
          <div className="dx-thumbs">{f.gallery.map((u) => (
            <div className="dx-thumb" key={u}><img src={u} alt="" /><button type="button" onClick={() => setF({ ...f, gallery: f.gallery.filter((x) => x !== u) })} aria-label="Remove">×</button></div>
          ))}</div>
        )}
      </div>

      <div className="dx-actions"><button className="dx-btn dx-btn-primary" disabled={busy}>{busy ? "Saving…" : "Save business profile"}</button></div>
      {user.accountType !== "business" && <p className="dx-hint" style={{ marginTop: 10 }}>Tip: set your account type to “Business” in My profile so this appears on your public page.</p>}
    </form>
  );
}
