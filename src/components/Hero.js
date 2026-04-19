import React, { useState } from "react";
import "./Hero.css";
import { useNavigate } from "react-router-dom";

const Hero = () => {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  const trending = ["Electronics", "Vehicles", "Property", "Fashion", "Jobs"];

  return (
    <section className="hero">
      <div className="hero-bg-shapes">
        <div className="shape shape-1" />
        <div className="shape shape-2" />
        <div className="shape shape-3" />
      </div>

      <div className="hero-content">
        <div className="hero-badge">🇳🇬 Nigeria's #1 Classifieds</div>
        <h1 className="hero-title">
          Buy. Sell. <span className="hero-accent">Trade.</span>
          <br />All in One Place.
        </h1>
        <p className="hero-subtitle">
          Discover thousands of listings across Nigeria — electronics, vehicles,
          property, jobs and more.
        </p>

        <form className="hero-search" onSubmit={handleSearch}>
          <div className="search-box">
            <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="What are you looking for?"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button type="submit">Search</button>
          </div>
        </form>

        <div className="hero-trending">
          <span className="trending-label">Trending:</span>
          {trending.map((t) => (
            <span
              key={t}
              className="trending-tag"
              onClick={() => navigate(`/category/${t.toLowerCase().replace(/ & /g, "-").replace(/ /g, "-")}`)}
            >
              {t}
            </span>
          ))}
        </div>
      </div>

      <div className="hero-stats">
        <div className="stat"><span className="stat-num">50K+</span><span className="stat-label">Active Listings</span></div>
        <div className="stat-divider" />
        <div className="stat"><span className="stat-num">20K+</span><span className="stat-label">Happy Buyers</span></div>
        <div className="stat-divider" />
        <div className="stat"><span className="stat-num">36</span><span className="stat-label">States Covered</span></div>
      </div>
    </section>
  );
};

export default Hero;