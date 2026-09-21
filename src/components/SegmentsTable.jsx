import React from 'react';
import { Users, Plus, Send, Radio, Target, Sparkles } from 'lucide-react';
import { CONTEST_OPTIONS } from '../data/initialData';

export default function SegmentsTable({ segments, onBroadcastToSegment, onAddNewSegment }) {
  const totalLeadsOverall = segments.reduce((sum, s) => sum + s.totalLeads, 0);

  return (
    <div style={{ padding: '1.75rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={22} color="#f59e0b" />
            Públicos & Segmentos de Concurseiros
          </h2>
          <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '0.25rem' }}>
            Base total ativa: <strong style={{ color: '#fbbf24' }}>{totalLeadsOverall.toLocaleString('pt-BR')}</strong> leads e alunos qualificados.
          </p>
        </div>

        <button className="btn-primary" onClick={onAddNewSegment}>
          <Plus size={16} />
          <span>Novo Segmento</span>
        </button>
      </div>

      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 1.2fr 1.5fr 1.2fr 1.2fr 1.5fr',
          padding: '0.75rem 1rem',
          background: '#121824',
          borderBottom: '1px solid var(--border-color)',
          fontSize: '0.75rem',
          fontWeight: 700,
          color: '#94a3b8',
          textTransform: 'uppercase',
          letterSpacing: '0.04em'
        }}>
          <div>Nome do Segmento</div>
          <div>Carreira</div>
          <div>Total de Contatos</div>
          <div>Origem do Lead</div>
          <div>Engajamento</div>
          <div>Último Disparo</div>
          <div style={{ textAlign: 'center' }}>Ações</div>
        </div>

        {segments.map((seg, idx) => {
          const contestObj = CONTEST_OPTIONS.find(c => c.value === seg.contest);
          return (
            <div
              key={seg.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 1.2fr 1.5fr 1.2fr 1.2fr 1.5fr',
                padding: '0.85rem 1rem',
                borderBottom: '1px solid var(--border-subtle)',
                fontSize: '0.82rem',
                alignItems: 'center',
                background: idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.015)'
              }}
            >
              <div style={{ fontWeight: 600, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Target size={14} color="#f59e0b" />
                {seg.name}
              </div>

              <div>
                <span className={`contest-tag ${contestObj?.tagClass || ''}`}>
                  {seg.contest}
                </span>
              </div>

              <div style={{ fontWeight: 700, color: '#cbd5e1', fontVariantNumeric: 'tabular-nums' }}>
                {seg.totalLeads.toLocaleString('pt-BR')}
              </div>

              <div style={{ color: '#94a3b8', fontSize: '0.78rem' }}>
                {seg.leadSource}
              </div>

              <div>
                <span style={{
                  fontSize: '0.74rem',
                  color: '#4ade80',
                  background: 'rgba(34, 197, 94, 0.12)',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '4px',
                  fontWeight: 600
                }}>
                  {seg.engagementLevel}
                </span>
              </div>

              <div style={{ color: '#94a3b8', fontSize: '0.78rem' }}>
                {seg.lastBroadcastDate}
              </div>

              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <button
                  className="btn-primary"
                  style={{ fontSize: '0.74rem', padding: '0.3rem 0.7rem' }}
                  onClick={() => onBroadcastToSegment(seg)}
                >
                  <Send size={12} />
                  <span>Programadar Disparo</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
