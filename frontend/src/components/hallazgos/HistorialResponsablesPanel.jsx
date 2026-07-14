/**
 * HistorialResponsablesPanel.jsx — Display responsable assignment/removal history
 *
 * Shows a timeline of all responsable assignments and removals for a hallazgo,
 * including dates and current status.
 */
import { useEffect, useState } from 'react';
import { getHistorialResponsables } from '../../api/hallazgos.js';

export default function HistorialResponsablesPanel({ hallazgoId }) {
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadHistorial = async () => {
      try {
        setLoading(true);
        const data = await getHistorialResponsables(hallazgoId);
        setHistorial(data || []);
        setError(null);
      } catch (err) {
        console.error('Error loading responsable history:', err);
        setError(err.message || 'Error al cargar el historial');
        setHistorial([]);
      } finally {
        setLoading(false);
      }
    };

    if (hallazgoId) {
      loadHistorial();
    }
  }, [hallazgoId]);

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (estado) => {
    if (estado === 'ACTIVO') {
      return (
        <span style={{
          display: 'inline-block',
          padding: '0.25rem 0.75rem',
          background: '#dcfce7',
          color: '#166534',
          borderRadius: '0.25rem',
          fontSize: '0.8rem',
          fontWeight: 600,
        }}>
          ✓ ACTIVO
        </span>
      );
    }
    return (
      <span style={{
        display: 'inline-block',
        padding: '0.25rem 0.75rem',
        background: '#fee2e2',
        color: '#991b1b',
        borderRadius: '0.25rem',
        fontSize: '0.8rem',
        fontWeight: 600,
      }}>
        ✕ REMOVIDO
      </span>
    );
  };

  return (
    <div style={{
      marginTop: '2rem',
      padding: '1.5rem',
      background: '#f8fafc',
      border: '1px solid #e2e8f0',
      borderRadius: '0.5rem',
    }}>
      <h3 style={{ marginBottom: '1rem', color: '#0f172a', fontSize: '1rem', fontWeight: 600 }}>
        📋 Historial de Responsables
      </h3>

      {loading && (
        <div style={{ textAlign: 'center', padding: '1rem', color: '#64748b' }}>
          Cargando historial...
        </div>
      )}

      {error && (
        <div style={{
          padding: '1rem',
          background: '#fee2e2',
          color: '#991b1b',
          borderRadius: '0.375rem',
          fontSize: '0.9rem',
        }}>
          ⚠️ {error}
        </div>
      )}

      {!loading && !error && historial.length === 0 && (
        <div style={{
          padding: '1rem',
          color: '#64748b',
          textAlign: 'center',
          fontSize: '0.9rem',
        }}>
          Sin historial de responsables
        </div>
      )}

      {!loading && !error && historial.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '0.9rem',
          }}>
            <thead>
              <tr style={{ background: 'white', borderBottom: '2px solid #cbd5e1' }}>
                <th style={{
                  padding: '0.75rem',
                  textAlign: 'left',
                  fontWeight: 600,
                  color: '#0f172a',
                }}>
                  Responsable
                </th>
                <th style={{
                  padding: '0.75rem',
                  textAlign: 'left',
                  fontWeight: 600,
                  color: '#0f172a',
                }}>
                  Email
                </th>
                <th style={{
                  padding: '0.75rem',
                  textAlign: 'center',
                  fontWeight: 600,
                  color: '#0f172a',
                }}>
                  Estado
                </th>
                <th style={{
                  padding: '0.75rem',
                  textAlign: 'left',
                  fontWeight: 600,
                  color: '#0f172a',
                }}>
                  Asignado
                </th>
                <th style={{
                  padding: '0.75rem',
                  textAlign: 'left',
                  fontWeight: 600,
                  color: '#0f172a',
                }}>
                  Removido
                </th>
              </tr>
            </thead>
            <tbody>
              {historial.map((record, idx) => (
                <tr
                  key={record.id}
                  style={{
                    borderBottom: '1px solid #e2e8f0',
                    background: idx % 2 === 0 ? 'white' : '#f8fafc',
                    opacity: record.estado === 'REMOVIDO' ? 0.7 : 1,
                  }}
                >
                  <td style={{ padding: '0.75rem', fontWeight: 500, color: '#0f172a' }}>
                    {record.responsable_nombre}
                  </td>
                  <td style={{ padding: '0.75rem', color: '#64748b', fontSize: '0.85rem' }}>
                    {record.responsable_email}
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                    {getStatusBadge(record.estado)}
                  </td>
                  <td style={{ padding: '0.75rem', color: '#64748b', fontSize: '0.85rem' }}>
                    {formatDate(record.fecha_asignacion)}
                  </td>
                  <td style={{ padding: '0.75rem', color: '#64748b', fontSize: '0.85rem' }}>
                    {record.fecha_remocion ? formatDate(record.fecha_remocion) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
