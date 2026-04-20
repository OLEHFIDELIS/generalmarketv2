import React, { useEffect, useState } from "react";
import "./RelatedProduct.css";
import Item from "./Item";

const RelatedProduct = ({ productId }) => {
  const [related, setRelated] = useState([]);

  useEffect(() => {
    if (!productId) return;
    fetch(`/api/related-products/${productId}`)
      .then((res) => res.json())
      .then((data) => setRelated(data))
      .catch((err) => console.log(err));
  }, [productId]);

  if (related.length === 0) return null;

  return (
    <div className="related-wrap">
      <div className="related-grid">
        {related.map((item) => (
          <Item
            key={item._id}
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

export default RelatedProduct;