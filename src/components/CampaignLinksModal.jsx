import React, { useState, useMemo } from 'react';
import { X, Plus, Trash2, Link as LinkIcon, ExternalLink, Check, Copy, CheckCheck, Sparkles, AlertCircle } from 'lucide-react';

export default function CampaignLinksModal({
  isOpen,
  onClose,
  campaign,
  onUpdateCampaignLinks
}) {
  const [links, setLinks] = useState(() => {
    return (campaign?.predefinedLinks || []).map((l, idx) => ({
      ...l,
      key: l.key || l.variableKey || String(idx + 1)
    }));
  });

  const [newKey, setNewKey] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [editingLinkId, setEditingLinkId] = useState(null);
  const [editValues, setEditValues] = useState({});

  // Sync if campaign changes
  React.useEffect(() => {
    if (campaign?.predefinedLinks) {
      setLinks(campaign.predefinedLinks.map((l, idx) => ({
        ...l,
        key: l.key || l.variableKey || String(idx + 1)
      })));
    }
  }, [campaign?.predefinedLinks]);

  // Compute next suggested numeric key
  const nextSuggestedKey = useMemo(() => {
    const existingNums = links.map(l => Number(l.key)).filter(n => !isNaN(n) && n > 0);
    if (existingNums.length === 0) return '1';
    return String(Math.max(...existingNums) + 1);
  }, [links]);

  if (!isOpen || !campaign) return null;

  // Count occurrences of each variable {{key}} across campaign messages
  const getOccurrencesCount = (key) => {
    if (!campaign?.messages) return 0;
    const clean = String(key || '').replace(/^\{\{/, '').replace(/\}\}$/, '').trim();
    const pattern = `{{${clean}}}`;
    return campaign.messages.filter(m => m.copyText && m.copyText.includes(pattern)).length;
  };

  const handleAddLink = (e) => {
    e.preventDefault();
    if (!newUrl.trim()) return;

    let formattedUrl = newUrl.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = 'https://' + formattedUrl;
    }

    const assignedKey = newKey.trim() ? newKey.trim().replace(/^\{\{/, '').replace(/\}\}$/, '').trim() : nextSuggestedKey;
    const assignedLabel = newLabel.trim() || `Link {{${assignedKey}}}`;

    const newLinkItem = {
      id: `lnk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      key: assignedKey,
      variableKey: assignedKey,
      label: assignedLabel,
      url: formattedUrl
    };

    const updated = [...links, newLinkItem];
    setLinks(updated);
    onUpdateCampaignLinks(campaign.id, updated);

    setNewKey('');
    setNewLabel('');
    setNewUrl('');
  };

  const handleUpdateLinkInline = (linkId, field, value) => {
    const updated = links.map(l => {
      if (l.id === linkId) {
        return { ...l, [field]: value };
      }
      return l;
    });
    setLinks(updated);
    onUpdateCampaignLinks(campaign.id, updated);
  };

  const handleRemoveLink = (linkId) => {
    const updated = links.filter(l => l.id !== linkId);
    setLinks(updated);
    onUpdateCampaignLinks(campaign.id, updated);
  };

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '780px', width: '95%', height: 'auto', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div className="modal-header" style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}>
              <LinkIcon size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.72rem', color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Links Pré-definidos & Variáveis {'{{ }}'}
                </span>
                <span style={{ fontSize: '0.68rem', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', padding: '0.15rem 0.45rem', borderRadius: '4px', fontWeight: 700 }}>
                  {links.length} {links.length === 1 ? 'link ativo' : 'links ativos'}
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

        {/* Content Body */}
        <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', overflowY: 'auto', flex: 1 }}>
          
          {/* Explanation Banner */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            padding: '0.85rem 1.1rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem'
          }}>
            <Sparkles size={18} color="#f59e0b" style={{ flexShrink: 0, marginTop: '0.15rem' }} />
            <div style={{ fontSize: '0.8rem', color: '#cbd5e1', lineHeight: '1.45' }}>
              <strong style={{ color: '#f8fafc' }}>Substituição Automática Global:</strong> Cadastre as variáveis como <code style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>{'{{1}}'}</code>, <code style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>{'{{2}}'}</code> com seus respectivos links. Todas as mensagens da campanha que contiverem <code style={{ color: '#fbbf24' }}>{'{{1}}'}</code> serão <strong>automaticamente preenchidas com o link definido</strong>, sem precisar selecionar disparo por disparo!
            </div>
          </div>

          {/* Links List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Mapeamento de Links da Campanha ({links.length})
            </span>

            {links.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem', border: '1px dashed #232b3a', borderRadius: '10px', color: '#64748b', fontSize: '0.82rem' }}>
                Nenhuma variável de link pré-definida ainda para esta campanha.
              </div>
            ) : (
              links.map((lnk, idx) => {
                const varKey = lnk.key || lnk.variableKey || String(idx + 1);
                const count = getOccurrencesCount(varKey);

                return (
                  <div 
                    key={lnk.id}
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '10px',
                      padding: '0.85rem 1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.65rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flex: 1, minWidth: '260px' }}>
                        {/* Variable Badge */}
                        <span style={{
                          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(217, 119, 6, 0.3) 100%)',
                          border: '1px solid rgba(245, 158, 11, 0.5)',
                          color: '#fbbf24',
                          fontWeight: 800,
                          fontSize: '0.85rem',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '6px',
                          fontFamily: 'monospace',
                          flexShrink: 0
                        }}>
                          &#123;&#123;{varKey}&#125;&#125;
                        </span>

                        {/* Label Input or Text */}
                        <input
                          type="text"
                          className="form-control"
                          value={lnk.label || ''}
                          onChange={(e) => handleUpdateLinkInline(lnk.id, 'label', e.target.value)}
                          placeholder="Nome / Rótulo do Link..."
                          style={{ fontSize: '0.82rem', fontWeight: 600, color: '#fff', background: 'transparent', border: '1px solid transparent', padding: '0.2rem 0.4rem', flex: 1 }}
                          title="Clique para editar o nome deste link"
                        />

                        {/* Occurrence count badge */}
                        <span style={{ fontSize: '0.72rem', color: count > 0 ? '#4ade80' : '#64748b', background: count > 0 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(255, 255, 255, 0.03)', padding: '0.15rem 0.45rem', borderRadius: '4px', flexShrink: 0 }}>
                          {count > 0 ? `Em ${count} ${count === 1 ? 'mensagem' : 'mensagens'}` : 'Não usado em copies'}
                        </span>
                      </div>

                      {/* Right Action buttons */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <button
                          type="button"
                          className="btn-ghost"
                          onClick={() => handleCopy(lnk.url, lnk.id)}
                          style={{ fontSize: '0.72rem', padding: '0.25rem 0.5rem', color: copiedId === lnk.id ? '#4ade80' : '#94a3b8' }}
                          title="Copiar URL"
                        >
                          {copiedId === lnk.id ? <CheckCheck size={13} /> : <Copy size={13} />}
                        </button>

                        <a
                          href={lnk.url}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-ghost"
                          style={{ fontSize: '0.72rem', padding: '0.25rem 0.5rem', color: '#60a5fa' }}
                          title="Testar e abrir link em nova aba"
                        >
                          <ExternalLink size={13} />
                        </a>

                        <button
                          type="button"
                          className="btn-ghost"
                          style={{ color: '#ef4444', padding: '0.25rem 0.5rem' }}
                          onClick={() => handleRemoveLink(lnk.id)}
                          title="Excluir este link pré-definido"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* URL Input */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8', flexShrink: 0 }}>URL:</span>
                      <input
                        type="text"
                        className="form-control"
                        value={lnk.url || ''}
                        onChange={(e) => handleUpdateLinkInline(lnk.id, 'url', e.target.value)}
                        placeholder="https://..."
                        style={{ fontSize: '0.8rem', color: '#38bdf8', padding: '0.3rem 0.55rem', width: '100%' }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Add New Variable Link Form */}
          <form onSubmit={handleAddLink} style={{ 
            background: 'var(--bg-sidebar)', 
            border: '1px solid var(--border-color)', 
            borderRadius: '10px', 
            padding: '1.15rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Plus size={14} /> Adicionar Nova Variável & Link
              </span>
              <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                Variável sugerida: <strong style={{ color: '#fbbf24' }}>&#123;&#123;{newKey || nextSuggestedKey}&#125;&#125;</strong>
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '90px 1.2fr 2fr', gap: '0.5rem' }}>
              <div>
                <input
                  type="text"
                  className="form-control"
                  placeholder={nextSuggestedKey}
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  style={{ fontSize: '0.8rem', textAlign: 'center', fontWeight: 700, color: '#fbbf24' }}
                  title="Número ou identificador da variável (ex: 1, 2, 3)"
                />
              </div>

              <div>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Nome (Ex: Checkout Kiwify)"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  style={{ fontSize: '0.8rem' }}
                />
              </div>

              <div>
                <input
                  type="text"
                  className="form-control"
                  placeholder="https://pay.kiwify.com.br/..."
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  style={{ fontSize: '0.8rem' }}
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="btn-primary" 
              style={{ alignSelf: 'flex-end', fontSize: '0.78rem', padding: '0.4rem 0.95rem' }}
              disabled={!newUrl.trim()}
            >
              <Plus size={14} />
              <span>Salvar Variável &#123;&#123;{newKey || nextSuggestedKey}&#125;&#125; na Campanha</span>
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="modal-footer" style={{ padding: '0.85rem 1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', background: 'var(--bg-card)' }}>
          <button
            type="button"
            className="btn-primary"
            onClick={onClose}
            style={{ fontSize: '0.82rem' }}
          >
            Concluir e Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
