import React from "react";
import { Link } from "react-router-dom";
import "./Welcome.css";
import { useAuth } from "../context/AuthContext";

// Where each button goes. Logged-out visitors are sent to login and brought back to the same place afterwards.
const buildActions = (loggedIn) => {
  const gated = (path) => (loggedIn ? path : `/login?next=${encodeURIComponent(path)}`);
  return [
    { emoji: "📤", label: "Post a Listing",  sub: "Free & easy",     path: gated("/dashboard/post"),     accent: "#f97316" },
    { emoji: "🔍", label: "Browse Listings", sub: "1000s of items",  path: "/all",                       accent: "#3b82f6" },
    { emoji: "👤", label: "My Account",      sub: loggedIn ? "Open dashboard" : "Log in or sign up", path: gated("/dashboard"), accent: "#10b981" },
    { emoji: "💼", label: "For Business",    sub: "Grow your sales", path: gated("/dashboard/business"), accent: "#8b5cf6" },
  ];
};

const Welcome = () => {
  const { isLoggedIn, loading } = useAuth();
  const signedIn = isLoggedIn || loading;          // loading = saved token, profile still being fetched

  return (
    <div className="welcome-wrap">
      <div className="welcome-inner">
        <div className="welcome-text">
          <h3>Welcome to <strong>GeneralMarket</strong></h3>
          <p>Nigeria's trusted marketplace for buying and selling everything.</p>
        </div>
        <div className="welcome-actions">
          {buildActions(signedIn).map((a) => (
            <Link key={a.label} to={a.path} className="action-card" style={{ "--ac": a.accent }}>
              <div className="ac-emoji" aria-hidden="true">{a.emoji}</div>
              <div className="ac-text">
                <span className="ac-label">{a.label}</span>
                <span className="ac-sub">{a.sub}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Welcome;
