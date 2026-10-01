import React from "react";
import { Link } from "react-router-dom";
import { FaWhatsapp, FaShieldAlt } from "react-icons/fa";
import "./SellerProfile.css";

// Public contact page (linked from the dashboard "Contact us" card)
export default function Contact() {
  return (
    <div className="sp-wrap" style={{ maxWidth: 720 }}>
      <section className="dx-panel">
        <h3 style={{ fontSize: 20 }}>Contact us</h3>
        <p className="sp-text">Questions about your account, a listing, or a problem with another user? Message us and we'll get back to you as soon as we can.</p>
        <div className="dx-actions" style={{ marginTop: 16 }}>
          <a className="dx-btn dx-btn-primary" href="https://wa.me/2348141846896" target="_blank" rel="noopener noreferrer"><FaWhatsapp /> Chat on WhatsApp</a>
          <Link className="dx-btn dx-btn-ghost" to="/dashboard/messages">Go to my messages</Link>
        </div>
      </section>
      <section className="dx-panel">
        <h3><FaShieldAlt /> Staying safe</h3>
        <ul className="sp-text" style={{ paddingLeft: 18, lineHeight: 1.8 }}>
          <li>Meet in a public place and inspect items before paying.</li>
          <li>Never send money in advance to someone you haven't met.</li>
          <li>Never share your password, OTP or bank details with anyone — we will never ask for them.</li>
          <li>Report suspicious users or listings to us on WhatsApp.</li>
        </ul>
      </section>
    </div>
  );
}