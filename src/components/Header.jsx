import React, { useState } from 'react';
import logoImg from '../assets/logo.png';
import { 
  Shield, 
  Plus, 
  Download, 
  Upload, 
  RotateCcw, 
  Search, 
  ChevronDown, 
  FolderKanban, 
  Link as LinkIcon,
  Check,
  Database,
  RefreshCw,
  FileSpreadsheet
} from 'lucide-react';

export default function Header({ 
  campaigns,
  activeCampaign,
  onSelectCampaign,
  onOpenCampaignsManager,
  onOpenLinksModal,
  searchQuery, 
  setSearchQuery, 
  onNewMessage, 
  onExportData, 
  onImportData, 
  onResetData,
  onOpenImportCsv,
  supabaseStatus = 'connected'
}) {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showCampaignDropdown, setShowCampaignDropdown] = useState(false);

  return (
    <header className="app-header">
      <div className="brand-section">

        <div className="brand-title-group" onClick={onOpenCampaignsManager} title="Gerenciar Campanhas">
          <img src={logoImg} alt="Logo" className="brand-logo-img" />
          <span className="brand-subtitle">Central de Fluxos & Disparos</span>
        </div>

        {/* Campaign Switcher Dropdown */}
        <div style={{ position: 'relative', marginLeft: '0.5rem' }}>
          <div 
            className="base-switcher"
            onClick={() => setShowCampaignDropdown(!showCampaignDropdown)}
            title="Trocar ou gerenciar campanha ativa"
            id="campaign-switcher-btn"
          >
            <FolderKanban size={14} color="var(--text-secondary)" />
            <span style={{ fontWeight: 600, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {activeCampaign ? activeCampaign.name : 'Todas as Campanhas'}
            </span>
            <ChevronDown size={13} color="var(--text-muted)" />
          </div>

          {showCampaignDropdown && (
            <div className="popover-menu" style={{ left: 0, minWidth: '280px', zIndex: 60 }}>
              <div className="popover-title">Selecionar Campanha</div>
              
              <div 
                className="popover-item"
                style={{ fontWeight: 600, color: 'var(--accent-primary)', borderBottom: '1px solid var(--border-color)', marginBottom: '0.35rem', paddingBottom: '0.5rem' }}
                onClick={() => {
                  onOpenCampaignsManager();
                  setShowCampaignDropdown(false);
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FolderKanban size={14} /> Ver Todas as Campanhas
                </span>
              </div>

              {campaigns.map(camp => (
                <div
                  key={camp.id}
                  className="popover-item"
                  onClick={() => {
                    onSelectCampaign(camp);
                    setShowCampaignDropdown(false);
                  }}
                >
                  <span style={{ 
                    color: activeCampaign?.id === camp.id ? '#ffffff' : 'var(--text-secondary)',
                    fontWeight: activeCampaign?.id === camp.id ? 700 : 500,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {camp.name}
                  </span>
                  {activeCampaign?.id === camp.id && <Check size={14} color="var(--accent-primary)" />}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Campaign Predefined Links Quick Button */}
        {activeCampaign && (
          <button 
            className="btn-ghost"
            style={{ 
              fontSize: '0.76rem', 
              color: 'var(--text-secondary)', 
              background: 'rgba(255, 255, 255, 0.04)', 
              border: '1px solid var(--border-color)',
              padding: '0.25rem 0.55rem'
            }}
            onClick={() => onOpenLinksModal(activeCampaign)}
            title="Ver e cadastrar links pré-definidos desta campanha"
          >
            <LinkIcon size={12} />
            <span>Links ({activeCampaign.predefinedLinks?.length || 0})</span>
          </button>
        )}
      </div>

      <div className="header-center-search">
        <div className="search-input-wrapper">
          <Search size={16} color="#94a3b8" />
          <input
            type="text"
            placeholder="Pesquisar por mensagem, canal ou texto da copy..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.8rem' }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="header-actions">
        {/* Supabase Connection Status Badge */}
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.35rem 0.65rem',
            borderRadius: '6px',
            fontSize: '0.75rem',
            fontWeight: 600,
            background: supabaseStatus === 'connected' ? 'rgba(34, 197, 94, 0.1)' : supabaseStatus === 'syncing' ? 'rgba(56, 189, 248, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${supabaseStatus === 'connected' ? 'rgba(34, 197, 94, 0.25)' : supabaseStatus === 'syncing' ? 'rgba(56, 189, 248, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
            color: supabaseStatus === 'connected' ? '#4ade80' : supabaseStatus === 'syncing' ? '#38bdf8' : '#f87171',
            letterSpacing: '0.2px'
          }}
          title={supabaseStatus === 'connected' ? 'Conectado ao Supabase (bflow_*)' : supabaseStatus === 'syncing' ? 'Sincronizando com Supabase...' : 'Aguardando sincronização com Supabase'}
        >
          {supabaseStatus === 'syncing' ? (
            <RefreshCw size={12} className="spin-animation" />
          ) : (
            <Database size={12} />
          )}
          <span>{supabaseStatus === 'connected' ? 'Supabase' : supabaseStatus === 'syncing' ? 'Sincronizando' : 'Supabase Offline'}</span>
          <span 
            style={{ 
              width: '6px', 
              height: '6px', 
              borderRadius: '50%', 
              backgroundColor: supabaseStatus === 'connected' ? '#22c55e' : supabaseStatus === 'syncing' ? '#38bdf8' : '#ef4444',
              boxShadow: supabaseStatus === 'connected' ? '0 0 6px #22c55e' : 'none'
            }} 
          />
        </div>

        <button 
          className="btn-primary" 
          onClick={onNewMessage}
          id="btn-new-broadcast"
          title="Criar novo disparo de mensagem para esta campanha"
        >
          <Plus size={16} strokeWidth={2.5} />
          <span>Novo Disparo</span>
        </button>

        <div style={{ position: 'relative' }}>
          <button 
            className="btn-secondary"
            onClick={() => setShowExportMenu(!showExportMenu)}
            title="Exportar ou importar dados"
          >
            <Download size={14} />
            <span>Dados</span>
          </button>

          {showExportMenu && (
            <div className="popover-menu" style={{ right: 0, minWidth: '220px' }}>
              <div className="popover-title">Backup & Exportação</div>
              <div 
                className="popover-item"
                onClick={() => {
                  if (onOpenImportCsv) onOpenImportCsv();
                  setShowExportMenu(false);
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#38bdf8', fontWeight: 600 }}>
                  <FileSpreadsheet size={14} color="#38bdf8" /> Importar CSV do Airtable
                </span>
              </div>
              <div 
                className="popover-item"
                onClick={() => { onExportData('json'); setShowExportMenu(false); }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Download size={14} color="#f59e0b" /> Exportar JSON
                </span>
              </div>
              <div 
                className="popover-item"
                onClick={() => { onExportData('csv'); setShowExportMenu(false); }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Download size={14} color="#10b981" /> Exportar Planilha CSV
                </span>
              </div>
              <div 
                className="popover-item"
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = '.json';
                  input.onchange = (e) => {
                    const file = e.target.files[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => onImportData(event.target.result);
                      reader.readAsText(file);
                    }
                  };
                  input.click();
                  setShowExportMenu(false);
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Upload size={14} color="#3b82f6" /> Importar Backup JSON
                </span>
              </div>
              <div 
                className="popover-item"
                style={{ borderTop: '1px solid #232b3a', marginTop: '0.35rem', paddingTop: '0.5rem', color: '#f87171' }}
                onClick={() => { 
                  if (window.confirm('Atenção: deseja realmente limpar todas as campanhas do Supabase e do armazenamento local?')) {
                    onResetData();
                  }
                  setShowExportMenu(false);
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <RotateCcw size={14} /> Limpar Banco / Resetar
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
