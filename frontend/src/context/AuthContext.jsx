/**
 * AuthContext — global authentication state for ProyectoDaltec.
 *
 * Security design (Constitution Principle VI):
 *   - Access token stored in memory only (React state). Never persisted to
 *     localStorage/sessionStorage — avoids XSS token theft.
 *   - Refresh token stored in an HttpOnly cookie managed by the backend.
 *     JavaScript cannot read it; the browser sends it automatically on
 *     POST /api/v1/auth/refresh/.
 *
 * Token lifecycle:
 *   - login()        → POST /api/v1/auth/login/ → stores access token in
 *                      memory; backend sets refresh cookie.
 *   - refreshToken() → POST /api/v1/auth/refresh/ → renews access token in
 *                      memory using the cookie.
 *   - logout()       → POST /api/v1/auth/logout/ → blacklists refresh token;
 *                      clears memory state and cookie.
 *
 * On app load, an immediate refreshToken() call is attempted so a user
 * whose refresh cookie is still valid is logged in without needing to
 * re-authenticate.
 *
 * Refs: T013, contracts/rest-api.md — Auth section, research.md R-002
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import axios from "axios";

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

async function apiLogin(dni, password) {
  const { data } = await axios.post(`${BASE}/login/`, { dni, password });
  return data; // { access, refresh, user }
}

async function apiRefresh() {
  // Refresh token is sent automatically via HttpOnly cookie.
  const { data } = await axios.post(`${BASE}/refresh/`);
  return data; // { access }
}

async function apiLogout(accessToken) {
  await axios.post(
    `${BASE}/logout/`,
    {},
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AuthProvider({ children }) {
  // Access token in memory only
  const [accessToken, setAccessToken] = useState(null);
  // Decoded user info from login response
  const [user, setUser] = useState(null);
  // true while the initial refresh-on-load is in progress
  const [loading, setLoading] = useState(true);

  // Ref so Axios interceptor (T014) can always call the latest refreshToken
  // without creating a stale closure on the context value.
  const refreshTokenRef = useRef(null);

  /**
   * Attempt to renew the access token using the HttpOnly refresh cookie.
   * Returns the new access token string, or null on failure.
   */
  const refreshToken = useCallback(async () => {
    try {
      const { access } = await apiRefresh();
      setAccessToken(access);
      return access;
    } catch {
      // Refresh cookie expired or invalid — user must log in again.
      setAccessToken(null);
      setUser(null);
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
    const data = await apiLogin(dni, password);
    setAccessToken(data.access);
    setUser(data.user);
    return data;
  }, []);

  /**
   * Log out: blacklist the refresh token on the server, clear local state.
   */
  const logout = useCallback(async () => {
    try {
      if (accessToken) {
        await apiLogout(accessToken);
      }
    } catch {
      // Best-effort; clear local state regardless.
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }, [accessToken]);

  // On mount: try to restore session from the HttpOnly refresh cookie.
  useEffect(() => {
    refreshToken().finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const value = {
    accessToken,
    user,
    loading,
    login,
    logout,
    refreshToken,
    refreshTokenRef, // consumed by T014 Axios interceptor
    isAuthenticated: Boolean(accessToken),
  };

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
