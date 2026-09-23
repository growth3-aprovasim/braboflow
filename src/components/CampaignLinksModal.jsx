import React, { useState } from 'react';
import { X, Plus, Trash2, Link as LinkIcon, ExternalLink, Check } from 'lucide-react';

export default function CampaignLinksModal({
  isOpen,
  onClose,
  campaign,
  onUpdateCampaignLinks
}) {
  const [links, setLinks] = useState(campaign?.predefinedLinks || []);
  const [newLabel, setNewLabel] = useState('');
  const [newUrl, setNewUrl] = useState('');

  if (!isOpen || !campaign) return null;

  const handleAddLink = (e) => {
    e.preventDefault();
    if (!newLabel.trim() || !newUrl.trim()) return;

    let formattedUrl = newUrl.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = 'https://' + formattedUrl;
    }

    const updated = [
      ...links,
      {
        id: `lnk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        label: newLabel.trim(),
        url: formattedUrl
      }
    ];

    setLinks(updated);
    onUpdateCampaignLinks(campaign.id, updated);
    setNewLabel('');
    setNewUrl('');
  };

  const handleRemoveLink = (linkId) => {
    const updated = links.filter(l => l.id !== linkId);
    setLinks(updated);
    onUpdateCampaignLinks(campaign.id, updated);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '650px', height: 'auto', maxHeight: '85vh' }}
      >
        <div className="modal-header">
          <div>
            <span style={{ fontSize: '0.72rem', color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase' }}>
              Links Predefinidos da Campanha
            </span>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
              {campaign.name}
            </h3>
          </div>
          <button className="btn-ghost" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', overflowY: 'auto' }}>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
            Cadastre aqui todos os links de checkout, grupos, simulados e aulas desta campanha. Nas mensagens de disparo, você só precisará selecionar o link desejado sem precisar redigitar ou copiar/colar.
          </p>

          {/* Existing Links List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {links.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', border: '1px dashed #232b3a', borderRadius: '8px', color: '#64748b', fontSize: '0.8rem' }}>
                Nenhum link pré-definido cadastrado ainda para esta campanha.
              </div>
            ) : (
              links.map(lnk => (
                <div 
                  key={lnk.id}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '0.75rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', overflow: 'hidden' }}>
                    <div style={{ color: '#f59e0b' }}>
                      <LinkIcon size={16} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>
                        {lnk.label}
                      </span>
                      <a 
                        href={lnk.url} 
                        target="_blank" 
                        rel="noreferrer"
                        style={{ fontSize: '0.72rem', color: '#60a5fa', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                      >
                        {lnk.url} <ExternalLink size={10} />
                      </a>
                    </div>
                  </div>

                  <button
                    className="btn-ghost"
                    style={{ color: '#ef4444', padding: '0.35rem' }}
                    onClick={() => handleRemoveLink(lnk.id)}
                    title="Excluir este link da campanha"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Add New Link Form */}
          <form onSubmit={handleAddLink} style={{ 
            background: 'var(--bg-sidebar)', 
            border: '1px solid var(--border-color)', 
            borderRadius: '10px', 
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
          }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase' }}>
              + Adicionar Novo Link à Campanha
            </span>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '0.5rem' }}>
              <input
                type="text"
                className="form-control"
                placeholder="Ex: Checkout Kiwify 40% OFF"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                style={{ fontSize: '0.8rem' }}
              />
              <input
                type="text"
                className="form-control"
                placeholder="https://..."
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                style={{ fontSize: '0.8rem' }}
              />
            </div>

            <button 
              type="submit" 
              className="btn-primary" 
              style={{ alignSelf: 'flex-end', fontSize: '0.78rem' }}
              disabled={!newLabel.trim() || !newUrl.trim()}
            >
              <Plus size={14} />
              <span>Salvar Link na Campanha</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
