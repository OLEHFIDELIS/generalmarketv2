import React, { createContext, useEffect, useState } from "react";

export const ShopContext = createContext(null);

const getDefaultCart = () => {
  let cart = {};
  for (let index = 0; index < 301; index++) { cart[index] = 0; }
  return cart;
};

const ShopContextProvider = (props) => {
  const [all_product, setAll_product] = useState([]);
  const [cartItems, setCartItems] = useState(getDefaultCart());

  useEffect(() => {
    fetch("/api/allproduct")
      .then((res) => res.json())
      .then((data) => setAll_product(data))
      .catch((err) => console.error("Error fetching products:", err));
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("auth-token");
    if (token) {
      fetch("/api/getcart", { method: "GET", headers: { "auth-token": token } })
        .then((res) => res.json())
        .then((data) => { if (data && data.cartData) setCartItems(data.cartData); })
        .catch(() => {
          const saved = localStorage.getItem("cartItems");
          setCartItems(saved ? JSON.parse(saved) : getDefaultCart());
        });
    } else {
      const saved = localStorage.getItem("cartItems");
      setCartItems(saved ? JSON.parse(saved) : getDefaultCart());
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("cartItems", JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = (itemId) => {
    setCartItems((prev) => ({ ...prev, [itemId]: prev[itemId] + 1 }));
    if (localStorage.getItem("auth-token")) {
      fetch("/api/addtocart", {
        method: "POST",
        headers: { Accept: "application/json", "auth-token": localStorage.getItem("auth-token"), "Content-Type": "application/json" },
        body: JSON.stringify({ itemId }),
      }).catch(console.error);
    }
  };

  const removeFromCart = (itemId) => {
    setCartItems((prev) => {
      const newCart = { ...prev };
      if (newCart[itemId] > 0) newCart[itemId] -= 1;
      return newCart;
    });
    if (localStorage.getItem("auth-token")) {
      fetch("/api/removefromcart", {
        method: "POST",
        headers: { Accept: "application/json", "auth-token": localStorage.getItem("auth-token"), "Content-Type": "application/json" },
        body: JSON.stringify({ itemId }),
      }).catch(console.error);
    }
  };

  const getTotalCartAmount = () => {
    let total = 0;
    for (const item in cartItems) {
      if (cartItems[item] > 0) {
        const itemInfo = all_product.find((p) => p.id === Number(item));
        if (itemInfo) total += itemInfo.price * cartItems[item];
      }
    }
    return total;
  };

  const getTotalCartItems = () => {
    let total = 0;
    for (const item in cartItems) { if (cartItems[item] > 0) total += cartItems[item]; }
    return total;
  };

  return (
    <ShopContext.Provider value={{ getTotalCartItems, getTotalCartAmount, all_product, cartItems, addToCart, removeFromCart }}>
      {props.children}
    </ShopContext.Provider>
  );
};

export default ShopContextProvider;
