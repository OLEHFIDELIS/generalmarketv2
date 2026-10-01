import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { FaArrowLeft, FaBan, FaEnvelope, FaPaperPlane, FaStar, FaTrash } from "react-icons/fa";
import { api, timeAgo } from "../../api";
import { Alert, Avatar, Empty, Spinner, Stars, VerifiedBadge } from "../../components/dash/ui";

function RatePanel({ userId, onClose }) {
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [msg, setMsg] = useState({ type: "", text: "" });
  useEffect(() => { api(`/me/ratings/mine/${userId}`).then((d) => { if (d.rating) { setStars(d.rating.stars); setComment(d.rating.comment || ""); } }).catch(() => {}); }, [userId]);
  const save = async () => {
    if (!stars) return setMsg({ type: "error", text: "Choose a star rating." });
    try { await api("/ratings", { method: "POST", body: { rateeId: userId, stars, comment } }); setMsg({ type: "success", text: "Thanks — your rating was saved." }); setTimeout(onClose, 1200); }
    catch (e) { setMsg({ type: "error", text: e.message }); }
  };
  return (
    <div className="dx-rate-pop">
      <Stars value={stars} onChange={setStars} size={16} />
      <textarea className="dx-textarea" style={{ minHeight: 60, margin: "8px 0" }} placeholder="How was your experience? (optional)" value={comment} maxLength={500} onChange={(e) => setComment(e.target.value)} />
      <Alert type={msg.type}>{msg.text}</Alert>
      <div className="dx-actions"><button className="dx-btn dx-btn-primary dx-btn-sm" onClick={save}>Submit rating</button><button className="dx-btn dx-btn-ghost dx-btn-sm" onClick={onClose}>Close</button></div>
    </div>
  );
}

