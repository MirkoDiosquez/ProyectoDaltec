/**
 * App.jsx — React Router configuration with route guards.
 *
 * ProtectedRoute: redirects unauthenticated users to /login.
 *   While the initial session restore is in progress (loading=true),
 *   renders nothing to avoid a flash redirect before the refresh completes.
 *
 * RoleRoute: redirects authenticated users who don't have one of the
 *   required roles to /unauthorized (or / if not defined).
 *
 * Usage:
 *   <ProtectedRoute>                          — any authenticated user
 *   <RoleRoute roles={["ADMIN"]}>             — Admin only
 *   <RoleRoute roles={["ADMIN","EMPLEADO"]}>  — Admin or Empleado
 *
 * Pages are imported and registered progressively per task.
 * Refs: T015, spec FR-023/024/025
 */
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import LoginPage from "./pages/auth/LoginPage.jsx";
import HomeDashboardPage from "./pages/home/HomeDashboardPage.jsx";
import HallazgoListPage from "./pages/hallazgos/HallazgoListPage.jsx";
import CrearHallazgoPage from "./pages/hallazgos/CrearHallazgoPage.jsx";
import CrearQuejaPage from "./pages/hallazgos/CrearQuejaPage.jsx";
import HallazgoDetailPage from "./pages/hallazgos/HallazgoDetailPage.jsx";
import AccionDetailPage from "./pages/acciones/AccionDetailPage.jsx";
import ChatPage from "./pages/chat/ChatPage.jsx";
import CrearUsuarioPage from "./pages/users/CrearUsuarioPage.jsx";
import MainNavbar from "./components/navigation/MainNavbar.jsx";
import { useNotificaciones } from "./hooks/useNotificaciones.js";
import AdminNotificationPanel from "./components/AdminPanel/AdminNotificationPanel.jsx";
import EmployeeNotificationPanel from "./components/NotificationPanel/EmployeeNotificationPanel.jsx";
import NotificacionesPage from "./pages/hallazgos/NotificacionesPage.jsx";

// ---------------------------------------------------------------------------
// Route guards
// ---------------------------------------------------------------------------

/**
 * Redirects to /login when the user is not authenticated.
 * Shows nothing while the initial session restore is in progress.
 *
 * We check localStorage directly in addition to React state to avoid
 * a race condition: login() saves tokens to localStorage synchronously
 * then calls navigate(), but React state propagation is async — so
 * ProtectedRoute might still see isAuthenticated=false on the first
 * render after navigate if the state flush hasn't happened yet.
 */
export function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  const hasStoredToken = Boolean(localStorage.getItem("daltec_access_token"));
  if (!isAuthenticated && !hasStoredToken) return <Navigate to="/login" replace />;
  return children;
}

/**
 * Redirects to /unauthorized when the authenticated user's role
 * is not in the allowed `roles` array.
 *
 * @param {string[]} roles - e.g. ["ADMIN"] or ["ADMIN", "EMPLEADO"]
 */
export function RoleRoute({ roles, children }) {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) return null;
  const hasStoredToken = Boolean(localStorage.getItem("daltec_access_token"));
  if (!isAuthenticated && !hasStoredToken) return <Navigate to="/login" replace />;
  // Fall back to localStorage user when state hasn't propagated yet
  const effectiveUser = user || (() => {
    try { return JSON.parse(localStorage.getItem("daltec_user") || "null"); }
    catch { return null; }
  })();
  if (!roles.includes(effectiveUser?.tipo)) return <Navigate to="/unauthorized" replace />;
  return children;
}

export function PublicOnlyRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  const hasStoredToken = Boolean(localStorage.getItem("daltec_access_token"));
  if (isAuthenticated || hasStoredToken) return <Navigate to="/" replace />;
  return children;
}

/**
 * ProtectedLayout — Wraps authenticated pages with MainNavbar and initializes notifications (T127).
 */
function ProtectedLayout({ children }) {
  const { isAuthenticated, loading } = useAuth();
  // Initialize notifications hook to maintain WebSocket connection
  const { notifications, markAsRead } = useNotificaciones();
  
  if (loading) return null;
  const hasStoredToken = Boolean(localStorage.getItem("daltec_access_token"));
  if (!isAuthenticated && !hasStoredToken) return <Navigate to="/login" replace />;
  return (
    <>
      <MainNavbar notificationCount={notifications.filter(n => !n.leida).length} />
      {children}
    </>
  );
}

/**
 * NotificationsPage — Displays role-specific notification panels (T127).
 * 
 * - Admins see AdminNotificationPanel with categorized notifications
 * - Employees see EmployeeNotificationPanel with assignments and urgent messages
 */
function NotificationsPageWrapper() {
  const { user } = useAuth();
  const { notifications, markAsRead } = useNotificaciones();

  return (
    <div style={{ padding: "2rem", maxWidth: 1200, margin: "0 auto" }}>
      {user?.tipo === "ADMIN" ? (
        <AdminNotificationPanel
          notifications={notifications}
          onNavigate={(tipo) => {
            // Can add routing logic here if needed
            console.log("Navigate to:", tipo);
          }}
        />
      ) : (
        <EmployeeNotificationPanel
          notifications={notifications}
          onNotificationRead={markAsRead}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* T016 */}
        <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />

        <Route
          path="/"
          element={<ProtectedLayout><HomeDashboardPage /></ProtectedLayout>}
        />

        <Route
          path="/hallazgos"
          element={<ProtectedLayout><HallazgoListPage /></ProtectedLayout>}
        />

        <Route
          path="/hallazgos/crear"
          element={
            <ProtectedLayout>
              <RoleRoute roles={["ADMIN", "EMPLEADO"]}>
                <CrearHallazgoPage />
              </RoleRoute>
            </ProtectedLayout>
          }
        />

        <Route
          path="/hallazgos/queja"
          element={
            <ProtectedLayout>
              <RoleRoute roles={["ADMIN", "CLIENTE"]}>
                <CrearQuejaPage />
              </RoleRoute>
            </ProtectedLayout>
          }
        />

        <Route
          path="/hallazgos/:id"
          element={<ProtectedLayout><HallazgoDetailPage /></ProtectedLayout>}
        />

        <Route
          path="/acciones/:id"
          element={<ProtectedLayout><AccionDetailPage /></ProtectedLayout>}
        />

        <Route
          path="/usuarios/crear"
          element={
            <ProtectedLayout>
              <RoleRoute roles={["ADMIN"]}>
                <CrearUsuarioPage />
              </RoleRoute>
            </ProtectedLayout>
          }
        />

        {/* T127: Notificaciones page (T124-T126 components integrated) */}
        <Route
          path="/notificaciones"
          element={
            <ProtectedLayout>
              <NotificationsPageWrapper />
            </ProtectedLayout>
          }
        />

        {/* T059: Create user — ADMIN only (placeholder for now)
        <Route
          path="/usuarios/crear"
          element={
            <ProtectedLayout>
              <RoleRoute roles={["ADMIN"]}>
                <CrearUsuarioPage />
              </RoleRoute>
            </ProtectedLayout>
          }
        /> */}

        {/* T055: Chat — authenticated users */}
        <Route
          path="/hallazgos/:id/chat"
          element={<ProtectedLayout><ChatPage /></ProtectedLayout>}
        />

        {/* Unauthorized placeholder */}
        <Route
          path="/unauthorized"
          element={
            <div style={{ padding: "2rem" }}>
              <h1>403 — Sin autorización</h1>
              <p>No tenés permisos para acceder a esta página.</p>
            </div>
          }
        />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

