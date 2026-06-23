/**
 * WebSocket client for real-time chat functionality.
 *
 * Provides functions to:
 * - connectChat(hallazgoId, token, handlers): Connect to chat WebSocket
 * - sendMessage(ws, contenido): Send a message to the chat
 * - disconnect(ws): Close the WebSocket connection
 *
 * WebSocket URL pattern: ws://host/ws/chat/{hallazgo_id}/?token={access_token}
 *
 * Event handlers:
 * - onMessageReceived(mensaje): Called when a new message arrives
 * - onParticipantRemoved(detail): Called when user is removed from chat
 * - onError(error): Called on connection errors
 * - onConnected(): Called when connection is established
 * - onDisconnected(): Called when connection closes
 *
 * Refs: T054, contracts/websocket.md, FR-012
 */

// Determine WebSocket protocol based on current location
const getWsProtocol = () => {
  return window.location.protocol === "https:" ? "wss:" : "ws:";
};

const getWsHost = () => {
  return window.location.host;
};

/**
 * Connect to a chat room WebSocket.
 *
 * @param {number} hallazgoId - The hallazgo ID for this chat
 * @param {string} token - JWT access token for authentication
 * @param {Object} handlers - Event handlers
 * @param {Function} handlers.onMessageReceived - Called with (mensaje) when message arrives
 * @param {Function} handlers.onParticipantRemoved - Called with (detail) when user removed
 * @param {Function} handlers.onError - Called with (error) on errors
 * @param {Function} handlers.onConnected - Called when connection succeeds
 * @param {Function} handlers.onDisconnected - Called when connection closes
 * @returns {Promise<WebSocket>} Connected WebSocket instance
 */
export const connectChat = (hallazgoId, token, handlers = {}) => {
  return new Promise((resolve, reject) => {
    const protocol = getWsProtocol();
    const host = getWsHost();
    const wsUrl = `${protocol}//${host}/ws/chat/${hallazgoId}/?token=${token}`;

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log(`[Chat] Connected to hallazgo ${hallazgoId}`);
        if (handlers.onConnected) {
          handlers.onConnected();
        }
        resolve(ws);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("[Chat] Message received:", data);

          if (data.type === "chat.message" && handlers.onMessageReceived) {
            handlers.onMessageReceived(data.mensaje);
          } else if (data.type === "chat.participant_removed" && handlers.onParticipantRemoved) {
            handlers.onParticipantRemoved(data.detail);
          } else if (data.type === "error" && handlers.onError) {
            handlers.onError(data.detail || "Unknown error");
          }
        } catch (error) {
          console.error("[Chat] Failed to parse message:", error);
          if (handlers.onError) {
            handlers.onError(`Parse error: ${error.message}`);
          }
        }
      };

      ws.onerror = (error) => {
        console.error("[Chat] WebSocket error:", error);
        if (handlers.onError) {
          handlers.onError(`WebSocket error: ${error.message || "Unknown error"}`);
        }
        reject(error);
      };

      ws.onclose = (event) => {
        console.log(`[Chat] Disconnected (code: ${event.code})`);
        if (handlers.onDisconnected) {
          handlers.onDisconnected(event.code);
        }

        // Handle special close codes
        if (event.code === 4001) {
          console.error("[Chat] Token invalid or expired");
          if (handlers.onError) {
            handlers.onError("Authentication token expired. Please refresh and reconnect.");
          }
        } else if (event.code === 4003) {
          console.error("[Chat] No permissions or removed from chat");
          if (handlers.onError) {
            handlers.onError("You no longer have access to this chat.");
          }
        }
      };
    } catch (error) {
      console.error("[Chat] Failed to create WebSocket:", error);
      if (handlers.onError) {
        handlers.onError(`Connection failed: ${error.message}`);
      }
      reject(error);
    }
  });
};

/**
 * Send a message to the chat room.
 *
 * @param {WebSocket} ws - Connected WebSocket instance
 * @param {string} contenido - Message content
 * @throws {Error} If WebSocket is not connected
 */
export const sendMessage = (ws, contenido) => {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    throw new Error("WebSocket is not connected");
  }

  const message = {
    type: "chat.send",
    contenido: contenido.trim(),
  };

  ws.send(JSON.stringify(message));
  console.log("[Chat] Message sent:", contenido);
};

/**
 * Disconnect from the chat room.
 *
 * @param {WebSocket} ws - Connected WebSocket instance
 */
export const disconnect = (ws) => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.close(1000, "Normal closure");
    console.log("[Chat] Disconnected");
  }
};

/**
 * Check if WebSocket is connected and ready.
 *
 * @param {WebSocket} ws - WebSocket instance
 * @returns {boolean} True if connected
 */
export const isConnected = (ws) => {
  return ws && ws.readyState === WebSocket.OPEN;
};
