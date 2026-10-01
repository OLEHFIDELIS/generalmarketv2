import React, { useEffect, useRef, useState } from "react";
import { FaCamera } from "react-icons/fa";
import { api } from "../../api";
import { useAuth } from "../../context/AuthContext";
import { REGIONS, regionLabel } from "../../data/regions";
import { Alert, Avatar, PageHead } from "../../components/dash/ui";

export default function Profile() {
  const { user, setUser } = useAuth();
  const fileRef = useRef(null);
  const [f, setF] = useState(null);
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [saving, setSaving] = useState(false);
  const [pw, setPw] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [pwMsg, setPwMsg] = useState({ type: "", text: "" });

  useEffect(() => {
    if (user && !f) setF({
      name: user.name || "", username: user.username || "", phone: user.phone || "", whatsapp: user.whatsapp || "", bio: user.bio || "",
      state: (user.location?.state || "").toLowerCase().replace(/\s+/g, "-"), city: user.location?.city || "", address: user.location?.address || "",
      accountType: user.accountType || "individual", notifications: { email: true, messages: true, offers: true, alerts: true, ...user.notifications },
    });
  }, [user, f]);
  if (!f) return null;

  const set = (e) => { setF({ ...f, [e.target.name]: e.target.value }); setMsg({ type: "", text: "" }); };

  const save = async (e) => {
    e.preventDefault(); setSaving(true); setMsg({ type: "", text: "" });
    try {
      const { user: u } = await api("/me", { method: "PUT", body: {
        name: f.name, username: f.username, phone: f.phone, whatsapp: f.whatsapp, bio: f.bio, accountType: f.accountType,
        location: { state: f.state, city: f.city, address: f.address }, notifications: f.notifications,
      } });
      setUser(u); setMsg({ type: "success", text: "Profile saved." });
    } catch (er) { setMsg({ type: "error", text: er.message }); }
    finally { setSaving(false); }
  };

  const uploadAvatar = async (e) => {
    const file = e.target.files?.[0]; e.target.value = "";
    if (!file) return;
    if (!/^image\/(jpe?g|png|gif|webp)$/i.test(file.type) || file.size > 5 * 1024 * 1024) return setMsg({ type: "error", text: "Use a JPG, PNG, GIF or WebP image under 5 MB." });
    try { const fd = new FormData(); fd.append("avatar", file); const d = await api("/me/avatar", { method: "POST", form: fd }); setUser(d.user); setMsg({ type: "success", text: "Photo updated." }); }
    catch (er) { setMsg({ type: "error", text: er.message }); }
  };

  const changePw = async (e) => {
    e.preventDefault(); setPwMsg({ type: "", text: "" });
    if (pw.newPassword !== pw.confirm) return setPwMsg({ type: "error", text: "New passwords don't match." });
    try { await api("/me/password", { method: "POST", body: { currentPassword: pw.currentPassword, newPassword: pw.newPassword } }); setPw({ currentPassword: "", newPassword: "", confirm: "" }); setPwMsg({ type: "success", text: "Password updated." }); }
    catch (er) { setPwMsg({ type: "error", text: er.message }); }
  };

  const toggle = (k) => setF({ ...f, notifications: { ...f.notifications, [k]: !f.notifications[k] } });

  return (
    <>
      <PageHead title="My profile" sub={user.profileIssues?.length ? `Almost there — ${user.profileIssues.join(" · ")}` : "Your details are up to date"} />
      <Alert type={msg.type}>{msg.text}</Alert>

      <form onSubmit={save}>
        <div className="dx-panel">
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 18 }}>
            <div style={{ position: "relative" }}>
              <Avatar src={user.avatar} name={user.name} size={80} />
              <button type="button" onClick={() => fileRef.current.click()} aria-label="Change photo"
                style={{ position: "absolute", right: -4, bottom: -4, width: 30, height: 30, borderRadius: "50%", border: "2px solid #fff", background: "#f97316", color: "#fff", cursor: "pointer" }}><FaCamera size={13} /></button>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" hidden onChange={uploadAvatar} />
            </div>
            <div><strong>{user.name}</strong><div className="dx-hint">{user.email}</div></div>
          </div>

          <div className="dx-grid2">
            <div className="dx-field"><label>Full name</label><input className="dx-input" name="name" value={f.name} onChange={set} required /></div>
            <div className="dx-field"><label>Username</label><input className="dx-input" name="username" value={f.username} onChange={set} required pattern="[a-zA-Z0-9_-]{3,30}" /><span className="dx-hint">Your public link: /seller/{f.username || "username"}</span></div>
            <div className="dx-field"><label>Phone</label><input className="dx-input" name="phone" value={f.phone} onChange={set} inputMode="tel" placeholder="080…" /></div>
            <div className="dx-field"><label>WhatsApp</label><input className="dx-input" name="whatsapp" value={f.whatsapp} onChange={set} inputMode="tel" placeholder="Same as phone if blank" /></div>
            <div className="dx-field"><label>State</label>
              <select className="dx-select" name="state" value={f.state} onChange={set}><option value="">Select state</option>{REGIONS.map((r) => <option key={r} value={r}>{regionLabel(r)}</option>)}</select></div>
            <div className="dx-field"><label>City / area</label><input className="dx-input" name="city" value={f.city} onChange={set} /></div>
          </div>
          <div className="dx-field"><label>Address (optional)</label><input className="dx-input" name="address" value={f.address} onChange={set} maxLength={200} /></div>
          <div className="dx-field"><label>About you</label><textarea className="dx-textarea" name="bio" value={f.bio} onChange={set} maxLength={500} rows={4} placeholder="Tell buyers a little about yourself" /><span className="dx-hint">{f.bio.length}/500</span></div>
          <div className="dx-field"><label>Account type</label>
            <select className="dx-select" name="accountType" value={f.accountType} onChange={set}><option value="individual">Individual</option><option value="business">Business</option></select>
            {f.accountType === "business" && <span className="dx-hint">Fill in your Business profile to show your business name and logo on your listings.</span>}
          </div>
        </div>

        <div className="dx-panel">
          <h3>Notifications</h3>
          {[["messages", "New messages"], ["offers", "Offers on my ads"], ["alerts", "Saved-search matches"], ["email", "Email me important updates"]].map(([k, label]) => (
            <label className="dx-check" key={k}><input type="checkbox" checked={!!f.notifications[k]} onChange={() => toggle(k)} /> {label}</label>
          ))}
          <p className="dx-hint">Preferences are saved now; email delivery is not switched on yet — new activity shows in your dashboard.</p>
        </div>

        <div className="dx-actions" style={{ marginBottom: 22 }}><button className="dx-btn dx-btn-primary" disabled={saving}>{saving ? "Saving…" : "Save profile"}</button></div>
      </form>

      <form className="dx-panel" onSubmit={changePw}>
        <h3>Change password</h3>
        <Alert type={pwMsg.type}>{pwMsg.text}</Alert>
        <div className="dx-field"><label>Current password</label><input className="dx-input" type="password" autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} required /></div>
        <div className="dx-grid2">
          <div className="dx-field"><label>New password</label><input className="dx-input" type="password" autoComplete="new-password" minLength={8} value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} required /></div>
          <div className="dx-field"><label>Confirm new password</label><input className="dx-input" type="password" autoComplete="new-password" minLength={8} value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} required /></div>
        </div>
        <button className="dx-btn dx-btn-ghost">Update password</button>
      </form>
    </>
  );
}