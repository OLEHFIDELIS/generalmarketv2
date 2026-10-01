import React from "react";
import { Link, useOutletContext } from "react-router-dom";
import {
  FaAddressCard, FaCheckDouble, FaHistory, FaHourglassEnd, FaBell, FaUserEdit, FaBriefcase, FaEnvelope, FaHeart,
  FaBullhorn, FaGavel, FaStar, FaIdCard, FaGift, FaLock, FaTag, FaHeadset, FaSignOutAlt, FaExclamation, FaCheckCircle,
} from "react-icons/fa";
import "./Overview.css";
import { useAuth } from "../../context/AuthContext";
import { Spinner } from "../../components/dash/ui";

const VERIFY_TEXT = {
  none: "Get a verified badge to build trust",
  pending: "Your documents are under review",
  verified: "Your identity is verified",
  rejected: "Verification was rejected — resubmit",
};

function Card({ to, onClick, icon, count, alert, tone, title, desc }) {
  const body = (
    <>
      <div className="ov-icon">
        {icon}
        {count !== undefined && count !== null && <span className={`ov-count${alert && count > 0 ? " alert" : ""}`}>{count}</span>}
      </div>
      <div className="ov-title">{title}</div>
      <div className="ov-desc">{desc}</div>
    </>
  );
  const cls = `ov-card ${tone || ""}`;
  return onClick
    ? <button type="button" className={cls} onClick={onClick}>{body}</button>
    : <Link className={cls} to={to}>{body}</Link>;
}

export default function Overview() {
  const { dash } = useOutletContext() || {};
  const { user, logout } = useAuth();
  if (!dash) return <Spinner />;

  const c = dash.counts || {};
  const u = dash.user || user || {};
  const issues = u.profileIssues || [];
  const vs = u.verification?.status || "none";

  return (
    <>
      {issues.length > 0 && (
        <div className="ov-todo">
          <div className="ov-todo-head"><FaExclamation /> Your profile is not complete! ({issues.length} {issues.length === 1 ? "issue" : "issues"})</div>
          <ul>{issues.map((i) => <li key={i}>{i}</li>)}</ul>
          <Link className="dx-btn dx-btn-primary dx-btn-sm" to={issues.some((i) => /business/i.test(i)) && issues.length === 1 ? "/dashboard/business" : "/dashboard/profile"}>Complete my profile</Link>
        </div>
      )}

      <div className="ov-grid">
        {u.username && (
          <Card to={`/seller/${u.username}`} icon={<FaAddressCard />} tone="blue" title="Public profile" desc="Your profile as buyers and customers see it" />
        )}
        <Card to="/dashboard/items?status=active" icon={<FaCheckDouble />} count={c.active} tone="green" title="Active listings" desc="Your listings visible in search" />
        <Card to="/dashboard/items?status=pending" icon={<FaHistory />} count={c.pending} tone="amber" title="Pending validation" desc="Listings waiting for admin validation" />
        <Card to="/dashboard/items?status=expired" icon={<FaHourglassEnd />} count={c.expired} tone="slate" title="Expired listings" desc="Expired listings are not visible in search — renew them" />
        <Card to="/dashboard/items?status=sold" icon={<FaTag />} count={c.sold} tone="slate" title="Sold listings" desc="Items you've marked as sold" />
        <Card to="/dashboard/alerts" icon={<FaBell />} count={c.alerts} tone="violet" title="Saved searches" desc="Receive notifications of new listings matching criteria" />
        <Card
          to="/dashboard/profile" icon={<FaUserEdit />} count={issues.length ? <FaExclamation /> : <FaCheckCircle />} alert={issues.length > 0} tone="blue"
          title="My profile" desc={issues.length ? `Your profile is not complete! (${issues.length} ${issues.length === 1 ? "issue" : "issues"})` : "Your profile is complete"}
        />
        <Card to="/dashboard/business" icon={<FaBriefcase />} tone="blue" title="Business profile" desc="Profile details, payment methods, opening hours, gallery" />
        <Card to="/dashboard/messages" icon={<FaEnvelope />} count={c.unreadMessages} alert tone="cyan" title="Messages" desc="Instant messages you have received & sent" />
        <Card to="/dashboard/offers" icon={<FaGavel />} count={c.pendingOffers} alert tone="amber" title="Offers" desc="Offers on your listings and offers you've made" />
        <Card to="/dashboard/favorites" icon={<FaHeart />} count={c.favorites} tone="rose" title="Favorite listings" desc="Listings you've marked as your favorite" />
        <Card to="/dashboard/ratings" icon={<FaStar />} count={u.rating?.count || 0} tone="amber" title="Ratings" desc={u.rating?.count ? `Your average rating is ${Number(u.rating.avg).toFixed(1)} / 5` : "Reviews from people you've dealt with"} />
        <Card to="/dashboard/verification" icon={<FaIdCard />} tone={vs === "verified" ? "green" : "blue"} title="ID verification" desc={VERIFY_TEXT[vs]} />
        <Card to="/dashboard/referrals" icon={<FaGift />} tone="violet" title="My referrals" desc="Invite friends to GeneralMarket with your link" />
        <Card to="/dashboard/promotions" icon={<FaBullhorn />} tone="orange" title="Promotions" desc="Highlight listings, buy credits or membership" />
        <Card to="/dashboard/escrow" icon={<FaLock />} tone="slate" title="Escrow" desc="Protected payments between buyer and seller" />
        <Card to="/contact" icon={<FaHeadset />} tone="cyan" title="Contact us" desc="Feel free to send us a message" />
        <Card onClick={logout} icon={<FaSignOutAlt />} tone="slate" title="Logout" desc="Sign out from your account" />
      </div>
    </>
  );
}