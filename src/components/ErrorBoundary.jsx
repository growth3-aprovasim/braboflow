import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary capturou erro:', error, errorInfo);
  }

  handleReset = () => {
    try {
      // If localStorage is corrupted, clean heavy keys
      const saved = localStorage.getItem('brabo_airtable_campaigns');
      if (saved && saved.length > 2000000) {
        localStorage.removeItem('brabo_airtable_campaigns');
      }
    } catch {
      // ignore
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0f1117',
          color: '#f1f5f9',
          padding: '2rem',
          fontFamily: 'sans-serif'
        }}>
          <div style={{
            background: '#161b26',
            border: '1px solid #3b465c',
            borderRadius: '12px',
            padding: '2rem',
            maxWidth: '520px',
            textAlign: 'center',
            boxShadow: '0 8px 30px rgba(0,0,0,0.5)'
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⚠️</div>
            <h2 style={{ fontSize: '1.25rem', color: '#f59e0b', marginBottom: '0.75rem' }}>
              Ocorreu um imprevisto na exibição
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: '1.6', marginBottom: '1.5rem' }}>
              Uma ação recente causou uma falha temporária no navegador. Clique no botão abaixo para restaurar a página com segurança.
            </p>
            {this.state.error && (
              <div style={{
                background: '#0a0d14',
                border: '1px solid #27354a',
                borderRadius: '8px',
                padding: '0.75rem',
                fontSize: '0.75rem',
                color: '#f87171',
                textAlign: 'left',
                overflowX: 'auto',
                maxHeight: '100px',
                marginBottom: '1.25rem',
                fontFamily: 'monospace'
              }}>
                {this.state.error.toString()}
              </div>
            )}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                onClick={this.handleReset}
                style={{
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: '#000',
                  fontWeight: 700,
                  border: 'none',
                  padding: '0.65rem 1.25rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.88rem'
                }}
              >
                Recarregar e Restaurar Sistema
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
