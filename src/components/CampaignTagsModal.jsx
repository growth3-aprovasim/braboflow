import React, { useState, useMemo, useEffect } from 'react';
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
  RefreshCw,
  Maximize2,
  Minimize2,
  Calendar,
  Smartphone,
  Mail,
  ArrowRight,
  Zap
} from 'lucide-react';
import { extractAllCampaignBracketTags } from '../data/initialData';
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

export default function CampaignTagsModal({
  isOpen,
  onClose,
  campaign,
  onUpdateCampaignPlaceholders,
  onBatchReplaceTags,
  onUpdateCampaignLinks,
  initialTab = 'tags'
}) {
  // Navigation Tabs: 'tags' | 'links'
  const [activeTab, setActiveTab] = useState(initialTab || 'tags');

  // Sync tab whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab || 'tags');
    }
  }, [isOpen, initialTab]);

  // Tags filter and search
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'filled' | 'pending'
  const [expandedTagSnippet, setExpandedTagSnippet] = useState(null);
  const [expandedMessageIds, setExpandedMessageIds] = useState({});
  const [copiedMsgId, setCopiedMsgId] = useState(null);

  const [newCustomTagInput, setNewCustomTagInput] = useState('');
  const [showAddCustomTag, setShowAddCustomTag] = useState(false);
  const [successToast, setSuccessToast] = useState(null);
  const [isApplying, setIsApplying] = useState(false);
  const [confirmBatchModal, setConfirmBatchModal] = useState(false);

  // Helper to normalize placeholders ensuring text is populated from any legacy linkId
  const normalizePlaceholders = (placeholders, predefined = []) => {
    if (!placeholders) return {};
    const normalized = {};
    Object.entries(placeholders).forEach(([k, v]) => {
      let text = v?.text || '';
      if (!text && v?.mode === 'link' && v?.linkId) {
        const found = predefined.find(l => l.id === v.linkId);
        if (found) text = found.url;
      }
      normalized[k] = { mode: 'text', text };
    });
    return normalized;
  };

  // Local state for placeholder values (exclusively text/links as direct text)
  const [tagValues, setTagValues] = useState(() => {
    return normalizePlaceholders(campaign?.customPlaceholders, campaign?.predefinedLinks || []);
  });

  useEffect(() => {
    if (campaign?.customPlaceholders) {
      setTagValues(normalizePlaceholders(campaign.customPlaceholders, campaign?.predefinedLinks || []));
    }
  }, [campaign?.customPlaceholders, campaign?.predefinedLinks]);

  // Links state for Links Tab (Clean, without {{}})
  const [links, setLinks] = useState(() => {
    return (campaign?.predefinedLinks || []).map((l, idx) => ({
      ...l,
      label: l.label || `Link ${idx + 1}`
    }));
  });

  const [newLinkLabel, setNewLinkLabel] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [copiedLinkId, setCopiedLinkId] = useState(null);

  useEffect(() => {
    if (campaign?.predefinedLinks) {
      setLinks(campaign.predefinedLinks.map((l, idx) => ({
        ...l,
        label: l.label || `Link ${idx + 1}`
      })));
    }
  }, [campaign?.predefinedLinks]);

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

  const predefinedLinks = links || [];

  if (!isOpen || !campaign) return null;

  // Filter tags based on search and status
  const filteredTags = allTagsList.filter(tag => {
    const matchesSearch = tag.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          tag.rawTag.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    const currentVal = tagValues[tag.rawTag] || tagValues[tag.key] || {};
    const hasValue = !!(currentVal.text && currentVal.text.trim());

    if (activeFilter === 'filled') return hasValue;
    if (activeFilter === 'pending') return !hasValue;
    return true;
  });

  const handleTagValueChange = (tagKey, updates) => {
    setTagValues(prev => {
      const cleanKey = tagKey.replace(/^\[/, '').replace(/\]$/, '').trim();
      const rawKey = `[${cleanKey}]`;
      const current = prev[rawKey] || prev[cleanKey] || { mode: 'text', text: '' };
      const updatedConfig = { ...current, ...updates, mode: 'text' };

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

  const handleCopyMessage = (text, id) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedMsgId(id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  // LINKS TAB LOGIC (Without {{}})
  const handleAddLink = (e) => {
    e.preventDefault();
    if (!newLinkUrl.trim()) return;

    let formattedUrl = newLinkUrl.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = 'https://' + formattedUrl;
    }

    const assignedLabel = newLinkLabel.trim() || `Link ${links.length + 1}`;

    const newLinkItem = {
      id: `lnk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      label: assignedLabel,
      url: formattedUrl
    };

    const updated = [...links, newLinkItem];
    setLinks(updated);
    if (onUpdateCampaignLinks) {
      onUpdateCampaignLinks(campaign.id, updated);
    }

    setNewLinkLabel('');
    setNewLinkUrl('');
    setSuccessToast(`Link "${assignedLabel}" adicionado à campanha!`);
    setTimeout(() => setSuccessToast(null), 2500);
  };

  const handleUpdateLinkInline = (linkId, field, value) => {
    const updated = links.map(l => {
      if (l.id === linkId) {
        return { ...l, [field]: value };
      }
      return l;
    });
    setLinks(updated);
    if (onUpdateCampaignLinks) {
      onUpdateCampaignLinks(campaign.id, updated);
    }
  };

  const handleRemoveLink = (linkId) => {
    const target = links.find(l => l.id === linkId);
    if (!window.confirm(`Remover o link "${target?.label || 'Link'}" da campanha?`)) return;
    const updated = links.filter(l => l.id !== linkId);
    setLinks(updated);
    if (onUpdateCampaignLinks) {
      onUpdateCampaignLinks(campaign.id, updated);
    }
    setSuccessToast('Link removido com sucesso!');
    setTimeout(() => setSuccessToast(null), 2500);
  };

  const handleCopyLinkUrl = (url, id) => {
    navigator.clipboard.writeText(url);
    setCopiedLinkId(id);
    setTimeout(() => setCopiedLinkId(null), 2000);
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
              color: '#fbbf24',
              transition: 'all 0.2s ease'
            }}>
              {activeTab === 'tags' ? <Edit3 size={20} /> : <LinkIcon size={20} />}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.72rem', color: '#fbbf24', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Central de Tags & Links da Campanha
                </span>
                <span style={{ fontSize: '0.68rem', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', padding: '0.15rem 0.45rem', borderRadius: '4px', fontWeight: 700 }}>
                  {allTagsList.length} tags • {predefinedLinks.length} links
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

        {/* Unified Tab Switcher Navigation */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          padding: '0.65rem 1.5rem',
          background: 'rgba(0, 0, 0, 0.25)',
          borderBottom: '1px solid var(--border-color)'
        }}>
          {/* Tab 1: Tags [ ] */}
          <button
            type="button"
            onClick={() => setActiveTab('tags')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.45rem 1rem',
              borderRadius: '8px',
              border: activeTab === 'tags' ? '1px solid rgba(245, 158, 11, 0.5)' : '1px solid transparent',
              background: activeTab === 'tags' ? 'rgba(245, 158, 11, 0.16)' : 'transparent',
              color: activeTab === 'tags' ? '#fbbf24' : '#94a3b8',
              fontWeight: activeTab === 'tags' ? 700 : 500,
              fontSize: '0.82rem',
              cursor: 'pointer',
              transition: 'all 0.18s ease'
            }}
            id="tab-btn-tags"
          >
            <Edit3 size={14} />
            <span>Tags [ ]</span>
            <span style={{
              fontSize: '0.68rem',
              background: activeTab === 'tags' ? '#f59e0b' : 'rgba(255, 255, 255, 0.08)',
              color: activeTab === 'tags' ? '#0b1120' : '#cbd5e1',
              fontWeight: 800,
              padding: '0.1rem 0.45rem',
              borderRadius: '10px'
            }}>
              {allTagsList.length}
            </span>
          </button>

          {/* Tab 2: Links da Campanha (Sem {{}}) */}
          <button
            type="button"
            onClick={() => setActiveTab('links')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.45rem 1rem',
              borderRadius: '8px',
              border: activeTab === 'links' ? '1px solid rgba(245, 158, 11, 0.5)' : '1px solid transparent',
              background: activeTab === 'links' ? 'rgba(245, 158, 11, 0.16)' : 'transparent',
              color: activeTab === 'links' ? '#fbbf24' : '#94a3b8',
              fontWeight: activeTab === 'links' ? 700 : 500,
              fontSize: '0.82rem',
              cursor: 'pointer',
              transition: 'all 0.18s ease'
            }}
            id="tab-btn-links"
          >
            <LinkIcon size={14} />
            <span>Links da Campanha</span>
            <span style={{
              fontSize: '0.68rem',
              background: activeTab === 'links' ? '#f59e0b' : 'rgba(255, 255, 255, 0.08)',
              color: activeTab === 'links' ? '#0b1120' : '#cbd5e1',
              fontWeight: 800,
              padding: '0.1rem 0.45rem',
              borderRadius: '10px'
            }}>
              {predefinedLinks.length}
            </span>
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
          
          {/* ==================== TAB 1: TAGS [ ] ==================== */}
          {activeTab === 'tags' && (
            <>
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
                <div style={{ fontSize: '0.8rem', color: '#cbd5e1', lineHeight: '1.45' }}>
                  <strong style={{ color: '#f8fafc' }}>Como funciona:</strong> Qualquer termo colocado entre colchetes como <code style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', padding: '0.1rem 0.35rem', borderRadius: '4px', fontWeight: 700 }}>[LINK]</code>, <code style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', padding: '0.1rem 0.35rem', borderRadius: '4px', fontWeight: 700 }}>[DATA]</code> ou <code style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', padding: '0.1rem 0.35rem', borderRadius: '4px', fontWeight: 700 }}>[CUPOM]</code> em suas mensagens é detectado automaticamente aqui. Preencha seus links e textos diretamente em cada tag, <strong>veja o contexto completo das mensagens</strong> e aplique a substituição em tudo com 1 clique!
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
                        background: activeFilter === f.id ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                        color: activeFilter === f.id ? '#fbbf24' : '#94a3b8',
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
                      {searchTerm ? 'Nenhuma tag encontrada para esta busca.' : 'Nenhuma tag [ ] encontrada nas mensagens.'}
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
                          border: `1px solid ${hasValue ? 'rgba(245, 158, 11, 0.4)' : 'var(--border-color)'}`,
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

                          {/* Quick Single-Tag Replace Button */}
                          {hasValue && tag.messages.length > 0 && (
                            <button
                              type="button"
                              className="btn-secondary"
                              onClick={() => handleExecuteBatchReplace(rawKey)}
                              style={{ fontSize: '0.72rem', padding: '0.25rem 0.65rem', color: '#fbbf24', borderColor: 'rgba(245, 158, 11, 0.35)' }}
                              title={`Substituir ${rawKey} agora em todas as ${tag.messages.length} mensagens`}
                            >
                              <RefreshCw size={12} />
                              <span>Substituir {rawKey} nas {tag.messages.length} msgs</span>
                            </button>
                          )}
                        </div>

                        {/* Value Input Section (Exclusivamente Texto / Link direto) */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', width: '100%' }}>
                          <div style={{ flex: 1 }}>
                            <input
                              type="text"
                              className="form-control"
                              placeholder={`Preencha o link ou texto para ${rawKey} (ex: https://..., 15 de Outubro, CUPOM, etc.)...`}
                              value={config.text || ''}
                              onChange={(e) => handleTagValueChange(rawKey, { mode: 'text', text: e.target.value })}
                              style={{ width: '100%', fontSize: '0.82rem', padding: '0.45rem 0.75rem' }}
                            />
                          </div>
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
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '420px', overflowY: 'auto', paddingRight: '0.2rem' }}>
                              {tag.messages.map(m => {
                                const isMsgExpanded = !!expandedMessageIds[m.id];
                                const fullText = m.copyText || m.copySnippet || '';

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
                                        title={isMsgExpanded ? 'Recolher mensagem' : 'Clique para expandir o texto completo e ver o contexto'}
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
                                        title="Clique para expandir a mensagem e ver o contexto completo"
                                      >
                                        <HighlightedText text={fullText} highlightTag={rawKey} />
                                      </div>
                                    )}

                                    {/* Expanded Full Message Context */}
                                    {isMsgExpanded && (
                                      <div style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '0.5rem',
                                        marginTop: '0.25rem'
                                      }}>
                                        <div style={{
                                          background: 'rgba(0, 0, 0, 0.55)',
                                          border: '1px solid rgba(245, 158, 11, 0.25)',
                                          borderRadius: '6px',
                                          padding: '0.85rem 1rem',
                                          color: '#f1f5f9',
                                          fontSize: '0.82rem',
                                          lineHeight: '1.6',
                                          whiteSpace: 'pre-wrap',
                                          wordBreak: 'break-word',
                                          fontFamily: 'inherit',
                                          maxHeight: '340px',
                                          overflowY: 'auto'
                                        }}>
                                          <HighlightedText text={fullText} highlightTag={rawKey} />
                                        </div>

                                        {/* Actions Bar inside Expanded Message */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                          <button
                                            type="button"
                                            className="btn-ghost"
                                            onClick={() => handleCopyMessage(fullText, m.id)}
                                            style={{
                                              fontSize: '0.72rem',
                                              padding: '0.2rem 0.55rem',
                                              color: copiedMsgId === m.id ? '#4ade80' : '#94a3b8',
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: '0.3rem'
                                            }}
                                            title="Copiar texto completo desta mensagem"
                                          >
                                            {copiedMsgId === m.id ? <CheckCheck size={13} /> : <Copy size={13} />}
                                            <span>{copiedMsgId === m.id ? 'Copiado para Área de Transferência!' : 'Copiar Texto Completo'}</span>
                                          </button>

                                          <button
                                            type="button"
                                            className="btn-ghost"
                                            onClick={() => toggleExpandMessage(m.id)}
                                            style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
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
            </>
          )}

          {/* ==================== TAB 2: LINKS DA CAMPANHA (SEM {{}}) ==================== */}
          {activeTab === 'links' && (
            <>
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
                <div style={{ fontSize: '0.8rem', color: '#cbd5e1', lineHeight: '1.45' }}>
                  <strong style={{ color: '#f8fafc' }}>Links de Destino da Campanha:</strong> Cadastre os links oficiais (ex: Checkout, Grupo VIP, Página de Vendas) para vinculá-los às Tags como <code style={{ color: '#fbbf24', fontWeight: 700 }}>[LINK]</code> ou <code style={{ color: '#fbbf24', fontWeight: 700 }}>[LINK_CHECKOUT]</code> das suas mensagens. Você pode selecionar qualquer link cadastrado diretamente na configuração de cada Tag.
                </div>
              </div>

              {/* Add New Link Form (No {{}} key input needed) */}
              <form onSubmit={handleAddLink} style={{
                background: 'rgba(245, 158, 11, 0.05)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                borderRadius: '10px',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  + Cadastrar Novo Link de Destino
                </span>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr auto', gap: '0.65rem', alignItems: 'center' }}>
                  {/* Label */}
                  <div>
                    <label style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block', marginBottom: '0.2rem' }}>Nome / Rótulo do Link</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Ex: Checkout Black Friday, Grupo VIP"
                      value={newLinkLabel}
                      onChange={(e) => setNewLinkLabel(e.target.value)}
                      style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}
                    />
                  </div>

                  {/* URL */}
                  <div>
                    <label style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block', marginBottom: '0.2rem' }}>URL de Destino</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="https://braboconcursos.com.br/checkout"
                      value={newLinkUrl}
                      onChange={(e) => setNewLinkUrl(e.target.value)}
                      style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}
                    />
                  </div>

                  {/* Submit Button */}
                  <div style={{ alignSelf: 'flex-end' }}>
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={!newLinkUrl.trim()}
                      style={{
                        fontSize: '0.78rem',
                        padding: '0.42rem 1.1rem',
                        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                        border: 'none',
                        color: '#0b1120',
                        fontWeight: 700
                      }}
                    >
                      <Plus size={14} />
                      <span>Adicionar Link</span>
                    </button>
                  </div>
                </div>
              </form>

              {/* Links List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Links Cadastrados nesta Campanha ({predefinedLinks.length})
                </span>

                {predefinedLinks.length === 0 ? (
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
                      Nenhum link cadastrado ainda nesta campanha.
                    </span>
                    <p style={{ fontSize: '0.78rem', color: '#64748b', maxWidth: '420px', margin: 0 }}>
                      Preencha o formulário acima com o nome e o link de destino para utilizá-los nas suas Tags das mensagens.
                    </p>
                  </div>
                ) : (
                  predefinedLinks.map((lnk) => {
                    return (
                      <div
                        key={lnk.id}
                        style={{
                          background: 'var(--bg-card)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '10px',
                          padding: '0.95rem 1.25rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '1rem',
                          flexWrap: 'wrap'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flex: 1, minWidth: '280px' }}>
                          <div style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '8px',
                            background: 'rgba(245, 158, 11, 0.15)',
                            border: '1px solid rgba(245, 158, 11, 0.35)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fbbf24',
                            flexShrink: 0
                          }}>
                            <LinkIcon size={16} />
                          </div>

                          {/* Label & URL Inline inputs */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', flex: 1 }}>
                            <input
                              type="text"
                              className="form-control"
                              value={lnk.label || ''}
                              onChange={(e) => handleUpdateLinkInline(lnk.id, 'label', e.target.value)}
                              style={{ fontSize: '0.85rem', fontWeight: 700, padding: '0.2rem 0.5rem', background: 'transparent', border: '1px solid transparent', color: '#fff' }}
                              onFocus={(e) => e.target.style.borderColor = 'rgba(245, 158, 11, 0.4)'}
                              onBlur={(e) => e.target.style.borderColor = 'transparent'}
                              placeholder="Nome do Link"
                            />
                            <input
                              type="text"
                              className="form-control"
                              value={lnk.url || ''}
                              onChange={(e) => handleUpdateLinkInline(lnk.id, 'url', e.target.value)}
                              style={{ fontSize: '0.78rem', color: '#60a5fa', padding: '0.15rem 0.5rem', background: 'transparent', border: '1px solid transparent' }}
                              onFocus={(e) => e.target.style.borderColor = 'rgba(245, 158, 11, 0.4)'}
                              onBlur={(e) => e.target.style.borderColor = 'transparent'}
                              placeholder="https://..."
                            />
                          </div>
                        </div>

                        {/* Link Actions */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                          {/* Copy URL */}
                          <button
                            type="button"
                            className="btn-ghost"
                            onClick={() => handleCopyLinkUrl(lnk.url, lnk.id)}
                            style={{ padding: '0.35rem 0.6rem', color: copiedLinkId === lnk.id ? '#4ade80' : '#94a3b8', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                            title="Copiar URL para área de transferência"
                          >
                            {copiedLinkId === lnk.id ? <CheckCheck size={14} /> : <Copy size={14} />}
                            <span>{copiedLinkId === lnk.id ? 'Copiado!' : 'Copiar URL'}</span>
                          </button>

                          {/* Test Link Button */}
                          <a
                            href={lnk.url}
                            target="_blank"
                            rel="noreferrer"
                            className="btn-ghost"
                            style={{ padding: '0.35rem 0.55rem', color: '#94a3b8' }}
                            title="Abrir e testar link no navegador"
                          >
                            <ExternalLink size={14} />
                          </a>

                          {/* Delete Link Button */}
                          <button
                            type="button"
                            className="btn-ghost"
                            onClick={() => handleRemoveLink(lnk.id)}
                            style={{ padding: '0.35rem 0.55rem', color: '#ef4444' }}
                            title="Excluir este link"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}

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

          {activeTab === 'tags' ? (
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
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  color: '#0b1120',
                  fontWeight: 700,
                  boxShadow: '0 0 15px rgba(245, 158, 11, 0.35)'
                }}
                title="Substitui os textos diretamente nas mensagens da campanha"
              >
                <Sparkles size={14} />
                <span>Substituir em Todas as Mensagens</span>
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setActiveTab('tags')}
                style={{ fontSize: '0.8rem', padding: '0.45rem 0.95rem', display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#fbbf24', borderColor: 'rgba(245, 158, 11, 0.35)' }}
              >
                <span>Ir para Tags [ ]</span>
                <ArrowRight size={14} />
              </button>
            </div>
          )}
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
                Tem certeza de que deseja substituir diretamente os termos <code style={{ color: '#fbbf24', fontWeight: 700 }}>[...]</code> preenchidos nos textos das mensagens desta campanha?
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
                  style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: '#0b1120', fontWeight: 700 }}
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
