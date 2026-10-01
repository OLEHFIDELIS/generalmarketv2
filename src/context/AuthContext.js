import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, getToken } from "../api";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!getToken());

  const logout = useCallback(() => {
    localStorage.removeItem("auth-token");
    setUser(null);
    window.location.replace("/");
  }, []);

  const refresh = useCallback(async () => {
    if (!getToken()) { setUser(null); setLoading(false); return null; }
    try {
      const { user: u } = await api("/me");
      setUser(u);
      return u;
    } catch (e) {
      if (e.status === 401 || e.status === 403) { localStorage.removeItem("auth-token"); setUser(null); }
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    const onExpired = () => { localStorage.removeItem("auth-token"); setUser(null); };
    window.addEventListener("gm-auth-expired", onExpired);
    return () => window.removeEventListener("gm-auth-expired", onExpired);
  }, []);

  return <AuthContext.Provider value={{ user, setUser, loading, refresh, logout, isLoggedIn: !!user }}>{children}</AuthContext.Provider>;
}
