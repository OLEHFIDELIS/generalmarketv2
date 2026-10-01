import React, { useState } from "react";
import { FaStar, FaRegStar, FaCheckCircle } from "react-icons/fa";
import "../../pages/Dashboard/Dashboard.css";

export const Avatar = ({ src, name = "?", size = 40 }) => (
  src
    ? <img className="dx-avatar" src={src} alt={name} style={{ width: size, height: size }} />
    : <div className="dx-avatar dx-avatar-ph" style={{ width: size, height: size, fontSize: size * 0.42 }}>{(name || "?")[0].toUpperCase()}</div>
);

export const Stars = ({ value = 0, count, size = 14, onChange }) => {
  const [hover, setHover] = useState(0);
  const shown = hover || Math.round(value);
  return (
    <span className="dx-stars" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => {
        const Icon = n <= shown ? FaStar : FaRegStar;
        return onChange
          ? <button type="button" key={n} className="dx-star-btn" onMouseEnter={() => setHover(n)} onClick={() => onChange(n)} aria-label={`${n} star${n > 1 ? "s" : ""}`}><Icon size={size + 6} /></button>
          : <Icon key={n} size={size} />;
      })}
      {count !== undefined && <em>{count ? `${Number(value).toFixed(1)} (${count})` : "No ratings yet"}</em>}
    </span>
  );
};

export const VerifiedBadge = () => <span className="dx-verified"><FaCheckCircle /> Verified</span>;

export const StatusBadge = ({ status }) => <span className={`dx-badge dx-badge-${status}`}>{status}</span>;

export const PageHead = ({ title, sub, children }) => (
  <div className="dx-pagehead">
    <div><h2>{title}</h2>{sub && <p>{sub}</p>}</div>
    {children && <div className="dx-pagehead-actions">{children}</div>}
  </div>
);

export const Empty = ({ icon, title, sub, children }) => (
  <div className="dx-empty">
    {icon && <div className="dx-empty-icon">{icon}</div>}
    <h3>{title}</h3>
    {sub && <p>{sub}</p>}
    {children}
  </div>
);

export const Alert = ({ type = "error", children }) => (children ? <div className={`dx-alert dx-alert-${type}`}>{children}</div> : null);
export const Spinner = () => <div className="dx-spinner-wrap"><span className="dx-spinner" /></div>;

export const Tabs = ({ tabs, value, onChange }) => (
  <div className="dx-tabs">
    {tabs.map((t) => (
      <button key={t.key} className={value === t.key ? "active" : ""} onClick={() => onChange(t.key)}>
        {t.label}{t.count !== undefined && <span>{t.count}</span>}
      </button>
    ))}
  </div>
);
