import React, { useState } from 'react';
import { 
  CheckCheck, 
  Send, 
  Copy, 
  ExternalLink, 
  Smartphone, 
  Sparkles, 
  MessageSquare, 
  Check, 
  Link as LinkIcon, 
  CheckCircle,
  Mail
} from 'lucide-react';
import { BRABO_CHANNELS, resolveCopyVariables } from '../data/initialData';
import ChannelPreview, { formatFormattedText, YouTubeIcon } from './ChannelPreview';

// Re-export for backward compatibility
export const formatWhatsAppText = formatFormattedText;

export default function WhatsAppSimulatorView({ records, campaign, onOpenRecord }) {
  const [selectedRecordId, setSelectedRecordId] = useState(records[0]?.id || null);
  const [copiedFull, setCopiedFull] = useState(false);

  const currentRecord = records.find(r => r.id === selectedRecordId) || records[0];
  const predefinedLinks = campaign?.predefinedLinks || [];

  // Resolve final text with {{1}}, {{2}} and predefined links
  const getFullText = () => {
    if (!currentRecord) return '';
    return resolveCopyVariables(currentRecord.copyText, currentRecord.variables, predefinedLinks);
  };

  const handleCopyFullText = () => {
    const fullText = getFullText();
    navigator.clipboard.writeText(fullText);
    setCopiedFull(true);
    setTimeout(() => setCopiedFull(false), 2500);
  };

  const handleTestSend = () => {
    const fullText = getFullText();
    const textEncoded = encodeURIComponent(fullText);

    if (currentRecord.channel === 'Email') {
      const subjectEncoded = encodeURIComponent(currentRecord.title || 'Comunicado Brabo Concursos');
      window.open(`mailto:?subject=${subjectEncoded}&body=${textEncoded}`, '_blank');
    } else {
      window.open(`https://api.whatsapp.com/send?text=${textEncoded}`, '_blank');
    }
  };

  if (!currentRecord) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
        Nenhum disparo encontrado nesta campanha para simular.
      </div>
    );
  }

  const channelObj = BRABO_CHANNELS.find(ch => ch.value === currentRecord.channel) || BRABO_CHANNELS[0];

  return (
    <div className="simulator-layout">
      {/* Left Column: Messages List & Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Campanha: {campaign?.name}
          </span>
          <h2 style={{ 
            fontFamily: 'var(--font-display)', 
            fontSize: '1.35rem', 
            fontWeight: 700, 
            color: 'var(--text-main)', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem',
            marginTop: '0.15rem'
          }}>
            {currentRecord.channel === 'Email' ? (
              <Mail size={22} color="#a78bfa" />
            ) : currentRecord.channel === 'Comunidade YouTube' ? (
              <YouTubeIcon size={22} color="#ef4444" />
            ) : (
              <Smartphone size={22} color="#22c55e" />
            )}
            Simulador em Tempo Real
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            Visualização precisa de como a mensagem chegará aos alunos com variáveis e links preenchidos.
          </p>
        </div>

        {/* Message Selector List */}
        <div style={{ 
          background: 'var(--bg-sidebar)', 
          border: '1px solid var(--border-color)', 
          borderRadius: '8px', 
          padding: '0.65rem', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '0.4rem', 
          maxHeight: '300px', 
          overflowY: 'auto' 
        }}>
          {records.map(rec => {
            const isSelected = rec.id === currentRecord.id;
            const recChannel = BRABO_CHANNELS.find(ch => ch.value === rec.channel) || BRABO_CHANNELS[0];

            return (
              <div
                key={rec.id}
                onClick={() => setSelectedRecordId(rec.id)}
                style={{
                  padding: '0.6rem 0.75rem',
                  borderRadius: '6px',
                  background: isSelected ? 'var(--accent-soft)' : 'var(--bg-card)',
                  border: isSelected ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'var(--transition-fast)'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', overflow: 'hidden' }}>
                  <span style={{ 
                    fontSize: '0.82rem', 
                    fontWeight: isSelected ? 600 : 500, 
                    color: isSelected ? 'var(--text-main)' : 'var(--text-secondary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {rec.title}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.7rem' }}>
                    <span style={{ color: recChannel.color, fontWeight: 500 }}>{recChannel.badgeText || recChannel.label}</span>
                    <span style={{ color: 'var(--text-muted)' }}>• {rec.scheduledDate} às {rec.scheduledTime}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  {rec.stage && (
                    <span style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)' }}>
                      {rec.stage}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Copy / Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <button
            className="btn-primary"
            onClick={handleCopyFullText}
            style={{
              padding: '0.75rem 1rem',
              fontSize: '0.88rem',
              fontWeight: 600,
              justifyContent: 'center',
              background: copiedFull ? '#10b981' : 'var(--accent-primary)',
              transition: 'var(--transition-fast)'
            }}
            id="btn-copy-full-text"
          >
            {copiedFull ? <CheckCircle size={18} /> : <Copy size={18} />}
            <span>
              {copiedFull 
                ? 'Copiado com Sucesso!' 
                : 'Copiar Copy com Links Preenchidos'}
            </span>
          </button>

          <button 
            className="btn-secondary"
            onClick={handleTestSend}
            style={{
              justifyContent: 'center',
              padding: '0.55rem',
              fontWeight: 500,
              fontSize: '0.82rem'
            }}
          >
            <Send size={14} />
            <span>
              {currentRecord.channel === 'Email' ? 'Testar no Cliente de Email' : 'Abrir WhatsApp Web com Mensagem'}
            </span>
          </button>
        </div>
      </div>

      {/* Right Column: Multi-Channel Adaptive Preview */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <ChannelPreview record={currentRecord} campaign={campaign} />
      </div>
    </div>
  );
}
