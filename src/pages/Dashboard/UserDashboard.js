import React, { useContext, useState, useEffect } from "react";
import "./User.css";
import logo from "../../assets/gmarketlogo.png";
import { ShopContext } from "../../context/ShopContext";
import { useNavigate } from "react-router-dom";
import {
  FaHome, FaList, FaBell, FaUser, FaHeart,
  FaEnvelope, FaSignOutAlt, FaShoppingCart,
  FaExternalLinkAlt, FaCheckDouble, FaClock,
  FaExclamationTriangle, FaWhatsapp, FaShieldAlt,
  FaStar, FaChevronRight
} from "react-icons/fa";

const UserDashboard = () => {
  const { all_product, getTotalCartItems } = useContext(ShopContext);
  const navigate = useNavigate();
  const cartCount = getTotalCartItems();

  const token = localStorage.getItem("auth-token");
  const isLoggedIn = !!token;

  // Derive user info from token (basic decode)
  const [userEmail, setUserEmail] = useState("");
  useEffect(() => {
    if (!isLoggedIn) { navigate("/login"); return; }
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      setUserEmail(payload?.user?.email || "");
    } catch {}
  }, [isLoggedIn, navigate, token]);

  const userInitial = userEmail ? userEmail[0].toUpperCase() : "U";
  const userName = userEmail ? userEmail.split("@")[0] : "User";

  const handleLogout = () => {
    localStorage.removeItem("auth-token");
    window.location.replace("/");
  };

  // Stats
  const totalListings   = all_product?.length || 0;
  const myFavCount      = Number(localStorage.getItem("gm_fav_count") || 0);
  const cartTotal       = cartCount;

  const dashCards = [
    {
      icon: <FaCheckDouble />,
      color: "#10b981",
      bg: "#f0fdf4",
      label: "Active Listings",
      desc: "Browse all available listings",
      count: totalListings,
      action: () => navigate("/all"),
    },
    {
      icon: <FaShoppingCart />,
      color: "#f97316",
      bg: "#fff7ed",
      label: "My Cart",
      desc: "Items you've added to your cart",
      count: cartTotal,
      action: () => navigate("/cart"),
    },
    {
      icon: <FaHeart />,
      color: "#f43f5e",
      bg: "#fff1f2",
      label: "Saved Listings",
      desc: "Listings you've marked as favourite",
      count: myFavCount,
      action: () => navigate("/all"),
    },
    {
      icon: <FaBell />,
      color: "#8b5cf6",
      bg: "#f5f3ff",
      label: "Saved Searches",
      desc: "Get notified of new matching listings",
      count: 0,
      action: () => navigate("/all"),
    },
    {
      icon: <FaUser />,
      color: "#3b82f6",
      bg: "#eff6ff",
      label: "My Profile",
      desc: "Update your personal details",
      count: null,
      badge: "!",
      action: () => navigate("/login"),
    },
    {
      icon: <FaEnvelope />,
      color: "#06b6d4",
      bg: "#ecfeff",
      label: "Messages",
      desc: "Chat with buyers and sellers",
      count: 0,
      action: () => window.open("https://wa.me/+2348141846896", "_blank"),
    },
    {
      icon: <FaWhatsapp />,
      color: "#25d366",
      bg: "#f0fdf4",
      label: "Post a Free Ad",
      desc: "List your item for sale today",
      count: null,
      action: () => window.open("https://wa.me/+2348141846896", "_blank"),
    },
    {
      icon: <FaShieldAlt />,
      color: "#f59e0b",
      bg: "#fffbeb",
      label: "Safety Tips",
      desc: "Stay safe when buying and selling",
      count: null,
      action: () => navigate("/all"),
    },
    {
      icon: <FaStar />,
      color: "#f97316",
      bg: "#fff7ed",
      label: "Browse All",
      desc: "Explore thousands of listings",
      count: null,
      action: () => navigate("/all"),
    },
    {
      icon: <FaSignOutAlt />,
      color: "#ef4444",
      bg: "#fef2f2",
      label: "Logout",
      desc: "Sign out of your account",
      count: null,
      action: handleLogout,
    },
  ];

  const menuItems = [
    { icon: <FaHome />,        label: "Home",        action: () => navigate("/")       },
    { icon: <FaList />,        label: "All Listings", action: () => navigate("/all")   },
    { icon: <FaShoppingCart />,label: "Cart",        action: () => navigate("/cart")   },
    { icon: <FaUser />,        label: "Profile",     action: () => navigate("/login")  },
    { icon: <FaSignOutAlt />,  label: "Logout",      action: handleLogout              },
  ];

  if (!isLoggedIn) return null;

  return (
    <div className="ud-wrapper">

      {/* ── Top header ── */}
      <div className="ud-header">
        <div className="ud-header-inner">
          <div className="ud-user-row">
            <div className="ud-avatar">{userInitial}</div>
            <div className="ud-user-info">
              <h1 className="ud-greeting">Hi, <span>{userName}</span>! 👋</h1>
              <p className="ud-subtext">Manage your listings, cart and profile</p>
            </div>
            <a
              href="https://wa.me/+2348141846896"
              target="_blank"
              rel="noopener noreferrer"
              className="ud-post-btn"
            >
              + Post Ad
            </a>
          </div>

          {/* Quick stats strip */}
          <div className="ud-quick-stats">
            <div className="ud-qs-item">
              <span className="ud-qs-num">{totalListings}</span>
              <span className="ud-qs-label">Total Listings</span>
            </div>
            <div className="ud-qs-div" />
            <div className="ud-qs-item">
              <span className="ud-qs-num">{cartTotal}</span>
              <span className="ud-qs-label">In Cart</span>
            </div>
            <div className="ud-qs-div" />
            <div className="ud-qs-item">
              <span className="ud-qs-num">{myFavCount}</span>
              <span className="ud-qs-label">Saved</span>
            </div>
          </div>
        </div>
      </div>

      <div className="ud-body">

        {/* ── Sidebar (desktop) ── */}
        <aside className="ud-sidebar">
          <div className="ud-sidebar-user">
            <div className="ud-sidebar-avatar">{userInitial}</div>
            <div>
              <div className="ud-sidebar-name">{userName}</div>
              <div className="ud-sidebar-email">{userEmail}</div>
            </div>
          </div>

          <nav className="ud-sidebar-nav">
            <a href="/" className="ud-sidebar-link">
              <FaHome /> Home
            </a>
            <span className="ud-sidebar-link active">
              <FaUser /> Dashboard
            </span>
            <span className="ud-sidebar-link" onClick={() => navigate("/all")}>
              <FaList /> All Listings
            </span>
            <span className="ud-sidebar-link" onClick={() => navigate("/cart")}>
              <FaShoppingCart /> My Cart
              {cartTotal > 0 && <span className="ud-sidebar-badge">{cartTotal}</span>}
            </span>
            <a
              href="https://wa.me/+2348141846896"
              target="_blank"
              rel="noopener noreferrer"
              className="ud-sidebar-link"
            >
              <FaWhatsapp /> Post a Free Ad
              <FaExternalLinkAlt className="ud-ext-icon" />
            </a>
            <span className="ud-sidebar-divider" />
            <span className="ud-sidebar-link ud-logout" onClick={handleLogout}>
              <FaSignOutAlt /> Logout
            </span>
          </nav>
        </aside>

        {/* ── Main content ── */}
        <main className="ud-main">
          <h2 className="ud-section-title">My Dashboard</h2>

          <div className="ud-cards-grid">
            {dashCards.map((card, i) => (
              <div
                key={i}
                className="ud-card"
                onClick={card.action}
                style={{ "--cc": card.color, "--cb": card.bg }}
              >
                <div className="ud-card-icon">
                  {card.icon}
                  {card.count !== null && card.count > 0 && (
                    <span className="ud-card-count">{card.count}</span>
                  )}
                  {card.badge && (
                    <span className="ud-card-badge">{card.badge}</span>
                  )}
                </div>
                <div className="ud-card-body">
                  <div className="ud-card-label">{card.label}</div>
                  <div className="ud-card-desc">{card.desc}</div>
                </div>
                <FaChevronRight className="ud-card-arrow" />
              </div>
            ))}
          </div>

          {/* Account info */}
          <div className="ud-account-card">
            <div className="ud-ac-header">
              <span className="ud-ac-title">Account Information</span>
            </div>
            <div className="ud-ac-body">
              <div className="ud-ac-row">
                <span className="ud-ac-label">Email</span>
                <span className="ud-ac-val">{userEmail}</span>
              </div>
              <div className="ud-ac-row">
                <span className="ud-ac-label">Username</span>
                <span className="ud-ac-val">{userName}</span>
              </div>
              <div className="ud-ac-row">
                <span className="ud-ac-label">Account Status</span>
                <span className="ud-ac-val ud-ac-active">✅ Active</span>
              </div>
              <div className="ud-ac-row">
                <span className="ud-ac-label">Member Since</span>
                <span className="ud-ac-val">2025</span>
              </div>
            </div>
          </div>

          {/* Safety tips */}
          <div className="ud-safety-card">
            <div className="ud-safety-icon">🛡️</div>
            <div>
              <div className="ud-safety-title">Stay Safe on GeneralMarket</div>
              <ul className="ud-safety-list">
                <li>Always meet sellers in a public place</li>
                <li>Never pay before inspecting the item</li>
                <li>Don't share your OTP or bank details</li>
              </ul>
            </div>
          </div>
        </main>
      </div>

      {/* ── Mobile bottom nav ── */}
      <nav className="ud-bottom-nav">
        {menuItems.map((item, i) => (
          <button key={i} className="ud-bn-item" onClick={item.action}>
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default UserDashboard;