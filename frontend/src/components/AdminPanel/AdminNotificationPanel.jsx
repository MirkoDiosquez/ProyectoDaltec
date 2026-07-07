/**
 * AdminNotificationPanel component (T125)
 * 
 * Displays categorized notifications for admins:
 * - Aprobaciones Pendientes (aprobacion_porque_pendiente)
 * - Cierres Pendientes (cierre_pendiente)
 * - Cambios de Responsable (cambio_responsable_pendiente)
 * - Asignaciones (asignado_responsable)
 * 
 * Shows unread count badges for each category.
 */
import { useMemo } from 'react';
import PropTypes from 'prop-types';

export default function AdminNotificationPanel({ notifications = [], onNavigate }) {
  // Categorize notifications by tipo
  const categories = useMemo(() => ({
    aprobacion_porque_pendiente: {
      label: 'Aprobaciones Pendientes',
      icon: '✓',
      color: '#ff9800',
    },
    cierre_pendiente: {
      label: 'Cierres Pendientes',
      icon: '🔒',
      color: '#f44336',
    },
    cambio_responsable_pendiente: {
      label: 'Cambios de Responsable',
      icon: '👥',
      color: '#2196f3',
    },
    asignado_responsable: {
      label: 'Asignaciones',
      icon: '📌',
      color: '#4caf50',
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

  const handleCategoryClick = (tipo) => {
    if (onNavigate) {
      onNavigate(tipo);
    }
  };

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <h2 style={{ margin: 0 }}>Panel de Notificaciones para Admin</h2>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
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
                background: '#fff',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                transition: 'all 0.2s',
                ':hover': {
                  background: `${config.color}20`,
                },
              }}
            >
              <span style={{ fontSize: '1.5rem' }}>{config.icon}</span>
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                {config.label}
              </span>
              {count > 0 && (
                <span
                  style={{
                    background: config.color,
                    color: '#fff',
                    borderRadius: '50%',
                    width: 28,
                    height: 28,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.85rem',
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

      {/* Detailed list of notifications */}
      <div style={{ marginTop: '1rem', display: 'grid', gap: 12 }}>
        {Object.entries(categories).map(([tipo, config]) => {
          const notifs = categorizedNotifs[tipo];
          
          if (!notifs || notifs.length === 0) return null;
          
          return (
            <div
              key={tipo}
              style={{
                border: `1px solid ${config.color}`,
                borderRadius: 8,
                padding: '1rem',
                background: `${config.color}05`,
              }}
            >
              <h4 style={{ margin: '0 0 0.5rem 0', color: config.color }}>
                {config.label} ({notifs.length})
              </h4>
              <div style={{ display: 'grid', gap: 8 }}>
                {notifs.map((notif) => (
                  <div
                    key={notif.id}
                    style={{
                      padding: '0.75rem',
                      background: '#fff',
                      borderRadius: 4,
                      borderLeft: `4px solid ${config.color}`,
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                      {notif.titulo}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#666', marginTop: 4 }}>
                      {notif.mensaje}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#999', marginTop: 4 }}>
                      {new Date(notif.fecha).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
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
    })
  ),
  onNavigate: PropTypes.func,
};
