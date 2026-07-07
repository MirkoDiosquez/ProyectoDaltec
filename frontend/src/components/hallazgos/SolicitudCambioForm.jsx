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
        border: '1px solid #e2e8f0',
        borderRadius: 12,
        padding: '1rem',
        background: '#fff',
        display: 'grid',
        gap: 12,
      }}
    >
      <h3 style={{ margin: 0 }}>Solicitud de Cambio de Responsable</h3>

      {error && (
        <div style={{ background: '#fee', padding: '0.5rem', color: '#c00', borderRadius: 4 }}>
          {error}
        </div>
      )}

      {/* Tipo selection */}
      <div style={{ display: 'flex', gap: 16 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="radio"
            value="agregar"
            checked={tipo === 'agregar'}
            onChange={(e) => setTipo(e.target.value)}
            disabled={isLoading}
          />
          Agregar responsable
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="radio"
            value="cambiar"
            checked={tipo === 'cambiar'}
            onChange={(e) => setTipo(e.target.value)}
            disabled={isLoading}
          />
          Reemplazarme
        </label>
      </div>

      {/* Usuario selection */}
      <div style={{ display: 'grid', gap: 6 }}>
        <label htmlFor={`usuario-select-${hallazgoId}`}>
          Usuario a {tipo === 'agregar' ? 'agregar' : 'reemplazarme'}:
        </label>
        <select
          id={`usuario-select-${hallazgoId}`}
          value={usuarioId}
          onChange={(e) => setUsuarioId(e.target.value)}
          disabled={isLoading}
          required
          style={{
            padding: '0.5rem',
            borderRadius: 4,
            border: '1px solid #ccc',
          }}
        >
          <option value="">-- Selecciona un usuario --</option>
          {Array.isArray(usuarios) &&
            usuarios.map((usuario) => (
              <option key={usuario.id} value={usuario.id}>
                {usuario.nombre} {usuario.apellido} ({usuario.username})
              </option>
            ))}
        </select>
      </div>

      {/* Observacion textarea */}
      <div style={{ display: 'grid', gap: 6 }}>
        <label htmlFor={`observacion-${hallazgoId}`}>
          Observación (opcional):
        </label>
        <textarea
          id={`observacion-${hallazgoId}`}
          value={observacion}
          onChange={(e) => setObservacion(e.target.value)}
          disabled={isLoading}
          placeholder="Por favor explica el motivo de tu solicitud..."
          rows={3}
          style={{
            padding: '0.5rem',
            borderRadius: 4,
            border: '1px solid #ccc',
            fontFamily: 'inherit',
          }}
        />
      </div>

      {/* Submit button */}
      <button
        type="submit"
        disabled={isLoading}
        style={{
          padding: '0.5rem 1rem',
          background: isLoading ? '#ccc' : '#0066cc',
          color: '#fff',
          border: 'none',
          borderRadius: 4,
          cursor: isLoading ? 'not-allowed' : 'pointer',
        }}
      >
        {isLoading ? 'Enviando...' : 'Enviar Solicitud'}
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
  onSubmit: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
};