export default function Messages() {
  const { threadId } = useParams();
  const navigate = useNavigate();
  const { reloadDash } = useOutletContext() || {};
  const [threads, setThreads] = useState(null);
  const [convo, setConvo] = useState(null);
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const [sending, setSending] = useState(false);
  const [rating, setRating] = useState(false);
  const endRef = useRef(null);

  const loadThreads = useCallback(() => api("/me/threads").then((d) => setThreads(d.threads)).catch((e) => { setErr(e.message); setThreads([]); }), []);
  const loadConvo = useCallback(async () => {
    if (!threadId) return setConvo(null);
    try { const d = await api(`/threads/${threadId}/messages`); setConvo(d); reloadDash && reloadDash(); }
    catch (e) { setErr(e.message); setConvo(null); }
  }, [threadId, reloadDash]);

  // Poll: threads every 15s, open conversation every 6s (no websockets on this stack)
  useEffect(() => { loadThreads(); const t = setInterval(loadThreads, 15000); return () => clearInterval(t); }, [loadThreads]);
  useEffect(() => { setConvo(null); setRating(false); loadConvo(); if (!threadId) return; const t = setInterval(loadConvo, 6000); return () => clearInterval(t); }, [loadConvo, threadId]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [convo?.messages?.length]);

  const send = async (e) => {
    e?.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true); setErr("");
    try { await api(`/threads/${threadId}/messages`, { method: "POST", body: { text: body } }); setText(""); await loadConvo(); loadThreads(); }
    catch (er) { setErr(er.message); }
    finally { setSending(false); }
  };

  const block = async () => {
    const r = await api(`/threads/${threadId}/block`, { method: "POST" }).catch((e) => setErr(e.message));
    if (r) { loadConvo(); loadThreads(); }
  };
  const del = async () => {
    if (!window.confirm("Delete this conversation? It will reappear if they message you again.")) return;
    await api(`/threads/${threadId}`, { method: "DELETE" }).catch((e) => setErr(e.message));
    navigate("/dashboard/messages"); loadThreads();
  };

  return (
    <>
      <div className="dx-pagehead"><div><h2>Messages</h2><p>Chat with buyers and sellers</p></div></div>
      <Alert>{err}</Alert>
      {!threads ? <Spinner /> : threads.length === 0 && !threadId ? (
        <Empty icon={<FaEnvelope />} title="No messages yet" sub="When you contact a seller — or a buyer contacts you — the conversation shows up here.">
          <Link className="dx-btn dx-btn-primary" to="/all">Browse listings</Link>
        </Empty>
      ) : (
        <div className={`dx-chat${threadId ? " has-active" : ""}`}>
          <div className="dx-threads">
            {threads.map((t) => (
              <div key={t.id} className={`dx-thread${t.id === threadId ? " active" : ""}`} onClick={() => navigate(`/dashboard/messages/${t.id}`)}>
                <Avatar src={t.with?.avatar} name={t.with?.name} size={42} />
                <div className="dx-thread-main">
                  <div className="dx-thread-name"><span>{t.with?.name || "User"}</span><em>{timeAgo(t.lastMessage?.at || t.updatedAt)}</em></div>
                  {t.listing?.title && <div className="dx-thread-ad">{t.listing.title}</div>}
                  <div className="dx-thread-last">{t.lastMessage?.text}</div>
                </div>
                {t.unread > 0 && <span className="dx-unread">{t.unread}</span>}
              </div>
            ))}
          </div>

          <div className="dx-convo">
            {!threadId ? (
              <div className="dx-empty" style={{ border: "none", margin: "auto" }}><div className="dx-empty-icon"><FaEnvelope /></div><p>Select a conversation</p></div>
            ) : !convo ? <Spinner /> : (
              <>
                <div className="dx-convo-head">
                  <button className="dx-back" onClick={() => navigate("/dashboard/messages")}><FaArrowLeft /></button>
                  <Avatar src={convo.with?.avatar} name={convo.with?.name} size={36} />
                  <strong>
                    {convo.with?.username ? <Link to={`/seller/${convo.with.username}`} style={{ color: "inherit", textDecoration: "none" }}>{convo.with.name}</Link> : convo.with?.name}
                    {convo.with?.verified && <> <VerifiedBadge /></>}
                    {convo.listing?.title && <div className="dx-hint" style={{ fontWeight: 400 }}>Re: <Link to={`/product/${convo.listing.id}`}>{convo.listing.title}</Link></div>}
                  </strong>
                  <button className="dx-btn dx-btn-ghost dx-btn-sm" onClick={() => setRating(!rating)}><FaStar /> Rate</button>
                  <button className="dx-btn dx-btn-ghost dx-btn-sm" onClick={block} title={convo.blockedByMe ? "Unblock" : "Block"}><FaBan /></button>
                  <button className="dx-btn dx-btn-danger dx-btn-sm" onClick={del} title="Delete"><FaTrash /></button>
                </div>
                {rating && convo.with?.id && <RatePanel userId={convo.with.id} onClose={() => setRating(false)} />}
                <div className="dx-msgs">
                  {convo.messages.map((m) => (
                    <div key={m.id} className={`dx-msg${m.mine ? " mine" : ""}${m.kind === "offer" ? " offer" : ""}`}>
                      {m.kind === "offer" && "💰 "}{m.text}<small>{timeAgo(m.createdAt)}{m.mine && m.readAt ? " · Read" : ""}</small>
                    </div>
                  ))}
                  <div ref={endRef} />
                </div>
                {convo.blocked ? (
                  <div className="dx-alert dx-alert-warn" style={{ margin: 12 }}>{convo.blockedByMe ? "You blocked this user. Unblock to continue chatting." : "You can't reply to this conversation."}</div>
                ) : (
                  <form className="dx-compose" onSubmit={send}>
                    <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Type your message…" maxLength={2000}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) send(e); }} />
                    <button className="dx-btn dx-btn-primary" disabled={sending || !text.trim()} aria-label="Send"><FaPaperPlane /></button>
                  </form>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
