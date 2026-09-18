import React, { useState } from 'react';
import {
  FolderKanban,
  Plus,
  Calendar,
  Send,
  Link as LinkIcon,
  ExternalLink,
  ArrowRight,
  Settings,
  Trash2,
  Sparkles,
  Layers,
  X,
  Smartphone,
  Mail,
  FileSpreadsheet,
  UploadCloud,
  Edit3,
  Pencil,
  Check
} from 'lucide-react';
import { YouTubeIcon } from './ChannelPreview';
import ImportCsvModal from './ImportCsvModal';
import EditCampaignModal, { CAMPAIGN_COLORS } from './EditCampaignModal';

export default function CampaignsManager({
  campaigns,
  onSelectCampaign,
  onAddNewCampaign,
  onUpdateCampaign,
  onDeleteCampaign,
  onOpenLinksModal,
  onUpdateCampaignLinks
}) {
  const [isCreating, setIsCreating] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState('');
  const [newCampaignTagline, setNewCampaignTagline] = useState('');
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [newBadgeColor, setNewBadgeColor] = useState('#facc15');

  // Initial links for the new campaign
  const [initialLinks, setInitialLinks] = useState([
    { label: 'Link Principal (Checkout / Inscrição)', url: 'https://' }
  ]);

  const handleAddLinkInput = () => {
    setInitialLinks(prev => [...prev, { label: '', url: 'https://' }]);
  };

  const handleLinkChange = (index, field, value) => {
    setInitialLinks(prev => {
      const copy = [...prev];
      copy[index][field] = value;
      return copy;
    });
  };

  const handleRemoveLinkInput = (index) => {
    setInitialLinks(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmitNewCampaign = (e) => {
    e.preventDefault();
    if (!newCampaignName.trim()) return;

    const formattedLinks = initialLinks
      .filter(l => l.label.trim() && l.url.trim() && l.url !== 'https://')
      .map((l, i) => ({
        id: `lnk-${Date.now()}-${i}`,
        label: l.label.trim(),
        url: l.url.trim()
      }));

    const newCamp = {
      id: `camp-${Date.now()}`,
      name: newCampaignName.trim(),
      tagline: newCampaignTagline.trim() || 'Fluxo Estratégico de Disparos',
      status: 'Ativa',
      badgeColor: newBadgeColor || '#facc15',
      startDate: newStartDate || new Date().toISOString().split('T')[0],
      endDate: newEndDate || '',
      predefinedLinks: formattedLinks,
      messages: []
    };

    onAddNewCampaign(newCamp);
    setIsCreating(false);
    setNewCampaignName('');
    setNewCampaignTagline('');
    setNewStartDate('');
    setNewEndDate('');
    setNewBadgeColor('#facc15');
    setInitialLinks([{ label: 'Link Principal (Checkout / Inscrição)', url: 'https://' }]);
  };

  const handleCsvImported = async (importedCampaign) => {
    await onAddNewCampaign(importedCampaign);
    setIsImportModalOpen(false);
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1350px', margin: '0 auto' }}>
      {/* Page Title & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
        <div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Brabo Concursos • Gestão Estratégica
          </span>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.15rem' }}>
            <FolderKanban size={22} color="var(--accent-primary)" />
            Campanhas & Fluxos de Disparo
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Selecione uma campanha ou importe uma tabela CSV completa do Airtable com todas as linhas e colunas.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setIsImportModalOpen(true)}
            style={{ 
              padding: '0.55rem 1rem', 
              fontSize: '0.85rem', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.45rem',
              color: '#38bdf8',
              borderColor: 'rgba(56, 189, 248, 0.3)',
              background: 'rgba(56, 189, 248, 0.08)'
            }}
            title="Importar planilha exportada do Airtable em CSV"
          >
            <FileSpreadsheet size={16} />
            <span>Importar CSV do Airtable</span>
          </button>

          <button
            className="btn-primary"
            onClick={() => setIsCreating(true)}
            style={{ padding: '0.55rem 1rem', fontSize: '0.85rem' }}
          >
            <Plus size={16} strokeWidth={2} />
            <span>Nova Campanha</span>
          </button>
        </div>
      </div>

      {/* Empty State when no campaigns in database */}
      {campaigns.length === 0 ? (
        <div style={{
          background: 'var(--bg-card)',
          border: '1px dashed var(--border-color)',
          borderRadius: '12px',
          padding: '3.5rem 2rem',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          maxWidth: '620px',
          margin: '2rem auto'
        }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'rgba(59, 130, 246, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-primary)'
          }}>
            <FolderKanban size={30} />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>
            Nenhuma campanha cadastrada no Supabase
          </h3>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', maxWidth: '440px', lineHeight: 1.5 }}>
            Você pode importar uma planilha do Airtable em CSV (todas as linhas e colunas serão criadas automaticamente) ou cadastrar manualmente.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              className="btn-primary"
              onClick={() => setIsImportModalOpen(true)}
              style={{ padding: '0.65rem 1.25rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <FileSpreadsheet size={16} />
              <span>Importar CSV do Airtable</span>
            </button>

            <button
              className="btn-secondary"
              onClick={() => setIsCreating(true)}
              style={{ padding: '0.65rem 1.25rem', fontSize: '0.9rem' }}
            >
              <Plus size={16} strokeWidth={2} />
              <span>Criar Manualmente</span>
            </button>
          </div>
        </div>
      ) : (
        /* Grid of Campaign Cards */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '1.25rem' }}>
          {campaigns.map(campaign => {
          const allMsgs = campaign.messages || [];
          const waMsgs = allMsgs.filter(m => m.channel !== 'Email' && m.channel !== 'Comunidade YouTube');
          const emailMsgs = allMsgs.filter(m => m.channel === 'Email');
          const ytMsgs = allMsgs.filter(m => m.channel === 'Comunidade YouTube');
          const linksCount = campaign.predefinedLinks ? campaign.predefinedLinks.length : 0;

          return (
            <div
              key={campaign.id}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.9rem',
                transition: 'all 0.2s ease',
                boxShadow: 'var(--shadow-sm)',
                position: 'relative'
              }}
            >
              {/* Top Meta info */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{
                    fontSize: '0.72rem',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '4px',
                    fontWeight: 600,
                    background: campaign.status === 'Programada' ? 'rgba(56, 189, 248, 0.12)' :
                                campaign.status === 'Pausada' ? 'rgba(245, 158, 11, 0.12)' :
                                campaign.status === 'Concluída' ? 'rgba(148, 163, 184, 0.12)' :
                                campaign.status === 'Arquivada' ? 'rgba(100, 116, 139, 0.12)' :
                                'rgba(34, 197, 94, 0.12)',
                    color: campaign.status === 'Programada' ? '#38bdf8' :
                           campaign.status === 'Pausada' ? '#f59e0b' :
                           campaign.status === 'Concluída' ? '#94a3b8' :
                           campaign.status === 'Arquivada' ? '#64748b' :
                           '#22c55e',
                    border: campaign.status === 'Programada' ? '1px solid rgba(56, 189, 248, 0.25)' :
                            campaign.status === 'Pausada' ? '1px solid rgba(245, 158, 11, 0.25)' :
                            campaign.status === 'Concluída' ? '1px solid rgba(148, 163, 184, 0.25)' :
                            campaign.status === 'Arquivada' ? '1px solid rgba(100, 116, 139, 0.25)' :
                            '1px solid rgba(34, 197, 94, 0.25)'
                  }}>
                    {campaign.status || 'Ativa'}
                  </span>

                  {(campaign.startDate || campaign.endDate) && (
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Calendar size={11} />
                      {campaign.startDate ? campaign.startDate.split('-').reverse().slice(0, 2).join('/') : ''}
                      {campaign.endDate ? ` até ${campaign.endDate.split('-').reverse().slice(0, 2).join('/')}` : ''}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  <button
                    className="btn-ghost"
                    style={{ padding: '0.3rem', color: '#38bdf8' }}
                    onClick={() => {
                      setEditingCampaign(campaign);
                      setIsEditModalOpen(true);
                    }}
                    title="Editar Nome, Datas, Status e Links da Campanha"
                  >
                    <Edit3 size={15} />
                  </button>

                  <button
                    className="btn-ghost"
                    style={{ padding: '0.3rem', color: '#94a3b8' }}
                    onClick={() => onOpenLinksModal(campaign)}
                    title="Configurar Links Predefinidos desta Campanha"
                  >
                    <LinkIcon size={15} />
                  </button>

                  <button
                    className="btn-ghost"
                    style={{ padding: '0.3rem', color: '#ef4444' }}
                    onClick={() => {
                      if (window.confirm(`Excluir a campanha "${campaign.name}" e todas as suas mensagens?`)) {
                        onDeleteCampaign(campaign.id);
                      }
                    }}
                    title="Excluir Campanha"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {/* Title & Tagline */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h3
                    style={{
                      fontSize: '1.2rem',
                      fontWeight: 700,
                      color: campaign.badgeColor || '#fff',
                      cursor: 'pointer',
                      letterSpacing: '-0.01em',
                      transition: 'opacity 0.15s ease'
                    }}
                    onClick={() => onSelectCampaign(campaign, 'whatsapp')}
                    title={`Abrir ${campaign.name}`}
                  >
                    {campaign.name}
                  </h3>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  {campaign.tagline}
                </p>
              </div>

              {/* Separated Flows Selection Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.03em' }}>
                  Escolha o Fluxo de Disparos:
                </span>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.4rem' }}>
                  {/* WhatsApp Flow Button */}
                  <button
                    type="button"
                    onClick={() => onSelectCampaign(campaign, 'whatsapp')}
                    style={{
                      background: 'rgba(37, 211, 102, 0.08)',
                      border: '1px solid rgba(37, 211, 102, 0.25)',
                      borderRadius: '6px',
                      padding: '0.5rem 0.4rem',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.2rem',
                      cursor: 'pointer',
                      transition: 'var(--transition-fast)'
                    }}
                    title="Abrir fluxo de mensagens do WhatsApp"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#4ade80', fontSize: '0.74rem', fontWeight: 600 }}>
                      <Smartphone size={13} />
                      <span>WhatsApp</span>
                    </div>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                      {waMsgs.length} {waMsgs.length === 1 ? 'disparo' : 'disparos'}
                    </span>
                  </button>

                  {/* Email Flow Button */}
                  <button
                    type="button"
                    onClick={() => onSelectCampaign(campaign, 'email')}
                    style={{
                      background: 'rgba(167, 139, 250, 0.08)',
                      border: '1px solid rgba(167, 139, 250, 0.25)',
                      borderRadius: '6px',
                      padding: '0.5rem 0.4rem',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.2rem',
                      cursor: 'pointer',
                      transition: 'var(--transition-fast)'
                    }}
                    title="Abrir fluxo de emails"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#c084fc', fontSize: '0.74rem', fontWeight: 600 }}>
                      <Mail size={13} />
                      <span>Email</span>
                    </div>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                      {emailMsgs.length} {emailMsgs.length === 1 ? 'email' : 'emails'}
                    </span>
                  </button>

                  {/* YouTube Flow Button */}
                  <button
                    type="button"
                    onClick={() => onSelectCampaign(campaign, 'youtube')}
                    style={{
                      background: 'rgba(239, 68, 68, 0.08)',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      borderRadius: '6px',
                      padding: '0.5rem 0.4rem',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.2rem',
                      cursor: 'pointer',
                      transition: 'var(--transition-fast)'
                    }}
                    title="Abrir fluxo de comunidade do YouTube"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#f87171', fontSize: '0.74rem', fontWeight: 600 }}>
                      <YouTubeIcon size={13} color="#f87171" />
                      <span>YouTube</span>
                    </div>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                      {ytMsgs.length} {ytMsgs.length === 1 ? 'post' : 'posts'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Bottom Quick Links Preview & All Flows Link */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {linksCount} {linksCount === 1 ? 'link pré-definido' : 'links pré-definidos'}
                </span>

                <button
                  type="button"
                  onClick={() => onSelectCampaign(campaign, 'all')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--accent-primary)',
                    fontSize: '0.76rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.2rem'
                  }}
                >
                  <span>Ver todos ({allMsgs.length})</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* Modal / Overlay to Create New Campaign */}
      {isCreating && (
        <div className="modal-overlay" onClick={() => setIsCreating(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '650px', height: 'auto', maxHeight: '90vh' }}
          >
            <div className="modal-header">
              <div>
                <span style={{ fontSize: '0.72rem', color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase' }}>
                  Brabo Concursos • Nova Campanha
                </span>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>
                  Criar Campanha e Definir Links Oficiais
                </h3>
              </div>
              <button className="btn-ghost" onClick={() => setIsCreating(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitNewCampaign} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', overflowY: 'auto' }}>
              {/* Shortcut to Import from Airtable */}
              <div 
                onClick={() => { setIsCreating(false); setIsImportModalOpen(true); }}
                style={{
                  background: 'rgba(56, 189, 248, 0.08)',
                  border: '1px dashed rgba(56, 189, 248, 0.3)',
                  borderRadius: '8px',
                  padding: '0.75rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  transition: 'var(--transition-fast)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <FileSpreadsheet size={18} color="#38bdf8" />
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#38bdf8' }}>Prefere importar do Airtable?</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Suba o arquivo .csv e criaremos todas as linhas e colunas 100% automático.</div>
                  </div>
                </div>
                <ArrowRight size={14} color="#38bdf8" />
              </div>

              <div className="form-group">
                <label className="form-label">Nome da Campanha *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ex: Lançamento Polícia Rodoviária Federal - Turma Elite 2026"
                  value={newCampaignName}
                  onChange={(e) => setNewCampaignName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Objetivo / Tagline</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ex: Aquecimento e Abertura de Matrículas com 40% OFF"
                  value={newCampaignTagline}
                  onChange={(e) => setNewCampaignTagline(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Data Início</label>
                  <input
                    type="date"
                    className="form-control"
                    value={newStartDate}
                    onChange={(e) => setNewStartDate(e.target.value)}
                    style={{ colorScheme: 'dark' }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Data Término</label>
                  <input
                    type="date"
                    className="form-control"
                    value={newEndDate}
                    onChange={(e) => setNewEndDate(e.target.value)}
                    style={{ colorScheme: 'dark' }}
                  />
                </div>
              </div>

              {/* Color Picker for Campaign Name */}
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Cor do Nome da Campanha</span>
                  <span style={{ fontSize: '0.74rem', color: newBadgeColor, fontWeight: 700 }}>
                    {CAMPAIGN_COLORS.find(c => c.hex === newBadgeColor)?.label || 'Personalizado'}
                  </span>
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
                  {CAMPAIGN_COLORS.map(c => (
                    <div
                      key={c.hex}
                      onClick={() => setNewBadgeColor(c.hex)}
                      title={c.label}
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        backgroundColor: c.hex,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: newBadgeColor === c.hex ? '2px solid #fff' : '2px solid transparent',
                        transform: newBadgeColor === c.hex ? 'scale(1.2)' : 'scale(1)',
                        boxShadow: newBadgeColor === c.hex ? `0 0 10px ${c.hex}80` : 'none',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {newBadgeColor === c.hex && <Check size={13} color="#000" strokeWidth={3} />}
                    </div>
                  ))}
                </div>
              </div>

              {/* Predefined Links Section */}
              <div style={{
                background: 'var(--bg-sidebar)',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase' }}>
                      Links de Ação Predefinidos da Campanha
                    </span>
                    <p style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                      Insira os links que serão usados nas copies (checkout, grupo VIP, simulado). Ao criar mensagens, basta selecioná-los.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={handleAddLinkInput}
                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                  >
                    <Plus size={13} />
                    <span>+ Link</span>
                  </button>
                </div>

                {initialLinks.map((lnk, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr auto', gap: '0.5rem', alignItems: 'center' }}>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Nome (Ex: Checkout 40%)"
                      value={lnk.label}
                      onChange={(e) => handleLinkChange(idx, 'label', e.target.value)}
                      style={{ fontSize: '0.78rem' }}
                    />
                    <input
                      type="text"
                      className="form-control"
                      placeholder="https://..."
                      value={lnk.url}
                      onChange={(e) => handleLinkChange(idx, 'url', e.target.value)}
                      style={{ fontSize: '0.78rem' }}
                    />
                    {initialLinks.length > 1 && (
                      <button
                        type="button"
                        className="btn-ghost"
                        style={{ color: '#ef4444', padding: '0.3rem' }}
                        onClick={() => handleRemoveLinkInput(idx)}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsCreating(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={!newCampaignName.trim()}
                >
                  <Plus size={15} />
                  <span>Criar Campanha</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Airtable CSV Import Modal */}
      <ImportCsvModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportCampaign={handleCsvImported}
      />

      {/* Edit Campaign Modal */}
      <EditCampaignModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingCampaign(null);
        }}
        campaign={editingCampaign}
        onUpdateCampaign={onUpdateCampaign}
        onUpdateLinks={onUpdateCampaignLinks}
      />
    </div>
  );
}
