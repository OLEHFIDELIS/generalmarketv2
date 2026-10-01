import React, { useContext, useEffect, useRef, useState } from "react";
import "./NewNav.css";
import logo from "../assets/gmarketlogo.png";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ShopContext } from "../context/ShopContext";
import { useAuth } from "../context/AuthContext";
import { api } from "../api";
import {
  FaPlus, FaSearch, FaSignInAlt, FaUserPlus,
  FaBuilding, FaMapMarkerAlt, FaInfoCircle,
  FaEnvelope, FaShoppingCart, FaTimes, FaUser, FaRegUser, FaChevronDown,
  FaColumns, FaList, FaGavel, FaHeart, FaBell, FaEdit, FaBriefcase, FaIdCard, FaSignOutAlt
} from "react-icons/fa";

const NewNav = () => {
  const { getTotalCartItems } = useContext(ShopContext);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const { user, isLoggedIn, loading, logout } = useAuth();
  const cartCount = getTotalCartItems();
  const [unread, setUnread] = useState(0);
  const postHref = isLoggedIn || loading ? "/dashboard/post" : "/login?next=%2Fdashboard%2Fpost";

  // Account dropdown: closes on outside click, Esc, or route change
  const [acctOpen, setAcctOpen] = useState(false);
  const acctRef = useRef(null);
  const { pathname } = useLocation();
  useEffect(() => { setAcctOpen(false); }, [pathname]);
  useEffect(() => {
    if (!acctOpen) return;
    const onDown = (e) => { if (acctRef.current && !acctRef.current.contains(e.target)) setAcctOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setAcctOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [acctOpen]);
  const firstName = user?.name ? user.name.split(" ")[0] : "Account";

  // Unread-message badge (the dashboard has its own, faster poll)
  useEffect(() => {
    if (!isLoggedIn) { setUnread(0); return; }
    let live = true;
    const load = () => api("/me/unread-count").then((d) => live && setUnread(d.count)).catch(() => {});
    load();
    const t = setInterval(load, 60000);
    return () => { live = false; clearInterval(t); };
  }, [isLoggedIn]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query)}`);
      setSearchOpen(false);
      setQuery("");
    }
  };

  const handleLogout = logout;

  return (
    <>
      <nav className="navbar">
        {/* ── Logo ── */}
        <Link to="/" className="navbar-logo">
          <img src={logo} alt="GeneralMarket" />
        </Link>

        {/* ── Spacer ── */}
        <div className="navbar-spacer" />

        {/* ── Desktop search bar ── */}
        <form className="navbar-search" onSubmit={handleSearch}>
          <FaSearch className="ns-icon" />
          <input
            type="text"
            placeholder="Search listings..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="submit">Search</button>
        </form>

        {/* ── Desktop right links ── */}
        <div className="navbar-actions">
          {isLoggedIn ? (
            <>
              <Link to="/companies" className="nav-link">Companies</Link>
              <Link to="/dashboard/messages" className="nav-cart" aria-label="Messages">
                <FaEnvelope size={19} />
                {unread > 0 && <span className="cart-badge">{unread}</span>}
              </Link>
              <div className="acct" ref={acctRef}>
                <button
                  type="button" className="acct-trigger" aria-haspopup="menu" aria-expanded={acctOpen}
                  onClick={() => setAcctOpen((o) => !o)}
                >
                  {user?.avatar
                    ? <img className="acct-avatar" src={user.avatar} alt="" />
                    : <span className="acct-avatar acct-initial">{firstName[0].toUpperCase()}</span>}
                  <span className="acct-hi">Hi, <b>{firstName}</b>!</span>
                  <FaChevronDown className={`acct-caret${acctOpen ? " open" : ""}`} />
                </button>

                {acctOpen && (
                  <div className="acct-menu" role="menu">
                    <Link to="/dashboard" role="menuitem"><FaColumns /> Dashboard</Link>
                    <Link to="/dashboard/items" role="menuitem"><FaList /> My items</Link>
                    <Link to="/dashboard/messages" role="menuitem"><FaEnvelope /> Messages {unread > 0 && <em className="acct-badge">{unread}</em>}</Link>
                    <Link to="/dashboard/offers" role="menuitem"><FaGavel /> Offers</Link>
                    <Link to="/dashboard/favorites" role="menuitem"><FaHeart /> Favorite listings</Link>
                    <Link to="/dashboard/alerts" role="menuitem"><FaBell /> Saved searches</Link>
                    <div className="acct-sep" />
                    <Link to="/dashboard/profile" role="menuitem"><FaEdit /> My profile</Link>
                    <Link to="/dashboard/business" role="menuitem"><FaBriefcase /> Business profile</Link>
                    {user?.username && <Link to={`/seller/${user.username}`} role="menuitem"><FaIdCard /> Public profile</Link>}
                    <div className="acct-sep" />
                    <button type="button" role="menuitem" className="acct-logout" onClick={handleLogout}><FaSignOutAlt /> Logout</button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link to="/companies" className="nav-link">Companies</Link>
              <Link to="/login" className="nav-link">Login</Link>
              <Link to="/login" className="nav-link">Register</Link>
            </>
          )}

          <Link to="/cart" className="nav-cart">
            <FaShoppingCart size={20} />
            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </Link>

          <Link to={postHref} className="nav-sell-btn">
            + Post Ad
          </Link>
        </div>

        {/* ── Mobile right icons: account + hamburger (search & cart live in the menu) ── */}
        <div className="navbar-mobile-icons">
          <Link to={isLoggedIn ? "/dashboard" : "/login"} className="icon-btn m-acct" aria-label={isLoggedIn ? "My account" : "Log in"}>
            <FaRegUser size={26} />
            {unread > 0 && <span className="m-dot" />}
          </Link>

          <button className="icon-btn m-burger" onClick={() => setMenuOpen(true)} aria-label="Open menu">
            <span /><span /><span />
          </button>
        </div>
      </nav>

      {/* ── Mobile search overlay ── */}
      {searchOpen && (
        <div className="search-overlay" onClick={() => setSearchOpen(false)}>
          <div className="search-overlay-inner" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleSearch}>
              <FaSearch className="sol-icon" />
              <input
                autoFocus
                type="text"
                placeholder="Search listings..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button type="button" onClick={() => setSearchOpen(false)}>
                <FaTimes size={18} />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Mobile slide-up menu ── */}
      {menuOpen && (
        <div className="mob-overlay" onClick={() => setMenuOpen(false)}>
          <div className="mob-menu" onClick={(e) => e.stopPropagation()}>
            <div className="mob-menu-header">
              <img src={logo} alt="logo" className="mob-logo" />
              <button onClick={() => setMenuOpen(false)} className="mob-close">
                <FaTimes size={20} />
              </button>
            </div>

            <ul className="mob-menu-list">
              <li onClick={() => setMenuOpen(false)}>
                <Link to={postHref}>
                  <span className="mml-icon sell"><FaPlus /></span>
                  <span>Post a Free Ad</span>
                  <span className="mml-arrow">›</span>
                </Link>
              </li>
              <li onClick={() => { setMenuOpen(false); setSearchOpen(true); }}>
                <span className="mml-icon"><FaSearch /></span>
                <span>Search</span>
                <span className="mml-arrow">›</span>
              </li>
              {isLoggedIn ? (
                <>
                  <li onClick={() => setMenuOpen(false)}>
                    <Link to="/dashboard">
                      <span className="mml-icon"><FaUser /></span>
                      <span>My Account{user?.name ? ` (${user.name.split(" ")[0]})` : ""}</span>
                      <span className="mml-arrow">›</span>
                    </Link>
                  </li>
                  <li onClick={() => setMenuOpen(false)}>
                    <Link to="/dashboard/messages">
                      <span className="mml-icon"><FaEnvelope /></span>
                      <span>Messages {unread > 0 && `(${unread})`}</span>
                      <span className="mml-arrow">›</span>
                    </Link>
                  </li>
                  <li onClick={() => { setMenuOpen(false); handleLogout(); }}>
                    <span className="mml-icon"><FaSignInAlt /></span>
                    <span>Logout</span>
                    <span className="mml-arrow">›</span>
                  </li>
                </>
              ) : (
                <>
                  <li onClick={() => setMenuOpen(false)}>
                    <Link to="/login">
                      <span className="mml-icon"><FaSignInAlt /></span>
                      <span>Log In</span>
                      <span className="mml-arrow">›</span>
                    </Link>
                  </li>
                  <li onClick={() => setMenuOpen(false)}>
                    <Link to="/login">
                      <span className="mml-icon"><FaUserPlus /></span>
                      <span>Register Account</span>
                      <span className="mml-arrow">›</span>
                    </Link>
                  </li>
                </>
              )}
              <li onClick={() => setMenuOpen(false)}>
                <Link to="/cart">
                  <span className="mml-icon"><FaShoppingCart /></span>
                  <span>My Cart {cartCount > 0 && `(${cartCount})`}</span>
                  <span className="mml-arrow">›</span>
                </Link>
              </li>

              <li className="mml-divider" />

              <li onClick={() => setMenuOpen(false)}>
                <Link to="/companies">
                  <span className="mml-icon"><FaBuilding /></span>
                  <span>Companies</span>
                  <span className="mml-arrow">›</span>
                </Link>
              </li>
              <li>
                <span className="mml-icon"><FaMapMarkerAlt /></span>
                <span>Change Location</span>
                <span className="mml-arrow">›</span>
              </li>
              <li>
                <span className="mml-icon"><FaInfoCircle /></span>
                <span>Help</span>
                <span className="mml-arrow">›</span>
              </li>
              <li onClick={() => setMenuOpen(false)}>
                <Link to="/contact">
                  <span className="mml-icon"><FaEnvelope /></span>
                  <span>Contact Us</span>
                  <span className="mml-arrow">›</span>
                </Link>
              </li>
            </ul>
          </div>
        </div>
      )}
    </>
  );
};

export default NewNav;