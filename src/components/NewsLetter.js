import React, { useState } from "react";
import "./NewsLetter.css";

const NewsLetter = () => {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email.trim()) { setDone(true); setEmail(""); }
  };

  return (
    <div className="newsletter-wrap">
      <div className="newsletter">
        <div className="nl-left">
          <span className="nl-tag">Stay Updated</span>
          <h2>Get the best deals<br />delivered to you</h2>
          <p>Subscribe and be the first to know about new listings, exclusive offers and market trends across Nigeria.</p>
        </div>
        <div className="nl-right">
          {done ? (
            <div className="nl-success">
              <span>🎉</span>
              <p>You're subscribed! Watch your inbox.</p>
            </div>
          ) : (
            <form className="nl-form" onSubmit={handleSubmit}>
              <input
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <button type="submit">Subscribe →</button>
            </form>
          )}
          <p className="nl-note">No spam ever. Unsubscribe anytime.</p>
        </div>
      </div>
    </div>
  );
};

export default NewsLetter;