import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { connectChat, sendMessage, disconnect, isConnected, getChatByHallazgo } from "../../api/chat.js";
import { useAuth } from "../../context/AuthContext.jsx";
import ChatMessage from "../../components/ChatMessage.jsx";
import ChatMessageComposer from "../../components/ChatMessageComposer.jsx";

/**
 * ChatPage component for real-time hallazgo chat with file attachment support (T087).
 *
 * Displays message history and live WebSocket feed.
 * Users who are chat participants can send messages with optional file attachments.
 * Admins can view but not send (read-only mode).
 *
 * Refs: T055, contracts/websocket.md, FR-012, T087
 */
export default function ChatPage() {
  const { id: hallazgoId } = useParams();  // route is /hallazgos/:id/chat
  const navigate = useNavigate();
  const { user, accessToken } = useAuth();

  // Connection state
  const [ws, setWs] = useState(null);
  const [connected, setConnected] = useState(false);
  const [connectionError, setConnectionError] = useState("");
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Message state
  const [messages, setMessages] = useState([]);
  const [composerError, setComposerError] = useState("");

  // Reconnect state
  const wsRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const reconnectAttemptRef = useRef(0);
  const isMountedRef = useRef(true);

  // Determine if user can send (participants can, admins cannot)
  const canSendMessage = user?.tipo !== "ADMIN";
  const isAdmin = user?.tipo === "ADMIN";

  // Load chat history via REST on mount
  useEffect(() => {
    if (!hallazgoId) return;
    setLoadingHistory(true);
    getChatByHallazgo(hallazgoId)
      .then((chat) => {
        if (chat?.mensajes?.length) {
          setMessages(chat.mensajes);
        }
      })
      .catch((err) => {
        console.error("[ChatPage] Failed to load history:", err);
        setConnectionError("No se pudo cargar el historial del chat.");
      })
      .finally(() => setLoadingHistory(false));
  }, [hallazgoId]);

  // Connect WebSocket with automatic reconnect
  useEffect(() => {
    isMountedRef.current = true;

    if (!hallazgoId || !accessToken) {
      setConnectionError("Faltan datos de autenticación.");
      return;
    }

    // Non-recoverable close codes — don't reconnect
    const FATAL_CODES = new Set([4001, 4003, 4000]);

    const doConnect = async () => {
      if (!isMountedRef.current) return;

      try {
        setConnectionError("");
        const websocket = await connectChat(hallazgoId, accessToken, {
          onConnected: () => {
            console.log("[ChatPage] Connected");
            reconnectAttemptRef.current = 0;
            if (isMountedRef.current) setConnected(true);
          },
          onMessageReceived: (mensaje) => {
            if (isMountedRef.current) setMessages((prev) => [...prev, mensaje]);
          },
          onParticipantRemoved: (detail) => {
            if (isMountedRef.current) {
              setConnectionError(detail);
              setConnected(false);
            }
          },
          onError: (error) => {
            console.error("[ChatPage] WS error:", error);
          },
          onDisconnected: (code) => {
            console.log("[ChatPage] Disconnected code:", code);
            if (!isMountedRef.current) return;
            setConnected(false);
            wsRef.current = null;

            // Don't reconnect on fatal codes (removed from chat / auth error)
            if (FATAL_CODES.has(code)) {
              if (code === 4001) setConnectionError("Sesión expirada. Recargá la página.");
              if (code === 4003) setConnectionError("Ya no tenés acceso a este chat.");
              return;
            }

            // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
            const delay = Math.min(1000 * 2 ** reconnectAttemptRef.current, 30000);
            reconnectAttemptRef.current += 1;
            console.log(`[ChatPage] Reconnecting in ${delay}ms (attempt ${reconnectAttemptRef.current})`);
            reconnectTimerRef.current = setTimeout(doConnect, delay);
          },
        });

        wsRef.current = websocket;
        if (isMountedRef.current) setWs(websocket);
      } catch (error) {
        console.error("[ChatPage] Connection failed:", error);
        if (!isMountedRef.current) return;
        setConnectionError("No se pudo conectar al chat.");
        setConnected(false);
        // Retry after 3 seconds on initial failure
        reconnectTimerRef.current = setTimeout(doConnect, 3000);
      }
    };

    doConnect();

    return () => {
      isMountedRef.current = false;
      clearTimeout(reconnectTimerRef.current);
      if (wsRef.current && isConnected(wsRef.current)) {
        disconnect(wsRef.current);
      }
    };
  }, [hallazgoId, accessToken]);

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

      {/* Messages Container (T087) */}
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
          <p style={{ color: "#999" }}>
            {loadingHistory ? "Cargando historial..." : "No hay mensajes aún. ¡Empezá la conversación!"}
          </p>
        ) : (
          messages.map((msg, idx) => <ChatMessage key={idx} mensaje={msg} index={idx} />)
        )}
      </div>

      {/* Composer Error (T087) */}
      {composerError && (
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
          {composerError}
        </div>
      )}

      {/* Message Composer with File Attachments (T087) */}
      <ChatMessageComposer
        ws={ws}
        onMessageSent={() => setComposerError("")}
        onError={setComposerError}
        disabled={!canSendMessage || !connected}
      />
    </div>
  );
}
