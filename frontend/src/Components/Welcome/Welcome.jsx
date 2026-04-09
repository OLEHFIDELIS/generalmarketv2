import React from "react";
import "./Welcome.css";
import { useNavigate } from "react-router-dom";
import { FaPlusCircle, FaSearch, FaUserEdit, FaBriefcase } from "react-icons/fa";
import shoppingImg from "../Assets/welcome-actions.svg";

const Welcome = () => {
  const navigate = useNavigate();

  const actions = [
    { icon: <FaPlusCircle color="#e53935" />, label: "Add a new item", path: "https://wa.me/+2348141846896", external: true },
    { icon: <FaSearch color="#1e88e5" />, label: "Browse listings", path: "/browse" },
    { icon: <FaUserEdit color="#43a047" />, label: "Manage account", path: "/login" },
    { icon: <FaBriefcase color="#6d4c41" />, label: "Business users", path: "/business" },
  ];

  return (
    <div className="welcome-container">
      <div className="welcome-header">
        <img src={shoppingImg} alt="Shopping" className="welcome-image" />
        <div className="welcome-text">
          <h2>Welcome to GeneralMarket!</h2>
          <p>Thank you for using our classifieds website.</p>
          <p className="bold">What service would you like to use today?</p>
        </div>
      </div>

      <div className="welcome-actions">
        {actions.map((action, index) => (
          <div
            key={index}
            className="action-card"
            onClick={() => {
              if (action.external) {
                window.open(action.path, "_blank", "noopener,noreferrer");
              } else {
                navigate(action.path);
              }
            }}
          >
            <div className="icon">{action.icon}</div>
            <p>{action.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Welcome;
