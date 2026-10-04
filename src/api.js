// Thin fetch wrapper for the GeneralMarket API. Sends the existing `auth-token` header.
export const getToken = () => localStorage.getItem("auth-token");

export class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

export async function api(path, { method = "GET", body, form } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers["auth-token"] = token;
  let payload;
  if (form) payload = form;                       // FormData: browser sets the multipart boundary
  else if (body !== undefined) { headers["Content-Type"] = "application/json"; payload = JSON.stringify(body); }

  let res;
  try {
    res = await fetch(`/api${path}`, { method, headers, body: payload });
  } catch {
    throw new ApiError("Network error. Please check your connection.", 0);
  }
  let data = null;
  try { data = await res.json(); } catch { /* non-JSON */ }

  if (res.status === 401 && token) window.dispatchEvent(new Event("gm-auth-expired"));
  if (!res.ok || (data && data.success === false)) {
    throw new ApiError(data?.message || data?.errors || data?.error || "Something went wrong. Please try again.", res.status);
  }
  return data;
}

export const money = (n) => "₦" + Number(n || 0).toLocaleString("en-NG");
// Display price for a listing: honours "Free" / "Contact for price"
export const priceText = (p) => (p?.priceType === "contact" ? "Contact for price" : p?.priceType === "free" ? "Free" : money(p?.price));
export const dateShort = (d) => (d ? new Date(d).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }) : "—");
export const timeAgo = (d) => {
  if (!d) return "";
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return dateShort(d);
};

// ── Product-page helpers ────────────────────────────────────────────────
// Category tree + per-category field specs (cached; the server sends them with Cache-Control)
let catCache = null;
export const loadCategories = () => (catCache ||= api("/categories").catch((e) => { catCache = null; throw e; }));
// Find a node in the category tree by its label path, e.g. ["Vehicles","Cars","SUV / Jeep"]
export const walkCategory = (tree, path = []) => {
  let nodes = tree, node = null;
  for (const label of path) {
    node = (nodes || []).find((n) => n.label === label);
    if (!node) return null;
    nodes = node.children;
  }
  return node;
};

const digits = (p) => String(p || "").replace(/\D/g, "");
// "08038027714" → "08038 ••• •••"  (revealed on click, like Faji)
export const maskPhone = (p) => { const d = digits(p); return d.length > 5 ? `${d.slice(0, 5)} ••• •••` : "••• •••"; };
// wa.me needs an international number: 0803… → 234803…
export const waNumber = (p) => { const d = digits(p); return d.startsWith("234") ? d : d.startsWith("0") ? `234${d.slice(1)}` : d; };
export const telHref = (p) => `tel:${digits(p)}`;

// "today", "3 days ago", "11 months" – for "Last online" / "Registered for"
export const longAgo = (d) => {
  if (!d) return "";
  const days = Math.floor((Date.now() - new Date(d)) / 86400000);
  if (days < 1) return "today";
  if (days === 1) return "1 day ago";
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 730) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
};
export const spanSince = (d) => {
  if (!d) return "";
  const days = Math.floor((Date.now() - new Date(d)) / 86400000);
  if (days < 1) return "today";
  if (days < 60) return `${Math.max(days, 1)} ${days === 1 ? "day" : "days"}`;
  if (days < 730) { const m = Math.floor(days / 30); return `${m} ${m === 1 ? "month" : "months"}`; }
  const y = Math.floor(days / 365); return `${y} ${y === 1 ? "year" : "years"}`;
};