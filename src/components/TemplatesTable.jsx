import React, { useState } from 'react';
import { FileText, Plus, Send, Copy, Tag, Check, Sparkles, TrendingUp } from 'lucide-react';
import { CONTEST_OPTIONS } from '../data/initialData';

export default function TemplatesTable({
  templates,
  onUseTemplate,
  onAddNewTemplate
}) {
  const [copiedId, setCopiedId] = useState(null);

  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div style={{ padding: '1.75rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={22} color="#f59e0b" />
            Banco de Templates de Copy de Alta Conversão
          </h2>
          <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '0.25rem' }}>
            Modelos testados e validados nas operações da Brabo Concursos para disparo rápido com 1 clique.
          </p>
        </div>

        <button className="btn-primary" onClick={onAddNewTemplate}>
          <Plus size={16} />
          <span>Novo Template</span>
        </button>
      </div>

      {/* Grid of Templates */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.25rem' }}>
        {templates.map(tpl => {
          const contestObj = CONTEST_OPTIONS.find(c => c.value === tpl.targetContest);
          const isCopied = copiedId === tpl.id;

          return (
            <div 
              key={tpl.id}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem',
                transition: '0.2s ease',
                position: 'relative',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <span style={{ fontSize: '0.72rem', color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase' }}>
                    {tpl.category}
                  </span>
                  <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#fff' }}>
                    {tpl.title}
                  </h3>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(34, 197, 94, 0.15)', padding: '0.2rem 0.5rem', borderRadius: '6px', color: '#4ade80', fontSize: '0.75rem', fontWeight: 700 }}>
                  <TrendingUp size={12} />
                  {tpl.conversionRate}
                </div>
              </div>

              {/* Tags & Channel */}
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {contestObj && (
                  <span className={`contest-tag ${contestObj.tagClass}`}>
                    {contestObj.value}
                  </span>
                )}
                <span style={{ fontSize: '0.72rem', background: 'rgba(255, 255, 255, 0.06)', padding: '0.15rem 0.45rem', borderRadius: '4px', color: '#cbd5e1' }}>
                  {tpl.channel}
                </span>
                {tpl.tags?.map(tag => (
                  <span key={tag} style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                    #{tag}
                  </span>
                ))}
              </div>

              {/* Copy preview box */}
              <div style={{
                background: '#0a0e17',
                border: '1px solid #1c2433',
                borderRadius: '8px',
                padding: '0.85rem',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.78rem',
                color: '#cbd5e1',
                lineHeight: 1.45,
                maxHeight: '140px',
                overflowY: 'auto',
                whiteSpace: 'pre-wrap'
              }}>
                {tpl.copy}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto', paddingTop: '0.5rem' }}>
                <button
                  className="btn-secondary"
                  style={{ flex: 1, justifyContent: 'center', fontSize: '0.76rem' }}
                  onClick={() => handleCopy(tpl.id, tpl.copy)}
                >
                  {isCopied ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
                  <span>{isCopied ? 'Copiado!' : 'Copiar'}</span>
                </button>

                <button
                  className="btn-primary"
                  style={{ flex: 1.3, justifyContent: 'center', fontSize: '0.76rem' }}
                  onClick={() => onUseTemplate(tpl)}
                  title="Criar novo disparo agendado baseado nesta copy"
                >
                  <Send size={13} />
                  <span>Usar no Disparo</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
