import React, { useEffect, useState } from "react";
import "./RelatedProduct.css";
import Item from "../Items/Item";

const RelatedProduct = ({ productId }) => {
  const [related, setRelated] = useState([]);

  useEffect(() => {
    if (!productId) return;

    fetch(`${process.env.REACT_APP_API_URL}/related-products/${productId}`)
      .then(res => res.json())
      .then(data => setRelated(data))
      .catch(err => console.log(err));
  }, [productId]);

  return (
    <div className="relatedproducts">
      <h1>Related Products</h1>
      <hr />

      <div className="relatedproducts-item">
        {related.length > 0 ? (
          related.map((item) => (
            <Item
              key={item._id}
              id={item.id}
              name={item.title}
              images={item.images}
              new_price={item.price}
              old_price={item.old_price}
              location={item.location}
            />
          ))
        ) : (
          <p>No related products found.</p>
        )}
      </div>
    </div>
  );
};

export default RelatedProduct;