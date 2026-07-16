import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  addResponsable,
  aprobar,
  approvePorque,
  createPorque,
  getHallazgo,
  listPorques,
  rechazar,
  reclasificar,
  rejectPorque,
  removeResponsable,
  uploadArchivo,
  listUsuarios,
  createSolicitudCambio,
  listSolicitudesCambio,
  approveSolicitudCambio,
  rejectSolicitudCambio,
  getHistorialResponsables,
} from "../../api/hallazgos.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useNotificaciones } from "../../context/NotificacionContext.jsx";
import SolicitudCierreAdminView from "../acciones/SolicitudCierreAdminView.jsx";
import FilePreview from "../../components/FilePreview.jsx";
import FileUpload from "../../components/FileUpload.jsx";
import ResponsableList from "../../components/ResponsableList.jsx";
import HistorialResponsablesPanel from "../../components/hallazgos/HistorialResponsablesPanel.jsx";
import SolicitudCambioForm from "../../components/hallazgos/SolicitudCambioForm.jsx";
import SolicitudList from "../../components/hallazgos/SolicitudList.jsx";
import { exportHallazgoCompletoPdf } from "../../utils/hallazgoPdf.js";
import "./HallazgoDetailPage.css";

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

const estadoAccionLabel = {
  PENDIENTE: "Pendiente",
  EN_PROGRESO: "En progreso",
  SOLICITUD_CIERRE: "Solicitud de cierre",
  CERRADA: "Cerrada",
};

const tipoAccionLabel = {
  INMEDIATA: "Inmediata",
  CORRECTIVA: "Correctiva",
  VERIFICACION_EFICACIA: "Verificacion de Eficacia",
};

