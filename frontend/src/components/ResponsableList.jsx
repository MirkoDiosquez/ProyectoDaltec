import { useState, useEffect } from "react";
import { listUsuarios, addResponsable, removeResponsable } from "../api/hallazgos.js";

/**
 * ResponsableList component for managing hallazgo responsables (T096).
 *
 * Displays all system users with toggles to add/remove them as responsables.
 * Current responsables are indicated visually.
 * Admin-only component.
 *
 * Props:
 * - hallazgoId: The hallazgo ID
 * - currentResponsables: Array of current responsable IDs
 * - onResponsableAdded: Callback when responsable is added
 * - onResponsableRemoved: Callback when responsable is removed
 */
export default function ResponsableList({
  hallazgoId,
  currentResponsables = [],
  onResponsableAdded,
  onResponsableRemoved,
}) {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionInProgress, setActionInProgress] = useState({});

  // Load usuarios on mount (T096)
  useEffect(() => {
    const loadUsuarios = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await listUsuarios();
        setUsuarios(data || []);
      } catch (err) {
        setError(err.message || "Error cargando usuarios");
      } finally {
        setLoading(false);
      }
    };

    loadUsuarios();
  }, []);

  // Handle adding responsable (T098)
  const handleAddResponsable = async (userId) => {
    setActionInProgress((prev) => ({ ...prev, [userId]: "adding" }));
    try {
      await addResponsable(hallazgoId, userId);
      setUsuarios((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, es_responsable_de_hallazgo: true } : u
        )
      );
      if (onResponsableAdded) {
        onResponsableAdded(userId);
      }
    } catch (err) {
      setError(err.message || "Error agregando responsable");
    } finally {
      setActionInProgress((prev) => ({ ...prev, [userId]: null }));
    }
  };

  // Handle removing responsable (T098)
  const handleRemoveResponsable = async (userId) => {
    setActionInProgress((prev) => ({ ...prev, [userId]: "removing" }));
    try {
      await removeResponsable(hallazgoId, userId);
      setUsuarios((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, es_responsable_de_hallazgo: false } : u
        )
      );
      if (onResponsableRemoved) {
        onResponsableRemoved(userId);
      }
    } catch (err) {
      setError(err.message || "Error removiendo responsable");
    } finally {
      setActionInProgress((prev) => ({ ...prev, [userId]: null }));
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "15px", backgroundColor: "#f3f4f6", borderRadius: "4px" }}>
        Cargando usuarios...
      </div>
    );
  }

  return (
    <div style={{ padding: "15px", border: "1px solid #d1d5db", borderRadius: "4px" }}>
      <h3 style={{ marginTop: 0 }}>Gestión de Responsables</h3>

      {error && (
        <div
          style={{
            padding: "10px",
            marginBottom: "12px",
            backgroundColor: "#fee2e2",
            color: "#dc2626",
            borderRadius: "4px",
            fontSize: "14px",
          }}
        >
          {error}
        </div>
      )}

      {usuarios.length === 0 ? (
        <p style={{ color: "#999" }}>No hay usuarios disponibles.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {usuarios.map((usuario) => {
            const isResponsable = usuario.es_responsable_de_hallazgo;
            const isProcessing = actionInProgress[usuario.id];

            return (
              <div
                key={usuario.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px",
                  backgroundColor: isResponsable ? "#dbeafe" : "#f9fafb",
                  border: `1px solid ${isResponsable ? "#0284c7" : "#e5e7eb"}`,
                  borderRadius: "4px",
                }}
              >
                <div>
                  <div style={{ fontWeight: "500", color: "#1f2937" }}>
                    {usuario.nombre} {usuario.apellido}
                  </div>
                  <div style={{ fontSize: "12px", color: "#6b7280" }}>
                    {usuario.tipo}
                  </div>
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  {isResponsable ? (
                    <button
                      onClick={() => handleRemoveResponsable(usuario.id)}
                      disabled={isProcessing}
                      style={{
                        padding: "6px 12px",
                        backgroundColor: "#ef4444",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: isProcessing ? "default" : "pointer",
                        opacity: isProcessing ? 0.6 : 1,
                        fontSize: "12px",
                      }}
                    >
                      {isProcessing ? "Removiendo..." : "Remover"}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleAddResponsable(usuario.id)}
                      disabled={isProcessing}
                      style={{
                        padding: "6px 12px",
                        backgroundColor: "#10b981",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: isProcessing ? "default" : "pointer",
                        opacity: isProcessing ? 0.6 : 1,
                        fontSize: "12px",
                      }}
                    >
                      {isProcessing ? "Agregando..." : "Agregar"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
