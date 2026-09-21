import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Calendar,
  Layers,
  Sparkles,
  Filter,
  CheckSquare,
  Paperclip,
  Tag,
  Radio,
  Clock,
  FileText
} from 'lucide-react';
import { BRABO_CHANNELS, DISPARO_STAGES, matchRecordWithFilter, getChannelsByCategory } from '../data/initialData';

export default function CustomFiltersSidebar({
  customFilters,
  activeFilterId,
  onSelectFilter,
  onCreateFilter,
  onUpdateFilter,
  onDeleteFilter,
  records,
  isOpen,
  onToggleOpen,
  campaign,
  activeFlowCategory = 'whatsapp'
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFilterId, setEditingFilterId] = useState(null);
  const [filterName, setFilterName] = useState('');
  const [conjunction, setConjunction] = useState('AND'); // 'AND' | 'OR'
  const [rules, setRules] = useState([
    { id: 'r-1', field: 'stage', operator: 'equals', value: 'Em Rascunho', value2: '' }
  ]);

  const customColumns = campaign?.customColumns || [];

  // All available fields to filter on dynamically
  const availableFields = [
    { id: 'title', label: 'Nome / Momento do Disparo', type: 'text', group: 'Geral' },
    { id: 'stage', label: 'Status do Disparo', type: 'stage', group: 'Geral' },
    { id: 'channel', label: 'Canal de Disparo', type: 'channel', group: 'Geral' },
    { id: 'scheduledDate', label: 'Data Programadada', type: 'date', group: 'Cronograma' },
    { id: 'scheduledTime', label: 'Horário Programadado', type: 'time', group: 'Cronograma' },
    { id: 'copyText', label: 'Texto da Copy / Mensagem', type: 'text', group: 'Conteúdo' },
    { id: 'attachment', label: 'Criativo / Arquivo Anexo', type: 'attachment', group: 'Conteúdo' },
    { id: 'attachmentPosition', label: 'Posição do Criativo (Antes/Depois)', type: 'position', group: 'Conteúdo' },
    { id: 'notes', label: 'Observações Internas', type: 'text', group: 'Geral' },
    ...customColumns.map(col => ({
      id: `custom_${col.id}`,
      label: `${col.name} (Custom)`,
      type: col.type === 'checkbox' ? 'checkbox' : col.type === 'date' ? 'date' : 'text',
      group: 'Campos Personalizados'
    }))
  ];

  // Operators available per field data type
  const getOperatorsForType = (type) => {
    switch (type) {
      case 'stage':
      case 'channel':
        return [
          { value: 'equals', label: 'É igual a' },
          { value: 'not_equals', label: 'Não é igual a' },
          { value: 'is_empty', label: 'Está vazio / Sem valor' },
          { value: 'is_not_empty', label: 'Não está vazio / Preenchido' }
        ];

      case 'date':
        return [
          { value: 'exact_date', label: 'Data exata é' },
          { value: 'between', label: 'Está entre as datas' },
          { value: 'before', label: 'Antes de (até a data)' },
          { value: 'after', label: 'Depois de (a partir de)' },
          { value: 'is_today', label: 'É hoje' },
          { value: 'is_future', label: 'No futuro (a partir de hoje)' },
          { value: 'is_past', label: 'No passado (anterior a hoje)' },
          { value: 'is_empty', label: 'Sem data definida' },
          { value: 'is_not_empty', label: 'Com data definida' }
        ];

      case 'time':
        return [
          { value: 'equals', label: 'Horário é igual a' },
          { value: 'before', label: 'Antes das' },
          { value: 'after', label: 'Depois das' },
          { value: 'between', label: 'Entre os horários' },
          { value: 'is_empty', label: 'Sem horário' },
          { value: 'is_not_empty', label: 'Com horário' }
        ];

      case 'attachment':
        return [
          { value: 'has_attachment', label: 'Possui criativo / anexo' },
          { value: 'no_attachment', label: 'Não possui criativo' },
          { value: 'type_is', label: 'Tipo do arquivo é...' }
        ];

      case 'position':
        return [
          { value: 'position_is', label: 'Posição de envio é' }
        ];

      case 'checkbox':
        return [
          { value: 'is_checked', label: 'Marcado / Sim (✅)' },
          { value: 'is_unchecked', label: 'Não marcado / Não (⬜)' }
        ];

      case 'text':
      default:
        return [
          { value: 'contains', label: 'Contém' },
          { value: 'not_contains', label: 'Não contém' },
          { value: 'equals', label: 'É exatamente igual a' },
          { value: 'not_equals', label: 'Não é igual a' },
          { value: 'starts_with', label: 'Começa com' },
          { value: 'ends_with', label: 'Termina com' },
          { value: 'is_empty', label: 'Está vazio (sem texto)' },
          { value: 'is_not_empty', label: 'Não está vazio (preenchido)' }
        ];
    }
  };

  const getFieldObj = (fieldId) => {
    return availableFields.find(f => f.id === fieldId) || availableFields[0];
  };

  // Open modal for new filter
  const handleOpenNewModal = () => {
    setEditingFilterId(null);
    setFilterName('');
    setConjunction('AND');
    setRules([
      { id: `r-${Date.now()}`, field: 'stage', operator: 'equals', value: 'Em Rascunho', value2: '' }
    ]);
    setIsModalOpen(true);
  };

  // Open modal to edit existing filter
  const handleOpenEditModal = (filter) => {
    setEditingFilterId(filter.id);
    setFilterName(filter.name);
    setConjunction(filter.conjunction || 'AND');

    if (Array.isArray(filter.rules) && filter.rules.length > 0) {
      setRules(filter.rules.map(r => ({ ...r, id: r.id || `r-${Date.now()}-${Math.random()}` })));
    } else {
      // Convert legacy filter to dynamic rule
      const converted = [];
      if (filter.stage && filter.stage !== 'All') {
        converted.push({ id: `r-1`, field: 'stage', operator: 'equals', value: filter.stage, value2: '' });
      }
      if (filter.channel && filter.channel !== 'All') {
        converted.push({ id: `r-2`, field: 'channel', operator: 'equals', value: filter.channel, value2: '' });
      }
      if (filter.search) {
        converted.push({ id: `r-3`, field: 'title', operator: 'contains', value: filter.search, value2: '' });
      }
      if (filter.startDate || filter.endDate) {
        converted.push({ id: `r-4`, field: 'scheduledDate', operator: 'between', value: filter.startDate || '', value2: filter.endDate || '' });
      }
      setRules(converted.length > 0 ? converted : [
        { id: `r-${Date.now()}`, field: 'stage', operator: 'equals', value: 'Em Rascunho', value2: '' }
      ]);
    }

    setIsModalOpen(true);
  };

  const handleAddRule = () => {
    setRules(prev => [
      ...prev,
      { id: `r-${Date.now()}-${prev.length}`, field: 'stage', operator: 'equals', value: 'Programada', value2: '' }
    ]);
  };

  const handleRemoveRule = (ruleId) => {
    if (rules.length <= 1) return;
    setRules(prev => prev.filter(r => r.id !== ruleId));
  };

  const handleRuleChange = (ruleId, updates) => {
    setRules(prev => prev.map(r => {
      if (r.id !== ruleId) return r;

      const updated = { ...r, ...updates };

      // When field changes, reset operator and default value
      if (updates.field && updates.field !== r.field) {
        const fieldObj = getFieldObj(updates.field);
        const ops = getOperatorsForType(fieldObj.type);
        updated.operator = ops[0]?.value || 'equals';

        if (fieldObj.type === 'stage') updated.value = 'Em Rascunho';
        else if (fieldObj.type === 'channel') updated.value = BRABO_CHANNELS[0].value;
        else if (fieldObj.type === 'attachment') updated.value = 'image';
        else if (fieldObj.type === 'position') updated.value = 'before';
        else updated.value = '';
        updated.value2 = '';
      }

      return updated;
    }));
  };

  const handleSaveFilter = (e) => {
    e.preventDefault();
    if (!filterName.trim()) return;

    const filterObj = {
      name: filterName.trim(),
      conjunction,
      rules,
      hiddenColumns: []
    };

    if (editingFilterId) {
      if (onUpdateFilter) {
        onUpdateFilter(editingFilterId, filterObj);
      }
    } else {
      const newFilter = {
        id: `filter-${Date.now()}`,
        ...filterObj,
        isDefault: false
      };
      onCreateFilter(newFilter);
    }

    setIsModalOpen(false);
  };

  // Helper to count how many records match a given filter
  const countMatches = (f) => {
    return records.filter(item => matchRecordWithFilter(item, f)).length;
  };

  // Temporary filter preview object for real-time count in modal
  const previewFilter = {
    conjunction,
    rules
  };
  const livePreviewCount = records.filter(item => matchRecordWithFilter(item, previewFilter)).length;

  if (!isOpen) {
    return (
      <div
        style={{
          width: '42px',
          background: 'var(--bg-sidebar)',
          borderRight: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '0.75rem 0',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          flexShrink: 0
        }}
        onClick={onToggleOpen}
        title="Expandir Filtros Personalizados"
      >
        <button className="btn-ghost" style={{ padding: '0.35rem', color: '#f59e0b' }}>
          <ChevronRight size={18} />
        </button>
        <div style={{
          writingMode: 'vertical-rl',
          transform: 'rotate(180deg)',
          marginTop: '1.5rem',
          fontSize: '0.74rem',
          fontWeight: 700,
          color: '#94a3b8',
          letterSpacing: '0.08em',
          textTransform: 'uppercase'
        }}>
          Filtros Dinâmicos
        </div>
      </div>
    );
  }

  return (
    <div style={{
      width: '280px',
      minWidth: '280px',
      background: 'var(--bg-sidebar)',
      borderRight: '1px solid var(--border-color)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      height: '100%',
      userSelect: 'none'
    }}>
      {/* Sidebar Header */}
      <div style={{
        padding: '0.85rem 1rem',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <SlidersHorizontal size={15} color="#f59e0b" />
          <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#fff', letterSpacing: '0.02em' }}>
            Filtros Dinâmicos
          </span>
        </div>

        <button
          className="btn-ghost"
          style={{ padding: '0.25rem', color: '#94a3b8' }}
          onClick={onToggleOpen}
          title="Recolher painel de filtros"
        >
          <ChevronLeft size={16} />
        </button>
      </div>

      {/* Button to Create New Dynamic Filter */}
      <div style={{ padding: '0.75rem 1rem 0.5rem 1rem' }}>
        <button
          className="btn-primary"
          style={{ width: '100%', justifyContent: 'center', fontSize: '0.78rem', padding: '0.45rem' }}
          onClick={handleOpenNewModal}
          id="btn-new-custom-filter"
        >
          <Plus size={14} />
          <span>Criar Novo Filtro</span>
        </button>
      </div>

      {/* Filters List */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '0.5rem 0.75rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.4rem'
      }}>
        <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', padding: '0.2rem 0.4rem' }}>
          Filtros Salvos ({customFilters.length})
        </span>

        {customFilters.map(filter => {
          const isActive = activeFilterId === filter.id;
          const count = countMatches(filter);

          return (
            <div
              key={filter.id}
              onClick={() => onSelectFilter(filter)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.55rem 0.7rem',
                borderRadius: '8px',
                background: isActive ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                border: isActive ? '1px solid var(--gold-primary)' : '1px solid var(--border-subtle)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              className="filter-list-item"
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', overflow: 'hidden', flex: 1, minWidth: 0, paddingRight: '0.4rem' }}>
                <span style={{
                  fontSize: '0.8rem',
                  fontWeight: isActive ? 700 : 600,
                  color: isActive ? '#fbbf24' : '#cbd5e1',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {filter.name}
                </span>

                {/* Badges summarizing rules */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexWrap: 'wrap' }}>
                  {Array.isArray(filter.rules) && filter.rules.length > 0 ? (
                    filter.rules.slice(0, 2).map((r, rIdx) => {
                      const fObj = getFieldObj(r.field);
                      let labelVal = r.value;
                      if (r.operator === 'between') labelVal = `${r.value} a ${r.value2}`;
                      if (r.operator === 'is_empty') labelVal = 'Vazio';
                      if (r.operator === 'is_not_empty') labelVal = 'Preenchido';
                      if (r.operator === 'is_today') labelVal = 'Hoje';
                      if (r.operator === 'has_attachment') labelVal = 'Com Anexo';
                      if (r.operator === 'no_attachment') labelVal = 'Sem Anexo';

                      return (
                        <span
                          key={rIdx}
                          style={{
                            fontSize: '0.64rem',
                            color: '#94a3b8',
                            background: 'rgba(255, 255, 255, 0.06)',
                            padding: '0.05rem 0.35rem',
                            borderRadius: '3px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: '120px'
                          }}
                        >
                          {fObj.label.split(' ')[0]}: {labelVal}
                        </span>
                      );
                    })
                  ) : (
                    filter.id === 'all' && (
                      <span style={{ fontSize: '0.64rem', color: '#64748b' }}>Sem restrições</span>
                    )
                  )}

                  {Array.isArray(filter.rules) && filter.rules.length > 2 && (
                    <span style={{ fontSize: '0.64rem', color: '#f59e0b', fontWeight: 700 }}>
                      +{filter.rules.length - 2}
                    </span>
                  )}
                </div>
              </div>

              {/* Action buttons & count */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
                <span style={{
                  fontSize: '0.7rem',
                  padding: '0.1rem 0.45rem',
                  borderRadius: '10px',
                  background: isActive ? 'rgba(245, 158, 11, 0.3)' : 'rgba(255, 255, 255, 0.08)',
                  color: isActive ? '#fbbf24' : '#94a3b8',
                  fontWeight: 700
                }}>
                  {count}
                </span>

                {/* Edit Button */}
                <button
                  className="btn-ghost"
                  style={{ padding: '0.2rem', color: '#38bdf8' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenEditModal(filter);
                  }}
                  title="Editar regras deste filtro"
                >
                  <Edit3 size={12} />
                </button>

                {!filter.isDefault && (
                  <button
                    className="btn-ghost"
                    style={{ padding: '0.2rem', color: '#ef4444' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`Excluir o filtro "${filter.name}"?`)) {
                        onDeleteFilter(filter.id);
                      }
                    }}
                    title="Excluir filtro"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Dynamic Filter Query Builder */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '680px', width: '95vw', maxHeight: '90vh', overflowY: 'auto' }}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <SlidersHorizontal size={18} color="#f59e0b" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>
                  {editingFilterId ? 'Editar Filtro Personalizado' : 'Criar Novo Filtro Dinâmico'}
                </h3>
              </div>
              <button className="btn-ghost" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveFilter} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              {/* Filter Name */}
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>Nome do Filtro *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ex: Disparos VIP Programadados, Vídeos da Semana, Janela Aberta..."
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              {/* Conjunction Toggle (E / OU) */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(255,255,255,0.03)',
                padding: '0.6rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)'
              }}>
                <span style={{ fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 600 }}>
                  Corresponder disparos que atendem a:
                </span>

                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  <button
                    type="button"
                    className="btn-ghost"
                    style={{
                      fontSize: '0.74rem',
                      padding: '0.25rem 0.65rem',
                      borderRadius: '6px',
                      background: conjunction === 'AND' ? '#f59e0b' : 'rgba(255,255,255,0.06)',
                      color: conjunction === 'AND' ? '#000' : '#94a3b8',
                      fontWeight: 700
                    }}
                    onClick={() => setConjunction('AND')}
                  >
                    TODAS as condições (E)
                  </button>

                  <button
                    type="button"
                    className="btn-ghost"
                    style={{
                      fontSize: '0.74rem',
                      padding: '0.25rem 0.65rem',
                      borderRadius: '6px',
                      background: conjunction === 'OR' ? '#f59e0b' : 'rgba(255,255,255,0.06)',
                      color: conjunction === 'OR' ? '#000' : '#94a3b8',
                      fontWeight: 700
                    }}
                    onClick={() => setConjunction('OR')}
                  >
                    QUALQUER condição (OU)
                  </button>
                </div>
              </div>

              {/* Dynamic Rules List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="form-label" style={{ margin: 0, fontWeight: 700, color: '#fbbf24' }}>
                    Regras e Condições ({rules.length})
                  </label>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ fontSize: '0.74rem', padding: '0.25rem 0.65rem', color: '#fbbf24', borderColor: 'rgba(245, 158, 11, 0.4)' }}
                    onClick={handleAddRule}
                  >
                    <Plus size={13} />
                    <span>+ Adicionar Condição</span>
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {rules.map((rule, idx) => {
                    const fieldObj = getFieldObj(rule.field);
                    const operators = getOperatorsForType(fieldObj.type);
                    const noValueNeeded = [
                      'is_empty', 'is_not_empty', 'is_today', 'is_future', 'is_past',
                      'has_attachment', 'no_attachment', 'is_checked', 'is_unchecked'
                    ].includes(rule.operator);

                    return (
                      <div
                        key={rule.id}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: noValueNeeded ? '1.5fr 1.5fr auto' : rule.operator === 'between' ? '1.2fr 1.1fr 1fr 1fr auto' : '1.3fr 1.2fr 1.8fr auto',
                          gap: '0.5rem',
                          alignItems: 'center',
                          background: 'rgba(0,0,0,0.3)',
                          padding: '0.65rem 0.75rem',
                          borderRadius: '8px',
                          border: '1px solid var(--border-subtle)'
                        }}
                      >
                        {/* 1. Field Select */}
                        <select
                          className="form-control"
                          style={{ fontSize: '0.78rem', padding: '0.4rem 0.5rem', fontWeight: 600 }}
                          value={rule.field}
                          onChange={(e) => handleRuleChange(rule.id, { field: e.target.value })}
                        >
                          <optgroup label="Campos Principais">
                            <option value="title">Nome / Momento do Disparo</option>
                            <option value="stage">Status do Disparo</option>
                            <option value="channel">Canal de Disparo</option>
                            <option value="notes">Observações</option>
                          </optgroup>
                          <optgroup label="Cronograma">
                            <option value="scheduledDate">Data Programadada</option>
                            <option value="scheduledTime">Horário Programadado</option>
                          </optgroup>
                          <optgroup label="Conteúdo & Criativo">
                            <option value="copyText">Texto da Mensagem (Copy)</option>
                            <option value="attachment">Criativo / Arquivo Anexo</option>
                            <option value="attachmentPosition">Posição do Criativo</option>
                          </optgroup>
                          {customColumns.length > 0 && (
                            <optgroup label="Campos Personalizados">
                              {customColumns.map(col => (
                                <option key={col.id} value={`custom_${col.id}`}>{col.name}</option>
                              ))}
                            </optgroup>
                          )}
                        </select>

                        {/* 2. Operator Select */}
                        <select
                          className="form-control"
                          style={{ fontSize: '0.78rem', padding: '0.4rem 0.5rem', color: '#38bdf8', fontWeight: 600 }}
                          value={rule.operator}
                          onChange={(e) => handleRuleChange(rule.id, { operator: e.target.value })}
                        >
                          {operators.map(op => (
                            <option key={op.value} value={op.value}>{op.label}</option>
                          ))}
                        </select>

                        {/* 3. Value Input(s) */}
                        {noValueNeeded ? (
                          <div style={{ fontSize: '0.72rem', color: '#64748b', fontStyle: 'italic', padding: '0.2rem' }}>
                            (Não requer valor adicional)
                          </div>
                        ) : rule.operator === 'between' && fieldObj.type === 'date' ? (
                          <>
                            <input
                              type="date"
                              className="form-control"
                              style={{ colorScheme: 'dark', fontSize: '0.76rem', padding: '0.35rem 0.45rem' }}
                              value={rule.value || ''}
                              placeholder="Data Início"
                              onChange={(e) => handleRuleChange(rule.id, { value: e.target.value })}
                            />
                            <input
                              type="date"
                              className="form-control"
                              style={{ colorScheme: 'dark', fontSize: '0.76rem', padding: '0.35rem 0.45rem' }}
                              value={rule.value2 || ''}
                              placeholder="Data Fim"
                              onChange={(e) => handleRuleChange(rule.id, { value2: e.target.value })}
                            />
                          </>
                        ) : rule.operator === 'between' && fieldObj.type === 'time' ? (
                          <>
                            <input
                              type="time"
                              className="form-control"
                              style={{ colorScheme: 'dark', fontSize: '0.76rem', padding: '0.35rem 0.45rem' }}
                              value={rule.value || ''}
                              onChange={(e) => handleRuleChange(rule.id, { value: e.target.value })}
                            />
                            <input
                              type="time"
                              className="form-control"
                              style={{ colorScheme: 'dark', fontSize: '0.76rem', padding: '0.35rem 0.45rem' }}
                              value={rule.value2 || ''}
                              onChange={(e) => handleRuleChange(rule.id, { value2: e.target.value })}
                            />
                          </>
                        ) : fieldObj.type === 'stage' ? (
                          <select
                            className="form-control"
                            style={{ fontSize: '0.78rem', padding: '0.4rem 0.5rem', fontWeight: 600 }}
                            value={rule.value || 'Em Rascunho'}
                            onChange={(e) => handleRuleChange(rule.id, { value: e.target.value })}
                          >
                            {DISPARO_STAGES.map(st => (
                              <option key={st.value} value={st.value}>{st.badgeIcon} {st.label}</option>
                            ))}
                          </select>
                        ) : fieldObj.type === 'channel' ? (
                          <select
                            className="form-control"
                            style={{ fontSize: '0.78rem', padding: '0.4rem 0.5rem', fontWeight: 600 }}
                            value={rule.value || (getChannelsByCategory(activeFlowCategory)[0]?.value || BRABO_CHANNELS[0].value)}
                            onChange={(e) => handleRuleChange(rule.id, { value: e.target.value })}
                          >
                            {(activeFlowCategory === 'all'
                              ? BRABO_CHANNELS
                              : getChannelsByCategory(activeFlowCategory)
                            ).map(ch => (
                              <option key={ch.value} value={ch.value}>{ch.label}</option>
                            ))}
                            {activeFlowCategory !== 'all' && rule.value && !getChannelsByCategory(activeFlowCategory).some(ch => ch.value === rule.value) && (
                              <option value={rule.value}>{rule.value}</option>
                            )}
                          </select>
                        ) : fieldObj.type === 'attachment' && rule.operator === 'type_is' ? (
                          <select
                            className="form-control"
                            style={{ fontSize: '0.78rem', padding: '0.4rem 0.5rem', fontWeight: 600 }}
                            value={rule.value || 'image'}
                            onChange={(e) => handleRuleChange(rule.id, { value: e.target.value })}
                          >
                            <option value="image">🖼️ Imagem (PNG, JPG)</option>
                            <option value="video">🎬 Vídeo (MP4)</option>
                            <option value="audio">🎵 Áudio (MP3, OGG)</option>
                            <option value="document">📄 Documento (PDF)</option>
                          </select>
                        ) : fieldObj.type === 'position' ? (
                          <select
                            className="form-control"
                            style={{ fontSize: '0.78rem', padding: '0.4rem 0.5rem', fontWeight: 600 }}
                            value={rule.value || 'before'}
                            onChange={(e) => handleRuleChange(rule.id, { value: e.target.value })}
                          >
                            <option value="before">⬆️ Antes da Copy</option>
                            <option value="after">⬇️ Depois da Copy</option>
                          </select>
                        ) : fieldObj.type === 'date' ? (
                          <input
                            type="date"
                            className="form-control"
                            style={{ colorScheme: 'dark', fontSize: '0.76rem', padding: '0.35rem 0.45rem' }}
                            value={rule.value || ''}
                            onChange={(e) => handleRuleChange(rule.id, { value: e.target.value })}
                          />
                        ) : fieldObj.type === 'time' ? (
                          <input
                            type="time"
                            className="form-control"
                            style={{ colorScheme: 'dark', fontSize: '0.76rem', padding: '0.35rem 0.45rem' }}
                            value={rule.value || ''}
                            onChange={(e) => handleRuleChange(rule.id, { value: e.target.value })}
                          />
                        ) : (
                          <input
                            type="text"
                            className="form-control"
                            style={{ fontSize: '0.78rem', padding: '0.38rem 0.55rem' }}
                            placeholder="Digite o termo ou valor..."
                            value={rule.value || ''}
                            onChange={(e) => handleRuleChange(rule.id, { value: e.target.value })}
                          />
                        )}

                        {/* Delete Button */}
                        <button
                          type="button"
                          className="btn-ghost"
                          style={{ padding: '0.3rem', color: rules.length > 1 ? '#ef4444' : '#475569', cursor: rules.length > 1 ? 'pointer' : 'not-allowed' }}
                          onClick={() => handleRemoveRule(rule.id)}
                          disabled={rules.length <= 1}
                          title="Remover esta regra"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Real-time Match Preview Counter */}
              <div style={{
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                borderRadius: '8px',
                padding: '0.65rem 0.85rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <span style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>
                  Resultado em tempo real com os disparos atuais:
                </span>
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#fbbf24' }}>
                  🎯 {livePreviewCount} {livePreviewCount === 1 ? 'disparo encontrado' : 'disparos encontrados'}
                </span>
              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '0.4rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={!filterName.trim()}
                >
                  <Check size={15} />
                  <span>{editingFilterId ? 'Atualizar Filtro' : 'Salvar Filtro'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
