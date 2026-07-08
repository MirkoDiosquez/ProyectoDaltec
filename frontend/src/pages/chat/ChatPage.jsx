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
    <div style={{ maxWidth: 780, margin: "0 auto", padding: "24px 16px", display: "grid", gap: 16 }}>
      {/* Header */}
      <header style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <button
          onClick={() => navigate(`/hallazgos/${hallazgoId}`)}
          style={{
            padding: "8px 16px",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: "13px",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          ← Volver al hallazgo
        </button>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700, color: "#0f172a" }}>
            Chat · Hallazgo #{hallazgoId}
          </h1>
          <p style={{
            margin: "2px 0 0 0",
            fontSize: "12px",
            fontWeight: 500,
            color: connected ? "#16a34a" : "#dc2626",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}>
            <span style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: connected ? "#16a34a" : "#dc2626",
              display: "inline-block",
            }} />
            {connected ? "Conectado" : "Desconectado"}
          </p>
        </div>
      </header>

      {/* Connection Error */}
      {connectionError && (
        <div
          style={{
            padding: "12px 16px",
            backgroundColor: "#fef2f2",
            color: "#991b1b",
            borderRadius: "10px",
            borderLeft: "4px solid #ef4444",
            fontSize: "14px",
          }}
        >
          <strong>Error:</strong> {connectionError}
        </div>
      )}

      {/* Messages Container (T087) */}
      <div
        style={{
          border: "1px solid #e2e8f0",
          borderRadius: "14px",
          height: "480px",
          overflowY: "auto",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          backgroundColor: "#f8fafc",
          boxShadow: "inset 0 2px 6px rgba(0,0,0,0.04)",
        }}
      >
        {messages.length === 0 ? (
          <p style={{ color: "#94a3b8", fontSize: "14px", margin: "auto", textAlign: "center" }}>
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
            padding: "10px 14px",
            backgroundColor: "#fef2f2",
            color: "#991b1b",
            borderRadius: "8px",
            fontSize: "13px",
            border: "1px solid #fecaca",
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

