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
    <section style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: "1rem", background: "#fff", display: "grid", gap: 10 }}>
      <h2 style={{ margin: 0 }}>Solicitudes de Cierre (Admin)</h2>
      {loading && <p style={{ margin: 0 }}>Cargando solicitudes...</p>}
      {error && <p style={{ margin: 0, color: "#b91c1c", fontWeight: 700 }}>{error}</p>}
      {!loading && items.length === 0 && <p style={{ margin: 0 }}>No hay solicitudes pendientes.</p>}
      {!loading && items.length > 0 && (
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {items.map((item) => (
            <li key={item.id} style={{ marginBottom: 8 }}>
              Accion {item.accion?.tipo} (#{item.accion?.id}) - Solicitante: {item.solicitante?.nombre} {item.solicitante?.apellido}
              <div style={{ display: "inline-flex", gap: 6, marginLeft: 10 }}>
                <button type="button" disabled={workingId === item.id} onClick={() => apply(item, "aprobar")}>Aprobar</button>
                <button type="button" disabled={workingId === item.id} onClick={() => apply(item, "rechazar")}>Rechazar</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
