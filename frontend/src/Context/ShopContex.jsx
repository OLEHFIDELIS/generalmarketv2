// import React, { createContext, useEffect, useState } from "react";

// export const ShopContext = createContext(null);

// const getDefaultCart = () => {
//     let cart = {};
//     for (let index = 0; index < 300 + 1; index++) {
//         cart[index] = 0;
//     }
//     return cart;
// };

// const ShopContextProvider = (props) => {
//     const [all_product, setAll_product] = useState([]);

//     // ✅ Load cart from localStorage if available
//     const [cartItems, setCartItems] = useState(() => {
//         const savedCart = localStorage.getItem("cartItems");
//         return savedCart ? JSON.parse(savedCart) : getDefaultCart();
//     });

//     // ✅ Save cart to localStorage whenever it changes
//     useEffect(() => {
//         localStorage.setItem("cartItems", JSON.stringify(cartItems));
//     }, [cartItems]);

//     useEffect(() => {
//         fetch("http://localhost:4000/allproduct")
//             .then((response) => response.json())
//             .then((data) => setAll_product(data));
//     }, []);

//     const addToCart = (itemId) => {
//         setCartItems((prev) => ({ ...prev, [itemId]: prev[itemId] + 1 }));

//         if (localStorage.getItem("auth-token")) {
//             fetch("http://localhost:4000/addtocart", {
//                 method: "POST",
//                 headers: {
//                     Accept: "application/form-data",
//                     "auth-token": `${localStorage.getItem("auth-token")}`,
//                     "Content-Type": "application/json",
//                 },
//                 body: JSON.stringify({ itemId: itemId }),
//             })
//                 .then((response) => response.json())
//                 .then((data) => console.log(data));
//         }
//     };

//     const removeFromCart = (itemId) => {
//         setCartItems((prev) => {
//             const newCart = { ...prev };
//             if (newCart[itemId] > 0) {
//                 newCart[itemId] -= 1;
//             }
//             return newCart;
//         });

//         if (localStorage.getItem("auth-token")) {
//             fetch("http://localhost:4000/removefromcart", {
//                 method: "POST",
//                 headers: {
//                     Accept: "application/form-data",
//                     "auth-token": `${localStorage.getItem("auth-token")}`,
//                     "Content-Type": "application/json",
//                 },
//                 body: JSON.stringify({ itemId: itemId }),
//             })
//                 .then((response) => response.json())
//                 .then((data) => console.log(data));
//         }
//     };

//     const getTotalCartAmount = () => {
//         let totalAmount = 0;
//         for (const item in cartItems) {
//             if (cartItems[item] > 0) {
//                 let itemInfo = all_product.find((product) => product.id === Number(item));
//                 if (itemInfo) {
//                     totalAmount += itemInfo.new_price * cartItems[item];
//                 }
//             }
//         }
//         return totalAmount;
//     };

//     const getTotalCartItems = () => {
//         let totalItem = 0;
//         for (const item in cartItems) {
//             if (cartItems[item] > 0) {
//                 totalItem += cartItems[item];
//             }
//         }
//         return totalItem;
//     };

//     const contextValue = {
//         getTotalCartItems,
//         getTotalCartAmount,
//         all_product,
//         cartItems,
//         addToCart,
//         removeFromCart,
//     };

//     return <ShopContext.Provider value={contextValue}>{props.children}</ShopContext.Provider>;
// };

// export default ShopContextProvider;




import React, { createContext, useEffect, useState } from "react";

export const ShopContext = createContext(null);

const getDefaultCart = () => {
  let cart = {};
  for (let index = 0; index < 300 + 1; index++) {
    cart[index] = 0;
  }
  return cart;
};

const ShopContextProvider = (props) => {
  const [all_product, setAll_product] = useState([]);

  const [cartItems, setCartItems] = useState(getDefaultCart());
  const [loading, setLoading] = useState(true);

  // ✅ Load products
  useEffect(() => {
    fetch(`${process.env.REACT_APP_API_URL}/allproduct`)
      .then((response) => response.json())
      .then((data) => setAll_product(data));
      setLoading(false);
  }, []);

  // ✅ Load cart on mount
  useEffect(() => {
    const token = localStorage.getItem("auth-token");

    if (token) {
      // Fetch user cart from backend
      fetch(`${process.env.REACT_APP_API_URL}/getcart`, {
        method: "GET",
        headers: {
          "auth-token": token,
        },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data && data.cartData) {
            setCartItems(data.cartData); // assuming backend sends { cartData: {...} }
          }
        })
        .catch((err) => {
          console.error("Error fetching user cart:", err);
          // fallback to localStorage if backend fails
          const savedCart = localStorage.getItem("cartItems");
          setCartItems(savedCart ? JSON.parse(savedCart) : getDefaultCart());
        });
    } else {
      // fallback to localStorage
      const savedCart = localStorage.getItem("cartItems");
      setCartItems(savedCart ? JSON.parse(savedCart) : getDefaultCart());
    }
  }, []);

  // ✅ Always sync cart to localStorage
  useEffect(() => {
    localStorage.setItem("cartItems", JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = (itemId) => {
    setCartItems((prev) => ({ ...prev, [itemId]: prev[itemId] + 1 }));

    if (localStorage.getItem("auth-token")) {
      fetch(`${process.env.REACT_APP_API_URL}/addtocart`, {
        method: "POST",
        headers: {
          Accept: "application/form-data",
          "auth-token": `${localStorage.getItem("auth-token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ itemId }),
      })
        .then((res) => res.json())
        .then((data) => console.log("Cart updated:", data))
        .catch((err) => console.error("Error syncing addToCart:", err));
    }
  };

  const removeFromCart = (itemId) => {
    setCartItems((prev) => {
      const newCart = { ...prev };
      if (newCart[itemId] > 0) {
        newCart[itemId] -= 1;
      }
      return newCart;
    });

    if (localStorage.getItem("auth-token")) {
      fetch(`${process.env.REACT_APP_API_URL}/removefromcart`, {
        method: "POST",
        headers: {
          Accept: "application/form-data",
          "auth-token": `${localStorage.getItem("auth-token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ itemId }),
      })
        .then((res) => res.json())
        .then((data) => console.log("Cart updated:", data))
        .catch((err) => console.error("Error syncing removeFromCart:", err));
    }
  };

  const getTotalCartAmount = () => {
    let totalAmount = 0;
    for (const item in cartItems) {
      if (cartItems[item] > 0) {
        let itemInfo = all_product.find(
          (product) => product.id === Number(item)
        );
        if (itemInfo) {
          totalAmount += itemInfo.new_price * cartItems[item];
        }
      }
    }
    return totalAmount;
  };

  const getTotalCartItems = () => {
    let totalItem = 0;
    for (const item in cartItems) {
      if (cartItems[item] > 0) {
        totalItem += cartItems[item];
      }
    }
    return totalItem;
  };

  const contextValue = {
    getTotalCartItems,
    getTotalCartAmount,
    all_product,
    cartItems,
    addToCart,
    removeFromCart,
  };

  return (
    <ShopContext.Provider value={contextValue}>
      {props.children}
    </ShopContext.Provider>
  );
};

export default ShopContextProvider;