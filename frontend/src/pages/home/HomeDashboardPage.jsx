/**
 * HomeDashboardPage.jsx — Authenticated home dashboard with role-aware summary cards.
 *
 * Displays:
 * - ADMIN: Total hallazgos, pending approvals, closed actions, unread notifications + dashboard
 * - EMPLEADO: Assigned hallazgos, my actions in progress, pending closure approvals
 * - CLIENTE: My filed complaints, their status summary
 *
 * Task T084 — Home Dashboard with role-aware quick stats and action buttons.
 */

import { useMemo, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { useNotificaciones } from "../../context/NotificacionContext.jsx";
import { listHallazgos, getEstadisticas } from "../../api/hallazgos.js";

// Simple pie chart component
function PieChart({ data = [], labelKey = "label", valueKey = "count" }) {
  if (!data || data.length === 0) {
    return <p style={{ color: "#94a3b8" }}>Sin datos</p>;
  }

  const total = data.reduce((sum, item) => sum + item[valueKey], 0);
  const colors = ["#2563eb", "#16a34a", "#ea580c", "#9333ea", "#0891b2", "#dc2626", "#ca8a04", "#0d9488"];

  let currentAngle = 0;
  const slices = data.map((item, index) => {
    const value = item[valueKey];
    const percentage = (value / total) * 100;
    const sliceAngle = (percentage / 100) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sliceAngle;
    currentAngle = endAngle;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = 100 + 80 * Math.cos(startRad);
    const y1 = 100 + 80 * Math.sin(startRad);
    const x2 = 100 + 80 * Math.cos(endRad);
    const y2 = 100 + 80 * Math.sin(endRad);

    // Handle full circle (360°) by drawing two 180° arcs
    let pathData;
    if (sliceAngle >= 359.9) {
      // Full circle: draw two semicircles
      const mid1X = 100 + 80 * Math.cos(startRad);
      const mid1Y = 100 + 80 * Math.sin(startRad);
      const mid2X = 100 + 80 * Math.cos((startRad + Math.PI));
      const mid2Y = 100 + 80 * Math.sin((startRad + Math.PI));
      
      pathData = [
        `M ${mid1X} ${mid1Y}`,
        `A 80 80 0 0 1 ${mid2X} ${mid2Y}`,
        `A 80 80 0 0 1 ${mid1X} ${mid1Y}`,
        `Z`,
      ].join(" ");
    } else {
      const largeArc = sliceAngle > 180 ? 1 : 0;
      pathData = [
        `M 100 100`,
        `L ${x1} ${y1}`,
        `A 80 80 0 ${largeArc} 1 ${x2} ${y2}`,
        `Z`,
      ].join(" ");
    }

    const labelAngle = startAngle + sliceAngle / 2;
    const labelRad = (labelAngle * Math.PI) / 180;
    const labelX = 100 + 32 * Math.cos(labelRad);
    const labelY = 100 + 32 * Math.sin(labelRad);

    return {
      path: pathData,
      color: colors[index % colors.length],
      label: item[labelKey],
      value: value,
      percentage: Math.round(percentage),
      showLabel: percentage >= 6,
      labelX,
      labelY,
    };
  });

  return (
    <div style={{ display: "flex", gap: "1.5rem", alignItems: "flex-start", flexWrap: "wrap" }}>
      <svg width="180" height="180" viewBox="0 0 220 220" style={{ flexShrink: 0 }}>
        {slices.map((slice, idx) => (
          <g key={idx}>
            <path d={slice.path} fill={slice.color} stroke="#fff" strokeWidth="2" />
            {slice.showLabel && (
              <text
                x={slice.labelX}
                y={slice.labelY}
                textAnchor="middle"
                dominantBaseline="middle"
                style={{ fontSize: "13px", fontWeight: "800", fill: "#fff", pointerEvents: "none" }}
                stroke="rgba(0,0,0,0.35)"
                strokeWidth="3"
                paintOrder="stroke"
              >
                {slice.percentage}%
              </text>
            )}
          </g>
        ))}
      </svg>
      <div style={{ flex: 1, minWidth: "200px", display: "grid", gap: "0.4rem" }}>
        {slices.map((slice, idx) => (
          <div key={idx} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem" }}>
            <div style={{ width: 12, height: 12, borderRadius: "2px", background: slice.color, flexShrink: 0 }} />
            <span style={{ fontWeight: 600, color: "#334155" }}>{slice.label}:</span>
            <span style={{ color: "#64748b" }}>{slice.value}</span>
            <span style={{ color: "#94a3b8", fontSize: "0.78rem" }}>({slice.percentage}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HomeDashboardPage() {
  const { user } = useAuth();
  const { unreadCount } = useNotificaciones();
  const [hallazgosCount, setHallazgosCount] = useState(0);
  const [estadisticas, setEstadisticas] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        // Load hallazgos count
        const hallazgosData = await listHallazgos({ limit: 1 });
        if (mounted) {
          const count = hallazgosData?.count || (Array.isArray(hallazgosData) ? hallazgosData.length : 0);
          setHallazgosCount(count);
        }

        // Load admin statistics if user is admin
        if (user?.tipo === "ADMIN") {
          console.log("Loading admin statistics...");
          const stats = await getEstadisticas();
          console.log("Stats received:", stats);
          if (mounted) {
            setEstadisticas(stats);
          }
        }
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    if (user) {
      loadData();
    }
    
    return () => {
      mounted = false;
    };
  }, [user?.tipo]);

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
            {hallazgosCount}
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
              color: "#1e3a8a",
              textDecoration: "none",
              fontSize: "0.9rem",
              fontWeight: 600,
              padding: "0.5rem 0.75rem",
              border: "1.5px solid #1e3a8a",
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
                background: "#1e3a8a",
                color: "#fff",
                textDecoration: "none",
                borderRadius: 8,
                fontSize: "0.9rem",
                fontWeight: 600,
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
                  to="/usuarios"
                  style={{
                    padding: "0.65rem 1rem",
                    border: "1.5px solid #1e3a8a",
                    background: "transparent",
                    color: "#1e3a8a",
                    textDecoration: "none",
                    borderRadius: 8,
                    fontSize: "0.9rem",
                    fontWeight: 600,
                    textAlign: "center",
                    cursor: "pointer",
                  }}
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
                background: "#1e3a8a",
                color: "#fff",
                textDecoration: "none",
                borderRadius: 8,
                fontSize: "0.9rem",
                fontWeight: 600,
                textAlign: "center",
                cursor: "pointer",
              }}
            >
              Registrar Hallazgo
            </Link>
            )}
            {user?.tipo === "CLIENTE" && (
              <Link
                to="/hallazgos/queja"
                style={{
                  padding: "0.65rem 1rem",
                  background: "#1e3a8a",
                  color: "#fff",
                  textDecoration: "none",
                  borderRadius: 8,
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  textAlign: "center",
                  cursor: "pointer",
                }}
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
            {unreadCount}
          </p>
          <p style={{ margin: "0.5rem 0 0 0", color: "#94a3b8", fontSize: "0.85rem" }}>
            Sin leer
          </p>
          <Link
            to="/notificaciones"
            style={{
              marginTop: "1rem",
              display: "inline-block",
              color: "#1e3a8a",
              textDecoration: "none",
              fontSize: "0.9rem",
              fontWeight: 600,
              padding: "0.5rem 0.75rem",
              border: "1.5px solid #1e3a8a",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            Ver todas →
          </Link>
        </div>
      </section>

      {/* Admin Dashboard: Statistics and Charts */}
      {user?.tipo === "ADMIN" && estadisticas && (
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
            gap: "1.5rem",
            marginBottom: "2rem",
            marginTop: "2rem",
          }}
        >
          {/* Hallazgos por Tipo */}
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
                fontSize: "1rem",
                fontWeight: 700,
                color: "#0f172a",
                marginBottom: "1rem",
              }}
            >
              Hallazgos por Tipo
            </h2>
            <PieChart data={estadisticas.hallazgos_por_tipo} labelKey="tipo" />
          </div>

          {/* Hallazgos por Subsección (INTERNO) */}
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
                fontSize: "1rem",
                fontWeight: 700,
                color: "#0f172a",
                marginBottom: "1rem",
              }}
            >
              Hallazgos por Subsección (Interno)
            </h2>
            <PieChart data={estadisticas.hallazgos_por_subseccion} labelKey="subseccion__nombre" />
          </div>

          {/* Acciones Abiertas por Tipo */}
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
                fontSize: "1rem",
                fontWeight: 700,
                color: "#0f172a",
                marginBottom: "1rem",
              }}
            >
              Acciones Abiertas por Tipo
            </h2>
            <PieChart data={estadisticas.acciones_abiertas} labelKey="tipo" />
          </div>
        </section>
      )}

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
