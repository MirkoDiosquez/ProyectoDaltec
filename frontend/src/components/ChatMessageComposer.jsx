import { useState, useRef, useCallback } from "react";
import FileUpload from "./FileUpload.jsx";

/**
 * ChatMessageComposer component for sending messages with optional file attachments (T085).
 *
 * Features:
 * - Textarea for message content
 * - FileUpload component for attaching files
 * - Send button with loading state
 * - Displays uploaded files before sending
 *
 * Props:
 * - ws: WebSocket connection (must be open to send)
 * - onMessageSent: Callback when message is successfully sent
 * - onError: Callback for errors
 * - disabled: Whether composer is disabled (read-only mode, disconnected, etc.)
 */
export default function ChatMessageComposer({
  ws,
  onMessageSent,
  onError,
  disabled = false,
}) {
  const [content, setContent] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [sending, setSending] = useState(false);
  const composerRef = useRef(null);

  // Handle file upload completion
  const handleFileUpload = useCallback((response) => {
    // response should have response.data with the uploaded archivo
    if (response?.data?.id) {
      setUploadedFiles((prev) => [...prev, response.data]);
    }
  }, []);

  // Handle file upload error
  const handleFileError = useCallback((error) => {
    onError(error?.message || "Error subiendo archivo");
  }, [onError]);

  // Remove uploaded file before sending
  const handleRemoveFile = useCallback((fileId) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId));
  }, []);

  // Send message with attachments
  const handleSendMessage = useCallback(
    async (e) => {
      e.preventDefault();

      const trimmedContent = content.trim();
      if (!trimmedContent && uploadedFiles.length === 0) {
        onError("Escribí un mensaje o adjuntá un archivo");
        return;
      }

      if (!ws || ws.readyState !== WebSocket.OPEN) {
        onError("No conectado al chat. Recargá la página.");
        return;
      }

      setSending(true);
      try {
        const payload = {
          type: "chat.send",
          contenido: trimmedContent,
          archivos_ids: uploadedFiles.map((f) => f.id),
        };
        ws.send(JSON.stringify(payload));
        setContent("");
        setUploadedFiles([]);
      } catch (error) {
        onError(error.message || "Error enviando mensaje");
      } finally {
        setSending(false);
      }
    },
    [content, uploadedFiles, ws, onError]
  );

  return (
    <form
      onSubmit={handleSendMessage}
      ref={composerRef}
      style={{
        borderTop: "1px solid #e2e8f0",
        paddingTop: "14px",
        display: "grid",
        gap: "10px",
      }}
    >
      {/* File Upload Zone */}
      <div>
        <FileUpload
          onFileUpload={handleFileUpload}
          onError={handleFileError}
          disabled={disabled || sending}
        />
      </div>

      {/* Display Uploaded Files Before Sending */}
      {uploadedFiles.length > 0 && (
        <div
          style={{
            padding: "10px 12px",
            backgroundColor: "#f0f9ff",
            borderRadius: "10px",
            border: "1px solid #bae6fd",
          }}
        >
          <div style={{ fontSize: "11px", fontWeight: "700", color: "#0369a1", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Archivos adjuntos ({uploadedFiles.length})
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {uploadedFiles.map((file) => (
              <div
                key={file.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "5px 10px",
                  backgroundColor: "#ffffff",
                  borderRadius: "8px",
                  border: "1px solid #bae6fd",
                  fontSize: "13px",
                  color: "#0c4a6e",
                }}
              >
                <span>{file.nombre}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveFile(file.id)}
                  disabled={sending}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#ef4444",
                    cursor: "pointer",
                    fontSize: "14px",
                    padding: 0,
                    lineHeight: 1,
                  }}
                  title="Eliminar archivo"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Message Input */}
      <div style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={disabled ? "Sin permisos para escribir" : "Escribí un mensaje…"}
          disabled={disabled || sending}
          rows={2}
          style={{
            flex: 1,
            padding: "10px 12px",
            border: "1px solid #cbd5e1",
            borderRadius: "10px",
            fontFamily: "inherit",
            fontSize: "14px",
            resize: "vertical",
            background: disabled ? "#f1f5f9" : "#ffffff",
            color: "#1e293b",
            opacity: disabled || sending ? 0.6 : 1,
            outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={disabled || sending || (!content.trim() && uploadedFiles.length === 0)}
          style={{
            padding: "10px 22px",
            borderRadius: "10px",
            fontWeight: 700,
            fontSize: "14px",
            cursor: sending ? "default" : "pointer",
            opacity: disabled || sending || (!content.trim() && uploadedFiles.length === 0) ? 0.45 : 1,
            whiteSpace: "nowrap",
          }}
        >
          {sending ? "Enviando…" : "Enviar"}
        </button>
      </div>
    </form>
  );
}
