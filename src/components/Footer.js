import React from "react";
import "./Footer.css";
import { FaWhatsapp, FaFacebookF, FaPinterestP, FaInstagram, FaTwitter } from "react-icons/fa";

const Footer = () => {
  return (
    <footer className="faji-footer">
      <div className="faji-top">
        <div className="faji-company">
          <div className="faji-logo">Generalmarket<span>.ng</span></div>
          <h3>Generalmarket</h3>
          <p className="faji-contact">
            Phone: <a href="tel:07025187910">08141846896</a><br />
            {/* Phone: <a href="tel:07025187910">09034808095</a><br /> */}
            Email: <a href="mailto:info@faji.ng">generalmarket@gmail.com</a><br />
            Along ESBS Bus Stop, Enugu
          </p>
          <p className="faji-desc">
            General Markert  is Nigeria’s trusted online classifieds platform, connecting buyers and sellers across the country.
            From jobs and services to vehicles, electronics, and real estate, General-Market makes it easy to find great deals 
            and grow your business. <br />Safe. Simple. Local.
          </p>
          <button className="dark-mode-btn">☾ Switch to dark mode</button>
        </div>
        <div  className="faji-links">
          <div className="faji-social">
          <h4>Social media</h4>
          <ul>
            <li><FaWhatsapp className="icon" /> Whatsapp</li>
            <li><FaFacebookF className="icon" /> Facebook</li>
            <li><FaPinterestP className="icon" /> Pinterest</li>
            <li><FaInstagram className="icon" /> Instagram</li>
            <li><FaTwitter className="icon" /> Twitter</li>
          </ul>
        </div>

        <div className="faji-info">
          <h4>Information</h4>
          <ul>
            <li>About Us</li>
            <li>How It Works</li>
            <li>Safety Tips</li>
            <li>FAQ</li>
            <li>Terms of Service</li>
            <li>Privacy Policy</li>
            <li>Refund Policy</li>
          </ul>
        </div>
      </div>
      </div>

      <div className="faji-middle">
        <p>
          Welcome to Generalmarke.com – your trusted platform for buying, selling, exchanging and trading across Nigeria. 
          Post free ads and reach thousands of buyers instantly.
        </p>
      </div>

      <div className="faji-bottom">
        <div className="faji-line"></div>
        <div className="faji-bottom-links">
          <div className="left">
            <a href="#">Contact us</a> &nbsp;|&nbsp;
            <a href="#">General Market</a> &nbsp;|&nbsp;
            <a href="">Android App</a>
          </div>
          <div className="right">
            Company Registration: RC 8626841<br />
            Copyright © 2025 GeneralMarket Digital Services Limited. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;