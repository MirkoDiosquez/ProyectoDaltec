import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "./AuthContext.jsx";

const NotificacionContext = createContext(null);

function buildWebSocketUrl(token) {
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  return `${protocol}://${window.location.host}/ws/notificaciones/?token=${encodeURIComponent(token)}`;
}

export function NotificacionProvider({ children }) {
  const { isAuthenticated, accessToken, user } = useAuth();
  const socketRef = useRef(null);

  const [notificaciones, setNotificaciones] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const canConnect = isAuthenticated && Boolean(accessToken) && user?.tipo === "ADMIN";

    if (!canConnect) {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      setIsConnected(false);
      return;
    }

    const ws = new WebSocket(buildWebSocketUrl(accessToken));
    socketRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        setNotificaciones((prev) => [payload, ...prev]);
        setUnreadCount((prev) => prev + 1);
      } catch {
        // Ignore malformed messages.
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    ws.onerror = () => {
      setIsConnected(false);
    };

    return () => {
      ws.close();
      if (socketRef.current === ws) {
        socketRef.current = null;
      }
    };
  }, [isAuthenticated, accessToken, user?.tipo]);

  const markAllAsRead = () => {
    setUnreadCount(0);
  };

  const clearNotificaciones = () => {
    setNotificaciones([]);
    setUnreadCount(0);
  };

  const value = useMemo(
    () => ({
      notificaciones,
      unreadCount,
      isConnected,
      markAllAsRead,
      clearNotificaciones,
    }),
    [notificaciones, unreadCount, isConnected]
  );

  return <NotificacionContext.Provider value={value}>{children}</NotificacionContext.Provider>;
}

export function useNotificaciones() {
  const ctx = useContext(NotificacionContext);
  if (!ctx) {
    throw new Error("useNotificaciones must be used within a <NotificacionProvider>");
  }
  return ctx;
}

export default NotificacionContext;
