import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { FaTrash } from "react-icons/fa";
import { api, timeAgo } from "../../api";
import { useAuth } from "../../context/AuthContext";
import { Alert, Avatar, VerifiedBadge } from "../dash/ui";

export default function Comments({ listingId, initialCount = 0 }) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [rows, setRows] = useState(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    let live = true;
    api(`/listings/${listingId}/comments`).then((d) => live && setRows(d.comments)).catch(() => live && setRows([]));
    return () => { live = false; };
  }, [listingId]);

  const add = async (e) => {
    e.preventDefault();
    if (text.trim().length < 2) return;
    setBusy(true); setErr("");
    try {
      const { comment } = await api(`/listings/${listingId}/comments`, { method: "POST", body: { text: text.trim() } });
      setRows((r) => [comment, ...(r || [])]); setText("");
    } catch (er) { setErr(er.message); } finally { setBusy(false); }
  };
  const remove = async (id) => {
    if (!window.confirm("Delete this comment?")) return;
    try { await api(`/comments/${id}`, { method: "DELETE" }); setRows((r) => r.filter((c) => c.id !== id)); }
    catch (er) { setErr(er.message); }
  };

  const count = rows ? rows.length : initialCount;
  return (
    <section className="pv-card" id="comments">
      <h2 className="pv-h2">Comments <em>({count})</em></h2>
      <Alert>{err}</Alert>

      {rows && rows.length === 0 && <p className="pv-muted">No comments have been added yet.</p>}
      <div className="pv-comments">
        {(rows || []).map((c) => (
          <div className="pv-comment" key={c.id}>
            <Avatar src={c.user.avatar} name={c.user.name} size={34} />
            <div className="pv-comment-body">
              <div className="pv-comment-top">
                {c.user.username ? <Link to={`/seller/${c.user.username}`}>{c.user.name}</Link> : <b>{c.user.name}</b>}
                {c.user.verified && <VerifiedBadge />}
                <span className="pv-muted">{timeAgo(c.createdAt)}</span>
                {c.canDelete && <button type="button" className="pv-icon-btn" onClick={() => remove(c.id)} aria-label="Delete comment"><FaTrash /></button>}
              </div>
              <p>{c.text}</p>
            </div>
          </div>
        ))}
      </div>

      {user ? (
        <form className="pv-comment-form" onSubmit={add}>
          <textarea className="dx-textarea" rows={2} maxLength={600} value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a public comment…" />
          <button className="pv-btn primary" disabled={busy || text.trim().length < 2}>{busy ? "Posting…" : "Add comment"}</button>
        </form>
      ) : (
        <Link className="pv-btn" to={`/login?next=${encodeURIComponent(pathname)}`}>Log in to comment</Link>
      )}
    </section>
  );
}
