/**
 * PDFViewer component - Display PDF with page navigation (T075)
 * Uses pdfjs-dist for rendering
 */
import { useState, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// Set up worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export default function PDFViewer({ url }) {
  const [numPages, setNumPages] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pdfData, setPdfData] = useState(null);

  useEffect(() => {
    const loadPDF = async () => {
      try {
        const pdf = await pdfjsLib.getDocument(url).promise;
        setNumPages(pdf.numPages);
        setPdfData(pdf);
      } catch (error) {
        console.error('PDF load error:', error);
      }
    };
    loadPDF();
  }, [url]);

  const renderPage = async (pageNum) => {
    if (!pdfData) return;
    try {
      const page = await pdfData.getPage(pageNum);
      const canvas = document.getElementById('pdfCanvas');
      const context = canvas.getContext('2d');
      const viewport = page.getViewport({ scale: 1.5 });
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: context, viewport }).promise;
    } catch (error) {
      console.error('Render error:', error);
    }
  };

  useEffect(() => {
    renderPage(currentPage);
  }, [currentPage, pdfData]);

  return (
    <div style={{ textAlign: 'center' }}>
      <canvas id="pdfCanvas" style={{ maxWidth: '100%', border: '1px solid #ccc', marginBottom: '1rem' }} />
      {numPages && (
        <div style={{ marginTop: '1rem' }}>
          <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}>← Previous</button>
          <span style={{ margin: '0 1rem' }}>
            Page {currentPage} of {numPages}
          </span>
          <button onClick={() => setCurrentPage(Math.min(numPages, currentPage + 1))} disabled={currentPage === numPages}>Next →</button>
        </div>
      )}
    </div>
  );
}
