/**
 * useNotificaciones hook for real-time notification handling (T124).
 * 
 * Connects to WebSocket, manages notification state, and provides filtering by role.
 */
import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getNotificaciones,
  marcarLeida,
  marcarTodasLeidas,
} from '../api/notificaciones.js';

/**
 * Hook for managing real-time notifications via WebSocket (T124).
 * 
 * Features:
 * - WebSocket connection to /ws/notificaciones/
 * - Auto-reconnection on disconnect
 * - Filters notifications by user role (admin vs employee)
 * - Provides categorized notification counts
 * - Handles notification marking as read
 * 
 * Returns:
 * {
 *   notifications: [],
 *   isConnected: boolean,
 *   counts: { cambio_responsable_pendiente: 0, ... },
 *   markAsRead: (notificationId) => void,
 *   markAllAsRead: () => void,
 *   error: string | null
 * }
 */
export function useNotificaciones() {
  const { user, accessToken } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  // Build WebSocket URL with auth token
  const getWebSocketURL = useCallback((token) => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}/ws/notificaciones/?token=${encodeURIComponent(token)}`;
  }, []);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (wsRef.current || !user || !accessToken) return;

    const wsURL = getWebSocketURL(accessToken);
    
    try {
      const ws = new WebSocket(wsURL);
      
      ws.onopen = () => {
        setIsConnected(true);
        setError(null);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'connection_established') {
            console.log('Connected to notification stream');
            return;
          }

          // Add new notification, skip if already loaded from initial fetch
          setNotifications((prev) => {
            if (prev.some((n) => n.id === data.id)) return prev;
            return [data, ...prev];
          });
        } catch (err) {
          console.error('Error parsing notification:', err);
        }
      };

      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        setError('Connection error');
      };

      ws.onclose = () => {
        setIsConnected(false);
        wsRef.current = null;
        
        // Attempt reconnection after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 3000);
      };

      wsRef.current = ws;
    } catch (err) {
      console.error('Failed to connect to WebSocket:', err);
      setError('Failed to connect');
    }
  }, [user, getWebSocketURL]);

  // Disconnect
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
  }, []);

  // Connect on mount (or when token changes)
  useEffect(() => {
    if (user && accessToken) {
      connect();

      // T209: Load existing unread notifications from DB on mount
      getNotificaciones({ leida: false })
        .then((initial) => {
          setNotifications(initial);
        })
        .catch((err) => {
          console.error('Error loading initial notifications:', err);
        });
    }
    
    return () => disconnect();
  }, [user, accessToken, connect, disconnect]);

  // Calculate counts by tipo
  const counts = notifications.reduce((acc, notif) => {
    const tipo = notif.tipo || 'general';
    acc[tipo] = (acc[tipo] || 0) + (notif.leida ? 0 : 1);
    return acc;
  }, {});

  // Mark notification as read (T210)
  const markAsRead = useCallback(async (notificationId) => {
    try {
      await marcarLeida(notificationId);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, leida: true } : n
        )
      );
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  }, []);

  // Mark all as read (T210)
  const markAllAsRead = useCallback(async () => {
    try {
      await marcarTodasLeidas();
      setNotifications((prev) => prev.map((n) => ({ ...n, leida: true })));
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  }, []);

  return {
    notifications,
    isConnected,
    counts,
    markAsRead,
    markAllAsRead,
    error,
  };
}
