import React, { useContext } from "react";
import "./CartItems.css";
import { ShopContext } from "../../Context/ShopContex";
import remove_icon from "../Assets/cart_cross_icon.png";

const CartItems = () => {
  const { getTotalCartAmount, all_product, cartItems, removeFromCart } =
    useContext(ShopContext);

  return (
    <div className="cartitems">
      <div className="cartitems-format-main">
        <p>Product</p>
        <p>Title</p>
        <p>Price</p>
        <p>Quantity</p>
        <p>Total</p>
        <p>Remove</p>
      </div>

      <hr />

      {all_product.map((item) => {
        if (cartItems[item.id] > 0) {
          const imageSrc =
            Array.isArray(item.images) && item.images.length > 0
              ? item.images[0]
              : "/placeholder.jpg";

          return (
            <div key={item.id}>
              <div className="cartitems-format cartitems-format-main">

                {/* PRODUCT IMAGE */}
                <img
                  src={imageSrc}
                  alt={item.title}
                  className="carticon-product-icon"
                />

                {/* Title */}
                <p>{item.title}</p>

                {/* Price */}
                <p>₦{item.price}</p>

                {/* Quantity */}
                <button className="cartitems-quantity">
                  {cartItems[item.id]}
                </button>

                {/* Total for item */}
                <p>₦{item.price * cartItems[item.id]}</p>

                {/* Remove */}
                <img
                  className="cartitems-remove-icon"
                  src={remove_icon}
                  alt="Remove"
                  onClick={() => removeFromCart(item.id)}
                />
              </div>

              <hr />
            </div>
          );
        }
        return null;
      })}

      {/* CART TOTAL SECTION */}
      <div className="cartitems-down">
        <div className="cartitems-total">
          <h1>Cart Totals</h1>
          <div>
            <div className="cartitems-total-item">
              <p>Subtotal</p>
              <p>₦{getTotalCartAmount()}</p>
            </div>

            <hr />

            <div className="cartitems-total-item">
              <p>Shipping Fee</p>
              <p>Free</p>
            </div>

            <hr />

            <div className="cartitems-total-item">
              <h3>Total</h3>
              <h3>₦{getTotalCartAmount()}</h3>
            </div>
          </div>

          <button>PROCEED TO CHECKOUT</button>
        </div>

        <div className="cartitems-promocode">
          <p>If you have a promo code, enter it here:</p>
          <div className="cartitems-promobox">
            <input type="text" placeholder="Promo code" />
            <button>Submit</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartItems;