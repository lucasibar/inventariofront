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

  private isChunkError(error: Error | null): boolean {
    if (!error) return false;
    const errorMsg = error.message || '';
    const errorName = error.name || '';
    return errorMsg.includes('Failed to fetch') ||
           errorMsg.includes('Load chunk') ||
           errorMsg.includes('loading chunk') ||
           errorMsg.includes('dynamically imported') ||
           errorMsg.includes('Unexpected token') ||
           errorName === 'ChunkLoadError';
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    if (this.isChunkError(error)) {
      const reloadKey = 'chunk-error-reload-timestamp';
      const now = Date.now();
      const lastReload = sessionStorage.getItem(reloadKey);

      // If we haven't reloaded in the last 15 seconds, reload automatically to get the fresh build
      if (!lastReload || now - parseInt(lastReload, 10) > 15000) {
        sessionStorage.setItem(reloadKey, now.toString());
        window.location.reload();
      }
    }
  }

  public render() {
    if (this.state.hasError) {
      const isChunkLoadFailed = this.isChunkError(this.state.error);

      if (isChunkLoadFailed) {
        const reloadKey = 'chunk-error-reload-timestamp';
        const now = Date.now();
        const lastReload = sessionStorage.getItem(reloadKey);

        // If we can reload automatically (haven't reloaded recently), show a clean spinner/updater message
        if (!lastReload || now - parseInt(lastReload, 10) > 15000) {
          return (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              height: '80vh',
              color: '#f3f4f6',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              textAlign: 'center'
            }}>
              <div style={{
                border: '3px solid rgba(99, 102, 241, 0.1)',
                borderTop: '3px solid #6366f1',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                animation: 'spin 1s linear infinite',
                marginBottom: '16px'
              }} />
              <style>{`
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
              `}</style>
              <div style={{ fontSize: '14px', color: '#9ca3af', letterSpacing: '0.5px' }}>
                Actualizando aplicación...
              </div>
            </div>
          );
        }
      }

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
