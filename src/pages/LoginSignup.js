import React, { useState } from "react";
import "./LoginSignup.css";
import logo from "../assets/gmarketlogo.png";

const LoginSignup = () => {
  const [state,    setState]   = useState("Login");
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [showPass, setShowPass] = useState(false);
  const [agreed,   setAgreed]   = useState(false);

  const change = (e) => {
    setFormData(p => ({ ...p, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (state === "Sign Up" && !agreed) {
      setError("Please agree to the terms to continue."); return;
    }
    setLoading(true);
    setError("");
    try {
      const endpoint = state === "Login" ? "/api/login" : "/api/signup";
      const res  = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem("auth-token", data.token);
        window.location.replace("/");
      } else {
        setError(data.errors || data.error || "Something went wrong. Please try again.");
      }
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const toggle = () => {
    setState(s => s === "Login" ? "Sign Up" : "Login");
    setError("");
    setFormData({ name: "", email: "", password: "" });
  };

  return (
    <div className="ls-wrapper">
      {/* Left panel — branding */}
      <div className="ls-left">
        <div className="ls-left-inner">
          <img src={logo} alt="GeneralMarket" className="ls-brand-logo" />
          <h2 className="ls-brand-title">Nigeria's #1 Marketplace</h2>
          <p className="ls-brand-desc">
            Buy, sell and trade anything across all 36 states.
            Thousands of listings updated daily.
          </p>
          <div className="ls-features">
            {[
              { icon: "🛡️", text: "Safe & Verified Sellers" },
              { icon: "📍", text: "Listings Near You" },
              { icon: "💬", text: "Chat Directly with Buyers" },
              { icon: "🆓", text: "Post Ads for Free" },
            ].map((f, i) => (
              <div key={i} className="ls-feature">
                <span className="ls-feature-icon">{f.icon}</span>
                <span>{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="ls-right">
        <div className="ls-form-wrap">
          {/* Mobile logo */}
          <img src={logo} alt="GeneralMarket" className="ls-mobile-logo" />

          {/* Tab switcher */}
          <div className="ls-tabs">
            <button
              className={`ls-tab ${state === "Login" ? "active" : ""}`}
              onClick={() => state !== "Login" && toggle()}
              type="button"
            >
              Log In
            </button>
            <button
              className={`ls-tab ${state === "Sign Up" ? "active" : ""}`}
              onClick={() => state !== "Sign Up" && toggle()}
              type="button"
            >
              Register
            </button>
          </div>

          <h1 className="ls-heading">
            {state === "Login" ? "Welcome back 👋" : "Create your account"}
          </h1>
          <p className="ls-subheading">
            {state === "Login"
              ? "Log in to your GeneralMarket account"
              : "Join thousands of buyers and sellers across Nigeria"}
          </p>

          {/* Error banner */}
          {error && (
            <div className="ls-error">
              <span>⚠️</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="ls-form">
            {state === "Sign Up" && (
              <div className="ls-field">
                <label className="ls-label">Full Name</label>
                <div className="ls-input-wrap">
                  <span className="ls-input-icon">👤</span>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={change}
                    placeholder="e.g. Chidi Okafor"
                    required
                    autoComplete="name"
                  />
                </div>
              </div>
            )}

            <div className="ls-field">
              <label className="ls-label">Email Address</label>
              <div className="ls-input-wrap">
                <span className="ls-input-icon">✉️</span>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={change}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="ls-field">
              <div className="ls-label-row">
                <label className="ls-label">Password</label>
                {state === "Login" && (
                  <a href="#!" className="ls-forgot">Forgot password?</a>
                )}
              </div>
              <div className="ls-input-wrap">
                <span className="ls-input-icon">🔒</span>
                <input
                  type={showPass ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={change}
                  placeholder={state === "Sign Up" ? "Min. 8 characters" : "Enter your password"}
                  required
                  autoComplete={state === "Login" ? "current-password" : "new-password"}
                />
                <button
                  type="button"
                  className="ls-eye"
                  onClick={() => setShowPass(s => !s)}
                  aria-label={showPass ? "Hide password" : "Show password"}
                >
                  {showPass ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            {state === "Sign Up" && (
              <label className="ls-agree">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={e => setAgreed(e.target.checked)}
                />
                <span>
                  I agree to the <a href="#!">Terms of Use</a> and <a href="#!">Privacy Policy</a>
                </span>
              </label>
            )}

            <button type="submit" className="ls-submit" disabled={loading}>
              {loading ? (
                <span className="ls-spinner" />
              ) : (
                state === "Login" ? "Log In →" : "Create Account →"
              )}
            </button>
          </form>

          <p className="ls-switch">
            {state === "Login" ? "Don't have an account?" : "Already have an account?"}
            {" "}
            <button type="button" onClick={toggle} className="ls-switch-btn">
              {state === "Login" ? "Register for free" : "Log in"}
            </button>
          </p>

          <div className="ls-divider"><span>or continue with</span></div>

          <a
            href="https://wa.me/+2348141846896"
            target="_blank"
            rel="noopener noreferrer"
            className="ls-whatsapp-btn"
          >
            <span>💬</span> Continue with WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
};

export default LoginSignup;