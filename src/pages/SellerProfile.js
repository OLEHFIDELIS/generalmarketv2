import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FaMapMarkerAlt, FaCalendarAlt, FaGlobe, FaPhoneAlt, FaEnvelope, FaClock, FaCreditCard, FaComments } from "react-icons/fa";
import "./SellerProfile.css";
import { api, dateShort, timeAgo } from "../api";
import { useAuth } from "../context/AuthContext";
import Item from "../components/Item";
import { Alert, Avatar, Spinner, Stars, VerifiedBadge } from "../components/dash/ui";

const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

export default function SellerProfile() {
  const { username } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [text, setText] = useState("");
  const [msg, setMsg] = useState(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    setData(null); setErr("");
    api(`/sellers/${encodeURIComponent(username)}`).then(setData).catch((e) => setErr(e.status === 404 ? "We couldn't find that seller." : e.message));
  }, [username]);

  if (err) return <div className="sp-wrap"><Alert>{err}</Alert><Link to="/all" className="dx-btn dx-btn-ghost">Browse listings</Link></div>;
  if (!data) return <Spinner />;

  const { seller: s, listings, ratings } = data;
  const b = s.business;
  const isMe = user && user.id === s.id;

  const send = async (e) => {
    e.preventDefault();
    if (!user) return navigate("/login");
    if (!text.trim()) return;
    setSending(true); setMsg(null);
    try {
      const r = await api("/threads", { method: "POST", body: { toUserId: s.id, text: text.trim() } });
      navigate(`/dashboard/messages/${r.threadId}`);
    } catch (er) { setMsg(er.message); } finally { setSending(false); }
  };

  return (
    <div className="sp-wrap">
      <header className="sp-head">
        <Avatar src={s.avatar} name={s.name} size={84} />
        <div className="sp-head-info">
          <h1>{s.name} {s.verified && <VerifiedBadge />}</h1>
          <div className="sp-meta">
            {(s.location.city || s.location.state) && <span><FaMapMarkerAlt /> {[s.location.city, s.location.state].filter(Boolean).join(", ")}</span>}
            <span><FaCalendarAlt /> Member since {dateShort(s.memberSince)}</span>
            <span className="sp-type">{s.accountType === "business" ? "Business" : "Individual"}</span>
          </div>
          <Stars value={s.rating.avg} count={s.rating.count} />
        </div>
        {isMe && <Link className="dx-btn dx-btn-ghost" to={b ? "/dashboard/business" : "/dashboard/profile"}>Edit profile</Link>}
      </header>

      <div className="sp-cols">
        <aside className="sp-side">
          {(s.bio || b?.description) && (
            <section className="dx-panel"><h3>About</h3><p className="sp-text">{b?.description || s.bio}</p></section>
          )}

          {b && (
            <section className="dx-panel">
              <h3>Contact</h3>
              <ul className="sp-list">
                {b.address && <li><FaMapMarkerAlt /> {b.address}</li>}
                {b.phone && <li><FaPhoneAlt /> <a href={`tel:${b.phone}`}>{b.phone}</a></li>}
                {b.email && <li><FaEnvelope /> <a href={`mailto:${b.email}`}>{b.email}</a></li>}
                {b.website && <li><FaGlobe /> <a href={b.website} target="_blank" rel="noopener noreferrer nofollow">{b.website.replace(/^https?:\/\//, "")}</a></li>}
              </ul>
            </section>
          )}

          {b?.openingHours?.length > 0 && (
            <section className="dx-panel">
              <h3><FaClock /> Opening hours</h3>
              <table className="sp-hours"><tbody>
                {b.openingHours.map((h) => (
                  <tr key={h.day}><td>{cap(h.day)}</td><td>{h.closed ? "Closed" : `${h.open} – ${h.close}`}</td></tr>
                ))}
              </tbody></table>
            </section>
          )}

          {b?.paymentMethods?.length > 0 && (
            <section className="dx-panel">
              <h3><FaCreditCard /> Payment methods</h3>
              <div className="dx-chips">{b.paymentMethods.map((m) => <span key={m} className="dx-chip on" style={{ textTransform: "capitalize" }}>{m}</span>)}</div>
            </section>
          )}

          {!isMe && (
            <section className="dx-panel">
              <h3><FaComments /> Message {s.name.split(" ")[0]}</h3>
              <form onSubmit={send}>
                <Alert>{msg}</Alert>
                <textarea className="dx-textarea" rows={3} maxLength={2000} placeholder="Hi, I'm interested in your items…" value={text} onChange={(e) => setText(e.target.value)} />
                <div className="dx-actions"><button className="dx-btn dx-btn-primary" disabled={sending || !text.trim()}>{user ? "Send message" : "Log in to message"}</button></div>
              </form>
            </section>
          )}
        </aside>

        <main className="sp-main">
          {b?.gallery?.length > 0 && (
            <section className="sp-gallery">{b.gallery.map((src) => <img key={src} src={src} alt="" loading="lazy" />)}</section>
          )}

          <h2 className="sp-h2">Listings <em>({listings.length})</em></h2>
          {listings.length === 0 ? <p className="sp-empty">No active listings right now.</p> : (
            <div className="sp-grid">
              {listings.map((p) => (
                <Item key={p._id} _id={p._id} id={p.id} name={p.title} images={p.images} new_price={p.price} priceType={p.priceType} address={p.city || p.address} />
              ))}
            </div>
          )}

          <h2 className="sp-h2">Reviews <em>({s.rating.count})</em></h2>
          {ratings.length === 0 ? <p className="sp-empty">No reviews yet.</p> : (
            <div className="sp-reviews">
              {ratings.map((r) => (
                <div className="sp-review" key={r.id}>
                  <Avatar src={r.rater?.avatar} name={r.rater?.name} size={36} />
                  <div>
                    <div className="sp-review-top">
                      {r.rater?.username ? <Link to={`/seller/${r.rater.username}`}>{r.rater.name}</Link> : r.rater?.name}
                      <Stars value={r.stars} size={12} /> <span className="dx-hint">{timeAgo(r.createdAt)}</span>
                    </div>
                    {r.comment && <p className="sp-text">{r.comment}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}