/**
 * ImageViewer component - Display image with optional zoom (T076)
 */
import { useState } from 'react';

export default function ImageViewer({ src, alt }) {
  const [zoom, setZoom] = useState(1);

  return (
    <div style={{ textAlign: 'center', overflow: 'hidden' }}>
      <div style={{ overflow: 'hidden', borderRadius: 6 }}>
        <img
          src={src}
          alt={alt}
          style={{
            maxWidth: '100%',
            maxHeight: '500px',
            objectFit: 'contain',
            transform: `scale(${zoom})`,
            transformOrigin: 'center top',
            transition: 'transform 0.3s',
            cursor: zoom === 1 ? 'zoom-in' : 'zoom-out',
            display: 'block',
            margin: '0 auto',
          }}
          onClick={() => setZoom(zoom === 1 ? 1.5 : 1)}
        />
      </div>
      <p style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.5rem' }}>Clic para zoom</p>
    </div>
  );
}
