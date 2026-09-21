import React from 'react';
import {
  CheckCheck,
  Send,
  ExternalLink,
  ShieldCheck,
  Mail,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Share2,
  CornerDownRight,
  Globe,
  Sparkles,
  User,
  Paperclip,
  FileText,
  Music,
  Play,
  Download,
  Video as VideoIcon,
  Smile,
  Mic,
  MoreVertical,
  Phone,
  ArrowLeft,
  Wifi,
  BatteryMedium,
  Camera
} from 'lucide-react';
import { BRABO_CHANNELS, resolveCopyVariables } from '../data/initialData';
import { triggerFileDownload } from '../services/attachmentStorage';

export const YouTubeIcon = ({ size = 16, color = '#ef4444' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}>
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

// Helper function to render attachments (image, video, audio, pdf) in mockups
export function renderAttachmentBadge(att, maxWidth = '100%') {
  if (!att) return null;

  const handleDownload = (e) => {
    e.stopPropagation();
    triggerFileDownload(att);
  };

  const imgSource = att.previewUrl || att.dataUrl;

  if (att.type === 'image') {
    return (
      <div style={{ maxWidth, margin: '0.4rem 0', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', background: '#111827' }}>
        {imgSource ? (
          <img src={imgSource} alt={att.name} style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', display: 'block' }} />
        ) : (
          <div style={{ height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', fontSize: '0.8rem' }}>
            🖼️ {att.name}
          </div>
        )}
        <div style={{ fontSize: '0.68rem', color: '#94a3b8', padding: '0.3rem 0.5rem', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>🖼️ {att.name} ({att.size})</span>
          <button
            type="button"
            onClick={handleDownload}
            style={{
              background: 'rgba(56, 189, 248, 0.2)',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              color: '#38bdf8',
              borderRadius: '4px',
              padding: '0.15rem 0.4rem',
              fontSize: '0.66rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.2rem',
              flexShrink: 0
            }}
            title="Baixar imagem"
          >
            <Download size={10} /> Baixar
          </button>
        </div>
      </div>
    );
  }

  if (att.type === 'video') {
    const thumb = att.thumbnailUrl || att.previewUrl;

    return (
      <div style={{
        maxWidth,
        margin: '0.45rem 0',
        borderRadius: '8px',
        overflow: 'hidden',
        border: '1px solid rgba(168, 85, 247, 0.35)',
        background: '#0f1117',
        boxShadow: '0 4px 14px rgba(0,0,0,0.4)'
      }}>
        {/* Video Cover Thumbnail Container */}
        <div style={{
          position: 'relative',
          width: '100%',
          height: '160px',
          background: '#000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden'
        }}>
          {thumb ? (
            <img
              src={thumb}
              alt={att.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #1e1b4b, #0f172a)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '2rem' }}>🎬</span>
            </div>
          )}

          {/* Semi-transparent dark overlay gradient */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.2) 60%, rgba(0,0,0,0.4) 100%)'
          }} />

          {/* Central Play Button */}
          <div style={{
            position: 'absolute',
            width: '46px',
            height: '46px',
            borderRadius: '50%',
            background: 'rgba(168, 85, 247, 0.9)',
            border: '2px solid rgba(255, 255, 255, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(168, 85, 247, 0.6)',
            cursor: 'pointer'
          }}>
            <Play size={20} fill="#ffffff" color="#ffffff" style={{ marginLeft: '3px' }} />
          </div>

          {/* Badge indicator on the video cover */}
          <div style={{
            position: 'absolute',
            bottom: '8px',
            left: '8px',
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            color: '#ffffff',
            fontSize: '0.68rem',
            fontWeight: 700,
            padding: '0.15rem 0.45rem',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem'
          }}>
            <span>▶ VÍDEO</span>
            {att.size && <span>• {att.size}</span>}
          </div>
        </div>

        {/* Video Footer bar with Name and Download button */}
        <div style={{
          padding: '0.45rem 0.65rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(0,0,0,0.5)',
          gap: '0.5rem'
        }}>
          <span style={{
            fontSize: '0.74rem',
            fontWeight: 700,
            color: '#ffffff',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }} title={att.name}>
            🎬 {att.name}
          </span>

          <button
            type="button"
            onClick={handleDownload}
            style={{
              background: 'rgba(168, 85, 247, 0.25)',
              border: '1px solid rgba(168, 85, 247, 0.5)',
              color: '#c084fc',
              padding: '0.2rem 0.55rem',
              borderRadius: '4px',
              fontSize: '0.68rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              flexShrink: 0
            }}
            title="Baixar vídeo anexo"
          >
            <Download size={11} /> Baixar
          </button>
        </div>
      </div>
    );
  }

  if (att.type === 'audio') {
    return (
      <div style={{
        maxWidth,
        margin: '0.4rem 0',
        borderRadius: '8px',
        background: '#0f291e',
        border: '1px solid #22c55e',
        padding: '0.5rem 0.75rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.6rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', overflow: 'hidden' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', flexShrink: 0 }}>
            <Music size={13} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#4ade80', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              🎵 Áudio ({att.name})
            </span>
            <span style={{ fontSize: '0.66rem', color: '#86efac' }}>Áudio de Envio • {att.size}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDownload}
          style={{
            background: 'rgba(34, 197, 94, 0.2)',
            border: '1px solid rgba(34, 197, 94, 0.5)',
            color: '#4ade80',
            padding: '0.25rem 0.5rem',
            borderRadius: '4px',
            fontSize: '0.7rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            flexShrink: 0
          }}
          title="Baixar áudio"
        >
          <Download size={11} /> Baixar
        </button>
      </div>
    );
  }

  // Document (PDF, etc.)
  return (
    <div style={{
      maxWidth,
      margin: '0.4rem 0',
      borderRadius: '8px',
      background: 'rgba(245, 158, 11, 0.12)',
      border: '1px solid rgba(245, 158, 11, 0.3)',
      padding: '0.5rem 0.75rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '0.6rem'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', overflow: 'hidden' }}>
        <FileText size={20} color="#fbbf24" style={{ flexShrink: 0 }} />
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#fbbf24', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            📄 {att.name}
          </span>
          <span style={{ fontSize: '0.66rem', color: '#cbd5e1' }}>Documento Anexo • {att.size}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleDownload}
        style={{
          background: 'rgba(245, 158, 11, 0.2)',
          border: '1px solid rgba(245, 158, 11, 0.4)',
          color: '#fbbf24',
          padding: '0.25rem 0.5rem',
          borderRadius: '4px',
          fontSize: '0.7rem',
          fontWeight: 700,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem',
          flexShrink: 0
        }}
        title="Baixar documento"
      >
        <Download size={11} /> Baixar
      </button>
    </div>
  );
}

// Helper function to format WhatsApp and social text (*bold*, _italic_, links, line breaks)
export function formatFormattedText(text, isYouTube = false) {
  if (!text) return '';

  let replaced = text;
  replaced = replaced.replaceAll('{primeiro_nome}', 'Guerreiro');
  replaced = replaced.replaceAll('{nome}', 'Guerreiro');
  replaced = replaced.replaceAll('{concurso}', 'Polícia Federal');

  const lines = replaced.split('\n');

  return lines.map((line, lIdx) => {
    // Look for URLs to highlight
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const lineParts = line.split(urlRegex);

    return (
      <React.Fragment key={lIdx}>
        {lineParts.map((part, pIdx) => {
          if (part.match(urlRegex)) {
            return (
              <a
                key={pIdx}
                href={part}
                target="_blank"
                rel="noreferrer"
                style={{
                  color: isYouTube ? '#3ea6ff' : '#60a5fa',
                  textDecoration: 'underline',
                  wordBreak: 'break-all',
                  fontWeight: 600
                }}
              >
                {part}
              </a>
            );
          }

          // Handle simple *bold* and _italic_
          const formattedSubparts = [];
          let cur = '';
          let isBold = false;
          let isItalic = false;

          for (let i = 0; i < part.length; i++) {
            if (part[i] === '*' && (i === 0 || part[i - 1] === ' ' || isBold)) {
              if (cur) formattedSubparts.push({ text: cur, bold: isBold, italic: isItalic });
              cur = '';
              isBold = !isBold;
            } else if (part[i] === '_' && (i === 0 || part[i - 1] === ' ' || isItalic)) {
              if (cur) formattedSubparts.push({ text: cur, bold: isBold, italic: isItalic });
              cur = '';
              isItalic = !isItalic;
            } else {
              cur += part[i];
            }
          }
          if (cur) formattedSubparts.push({ text: cur, bold: isBold, italic: isItalic });

          return (
            <span key={pIdx}>
              {formattedSubparts.map((sp, spIdx) => {
                if (sp.bold) return <strong key={spIdx} style={{ color: '#fff', fontWeight: 700 }}>{sp.text}</strong>;
                if (sp.italic) return <em key={spIdx} style={{ fontStyle: 'italic', color: '#cbd5e1' }}>{sp.text}</em>;
                return <span key={spIdx}>{sp.text}</span>;
              })}
            </span>
          );
        })}
        {lIdx < lines.length - 1 && <br />}
      </React.Fragment>
    );
  });
}

export default function ChannelPreview({ record, campaign, customWidth = '100%' }) {
  if (!record) return null;

  const predefinedLinks = campaign?.predefinedLinks || [];
  const channelObj = BRABO_CHANNELS.find(ch => ch.value === record.channel) || BRABO_CHANNELS[0];

  // Resolve copy text with variables {{1}}, {{2}}
  const resolvedText = resolveCopyVariables(record.copyText, record.variables, predefinedLinks);

  // Extract any links present in the copy or variables
  const foundUrls = (resolvedText.match(/https?:\/\/[^\s]+/g) || []);

  // 1. EMAIL PREVIEW (Simulação de Caixa de Entrada / Webmail em Tela de Computador)
  if (record.channel === 'Email') {
    return (
      <div style={{
        width: '100%',
        maxWidth: '460px',
        margin: '0 auto',
        borderRadius: '16px',
        background: '#0d131f',
        border: '1px solid #2a3547',
        boxShadow: '0 20px 40px rgba(0,0,0,0.6), 0 0 25px rgba(167, 139, 250, 0.15)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Computer Screen / Browser Window Header */}
        <div style={{
          background: '#141c2c',
          padding: '0.65rem 1rem',
          borderBottom: '1px solid #232d3f',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }} />
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b' }} />
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }} />
          </div>

          <div style={{
            background: 'rgba(0,0,0,0.3)',
            borderRadius: '6px',
            padding: '0.2rem 0.75rem',
            fontSize: '0.72rem',
            color: '#94a3b8',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem'
          }}>
            <Mail size={12} color="#a78bfa" />
            <span>mail.braboconcursos.com.br</span>
          </div>

          <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Webmail</span>
        </div>

        {/* Email Header Info */}
        <div style={{
          padding: '1rem 1.25rem',
          background: '#111827',
          borderBottom: '1px solid #1f2937',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.4rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>
              {record.title || 'Aviso Importante - Brabo Concursos'}
            </h4>
            <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>
              {record.scheduledDate} {record.scheduledTime}
            </span>
          </div>

          <div style={{ fontSize: '0.76rem', color: '#9ca3af', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
            <div>
              <strong style={{ color: '#e5e7eb' }}>De:</strong> Brabo Concursos &lt;contato@braboconcursos.com.br&gt;
            </div>
            <div>
              <strong style={{ color: '#e5e7eb' }}>Para:</strong> Guerreiro &lt;aluno.concurseiro@email.com&gt;
            </div>
          </div>
        </div>

        {/* Email Content Body */}
        <div style={{
          padding: '1.5rem 1.25rem',
          background: '#0b101b',
          color: '#e2e8f0',
          fontSize: '0.84rem',
          lineHeight: '1.6',
          minHeight: '260px',
          maxHeight: '400px',
          overflowY: 'auto'
        }}>
          {/* Brand mini banner */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #1f293d',
            paddingBottom: '0.75rem',
            marginBottom: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '1.2rem' }}>🦅</span>
              <span style={{ fontWeight: 800, color: '#fbbf24', letterSpacing: '0.05em' }}>BRABO CONCURSOS</span>
            </div>
            <span style={{ fontSize: '0.7rem', color: '#a78bfa', background: 'rgba(167, 139, 250, 0.15)', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
              Comunicação Oficial
            </span>
          </div>

          {/* Attachment if position === 'before' */}
          {record.attachment && (record.attachment.position || 'before') === 'before' && (
            renderAttachmentBadge(record.attachment)
          )}

          {/* Body text */}
          <div style={{ whiteSpace: 'pre-wrap', marginBottom: '1.25rem' }}>
            {formatFormattedText(resolvedText)}
          </div>

          {/* Attachment if position === 'after' */}
          {record.attachment && record.attachment.position === 'after' && (
            renderAttachmentBadge(record.attachment)
          )}

          {/* Highlighted CTA button if links exist */}
          {foundUrls.length > 0 && (
            <div style={{ margin: '1.25rem 0', textAlign: 'center' }}>
              <a
                href={foundUrls[0]}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-block',
                  background: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  padding: '0.65rem 1.25rem',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)'
                }}
              >
                👉 Acessar Link Oficial Agora
              </a>
            </div>
          )}

          {/* Email Footer */}
          <div style={{
            marginTop: '1.5rem',
            paddingTop: '1rem',
            borderTop: '1px solid #1f293d',
            fontSize: '0.7rem',
            color: '#64748b',
            lineHeight: '1.4'
          }}>
            <p>Brabo Concursos • O preparatório de elite para carreiras policiais.</p>
            <p style={{ marginTop: '0.2rem' }}>Para gerenciar suas preferências de e-mail, clique aqui.</p>
          </div>
        </div>
      </div>
    );
  }

  // 2. YOUTUBE COMMUNITY PREVIEW (Aba Comunidade do Canal Oficial)
  if (record.channel === 'Comunidade YouTube') {
    return (
      <div style={{
        width: '100%',
        maxWidth: '440px',
        margin: '0 auto',
        borderRadius: '16px',
        background: '#0f0f0f',
        border: '1px solid #272727',
        boxShadow: '0 20px 40px rgba(0,0,0,0.7), 0 0 25px rgba(239, 68, 68, 0.15)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* YouTube Header Pill */}
        <div style={{
          background: '#1a1a1a',
          padding: '0.5rem 0.85rem',
          borderBottom: '1px solid #272727',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <YouTubeIcon size={17} color="#ff0000" />
            <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#ffffff' }}>YouTube • Aba Comunidade</span>
          </div>
          <span style={{ fontSize: '0.68rem', color: '#aaaaaa' }}>Post Oficial</span>
        </div>

        {/* Post Container */}
        <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {/* Channel Author Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #1e2638, #0f1523)',
              border: '1.5px solid #f59e0b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.1rem',
              flexShrink: 0
            }}>
              🦅
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#f1f1f1' }}>
                  Brabo Concursos
                </span>
                <span style={{
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  background: '#717171',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '9px',
                  fontWeight: 900
                }}>
                  ✓
                </span>
              </div>
              <span style={{ fontSize: '0.7rem', color: '#aaaaaa' }}>
                Programadado para {record.scheduledDate} às {record.scheduledTime}
              </span>
            </div>
          </div>

          {/* Attachment if position === 'before' */}
          {record.attachment && (record.attachment.position || 'before') === 'before' && (
            renderAttachmentBadge(record.attachment)
          )}

          {/* Post Content */}
          <div style={{
            fontSize: '0.85rem',
            color: '#f1f1f1',
            lineHeight: '1.5',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            maxHeight: '340px',
            overflowY: 'auto'
          }}>
            {formatFormattedText(resolvedText, true)}
          </div>

          {/* Attachment if position === 'after' */}
          {record.attachment && record.attachment.position === 'after' && (
            renderAttachmentBadge(record.attachment)
          )}

          {/* Post Action Buttons (YouTube style) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1.25rem',
            paddingTop: '0.85rem',
            borderTop: '1px solid #272727',
            color: '#aaaaaa',
            fontSize: '0.75rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}>
              <ThumbsUp size={15} />
              <span>1.2 mil</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}>
              <ThumbsDown size={15} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}>
              <Share2 size={15} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginLeft: 'auto', cursor: 'pointer' }}>
              <MessageSquare size={14} />
              <span>96</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. WHATSAPP PREVIEW (Padrão para todos os 6 Canais WhatsApp)
  return (
    <div className="phone-mockup-frame">
      {/* Dynamic Island Notch */}
      <div className="phone-island">
        <div className="phone-island-speaker" />
        <div className="phone-island-camera" />
      </div>

      {/* Status Bar */}
      <div className="phone-status-bar">
        <span className="phone-status-time">09:41</span>
        <div className="phone-status-icons">
          <Wifi size={13} />
          <BatteryMedium size={15} />
        </div>
      </div>

      {/* WhatsApp Header */}
      <div className="wa-header">
        <div className="wa-header-left">
          <button type="button" className="wa-back-btn" aria-label="Voltar">
            <ArrowLeft size={16} />
          </button>
          <div className="wa-avatar">
            <span>BC</span>
          </div>
          <div className="wa-chat-info">
            <div className="wa-chat-name">
              <span>Brabo Concursos</span>
              <span className="verified-badge" title="Canal Verificado">
                <CheckCheck size={13} color="#25D366" />
              </span>
            </div>
            <span className="wa-chat-status">
              {record.channel || 'WhatsApp'} • Oficial
            </span>
          </div>
        </div>

        <div className="wa-header-actions">
          <VideoIcon size={16} className="wa-header-icon" />
          <Phone size={14} className="wa-header-icon" />
          <MoreVertical size={16} className="wa-header-icon" />
        </div>
      </div>

      {/* Chat Messages Area */}
      <div className="wa-chat-area">
        {/* Encryption notice */}
        <div className="wa-encryption-pill">
          🔒 Mensagens protegidas com criptografia de ponta a ponta.
        </div>

        {/* Date Divider */}
        <div className="wa-date-divider">
          <span>Hoje</span>
        </div>

        {/* Message Bubble Container */}
        <div className="wa-bubble-container">
          <div className="wa-message-bubble">
            {/* Attachment if position === 'before' */}
            {record.attachment && (record.attachment.position || 'before') === 'before' && (
              <div className="wa-attachment-wrapper">
                {renderAttachmentBadge(record.attachment, '100%')}
              </div>
            )}

            {/* Message Body */}
            {resolvedText && (
              <div className="wa-message-text">
                {formatFormattedText(resolvedText)}
              </div>
            )}

            {/* Attachment if position === 'after' */}
            {record.attachment && record.attachment.position === 'after' && (
              <div className="wa-attachment-wrapper">
                {renderAttachmentBadge(record.attachment, '100%')}
              </div>
            )}

            {/* Message Meta Info */}
            <div className="wa-bubble-meta">
              <span>{record.scheduledTime || '10:00'}</span>
              <CheckCheck size={14} color="#53bdeb" />
            </div>
          </div>
        </div>
      </div>

      {/* WhatsApp Bottom Bar */}
      <div className="wa-bottom-bar">
        <div className="wa-input-pill">
          <Smile size={18} color="#8696a0" style={{ cursor: 'pointer' }} />
          <span className="wa-placeholder">Mensagem</span>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Paperclip size={16} color="#8696a0" style={{ cursor: 'pointer' }} />
            <Camera size={16} color="#8696a0" style={{ cursor: 'pointer' }} />
          </div>
        </div>
        <div className="wa-mic-btn">
          <Mic size={16} color="#ffffff" />
        </div>
      </div>
    </div>
  );
}
