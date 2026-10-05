import React, { useCallback, useContext, useEffect, useState } from "react";
import { NavLink, Navigate, Outlet, useLocation, useMatch } from "react-router-dom";
import {
  FaTachometerAlt, FaList, FaPlusCircle, FaEnvelope, FaGavel, FaHeart, FaBell, FaStar, FaUser, FaBriefcase,
  FaIdCard, FaGift, FaBullhorn, FaLock, FaShoppingCart, FaSignOutAlt, FaExternalLinkAlt, FaChartLine } from "react-icons/fa";
import "./User.css";
import "./Dashboard.css";
import { api } from "../../api";
import { useAuth } from "../../context/AuthContext";
import { ShopContext } from "../../context/ShopContext";
import { Avatar, Spinner } from "../../components/dash/ui";

export default function DashboardLayout() {
  const { user, loading, logout } = useAuth();
  const location = useLocation();
  const { getTotalCartItems } = useContext(ShopContext);
  const [dash, setDash] = useState(null);
  const atIndex = !!useMatch({ path: "/dashboard", end: true });

  const reloadDash = useCallback(async () => {
    try { setDash(await api("/me/dashboard")); } catch { /* keep last known counts */ }
  }, []);

  useEffect(() => {
    if (!user) return;
    reloadDash();
    const t = setInterval(reloadDash, 30000); // keeps the unread / offer badges fresh
    return () => clearInterval(t);
  }, [user, reloadDash]);

  if (loading) return <Spinner />;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;

  const c = dash?.counts || {};
  const cart = getTotalCartItems();
  const links = [
    { to: "/dashboard", label: "Overview", icon: <FaTachometerAlt />, end: true },
    { to: "/dashboard/items", label: "My ads", icon: <FaList />, badge: c.pending || 0 },
    { to: "/dashboard/post", label: "Post an ad", icon: <FaPlusCircle /> },
    { to: "/dashboard/messages", label: "Messages", icon: <FaEnvelope />, badge: c.unreadMessages, alert: true },
    { to: "/dashboard/offers", label: "Offers", icon: <FaGavel />, badge: c.pendingOffers, alert: true },
    { to: "/dashboard/favorites", label: "Favorites", icon: <FaHeart /> },
    { to: "/dashboard/alerts", label: "Saved searches", icon: <FaBell /> },
    { to: "/dashboard/ratings", label: "Ratings", icon: <FaStar /> },
    { to: "/dashboard/profile", label: "My profile", icon: <FaUser />, badge: user.profileIssues?.length },
    { to: "/dashboard/business", label: "Business profile", icon: <FaBriefcase /> },
    { to: "/dashboard/verification", label: "ID verification", icon: <FaIdCard /> },
    { to: "/dashboard/referrals", label: "Referrals", icon: <FaGift /> },
    { to: "/dashboard/promotions", label: "Promotions", icon: <FaBullhorn /> },
    { to: "/dashboard/escrow", label: "Escrow", icon: <FaLock />, badge: c.escrowTodo, alert: true },
    ...(user.role === "admin" ? [{ to: "/dashboard/finance", label: "Finance (admin)", icon: <FaChartLine /> }] : []),
  ];

  return (
    <div className="ud-wrapper">
      {/* Mobile: horizontal pills */}
      <nav className="dx-mobile-nav">
        {links.map((l) => (
          <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => (isActive ? "active" : "")}>{l.label}{l.badge ? ` (${l.badge})` : ""}</NavLink>
        ))}
      </nav>

      {atIndex && (
        <div className="ud-header">
          <div className="ud-header-inner">
            <div className="ud-user-row">
              <div style={{ flexShrink: 0 }}><Avatar src={user.avatar} name={user.name} size={60} /></div>
              <div className="ud-user-info">
                <h1 className="ud-greeting">Hi, <span>{user.name?.split(" ")[0]}</span>! 👋</h1>
                <p className="ud-subtext">Manage your listings, messages and profile</p>
              </div>
              <NavLink to="/dashboard/post" className="ud-post-btn">+ Post Ad</NavLink>
            </div>
            <div className="ud-quick-stats">
              <div className="ud-qs-item"><span className="ud-qs-num">{c.active ?? "–"}</span><span className="ud-qs-label">Active ads</span></div>
              <div className="ud-qs-div" />
              <div className="ud-qs-item"><span className="ud-qs-num">{c.unreadMessages ?? "–"}</span><span className="ud-qs-label">Unread</span></div>
              <div className="ud-qs-div" />
              <div className="ud-qs-item"><span className="ud-qs-num">{c.favorites ?? "–"}</span><span className="ud-qs-label">Saved</span></div>
            </div>
          </div>
        </div>
      )}

      <div className="ud-body">
        <aside className="ud-sidebar">
          <div className="ud-sidebar-user">
            <Avatar src={user.avatar} name={user.name} size={42} />
            <div>
              <div className="ud-sidebar-name">{user.name}</div>
              <div className="ud-sidebar-email">{user.email}</div>
            </div>
          </div>
          <nav className="ud-sidebar-nav">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => `ud-sidebar-link${isActive ? " active" : ""}`}>
                {l.icon} {l.label}
                {l.badge ? <span className={`ud-sidebar-badge${l.alert ? " alert" : ""}`}>{l.badge}</span> : null}
              </NavLink>
            ))}
            <NavLink to="/cart" className="ud-sidebar-link"><FaShoppingCart /> My cart{cart > 0 && <span className="ud-sidebar-badge">{cart}</span>}</NavLink>
            {user.username && (
              <NavLink to={`/seller/${user.username}`} className="ud-sidebar-link"><FaUser /> Public profile <FaExternalLinkAlt className="ud-ext-icon" /></NavLink>
            )}
            <span className="ud-sidebar-divider" />
            <span className="ud-sidebar-link ud-logout" onClick={logout}><FaSignOutAlt /> Logout</span>
          </nav>
        </aside>

        <main className="ud-main">
          <Outlet context={{ dash, reloadDash }} />
        </main>
      </div>
    </div>
  );
}
