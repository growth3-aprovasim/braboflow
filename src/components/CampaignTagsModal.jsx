import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, 
  Search, 
  Sparkles, 
  Check, 
  Edit3, 
  CheckCheck, 
  Plus, 
  Trash2, 
  AlertCircle,
  Eye,
  FileText,
  Copy,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  Calendar,
  Smartphone,
  Mail,
  Zap,
  Tag
} from 'lucide-react';
import { extractAllCampaignBracketTags, resolveCopyVariables } from '../data/initialData';
import { YouTubeIcon } from './ChannelPreview';

function ChannelBadge({ channel }) {
  const norm = String(channel || '').toLowerCase();
  if (norm.includes('wa') || norm.includes('whats')) {
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem',
        background: 'rgba(34, 197, 94, 0.15)',
        color: '#4ade80',
        border: '1px solid rgba(34, 197, 94, 0.3)',
        borderRadius: '4px',
        padding: '0.12rem 0.4rem',
        fontSize: '0.68rem',
        fontWeight: 600
      }}>
        <Smartphone size={10} /> WhatsApp
      </span>
    );
  }
  if (norm.includes('email') || norm.includes('mail')) {
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem',
        background: 'rgba(168, 85, 247, 0.15)',
        color: '#c084fc',
        border: '1px solid rgba(168, 85, 247, 0.3)',
        borderRadius: '4px',
        padding: '0.12rem 0.4rem',
        fontSize: '0.68rem',
        fontWeight: 600
      }}>
        <Mail size={10} /> Email
      </span>
    );
  }
  if (norm.includes('youtube') || norm.includes('yt') || norm.includes('live')) {
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem',
        background: 'rgba(239, 68, 68, 0.15)',
        color: '#f87171',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        borderRadius: '4px',
        padding: '0.12rem 0.4rem',
        fontSize: '0.68rem',
        fontWeight: 600
      }}>
        <YouTubeIcon size={10} /> YouTube
      </span>
    );
  }
  if (norm.includes('automaç') || norm.includes('automac')) {
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem',
        background: 'rgba(139, 92, 246, 0.15)',
        color: '#c084fc',
        border: '1px solid rgba(139, 92, 246, 0.3)',
        borderRadius: '4px',
        padding: '0.12rem 0.4rem',
        fontSize: '0.68rem',
        fontWeight: 600
      }}>
        <Zap size={10} /> Automações
      </span>
    );
  }
  if (norm.includes('emergênc') || norm.includes('emergenc')) {
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem',
        background: 'rgba(249, 115, 22, 0.15)',
        color: '#fb923c',
        border: '1px solid rgba(249, 115, 22, 0.3)',
        borderRadius: '4px',
        padding: '0.12rem 0.4rem',
        fontSize: '0.68rem',
        fontWeight: 600
      }}>
        <AlertCircle size={10} /> Emergenciais
      </span>
    );
  }
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.25rem',
      background: 'rgba(255, 255, 255, 0.05)',
      color: '#94a3b8',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '4px',
      padding: '0.12rem 0.4rem',
      fontSize: '0.68rem',
      fontWeight: 600
    }}>
      {channel || 'Geral'}
    </span>
  );
}

