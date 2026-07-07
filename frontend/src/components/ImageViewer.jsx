/**
 * ImageViewer component - Display image with optional zoom (T076)
 */
import { useState } from 'react';

export default function ImageViewer({ src, alt }) {
  const [zoom, setZoom] = useState(1);

  return (
    <div style={{ textAlign: 'center' }}>
      <img
        src={src}
        alt={alt}
        style={{
          maxWidth: '100%',
          maxHeight: '500px',
          objectFit: 'contain',
          transform: `scale(${zoom})`,
          transition: 'transform 0.3s',
          cursor: 'zoom-in',
        }}
        onClick={() => setZoom(zoom === 1 ? 1.5 : 1)}
      />
      <p style={{ fontSize: '0.875rem', color: '#666', marginTop: '0.5rem' }}>Click to zoom</p>
    </div>
  );
}
