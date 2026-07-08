/**
 * EmployeeNotificationPanel component (T126)
 * 
 * Displays notifications for employees:
 * - Asignaciones (asignado_responsable)
 * - Mensajes Urgentes (mensaje_urgente)
 * 
 * Shows unread count badges and allows marking as read.
 */
import { useMemo } from 'react';
import PropTypes from 'prop-types';

export default function EmployeeNotificationPanel({
  notifications = [],
  onNotificationRead,
}) {
  const relevantNotifications = useMemo(() => {
    return notifications.filter(
      (n) =>
        n.tipo === 'asignado_responsable' ||
        n.tipo === 'mensaje_urgente'
    );
  }, [notifications]);

  const unreadCount = relevantNotifications.filter((n) => !n.leida).length;

  const categories = {
    asignado_responsable: {
      label: 'Asignaciones',
      icon: '📌',
      color: '#4caf50',
    },
    mensaje_urgente: {
      label: 'Mensajes Urgentes',
      icon: '⚠️',
      color: '#ff5722',
    },
  };

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h2 style={{ margin: 0 }}>Mis Notificaciones</h2>
        {unreadCount > 0 && (
          <span
            style={{
              background: '#ff5722',
              color: '#fff',
              padding: '0.25rem 0.75rem',
              borderRadius: 12,
              fontSize: '0.85rem',
              fontWeight: 700,
            }}
          >
            {unreadCount} nuevas
          </span>
        )}
      </div>

      {relevantNotifications.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>
          No tienes notificaciones
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {relevantNotifications.map((notif) => {
            const config = categories[notif.tipo] || {
              label: 'Notificación',
              icon: '🔔',
              color: '#2196f3',
            };

            return (
              <div
                key={notif.id}
                style={{
                  padding: '1rem',
                  border: `1px solid ${notif.leida ? '#ddd' : config.color}`,
                  borderRadius: 8,
                  background: notif.leida ? '#fafafa' : `${config.color}05`,
                  display: 'flex',
                  gap: 12,
                  alignItems: 'flex-start',
                  opacity: notif.leida ? 0.7 : 1,
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ fontSize: '1.25rem', marginTop: 2 }}>
                  {config.icon}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      color: config.color,
                      marginBottom: 4,
                    }}
                  >
                    {config.label}
                  </div>
                  <div
                    style={{
                      fontSize: '0.9rem',
                      color: '#333',
                      marginBottom: 4,
                      wordWrap: 'break-word',
                    }}
                  >
                    {notif.titulo}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#666' }}>
                    {notif.mensaje}
                  </div>
                  <div
                    style={{
                      fontSize: '0.75rem',
                      color: '#999',
                      marginTop: 6,
                    }}
                  >
                    {new Date(notif.fecha).toLocaleString()}
                  </div>
                </div>

                {!notif.leida && (
                  <button
                    onClick={() => onNotificationRead?.(notif.id)}
                    style={{
                      padding: '0.4rem 0.85rem',
                      fontSize: '0.8rem',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Marcar leída
                  </button>
                )}
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
    })
  ),
  onNotificationRead: PropTypes.func,
};
