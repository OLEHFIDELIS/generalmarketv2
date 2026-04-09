import React, { useEffect, useState } from "react";
import "./ListProduct.css";
import cross_icon from "../../assets/cross_icon.png";

const ListProduct = () => {
  const [allProducts, setAllProducts] = useState([]);

  const fetchProducts = async () => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/allproduct`
      );
      const data = await res.json();
      setAllProducts(data);
    } catch (error) {
      console.error("Failed to fetch products:", error);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

const removeProduct = async (id) => {
  // console.log("DELETE CLICKED:", id);

  await fetch(`${import.meta.env.VITE_API_URL}/removeproduct`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id }), // ✅ SEND id (NOT _id)
  });

  fetchProducts(); // optional refresh
};

  return (
    <div className="list-product">
      <h1>All Product List</h1>

      <div className="listproduct-format-main">
        <p>Image</p>
        <p>Title</p>
        <p>Price</p>
        <p>Category</p>
        <p>Status</p>
        <p>Remove</p>
      </div>

      <div className="listproduct-allproducts">
        <hr />

        {allProducts.map((product) => (
          <React.Fragment key={product._id}>
            <div className="listproduct-format-main listproduct-format">
              {/* IMAGE */}
              <img
                src={product.images?.[0] || "/no-image.png"}
                alt={product.title}
                className="listproduct-product-icon"
                onError={(e) => {
                  e.target.src = "/no-image.png";
                }}
              />

              {/* TITLE */}
              <p>{product.title}</p>

              {/* PRICE */}
              <p>₦{Number(product.price).toLocaleString()}</p>

              {/* CATEGORY */}
              <p>{product.category}</p>

              {/* STATUS */}
              <p style={{ color: product.available ? "green" : "red" }}>
                {product.available ? "Available" : "Unavailable"}
              </p>

              {/* REMOVE */}
              <img
                src={cross_icon}
                alt="Remove"
                className="listproduct-remove-icon"
                onClick={() => removeProduct(product._id)}
              />
            </div>

            <hr />
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default ListProduct;