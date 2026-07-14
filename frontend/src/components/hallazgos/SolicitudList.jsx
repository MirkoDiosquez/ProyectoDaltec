/**
 * Component for displaying and managing responsibility change requests (T112).
 */
import { useState } from 'react';
import PropTypes from 'prop-types';
import './SolicitudList.css';

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

  const getStatusConfig = (estado) => {
    switch (estado) {
      case 'pendiente':
        return { bg: '#fef3c7', border: '#fcd34d', badge: '#f59e0b', icon: '', text: 'Pendiente' };
      case 'aprobada':
        return { bg: '#dcfce7', border: '#86efac', badge: '#22c55e', icon: '✓', text: 'Aprobada' };
      case 'rechazada':
        return { bg: '#fee2e2', border: '#fca5a5', badge: '#ef4444', icon: '✕', text: 'Rechazada' };
      case 'anulada':
        return { bg: '#f3f4f6', border: '#d1d5db', badge: '#9ca3af', icon: '-', text: 'Anulada' };
      default:
        return { bg: '#eff6ff', border: '#bfdbfe', badge: '#3b82f6', icon: '?', text: 'Desconocido' };
    }
  };

  const pendientes = solicitudes.filter(s => s.estado === 'pendiente').length;

  return (
    <section
      className="solicitud-list"
      style={{
        border: '2px solid #3b82f6',
        borderRadius: 12,
        padding: '1.5rem',
        background: '#eff6ff',
        display: 'grid',
        gap: 16,
      }}
    >
      <div className="solicitud-list__title-row" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <h3 className="solicitud-list__title" style={{ margin: 0, color: '#1e40af' }}>Solicitudes de Cambio de Responsable</h3>
        {pendientes > 0 && (
          <span className="solicitud-list__counter" style={{
            background: '#f59e0b',
            color: '#fff',
            borderRadius: '50%',
            width: 28,
            height: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: '0.85rem',
          }}>
            {pendientes}
          </span>
        )}
      </div>

      {error && (
        <div style={{
          background: '#fee2e2',
          padding: '0.75rem',
          color: '#991b1b',
          borderRadius: 8,
          border: '1px solid #fca5a5',
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          ⚠️ {error}
        </div>
      )}

      <div style={{ display: 'grid', gap: 12 }}>
        {solicitudes.map((solicitud) => {
          const statusConfig = getStatusConfig(solicitud.estado);
          return (
            <div
              key={solicitud.id}
              className="solicitud-list__card"
              style={{
                border: `2px solid ${statusConfig.border}`,
                borderRadius: 12,
                padding: '1.25rem',
                background: statusConfig.bg,
                display: 'grid',
                gap: 12,
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              {/* Header con estado */}
              <div className="solicitud-list__header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div className="solicitud-list__header-content" style={{ flex: 1 }}>
                  <div className="solicitud-list__badge-wrap" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.5rem' }}>
                    <div
                      className="solicitud-list__status-badge"
                      style={{
                        padding: '0.4rem 0.8rem',
                        background: statusConfig.badge,
                        color: '#fff',
                        borderRadius: 20,
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <span>{statusConfig.icon}</span>
                      {statusConfig.text}
                    </div>
                  </div>

                  <div className="solicitud-list__meta" style={{ display: 'grid', gap: 6 }}>
                    <div className="solicitud-list__meta-row">
                      <span style={{ fontWeight: 600, color: '#374151' }}> Solicitante: </span>
                      <span className="solicitud-list__meta-value" style={{ color: '#1f2937' }}>{solicitud.solicitante_nombre}</span>
                    </div>
                    <div className="solicitud-list__meta-row solicitud-list__meta-row--propuesto" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 600, color: '#374151' }}>
                        {solicitud.tipo === 'agregar' ? '' : ''} {solicitud.tipo === 'agregar' ? 'Agregar a:' : 'Reemplazar por:'}
                      </span>
                      <span className="solicitud-list__meta-value" style={{ color: '#1f2937', fontWeight: 600 }}>{solicitud.usuario_propuesto_nombre}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Observacion if present */}
              {solicitud.observacion_rechazo && (
                <div className="solicitud-list__observacion" style={{
                  background: 'rgba(255,255,255,0.7)',
                  padding: '0.75rem',
                  borderLeft: '3px solid #6b7280',
                  borderRadius: 4,
                }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#6b7280', marginBottom: '0.25rem' }}>
                    💬 Observación:
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#374151' }}>
                    {solicitud.observacion_rechazo}
                  </div>
                </div>
              )}

              {/* Admin actions */}
              {isAdmin && solicitud.estado === 'pendiente' && (
                <div style={{ display: 'grid', gap: 10, paddingTop: '0.5rem', borderTop: `1px solid ${statusConfig.border}` }}>
                  <div className="solicitud-list__actions" style={{ display: 'flex', gap: 10 }}>
                    <button
                      onClick={() => handleApprove(solicitud.id)}
                      disabled={isLoading || actionInProgress[solicitud.id]}
                      className="solicitud-list__action-btn"
                      style={{
                        flex: 1,
                        padding: '0.7rem 1rem',
                        background: '#22c55e',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        cursor: isLoading || actionInProgress[solicitud.id] ? 'not-allowed' : 'pointer',
                        opacity: isLoading || actionInProgress[solicitud.id] ? 0.6 : 1,
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                      }}
                    >
                      <span>✓</span>
                      {actionInProgress[solicitud.id] === 'approve' ? 'Aprobando...' : 'Aprobar'}
                    </button>

                    <button
                      onClick={() => setExpandedId(expandedId === solicitud.id ? null : solicitud.id)}
                      disabled={isLoading || actionInProgress[solicitud.id]}
                      className="solicitud-list__action-btn"
                      style={{
                        flex: 1,
                        padding: '0.7rem 1rem',
                        background: '#ef4444',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        cursor: isLoading || actionInProgress[solicitud.id] ? 'not-allowed' : 'pointer',
                        opacity: isLoading || actionInProgress[solicitud.id] ? 0.6 : 1,
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                      }}
                    >
                      {expandedId === solicitud.id ? 'Ocultar' : 'Rechazar'}
                    </button>
                  </div>

                  {/* Rejection form (expanded) */}
                  {expandedId === solicitud.id && (
                    <div
                      className="solicitud-list__reject-form"
                      style={{
                        background: '#fff',
                        padding: '1rem',
                        borderRadius: 8,
                        border: '2px solid #ef4444',
                        display: 'grid',
                        gap: 10,
                      }}
                    >
                      <label htmlFor={`reject-obs-${solicitud.id}`} style={{ 
                        fontSize: '0.9rem', 
                        fontWeight: 600,
                        color: '#374151',
                      }}>
                        💬 Razón del rechazo (opcional):
                      </label>
                      <textarea
                        className="solicitud-list__textarea"
                        id={`reject-obs-${solicitud.id}`}
                        value={rejectObservacion}
                        onChange={(e) => setRejectObservacion(e.target.value)}
                        disabled={isLoading}
                        placeholder="Explica el motivo del rechazo..."
                        rows={3}
                        style={{
                          padding: '0.75rem',
                          borderRadius: 6,
                          border: '1px solid #d1d5db',
                          fontFamily: 'inherit',
                          fontSize: '0.9rem',
                          resize: 'vertical',
                        }}
                      />
                      <button
                        onClick={() => handleReject(solicitud.id)}
                        disabled={isLoading || actionInProgress[solicitud.id]}
                        style={{
                          padding: '0.7rem 1rem',
                          background: '#ef4444',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 6,
                          fontWeight: 700,
                          fontSize: '0.9rem',
                          cursor: isLoading || actionInProgress[solicitud.id] ? 'not-allowed' : 'pointer',
                          opacity: isLoading || actionInProgress[solicitud.id] ? 0.6 : 1,
                          transition: 'all 0.2s',
                        }}
                      >
                        {actionInProgress[solicitud.id] === 'reject' ? ' Rechazando...' : ' Confirmar Rechazo'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
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
