import React, { useState } from 'react';
import {
  Maximize2,
  Type,
  Radio,
  Calendar,
  Clock,
  Paperclip,
  Image as ImageIcon,
  Play,
  FileText,
  Music,
  Download,
  AlignLeft,
  Tag,
  Plus,
  Trash2,
  Copy,
  Smartphone,
  ChevronDown,
  ChevronRight,
  Mail,
  CheckSquare,
  X,
  Check,
  Settings
} from 'lucide-react';
import { BRABO_CHANNELS, DISPARO_STAGES, resolveCopyVariables, getStageObj, getChannelsByCategory } from '../data/initialData';
import { YouTubeIcon } from './ChannelPreview';
import { triggerFileDownload, getAttachmentUrl } from '../services/attachmentStorage';

// Compact Attachment Thumbnail Preview Component for Grid Cells
function AttachmentThumbnail({ attachment, onOpenRecord, record }) {
  const [mediaUrl, setMediaUrl] = useState(
    attachment?.thumbnailUrl || attachment?.previewUrl || attachment?.dataUrl || null
  );

  React.useEffect(() => {
    let isMounted = true;
    if (attachment) {
      const initial = attachment.thumbnailUrl || attachment.previewUrl || attachment.dataUrl;
      if (initial) {
        setMediaUrl(initial);
      } else if (attachment.id) {
        getAttachmentUrl(attachment.id).then(blobUrl => {
          if (isMounted && blobUrl) {
            setMediaUrl(blobUrl);
          }
        });
      }
    } else {
      setMediaUrl(null);
    }
    return () => {
      isMounted = false;
    };
  }, [attachment]);

  if (!attachment) {
    return (
      <div
        className="grid-empty-creative"
        onClick={() => onOpenRecord(record)}
        title="Nenhum anexo/criativo. Clique para abrir e adicionar foto ou vídeo."
      >
        <Paperclip size={12} />
      </div>
    );
  }

  const { type, name, size } = attachment;

  if (type === 'image') {
    return (
      <div
        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', cursor: 'pointer', maxWidth: '100%' }}
        onClick={() => onOpenRecord(record)}
        title={`Imagem: ${name} (${size}) - Clique para expandir`}
      >
        <div className="grid-creative-thumb" style={{ border: '1px solid rgba(56, 189, 248, 0.4)' }}>
          {mediaUrl ? (
            <img
              src={mediaUrl}
              alt={name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <ImageIcon size={14} color="#38bdf8" />
          )}
        </div>
        <span style={{ fontSize: '0.72rem', color: '#38bdf8', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {name}
        </span>
      </div>
    );
  }

  if (type === 'video') {
    return (
      <div
        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', cursor: 'pointer', maxWidth: '100%' }}
        onClick={() => onOpenRecord(record)}
        title={`Vídeo: ${name} (${size}) - Clique para expandir`}
      >
        <div className="grid-creative-thumb" style={{ border: '1px solid rgba(168, 85, 247, 0.4)' }}>
          {mediaUrl ? (
            <img
              src={mediaUrl}
              alt={name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <Play size={12} fill="#a855f7" color="#a855f7" />
          )}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0,0,0,0.35)'
            }}
          >
            <Play size={10} fill="#fff" color="#fff" style={{ marginLeft: '1px' }} />
          </div>
        </div>
        <span style={{ fontSize: '0.72rem', color: '#c084fc', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {name}
        </span>
      </div>
    );
  }

  if (type === 'audio') {
    return (
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          cursor: 'pointer',
          padding: '0.15rem 0.4rem',
          background: 'rgba(234, 179, 8, 0.1)',
          border: '1px solid rgba(234, 179, 8, 0.25)',
          borderRadius: '5px',
          maxWidth: '100%'
        }}
        onClick={() => onOpenRecord(record)}
        title={`Áudio: ${name} (${size})`}
      >
        <Music size={12} color="#eab308" />
        <span style={{ fontSize: '0.7rem', color: '#eab308', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {name}
        </span>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        cursor: 'pointer',
        padding: '0.15rem 0.4rem',
        background: 'rgba(148, 163, 184, 0.1)',
        border: '1px solid rgba(148, 163, 184, 0.25)',
        borderRadius: '5px',
        maxWidth: '100%'
      }}
      onClick={() => onOpenRecord(record)}
      title={`Documento: ${name} (${size})`}
    >
      <FileText size={12} color="#94a3b8" />
      <span style={{ fontSize: '0.7rem', color: '#cbd5e1', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {name}
      </span>
    </div>
  );
}

export default function GridView({
  records,
  campaign,
  onUpdateRecord,
  onOpenRecord,
  onDeleteRecord,
  onDuplicateRecord,
  onAddNewRow,
  rowDensity,
  groupBy,
  selectedRecordIds,
  setSelectedRecordIds,
  onUpdateCustomColumns,
  hiddenColumns = [],
  activeFlowCategory = 'whatsapp'
}) {
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [isAddColumnModalOpen, setIsAddColumnModalOpen] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [newColType, setNewColType] = useState('checkbox');

  // Custom columns from campaign
  const customColumns = campaign?.customColumns || [
    { id: 'col_verif', name: 'Verificação', type: 'checkbox', width: 110 }
  ];

  // Column Resizing State
  const defaultWidths = {
    select: 60,
    title: 270,
    stage: 140,
    channel: 200,
    date: 125,
    time: 90,
    creative: 125,
    copy: 320,
    notes: 200,
    col_verif: 110,
    actions: 100
  };

  const [colWidths, setColWidths] = useState(() => {
    try {
      const saved = localStorage.getItem('brabo_grid_col_widths_v3') || localStorage.getItem('brabo_grid_col_widths_v2') || localStorage.getItem('brabo_grid_col_widths');
      return saved ? { ...defaultWidths, ...JSON.parse(saved) } : defaultWidths;
    } catch {
      return defaultWidths;
    }
  });

  const startResize = (colKey, e) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = colWidths[colKey] || defaultWidths[colKey] || 110;

    const onMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const newWidth = Math.max(45, startWidth + deltaX);
      setColWidths(prev => {
        const next = { ...prev, [colKey]: newWidth };
        try {
          localStorage.setItem('brabo_grid_col_widths_v3', JSON.stringify(next));
        } catch { }
        return next;
      });
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const predefinedLinks = campaign?.predefinedLinks || [];

  const toggleGroupCollapse = (groupKey) => {
    setCollapsedGroups(prev => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  const toggleSelectAll = () => {
    if (selectedRecordIds.length === records.length) {
      setSelectedRecordIds([]);
    } else {
      setSelectedRecordIds(records.map(r => r.id));
    }
  };

  const toggleSelectRecord = (id) => {
    setSelectedRecordIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // State for tags in Add Column Modal
  const [colTagOptions, setColTagOptions] = useState([
    { id: 'opt-1', label: 'Pendente', color: '#fb923c', bg: 'rgba(251, 146, 60, 0.15)', border: 'rgba(251, 146, 60, 0.35)' },
    { id: 'opt-2', label: 'Aprovado', color: '#34d399', bg: 'rgba(52, 211, 153, 0.15)', border: 'rgba(52, 211, 153, 0.35)' },
    { id: 'opt-3', label: 'Ajustar', color: '#fb7185', bg: 'rgba(251, 113, 133, 0.15)', border: 'rgba(251, 113, 133, 0.35)' }
  ]);
  const [newTagLabel, setNewTagLabel] = useState('');
  const [newTagColor, setNewTagColor] = useState('#38bdf8');

  // State for Editing/Managing Tags on an existing custom column
  const [isEditColumnModalOpen, setIsEditColumnModalOpen] = useState(false);
  const [editingColId, setEditingColId] = useState(null);
  const [editColName, setEditColName] = useState('');
  const [editColType, setEditColType] = useState('select');
  const [editColTags, setEditColTags] = useState([]);
  const [editNewTagLabel, setEditNewTagLabel] = useState('');
  const [editNewTagColor, setEditNewTagColor] = useState('#38bdf8');

  // 16 rich color tones including soft pastels and classics
  const colorPresets = [
    { label: 'Menta Pastel', color: '#34d399', bg: 'rgba(52, 211, 153, 0.15)', border: 'rgba(52, 211, 153, 0.35)' },
    { label: 'Céu Pastel', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)', border: 'rgba(56, 189, 248, 0.35)' },
    { label: 'Lavanda Pastel', color: '#818cf8', bg: 'rgba(129, 140, 248, 0.15)', border: 'rgba(129, 140, 248, 0.35)' },
    { label: 'Lilás Suave', color: '#c084fc', bg: 'rgba(192, 132, 252, 0.15)', border: 'rgba(192, 132, 252, 0.35)' },
    { label: 'Rosa Blush', color: '#f472b6', bg: 'rgba(244, 114, 182, 0.15)', border: 'rgba(244, 114, 182, 0.35)' },
    { label: 'Coral Pastel', color: '#fb7185', bg: 'rgba(251, 113, 133, 0.15)', border: 'rgba(251, 113, 133, 0.35)' },
    { label: 'Pêssego Pastel', color: '#fb923c', bg: 'rgba(251, 146, 60, 0.15)', border: 'rgba(251, 146, 60, 0.35)' },
    { label: 'Amarelo Suave', color: '#facc15', bg: 'rgba(250, 204, 21, 0.15)', border: 'rgba(250, 204, 21, 0.35)' },
    { label: 'Sálvia / Chá', color: '#a3e635', bg: 'rgba(163, 230, 53, 0.15)', border: 'rgba(163, 230, 53, 0.35)' },
    { label: 'Turquesa Suave', color: '#2dd4bf', bg: 'rgba(45, 212, 191, 0.15)', border: 'rgba(45, 212, 191, 0.35)' },
    { label: 'Azul Gelo', color: '#93c5fd', bg: 'rgba(147, 197, 253, 0.15)', border: 'rgba(147, 197, 253, 0.35)' },
    { label: 'Areia / Nude', color: '#d6d3d1', bg: 'rgba(214, 211, 209, 0.15)', border: 'rgba(214, 211, 209, 0.35)' },
    { label: 'Verde Esmeralda', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.35)' },
    { label: 'Azul Real', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.35)' },
    { label: 'Roxo Nobre', color: '#a855f7', bg: 'rgba(168, 85, 247, 0.15)', border: 'rgba(168, 85, 247, 0.35)' },
    { label: 'Vermelho Carmim', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.35)' }
  ];

  const handleAddTagOption = () => {
    if (!newTagLabel.trim()) return;
    const preset = colorPresets.find(p => p.color === newTagColor) || colorPresets[0];
    const newOption = {
      id: `opt-${Date.now()}`,
      label: newTagLabel.trim(),
      color: preset.color,
      bg: preset.bg,
      border: preset.border
    };
    setColTagOptions(prev => [...prev, newOption]);
    setNewTagLabel('');
  };

  const handleRemoveTagOption = (optId) => {
    setColTagOptions(prev => prev.filter(o => o.id !== optId));
  };

  // Open Edit Modal for a custom column (called on double click or edit button)
  const handleOpenEditColumn = (customCol) => {
    if (!customCol) return;
    setEditingColId(customCol.id);
    setEditColName(customCol.name || '');
    setEditColType(customCol.type || 'text');
    setEditColTags(customCol.options ? [...customCol.options] : []);
    setEditNewTagLabel('');
    setEditNewTagColor(colorPresets[0].color);
    setIsEditColumnModalOpen(true);
  };

  const handleAddEditTagOption = () => {
    if (!editNewTagLabel.trim()) return;
    const preset = colorPresets.find(p => p.color === editNewTagColor) || colorPresets[0];
    const newOption = {
      id: `opt-${Date.now()}`,
      label: editNewTagLabel.trim(),
      color: preset.color,
      bg: preset.bg,
      border: preset.border
    };
    setEditColTags(prev => [...prev, newOption]);
    setEditNewTagLabel('');
  };

  const handleRemoveEditTagOption = (optId) => {
    setEditColTags(prev => prev.filter(o => o.id !== optId));
  };

  const handleSaveEditColumn = (e) => {
    e.preventDefault();
    if (!editColName.trim() || !editingColId) return;

    const updatedCols = customColumns.map(col => {
      if (col.id === editingColId) {
        return {
          ...col,
          name: editColName.trim(),
          options: col.type === 'select' ? editColTags : col.options
        };
      }
      return col;
    });

    if (onUpdateCustomColumns) {
      onUpdateCustomColumns(updatedCols);
    }
    setIsEditColumnModalOpen(false);
  };

  // Add custom column
  const handleAddColumnSubmit = (e) => {
    e.preventDefault();
    if (!newColName.trim()) return;

    const newCol = {
      id: `col_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: newColName.trim(),
      type: newColType,
      width: newColType === 'checkbox' ? 110 : newColType === 'select' ? 145 : 160,
      options: newColType === 'select' ? colTagOptions : undefined
    };

    const updatedCols = [...customColumns, newCol];
    if (onUpdateCustomColumns) {
      onUpdateCustomColumns(updatedCols);
    }
    setColWidths(prev => ({ ...prev, [newCol.id]: newCol.width }));
    setNewColName('');
    setNewColType('select');
    setIsAddColumnModalOpen(false);
  };

  const handleDeleteCustomColumn = (colId) => {
    if (window.confirm('Excluir esta coluna customizada?')) {
      const updatedCols = customColumns.filter(c => c.id !== colId);
      if (onUpdateCustomColumns) {
        onUpdateCustomColumns(updatedCols);
      }
      if (isEditColumnModalOpen && editingColId === colId) {
        setIsEditColumnModalOpen(false);
      }
    }
  };

  // Grouping logic
  const groupedRecords = React.useMemo(() => {
    if (groupBy === 'none') {
      return { 'Todos os Disparos da Campanha': records };
    }
    const groups = {};
    records.forEach(rec => {
      const key = rec[groupBy] || 'Sem Categoria';
      if (!groups[key]) groups[key] = [];
      groups[key].push(rec);
    });
    return groups;
  }, [records, groupBy]);

  // Column Reordering State
  const baseColIds = ['title', 'stage', 'channel', 'date', 'time', 'creative', 'copy', 'notes'];
  const allAvailableColIds = React.useMemo(() => [
    ...baseColIds,
    ...customColumns.map(c => c.id)
  ], [customColumns]);

  const [columnOrder, setColumnOrder] = useState(() => {
    try {
      const saved = localStorage.getItem('brabo_grid_column_order_v4');
      if (saved) {
        const parsed = JSON.parse(saved);
        const valid = parsed.filter(id => allAvailableColIds.includes(id));
        const missing = allAvailableColIds.filter(id => !valid.includes(id));
        return [...valid, ...missing];
      }
      const legacy = localStorage.getItem('brabo_grid_column_order_v3') || localStorage.getItem('brabo_grid_column_order');
      if (legacy) {
        let list = JSON.parse(legacy);
        if (list.includes('date') && !list.includes('time')) {
          const dateIdx = list.indexOf('date');
          list.splice(dateIdx + 1, 0, 'time');
        }
        if (!list.includes('creative')) {
          const copyIdx = list.indexOf('copy');
          if (copyIdx > -1) {
            list.splice(copyIdx, 0, 'creative');
          } else {
            list.push('creative');
          }
        }
        if (!list.includes('notes')) {
          const copyIdx = list.indexOf('copy');
          if (copyIdx > -1) {
            list.splice(copyIdx + 1, 0, 'notes');
          } else {
            list.push('notes');
          }
        }
        const valid = list.filter(id => allAvailableColIds.includes(id));
        const missing = allAvailableColIds.filter(id => !valid.includes(id));
        return [...valid, ...missing];
      }
    } catch { }
    return allAvailableColIds;
  });

  // Sync columnOrder whenever customColumns change
  React.useEffect(() => {
    setColumnOrder(prev => {
      const valid = prev.filter(id => allAvailableColIds.includes(id));
      const missing = allAvailableColIds.filter(id => !valid.includes(id));
      const next = [...valid, ...missing];
      try {
        localStorage.setItem('brabo_grid_column_order_v4', JSON.stringify(next));
        localStorage.setItem('brabo_grid_column_order_v3', JSON.stringify(next));
        localStorage.setItem('brabo_grid_column_order', JSON.stringify(next));
      } catch { }
      return next;
    });
  }, [allAvailableColIds]);

  const [draggedColId, setDraggedColId] = useState(null);
  const [dragOverColId, setDragOverColId] = useState(null);

  const handleColDragStart = (e, colId) => {
    if (e.target.classList.contains('col-resizer')) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('text/plain', colId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedColId(colId);
  };

  const handleColDragOver = (e, targetColId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedColId && draggedColId !== targetColId && dragOverColId !== targetColId) {
      setDragOverColId(targetColId);
    }
  };

  const handleColDragLeave = (e, targetColId) => {
    if (e.currentTarget.contains(e.relatedTarget)) return;
    if (dragOverColId === targetColId) {
      setDragOverColId(null);
    }
  };

  const handleColDrop = (e, targetColId) => {
    e.preventDefault();
    e.stopPropagation();
    const sourceColId = e.dataTransfer.getData('text/plain') || draggedColId;
    if (sourceColId && targetColId && sourceColId !== targetColId) {
      setColumnOrder(prev => {
        const newOrder = [...prev];
        const sourceIndex = newOrder.indexOf(sourceColId);
        const targetIndex = newOrder.indexOf(targetColId);
        if (sourceIndex > -1 && targetIndex > -1) {
          newOrder.splice(sourceIndex, 1);
          newOrder.splice(targetIndex, 0, sourceColId);
          try {
            localStorage.setItem('brabo_grid_column_order_v3', JSON.stringify(newOrder));
            localStorage.setItem('brabo_grid_column_order', JSON.stringify(newOrder));
          } catch { }
        }
        return newOrder;
      });
    }
    setDraggedColId(null);
    setDragOverColId(null);
  };

  // Render individual header cell
  const renderHeaderCell = (colId) => {
    const isDragging = draggedColId === colId;
    const isDragOver = dragOverColId === colId;

    const dragProps = {
      draggable: true,
      onDragStart: (e) => handleColDragStart(e, colId),
      onDragOver: (e) => handleColDragOver(e, colId),
      onDragLeave: (e) => handleColDragLeave(e, colId),
      onDrop: (e) => handleColDrop(e, colId)
    };

    const dragStyle = {
      cursor: 'grab',
      opacity: isDragging ? 0.4 : 1,
      borderLeft: isDragOver ? '3px solid var(--accent-primary)' : undefined,
      background: isDragOver ? 'rgba(59, 130, 246, 0.1)' : undefined,
      transition: 'background 0.15s ease, border 0.15s ease'
    };

    if (colId === 'title') {
      return (
        <div
          key="title"
          className="grid-header-cell"
          style={{ width: `${colWidths.title}px`, minWidth: `${colWidths.title}px`, ...dragStyle }}
          {...dragProps}
          title="Clique e arraste para reposicionar esta coluna"
        >
          <Type size={13} className="cell-icon" />
          <span>Nome / Momento do Disparo</span>
          <div className="col-resizer" onMouseDown={(e) => startResize('title', e)} />
        </div>
      );
    }

    if (colId === 'stage') {
      return (
        <div
          key="stage"
          className="grid-header-cell"
          style={{ width: `${colWidths.stage}px`, minWidth: `${colWidths.stage}px`, ...dragStyle }}
          {...dragProps}
          title="Clique e arraste para reposicionar esta coluna"
        >
          <Tag size={13} className="cell-icon" />
          <span>Status</span>
          <div className="col-resizer" onMouseDown={(e) => startResize('stage', e)} />
        </div>
      );
    }

    if (colId === 'channel') {
      return (
        <div
          key="channel"
          className="grid-header-cell"
          style={{ width: `${colWidths.channel}px`, minWidth: `${colWidths.channel}px`, ...dragStyle }}
          {...dragProps}
          title="Clique e arraste para reposicionar esta coluna"
        >
          <Radio size={13} className="cell-icon" />
          <span>Canal de Disparo</span>
          <div className="col-resizer" onMouseDown={(e) => startResize('channel', e)} />
        </div>
      );
    }

    if (colId === 'date') {
      return (
        <div
          key="date"
          className="grid-header-cell"
          style={{ width: `${colWidths.date}px`, minWidth: `${colWidths.date}px`, ...dragStyle }}
          {...dragProps}
          title="Clique e arraste para reposicionar esta coluna"
        >
          <Calendar size={13} className="cell-icon" />
          <span>Data</span>
          <div className="col-resizer" onMouseDown={(e) => startResize('date', e)} />
        </div>
      );
    }

    if (colId === 'time') {
      return (
        <div
          key="time"
          className="grid-header-cell"
          style={{ width: `${colWidths.time}px`, minWidth: `${colWidths.time}px`, ...dragStyle }}
          {...dragProps}
          title="Clique e arraste para reposicionar esta coluna"
        >
          <Clock size={13} className="cell-icon" />
          <span>Horário</span>
          <div className="col-resizer" onMouseDown={(e) => startResize('time', e)} />
        </div>
      );
    }

    if (colId === 'creative') {
      return (
        <div
          key="creative"
          className="grid-header-cell"
          style={{ width: `${colWidths.creative}px`, minWidth: `${colWidths.creative}px`, ...dragStyle }}
          {...dragProps}
          title="Clique e arraste para reposicionar esta coluna"
        >
          <Paperclip size={13} className="cell-icon" />
          <span>Criativo / Anexo</span>
          <div className="col-resizer" onMouseDown={(e) => startResize('creative', e)} />
        </div>
      );
    }

    if (colId === 'copy') {
      return (
        <div
          key="copy"
          className="grid-header-cell"
          style={{ width: `${colWidths.copy}px`, minWidth: `${colWidths.copy}px`, ...dragStyle }}
          {...dragProps}
          title="Clique e arraste para reposicionar esta coluna"
        >
          <AlignLeft size={13} className="cell-icon" />
          <span>Copy / Mensagem</span>
          <div className="col-resizer" onMouseDown={(e) => startResize('copy', e)} />
        </div>
      );
    }

    if (colId === 'notes') {
      return (
        <div
          key="notes"
          className="grid-header-cell"
          style={{ width: `${colWidths.notes}px`, minWidth: `${colWidths.notes}px`, ...dragStyle }}
          {...dragProps}
          title="Clique e arraste para reposicionar esta coluna"
        >
          <FileText size={13} className="cell-icon" />
          <span>Observações</span>
          <div className="col-resizer" onMouseDown={(e) => startResize('notes', e)} />
        </div>
      );
    }

    // Custom Column
    const customCol = customColumns.find(c => c.id === colId);
    if (customCol) {
      const w = colWidths[customCol.id] || customCol.width || 110;
      return (
        <div
          key={customCol.id}
          className="grid-header-cell"
          style={{
            width: `${w}px`,
            minWidth: `${w}px`,
            justifyContent: customCol.type === 'checkbox' ? 'center' : 'flex-start',
            cursor: 'pointer',
            ...dragStyle
          }}
          {...dragProps}
          onDoubleClick={(e) => {
            e.stopPropagation();
            handleOpenEditColumn(customCol);
          }}
          title={customCol.type === 'select' ? "Duplo clique para gerenciar tags e opções desta coluna" : "Duplo clique para configurar esta coluna"}
        >
          {customCol.type === 'checkbox' ? (
            <CheckSquare size={13} className="cell-icon" />
          ) : customCol.type === 'select' ? (
            <Tag size={13} className="cell-icon" />
          ) : customCol.type === 'date' ? (
            <Calendar size={13} className="cell-icon" />
          ) : (
            <Type size={13} className="cell-icon" />
          )}
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {customCol.name}
          </span>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '2px' }}>
            {/* Manage tags / settings button */}
            <button
              className="btn-ghost"
              style={{ padding: '0.15rem', color: '#94a3b8' }}
              onClick={(e) => {
                e.stopPropagation();
                handleOpenEditColumn(customCol);
              }}
              title="Gerenciar tags e opções desta coluna"
            >
              <Settings size={11} />
            </button>

            {/* Delete custom column button */}
            <button
              className="btn-ghost"
              style={{ padding: '0.15rem', color: '#64748b' }}
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteCustomColumn(customCol.id);
              }}
              title={`Excluir coluna "${customCol.name}"`}
            >
              <X size={11} />
            </button>
          </div>

          <div className="col-resizer" onMouseDown={(e) => startResize(customCol.id, e)} />
        </div>
      );
    }

    return null;
  };

  // Render individual row cell
  const renderRowCell = (colId, record, channelObj, stageObj, resolvedCopy) => {
    if (colId === 'title') {
      return (
        <div
          key="title"
          className="grid-cell"
          style={{ width: `${colWidths.title}px`, minWidth: `${colWidths.title}px`, fontWeight: 600, color: 'var(--text-main)' }}
        >
          <input
            type="text"
            className="cell-input"
            value={record.title}
            onChange={(e) => onUpdateRecord(record.id, { title: e.target.value })}
          />
        </div>
      );
    }

    if (colId === 'stage') {
      return (
        <div
          key="stage"
          className="grid-cell"
          style={{ width: `${colWidths.stage}px`, minWidth: `${colWidths.stage}px` }}
        >
          <select
            className="form-control"
            style={{
              padding: '0.2rem 0.45rem',
              fontSize: '0.75rem',
              fontWeight: 700,
              border: `1px solid ${stageObj.border}`,
              background: stageObj.bg,
              color: stageObj.color,
              borderRadius: '6px',
              cursor: 'pointer'
            }}
            value={record.stage || 'Em Rascunho'}
            onChange={(e) => onUpdateRecord(record.id, { stage: e.target.value })}
          >
            {DISPARO_STAGES.map(st => (
              <option
                key={st.value}
                value={st.value}
                style={{ background: '#161b26', color: st.color }}
              >
                {st.badgeIcon} {st.label}
              </option>
            ))}
          </select>
        </div>
      );
    }

    if (colId === 'channel') {
      return (
        <div
          key="channel"
          className="grid-cell"
          style={{ width: `${colWidths.channel}px`, minWidth: `${colWidths.channel}px` }}
        >
          <select
            className="form-control"
            style={{
              padding: '0.25rem 0.5rem',
              fontSize: '0.78rem',
              fontWeight: 600,
              border: 'none',
              background: channelObj.bg,
              color: channelObj.color,
              borderRadius: '6px'
            }}
            value={record.channel}
            onChange={(e) => onUpdateRecord(record.id, { channel: e.target.value })}
          >
            {(activeFlowCategory === 'all'
              ? BRABO_CHANNELS
              : getChannelsByCategory(activeFlowCategory)
            ).map(ch => (
              <option
                key={ch.value}
                value={ch.value}
                style={{ background: '#161b26', color: '#fff' }}
              >
                {ch.label}
              </option>
            ))}
            {activeFlowCategory !== 'all' && !getChannelsByCategory(activeFlowCategory).some(ch => ch.value === record.channel) && (
              <option value={record.channel} style={{ background: '#161b26', color: '#fff' }}>
                {record.channel}
              </option>
            )}
          </select>
        </div>
      );
    }

    if (colId === 'date') {
      return (
        <div
          key="date"
          className="grid-cell"
          style={{ width: `${colWidths.date}px`, minWidth: `${colWidths.date}px` }}
        >
          <input
            type="date"
            className="cell-input"
            value={record.scheduledDate || ''}
            onChange={(e) => onUpdateRecord(record.id, { scheduledDate: e.target.value })}
            style={{ width: '100%', colorScheme: 'dark', fontSize: '0.76rem', padding: '0.2rem 0.35rem' }}
          />
        </div>
      );
    }

    if (colId === 'time') {
      return (
        <div
          key="time"
          className="grid-cell"
          style={{ width: `${colWidths.time}px`, minWidth: `${colWidths.time}px` }}
        >
          <input
            type="time"
            className="cell-input"
            value={record.scheduledTime || ''}
            onChange={(e) => onUpdateRecord(record.id, { scheduledTime: e.target.value })}
            style={{ width: '100%', colorScheme: 'dark', fontSize: '0.76rem', padding: '0.2rem 0.35rem' }}
          />
        </div>
      );
    }

    if (colId === 'creative') {
      return (
        <div
          key="creative"
          className="grid-cell"
          style={{
            width: `${colWidths.creative}px`,
            minWidth: `${colWidths.creative}px`,
            padding: '0.2rem 0.5rem',
            overflow: 'hidden'
          }}
        >
          <AttachmentThumbnail
            attachment={record.attachment}
            onOpenRecord={onOpenRecord}
            record={record}
          />
        </div>
      );
    }

    if (colId === 'copy') {
      return (
        <div
          key="copy"
          className="grid-cell"
          style={{ width: `${colWidths.copy}px`, minWidth: `${colWidths.copy}px`, cursor: 'pointer', color: '#cbd5e1' }}
          onClick={() => onOpenRecord(record)}
          title="Clique para editar copy completa e variáveis"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', overflow: 'hidden' }}>
            {record.variables && Object.keys(record.variables).length > 0 && (
              <span style={{
                fontSize: '0.66rem',
                fontWeight: 800,
                background: 'rgba(59, 130, 246, 0.15)',
                color: '#60a5fa',
                padding: '0.1rem 0.35rem',
                borderRadius: '4px',
                flexShrink: 0
              }}>
                {Object.keys(record.variables).length} var
              </span>
            )}
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {resolvedCopy || record.copyText}
            </span>
          </div>
        </div>
      );
    }

    if (colId === 'notes') {
      return (
        <div
          key="notes"
          className="grid-cell"
          style={{ width: `${colWidths.notes}px`, minWidth: `${colWidths.notes}px` }}
        >
          <input
            type="text"
            className="cell-input"
            value={record.notes || ''}
            placeholder="Adicionar notas..."
            onChange={(e) => onUpdateRecord(record.id, { notes: e.target.value })}
            style={{ fontSize: '0.78rem', color: '#94a3b8' }}
          />
        </div>
      );
    }

    // Custom Column Cell
    const customCol = customColumns.find(c => c.id === colId);
    if (customCol) {
      const w = colWidths[customCol.id] || customCol.width || 110;
      const val = record.customFields?.[customCol.id];

      return (
        <div
          key={customCol.id}
          className="grid-cell"
          style={{
            width: `${w}px`,
            minWidth: `${w}px`,
            justifyContent: customCol.type === 'checkbox' ? 'center' : 'flex-start'
          }}
        >
          {customCol.type === 'checkbox' ? (
            <input
              type="checkbox"
              checked={Boolean(val)}
              onChange={(e) => {
                const updatedCustom = { ...(record.customFields || {}), [customCol.id]: e.target.checked };
                onUpdateRecord(record.id, { customFields: updatedCustom });
              }}
              style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: 'var(--accent-primary)' }}
            />
          ) : customCol.type === 'select' ? (
            (() => {
              const selectedOpt = (customCol.options || []).find(o => o.label === val);
              return (
                <select
                  className="form-control"
                  style={{
                    padding: '0.2rem 0.45rem',
                    fontSize: '0.74rem',
                    fontWeight: 600,
                    borderRadius: '5px',
                    cursor: 'pointer',
                    width: '100%',
                    background: selectedOpt ? selectedOpt.bg : 'rgba(255,255,255,0.04)',
                    color: selectedOpt ? selectedOpt.color : 'var(--text-muted)',
                    border: selectedOpt ? `1px solid ${selectedOpt.border}` : '1px solid var(--border-subtle)'
                  }}
                  value={val || ''}
                  onChange={(e) => {
                    const updatedCustom = { ...(record.customFields || {}), [customCol.id]: e.target.value };
                    onUpdateRecord(record.id, { customFields: updatedCustom });
                  }}
                >
                  <option value="" style={{ background: '#161b26', color: '#94a3b8' }}>
                    -- Vazio --
                  </option>
                  {(customCol.options || []).map(opt => (
                    <option
                      key={opt.id || opt.label}
                      value={opt.label}
                      style={{ background: '#161b26', color: opt.color, fontWeight: 600 }}
                    >
                      ● {opt.label}
                    </option>
                  ))}
                </select>
              );
            })()
          ) : customCol.type === 'date' ? (
            <input
              type="date"
              className="cell-input"
              value={val || ''}
              onChange={(e) => {
                const updatedCustom = { ...(record.customFields || {}), [customCol.id]: e.target.value };
                onUpdateRecord(record.id, { customFields: updatedCustom });
              }}
              style={{ colorScheme: 'dark', fontSize: '0.76rem' }}
            />
          ) : (
            <input
              type="text"
              className="cell-input"
              value={val || ''}
              placeholder="Preencher..."
              onChange={(e) => {
                const updatedCustom = { ...(record.customFields || {}), [customCol.id]: e.target.value };
                onUpdateRecord(record.id, { customFields: updatedCustom });
              }}
              style={{ fontSize: '0.78rem' }}
            />
          )}
        </div>
      );
    }

    return null;
  };

  const visibleColumns = columnOrder.filter(id => !hiddenColumns.includes(id));

  return (
    <div className={`airtable-grid row-${rowDensity}`}>
      {/* Column Headers with Resizer Handles and Drag & Drop Reordering */}
      <div className="grid-header-row">
        {/* Index / Select / Expand (Fixed at left) */}
        <div
          className="grid-header-cell"
          style={{ width: `${colWidths.select}px`, minWidth: `${colWidths.select}px`, justifyContent: 'center' }}
        >
          <input
            type="checkbox"
            checked={records.length > 0 && selectedRecordIds.length === records.length}
            onChange={toggleSelectAll}
            title="Selecionar Todos"
            style={{ cursor: 'pointer' }}
          />
          <div className="col-resizer" onMouseDown={(e) => startResize('select', e)} />
        </div>

        {/* Dynamic Reorderable Columns */}
        {visibleColumns.map(colId => renderHeaderCell(colId))}

        {/* Add Custom Column Header Button */}
        <div
          className="grid-header-cell"
          style={{
            width: '42px',
            minWidth: '42px',
            justifyContent: 'center',
            cursor: 'pointer',
            background: 'rgba(59, 130, 246, 0.08)'
          }}
          onClick={() => setIsAddColumnModalOpen(true)}
          title="Adicionar Nova Coluna Customizada (ex: Verificação, Tags, Responsável)"
        >
          <Plus size={15} color="var(--accent-primary)" />
        </div>

        {/* Ações (Fixed at right) */}
        <div
          className="grid-header-cell"
          style={{ width: `${colWidths.actions}px`, minWidth: `${colWidths.actions}px`, justifyContent: 'center' }}
        >
          <span>Ações</span>
          <div className="col-resizer" onMouseDown={(e) => startResize('actions', e)} />
        </div>
      </div>

      {/* Rows Render */}
      {Object.entries(groupedRecords).map(([groupKey, groupItems]) => {
        const isCollapsed = collapsedGroups[groupKey];
        return (
          <React.Fragment key={groupKey}>
            {groupBy !== 'none' && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.45rem 1rem',
                  backgroundColor: 'var(--bg-sidebar)',
                  borderBottom: '1px solid var(--border-color)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  color: 'var(--text-main)',
                  position: 'sticky',
                  left: 0
                }}
                onClick={() => toggleGroupCollapse(groupKey)}
              >
                {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                <span>{groupKey}</span>
                <span style={{
                  background: 'rgba(59, 130, 246, 0.15)',
                  color: '#60a5fa',
                  padding: '0.1rem 0.45rem',
                  borderRadius: '10px',
                  fontSize: '0.7rem'
                }}>
                  {groupItems.length}
                </span>
              </div>
            )}

            {!isCollapsed && groupItems.map((record) => {
              const isSelected = selectedRecordIds.includes(record.id);
              const channelObj = BRABO_CHANNELS.find(ch => ch.value === record.channel) || BRABO_CHANNELS[0];
              const stageObj = getStageObj(record.stage);
              const resolvedCopy = resolveCopyVariables(record.copyText, record.variables, predefinedLinks);

              return (
                <div
                  key={record.id}
                  className={`grid-row ${isSelected ? 'selected' : ''}`}
                >
                  {/* Index / Expand Cell */}
                  <div
                    className="grid-cell row-index"
                    style={{ width: `${colWidths.select}px`, minWidth: `${colWidths.select}px` }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectRecord(record.id)}
                      style={{ cursor: 'pointer' }}
                    />
                    <button
                      className="expand-btn"
                      onClick={() => onOpenRecord(record)}
                      title="Expandir Registro"
                    >
                      <Maximize2 size={13} />
                    </button>
                  </div>

                  {/* Dynamic Reorderable Cells */}
                  {visibleColumns.map(colId => renderRowCell(colId, record, channelObj, stageObj, resolvedCopy))}

                  {/* Empty cell spacer aligning with the + header */}
                  <div className="grid-cell" style={{ width: '42px', minWidth: '42px' }} />

                  {/* Actions */}
                  <div
                    className="grid-cell"
                    style={{ width: `${colWidths.actions}px`, minWidth: `${colWidths.actions}px`, justifyContent: 'center', gap: '0.45rem' }}
                  >
                    <button
                      className="btn-ghost"
                      style={{ padding: '0.2rem' }}
                      onClick={() => onOpenRecord(record)}
                      title="Abrir Simulador Adaptativo"
                    >
                      {record.channel === 'Email' ? (
                        <Mail size={15} color="#a78bfa" />
                      ) : record.channel === 'Comunidade YouTube' ? (
                        <YouTubeIcon size={15} color="#ef4444" />
                      ) : (
                        <Smartphone size={15} color="#25D366" />
                      )}
                    </button>
                    <button
                      className="btn-ghost"
                      style={{ padding: '0.2rem' }}
                      onClick={() => onDuplicateRecord(record)}
                      title="Duplicar Disparo"
                    >
                      <Copy size={14} color="#94a3b8" />
                    </button>
                    <button
                      className="btn-ghost"
                      style={{ padding: '0.2rem' }}
                      onClick={() => onDeleteRecord(record.id)}
                      title="Excluir Registro"
                    >
                      <Trash2 size={14} color="#ef4444" />
                    </button>
                  </div>
                </div>
              );
            })}
          </React.Fragment>
        );
      })}

      {/* Add Row Bar */}
      <div className="add-row-bar" onClick={onAddNewRow} id="btn-add-grid-row">
        <Plus size={16} />
        <span>Adicionar novo disparo ao fluxo desta campanha</span>
      </div>

      {/* Modal to Add Custom Column with Predefined Tags and Colors */}
      {isAddColumnModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddColumnModalOpen(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '520px', height: 'auto', maxHeight: '90vh', overflowY: 'auto' }}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Plus size={18} color="var(--accent-primary)" />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>
                  Adicionar Nova Coluna
                </h3>
              </div>
              <button className="btn-ghost" onClick={() => setIsAddColumnModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddColumnSubmit} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Nome da Coluna *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ex: Responsável, Prioridade, Status de Revisão..."
                  value={newColName}
                  onChange={(e) => setNewColName(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Tipo de Campo</label>
                <select
                  className="form-control"
                  value={newColType}
                  onChange={(e) => setNewColType(e.target.value)}
                  style={{ fontSize: '0.82rem' }}
                >
                  <option value="select">🏷️ Tags Coloridas / Seleção Única (Recomendado)</option>
                  <option value="checkbox">☑️ Caixa de Seleção / Checkbox (Verificação)</option>
                  <option value="text">📝 Texto Livre</option>
                  <option value="date">📅 Data</option>
                </select>
              </div>

              {/* Tag Options Builder when type is select */}
              {newColType === 'select' && (
                <div style={{
                  background: 'var(--bg-sidebar)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '0.85rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="form-label" style={{ margin: 0, fontSize: '0.76rem', color: 'var(--text-main)' }}>
                      Tags Pré-definidas ({colTagOptions.length})
                    </label>
                    <button
                      type="button"
                      className="btn-ghost"
                      style={{ fontSize: '0.68rem', padding: '0.1rem 0.4rem', color: '#38bdf8' }}
                      onClick={() => setColTagOptions([
                        { id: 'opt-1', label: 'Pendente', color: '#fb923c', bg: 'rgba(251, 146, 60, 0.15)', border: 'rgba(251, 146, 60, 0.35)' },
                        { id: 'opt-2', label: 'Em Revisão', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)', border: 'rgba(56, 189, 248, 0.35)' },
                        { id: 'opt-3', label: 'Aprovado', color: '#34d399', bg: 'rgba(52, 211, 153, 0.15)', border: 'rgba(52, 211, 153, 0.35)' },
                        { id: 'opt-4', label: 'Ajustar', color: '#fb7185', bg: 'rgba(251, 113, 133, 0.15)', border: 'rgba(251, 113, 133, 0.35)' }
                      ])}
                    >
                      Inserir padrão pastel
                    </button>
                  </div>

                  {/* List of current tags */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', minHeight: '36px', alignItems: 'center' }}>
                    {colTagOptions.length === 0 ? (
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Nenhuma tag criada. Digite abaixo e escolha a cor:
                      </span>
                    ) : (
                      colTagOptions.map(opt => (
                        <span
                          key={opt.id}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '5px',
                            background: opt.bg,
                            border: `1px solid ${opt.border}`,
                            color: opt.color,
                            fontSize: '0.74rem',
                            fontWeight: 600
                          }}
                        >
                          ● {opt.label}
                          <button
                            type="button"
                            onClick={() => handleRemoveTagOption(opt.id)}
                            style={{ background: 'transparent', border: 'none', color: opt.color, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                            title="Remover tag"
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))
                    )}
                  </div>

                  {/* Add Tag Input and Color Picker */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', paddingTop: '0.6rem', borderTop: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Nome da tag (ex: Revisado, Aprovado)"
                        value={newTagLabel}
                        onChange={(e) => setNewTagLabel(e.target.value)}
                        style={{ fontSize: '0.76rem', flex: 1 }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddTagOption();
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={handleAddTagOption}
                        disabled={!newTagLabel.trim()}
                        style={{ fontSize: '0.74rem', padding: '0.3rem 0.6rem' }}
                      >
                        <Plus size={13} />
                        <span>Adicionar Tag</span>
                      </button>
                    </div>

                    {/* Color selection palette (16 tones) */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Escolha o tom da cor (16 opções vibrantes & pastéis):</span>
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        {colorPresets.map(preset => (
                          <button
                            key={preset.color}
                            type="button"
                            onClick={() => setNewTagColor(preset.color)}
                            style={{
                              width: '22px',
                              height: '22px',
                              borderRadius: '50%',
                              background: preset.color,
                              border: newTagColor === preset.color ? '2px solid #fff' : '2px solid rgba(255,255,255,0.1)',
                              boxShadow: newTagColor === preset.color ? `0 0 8px ${preset.color}` : 'none',
                              cursor: 'pointer',
                              transform: newTagColor === preset.color ? 'scale(1.2)' : 'scale(1)',
                              transition: 'all 0.15s ease'
                            }}
                            title={preset.label}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsAddColumnModalOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={!newColName.trim()}
                >
                  <Check size={14} />
                  <span>Criar Coluna</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal to Edit Custom Column & Manage Tags (Opened via double click or edit button) */}
      {isEditColumnModalOpen && (
        <div className="modal-overlay" onClick={() => setIsEditColumnModalOpen(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '520px', height: 'auto', maxHeight: '90vh', overflowY: 'auto' }}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Settings size={18} color="var(--accent-primary)" />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>
                  Configurar Coluna
                </h3>
              </div>
              <button className="btn-ghost" onClick={() => setIsEditColumnModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEditColumn} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Nome da Coluna *</label>
                <input
                  type="text"
                  className="form-control"
                  value={editColName}
                  onChange={(e) => setEditColName(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              {/* Tag Options Management for 'select' type columns */}
              {editColType === 'select' ? (
                <div style={{
                  background: 'var(--bg-sidebar)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '0.85rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="form-label" style={{ margin: 0, fontSize: '0.76rem', color: 'var(--text-main)', fontWeight: 600 }}>
                      🏷️ Gerenciar Tags desta Coluna ({editColTags.length})
                    </label>
                    <button
                      type="button"
                      className="btn-ghost"
                      style={{ fontSize: '0.68rem', padding: '0.1rem 0.4rem', color: '#38bdf8' }}
                      onClick={() => setEditColTags([
                        { id: 'opt-1', label: 'Pendente', color: '#fb923c', bg: 'rgba(251, 146, 60, 0.15)', border: 'rgba(251, 146, 60, 0.35)' },
                        { id: 'opt-2', label: 'Em Revisão', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)', border: 'rgba(56, 189, 248, 0.35)' },
                        { id: 'opt-3', label: 'Aprovado', color: '#34d399', bg: 'rgba(52, 211, 153, 0.15)', border: 'rgba(52, 211, 153, 0.35)' },
                        { id: 'opt-4', label: 'Ajustar', color: '#fb7185', bg: 'rgba(251, 113, 133, 0.15)', border: 'rgba(251, 113, 133, 0.35)' }
                      ])}
                    >
                      Restaurar padrão pastel
                    </button>
                  </div>

                  {/* List of current tags */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', minHeight: '36px', alignItems: 'center' }}>
                    {editColTags.length === 0 ? (
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Nenhuma tag nesta coluna. Adicione novas opções abaixo:
                      </span>
                    ) : (
                      editColTags.map(opt => (
                        <span
                          key={opt.id}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.25rem 0.6rem',
                            borderRadius: '5px',
                            background: opt.bg,
                            border: `1px solid ${opt.border}`,
                            color: opt.color,
                            fontSize: '0.75rem',
                            fontWeight: 600
                          }}
                        >
                          ● {opt.label}
                          <button
                            type="button"
                            onClick={() => handleRemoveEditTagOption(opt.id)}
                            style={{ background: 'transparent', border: 'none', color: opt.color, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                            title="Remover esta tag"
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))
                    )}
                  </div>

                  {/* Add Tag Input and Color Picker */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', paddingTop: '0.6rem', borderTop: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Nome da nova tag..."
                        value={editNewTagLabel}
                        onChange={(e) => setEditNewTagLabel(e.target.value)}
                        style={{ fontSize: '0.76rem', flex: 1 }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddEditTagOption();
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={handleAddEditTagOption}
                        disabled={!editNewTagLabel.trim()}
                        style={{ fontSize: '0.74rem', padding: '0.3rem 0.6rem' }}
                      >
                        <Plus size={13} />
                        <span>Adicionar Tag</span>
                      </button>
                    </div>

                    {/* Color selection palette (16 tones) */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Escolha o tom da cor:</span>
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        {colorPresets.map(preset => (
                          <button
                            key={preset.color}
                            type="button"
                            onClick={() => setEditNewTagColor(preset.color)}
                            style={{
                              width: '22px',
                              height: '22px',
                              borderRadius: '50%',
                              background: preset.color,
                              border: editNewTagColor === preset.color ? '2px solid #fff' : '2px solid rgba(255,255,255,0.1)',
                              boxShadow: editNewTagColor === preset.color ? `0 0 8px ${preset.color}` : 'none',
                              cursor: 'pointer',
                              transform: editNewTagColor === preset.color ? 'scale(1.2)' : 'scale(1)',
                              transition: 'all 0.15s ease'
                            }}
                            title={preset.label}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', background: 'var(--bg-sidebar)', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                  Tipo da coluna: <strong>{editColType === 'checkbox' ? '☑️ Caixa de Seleção / Checkbox' : editColType === 'date' ? '📅 Data' : '📝 Texto Livre'}</strong>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn-ghost"
                  style={{ color: '#ef4444', fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                  onClick={() => handleDeleteCustomColumn(editingColId)}
                >
                  <Trash2 size={13} />
                  <span>Excluir Coluna</span>
                </button>

                <div style={{ display: 'flex', gap: '0.65rem' }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setIsEditColumnModalOpen(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={!editColName.trim()}
                  >
                    <Check size={14} />
                    <span>Salvar Alterações</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
