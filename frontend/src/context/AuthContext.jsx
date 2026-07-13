/**
 * AuthContext — global authentication state for ProyectoDaltec.
 *
 * Token persistence strategy:
 *   - Access token stored in localStorage.
 *   - Refresh token stored in localStorage.
 *
 * Token lifecycle:
 *   - login()        → POST /api/v1/auth/login/ → stores access/refresh tokens.
 *   - refreshToken() → POST /api/v1/auth/refresh/ with refresh token body.
 *   - logout()       → POST /api/v1/auth/logout/ and clears local tokens.
 *
 * On app load, tokens are restored from localStorage and a refresh is attempted
 * when a refresh token exists.
 *
 * Refs: T013, contracts/rest-api.md — Auth section, research.md R-002
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import axios from "axios";
import { authRef } from "../api/client.js";

// ---------------------------------------------------------------------------
// Context definition
// ---------------------------------------------------------------------------

const AuthContext = createContext(null);

// ---------------------------------------------------------------------------
// Raw API calls (no Axios interceptor dependency — avoids circular refs)
// These use the plain axios instance so T014's interceptor client can safely
// import AuthContext without circular imports.
// ---------------------------------------------------------------------------

const BASE = "/api/v1/auth";
const authHttp = axios.create({ baseURL: BASE });

const ACCESS_TOKEN_KEY = "daltec_access_token";
const REFRESH_TOKEN_KEY = "daltec_refresh_token";
const USER_KEY = "daltec_user";

async function apiLogin(dni, password) {
  const { data } = await authHttp.post("/login/", { dni, password });
  return data; // { access, refresh, user }
}

async function apiRefresh(refreshToken) {
  const { data } = await authHttp.post("/refresh/", { refresh: refreshToken });
  return data; // { access }
}

async function apiLogout(accessToken, refreshToken) {
  await authHttp.post(
    "/logout/",
    { refresh: refreshToken },
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AuthProvider({ children }) {
  const [accessToken, setAccessToken] = useState(
    localStorage.getItem(ACCESS_TOKEN_KEY)
  );
  const [refreshTokenValue, setRefreshTokenValue] = useState(
    localStorage.getItem(REFRESH_TOKEN_KEY)
  );
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  });
  // true while the initial refresh-on-load is in progress
  const [loading, setLoading] = useState(true);

  // Ref so Axios interceptor (T014) can always call the latest refreshToken
  // without creating a stale closure on the context value.
  const refreshTokenRef = useRef(null);
  // Monotonic session version to avoid stale async refresh overwriting login state.
  const sessionVersionRef = useRef(0);

  const persistSession = useCallback((access, refresh, currentUser) => {
    // Save to storage FIRST so the router guard can read them even before
    // React state propagates to ProtectedRoute.
    try {
      localStorage.setItem(ACCESS_TOKEN_KEY, access);
      localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
      localStorage.setItem(USER_KEY, JSON.stringify(currentUser ?? null));
    } catch (storageErr) {
      console.error("[Auth] localStorage.setItem failed:", storageErr);
    }
    // Update React state
    setAccessToken(access);
    setRefreshTokenValue(refresh);
    setUser(currentUser);
    // Update authRef for Axios interceptor (null-safe)
    if (authRef.current) {
      authRef.current.accessToken = access;
    } else {
      authRef.current = { accessToken: access, refreshTokenRef };
    }
    console.log("[Auth] persistSession OK", {
      access: access?.slice(0, 20) + "...",
      lsAccess: Boolean(localStorage.getItem(ACCESS_TOKEN_KEY)),
      lsRefresh: Boolean(localStorage.getItem(REFRESH_TOKEN_KEY)),
    });
  }, [refreshTokenRef]);

  /**
   * Attempt to renew the access token using the HttpOnly refresh cookie.
   * Returns the new access token string, or null on failure.
   */
  const refreshToken = useCallback(async () => {
    const sessionVersionAtStart = sessionVersionRef.current;
    try {
      const storedRefresh = localStorage.getItem(REFRESH_TOKEN_KEY);
      if (!storedRefresh) {
        return null;
      }

      const refreshResponse = await apiRefresh(storedRefresh);
      const access = refreshResponse?.access || refreshResponse?.access_token;
      if (!access) {
        throw new Error("Refresh response does not include access token");
      }
      // When ROTATE_REFRESH_TOKENS=True, backend also returns a new refresh token.
      // We MUST persist it; otherwise the blacklisted old token causes a 401 loop.
      const newRefresh = refreshResponse?.refresh;
      if (sessionVersionRef.current !== sessionVersionAtStart) {
        // A newer login/logout happened while refresh was in flight.
        return null;
      }
      setAccessToken(access);
      localStorage.setItem(ACCESS_TOKEN_KEY, access);
      if (newRefresh) {
        setRefreshTokenValue(newRefresh);
        localStorage.setItem(REFRESH_TOKEN_KEY, newRefresh);
      }
      // Sync authRef immediately to avoid timing issues
      authRef.current.accessToken = access;
      return access;
    } catch {
      // Refresh cookie expired or invalid — user must log in again.
      if (sessionVersionRef.current !== sessionVersionAtStart) {
        return null;
      }
      setAccessToken(null);
      setRefreshTokenValue(null);
      setUser(null);
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      authRef.current.accessToken = null;
      return null;
    }
  }, []);

  // Keep the ref up to date so the Axios interceptor always has the latest.
  refreshTokenRef.current = refreshToken;

  /**
   * Log in with DNI and password.
   * Stores the access token in memory; backend sets the refresh cookie.
   */
  const login = useCallback(async (dni, password) => {
    console.log("[Auth] login() called");
    const data = await apiLogin(dni, password);
    console.log("[Auth] apiLogin response keys:", Object.keys(data || {}));
    const access = data?.access || data?.access_token;
    const refresh = data?.refresh || data?.refresh_token;
    if (!access || !refresh) {
      console.error("[Auth] Missing tokens in response", data);
      throw new Error("Login response missing tokens");
    }
    const currentUser = data?.user || null;
    sessionVersionRef.current += 1;
    persistSession(access, refresh, currentUser);
    console.log("[Auth] login() complete, isAuthenticated should be true next render");
    return data;
  }, [persistSession]);

  /**
   * Log out: blacklist the refresh token on the server, clear local state.
   */
  const logout = useCallback(async () => {
    try {
      if (accessToken) {
        await apiLogout(accessToken, refreshTokenValue);
      }
    } catch {
      // Best-effort; clear local state regardless.
    } finally {
      sessionVersionRef.current += 1;
      setAccessToken(null);
      setRefreshTokenValue(null);
      setUser(null);
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      // Sync authRef immediately
      authRef.current.accessToken = null;
    }
  }, [accessToken, refreshTokenValue]);

  // On mount: try to restore session from the HttpOnly refresh cookie.
  useEffect(() => {
    const hasRefresh = Boolean(localStorage.getItem(REFRESH_TOKEN_KEY));
    if (!hasRefresh) {
      setLoading(false);
      return;
    }

    refreshToken().finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const updateStoredUser = useCallback((nextUser) => {
    setUser(nextUser);
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser ?? null));
  }, []);

  const value = {
    accessToken,
    refreshTokenValue,
    user,
    loading,
    login,
    logout,
    updateStoredUser,
    refreshToken,
    refreshTokenRef, // consumed by T014 Axios interceptor
    isAuthenticated: Boolean(accessToken),
  };

  // Keep authRef in sync so the Axios interceptor always has the latest token
  // and refresh function without needing a React context subscription.
  authRef.current = { accessToken, refreshTokenRef };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * useAuth — consume the AuthContext.
 * Must be used inside <AuthProvider>.
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an <AuthProvider>");
  }
  return ctx;
}

export default AuthContext;
