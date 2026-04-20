import React, { useContext, useState } from "react";
import "./NewNav.css";
import logo from "../assets/gmarketlogo.png";
import { Link, useNavigate } from "react-router-dom";
import { ShopContext } from "../context/ShopContext";
import {
  FaPlus, FaSearch, FaSignInAlt, FaUserPlus,
  FaBuilding, FaMapMarkerAlt, FaInfoCircle,
  FaEnvelope, FaShoppingCart, FaTimes, FaBars, FaUser
} from "react-icons/fa";

const NewNav = () => {
  const { getTotalCartItems } = useContext(ShopContext);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const isLoggedIn = !!localStorage.getItem("auth-token");
  const cartCount = getTotalCartItems();

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query)}`);
      setSearchOpen(false);
      setQuery("");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("auth-token");
    window.location.replace("/");
  };

  return (
    <>
      <nav className="navbar">
        {/* ── Logo ── */}
        <Link to="/" className="navbar-logo">
          <img src={logo} alt="GeneralMarket" />
        </Link>

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
            <button className="nav-link" onClick={handleLogout}>Logout</button>
          ) : (
            <>
              <Link to="/login" className="nav-link">Login</Link>
              <Link to="/login" className="nav-link">Register</Link>
            </>
          )}

          <Link to="/cart" className="nav-cart">
            <FaShoppingCart size={20} />
            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </Link>

          <a
            href="https://wa.me/+2348141846896"
            target="_blank"
            rel="noopener noreferrer"
            className="nav-sell-btn"
          >
            + Post Ad
          </a>
        </div>

        {/* ── Mobile right icons ── */}
        <div className="navbar-mobile-icons">
          <button className="icon-btn" onClick={() => setSearchOpen(true)}>
            <FaSearch size={18} />
          </button>

          <Link to="/cart" className="nav-cart">
            <FaShoppingCart size={20} />
            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </Link>

          <button className="icon-btn" onClick={() => setMenuOpen(true)}>
            <FaBars size={22} />
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
              <li>
                <a
                  href="https://wa.me/+2348141846896"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMenuOpen(false)}
                >
                  <span className="mml-icon sell"><FaPlus /></span>
                  <span>Post a Free Ad</span>
                  <span className="mml-arrow">›</span>
                </a>
              </li>
              <li onClick={() => { setMenuOpen(false); setSearchOpen(true); }}>
                <span className="mml-icon"><FaSearch /></span>
                <span>Search</span>
                <span className="mml-arrow">›</span>
              </li>
              {isLoggedIn ? (
                <li onClick={() => { setMenuOpen(false); handleLogout(); }}>
                  <span className="mml-icon"><FaSignInAlt /></span>
                  <span>Logout</span>
                  <span className="mml-arrow">›</span>
                </li>
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

              <li>
                <span className="mml-icon"><FaBuilding /></span>
                <span>Companies</span>
                <span className="mml-arrow">›</span>
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
              <li>
                <span className="mml-icon"><FaEnvelope /></span>
                <span>Contact Us</span>
                <span className="mml-arrow">›</span>
              </li>
            </ul>
          </div>
        </div>
      )}
    </>
  );
};

export default NewNav;