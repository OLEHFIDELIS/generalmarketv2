import React, { useState } from "react";
import "./Hero.css";

const Hero = () => {
  const [query, setQuery] = useState("");

  const handleSearch = (e) => {
    e.preventDefault();
    console.log("Search query:", query);
  };

  return (
    <section className="hero">
      <div className="hero-overlay"></div>
      <div className="hero-content">
        <h1 className="hero-title">Find Your Perfect Market Deal</h1>
        <p className="hero-subtitle">
          Search the best products, deals, and stores across G_market.com
        </p>
        <form className="hero-search" onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Search for products, stores or deals..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="submit">Search</button>
        </form>
      </div>
    </section>
  );
};

export default Hero;