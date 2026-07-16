import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { listHallazgos } from "../../api/hallazgos.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useCatalogoContext } from "../../context/CatalogoContext.jsx";
import "./HallazgoListPage.css";

const tipoLabel = {
  NO_CONFORMIDAD: "No Conformidad",
  OPORTUNIDAD_MEJORA: "Oportunidad de Mejora",
  QUEJA_CLIENTE: "Queja de Cliente",
};

const estadoLabel = {
  PENDIENTE: "Pendiente",
  APROBADO: "Aprobado",
  RECHAZADO: "Rechazado",
  CERRADO: "Cerrado",
};

const estadoColor = {
  PENDIENTE: "#d97706",
  APROBADO: "#1e3a8a",
  RECHAZADO: "#dc2626",
  CERRADO: "#16a34a",
};

export default function HallazgoListPage() {
  const { user } = useAuth();
  const { sectors, getSubseccionesBySetor } = useCatalogoContext();
  const [hallazgos, setHallazgos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchDescripcion, setSearchDescripcion] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("");
  const [sectorFiltroId, setSectorFiltroId] = useState("");
  const [subsectorFiltroId, setSubsectorFiltroId] = useState("");

  const selectedSector = useMemo(
    () => sectors.find((sector) => String(sector.id) === String(sectorFiltroId)),
    [sectors, sectorFiltroId]
  );

  const subseccionesInternas = useMemo(
    () => getSubseccionesBySetor("INTERNO"),
    [getSubseccionesBySetor]
  );

  const showSubsectorFilter = selectedSector?.codigo === "INTERNO";

  useEffect(() => {
    if (!showSubsectorFilter && subsectorFiltroId) {
      setSubsectorFiltroId("");
    }
  }, [showSubsectorFilter, subsectorFiltroId]);

  useEffect(() => {
    let mounted = true;
    const timeoutId = setTimeout(fetchHallazgos, 300);

    async function fetchHallazgos() {
      setLoading(true);
      setError("");
      try {
        const params = {};
        if (searchDescripcion.trim()) {
          params.search = searchDescripcion.trim();
        }
        if (tipoFiltro) {
          params.tipo = tipoFiltro;
        }
        if (estadoFiltro) {
          params.estado = estadoFiltro;
        }
        if (sectorFiltroId) {
          params.sector = sectorFiltroId;
        }
        if (showSubsectorFilter && subsectorFiltroId) {
          params.subseccion = subsectorFiltroId;
        }

        const response = await listHallazgos(params);
        const items = Array.isArray(response) ? response : response?.results || [];
        if (mounted) {
          setHallazgos(items);
        }
      } catch {
        if (mounted) {
          setError("No se pudo cargar el listado de hallazgos.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, [searchDescripcion, tipoFiltro, estadoFiltro, sectorFiltroId, subsectorFiltroId, showSubsectorFilter]);

  const canCreateHallazgo = useMemo(() => user?.tipo === "EMPLEADO", [user?.tipo]);

  return (
    <main className="hallazgo-list-page" style={{ maxWidth: 1100, margin: "0 auto", padding: "2rem 1rem" }}>
      <header className="hallazgo-list-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, color: "#0f172a" }}>Hallazgos</h1>
          <p style={{ marginTop: 4, color: "#64748b", fontSize: "14px" }}>
            Listado filtrado según tu rol.
          </p>
        </div>
        {canCreateHallazgo && (
          <Link
            to="/hallazgos/crear"
            className="hallazgo-list-create-link"
            style={{
              background: "#1e3a8a",
              color: "#fff",
              padding: "0.6rem 1.25rem",
              borderRadius: "8px",
              textDecoration: "none",
              fontWeight: 700,
              fontSize: "14px",
              boxShadow: "0 2px 6px rgba(30,58,138,0.25)",
            }}
          >
            + Crear Hallazgo
          </Link>
        )}
      </header>

      <section className="hallazgo-list-filters" aria-label="Filtros de hallazgos">
        <div className="hallazgo-list-filter-field hallazgo-list-filter-wide">
          <label htmlFor="hallazgo-filter-search">Buscar por descripcion</label>
          <input
            id="hallazgo-filter-search"
            type="text"
            placeholder="Ej: problema de calidad en linea 2"
            value={searchDescripcion}
            onChange={(e) => setSearchDescripcion(e.target.value)}
          />
        </div>

        <div className="hallazgo-list-filter-field">
          <label htmlFor="hallazgo-filter-tipo">Tipo</label>
          <select
            id="hallazgo-filter-tipo"
            value={tipoFiltro}
            onChange={(e) => setTipoFiltro(e.target.value)}
          >
            <option value="">Todos</option>
            {Object.entries(tipoLabel).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="hallazgo-list-filter-field">
          <label htmlFor="hallazgo-filter-estado">Estado del hallazgo</label>
          <select
            id="hallazgo-filter-estado"
            value={estadoFiltro}
            onChange={(e) => setEstadoFiltro(e.target.value)}
          >
            <option value="">Todos</option>
            {Object.entries(estadoLabel).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="hallazgo-list-filter-field">
          <label htmlFor="hallazgo-filter-sector">Sector</label>
          <select
            id="hallazgo-filter-sector"
            value={sectorFiltroId}
            onChange={(e) => setSectorFiltroId(e.target.value)}
          >
            <option value="">Todos</option>
            {sectors.map((sector) => (
              <option key={sector.id} value={sector.id}>
                {sector.nombre}
              </option>
            ))}
          </select>
        </div>

        {showSubsectorFilter && (
          <div className="hallazgo-list-filter-field">
            <label htmlFor="hallazgo-filter-subsector">Subsector</label>
            <select
              id="hallazgo-filter-subsector"
              value={subsectorFiltroId}
              onChange={(e) => setSubsectorFiltroId(e.target.value)}
            >
              <option value="">Todos</option>
              {subseccionesInternas.map((subseccion) => (
                <option key={subseccion.id} value={subseccion.id}>
                  {subseccion.nombre}
                </option>
              ))}
            </select>
          </div>
        )}
      </section>

      {loading && (
        <p style={{ color: "#64748b", fontSize: "14px" }}>Cargando hallazgos...</p>
      )}
      {error && (
        <p style={{ color: "#991b1b", fontWeight: 600, padding: "10px 14px", background: "#fef2f2", borderRadius: "8px", fontSize: "14px" }}>
          {error}
        </p>
      )}

      {!loading && !error && hallazgos.length === 0 && (
        <p style={{ color: "#94a3b8", fontSize: "14px" }}>No hay hallazgos para mostrar.</p>
      )}

      {!loading && !error && hallazgos.length > 0 && (
        <section style={{ display: "grid", gap: 12 }}>
          {hallazgos.map((item) => (
            <Link
              key={item.id}
              to={`/hallazgos/${item.id}`}
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: "14px",
                padding: "1rem 1.25rem",
                textDecoration: "none",
                color: "inherit",
                background: "#ffffff",
                boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
                display: "block",
                transition: "box-shadow 0.15s",
              }}
            >
              <div className="hallazgo-list-card-top" style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <strong style={{ fontSize: "14px", color: "#1e293b", fontWeight: 600 }}>{item.descripcion}</strong>
                <span
                  className="hallazgo-list-status"
                  style={{
                    borderRadius: 999,
                    padding: "0.2rem 0.75rem",
                    fontWeight: 700,
                    fontSize: "11px",
                    color: "#fff",
                    background: estadoColor[item.estado] || "#475569",
                    whiteSpace: "nowrap",
                    letterSpacing: "0.02em",
                  }}
                >
                  {estadoLabel[item.estado] || item.estado}
                </span>
              </div>

              <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <span
                  style={{
                    borderRadius: 999,
                    padding: "0.2rem 0.65rem",
                    fontWeight: 600,
                    fontSize: "11px",
                    background: "#f1f5f9",
                    color: "#334155",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  {tipoLabel[item.tipo] || item.tipo}
                </span>
                <span style={{ color: "#94a3b8", fontSize: "13px" }}>
                  {item.ubicacion}
                </span>
              </div>

              {/* Mostrar estado de acciones */}
              {item.acciones && item.acciones.length > 0 && (
                <div style={{ marginTop: "0.75rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  {item.acciones.map((accion) => {
                    const colorMap = {
                      PENDIENTE: "#fbbf24",
                      EN_PROGRESO: "#60a5fa",
                      SOLICITUD_CIERRE: "#f97316",
                      CERRADA: "#10b981",
                    };
                    const tipoShort = {
                      INMEDIATA: "Inmediata",
                      CORRECTIVA: "Correctiva",
                      VERIFICACION_EFICACIA: "Verif.",
                    };
                    return (
                      <div
                        key={accion.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.4rem",
                          padding: "0.3rem 0.6rem",
                          background: "#f8fafc",
                          border: `1.5px solid ${colorMap[accion.estado] || "#cbd5e1"}`,
                          borderRadius: "6px",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          color: "#334155",
                        }}
                      >
                        <span style={{ fontSize: "0.65rem" }}>{tipoShort[accion.tipo] || accion.tipo}</span>
                        <span
                          style={{
                            width: "6px",
                            height: "6px",
                            borderRadius: "50%",
                            background: colorMap[accion.estado] || "#cbd5e1",
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </Link>
          ))}
        </section>
      )}
    </main>
  );
}
