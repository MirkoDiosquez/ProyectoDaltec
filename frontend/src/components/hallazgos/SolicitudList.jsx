/**
 * Component for displaying and managing responsibility change requests (T112).
 */
import { useState } from 'react';
import PropTypes from 'prop-types';

/**
 * SolicitudList component
 * 
 * T112: Display pending solicitudes de cambio de responsable with approve/reject actions.
 * 
 * Features:
 * - Shows all pending solicitudes for a hallazgo
 * - Display solicitante, tipo, usuario_propuesto, and observacion
 * - Admin can approve or reject each solicitud
 * - Shows status badge (pendiente, aprobada, rechazada, anulada)
 * - Loading and error states
 * 
 * Props:
 * - hallazgoId: ID of the hallazgo
 * - solicitudes: Array of SolicitudCambioResponsable objects
 * - onApprove: Callback(solicitudId) when admin approves
 * - onReject: Callback(solicitudId, observacion) when admin rejects
 * - isAdmin: Whether current user is admin
 * - isLoading: Whether actions are in progress
 */
export default function SolicitudList({
  hallazgoId,
  solicitudes = [],
  onApprove,
  onReject,
  isAdmin = false,
  isLoading = false,
}) {
  const [expandedId, setExpandedId] = useState(null);
  const [rejectObservacion, setRejectObservacion] = useState('');
  const [error, setError] = useState('');
  const [actionInProgress, setActionInProgress] = useState({});

  const handleApprove = async (solicitudId) => {
    setActionInProgress((prev) => ({ ...prev, [solicitudId]: 'approve' }));
    setError('');

    try {
      await onApprove(solicitudId);
    } catch (err) {
      setError(err.message || 'Error al aprobar solicitud');
    } finally {
      setActionInProgress((prev) => ({ ...prev, [solicitudId]: null }));
    }
  };

  const handleReject = async (solicitudId) => {
    setActionInProgress((prev) => ({ ...prev, [solicitudId]: 'reject' }));
    setError('');

    try {
      await onReject(solicitudId, rejectObservacion);
      setRejectObservacion('');
      setExpandedId(null);
    } catch (err) {
      setError(err.message || 'Error al rechazar solicitud');
    } finally {
      setActionInProgress((prev) => ({ ...prev, [solicitudId]: null }));
    }
  };

  if (!Array.isArray(solicitudes) || solicitudes.length === 0) {
    return null;
  }

  const getStatusBadgeColor = (estado) => {
    switch (estado) {
      case 'pendiente':
        return '#ffa500'; // orange
      case 'aprobada':
        return '#00aa00'; // green
      case 'rechazada':
        return '#cc0000'; // red
      case 'anulada':
        return '#999999'; // gray
      default:
        return '#0066cc'; // blue
    }
  };

  return (
    <section
      style={{
        border: '1px solid #e2e8f0',
        borderRadius: 12,
        padding: '1rem',
        background: '#fff',
        display: 'grid',
        gap: 12,
      }}
    >
      <h3 style={{ margin: 0 }}>Solicitudes de Cambio de Responsable</h3>

      {error && (
        <div style={{ background: '#fee', padding: '0.5rem', color: '#c00', borderRadius: 4 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gap: 12 }}>
        {solicitudes.map((solicitud) => (
          <div
            key={solicitud.id}
            style={{
              border: '1px solid #ddd',
              borderRadius: 8,
              padding: '1rem',
              background: solicitud.estado === 'pendiente' ? '#fffacd' : '#f9f9f9',
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 8,
                marginBottom: '0.5rem',
              }}
            >
              <div>
                <strong>{solicitud.solicitante_nombre}</strong> solicita{' '}
                {solicitud.tipo === 'agregar' ? 'agregar' : 'reemplazarse por'}
                <br />
                <strong>{solicitud.usuario_propuesto_nombre}</strong>
              </div>
              <div
                style={{
                  padding: '0.25rem 0.75rem',
                  background: getStatusBadgeColor(solicitud.estado),
                  color: '#fff',
                  borderRadius: 12,
                  fontSize: '0.85rem',
                  whiteSpace: 'nowrap',
                }}
              >
                {solicitud.estado}
              </div>
            </div>

            {/* Observacion if present */}
            {solicitud.observacion_rechazo && (
              <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem' }}>
                <strong>Observación:</strong> {solicitud.observacion_rechazo}
              </div>
            )}

            {/* Admin actions */}
            {isAdmin && solicitud.estado === 'pendiente' && (
              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => handleApprove(solicitud.id)}
                    disabled={isLoading || actionInProgress[solicitud.id]}
                    style={{
                      padding: '0.5rem 1rem',
                      background: '#00aa00',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 4,
                      cursor: isLoading ? 'not-allowed' : 'pointer',
                      opacity: isLoading || actionInProgress[solicitud.id] ? 0.6 : 1,
                    }}
                  >
                    {actionInProgress[solicitud.id] === 'approve' ? 'Aprobando...' : 'Aprobar'}
                  </button>

                  <button
                    onClick={() => setExpandedId(expandedId === solicitud.id ? null : solicitud.id)}
                    disabled={isLoading || actionInProgress[solicitud.id]}
                    style={{
                      padding: '0.5rem 1rem',
                      background: '#cc0000',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 4,
                      cursor: isLoading ? 'not-allowed' : 'pointer',
                      opacity: isLoading || actionInProgress[solicitud.id] ? 0.6 : 1,
                    }}
                  >
                    Rechazar
                  </button>
                </div>

                {/* Rejection form (expanded) */}
                {expandedId === solicitud.id && (
                  <div
                    style={{
                      background: '#fee',
                      padding: '0.75rem',
                      borderRadius: 4,
                      display: 'grid',
                      gap: 8,
                    }}
                  >
                    <label htmlFor={`reject-obs-${solicitud.id}`} style={{ fontSize: '0.9rem' }}>
                      Razón del rechazo (opcional):
                    </label>
                    <textarea
                      id={`reject-obs-${solicitud.id}`}
                      value={rejectObservacion}
                      onChange={(e) => setRejectObservacion(e.target.value)}
                      disabled={isLoading}
                      placeholder="Por favor explica por qué rechazas esta solicitud..."
                      rows={3}
                      style={{
                        padding: '0.5rem',
                        borderRadius: 4,
                        border: '1px solid #ccc',
                        fontFamily: 'inherit',
                      }}
                    />
                    <button
                      onClick={() => handleReject(solicitud.id)}
                      disabled={isLoading || actionInProgress[solicitud.id]}
                      style={{
                        padding: '0.5rem 1rem',
                        background: '#cc0000',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 4,
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {actionInProgress[solicitud.id] === 'reject' ? 'Rechazando...' : 'Confirmar Rechazo'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

SolicitudList.propTypes = {
  hallazgoId: PropTypes.number.isRequired,
  solicitudes: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      hallazgo_id: PropTypes.number.isRequired,
      solicitante: PropTypes.number.isRequired,
      solicitante_nombre: PropTypes.string.isRequired,
      tipo: PropTypes.oneOf(['agregar', 'cambiar']).isRequired,
      usuario_propuesto: PropTypes.number.isRequired,
      usuario_propuesto_nombre: PropTypes.string.isRequired,
      observacion_rechazo: PropTypes.string,
      estado: PropTypes.oneOf(['pendiente', 'aprobada', 'rechazada', 'anulada']).isRequired,
      created_at: PropTypes.string.isRequired,
    })
  ),
  onApprove: PropTypes.func.isRequired,
  onReject: PropTypes.func.isRequired,
  isAdmin: PropTypes.bool,
  isLoading: PropTypes.bool,
};
