/**
 * FilePreview component - Display preview based on MIME type (T073)
 */
import { useState } from 'react';
import PDFViewer from './PDFViewer';
import ImageViewer from './ImageViewer';

export default function FilePreview({ archivo }) {
  if (!archivo) return null;

  const previewType = (() => {
    if (archivo.tipo_mime.startsWith('image/')) return 'image';
    if (archivo.tipo_mime === 'application/pdf') return 'pdf';
    return 'download';
  })();

  return (
    <div style={{ marginTop: '1rem', padding: '1rem', border: '1px solid #e0e0e0', borderRadius: '0.5rem' }}>
      <p style={{ margin: '0 0 0.5rem 0', fontWeight: 600 }}>{archivo.nombre}</p>
      <p style={{ margin: '0 0 1rem 0', fontSize: '0.875rem', color: '#666' }}>
        {(archivo.tamanio / 1024 / 1024).toFixed(2)} MB • {archivo.tipo_mime}
      </p>

      {previewType === 'image' && <ImageViewer src={archivo.preview_url} alt={archivo.nombre} />}
      {previewType === 'pdf' && <PDFViewer url={archivo.preview_url} />}
      {previewType === 'download' && (
        <a href={archivo.download_url} download={archivo.nombre} style={{ display: 'inline-block', marginTop: '1rem', padding: '0.5rem 1rem', backgroundColor: '#2196F3', color: 'white', textDecoration: 'none', borderRadius: '0.25rem' }}>
          Download {archivo.nombre}
        </a>
      )}
    </div>
  );
}
