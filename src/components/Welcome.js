import React from "react";
import "./Welcome.css";
import { useNavigate } from "react-router-dom";

const actions = [
  { emoji: "📤", label: "Post a Listing", sub: "Free & easy", path: "https://wa.me/+2348141846896", external: true, accent: "#f97316" },
  { emoji: "🔍", label: "Browse Listings", sub: "1000s of items", path: "/browse", accent: "#3b82f6" },
  { emoji: "👤", label: "My Account", sub: "Manage profile", path: "/login", accent: "#10b981" },
  { emoji: "💼", label: "For Business", sub: "Grow your sales", path: "/business", accent: "#8b5cf6" },
];

const Welcome = () => {
  const navigate = useNavigate();

  return (
    <div className="welcome-wrap">
      <div className="welcome-inner">
        <div className="welcome-text">
          <h3>Welcome to <strong>GeneralMarket</strong></h3>
          <p>Nigeria's trusted marketplace for buying and selling everything.</p>
        </div>
        <div className="welcome-actions">
          {actions.map((a, i) => (
            <div
              key={i}
              className="action-card"
              style={{ "--ac": a.accent }}
              onClick={() => a.external ? window.open(a.path, "_blank", "noopener,noreferrer") : navigate(a.path)}
            >
              <div className="ac-emoji">{a.emoji}</div>
              <div className="ac-text">
                <span className="ac-label">{a.label}</span>
                <span className="ac-sub">{a.sub}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Welcome;
