import React, { useContext, useState } from "react";
import "./NewNav.css";
import logo from "../Assets/gmarketlogo.png";
import cart_icon from "../Assets/cart_icon.png";
import { Link } from "react-router-dom";
import { ShopContext } from "../../Context/ShopContex";
import {
    FaPlus, FaSearch, FaSignInAlt, FaUserPlus,
    FaBuilding, FaMapMarkerAlt, FaInfoCircle, FaEnvelope
} from "react-icons/fa";

const NewNav = () => {
    const { getTotalCartItems } = useContext(ShopContext);
    const [open, setOpen] = useState(false);

    return (
        <div className="navbbar">

            {/* LEFT SIDE */}
            <div className="navright">
                <a className="logo" href="/">
                    <img src={logo} alt="logo" />
                </a>
                <div className="companies">Companies</div>
            </div>

            {/* RIGHT SIDE (Desktop) */}
            <div className="navleft">
                {localStorage.getItem("auth-token") ? (
                    <div
                        onClick={() => {
                            localStorage.removeItem("auth-token");
                            window.location.replace("/");
                        }}
                    >
                        Logout
                    </div>
                ) : (
                    <Link to="/login">
                        <div>Login</div>
                    </Link>
                )}

                <a href="/login">Register</a>

                <div>
                    <Link to="/cart">
                        <img src={cart_icon} alt="" />
                    </Link>
                    <div className="nav-cart-count">{getTotalCartItems()}</div>
                </div>

                <a href="">compass</a>
                <a className="publish" href="">Sell</a>
            </div>

            {/* MOBILE NAV */}
            <div className="nav-left">

                <div className="cart-items">
                    <Link to="/cart">
                        <img src={cart_icon} alt="" />
                    </Link>
                    <div className="nav-cart-count">{getTotalCartItems()}</div>
                </div>

                <a href="/login">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="28" height="28">
                        <path d="M384 336c-40.6 0-47.6-1.5-72.2
                     6.8-17.5 5.9-36.3 9.2-55.8 9.2s-38.3-3.3-55.8-9.2c-24.6-8.3-31.5-6.8-72.2-6.8C57.3 336 0 393.3 0 464v16c0 17.7 14.3 
                     32 32 32h448c17.7 0 32-14.3 32-32v-16c0-70.7-57.3-128-128-128zm80 128H48c0-21.4 8.3-41.5 23.4-56.6C86.5 392.3 106.6 
                     384 128 384c41.1 0 41-1.1 56.8 4.2 23 7.8 47 11.8 71.2 11.8 24.2 0 48.2-4 71.2-11.8 15.8-5.4 15.7-4.2 56.8-4.2 
                     44.1 0 80 35.9 80 80zM256 320c88.4 0 160-71.6 160-160S344.4 0 256 0 96 71.6 96 160s71.6 160 160 160zm0-272c61.8 
                     0 112 50.2 112 112s-50.2 112-112 112-112-50.2-112-112S194.2 48 256 48z" />
                    </svg>
                </a>

                {/* Hamburger button */}
                <a onClick={() => setOpen(true)}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" width="28" height="28">
                        <path d="M442 114H6a6 6 0 0 1-6-6V84a6 6
                         0 0 1 6-6h436a6 6 0 0 1 6 6v24a6 6 0 0 1-6 6zm0 160H6a6 6 
                         0 0 1-6-6v-24a6 6 0 0 1 6-6h436a6 6 0 0 1 6 6v24a6 6 
                         0 0 1-6 6zm0 160H6a6 6 0 0 1-6-6v-24a6 6 0 0 1 6-6h436a6 
                         6 0 0 1 6 6v24a6 6 0 0 1-6 6z" />
                    </svg>
                </a>

                {/* MOBILE MENU OVERLAY */}
                {open && (
                    <div className="overlay" onClick={() => setOpen(false)}>
                        <div
                            className="menu-container"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="menu-header">
                                <h3>Welcome!</h3>
                                <button
                                    className="close-btn"
                                    onClick={() => setOpen(false)}
                                >
                                    ✕
                                </button>
                            </div>

                            <ul className="menu-list">

                                <li onClick={() => setOpen(false)}>
                                    <a
                                        style={{ textDecoration: "none", color: "#444" }}
                                        href="https://wa.me/+2348141846896"
                                    >
                                        <FaPlus /> Post an ad
                                    </a>
                                </li>

                                <li onClick={() => setOpen(false)}>
                                    <Link style={{ textDecoration: "none", color: "#444" }}>
                                        <FaSearch /> Search
                                    </Link>
                                </li>

                                <li onClick={() => setOpen(false)}>
                                    <Link
                                        style={{ textDecoration: "none", color: "#444" }}
                                        to="/login"
                                    >
                                        <FaSignInAlt /> Log in
                                    </Link>
                                </li>

                                <li onClick={() => setOpen(false)}>
                                    <Link
                                        style={{ textDecoration: "none", color: "#444" }}
                                        to="/login"
                                    >
                                        <FaUserPlus /> Register account
                                    </Link>
                                </li>

                                <li onClick={() => setOpen(false)}>
                                    <Link style={{ textDecoration: "none", color: "#444" }}>
                                        <FaBuilding /> Companies
                                    </Link>
                                </li>

                                <li onClick={() => setOpen(false)}>
                                    <Link style={{ textDecoration: "none", color: "#444" }}>
                                        <FaMapMarkerAlt /> Change location
                                    </Link>
                                </li>

                                <li onClick={() => setOpen(false)}>
                                    <FaInfoCircle /> Help
                                </li>

                                <li onClick={() => setOpen(false)}>
                                    <FaEnvelope /> Contact us
                                </li>

                                <li className="divider"></li>

                                <li onClick={() => setOpen(false)}>
                                    Switch to dark mode
                                </li>
                                <button></button>

                            </ul>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NewNav;