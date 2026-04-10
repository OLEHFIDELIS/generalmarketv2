import React, { useEffect, useState } from "react";
import "./NewCollections.css";
import Item from "./Item";

const NewCollections = () => {
  const [newCollection, setNewCollection] = useState([]);

  useEffect(() => {
    fetch("/api/newcollection")
      .then((response) => response.json())
      .then((data) => setNewCollection(data))
      .catch((error) => console.error("Fetch Error:", error));
  }, []);

  return (
    <div className="new-collections">
      <h1>NEW ITEMS</h1>
      <hr />
      <div className="collections">
        {newCollection.map((item, i) => (
          <Item
            key={i}
            id={item.id}
            name={item.title || item.name}
            images={item.images}   // FIXED
            new_price={item.price || item.new_price}
            old_price={item.old_price}
            address={item.address} // 🔥 FIXED — now passing address
          />
        ))}
      </div>
    </div>
  );
};

export default NewCollections;