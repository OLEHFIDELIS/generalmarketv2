import React, { useContext, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  FaBuilding, FaChevronLeft, FaChevronRight, FaClock, FaComments, FaEnvelope, FaEye, FaFacebookF,
  FaGavel, FaHashtag, FaMapMarkerAlt, FaPhoneAlt, FaPinterestP, FaPrint, FaRegCalendarAlt, FaShareAlt, FaShieldAlt,
  FaShoppingCart, FaSms, FaTag, FaThList, FaTwitter, FaWhatsapp,
} from "react-icons/fa";
import "../pages/Dashboard/Dashboard.css";
import "../pages/Product.css";
import { longAgo, maskPhone, priceText, spanSince, telHref, waNumber } from "../api";
import { REGIONS, regionLabel } from "../data/regions";
import { ShopContext } from "../context/ShopContext";
import { useAuth } from "../context/AuthContext";
import useFavorite from "../hooks/useFavorite";
import { Avatar, Stars, VerifiedBadge } from "./dash/ui";
import Gallery from "./product/Gallery";
import Comments from "./product/Comments";
import ContactModal from "./product/ContactModal";
import ReportModal from "./product/ReportModal";
import { rememberViewed } from "./product/RecentlyViewed";

const place = (slug) => (REGIONS.includes(slug) ? regionLabel(slug) : slug || "");
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : "");
const catSlug = (c) => String(c || "").toLowerCase().replace(/ & /g, "-").replace(/ /g, "-");

const NOTICE = {
  pending: "This ad is waiting for review. Only you can see it until it's approved.",
  rejected: "This ad was not approved. Edit it and resubmit to publish.",
  expired: "This ad has expired. Renew it from your dashboard to make it visible again.",
};

