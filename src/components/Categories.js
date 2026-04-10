import React from "react";
import "./Category.css";
import { useNavigate } from "react-router-dom";
import {
  FaTv,
  FaCar,
  FaTshirt,
  FaBriefcase,
  FaUserTie,
  FaIndustry,
  FaBoxes,
  FaBuilding,
  FaCouch,
  FaGamepad,
  FaLeaf,
  FaTractor,
  FaBaby,
  FaVenusMars,
  FaPhone,
  FaFone
} from "react-icons/fa";

const BrowseCategories = () => {
  const navigate = useNavigate();

  const categories = [
    { icon: <FaTv />, label: "Electronics" },
    { icon: <FaCar />, label: "Vehicles" },
    { icon: <FaTshirt />, label: "Fashion & Beauty" },
    { icon: <FaBriefcase />, label: "Services" },
    { icon: <FaUserTie />, label: "Jobs" },
    { icon: <FaPhone />, label: "gadgets & accessories" },
    { icon: <FaBoxes />, label: "Misc & Others" },
    { icon: <FaBuilding />, label: "Property" },
    { icon: <FaCouch />, label: "Home & Furniture" },
    { icon: <FaGamepad />, label: "Hobbies & Entertainment" },
    { icon: <FaLeaf />, label: "Garden & Outdoor" },
    { icon: <FaTractor />, label: "Agriculture & Food" },
    { icon: <FaBaby />, label: "Baby & Kids" },
    { icon: <FaVenusMars />, label: "Adult" },
  ];

  // Convert label to route-friendly path (lowercase + hyphens)
  const handleNavigate = (label) => {
    const route = `/category/${label.toLowerCase().replace(/ & /g, "-").replace(/\s+/g, "-")}`;
    navigate(route);
  };

  return (
    <div className="browse-container">
      <h2>Browse categories</h2>
      <p className="subtitle">Select a category you are interested in</p>

      <div className="categories-grid">
        {categories.map((cat, index) => (
          <div
            key={index}
            className="category-card"
            onClick={() => handleNavigate(cat.label)}
          >
            <div className="icon">{cat.icon}</div>
            <p>{cat.label}</p>
          </div>
        ))}
      </div>

      <button className="browse-btn" onClick={() => navigate("/categories")}>
        Search in all categories
      </button>
    </div>
  );
};

export default BrowseCategories;