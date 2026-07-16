import { useState, useEffect } from "react";
import { listUsuarios, addResponsable, removeResponsable } from "../api/hallazgos.js";

/**
 * ResponsableList component for managing hallazgo responsables (T096).
 *
 * Displays available users to add as responsables (excluding those already assigned).
 * Shows current responsables with option to remove them.
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
  }, [hallazgoId]);

  // Handle adding responsable (T098)
  const handleAddResponsable = async (userId) => {
    setActionInProgress((prev) => ({ ...prev, [userId]: "adding" }));
    try {
      await addResponsable(hallazgoId, userId);
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
      if (onResponsableRemoved) {
        onResponsableRemoved(userId);
      }
    } catch (err) {
      setError(err.message || "Error removiendo responsable");
    } finally {
      setActionInProgress((prev) => ({ ...prev, [userId]: null }));
    }
  };

  // Separate responsables from available users - use currentResponsables prop for comparison
  const responsablesActuales = usuarios.filter((u) => currentResponsables.includes(u.id));
  const usuariosDisponibles = usuarios.filter((u) => !currentResponsables.includes(u.id));

  if (loading) {
    return (
      <div style={{ padding: "1.5rem", background: "#f3f4f6", borderRadius: "8px", textAlign: "center", color: "#666" }}>
         Cargando usuarios...
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {error && (
        <div
          style={{
            padding: "1rem",
            background: "#fee2e2",
            color: "#991b1b",
            borderRadius: "8px",
            fontSize: "0.9rem",
            border: "1px solid #fca5a5",
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* Current responsables section */}
      <section style={{ border: "2px solid #10b981", borderRadius: "8px", padding: "1.5rem", background: "#ecfdf5" }}>
        <h3 style={{ margin: "0 0 1rem 0", color: "#065f46", display: "flex", alignItems: "center", gap: 8 }}>
           Responsables Actuales
          <span style={{ 
            background: "#10b981", 
            color: "#fff", 
            borderRadius: "50%", 
            width: 28, 
            height: 28, 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center",
            fontSize: "0.85rem",
            fontWeight: 700,
          }}>
            {responsablesActuales.length}
          </span>
        </h3>

        {responsablesActuales.length === 0 ? (
          <p style={{ margin: 0, color: "#6b7280" }}>No hay responsables asignados aún.</p>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {responsablesActuales.map((usuario) => {
              const isProcessing = actionInProgress[usuario.id];
              return (
                <div
                  key={usuario.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "1rem",
                    background: "#fff",
                    border: "1px solid #d1fae5",
                    borderRadius: "6px",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: "50%",
                        background: "#10b981",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        fontSize: "0.9rem",
                      }}
                    >
                      {usuario.nombre.charAt(0)}{usuario.apellido.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: "#1f2937", fontSize: "0.95rem" }}>
                        {usuario.nombre} {usuario.apellido}
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                        @{usuario.username} • {usuario.tipo}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRemoveResponsable(usuario.id)}
                    disabled={isProcessing}
                    style={{
                      padding: "0.5rem 1rem",
                      background: "#ef4444",
                      color: "#fff",
                      border: "none",
                      borderRadius: "6px",
                      cursor: isProcessing ? "not-allowed" : "pointer",
                      fontWeight: 600,
                      fontSize: "0.85rem",
                      opacity: isProcessing ? 0.6 : 1,
                      transition: "all 0.2s",
                    }}
                  >
                    {isProcessing ? " Removiendo..." : "✕ Remover"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Available users section */}
      <section style={{ border: "2px solid #3b82f6", borderRadius: "8px", padding: "1.5rem", background: "#eff6ff" }}>
        <h3 style={{ margin: "0 0 1rem 0", color: "#1e40af", display: "flex", alignItems: "center", gap: 8 }}>
           Agregar Responsable
          {usuariosDisponibles.length > 0 && (
            <span style={{ 
              background: "#3b82f6", 
              color: "#fff", 
              borderRadius: "50%", 
              width: 28, 
              height: 28, 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center",
              fontSize: "0.85rem",
              fontWeight: 700,
            }}>
              {usuariosDisponibles.length}
            </span>
          )}
        </h3>

        {usuariosDisponibles.length === 0 ? (
          <p style={{ margin: 0, color: "#6b7280" }}>Todos los usuarios ya son responsables.</p>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {usuariosDisponibles.map((usuario) => {
              const isProcessing = actionInProgress[usuario.id];
              return (
                <div
                  key={usuario.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "1rem",
                    background: "#fff",
                    border: "1px solid #bfdbfe",
                    borderRadius: "6px",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: "50%",
                        background: "#e0e7ff",
                        color: "#3b82f6",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        fontSize: "0.9rem",
                      }}
                    >
                      {usuario.nombre.charAt(0)}{usuario.apellido.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: "#1f2937", fontSize: "0.95rem" }}>
                        {usuario.nombre} {usuario.apellido}
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                        @{usuario.username} • {usuario.tipo}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleAddResponsable(usuario.id)}
                    disabled={isProcessing}
                    style={{
                      padding: "0.5rem 1rem",
                      background: "#3b82f6",
                      color: "#fff",
                      border: "none",
                      borderRadius: "6px",
                      cursor: isProcessing ? "not-allowed" : "pointer",
                      fontWeight: 600,
                      fontSize: "0.85rem",
                      opacity: isProcessing ? 0.6 : 1,
                      transition: "all 0.2s",
                    }}
                  >
                    {isProcessing ? " Agregando..." : "+ Agregar"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

    </div>
  );
}
