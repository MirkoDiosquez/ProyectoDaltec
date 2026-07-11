import { useState, useRef, useCallback } from "react";
import FileUpload from "./FileUpload.jsx";
import client from "../api/client.js";

/**
 * ChatMessageComposer component for sending messages with optional file attachments (T085).
 *
 * Features:
 * - Textarea for message content
 * - FileUpload component in deferred mode (files attach but don't upload until send)
 * - Files upload when message is sent (like hallazgo creation)
 * - Send button with loading state
 * - Displays attached files before sending
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
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [sending, setSending] = useState(false);
  const composerRef = useRef(null);

  // Handle file selection in deferred mode (file not uploaded yet)
  const handleFileSelect = useCallback((file) => {
    if (file) {
      setAttachedFiles((prev) => [...prev, file]);
    }
  }, []);

  // Handle file selection error
  const handleFileError = useCallback((error) => {
    onError(error?.message || "Error con archivo");
  }, [onError]);

  // Remove attached file before sending
  const handleRemoveFile = useCallback((idx) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  // Upload a single file to /api/v1/archivos/
  const uploadFile = async (file) => {
    const formData = new FormData();
    formData.append('nombre', file.name);
    formData.append('ruta', file);

    try {
      const response = await client.post('/archivos/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data.id; // Return just the ID
    } catch (error) {
      throw new Error(error.response?.data?.ruta?.[0] || 'Error al subir archivo');
    }
  };

  // Send message with attachments (upload files first)
  const handleSendMessage = useCallback(
    async (e) => {
      e.preventDefault();

      const trimmedContent = content.trim();
      if (!trimmedContent && attachedFiles.length === 0) {
        onError("Escribí un mensaje o adjuntá un archivo");
        return;
      }

      if (!ws || ws.readyState !== WebSocket.OPEN) {
        onError("No conectado al chat. Recargá la página.");
        return;
      }

      setSending(true);
      try {
        // Upload all attached files first
        const archivoIds = [];
        for (const file of attachedFiles) {
          try {
            const id = await uploadFile(file);
            archivoIds.push(id);
          } catch (error) {
            onError(error.message);
            setSending(false);
            return;
          }
        }

        // Send message with file IDs
        const payload = {
          type: "chat.send",
          contenido: trimmedContent,
          archivos_ids: archivoIds,
        };
        ws.send(JSON.stringify(payload));
        setContent("");
        setAttachedFiles([]);
        onMessageSent?.();
      } catch (error) {
        onError(error.message || "Error enviando mensaje");
      } finally {
        setSending(false);
      }
    },
    [content, attachedFiles, ws, onError, onMessageSent]
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
      {/* File Upload Zone (Deferred Mode) */}
      <div>
        <FileUpload
          deferred={true}
          onFileSelect={handleFileSelect}
          onError={handleFileError}
          disabled={disabled || sending}
        />
      </div>

      {/* Display Attached Files Before Sending */}
      {attachedFiles.length > 0 && (
        <div
          style={{
            padding: "10px 12px",
            backgroundColor: "#f0f9ff",
            borderRadius: "10px",
            border: "1px solid #bae6fd",
          }}
        >
          <div style={{ fontSize: "11px", fontWeight: "700", color: "#0369a1", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Archivos adjuntos ({attachedFiles.length})
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {attachedFiles.map((file, idx) => (
              <div
                key={idx}
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
                <span>{file.name}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveFile(idx)}
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
          disabled={disabled || sending || (!content.trim() && attachedFiles.length === 0)}
          style={{
            padding: "10px 22px",
            borderRadius: "10px",
            fontWeight: 700,
            fontSize: "14px",
            cursor: sending ? "default" : "pointer",
            opacity: disabled || sending || (!content.trim() && attachedFiles.length === 0) ? 0.45 : 1,
            whiteSpace: "nowrap",
          }}
        >
          {sending ? "Enviando…" : "Enviar"}
        </button>
      </div>
    </form>
  );
}
