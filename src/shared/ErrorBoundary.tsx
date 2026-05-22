import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      const isChunkLoadFailed = this.state.error?.message?.includes('Failed to fetch') ||
                               this.state.error?.message?.includes('Load chunk') ||
                               this.state.error?.message?.includes('loading chunk') ||
                               this.state.error?.name === 'ChunkLoadError';

      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '40px',
          margin: '40px auto',
          maxWidth: '500px',
          background: 'rgba(239, 68, 68, 0.05)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: '12px',
          color: '#f3f4f6',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          textAlign: 'center'
        }}>
          <span style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</span>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#fca5a5', marginBottom: '8px' }}>
            {isChunkLoadFailed ? 'Error de conexión o actualización' : 'Algo salió mal'}
          </h2>
          <p style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '24px', lineHeight: '1.5' }}>
            {isChunkLoadFailed 
              ? 'Se ha detectado una nueva versión del sistema o un microcorte de red. Por favor, recarga la página.'
              : 'Ocurrió un error inesperado al renderizar esta sección.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px',
              background: '#6366f1',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)',
              transition: 'background 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#4f46e5'}
            onMouseLeave={e => e.currentTarget.style.background = '#6366f1'}
          >
            Recargar Aplicación
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
