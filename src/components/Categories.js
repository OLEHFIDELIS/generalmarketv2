import React, { useState } from "react";
import "./Category.css";
import { useNavigate } from "react-router-dom";

const categories = [
  { icon: "📱", label: "Electronics",            color: "#3b82f6" },
  { icon: "🚗", label: "Vehicles",               color: "#f97316" },
  { icon: "🏠", label: "Property",               color: "#10b981" },
  { icon: "👗", label: "Fashion & Beauty",        color: "#ec4899" },
  { icon: "💼", label: "Services",               color: "#8b5cf6" },
  { icon: "👔", label: "Jobs",                   color: "#06b6d4" },
  { icon: "🎮", label: "Hobbies & Entertainment",color: "#f59e0b" },
  { icon: "🛋️", label: "Home & Furniture",       color: "#84cc16" },
  { icon: "🌿", label: "Garden & Outdoor",        color: "#22c55e" },
  { icon: "🚜", label: "Agriculture & Food",      color: "#a3e635" },
  { icon: "👶", label: "Baby & Kids",             color: "#fb923c" },
  { icon: "📦", label: "Misc & Others",           color: "#94a3b8" },
  { icon: "🔌", label: "Gadgets & Accessories",   color: "#818cf8" },
  { icon: "🔞", label: "Adult",                  color: "#f43f5e" },
];

// On mobile: show 3 rows × 3 cols = 9 items initially
const MOBILE_INITIAL = 9;

const BrowseCategories = () => {
  const navigate = useNavigate();
  const [showAll, setShowAll] = useState(false);

  const handleNavigate = (label) => {
    const route = `/category/${label.toLowerCase().replace(/ & /g, "-").replace(/\s+/g, "-")}`;
    navigate(route);
  };

  // On desktop always show all; on mobile respect showAll state
  const visibleCategories = showAll ? categories : categories.slice(0, MOBILE_INITIAL);

  return (
    <div className="browse-container">
      <div className="browse-header">
        <h2>Browse Categories</h2>
        <p className="subtitle">Find exactly what you're looking for</p>
      </div>

      {/* Desktop: always show all */}
      <div className="categories-grid desktop-grid">
        {categories.map((cat, index) => (
          <div
            key={index}
            className="category-card"
            onClick={() => handleNavigate(cat.label)}
            style={{ "--cat-color": cat.color }}
          >
            <div className="cat-icon-wrap">
              <span className="cat-emoji">{cat.icon}</span>
            </div>
            <p>{cat.label}</p>
          </div>
        ))}
      </div>

      {/* Mobile: show limited then "View more" */}
      <div className="categories-grid mobile-grid">
        {visibleCategories.map((cat, index) => (
          <div
            key={index}
            className={`category-card ${!showAll && index >= MOBILE_INITIAL ? "cat-hidden" : ""}`}
            onClick={() => handleNavigate(cat.label)}
            style={{ "--cat-color": cat.color }}
          >
            <div className="cat-icon-wrap">
              <span className="cat-emoji">{cat.icon}</span>
            </div>
            <p>{cat.label}</p>
          </div>
        ))}
      </div>

      {/* View more / Show less button — mobile only */}
      <div className="cat-more-wrap">
        {!showAll ? (
          <button className="cat-more-btn" onClick={() => setShowAll(true)}>
            View more categories
            <span className="cat-more-arrow">↓</span>
            <span className="cat-more-count">
              +{categories.length - MOBILE_INITIAL} more
            </span>
          </button>
        ) : (
          <button className="cat-more-btn cat-less-btn" onClick={() => setShowAll(false)}>
            Show less
            <span className="cat-more-arrow">↑</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default BrowseCategories;