/**
 * ErrorBoundary.jsx — React Error Boundary component (T137)
 * 
 * Catches React component errors and displays user-friendly error UI.
 * Logs errors to console for debugging.
 */
import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error);
    console.error('Error info:', errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: '2rem',
            margin: '1rem',
            border: '1px solid #f87171',
            borderRadius: 8,
            background: '#fee2e2',
            color: '#991b1b',
          }}
        >
          <h2 style={{ margin: '0 0 1rem 0' }}>❌ Algo salió mal</h2>
          <p style={{ margin: '0 0 1rem 0' }}>
            Hemos encontrado un error inesperado. Por favor, recarga la página o contacta a soporte.
          </p>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details style={{ marginTop: '1rem', fontSize: '0.85rem' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 600 }}>
                Detalles del Error (Desarrollo)
              </summary>
              <pre
                style={{
                  background: '#fff',
                  padding: '0.75rem',
                  borderRadius: 4,
                  overflow: 'auto',
                  marginTop: '0.5rem',
                  fontSize: '0.75rem',
                }}
              >
                {this.state.error.toString()}
                {'\n\n'}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '1rem',
              padding: '0.5rem 1rem',
            }}
          >
            Recargar Página
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
