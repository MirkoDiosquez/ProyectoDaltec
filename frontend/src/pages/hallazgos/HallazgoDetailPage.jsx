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
} from "../../api/hallazgos.js";
import { useAuth } from "../../context/AuthContext.jsx";
import SolicitudCierreAdminView from "../acciones/SolicitudCierreAdminView.jsx";
import FilePreview from "../../components/FilePreview.jsx";
import ResponsableList from "../../components/ResponsableList.jsx";
import SolicitudCambioForm from "../../components/hallazgos/SolicitudCambioForm.jsx";
import SolicitudList from "../../components/hallazgos/SolicitudList.jsx";

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
  VERIFICACION_EFICIENCIA: "Verificacion de Eficiencia",
};

export default function HallazgoDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();

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

  const isAdmin = user?.tipo === "ADMIN";

  const refreshDetail = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getHallazgo(id);
      setHallazgo(data);
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
    event.preventDefault();
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

  if (loading) {
    return <main style={{ padding: "2rem" }}>Cargando hallazgo...</main>;
  }

  if (!hallazgo) {
    return <main style={{ padding: "2rem" }}>Hallazgo no encontrado.</main>;
  }

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: "2rem 1rem", display: "grid", gap: 16 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ margin: 0 }}>Detalle de Hallazgo</h1>
          <p style={{ marginTop: 6, color: "#475569" }}>
            ID #{hallazgo.id} · {tipoLabel[hallazgo.tipo] || hallazgo.tipo}
          </p>
        </div>
        <Link to="/hallazgos" style={{ textDecoration: "none", color: "#0f172a", fontWeight: 600 }}>
          Volver al listado
        </Link>
      </header>

      {error && <p style={{ margin: 0, color: "#b91c1c", fontWeight: 700 }}>{error}</p>}

      <section style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: "1rem", background: "#f0f4f8" }}>
        <Link
          to={`/hallazgos/${hallazgo.id}/chat`}
          style={{
            textDecoration: "none",
            fontWeight: 600,
            display: "inline-block",
            padding: "8px 12px",
            backgroundColor: "#3b82f6",
            color: "white",
            borderRadius: "4px",
          }}
        >
          💬 Open Chat
        </Link>
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

      <section style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: "1rem", background: "#fff", display: "grid", gap: 8 }}>
        <h2 style={{ margin: 0 }}>Acciones Correctivas</h2>
        {Array.isArray(hallazgo.acciones) && hallazgo.acciones.length > 0 ? (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {hallazgo.acciones.map((accion) => (
              <li key={accion.id} style={{ marginBottom: 6 }}>
                {tipoAccionLabel[accion.tipo] || accion.tipo} - {estadoAccionLabel[accion.estado] || accion.estado}
                <Link
                  to={`/acciones/${accion.id}?hallazgo=${hallazgo.id}`}
                  style={{ marginLeft: 10, textDecoration: "none", fontWeight: 600 }}
                >
                  Ver detalle
                </Link>
              </li>
            ))}
          </ul>
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
            <button type="button" disabled={actionLoading} onClick={() => doAdminAction(rechazar)}>
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

      <section style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: "1rem", background: "#fff", display: "grid", gap: 10 }}>
        <h2 style={{ margin: 0 }}>Responsables</h2>

        {Array.isArray(hallazgo.responsables) && hallazgo.responsables.length > 0 ? (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {hallazgo.responsables.map((r) => (
              <li key={r.id} style={{ marginBottom: 6 }}>
                {r.nombre} {r.apellido} (DNI: {r.dni})
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ margin: 0 }}>Sin responsables asignados.</p>
        )}
      </section>

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

      {/* T111: SolicitudCambioForm for responsables (non-admin only) */}
      {!isAdmin && hallazgo?.responsables?.some((r) => r.id === user?.id) && (
        <SolicitudCambioForm
          hallazgoId={hallazgo.id}
          usuarios={usuarios}
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
          <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 8 }}>
            {porques.map((p) => (
              <li key={p.id} style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: "0.75rem" }}>
                <p style={{ margin: 0, fontWeight: 600 }}>{p.texto_causa}</p>
                <p style={{ margin: "4px 0 0 0", color: "#475569" }}>
                  Estado: {p.estado} · Autor: {p.autor_nombre || "-"}
                </p>
                {p.observacion_rechazo ? (
                  <p style={{ margin: "4px 0 0 0", color: "#b91c1c" }}>
                    Observación: {p.observacion_rechazo}
                  </p>
                ) : null}
                {isAdmin && p.estado === "pendiente" ? (
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <button type="button" disabled={actionLoading} onClick={() => onApprovePorque(p.id)}>
                      Aprobar
                    </button>
                    <button type="button" disabled={actionLoading} onClick={() => onRejectPorque(p.id)}>
                      Rechazar
                    </button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ margin: 0 }}>Todavía no hay porqués registrados.</p>
        )}
      </section>

      <section style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: "1rem", background: "#fff", display: "grid", gap: 10 }}>
        <h2 style={{ margin: 0 }}>Archivos</h2>
        <form onSubmit={onUploadArchivo} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input
            type="file"
            onChange={(event) => setArchivo(event.target.files?.[0] || null)}
            disabled={actionLoading}
            required
          />
          <button type="submit" disabled={actionLoading || !archivo}>
            Subir Archivo
          </button>
        </form>
      </section>

      {isAdmin && <SolicitudCierreAdminView hallazgoId={hallazgo.id} onChanged={refreshDetail} />}

      {/* Phase 6 (T077): Display archivos section */}
      {Array.isArray(hallazgo.archivos) && hallazgo.archivos.length > 0 && (
        <section style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: "1rem", background: "#fff", display: "grid", gap: 10 }}>
          <h2 style={{ margin: 0 }}>Archivos Adjuntos</h2>
          {hallazgo.archivos.map((archivo) => (
            <FilePreview key={archivo.id} archivo={archivo} />
          ))}
        </section>
      )}
    </main>
  );
}
