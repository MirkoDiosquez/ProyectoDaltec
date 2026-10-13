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
import { AgCharts } from "ag-charts-react";
import * as AgChartsCommunity from "ag-charts-community";
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
    // Small slices need their percentage closer to the rim so it remains
    // visually associated with that slice instead of drifting toward the pie center.
    const labelRadius = Math.min(68, 54 + (50 - Math.min(percentage, 50)) * 0.28);
    const labelX = 100 + labelRadius * Math.cos(labelRad);
    const labelY = 100 + labelRadius * Math.sin(labelRad);

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

const HALLAZGO_TYPE_STYLES = {
  NO_CONFORMIDAD: { label: "No Conformidad", color: "#2563eb" },
  OPORTUNIDAD_MEJORA: { label: "Oportunidad de Mejora", color: "#16a34a" },
  QUEJA_CLIENTE: { label: "Queja de Cliente", color: "#ea580c" },
};

const PERIODICITY_OPTIONS = [
  { value: "month", label: "Mes" },
  { value: "bimonth", label: "Bimestre" },
  { value: "quarter", label: "Trimestre" },
];

const MONTH_LABELS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function HallazgosPorPeriodoChart({ data = [], aggregationMode = "quarter", onAggregationModeChange }) {
  const years = useMemo(() => {
    const uniqueYears = [...new Set(data.map((item) => item.anio).filter((value) => value != null))];
    return uniqueYears.sort((a, b) => b - a);
  }, [data]);

  const [selectedYear, setSelectedYear] = useState(() => years[0] ?? new Date().getFullYear());
  const [displayMode, setDisplayMode] = useState("all_combined");
  const [hiddenSeries, setHiddenSeries] = useState(() => new Set());
  const [hoveredLegendItem, setHoveredLegendItem] = useState(null);

  useEffect(() => {
    if (years.length === 0) {
      setSelectedYear(new Date().getFullYear());
      return;
    }

    if (!years.includes(selectedYear)) {
      setSelectedYear(years[0]);
    }
  }, [years, selectedYear]);

  const periodData = useMemo(() => {
    const monthsPerPeriod = aggregationMode === "month" ? 1 : aggregationMode === "bimonth" ? 2 : 3;
    const periodCount = 12 / monthsPerPeriod;
    const periodLabel = (periodNumber) => {
      const firstMonth = (periodNumber - 1) * monthsPerPeriod;
      if (aggregationMode === "month") return MONTH_LABELS[firstMonth];
      const lastMonth = firstMonth + monthsPerPeriod - 1;
      return `${MONTH_LABELS[firstMonth]}-${MONTH_LABELS[lastMonth]}`;
    };
    const selectedItems = data.filter((item) => item.anio === selectedYear);
    const periodMap = new Map();

    selectedItems.forEach((item) => {
      const periodNumber = Math.ceil(item.mes / monthsPerPeriod);
      const current = periodMap.get(periodNumber) || {
        periodo: periodNumber,
        label: periodLabel(periodNumber),
        total: 0,
        ...Object.fromEntries(Object.keys(HALLAZGO_TYPE_STYLES).map((tipo) => [tipo, 0])),
      };

      Object.keys(HALLAZGO_TYPE_STYLES).forEach((tipo) => {
        current[tipo] += Number(item[tipo] || 0);
      });
      current.total += Number(item.total || 0);
      periodMap.set(periodNumber, current);
    });

    return Array.from({ length: periodCount }, (_, index) => {
      const periodo = index + 1;
      const source = periodMap.get(periodo) || {};
      const normalized = {
        anio: selectedYear,
        periodo,
        label: periodLabel(periodo),
        total: Number(source.total || 0),
      };

      Object.keys(HALLAZGO_TYPE_STYLES).forEach((tipo) => {
        normalized[tipo] = Number(source[tipo] || 0);
      });

      return normalized;
    });
  }, [aggregationMode, data, selectedYear]);

  const chartModes = [
    { value: "all_combined", label: "Total" },
    { value: "all_grouped", label: "Por tipo" },
  ];

  const chartData = useMemo(
    () => periodData.map((item) => {
      let columns;

      if (displayMode === "all_combined") {
        columns = [{ id: "total", value: item.total, color: "#334155" }];
      } else if (displayMode === "all_grouped") {
        columns = Object.entries(HALLAZGO_TYPE_STYLES).map(([id, style]) => ({
          id,
          value: item[id],
          color: style.color,
        }));
      } else {
        const style = HALLAZGO_TYPE_STYLES[displayMode];
        columns = [{ id: displayMode, value: item[displayMode], color: style.color }];
      }

      const visibleColumns = columns.filter(
        (column) => column.value > 0 && !hiddenSeries.has(column.id)
      );
      const positions = visibleColumns.length === 1
        ? [1]
        : visibleColumns.length === 2
          ? [0, 2]
          : [0, 1, 2];
      const row = {
        period: item.label,
        column1: 0,
        column2: 0,
        column3: 0,
      };

      visibleColumns.forEach((column, index) => {
        const slot = positions[index] + 1;
        row[`column${slot}`] = column.value;
        row[`column${slot}Color`] = column.color;
      });

      return row;
    }),
    [displayMode, hiddenSeries, periodData]
  );

  const chartLegendItems = useMemo(() => {
    if (displayMode === "all_combined") {
      return [{ id: "total", label: "Hallazgos", color: "#334155" }];
    }

    if (displayMode === "all_grouped") {
      return Object.entries(HALLAZGO_TYPE_STYLES).map(([id, style]) => ({
        id,
        label: style.label,
        color: style.color,
      }));
    }

    const style = HALLAZGO_TYPE_STYLES[displayMode];
    return [{ id: displayMode, label: style.label, color: style.color }];
  }, [displayMode]);

  useEffect(() => {
    setHiddenSeries(new Set());
  }, [aggregationMode, displayMode, selectedYear]);

  const toggleLegendItem = (seriesId) => {
    setHiddenSeries((current) => {
      const next = new Set(current);
      if (next.has(seriesId)) {
        next.delete(seriesId);
      } else {
        next.add(seriesId);
      }
      return next;
    });
  };

  const isolateLegendItem = (seriesId) => {
    setHiddenSeries((current) => {
      const onlySelectedSeriesVisible = chartLegendItems.every(
        (item) => item.id === seriesId || current.has(item.id)
      );
      return onlySelectedSeriesVisible
        ? new Set()
        : new Set(chartLegendItems.filter((item) => item.id !== seriesId).map((item) => item.id));
    });
  };

  const chartOptions = useMemo(() => {
    const maxFindings = Math.max(
      10,
      ...chartData.flatMap(({ column1, column2, column3 }) => [column1, column2, column3])
    );
    const common = {
      data: chartData,
      legend: { enabled: false },
      axes: [
        { type: "category", position: "bottom" },
        { type: "number", position: "left", title: { text: "Hallazgos" }, min: 0, max: maxFindings },
      ],
      background: { fill: "transparent" },
    };

    return {
      ...common,
      series: [1, 2, 3].map((slot) => ({
        type: "bar",
        id: `period-column-${slot}`,
        xKey: "period",
        yKey: `column${slot}`,
        yName: "Hallazgos",
        grouped: true,
        fill: "#334155",
        itemStyler: ({ datum, yKey, fill }) => ({
          fill: datum[`${yKey}Color`] || fill,
        }),
      })),
    };
  }, [chartData]);

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", fontWeight: 600, color: "#334155" }}>
            Año
            <select
              value={selectedYear}
              onChange={(event) => setSelectedYear(Number(event.target.value))}
              style={{
                border: "1px solid #cbd5e1",
                borderRadius: 8,
                padding: "0.45rem 0.65rem",
                background: "#fff",
                color: "#0f172a",
                fontWeight: 600,
              }}
            >
              {years.length > 0 ? (
                years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))
              ) : (
                <option value={selectedYear}>{selectedYear}</option>
              )}
            </select>
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", fontWeight: 600, color: "#334155" }}>
            Muestra
            <select
              value={displayMode}
              onChange={(event) => setDisplayMode(event.target.value)}
              style={{
                border: "1px solid #cbd5e1",
                borderRadius: 8,
                padding: "0.45rem 0.65rem",
                background: "#fff",
                color: "#0f172a",
                fontWeight: 600,
              }}
            >
              {chartModes.map((mode) => (
                <option key={mode.value} value={mode.value}>
                  {mode.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div role="group" aria-label="Agrupar hallazgos por periodo" style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
          {PERIODICITY_OPTIONS.map((option) => {
            const isSelected = aggregationMode === option.value;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={isSelected}
                onClick={() => onAggregationModeChange(option.value)}
                style={{
                  border: `1px solid ${isSelected ? "#2563eb" : "#cbd5e1"}`,
                  borderRadius: 8,
                  padding: "0.45rem 0.75rem",
                  background: "#fff",
                  color: isSelected ? "#1d4ed8" : "#475569",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <h3 style={{ margin: 0, textAlign: "center", color: "#0f172a", fontSize: "1.1rem", fontWeight: 700 }}>
        Hallazgos por {PERIODICITY_OPTIONS.find((option) => option.value === aggregationMode)?.label.toLowerCase()} {selectedYear}
      </h3>

      <div style={{ minHeight: 315, width: "100%" }}>
        <AgCharts
          options={chartOptions}
          modules={[
            AgChartsCommunity.BarSeriesModule,
            AgChartsCommunity.CategoryAxisModule,
            AgChartsCommunity.NumberAxisModule,
            AgChartsCommunity.LegendModule,
          ]}
          style={{ width: "100%", height: "315px" }}
        />
      </div>

      <div
        role="group"
        aria-label="Leyenda del gráfico"
        style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "0.35rem" }}
      >
        {chartLegendItems.map((item) => {
          const isHovered = hoveredLegendItem === item.id;
          const isVisible = !hiddenSeries.has(item.id);

          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={isVisible}
              onClick={() => toggleLegendItem(item.id)}
              onDoubleClick={() => isolateLegendItem(item.id)}
              onMouseEnter={() => setHoveredLegendItem(item.id)}
              onMouseLeave={() => setHoveredLegendItem(null)}
              onFocus={() => setHoveredLegendItem(item.id)}
              onBlur={() => setHoveredLegendItem(null)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                border: "1px solid transparent",
                borderRadius: 5,
                padding: "0.3rem 0.55rem",
                background: isHovered ? "rgba(128, 128, 128, 0.2)" : "transparent",
                color: "#475569",
                fontSize: "0.82rem",
                fontWeight: 600,
                opacity: isVisible ? 1 : 0.5,
                cursor: "pointer",
              }}
            >
              <span
                aria-hidden="true"
                style={{ width: 10, height: 10, borderRadius: 2, background: item.color, flexShrink: 0 }}
              />
              {item.label}
            </button>
          );
        })}
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
  const [aggregationMode, setAggregationMode] = useState("quarter");

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

        // Load dashboard statistics for every authenticated user
        const stats = await getEstadisticas();
        if (mounted) {
          setEstadisticas(stats);
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
        width: "100%",
        maxWidth: "none",
        margin: 0,
        padding: "2rem 1.5rem",
        boxSizing: "border-box",
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

      {/* Statistics and Charts */}
      { estadisticas && (
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

          {/* Hallazgos */}
          <div
            style={{
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              padding: "1.5rem",
              background: "#fff",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              gridColumn: "1 / -1",
              width: "calc(-3rem + 95vw)",
              marginLeft: "calc(50% - 47.5vw + 1.5rem)",
            }}
          >
            <HallazgosPorPeriodoChart
              data={estadisticas.hallazgos_por_mes || []}
              aggregationMode={aggregationMode}
              onAggregationModeChange={setAggregationMode}
            />
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
