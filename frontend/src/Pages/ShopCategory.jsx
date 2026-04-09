import React, { useContext } from "react";
import "./CSS/ShopCategory.css";
import { ShopContext } from "../Context/ShopContex";
import dropdown_icon from "../Components/Assets/dropdown_icon.png";
import Item from "../Components/Items/Item";

const ShopCategory = (props) => {
  const { all_product } = useContext(ShopContext);

  if (!all_product || all_product.length === 0) {
  return null; // or loader
 }

  // Normalize category text
  const currentCategory = props.category.toLowerCase();

  return (
    <div className="shop-category">
      <img className="shopcategory-banner" src={props.banner} alt="" />

      <div className="shopcategory-indexSort">
        <p>
          <span>Showing {all_product.length}</span> products
        </p>
        <div className="Shopcategory-sort">
          sort by <img src={dropdown_icon} alt="" />
        </div>
      </div>

      <div className="shopcategory-products">
        {all_product
          .filter((item) =>
            item.category &&
            item.category.toLowerCase() === currentCategory
          )
          .map((item, i) => (
            <Item
              key={i}
              id={item.id}
              name={item.title}
              images={item.images}       // ✅ REAL backend image array
              new_price={item.price}     // ✅ Correct price
              old_price={null}
              address={item.address}     // ✅ Pass address
            />
          ))}
      </div>

      <div className="shopcategory-loadmore">Explore More</div>
    </div>
  );
};

export default ShopCategory;