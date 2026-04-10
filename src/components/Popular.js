import React, { useEffect, useState } from "react";
import "./Popular.css";
import Item from "./Item";

const Popular = () => {
  const [popularProducts, setPopularProducts] = useState([]);


  useEffect(() => {
    fetch("/api/popular")
      .then((response) => response.json())
      .then((data) => setPopularProducts(data));
  }, []);

  return (
    <div className="popular">
      <h1>POPULAR ITEMS</h1>
      <hr />
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