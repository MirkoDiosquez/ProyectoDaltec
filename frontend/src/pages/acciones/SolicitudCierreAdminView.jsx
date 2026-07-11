import { useEffect, useState } from "react";

import {
  aprobarSolicitudCierre,
  listSolicitudesCierre,
  rechazarSolicitudCierre,
} from "../../api/acciones.js";

export default function SolicitudCierreAdminView({ hallazgoId, onChanged }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [workingId, setWorkingId] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await listSolicitudesCierre({ hallazgo_id: hallazgoId, estado: "PENDIENTE" });
        if (mounted) setItems(Array.isArray(data) ? data : []);
      } catch (e) {
        if (mounted) setError(e?.response?.data?.detail || "No se pudieron cargar las solicitudes.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [hallazgoId]);

  const apply = async (item, action) => {
    setWorkingId(item.id);
    setError("");
    try {
      if (action === "aprobar") {
        await aprobarSolicitudCierre(item.id);
      } else {
        await rechazarSolicitudCierre(item.id, "Revisar evidencia y actualizar accion.");
      }
      const data = await listSolicitudesCierre({ hallazgo_id: hallazgoId, estado: "PENDIENTE" });
      setItems(Array.isArray(data) ? data : []);
      if (onChanged) onChanged();
    } catch (e) {
      setError(e?.response?.data?.detail || "No se pudo procesar la solicitud.");
    } finally {
      setWorkingId(null);
    }
  };

  return (
    <section style={{ border: "2px solid #f59e0b", borderRadius: 12, padding: "1.5rem", background: "#fffbeb", display: "grid", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: "1.3rem" }}>⏳</span>
        <h2 style={{ margin: 0, color: "#92400e" }}>Solicitudes de Cierre</h2>
        {!loading && items.length > 0 && (
          <span style={{
            background: "#f59e0b",
            color: "#fff",
            borderRadius: "50%",
            width: 28,
            height: 28,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: "0.85rem",
          }}>
            {items.length}
          </span>
        )}
      </div>

      {loading && (
        <div style={{ padding: "1rem", textAlign: "center", color: "#6b7280" }}>
          ⏳ Cargando solicitudes...
        </div>
      )}

      {error && (
        <div style={{
          padding: "0.75rem",
          background: "#fee2e2",
          color: "#991b1b",
          borderRadius: 8,
          border: "1px solid #fca5a5",
          fontSize: "0.9rem",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}>
          ⚠️ {error}
        </div>
      )}

      {!loading && items.length === 0 && (
        <div style={{ padding: "1rem", textAlign: "center", color: "#6b7280" }}>
          ✓ No hay solicitudes pendientes.
        </div>
      )}

      {!loading && items.length > 0 && (
        <div style={{ display: "grid", gap: 12 }}>
          {items.map((item) => (
            <div
              key={item.id}
              style={{
                border: "2px solid #fcd34d",
                borderRadius: 12,
                padding: "1.25rem",
                background: "#fff",
                display: "grid",
                gap: 10,
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              }}
            >
              {/* Header */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "0.5rem" }}>
                    <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#6b7280" }}>#{item.id}</span>
                    <span style={{ fontSize: "0.85rem", fontWeight: 600, background: "#fef3c7", color: "#92400e", padding: "0.25rem 0.5rem", borderRadius: 4 }}>
                      ⏳ Pendiente
                    </span>
                  </div>

                  <div style={{ display: "grid", gap: 6 }}>
                    <div>
                      <span style={{ fontWeight: 600, color: "#374151" }}>📋 Acción: </span>
                      <span style={{ color: "#1f2937" }}>
                        {item.accion?.tipo || "N/A"} (ID: {item.accion?.id})
                      </span>
                    </div>
                    <div>
                      <span style={{ fontWeight: 600, color: "#374151" }}>👤 Solicitante: </span>
                      <span style={{ color: "#1f2937" }}>
                        {item.solicitante?.nombre} {item.solicitante?.apellido}
                      </span>
                    </div>
                    {item.observacion && (
                      <div>
                        <span style={{ fontWeight: 600, color: "#374151" }}>💬 Observación: </span>
                        <span style={{ color: "#1f2937" }}>{item.observacion}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 8, paddingTop: "0.5rem", borderTop: "1px solid #fcd34d" }}>
                <button
                  type="button"
                  disabled={workingId === item.id}
                  onClick={() => apply(item, "aprobar")}
                  style={{
                    flex: 1,
                    padding: "0.7rem 1rem",
                    background: "#22c55e",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    fontWeight: 700,
                    fontSize: "0.9rem",
                    cursor: workingId === item.id ? "not-allowed" : "pointer",
                    opacity: workingId === item.id ? 0.6 : 1,
                    transition: "all 0.2s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  <span>✓</span>
                  {workingId === item.id ? "Procesando..." : "Aprobar"}
                </button>

                <button
                  type="button"
                  disabled={workingId === item.id}
                  onClick={() => apply(item, "rechazar")}
                  style={{
                    flex: 1,
                    padding: "0.7rem 1rem",
                    background: "#ef4444",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    fontWeight: 700,
                    fontSize: "0.9rem",
                    cursor: workingId === item.id ? "not-allowed" : "pointer",
                    opacity: workingId === item.id ? 0.6 : 1,
                    transition: "all 0.2s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  <span>✕</span>
                  {workingId === item.id ? "Procesando..." : "Rechazar"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
