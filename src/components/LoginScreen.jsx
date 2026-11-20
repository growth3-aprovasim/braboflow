import React, { useState } from 'react';
import { Lock, User, Eye, EyeOff, Sun, Moon, LogIn, ShieldCheck } from 'lucide-react';
import logoImg from '../assets/logo.png';
import logoBlackImg from '../assets/logo-preta.png';
import { authenticateUser } from '../services/authService';

export default function LoginScreen({ onLogin, theme, onToggleTheme }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    setTimeout(() => {
      const result = authenticateUser(identifier, password);
      setIsSubmitting(false);

      if (result.success) {
        onLogin(result.user);
      } else {
        setError(result.error || 'Usuário ou senha inválidos.');
      }
    }, 180);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100vw',
        backgroundColor: 'var(--bg-app)',
        color: 'var(--text-primary)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Subtle Ambient Gold Glow */}
      <div
        style={{
          position: 'absolute',
          top: '-18%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '620px',
          height: '360px',
          background: 'radial-gradient(ellipse at center, rgba(247, 186, 18, 0.14) 0%, transparent 70%)',
          pointerEvents: 'none',
          zIndex: 0
        }}
      />

      {/* Theme Toggle Button (Top Right) */}
      <button
        type="button"
        onClick={onToggleTheme}
        className="btn-secondary"
        style={{
          position: 'absolute',
          top: '1.25rem',
          right: '1.25rem',
          zIndex: 10,
          padding: '0.45rem 0.75rem',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '0.45rem'
        }}
        title={theme === 'dark' ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
      >
        {theme === 'dark' ? <Sun size={15} color="#F7BA12" /> : <Moon size={15} color="#0F172A" />}
        <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>
          {theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
        </span>
      </button>

      {/* Login Card */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: '410px',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          padding: '2.25rem 2rem',
          boxShadow: 'var(--shadow-lg)'
        }}
      >
        {/* Logo & Title */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.75rem', textAlign: 'center' }}>
          <img
            src={theme === 'light' ? logoBlackImg : logoImg}
            alt="BraboFlow"
            style={{
              height: '58px',
              maxWidth: '210px',
              objectFit: 'contain',
              marginBottom: '0.85rem'
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
            <ShieldCheck size={16} color="#F7BA12" />
            <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#F7BA12' }}>
              Acesso Restrito
            </span>
          </div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Entrar no BraboFlow
          </h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
            Informe suas credenciais para acessar a central de disparos.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="login-identifier">
              <User size={13} />
              <span>E-mail</span>
            </label>
            <input
              id="login-identifier"
              type="email"
              className="form-control"
              placeholder="Digite seu e-mail..."
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value);
                if (error) setError('');
              }}
              autoFocus
              required
              style={{ padding: '0.58rem 0.8rem', fontSize: '0.88rem' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="login-password">
              <Lock size={13} />
              <span>Senha</span>
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                className="form-control"
                placeholder="Digite sua senha..."
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError('');
                }}
                required
                style={{ padding: '0.58rem 2.4rem 0.58rem 0.8rem', fontSize: '0.88rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '0.6rem',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0.2rem'
                }}
                title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                color: '#ef4444',
                borderRadius: '8px',
                padding: '0.55rem 0.75rem',
                fontSize: '0.78rem',
                fontWeight: 600,
                textAlign: 'center'
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={isSubmitting}
            style={{
              width: '100%',
              justifyContent: 'center',
              padding: '0.68rem 1rem',
              fontSize: '0.9rem',
              marginTop: '0.25rem',
              opacity: isSubmitting ? 0.75 : 1
            }}
          >
            <LogIn size={16} strokeWidth={2.4} />
            <span>{isSubmitting ? 'Verificando...' : 'Acessar Painel'}</span>
          </button>
        </form>

        <div
          style={{
            marginTop: '1.5rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--border-subtle)',
            textAlign: 'center',
            fontSize: '0.72rem',
            color: 'var(--text-muted)'
          }}
        >
          Brabo Concursos • Controle de Acesso (Editor / Visualizador)
        </div>
      </div>
    </div>
  );
}