function HighlightedText({ text, highlightTag }) {
  if (!text) return null;
  const cleanTarget = (highlightTag || '').replace(/^\[/, '').replace(/\]$/, '').trim().toLowerCase();

  const parts = [];
  let lastIndex = 0;
  const regex = /\[([^\]\r\n]+)\]/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        text: text.substring(lastIndex, match.index),
        isTag: false
      });
    }

    const tagContent = match[1].trim();
    const isTarget = tagContent.toLowerCase() === cleanTarget;

    parts.push({
      text: match[0],
      tagKey: tagContent,
      isTag: true,
      isTarget
    });

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push({
      text: text.substring(lastIndex),
      isTag: false
    });
  }

  return (
    <>
      {parts.map((p, idx) => {
        if (!p.isTag) {
          return <span key={idx}>{p.text}</span>;
        }

        if (p.isTarget) {
          return (
            <mark
              key={idx}
              style={{
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.35) 0%, rgba(217, 119, 6, 0.5) 100%)',
                border: '1px solid #fbbf24',
                color: '#fbbf24',
                fontWeight: 800,
                borderRadius: '5px',
                padding: '0.1rem 0.45rem',
                margin: '0 0.15rem',
                boxShadow: '0 0 10px rgba(245, 158, 11, 0.35)',
                display: 'inline-block'
              }}
              title={`Tag em foco: ${p.text}`}
            >
              {p.text}
            </mark>
          );
        }

        return (
          <span
            key={idx}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.18)',
              color: '#cbd5e1',
              fontWeight: 600,
              borderRadius: '4px',
              padding: '0.06rem 0.35rem',
              margin: '0 0.1rem'
            }}
          >
            {p.text}
          </span>
        );
      })}
    </>
  );
}

// Helper to normalize placeholders ensuring text is populated cleanly
const normalizePlaceholders = (placeholders) => {
  if (!placeholders) return {};
  const normalized = {};
  Object.entries(placeholders).forEach(([k, v]) => {
    let text = '';
    if (typeof v === 'string') {
      text = v;
    } else if (v && typeof v === 'object') {
      text = v.text || v.value || v.url || '';
    }
    normalized[k] = { mode: 'text', text };
  });
  return normalized;
};

