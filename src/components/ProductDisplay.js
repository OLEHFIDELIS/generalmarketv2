import React, { useState } from "react";
import {
  FaClock,
  FaEye,
  FaMapMarkerAlt,
  FaWhatsapp,
  FaPhoneAlt,
  FaRegCommentDots,
  FaStar,
  FaShieldAlt,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";
import "./ProductDisplay.css";

/**
 * ProductDetails (single-file component)
 * Props:
 *  - product: object matching your schema (optional; sample used if omitted)
 *  - related: array of product objects (optional; sample used if omitted)
 *
 * Product schema fields used:
 *  - images: [String] (required)
 *  - title, description, price, region, city, createdAt, id, condition, category, views
 *  - phone/email (optional)
 */

const formatDateShort = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const formatTime = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

export default function ProductDisplay({ product, related }) {
  const sample = {
    id: 1502,
    title: "foot mat",
    price: 9000,
    category: "Home & Furniture",
    condition: "New",
    country: "Nigeria",
    region: "Enugu",
    city: "Nike",
    views: 5,
    createdAt: "2025-11-10T12:33:00Z",
    images: [
      "https://images.unsplash.com/photo-1540574163026-643ea20ade25?w=1400&q=60&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=1400&q=60&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1400&q=60&auto=format&fit=crop",
    ],
    description:
      "A quality foot mat available in multiple sizes. Durable, non-slip backing, washable. Perfect for home and office.",
    phone: "+2348012345678",
    email: "seller@example.com",
    user: { username: "chinelo jessy", avatar: null },
  };

  const p = product || sample;
  // const relatedProducts = related || sampleRelated();

  const [mainIndex, setMainIndex] = useState(0);

  const prev = () => setMainIndex((i) => (i - 1 + p.images.length) % p.images.length);
  const next = () => setMainIndex((i) => (i + 1) % p.images.length);

  return (
    <div className="pd-wrapper">
      <div className="pd-container">
        {/* TOP ROW: gallery + seller card */}
        <div className="pd-top">
          <div className="pd-gallery">
            <div className="pd-main-image-wrap">
              <img className="pd-main-img" src={p.images[mainIndex]} alt={`${p.title} ${mainIndex + 1}`} />
              <div className="pd-image-controls">
                <button className="pd-ctrl" onClick={prev} aria-label="Previous">
                  <FaChevronLeft />
                </button>
                <button className="pd-ctrl" onClick={next} aria-label="Next">
                  <FaChevronRight />
                </button>
                <div className="pd-images-count">
                  <FaRegCommentDots style={{ marginRight: 6 }} />
                  {p.images.length} images
                </div>
              </div>
            </div>

            <div className="pd-thumbs">
              {p.images.map((src, i) => (
                <button
                  key={i}
                  className={`pd-thumb-btn ${i === mainIndex ? "active" : ""}`}
                  onClick={() => setMainIndex(i)}
                  aria-label={`Show image ${i + 1}`}
                >
                  <img src={src} alt={`thumb-${i}`} />
                </button>
              ))}
            </div>
          </div>

          <aside className="pd-right">
            <div className="seller-card">
              <div className="seller-avatar">
                {p.user && p.user.avatar ? (
                  <img src={p.user.avatar} alt={p.user.username} />
                ) : (
                  <span className="avatar-initial">{(p.user && p.user.username ? p.user.username[0] : "U").toUpperCase()}</span>
                )}
              </div>

              <div className="seller-body">
                <div className="seller-name">{(p.user && (p.user.username || p.user.name)) || "Seller"}</div>
                <div className="seller-rating">
                  <FaStar className="icon-star" />
                  <FaStar className="icon-star" />
                  <FaStar className="icon-star" />
                  <FaStar className="icon-star" />
                  <FaStar className="icon-star muted" />
                  <span className="seller-rating-num"> (0.0)</span>
                </div>
                <button className="btn-primary full" onClick={() => window.open("https://wa.me/+2348141846896", "_blank")}>
                  <FaWhatsapp style={{ marginRight: 8 }} />
                  Send message
                </button>

                <button
                  className="btn-ghost full"
                  onClick={() => {
                    if (p.phone) navigator.clipboard?.writeText(p.phone);
                    alert(p.phone ? `Number copied: ${p.phone}` : "No phone number");
                  }}
                >
                  <FaPhoneAlt style={{ marginRight: 8 }} />
                  Show number
                </button>

                <div className="seller-last-online">
                  <FaClock style={{ marginRight: 8 }} />
                  Last online: {formatDateShort(p.createdAt)} {formatTime(p.createdAt)}
                </div>

                <button className="btn-chat full" onClick={() => window.open("https://wa.me/+2348141846896", "_blank")}>
                  <FaRegCommentDots style={{ marginRight: 8 }} />
                  Start chat
                </button>
              </div>
            </div>
          </aside>
        </div>

        {/* INFO: title, price, meta grid */}
        <div className="pd-info">
          <div className="pd-title-row">
            <h1 className="pd-title">{p.title}</h1>
            <div className="pd-price">₦{Number(p.price).toLocaleString()}</div>
          </div>

          <div className="pd-meta-grid">
            <div className="pd-meta-item">
              <small>Category</small>
              <div className="meta-value">{p.category || "—"}</div>
            </div>

            <div className="pd-meta-item">
              <small>
                <FaClock /> Published
              </small>
              <div className="meta-value">{formatDateShort(p.createdAt)} {formatTime(p.createdAt)}</div>
            </div>

            <div className="pd-meta-item">
              <small>Condition</small>
              <div className="meta-value">{p.condition || "—"}</div>
            </div>

            <div className="pd-meta-item">
              <small>
                <FaMapMarkerAlt /> Location
              </small>
              <div className="meta-value">{p.city || p.region || p.country || "—"}</div>
            </div>

            <div className="pd-meta-item">
              <small>
                <FaEye /> Views
              </small>
              <div className="meta-value">{p.views ?? 0}</div>
            </div>

            <div className="pd-meta-item id">
              <small>ID</small>
              <div className="meta-value">{p.id}</div>
            </div>
          </div>

          <div className="pd-actions-row">
            <button className="btn-whatsapp" onClick={() => window.open("https://wa.me/+2348141846896", "_blank")}>
              <FaWhatsapp style={{ marginRight: 8 }} />
              WhatsApp Seller
            </button>
            <button className="btn-rate"><FaStar /> Rate this user</button>
          </div>
        </div>

        {/* SAFETY WARNINGS */}
        <div className="pd-warnings">
          <div className="pd-warn-title"><FaShieldAlt style={{ marginRight: 8 }} /> Stay Safe! Important Warnings</div>
          <ul className="pd-warning-list">
            <li>Never send a deposit to a bank account before meeting the seller in person and signing a proper purchase agreement.</li>
            <li><strong>More Safety Tips</strong></li>
            <li>Meet in a public place: Choose a safe, open location like a police station or mall.</li>
            <li>Bring someone with you: Never meet alone if you can avoid it.</li>
            <li>Verify the item before paying: Check the condition and details carefully.</li>
            <li>Don't share financial info: Never give out bank details or sensitive data.</li>
          </ul>
        </div>

        {/* DESCRIPTION + MEET SELLER */}
        <div className="pd-lower-grid">
          <div className="pd-description">
            <h3>Description</h3>
            <p>{p.description}</p>

            <div className="pd-comments">
              <h4><FaRegCommentDots style={{ marginRight: 8 }} /> Comments (0)</h4>
              <p>No comments has been added yet</p>
            </div>
          </div>

          <div className="pd-meet-seller">
            <h3>Meet the seller</h3>
            <div className="meet-card">
              <div className="meet-avatar">
                {p.user && p.user.avatar ? (
                  <img src={p.user.avatar} alt={p.user.username} />
                ) : (
                  <span className="avatar-initial big">{(p.user && p.user.username ? p.user.username[0] : "U").toUpperCase()}</span>
                )}
              </div>

              <div className="meet-body">
                <div className="meet-name">{(p.user && (p.user.username || p.user.name)) || "Seller"}</div>
                <div className="meet-sub">21 active listings &nbsp; • &nbsp; Personal seller</div>
                <div className="meet-registered">Registered for {formatDateShort(p.createdAt)}</div>

                <div className="meet-actions">
                  <button className="btn-ghost small">Seller's profile</button>
                  <button className="btn-ghost small">All seller items (21)</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RELATED ITEMS */}

      </div>
    </div>
  );
}

