import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Trash2,
  Copy,
  Send,
  Calendar,
  Clock,
  Radio,
  AlignLeft,
  Link as LinkIcon,
  Check,
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
  FileSpreadsheet,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Layers,
  CheckSquare,
  Type,
  Users,
  Edit3,
  Plus,
  CornerDownRight,
  Sparkles,
  Mail
} from 'lucide-react';
import { BRABO_CHANNELS, DISPARO_STAGES, extractCopyVariables, extractBracketVariables, resolveCopyVariables, getStageObj, getChannelsByCategory, getChannelCategory, normalizeAttachments, isIndividualDispatch } from '../data/initialData';
import { deleteAttachmentFile, getAttachmentUrl, triggerFileDownload, processAttachmentFiles } from '../services/attachmentStorage';
import ChannelPreview from './ChannelPreview';

export default function RecordDetailModal({
  record,
  campaign,
  recordsList = [],
  onNavigateRecord,
  isOpen,
  onClose,
  onUpdateRecord,
  onDeleteRecord,
  onDuplicateRecord,
  onOpenTagsModal,
  onUpdateCampaignPlaceholders,
  activeFlowCategory = 'whatsapp',
  hiddenColumns = [],
  onToggleColumnVisibility,
  readOnly = false
}) {
  const [formData, setFormData] = useState(record || {});
  const [copiedFull, setCopiedFull] = useState(false);
  const [showHiddenFields, setShowHiddenFields] = useState(false);
  const fileInputRef = useRef(null);
  const [isDraggingModalAtt, setIsDraggingModalAtt] = useState(false);
  const modalDragCounter = useRef(0);
  const [collapsedButtons, setCollapsedButtons] = useState({});

  // Current position in the ordered table list
  const currentIndex = useMemo(() => {
    if (!Array.isArray(recordsList) || recordsList.length === 0 || !record) return -1;
    return recordsList.findIndex(r => r.id === record.id);
  }, [recordsList, record?.id]);

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < recordsList.length - 1;

  const prevRecord = hasPrev ? recordsList[currentIndex - 1] : null;
  const nextRecord = hasNext ? recordsList[currentIndex + 1] : null;

  const handleNavigate = (direction) => {
    if (direction === 'prev' && hasPrev && prevRecord) {
      if (onNavigateRecord) onNavigateRecord(prevRecord);
    } else if (direction === 'next' && hasNext && nextRecord) {
      if (onNavigateRecord) onNavigateRecord(nextRecord);
    }
  };

  // Keyboard navigation: ArrowLeft / ArrowRight to switch records when not typing
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      const tag = document.activeElement?.tagName?.toLowerCase();
      const isInput = tag === 'input' || tag === 'textarea' || document.activeElement?.isContentEditable;

      if (!isInput) {
        if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
          if (hasPrev) {
            e.preventDefault();
            handleNavigate('prev');
          }
        } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
          if (hasNext) {
            e.preventDefault();
            handleNavigate('next');
          }
        }
      }
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, hasPrev, hasNext, prevRecord, nextRecord]);

  // Sync when opening or when record content changes
  useEffect(() => {
    if (record && isOpen) {
      setFormData(record);
    }
  }, [isOpen, record?.id, record?.copyText, record?.title, record?.stage, record?.channel, record?.selectedLinkId, record?.variables, record?.customFields, record?.attachment]);

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

  if (!isOpen || !record) return null;

  const predefinedLinks = campaign?.predefinedLinks || [];

  const handleChange = (field, value, extraUpdates = {}) => {
    if (readOnly) return;
    let updatedStage = formData.stage;
    // Se alterar qualquer campo (exceto a própria Status ou campos customizados de verificação) e não estiver em rascunho, volta para rascunho
    if (field !== 'stage' && field !== 'customFields' && formData.stage && formData.stage !== 'Em Rascunho') {
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
    if (readOnly) return;
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

  // Insert bracket tag into copyText at cursor position
  const handleInsertTag = (tag = '[LINK]') => {
    if (readOnly) return;
    const text = formData.copyText || '';
    const textarea = document.getElementById('record-copy-textarea');
    let newCopyText = text;
    if (textarea && textarea.selectionStart !== undefined) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      newCopyText = text.substring(0, start) + tag + text.substring(end);
    } else {
      newCopyText = text ? `${text}\n${tag}` : tag;
    }

    const defaultLink = predefinedLinks[0];
    const currentVars = formData.variables || {};
    const updatedVars = {
      ...currentVars,
      [tag]: currentVars[tag] || {
        mode: defaultLink ? 'link' : 'text',
        linkId: defaultLink?.id || '',
        text: defaultLink?.url || ''
      }
    };

    handleChange('copyText', newCopyText, { variables: updatedVars });
  };

  const currentAttachments = normalizeAttachments(formData.attachment);

  const handleProcessAndAddFiles = async (files) => {
    if (readOnly || !files || files.length === 0) return;
    try {
      const { items, errors } = await processAttachmentFiles(files, record?.id);
      if (errors && errors.length > 0) {
        alert(errors.join('\n'));
      }
      if (items && items.length > 0) {
        const updatedList = [...currentAttachments, ...items];
        handleChange('attachment', updatedList);
      }
    } catch (err) {
      console.error('Erro ao processar anexos:', err);
      alert('Erro ao processar arquivo(s): ' + (err.message || ''));
    }
  };

  const handleFilesSelected = async (e) => {
    if (readOnly) return;
    const files = Array.from(e.target.files || []);
    await handleProcessAndAddFiles(files);
    e.target.value = '';
  };

  const handleRemoveAttachmentIndex = async (indexToRemove) => {
    if (readOnly) return;
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
    return resolveCopyVariables(formData.copyText, formData.variables, predefinedLinks, campaign?.customPlaceholders);
  };

  const handleCopyFullText = () => {
    const fullText = getFullResolvedText();
    navigator.clipboard.writeText(fullText);
    setCopiedFull(true);
    setTimeout(() => setCopiedFull(false), 2500);
  };

  // Helper to normalize buttons array (up to 3 buttons)
  const getButtonsList = () => {
    if (Array.isArray(formData.buttons) && formData.buttons.length > 0) {
      return formData.buttons;
    }
    if (formData.buttonText) {
      return [
        {
          id: 'btn_1',
          text: formData.buttonText,
          responses: Array.isArray(formData.buttonResponses) && formData.buttonResponses.length > 0
            ? formData.buttonResponses
            : ['Excelente escolha! Segue o seu link de acesso com desconto: [LINK]']
        }
      ];
    }
    return [
      {
        id: 'btn_1',
        text: 'Quero Participar',
        responses: ['Excelente escolha! Segue o seu link de acesso com desconto: [LINK]']
      }
    ];
  };

  const currentButtons = getButtonsList();

  const handleUpdateButtons = (updatedButtons) => {
    const primary = updatedButtons[0];
    handleChange('buttons', updatedButtons, {
      buttonText: primary ? primary.text : '',
      buttonResponses: primary ? primary.responses : []
    });
  };

  const handleAddButton = () => {
    if (currentButtons.length >= 3) return;
    const newBtn = {
      id: `btn_${Date.now()}`,
      text: `Opção ${currentButtons.length + 1}`,
      responses: ['Perfeito! Enviando mais detalhes sobre esta opção: [LINK]']
    };
    handleUpdateButtons([...currentButtons, newBtn]);
  };

  const handleRemoveButton = (btnIndex) => {
    const updated = currentButtons.filter((_, idx) => idx !== btnIndex);
    handleUpdateButtons(updated);
  };

  const handleUpdateButtonText = (btnIndex, newText) => {
    const updated = currentButtons.map((btn, idx) => {
      if (idx === btnIndex) {
        return { ...btn, text: newText };
      }
      return btn;
    });
    handleUpdateButtons(updated);
  };

  const handleAddButtonResponse = (btnIndex) => {
    const updated = currentButtons.map((btn, idx) => {
      if (idx === btnIndex) {
        const resps = Array.isArray(btn.responses) ? [...btn.responses] : [];
        return { ...btn, responses: [...resps, ''] };
      }
      return btn;
    });
    handleUpdateButtons(updated);
  };

  const getNormalizedResponse = (resp) => {
    if (typeof resp === 'object' && resp !== null) {
      return {
        text: resp.text || '',
        buttons: Array.isArray(resp.buttons) ? resp.buttons : []
      };
    }
    return {
      text: resp || '',
      buttons: []
    };
  };

  const handleUpdateButtonResponse = (btnIndex, respIndex, newResp) => {
    const updated = currentButtons.map((btn, idx) => {
      if (idx === btnIndex) {
        const resps = Array.isArray(btn.responses) ? [...btn.responses] : [];
        const norm = getNormalizedResponse(resps[respIndex]);
        if (norm.buttons.length > 0) {
          resps[respIndex] = { ...norm, text: newResp };
        } else {
          resps[respIndex] = newResp;
        }
        return { ...btn, responses: resps };
      }
      return btn;
    });
    handleUpdateButtons(updated);
  };

  const handleAddSubButtonToResponse = (btnIndex, respIndex) => {
    const updated = currentButtons.map((btn, idx) => {
      if (idx === btnIndex) {
        const resps = Array.isArray(btn.responses) ? [...btn.responses] : [];
        const norm = getNormalizedResponse(resps[respIndex]);
        if (norm.buttons.length >= 3) return btn;
        const newSubBtn = {
          id: `sbtn_${Date.now()}_${norm.buttons.length + 1}`,
          text: `Opção ${norm.buttons.length + 1}`
        };
        resps[respIndex] = {
          ...norm,
          buttons: [...norm.buttons, newSubBtn]
        };
        return { ...btn, responses: resps };
      }
      return btn;
    });
    handleUpdateButtons(updated);
  };

  const handleUpdateSubButtonText = (btnIndex, respIndex, subBtnIndex, newSubText) => {
    const updated = currentButtons.map((btn, idx) => {
      if (idx === btnIndex) {
        const resps = Array.isArray(btn.responses) ? [...btn.responses] : [];
        const norm = getNormalizedResponse(resps[respIndex]);
        const updatedSubs = norm.buttons.map((sb, sIdx) => {
          if (sIdx === subBtnIndex) {
            const currentSbObj = typeof sb === 'object' && sb !== null ? sb : { id: `sbtn_${sIdx}`, text: sb };
            return { ...currentSbObj, text: newSubText };
          }
          return sb;
        });
        resps[respIndex] = {
          ...norm,
          buttons: updatedSubs
        };
        return { ...btn, responses: resps };
      }
      return btn;
    });
    handleUpdateButtons(updated);
  };

  const handleRemoveSubButton = (btnIndex, respIndex, subBtnIndex) => {
    const updated = currentButtons.map((btn, idx) => {
      if (idx === btnIndex) {
        const resps = Array.isArray(btn.responses) ? [...btn.responses] : [];
        const norm = getNormalizedResponse(resps[respIndex]);
        const updatedSubs = norm.buttons.filter((_, sIdx) => sIdx !== subBtnIndex);
        if (updatedSubs.length === 0) {
          resps[respIndex] = norm.text;
        } else {
          resps[respIndex] = {
            ...norm,
            buttons: updatedSubs
          };
        }
        return { ...btn, responses: resps };
      }
      return btn;
    });
    handleUpdateButtons(updated);
  };

  const toggleButtonCollapse = (btnKey) => {
    setCollapsedButtons(prev => ({
      ...prev,
      [btnKey]: !prev[btnKey]
    }));
  };

  const handleRemoveButtonResponse = (btnIndex, respIndex) => {
    const updated = currentButtons.map((btn, idx) => {
      if (idx === btnIndex) {
        const resps = Array.isArray(btn.responses) ? [...btn.responses] : [];
        resps.splice(respIndex, 1);
        return { ...btn, responses: resps };
      }
      return btn;
    });
    handleUpdateButtons(updated);
  };

  const handleTestSend = () => {
    const fullText = getFullResolvedText();
    const textEncoded = encodeURIComponent(fullText);

    if (formData.channel === 'Email') {
      const subjectEncoded = encodeURIComponent(formData.emailSubject || formData.title || 'Comunicado Brabo Concursos');
      window.open(`mailto:?subject=${subjectEncoded}&body=${textEncoded}`, '_blank');
    } else {
      window.open(`https://api.whatsapp.com/send?text=${textEncoded}`, '_blank');
    }
  };

  const channelObj = availableChannels.find(ch => ch.value === formData.channel) || {
    value: formData.channel,
    label: formData.channel || 'Selecionar Canal',
    color: '#94a3b8',
    bg: 'rgba(148, 163, 184, 0.15)',
    border: 'rgba(148, 163, 184, 0.3)'
  };
  const currentStageObj = availableStages.find(st => st.value === formData.stage) || getStageObj(formData.stage);

  // Extract all variable numbers present in copy or config
  const detectedVarKeys = extractCopyVariables(formData.copyText || '');
  const allVarKeys = Array.from(new Set([
    ...detectedVarKeys,
    ...Object.keys(formData.variables || {})
  ])).sort((a, b) => Number(a) - Number(b));

  // Extract all bracket tags [TAG] present in copy
  const detectedBracketTags = extractBracketVariables(formData.copyText || '');

  const handleReplaceBracketTagInCopy = (tagKey, replacementText) => {
    if (!replacementText) return;
    const cleanKey = tagKey.replace(/^\[/, '').replace(/\]$/, '').trim();
    const rawTag = `[${cleanKey}]`;
    const newCopy = (formData.copyText || '').split(rawTag).join(replacementText);
    handleChange('copyText', newCopy);
  };

  // ----------------------------------------------------
  // AIRTABLE VERTICAL FIELDS REGISTRY
  // ----------------------------------------------------
  const customColumns = campaign?.customColumns || [];

  const isEmailChannel = formData.channel === 'Email';
  const isIndividualMessage = isIndividualDispatch(formData.channel);

  const renderCopyField = (customLabel = 'Copy', customPlaceholder = 'Escreva a copy do disparo aqui...') => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.5rem' }}>
        <button
          type="button"
          className="btn-ghost"
          style={{
            fontSize: '0.72rem',
            padding: '0.2rem 0.55rem',
            background: 'rgba(245, 158, 11, 0.1)',
            color: '#fbbf24',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem',
            fontWeight: 600
          }}
          onClick={() => handleInsertTag('[LINK]')}
          title="Inserir tag de link [LINK] na copy"
        >
          <Plus size={11} />
          <span>+ Inserir Tag [LINK]</span>
        </button>
      </div>

      <textarea
        id="record-copy-textarea"
        className="form-control"
        value={formData.copyText || ''}
        onChange={(e) => handleChange('copyText', e.target.value)}
        placeholder={customPlaceholder}
        style={{
          minHeight: '190px',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.84rem',
          lineHeight: '1.6',
          padding: '0.75rem',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '6px'
        }}
      />

      {/* Tags [ ] no texto */}
      {detectedBracketTags.length > 0 && (
        <div style={{
          background: 'var(--accent-soft)',
          border: '1px solid var(--accent-border)',
          borderRadius: '6px',
          padding: '0.65rem 0.8rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.45rem',
          marginTop: '0.35rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--amber-text)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Edit3 size={12} color="var(--amber-text)" /> Tags [ ] Detectadas ({detectedBracketTags.length})
            </span>
            {onOpenTagsModal && (
              <button
                type="button"
                className="btn-ghost"
                style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', color: 'var(--amber-text)' }}
                onClick={() => onOpenTagsModal(campaign)}
              >
                ⚡ Central de Tags [ ] da Campanha
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            {detectedBracketTags.map(tagKey => {
              const rawTag = `[${tagKey}]`;
              const campCfg = (campaign?.customPlaceholders || {})[rawTag] || (campaign?.customPlaceholders || {})[tagKey] || {};
              const localCfg = (formData.variables || {})[rawTag] || (formData.variables || {})[tagKey] || {};
              const activeCfg = { ...campCfg, ...localCfg };
              const currentVal = activeCfg.text || (typeof activeCfg === 'string' ? activeCfg : '');

              return (
                <div
                  key={tagKey}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: 'var(--surface-nested)',
                    padding: '0.45rem 0.65rem',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    flexWrap: 'wrap'
                  }}
                >
                  <span style={{
                    background: 'var(--accent-soft)',
                    border: '1px solid var(--accent-border)',
                    color: 'var(--accent-text)',
                    fontWeight: 700,
                    fontSize: '0.74rem',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '4px',
                    flexShrink: 0,
                    fontFamily: 'monospace'
                  }}>
                    {rawTag}
                  </span>

                  <div style={{ flex: 1, minWidth: '220px' }}>
                    <input
                      type="text"
                      className="form-control"
                      style={{ width: '100%', fontSize: '0.78rem', padding: '0.3rem 0.55rem', background: 'var(--bg-cell)' }}
                      placeholder="Digite o link (ex: https://...) ou frase para esta tag..."
                      value={currentVal}
                      onChange={(e) => {
                        const val = e.target.value;
                        handleVariableChange(rawTag, { mode: 'text', text: val });
                        if (onUpdateCampaignPlaceholders && campaign?.id) {
                          onUpdateCampaignPlaceholders(campaign.id, {
                            ...(campaign.customPlaceholders || {}),
                            [rawTag]: { mode: 'text', text: val },
                            [tagKey]: { mode: 'text', text: val }
                          });
                        }
                      }}
                    />
                  </div>

                  {currentVal ? (
                    <span style={{ fontSize: '0.7rem', color: 'var(--success-text)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Check size={12} strokeWidth={3} /> Preenchida
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.7rem', color: 'var(--amber-text)', fontWeight: 600 }}>
                      Falta Preencher
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  // Field definitions based on channel
  const dynamicMessageFields = isEmailChannel
    ? [
        {
          id: 'emailSubject',
          label: 'Headline / Assunto',
          icon: <Mail size={14} className="field-icon" />,
          render: () => {
            const currentSubj = formData.emailSubject || '';
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', width: '100%' }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ex: [Último Dia] Sua vaga na Polícia Federal está reservada!"
                  value={currentSubj}
                  onChange={(e) => {
                    const val = e.target.value;
                    handleChange('emailSubject', val);
                  }}
                  style={{
                    fontSize: '0.84rem',
                    padding: '0.45rem 0.75rem',
                    fontWeight: 700,
                    width: '100%',
                    background: 'rgba(167, 139, 250, 0.05)',
                    borderColor: 'rgba(167, 139, 250, 0.3)'
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#94a3b8' }}>
                  <span>🎯 Linha de assunto principal exibida na caixa de entrada do lead</span>
                  <span style={{ color: currentSubj.length > 60 ? '#fbbf24' : '#a78bfa' }}>
                    {currentSubj.length} caracteres (recomendado: 40-60)
                  </span>
                </div>
              </div>
            );
          }
        },
        {
          id: 'emailPreheader',
          label: 'Pré-cabeçalho',
          icon: <Sparkles size={14} className="field-icon" />,
          render: () => (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', width: '100%' }}>
              <input
                type="text"
                className="form-control"
                placeholder="Ex: Abra para garantir 40% de desconto antes da meia-noite..."
                value={formData.emailPreheader || ''}
                onChange={(e) => handleChange('emailPreheader', e.target.value)}
                style={{ fontSize: '0.82rem', padding: '0.4rem 0.75rem', width: '100%' }}
              />
              <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                💡 Texto de apoio curto que o lead lê antes de abrir o e-mail no Gmail/Outlook.
              </span>
            </div>
          )
        },
        {
          id: 'emailSender',
          label: 'Remetente',
          icon: <Users size={14} className="field-icon" />,
          render: () => (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', width: '100%' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <label style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600 }}>Nome do Remetente</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ex: Paulo Bilynskyj • Brabo Concursos"
                  value={formData.emailSenderName || ''}
                  onChange={(e) => handleChange('emailSenderName', e.target.value)}
                  style={{ fontSize: '0.8rem', padding: '0.35rem 0.65rem' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <label style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600 }}>E-mail de Envio (From)</label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="contato@braboconcursos.com.br"
                  value={formData.emailSenderAddress || ''}
                  onChange={(e) => handleChange('emailSenderAddress', e.target.value)}
                  style={{ fontSize: '0.8rem', padding: '0.35rem 0.65rem' }}
                />
              </div>
            </div>
          )
        },
        {
          id: 'copy',
          label: 'Corpo do E-mail',
          icon: <AlignLeft size={14} className="field-icon" />,
          render: () => renderCopyField('Corpo do E-mail', 'Escreva o texto completo do e-mail...')
        },
        {
          id: 'emailCta',
          label: 'Botão de Ação (CTA)',
          icon: <LinkIcon size={14} className="field-icon" />,
          render: () => (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', width: '100%' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <label style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600 }}>Texto do Botão CTA</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ex: 👉 Garantir Minha Vaga com 40% OFF"
                  value={formData.emailCtaText || ''}
                  onChange={(e) => handleChange('emailCtaText', e.target.value)}
                  style={{ fontSize: '0.8rem', padding: '0.35rem 0.65rem' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <label style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600 }}>Link de Destino do CTA</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="https://... ou tag [LINK]"
                  value={formData.emailCtaUrl || ''}
                  onChange={(e) => handleChange('emailCtaUrl', e.target.value)}
                  style={{ fontSize: '0.8rem', padding: '0.35rem 0.65rem' }}
                />
              </div>
            </div>
          )
        },
        {
          id: 'emailFooter',
          label: 'Rodapé / Assinatura',
          icon: <FileText size={14} className="field-icon" />,
          render: () => (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', width: '100%' }}>
              <input
                type="text"
                className="form-control"
                placeholder="Brabo Concursos • O preparatório de elite para carreiras policiais."
                value={formData.emailFooterText || ''}
                onChange={(e) => handleChange('emailFooterText', e.target.value)}
                style={{ fontSize: '0.8rem', padding: '0.35rem 0.65rem', width: '100%' }}
              />
            </div>
          )
        }
      ]
    : isIndividualMessage
    ? [
        {
          id: 'templateName',
          label: 'Nome do Template (Unnichat / Meta)',
          icon: <Sparkles size={14} className="field-icon" />,
          render: () => (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.68rem', color: '#00a884', fontWeight: 700, textTransform: 'uppercase' }}>
                  Identificador Único do Template HSM
                </span>
                <span style={{ fontSize: '0.66rem', color: '#8696a0' }}>
                  Unnichat / WhatsApp Cloud API
                </span>
              </div>
              <input
                type="text"
                className="form-control"
                placeholder="Ex: Aviso Abertura de Lote ou aviso_abertura_lote"
                value={formData.templateName || ''}
                onChange={(e) => {
                  handleChange('templateName', e.target.value);
                }}
                style={{
                  fontSize: '0.82rem',
                  padding: '0.4rem 0.75rem',
                  width: '100%',
                  color: '#34d399',
                  borderColor: 'rgba(0, 168, 132, 0.4)'
                }}
              />
              <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                Nome do template aprovado na Unnichat / Meta para disparo via API.
              </span>
            </div>
          )
        },
        {
          id: 'templateCategory',
          label: 'Categoria do Template (Meta)',
          icon: <Tag size={14} className="field-icon" />,
          render: () => {
            const currentCat = formData.templateCategory || '';
            const categories = [
              { value: 'Utility', label: 'Utility', desc: 'Utilidade / Aviso transacional', color: 'var(--info-text)', bg: 'rgba(56, 189, 248, 0.14)', border: 'rgba(56, 189, 248, 0.45)' },
              { value: 'Marketing', label: 'Marketing', desc: 'Oferta / Campanha promocional', color: 'var(--amber-text)', bg: 'var(--accent-soft)', border: 'var(--accent-border)' }
            ];
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {categories.map(cat => {
                    const isSelected = currentCat === cat.value;
                    return (
                      <button
                        key={cat.value}
                        type="button"
                        disabled={readOnly}
                        onClick={() => handleChange('templateCategory', isSelected ? '' : cat.value)}
                        style={{
                          padding: '0.38rem 0.85rem',
                          borderRadius: '7px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: readOnly ? 'default' : 'pointer',
                          border: isSelected ? `1.5px solid ${cat.border}` : '1px solid var(--border-color)',
                          background: isSelected ? cat.bg : 'var(--surface-nested)',
                          color: isSelected ? cat.color : 'var(--text-secondary)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          transition: 'all 0.15s ease'
                        }}
                        title={cat.desc}
                      >
                        <span>{isSelected ? '●' : '○'}</span>
                        <span>{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                  Selecione se este template na Meta / Unnichat é da categoria Utility ou Marketing.
                </span>
              </div>
            );
          }
        },
        {
          id: 'unnichatBaseConfig',
          label: 'Tag / CSV da Base (Unnichat)',
          icon: <FileText size={14} className="field-icon" />,
          render: () => {
            const csvFile = formData.unnichatBaseCsv;
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', width: '100%' }}>
                <div>
                  <input
                    type="text"
                    className="form-control"
                    disabled={readOnly}
                    placeholder="Tag da base no Unnichat (ex: leads_pf_quentes_2026)"
                    value={formData.unnichatBaseTag || ''}
                    onChange={(e) => handleChange('unnichatBaseTag', e.target.value)}
                    style={{
                      fontSize: '0.8rem',
                      padding: '0.38rem 0.7rem',
                      width: '100%'
                    }}
                  />
                </div>

                {csvFile ? (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.5rem',
                    padding: '0.45rem 0.65rem',
                    borderRadius: '6px',
                    background: 'rgba(34, 197, 94, 0.08)',
                    border: '1px solid rgba(34, 197, 94, 0.3)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', overflow: 'hidden' }}>
                      <FileText size={14} color="var(--success-text)" style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {csvFile.name}
                      </span>
                      {csvFile.size && (
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                          ({csvFile.size})
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
                      <button
                        type="button"
                        className="btn-ghost"
                        onClick={() => triggerFileDownload(csvFile)}
                        style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', color: 'var(--success-text)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                        title="Baixar CSV pronto para importar no Unnichat"
                      >
                        <Download size={12} /> Baixar CSV
                      </button>
                      {!readOnly && (
                        <button
                          type="button"
                          className="btn-ghost"
                          onClick={() => {
                            if (csvFile.id) deleteAttachmentFile(csvFile.id);
                            handleChange('unnichatBaseCsv', null);
                          }}
                          style={{ fontSize: '0.72rem', padding: '0.2rem 0.4rem', color: 'var(--danger-text)' }}
                          title="Remover arquivo CSV"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  !readOnly && (
                    <label style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                      padding: '0.42rem 0.75rem',
                      borderRadius: '6px',
                      border: '1px dashed var(--border-color)',
                      background: 'var(--surface-nested)',
                      color: 'var(--text-secondary)',
                      fontSize: '0.76rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      width: 'fit-content'
                    }}>
                      <Upload size={13} />
                      <span>Subir arquivo CSV da base pronta</span>
                      <input
                        type="file"
                        accept=".csv,text/csv"
                        style={{ display: 'none' }}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          e.target.value = '';
                          if (!file) return;
                          const { items, errors } = await processAttachmentFiles([file], formData.id);
                          if (errors?.length) {
                            alert(errors[0]);
                            return;
                          }
                          if (items?.[0]) {
                            handleChange('unnichatBaseCsv', items[0]);
                          }
                        }}
                      />
                    </label>
                  )
                )}
              </div>
            );
          }
        },
        {
          id: 'copy',
          label: 'Corpo (Body)',
          icon: <AlignLeft size={14} className="field-icon" />,
          render: () => renderCopyField('Corpo (Body)', 'Escreva o texto principal do template HSM...')
        },
        {
          id: 'buttons',
          label: 'Botões do Template (Até 3 botões)',
          icon: <CornerDownRight size={14} className="field-icon" />,
          render: () => (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <span style={{ fontSize: '0.72rem', color: '#00a884', fontWeight: 700, textTransform: 'uppercase' }}>
                    Botões de Resposta Rápida ({currentButtons.length}/3)
                  </span>
                  <span style={{ fontSize: '0.66rem', color: '#8696a0' }}>
                    • WhatsApp HSM / Unnichat
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => {
                      const allKeys = currentButtons.map((b, i) => b.id || `btn_${i}`);
                      const areAllCollapsed = allKeys.every(k => collapsedButtons[k]);
                      const nextState = {};
                      allKeys.forEach(k => { nextState[k] = !areAllCollapsed; });
                      setCollapsedButtons(nextState);
                    }}
                    style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem', color: '#00a884', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                    title="Alternar todos os botões entre abertos e fechados"
                  >
                    <Layers size={11} />
                    <span>
                      {currentButtons.every((b, i) => collapsedButtons[b.id || `btn_${i}`]) ? 'Expandir Todos' : 'Recolher Todos'}
                    </span>
                  </button>
                </div>
              </div>

              {/* List of up to 3 buttons */}
              {currentButtons.map((btn, btnIdx) => {
                const btnKey = btn.id || `btn_${btnIdx}`;
                const isCollapsed = !!collapsedButtons[btnKey];

                // Count sub-buttons inside this button's responses
                const totalSubButtons = (btn.responses || []).reduce((acc, r) => {
                  const norm = getNormalizedResponse(r);
                  return acc + (norm.buttons ? norm.buttons.length : 0);
                }, 0);

                return (
                  <div
                    key={btnKey}
                    style={{
                      background: 'rgba(0, 168, 132, 0.05)',
                      border: '1px solid rgba(0, 168, 132, 0.28)',
                      borderRadius: '8px',
                      padding: isCollapsed ? '0.55rem 0.75rem' : '0.75rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: isCollapsed ? '0' : '0.6rem',
                      transition: 'all 0.18s ease'
                    }}
                  >
                    {/* Clickable Header with Arrow to Collapse/Open */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer',
                        userSelect: 'none'
                      }}
                      onClick={() => toggleButtonCollapse(btnKey)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#00a884',
                            transition: 'transform 0.2s ease',
                            transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)'
                          }}
                          title={isCollapsed ? 'Clique para abrir o botão' : 'Clique para fechar o botão'}
                        >
                          <ChevronDown size={16} />
                        </span>

                        <span style={{
                          background: '#00a884',
                          color: '#000000',
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          padding: '0.12rem 0.45rem',
                          borderRadius: '4px'
                        }}>
                          Botão #{btnIdx + 1}
                        </span>

                        <strong style={{
                          fontSize: '0.8rem',
                          color: btn.text ? 'var(--text-primary)' : 'var(--text-muted)',
                          maxWidth: '220px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {btn.text ? `"${btn.text}"` : '(Sem texto do botão)'}
                        </strong>

                        <span style={{
                          fontSize: '0.66rem',
                          color: 'var(--text-muted)',
                          background: 'var(--bg-card-hover)',
                          padding: '0.1rem 0.35rem',
                          borderRadius: '4px'
                        }}>
                          {(btn.responses || []).length} msg(s) pós-clique
                        </span>

                        {totalSubButtons > 0 && (
                          <span style={{
                            fontSize: '0.66rem',
                            color: 'var(--info-text)',
                            background: 'rgba(25, 103, 210, 0.1)',
                            border: '1px solid rgba(25, 103, 210, 0.25)',
                            padding: '0.1rem 0.35rem',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.2rem'
                          }}>
                            <CornerDownRight size={10} />
                            {totalSubButtons} {totalSubButtons === 1 ? 'sub-botão' : 'sub-botões'}
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ fontSize: '0.66rem', color: isCollapsed ? '#00a884' : '#64748b' }}>
                          {isCollapsed ? 'Clique para abrir ▼' : 'Clique para fechar ▲'}
                        </span>
                        {currentButtons.length > 1 && (
                          <button
                            type="button"
                            className="btn-ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveButton(btnIdx);
                            }}
                            style={{ color: '#ef4444', padding: '0.15rem 0.4rem', fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                            title="Remover este botão"
                          >
                            <Trash2 size={12} />
                            <span>Remover</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Button Body (Hidden when collapsed) */}
                    {!isCollapsed && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.2rem' }}>
                        {/* Button Text Input */}
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                            <label style={{ fontSize: '0.68rem', color: '#94a3b8', margin: 0, fontWeight: 600 }}>
                              Texto do Botão #{btnIdx + 1} (Resposta Rápida)
                            </label>
                            <span style={{ fontSize: '0.65rem', color: '#8696a0' }}>
                              {(btn.text || '').length}/25 caracteres
                            </span>
                          </div>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Ex: Quero Minha Vaga"
                            maxLength={25}
                            value={btn.text || ''}
                            onChange={(e) => handleUpdateButtonText(btnIdx, e.target.value)}
                            style={{
                              fontSize: '0.82rem',
                              padding: '0.4rem 0.75rem',
                              width: '100%',
                              fontWeight: 600,
                              borderColor: 'rgba(0, 168, 132, 0.4)'
                            }}
                          />
                        </div>

                        {/* Sequential Responses for this specific button */}
                        <div style={{
                          background: 'var(--surface-nested)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          padding: '0.65rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.5rem'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <Sparkles size={12} color="#00a884" />
                              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#00a884', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                                Próximas Mensagens ao Clicar no Botão #{btnIdx + 1}
                              </span>
                            </div>
                            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                              {(btn.responses || []).length} mensagem(ns) configurada(s)
                            </span>
                          </div>

                          <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.35' }}>
                            Defina as mensagens e botões que o lead receberá sequencialmente após clicar no botão "{btn.text || 'Opção'}".
                          </p>

                          {/* Responses textareas + sub-buttons */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {(btn.responses || []).map((resp, rIdx) => {
                              const normResp = getNormalizedResponse(resp);
                              const subButtons = normResp.buttons;

                              return (
                                <div
                                  key={rIdx}
                                  style={{
                                    background: 'var(--bg-card)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '5px',
                                    padding: '0.45rem 0.6rem',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.35rem'
                                  }}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--info-text)' }}>
                                      Mensagem #{rIdx + 1} pós-clique
                                    </span>
                                    <button
                                      type="button"
                                      className="btn-ghost"
                                      onClick={() => handleRemoveButtonResponse(btnIdx, rIdx)}
                                      style={{ color: '#ef4444', padding: '0.1rem 0.3rem', fontSize: '0.66rem', display: 'flex', alignItems: 'center', gap: '0.15rem' }}
                                      title="Remover esta mensagem"
                                    >
                                      <Trash2 size={11} />
                                      <span>Remover</span>
                                    </button>
                                  </div>

                                  <textarea
                                    className="form-control"
                                    value={normResp.text}
                                    onChange={(e) => handleUpdateButtonResponse(btnIdx, rIdx, e.target.value)}
                                    placeholder={`Escreva a mensagem ${rIdx + 1} enviada após o lead clicar no botão "${btn.text || ''}"... (suporta [LINK], *negrito*, etc.)`}
                                    style={{
                                      minHeight: '65px',
                                      fontFamily: 'var(--font-mono)',
                                      fontSize: '0.78rem',
                                      lineHeight: '1.45',
                                      padding: '0.4rem 0.55rem',
                                      background: 'var(--surface-nested-soft)',
                                      border: '1px solid var(--border-color)',
                                      borderRadius: '4px',
                                      width: '100%'
                                    }}
                                  />

                                  {/* Sub-botões desta mensagem pós-clique */}
                                  <div style={{
                                    marginTop: '0.15rem',
                                    background: 'rgba(0, 168, 132, 0.04)',
                                    border: '1px dashed rgba(0, 168, 132, 0.25)',
                                    borderRadius: '5px',
                                    padding: '0.4rem 0.55rem',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.35rem'
                                  }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <span style={{ fontSize: '0.67rem', color: '#00a884', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                        <CornerDownRight size={11} />
                                        Botões desta mensagem ({subButtons.length}/3)
                                      </span>
                                      {subButtons.length < 3 && (
                                        <button
                                          type="button"
                                          className="btn-ghost"
                                          onClick={() => handleAddSubButtonToResponse(btnIdx, rIdx)}
                                          style={{
                                            fontSize: '0.66rem',
                                            padding: '0.1rem 0.35rem',
                                            color: '#00a884',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.2rem',
                                            fontWeight: 700
                                          }}
                                          title="Adicionar botão que o lead poderá clicar nesta próxima mensagem"
                                        >
                                          <Plus size={11} />
                                          <span>+ Adicionar Botão</span>
                                        </button>
                                      )}
                                    </div>

                                    {subButtons.length === 0 ? (
                                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <span style={{ fontSize: '0.66rem', color: '#64748b' }}>
                                          Nenhum botão nesta mensagem (apenas texto simples).
                                        </span>
                                        <button
                                          type="button"
                                          className="btn-secondary"
                                          onClick={() => handleAddSubButtonToResponse(btnIdx, rIdx)}
                                          style={{
                                            fontSize: '0.66rem',
                                            padding: '0.15rem 0.45rem',
                                            color: '#00a884',
                                            borderColor: 'rgba(0, 168, 132, 0.3)',
                                            background: 'rgba(0, 168, 132, 0.08)',
                                            borderRadius: '4px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.2rem',
                                            fontWeight: 600
                                          }}
                                        >
                                          <Plus size={11} />
                                          <span>+ Adicionar Botão</span>
                                        </button>
                                      </div>
                                    ) : (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                        {subButtons.map((sBtn, sbIdx) => {
                                          const sText = typeof sBtn === 'string' ? sBtn : (sBtn?.text || '');
                                          return (
                                            <div
                                              key={sBtn.id || sbIdx}
                                              style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.35rem',
                                                background: 'rgba(0, 0, 0, 0.25)',
                                                border: '1px solid rgba(0, 168, 132, 0.2)',
                                                borderRadius: '4px',
                                                padding: '0.2rem 0.4rem'
                                              }}
                                            >
                                              <span style={{ fontSize: '0.64rem', color: '#00a884', fontWeight: 800, whiteSpace: 'nowrap' }}>
                                                #{sbIdx + 1}
                                              </span>
                                              <input
                                                type="text"
                                                className="form-control"
                                                value={sText}
                                                maxLength={25}
                                                onChange={(e) => handleUpdateSubButtonText(btnIdx, rIdx, sbIdx, e.target.value)}
                                                placeholder="Texto do botão (ex: Quero saber mais)"
                                                style={{
                                                  fontSize: '0.74rem',
                                                  padding: '0.2rem 0.45rem',
                                                  height: 'auto',
                                                  fontWeight: 600,
                                                  flex: 1,
                                                  borderColor: 'rgba(0, 168, 132, 0.3)'
                                                }}
                                              />
                                              <span style={{ fontSize: '0.62rem', color: '#8696a0', whiteSpace: 'nowrap' }}>
                                                {sText.length}/25
                                              </span>
                                              <button
                                                type="button"
                                                className="btn-ghost"
                                                onClick={() => handleRemoveSubButton(btnIdx, rIdx, sbIdx)}
                                                style={{ color: '#ef4444', padding: '0.1rem 0.25rem' }}
                                                title="Remover este botão"
                                              >
                                                <Trash2 size={11} />
                                              </button>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Caixinha de + para adicionar mais campos pós-clique */}
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => handleAddButtonResponse(btnIdx)}
                            style={{
                              alignSelf: 'flex-start',
                              fontSize: '0.72rem',
                              padding: '0.3rem 0.65rem',
                              color: '#00a884',
                              borderColor: 'rgba(0, 168, 132, 0.35)',
                              background: 'rgba(0, 168, 132, 0.1)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              fontWeight: 700,
                              borderRadius: '5px',
                              marginTop: '0.15rem'
                            }}
                          >
                            <Plus size={13} />
                            <span>+ Adicionar Próxima Mensagem pós-clique</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Botão de adicionar mais um botão (até 3 botões) */}
              {currentButtons.length < 3 && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleAddButton}
                  style={{
                    alignSelf: 'flex-start',
                    fontSize: '0.76rem',
                    padding: '0.45rem 0.9rem',
                    color: '#00a884',
                    borderColor: 'rgba(0, 168, 132, 0.45)',
                    background: 'rgba(0, 168, 132, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    fontWeight: 700,
                    borderRadius: '6px',
                    marginTop: '0.2rem'
                  }}
                >
                  <Plus size={14} />
                  <span>+ Adicionar Novo Botão ({currentButtons.length}/3)</span>
                </button>
              )}
            </div>
          )
        }
      ]
    : [
        {
          id: 'copy',
          label: 'Copy',
          icon: <AlignLeft size={14} className="field-icon" />,
          render: () => renderCopyField('Copy', 'Escreva a copy do disparo aqui...')
        }
      ];



    const allFields = [
    {
      id: 'date',
      label: 'Data',
      icon: <Calendar size={14} className="field-icon" />,
      render: () => (
        <input
          type="date"
          className="form-control"
          style={{
            colorScheme: 'dark',
            fontSize: '0.82rem',
            padding: '0.35rem 0.65rem',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '6px',
            width: '100%',
            maxWidth: '220px'
          }}
          value={formData.scheduledDate || ''}
          onChange={(e) => handleChange('scheduledDate', e.target.value)}
        />
      )
    },
    {
      id: 'time',
      label: 'Horário',
      icon: <Clock size={14} className="field-icon" />,
      render: () => (
        <input
          type="time"
          className="form-control"
          style={{
            colorScheme: 'dark',
            fontSize: '0.82rem',
            padding: '0.35rem 0.65rem',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '6px',
            width: '100%',
            maxWidth: '140px'
          }}
          value={formData.scheduledTime || ''}
          onChange={(e) => handleChange('scheduledTime', e.target.value)}
        />
      )
    },
    {
      id: 'channel',
      label: 'Canal',
      icon: <Radio size={14} className="field-icon" />,
      render: () => (
        <select
          className="form-control"
          style={{
            fontSize: '0.82rem',
            padding: '0.35rem 0.65rem',
            fontWeight: 600,
            background: channelObj.bg,
            color: channelObj.color,
            border: `1px solid ${channelObj.border || 'var(--border-subtle)'}`,
            borderRadius: '6px',
            width: '100%',
            maxWidth: '280px',
            cursor: 'pointer'
          }}
          value={formData.channel}
          onChange={(e) => handleChange('channel', e.target.value)}
        >
          {(activeFlowCategory === 'all'
            ? availableChannels
            : availableChannels.filter(ch => ch.category === activeFlowCategory || getChannelCategory(ch.value) === activeFlowCategory)
          ).map(ch => (
            <option key={ch.value} value={ch.value} style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
              {ch.label}
            </option>
          ))}
          {activeFlowCategory !== 'all' && !availableChannels.some(ch => (ch.category === activeFlowCategory || getChannelCategory(ch.value) === activeFlowCategory) && ch.value === formData.channel) && (
            <option value={formData.channel} style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
              {formData.channel}
            </option>
          )}
        </select>
      )
    },
    {
      id: 'stage',
      label: 'Status',
      icon: <Tag size={14} className="field-icon" />,
      render: () => (
        <select
          className="form-control"
          style={{
            fontSize: '0.82rem',
            padding: '0.35rem 0.65rem',
            fontWeight: 700,
            color: currentStageObj.color,
            background: currentStageObj.bg,
            border: `1px solid ${currentStageObj.border}`,
            borderRadius: '6px',
            width: '100%',
            maxWidth: '220px',
            cursor: 'pointer'
          }}
          value={formData.stage || 'Em Rascunho'}
          onChange={(e) => handleChange('stage', e.target.value)}
        >
          {availableStages.map(st => (
            <option key={st.value} value={st.value} style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
              {st.badgeIcon || ''} {st.label}
            </option>
          ))}
        </select>
      )
    },
    {
      id: 'creative',
      label: 'Criativo',
      icon: <Paperclip size={14} className="field-icon" />,
      render: () => (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            width: '100%',
            position: 'relative'
          }}
          onDragEnter={(e) => {
            e.preventDefault();
            e.stopPropagation();
            modalDragCounter.current++;
            if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
              setIsDraggingModalAtt(true);
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            try { e.dataTransfer.dropEffect = 'copy'; } catch { /* ignore */ }
            if (!isDraggingModalAtt) setIsDraggingModalAtt(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            modalDragCounter.current--;
            if (modalDragCounter.current <= 0) {
              modalDragCounter.current = 0;
              setIsDraggingModalAtt(false);
            }
          }}
          onDrop={async (e) => {
            e.preventDefault();
            e.stopPropagation();
            modalDragCounter.current = 0;
            setIsDraggingModalAtt(false);
            const files = Array.from(e.dataTransfer.files || []);
            if (files.length > 0) {
              await handleProcessAndAddFiles(files);
            }
          }}
        >
          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            multiple
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
            onChange={handleFilesSelected}
          />

          {currentAttachments.length === 0 ? (
            readOnly ? (
              <div style={{ padding: '0.65rem 0.75rem', fontSize: '0.76rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                Nenhum arquivo anexo neste disparo.
              </div>
            ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: isDraggingModalAtt ? '2px dashed #F7BA12' : '1px dashed var(--border-color)',
                borderRadius: '6px',
                padding: '1.2rem',
                textAlign: 'center',
                cursor: 'pointer',
                background: isDraggingModalAtt ? 'rgba(247, 186, 18, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                transition: 'var(--transition-fast)'
              }}
              onMouseEnter={(e) => {
                if (!isDraggingModalAtt) {
                  e.currentTarget.style.borderColor = '#4a5568';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isDraggingModalAtt) {
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                }
              }}
            >
              <Upload size={16} color={isDraggingModalAtt ? '#F7BA12' : 'var(--text-muted)'} />
              <span style={{ fontSize: '0.78rem', color: isDraggingModalAtt ? '#F7BA12' : 'var(--text-muted)', fontWeight: isDraggingModalAtt ? 700 : 500 }}>
                {isDraggingModalAtt
                  ? 'Solte os arquivos aqui (máx. 100MB)'
                  : 'Arraste e solte arquivos aqui ou clique para selecionar (Imagens, Vídeos, Docs até 100MB)'}
              </span>
            </div>
            )
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
                      background: 'var(--bg-cell)',
                      padding: '0.45rem 0.65rem',
                      borderRadius: '6px',
                      border: `1px solid ${isBefore ? 'rgba(56, 189, 248, 0.35)' : 'rgba(247, 186, 18, 0.4)'}`,
                      gap: '0.6rem'
                    }}
                  >
                    {/* Left: Thumbnail & Name */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flex: 1, minWidth: 0, overflow: 'hidden' }}>
                      {att.thumbnailUrl || (att.type === 'image' && (att.previewUrl || att.publicUrl || att.url || att.fileUrl || att.dataUrl)) ? (
                        <div style={{ width: '34px', height: '34px', borderRadius: '4px', overflow: 'hidden', flexShrink: 0, background: '#000', border: '1px solid var(--border-color)' }}>
                          <img src={att.thumbnailUrl || att.previewUrl || att.publicUrl || att.url || att.fileUrl || att.dataUrl} alt={att.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      ) : (
                        <div style={{ width: '32px', height: '32px', borderRadius: '4px', background: 'var(--bg-card-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {att.type === 'image' && <ImageIcon size={15} color="#60a5fa" />}
                          {att.type === 'video' && <VideoIcon size={15} color="#c084fc" />}
                          {att.type === 'audio' && <Music size={15} color="#4ade80" />}
                          {att.type === 'document' && <FileText size={15} color="#fbbf24" />}
                        </div>
                      )}

                      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={att.name}>
                          {att.name}
                        </span>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                          {att.type === 'document' ? '📄 DOCUMENTO' : att.type === 'image' ? '🖼️ IMAGEM' : att.type === 'audio' ? '🎵 ÁUDIO' : '🎬 VÍDEO'} • {att.size || 'Arquivo'}
                        </span>
                      </div>
                    </div>

                    {/* Middle: Position Toggle */}
                    {!readOnly && (
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
                    )}

                    {/* Right: Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
                      {!readOnly && currentAttachments.length > 1 && (
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

                      {!readOnly && (
                        <button
                          type="button"
                          className="btn-ghost"
                          style={{ fontSize: '0.7rem', padding: '0.2rem 0.4rem', color: '#ef4444' }}
                          onClick={() => handleRemoveAttachmentIndex(idx)}
                          title="Excluir este anexo"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {isDraggingModalAtt && (
                <div
                  style={{
                    border: '2px dashed #38bdf8',
                    borderRadius: '6px',
                    padding: '0.8rem',
                    textAlign: 'center',
                    background: 'rgba(56, 189, 248, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    color: '#38bdf8',
                    fontSize: '0.78rem',
                    fontWeight: 700
                  }}
                >
                  <Upload size={16} />
                  <span>Solte aqui para anexar mais arquivos (máx. 100MB)</span>
                </div>
              )}

              <button
                type="button"
                className="btn-ghost"
                style={{
                  fontSize: '0.74rem',
                  padding: '0.35rem 0.65rem',
                  background: 'rgba(59, 130, 246, 0.08)',
                  color: '#93c5fd',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  borderRadius: '5px',
                  alignSelf: 'flex-start'
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                + Adicionar Outro Arquivo (máx. 100MB)
              </button>
            </div>
          )}
        </div>
      )
    },
        ...dynamicMessageFields,
    {
      id: 'campaign',
      label: 'Lançamento',
      icon: <Layers size={14} className="field-icon" />,
      render: () => (
        <div style={{
          background: 'var(--surface-nested)',
          border: '1px solid var(--border-color)',
          borderRadius: '6px',
          padding: '0.65rem 0.85rem',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.35rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {campaign?.name || 'Campanha Principal'}
            </span>
            <span style={{
              fontSize: '0.7rem',
              fontWeight: 600,
              padding: '0.15rem 0.5rem',
              borderRadius: '12px',
              background: 'rgba(25, 103, 210, 0.12)',
              color: 'var(--info-text)',
              border: '1px solid rgba(25, 103, 210, 0.3)'
            }}>
              {campaign?.status || 'Ativa'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            <div>Código: <span style={{ color: 'var(--text-secondary)' }}>{campaign?.id}</span></div>
            {campaign?.startDate && <div>Data: <span style={{ color: 'var(--text-secondary)' }}>{campaign.startDate}</span></div>}
          </div>
        </div>
      )
    },
    {
      id: 'notes',
      label: 'Observação',
      icon: <AlignLeft size={14} className="field-icon" />,
      render: () => (
        <textarea
          className="form-control"
          value={formData.notes || ''}
          onChange={(e) => handleChange('notes', e.target.value)}
          placeholder="Adicione observações, links de documentos, responsáveis ou instruções internas..."
          style={{
            minHeight: '75px',
            fontSize: '0.8rem',
            padding: '0.5rem 0.75rem',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '6px',
            width: '100%',
            lineHeight: '1.5'
          }}
        />
      )
    },
    // Custom Columns mapped dynamically
    ...customColumns.map(col => ({
      id: col.id,
      label: col.name,
      icon: col.type === 'checkbox' ? <CheckSquare size={14} className="field-icon" /> : col.type === 'select' ? <Tag size={14} className="field-icon" /> : <Type size={14} className="field-icon" />,
      render: () => {
        const val = formData.customFields?.[col.id];
        if (col.type === 'checkbox') {
          return (
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.2rem 0' }}>
              <input
                type="checkbox"
                checked={Boolean(val)}
                onChange={(e) => handleChange('customFields', { ...(formData.customFields || {}), [col.id]: e.target.checked })}
                style={{ width: '16px', height: '16px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>{col.name}</span>
            </label>
          );
        }
        if (col.type === 'select') {
          const selectedOpt = (col.options || []).find(o => o.label === val);
          return (
            <select
              className="form-control"
              style={{
                fontSize: '0.8rem',
                padding: '0.35rem 0.65rem',
                fontWeight: 600,
                background: selectedOpt ? selectedOpt.bg : 'rgba(255,255,255,0.04)',
                color: selectedOpt ? selectedOpt.color : 'var(--text-muted)',
                border: selectedOpt ? `1px solid ${selectedOpt.border}` : '1px solid var(--border-subtle)',
                borderRadius: '6px',
                width: '100%',
                maxWidth: '220px',
                cursor: 'pointer'
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
          );
        }
        if (col.type === 'date') {
          return (
            <input
              type="date"
              className="form-control"
              style={{
                colorScheme: 'dark',
                fontSize: '0.82rem',
                padding: '0.35rem 0.65rem',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
                width: '100%',
                maxWidth: '220px'
              }}
              value={val || ''}
              onChange={(e) => handleChange('customFields', { ...(formData.customFields || {}), [col.id]: e.target.value })}
            />
          );
        }
        return (
          <input
            type="text"
            className="form-control"
            style={{
              fontSize: '0.8rem',
              padding: '0.35rem 0.65rem',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '6px',
              width: '100%'
            }}
            placeholder="Preencher valor..."
            value={val || ''}
            onChange={(e) => handleChange('customFields', { ...(formData.customFields || {}), [col.id]: e.target.value })}
          />
        );
      }
    }))
  ];

  // Split visible and hidden fields
  const visibleFields = allFields.filter(f => !hiddenColumns.includes(f.id));
  const hiddenFieldsList = allFields.filter(f => hiddenColumns.includes(f.id));

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0.5rem'
      }}
    >
      {/* Wrapper to hold side navigation arrows and modal container */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          maxWidth: '100vw',
          maxHeight: '100vh'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Setinha Lateral Esquerda (Disparo Anterior) */}
        {hasPrev && (
          <button
            type="button"
            className="disparo-side-arrow disparo-side-arrow-prev"
            onClick={(e) => {
              e.stopPropagation();
              handleNavigate('prev');
            }}
            title={`Anterior: "${prevRecord?.title || 'Disparo anterior'}" (← Seta esquerda)`}
            aria-label="Disparo anterior"
            style={{
              position: 'absolute',
              left: '-60px',
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 110,
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              background: '#12151C',
              border: '1.5px solid rgba(247, 186, 18, 0.5)',
              color: '#F7BA12',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(0,0,0,0.65), 0 0 16px rgba(247, 186, 18, 0.25)',
              transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
              e.currentTarget.style.background = '#171B24';
              e.currentTarget.style.borderColor = '#F7BA12';
              e.currentTarget.style.boxShadow = '0 12px 30px rgba(0,0,0,0.8), 0 0 22px rgba(247, 186, 18, 0.45)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
              e.currentTarget.style.background = '#12151C';
              e.currentTarget.style.borderColor = 'rgba(247, 186, 18, 0.5)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.65), 0 0 16px rgba(247, 186, 18, 0.25)';
            }}
          >
            <ChevronLeft size={26} strokeWidth={2.6} />
          </button>
        )}

        <div
          className="modal-content"
          style={{
            width: '94vw',
            maxWidth: '1180px',
            height: '92vh',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            padding: 0,
            borderRadius: '10px',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-card)',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7)'
          }}
        >
          {/* Minimalist Top Header Bar (Airtable Style) */}
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

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flex: 1, minWidth: 0 }}>
                <Type size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                <input
                  type="text"
                  value={formData.title || ''}
                  readOnly={readOnly}
                  onChange={(e) => handleChange('title', e.target.value)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-primary)',
                    fontSize: '1.15rem',
                    fontWeight: 700,
                    fontFamily: 'inherit',
                    width: '100%',
                    outline: 'none',
                    padding: '0.1rem 0'
                  }}
                  placeholder="Nome do disparo..."
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
              {readOnly && (
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    color: 'var(--text-secondary)',
                    background: 'rgba(148, 163, 184, 0.14)',
                    border: '1px solid var(--border-color)',
                    padding: '0.18rem 0.5rem',
                    borderRadius: '5px',
                    marginRight: '0.25rem'
                  }}
                >
                  Somente Leitura
                </span>
              )}

              {/* Header Navigation: < X de Y > */}
              {recordsList && recordsList.length > 1 && currentIndex >= 0 && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.2rem',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    padding: '0.15rem 0.35rem',
                    marginRight: '0.35rem'
                  }}
                >
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => handleNavigate('prev')}
                    disabled={!hasPrev}
                    style={{
                      padding: '0.2rem 0.35rem',
                      opacity: hasPrev ? 1 : 0.25,
                      cursor: hasPrev ? 'pointer' : 'not-allowed',
                      color: hasPrev ? '#F7BA12' : 'inherit'
                    }}
                    title={hasPrev ? `Anterior: "${prevRecord?.title}" (←)` : 'Primeiro disparo da tabela'}
                  >
                    <ChevronLeft size={15} strokeWidth={2.5} />
                  </button>

                  <span
                    style={{
                      fontSize: '0.72rem',
                      color: 'var(--text-muted)',
                      fontWeight: 600,
                      padding: '0 0.35rem',
                      whiteSpace: 'nowrap',
                      userSelect: 'none'
                    }}
                  >
                    <strong style={{ color: '#F7BA12' }}>{currentIndex + 1}</strong> de {recordsList.length}
                  </span>

                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => handleNavigate('next')}
                    disabled={!hasNext}
                    style={{
                      padding: '0.2rem 0.35rem',
                      opacity: hasNext ? 1 : 0.25,
                      cursor: hasNext ? 'pointer' : 'not-allowed',
                      color: hasNext ? '#F7BA12' : 'inherit'
                    }}
                    title={hasNext ? `Próximo: "${nextRecord?.title}" (→)` : 'Último disparo da tabela'}
                  >
                    <ChevronRight size={15} strokeWidth={2.5} />
                  </button>
                </div>
              )}

            {!readOnly && (
              <>
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
              </>
            )}

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

        {/* Modal Body: 2 Columns (Airtable Vertical Field Form on Left, Live Simulator on Right) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1.35fr 1fr',
          flex: 1,
          minHeight: 0,
          overflow: 'hidden'
        }}>
          {/* Left Column: Airtable Vertical Field List */}
          <div className={`airtable-record-container${readOnly ? ' read-only-form' : ''}`}>
            {/* Render Visible Fields */}
            {visibleFields.map(field => (
              <div key={field.id} className="airtable-field-row">
                <div className="airtable-field-label-col">
                  {field.icon}
                  <span>{field.label}</span>
                  {!readOnly && onToggleColumnVisibility && (
                    <button
                      type="button"
                      className="airtable-field-hide-btn"
                      onClick={() => onToggleColumnVisibility(field.id)}
                      title={`Ocultar campo "${field.label}"`}
                    >
                      <EyeOff size={13} />
                    </button>
                  )}
                </div>
                <div className="airtable-field-value-col">
                  {field.render()}
                </div>
              </div>
            ))}

            {/* Hidden Fields Toggle Bar (Airtable Style) */}
            {hiddenFieldsList.length > 0 && (
              <>
                <div
                  className="airtable-hidden-toggle-bar"
                  onClick={() => setShowHiddenFields(!showHiddenFields)}
                >
                  <EyeOff size={13} />
                  <span>
                    {showHiddenFields ? 'Ocultar' : 'Mostrar'} {hiddenFieldsList.length} campo(s) oculto(s)
                  </span>
                  {showHiddenFields ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>

                {/* Render Hidden Fields when expanded */}
                {showHiddenFields && hiddenFieldsList.map(field => (
                  <div key={field.id} className="airtable-field-row" style={{ opacity: 0.85 }}>
                    <div className="airtable-field-label-col">
                      {field.icon}
                      <span>{field.label}</span>
                      {onToggleColumnVisibility && (
                        <button
                          type="button"
                          className="btn-ghost"
                          style={{
                            marginLeft: 'auto',
                            fontSize: '0.68rem',
                            padding: '0.15rem 0.35rem',
                            color: '#38bdf8',
                            background: 'rgba(56, 189, 248, 0.1)',
                            borderRadius: '4px'
                          }}
                          onClick={() => onToggleColumnVisibility(field.id)}
                          title={`Mostrar campo "${field.label}"`}
                        >
                          <Eye size={12} />
                        </button>
                      )}
                    </div>
                    <div className="airtable-field-value-col">
                      {field.render()}
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* Action Bar at Bottom */}
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

          {/* Right Column: Clean Multi-Channel Live Simulator */}
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

      {/* Setinha Lateral Direita (Próximo Disparo) */}
      {hasNext && (
          <button
            type="button"
            className="disparo-side-arrow disparo-side-arrow-next"
            onClick={(e) => {
              e.stopPropagation();
              handleNavigate('next');
            }}
            title={`Próximo: "${nextRecord?.title || 'Próximo disparo'}" (→ Seta direita)`}
            aria-label="Próximo disparo"
            style={{
              position: 'absolute',
              right: '-60px',
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 110,
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              background: '#12151C',
              border: '1.5px solid rgba(247, 186, 18, 0.5)',
              color: '#F7BA12',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(0,0,0,0.65), 0 0 16px rgba(247, 186, 18, 0.25)',
              transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
              e.currentTarget.style.background = '#171B24';
              e.currentTarget.style.borderColor = '#F7BA12';
              e.currentTarget.style.boxShadow = '0 12px 30px rgba(0,0,0,0.8), 0 0 22px rgba(247, 186, 18, 0.45)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
              e.currentTarget.style.background = '#12151C';
              e.currentTarget.style.borderColor = 'rgba(247, 186, 18, 0.5)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.65), 0 0 16px rgba(247, 186, 18, 0.25)';
            }}
          >
            <ChevronRight size={26} strokeWidth={2.6} />
          </button>
        )}
      </div>
    </div>
  );
}
