import React, { useState, useEffect } from 'react';
import {
  FolderKanban,
  Calendar,
  X,
  Check,
  Save,
  Tag,
  Palette,
  Clock,
  Sparkles
} from 'lucide-react';

export const CAMPAIGN_COLORS = [
  { label: 'Amarelo Dourado', hex: '#facc15' },
  { label: 'Âmbar / Ouro', hex: '#f59e0b' },
  { label: 'Laranja Energético', hex: '#f97316' },
  { label: 'Azul Celeste', hex: '#38bdf8' },
  { label: 'Verde Sucesso', hex: '#22c55e' },
  { label: 'Verde Lima', hex: '#84cc16' },
  { label: 'Roxo Tático', hex: '#a855f7' },
  { label: 'Rosa Magenta', hex: '#ec4899' },
  { label: 'Vermelho Alerta', hex: '#ef4444' },
  { label: 'Branco Neve', hex: '#ffffff' },
  { label: 'Slate Neutro', hex: '#94a3b8' }
];

const CAMPAIGN_STATUSES = [
  { id: 'Ativa', label: '🟢 Ativa', color: '#22c55e' },
  { id: 'Programada', label: '⏰ Programada', color: '#38bdf8' },
  { id: 'Pausada', label: '⏸️ Pausada', color: '#f59e0b' },
  { id: 'Concluída', label: '🏁 Concluída', color: '#94a3b8' },
  { id: 'Arquivada', label: '📦 Arquivada', color: '#64748b' }
];

export default function EditCampaignModal({
  isOpen,
  onClose,
  campaign,
  onUpdateCampaign
}) {
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('Ativa');
  const [badgeColor, setBadgeColor] = useState('#38bdf8');

  useEffect(() => {
    if (campaign) {
      setName(campaign.name || '');
      setTagline(campaign.tagline || '');
      setStartDate(campaign.startDate || '');
      setEndDate(campaign.endDate || '');
      setStatus(campaign.status || 'Ativa');
      setBadgeColor(campaign.badgeColor || '#38bdf8');
    }
  }, [campaign, isOpen]);

  if (!isOpen || !campaign) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    const updates = {
      name: name.trim(),
      tagline: tagline.trim(),
      startDate: startDate || '',
      endDate: endDate || '',
      status,
      badgeColor
    };

    onUpdateCampaign(campaign.id, updates);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '640px', width: '95%', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              background: 'rgba(59, 130, 246, 0.15)',
              color: badgeColor || 'var(--accent-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `1px solid ${badgeColor || 'var(--accent-primary)'}40`
            }}>
              <FolderKanban size={20} />
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', color: badgeColor || '#38bdf8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Configurações da Campanha
              </span>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', margin: 0 }}>
                Editar Campanha & Metas
              </h3>
            </div>
          </div>

          <button className="btn-ghost" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Campaign Name */}
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 600 }}>Nome da Campanha *</label>
            <input
              type="text"
              className="form-control"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Lançamento Polícia Federal 2026"
              required
              autoFocus
            />
          </div>

          {/* Tagline */}
          <div className="form-group">
            <label className="form-label">Objetivo / Tagline Estratégica</label>
            <input
              type="text"
              className="form-control"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="Ex: Aquecimento e Abertura de Matrículas com 40% OFF"
            />
          </div>

          {/* Dates */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Calendar size={13} color="#38bdf8" />
                <span>Data Início</span>
              </label>
              <input
                type="date"
                className="form-control"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{ colorScheme: 'dark' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Clock size={13} color="#f59e0b" />
                <span>Data Término</span>
              </label>
              <input
                type="date"
                className="form-control"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{ colorScheme: 'dark' }}
              />
            </div>
          </div>

          {/* Status & Color Selection */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '1rem', alignItems: 'flex-start' }}>
            {/* Status Select */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Tag size={13} />
                <span>Status da Campanha</span>
              </label>
              <select
                className="form-control"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                style={{
                  color: CAMPAIGN_STATUSES.find(s => s.id === status)?.color || '#fff',
                  fontWeight: 600
                }}
              >
                {CAMPAIGN_STATUSES.map(s => (
                  <option key={s.id} value={s.id} style={{ background: '#161b26', color: '#fff' }}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Badge Color Palette */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Palette size={13} color={badgeColor} />
                  <span>Cor de Destaque</span>
                </span>
                <span style={{ fontSize: '0.72rem', color: badgeColor, fontWeight: 700 }}>
                  {CAMPAIGN_COLORS.find(c => c.hex === badgeColor)?.label || 'Personalizado'}
                </span>
              </label>

              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
                {CAMPAIGN_COLORS.map(c => (
                  <div
                    key={c.hex}
                    onClick={() => setBadgeColor(c.hex)}
                    title={c.label}
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: c.hex,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: badgeColor === c.hex ? '2px solid #fff' : '2px solid transparent',
                      transform: badgeColor === c.hex ? 'scale(1.2)' : 'scale(1)',
                      boxShadow: badgeColor === c.hex ? `0 0 10px ${c.hex}90` : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {badgeColor === c.hex && <Check size={12} color="#000" strokeWidth={3} />}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Modal Footer inside form */}
          <div style={{
            borderTop: '1px solid var(--border-color)',
            paddingTop: '1rem',
            marginTop: 'auto',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.75rem'
          }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={!name.trim()}
              style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}
            >
              <Save size={15} />
              <span>Salvar Alterações</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