export default function CampaignTagsModal({
  isOpen,
  onClose,
  campaign,
  onUpdateCampaignPlaceholders
}) {
  // Tags filter and search
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'filled' | 'pending'
  const [expandedTagSnippet, setExpandedTagSnippet] = useState(null);
  const [expandedMessageIds, setExpandedMessageIds] = useState({});
  const [copiedMsgId, setCopiedMsgId] = useState(null);

  const [newCustomTagInput, setNewCustomTagInput] = useState('');
  const [showAddCustomTag, setShowAddCustomTag] = useState(false);
  const [successToast, setSuccessToast] = useState(null);

  // Local state for tag values (direct text or link)
  const [tagValues, setTagValues] = useState(() => {
    return normalizePlaceholders(campaign?.customPlaceholders);
  });

  useEffect(() => {
    if (campaign?.customPlaceholders) {
      setTagValues(normalizePlaceholders(campaign.customPlaceholders));
    }
  }, [campaign?.customPlaceholders]);

  // Extract all detected tags from campaign messages
  const detectedTags = useMemo(() => {
    if (!campaign?.messages) return [];
    return extractAllCampaignBracketTags(campaign.messages);
  }, [campaign?.messages]);

  // Combine detected tags with any custom tags configured in campaign.customPlaceholders
  const allTagsList = useMemo(() => {
    const list = [...detectedTags];
    const existingKeys = new Set(list.map(t => t.key));

    if (campaign?.customPlaceholders) {
      Object.keys(campaign.customPlaceholders).forEach(rawOrCleanKey => {
        const cleanKey = rawOrCleanKey.replace(/^\[/, '').replace(/\]$/, '').trim();
        if (cleanKey && !existingKeys.has(cleanKey)) {
          existingKeys.add(cleanKey);
          list.push({
            rawTag: `[${cleanKey}]`,
            key: cleanKey,
            count: 0,
            messages: [],
            messageIds: new Set(),
            isCustomManual: true
          });
        }
      });
    }

    return list;
  }, [detectedTags, campaign?.customPlaceholders]);

  // Calculate tag counts for filters
  const tagCounts = useMemo(() => {
    let filled = 0;
    let pending = 0;
    allTagsList.forEach(t => {
      const cfg = tagValues[t.rawTag] || tagValues[t.key] || {};
      const val = cfg.text ? cfg.text.trim() : '';
      if (val) filled++;
      else pending++;
    });
    return { all: allTagsList.length, filled, pending };
  }, [allTagsList, tagValues]);

  // Filter tags based on search and status
  const filteredTags = useMemo(() => {
    return allTagsList.filter(tag => {
      const matchesSearch = tag.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            tag.rawTag.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;

      const currentVal = tagValues[tag.rawTag] || tagValues[tag.key] || {};
      const hasValue = !!(currentVal.text && currentVal.text.trim());

      if (activeFilter === 'filled') return hasValue;
      if (activeFilter === 'pending') return !hasValue;
      return true;
    });
  }, [allTagsList, searchTerm, activeFilter, tagValues]);

  if (!isOpen || !campaign) return null;

  const handleTagValueChange = (tagKey, newText) => {
    const cleanKey = tagKey.replace(/^\[/, '').replace(/\]$/, '').trim();
    const rawKey = `[${cleanKey}]`;
    const updatedConfig = { mode: 'text', text: newText };

    setTagValues(prev => {
      const next = {
        ...prev,
        [rawKey]: updatedConfig,
        [cleanKey]: updatedConfig
      };
      // Auto-save immediately to campaign placeholders
      if (onUpdateCampaignPlaceholders && campaign?.id) {
        onUpdateCampaignPlaceholders(campaign.id, next);
      }
      return next;
    });
  };

  const handleManualSave = () => {
    if (onUpdateCampaignPlaceholders && campaign?.id) {
      onUpdateCampaignPlaceholders(campaign.id, tagValues);
    }
    setSuccessToast('Mapeamento das tags salvo com sucesso na campanha!');
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const handleAddNewManualTag = (e) => {
    e.preventDefault();
    if (!newCustomTagInput.trim()) return;
    const cleanKey = newCustomTagInput.trim().replace(/^\[/, '').replace(/\]$/, '').trim();
    if (!cleanKey) return;
    const rawKey = `[${cleanKey}]`;

    handleTagValueChange(rawKey, '');
    setNewCustomTagInput('');
    setShowAddCustomTag(false);
    setSuccessToast(`Tag ${rawKey} adicionada! Digite o link ou frase substituta.`);
    setTimeout(() => setSuccessToast(null), 2500);
  };

  const handleRemoveCustomTag = (tagKey) => {
    const cleanKey = tagKey.replace(/^\[/, '').replace(/\]$/, '').trim();
    const rawKey = `[${cleanKey}]`;
    setTagValues(prev => {
      const next = { ...prev };
      delete next[rawKey];
      delete next[cleanKey];
      if (onUpdateCampaignPlaceholders && campaign?.id) {
        onUpdateCampaignPlaceholders(campaign.id, next);
      }
      return next;
    });
    setSuccessToast(`Tag ${rawKey} removida.`);
    setTimeout(() => setSuccessToast(null), 2000);
  };

  // Toggle individual message context expansion for Tag
  const toggleExpandMessage = (msgId) => {
    setExpandedMessageIds(prev => ({
      ...prev,
      [msgId]: !prev[msgId]
    }));
  };

  // Expand / Collapse all message contexts for Tag
  const toggleExpandAllTagMessages = (tagMessages) => {
    const allExpanded = tagMessages.every(m => expandedMessageIds[m.id]);
    setExpandedMessageIds(prev => {
      const next = { ...prev };
      tagMessages.forEach(m => {
        next[m.id] = !allExpanded;
      });
      return next;
    });
  };

  // Copy final resolved message text (with tags replaced dynamically)
  const handleCopyResolvedMessage = (msgRecord) => {
    const rawText = msgRecord.copyText || msgRecord.copySnippet || '';
    const textToCopy = resolveCopyVariables(rawText, msgRecord.variables, campaign?.predefinedLinks || [], tagValues);
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy);
    setCopiedMsgId(msgRecord.id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '880px', width: '96%', height: 'auto', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Modal Header */}
        <div className="modal-header" style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fbbf24'
            }}>
              <Edit3 size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.72rem', color: '#fbbf24', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Central de Tags da Campanha
                </span>
                <span style={{ fontSize: '0.68rem', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', padding: '0.15rem 0.45rem', borderRadius: '4px', fontWeight: 700 }}>
                  {allTagsList.length} tags detectadas
                </span>
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', margin: 0 }}>
                {campaign.name}
              </h3>
            </div>
          </div>
          <button className="btn-ghost" onClick={onClose} style={{ padding: '0.4rem', color: '#94a3b8' }}>
            <X size={20} />
          </button>
        </div>

        {/* Success Toast Notification */}
        {successToast && (
          <div style={{
            background: 'rgba(34, 197, 94, 0.2)',
            borderBottom: '1px solid rgba(34, 197, 94, 0.35)',
            color: '#4ade80',
            padding: '0.65rem 1.5rem',
            fontSize: '0.82rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontWeight: 600
          }}>
            <CheckCheck size={16} />
            <span>{successToast}</span>
          </div>
        )}

        {/* Modal Body */}
        <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Explanation Banner */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            borderRadius: '10px',
            padding: '0.9rem 1.1rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.85rem'
          }}>
            <Sparkles size={18} color="#fbbf24" style={{ flexShrink: 0, marginTop: '0.15rem' }} />
            <div style={{ fontSize: '0.8rem', color: '#cbd5e1', lineHeight: '1.5' }}>
              <strong style={{ color: '#f8fafc' }}>Como funciona:</strong> Qualquer termo colocado entre colchetes como <code style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', padding: '0.1rem 0.35rem', borderRadius: '4px', fontWeight: 700 }}>[LINK]</code>, <code style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', padding: '0.1rem 0.35rem', borderRadius: '4px', fontWeight: 700 }}>[DATA]</code> ou <code style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', padding: '0.1rem 0.35rem', borderRadius: '4px', fontWeight: 700 }}>[CUPOM]</code> em suas mensagens é detectado automaticamente aqui. Preencha o link ou frase substituta. <strong>A tag continua existindo nas mensagens</strong> para você poder alterar o link/frase na semana seguinte sem esforço, e é <strong>substituída dinamicamente no preview e ao copiar o texto final</strong>!
            </div>
          </div>

          {/* Search, Filter & Add Custom Tag Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {/* Search */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', background: 'rgba(255, 255, 255, 0.04)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.35rem 0.75rem', flex: 1, minWidth: '220px' }}>
              <Search size={14} color="#94a3b8" />
              <input
                type="text"
                placeholder="Buscar tag (ex: LINK, DATA, CUPOM)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '0.8rem', outline: 'none', width: '100%' }}
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.75rem' }}>✕</button>
              )}
            </div>

            {/* Filter Pills with Exact Counters */}
            <div style={{ display: 'flex', gap: '0.35rem', background: 'rgba(0, 0, 0, 0.3)', padding: '0.2rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              {[
                { id: 'all', label: `Todas (${tagCounts.all})` },
                { id: 'filled', label: `Preenchidas (${tagCounts.filled})`, color: '#4ade80' },
                { id: 'pending', label: `Faltam Preencher (${tagCounts.pending})`, color: '#fbbf24' }
              ].map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setActiveFilter(f.id)}
                  style={{
                    fontSize: '0.74rem',
                    padding: '0.25rem 0.65rem',
                    borderRadius: '6px',
                    border: 'none',
                    background: activeFilter === f.id ? (f.id === 'filled' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(245, 158, 11, 0.2)') : 'transparent',
                    color: activeFilter === f.id ? (f.color || '#fbbf24') : '#94a3b8',
                    fontWeight: activeFilter === f.id ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Add Tag Button */}
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setShowAddCustomTag(!showAddCustomTag)}
              style={{ fontSize: '0.76rem', padding: '0.35rem 0.75rem', color: '#fbbf24', borderColor: 'rgba(245, 158, 11, 0.35)' }}
            >
              <Plus size={13} />
              <span>Nova Tag [ ]</span>
            </button>
          </div>

          {/* New Custom Tag Form (Collapsible) */}
          {showAddCustomTag && (
            <form onSubmit={handleAddNewManualTag} style={{
              background: 'rgba(245, 158, 11, 0.06)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: '8px',
              padding: '0.85rem 1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem'
            }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#fbbf24' }}>Nome da Nova Tag:</span>
              <input
                type="text"
                className="form-control"
                placeholder="Ex: LINK_CHECKOUT, DATA_AULA ou CUPOM_BLACK"
                value={newCustomTagInput}
                onChange={(e) => setNewCustomTagInput(e.target.value)}
                style={{ fontSize: '0.8rem', flex: 1 }}
                autoFocus
              />
              <button
                type="submit"
                className="btn-primary"
                style={{ fontSize: '0.78rem', padding: '0.35rem 0.85rem', background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: '#0b1120', fontWeight: 700 }}
                disabled={!newCustomTagInput.trim()}
              >
                Adicionar
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setShowAddCustomTag(false)}
                style={{ fontSize: '0.78rem', padding: '0.35rem' }}
              >
                Cancelar
              </button>
            </form>
          )}

          {/* Tags List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {filteredTags.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '3rem 1.5rem',
                border: '1px dashed var(--border-color)',
                borderRadius: '10px',
                color: '#64748b',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <AlertCircle size={28} color="#f59e0b" />
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#94a3b8' }}>
                  {searchTerm 
                    ? 'Nenhuma tag encontrada para esta busca.' 
                    : activeFilter === 'filled' 
                      ? 'Nenhuma tag preenchida ainda. Selecione "Faltam Preencher" para preenchê-las.'
                      : activeFilter === 'pending'
                        ? 'Todas as tags já foram preenchidas! Parabéns!'
                        : 'Nenhuma tag [ ] encontrada nas mensagens.'}
                </span>
                <p style={{ fontSize: '0.78rem', color: '#64748b', maxWidth: '420px', margin: 0 }}>
                  Escreva palavras entre colchetes como <code style={{ color: '#fbbf24' }}>[LINK]</code> ou <code style={{ color: '#fbbf24' }}>[DATA]</code> no texto das suas mensagens ou clique em <strong>"+ Nova Tag [ ]"</strong> para cadastrar antecipadamente.
                </p>
              </div>
            ) : (
              filteredTags.map((tag) => {
                const cleanKey = tag.key;
                const rawKey = tag.rawTag;
                const config = tagValues[rawKey] || tagValues[cleanKey] || { mode: 'text', text: '' };
                const isExpanded = expandedTagSnippet === cleanKey;
                const hasValue = !!(config.text && config.text.trim());
                const areAllExpanded = tag.messages.length > 0 && tag.messages.every(m => expandedMessageIds[m.id]);

                return (
                  <div
                    key={cleanKey}
                    style={{
                      background: 'var(--bg-card)',
                      border: `1px solid ${hasValue ? 'rgba(34, 197, 94, 0.35)' : 'rgba(245, 158, 11, 0.35)'}`,
                      borderRadius: '10px',
                      padding: '1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem',
                      transition: 'border-color 0.2s ease'
                    }}
                  >
                    {/* Tag Top Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                        <span style={{
                          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.18) 0%, rgba(217, 119, 6, 0.28) 100%)',
                          border: '1px solid rgba(245, 158, 11, 0.5)',
                          color: '#fbbf24',
                          fontWeight: 800,
                          fontSize: '0.85rem',
                          padding: '0.2rem 0.65rem',
                          borderRadius: '6px',
                          letterSpacing: '0.5px',
                          fontFamily: 'monospace'
                        }}>
                          {rawKey}
                        </span>

                        {/* Status Badge */}
                        {hasValue ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            color: '#4ade80',
                            background: 'rgba(34, 197, 94, 0.15)',
                            border: '1px solid rgba(34, 197, 94, 0.3)',
                            borderRadius: '4px',
                            padding: '0.12rem 0.45rem'
                          }}>
                            <Check size={11} strokeWidth={3} /> Preenchida
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            color: '#fbbf24',
                            background: 'rgba(245, 158, 11, 0.15)',
                            border: '1px solid rgba(245, 158, 11, 0.3)',
                            borderRadius: '4px',
                            padding: '0.12rem 0.45rem'
                          }}>
                            <AlertCircle size={11} /> Falta Preencher
                          </span>
                        )}

                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                          Presente em <strong style={{ color: '#f8fafc' }}>{tag.messages.length}</strong> {tag.messages.length === 1 ? 'mensagem' : 'mensagens'} ({tag.count}x)
                        </span>

                        {tag.messages.length > 0 && (
                          <button
                            type="button"
                            className="btn-ghost"
                            onClick={() => setExpandedTagSnippet(isExpanded ? null : cleanKey)}
                            style={{
                              fontSize: '0.72rem',
                              padding: '0.15rem 0.5rem',
                              color: isExpanded ? '#fbbf24' : '#94a3b8',
                              background: isExpanded ? 'rgba(245, 158, 11, 0.12)' : 'rgba(255, 255, 255, 0.04)',
                              border: '1px solid rgba(245, 158, 11, 0.3)',
                              borderRadius: '5px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.3rem'
                            }}
                            title="Ver as mensagens onde esta tag é utilizada"
                          >
                            <Eye size={12} />
                            <span>{isExpanded ? 'Ocultar Ocorrências' : `Ver Mensagens (${tag.messages.length})`}</span>
                            {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                          </button>
                        )}
                      </div>

                      {/* Remove manual custom tag button if not present in any message */}
                      {tag.count === 0 && (
                        <button
                          type="button"
                          className="btn-ghost"
                          onClick={() => handleRemoveCustomTag(rawKey)}
                          style={{ fontSize: '0.72rem', color: '#ef4444', padding: '0.2rem 0.4rem' }}
                          title="Remover esta tag manual"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>

                    {/* Value Input Section (Single Direct Link or Phrase Input) */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', width: '100%' }}>
                      <input
                        type="text"
                        className="form-control"
                        placeholder={`Digite o link (ex: https://...) ou frase para ${rawKey}...`}
                        value={config.text || ''}
                        onChange={(e) => handleTagValueChange(rawKey, e.target.value)}
                        style={{
                          width: '100%',
                          fontSize: '0.82rem',
                          padding: '0.45rem 0.75rem',
                          borderColor: hasValue ? 'rgba(34, 197, 94, 0.4)' : 'rgba(245, 158, 11, 0.4)'
                        }}
                      />
                      <span style={{ fontSize: '0.7rem', color: hasValue ? '#4ade80' : '#94a3b8' }}>
                        {hasValue 
                          ? `✨ A tag ${rawKey} será substituída por este valor dinamicamente no preview e ao copiar o texto final.`
                          : `⚠️ A tag ${rawKey} continua nas mensagens e será substituída assim que você preencher o link ou frase acima.`}
                      </span>
                    </div>

                    {/* ==================== EXPANDABLE OCCURRENCES & MESSAGE CONTEXT ==================== */}
                    {isExpanded && tag.messages.length > 0 && (
                      <div style={{
                        marginTop: '0.4rem',
                        background: 'rgba(0, 0, 0, 0.4)',
                        border: '1px solid rgba(245, 158, 11, 0.25)',
                        borderRadius: '8px',
                        padding: '0.85rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.65rem'
                      }}>
                        {/* Occurrences Header with Expand All Toggle */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', paddingBottom: '0.45rem' }}>
                          <span style={{ fontSize: '0.74rem', color: '#fbbf24', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <FileText size={13} />
                            <span>Mensagens com esta Tag ({tag.messages.length})</span>
                          </span>

                          <button
                            type="button"
                            className="btn-ghost"
                            onClick={() => toggleExpandAllTagMessages(tag.messages)}
                            style={{
                              fontSize: '0.72rem',
                              padding: '0.15rem 0.55rem',
                              color: '#fbbf24',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              background: 'rgba(245, 158, 11, 0.1)',
                              borderRadius: '5px'
                            }}
                          >
                            {areAllExpanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                            <span>{areAllExpanded ? 'Recolher todos os contextos' : 'Expandir todos os contextos'}</span>
                          </button>
                        </div>

                        {/* Messages List with Context Expansion */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '440px', overflowY: 'auto', paddingRight: '0.2rem' }}>
                          {tag.messages.map(m => {
                            const isMsgExpanded = !!expandedMessageIds[m.id];
                            const rawText = m.copyText || m.copySnippet || '';
                            const resolvedFinalText = resolveCopyVariables(rawText, m.variables, campaign?.predefinedLinks || [], tagValues);

                            return (
                              <div
                                key={m.id}
                                style={{
                                  background: isMsgExpanded ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.025)',
                                  border: isMsgExpanded ? '1px solid rgba(245, 158, 11, 0.45)' : '1px solid var(--border-subtle)',
                                  borderRadius: '8px',
                                  padding: '0.65rem 0.85rem',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '0.45rem',
                                  transition: 'all 0.18s ease',
                                  boxShadow: isMsgExpanded ? '0 4px 18px rgba(0, 0, 0, 0.4)' : 'none'
                                }}
                              >
                                {/* Message Info Bar */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    <strong style={{ color: '#f8fafc', fontSize: '0.8rem' }}>{m.title}</strong>
                                    <ChannelBadge channel={m.channel} />
                                    {m.stage && (
                                      <span style={{ fontSize: '0.66rem', color: '#94a3b8', background: 'rgba(255, 255, 255, 0.04)', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>
                                        {m.stage}
                                      </span>
                                    )}
                                    {m.scheduledDate && (
                                      <span style={{ fontSize: '0.66rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                        <Calendar size={10} /> {m.scheduledDate} {m.scheduledTime ? `• ${m.scheduledTime}` : ''}
                                      </span>
                                    )}
                                  </div>

                                  {/* Expand Context Toggle Button */}
                                  <button
                                    type="button"
                                    className="btn-ghost"
                                    onClick={() => toggleExpandMessage(m.id)}
                                    style={{
                                      fontSize: '0.72rem',
                                      padding: '0.15rem 0.45rem',
                                      color: isMsgExpanded ? '#fbbf24' : '#94a3b8',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.25rem',
                                      background: isMsgExpanded ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
                                      borderRadius: '4px'
                                    }}
                                    title={isMsgExpanded ? 'Recolher mensagem' : 'Clique para expandir o texto e ver o preview final'}
                                  >
                                    {isMsgExpanded ? <ChevronUp size={13} /> : <Maximize2 size={12} />}
                                    <span>{isMsgExpanded ? 'Recolher' : 'Expandir Mensagem'}</span>
                                  </button>
                                </div>

                                {/* Collapsed Preview */}
                                {!isMsgExpanded && (
                                  <div 
                                    onClick={() => toggleExpandMessage(m.id)}
                                    style={{
                                      color: '#cbd5e1',
                                      fontSize: '0.76rem',
                                      lineHeight: '1.45',
                                      cursor: 'pointer',
                                      display: '-webkit-box',
                                      WebkitLineClamp: 2,
                                      WebkitBoxOrient: 'vertical',
                                      overflow: 'hidden',
                                      padding: '0.2rem 0'
                                    }}
                                    title="Clique para expandir a mensagem e ver o preview com o valor da tag substituído"
                                  >
                                    <HighlightedText text={rawText} highlightTag={rawKey} />
                                  </div>
                                )}

                                {/* Expanded Full Message Context with Live Preview */}
                                {isMsgExpanded && (
                                  <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.75rem',
                                    marginTop: '0.25rem'
                                  }}>
                                    {/* 1. Texto Original com a Tag */}
                                    <div>
                                      <span style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
                                        Texto da Mensagem (Tag Preservada):
                                      </span>
                                      <div style={{
                                        background: 'rgba(0, 0, 0, 0.55)',
                                        border: '1px solid rgba(245, 158, 11, 0.25)',
                                        borderRadius: '6px',
                                        padding: '0.75rem 0.9rem',
                                        color: '#cbd5e1',
                                        fontSize: '0.8rem',
                                        lineHeight: '1.5',
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-word',
                                        fontFamily: 'inherit',
                                        maxHeight: '180px',
                                        overflowY: 'auto',
                                        marginTop: '0.25rem'
                                      }}>
                                        <HighlightedText text={rawText} highlightTag={rawKey} />
                                      </div>
                                    </div>

                                    {/* 2. Preview Final Resolvido (Com a Tag Substituída) */}
                                    <div>
                                      <span style={{ fontSize: '0.68rem', color: '#4ade80', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                        <Sparkles size={11} color="#4ade80" /> Preview Final (Como o lead receberá / Ao Copiar):
                                      </span>
                                      <div style={{
                                        background: 'rgba(34, 197, 94, 0.04)',
                                        border: '1px solid rgba(34, 197, 94, 0.3)',
                                        borderRadius: '6px',
                                        padding: '0.75rem 0.9rem',
                                        color: '#f8fafc',
                                        fontSize: '0.82rem',
                                        lineHeight: '1.55',
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-word',
                                        fontFamily: 'inherit',
                                        maxHeight: '220px',
                                        overflowY: 'auto',
                                        marginTop: '0.25rem'
                                      }}>
                                        {resolvedFinalText}
                                      </div>
                                    </div>

                                    {/* Actions Bar inside Expanded Message */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <button
                                        type="button"
                                        className="btn-primary"
                                        onClick={() => handleCopyResolvedMessage(m)}
                                        style={{
                                          fontSize: '0.74rem',
                                          padding: '0.3rem 0.75rem',
                                          background: copiedMsgId === m.id ? '#22c55e' : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                          color: '#0b1120',
                                          fontWeight: 700,
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '0.35rem'
                                        }}
                                        title="Copiar texto final com as tags já substituídas pelos seus links/frases"
                                      >
                                        {copiedMsgId === m.id ? <CheckCheck size={14} /> : <Copy size={14} />}
                                        <span>{copiedMsgId === m.id ? 'Copiado para Área de Transferência!' : 'Copiar Texto Final (Tags Substituídas)'}</span>
                                      </button>

                                      <button
                                        type="button"
                                        className="btn-ghost"
                                        onClick={() => toggleExpandMessage(m.id)}
                                        style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                                      >
                                        <ChevronUp size={12} />
                                        <span>Recolher</span>
                                      </button>
                                    </div>
                                  </div>
                                )}

                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal-footer" style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
              <strong style={{ color: '#4ade80' }}>{tagCounts.filled}</strong> de <strong style={{ color: '#fff' }}>{tagCounts.all}</strong> tags preenchidas
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              type="button"
              className="btn-ghost"
              onClick={onClose}
              style={{ fontSize: '0.82rem' }}
            >
              Fechar
            </button>

            <button
              type="button"
              className="btn-primary"
              onClick={handleManualSave}
              style={{
                fontSize: '0.8rem',
                padding: '0.45rem 1.15rem',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: '#0b1120',
                fontWeight: 700,
                boxShadow: '0 0 15px rgba(245, 158, 11, 0.35)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <Check size={14} strokeWidth={3} />
              <span>Salvar Alterações</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
