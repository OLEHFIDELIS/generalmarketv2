import { useEffect, useState, useCallback } from "react";
import { api, getToken } from "../api";

// Module-level cache so every heart on the page stays in sync
let ids = null;
let loading = null;
const subs = new Set();
const emit = () => subs.forEach((fn) => fn());

async function load() {
  if (!getToken()) { ids = new Set(); return; }
  if (ids) return;
  if (!loading) loading = api("/me/favorites/ids").then((d) => { ids = new Set(d.ids); }).catch(() => { ids = new Set(); }).finally(() => { loading = null; emit(); });
  await loading;
}

export default function useFavorite(productId) {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force((n) => n + 1);
    subs.add(fn);
    load().then(fn);
    return () => subs.delete(fn);
  }, []);

  const toggle = useCallback(async () => {
    if (!getToken()) { window.location.hash = "#/login"; return; }
    const was = ids?.has(productId);
    ids = new Set(ids || []); was ? ids.delete(productId) : ids.add(productId); emit(); // optimistic
    try { await api(`/me/favorites/${productId}`, { method: "POST" }); }
    catch { ids = new Set(ids); was ? ids.add(productId) : ids.delete(productId); emit(); }
  }, [productId]);

  return { favorited: !!ids?.has(productId), toggle };
}
