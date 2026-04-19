import React from "react";
import "./Category.css";
import { useNavigate } from "react-router-dom";

const categories = [
  { icon: "📱", label: "Electronics", color: "#3b82f6" },
  { icon: "🚗", label: "Vehicles", color: "#f97316" },
  { icon: "🏠", label: "Property", color: "#10b981" },
  { icon: "👗", label: "Fashion & Beauty", color: "#ec4899" },
  { icon: "💼", label: "Services", color: "#8b5cf6" },
  { icon: "👔", label: "Jobs", color: "#06b6d4" },
  { icon: "🎮", label: "Hobbies & Entertainment", color: "#f59e0b" },
  { icon: "🛋️", label: "Home & Furniture", color: "#84cc16" },
  { icon: "🌿", label: "Garden & Outdoor", color: "#22c55e" },
  { icon: "🚜", label: "Agriculture & Food", color: "#a3e635" },
  { icon: "👶", label: "Baby & Kids", color: "#fb923c" },
  { icon: "📦", label: "Misc & Others", color: "#94a3b8" },
  { icon: "🔌", label: "Gadgets & Accessories", color: "#818cf8" },
  { icon: "🔞", label: "Adult", color: "#f43f5e" },
];

const BrowseCategories = () => {
  const navigate = useNavigate();

  const handleNavigate = (label) => {
    const route = `/category/${label.toLowerCase().replace(/ & /g, "-").replace(/\s+/g, "-")}`;
    navigate(route);
  };

  return (
    <div className="browse-container">
      <div className="browse-header">
        <h2>Browse Categories</h2>
        <p className="subtitle">Find exactly what you're looking for</p>
      </div>

      <div className="categories-grid">
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
    </div>
  );
};

export default BrowseCategories;