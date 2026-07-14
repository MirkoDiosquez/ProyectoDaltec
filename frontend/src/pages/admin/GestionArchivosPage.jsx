/**
 * GestionArchivosPage.jsx — Admin file management dashboard
 *
 * Allows admins to:
 * - View all uploaded files
 * - Download files
 * - Delete individual files
 * - Bulk delete files
 * - Filter by parent type (hallazgo, mensaje, etc)
 */
import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { getAdminFilesList, deleteArchivoAdmin, bulkDeleteArchivosAdmin, downloadArchivo } from '../../api/archivos.js';

export default function GestionArchivosPage() {
  const { user } = useAuth();
  const [archivos, setArchivos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [filterParent, setFilterParent] = useState('all');

  // Cargar lista de archivos
  useEffect(() => {
    const loadArchivos = async () => {
      try {
        const data = await getAdminFilesList();
        setArchivos(data.files || []);
      } catch (error) {
        console.error('Error loading files:', error);
        alert('Error al cargar archivos: ' + error.message);
      } finally {
        setLoading(false);
      }
    };
    loadArchivos();
  }, []);

  // Filtrar archivos según parent type
  const filteredArchivos = archivos.filter(archivo => {
    if (filterParent === 'all') return true;
    if (filterParent === 'hallazgos') return archivo.hallazgo !== null;
    if (filterParent === 'mensajes') return archivo.mensaje !== null;
    if (filterParent === 'porques') return archivo.porque !== null;
    return true;
  });

  const handleSelectFile = (id) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredArchivos.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredArchivos.map(a => a.id)));
    }
  };

  const handleDeleteOne = async (id) => {
    if (!window.confirm('¿Eliminar este archivo?')) return;
    
    try {
      await deleteArchivoAdmin(id);
      setArchivos(archivos.filter(a => a.id !== id));
      alert('Archivo eliminado correctamente');
    } catch (error) {
      console.error('Error deleting file:', error);
      alert('Error al eliminar archivo: ' + error.message);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) {
      alert('Selecciona al menos un archivo');
      return;
    }

    if (!window.confirm(`¿Eliminar ${selectedIds.size} archivo(s)?`)) return;

    try {
      await bulkDeleteArchivosAdmin(Array.from(selectedIds));
      setArchivos(archivos.filter(a => !selectedIds.has(a.id)));
      setSelectedIds(new Set());
      alert('Archivos eliminados correctamente');
    } catch (error) {
      console.error('Error bulk deleting files:', error);
      alert('Error al eliminar archivos: ' + error.message);
    }
  };

  const handleDownload = (id, nombre) => {
    downloadArchivo(id, nombre);
  };

  if (!user?.tipo === 'ADMIN') {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: '#dc2626' }}>Acceso Denegado</h2>
        <p>Solo administradores pueden acceder a esta sección.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '2rem', color: '#0f172a' }}>Gestión de Archivos</h1>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>Cargando archivos...</div>
      ) : (
        <>
          {/* Filtros y Acciones */}
          <div style={{
            display: 'flex',
            gap: '1rem',
            marginBottom: '1.5rem',
            flexWrap: 'wrap',
            alignItems: 'center',
          }}>
            <select
              value={filterParent}
              onChange={(e) => setFilterParent(e.target.value)}
              style={{
                padding: '0.5rem 0.75rem',
                borderRadius: '0.375rem',
                border: '1px solid #cbd5e1',
                fontSize: '0.9rem',
              }}
            >
              <option value="all">Todos los archivos</option>
              <option value="hallazgos">Hallazgos</option>
              <option value="mensajes">Chat/Mensajes</option>
              <option value="porques">5-Why Analysis</option>
            </select>

            <button
              onClick={() => handleDeleteOne(archivos.length > 0 ? archivos[0].id : null)}
              disabled={archivos.length === 0}
              title="Probar eliminación de archivo"
              style={{
                padding: '0.5rem 1rem',
                background: '#f59e0b',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: archivos.length === 0 ? 'not-allowed' : 'pointer',
                fontSize: '0.9rem',
                fontWeight: 600,
                opacity: archivos.length === 0 ? 0.5 : 1,
              }}
            >
              🧪 Probar Eliminación
            </button>

            {selectedIds.size > 0 && (
              <button
                onClick={handleBulkDelete}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                }}
              >
                Eliminar ({selectedIds.size})
              </button>
            )}

            <span style={{ color: '#64748b', fontSize: '0.9rem', marginLeft: 'auto' }}>
              Total: {filteredArchivos.length} archivo(s)
            </span>
          </div>

          {/* Tabla de Archivos */}
          <div style={{
            border: '1px solid #e2e8f0',
            borderRadius: '0.5rem',
            overflow: 'hidden',
          }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.9rem',
            }}>
              <thead>
                <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{
                    padding: '1rem',
                    textAlign: 'left',
                    fontWeight: 600,
                    color: '#0f172a',
                    width: '40px',
                  }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.size === filteredArchivos.length && filteredArchivos.length > 0}
                      onChange={handleSelectAll}
                      style={{ cursor: 'pointer' }}
                    />
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, color: '#0f172a' }}>
                    Archivo
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, color: '#0f172a' }}>
                    Tipo
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, color: '#0f172a' }}>
                    Tamaño
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, color: '#0f172a' }}>
                    Cargado por
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, color: '#0f172a' }}>
                    Sección
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, color: '#0f172a' }}>
                    Fecha
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 600, color: '#0f172a' }}>
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredArchivos.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{
                      padding: '2rem',
                      textAlign: 'center',
                      color: '#64748b',
                    }}>
                      No hay archivos para mostrar
                    </td>
                  </tr>
                ) : (
                  filteredArchivos.map((archivo) => {
                    const fecha = new Date(archivo.fecha_carga).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    });
                    
                    const tamanio = (archivo.tamanio / 1024).toFixed(2); // KB
                    
                    const seccion = archivo.hallazgo
                      ? `Hallazgo #${archivo.hallazgo}`
                      : archivo.mensaje
                      ? 'Chat'
                      : archivo.porque
                      ? '5-Why'
                      : 'Desconocida';

                    return (
                      <tr
                        key={archivo.id}
                        style={{
                          borderBottom: '1px solid #e2e8f0',
                          background: selectedIds.has(archivo.id) ? '#eff6ff' : 'white',
                        }}
                      >
                        <td style={{ padding: '1rem' }}>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(archivo.id)}
                            onChange={() => handleSelectFile(archivo.id)}
                            style={{ cursor: 'pointer' }}
                          />
                        </td>
                        <td style={{ padding: '1rem', fontWeight: 500, color: '#0f172a' }}>
                          {archivo.nombre}
                        </td>
                        <td style={{ padding: '1rem', color: '#64748b' }}>
                          {archivo.tipo_mime}
                        </td>
                        <td style={{ padding: '1rem', color: '#64748b' }}>
                          {tamanio} KB
                        </td>
                        <td style={{ padding: '1rem', color: '#64748b' }}>
                          {archivo.cargado_por?.nombre || 'Desconocido'}
                        </td>
                        <td style={{ padding: '1rem', color: '#64748b' }}>
                          {seccion}
                        </td>
                        <td style={{ padding: '1rem', color: '#64748b' }}>
                          {fecha}
                        </td>
                        <td style={{
                          padding: '1rem',
                          textAlign: 'center',
                          display: 'flex',
                          gap: '0.5rem',
                          justifyContent: 'center',
                        }}>
                          <button
                            onClick={() => handleDownload(archivo.id, archivo.nombre)}
                            title="Descargar"
                            style={{
                              padding: '0.25rem 0.5rem',
                              background: '#3b82f6',
                              color: 'white',
                              border: 'none',
                              borderRadius: '0.25rem',
                              cursor: 'pointer',
                              fontSize: '0.8rem',
                            }}
                          >
                            ⬇
                          </button>
                          <button
                            onClick={() => handleDeleteOne(archivo.id)}
                            title="Eliminar"
                            style={{
                              padding: '0.25rem 0.5rem',
                              background: '#dc2626',
                              color: 'white',
                              border: 'none',
                              borderRadius: '0.25rem',
                              cursor: 'pointer',
                              fontSize: '0.8rem',
                            }}
                          >
                            🗑
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
