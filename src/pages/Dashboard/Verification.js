import React, { useEffect, useState } from "react";
import { FaShieldAlt } from "react-icons/fa";
import { api, dateShort } from "../../api";
import { useAuth } from "../../context/AuthContext";
import { Alert, PageHead, StatusBadge, VerifiedBadge } from "../../components/dash/ui";

const DOCS = { nin: "National ID (NIN slip / card)", drivers_license: "Driver's licence", voters_card: "Voter's card", passport: "International passport", cac: "CAC certificate (business)" };

export default function Verification() {
  const { user, refresh } = useAuth();
  const v = user.verification || { status: "none" };
  const [docType, setDocType] = useState("nin");
  const [files, setFiles] = useState({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });
  useEffect(() => { refresh(); }, [refresh]);

  const pick = (k) => (e) => {
    const file = e.target.files?.[0];
    if (file && (!/^image\/(jpe?g|png|webp)$/i.test(file.type) || file.size > 8 * 1024 * 1024)) { e.target.value = ""; return setMsg({ type: "error", text: "Use a JPG, PNG or WebP image under 8 MB." }); }
    setFiles((f) => ({ ...f, [k]: file })); setMsg({ type: "", text: "" });
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!files.front || !files.selfie) return setMsg({ type: "error", text: "Upload the front of your document and a selfie." });
    setBusy(true);
    try {
      const fd = new FormData(); fd.append("documentType", docType);
      ["front", "back", "selfie"].forEach((k) => files[k] && fd.append(k, files[k]));
      await api("/me/verification", { method: "POST", form: fd });
      setFiles({}); setMsg({ type: "success", text: "Submitted! We'll review your documents shortly." }); refresh();
    } catch (er) { setMsg({ type: "error", text: er.message }); }
    finally { setBusy(false); }
  };

  return (
    <>
      <PageHead title="ID verification" sub="Verified sellers earn more trust and more replies" />
      <div className="dx-panel" style={{ display: "flex", gap: 14, alignItems: "center" }}>
        <FaShieldAlt size={28} color={v.status === "verified" ? "#16a34a" : "#94a3b8"} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700 }}>Status: <StatusBadge status={v.status} /></div>
          {v.status === "verified" && <div className="dx-hint">Verified on {dateShort(v.reviewedAt)} · <VerifiedBadge /></div>}
          {v.status === "pending" && <div className="dx-hint">Submitted {dateShort(v.submittedAt)}. Reviews usually take 1–2 working days.</div>}
          {v.status === "rejected" && <div className="dx-hint" style={{ color: "#b91c1c" }}>Not approved: {v.rejectionReason || "documents were unclear"}. You can submit again below.</div>}
        </div>
      </div>

      <Alert type={msg.type}>{msg.text}</Alert>

      {(v.status === "none" || v.status === "rejected") && (
        <form className="dx-panel" onSubmit={submit}>
          <h3>Submit your documents</h3>
          <div className="dx-field"><label>Document type</label>
            <select className="dx-select" value={docType} onChange={(e) => setDocType(e.target.value)}>{Object.entries(DOCS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
          <div className="dx-field"><label>Document — front *</label><input type="file" accept="image/jpeg,image/png,image/webp" onChange={pick("front")} /></div>
          <div className="dx-field"><label>Document — back (if any)</label><input type="file" accept="image/jpeg,image/png,image/webp" onChange={pick("back")} /></div>
          <div className="dx-field"><label>Selfie holding the document *</label><input type="file" accept="image/jpeg,image/png,image/webp" onChange={pick("selfie")} /></div>
          <p className="dx-hint" style={{ marginBottom: 12 }}>Your documents are stored privately, only used to verify you, and deleted from our storage as soon as the review is done. We keep only the result.</p>
          <button className="dx-btn dx-btn-primary" disabled={busy}>{busy ? "Uploading…" : "Submit for review"}</button>
        </form>
      )}
    </>
  );
}
