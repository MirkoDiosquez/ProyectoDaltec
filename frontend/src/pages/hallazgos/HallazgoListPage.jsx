import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { listHallazgos } from "../../api/hallazgos.js";
import { useAuth } from "../../context/AuthContext.jsx";

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
  PENDIENTE: "#f59e0b",
  APROBADO: "#2563eb",
  RECHAZADO: "#dc2626",
  CERRADO: "#16a34a",
};

export default function HallazgoListPage() {
  const { user } = useAuth();
  const [hallazgos, setHallazgos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function fetchHallazgos() {
      setLoading(true);
      setError("");
      try {
        const response = await listHallazgos();
        const items = Array.isArray(response) ? response : response?.results || [];
        if (mounted) {
          setHallazgos(items);
        }
      } catch {
        if (mounted) {
          setError("No se pudo cargar el listado de hallazgos.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchHallazgos();
    return () => {
      mounted = false;
    };
  }, []);

  const canCreateHallazgo = useMemo(() => user?.tipo === "EMPLEADO", [user?.tipo]);

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "2rem 1rem" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ margin: 0 }}>Hallazgos</h1>
          <p style={{ marginTop: 6, color: "#475569" }}>
            Listado filtrado segun tu rol.
          </p>
        </div>
        {canCreateHallazgo && (
          <Link
            to="/hallazgos/crear"
            style={{
              background: "#0f172a",
              color: "#fff",
              padding: "0.65rem 1rem",
              borderRadius: 8,
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            Crear Hallazgo
          </Link>
        )}
      </header>

      {loading && <p style={{ marginTop: 20 }}>Cargando hallazgos...</p>}
      {error && (
        <p style={{ marginTop: 20, color: "#b91c1c", fontWeight: 600 }}>{error}</p>
      )}

      {!loading && !error && hallazgos.length === 0 && (
        <p style={{ marginTop: 20 }}>No hay hallazgos para mostrar.</p>
      )}

      {!loading && !error && hallazgos.length > 0 && (
        <section style={{ marginTop: 20, display: "grid", gap: 12 }}>
          {hallazgos.map((item) => (
            <Link
              key={item.id}
              to={`/hallazgos/${item.id}`}
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: 12,
                padding: "1rem",
                textDecoration: "none",
                color: "inherit",
                background: "#ffffff",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <strong style={{ fontSize: "1.03rem" }}>{item.descripcion}</strong>
                <span
                  style={{
                    borderRadius: 999,
                    padding: "0.2rem 0.65rem",
                    fontWeight: 700,
                    fontSize: "0.75rem",
                    color: "#fff",
                    background: estadoColor[item.estado] || "#334155",
                    whiteSpace: "nowrap",
                  }}
                >
                  {estadoLabel[item.estado] || item.estado}
                </span>
              </div>

              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span
                  style={{
                    borderRadius: 999,
                    padding: "0.2rem 0.6rem",
                    fontWeight: 600,
                    fontSize: "0.75rem",
                    background: "#e2e8f0",
                    color: "#0f172a",
                  }}
                >
                  {tipoLabel[item.tipo] || item.tipo}
                </span>
                <span style={{ color: "#64748b", fontSize: "0.85rem" }}>
                  Ubicacion: {item.ubicacion}
                </span>
              </div>
            </Link>
          ))}
        </section>
      )}
    </main>
  );
}
