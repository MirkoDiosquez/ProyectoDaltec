import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { deleteHallazgo, listHallazgos } from "../../api/hallazgos.js";
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

function getListErrorMessage(context, apiError) {
  const status = apiError?.response?.status;
  const data = apiError?.response?.data;
  const detail = data?.detail || data?.message;
  const passwordError = data?.password_confirmacion?.[0] || data?.password_confirmacion;

  if (context === "load") {
    if (status === 401) return "Tu sesión venció. Volvé a iniciar sesión para consultar los hallazgos.";
    if (status === 403) return "Tu usuario no tiene permiso para ver este listado de hallazgos.";
    if (status >= 500) return "El servidor no pudo devolver el listado de hallazgos. Intentá nuevamente en unos minutos.";
    return "No se pudo cargar el listado de hallazgos con los filtros actuales.";
  }

  if (context === "delete") {
    if (passwordError && /requerida/i.test(String(passwordError))) {
      return "Tenés que ingresar tu contraseña de administrador antes de eliminar el hallazgo.";
    }
    if (passwordError && /invalida|inválida|incorrecta|incorrecto/i.test(String(passwordError))) {
      return "La contraseña de confirmación es incorrecta. Revisala e intentá nuevamente.";
    }
    if (status === 401) return "Tu sesión venció. Iniciá sesión otra vez para poder eliminar hallazgos.";
    if (status === 403) return "Solo los administradores pueden eliminar hallazgos.";
    if (status === 404) return "El hallazgo ya no existe o fue eliminado por otro usuario.";
    if (status >= 500) return "El servidor no pudo procesar la eliminación del hallazgo. Intentá nuevamente.";
    return detail || "No se pudo eliminar el hallazgo seleccionado.";
  }

  return detail || "Ocurrió un error inesperado.";
}

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
  const [deletePanelId, setDeletePanelId] = useState(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteLoadingId, setDeleteLoadingId] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [deletePasswordErrorDialog, setDeletePasswordErrorDialog] = useState("");

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
      } catch (apiError) {
        if (mounted) {
          setError(getListErrorMessage("load", apiError));
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
  const isAdmin = user?.tipo === "ADMIN";

  const closeDeletePanel = () => {
    setDeletePanelId(null);
    setDeletePassword("");
  };

  const openDeletePanel = (hallazgoId) => {
    setSuccessMessage("");
    setError("");
    setDeletePasswordErrorDialog("");
    setDeletePanelId(hallazgoId);
    setDeletePassword("");
  };

  const handleDeleteHallazgo = async (event, hallazgoId) => {
    event.preventDefault();
    const trimmedPassword = deletePassword.trim();
    if (!trimmedPassword) {
      setError(getListErrorMessage("delete", { response: { data: { password_confirmacion: "requerida" } } }));
      return;
    }

    setDeleteLoadingId(hallazgoId);
    setError("");
    setSuccessMessage("");
    setDeletePasswordErrorDialog("");
    try {
      await deleteHallazgo(hallazgoId, trimmedPassword);
      setHallazgos((prev) => prev.filter((item) => item.id !== hallazgoId));
      setSuccessMessage(`Hallazgo #${hallazgoId} eliminado correctamente.`);
      closeDeletePanel();
    } catch (apiError) {
      const message = getListErrorMessage("delete", apiError);
      const passwordError = apiError?.response?.data?.password_confirmacion;
      const isInvalidPassword = Boolean(passwordError)
        && /incorrecta|incorrecto|inválida|invalida/i.test(String(message));

      if (isInvalidPassword) {
        setDeletePassword("");
        setDeletePasswordErrorDialog(message);
      } else {
        setError(message);
      }
    } finally {
      setDeleteLoadingId(null);
    }
  };

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
      {successMessage && (
        <p style={{ color: "#166534", fontWeight: 600, padding: "10px 14px", background: "#f0fdf4", borderRadius: "8px", fontSize: "14px", border: "1px solid #86efac" }}>
          {successMessage}
        </p>
      )}

      {!loading && !error && hallazgos.length === 0 && (
        <p style={{ color: "#94a3b8", fontSize: "14px" }}>No hay hallazgos para mostrar.</p>
      )}

      {!loading && !error && hallazgos.length > 0 && (
        <section style={{ display: "grid", gap: 12 }}>
          {hallazgos.map((item) => {
            const isDeleteOpen = deletePanelId === item.id;
            const isDeleting = deleteLoadingId === item.id;

            return (
              <article
                key={item.id}
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: "14px",
                  padding: "1rem 1.25rem",
                  background: "#ffffff",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
                  display: "grid",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
                  <Link
                    to={`/hallazgos/${item.id}`}
                    style={{
                      textDecoration: "none",
                      color: "inherit",
                      display: "block",
                      flex: 1,
                      minWidth: 0,
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

                  {isAdmin && (
                    <div style={{ display: "grid", gap: 8, minWidth: "190px" }}>
                      <button
                        type="button"
                        onClick={() => {
                          if (isDeleteOpen) {
                            closeDeletePanel();
                          } else {
                            openDeletePanel(item.id);
                          }
                        }}
                        disabled={isDeleting}
                        style={{
                          padding: "0.65rem 1rem",
                          background: isDeleteOpen ? "#fecaca" : "#dc2626",
                          color: isDeleteOpen ? "#7f1d1d" : "#fff",
                          border: "none",
                          borderRadius: "8px",
                          cursor: isDeleting ? "not-allowed" : "pointer",
                          fontWeight: 700,
                          opacity: isDeleting ? 0.6 : 1,
                        }}
                      >
                        {isDeleteOpen ? "Cancelar" : "Eliminar"}
                      </button>
                    </div>
                  )}
                </div>

                {isAdmin && isDeleteOpen && (
                  <form
                    onSubmit={(event) => handleDeleteHallazgo(event, item.id)}
                    style={{
                      display: "grid",
                      gap: 10,
                      padding: "1rem",
                      borderRadius: "10px",
                      border: "1px solid #fca5a5",
                      background: "#fff7f7",
                    }}
                  >
                    <div style={{ display: "grid", gap: 4 }}>
                      <strong style={{ color: "#991b1b" }}>Confirmar eliminación del hallazgo #{item.id}</strong>
                      <span style={{ color: "#7f1d1d", fontSize: "0.9rem" }}>
                        Ingresá nuevamente tu contraseña para confirmar.
                      </span>
                    </div>
                    <input
                      type="password"
                      value={deletePassword}
                      onChange={(event) => setDeletePassword(event.target.value)}
                      placeholder="Contraseña actual"
                      autoComplete="current-password"
                      disabled={isDeleting}
                      style={{ padding: "0.7rem", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                    />
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button
                        type="submit"
                        disabled={isDeleting || !deletePassword.trim()}
                        style={{
                          padding: "0.65rem 1rem",
                          background: "#b91c1c",
                          color: "#fff",
                          border: "none",
                          borderRadius: "8px",
                          cursor: isDeleting || !deletePassword.trim() ? "not-allowed" : "pointer",
                          fontWeight: 700,
                          opacity: isDeleting || !deletePassword.trim() ? 0.6 : 1,
                        }}
                      >
                        {isDeleting ? "Eliminando..." : "Confirmar eliminación"}
                      </button>
                    </div>
                  </form>
                )}
              </article>
            );
          })}
        </section>
      )}

      {deletePasswordErrorDialog && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            zIndex: 220,
          }}
          onClick={() => setDeletePasswordErrorDialog("")}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 460,
              borderRadius: 12,
              border: "1px solid #fecaca",
              background: "#fff",
              padding: "1rem",
              boxShadow: "0 20px 40px rgba(15,23,42,0.25)",
              display: "grid",
              gap: 12,
            }}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="hallazgo-delete-password-error-title"
          >
            <h3 id="hallazgo-delete-password-error-title" style={{ margin: 0, color: "#991b1b" }}>
              Error de confirmación
            </h3>
            <p style={{ margin: 0, color: "#334155", lineHeight: 1.45 }}>
              {deletePasswordErrorDialog}
            </p>
            <p style={{ margin: 0, color: "#64748b", fontSize: "0.9rem" }}>
              Volvé a ingresar la contraseña de administrador para intentar nuevamente.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                type="button"
                onClick={() => setDeletePasswordErrorDialog("")}
                style={{
                  padding: "0.5rem 0.9rem",
                  borderRadius: 8,
                  border: "none",
                  background: "#dc2626",
                  color: "#fff",
                  fontWeight: 700,
                }}
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
