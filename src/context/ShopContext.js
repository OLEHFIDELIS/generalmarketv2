import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, getToken } from "../api";

export const ShopContext = createContext(null);

export const MAX_QTY = 10;                 // keep in sync with routes/cart.js
const GUEST_KEY = "gm-cart-guest";          // guest cart only; logged-in carts live on the server

// Sparse { [productId]: qty } with only positive whole quantities (also strips the old 301 zero-slots)
const clean = (raw) => {
  const out = {};
  for (const [k, v] of Object.entries(raw || {})) {
    const id = Number(k);
    const q = Math.min(MAX_QTY, Math.floor(Number(v)));
    if (Number.isInteger(id) && id >= 0 && q > 0) out[id] = q;
  }
  return out;
};
const readGuest = () => {
  try { return clean(JSON.parse(localStorage.getItem(GUEST_KEY) || "{}")); } catch { return {}; }
};

const ShopContextProvider = (props) => {
  const [all_product, setAll_product] = useState([]);
  const [cartItems, setCartItems] = useState({});
  const [cartReady, setCartReady] = useState(false);      // initial load / login-merge finished
  const [lookup, setLookup] = useState({ items: {}, missing: [], loaded: false });
  const [cartError, setCartError] = useState("");
  const [lookupTick, setLookupTick] = useState(0);        // bump to re-check prices / availability
  const refreshLookup = useCallback(() => setLookupTick((t) => t + 1), []);

  const cartRef = useRef({});                              // always the latest cart, even between renders
  const queue = useRef(Promise.resolve());                 // server writes run strictly in click order

  const applyCart = useCallback((next) => { cartRef.current = next; setCartItems(next); }, []);

  useEffect(() => {
    fetch("/api/allproduct")
      .then((res) => res.json())
      .then((data) => setAll_product(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Error fetching products:", err));
  }, []);

  // Initial load. Guest → localStorage. Logged in → server is the source of truth, and a guest cart
  // built before logging in is merged in (per-item max, so nothing is double counted).
  useEffect(() => {
    let alive = true;
    (async () => {
      const token = getToken();
      const guest = readGuest();
      try { localStorage.removeItem("cartItems"); } catch { /* old key: previous bundle cached ANY user's cart here */ }
      if (!token) { applyCart(guest); if (alive) setCartReady(true); return; }
      try {
        const r = Object.keys(guest).length
          ? await api("/cart/merge", { method: "POST", body: { items: guest } })
          : await api("/cart");
        if (!alive) return;
        try { localStorage.removeItem(GUEST_KEY); } catch { /* ignore */ }
        applyCart(clean(r.cart));
      } catch {
        if (alive) applyCart(guest);                       // offline / server hiccup: keep what we have
      }
      if (alive) setCartReady(true);
    })();
    return () => { alive = false; };
  }, [applyCart]);

  // Persist the guest cart
  useEffect(() => {
    if (!cartReady || getToken()) return;
    try { localStorage.setItem(GUEST_KEY, JSON.stringify(cartItems)); } catch { /* storage blocked */ }
  }, [cartItems, cartReady]);

  const enqueue = (job) => {
    const run = queue.current.then(job);
    queue.current = run.catch(() => {});
    return run;
  };
  const resync = async () => {
    try { const r = await api("/cart"); applyCart(clean(r.cart)); } catch { /* keep optimistic state */ }
  };

  // Set one line to an absolute quantity (0 removes). Optimistic; rolls back to the server's truth on failure.
  const mutate = useCallback((id, qty) => {
    id = Number(id);
    qty = Math.max(0, Math.min(MAX_QTY, Math.floor(Number(qty) || 0)));
    const next = { ...cartRef.current };
    if (qty > 0) next[id] = qty; else delete next[id];
    applyCart(next);
    setCartError("");
    if (!getToken()) return Promise.resolve({ ok: true });
    return enqueue(() => api("/cart/item", { method: "PUT", body: { itemId: id, qty } }))
      .then(() => ({ ok: true }))
      .catch(async (e) => { setCartError(e.message); await resync(); return { ok: false, message: e.message }; });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applyCart]);

  const addToCart = useCallback((id, n = 1) => {
    const cur = cartRef.current[Number(id)] || 0;
    if (cur >= MAX_QTY) return Promise.resolve({ ok: false, message: `You can add up to ${MAX_QTY} of the same item.` });
    return mutate(id, cur + n);
  }, [mutate]);
  const removeFromCart = useCallback((id) => mutate(id, (cartRef.current[Number(id)] || 0) - 1), [mutate]);   // -1 (kept for older callers)
  const removeItem = useCallback((id) => mutate(id, 0), [mutate]);
  const setQuantity = mutate;
  const clearCart = useCallback(() => {
    applyCart({});
    setCartError("");
    if (!getToken()) return Promise.resolve({ ok: true });
    return enqueue(() => api("/cart", { method: "DELETE" }))
      .then(() => ({ ok: true }))
      .catch(async (e) => { setCartError(e.message); await resync(); return { ok: false, message: e.message }; });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applyCart]);

  // Product + seller details (and availability) for what's in the cart. Re-fetched only when the SET of items changes.
  const idsKey = Object.keys(cartItems).map(Number).sort((a, b) => a - b).join(",");
  useEffect(() => {
    if (!cartReady) return;
    if (!idsKey) { setLookup({ items: {}, missing: [], loaded: true }); return; }
    let alive = true;
    setLookup((l) => (l.failed ? { ...l, failed: false } : l));
    api("/cart/lookup", { method: "POST", body: { ids: idsKey.split(",").map(Number) } })
      .then((r) => alive && setLookup({ items: Object.fromEntries(r.items.map((i) => [i.id, i])), missing: r.missing, loaded: true }))
      .catch(() => alive && setLookup((l) => ({ ...l, loaded: true, failed: true })));
    return () => { alive = false; };
  }, [cartReady, idsKey, lookupTick]);

  // [{ id, qty, info, available }]  available: true | false | undefined (still checking)
  const cartLines = useMemo(() => Object.entries(cartItems).map(([id, qty]) => {
    const info = lookup.items[id];
    return { id: Number(id), qty, info, available: info ? info.available : lookup.loaded && !lookup.failed ? false : undefined };
  }), [cartItems, lookup]);

  // Badge/total only count listings that can actually be bought
  const getTotalCartItems = () =>
    cartLines.reduce((n, l) => n + (l.available === false ? 0 : l.qty), 0);
  const getTotalCartAmount = () =>
    cartLines.reduce((sum, l) => sum + (l.available && l.info ? l.info.price * l.qty : 0), 0);

  return (
    <ShopContext.Provider value={{
      all_product, cartItems, cartLines, cartReady, cartError, maxQty: MAX_QTY,
      lookupFailed: !!lookup.failed, refreshLookup,
      addToCart, removeFromCart, removeItem, setQuantity, clearCart,
      getTotalCartItems, getTotalCartAmount,
    }}>
      {props.children}
    </ShopContext.Provider>
  );
};

export default ShopContextProvider;
