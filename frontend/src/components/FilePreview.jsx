/**
 * FilePreview component - Display preview based on MIME type (T073)
 *
 * Fixed: uses authenticated API client to fetch file content instead of
 * direct browser navigation which cannot send the JWT Authorization header.
 */
import { useEffect, useRef, useState } from 'react';
import { getPreviewBlobUrl, downloadArchivo, deleteArchivoAdmin } from '../api/archivos.js';
import PDFViewer from './PDFViewer';
import ImageViewer from './ImageViewer';

export default function FilePreview({ archivo, isAdmin = false, onDeleted }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const blobUrlRef = useRef(null);

  const isImage = archivo?.tipo_mime?.startsWith('image/');
  const isPdf = archivo?.tipo_mime === 'application/pdf';
  const needsPreview = isImage || isPdf;

  // Fetch authenticated blob URL for images and PDFs
  useEffect(() => {
    if (!needsPreview || !archivo?.id) return;

    setLoadingPreview(true);
    setPreviewError('');
    let cancelled = false;

    getPreviewBlobUrl(archivo.id)
      .then((url) => {
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        // Revoke previous blob URL before setting new one
        if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = url;
        setBlobUrl(url);
      })
      .catch(() => setPreviewError('No se pudo cargar la vista previa.'))
      .finally(() => setLoadingPreview(false));

    return () => {
      cancelled = true;
    };
  }, [archivo?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, []);

  if (!archivo) return null;

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadArchivo(archivo.id, archivo.nombre);
    } catch {
      // Silent fail — browser may have blocked popup
    } finally {
      setDownloading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`¿Eliminar "${archivo.nombre}"?`)) return;
    
    setDeleting(true);
    try {
      await deleteArchivoAdmin(archivo.id);
      if (onDeleted) onDeleted(archivo.id);
    } catch (error) {
      alert('Error al eliminar archivo: ' + (error.message || 'Error desconocido'));
    } finally {
      setDeleting(false);
    }
  };

  const sizeMB = archivo.tamanio >= 1024 * 1024
    ? `${(archivo.tamanio / 1024 / 1024).toFixed(2)} MB`
    : `${(archivo.tamanio / 1024).toFixed(1)} KB`;

  return (
    <div style={{
      border: '1px solid #e2e8f0',
      borderRadius: 10,
      padding: '1rem',
      background: '#fff',
      display: 'grid',
      gap: '0.75rem',
    }}>
      {/* File header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div>
          <p style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem' }}>{archivo.nombre}</p>
          <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
            {sizeMB} · {archivo.tipo_mime}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={handleDownload}
            disabled={downloading}
            style={{ padding: '0.35rem 0.85rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
          >
            {downloading ? 'Descargando…' : '⬇ Descargar'}
          </button>
          {isAdmin && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              style={{ 
                padding: '0.35rem 0.85rem', 
                fontSize: '0.8rem', 
                whiteSpace: 'nowrap',
                background: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: deleting ? 'not-allowed' : 'pointer',
                opacity: deleting ? 0.7 : 1,
              }}
            >
              {deleting ? '⏳ Eliminando…' : '🗑️ Eliminar'}
            </button>
          )}
        </div>
      </div>

      {/* Preview area */}
      {loadingPreview && (
        <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Cargando vista previa…</p>
      )}
      {previewError && (
        <p style={{ margin: 0, fontSize: '0.85rem', color: '#dc2626' }}>{previewError}</p>
      )}
      {!loadingPreview && !previewError && blobUrl && isImage && (
        <ImageViewer src={blobUrl} alt={archivo.nombre} />
      )}
      {!loadingPreview && !previewError && blobUrl && isPdf && (
        <PDFViewer url={blobUrl} />
      )}
    </div>
  );
}
