/**
 * NotificationBadge component (T129)
 * 
 * Displays unread notification count per category or total.
 */
import PropTypes from 'prop-types';

export default function NotificationBadge({ count = 0, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        position: 'relative',
        background: 'none',
        border: 'none',
        padding: '0.5rem',
        cursor: 'pointer',
        fontSize: '1.5rem',
      }}
      title={count > 0 ? `${count} notificación${count !== 1 ? 'es' : ''} sin leer` : 'Notificaciones'}
    >
      🔔
      {count > 0 && (
        <span
          style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            background: '#ff5722',
            color: '#fff',
            borderRadius: '50%',
            width: 24,
            height: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.75rem',
            fontWeight: 700,
          }}
        >
          {count}
        </span>
      )}
    </button>
  );
}

NotificationBadge.propTypes = {
  count: PropTypes.number,
  onClick: PropTypes.func,
};

NotificationBadge.propTypes = {
  count: PropTypes.number,
  onClick: PropTypes.func,
};
