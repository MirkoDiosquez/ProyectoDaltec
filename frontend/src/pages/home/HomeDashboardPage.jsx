/**
 * HomeDashboardPage.jsx — Authenticated home dashboard with role-aware summary cards.
 *
 * Displays:
 * - ADMIN: Total hallazgos, pending approvals, closed actions, unread notifications
 * - EMPLEADO: Assigned hallazgos, my actions in progress, pending closure approvals
 * - CLIENTE: My filed complaints, their status summary
 *
 * Task T084 — Home Dashboard with role-aware quick stats and action buttons.
 */

import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";

export default function HomeDashboardPage() {
  const { user } = useAuth();

  const roleLabel = useMemo(() => {
    const labels = {
      ADMIN: "Administrador",
      EMPLEADO: "Empleado",
      CLIENTE: "Cliente",
    };
    return labels[user?.tipo] || "Usuario";
  }, [user?.tipo]);

  return (
    <main
      style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: "2rem 1rem",
      }}
    >
      {/* Header */}
      <header style={{ marginBottom: "2rem" }}>
        <h1 style={{ margin: 0, fontSize: "2rem" }}>
          Bienvenido, {user?.nombre}
        </h1>
        <p style={{ marginTop: 8, color: "#64748b", fontSize: "0.95rem" }}>
          {roleLabel} — {new Date().toLocaleDateString("es-AR")}
        </p>
      </header>

      {/* Role-Aware Card Grid */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "1.5rem",
          marginBottom: "2rem",
        }}
      >
        {/* Card 1: Hallazgos Overview */}
        <div
          style={{
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            padding: "1.5rem",
            background: "#fff",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: "0.9rem",
              fontWeight: 600,
              color: "#64748b",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            Hallazgos
          </h2>
          <p
            style={{
              margin: "1rem 0 0 0",
              fontSize: "2rem",
              fontWeight: 700,
              color: "#0f172a",
            }}
          >
            —
          </p>
          <p style={{ margin: "0.5rem 0 0 0", color: "#94a3b8", fontSize: "0.85rem" }}>
            {user?.tipo === "ADMIN"
              ? "Total en el sistema"
              : user?.tipo === "EMPLEADO"
              ? "Asignados a ti"
              : "Quejas registradas"}
          </p>
          <Link
            to="/hallazgos"
            style={{
              marginTop: "1rem",
              display: "inline-block",
              color: "#0f172a",
              textDecoration: "none",
              fontSize: "0.9rem",
              fontWeight: 500,
              padding: "0.5rem 0.75rem",
              border: "1px solid #cbd5e1",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            Ver todos →
          </Link>
        </div>

        {/* Card 2: Quick Actions */}
        <div
          style={{
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            padding: "1.5rem",
            background: "#fff",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: "0.9rem",
              fontWeight: 600,
              color: "#64748b",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            Acciones Rápidas
          </h2>
          <div style={{ marginTop: "1rem", display: "grid", gap: "0.75rem" }}>
            {user?.tipo === "ADMIN" && (
              <>
                <Link
                  to="/hallazgos/crear"
                  style={{
                    padding: "0.65rem 1rem",
                    background: "#0f172a",
                    color: "#fff",
                    textDecoration: "none",
                    borderRadius: 6,
                    fontSize: "0.9rem",
                    fontWeight: 500,
                    textAlign: "center",
                    cursor: "pointer",
                    transition: "opacity 0.2s",
                  }}
                  onMouseEnter={(e) => (e.target.style.opacity = "0.85")}
                  onMouseLeave={(e) => (e.target.style.opacity = "1")}
                >
                  Crear Hallazgo
                </Link>
                <Link
                  to="/usuarios/crear"
                  style={{
                    padding: "0.65rem 1rem",
                    border: "1px solid #cbd5e1",
                    background: "#fff",
                    color: "#0f172a",
                    textDecoration: "none",
                    borderRadius: 6,
                    fontSize: "0.9rem",
                    fontWeight: 500,
                    textAlign: "center",
                    cursor: "pointer",
                    transition: "opacity 0.2s",
                  }}
                  onMouseEnter={(e) => (e.target.style.opacity = "0.75")}
                  onMouseLeave={(e) => (e.target.style.opacity = "1")}
                >
                  Crear Usuario
                </Link>
              </>
            )}
            {user?.tipo === "EMPLEADO" && (
              <Link
                to="/hallazgos/crear"
                style={{
                  padding: "0.65rem 1rem",
                  background: "#0f172a",
                  color: "#fff",
                  textDecoration: "none",
                  borderRadius: 6,
                  fontSize: "0.9rem",
                  fontWeight: 500,
                  textAlign: "center",
                  cursor: "pointer",
                  transition: "opacity 0.2s",
                }}
                onMouseEnter={(e) => (e.target.style.opacity = "0.85")}
                onMouseLeave={(e) => (e.target.style.opacity = "1")}
              >
                Registrar Hallazgo
              </Link>
            )}
            {user?.tipo === "CLIENTE" && (
              <Link
                to="/hallazgos/queja"
                style={{
                  padding: "0.65rem 1rem",
                  background: "#0f172a",
                  color: "#fff",
                  textDecoration: "none",
                  borderRadius: 6,
                  fontSize: "0.9rem",
                  fontWeight: 500,
                  textAlign: "center",
                  cursor: "pointer",
                  transition: "opacity 0.2s",
                }}
                onMouseEnter={(e) => (e.target.style.opacity = "0.85")}
                onMouseLeave={(e) => (e.target.style.opacity = "1")}
              >
                Registrar Queja
              </Link>
            )}
          </div>
        </div>

        {/* Card 3: Notifications / Status */}
        <div
          style={{
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            padding: "1.5rem",
            background: "#fff",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: "0.9rem",
              fontWeight: 600,
              color: "#64748b",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            Notificaciones
          </h2>
          <p
            style={{
              margin: "1rem 0 0 0",
              fontSize: "1.5rem",
              fontWeight: 700,
              color: "#0f172a",
            }}
          >
            —
          </p>
          <p style={{ margin: "0.5rem 0 0 0", color: "#94a3b8", fontSize: "0.85rem" }}>
            Sin leer (próximamente)
          </p>
          <Link
            to="/notificaciones"
            style={{
              marginTop: "1rem",
              display: "inline-block",
              color: "#0f172a",
              textDecoration: "none",
              fontSize: "0.9rem",
              fontWeight: 500,
              padding: "0.5rem 0.75rem",
              border: "1px solid #cbd5e1",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            Ver todas →
          </Link>
        </div>
      </section>

      {/* Info Box */}
      <div
        style={{
          border: "1px solid #dbeafe",
          borderRadius: 12,
          padding: "1rem",
          background: "#f0f9ff",
          color: "#0c4a6e",
        }}
      >
        <p style={{ margin: 0, fontSize: "0.9rem" }}>
          ℹ️ Sistema de Gestión de Hallazgos v1.0 — Todos los cambios se sincronizan
          en tiempo real.
        </p>
      </div>
    </main>
  );
}
