import React, { useState } from "react";
import "./Item.css";
import { Link } from "react-router-dom";
import { FaHeart, FaRegHeart } from "react-icons/fa";
import { GoLocation } from "react-icons/go";

const Item = ({ id, name, images, new_price, old_price, address }) => {
  // --- IMAGE FIX ---
  const firstImage =
    Array.isArray(images) && images.length > 0 ? images[0] : "";

  const initialImage =
    typeof firstImage === "string" && firstImage !== ""
      ? firstImage
      : "/placeholder.jpg";

  const [imgSrc, setImgSrc] = useState(initialImage);

  const handleError = () => {
    if (imgSrc !== "/placeholder.jpg") {
      setImgSrc("/placeholder.jpg");
    }
  };

  // --- LIKE BUTTON LOGIC ---
  const [liked, setLiked] = useState(false);

  return (
    <div className="item">
      {/* PRODUCT IMAGE */}
      <Link
        to={`/product/${id}`}
        onClick={() =>
          window.scrollTo({
            top: 0,
            behavior: "smooth",
          })
        }
      >
        <img
          src={imgSrc}
          alt={name || "Product"}
          className="item-img"
          onError={handleError}
        />
      </Link>

      {/* PRODUCT NAME */}
      <p className="item-name">{name}</p>

      {/* LOCATION */}
      {address && (
        <div className="item-location">
          <GoLocation /> {address}
        </div>
      )}

      {/* PRICES */}
      <div className="item-prices">
        <div className="item-price-new">₦{Number(new_price).toLocaleString()}</div>
        {old_price && <div className="item-price-old">₦{old_price}</div>}
      </div>

      {/* LIKE BUTTON */}
      <div className="like-btn" onClick={() => setLiked(!liked)}>
        {liked ? <FaHeart className="liked" /> : <FaRegHeart />}
      </div>
    </div>
  );
};

export default Item;