import React, { useContext } from "react";
import "./Product.css";
import { ShopContext } from "../context/ShopContext";
import { useParams } from "react-router-dom";
import Breadcrum from "../components/Breadcrum";
import ProductDisplay from "../components/ProductDisplay";
import DescribtionBox from "../components/DescribtionBox";
import RelatedProduct from "../components/RelatedProduct";

const Product = () => {
  const { all_product, loading } = useContext(ShopContext);
  const { productId } = useParams();

  // ⏳ Wait for products to load
  if (!all_product || all_product.length === 0) {
    return null; // or loader
  }

  // ✅ SAFE FIND (supports id + _id)
  const product = all_product.find(
    (p) => String(p._id) === productId || p.id === Number(productId)
  );

  // ❗ Product not found
  if (!product) {
    return null; // or 404 page
  }

  return (
    <div>
      <Breadcrum product={product} />
      <ProductDisplay product={product} />
      <RelatedProduct productId={product._id} />
    </div>
  );
};

export default Product;