// Product / listing page. All data comes from GET /api/listings/:id (see pages/Product.js).
export default function ProductDisplay({ data }) {
  const { listing: p, seller, isOwner = false, stats = {}, neighbors = {} } = data || {};
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user } = useAuth();
  const { cartItems, addToCart, maxQty } = useContext(ShopContext);
  const { favorited, toggle } = useFavorite(p?._id);

  const [modal, setModal] = useState(null);           // "message" | "offer" | "report" | null
  const [flash, setFlash] = useState(null);           // { type, text }
  const [showPhone, setShowPhone] = useState(false);
  const [more, setMore] = useState(false);
  const [touchedLike, setTouchedLike] = useState(false);
  const [cartMsg, setCartMsg] = useState("");
  const [copied, setCopied] = useState(false);

  // Remember for "Recently viewed" + page title
  useEffect(() => {
    if (!p?._id) return undefined;
    rememberViewed(p);
    const old = document.title;
    document.title = `${p.title} | GeneralMarket`;
    return () => { document.title = old; };
  }, [p]);

  // One view per session
  useEffect(() => {
    if (!p?._id) return;
    try {
      const key = `gm-viewed-${p._id}`;
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        fetch(`/api/listings/${p._id}/view`, { method: "POST" }).catch(() => {});
      }
    } catch { /* storage blocked */ }
  }, [p?._id]);

  const derived = useMemo(() => {
    // An ad past its expiry date counts as expired even if the server hasn't flipped the status yet
    const lapsed = p?.expiresAt && new Date(p.expiresAt) < new Date();
    const status = (p?.status || "active") === "active" && lapsed ? "expired" : p?.status || "active";
    const sold = status === "sold";
    const live = status === "active";
    return {
      status, sold, live,
      // Respect "phone visible on ad: off" – only fall back to the business number when the ad doesn't hide it
      phone: p?.phone || (p?.showPhone === false ? "" : seller?.business?.phone) || "",
      canMessage: !!seller && !isOwner && live,
      canOffer: !!seller && !isOwner && live && p?.priceType !== "free",
      canCart: !isOwner && live && p?.priceType !== "contact" && p?.priceType !== "free",
      top: (p?.categoryPath && p.categoryPath[0]) || cap(p?.category),
    };
  }, [p, seller, isOwner]);

  if (!p) return null;
  const { status, sold, live, phone, canMessage, canOffer, canCart, top } = derived;

  const liked = touchedLike ? favorited : favorited || !!stats.likedByMe;
  const likes = Math.max(0, (stats.likes || 0) + (touchedLike ? (favorited ? 1 : 0) - (stats.likedByMe ? 1 : 0) : 0));
  const inCart = cartItems?.[p.id] || 0;
  const url = typeof window !== "undefined" ? window.location.href : "";
  const open = (m) => (user ? setModal(m) : navigate(`/login?next=${encodeURIComponent(pathname)}`));

  const onLike = () => { setTouchedLike(true); toggle(); };
  const share = async () => {
    try {
      if (navigator.share) { await navigator.share({ title: p.title, url }); return; }
      await navigator.clipboard?.writeText(url);
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    } catch { /* user cancelled */ }
  };
  const addCart = async () => {
    setCartMsg("");
    const r = await addToCart(p.id);
    if (!r.ok) setCartMsg(r.message);
  };

  const waText = encodeURIComponent(`Hi, I'm interested in "${p.title}" (${priceText(p)}) on GeneralMarket: ${url}`);
  const loc = [p.city, place(p.region)].filter(Boolean).join(", ");
  const mapHref = `https://maps.google.com/maps?daddr=${encodeURIComponent([p.address, loc, "Nigeria"].filter(Boolean).join(", "))}`;
  const sellerName = seller?.name || p.contactName || "GeneralMarket seller";
  const longDesc = (p.description || "").length > 500;

  const facts = [
    [<FaThList />, "Category", (p.categoryPath?.length ? p.categoryPath : [top]).filter(Boolean).join(" › ")],
    [<FaRegCalendarAlt />, "Posted", p.createdAt ? longAgo(p.createdAt) : ""],
    p.condition && [<FaTag />, "Condition", cap(p.condition)],
    p.transaction && [<FaTag />, "Transaction", cap(p.transaction)],
    loc && [<FaMapMarkerAlt />, "Location", loc],
    p.address && [<FaBuilding />, "Address", p.address],
    [<FaEye />, "Views", `${p.views || 0} ${p.views === 1 ? "view" : "views"}`],
    p.id && [<FaHashtag />, "Ad ID", `#${p.id}`],
  ].filter((f) => f && f[2]);

  const shareLinks = [
    ["whatsapp", <FaWhatsapp />, `https://wa.me/?text=${encodeURIComponent(`${p.title} ${url}`)}`],
    ["facebook", <FaFacebookF />, `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`],
    ["twitter", <FaTwitter />, `https://twitter.com/intent/tweet?text=${encodeURIComponent(p.title)}&url=${encodeURIComponent(url)}`],
    ["pinterest", <FaPinterestP />, `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(url)}&media=${encodeURIComponent(p.images?.[0] || "")}&description=${encodeURIComponent(p.title)}`],
  ];

  const sellerCard = (
    <div className="pv-seller">
      <div className="pv-seller-top">
        <Avatar src={seller?.avatar} name={sellerName} size={52} />
        <div className="pv-seller-id">
          {seller?.username ? <Link className="pv-seller-name" to={`/seller/${seller.username}`}>{sellerName}</Link> : <span className="pv-seller-name">{sellerName}</span>}
          {seller && <div className="pv-seller-rate"><Stars value={seller.rating.avg} count={seller.rating.count} size={13} /></div>}
          {seller?.verified && <VerifiedBadge />}
        </div>
      </div>
      {seller?.lastActive && <div className="pv-muted pv-small">Last online {longAgo(seller.lastActive)}</div>}
    </div>
  );

  const cta = (
    <div className="pv-cta">
      {isOwner ? (
        <div className="pv-owner">
          <strong>This is your listing</strong>
          <div className="pv-owner-actions">
            <Link className="pv-btn primary" to={`/dashboard/post/${p._id}`}>Edit ad</Link>
            <Link className="pv-btn" to="/dashboard/items">My ads</Link>
          </div>
        </div>
      ) : sold ? (
        <div className="pv-notice sold">This item has been sold.</div>
      ) : !live ? (
        <div className="pv-notice">{NOTICE[status] || "This ad isn't available right now."}</div>
      ) : (
        <>
          {canMessage && <button type="button" className="pv-btn msg block" onClick={() => open("message")}><FaComments /> Message seller</button>}
          {canOffer && <button type="button" className="pv-btn block" onClick={() => open("offer")}><FaGavel /> Make price offer</button>}
          {phone && (
            showPhone
              ? <a className="pv-btn block" href={telHref(phone)}><FaPhoneAlt /> {phone}</a>
              : <button type="button" className="pv-btn block" onClick={() => setShowPhone(true)}><FaPhoneAlt /> {maskPhone(phone)}<small>Show number</small></button>
          )}
          {/* Older ads have no seller account, so there is no in-app inbox: keep WhatsApp for those only */}
          {phone && !seller && <a className="pv-btn wa block" href={`https://wa.me/${waNumber(phone)}?text=${waText}`} target="_blank" rel="noopener noreferrer"><FaWhatsapp /> WhatsApp seller</a>}
          {canCart && (
            <>
              <button type="button" className="pv-btn block" onClick={addCart} disabled={inCart >= maxQty}>
                <FaShoppingCart /> {inCart ? `Add another (${inCart} in cart)` : "Add to cart"}
              </button>
              {inCart > 0 && <Link to="/cart" className="pv-link">View cart →</Link>}
              {cartMsg && <div className="dx-alert dx-alert-error" role="alert">{cartMsg}</div>}
            </>
          )}
          {!canMessage && !phone && <div className="pv-notice">No contact details were provided for this ad.</div>}
        </>
      )}
    </div>
  );

  return (
    <div className="pv-page">
      {/* ── Breadcrumb + prev / next ── */}
      <div className="pv-top">
        <nav className="pv-crumbs" aria-label="Breadcrumb">
          <Link to="/">Home</Link><span>›</span>
          {top && <><Link to={`/category/${catSlug(top)}`}>{top}</Link><span>›</span></>}
          <b>{p.title}</b>
        </nav>
        <div className="pv-pn">
          {neighbors.prev && <Link to={`/product/${neighbors.prev._id}`} title={neighbors.prev.title}><FaChevronLeft /> Previous</Link>}
          {neighbors.next && <Link to={`/product/${neighbors.next._id}`} title={neighbors.next.title}>Next <FaChevronRight /></Link>}
        </div>
      </div>

      {isOwner && NOTICE[status] && <div className="pv-notice owner">{NOTICE[status]}</div>}
      {flash && <div className={`dx-alert dx-alert-${flash.type}`} role="status">{flash.text}</div>}
      {copied && <div className="pv-toast" role="status">Link copied</div>}

      <div className="pv-grid">
        {/* ── Gallery ── */}
        <div className="pv-area-gallery">
          <Gallery
            images={Array.isArray(p.images) ? p.images : []}
            title={p.title}
            liked={liked}
            likes={likes}
            onLike={onLike}
            onShare={share}
            onReport={isOwner ? undefined : () => setModal("report")}
            badge={sold ? "SOLD" : status !== "active" ? status.toUpperCase() : ""}
          />
        </div>

        {/* ── Buy box (sticky on desktop) ── */}
        <aside className="pv-area-aside">
          <div className="pv-card pv-buy">
            <h1 className="pv-title">{p.title}</h1>
            <div className="pv-price">{priceText(p)}</div>
            {p.priceType === "contact" && <p className="pv-muted pv-small">Message the seller to agree a price.</p>}
            {stats.offers > 0 && <p className="pv-muted pv-small">{stats.offers} {stats.offers === 1 ? "offer" : "offers"} so far</p>}
            {cta}
            {sellerCard}
          </div>

          <div className="pv-card pv-safety">
            <h3><FaShieldAlt /> Stay safe</h3>
            <ul>
              <li><b>Never send a deposit</b> before meeting the seller and inspecting the item.</li>
              <li><b>Don't click suspicious links</b> or share OTPs, bank details or your password.</li>
              <li><b>Too good to be true?</b> Unrealistically cheap deals are usually scams.</li>
              <li><b>Meet in a public place</b> and bring someone with you.</li>
            </ul>
          </div>
        </aside>

        {/* ── Main content ── */}
        <div className="pv-area-body">
          <section className="pv-card">
            <h2 className="pv-h2">Details</h2>
            <dl className="pv-facts">
              {facts.map(([icon, label, value]) => (
                <div key={label}>
                  <dt>{icon} {label}</dt>
                  <dd>
                    {value}
                    {label === "Location" && <> · <a href={mapHref} target="_blank" rel="noopener noreferrer">Get directions →</a></>}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          {p.attributes?.length > 0 && (
            <section className="pv-card">
              <h2 className="pv-h2">Attributes</h2>
              <dl className="pv-attrs">
                {p.attributes.map((a) => <div key={a.key}><dt>{a.label}</dt><dd>{String(a.value)}</dd></div>)}
              </dl>
            </section>
          )}

          <section className="pv-card">
            <h2 className="pv-h2">Description</h2>
            <div className={`pv-desc${longDesc && !more ? " clamp" : ""}`}>{p.description}</div>
            {longDesc && <button type="button" className="pv-link" onClick={() => setMore((m) => !m)}>{more ? "Show less" : "Read more"}</button>}
          </section>

          {seller && (
            <section className="pv-card pv-meet" id="meet-seller">
              <h2 className="pv-h2">Meet the seller</h2>
              <div className="pv-meet-row">
                <Avatar src={seller.avatar} name={sellerName} size={72} />
                <div className="pv-meet-info">
                  <div className="pv-meet-name">
                    {seller.username ? <Link to={`/seller/${seller.username}`}>{sellerName}</Link> : sellerName}
                    {seller.verified && <VerifiedBadge />}
                    {seller.accountType === "business" && <span className="pv-pro">Company</span>}
                  </div>
                  <Stars value={seller.rating.avg} count={seller.rating.count} size={14} />
                  {(seller.location.city || seller.location.state) && (
                    <div className="pv-muted pv-small"><FaMapMarkerAlt /> {[seller.location.city, place(seller.location.state)].filter(Boolean).join(", ")}</div>
                  )}
                  <div className="pv-meet-stats">
                    <span>{seller.activeListings} active {seller.activeListings === 1 ? "listing" : "listings"}</span>
                    {seller.memberSince && <span><FaClock /> Registered for {spanSince(seller.memberSince)}</span>}
                    {seller.lastActive && <span>Last online {longAgo(seller.lastActive)}</span>}
                  </div>
                </div>
                {seller.username && (
                  <div className="pv-meet-links">
                    <Link className="pv-btn" to={`/seller/${seller.username}`}>Seller's profile</Link>
                    <Link className="pv-btn" to={`/seller/${seller.username}`}>All seller items ({seller.activeListings})</Link>
                  </div>
                )}
              </div>
            </section>
          )}

          <Comments listingId={p._id} initialCount={stats.comments || 0} />

          <div className="pv-shortcuts">
            <button type="button" className="pv-link" onClick={() => window.print()}><FaPrint /> Print</button>
            <a className="pv-link" href={`mailto:?subject=${encodeURIComponent(p.title)}&body=${encodeURIComponent(`Take a look at this on GeneralMarket: ${url}`)}`}><FaEnvelope /> Send to friend</a>
            <button type="button" className="pv-link" onClick={share}><FaShareAlt /> Share</button>
            <span className="pv-share-icons">
              {shareLinks.map(([name, icon, href]) => (
                <a key={name} className={name} href={href} target="_blank" rel="noopener noreferrer" aria-label={`Share on ${name}`}>{icon}</a>
              ))}
            </span>
          </div>
        </div>
      </div>

      {/* ── Mobile sticky action bar ── */}
      {!isOwner && live && (phone || canMessage) && (
        <div className="pv-sticky" role="toolbar" aria-label="Contact seller">
          {phone && <a href={telHref(phone)} className="pv-sticky-btn"><FaPhoneAlt /><span>Call</span></a>}
          {phone && <a href={`sms:${phone}`} className="pv-sticky-btn"><FaSms /><span>SMS</span></a>}
          {phone && !seller && <a href={`https://wa.me/${waNumber(phone)}?text=${waText}`} className="pv-sticky-btn wa" target="_blank" rel="noopener noreferrer"><FaWhatsapp /><span>WhatsApp</span></a>}
          <button type="button" className="pv-sticky-btn" onClick={share}><FaShareAlt /><span>Share</span></button>
          {canMessage && <button type="button" className="pv-btn msg" onClick={() => open("message")}><FaComments /> Message seller</button>}
        </div>
      )}

      {/* ── Modals ── */}
      {(modal === "message" || modal === "offer") && (
        <ContactModal
          mode={modal} p={p} seller={seller}
          onClose={() => setModal(null)}
          onOfferSent={() => { setModal(null); setFlash({ type: "success", text: "Offer sent! The seller will reply in your Offers and Messages." }); }}
        />
      )}
      {modal === "report" && <ReportModal listingId={p._id} onClose={() => setModal(null)} />}
    </div>
  );
}