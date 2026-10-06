import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Trash2,
  Copy,
  Send,
  Calendar,
  Radio,
  AlignLeft,
  Link as LinkIcon,
  CheckCircle,
  Tag,
  Paperclip,
  FileText,
  Image as ImageIcon,
  Video as VideoIcon,
  Music,
  Upload,
  ArrowUp,
  ArrowDown,
  Download,
  Play,
  FileSpreadsheet
} from 'lucide-react';
import { BRABO_CHANNELS, DISPARO_STAGES, extractCopyVariables, resolveCopyVariables, getStageObj, getChannelsByCategory, normalizeAttachments } from '../data/initialData';
import { saveAttachmentFile, deleteAttachmentFile, getAttachmentUrl, triggerFileDownload, generateVideoThumbnail } from '../services/attachmentStorage';
import { uploadAttachmentToSupabase } from '../services/supabaseService';
import ChannelPreview from './ChannelPreview';

export default function RecordDetailModal({
  record,
  campaign,
  isOpen,
  onClose,
  onUpdateRecord,
  onDeleteRecord,
  onDuplicateRecord,
  onOpenLinksModal,
  activeFlowCategory = 'whatsapp'
}) {
  const [formData, setFormData] = useState(record || {});
  const [copiedFull, setCopiedFull] = useState(false);
  const fileInputRef = useRef(null);

  // Sync only when opening or switching to another record
  useEffect(() => {
    if (record) {
      setFormData(record);
    }
  }, [record?.id]);

  // Load preview URLs from IndexedDB for all attachments if not present
  useEffect(() => {
    let isMounted = true;
    const atts = normalizeAttachments(formData.attachment);
    if (atts.length === 0) return;

    let hasMissing = atts.some(a => a.id && !a.previewUrl);
    if (!hasMissing) return;

    Promise.all(atts.map(async (att) => {
      if (att.id && !att.previewUrl) {
        const url = await getAttachmentUrl(att.id);
        return url ? { ...att, previewUrl: url } : att;
      }
      return att;
    })).then(updated => {
      if (isMounted) {
        setFormData(prev => ({
          ...prev,
          attachment: updated
        }));
      }
    });

    return () => { isMounted = false; };
  }, [formData.attachment]);

  if (!isOpen || !record) return null;

  const predefinedLinks = campaign?.predefinedLinks || [];

  const handleChange = (field, value, extraUpdates = {}) => {
    let updatedStage = formData.stage;
    // Se alterar qualquer campo (exceto a própria Status) e não estiver em rascunho, volta para rascunho
    if (field !== 'stage' && formData.stage && formData.stage !== 'Em Rascunho') {
      updatedStage = 'Em Rascunho';
    }

    const updates = { [field]: value, ...extraUpdates };
    if (updatedStage !== formData.stage && !('stage' in updates)) {
      updates.stage = updatedStage;
    }

    const updated = { ...formData, ...updates };
    setFormData(updated);
    onUpdateRecord(record.id, updates);
  };

  const handleVariableChange = (varKey, updates) => {
    const currentVars = formData.variables || {};
    const updatedVars = {
      ...currentVars,
      [varKey]: {
        ...(currentVars[varKey] || {}),
        ...updates
      }
    };
    handleChange('variables', updatedVars);
  };

  // Automatically increment variable number: {{1}}, {{2}}, {{3}}...
  const handleInsertNextVariable = () => {
    const text = formData.copyText || '';
    const matches = [...text.matchAll(/\{\{(\d+)\}\}/g)];
    const existingNums = matches.map(m => parseInt(m[1], 10));

    Object.keys(formData.variables || {}).forEach(k => {
      const n = parseInt(k, 10);
      if (!isNaN(n)) existingNums.push(n);
    });

    let nextNum = 1;
    while (existingNums.includes(nextNum)) {
      nextNum++;
    }

    const tag = `{{${nextNum}}}`;
    const textarea = document.getElementById('record-copy-textarea');
    let insertPos = text.length;

    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      insertPos = start;
      const newCopyText = text.substring(0, start) + tag + text.substring(end);

      const defaultVars = { ...(formData.variables || {}) };
      if (!defaultVars[String(nextNum)]) {
        const defaultLink = predefinedLinks[0];
        defaultVars[String(nextNum)] = defaultLink
          ? { mode: 'link', linkId: defaultLink.id, text: defaultLink.url }
          : { mode: 'text', linkId: null, text: '' };
      }

      handleChange('copyText', newCopyText, { variables: defaultVars });

      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + tag.length, start + tag.length);
      }, 50);
      return;
    }

    const newCopyText = text ? `${text}\n${tag}` : tag;
    const defaultVars = { ...(formData.variables || {}) };
    if (!defaultVars[String(nextNum)]) {
      const defaultLink = predefinedLinks[0];
      defaultVars[String(nextNum)] = defaultLink
        ? { mode: 'link', linkId: defaultLink.id, text: defaultLink.url }
        : { mode: 'text', linkId: null, text: '' };
    }

    handleChange('copyText', newCopyText, { variables: defaultVars });

    setTimeout(() => {
      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(insertPos + tag.length, insertPos + tag.length);
      }
    }, 50);
  };

  // Multi-attachment upload and position handling with IndexedDB & Supabase
  const currentAttachments = normalizeAttachments(formData.attachment);

  const handleFilesSelected = async (e, defaultPosition = 'before') => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newItems = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      let type = 'document';
      if (file.type.startsWith('image/')) type = 'image';
      else if (file.type.startsWith('video/')) type = 'video';
      else if (file.type.startsWith('audio/')) type = 'audio';

      const attachmentId = `att-${Date.now()}-${i}`;

      // Store heavy binary in IndexedDB for immediate local caching
      await saveAttachmentFile(attachmentId, file);

      const blobUrl = URL.createObjectURL(file);

      // Upload to Supabase Storage in parallel
      let publicUrl = null;
      let storagePath = null;
      try {
        const storageResult = await uploadAttachmentToSupabase(file, record?.id || attachmentId);
        if (storageResult) {
          publicUrl = storageResult.publicUrl;
          storagePath = storageResult.storagePath;
        }
      } catch (err) {
        console.warn('Storage upload fallback:', err);
      }

      // Extract video cover thumbnail or use image preview
      let thumbnailUrl = null;
      if (type === 'video') {
        thumbnailUrl = await generateVideoThumbnail(file);
      } else if (type === 'image') {
        thumbnailUrl = publicUrl || blobUrl;
      }

      const formattedSize = file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${(file.size / 1024).toFixed(1)} KB`;

      newItems.push({
        id: attachmentId,
        name: file.name,
        size: formattedSize,
        type,
        position: defaultPosition,
        previewUrl: publicUrl || blobUrl,
        publicUrl,
        storagePath,
        thumbnailUrl
      });
    }

    const updatedList = [...currentAttachments, ...newItems];
    handleChange('attachment', updatedList);
    e.target.value = '';
  };

  const handleRemoveAttachmentIndex = async (indexToRemove) => {
    const target = currentAttachments[indexToRemove];
    if (target?.id) {
      await deleteAttachmentFile(target.id);
    }
    const updatedList = currentAttachments.filter((_, idx) => idx !== indexToRemove);
    handleChange('attachment', updatedList.length > 0 ? updatedList : null);
  };

  const handleDownloadAttachmentItem = async (att) => {
    if (!att) return;
    await triggerFileDownload(att);
  };

  const handleToggleAttachmentPositionIndex = (index, newPos) => {
    const updatedList = currentAttachments.map((item, idx) => {
      if (idx === index) {
        return { ...item, position: newPos };
      }
      return item;
    });
    handleChange('attachment', updatedList);
  };

  const handleMoveAttachment = (index, direction) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= currentAttachments.length) return;
    const copy = [...currentAttachments];
    const [moved] = copy.splice(index, 1);
    copy.splice(targetIdx, 0, moved);
    handleChange('attachment', copy);
  };

  const getFullResolvedText = () => {
    return resolveCopyVariables(formData.copyText, formData.variables, predefinedLinks);
  };

  const handleCopyFullText = () => {
    const fullText = getFullResolvedText();
    navigator.clipboard.writeText(fullText);
    setCopiedFull(true);
    setTimeout(() => setCopiedFull(false), 2500);
  };

  const handleTestSend = () => {
    const fullText = getFullResolvedText();
    const textEncoded = encodeURIComponent(fullText);

    if (formData.channel === 'Email') {
      const subjectEncoded = encodeURIComponent(formData.title || 'Comunicado Brabo Concursos');
      window.open(`mailto:?subject=${subjectEncoded}&body=${textEncoded}`, '_blank');
    } else {
      window.open(`https://api.whatsapp.com/send?text=${textEncoded}`, '_blank');
    }
  };

  const channelObj = BRABO_CHANNELS.find(ch => ch.value === formData.channel) || BRABO_CHANNELS[0];
  const currentStageObj = getStageObj(formData.stage);

  // Extract all variable numbers present in copy or config
  const detectedVarKeys = extractCopyVariables(formData.copyText || '');
  const allVarKeys = Array.from(new Set([
    ...detectedVarKeys,
    ...Object.keys(formData.variables || {})
  ])).sort((a, b) => Number(a) - Number(b));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '94vw',
          maxWidth: '1180px',
          height: '90vh',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          borderRadius: '10px',
          border: '1px solid var(--border-color)',
          background: 'var(--bg-card)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)'
        }}
      >
        {/* Minimalist Top Header (Google Docs / Airtable style) */}
        <div style={{
          padding: '0.75rem 1.25rem',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-sidebar)',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flex: 1, minWidth: 0, marginRight: '1rem' }}>
            <span style={{
              fontSize: '0.72rem',
              fontWeight: 600,
              color: 'var(--text-muted)',
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '0.15rem 0.5rem',
              borderRadius: '4px',
              border: '1px solid var(--border-subtle)',
              flexShrink: 0
            }}>
              {campaign ? campaign.name : 'DISPARO'}
            </span>

            <input
              type="text"
              value={formData.title || ''}
              onChange={(e) => handleChange('title', e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ffffff',
                fontSize: '1.1rem',
                fontWeight: 600,
                fontFamily: 'inherit',
                width: '100%',
                outline: 'none',
                padding: '0.1rem 0'
              }}
              placeholder="Título do disparo..."
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => onDuplicateRecord(formData)}
              title="Duplicar Disparo"
              style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
            >
              <Copy size={13} />
              <span>Duplicar</span>
            </button>

            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                if (window.confirm('Excluir este disparo permanentemente?')) {
                  onDeleteRecord(record.id);
                }
              }}
              title="Excluir Disparo"
              style={{ color: '#ef4444', padding: '0.3rem 0.5rem' }}
            >
              <Trash2 size={14} />
            </button>

            <button
              type="button"
              className="btn-ghost"
              onClick={onClose}
              style={{ padding: '0.3rem 0.45rem' }}
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* Modal Body: 2 Columns (Editor Sheet on Left, Clean Channel Preview on Right) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1.35fr 1fr',
          flex: 1,
          minHeight: 0,
          overflow: 'hidden'
        }}>
          {/* Left Column: Clean Document Editor Pane */}
          <div style={{
            padding: '1.25rem 1.5rem',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            borderRight: '1px solid var(--border-color)',
            background: 'var(--bg-app)'
          }}>
            {/* Airtable-like Property Row (Stage, Channel, Date/Time) */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '0.65rem',
              padding: '0.65rem 0.85rem',
              background: 'var(--bg-sidebar)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px'
            }}>
              {/* Status */}
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.7rem' }}>
                  <Tag size={12} color="var(--text-muted)" /> Status
                </label>
                <select
                  className="form-control"
                  style={{
                    fontSize: '0.78rem',
                    padding: '0.25rem 0.45rem',
                    fontWeight: 600,
                    color: currentStageObj.color,
                    background: 'rgba(0,0,0,0.2)'
                  }}
                  value={formData.stage || 'Em Rascunho'}
                  onChange={(e) => handleChange('stage', e.target.value)}
                >
                  {DISPARO_STAGES.map(st => (
                    <option key={st.value} value={st.value} style={{ background: '#161b26', color: '#fff' }}>
                      {st.badgeIcon} {st.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Canal de Envio */}
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.7rem' }}>
                  <Radio size={12} color="var(--text-muted)" /> Canal
                </label>
                <select
                  className="form-control"
                  style={{ fontSize: '0.78rem', padding: '0.25rem 0.45rem', fontWeight: 500, color: '#f1f5f9', background: 'rgba(0,0,0,0.2)' }}
                  value={formData.channel}
                  onChange={(e) => handleChange('channel', e.target.value)}
                >
                  {(activeFlowCategory === 'all'
                    ? BRABO_CHANNELS
                    : getChannelsByCategory(activeFlowCategory)
                  ).map(ch => (
                    <option key={ch.value} value={ch.value} style={{ background: '#161b26', color: '#fff' }}>
                      {ch.label}
                    </option>
                  ))}
                  {/* If the record currently has a channel from another category, ensure it's selectable */}
                  {activeFlowCategory !== 'all' && !getChannelsByCategory(activeFlowCategory).some(ch => ch.value === formData.channel) && (
                    <option value={formData.channel} style={{ background: '#161b26', color: '#fff' }}>
                      {formData.channel}
                    </option>
                  )}
                </select>
              </div>

              {/* Data & Horário */}
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.7rem' }}>
                  <Calendar size={12} color="var(--text-muted)" /> Agendamento
                </label>
                <div style={{ display: 'flex', gap: '0.3rem' }}>
                  <input
                    type="date"
                    className="form-control"
                    style={{ colorScheme: 'dark', fontSize: '0.74rem', padding: '0.25rem 0.4rem', flex: 1.2, background: 'rgba(0,0,0,0.2)' }}
                    value={formData.scheduledDate || ''}
                    onChange={(e) => handleChange('scheduledDate', e.target.value)}
                  />
                  <input
                    type="time"
                    className="form-control"
                    style={{ colorScheme: 'dark', fontSize: '0.74rem', padding: '0.25rem 0.4rem', flex: 0.8, background: 'rgba(0,0,0,0.2)' }}
                    value={formData.scheduledTime || ''}
                    onChange={(e) => handleChange('scheduledTime', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* 1. ANEXOS & MÍDIAS (Suporte a múltiplos arquivos: Imagens, PDFs, Áudios, Vídeos) */}
            <div style={{
              background: 'var(--bg-sidebar)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              padding: '0.75rem 0.9rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.6rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Paperclip size={13} color="var(--text-muted)" /> 
                  <span>Mídias & Anexos ({currentAttachments.length})</span>
                  {currentAttachments.length > 0 && (
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                      • {currentAttachments.filter(a => (a.position || 'before') === 'before').length} antes / {currentAttachments.filter(a => a.position === 'after').length} depois do texto
                    </span>
                  )}
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <button
                    type="button"
                    className="btn-ghost"
                    style={{
                      fontSize: '0.72rem',
                      padding: '0.2rem 0.5rem',
                      background: 'rgba(59, 130, 246, 0.1)',
                      color: '#93c5fd',
                      border: '1px solid rgba(59, 130, 246, 0.25)',
                      borderRadius: '4px'
                    }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    + Adicionar Arquivo(s)
                  </button>
                </div>
              </div>

              {/* Hidden file input with multiple selection support */}
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                multiple
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx"
                onChange={(e) => handleFilesSelected(e)}
              />

              {currentAttachments.length === 0 ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: '1px dashed #2d3748',
                    borderRadius: '6px',
                    padding: '0.9rem',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: 'rgba(255, 255, 255, 0.015)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    transition: 'var(--transition-fast)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#4a5568';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#2d3748';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.015)';
                  }}
                >
                  <Upload size={15} color="var(--text-muted)" />
                  <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                    Clique para anexar imagem, PDF/documento, áudio ou vídeo (permite selecionar vários)
                  </span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  {currentAttachments.map((att, idx) => {
                    const isBefore = (att.position || 'before') === 'before';

                    return (
                      <div
                        key={att.id || `att-${idx}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: 'rgba(0, 0, 0, 0.25)',
                          padding: '0.45rem 0.65rem',
                          borderRadius: '6px',
                          border: `1px solid ${isBefore ? 'rgba(56, 189, 248, 0.2)' : 'rgba(251, 191, 36, 0.2)'}`,
                          gap: '0.6rem'
                        }}
                      >
                        {/* Left: Thumbnail & Name */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flex: 1, minWidth: 0, overflow: 'hidden' }}>
                          {att.thumbnailUrl || (att.type === 'image' && (att.previewUrl || att.publicUrl)) ? (
                            <div style={{ width: '34px', height: '34px', borderRadius: '4px', overflow: 'hidden', flexShrink: 0, background: '#000', border: '1px solid rgba(255,255,255,0.1)' }}>
                              <img src={att.thumbnailUrl || att.previewUrl || att.publicUrl} alt={att.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                          ) : (
                            <div style={{ width: '32px', height: '32px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              {att.type === 'image' && <ImageIcon size={15} color="#60a5fa" />}
                              {att.type === 'video' && <VideoIcon size={15} color="#c084fc" />}
                              {att.type === 'audio' && <Music size={15} color="#4ade80" />}
                              {att.type === 'document' && <FileText size={15} color="#fbbf24" />}
                            </div>
                          )}

                          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
                            <span style={{ fontSize: '0.76rem', fontWeight: 600, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={att.name}>
                              {att.name}
                            </span>
                            <span style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>
                              {att.type === 'document' ? '📄 DOCUMENTO' : att.type === 'image' ? '🖼️ IMAGEM' : att.type === 'audio' ? '🎵 ÁUDIO' : '🎬 VÍDEO'} • {att.size || 'Arquivo'}
                            </span>
                          </div>
                        </div>

                        {/* Middle: Position Pill Toggle */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', flexShrink: 0 }}>
                          <button
                            type="button"
                            className="btn-ghost"
                            style={{
                              fontSize: '0.68rem',
                              padding: '0.2rem 0.45rem',
                              borderRadius: '4px',
                              background: isBefore ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                              color: isBefore ? '#38bdf8' : 'var(--text-muted)',
                              border: isBefore ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid transparent',
                              fontWeight: isBefore ? 700 : 400
                            }}
                            onClick={() => handleToggleAttachmentPositionIndex(idx, 'before')}
                            title="Enviar antes do texto da copy"
                          >
                            ⬆️ Antes
                          </button>

                          <button
                            type="button"
                            className="btn-ghost"
                            style={{
                              fontSize: '0.68rem',
                              padding: '0.2rem 0.45rem',
                              borderRadius: '4px',
                              background: !isBefore ? 'rgba(251, 191, 36, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                              color: !isBefore ? '#fbbf24' : 'var(--text-muted)',
                              border: !isBefore ? '1px solid rgba(251, 191, 36, 0.4)' : '1px solid transparent',
                              fontWeight: !isBefore ? 700 : 400
                            }}
                            onClick={() => handleToggleAttachmentPositionIndex(idx, 'after')}
                            title="Enviar depois do texto da copy"
                          >
                            ⬇️ Depois
                          </button>
                        </div>

                        {/* Right: Reorder & Actions */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
                          {currentAttachments.length > 1 && (
                            <>
                              <button
                                type="button"
                                className="btn-ghost"
                                style={{ fontSize: '0.7rem', padding: '0.2rem 0.35rem', opacity: idx === 0 ? 0.3 : 1 }}
                                disabled={idx === 0}
                                onClick={() => handleMoveAttachment(idx, -1)}
                                title="Mover para cima"
                              >
                                <ArrowUp size={12} />
                              </button>
                              <button
                                type="button"
                                className="btn-ghost"
                                style={{ fontSize: '0.7rem', padding: '0.2rem 0.35rem', opacity: idx === currentAttachments.length - 1 ? 0.3 : 1 }}
                                disabled={idx === currentAttachments.length - 1}
                                onClick={() => handleMoveAttachment(idx, 1)}
                                title="Mover para baixo"
                              >
                                <ArrowDown size={12} />
                              </button>
                            </>
                          )}

                          <button
                            type="button"
                            className="btn-ghost"
                            style={{ fontSize: '0.7rem', padding: '0.2rem 0.4rem', color: 'var(--text-secondary)' }}
                            onClick={() => handleDownloadAttachmentItem(att)}
                            title="Baixar arquivo anexo"
                          >
                            <Download size={12} />
                          </button>

                          <button
                            type="button"
                            className="btn-ghost"
                            style={{ fontSize: '0.7rem', padding: '0.2rem 0.4rem', color: '#ef4444' }}
                            onClick={() => handleRemoveAttachmentIndex(idx)}
                            title="Excluir este anexo"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2. TEXTO DA MENSAGEM (COPY) - Clean Document Area */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label" style={{ margin: 0, fontSize: '0.78rem', fontWeight: 600 }}>
                  <AlignLeft size={13} color="var(--text-muted)" /> Texto da Mensagem (Copy)
                </label>

                <button
                  type="button"
                  className="btn-ghost"
                  style={{
                    fontSize: '0.72rem',
                    padding: '0.2rem 0.5rem',
                    background: 'rgba(59, 130, 246, 0.08)',
                    color: '#93c5fd',
                    border: '1px solid rgba(59, 130, 246, 0.2)'
                  }}
                  onClick={handleInsertNextVariable}
                  title="Inserir variável dinâmica (ex: {{1}}, {{2}}...)"
                >
                  + Inserir Variável
                </button>
              </div>

              <textarea
                id="record-copy-textarea"
                className="form-control"
                value={formData.copyText || ''}
                onChange={(e) => handleChange('copyText', e.target.value)}
                placeholder="Escreva a copy aqui..."
                style={{
                  minHeight: '220px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.84rem',
                  lineHeight: '1.6',
                  padding: '0.75rem',
                  background: 'var(--bg-sidebar)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px'
                }}
              />
            </div>

            {/* 3. MAPEAMENTO DE VARIÁVEIS (Minimalist Sheet style) */}
            {allVarKeys.length > 0 && (
              <div style={{
                background: 'var(--bg-sidebar)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                padding: '0.75rem 0.85rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Variáveis no texto ({allVarKeys.length})
                  </span>
                  <button
                    type="button"
                    className="btn-ghost"
                    style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', color: 'var(--text-muted)' }}
                    onClick={() => onOpenLinksModal(campaign)}
                  >
                    + Gerenciar Links
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {allVarKeys.map(varKey => {
                    const varVal = (formData.variables || {})[varKey] || {};
                    const isLinkMode = varVal.mode === 'link' || (varVal.linkId && varVal.mode !== 'text');

                    return (
                      <div
                        key={varKey}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          background: 'rgba(0, 0, 0, 0.2)',
                          padding: '0.35rem 0.55rem',
                          borderRadius: '4px',
                          border: '1px solid var(--border-subtle)'
                        }}
                      >
                        <span style={{
                          background: 'rgba(255, 255, 255, 0.08)',
                          color: '#f1f5f9',
                          fontWeight: 700,
                          fontSize: '0.72rem',
                          padding: '0.15rem 0.4rem',
                          borderRadius: '3px',
                          flexShrink: 0
                        }}>
                          &#123;&#123;{varKey}&#125;&#125;
                        </span>

                        {/* Mode toggle */}
                        <div style={{ display: 'flex', gap: '0.2rem', flexShrink: 0 }}>
                          <button
                            type="button"
                            className="btn-ghost"
                            style={{
                              fontSize: '0.68rem',
                              padding: '0.15rem 0.35rem',
                              borderRadius: '3px',
                              background: isLinkMode ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                              color: isLinkMode ? '#93c5fd' : 'var(--text-muted)',
                              fontWeight: isLinkMode ? 600 : 400
                            }}
                            onClick={() => handleVariableChange(varKey, { mode: 'link' })}
                          >
                            Link
                          </button>

                          <button
                            type="button"
                            className="btn-ghost"
                            style={{
                              fontSize: '0.68rem',
                              padding: '0.15rem 0.35rem',
                              borderRadius: '3px',
                              background: !isLinkMode ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                              color: !isLinkMode ? '#93c5fd' : 'var(--text-muted)',
                              fontWeight: !isLinkMode ? 600 : 400
                            }}
                            onClick={() => handleVariableChange(varKey, { mode: 'text', linkId: null })}
                          >
                            Texto
                          </button>
                        </div>

                        {isLinkMode ? (
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <select
                              className="form-control"
                              style={{
                                width: '100%',
                                fontSize: '0.76rem',
                                padding: '0.25rem 0.45rem',
                                background: 'transparent'
                              }}
                              value={varVal.linkId || ''}
                              onChange={(e) => {
                                const lnkId = e.target.value;
                                const found = predefinedLinks.find(l => l.id === lnkId);
                                handleVariableChange(varKey, { mode: 'link', linkId: lnkId, text: found ? found.url : '' });
                              }}
                            >
                              <option value="">-- Selecionar Link da Campanha --</option>
                              {predefinedLinks.map(lnk => (
                                <option key={lnk.id} value={lnk.id} style={{ background: '#161b26' }}>
                                  🔗 {lnk.label} ({lnk.url})
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <input
                              type="text"
                              className="form-control"
                              style={{ width: '100%', fontSize: '0.76rem', padding: '0.25rem 0.45rem', background: 'transparent' }}
                              placeholder="Digite o texto substituto..."
                              value={varVal.text || ''}
                              onChange={(e) => handleVariableChange(varKey, { mode: 'text', text: e.target.value })}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Custom columns & notes */}
            {campaign?.customColumns && campaign.customColumns.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.5rem' }}>
                {campaign.customColumns.map(col => {
                  const val = formData.customFields?.[col.id];
                  if (col.type === 'checkbox') {
                    return (
                      <label key={col.id} style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', cursor: 'pointer', fontSize: '0.78rem', color: '#e2e8f0' }}>
                        <input
                          type="checkbox"
                          checked={!!val}
                          onChange={(e) => handleChange('customFields', { ...(formData.customFields || {}), [col.id]: e.target.checked })}
                          style={{ accentColor: 'var(--accent-primary)', width: '15px', height: '15px' }}
                        />
                        <span>{col.name}</span>
                      </label>
                    );
                  }
                  if (col.type === 'select') {
                    const selectedOpt = (col.options || []).find(o => o.label === val);
                    return (
                      <div key={col.id} className="form-group">
                        <label className="form-label" style={{ fontSize: '0.7rem' }}>🏷️ {col.name}</label>
                        <select
                          className="form-control"
                          style={{
                            fontSize: '0.76rem',
                            padding: '0.25rem 0.45rem',
                            fontWeight: 600,
                            background: selectedOpt ? selectedOpt.bg : 'var(--bg-sidebar)',
                            color: selectedOpt ? selectedOpt.color : 'var(--text-main)',
                            border: selectedOpt ? `1px solid ${selectedOpt.border}` : '1px solid var(--border-color)'
                          }}
                          value={val || ''}
                          onChange={(e) => handleChange('customFields', { ...(formData.customFields || {}), [col.id]: e.target.value })}
                        >
                          <option value="" style={{ background: '#161b26', color: '#94a3b8' }}>-- Selecionar Tag --</option>
                          {(col.options || []).map(opt => (
                            <option key={opt.id || opt.label} value={opt.label} style={{ background: '#161b26', color: opt.color, fontWeight: 600 }}>
                              ● {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  }
                  return (
                    <div key={col.id} className="form-group">
                      <label className="form-label" style={{ fontSize: '0.7rem' }}>{col.name}</label>
                      <input
                        type="text"
                        className="form-control"
                        style={{ fontSize: '0.76rem', padding: '0.25rem 0.45rem' }}
                        value={val || ''}
                        onChange={(e) => handleChange('customFields', { ...(formData.customFields || {}), [col.id]: e.target.value })}
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {/* Observações */}
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.72rem' }}>Observações</label>
              <textarea
                className="form-control"
                value={formData.notes || ''}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Observações internas..."
                style={{ minHeight: '44px', fontSize: '0.76rem', padding: '0.4rem', background: 'var(--bg-sidebar)' }}
              />
            </div>

            {/* Minimalist Action Bar */}
            <div style={{
              marginTop: 'auto',
              paddingTop: '0.75rem',
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              gap: '0.5rem'
            }}>
              <button
                type="button"
                className="btn-primary"
                onClick={handleCopyFullText}
                style={{
                  flex: 1,
                  padding: '0.65rem 1rem',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  justifyContent: 'center'
                }}
              >
                {copiedFull ? <CheckCircle size={15} /> : <Copy size={15} />}
                <span>{copiedFull ? 'Copiado para a Área de Transferência!' : 'Copiar Texto Final'}</span>
              </button>
            </div>
          </div>

          {/* Right Column: Clean Multi-Channel Preview */}
          <div style={{
            padding: '1.25rem',
            background: 'var(--bg-sidebar)',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            <div style={{ width: '100%', marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Preview em Tempo Real
              </span>
              <span style={{ fontSize: '0.72rem', color: channelObj.color, fontWeight: 500 }}>
                {formData.channel}
              </span>
            </div>

            {/* Preview Component */}
            <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
              <ChannelPreview record={formData} campaign={campaign} />
            </div>

            {/* Test action */}
            <div style={{ width: '100%', maxWidth: '400px', marginTop: '1rem' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={handleTestSend}
                style={{ width: '100%', justifyContent: 'center', fontSize: '0.78rem', padding: '0.45rem' }}
              >
                <Send size={13} />
                <span>{formData.channel === 'Email' ? 'Testar no Webmail' : 'Testar Envio no WhatsApp'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
