import React, { useState, useEffect, useCallback } from "react";
import {
  FaClock, FaEye, FaMapMarkerAlt, FaWhatsapp,
  FaPhoneAlt, FaRegCommentDots, FaStar, FaShieldAlt,
  FaChevronLeft, FaChevronRight, FaShareAlt,
  FaHeart, FaCheckCircle, FaExpand, FaTimes, FaHome, FaTag
} from "react-icons/fa";
import "./ProductDisplay.css";

const fmt = (iso) => {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};

export default function ProductDisplay({ product }) {
  const p = product || {};
  const images = Array.isArray(p.images) && p.images.length > 0 ? p.images : ["/placeholder.jpg"];
  const [mainIndex, setMainIndex] = useState(0);
  const [liked, setLiked] = useState(false);
  const [phoneRevealed, setPhoneRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  const [lbIndex, setLbIndex] = useState(0);

  const prev = () => setMainIndex((i) => (i - 1 + images.length) % images.length);
  const next = () => setMainIndex((i) => (i + 1) % images.length);

  const openLightbox = (i) => { setLbIndex(i); setLightbox(true); };
  const lbPrev = useCallback(() => setLbIndex((i) => (i - 1 + images.length) % images.length), [images.length]);
  const lbNext = useCallback(() => setLbIndex((i) => (i + 1) % images.length), [images.length]);

  // keyboard navigation in lightbox
  useEffect(() => {
    if (!lightbox) return;
    const handler = (e) => {
      if (e.key === "ArrowLeft") lbPrev();
      if (e.key === "ArrowRight") lbNext();
      if (e.key === "Escape") setLightbox(false);
    };
    window.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [lightbox, lbPrev, lbNext]);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: p.title, url: window.location.href });
    } else {
      navigator.clipboard?.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const sellerInitial = (p.user?.username || p.email || "S")[0].toUpperCase();
  const categorySlug = (p.category || "").toLowerCase().replace(/ & /g, "-").replace(/\s+/g, "-");

  return (
    <>
      {/* ── LIGHTBOX ── */}
      {lightbox && (
        <div className="lb-overlay" onClick={() => setLightbox(false)}>
          <button className="lb-close" onClick={() => setLightbox(false)}><FaTimes /></button>

          <div className="lb-content" onClick={(e) => e.stopPropagation()}>
            <img
              className="lb-img"
              src={images[lbIndex]}
              alt={`${p.title} ${lbIndex + 1}`}
              onError={(e) => { e.target.src = "/placeholder.jpg"; }}
            />
          </div>

          {images.length > 1 && (
            <>
              <button className="lb-arrow lb-arrow-left" onClick={(e) => { e.stopPropagation(); lbPrev(); }}>
                <FaChevronLeft />
              </button>
              <button className="lb-arrow lb-arrow-right" onClick={(e) => { e.stopPropagation(); lbNext(); }}>
                <FaChevronRight />
              </button>
            </>
          )}

          <div className="lb-counter">{lbIndex + 1} / {images.length}</div>

          <div className="lb-thumbs" onClick={(e) => e.stopPropagation()}>
            {images.map((src, i) => (
              <button
                key={i}
                className={`lb-thumb ${i === lbIndex ? "active" : ""}`}
                onClick={() => setLbIndex(i)}
              >
                <img src={src} alt={`lb-thumb-${i}`} onError={(e) => { e.target.src = "/placeholder.jpg"; }} />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="pd-wrapper">
        <div className="pd-container">

          {/* ── BREADCRUMB ── */}
          <nav className="pd-breadcrumb" aria-label="breadcrumb">
            <a href="/" className="bc-item bc-link">
              <FaHome className="bc-home-icon" />
              <span>Home</span>
            </a>
            <FaChevronRight className="bc-sep" />
            <a href={`/#/category/${categorySlug}`} className="bc-item bc-link">
              <FaTag className="bc-tag-icon" />
              <span>{p.category || "Category"}</span>
            </a>
            <FaChevronRight className="bc-sep" />
            <span className="bc-item bc-current" title={p.title}>
              {p.title && p.title.length > 40 ? p.title.slice(0, 40) + "…" : p.title}
            </span>
          </nav>

          {/* ── MAIN GRID ── */}
          <div className="pd-grid">

            {/* LEFT */}
            <div className="pd-left">
              <div className="pd-main-wrap">
                <img
                  className="pd-main-img"
                  src={images[mainIndex]}
                  alt={p.title}
                  onError={(e) => { e.target.src = "/placeholder.jpg"; }}
                />
                {images.length > 1 && (
                  <>
                    <button className="pd-arrow pd-arrow-left" onClick={prev}><FaChevronLeft /></button>
                    <button className="pd-arrow pd-arrow-right" onClick={next}><FaChevronRight /></button>
                  </>
                )}
                <div className="pd-img-count">{mainIndex + 1} / {images.length}</div>
                <button className={`pd-like-btn ${liked ? "liked" : ""}`} onClick={() => setLiked(!liked)}>
                  <FaHeart />
                </button>
                <button className="pd-expand-btn" onClick={() => openLightbox(mainIndex)} title="View fullscreen">
                  <FaExpand />
                </button>
              </div>

              {images.length > 1 && (
                <div className="pd-thumbs">
                  {images.map((src, i) => (
                    <button
                      key={i}
                      className={`pd-thumb ${i === mainIndex ? "active" : ""}`}
                      onClick={() => setMainIndex(i)}
                    >
                      <img src={src} alt={`view-${i + 1}`} onError={(e) => { e.target.src = "/placeholder.jpg"; }} />
                    </button>
                  ))}
                </div>
              )}

              <div className="pd-desc-card">
                <h3 className="pd-section-title">Description</h3>
                <p className="pd-desc-text">{p.description || "No description provided."}</p>
              </div>

              <div className="pd-safety">
                <div className="pd-safety-title"><FaShieldAlt /> Safety Tips</div>
                <ul>
                  <li>Meet seller in a public place — e.g. a mall or police station</li>
                  <li>Inspect the item carefully before making any payment</li>
                  <li>Never transfer money before seeing the product in person</li>
                  <li>Don't share your bank details or OTP with anyone</li>
                </ul>
              </div>
            </div>

            {/* RIGHT */}
            <div className="pd-right">
              <div className="pd-title-card">
                <div className="pd-badges">
                  {p.condition && <span className="badge badge-condition">{p.condition}</span>}
                  {p.transaction && <span className="badge badge-tx">{p.transaction}</span>}
                </div>
                <h1 className="pd-title">{p.title}</h1>
                <div className="pd-price">₦{Number(p.price || 0).toLocaleString()}</div>

                <div className="pd-meta-row">
                  {(p.city || p.region) && (
                    <span><FaMapMarkerAlt className="meta-icon" /> {p.city}{p.city && p.region ? ", " : ""}{p.region}</span>
                  )}
                  {p.createdAt && (
                    <span><FaClock className="meta-icon" /> {fmt(p.createdAt)}</span>
                  )}
                  {p.views !== undefined && (
                    <span><FaEye className="meta-icon" /> {p.views} views</span>
                  )}
                </div>

                <div className="pd-share-row">
                  <button className="pd-share-btn" onClick={handleShare}>
                    <FaShareAlt /> {copied ? "Link copied!" : "Share listing"}
                  </button>
                </div>
              </div>

              <div className="pd-details-card">
                <h3 className="pd-section-title">Details</h3>
                <div className="pd-details-grid">
                  {p.category && <div className="pd-detail"><span>Category</span><strong>{p.category}</strong></div>}
                  {p.condition && <div className="pd-detail"><span>Condition</span><strong>{p.condition}</strong></div>}
                  {p.transaction && <div className="pd-detail"><span>Transaction</span><strong>{p.transaction}</strong></div>}
                  {p.region && <div className="pd-detail"><span>Region</span><strong>{p.region}</strong></div>}
                  {p.city && <div className="pd-detail"><span>City</span><strong>{p.city}</strong></div>}
                  {p.address && <div className="pd-detail"><span>Address</span><strong>{p.address}</strong></div>}
                  {p.zip && <div className="pd-detail"><span>ZIP</span><strong>{p.zip}</strong></div>}
                  {p.id && <div className="pd-detail"><span>Listing ID</span><strong>#{p.id}</strong></div>}
                </div>
              </div>

              <div className="pd-seller-card">
                <h3 className="pd-section-title">Seller</h3>
                <div className="seller-row">
                  <div className="seller-avatar">{sellerInitial}</div>
                  <div className="seller-info">
                    <div className="seller-name">{p.user?.username || p.email || "Verified Seller"}</div>
                    <div className="seller-stars">
                      {[1,2,3,4,5].map(s => <FaStar key={s} className={s <= 4 ? "star-on" : "star-off"} />)}
                      <span className="star-count">(4.0)</span>
                    </div>
                    <div className="seller-verified"><FaCheckCircle className="verified-icon" /> Verified seller</div>
                  </div>
                </div>

                <div className="seller-ctas">
                  <a
                    href={`https://wa.me/${(p.phone || "+2348141846896").replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="cta-whatsapp"
                  >
                    <FaWhatsapp /> WhatsApp Seller
                  </a>
                  <button className="cta-phone" onClick={() => setPhoneRevealed(true)}>
                    <FaPhoneAlt />
                    {phoneRevealed ? (p.phone || "No number provided") : "Reveal Phone Number"}
                  </button>
                </div>

                {p.email && (
                  <div className="seller-email">
                    <FaRegCommentDots className="meta-icon" /> {p.email}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="pd-related-wrap">
            <h2 className="pd-related-title">You may also like</h2>
            <div id="related-products-slot" />
          </div>
        </div>
      </div>
    </>
  );
}

