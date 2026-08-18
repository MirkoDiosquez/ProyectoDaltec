import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";

import {
  getAccion,
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
    </main>
  );
}
