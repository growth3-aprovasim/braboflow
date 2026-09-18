import React, { useState } from 'react';
import {
  Plus,
  Calendar,
  ChevronRight,
  ChevronLeft,
  Smartphone,
  Tag,
  Clock,
  Link as LinkIcon,
  Mail
} from 'lucide-react';
import { BRABO_CHANNELS, DISPARO_STAGES, resolveCopyVariables, getStageObj } from '../data/initialData';
import { YouTubeIcon } from './ChannelPreview';

export default function KanbanView({
  records,
  campaign,
  onUpdateRecord,
  onOpenRecord,
  onAddNewRecordWithStage
}) {
  const stages = DISPARO_STAGES;
  const predefinedLinks = campaign?.predefinedLinks || [];
  const [draggedRecordId, setDraggedRecordId] = useState(null);
  const [dragOverStage, setDragOverStage] = useState(null);

  const moveRecordStage = (record, direction) => {
    const currentStageObj = getStageObj(record.stage);
    const currentIndex = stages.findIndex(st => st.value === currentStageObj.value);
    if (currentIndex === -1) return;
    const targetIndex = currentIndex + direction;
    if (targetIndex >= 0 && targetIndex < stages.length) {
      onUpdateRecord(record.id, { stage: stages[targetIndex].value });
    }
  };

  const handleDragStart = (e, recordId) => {
    e.dataTransfer.setData('text/plain', recordId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedRecordId(recordId);
  };

  const handleDragOver = (e, stageValue) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverStage !== stageValue) {
      setDragOverStage(stageValue);
    }
  };

  const handleDragLeave = (e, stageValue) => {
    // Only clear if leaving the column element
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setDragOverStage(null);
  };

  const handleDrop = (e, targetStage) => {
    e.preventDefault();
    e.stopPropagation();
    const recordId = e.dataTransfer.getData('text/plain') || draggedRecordId;
    if (recordId) {
      onUpdateRecord(recordId, { stage: targetStage });
    }
    setDraggedRecordId(null);
    setDragOverStage(null);
  };

  return (
    <div className="kanban-board" style={{ display: 'flex', gap: '1.25rem', padding: '1.5rem', overflowX: 'auto', minHeight: 'calc(100vh - 180px)' }}>
      {stages.map((st, stIndex) => {
        const stageRecords = records.filter(r => getStageObj(r.stage).value === st.value);
        const isColumnOver = dragOverStage === st.value;

        return (
          <div
            key={st.value}
            className="kanban-column"
            style={{
              width: '310px',
              minWidth: '290px',
              background: isColumnOver ? 'rgba(245, 158, 11, 0.08)' : 'var(--bg-sidebar)',
              border: isColumnOver ? '2px dashed #f59e0b' : `1px solid ${st.border}`,
              borderRadius: '12px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: isColumnOver ? '0 0 20px rgba(245, 158, 11, 0.2)' : 'var(--shadow-sm)',
              transition: 'all 0.15s ease'
            }}
            onDragOver={(e) => handleDragOver(e, st.value)}
            onDragLeave={(e) => handleDragLeave(e, st.value)}
            onDrop={(e) => handleDrop(e, st.value)}
          >
            {/* Column Header */}
            <div className="kanban-column-header" style={{
              padding: '0.85rem 1rem',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(0,0,0,0.2)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                <span style={{ fontSize: '1.1rem' }}>{st.badgeIcon}</span>
                <span style={{
                  fontSize: '0.84rem',
                  fontWeight: 800,
                  color: st.color,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {st.label}
                </span>
                <span
                  className="tab-counter"
                  style={{
                    background: st.bg,
                    color: st.color,
                    border: `1px solid ${st.border}`,
                    fontWeight: 700,
                    fontSize: '0.74rem'
                  }}
                >
                  {stageRecords.length}
                </span>
              </div>

              <button
                className="btn-ghost"
                style={{ padding: '0.25rem', color: st.color }}
                onClick={() => onAddNewRecordWithStage ? onAddNewRecordWithStage(st.value) : null}
                title={`Adicionar novo disparo na Status "${st.label}"`}
              >
                <Plus size={16} />
              </button>
            </div>

            {/* Cards List */}
            <div
              className="kanban-column-cards"
              style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1, overflowY: 'auto' }}
              onDragOver={(e) => handleDragOver(e, st.value)}
              onDrop={(e) => handleDrop(e, st.value)}
            >
              {stageRecords.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '2.5rem 1rem',
                  color: '#64748b',
                  fontSize: '0.78rem',
                  border: '1px dashed #232b3a',
                  borderRadius: '8px'
                }}>
                  Nenhum disparo nesta Status.
                  <br />
                  <span style={{ fontSize: '0.7rem', color: '#475569' }}>Arraste um card aqui</span>
                </div>
              ) : (
                stageRecords.map(record => {
                  const channelObj = BRABO_CHANNELS.find(ch => ch.value === record.channel) || BRABO_CHANNELS[0];
                  const resolvedSnippet = resolveCopyVariables(record.copyText, record.variables, predefinedLinks);

                  return (
                    <div
                      key={record.id}
                      className="kanban-card"
                      draggable
                      onDragStart={(e) => handleDragStart(e, record.id)}
                      onClick={() => onOpenRecord(record)}
                      style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '10px',
                        padding: '0.85rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem',
                        cursor: 'grab',
                        transition: 'all 0.2s ease',
                        boxShadow: 'var(--shadow-sm)'
                      }}
                    >
                      {/* Top row: Channel badge & scheduled time */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.5rem',
                          borderRadius: '4px',
                          background: channelObj.bg,
                          color: channelObj.color,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem'
                        }}>
                          {channelObj.value === 'Email' ? (
                            <Mail size={11} />
                          ) : channelObj.value === 'Comunidade YouTube' ? (
                            <YouTubeIcon size={11} />
                          ) : (
                            <Smartphone size={11} />
                          )}
                          {channelObj.badgeText || channelObj.label}
                        </span>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', color: '#94a3b8' }}>
                          <Clock size={11} />
                          <span>{record.scheduledTime || '10:00'}</span>
                        </div>
                      </div>

                      {/* Card Title */}
                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#ffffff', lineHeight: '1.3' }}>
                        {record.title}
                      </div>

                      {/* Copy snippet */}
                      {resolvedSnippet && (
                        <div style={{
                          fontSize: '0.75rem',
                          color: '#94a3b8',
                          lineHeight: '1.4',
                          maxHeight: '48px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical'
                        }}>
                          {resolvedSnippet}
                        </div>
                      )}

                      {/* Meta Information & Date */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b', marginTop: '0.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Calendar size={12} />
                          <span>{record.scheduledDate}</span>
                        </div>

                        {record.variables && Object.keys(record.variables).length > 0 && (
                          <span style={{ fontSize: '0.68rem', color: '#fbbf24', background: 'rgba(245, 158, 11, 0.12)', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>
                            🔗 &#123;&#123;1&#125;&#125; configurado
                          </span>
                        )}
                      </div>

                      {/* Move Stage Buttons */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingTop: '0.45rem',
                          borderTop: '1px solid #1c2433',
                          marginTop: '0.25rem'
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          className="btn-ghost"
                          style={{ padding: '0.15rem 0.35rem', visibility: stIndex > 0 ? 'visible' : 'hidden', fontSize: '0.7rem', color: '#94a3b8' }}
                          onClick={() => moveRecordStage(record, -1)}
                          title={`Mover para ${stIndex > 0 ? stages[stIndex - 1].label : ''}`}
                        >
                          <ChevronLeft size={13} /> {stIndex > 0 ? stages[stIndex - 1].label : ''}
                        </button>

                        <button
                          className="btn-ghost"
                          style={{ padding: '0.15rem 0.35rem', visibility: stIndex < stages.length - 1 ? 'visible' : 'hidden', fontSize: '0.7rem', color: '#94a3b8' }}
                          onClick={() => moveRecordStage(record, 1)}
                          title={`Mover para ${stIndex < stages.length - 1 ? stages[stIndex + 1].label : ''}`}
                        >
                          {stIndex < stages.length - 1 ? stages[stIndex + 1].label : ''} <ChevronRight size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
