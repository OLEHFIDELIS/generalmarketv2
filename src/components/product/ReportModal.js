import React, { useEffect, useState } from "react";
import { api } from "../../api";
import { Alert } from "../dash/ui";

const REASONS = [["spam", "Spam"], ["misclassified", "Misclassified"], ["duplicate", "Duplicated"], ["expired", "Expired"], ["offensive", "Offensive"], ["scam", "Scam / fraud"]];

export default function ReportModal({ listingId, onClose }) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState("");

  useEffect(() => {
    const key = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose]);

  const send = async (e) => {
    e.preventDefault();
    if (!reason) return setErr("Choose a reason first.");
    setBusy(true); setErr("");
    try { const r = await api(`/listings/${listingId}/report`, { method: "POST", body: { reason, details } }); setDone(r.message); }
    catch (er) { setErr(er.message); } finally { setBusy(false); }
  };

  return (
    <div className="pv-modal-back" onClick={onClose}>
      <div className="pv-modal" role="dialog" aria-modal="true" aria-label="Report listing" onClick={(e) => e.stopPropagation()}>
        <h3>Report listing</h3>
        {done ? (
          <>
            <p className="pv-muted">{done}</p>
            <div className="dx-actions"><button className="pv-btn primary" onClick={onClose}>Close</button></div>
          </>
        ) : (
          <form onSubmit={send}>
            <p className="pv-muted">If you find this listing inappropriate, offensive or spammy, please let us know. Select a reason:</p>
            <Alert>{err}</Alert>
            <div className="pv-reasons">
              {REASONS.map(([v, t]) => (
                <button type="button" key={v} className={`pv-chip${reason === v ? " on" : ""}`} aria-pressed={reason === v} onClick={() => { setReason(v); setErr(""); }}>{t}</button>
              ))}
            </div>
            <textarea className="dx-textarea" rows={3} maxLength={500} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="More details (optional)" />
            <div className="dx-actions">
              <button className="pv-btn primary" disabled={busy}>{busy ? "Sending…" : "Send report"}</button>
              <button type="button" className="pv-btn" onClick={onClose}>Cancel</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
