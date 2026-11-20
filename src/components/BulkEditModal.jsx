import React, { useState, useMemo } from 'react';
import { X, Edit3, Check, Tag, Radio, Calendar, Clock, CheckSquare, Type } from 'lucide-react';
import { BRABO_CHANNELS, DISPARO_STAGES } from '../data/initialData';

export default function BulkEditModal({
  isOpen,
  onClose,
  selectedCount = 0,
  campaign,
  onApplyBulkEdit
}) {
  const [enabledFields, setEnabledFields] = useState({});
  const [stage, setStage] = useState('');
  const [channel, setChannel] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [customFields, setCustomFields] = useState({});

  const availableChannels = useMemo(() => {
    if (campaign?.channelOptions && Array.isArray(campaign.channelOptions) && campaign.channelOptions.length > 0) {
      return campaign.channelOptions;
    }
    return BRABO_CHANNELS;
  }, [campaign?.channelOptions]);

  const availableStages = useMemo(() => {
    if (campaign?.stageOptions && Array.isArray(campaign.stageOptions) && campaign.stageOptions.length > 0) {
      return campaign.stageOptions;
    }
    return DISPARO_STAGES;
  }, [campaign?.stageOptions]);

  const customColumns = useMemo(() => {
    return Array.isArray(campaign?.customColumns) ? campaign.customColumns : [];
  }, [campaign?.customColumns]);

  if (!isOpen) return null;

  const toggleField = (fieldKey) => {
    setEnabledFields(prev => ({ ...prev, [fieldKey]: !prev[fieldKey] }));
  };

  const enableAndSet = (fieldKey, setter, val) => {
    setEnabledFields(prev => ({ ...prev, [fieldKey]: true }));
    setter(val);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const updates = {};
    const customUpdates = {};

    if (enabledFields.stage && stage) updates.stage = stage;
    if (enabledFields.channel && channel) updates.channel = channel;
    if (enabledFields.scheduledDate && scheduledDate) updates.scheduledDate = scheduledDate;
    if (enabledFields.scheduledTime && scheduledTime) updates.scheduledTime = scheduledTime;

    customColumns.forEach(col => {
      const key = `custom_${col.id}`;
      if (enabledFields[key]) {
        customUpdates[col.id] = customFields[col.id] !== undefined ? customFields[col.id] : '';
      }
    });

    if (Object.keys(customUpdates).length > 0) {
      updates.customFields = customUpdates;
    }

    if (Object.keys(updates).length === 0) {
      alert('Selecione e preencha pelo menos um campo para alterar nos disparos selecionados.');
      return;
    }

    onApplyBulkEdit(updates);
    // Reset local state for next open
    setEnabledFields({});
    setStage('');
    setChannel('');
    setScheduledDate('');
    setScheduledTime('');
    setCustomFields({});
    onClose();
  };

  const activeCount = Object.values(enabledFields).filter(Boolean).length;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '94vw',
          maxWidth: '560px',
          height: 'auto',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
            <div style={{
              width: '30px',
              height: '30px',
              borderRadius: '8px',
              background: 'var(--accent-soft)',
              border: '1px solid var(--accent-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-text)'
            }}>
              <Edit3 size={15} />
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Alteração em Massa
              </h3>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                Editando <strong style={{ color: 'var(--accent-text)' }}>{selectedCount}</strong> {selectedCount === 1 ? 'disparo selecionado' : 'disparos selecionados'}
              </span>
            </div>
          </div>

          <button type="button" className="btn-ghost" onClick={onClose} style={{ padding: '0.3rem' }}>
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div style={{ padding: '1.15rem 1.25rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
              Marque os campos ou tags que deseja alterar. Os campos desmarcados permanecerão intactos em cada disparo.
            </p>

            {/* 1. Status */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem',
              padding: '0.65rem 0.8rem',
              borderRadius: '8px',
              border: `1px solid ${enabledFields.stage ? 'var(--accent-border)' : 'var(--border-color)'}`,
              background: enabledFields.stage ? 'var(--accent-soft)' : 'var(--bg-cell)'
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                <input
                  type="checkbox"
                  checked={!!enabledFields.stage}
                  onChange={() => toggleField('stage')}
                  style={{ accentColor: '#F7BA12', cursor: 'pointer' }}
                />
                <Tag size={14} color="var(--text-muted)" />
                <span>Status</span>
              </label>
              <select
                className="form-control"
                value={stage}
                onChange={(e) => enableAndSet('stage', setStage, e.target.value)}
                style={{ fontSize: '0.82rem' }}
              >
                <option value="">-- Selecione o novo status --</option>
                {availableStages.map(st => (
                  <option key={st.value || st.label} value={st.value || st.label}>
                    {st.badgeIcon || ''} {st.label || st.value}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Canal de Disparo */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem',
              padding: '0.65rem 0.8rem',
              borderRadius: '8px',
              border: `1px solid ${enabledFields.channel ? 'var(--accent-border)' : 'var(--border-color)'}`,
              background: enabledFields.channel ? 'var(--accent-soft)' : 'var(--bg-cell)'
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                <input
                  type="checkbox"
                  checked={!!enabledFields.channel}
                  onChange={() => toggleField('channel')}
                  style={{ accentColor: '#F7BA12', cursor: 'pointer' }}
                />
                <Radio size={14} color="var(--text-muted)" />
                <span>Canal de Disparo</span>
              </label>
              <select
                className="form-control"
                value={channel}
                onChange={(e) => enableAndSet('channel', setChannel, e.target.value)}
                style={{ fontSize: '0.82rem' }}
              >
                <option value="">-- Selecione o novo canal --</option>
                {availableChannels.map(ch => (
                  <option key={ch.value || ch.label} value={ch.value || ch.label}>
                    {ch.label || ch.value}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Data e Horário */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.4rem',
                padding: '0.65rem 0.8rem',
                borderRadius: '8px',
                border: `1px solid ${enabledFields.scheduledDate ? 'var(--accent-border)' : 'var(--border-color)'}`,
                background: enabledFields.scheduledDate ? 'var(--accent-soft)' : 'var(--bg-cell)'
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  <input
                    type="checkbox"
                    checked={!!enabledFields.scheduledDate}
                    onChange={() => toggleField('scheduledDate')}
                    style={{ accentColor: '#F7BA12', cursor: 'pointer' }}
                  />
                  <Calendar size={14} color="var(--text-muted)" />
                  <span>Data</span>
                </label>
                <input
                  type="date"
                  className="form-control"
                  value={scheduledDate}
                  onChange={(e) => enableAndSet('scheduledDate', setScheduledDate, e.target.value)}
                  style={{ fontSize: '0.82rem' }}
                />
              </div>

              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.4rem',
                padding: '0.65rem 0.8rem',
                borderRadius: '8px',
                border: `1px solid ${enabledFields.scheduledTime ? 'var(--accent-border)' : 'var(--border-color)'}`,
                background: enabledFields.scheduledTime ? 'var(--accent-soft)' : 'var(--bg-cell)'
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  <input
                    type="checkbox"
                    checked={!!enabledFields.scheduledTime}
                    onChange={() => toggleField('scheduledTime')}
                    style={{ accentColor: '#F7BA12', cursor: 'pointer' }}
                  />
                  <Clock size={14} color="var(--text-muted)" />
                  <span>Horário</span>
                </label>
                <input
                  type="time"
                  className="form-control"
                  value={scheduledTime}
                  onChange={(e) => enableAndSet('scheduledTime', setScheduledTime, e.target.value)}
                  style={{ fontSize: '0.82rem' }}
                />
              </div>
            </div>

            {/* 4. Colunas Customizadas (Tags, Checkboxes, Textos) */}
            {customColumns.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.25rem' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
                  Colunas e Tags Personalizadas
                </span>

                {customColumns.map(col => {
                  const key = `custom_${col.id}`;
                  const isEnabled = !!enabledFields[key];
                  const val = customFields[col.id];

                  return (
                    <div
                      key={col.id}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.4rem',
                        padding: '0.65rem 0.8rem',
                        borderRadius: '8px',
                        border: `1px solid ${isEnabled ? 'var(--accent-border)' : 'var(--border-color)'}`,
                        background: isEnabled ? 'var(--accent-soft)' : 'var(--bg-cell)'
                      }}
                    >
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        <input
                          type="checkbox"
                          checked={isEnabled}
                          onChange={() => toggleField(key)}
                          style={{ accentColor: '#F7BA12', cursor: 'pointer' }}
                        />
                        {col.type === 'checkbox' ? (
                          <CheckSquare size={14} color="var(--text-muted)" />
                        ) : col.type === 'select' ? (
                          <Tag size={14} color="var(--text-muted)" />
                        ) : (
                          <Type size={14} color="var(--text-muted)" />
                        )}
                        <span>{col.name}</span>
                      </label>

                      {col.type === 'select' ? (
                        <select
                          className="form-control"
                          value={val || ''}
                          onChange={(e) => {
                            setEnabledFields(prev => ({ ...prev, [key]: true }));
                            setCustomFields(prev => ({ ...prev, [col.id]: e.target.value }));
                          }}
                          style={{ fontSize: '0.82rem' }}
                        >
                          <option value="">-- Limpar / Sem Tag --</option>
                          {(col.options || []).map(opt => (
                            <option key={opt.id || opt.label} value={opt.label}>
                              ● {opt.label}
                            </option>
                          ))}
                        </select>
                      ) : col.type === 'checkbox' ? (
                        <select
                          className="form-control"
                          value={val === true ? 'true' : val === false ? 'false' : ''}
                          onChange={(e) => {
                            const boolVal = e.target.value === 'true';
                            setEnabledFields(prev => ({ ...prev, [key]: true }));
                            setCustomFields(prev => ({ ...prev, [col.id]: boolVal }));
                          }}
                          style={{ fontSize: '0.82rem' }}
                        >
                          <option value="">-- Selecione --</option>
                          <option value="true">✅ Marcar (Sim)</option>
                          <option value="false">⬜ Desmarcar (Não)</option>
                        </select>
                      ) : (
                        <input
                          type={col.type === 'date' ? 'date' : 'text'}
                          className="form-control"
                          placeholder={`Novo valor para ${col.name}...`}
                          value={val || ''}
                          onChange={(e) => {
                            setEnabledFields(prev => ({ ...prev, [key]: true }));
                            setCustomFields(prev => ({ ...prev, [col.id]: e.target.value }));
                          }}
                          style={{ fontSize: '0.82rem' }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{
            padding: '0.85rem 1.25rem',
            borderTop: '1px solid var(--border-color)',
            background: 'var(--bg-sidebar)',
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: '0.6rem'
          }}>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={activeCount === 0}
              style={{ opacity: activeCount === 0 ? 0.5 : 1 }}
            >
              <Check size={15} strokeWidth={2.5} />
              <span>Aplicar em {selectedCount} {selectedCount === 1 ? 'disparo' : 'disparos'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
