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
export default function ChatMessage({ mensaje, index }) {
  return (
    <div
      style={{
        marginBottom: "12px",
        paddingBottom: "12px",
        borderBottom: "1px solid #e5e7eb",
      }}
    >
      {/* Author and Timestamp */}
      <div style={{ fontWeight: "bold", color: "#1f2937" }}>
        {mensaje.autor?.nombre} {mensaje.autor?.apellido}
      </div>
      <div style={{ color: "#6b7280", fontSize: "12px", marginBottom: "4px" }}>
        {new Date(mensaje.fecha_hora).toLocaleString()}
      </div>

      {/* Message Content */}
      {mensaje.contenido && (
        <div style={{ color: "#111827", wordWrap: "break-word", marginBottom: "8px" }}>
          {mensaje.contenido}
        </div>
      )}

      {/* File Attachments (T086) */}
      {mensaje.archivos && mensaje.archivos.length > 0 && (
        <div
          style={{
            marginTop: "8px",
            paddingTop: "8px",
            borderTop: "1px solid #e5e7eb",
          }}
        >
          <div style={{ fontSize: "12px", fontWeight: "500", marginBottom: "6px", color: "#6b7280" }}>
            Archivos adjuntos ({mensaje.archivos.length}):
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {mensaje.archivos.map((archivo, idx) => (
              <div key={archivo.id || idx}>
                <FilePreview archivo={archivo} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
