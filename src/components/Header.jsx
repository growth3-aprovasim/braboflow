import React, { useState, useRef, useEffect } from 'react';
import logoImg from '../assets/logo.png';
import logoBlackImg from '../assets/logo-preta.png';
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
  FileSpreadsheet,
  Edit3,
  Sun,
  Moon,
  LogOut,
  User,
  Eye
} from 'lucide-react';

export default function Header({ 
  campaigns,
  activeCampaign,
  onSelectCampaign,
  onOpenCampaignsManager,
  onOpenTagsModal,
  tagsCount = 0,
  searchQuery, 
  setSearchQuery, 
  onNewMessage, 
  onExportData, 
  onImportData, 
  onResetData,
  supabaseStatus = 'connected',
  currentUser = null,
  onLogout,
  theme = 'dark',
  onToggleTheme,
  readOnly = false
}) {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showCampaignDropdown, setShowCampaignDropdown] = useState(false);
  const campaignDropdownRef = useRef(null);
  const exportMenuRef = useRef(null);

  // Close menus when clicking outside or pressing Escape
  useEffect(() => {
    function handleClickOutside(event) {
      if (campaignDropdownRef.current && !campaignDropdownRef.current.contains(event.target)) {
        setShowCampaignDropdown(false);
      }
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
        setShowExportMenu(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setShowCampaignDropdown(false);
        setShowExportMenu(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <header className="app-header">
      <div className="brand-section">

        <div className="brand-title-group" onClick={onOpenCampaignsManager} title="Gerenciar Campanhas">
          <img src={theme === 'light' ? logoBlackImg : logoImg} alt="Logo" className="brand-logo-img" />
          <span className="brand-subtitle">Central de Fluxos & Disparos</span>
        </div>

        {/* Campaign Switcher Dropdown */}
        <div ref={campaignDropdownRef} style={{ position: 'relative', marginLeft: '0.5rem' }}>
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
                    color: activeCampaign?.id === camp.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontWeight: activeCampaign?.id === camp.id ? 700 : 500,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {camp.name}
                  </span>
                  {activeCampaign?.id === camp.id && <Check size={14} color="var(--accent-text)" />}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Campaign Tags [ ] Quick Button (Yellow Tone) */}
        {activeCampaign && (
          <button 
            className="btn-ghost"
            style={{ 
              fontSize: '0.76rem', 
              color: 'var(--amber-text)', 
              background: 'var(--accent-soft)', 
              border: '1px solid var(--accent-border)',
              padding: '0.25rem 0.65rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              cursor: 'pointer'
            }}
            onClick={() => onOpenTagsModal && onOpenTagsModal(activeCampaign)}
            title="Gerenciar Tags [ ] da Campanha"
            id="header-tags-btn"
          >
            <Edit3 size={13} color="#fbbf24" />
            <span style={{ fontWeight: 600 }}>Tags [ ] ({tagsCount})</span>
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
        {/* Theme Toggle Button (Light / Dark) */}
        <button
          type="button"
          className="btn-secondary"
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Alternar para Modo Claro' : 'Alternar para Modo Escuro'}
          style={{ padding: '0.38rem 0.55rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
        >
          {theme === 'dark' ? <Sun size={14} color="#F7BA12" /> : <Moon size={14} color="#0F172A" />}
        </button>

        {!readOnly && (
          <button 
            className="btn-primary" 
            onClick={onNewMessage}
            id="btn-new-broadcast"
            title="Criar novo disparo de mensagem para esta campanha"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Novo Disparo</span>
          </button>
        )}

        {!readOnly && (
          <div ref={exportMenuRef} style={{ position: 'relative' }}>
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
                    <Upload size={14} color="#F7BA12" /> Importar Backup JSON
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* User Badge & Logout */}
        {currentUser && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              paddingLeft: '0.4rem',
              borderLeft: '1px solid var(--border-color)'
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.28rem 0.6rem',
                borderRadius: '6px',
                fontSize: '0.73rem',
                fontWeight: 600,
                background: readOnly ? 'rgba(148, 163, 184, 0.14)' : 'rgba(247, 186, 18, 0.14)',
                border: `1px solid ${readOnly ? 'rgba(148, 163, 184, 0.3)' : 'rgba(247, 186, 18, 0.35)'}`,
                color: readOnly ? 'var(--text-secondary)' : '#F7BA12'
              }}
              title={`Logado como: ${currentUser.name} (${currentUser.roleLabel})`}
            >
              {readOnly ? <Eye size={13} /> : <User size={13} />}
              <span>{currentUser.name}</span>
            </div>

            <button
              type="button"
              className="btn-ghost"
              onClick={onLogout}
              title="Sair da conta"
              style={{ padding: '0.32rem 0.5rem', color: '#ef4444' }}
            >
              <LogOut size={14} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
