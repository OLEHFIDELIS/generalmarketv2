import React, { useEffect, useState } from "react";
import "./NewCollections.css";
import Item from "./Item";

const NewCollections = () => {
  const [newCollection, setNewCollection] = useState([]);

  useEffect(() => {
    fetch("/api/newcollection")
      .then((res) => res.json())
      .then((data) => setNewCollection(data))
      .catch((err) => console.error("Fetch Error:", err));
  }, []);

  return (
    <div className="new-collections">
      <div className="section-header">
        <div className="section-title-group">
          <h2>Newest Listings</h2>
          <p>Just added — be the first to grab them</p>
        </div>
        <a href="#/all" className="section-link">View all →</a>
      </div>
      <div className="collections">
        {newCollection.map((item, i) => (
          <Item
            key={i}
            id={item.id}
            name={item.title || item.name}
            images={item.images}
            new_price={item.price || item.new_price}
            old_price={item.old_price}
            address={item.address}
          />
        ))}
      </div>
    </div>
  );
};

export default NewCollections;