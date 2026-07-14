import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "./AuthContext.jsx";
import { marcarChatLeidas, marcarHallazgoLeidas } from "../api/notificaciones.js";

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
  const [isLoading, setIsLoading] = useState(false);

  // Load initial notifications from API
  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;

    const fetchInitialNotificaciones = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/v1/notificaciones/?leida=false&ordering=-fecha", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          const results = Array.isArray(data.results) ? data.results : (Array.isArray(data) ? data : []);
          setNotificaciones(results);
          setUnreadCount(results.filter(n => !n.leida).length);
        }
      } catch (error) {
        console.error("Error loading initial notifications:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialNotificaciones();
  }, [isAuthenticated, accessToken]);

  useEffect(() => {
    const canConnect = isAuthenticated && Boolean(accessToken);

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
        // Skip connection confirmation messages
        if (payload.type === "connection_established") return;
        
        setNotificaciones((prev) => {
          // Check if notification already exists
          const exists = prev.some(n => n.id === payload.id);
          if (exists) return prev;
          return [payload, ...prev];
        });
        
        if (!payload.leida) {
          setUnreadCount((prev) => prev + 1);
        }
      } catch (error) {
        console.error("Error parsing notification:", error);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setIsConnected(false);
    };

    return () => {
      ws.close();
      if (socketRef.current === ws) {
        socketRef.current = null;
      }
    };
  }, [isAuthenticated, accessToken]);

  const markAsRead = async (notificationId) => {
    try {
      const response = await fetch(`/api/v1/notificaciones/${notificationId}/marcar_leida/`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });
      
      if (response.ok) {
        const updatedNotif = await response.json();
        setNotificaciones((prev) =>
          prev.map((n) => (n.id === notificationId ? updatedNotif : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
        return updatedNotif;
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch("/api/v1/notificaciones/marcar_todas_leidas/", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });
      
      if (response.ok) {
        setNotificaciones((prev) =>
          prev.map((n) => ({ ...n, leida: true }))
        );
        setUnreadCount(0);
      }
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const removeNotification = (notificationId) => {
    setNotificaciones((prev) => prev.filter((n) => n.id !== notificationId));
  };

  const clearNotificaciones = () => {
    setNotificaciones([]);
    setUnreadCount(0);
  };

  const markHallazgoNotificationsAsRead = async (hallazgoId) => {
    if (!hallazgoId) return { updated_count: 0 };

    try {
      const data = await marcarHallazgoLeidas(hallazgoId);
      const targetId = Number(hallazgoId);

      setNotificaciones((prev) =>
        prev.map((n) => {
          const relatedId = Number(n?.hallazgo_related?.id ?? n?.hallazgo_id ?? n?.hallazgo_relacionado_id);
          if (!n.leida && relatedId === targetId) {
            return { ...n, leida: true };
          }
          return n;
        })
      );

      setUnreadCount((prev) => Math.max(0, prev - Number(data?.updated_count || 0)));
      return data;
    } catch (error) {
      console.error("Error marking hallazgo notifications as read:", error);
      return { updated_count: 0 };
    }
  };

  const markChatNotificationsAsRead = async (hallazgoId) => {
    if (!hallazgoId) return { updated_count: 0, hallazgo_id: null };

    try {
      const data = await marcarChatLeidas(hallazgoId);
      const targetId = Number(hallazgoId);

      setNotificaciones((prev) =>
        prev.map((n) => {
          const relatedId = Number(n?.hallazgo_related?.id ?? n?.hallazgo_id ?? n?.hallazgo_relacionado_id);
          const isChatTipo = n.tipo === "mensaje_sin_leer" || n.tipo === "mensaje_urgente";
          if (!n.leida && isChatTipo && relatedId === targetId) {
            return { ...n, leida: true };
          }
          return n;
        })
      );

      setUnreadCount((prev) => Math.max(0, prev - Number(data?.updated_count || 0)));
      return data;
    } catch (error) {
      console.error("Error marking chat notifications as read:", error);
      return { updated_count: 0, hallazgo_id: Number(hallazgoId) };
    }
  };

  const value = useMemo(
    () => ({
      notificaciones,
      unreadCount,
      isConnected,
      isLoading,
      markAsRead,
      markAllAsRead,
      removeNotification,
      clearNotificaciones,
      markChatNotificationsAsRead,
      markHallazgoNotificationsAsRead,
    }),
    [notificaciones, unreadCount, isConnected, isLoading]
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
