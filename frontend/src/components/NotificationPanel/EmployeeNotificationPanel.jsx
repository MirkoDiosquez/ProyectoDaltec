/**
 * EmployeeNotificationPanel component (T126)
 * 
 * Displays notifications for employees:
 * - Asignaciones (asignado_responsable)
 * - Mensajes Urgentes (mensaje_urgente)
 * - Mensajes Sin Leer (mensaje_sin_leer)
 * - Aprobaciones de Porqués (aprobacion_porque_pendiente)
 * - Cierres Pendientes (cierre_pendiente)
 * 
 * Features:
 * - Shows unread count badges per category
 * - Clicking a notification marks it as read and removes from panel
 * - Improved visual hierarchy and organization
 */
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { getNotifRoute, getHallazgoId } from '../../utils/notificationRoutes.js';

export default function EmployeeNotificationPanel({
  notifications = [],
  onNotificationRead,
}) {
  const navigate = useNavigate();
  
  // Include all relevant notifications for employees
  const relevantNotifications = useMemo(() => {
    return notifications.filter(
      (n) =>
        n.tipo === 'asignado_responsable' ||
        n.tipo === 'mensaje_urgente' ||
        n.tipo === 'mensaje_sin_leer' ||
        n.tipo === 'aprobacion_porque_pendiente' ||
        n.tipo === 'cierre_pendiente'
    );
  }, [notifications]);

  const categories = useMemo(() => ({
    asignado_responsable: {
      label: 'Asignaciones',
      icon: '📌',
      color: '#4caf50',
      bgColor: '#e8f5e9',
    },
    mensaje_urgente: {
      label: 'Mensajes Urgentes',
      icon: '⚠️',
      color: '#ff5722',
      bgColor: '#ffe0b2',
    },
    mensaje_sin_leer: {
      label: 'Mensajes del Chat',
      icon: '💬',
      color: '#2196f3',
      bgColor: '#e3f2fd',
    },
    aprobacion_porque_pendiente: {
      label: 'Aprobaciones de Porqués',
      icon: '✓',
      color: '#ff9800',
      bgColor: '#fff3e0',
    },
    cierre_pendiente: {
      label: 'Hallazgos con Actividad',
      icon: '🔔',
      color: '#9333ea',
      bgColor: '#f3e8ff',
    },
  }), []);

  const categorizedNotifs = useMemo(() => {
    const result = {};
    
    Object.keys(categories).forEach((tipo) => {
      result[tipo] = relevantNotifications.filter(
        (n) => n.tipo === tipo && !n.leida
      );
    });
    
    return result;
  }, [relevantNotifications, categories]);

  const unreadCount = relevantNotifications.filter((n) => !n.leida).length;

  const handleNotificationClick = async (notif) => {
    const hallazgoId = getHallazgoId(notif);
    
    // Mark as read
    if (onNotificationRead) {
      await onNotificationRead(notif.id);
    }
    
    // Navigate if possible
    if (hallazgoId) {
      navigate(getNotifRoute(notif.tipo, hallazgoId));
    }
  };

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* Header with unread count */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '2px solid #e0e0e0',
          paddingBottom: '1rem',
        }}
      >
        <h2 style={{ margin: 0 }}>Mis Notificaciones</h2>
        {unreadCount > 0 && (
          <span
            style={{
              background: '#ff5722',
              color: '#fff',
              padding: '0.5rem 1rem',
              borderRadius: '20px',
              fontSize: '0.9rem',
              fontWeight: 700,
            }}
          >
            {unreadCount} sin leer
          </span>
        )}
      </div>

      {/* Category summaries */}
      {unreadCount > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: 10,
          }}
        >
          {Object.entries(categories).map(([tipo, config]) => {
            const count = categorizedNotifs[tipo]?.length || 0;
            return count > 0 ? (
              <div
                key={tipo}
                style={{
                  padding: '0.75rem',
                  background: config.bgColor,
                  border: `1px solid ${config.color}`,
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span style={{ fontSize: '1.1rem' }}>{config.icon}</span>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#666' }}>
                    {config.label}
                  </div>
                  <div
                    style={{
                      fontSize: '0.9rem',
                      fontWeight: 700,
                      color: config.color,
                    }}
                  >
                    {count}
                  </div>
                </div>
              </div>
            ) : null;
          })}
        </div>
      )}

      {/* Notifications list */}
      {relevantNotifications.length === 0 ? (
        <div
          style={{
            padding: '2rem',
            textAlign: 'center',
            color: '#999',
            background: '#f5f5f5',
            borderRadius: 8,
            fontSize: '1rem',
          }}
        >
          ✓ No tienes notificaciones
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {Object.entries(categories).map(([tipo, config]) => {
            const notifs = categorizedNotifs[tipo];
            
            if (!notifs || notifs.length === 0) return null;
            
            return (
              <div key={tipo} style={{ display: 'grid', gap: 10 }}>
                <h4
                  style={{
                    margin: '0.5rem 0 0 0',
                    color: config.color,
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <span>{config.icon}</span>
                  {config.label} ({notifs.length})
                </h4>
                
                {notifs.map((notif) => {
                  const hallazgoId = getHallazgoId(notif);
                  const isNavigable = Boolean(hallazgoId);
                  
                  return (
                    <div
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      style={{
                        padding: '1rem',
                        border: `1px solid ${config.color}`,
                        borderRadius: 6,
                        background: config.bgColor,
                        display: 'flex',
                        gap: 12,
                        alignItems: 'flex-start',
                        cursor: isNavigable ? 'pointer' : 'default',
                        transition: 'all 0.2s',
                        transform: isNavigable ? 'translateX(0)' : 'none',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                      }}
                    >
                      <div style={{ fontSize: '1.25rem', marginTop: 2, flexShrink: 0 }}>
                        {config.icon}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: 600,
                            color: config.color,
                            marginBottom: 4,
                            fontSize: '0.95rem',
                          }}
                        >
                          {notif.titulo}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#555', marginBottom: 6 }}>
                          {notif.mensaje}
                        </div>
                        <div
                          style={{
                            fontSize: '0.75rem',
                            color: '#999',
                            display: 'flex',
                            justifyContent: 'space-between',
                          }}
                        >
                          <span>{new Date(notif.fecha).toLocaleString()}</span>
                          {isNavigable && (
                            <span
                              style={{
                                color: config.color,
                                fontWeight: 600,
                              }}
                            >
                              Click para ver →
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

EmployeeNotificationPanel.propTypes = {
  notifications: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      tipo: PropTypes.string.isRequired,
      titulo: PropTypes.string.isRequired,
      mensaje: PropTypes.string.isRequired,
      fecha: PropTypes.string.isRequired,
      leida: PropTypes.bool.isRequired,
      hallazgo_related: PropTypes.shape({ id: PropTypes.number }),
      hallazgo_id: PropTypes.number,
    })
  ),
  onNotificationRead: PropTypes.func,
};
