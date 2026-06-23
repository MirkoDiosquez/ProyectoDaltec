import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";

import {
  getAccion,
  solicitarCierreAccion,
  updateAccion,
  uploadArchivoAccion,
} from "../../api/acciones.js";

const estadoLabel = {
  PENDIENTE: "Pendiente",
  EN_PROGRESO: "En progreso",
  SOLICITUD_CIERRE: "Solicitud de cierre",
  CERRADA: "Cerrada",
};

const tipoLabel = {
  INMEDIATA: "Inmediata",
  CORRECTIVA: "Correctiva",
  VERIFICACION_EFICIENCIA: "Verificacion de Eficiencia",
};

export default function AccionDetailPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const hallazgoId = searchParams.get("hallazgo");

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

  const onUpload = async (event) => {
    event.preventDefault();
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
    return <main style={{ padding: "2rem" }}>Cargando accion...</main>;
  }

  if (!accion) {
    return <main style={{ padding: "2rem" }}>Accion no encontrada.</main>;
  }

  return (
    <main style={{ maxWidth: 860, margin: "0 auto", padding: "2rem 1rem", display: "grid", gap: 14 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ margin: 0 }}>Accion {tipoLabel[accion.tipo] || accion.tipo}</h1>
          <p style={{ marginTop: 6, color: "#475569" }}>Estado: {estadoLabel[accion.estado] || accion.estado}</p>
        </div>
        {hallazgoId && (
          <Link to={`/hallazgos/${hallazgoId}`} style={{ fontWeight: 600, textDecoration: "none", color: "#0f172a" }}>
            Volver al hallazgo
          </Link>
        )}
      </header>

      {error && <p style={{ margin: 0, color: "#b91c1c", fontWeight: 700 }}>{error}</p>}

      <form onSubmit={onGuardar} style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: "1rem", background: "#fff", display: "grid", gap: 10 }}>
        <h2 style={{ margin: 0 }}>Edicion</h2>
        <textarea
          rows={4}
          value={form.descripcion}
          onChange={(e) => setForm((p) => ({ ...p, descripcion: e.target.value }))}
          placeholder="Descripcion de la accion"
        />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            type="date"
            value={form.fecha_inicio}
            onChange={(e) => setForm((p) => ({ ...p, fecha_inicio: e.target.value }))}
          />
          <input
            type="date"
            value={form.fecha_fin}
            onChange={(e) => setForm((p) => ({ ...p, fecha_fin: e.target.value }))}
          />
        </div>
        <button type="submit" disabled={saving}>Guardar cambios</button>
      </form>

      <form onSubmit={onUpload} style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: "1rem", background: "#fff", display: "grid", gap: 10 }}>
        <h2 style={{ margin: 0 }}>Evidencia</h2>
        <input type="file" onChange={(e) => setArchivo(e.target.files?.[0] || null)} required />
        <button type="submit" disabled={saving || !archivo}>Subir archivo</button>
        {Array.isArray(accion.archivos) && accion.archivos.length > 0 && (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {accion.archivos.map((a) => (
              <li key={a.id}>{a.nombre} ({a.tipo_mime})</li>
            ))}
          </ul>
        )}
      </form>

      <section style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: "1rem", background: "#fff", display: "grid", gap: 10 }}>
        <h2 style={{ margin: 0 }}>Solicitud de cierre</h2>
        <textarea
          rows={3}
          placeholder="Observacion para el administrador"
          value={observacion}
          onChange={(e) => setObservacion(e.target.value)}
          disabled={saving || !puedeSolicitarCierre}
        />
        <button type="button" onClick={onSolicitarCierre} disabled={saving || !puedeSolicitarCierre}>
          Solicitar cierre
        </button>
      </section>
    </main>
  );
}
