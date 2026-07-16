/**
 * Frontend component for creating responsibility change requests (T110).
 */
import { useState } from 'react';
import PropTypes from 'prop-types';

/**
 * SolicitudCambioForm component
 * 
 * T110: Form for responsables to request adding or replacing a responsable.
 * 
 * Features:
 * - Radio button selection between 'agregar' (add) and 'cambiar' (replace me)
 * - Dropdown to select usuario_propuesto from available users
 * - Text area for optional observation
 * - Submit button with loading state
 * - Error display
 * 
 * Props:
 * - hallazgoId: ID of the hallazgo
 * - usuarios: Array of available users for selection
 * - onSubmit: Callback when form is submitted successfully
 * - isLoading: Whether the submission is in progress
 */
export default function SolicitudCambioForm({
  hallazgoId,
  usuarios = [],
  currentResponsables = [],
  onSubmit,
  isLoading = false,
}) {
  const [tipo, setTipo] = useState('agregar');
  const [usuarioId, setUsuarioId] = useState('');
  const [observacion, setObservacion] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!usuarioId) {
      setError('Por favor selecciona un usuario');
      return;
    }

    try {
      await onSubmit({
        tipo,
        usuario_propuesto: Number(usuarioId),
        observacion_rechazo: observacion,
      });
      
      // Reset form
      setTipo('agregar');
      setUsuarioId('');
      setObservacion('');
    } catch (err) {
      setError(err.message || 'Error al enviar solicitud');
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        border: '2px solid #f59e0b',
        borderRadius: 12,
        padding: '1.5rem',
        background: '#fffbeb',
        display: 'grid',
        gap: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <h3 style={{ margin: 0, color: '#92400e' }}>Solicitud de Cambio de Responsable</h3>
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

      {/* Tipo selection with better styling */}
      <div style={{ 
        background: '#fff',
        padding: '1rem',
        borderRadius: 8,
        border: '1px solid #fcd34d',
        display: 'grid',
        gap: 12,
      }}>
        <label style={{ fontWeight: 600, color: '#92400e', fontSize: '0.95rem' }}>
          Tipo de solicitud:
        </label>
        <div style={{ display: 'flex', gap: 16 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="radio"
              value="agregar"
              checked={tipo === 'agregar'}
              onChange={(e) => setTipo(e.target.value)}
              disabled={isLoading}
              style={{ width: 18, height: 18, cursor: 'pointer' }}
            />
            <span style={{ fontSize: '0.95rem' }}> Agregar responsable</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="radio"
              value="cambiar"
              checked={tipo === 'cambiar'}
              onChange={(e) => setTipo(e.target.value)}
              disabled={isLoading}
              style={{ width: 18, height: 18, cursor: 'pointer' }}
            />
            <span style={{ fontSize: '0.95rem' }}> Reemplazarme</span>
          </label>
        </div>
      </div>

      {/* Usuario selection */}
      <div style={{ display: 'grid', gap: 8 }}>
        <label htmlFor={`usuario-select-${hallazgoId}`} style={{ fontWeight: 600, color: '#374151' }}>
           Usuario a {tipo === 'agregar' ? 'agregar' : 'reemplazarme'}:
        </label>
        <select
          id={`usuario-select-${hallazgoId}`}
          value={usuarioId}
          onChange={(e) => setUsuarioId(e.target.value)}
          disabled={isLoading}
          required
          style={{
            padding: '0.75rem',
            borderRadius: 8,
            border: '2px solid #e5e7eb',
            fontSize: '0.95rem',
            fontFamily: 'inherit',
            background: '#fff',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            transition: 'border-color 0.2s',
          }}
        >
          <option value="">-- Selecciona un usuario --</option>
          {Array.isArray(usuarios) &&
            usuarios
              .filter((usuario) => !currentResponsables.includes(usuario.id))
              .map((usuario) => (
                <option key={usuario.id} value={usuario.id}>
                  {usuario.nombre} {usuario.apellido} (@{usuario.username})
                </option>
              ))}
        </select>
      </div>

      {/* Observacion textarea */}
      <div style={{ display: 'grid', gap: 8 }}>
        <label htmlFor={`observacion-${hallazgoId}`} style={{ fontWeight: 600, color: '#374151' }}>
           Observación (opcional):
        </label>
        <textarea
          id={`observacion-${hallazgoId}`}
          value={observacion}
          onChange={(e) => setObservacion(e.target.value)}
          disabled={isLoading}
          placeholder="Explica el motivo de tu solicitud..."
          rows={4}
          style={{
            padding: '0.75rem',
            borderRadius: 8,
            border: '2px solid #e5e7eb',
            fontFamily: 'inherit',
            fontSize: '0.95rem',
            resize: 'vertical',
            transition: 'border-color 0.2s',
          }}
        />
      </div>

      {/* Submit button */}
      <button
        type="submit"
        disabled={isLoading}
        style={{
          padding: '0.75rem 1.5rem',
          background: isLoading ? '#d97706' : '#f59e0b',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          fontWeight: 700,
          fontSize: '0.95rem',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          opacity: isLoading ? 0.7 : 1,
          transition: 'all 0.2s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        {isLoading ? ' Enviando...' : '✓ Enviar Solicitud'}
      </button>
    </form>
  );
}

SolicitudCambioForm.propTypes = {
  hallazgoId: PropTypes.number.isRequired,
  usuarios: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      nombre: PropTypes.string.isRequired,
      apellido: PropTypes.string.isRequired,
      username: PropTypes.string.isRequired,
    })
  ),
  currentResponsables: PropTypes.arrayOf(PropTypes.number),
  onSubmit: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
};
