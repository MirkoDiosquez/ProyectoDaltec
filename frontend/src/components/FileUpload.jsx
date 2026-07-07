/**
 * FileUpload component - Upload file via click or drag-drop (T072)
 */
import { useState } from 'react';
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
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedName, setSelectedName] = useState(null);

  const handleFileSelect = async (file) => {
    if (!file) return;

    // Validate size client-side
    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      onError?.(`File too large (${(file.size / 1024 / 1024).toFixed(1)}MB > ${maxSizeMB}MB)`);
      return;
    }

    // Deferred mode: hand the raw file back to the caller
    if (deferred) {
      setSelectedName(file.name);
      onFileSelect?.(file);
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
      onError?.(error.response?.data?.ruta?.[0] || 'Upload failed');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div style={{ border: '2px dashed #ccc', padding: '2rem', borderRadius: '0.5rem', textAlign: 'center' }}>
      <input
        type="file"
        id="fileInput"
        accept={ACCEPTED_TYPES}
        onChange={(e) => handleFileSelect(e.target.files?.[0])}
        disabled={uploading}
        style={{ display: 'none' }}
      />
      <label htmlFor="fileInput" style={{ cursor: uploading ? 'wait' : 'pointer' }}>
        <p style={{ margin: '0 0 1rem 0', fontWeight: 500 }}>
          {uploading ? `Uploading... ${progress}%` : selectedName ? `✔ ${selectedName}` : 'Click to upload or drag file here'}
        </p>
        {!uploading && <p style={{ margin: 0, fontSize: '0.875rem', color: '#666' }}>Imágenes, documentos, comprimidos, audio y video hasta {maxSizeMB}MB</p>}
      </label>
      {uploading && <div style={{ width: '100%', height: '4px', backgroundColor: '#e0e0e0', marginTop: '1rem', borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{ height: '100%', backgroundColor: '#2196F3', width: `${progress}%`, transition: 'width 0.3s' }} />
      </div>}
      <input
        type="file"
        multiple={false}
        onDrop={(e) => { e.preventDefault(); handleFileSelect(e.dataTransfer.files?.[0]); }}
        onDragOver={(e) => e.preventDefault()}
        style={{ display: 'none' }}
      />
    </div>
  );
}
