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
        borderTop: "1px solid #d1d5db",
        paddingTop: "15px",
        marginTop: "15px",
      }}
    >
      {/* File Upload Zone */}
      <div style={{ marginBottom: "12px" }}>
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
            marginBottom: "12px",
            padding: "10px",
            backgroundColor: "#f3f4f6",
            borderRadius: "4px",
            border: "1px solid #e5e7eb",
          }}
        >
          <div style={{ fontSize: "12px", fontWeight: "500", marginBottom: "8px" }}>
            Archivos adjuntos ({uploadedFiles.length}):
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {uploadedFiles.map((file) => (
              <div
                key={file.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 10px",
                  backgroundColor: "white",
                  borderRadius: "4px",
                  border: "1px solid #d1d5db",
                  fontSize: "12px",
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
      <div style={{ display: "flex", gap: "10px" }}>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={disabled ? "Sin permisos para escribir" : "Escribí un mensaje..."}
          disabled={disabled || sending}
          style={{
            flex: 1,
            padding: "10px",
            border: "1px solid #d1d5db",
            borderRadius: "4px",
            fontFamily: "monospace",
            fontSize: "14px",
            minHeight: "50px",
            resize: "vertical",
            opacity: disabled || sending ? 0.6 : 1,
          }}
        />
        <button
          type="submit"
          disabled={disabled || sending || (!content.trim() && uploadedFiles.length === 0)}
          style={{
            padding: "10px 20px",
            backgroundColor: "#0f172a",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: sending ? "default" : "pointer",
            opacity: disabled || sending || (!content.trim() && uploadedFiles.length === 0) ? 0.5 : 1,
          }}
        >
          {sending ? "Enviando..." : "Enviar"}
        </button>
      </div>
    </form>
  );
}
