import React, { useState } from "react";
import "./Item.css";
import { Link } from "react-router-dom";
import { FaHeart, FaRegHeart } from "react-icons/fa";
import { GoLocation } from "react-icons/go";
import useFavorite from "../hooks/useFavorite";
import { priceText } from "../api";

const Item = ({ id, _id, name, images, new_price, priceType, old_price, address }) => {
  const firstImage = Array.isArray(images) && images.length > 0 ? images[0] : "";
  const initialImage = typeof firstImage === "string" && firstImage !== "" ? firstImage : "/placeholder.jpg";
  const [imgSrc, setImgSrc] = useState(initialImage);
  const { favorited: liked, toggle } = useFavorite(_id);

  return (
    <div className="item">
      <div className="item-img-wrap">
        <Link to={`/product/${id}`} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          <img
            src={imgSrc}
            alt={name || "Product"}
            className="item-img"
            onError={() => { if (imgSrc !== "/placeholder.jpg") setImgSrc("/placeholder.jpg"); }}
          />
        </Link>
        <button className="like-btn" onClick={(e) => { e.preventDefault(); if (_id) toggle(); }} aria-label={liked ? "Remove from favorites" : "Save listing"} aria-pressed={liked}>
          {liked ? <FaHeart className="liked" /> : <FaRegHeart />}
        </button>
      </div>

      <div className="item-info">
        <p className="item-name">{name}</p>
        {address && (
          <div className="item-location">
            <GoLocation size={11} /> <span>{address}</span>
          </div>
        )}
        <div className="item-prices">
          <span className="item-price-new">{priceText({ price: new_price, priceType })}</span>
          {old_price && <span className="item-price-old">₦{Number(old_price).toLocaleString()}</span>}
        </div>
      </div>
    </div>
  );
};

export default Item;