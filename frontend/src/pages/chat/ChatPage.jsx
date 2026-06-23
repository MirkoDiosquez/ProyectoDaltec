import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { connectChat, sendMessage, disconnect, isConnected } from "../../api/chat.js";
import { useAuth } from "../../context/AuthContext.jsx";

/**
 * ChatPage component for real-time hallazgo chat.
 *
 * Displays message history and live WebSocket feed.
 * Users who are chat participants can send messages.
 * Admins can view but not send (read-only mode).
 *
 * Refs: T055, contracts/websocket.md, FR-012
 */
export default function ChatPage() {
  const { hallazgoId } = useParams();
  const navigate = useNavigate();
  const { user, accessToken } = useAuth();

  // Connection state
  const [ws, setWs] = useState(null);
  const [connected, setConnected] = useState(false);
  const [connectionError, setConnectionError] = useState("");

  // Message state
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [sendError, setSendError] = useState("");

  // Determine if user can send (participants can, admins cannot)
  const canSendMessage = user?.tipo !== "ADMIN";
  const isAdmin = user?.tipo === "ADMIN";

  // Connect to WebSocket on mount or when hallazgoId/token changes
  useEffect(() => {
    if (!hallazgoId || !accessToken) {
      setConnectionError("Missing hallazgo ID or authentication token.");
      return;
    }

    const connect = async () => {
      try {
        setConnectionError("");
        const websocket = await connectChat(hallazgoId, accessToken, {
          onConnected: () => {
            console.log("[ChatPage] Connected");
            setConnected(true);
          },
          onMessageReceived: (mensaje) => {
            console.log("[ChatPage] New message:", mensaje);
            setMessages((prev) => [...prev, mensaje]);
          },
          onParticipantRemoved: (detail) => {
            console.warn("[ChatPage] Participant removed:", detail);
            setConnectionError(detail);
            setConnected(false);
          },
          onError: (error) => {
            console.error("[ChatPage] Error:", error);
            setConnectionError(error);
          },
          onDisconnected: (code) => {
            console.log("[ChatPage] Disconnected with code:", code);
            setConnected(false);
          },
        });

        setWs(websocket);
      } catch (error) {
        console.error("[ChatPage] Connection failed:", error);
        setConnectionError(`Failed to connect: ${error.message}`);
        setConnected(false);
      }
    };

    connect();

    // Cleanup on unmount
    return () => {
      if (ws && isConnected(ws)) {
        disconnect(ws);
      }
    };
  }, [hallazgoId, accessToken]);

  // Import isConnected function
  const wsIsConnected = (websocket) => {
    return websocket && websocket.readyState === WebSocket.OPEN;
  };

  // Handle message submission
  const handleSendMessage = useCallback(
    async (e) => {
      e.preventDefault();

      if (!newMessage.trim()) {
        setSendError("Message cannot be empty.");
        return;
      }

      if (!ws || !wsIsConnected(ws)) {
        setSendError("Not connected to chat. Please refresh.");
        return;
      }

      if (!canSendMessage) {
        setSendError("You cannot send messages (admin read-only mode).");
        return;
      }

      setSendingMessage(true);
      setSendError("");

      try {
        sendMessage(ws, newMessage);
        setNewMessage("");
      } catch (error) {
        console.error("[ChatPage] Send error:", error);
        setSendError(error.message || "Failed to send message.");
      } finally {
        setSendingMessage(false);
      }
    },
    [ws, newMessage, canSendMessage]
  );

  // Render
  return (
    <div style={{ padding: "20px" }}>
      {/* Header */}
      <div style={{ marginBottom: "20px" }}>
        <button
          onClick={() => navigate(`/hallazgos/${hallazgoId}`)}
          style={{
            padding: "8px 12px",
            backgroundColor: "#0f172a",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            marginBottom: "10px",
          }}
        >
          ← Back to Hallazgo
        </button>
        <h1>Chat - Hallazgo #{hallazgoId}</h1>
        <p style={{ color: connected ? "green" : "red", fontSize: "14px" }}>
          {connected ? "✓ Connected" : "✗ Disconnected"}
        </p>
      </div>

      {/* Connection Error */}
      {connectionError && (
        <div
          style={{
            padding: "12px",
            marginBottom: "15px",
            backgroundColor: "#fee2e2",
            color: "#dc2626",
            borderRadius: "4px",
            borderLeft: "4px solid #dc2626",
          }}
        >
          <strong>Error:</strong> {connectionError}
        </div>
      )}

      {/* Messages Container */}
      <div
        style={{
          border: "1px solid #d1d5db",
          borderRadius: "4px",
          height: "400px",
          overflowY: "auto",
          padding: "15px",
          marginBottom: "15px",
          backgroundColor: "#f9fafb",
        }}
      >
        {messages.length === 0 ? (
          <p style={{ color: "#999" }}>No messages yet. Start the conversation!</p>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              style={{
                marginBottom: "12px",
                paddingBottom: "12px",
                borderBottom: "1px solid #e5e7eb",
              }}
            >
              <div style={{ fontWeight: "bold", color: "#1f2937" }}>
                {msg.autor?.nombre} {msg.autor?.apellido}
              </div>
              <div style={{ color: "#6b7280", fontSize: "12px", marginBottom: "4px" }}>
                {new Date(msg.fecha_hora).toLocaleString()}
              </div>
              <div style={{ color: "#111827", wordWrap: "break-word" }}>
                {msg.contenido}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Send Error */}
      {sendError && (
        <div
          style={{
            padding: "10px",
            marginBottom: "15px",
            backgroundColor: "#fee2e2",
            color: "#dc2626",
            borderRadius: "4px",
            fontSize: "14px",
          }}
        >
          {sendError}
        </div>
      )}

      {/* Message Input */}
      <form onSubmit={handleSendMessage}>
        <div style={{ display: "flex", gap: "10px" }}>
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={
              canSendMessage ? "Type a message..." : "You are in read-only mode (Admin)"
            }
            disabled={!canSendMessage || !connected || sendingMessage}
            style={{
              flex: 1,
              padding: "10px",
              border: "1px solid #d1d5db",
              borderRadius: "4px",
              fontFamily: "monospace",
              fontSize: "14px",
              minHeight: "50px",
              resize: "vertical",
              opacity: !canSendMessage || !connected ? 0.6 : 1,
            }}
          />
          <button
            type="submit"
            disabled={!canSendMessage || !connected || sendingMessage || !newMessage.trim()}
            style={{
              padding: "10px 20px",
              backgroundColor:
                !canSendMessage || !connected || sendingMessage || !newMessage.trim()
                  ? "#d1d5db"
                  : "#0f172a",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: !canSendMessage || !connected || sendingMessage ? "not-allowed" : "pointer",
              fontWeight: "bold",
            }}
          >
            {sendingMessage ? "Sending..." : "Send"}
          </button>
        </div>
      </form>

      {/* Read-only Mode Notice */}
      {isAdmin && (
        <div
          style={{
            marginTop: "15px",
            padding: "12px",
            backgroundColor: "#fef3c7",
            color: "#92400e",
            borderRadius: "4px",
            fontSize: "13px",
          }}
        >
          <strong>ℹ️ Admin Read-Only:</strong> You are viewing this chat in read-only mode.
          Only chat participants can send messages.
        </div>
      )}
    </div>
  );
}
