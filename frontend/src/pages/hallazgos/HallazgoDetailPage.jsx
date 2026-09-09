import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  addResponsable,
  aprobar,
  getHallazgo,
  rechazar,
  reclasificar,
  removeResponsable,
  uploadArchivo,
  listUsuarios,
  createSolicitudCambio,
  listSolicitudesCambio,
  approveSolicitudCambio,
  rejectSolicitudCambio,
  getHistorialResponsables,
} from "../../api/hallazgos.js";
import { listPorquesAccion } from "../../api/acciones.js";
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

function getDetailErrorMessage(context, apiError) {
  const status = apiError?.response?.status;
  const data = apiError?.response?.data;
  const detail = data?.detail
    || data?.non_field_errors?.[0]
    || data?.archivo?.[0]
    || data?.texto_causa?.[0]
    || data?.tipo?.[0]
    || data?.observacion?.[0]
    || data?.observacion_rechazo?.[0];

  if (status === 401) {
    return "Tu sesión venció. Volvé a iniciar sesión para continuar trabajando sobre este hallazgo.";
  }

  if (status === 403) {
    const forbiddenMessages = {
      load: "No tenés permisos para acceder a este hallazgo.",
      adminAction: "Esta acción está reservada para administradores.",
      addResponsable: "No tenés permisos para asignar responsables en este hallazgo.",
      removeResponsable: "No tenés permisos para remover responsables de este hallazgo.",
      uploadArchivo: "No tenés permisos para adjuntar archivos a este hallazgo.",
      createPorque: "Solo admin o responsables asignados pueden agregar porqués.",
      approvePorque: "Solo admin puede aprobar porqués pendientes.",
      rejectPorque: "Solo admin puede rechazar porqués pendientes.",
      createSolicitud: "No tenés permisos para solicitar cambios de responsable.",
      approveSolicitud: "Solo admin puede aprobar solicitudes de cambio de responsable.",
      rejectSolicitud: "Solo admin puede rechazar solicitudes de cambio de responsable.",
    };
    return forbiddenMessages[context] || "No tenés permisos para realizar esta acción en el hallazgo.";
  }

  if (status === 404) {
    if (context === "load") return "El hallazgo no existe o fue eliminado.";
    return "El recurso que intentás modificar ya no está disponible en este hallazgo.";
  }

  const fallbackMessages = {
    load: "No se pudo cargar el detalle del hallazgo. Verificá tu conexión e intentá nuevamente.",
    adminAction: detail || "No se pudo completar la acción administrativa sobre el hallazgo.",
    addResponsable: detail || "No se pudo agregar el responsable. Revisá si ya estaba asignado o si el usuario existe.",
    removeResponsable: detail || "No se pudo remover el responsable. Puede que ya no esté asignado.",
    uploadArchivo: detail || "No se pudo cargar el archivo. Revisá el formato y el tamaño antes de reintentar.",
    createPorque: detail || "No se pudo crear el porqué. Asegurate de completar la causa raíz correctamente.",
    approvePorque: detail || "No se pudo aprobar el porqué seleccionado.",
    rejectPorque: detail || "No se pudo rechazar el porqué seleccionado.",
    createSolicitud: detail || "No se pudo enviar la solicitud de cambio de responsable.",
    approveSolicitud: detail || "No se pudo aprobar la solicitud de cambio de responsable.",
    rejectSolicitud: detail || "No se pudo rechazar la solicitud de cambio de responsable.",
  };

  return fallbackMessages[context] || detail || "Ocurrió un error inesperado en este apartado del hallazgo.";
}

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
    } catch (apiError) {
      setError(getDetailErrorMessage("load", apiError));
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

  const accionCorrectiva = useMemo(
    () => (Array.isArray(hallazgo?.acciones)
      ? hallazgo.acciones.find((a) => a.tipo === "CORRECTIVA")
      : null),
    [hallazgo?.acciones]
  );

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
      setError(getDetailErrorMessage("adminAction", apiError));
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
      setError(getDetailErrorMessage("addResponsable", apiError));
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
      setError(getDetailErrorMessage("removeResponsable", apiError));
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
      setError(getDetailErrorMessage("uploadArchivo", apiError));
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
      const message = getDetailErrorMessage("createSolicitud", apiError);
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
      setError(getDetailErrorMessage("approveSolicitud", apiError));
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
      setError(getDetailErrorMessage("rejectSolicitud", apiError));
      throw apiError;
    } finally {
      setActionLoading(false);
    }
  };

  const onExportPdf = async () => {
    setPdfLoading(true);
    setError("");
    try {
      let porques = [];
      if (accionCorrectiva?.id) {
        const porquesData = await listPorquesAccion(id, accionCorrectiva.id);
        porques = Array.isArray(porquesData) ? porquesData : [];
      }

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
        <h2 style={{ margin: 0 }}>Archivos</h2>
        <FileUpload
          deferred
          value={archivo}
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
          {hallazgo.archivos.map((archivoItem) => {
            const isOwner = archivoItem.cargado_por === user?.id;
            const hallazgoAbierto = hallazgo.estado !== "CERRADO";
            const canDelete = isAdmin || (isOwner && hallazgoAbierto);
            return (
              <FilePreview
                key={archivoItem.id}
                archivo={archivoItem}
                isAdmin={isAdmin}
                canDelete={canDelete}
                onDeleted={refreshDetail}
              />
            );
          })}
        </section>
      )}
    </main>
  );
}
