import { useEffect, useState } from "react";

import { descargarReporte, eliminarReporte, generarReporte, listReportes } from "../../api/reportes.js";
import { useAuth } from "../../context/AuthContext.jsx";

export default function GestionReportesPage() {
  const { user } = useAuth();
  const [reportes, setReportes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState("");

  const cargar = async () => {
    try {
      setLoading(true);
      const data = await listReportes();
      setReportes(Array.isArray(data) ? data : []);
      setError("");
    } catch (err) {
      const detail = err?.response?.data?.detail || err.message || "No se pudo cargar la lista de reportes";
      setError(detail);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const onGenerar = async () => {
    try {
      setGenerando(true);
      setError("");
      const nuevo = await generarReporte();
      setReportes((prev) => [nuevo, ...prev]);
    } catch (err) {
      const detail = err?.response?.data?.detail || err.message || "No se pudo generar el reporte";
      setError(detail);
    } finally {
      setGenerando(false);
    }
  };

  const onEliminar = async (reporteId) => {
    if (!window.confirm("¿Eliminar este reporte?")) return;

    try {
      await eliminarReporte(reporteId);
      setReportes((prev) => prev.filter((r) => r.id !== reporteId));
    } catch (err) {
      const detail = err?.response?.data?.detail || err.message || "No se pudo eliminar el reporte";
      setError(detail);
    }
  };

  if (user?.tipo !== "ADMIN") {
    return (
      <div style={{ padding: "2rem" }}>
        <h2>Acceso denegado</h2>
        <p>Solo administradores pueden acceder a este apartado.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ margin: 0 }}>Reportes de Hallazgos</h1>
          <p style={{ margin: "0.5rem 0 0", color: "#475569" }}>
            Genera reportes en cualquier momento y gestiona el historial desde este apartado.
          </p>
        </div>

        <button
          type="button"
          onClick={onGenerar}
          disabled={generando}
          style={{
            border: "none",
            borderRadius: "0.5rem",
            background: "#0f766e",
            color: "white",
            fontWeight: 700,
            padding: "0.75rem 1rem",
            cursor: generando ? "not-allowed" : "pointer",
            opacity: generando ? 0.7 : 1,
          }}
        >
          {generando ? "Generando..." : "Generar Reporte"}
        </button>
      </div>

      {error && (
        <div style={{ marginBottom: "1rem", color: "#b91c1c", background: "#fee2e2", border: "1px solid #fecaca", borderRadius: "0.5rem", padding: "0.75rem" }}>
          {error}
        </div>
      )}

      <div style={{ border: "1px solid #e2e8f0", borderRadius: "0.75rem", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              <th style={{ textAlign: "left", padding: "0.85rem" }}>Nombre</th>
              <th style={{ textAlign: "left", padding: "0.85rem" }}>Creado por</th>
              <th style={{ textAlign: "left", padding: "0.85rem" }}>Fecha</th>
              <th style={{ textAlign: "left", padding: "0.85rem" }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} style={{ padding: "1rem", color: "#475569" }}>Cargando reportes...</td>
              </tr>
            ) : reportes.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: "1rem", color: "#475569" }}>No hay reportes generados.</td>
              </tr>
            ) : (
              reportes.map((reporte) => {
                const creador = reporte?.creado_por
                  ? `${reporte.creado_por.nombre || ""} ${reporte.creado_por.apellido || ""}`.trim()
                  : "-";

                return (
                  <tr key={reporte.id} style={{ borderTop: "1px solid #e2e8f0" }}>
                    <td style={{ padding: "0.85rem" }}>{reporte.nombre}</td>
                    <td style={{ padding: "0.85rem" }}>{creador || "-"}</td>
                    <td style={{ padding: "0.85rem" }}>
                      {new Date(reporte.fecha_creacion).toLocaleString("es-AR")}
                    </td>
                    <td style={{ padding: "0.85rem", display: "flex", gap: "0.5rem" }}>
                      <button
                        type="button"
                        onClick={() => descargarReporte(reporte.id, reporte.nombre)}
                        style={{
                          border: "1px solid #0f172a",
                          background: "white",
                          borderRadius: "0.4rem",
                          padding: "0.4rem 0.6rem",
                          cursor: "pointer",
                        }}
                      >
                        Descargar
                      </button>
                      <button
                        type="button"
                        onClick={() => onEliminar(reporte.id)}
                        style={{
                          border: "1px solid #b91c1c",
                          color: "#b91c1c",
                          background: "white",
                          borderRadius: "0.4rem",
                          padding: "0.4rem 0.6rem",
                          cursor: "pointer",
                        }}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
