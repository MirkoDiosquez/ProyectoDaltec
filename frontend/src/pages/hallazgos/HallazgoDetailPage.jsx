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
} from "../../api/hallazgos.js";
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

  const isAdmin = user?.tipo === "ADMIN";

  const refreshDetail = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getHallazgo(id);
      setHallazgo(data);
      if (data?.tipo && data.tipo !== "QUEJA_CLIENTE") {
        setNuevoTipo(data.tipo);
      }
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

      <section style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: "1rem", background: "#fff" }}>
        <p style={{ marginTop: 0 }}><strong>Descripcion:</strong> {hallazgo.descripcion}</p>
        <p><strong>Ubicacion:</strong> {hallazgo.ubicacion}</p>
        <p><strong>Estado:</strong> {estadoLabel[hallazgo.estado] || hallazgo.estado}</p>
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
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => onRemoveResponsable(r.id)}
                    disabled={actionLoading}
                    style={{ marginLeft: 8 }}
                  >
                    Remover
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ margin: 0 }}>Sin responsables asignados.</p>
        )}

        {isAdmin && (
          <form onSubmit={onAddResponsable} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <input
              type="number"
              min="1"
              value={responsableId}
              onChange={(event) => setResponsableId(event.target.value)}
              placeholder="ID de empleado"
              disabled={actionLoading}
              required
            />
            <button type="submit" disabled={actionLoading}>
              Agregar Responsable
            </button>
          </form>
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
    </main>
  );
}
