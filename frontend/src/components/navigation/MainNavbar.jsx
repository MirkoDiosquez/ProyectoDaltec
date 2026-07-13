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
import { useNotificaciones } from "../../context/NotificacionContext.jsx";
import NotificationBadge from "../NotificationBadge.jsx";

export default function MainNavbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { notificaciones } = useNotificaciones();

  const roleLabel = useMemo(() => {
    const labels = { ADMIN: "Admin", EMPLEADO: "Empleado", CLIENTE: "Cliente" };
    return labels[user?.tipo] || "Usuario";
  }, [user?.tipo]);

  const notificationCount = useMemo(() => {
    return notificaciones.filter(n => !n.leida).length;
  }, [notificaciones]);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <nav
      style={{
        background: "var(--navy)",
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
          style={{ display: "flex", alignItems: "center", textDecoration: "none" }}
        >
          <img
            src="https://daltectools.com/wp-content/uploads/2024/09/Daltec-logo-azul-y-blanco-200px-02.png"
            alt="Daltec"
            style={{ height: 36, width: "auto", display: "block" }}
          />
        </Link>

        {/* Main Menu */}
        <div style={{ display: "flex", gap: "2rem", alignItems: "center" }}>


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
                to="/usuarios"
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
                Gestion Usuarios
              </Link>
            </>
          )}

          <Link
            to="/perfil"
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
            Mi Perfil
          </Link>

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
            style={{ padding: "0.4rem 0.85rem", fontSize: "0.85rem" }}
          >
            Cerrar Sesión
          </button>
        </div>
      </div>
    </nav>
  );
}
