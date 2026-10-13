import { useEffect, useRef, useState } from "react";

import FilePreview from "./FilePreview.jsx";

/**
 * ChatMessage component for displaying individual chat messages with attachments (T086).
 *
 * Features:
 * - Displays message author, timestamp, content
 * - Shows attached files using FilePreview component
 * - Responsive styling with file attachment visualization
 *
 * Props:
 * - mensaje: Message object with:
 *   - id, contenido, fecha_hora, autor, archivos[]
 * - index: Array index for key prop
 */

function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function formatTime(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

const styles = {
  wrapper: {
    display: "flex",
    gap: "8px",
    alignItems: "flex-start",
    minWidth: 0,
  },
  menuAnchor: {
    position: "relative",
    flexShrink: 0,
  },
  bubble: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    padding: "12px 14px",
    borderRadius: "12px",
    background: "#ffffff",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
    border: "1px solid #e8edf2",
    minWidth: 0,
    overflowX: "hidden",
    flexShrink: 0,
    flex: 1,
  },
  menuButton: {
    width: "30px",
    height: "30px",
    borderRadius: "999px",
    border: "1px solid #dbe4ee",
    background: "#ffffff",
    color: "#475569",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "18px",
    lineHeight: 1,
    boxShadow: "0 1px 2px rgba(15,23,42,0.08)",
  },
  menuPanel: {
    position: "absolute",
    top: "36px",
    left: 0,
    minWidth: "160px",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
    background: "#ffffff",
    boxShadow: "0 12px 28px rgba(15,23,42,0.18)",
    padding: "6px",
    zIndex: 5,
  },
  menuItem: {
    width: "100%",
    border: "none",
    background: "transparent",
    textAlign: "left",
    padding: "10px 12px",
    borderRadius: "8px",
    color: "#b91c1c",
    fontWeight: 600,
    cursor: "pointer",
  },
  header: {
    display: "flex",
    alignItems: "baseline",
    gap: "10px",
  },
  author: {
    fontWeight: "600",
    fontSize: "14px",
    color: "#1e293b",
  },
  time: {
    fontSize: "11px",
    color: "#94a3b8",
    fontVariantNumeric: "tabular-nums",
  },
  content: {
    fontSize: "14px",
    color: "#334155",
    lineHeight: "1.55",
    wordBreak: "break-word",
    overflowWrap: "anywhere",
  },
  deletedContent: {
    fontSize: "14px",
    color: "#94a3b8",
    lineHeight: "1.55",
    fontStyle: "italic",
  },
  attachmentsLabel: {
    fontSize: "11px",
    fontWeight: "600",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginTop: "8px",
  },
  attachmentsList: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    marginTop: "4px",
  },
};

export default function ChatMessage({ mensaje, index, isAdmin = false, onDeleteMessage }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const nombre = capitalize(mensaje.autor?.nombre);
  const apellido = capitalize(mensaje.autor?.apellido);
  const hora = formatTime(mensaje.fecha_hora);
  const canDelete = isAdmin && !mensaje.eliminado_por_admin;

  useEffect(() => {
    if (!menuOpen) return undefined;

    const handleMouseDown = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [menuOpen]);

  useEffect(() => {
    if (mensaje.eliminado_por_admin) {
      setMenuOpen(false);
    }
  }, [mensaje.eliminado_por_admin]);

  return (
    <div style={styles.wrapper}>
      <div style={styles.menuAnchor} ref={menuRef}>
        {canDelete && (
          <>
            <button
              type="button"
              style={styles.menuButton}
              aria-label={`Opciones del mensaje ${index + 1}`}
              onClick={() => setMenuOpen((prev) => !prev)}
            >
              ...
            </button>
            {menuOpen && (
              <div style={styles.menuPanel}>
                <button
                  type="button"
                  style={styles.menuItem}
                  onClick={() => {
                    setMenuOpen(false);
                    onDeleteMessage?.(mensaje.id);
                  }}
                >
                  Eliminar mensaje
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <div style={styles.bubble}>
        <div style={styles.header}>
          <span style={styles.author}>{nombre} {apellido}</span>
          <span style={styles.time}>{hora}</span>
        </div>

        {mensaje.contenido && (
          <div style={mensaje.eliminado_por_admin ? styles.deletedContent : styles.content}>
            {mensaje.contenido}
          </div>
        )}

        {mensaje.archivos && mensaje.archivos.length > 0 && (
          <div>
            <div style={styles.attachmentsLabel}>
              Archivos adjuntos ({mensaje.archivos.length})
            </div>
            <div style={styles.attachmentsList}>
              {mensaje.archivos.map((archivo, idx) => (
                <FilePreview key={archivo.id || idx} archivo={archivo} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
