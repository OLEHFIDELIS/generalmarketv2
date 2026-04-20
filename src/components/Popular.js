import React, { useEffect, useState } from "react";
import "./Popular.css";
import Item from "./Item";

const Popular = () => {
  const [popularProducts, setPopularProducts] = useState([]);

  useEffect(() => {
    fetch("/api/popular")
      .then((response) => response.json())
      .then((data) => setPopularProducts(data))
      .catch((err) => console.error("Error fetching popular:", err));
  }, []);

  return (
    <div className="popular">
      <div className="section-header">
        <div className="section-title-group">
          <h2>Popular Listings</h2>
          <p>The most viewed items right now</p>
        </div>
        <a href="#/all" className="section-link">View all →</a>
      </div>
      <div className="popular-item">
        {popularProducts.map((item, i) => (
          <Item
            key={i}
            id={item.id}
            name={item.title}
            images={item.images}
            new_price={item.price}
            address={item.address}
          />
        ))}
      </div>
    </div>
  );
};

export default Popular;