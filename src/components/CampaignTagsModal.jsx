import React, { useState, useMemo } from 'react';
import { 
  X, 
  Search, 
  Sparkles, 
  Link as LinkIcon, 
  Check, 
  Edit3, 
  Layers, 
  ExternalLink, 
  CheckCheck, 
  Plus, 
  Trash2, 
  AlertCircle,
  Eye,
  FileText,
  Copy,
  ChevronDown,
  ChevronUp,
  RefreshCw
} from 'lucide-react';
import { extractAllCampaignBracketTags } from '../data/initialData';

export default function CampaignTagsModal({
  isOpen,
  onClose,
  campaign,
  onUpdateCampaignPlaceholders,
  onBatchReplaceTags,
  onOpenLinksModal
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'filled' | 'pending'
  const [expandedTagSnippet, setExpandedTagSnippet] = useState(null);
  const [newCustomTagInput, setNewCustomTagInput] = useState('');
  const [showAddCustomTag, setShowAddCustomTag] = useState(false);
  const [successToast, setSuccessToast] = useState(null);
  const [isApplying, setIsApplying] = useState(false);
  const [confirmBatchModal, setConfirmBatchModal] = useState(false);

  // Local state for placeholder values
  // Structure: { [tagKey]: { mode: 'text' | 'link', text: '', linkId: '' } }
  const [tagValues, setTagValues] = useState(() => {
    return campaign?.customPlaceholders || {};
  });

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

  const predefinedLinks = campaign?.predefinedLinks || [];

  if (!isOpen || !campaign) return null;

  // Filter tags based on search and status
  const filteredTags = allTagsList.filter(tag => {
    const matchesSearch = tag.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          tag.rawTag.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    const currentVal = tagValues[tag.rawTag] || tagValues[tag.key] || {};
    const hasValue = (currentVal.mode === 'link' && currentVal.linkId) || (currentVal.text && currentVal.text.trim());

    if (activeFilter === 'filled') return hasValue;
    if (activeFilter === 'pending') return !hasValue;
    return true;
  });

  const handleTagValueChange = (tagKey, updates) => {
    setTagValues(prev => {
      const cleanKey = tagKey.replace(/^\[/, '').replace(/\]$/, '').trim();
      const rawKey = `[${cleanKey}]`;
      const current = prev[rawKey] || prev[cleanKey] || { mode: 'text', text: '', linkId: '' };
      const updatedConfig = { ...current, ...updates };

      return {
        ...prev,
        [rawKey]: updatedConfig,
        [cleanKey]: updatedConfig
      };
    });
  };

  const handleSaveDynamicMapping = () => {
    if (onUpdateCampaignPlaceholders) {
      onUpdateCampaignPlaceholders(campaign.id, tagValues);
    }
    setSuccessToast('Mapeamento de Tags [ ] salvo com sucesso na campanha!');
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const handleExecuteBatchReplace = (singleTagKey = null) => {
    setIsApplying(true);

    const replacementsToApply = {};

    if (singleTagKey) {
      const cleanKey = singleTagKey.replace(/^\[/, '').replace(/\]$/, '').trim();
      const rawKey = `[${cleanKey}]`;
      const cfg = tagValues[rawKey] || tagValues[cleanKey];
      if (cfg) {
        let finalVal = '';
        if (cfg.mode === 'link' && cfg.linkId) {
          const found = predefinedLinks.find(l => l.id === cfg.linkId);
          if (found) finalVal = found.url;
        } else if (cfg.text) {
          finalVal = cfg.text;
        }

        if (finalVal) {
          replacementsToApply[rawKey] = finalVal;
          replacementsToApply[cleanKey] = finalVal;
        }
      }
    } else {
      // All tags
      Object.keys(tagValues).forEach(k => {
        const cfg = tagValues[k];
        if (!cfg) return;
        const cleanKey = k.replace(/^\[/, '').replace(/\]$/, '').trim();
        const rawKey = `[${cleanKey}]`;

        let finalVal = '';
        if (cfg.mode === 'link' && cfg.linkId) {
          const found = predefinedLinks.find(l => l.id === cfg.linkId);
          if (found) finalVal = found.url;
        } else if (cfg.text) {
          finalVal = cfg.text;
        }

        if (finalVal) {
          replacementsToApply[rawKey] = finalVal;
        }
      });
    }

    if (Object.keys(replacementsToApply).length === 0) {
      alert('Preencha ao menos uma Tag com um Link ou Texto para realizar a substituição.');
      setIsApplying(false);
      setConfirmBatchModal(false);
      return;
    }

    if (onBatchReplaceTags) {
      const affectedCount = onBatchReplaceTags(campaign.id, replacementsToApply);
      setSuccessToast(`Substituição concluída com sucesso em ${affectedCount || 'todas as'} mensagens!`);
      setTimeout(() => setSuccessToast(null), 4000);
    }

    setIsApplying(false);
    setConfirmBatchModal(false);
  };

  const handleAddNewManualTag = (e) => {
    e.preventDefault();
    if (!newCustomTagInput.trim()) return;
    const cleanKey = newCustomTagInput.trim().replace(/^\[/, '').replace(/\]$/, '').trim();
    if (!cleanKey) return;
    const rawKey = `[${cleanKey}]`;

    handleTagValueChange(rawKey, { mode: 'text', text: '' });
    setNewCustomTagInput('');
    setShowAddCustomTag(false);
    setSuccessToast(`Tag ${rawKey} adicionada!`);
    setTimeout(() => setSuccessToast(null), 2500);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '840px', width: '95%', height: 'auto', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Modal Header */}
        <div className="modal-header" style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8' }}>
              <Edit3 size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.72rem', color: '#38bdf8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Gerenciador Central de Tags & Variáveis [ ]
                </span>
                <span style={{ fontSize: '0.68rem', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '0.15rem 0.45rem', borderRadius: '4px', fontWeight: 700 }}>
                  {allTagsList.length} {allTagsList.length === 1 ? 'tag' : 'tags'}
                </span>
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', margin: 0 }}>
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
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            padding: '0.9rem 1.1rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.85rem'
          }}>
            <Sparkles size={18} color="#f59e0b" style={{ flexShrink: 0, marginTop: '0.15rem' }} />
            <div style={{ fontSize: '0.8rem', color: '#cbd5e1', lineHeight: '1.45' }}>
              <strong style={{ color: '#f8fafc' }}>Como funciona:</strong> Qualquer termo colocado entre colchetes como <code style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>[LINK]</code>, <code style={{ background: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>[DATA]</code> ou <code style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>[CUPOM]</code> em suas mensagens é detectado automaticamente aqui. Você pode associar links ou textos substitutos e aplicar em todas as mensagens com 1 clique!
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

            {/* Filter Pills */}
            <div style={{ display: 'flex', gap: '0.35rem', background: 'rgba(0, 0, 0, 0.3)', padding: '0.2rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              {[
                { id: 'all', label: 'Todas' },
                { id: 'filled', label: 'Preenchidas' },
                { id: 'pending', label: 'Pendentes' }
              ].map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setActiveFilter(f.id)}
                  style={{
                    fontSize: '0.74rem',
                    padding: '0.25rem 0.6rem',
                    borderRadius: '6px',
                    border: 'none',
                    background: activeFilter === f.id ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                    color: activeFilter === f.id ? '#38bdf8' : '#94a3b8',
                    fontWeight: activeFilter === f.id ? 700 : 500,
                    cursor: 'pointer'
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
              style={{ fontSize: '0.76rem', padding: '0.35rem 0.75rem' }}
            >
              <Plus size={13} />
              <span>Nova Tag [ ]</span>
            </button>
          </div>

          {/* New Custom Tag Form (Collapsible) */}
          {showAddCustomTag && (
            <form onSubmit={handleAddNewManualTag} style={{
              background: 'rgba(56, 189, 248, 0.05)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              borderRadius: '8px',
              padding: '0.85rem 1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem'
            }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#38bdf8' }}>Nome da Nova Tag:</span>
              <input
                type="text"
                className="form-control"
                placeholder="Ex: DATA_AULA_1 ou CUPOM_BLACK"
                value={newCustomTagInput}
                onChange={(e) => setNewCustomTagInput(e.target.value)}
                style={{ fontSize: '0.8rem', flex: 1 }}
                autoFocus
              />
              <button
                type="submit"
                className="btn-primary"
                style={{ fontSize: '0.78rem', padding: '0.35rem 0.85rem' }}
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
                <AlertCircle size={28} color="#475569" />
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#94a3b8' }}>
                  {searchTerm ? 'Nenhuma tag encontrada para esta busca.' : 'Nenhuma tag [ ] encontrada nas mensagens.'}
                </span>
                <p style={{ fontSize: '0.78rem', color: '#64748b', maxWidth: '420px', margin: 0 }}>
                  Escreva palavras entre colchetes como <code style={{ color: '#38bdf8' }}>[LINK]</code> ou <code style={{ color: '#fbbf24' }}>[DATA]</code> no texto das suas mensagens ou clique em <strong>"+ Nova Tag [ ]"</strong> para cadastrar antecipadamente.
                </p>
              </div>
            ) : (
              filteredTags.map((tag) => {
                const cleanKey = tag.key;
                const rawKey = tag.rawTag;
                const config = tagValues[rawKey] || tagValues[cleanKey] || { mode: 'text', text: '', linkId: '' };
                const isLinkMode = config.mode === 'link';
                const isExpanded = expandedTagSnippet === cleanKey;
                const hasValue = (isLinkMode && config.linkId) || (!isLinkMode && config.text && config.text.trim());

                return (
                  <div
                    key={cleanKey}
                    style={{
                      background: 'var(--bg-card)',
                      border: `1px solid ${hasValue ? 'rgba(56, 189, 248, 0.35)' : 'var(--border-color)'}`,
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <span style={{
                          background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.15) 0%, rgba(59, 130, 246, 0.25) 100%)',
                          border: '1px solid rgba(56, 189, 248, 0.4)',
                          color: '#38bdf8',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '6px',
                          letterSpacing: '0.5px',
                          fontFamily: 'monospace'
                        }}>
                          {rawKey}
                        </span>

                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                          Presente em <strong style={{ color: '#f8fafc' }}>{tag.messages.length}</strong> {tag.messages.length === 1 ? 'mensagem' : 'mensagens'} ({tag.count}x)
                        </span>

                        {tag.messages.length > 0 && (
                          <button
                            type="button"
                            className="btn-ghost"
                            onClick={() => setExpandedTagSnippet(isExpanded ? null : cleanKey)}
                            style={{ fontSize: '0.72rem', padding: '0.15rem 0.45rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                          >
                            <Eye size={12} />
                            <span>{isExpanded ? 'Ocultar Ocorrências' : 'Ver Ocorrências'}</span>
                            {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                          </button>
                        )}
                      </div>

                      {/* Quick Single-Tag Replace Button */}
                      {hasValue && tag.messages.length > 0 && (
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => handleExecuteBatchReplace(rawKey)}
                          style={{ fontSize: '0.72rem', padding: '0.25rem 0.65rem', color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.3)' }}
                          title={`Substituir ${rawKey} agora em todas as ${tag.messages.length} mensagens`}
                        >
                          <RefreshCw size={12} />
                          <span>Substituir {rawKey} nas {tag.messages.length} msgs</span>
                        </button>
                      )}
                    </div>

                    {/* Value Input Section */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                      {/* Mode Toggle: Link vs Text */}
                      <div style={{ display: 'flex', gap: '0.2rem', background: 'rgba(0, 0, 0, 0.3)', padding: '0.2rem', borderRadius: '6px', border: '1px solid var(--border-color)', flexShrink: 0 }}>
                        <button
                          type="button"
                          style={{
                            fontSize: '0.72rem',
                            padding: '0.25rem 0.55rem',
                            borderRadius: '4px',
                            border: 'none',
                            background: isLinkMode ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
                            color: isLinkMode ? '#38bdf8' : '#94a3b8',
                            fontWeight: isLinkMode ? 700 : 500,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem'
                          }}
                          onClick={() => handleTagValueChange(rawKey, { mode: 'link' })}
                        >
                          <LinkIcon size={12} /> Link
                        </button>
                        <button
                          type="button"
                          style={{
                            fontSize: '0.72rem',
                            padding: '0.25rem 0.55rem',
                            borderRadius: '4px',
                            border: 'none',
                            background: !isLinkMode ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
                            color: !isLinkMode ? '#38bdf8' : '#94a3b8',
                            fontWeight: !isLinkMode ? 700 : 500,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem'
                          }}
                          onClick={() => handleTagValueChange(rawKey, { mode: 'text', linkId: null })}
                        >
                          <FileText size={12} /> Texto
                        </button>
                      </div>

                      {/* Link Selector or Text Input */}
                      {isLinkMode ? (
                        <div style={{ flex: 1, minWidth: '240px', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <select
                            className="form-control"
                            style={{ flex: 1, fontSize: '0.8rem', padding: '0.4rem 0.65rem' }}
                            value={config.linkId || ''}
                            onChange={(e) => {
                              const lnkId = e.target.value;
                              const found = predefinedLinks.find(l => l.id === lnkId);
                              handleTagValueChange(rawKey, { mode: 'link', linkId: lnkId, text: found ? found.url : '' });
                            }}
                          >
                            <option value="">-- Selecionar Link da Campanha --</option>
                            {predefinedLinks.map(lnk => (
                              <option key={lnk.id} value={lnk.id} style={{ background: '#161b26' }}>
                                🔗 {lnk.label} ({lnk.url})
                              </option>
                            ))}
                          </select>

                          {onOpenLinksModal && (
                            <button
                              type="button"
                              className="btn-ghost"
                              onClick={() => onOpenLinksModal(campaign)}
                              style={{ fontSize: '0.74rem', padding: '0.35rem 0.55rem', color: '#f59e0b', flexShrink: 0 }}
                              title="Gerenciar lista de links da campanha"
                            >
                              + Links
                            </button>
                          )}
                        </div>
                      ) : (
                        <div style={{ flex: 1, minWidth: '240px' }}>
                          <input
                            type="text"
                            className="form-control"
                            placeholder={`Digite o valor substituto para ${rawKey} (ex: 15 de Outubro às 20h, CUPOM40, etc.)...`}
                            value={config.text || ''}
                            onChange={(e) => handleTagValueChange(rawKey, { mode: 'text', text: e.target.value })}
                            style={{ width: '100%', fontSize: '0.8rem', padding: '0.4rem 0.65rem' }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Expandable Snippets List (Where this tag is used) */}
                    {isExpanded && tag.messages.length > 0 && (
                      <div style={{
                        marginTop: '0.35rem',
                        background: 'rgba(0, 0, 0, 0.4)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '8px',
                        padding: '0.75rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.6rem'
                      }}>
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>
                          Ocorrências nas Mensagens ({tag.messages.length}):
                        </span>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: '180px', overflowY: 'auto' }}>
                          {tag.messages.map(m => (
                            <div
                              key={m.id}
                              style={{
                                background: 'rgba(255, 255, 255, 0.02)',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: '6px',
                                padding: '0.45rem 0.65rem',
                                fontSize: '0.76rem'
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                                <strong style={{ color: '#f8fafc' }}>{m.title}</strong>
                                <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{m.channel} • {m.scheduledDate || 'Sem data'}</span>
                              </div>
                              <p style={{ color: '#cbd5e1', margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '0.74rem' }}>
                                {m.copySnippet.length > 150 ? m.copySnippet.substring(0, 150) + '...' : m.copySnippet}
                              </p>
                            </div>
                          ))}
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
          <button
            type="button"
            className="btn-ghost"
            onClick={onClose}
            style={{ fontSize: '0.82rem' }}
          >
            Fechar
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Salvar Mapeamento Dinâmico */}
            <button
              type="button"
              className="btn-secondary"
              onClick={handleSaveDynamicMapping}
              style={{ fontSize: '0.8rem', padding: '0.45rem 0.95rem' }}
              title="Salva as tags na campanha para substituir dinamicamente nos simuladores e fluxos"
            >
              <Check size={14} />
              <span>Salvar Mapeamento</span>
            </button>

            {/* Substituir em Todas as Mensagens */}
            <button
              type="button"
              className="btn-primary"
              onClick={() => setConfirmBatchModal(true)}
              style={{
                fontSize: '0.8rem',
                padding: '0.45rem 1.1rem',
                background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                boxShadow: '0 0 15px rgba(2, 132, 199, 0.35)'
              }}
              title="Substitui os textos diretamente nas mensagens da campanha"
            >
              <Sparkles size={14} />
              <span>Substituir em Todas as Mensagens</span>
            </button>
          </div>
        </div>

        {/* Confirmation Modal for Batch Replace */}
        {confirmBatchModal && (
          <div className="modal-overlay" style={{ zIndex: 1000 }} onClick={() => setConfirmBatchModal(false)}>
            <div
              className="modal-content"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '500px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}>
                  <AlertCircle size={20} />
                </div>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', margin: 0 }}>
                  Confirmar Substituição em Massa
                </h4>
              </div>

              <p style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: '1.5', margin: 0 }}>
                Tem certeza de que deseja substituir diretamente os termos <code style={{ color: '#38bdf8' }}>[...]</code> preenchidos nos textos das mensagens desta campanha?
                <br /><br />
                Essa ação atualizará a copy de todas as mensagens do fluxo com os novos links e textos definidos.
              </p>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setConfirmBatchModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => handleExecuteBatchReplace(null)}
                  disabled={isApplying}
                  style={{ background: '#0284c7' }}
                >
                  {isApplying ? 'Aplicando...' : 'Sim, Substituir Agora'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
