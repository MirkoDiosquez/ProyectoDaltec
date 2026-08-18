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

export default function ChatMessage({ mensaje, index }) {
  const nombre = capitalize(mensaje.autor?.nombre);
  const apellido = capitalize(mensaje.autor?.apellido);
  const hora = formatTime(mensaje.fecha_hora);

  return (
    <div style={styles.wrapper}>
      {/* Author and Timestamp */}
      <div style={styles.header}>
        <span style={styles.author}>{nombre} {apellido}</span>
        <span style={styles.time}>{hora}</span>
      </div>

      {/* Message Content */}
      {mensaje.contenido && (
        <div style={styles.content}>{mensaje.contenido}</div>
      )}

      {/* File Attachments (T086) */}
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
  );
}
