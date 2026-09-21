import React, { useState, useRef, useEffect } from 'react';
import {
  Table,
  Kanban,
  Calendar as CalendarIcon,
  Smartphone,
  Filter,
  ArrowUpDown,
  Layers,
  Maximize2,
  Check,
  Link as LinkIcon,
  Eye,
  EyeOff,
  Mail,
  Plus,
  Trash2,
  X,
  Edit3
} from 'lucide-react';
import { BRABO_CHANNELS, FLOW_CATEGORIES, DISPARO_STAGES, getChannelsByCategory } from '../data/initialData';
import { YouTubeIcon } from './ChannelPreview';

export default function ViewToolbar({
  activeView,
  setActiveView,
  filterChannel,
  setFilterChannel,
  toolbarFilter = { conjunction: 'AND', rules: [] },
  onUpdateToolbarFilter = () => { },
  groupBy,
  setGroupBy,
  sortBy,
  setSortBy,
  sortDirection,
  setSortDirection,
  rowDensity,
  setRowDensity,
  recordsCount,
  campaign,
  onOpenLinksModal,
  onOpenEditCampaign,
  hiddenColumns = [],
  onToggleColumnVisibility,
  onShowAllColumns,
  activeCustomFilter,
  activeFlowCategory = 'whatsapp',
  setActiveFlowCategory = () => { },
  flowCounts = { whatsapp: 0, email: 0, youtube: 0, all: 0 }
}) {
  const [openMenu, setOpenMenu] = useState(null);
  const menuRef = useRef(null);

  const customCols = (campaign?.customColumns || []).map(c => ({
    id: c.id,
    label: c.name
  }));

  const allTableColumns = [
    { id: 'title', label: 'Nome / Momento do Disparo' },
    { id: 'stage', label: 'Status do Disparo' },
    { id: 'channel', label: 'Canal de Disparo' },
    { id: 'date', label: 'Data Programada' },
    { id: 'time', label: 'Horário' },
    { id: 'creative', label: 'Criativo / Anexo' },
    { id: 'copy', label: 'Copy / Mensagem' },
    { id: 'notes', label: 'Observações' },
    ...customCols
  ];

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenu(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const availableChannels = getChannelsByCategory(activeFlowCategory);
  const activeRules = toolbarFilter?.rules || [];
  const hasActiveFilters = activeRules.length > 0 || filterChannel !== 'All';

  // Dynamic filter fields
  const availableFilterFields = [
    { id: 'title', label: 'Nome / Momento do Disparo', type: 'text' },
    { id: 'stage', label: 'Status do Disparo', type: 'stage' },
    { id: 'channel', label: 'Canal de Disparo', type: 'channel' },
    { id: 'scheduledDate', label: 'Data Programada', type: 'date' },
    { id: 'scheduledTime', label: 'Horário Programado', type: 'time' },
    { id: 'copyText', label: 'Texto da Copy', type: 'text' },
    { id: 'attachment', label: 'Criativo / Anexo', type: 'attachment' },
    { id: 'notes', label: 'Observações', type: 'text' },
    ...(campaign?.customColumns || []).map(col => ({
      id: `custom_${col.id}`,
      label: `${col.name} (Custom)`,
      type: col.type === 'checkbox' ? 'checkbox' : col.type === 'select' ? 'custom_select' : col.type === 'date' ? 'date' : 'text',
      options: col.options
    }))
  ];

  const getOperatorsForField = (fieldId) => {
    const f = availableFilterFields.find(item => item.id === fieldId);
    if (!f) return [{ value: 'contains', label: 'contém' }];

    switch (f.type) {
      case 'stage':
      case 'channel':
        return [
          { value: 'equals', label: 'é igual a' },
          { value: 'not_equals', label: 'não é igual a' }
        ];
      case 'date':
        return [
          { value: 'exact_date', label: 'data exata' },
          { value: 'is_today', label: 'é hoje' },
          { value: 'before', label: 'antes de' },
          { value: 'after', label: 'depois de' },
          { value: 'is_future', label: 'datas futuras' },
          { value: 'is_past', label: 'datas passadas' },
          { value: 'is_empty', label: 'está vazio' },
          { value: 'is_not_empty', label: 'não está vazio' }
        ];
      case 'attachment':
        return [
          { value: 'has_attachment', label: 'possui anexo' },
          { value: 'no_attachment', label: 'sem anexo' },
          { value: 'type_is', label: 'tipo de mídia é' }
        ];
      case 'checkbox':
        return [
          { value: 'is_checked', label: 'está marcado' },
          { value: 'is_unchecked', label: 'está desmarcado' }
        ];
      case 'custom_select':
        return [
          { value: 'equals', label: 'é a tag' },
          { value: 'not_equals', label: 'não é a tag' },
          { value: 'is_empty', label: 'sem tag (vazio)' },
          { value: 'is_not_empty', label: 'com qualquer tag' }
        ];
      default:
        return [
          { value: 'contains', label: 'contém' },
          { value: 'not_contains', label: 'não contém' },
          { value: 'equals', label: 'é exatamente' },
          { value: 'not_equals', label: 'é diferente de' },
          { value: 'starts_with', label: 'começa com' },
          { value: 'is_empty', label: 'está vazio' },
          { value: 'is_not_empty', label: 'não está vazio' }
        ];
    }
  };

  const handleAddCondition = () => {
    const defaultField = 'stage';
    const newRule = {
      id: `r-${Date.now()}`,
      field: defaultField,
      operator: 'equals',
      value: 'Em Rascunho',
      value2: ''
    };
    onUpdateToolbarFilter({
      conjunction: toolbarFilter?.conjunction || 'AND',
      rules: [...activeRules, newRule]
    });
  };

  const handleUpdateRule = (ruleId, updates) => {
    const nextRules = activeRules.map(r => {
      if (r.id === ruleId) {
        const nextRule = { ...r, ...updates };
        if (updates.field && updates.field !== r.field) {
          const ops = getOperatorsForField(updates.field);
          nextRule.operator = ops[0]?.value || 'contains';
          nextRule.value = '';
          nextRule.value2 = '';
        }
        return nextRule;
      }
      return r;
    });
    onUpdateToolbarFilter({
      conjunction: toolbarFilter?.conjunction || 'AND',
      rules: nextRules
    });
  };

  const handleRemoveRule = (ruleId) => {
    const nextRules = activeRules.filter(r => r.id !== ruleId);
    onUpdateToolbarFilter({
      conjunction: toolbarFilter?.conjunction || 'AND',
      rules: nextRules
    });
  };

  const handleClearAllFilters = () => {
    setFilterChannel('All');
    onUpdateToolbarFilter({ conjunction: 'AND', rules: [] });
  };

  return (
    <div className="views-toolbar" ref={menuRef}>
      {/* 1. Flow Category Segmented Selector (WhatsApp | Email | YouTube) */}
      <div className="flow-category-group">
        <button
          type="button"
          className={`flow-cat-btn ${activeFlowCategory === 'whatsapp' ? 'active wa' : ''}`}
          onClick={() => {
            setActiveFlowCategory('whatsapp');
            setFilterChannel('All');
          }}
          title="Ver somente fluxo de mensagens WhatsApp"
        >
          <Smartphone size={13} color="#22c55e" />
          <span>WhatsApp</span>
          <span className="flow-cat-badge">{flowCounts.whatsapp || 0}</span>
        </button>

        <button
          type="button"
          className={`flow-cat-btn ${activeFlowCategory === 'email' ? 'active email' : ''}`}
          onClick={() => {
            setActiveFlowCategory('email');
            setFilterChannel('All');
          }}
          title="Ver somente fluxo de Emails"
        >
          <Mail size={13} color="#a78bfa" />
          <span>Email</span>
          <span className="flow-cat-badge">{flowCounts.email || 0}</span>
        </button>

        <button
          type="button"
          className={`flow-cat-btn ${activeFlowCategory === 'youtube' ? 'active youtube' : ''}`}
          onClick={() => {
            setActiveFlowCategory('youtube');
            setFilterChannel('All');
          }}
          title="Ver somente fluxo da Comunidade YouTube"
        >
          <YouTubeIcon size={13} color="#ef4444" />
          <span>YouTube</span>
          <span className="flow-cat-badge">{flowCounts.youtube || 0}</span>
        </button>

        <button
          type="button"
          className={`flow-cat-btn ${activeFlowCategory === 'all' ? 'active all' : ''}`}
          onClick={() => {
            setActiveFlowCategory('all');
            setFilterChannel('All');
          }}
          title="Ver todos os canais juntos"
        >
          <Layers size={13} />
          <span>Todos</span>
          <span className="flow-cat-badge">{flowCounts.all || 0}</span>
        </button>
      </div>

      <div style={{ width: '1px', height: '20px', background: 'var(--border-color)', margin: '0 0.25rem' }} />

      {/* 2. View Switcher buttons (Grid, Kanban, Calendar, Simulator) */}
      <div className="view-selector-group">
        <button
          className={`view-btn ${activeView === 'grid' ? 'active gold-tint' : ''}`}
          onClick={() => setActiveView('grid')}
          id="view-grid"
          title="Visão de Planilha Airtable"
        >
          <Table size={14} />
          <span>Grid View</span>
        </button>

        <button
          className={`view-btn ${activeView === 'kanban' ? 'active' : ''}`}
          onClick={() => setActiveView('kanban')}
          id="view-kanban"
          title="Quadro Kanban por Statuss do Disparo"
        >
          <Kanban size={14} />
          <span>Kanban por Statuss</span>
        </button>

        <button
          className={`view-btn ${activeView === 'calendar' ? 'active' : ''}`}
          onClick={() => setActiveView('calendar')}
          id="view-calendar"
          title="Cronograma de Disparos"
        >
          <CalendarIcon size={14} />
          <span>Calendário</span>
        </button>

        <button
          className={`view-btn ${activeView === 'simulator' ? 'active' : ''}`}
          onClick={() => setActiveView('simulator')}
          id="view-simulator"
          title="Simulador de Mensagens em Tempo Real"
        >
          <Smartphone size={14} />
          <span>Simulador</span>
        </button>
      </div>

      {/* 3. Toolbar Controls */}
      <div className="toolbar-controls">
        {/* Edit Campaign Button */}
        {campaign && onOpenEditCampaign && (
          <button
            className="toolbar-pill-btn"
            onClick={onOpenEditCampaign}
            title="Editar informações da campanha (Nome, Datas de Início/Fim, Status, etc)"
            style={{ borderColor: 'rgba(245, 158, 11, 0.4)', color: '#f59e0b' }}
          >
            <Edit3 size={13} />
            <span>Editar Campanha</span>
          </button>
        )}

        {/* Manage Links Button */}
        {campaign && (
          <button
            className="toolbar-pill-btn"
            onClick={() => onOpenLinksModal(campaign)}
            title="Gerenciar links predefinidos desta campanha"
          >
            <LinkIcon size={13} />
            <span>Links ({campaign.predefinedLinks?.length || 0})</span>
          </button>
        )}

        {/* Dynamic Filter Popover */}
        <div style={{ position: 'relative' }}>
          <button
            className={`toolbar-pill-btn ${hasActiveFilters ? 'active-filter' : ''}`}
            onClick={() => setOpenMenu(openMenu === 'filter' ? null : 'filter')}
            id="btn-filter"
            title="Filtrar registros da tabela inteira com condições dinâmicas"
            style={{
              borderColor: hasActiveFilters ? 'rgba(59, 130, 246, 0.6)' : undefined
            }}
          >
            <Filter size={13} />
            <span>{activeRules.length > 0 ? `Filtrado (${activeRules.length})` : filterChannel !== 'All' ? filterChannel : 'Filtrar'}</span>
            {hasActiveFilters && (
              <span className="filter-badge-count">
                {activeRules.length + (filterChannel !== 'All' ? 1 : 0)}
              </span>
            )}
          </button>

          {openMenu === 'filter' && (
            <div className="popover-menu" style={{ width: '580px', maxWidth: '92vw', left: 0, padding: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Filter size={15} color="var(--accent-primary)" />
                  <span className="popover-title" style={{ margin: 0, fontSize: '0.88rem' }}>
                    Filtros da Tabela
                  </span>
                </div>

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleClearAllFilters}
                    style={{ background: 'transparent', border: 'none', color: '#f87171', fontSize: '0.74rem', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Limpar Todos
                  </button>
                )}
              </div>

              {/* Conjunction Bar */}
              {activeRules.length > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                  <span>Onde atender a:</span>
                  <select
                    className="form-control"
                    style={{ width: 'auto', padding: '0.2rem 0.5rem', fontSize: '0.74rem', fontWeight: 700 }}
                    value={toolbarFilter?.conjunction || 'AND'}
                    onChange={(e) => onUpdateToolbarFilter({ ...toolbarFilter, conjunction: e.target.value })}
                  >
                    <option value="AND">TODAS as condições (E / AND)</option>
                    <option value="OR">QUALQUER uma das condições (OU / OR)</option>
                  </select>
                </div>
              )}

              {/* Rules List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '280px', overflowY: 'auto', marginBottom: '0.85rem' }}>
                {activeRules.length === 0 ? (
                  <div style={{ padding: '0.75rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px dashed var(--border-subtle)' }}>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Nenhuma regra de filtro aplicada na tabela.
                    </p>
                  </div>
                ) : (
                  activeRules.map((rule, idx) => {
                    const fieldObj = availableFilterFields.find(f => f.id === rule.field) || availableFilterFields[0];
                    const ops = getOperatorsForField(rule.field);
                    const isNoVal = [
                      'is_empty', 'is_not_empty', 'has_attachment', 'no_attachment',
                      'is_today', 'is_future', 'is_past', 'is_checked', 'is_unchecked'
                    ].includes(rule.operator);

                    return (
                      <div
                        key={rule.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          background: 'var(--bg-sidebar)',
                          padding: '0.4rem 0.5rem',
                          borderRadius: '6px',
                          border: '1px solid var(--border-color)'
                        }}
                      >
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', width: '36px', flexShrink: 0 }}>
                          {idx === 0 ? 'Onde' : toolbarFilter?.conjunction === 'OR' ? 'Ou' : 'E'}
                        </span>

                        {/* Field Select */}
                        <select
                          className="form-control"
                          style={{ flex: '1.2', fontSize: '0.76rem', padding: '0.25rem 0.4rem' }}
                          value={rule.field}
                          onChange={(e) => handleUpdateRule(rule.id, { field: e.target.value })}
                        >
                          {availableFilterFields.map(f => (
                            <option key={f.id} value={f.id} style={{ background: '#161b26' }}>
                              {f.label}
                            </option>
                          ))}
                        </select>

                        {/* Operator Select */}
                        <select
                          className="form-control"
                          style={{ flex: '1.1', fontSize: '0.76rem', padding: '0.25rem 0.4rem' }}
                          value={rule.operator}
                          onChange={(e) => handleUpdateRule(rule.id, { operator: e.target.value })}
                        >
                          {ops.map(op => (
                            <option key={op.value} value={op.value} style={{ background: '#161b26' }}>
                              {op.label}
                            </option>
                          ))}
                        </select>

                        {/* Value Input */}
                        {!isNoVal && (
                          <div style={{ flex: '1.4' }}>
                            {fieldObj.type === 'stage' ? (
                              <select
                                className="form-control"
                                style={{ width: '100%', fontSize: '0.76rem', padding: '0.25rem 0.4rem' }}
                                value={rule.value || 'Em Rascunho'}
                                onChange={(e) => handleUpdateRule(rule.id, { value: e.target.value })}
                              >
                                {DISPARO_STAGES.map(st => (
                                  <option key={st.value} value={st.value} style={{ background: '#161b26', color: st.color }}>
                                    {st.badgeIcon} {st.label}
                                  </option>
                                ))}
                              </select>
                            ) : fieldObj.type === 'channel' ? (
                              <select
                                className="form-control"
                                style={{ width: '100%', fontSize: '0.76rem', padding: '0.25rem 0.4rem' }}
                                value={rule.value || availableChannels[0]?.value}
                                onChange={(e) => handleUpdateRule(rule.id, { value: e.target.value })}
                              >
                                {availableChannels.map(ch => (
                                  <option key={ch.value} value={ch.value} style={{ background: '#161b26', color: ch.color }}>
                                    {ch.label}
                                  </option>
                                ))}
                              </select>
                            ) : fieldObj.type === 'custom_select' ? (
                              <select
                                className="form-control"
                                style={{ width: '100%', fontSize: '0.76rem', padding: '0.25rem 0.4rem' }}
                                value={rule.value || ''}
                                onChange={(e) => handleUpdateRule(rule.id, { value: e.target.value })}
                              >
                                <option value="" style={{ background: '#161b26' }}>-- Escolher Tag --</option>
                                {(fieldObj.options || []).map(opt => (
                                  <option key={opt.id || opt.label} value={opt.label} style={{ background: '#161b26', color: opt.color }}>
                                    ● {opt.label}
                                  </option>
                                ))}
                              </select>
                            ) : fieldObj.type === 'attachment' && rule.operator === 'type_is' ? (
                              <select
                                className="form-control"
                                style={{ width: '100%', fontSize: '0.76rem', padding: '0.25rem 0.4rem' }}
                                value={rule.value || 'image'}
                                onChange={(e) => handleUpdateRule(rule.id, { value: e.target.value })}
                              >
                                <option value="image">🖼️ Imagem</option>
                                <option value="video">🎬 Vídeo</option>
                                <option value="audio">🎵 Áudio</option>
                                <option value="document">📄 Documento / PDF</option>
                              </select>
                            ) : fieldObj.type === 'date' && ['exact_date', 'before', 'after'].includes(rule.operator) ? (
                              <input
                                type="date"
                                className="form-control"
                                style={{ width: '100%', fontSize: '0.76rem', padding: '0.2rem 0.35rem', colorScheme: 'dark' }}
                                value={rule.value || ''}
                                onChange={(e) => handleUpdateRule(rule.id, { value: e.target.value })}
                              />
                            ) : (
                              <input
                                type="text"
                                className="form-control"
                                placeholder="Valor do filtro..."
                                style={{ width: '100%', fontSize: '0.76rem', padding: '0.25rem 0.4rem' }}
                                value={rule.value || ''}
                                onChange={(e) => handleUpdateRule(rule.id, { value: e.target.value })}
                              />
                            )}
                          </div>
                        )}

                        {/* Remove Rule Button */}
                        <button
                          type="button"
                          className="btn-ghost"
                          style={{ padding: '0.25rem', color: '#ef4444', flexShrink: 0 }}
                          onClick={() => handleRemoveRule(rule.id)}
                          title="Remover condição"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Add Condition Button */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleAddCondition}
                  style={{ fontSize: '0.76rem', padding: '0.3rem 0.7rem' }}
                >
                  <Plus size={13} />
                  <span>Adicionar Condição</span>
                </button>

                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => setOpenMenu(null)}
                  style={{ fontSize: '0.76rem', padding: '0.3rem 0.8rem' }}
                >
                  <Check size={13} />
                  <span>Fechar</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Hide / Show Columns Popover */}
        <div style={{ position: 'relative' }}>
          <button
            className={`toolbar-pill-btn ${hiddenColumns.length > 0 ? 'active-filter' : ''}`}
            onClick={() => setOpenMenu(openMenu === 'columns' ? null : 'columns')}
            id="btn-toggle-columns"
            title="Exibir ou ocultar colunas da tabela"
            style={{
              borderColor: hiddenColumns.length > 0 ? 'rgba(168, 85, 247, 0.5)' : undefined
            }}
          >
            {hiddenColumns.length > 0 ? <EyeOff size={13} color="#c084fc" /> : <Eye size={13} />}
            <span>Colunas</span>
            {hiddenColumns.length > 0 && (
              <span
                className="filter-badge-count"
                style={{ background: '#a855f7', color: '#fff', fontSize: '0.66rem' }}
                title={`${hiddenColumns.length} colunas ocultas`}
              >
                {hiddenColumns.length}
              </span>
            )}
          </button>

          {openMenu === 'columns' && (
            <div className="popover-menu" style={{ width: '290px', left: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <span className="popover-title" style={{ margin: 0 }}>Ocultar / Exibir Colunas</span>
                <button
                  type="button"
                  onClick={onShowAllColumns}
                  style={{ background: 'transparent', border: 'none', color: '#38bdf8', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 600 }}
                  title="Restaurar todas as colunas visíveis"
                >
                  Mostrar Todas
                </button>
              </div>

              <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginBottom: '0.65rem', paddingBottom: '0.4rem', borderBottom: '1px solid var(--border-subtle)' }}>
                {activeCustomFilter && !activeCustomFilter.isDefault && activeCustomFilter.id !== 'all' ? (
                  <span>
                    Filtro: <strong style={{ color: '#fbbf24' }}>{activeCustomFilter.name}</strong> (preferência salva exclusivamente neste filtro)
                  </span>
                ) : (
                  <span>Visão Geral da Tabela</span>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '280px', overflowY: 'auto' }}>
                {allTableColumns.map(col => {
                  const isHidden = hiddenColumns.includes(col.id);
                  return (
                    <div
                      key={col.id}
                      className="popover-item"
                      onClick={() => onToggleColumnVisibility(col.id)}
                      style={{
                        justifyContent: 'space-between',
                        background: isHidden ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.03)',
                        borderRadius: '6px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                        <input
                          type="checkbox"
                          checked={!isHidden}
                          onChange={() => { }}
                          style={{ accentColor: '#f59e0b', cursor: 'pointer' }}
                        />
                        <span style={{
                          color: isHidden ? '#64748b' : '#f1f5f9',
                          fontWeight: isHidden ? 400 : 600,
                          fontSize: '0.78rem',
                          textDecoration: isHidden ? 'line-through' : 'none',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {col.label}
                        </span>
                      </div>

                      {isHidden ? (
                        <EyeOff size={13} color="#64748b" style={{ flexShrink: 0 }} />
                      ) : (
                        <Eye size={13} color="#22c55e" style={{ flexShrink: 0 }} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Group Popover */}
        <div style={{ position: 'relative' }}>
          <button
            className={`toolbar-pill-btn ${groupBy !== 'none' ? 'active-filter' : ''}`}
            onClick={() => setOpenMenu(openMenu === 'group' ? null : 'group')}
          >
            <Layers size={13} />
            <span>{groupBy === 'none' ? 'Agrupar' : 'Agrupado por Canal'}</span>
          </button>

          {openMenu === 'group' && (
            <div className="popover-menu" style={{ width: '210px' }}>
              <div className="popover-title">Agrupar Linhas</div>
              <div
                className="popover-item"
                onClick={() => { setGroupBy('none'); setOpenMenu(null); }}
              >
                <span>Sem Agrupamento</span>
                {groupBy === 'none' && <Check size={14} color="#f59e0b" />}
              </div>
              <div
                className="popover-item"
                onClick={() => { setGroupBy('channel'); setOpenMenu(null); }}
              >
                <span>Por Canal de Disparo</span>
                {groupBy === 'channel' && <Check size={14} color="#f59e0b" />}
              </div>
            </div>
          )}
        </div>

        {/* Sort Popover */}
        <div style={{ position: 'relative' }}>
          <button
            className={`toolbar-pill-btn ${sortBy !== 'default' ? 'active-filter' : ''}`}
            onClick={() => setOpenMenu(openMenu === 'sort' ? null : 'sort')}
          >
            <ArrowUpDown size={13} />
            <span>Ordenar</span>
          </button>

          {openMenu === 'sort' && (
            <div className="popover-menu" style={{ width: '230px' }}>
              <div className="popover-title">Ordenar Disparos</div>
              {[
                { id: 'default', label: 'Ordem Original' },
                { id: 'date', label: 'Data & Hora do Disparo' },
                { id: 'title', label: 'Nome / Identificação' },
                { id: 'channel', label: 'Canal' },
              ].map(opt => (
                <div
                  key={opt.id}
                  className="popover-item"
                  onClick={() => { setSortBy(opt.id); setOpenMenu(null); }}
                >
                  <span>{opt.label}</span>
                  {sortBy === opt.id && <Check size={14} color="#f59e0b" />}
                </div>
              ))}
              {sortBy !== 'default' && (
                <div style={{ marginTop: '0.5rem', borderTop: '1px solid #232b3a', paddingTop: '0.5rem' }}>
                  <div
                    className="popover-item"
                    onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                  >
                    <span>Sentido: {sortDirection === 'asc' ? 'Crescente ↑' : 'Decrescente ↓'}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Row Density */}
        <div style={{ position: 'relative' }}>
          <button
            className="toolbar-pill-btn"
            onClick={() => setOpenMenu(openMenu === 'density' ? null : 'density')}
            title="Altura da Linha"
          >
            <Maximize2 size={13} />
            <span style={{ textTransform: 'capitalize' }}>{rowDensity}</span>
          </button>

          {openMenu === 'density' && (
            <div className="popover-menu" style={{ width: '180px' }}>
              <div className="popover-title">Densidade das Linhas</div>
              {[
                { id: 'compact', label: 'Compacto' },
                { id: 'standard', label: 'Padrão' },
                { id: 'large', label: 'Amplo (Copy Completa)' },
              ].map(opt => (
                <div
                  key={opt.id}
                  className="popover-item"
                  onClick={() => { setRowDensity(opt.id); setOpenMenu(null); }}
                >
                  <span>{opt.label}</span>
                  {rowDensity === opt.id && <Check size={14} color="#f59e0b" />}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Records Count Badge */}
        <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginLeft: '0.5rem' }}>
          <strong style={{ color: '#f59e0b' }}>{recordsCount}</strong> {recordsCount === 1 ? 'disparo' : 'disparos'}
        </span>
      </div>
    </div>
  );
}
