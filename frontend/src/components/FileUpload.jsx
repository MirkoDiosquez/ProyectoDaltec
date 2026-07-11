/**
 * FileUpload component - Upload file via click or drag-drop (T072)
 *
 * Fixed: drag-and-drop events are now on the visible container div, not a hidden input.
 */
import { useId, useState } from 'react';
import client from '../api/client';

const ACCEPTED_TYPES = [
  ".jpg", ".jpeg", ".png", ".gif", ".webp", ".pdf", ".doc", ".docx", ".xls", ".xlsx",
  ".ppt", ".pptx", ".txt", ".csv", ".json", ".xml", ".rtf", ".zip", ".rar", ".7z",
  ".mp4", ".mpeg", ".mov", ".mp3", ".wav"
].join(",");

/**
 * Props:
 *   deferred  — when true, calls onFileSelect(rawFile) instead of uploading.
 *               The caller is responsible for uploading the file later.
 *   onFileSelect(file) — called in deferred mode with the raw File object.
 *   onFileUpload(data) — called in immediate mode with the server response.
 *   onError(msg)       — called on validation or upload errors.
 *   maxSizeMB          — client-side size limit (default 1 GB).
 */
export default function FileUpload({ onFileUpload, onFileSelect, onError, maxSizeMB = 1024, deferred = false }) {
  const inputId = useId();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedName, setSelectedName] = useState(null);
  const [dragging, setDragging] = useState(false);

  const handleFileSelect = async (file) => {
    if (!file) return;

    // Validate size client-side
    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      onError?.(`Archivo demasiado grande (${(file.size / 1024 / 1024).toFixed(1)}MB > ${maxSizeMB}MB)`);
      return;
    }

    // Deferred mode: hand the raw file back to the caller and reset
    if (deferred) {
      setSelectedName(file.name);
      onFileSelect?.(file);
      // Reset after a short delay so user can see the file name briefly
      setTimeout(() => setSelectedName(null), 1000);
      return;
    }

    setUploading(true);
    setProgress(0);

    const formData = new FormData();
    formData.append('nombre', file.name);
    formData.append('ruta', file);

    try {
      const response = await client.post('/archivos/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          setProgress(Math.round((progressEvent.loaded / progressEvent.total) * 100));
        },
      });
      onFileUpload?.(response.data);
    } catch (error) {
      onError?.(error.response?.data?.ruta?.[0] || 'Error al subir archivo');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  // Drop handlers must be on the VISIBLE container div — hidden inputs don't receive drag events
  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (!uploading) handleFileSelect(e.dataTransfer.files?.[0]);
  };
  const handleDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const handleDragLeave = () => setDragging(false);

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      style={{
        border: `2px dashed ${dragging ? '#1e3a8a' : '#cbd5e1'}`,
        padding: '1.5rem 2rem',
        borderRadius: '10px',
        textAlign: 'center',
        background: dragging ? '#eef2ff' : '#fafafa',
        transition: 'border-color 0.2s, background 0.2s',
        cursor: uploading ? 'wait' : 'pointer',
      }}
    >
      <input
        type="file"
        id={inputId}
        accept={ACCEPTED_TYPES}
        onChange={(e) => handleFileSelect(e.target.files?.[0])}
        disabled={uploading}
        style={{ display: 'none' }}
      />
      <label htmlFor={inputId} style={{ cursor: uploading ? 'wait' : 'pointer', display: 'block' }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
          {uploading ? '⏳' : selectedName ? '✅' : '📎'}
        </div>
        <p style={{ margin: '0 0 0.4rem 0', fontWeight: 600, color: '#111' }}>
          {uploading
            ? `Subiendo... ${progress}%`
            : selectedName
            ? selectedName
            : 'Arrastrá un archivo o hacé clic para seleccionar'}
        </p>
        {!uploading && !selectedName && (
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
            Imágenes, PDF, documentos, ZIP, audio y video — hasta {maxSizeMB >= 1024 ? `${maxSizeMB / 1024}GB` : `${maxSizeMB}MB`}
          </p>
        )}
      </label>
      {uploading && (
        <div style={{ width: '100%', height: '4px', backgroundColor: '#e2e8f0', marginTop: '1rem', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{ height: '100%', backgroundColor: '#1e3a8a', width: `${progress}%`, transition: 'width 0.3s' }} />
        </div>
      )}
    </div>
  );
}