export default function HallazgoDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { markHallazgoNotificationsAsRead } = useNotificaciones();

  const [hallazgo, setHallazgo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const [nuevoTipo, setNuevoTipo] = useState("OPORTUNIDAD_MEJORA");
  const [responsableId, setResponsableId] = useState("");
  const [archivo, setArchivo] = useState(null);
  const [porques, setPorques] = useState([]);
  const [nuevoPorque, setNuevoPorque] = useState("");

  // T111, T113: State for solicitudes de cambio de responsable
  const [usuarios, setUsuarios] = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);
  const [historialResponsables, setHistorialResponsables] = useState([]);
  const [pdfLoading, setPdfLoading] = useState(false);

  const isAdmin = user?.tipo === "ADMIN";

  const refreshDetail = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getHallazgo(id);
      setHallazgo(data);
      markHallazgoNotificationsAsRead(id);
      const porquesData = await listPorques(id);
      setPorques(Array.isArray(porquesData) ? porquesData : []);
      if (data?.tipo && data.tipo !== "QUEJA_CLIENTE") {
        setNuevoTipo(data.tipo);
      }
      
      // T111, T113: Load usuarios and solicitudes de cambio
      const usuariosData = await listUsuarios({ limit: 1000 });
      setUsuarios(Array.isArray(usuariosData) ? usuariosData : usuariosData.results || []);
      
      const solicitudesData = await listSolicitudesCambio(id);
      setSolicitudes(Array.isArray(solicitudesData) ? solicitudesData : solicitudesData.results || []);

      const historialData = await getHistorialResponsables(id);
      setHistorialResponsables(Array.isArray(historialData) ? historialData : []);
    } catch {
      setError("No se pudo cargar el hallazgo.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    refreshDetail();
  }, [refreshDetail]);

  const canReclasificar = useMemo(
    () => isAdmin && hallazgo?.estado === "PENDIENTE",
    [isAdmin, hallazgo?.estado]
  );

  const isResponsable = useMemo(
    () => !!hallazgo?.responsables?.some((r) => r.id === user?.id),
    [hallazgo?.responsables, user?.id]
  );

  const canManagePorques = isAdmin || isResponsable;

  const doAdminAction = async (fn, payload = undefined) => {
    setActionLoading(true);
    setError("");
    try {
      if (payload === undefined) {
        await fn(id);
      } else {
        await fn(id, payload);
      }
      await refreshDetail();
    } catch (apiError) {
      setError(apiError?.response?.data?.detail || "No se pudo ejecutar la accion.");
    } finally {
      setActionLoading(false);
    }
  };

  const onAddResponsable = async (event) => {
    event.preventDefault();
    if (!responsableId) return;

    setActionLoading(true);
    setError("");
    try {
      await addResponsable(id, Number(responsableId));
      setResponsableId("");
      await refreshDetail();
    } catch (apiError) {
      setError(apiError?.response?.data?.detail || "No se pudo agregar el responsable.");
    } finally {
      setActionLoading(false);
    }
  };

  const onRemoveResponsable = async (idResponsable) => {
    setActionLoading(true);
    setError("");
    try {
      await removeResponsable(id, Number(idResponsable));
      await refreshDetail();
    } catch (apiError) {
      setError(apiError?.response?.data?.detail || "No se pudo remover el responsable.");
    } finally {
      setActionLoading(false);
    }
  };

  const onUploadArchivo = async (event) => {
    if (event?.preventDefault) event.preventDefault();
    if (!archivo) return;

    setActionLoading(true);
    setError("");
    try {
      await uploadArchivo(id, archivo);
      setArchivo(null);
      await refreshDetail();
    } catch (apiError) {
      setError(apiError?.response?.data?.detail || "No se pudo cargar el archivo.");
    } finally {
      setActionLoading(false);
    }
  };

  const onCreatePorque = async (event) => {
    event.preventDefault();
    const texto = nuevoPorque.trim();
    if (!texto) return;

    setActionLoading(true);
    setError("");
    try {
      await createPorque(id, texto);
      setNuevoPorque("");
      await refreshDetail();
    } catch (apiError) {
      setError(apiError?.response?.data?.detail || "No se pudo crear el porqué.");
    } finally {
      setActionLoading(false);
    }
  };

  const onApprovePorque = async (porqueId) => {
    setActionLoading(true);
    setError("");
    try {
      await approvePorque(id, porqueId);
      await refreshDetail();
    } catch (apiError) {
      setError(apiError?.response?.data?.detail || "No se pudo aprobar el porqué.");
    } finally {
      setActionLoading(false);
    }
  };

  const onRejectPorque = async (porqueId) => {
    const observacion = window.prompt("Motivo de rechazo (opcional):", "") || "";
    setActionLoading(true);
    setError("");
    try {
      await rejectPorque(id, porqueId, observacion);
      await refreshDetail();
    } catch (apiError) {
      setError(apiError?.response?.data?.detail || "No se pudo rechazar el porqué.");
    } finally {
      setActionLoading(false);
    }
  };

  // T111: Handler for creating a new solicitud de cambio de responsable
  const onCreateSolicitud = async (payload) => {
    setActionLoading(true);
    setError("");
    try {
      await createSolicitudCambio(id, payload);
      await refreshDetail();
    } catch (apiError) {
      const message = apiError?.response?.data?.detail || 
                      apiError?.response?.data?.observacion_rechazo?.[0] ||
                      "No se pudo enviar la solicitud.";
      throw new Error(message);
    } finally {
      setActionLoading(false);
    }
  };

  // T113: Handler for approving a solicitud de cambio de responsable
  const onApproveSolicitud = async (solicitudId) => {
    setActionLoading(true);
    setError("");
    try {
      await approveSolicitudCambio(id, solicitudId);
      await refreshDetail();
    } catch (apiError) {
      setError(apiError?.response?.data?.detail || "No se pudo aprobar la solicitud.");
      throw apiError;
    } finally {
      setActionLoading(false);
    }
  };

  // T113: Handler for rejecting a solicitud de cambio de responsable
  const onRejectSolicitud = async (solicitudId, observacion) => {
    setActionLoading(true);
    setError("");
    try {
      await rejectSolicitudCambio(id, solicitudId, observacion);
      await refreshDetail();
    } catch (apiError) {
      setError(apiError?.response?.data?.detail || "No se pudo rechazar la solicitud.");
      throw apiError;
    } finally {
      setActionLoading(false);
    }
  };

  const onExportPdf = async () => {
    setPdfLoading(true);
    setError("");
    try {
      exportHallazgoCompletoPdf({
        hallazgo,
        porques,
        solicitudes,
        historial: historialResponsables,
      });
    } catch (pdfError) {
      setError(pdfError?.message || "No se pudo generar el PDF del hallazgo.");
    } finally {
      setPdfLoading(false);
    }
  };

  if (loading) {
    return <main style={{ padding: "2rem" }}>Cargando hallazgo...</main>;
  }

  if (!hallazgo) {
    return <main style={{ padding: "2rem" }}>Hallazgo no encontrado.</main>;
  }

  return (
    <main className="hallazgo-detail-page" style={{ maxWidth: 980, margin: "0 auto", padding: "2rem 1rem", display: "grid", gap: 16 }}>
      <header className="hallazgo-detail-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ margin: 0 }}>Detalle de Hallazgo</h1>
          <p style={{ marginTop: 6, color: "#475569" }}>
            ID #{hallazgo.id} · {tipoLabel[hallazgo.tipo] || hallazgo.tipo}
          </p>
        </div>
        <Link to="/hallazgos" style={{ textDecoration: "none", color: "#1e3a8a", fontWeight: 600, fontSize: "14px" }}>
          ← Volver al listado
        </Link>
      </header>

      {error && <p style={{ margin: 0, color: "#b91c1c", fontWeight: 700 }}>{error}</p>}

      <section style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: "1rem", background: "#f0f4f8" }}>
        <Link
          to={`/hallazgos/${hallazgo.id}/chat`}
          style={{
            textDecoration: "none",
            fontWeight: 600,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 16px",
            backgroundColor: "#1e3a8a",
            color: "white",
            borderRadius: "8px",
            fontSize: "14px",
          }}
        >
          💬 Chat del Hallazgo
        </Link>
      </section>

      <section style={{ border: "1px solid #bfdbfe", borderRadius: 12, padding: "1rem", background: "#eff6ff", display: "grid", gap: 10 }}>
        <h2 style={{ margin: 0, color: "#1e3a8a", fontSize: "1rem" }}>Informe PDF del Hallazgo</h2>
        <p style={{ margin: 0, color: "#334155", fontSize: "0.92rem" }}>
          Genera un PDF con datos del hallazgo, acciones, analisis de 5 porques y demas apartados.
          Este informe excluye completamente archivos adjuntos y su contenido.
        </p>
        <div>
          <button
            type="button"
            disabled={pdfLoading}
            onClick={onExportPdf}
            style={{
              padding: "0.62rem 1rem",
              borderRadius: 8,
              border: "none",
              background: pdfLoading ? "#2563eb" : "#1d4ed8",
              color: "#fff",
              fontWeight: 700,
              cursor: pdfLoading ? "not-allowed" : "pointer",
              opacity: pdfLoading ? 0.7 : 1,
            }}
          >
            {pdfLoading ? "Generando PDF..." : "Generar PDF completo"}
          </button>
        </div>
      </section>

      <section style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: "1rem", background: "#fff" }}>
        <p style={{ marginTop: 0 }}><strong>Descripcion:</strong> {hallazgo.descripcion}</p>
        <p><strong>Ubicacion:</strong> {hallazgo.ubicacion}</p>
        <p><strong>Estado:</strong> {estadoLabel[hallazgo.estado] || hallazgo.estado}</p>
        
        {/* Phase 3: Display sector classification */}
        {hallazgo.sector && (
          <p><strong>Sector:</strong> {hallazgo.sector.nombre}</p>
        )}
        {hallazgo.subseccion && (
          <p><strong>Subsección:</strong> {hallazgo.subseccion.nombre}</p>
        )}
        {hallazgo.tipo_catalogo && (
          <p><strong>Tipo (Catálogo):</strong> {hallazgo.tipo_catalogo.nombre}</p>
        )}
        
        {/* Phase 4: Display external contact if present */}
        {hallazgo.contacto_externo && (
          <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid #e2e8f0" }}>
            <p style={{ margin: "0 0 0.5rem 0", fontWeight: 600 }}>Datos de Contacto Externo:</p>
            <p style={{ margin: "0.25rem 0" }}>
              <strong>Empresa:</strong> {hallazgo.contacto_externo.nombre_empresa}
            </p>
            <p style={{ margin: "0.25rem 0" }}>
              <strong>Teléfono:</strong> {hallazgo.contacto_externo.telefono}
            </p>
            <p style={{ margin: "0.25rem 0" }}>
              <strong>Email:</strong> {hallazgo.contacto_externo.email}
            </p>
          </div>
        )}
        
        {hallazgo.cliente_asociado && (
          <p>
            <strong>Cliente Asociado:</strong>{" "}
            {hallazgo.cliente_asociado.nombre} {hallazgo.cliente_asociado.apellido} ({hallazgo.cliente_asociado.tipo})
          </p>
        )}
      </section>

      <section style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: "1.25rem", background: "#fff", display: "grid", gap: 16 }}>
        <h2 style={{ margin: 0 }}>Acciones Correctivas</h2>
        {Array.isArray(hallazgo.acciones) && hallazgo.acciones.length > 0 ? (
          <div className="hallazgo-detail-acciones-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
            {hallazgo.acciones.map((accion) => {
              const estadoStyles = {
                PENDIENTE:          { bg: "#fef9c3", border: "#fde047", text: "#854d0e", dot: "#ca8a04" },
                EN_PROGRESO:        { bg: "#dbeafe", border: "#93c5fd", text: "#1e3a8a", dot: "#2563eb" },
                SOLICITUD_CIERRE:   { bg: "#fef3c7", border: "#fcd34d", text: "#92400e", dot: "#d97706" },
                CERRADA:            { bg: "#dcfce7", border: "#86efac", text: "#14532d", dot: "#16a34a" },
              };
              const s = estadoStyles[accion.estado] || { bg: "#f1f5f9", border: "#cbd5e1", text: "#334155", dot: "#64748b" };
              const tipoIcons = {
                INMEDIATA: "",
                CORRECTIVA: "",
                VERIFICACION_EFICACIA: "",
              };
              return (
                <div
                  key={accion.id}
                  className="hallazgo-detail-accion-card"
                  style={{
                    border: `1.5px solid ${s.border}`,
                    borderRadius: 12,
                    padding: "1rem 1.1rem",
                    background: s.bg,
                    display: "grid",
                    gap: 10,
                  }}
                >
                  {/* Tipo */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: "1.3rem" }}>{tipoIcons[accion.tipo] || ""}</span>
                    <strong style={{ fontSize: "0.9rem", color: "#0f172a" }}>
                      {tipoAccionLabel[accion.tipo] || accion.tipo}
                    </strong>
                  </div>

                  {/* Estado badge */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{
                      width: 8, height: 8, borderRadius: "50%",
                      background: s.dot, flexShrink: 0,
                    }} />
                    <span style={{ fontSize: "0.8rem", fontWeight: 700, color: s.text }}>
                      {estadoAccionLabel[accion.estado] || accion.estado}
                    </span>
                  </div>

                  {/* Link */}
                  <Link
                    to={`/acciones/${accion.id}?hallazgo=${hallazgo.id}`}
                    style={{
                      display: "inline-block",
                      marginTop: 2,
                      padding: "0.4rem 0.85rem",
                      background: "#1e3a8a",
                      color: "#fff",
                      borderRadius: 7,
                      fontWeight: 600,
                      fontSize: "0.8rem",
                      textAlign: "center",
                    }}
                  >
                    Ver detalle →
                  </Link>
                </div>
              );
            })}
          </div>
        ) : (
          <p style={{ margin: 0 }}>No hay acciones registradas.</p>
        )}
      </section>

      {isAdmin && (
        <section style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: "1rem", background: "#fff", display: "grid", gap: 12 }}>
          <h2 style={{ margin: 0 }}>Acciones de Admin</h2>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" disabled={actionLoading} onClick={() => doAdminAction(aprobar)}>
              Aprobar
            </button>
            <button
              type="button"
              disabled={actionLoading}
              onClick={() => doAdminAction(rechazar)}
              style={{ background: "#dc2626" }}
            >
              Rechazar
            </button>
          </div>

          {canReclasificar && (
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <select
                value={nuevoTipo}
                onChange={(event) => setNuevoTipo(event.target.value)}
                disabled={actionLoading}
              >
                <option value="NO_CONFORMIDAD">No Conformidad</option>
                <option value="OPORTUNIDAD_MEJORA">Oportunidad de Mejora</option>
                <option value="QUEJA_CLIENTE">Queja de Cliente</option>
              </select>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => doAdminAction(reclasificar, nuevoTipo)}
              >
                Reclasificar
              </button>
            </div>
          )}
        </section>
      )}


      {/* T097: Responsable Management Panel (Admin-only) */}
      {isAdmin && hallazgo && (
        <section style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: "1rem", background: "#fff" }}>
          <ResponsableList
            hallazgoId={hallazgo.id}
            currentResponsables={hallazgo.responsables?.map((r) => r.id) || []}
            onResponsableAdded={() => refreshDetail()}
            onResponsableRemoved={() => refreshDetail()}
          />
        </section>
      )}

      {/* Responsables Display (for non-admin users) */}
      {!isAdmin && hallazgo && (
        <section style={{ border: "2px solid #10b981", borderRadius: 8, padding: "1.5rem", background: "#ecfdf5" }}>
          <h3 style={{ margin: "0 0 1rem 0", color: "#065f46", display: "flex", alignItems: "center", gap: 8 }}>
            Responsables Actuales
            <span style={{ 
              background: "#10b981", 
              color: "#fff", 
              borderRadius: "50%", 
              width: 28, 
              height: 28, 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center",
              fontSize: "0.85rem",
              fontWeight: 700,
            }}>
              {hallazgo.responsables?.length || 0}
            </span>
          </h3>

          {Array.isArray(hallazgo.responsables) && hallazgo.responsables.length > 0 ? (
            <div style={{ display: "grid", gap: 10 }}>
              {hallazgo.responsables.map((r) => (
                <div
                  className="hallazgo-detail-responsable-item"
                  key={r.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "1rem",
                    background: "#fff",
                    border: "1px solid #d1fae5",
                    borderRadius: "6px",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      background: "#10b981",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: "0.9rem",
                    }}
                  >
                    {r.nombre.charAt(0)}{r.apellido.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: "#1f2937", fontSize: "0.95rem" }}>
                      {r.nombre} {r.apellido}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                      DNI: {r.dni} • {r.tipo}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ margin: 0, color: "#6b7280" }}>No hay responsables asignados.</p>
          )}
        </section>
      )}

      {/* T111: SolicitudCambioForm for responsables (non-admin only) */}
      {!isAdmin && hallazgo?.responsables?.some((r) => r.id === user?.id) && (
        <SolicitudCambioForm
          hallazgoId={hallazgo.id}
          usuarios={usuarios}
          currentResponsables={hallazgo.responsables?.map((r) => r.id) || []}
          onSubmit={onCreateSolicitud}
          isLoading={actionLoading}
        />
      )}

      {/* T113: SolicitudList for admin view */}
      {isAdmin && solicitudes && solicitudes.length > 0 && (
        <SolicitudList
          hallazgoId={hallazgo.id}
          solicitudes={solicitudes}
          onApprove={onApproveSolicitud}
          onReject={onRejectSolicitud}
          isAdmin={isAdmin}
          isLoading={actionLoading}
        />
      )}

      {/* Historial de Responsables */}
      {hallazgo && (
        <HistorialResponsablesPanel hallazgoId={hallazgo.id} />
      )}

      <section style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: "1rem", background: "#fff", display: "grid", gap: 10 }}>
        <h2 style={{ margin: 0 }}>Análisis de 5 Porqués</h2>

        {canManagePorques ? (
          <form onSubmit={onCreatePorque} style={{ display: "grid", gap: 8 }}>
            <textarea
              rows={3}
              value={nuevoPorque}
              onChange={(event) => setNuevoPorque(event.target.value)}
              placeholder="Describí la causa raíz..."
              disabled={actionLoading}
              style={{ width: "100%", resize: "vertical" }}
            />
            <div>
              <button type="submit" disabled={actionLoading || !nuevoPorque.trim()}>
                Agregar porqué
              </button>
            </div>
          </form>
        ) : (
          <p style={{ margin: 0 }}>Solo Admin o responsables asignados pueden agregar porqués.</p>
        )}

        {Array.isArray(porques) && porques.length > 0 ? (
          <div style={{ display: "grid", gap: 12, marginTop: "1rem" }}>
            {porques.map((p, index) => {
              // Estado styles with visual indicators
              const estadoConfig = {
                pendiente: {
                  color: "#f59e0b",
                  bgColor: "#fef3c7",
                  borderColor: "#fcd34d",
                  label: "Pendiente de aprobación",
                  textColor: "#92400e",
                },
                aprobado: {
                  color: "#10b981",
                  bgColor: "#dcfce7",
                  borderColor: "#86efac",
                  icon: "",
                  label: "Aprobado",
                  textColor: "#14532d",
                },
                rechazado: {
                  color: "#ef4444",
                  bgColor: "#fee2e2",
                  borderColor: "#fca5a5",
                  icon: "✕",
                  label: "Rechazado",
                  textColor: "#7f1d1d",
                },
              };
              
              const config = estadoConfig[p.estado] || estadoConfig.pendiente;
              
              return (
                <div
                  key={p.id}
                  style={{
                    border: `2px solid ${config.borderColor}`,
                    borderRadius: 8,
                    padding: "1.25rem",
                    background: config.bgColor,
                    display: "grid",
                    gap: 10,
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {/* Visual timeline indicator */}
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: "4px",
                      background: config.color,
                    }}
                  />
                  
                  <div style={{ paddingLeft: "12px", display: "grid", gap: 8 }}>
                    {/* Header with number, status badge, and icon */}
                    <div
                      className="hallazgo-detail-porque-header"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div
                          style={{
                            background: config.color,
                            color: "#fff",
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 700,
                            fontSize: "0.9rem",
                          }}
                        >
                          {index + 1}
                        </div>
                        <div style={{ display: "grid", gap: 2 }}>
                          <div
                            style={{
                              fontWeight: 600,
                              fontSize: "0.9rem",
                              color: config.textColor,
                            }}
                          >
                            Porqué 
                          </div>
                          <div
                            style={{
                              fontSize: "0.75rem",
                              color: config.textColor,
                              opacity: 0.7,
                            }}
                          >
                            por {p.autor_nombre || "Admin"}
                          </div>
                        </div>
                      </div>
                      
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          background: "rgba(255,255,255,0.6)",
                          padding: "0.4rem 0.8rem",
                          borderRadius: 6,
                          fontWeight: 600,
                          fontSize: "0.85rem",
                          color: config.textColor,
                        }}
                      >
                        <span style={{ fontSize: "1rem" }}>{config.icon}</span>
                        {config.label}
                      </div>
                    </div>

                    {/* Causa text */}
                    <div
                      style={{
                        fontSize: "0.95rem",
                        color: config.textColor,
                        lineHeight: 1.5,
                        padding: "0.75rem",
                        background: "rgba(255,255,255,0.5)",
                        borderRadius: 6,
                        borderLeft: `3px solid ${config.color}`,
                      }}
                    >
                      {p.texto_causa}
                    </div>

                    {/* Rejection observation if exists */}
                    {p.observacion_rechazo && (
                      <div
                        style={{
                          fontSize: "0.85rem",
                          color: "#7f1d1d",
                          padding: "0.75rem",
                          background: "#fee2e2",
                          borderRadius: 6,
                          borderLeft: "3px solid #ef4444",
                        }}
                      >
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>
                          Motivo del rechazo:
                        </div>
                        {p.observacion_rechazo}
                      </div>
                    )}

                    {/* Metadata footer */}
                    <div
                      className="hallazgo-detail-porque-footer"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        fontSize: "0.75rem",
                        color: config.textColor,
                        opacity: 0.7,
                        paddingTop: "0.5rem",
                        borderTop: `1px solid ${config.borderColor}`,
                      }}
                    >
                      <span>
                        {new Date(p.fecha_creacion || p.created_at).toLocaleDateString("es-AR")}
                      </span>
                      <span>
                        {p.fecha_aprobacion
                          ? `Aprobado: ${new Date(p.fecha_aprobacion).toLocaleDateString("es-AR")}`
                          : "Aún no aprobado"}
                      </span>
                    </div>

                    {/* Action buttons for admin */}
                    {isAdmin && p.estado === "pendiente" && (
                      <div
                        className="hallazgo-detail-porque-actions"
                        style={{
                          display: "flex",
                          gap: 8,
                          marginTop: "0.5rem",
                          paddingTop: "0.5rem",
                          borderTop: `1px solid ${config.borderColor}`,
                        }}
                      >
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() => onApprovePorque(p.id)}
                          style={{
                            padding: "0.5rem 0.85rem",
                            background: "#10b981",
                            color: "#fff",
                            border: "none",
                            borderRadius: 6,
                            cursor: "pointer",
                            fontWeight: 600,
                            fontSize: "0.8rem",
                          }}
                        >
                          ✓ Aprobar
                        </button>
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() => onRejectPorque(p.id)}
                          style={{
                            padding: "0.5rem 0.85rem",
                            background: "#ef4444",
                            color: "#fff",
                            border: "none",
                            borderRadius: 6,
                            cursor: "pointer",
                            fontWeight: 600,
                            fontSize: "0.8rem",
                          }}
                        >
                          ✕ Rechazar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div
            style={{
              textAlign: "center",
              padding: "2rem",
              color: "#999",
              background: "#f5f5f5",
              borderRadius: 8,
              marginTop: "1rem",
            }}
          >
            Todavía no hay porqués registrados. {canManagePorques ? "¡Agrega uno!" : ""}
          </div>
        )}
      </section>

      <section style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: "1rem", background: "#fff", display: "grid", gap: 10 }}>
        <h2 style={{ margin: 0 }}>Archivos</h2>
        <FileUpload
          deferred
          onFileSelect={(file) => setArchivo(file)}
          onError={(msg) => setError(msg)}
          maxSizeMB={1024}
        />
        {archivo && (
          <div className="hallazgo-detail-upload-row" style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              type="button"
              disabled={actionLoading}
              onClick={async (e) => { e.preventDefault(); await onUploadArchivo(e); }}
              style={{ padding: "0.5rem 1.1rem" }}
            >
              {actionLoading ? "Subiendo…" : "Subir Archivo"}
            </button>
          </div>
        )}
      </section>

      {isAdmin && <SolicitudCierreAdminView hallazgoId={hallazgo.id} onChanged={refreshDetail} />}

      {/* Phase 6 (T077): Display archivos section */}
      {Array.isArray(hallazgo.archivos) && hallazgo.archivos.length > 0 && (
        <section style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: "1rem", background: "#fff", display: "grid", gap: 10 }}>
          <h2 style={{ margin: 0 }}>Archivos Adjuntos</h2>
          {hallazgo.archivos.map((archivo) => (
            <FilePreview 
              key={archivo.id} 
              archivo={archivo} 
              isAdmin={isAdmin}
              onDeleted={refreshDetail}
            />
          ))}
        </section>
      )}
    </main>
  );
}
