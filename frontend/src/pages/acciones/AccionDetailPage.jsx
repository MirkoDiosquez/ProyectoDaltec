import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";

import {
  approvePorqueAccion,
  createPorqueAccion,
  getAccion,
  listPorquesAccion,
  rejectPorqueAccion,
  solicitarCierreAccion,
  updateAccion,
  uploadArchivoAccion,
} from "../../api/acciones.js";
import { useAuth } from "../../context/AuthContext.jsx";
import FileUpload from "../../components/FileUpload.jsx";
import FilePreview from "../../components/FilePreview.jsx";

const estadoLabel = {
  PENDIENTE: "Pendiente",
  EN_PROGRESO: "En progreso",
  SOLICITUD_CIERRE: "Solicitud de cierre",
  CERRADA: "Cerrada",
};

const tipoLabel = {
  INMEDIATA: "Inmediata",
  CORRECTIVA: "Correctiva",
  VERIFICACION_EFICACIA: "Verificacion de Eficacia",
};

export default function AccionDetailPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const hallazgoId = searchParams.get("hallazgo");
  const { user } = useAuth();
  const isAdmin = user?.tipo === "ADMIN";

  const [accion, setAccion] = useState(null);
  const [form, setForm] = useState({ descripcion: "", fecha_inicio: "", fecha_fin: "" });
  const [observacion, setObservacion] = useState("");
  const [archivo, setArchivo] = useState(null);
  const [porques, setPorques] = useState([]);
  const [nuevoPorque, setNuevoPorque] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!hallazgoId) {
      setError("Falta el parametro hallazgo en la URL.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await getAccion(hallazgoId, id);
      setAccion(data);
      setForm({
        descripcion: data.descripcion || "",
        fecha_inicio: data.fecha_inicio || "",
        fecha_fin: data.fecha_fin || "",
      });

      if (data?.tipo === "CORRECTIVA") {
        const porquesData = await listPorquesAccion(hallazgoId, id);
        setPorques(Array.isArray(porquesData) ? porquesData : []);
      } else {
        setPorques([]);
      }
    } catch (e) {
      setError(e?.response?.data?.detail || "No se pudo cargar la accion.");
    } finally {
      setLoading(false);
    }
  }, [hallazgoId, id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const puedeSolicitarCierre = useMemo(() => accion?.estado === "EN_PROGRESO", [accion?.estado]);
  const canManagePorques = isAdmin || !!accion?.puede_gestionar_porques;

  const onGuardar = async (event) => {
    event.preventDefault();
    if (!hallazgoId) return;
    setSaving(true);
    setError("");
    try {
      await updateAccion(hallazgoId, id, {
        descripcion: form.descripcion,
        fecha_inicio: form.fecha_inicio || null,
        fecha_fin: form.fecha_fin || null,
      });
      await refresh();
    } catch (e) {
      setError(e?.response?.data?.detail || "No se pudo guardar la accion.");
    } finally {
      setSaving(false);
    }
  };

  const onUpload = async () => {
    if (!hallazgoId || !archivo) return;
    setSaving(true);
    setError("");
    try {
      await uploadArchivoAccion(hallazgoId, id, archivo);
      setArchivo(null);
      await refresh();
    } catch (e) {
      setError(e?.response?.data?.detail || "No se pudo subir el archivo.");
    } finally {
      setSaving(false);
    }
  };

  const onSolicitarCierre = async () => {
    if (!hallazgoId) return;
    setSaving(true);
    setError("");
    try {
      await solicitarCierreAccion(hallazgoId, id, observacion);
      setObservacion("");
      await refresh();
    } catch (e) {
      setError(e?.response?.data?.detail || "No se pudo solicitar el cierre.");
    } finally {
      setSaving(false);
    }
  };

  const onCreatePorque = async (event) => {
    event.preventDefault();
    const texto = nuevoPorque.trim();
    if (!texto || !hallazgoId) return;

    setSaving(true);
    setError("");
    try {
      await createPorqueAccion(hallazgoId, id, texto);
      setNuevoPorque("");
      await refresh();
    } catch (e) {
      setError(e?.response?.data?.detail || "No se pudo crear el porque.");
    } finally {
      setSaving(false);
    }
  };

  const onApprovePorque = async (porqueId) => {
    if (!hallazgoId) return;
    setSaving(true);
    setError("");
    try {
      await approvePorqueAccion(hallazgoId, id, porqueId);
      await refresh();
    } catch (e) {
      setError(e?.response?.data?.detail || "No se pudo aprobar el porque.");
    } finally {
      setSaving(false);
    }
  };

  const onRejectPorque = async (porqueId) => {
    if (!hallazgoId) return;
    const motivo = window.prompt("Motivo de rechazo (opcional):", "") || "";
    setSaving(true);
    setError("");
    try {
      await rejectPorqueAccion(hallazgoId, id, porqueId, motivo);
      await refresh();
    } catch (e) {
      setError(e?.response?.data?.detail || "No se pudo rechazar el porque.");
    } finally {
      setSaving(false);
    }
  };

  const porquesAprobados = Array.isArray(porques)
    ? porques.filter((p) => p.estado === "aprobado")
    : [];
  const porquesNoAprobados = Array.isArray(porques)
    ? porques.filter((p) => p.estado !== "aprobado")
    : [];

  if (loading) {
    return (
      <main style={{ padding: "2rem", fontFamily: "inherit", color: "#64748b" }}>
        Cargando accion...
      </main>
    );
  }

  if (!accion) {
    return (
      <main style={{ padding: "2rem", fontFamily: "inherit", color: "#64748b" }}>
        Accion no encontrada.
      </main>
    );
  }

  const cardStyle = {
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "1.25rem 1.5rem",
    background: "#ffffff",
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
    display: "grid",
    gap: "12px",
  };

  const labelStyle = {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    fontSize: "13px",
    fontWeight: "600",
    color: "#475569",
  };

  const inputStyle = {
    padding: "8px 10px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "14px",
    color: "#1e293b",
    background: "#f8fafc",
    fontFamily: "inherit",
  };

  const textareaStyle = {
    ...inputStyle,
    resize: "vertical",
    width: "100%",
  };

  const btnPrimary = {
    padding: "9px 20px",
    borderRadius: "8px",
    border: "none",
    background: "#1e3a8a",
    color: "#fff",
    fontWeight: "600",
    fontSize: "14px",
    cursor: "pointer",
    fontFamily: "inherit",
  };

  const btnSecondary = {
    padding: "9px 20px",
    borderRadius: "8px",
    border: "1.5px solid #1e3a8a",
    background: "transparent",
    color: "#1e3a8a",
    fontWeight: "600",
    fontSize: "14px",
    cursor: "pointer",
    fontFamily: "inherit",
  };

  return (
    <main style={{ maxWidth: 860, margin: "0 auto", padding: "2rem 1rem", display: "grid", gap: 16 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 700, color: "#0f172a" }}>
            Acción {tipoLabel[accion.tipo] || accion.tipo}
          </h1>
          <p style={{ marginTop: 4, color: "#64748b", fontSize: "14px" }}>
            Estado:{" "}
            <span style={{ fontWeight: 600, color: "#1e293b" }}>
              {estadoLabel[accion.estado] || accion.estado}
            </span>
          </p>
        </div>
        {hallazgoId && (
          <Link
            to={`/hallazgos/${hallazgoId}`}
            style={{
              fontWeight: 600,
              textDecoration: "none",
              color: "#1e3a8a",
              fontSize: "14px",
              padding: "8px 16px",
              borderRadius: "8px",
              border: "1.5px solid #1e3a8a",
              background: "transparent",
            }}
          >
            ← Volver al hallazgo
          </Link>
        )}
      </header>

      {error && (
        <p style={{
          margin: 0,
          color: "#991b1b",
          fontWeight: 600,
          padding: "10px 14px",
          background: "#fef2f2",
          borderRadius: "8px",
          border: "1px solid #fecaca",
          fontSize: "14px",
        }}>
          {error}
        </p>
      )}

      <form onSubmit={onGuardar} style={cardStyle}>
        <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#0f172a" }}>Edición</h2>
        <label style={labelStyle}>
          Descripción
          <textarea
            rows={4}
            value={form.descripcion}
            onChange={(e) => setForm((p) => ({ ...p, descripcion: e.target.value }))}
            placeholder="Descripcion de la accion"
            style={textareaStyle}
          />
        </label>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <label style={{ ...labelStyle, flex: 1, minWidth: 160 }}>
            Fecha inicio
            <input
              type="date"
              value={form.fecha_inicio}
              onChange={(e) => setForm((p) => ({ ...p, fecha_inicio: e.target.value }))}
              style={inputStyle}
            />
          </label>
          <label style={{ ...labelStyle, flex: 1, minWidth: 160 }}>
            Fecha fin
            <input
              type="date"
              value={form.fecha_fin}
              onChange={(e) => setForm((p) => ({ ...p, fecha_fin: e.target.value }))}
              style={inputStyle}
            />
          </label>
        </div>
        <div>
          <button type="submit" disabled={saving} style={saving ? { ...btnPrimary, opacity: 0.6 } : btnPrimary}>
            {saving ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </form>

      <section style={cardStyle}>
        <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#0f172a" }}>Evidencia</h2>
        <FileUpload
          deferred
          value={archivo}
          onFileSelect={(file) => setArchivo(file)}
          onError={(msg) => setError(msg)}
          maxSizeMB={1024}
        />
        {archivo && (
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              type="button"
              disabled={saving}
              onClick={onUpload}
              style={saving ? { ...btnPrimary, opacity: 0.6 } : btnPrimary}
            >
              {saving ? "Subiendo…" : "Subir archivo"}
            </button>
          </div>
        )}
        {Array.isArray(accion.archivos) && accion.archivos.length > 0 && (
          <div style={{ display: "grid", gap: 8, marginTop: 4 }}>
            {accion.archivos.map((a) => {
              const isOwner = a.cargado_por === user?.id;
              const accionAbierta = accion.estado !== "CERRADA";
              const canDelete = isAdmin || (isOwner && accionAbierta);
              return (
                <FilePreview
                  key={a.id}
                  archivo={a}
                  isAdmin={isAdmin}
                  canDelete={canDelete}
                  onDeleted={refresh}
                />
              );
            })}
          </div>
        )}
      </section>

      <section style={cardStyle}>
        <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#0f172a" }}>Solicitud de cierre</h2>
        <label style={labelStyle}>
          Observación para el administrador
          <textarea
            rows={3}
            placeholder="Observacion para el administrador"
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
            disabled={saving || !puedeSolicitarCierre}
            style={{ ...textareaStyle, opacity: puedeSolicitarCierre ? 1 : 0.55 }}
          />
        </label>
        <div>
          <button
            type="button"
            onClick={onSolicitarCierre}
            disabled={saving || !puedeSolicitarCierre}
            style={saving || !puedeSolicitarCierre ? { ...btnSecondary, opacity: 0.55 } : btnSecondary}
          >
            Solicitar cierre
          </button>
        </div>
      </section>

      {accion.tipo === "CORRECTIVA" && (
        <section id="porques" style={cardStyle}>
          <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#0f172a" }}>
            Analisis de 5 porques
          </h2>

          {canManagePorques ? (
            <form onSubmit={onCreatePorque} style={{ display: "grid", gap: 8 }}>
              <textarea
                rows={3}
                value={nuevoPorque}
                onChange={(event) => setNuevoPorque(event.target.value)}
                placeholder="Describe la causa raiz..."
                disabled={saving}
                style={{ width: "100%", resize: "vertical", ...textareaStyle }}
              />
              <div>
                <button type="submit" disabled={saving || !nuevoPorque.trim()} style={saving ? { ...btnPrimary, opacity: 0.6 } : btnPrimary}>
                  Agregar porque
                </button>
              </div>
            </form>
          ) : (
            <p style={{ margin: 0, color: "#64748b" }}>
              Solo admin o responsables asignados pueden agregar porques.
            </p>
          )}

          {porques.length > 0 ? (
            <div style={{ display: "grid", gap: 10 }}>
              {porquesAprobados.length > 0 ? (
                porquesAprobados.map((p, idx) => (
                  <div key={p.id} style={{ border: "1px solid #d1fae5", background: "#f0fdf4", borderRadius: 10, padding: "0.9rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <strong>Porque #{idx + 1}</strong>
                      <span style={{ color: "#166534", fontWeight: 700 }}>Aprobado</span>
                    </div>
                    <p style={{ marginBottom: 0 }}>{p.texto_causa}</p>
                  </div>
                ))
              ) : (
                <p style={{ margin: 0, color: "#64748b" }}>Todavia no hay porques aprobados.</p>
              )}

              {porquesNoAprobados.length > 0 && (
                <details>
                  <summary style={{ cursor: "pointer", fontWeight: 600 }}>
                    Ver porques pendientes/rechazados ({porquesNoAprobados.length})
                  </summary>
                  <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
                    {porquesNoAprobados.map((p) => (
                      <div key={p.id} style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: "0.75rem", background: "#f8fafc" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                          <strong>Porque</strong>
                          <span style={{ fontWeight: 700, color: p.estado === "rechazado" ? "#b91c1c" : "#92400e" }}>
                            {p.estado}
                          </span>
                        </div>
                        <p style={{ marginBottom: p.observacion_rechazo ? 6 : 0 }}>{p.texto_causa}</p>
                        {p.observacion_rechazo && (
                          <p style={{ margin: 0, color: "#991b1b", fontSize: "0.9rem" }}>
                            Motivo rechazo: {p.observacion_rechazo}
                          </p>
                        )}
                        {isAdmin && p.estado === "pendiente" && (
                          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                            <button type="button" onClick={() => onApprovePorque(p.id)} disabled={saving} style={saving ? { ...btnPrimary, opacity: 0.6 } : btnPrimary}>
                              Aprobar
                            </button>
                            <button
                              type="button"
                              onClick={() => onRejectPorque(p.id)}
                              disabled={saving}
                              style={saving ? { ...btnSecondary, opacity: 0.6 } : btnSecondary}
                            >
                              Rechazar
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          ) : (
            <p style={{ margin: 0, color: "#64748b" }}>
              Todavia no hay porques cargados para esta accion correctiva.
            </p>
          )}
        </section>
      )}
    </main>
  );
}
