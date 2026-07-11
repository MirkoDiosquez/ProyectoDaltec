/**
 * AdminNotificationPanel component (T125)
 * 
 * Displays categorized notifications for admins:
 * - Aprobaciones Pendientes (aprobacion_porque_pendiente)
 * - Cierres Pendientes (cierre_pendiente)
 * - Cambios de Responsable (cambio_responsable_pendiente)
 * - Asignaciones (asignado_responsable)
 * - Mensajes Urgentes (mensaje_urgente)
 * - Mensajes Sin Leer (mensaje_sin_leer)
 * 
 * Features:
 * - Shows total unread count from all categories
 * - Clicking a notification marks it as read and removes from panel
 * - Improved visual hierarchy with better filters
 */
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { getNotifRoute, getHallazgoId } from '../../utils/notificationRoutes.js';

export default function AdminNotificationPanel({ 
  notifications = [], 
  onNavigate,
  onNotificationRead 
}) {
  const navigate = useNavigate();
  
  // Categorize notifications by tipo
  const categories = useMemo(() => ({
    aprobacion_porque_pendiente: {
      label: 'Aprobaciones de Porqués',
      icon: '✓',
      color: '#ff9800',
      bgColor: '#fff3e0',
    },
    cierre_pendiente: {
      label: 'Cierres Pendientes',
      icon: '🔒',
      color: '#f44336',
      bgColor: '#ffebee',
    },
    cambio_responsable_pendiente: {
      label: 'Cambios de Responsable',
      icon: '👥',
      color: '#2196f3',
      bgColor: '#e3f2fd',
    },
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
      color: '#9333ea',
      bgColor: '#f3e8ff',
    },
  }), []);

  const categorizedNotifs = useMemo(() => {
    const result = {};
    
    Object.keys(categories).forEach((tipo) => {
      result[tipo] = notifications.filter(
        (n) => n.tipo === tipo && !n.leida
      );
    });
    
    return result;
  }, [notifications, categories]);

  // Calculate total unread notifications across all categories
  const totalUnread = useMemo(() => {
    return Object.values(categorizedNotifs).reduce((sum, notifs) => sum + (notifs?.length || 0), 0);
  }, [categorizedNotifs]);

  const handleNotificationClick = async (notif) => {
    const hallazgoId = getHallazgoId(notif);
    
    // Call the callback to mark as read
    if (onNotificationRead) {
      await onNotificationRead(notif.id);
    }
    
    // Navigate to the relevant page
    if (hallazgoId) {
      navigate(getNotifRoute(notif.tipo, hallazgoId));
    }
  };

  const handleCategoryClick = (tipo) => {
    if (onNavigate) {
      onNavigate(tipo);
    }
  };

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* Header with total count */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '2px solid #e0e0e0',
        paddingBottom: '1rem',
      }}>
        <h2 style={{ margin: 0 }}>Panel de Notificaciones</h2>
        {totalUnread > 0 && (
          <div style={{
            background: '#f44336',
            color: '#fff',
            padding: '0.5rem 1rem',
            borderRadius: '20px',
            fontWeight: 700,
            fontSize: '0.95rem',
          }}>
            {totalUnread} total sin leer
          </div>
        )}
      </div>

      {/* Category buttons with counts */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 12,
        }}
      >
        {Object.entries(categories).map(([tipo, config]) => {
          const count = categorizedNotifs[tipo]?.length || 0;
          
          return (
            <button
              key={tipo}
              onClick={() => handleCategoryClick(tipo)}
              style={{
                padding: '1rem',
                border: `2px solid ${config.color}`,
                borderRadius: 8,
                background: count > 0 ? config.bgColor : '#fff',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                transition: 'all 0.2s',
                opacity: count > 0 ? 1 : 0.6,
                transform: count > 0 ? 'scale(1)' : 'scale(0.95)',
              }}
            >
              <span style={{ fontSize: '1.5rem' }}>{config.icon}</span>
              <span style={{ fontWeight: 600, fontSize: '0.85rem', textAlign: 'center' }}>
                {config.label}
              </span>
              {count > 0 && (
                <span
                  style={{
                    background: config.color,
                    color: '#fff',
                    borderRadius: '50%',
                    width: 32,
                    height: 32,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Detailed list of notifications by category */}
      <div style={{ display: 'grid', gap: 16 }}>
        {totalUnread === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '2rem',
            color: '#999',
            background: '#f5f5f5',
            borderRadius: 8,
            fontSize: '1rem',
          }}>
            ✓ No tienes notificaciones sin leer
          </div>
        ) : (
          Object.entries(categories).map(([tipo, config]) => {
            const notifs = categorizedNotifs[tipo];
            
            if (!notifs || notifs.length === 0) return null;
            
            return (
              <div
                key={tipo}
                style={{
                  border: `2px solid ${config.color}`,
                  borderRadius: 8,
                  padding: '1.5rem',
                  background: config.bgColor,
                  overflow: 'hidden',
                }}
              >
                <h4 style={{ 
                  margin: '0 0 1rem 0', 
                  color: config.color,
                  fontSize: '1.05rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}>
                  <span>{config.icon}</span>
                  {config.label} ({notifs.length})
                </h4>
                <div style={{ display: 'grid', gap: 10, maxHeight: '400px', overflowY: 'auto' }}>
                  {notifs.map((notif) => {
                    const hallazgoId = getHallazgoId(notif);
                    const isNavigable = Boolean(hallazgoId);
                    
                    return (
                      <div
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif)}
                        style={{
                          padding: '1rem',
                          background: '#fff',
                          borderRadius: 6,
                          borderLeft: `5px solid ${config.color}`,
                          cursor: isNavigable ? 'pointer' : 'default',
                          transition: 'all 0.2s',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                          transform: isNavigable ? 'translateX(0)' : 'none',
                          ':hover': {
                            boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                            transform: isNavigable ? 'translateX(4px)' : 'none',
                          },
                        }}
                      >
                        <div style={{ 
                          fontWeight: 600, 
                          fontSize: '0.95rem',
                          color: '#333',
                        }}>
                          {notif.titulo}
                        </div>
                        <div style={{ 
                          fontSize: '0.85rem', 
                          color: '#666', 
                          marginTop: 6,
                          lineHeight: 1.4,
                        }}>
                          {notif.mensaje}
                        </div>
                        <div style={{ 
                          fontSize: '0.75rem', 
                          color: '#999', 
                          marginTop: 8,
                          display: 'flex',
                          justifyContent: 'space-between',
                        }}>
                          <span>{new Date(notif.fecha).toLocaleString()}</span>
                          {isNavigable && (
                            <span style={{ color: config.color, fontWeight: 600 }}>
                              Ver hallazgo →
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

AdminNotificationPanel.propTypes = {
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
  onNavigate: PropTypes.func,
  onNotificationRead: PropTypes.func,
};
