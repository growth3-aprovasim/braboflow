import React from 'react';
import { Zap, Plus, Play, Pause, ArrowRight, ShieldCheck } from 'lucide-react';

export default function AutomationsTable({ automations, onToggleStatus, onAddNewAutomation }) {
  return (
    <div style={{ padding: '1.75rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Zap size={22} color="#f59e0b" />
            Fluxos Automatizados & Gatilhos de Disparo
          </h2>
          <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '0.25rem' }}>
            Regras de disparo instantâneo acionadas por eventos (inscrição no simulado, carrinho abandonado, publicação de edital).
          </p>
        </div>

        <button className="btn-primary" onClick={onAddNewAutomation}>
          <Plus size={16} />
          <span>Nova Automação</span>
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {automations.map(aut => {
          const isActive = aut.status === 'Ativa';
          return (
            <div
              key={aut.id}
              style={{
                background: 'var(--bg-card)',
                border: `1px solid ${isActive ? '#232b3a' : '#331f24'}`,
                borderRadius: '12px',
                padding: '1.25rem 1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1.5rem',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  background: isActive ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                  border: `1.5px solid ${isActive ? '#f59e0b' : '#334155'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isActive ? '#f59e0b' : '#64748b'
                }}>
                  <Zap size={20} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.96rem', fontWeight: 700, color: '#ffffff' }}>
                      {aut.name}
                    </span>
                    <span style={{
                      fontSize: '0.72rem',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '9999px',
                      fontWeight: 600,
                      background: isActive ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      color: isActive ? '#86efac' : '#fca5a5'
                    }}>
                      {aut.status}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.78rem', color: '#94a3b8' }}>
                    <span><strong>Gatilho:</strong> {aut.triggerEvent}</span>
                    <span>•</span>
                    <span><strong>Tempo de Espera:</strong> {aut.delay}</span>
                    <span>•</span>
                    <span><strong>Template:</strong> {aut.targetTemplate}</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button
                  className="btn-secondary"
                  onClick={() => onToggleStatus(aut.id)}
                  style={{ fontSize: '0.78rem' }}
                >
                  {isActive ? <Pause size={13} color="#f59e0b" /> : <Play size={13} color="#10b981" />}
                  <span>{isActive ? 'Pausar Fluxo' : 'Ativar Fluxo'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
