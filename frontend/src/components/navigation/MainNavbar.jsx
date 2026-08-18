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

import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { useNotificaciones } from "../../context/NotificacionContext.jsx";
import NotificationBadge from "../NotificationBadge.jsx";
import "./MainNavbar.css";

export default function MainNavbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { notificaciones } = useNotificaciones();
  const [menuOpen, setMenuOpen] = useState(false);

  const roleLabel = useMemo(() => {
    const labels = { ADMIN: "Admin", EMPLEADO: "Empleado", CLIENTE: "Cliente" };
    return labels[user?.tipo] || "Usuario";
  }, [user?.tipo]);

  const notificationCount = useMemo(() => {
    return notificaciones.filter(n => !n.leida).length;
  }, [notificaciones]);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    navigate("/login");
  };

  const handleNavClick = () => {
    setMenuOpen(false);
  };

  const isActive = (path) => location.pathname === path;

  const navLinkClass = (path) =>
    `main-navbar__link${isActive(path) ? " main-navbar__link--active" : ""}`;

  return (
    <nav
      className="main-navbar"
    >
      <div className="main-navbar__container">
        {/* Brand / Logo */}
        <Link
          to="/"
          className="main-navbar__brand"
          onClick={handleNavClick}
        >
          <img
            src="https://daltectools.com/wp-content/uploads/2024/09/Daltec-logo-azul-y-blanco-200px-02.png"
            alt="Daltec"
            className="main-navbar__logo"
          />
        </Link>

        <button
          type="button"
          className="main-navbar__hamburger"
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-label="Abrir menu de navegacion"
          aria-expanded={menuOpen}
        >
          <span className="main-navbar__hamburger-line" />
          <span className="main-navbar__hamburger-line" />
          <span className="main-navbar__hamburger-line" />
        </button>

        {/* Main Menu */}
        <div className={`main-navbar__menu ${menuOpen ? "main-navbar__menu--open" : ""}`}>
          <div className="main-navbar__links">
            {/* Hallazgos List */}
            <Link to="/hallazgos" className={navLinkClass("/hallazgos")} onClick={handleNavClick}>
              Hallazgos
            </Link>

            <Link to="/tutorial" className={navLinkClass("/tutorial")} onClick={handleNavClick}>
              Tutorial
            </Link>

            {/* Role-Specific Links */}
            {user?.tipo === "EMPLEADO" && (
              <Link to="/hallazgos/crear" className={navLinkClass("/hallazgos/crear")} onClick={handleNavClick}>
                Crear Hallazgo
              </Link>
            )}

            {user?.tipo === "CLIENTE" && (
              <Link to="/hallazgos/queja" className={navLinkClass("/hallazgos/queja")} onClick={handleNavClick}>
                Crear Queja
              </Link>
            )}

            {user?.tipo === "ADMIN" && (
              <>
                <Link to="/hallazgos/crear" className={navLinkClass("/hallazgos/crear")} onClick={handleNavClick}>
                  Crear Hallazgo
                </Link>
                <Link to="/usuarios" className={navLinkClass("/usuarios")} onClick={handleNavClick}>
                  Gestion Usuarios
                </Link>
              </>
            )}

          <Link
            to="/notificaciones"
            className="main-navbar__notification"
            onClick={handleNavClick}
            title="Notificaciones"
          >
            <NotificationBadge count={notificationCount} />
          </Link>
          </div>

          {/* User Menu */}
          <div className="main-navbar__user-menu">
            <Link
              to="/perfil"
              className={`main-navbar__profile-avatar${isActive("/perfil") ? " main-navbar__profile-avatar--active" : ""}`}
              onClick={handleNavClick}
              title="Mi Perfil"
            >
              {user?.avatar ? (
                <img
                  src={`/avatars/avatar_${user.avatar}.png`}
                  alt="avatar"
                  style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
                />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20" aria-hidden="true">
                  <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                </svg>
              )}
            </Link>
            <span className="main-navbar__user-label">
              {user?.nombre} ({roleLabel})
            </span>
            <button
              onClick={handleLogout}
              className="main-navbar__logout-btn"
            >
              Cerrar Sesion
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
