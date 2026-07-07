/**
 * MainNavbar.jsx — Reusable navigation bar with role-aware links.
 *
 * Displays:
 * - Home link
 * - Hallazgos list
 * - Role-specific links (Crear Queja for CLIENTE, Crear Hallazgo for EMPLEADO/ADMIN, Usuarios for ADMIN)
 * - Notificaciones badge (T129)
 * - User menu (logout)
 *
 * Task T085 — Navbar integration for page navigation.
 * Task T127 — Integration of notification badge with navbar.
 */

import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import NotificationBadge from "../NotificationBadge.jsx";

export default function MainNavbar({ notificationCount = 0 }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const roleLabel = useMemo(() => {
    const labels = { ADMIN: "Admin", EMPLEADO: "Empleado", CLIENTE: "Cliente" };
    return labels[user?.tipo] || "Usuario";
  }, [user?.tipo]);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <nav
      style={{
        background: "#0f172a",
        color: "#fff",
        padding: "0 1rem",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          height: 60,
        }}
      >
        {/* Brand / Logo */}
        <Link
          to="/"
          style={{
            color: "#fff",
            textDecoration: "none",
            fontWeight: 700,
            fontSize: "1.1rem",
            letterSpacing: "0.5px",
          }}
        >
          Daltec
        </Link>

        {/* Main Menu */}
        <div style={{ display: "flex", gap: "2rem", alignItems: "center" }}>
          {/* Home */}
          <Link
            to="/"
            style={{
              color: "#e2e8f0",
              textDecoration: "none",
              fontSize: "0.95rem",
              fontWeight: 500,
              transition: "color 0.2s",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => (e.target.style.color = "#fff")}
            onMouseLeave={(e) => (e.target.style.color = "#e2e8f0")}
          >
            Inicio
          </Link>

          {/* Hallazgos List */}
          <Link
            to="/hallazgos"
            style={{
              color: "#e2e8f0",
              textDecoration: "none",
              fontSize: "0.95rem",
              fontWeight: 500,
              transition: "color 0.2s",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => (e.target.style.color = "#fff")}
            onMouseLeave={(e) => (e.target.style.color = "#e2e8f0")}
          >
            Hallazgos
          </Link>

          {/* Role-Specific Links */}
          {user?.tipo === "EMPLEADO" && (
            <Link
              to="/hallazgos/crear"
              style={{
                color: "#e2e8f0",
                textDecoration: "none",
                fontSize: "0.95rem",
                fontWeight: 500,
                transition: "color 0.2s",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => (e.target.style.color = "#fff")}
              onMouseLeave={(e) => (e.target.style.color = "#e2e8f0")}
            >
              Crear Hallazgo
            </Link>
          )}

          {user?.tipo === "CLIENTE" && (
            <Link
              to="/hallazgos/queja"
              style={{
                color: "#e2e8f0",
                textDecoration: "none",
                fontSize: "0.95rem",
                fontWeight: 500,
                transition: "color 0.2s",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => (e.target.style.color = "#fff")}
              onMouseLeave={(e) => (e.target.style.color = "#e2e8f0")}
            >
              Crear Queja
            </Link>
          )}

          {user?.tipo === "ADMIN" && (
            <>
              <Link
                to="/hallazgos/crear"
                style={{
                  color: "#e2e8f0",
                  textDecoration: "none",
                  fontSize: "0.95rem",
                  fontWeight: 500,
                  transition: "color 0.2s",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => (e.target.style.color = "#fff")}
                onMouseLeave={(e) => (e.target.style.color = "#e2e8f0")}
              >
                Crear Hallazgo
              </Link>
              <Link
                to="/usuarios/crear"
                style={{
                  color: "#e2e8f0",
                  textDecoration: "none",
                  fontSize: "0.95rem",
                  fontWeight: 500,
                  transition: "color 0.2s",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => (e.target.style.color = "#fff")}
                onMouseLeave={(e) => (e.target.style.color = "#e2e8f0")}
              >
                Crear Usuario
              </Link>
            </>
          )}

          {/* Notificaciones Badge (T127, T129) */}
          <Link
            to="/notificaciones"
            style={{
              display: "flex",
              alignItems: "center",
              position: "relative",
            }}
            title="Notificaciones"
          >
            <NotificationBadge count={notificationCount} />
          </Link>
        </div>

        {/* User Menu */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span
            style={{
              color: "#cbd5e1",
              fontSize: "0.85rem",
              fontWeight: 500,
            }}
          >
            {user?.nombre} ({roleLabel})
          </span>
          <button
            onClick={handleLogout}
            style={{
              background: "#1e293b",
              color: "#e2e8f0",
              border: "1px solid #334155",
              borderRadius: 6,
              padding: "0.4rem 0.75rem",
              fontSize: "0.85rem",
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.target.style.background = "#334155";
              e.target.style.borderColor = "#475569";
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "#1e293b";
              e.target.style.borderColor = "#334155";
            }}
          >
            Cerrar Sesión
          </button>
        </div>
      </div>
    </nav>
  );
}
