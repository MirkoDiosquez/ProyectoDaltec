/**
 * Axios client for ProyectoDaltec API.
 *
 * - Request interceptor: attaches the JWT access token from AuthContext
 *   to every request as `Authorization: Bearer <token>`.
 * - Response interceptor: on 401, silently calls refreshToken() once and
 *   retries the original request. If the refresh also fails, the promise
 *   rejects and the calling code / AuthContext handles the redirect to login.
 *
 * Design notes:
 *   - We import `authRef` (a module-level ref) instead of calling useAuth()
 *     directly — hooks cannot be called outside React components.
 *   - `authRef` is set by <AuthProvider> on mount (see AuthContext.jsx).
 *   - This avoids circular imports: AuthContext uses plain axios for its own
 *     login/refresh/logout calls; all other API modules use this client.
 *
 * Refs: T014, contracts/rest-api.md, research.md R-002
 */
import axios from "axios";

// ---------------------------------------------------------------------------
// Module-level ref populated by AuthProvider (see AuthContext.jsx)
// { accessToken: string|null, refreshTokenRef: { current: fn } }
// ---------------------------------------------------------------------------
export const authRef = { current: null };

// ---------------------------------------------------------------------------
// Axios instance
// ---------------------------------------------------------------------------
const client = axios.create({
  baseURL: "/api/v1",
  headers: { "Content-Type": "application/json" },
  withCredentials: true, // Send HttpOnly refresh cookie on refresh calls
});

// ---------------------------------------------------------------------------
// Request interceptor — attach access token
// ---------------------------------------------------------------------------
client.interceptors.request.use(
  (config) => {
    const token = authRef.current?.accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ---------------------------------------------------------------------------
// Response interceptor — silent token refresh on 401
// ---------------------------------------------------------------------------
let isRefreshing = false;
// Queue of { resolve, reject } callbacks waiting for the refresh to finish
let refreshQueue = [];

function processQueue(error, token = null) {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  refreshQueue = [];
}

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Only attempt refresh for 401 responses that haven't been retried yet.
    // Skip refresh for the auth endpoints themselves to avoid infinite loops.
    const isAuthEndpoint = originalRequest.url?.startsWith("/auth/");
    if (
      error.response?.status !== 401 ||
      originalRequest._retry ||
      isAuthEndpoint
    ) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // Another request is already refreshing — queue this one.
      return new Promise((resolve, reject) => {
        refreshQueue.push({ resolve, reject });
      }).then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return client(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const refreshFn = authRef.current?.refreshTokenRef?.current;
      if (!refreshFn) throw new Error("No refresh function available");

      const newToken = await refreshFn();
      if (!newToken) throw new Error("Refresh returned null");

      processQueue(null, newToken);
      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return client(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default client;
