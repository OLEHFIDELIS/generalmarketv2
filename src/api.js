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
