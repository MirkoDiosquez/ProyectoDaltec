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
import HallazgoListPage from "./pages/hallazgos/HallazgoListPage.jsx";
import CrearHallazgoPage from "./pages/hallazgos/CrearHallazgoPage.jsx";

// ---------------------------------------------------------------------------
// Route guards
// ---------------------------------------------------------------------------

/**
 * Redirects to /login when the user is not authenticated.
 * Shows nothing while the initial token refresh is in progress.
 */
export function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
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
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!roles.includes(user?.tipo)) return <Navigate to="/unauthorized" replace />;
  return children;
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* T016 */}
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/hallazgos"
          element={<ProtectedRoute><HallazgoListPage /></ProtectedRoute>}
        />

        <Route
          path="/hallazgos/crear"
          element={<RoleRoute roles={["EMPLEADO"]}><CrearHallazgoPage /></RoleRoute>}
        />

        {/* T036: Create queja — CLIENTE only
        <Route
          path="/hallazgos/queja"
          element={<RoleRoute roles={["CLIENTE"]}><CrearQuejaPage /></RoleRoute>}
        /> */}

        {/* T033: Hallazgo detail — authenticated users
        <Route
          path="/hallazgos/:id"
          element={<ProtectedRoute><HallazgoDetailPage /></ProtectedRoute>}
        /> */}

        {/* T059: Create user — ADMIN only
        <Route
          path="/usuarios/crear"
          element={<RoleRoute roles={["ADMIN"]}><CrearUsuarioPage /></RoleRoute>}
        /> */}

        {/* T055: Chat — authenticated users
        <Route
          path="/hallazgos/:id/chat"
          element={<ProtectedRoute><ChatPage /></ProtectedRoute>}
        /> */}

        {/* T046: Accion detail — authenticated users
        <Route
          path="/acciones/:id"
          element={<ProtectedRoute><AccionDetailPage /></ProtectedRoute>}
        /> */}

        {/* T075: Crear hallazgo (Admin with cliente_asociado) — ADMIN + EMPLEADO
        <Route
          path="/hallazgos/crear"
          element={<RoleRoute roles={["ADMIN","EMPLEADO"]}><CrearHallazgoPage /></RoleRoute>}
        /> */}

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
        <Route path="*" element={<Navigate to="/hallazgos" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

