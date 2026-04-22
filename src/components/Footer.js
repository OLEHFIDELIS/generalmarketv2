import React from "react";
import "./Footer.css";
import logo from "../assets/gmarketlogo.png";
import {
  FaWhatsapp, FaFacebookF, FaInstagram, FaTwitter,
  FaMapMarkerAlt, FaPhoneAlt, FaEnvelope, FaArrowRight
} from "react-icons/fa";

const categories = [
  "Electronics","Vehicles","Property","Fashion & Beauty",
  "Services","Jobs","Home & Furniture","Gadgets & Accessories"
];

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="footer">

      {/* ── CTA strip ── */}
      <div className="footer-cta">
        <div className="footer-cta-inner">
          <div className="footer-cta-text">
            <h3>Ready to buy or sell?</h3>
            <p>Post your free ad today and reach thousands of buyers across Nigeria.</p>
          </div>
          <a
            href="https://wa.me/+2348141846896"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-cta-btn"
          >
            Post a Free Ad <FaArrowRight />
          </a>
        </div>
      </div>

      {/* ── Main footer ── */}
      <div className="footer-main">
        <div className="footer-inner">

          {/* Brand column */}
          <div className="footer-col footer-brand">
            <img src={logo} alt="GeneralMarket" className="footer-logo" />
            <p className="footer-desc">
              Nigeria's trusted online classifieds platform connecting buyers and sellers
              across all 36 states. Safe. Simple. Local.
            </p>
            <div className="footer-contact">
              <div className="fc-item">
                <FaPhoneAlt className="fc-icon" />
                <a href="tel:+2348141846896">+234 814 184 6896</a>
              </div>
              <div className="fc-item">
                <FaEnvelope className="fc-icon" />
                <a href="mailto:generalmarket@gmail.com">generalmarket@gmail.com</a>
              </div>
              <div className="fc-item">
                <FaMapMarkerAlt className="fc-icon" />
                <span>Along ESBS Bus Stop, Enugu, Nigeria</span>
              </div>
            </div>
            <div className="footer-social">
              <a href="https://wa.me/+2348141846896" target="_blank" rel="noopener noreferrer" className="social-btn whatsapp"><FaWhatsapp /></a>
              <a href="#" className="social-btn facebook"><FaFacebookF /></a>
              <a href="#" className="social-btn instagram"><FaInstagram /></a>
              <a href="#" className="social-btn twitter"><FaTwitter /></a>
            </div>
          </div>

          {/* Categories column */}
          <div className="footer-col">
            <h4 className="footer-col-title">Categories</h4>
            <ul className="footer-links">
              {categories.map(c => (
                <li key={c}>
                  <a href={`/#/category/${c.toLowerCase().replace(/ & /g, "-").replace(/\s+/g, "-")}`}>
                    {c}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick links column */}
          <div className="footer-col">
            <h4 className="footer-col-title">Quick Links</h4>
            <ul className="footer-links">
              <li><a href="/#/">Home</a></li>
              <li><a href="/#/all">All Listings</a></li>
              <li><a href="/#/login">Login / Register</a></li>
              <li><a href="/#/cart">My Cart</a></li>
              <li><a href="https://wa.me/+2348141846896" target="_blank" rel="noopener noreferrer">Post a Free Ad</a></li>
            </ul>
          </div>

          {/* Info column */}
          <div className="footer-col">
            <h4 className="footer-col-title">Information</h4>
            <ul className="footer-links">
              <li><a href="#">About Us</a></li>
              <li><a href="#">How It Works</a></li>
              <li><a href="#">Safety Tips</a></li>
              <li><a href="#">FAQ</a></li>
              <li><a href="#">Terms of Service</a></li>
              <li><a href="#">Privacy Policy</a></li>
              <li><a href="#">Contact Us</a></li>
            </ul>
          </div>

        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div className="footer-bottom">
        <div className="footer-bottom-inner">
          <p className="footer-copy">
            © {year} GeneralMarket Digital Services Limited. All rights reserved. · RC 8626841
          </p>
          <div className="footer-bottom-links">
            <a href="#">Terms</a>
            <a href="#">Privacy</a>
            <a href="#">Cookies</a>
          </div>
        </div>
      </div>

    </footer>
  );
};

export default Footer;