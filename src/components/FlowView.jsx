import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  Smartphone,
  Mail,
  Calendar as CalendarIcon,
  Clock,
  Plus,
  Copy,
  Trash2,
  Edit3,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Search,
  Share2,
  Workflow,
  Users,
  User,
  Crown,
  Lock,
  ExternalLink,
  Paperclip,
  CheckCheck
} from 'lucide-react';
import {
  resolveCopyVariables,
  getStageObj
} from '../data/initialData';
import { YouTubeIcon } from './ChannelPreview';

// Helper to get channel icon and short text
function getChannelMeta(channelValue) {
  const name = channelValue || '';

  if (name.includes('Grupo VIP') && !name.includes('Antigo')) {
    return {
      label: 'Grupo VIP',
      icon: Crown
    };
  }
  if (name.includes('Grupo VIP Antigo')) {
    return {
      label: 'VIP Antigo',
      icon: Crown
    };
  }
  if (name.includes('Grupo Normal') || name.includes('Normal Antigo')) {
    return {
      label: 'Grupo Normal',
      icon: Users
    };
  }
  if (name.includes('Janela Fechada')) {
    return {
      label: '1:1 Fechada',
      icon: Lock
    };
  }
  if (name.includes('Individual') || name.includes('Janela Aberta')) {
    return {
      label: '1 a 1 Aberta',
      icon: User
    };
  }
  if (name === 'Email') {
    return {
      label: 'Email',
      icon: Mail
    };
  }
  if (name === 'Comunidade YouTube') {
    return {
      label: 'YouTube',
      icon: YouTubeIcon,
      isCustomIcon: true
    };
  }

  return {
    label: channelValue || 'WhatsApp',
    icon: Smartphone
  };
}

// Helper to format WhatsApp markdown (*bold*, _italic_, ~strike~)
function renderFormattedCopy(text) {
  if (!text) return <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Sem texto definido</span>;

  const truncated = text.length > 200 ? text.slice(0, 200) + '...' : text;
  const lines = truncated.split('\n');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
      {lines.map((line, lineIdx) => {
        if (!line.trim()) {
          return <div key={lineIdx} style={{ height: '0.35rem' }} />;
        }

        const parts = line.split(/(\*[^*]+\*|_.*?_|~.*?~)/g);
        return (
          <div key={lineIdx} style={{ minHeight: '1rem', wordBreak: 'break-word', lineHeight: 1.45 }}>
            {parts.map((part, pIdx) => {
              if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
                return <strong key={pIdx} style={{ color: '#fff', fontWeight: 600 }}>{part.slice(1, -1)}</strong>;
              }
              if (part.startsWith('_') && part.endsWith('_') && part.length >= 2) {
                return <em key={pIdx} style={{ color: 'var(--text-secondary)' }}>{part.slice(1, -1)}</em>;
              }
              if (part.startsWith('~') && part.endsWith('~') && part.length >= 2) {
                return <s key={pIdx} style={{ color: 'var(--text-muted)' }}>{part.slice(1, -1)}</s>;
              }
              return <span key={pIdx}>{part}</span>;
            })}
          </div>
        );
      })}
    </div>
  );
}

export default function FlowView({
  records = [],
  campaign,
  onUpdateRecord,
  onOpenRecord,
  onDeleteRecord,
  onDuplicateRecord,
  onAddNewMessage
}) {
  const [zoomLevel, setZoomLevel] = useState(0.9);
  const [panOffset, setPanOffset] = useState({ x: 50, y: 30 });
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [searchFilter, setSearchFilter] = useState('');
  const [flowLayoutMode, setFlowLayoutMode] = useState('days'); // 'days' | 'linear'
  const [selectedCardId, setSelectedCardId] = useState(null);

  const canvasRef = useRef(null);
  const boardRef = useRef(null);
  const nodeRefs = useRef({});

  const [connectors, setConnectors] = useState([]);
  const predefinedLinks = campaign?.predefinedLinks || [];

  // Filter records based on internal search filter
  const filteredRecords = useMemo(() => {
    if (!searchFilter.trim()) return records;
    const q = searchFilter.toLowerCase().trim();
    return records.filter(r =>
      (r.title && r.title.toLowerCase().includes(q)) ||
      (r.copyText && r.copyText.toLowerCase().includes(q)) ||
      (r.channel && r.channel.toLowerCase().includes(q)) ||
      (r.stage && r.stage.toLowerCase().includes(q))
    );
  }, [records, searchFilter]);

  // Group records by Day / Date
  const groupedDays = useMemo(() => {
    if (flowLayoutMode === 'linear') {
      return [{
        dayNumber: 1,
        dayLabel: 'Fluxo Contínuo',
        dateStr: campaign?.startDate || 'Sequência',
        messages: filteredRecords
      }];
    }

    const sorted = [...filteredRecords].sort((a, b) => {
      const dateA = a.scheduledDate || '9999-99-99';
      const dateB = b.scheduledDate || '9999-99-99';
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      const timeA = a.scheduledTime || '00:00';
      const timeB = b.scheduledTime || '00:00';
      return timeA.localeCompare(timeB);
    });

    const groupsMap = new Map();

    sorted.forEach((record) => {
      const dateKey = record.scheduledDate || 'Sem Data';
      if (!groupsMap.has(dateKey)) {
        groupsMap.set(dateKey, []);
      }
      groupsMap.get(dateKey).push(record);
    });

    let dayIndex = 1;
    const result = [];

    groupsMap.forEach((msgs, dateKey) => {
      let formattedDate = dateKey;
      if (dateKey !== 'Sem Data' && dateKey.includes('-')) {
        const parts = dateKey.split('-');
        if (parts.length === 3) {
          formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
      }

      result.push({
        dayNumber: dayIndex++,
        dayLabel: `Dia ${dayIndex - 1}`,
        dateStr: formattedDate,
        rawDate: dateKey,
        messages: msgs
      });
    });

    if (result.length === 0) {
      result.push({
        dayNumber: 1,
        dayLabel: 'Dia 1',
        dateStr: campaign?.startDate || 'Início',
        messages: []
      });
    }

    return result;
  }, [filteredRecords, flowLayoutMode, campaign]);

  const zoomLevelRef = useRef(zoomLevel);
  const panOffsetRef = useRef(panOffset);
  const [isWheeling, setIsWheeling] = useState(false);
  const wheelTimerRef = useRef(null);

  useEffect(() => {
    zoomLevelRef.current = zoomLevel;
  }, [zoomLevel]);

  useEffect(() => {
    panOffsetRef.current = panOffset;
  }, [panOffset]);

  // AUTO-CENTER FUNCTION: Automatically center & fit all nodes in viewport
  const autoCenter = useCallback(() => {
    if (!canvasRef.current) return;
    const canvasWidth = canvasRef.current.clientWidth || 1000;
    const canvasHeight = canvasRef.current.clientHeight || 700;

    const columnsCount = Math.max(groupedDays.length, 1);
    const contentWidth = columnsCount * 390 - 45; // 340px width + 50px gap
    const maxCardsInDay = Math.max(...groupedDays.map(d => d.messages?.length || 0), 1);
    const contentHeight = Math.max(maxCardsInDay * 290 + 100, 380);

    const paddingX = 80;
    const paddingY = 80;
    const scaleX = (canvasWidth - paddingX) / contentWidth;
    const scaleY = (canvasHeight - paddingY) / contentHeight;

    let optimalZoom = Math.min(scaleX, scaleY, 1.0);
    optimalZoom = Math.max(Math.min(optimalZoom, 1.0), 0.55);

    const scaledWidth = contentWidth * optimalZoom;
    const scaledHeight = contentHeight * optimalZoom;

    const offsetX = Math.max((canvasWidth - scaledWidth) / 2, 30);
    const offsetY = Math.max((canvasHeight - scaledHeight) / 2, 30);

    setZoomLevel(Math.round(optimalZoom * 100) / 100);
    setPanOffset({ x: Math.round(offsetX), y: Math.round(offsetY) });
  }, [groupedDays]);

  // Auto-center whenever records change or channel filter changes (e.g. WhatsApp / Email / YouTube)
  useEffect(() => {
    const timer = setTimeout(() => {
      autoCenter();
    }, 60);
    return () => clearTimeout(timer);
  }, [records, campaign?.id, flowLayoutMode, autoCenter]);

  // WHEEL SCROLL TO ZOOM (Anchored directly on mouse cursor position)
  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;

    const handleWheel = (e) => {
      e.preventDefault();

      const rect = canvasEl.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const currentZoom = zoomLevelRef.current;
      const currentPan = panOffsetRef.current;

      // Multiplier factor for smooth zooming
      const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
      const nextZoom = Math.min(Math.max(currentZoom * zoomFactor, 0.35), 2.2);

      if (nextZoom === currentZoom) return;

      // Focal point math: keep the world coordinate under the cursor stationary
      const newPanX = mouseX - (mouseX - currentPan.x) * (nextZoom / currentZoom);
      const newPanY = mouseY - (mouseY - currentPan.y) * (nextZoom / currentZoom);

      setIsWheeling(true);
      clearTimeout(wheelTimerRef.current);
      wheelTimerRef.current = setTimeout(() => {
        setIsWheeling(false);
      }, 100);

      setZoomLevel(Math.round(nextZoom * 100) / 100);
      setPanOffset({
        x: Math.round(newPanX),
        y: Math.round(newPanY)
      });
    };

    canvasEl.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      canvasEl.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // Calculate dynamic SVG connections between cards and between days
  const recalculateConnectors = () => {
    if (!boardRef.current) return;
    const boardRect = boardRef.current.getBoundingClientRect();
    const newConnectors = [];

    groupedDays.forEach((day, dayIdx) => {
      // 1. Connect sequential cards inside the same day
      for (let i = 0; i < day.messages.length - 1; i++) {
        const currentMsg = day.messages[i];
        const nextMsg = day.messages[i + 1];

        const fromEl = nodeRefs.current[currentMsg.id];
        const toEl = nodeRefs.current[nextMsg.id];

        if (fromEl && toEl) {
          const fromRect = fromEl.getBoundingClientRect();
          const toRect = toEl.getBoundingClientRect();

          const fromX = (fromRect.left + fromRect.width / 2 - boardRect.left) / zoomLevel;
          const fromY = (fromRect.bottom - boardRect.top) / zoomLevel;
          const toX = (toRect.left + toRect.width / 2 - boardRect.left) / zoomLevel;
          const toY = (toRect.top - boardRect.top) / zoomLevel;

          newConnectors.push({
            id: `conn-${currentMsg.id}-${nextMsg.id}`,
            type: 'vertical',
            fromX,
            fromY,
            toX,
            toY,
            fromStage: currentMsg.stage
          });
        }
      }

      // 2. Connect the LAST card of Day N to the FIRST card of Day N+1 (S-Curve connector)
      if (dayIdx < groupedDays.length - 1) {
        const nextDay = groupedDays[dayIdx + 1];
        const lastMsgOfDay = day.messages[day.messages.length - 1];
        const firstMsgOfNextDay = nextDay.messages[0];

        if (lastMsgOfDay && firstMsgOfNextDay) {
          const fromEl = nodeRefs.current[lastMsgOfDay.id];
          const toEl = nodeRefs.current[firstMsgOfNextDay.id];

          if (fromEl && toEl) {
            const fromRect = fromEl.getBoundingClientRect();
            const toRect = toEl.getBoundingClientRect();

            const fromX = (fromRect.right - boardRect.left) / zoomLevel - 10;
            const fromY = (fromRect.bottom - 24 - boardRect.top) / zoomLevel;
            const toX = (toRect.left - boardRect.left) / zoomLevel + 12;
            const toY = (toRect.top + 28 - boardRect.top) / zoomLevel;

            newConnectors.push({
              id: `inter-day-${day.dayNumber}-${nextDay.dayNumber}`,
              type: 'inter-day',
              fromX,
              fromY,
              toX,
              toY,
              fromStage: lastMsgOfDay.stage
            });
          }
        }
      }
    });

    setConnectors(newConnectors);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      recalculateConnectors();
    }, 70);
    return () => clearTimeout(timer);
  }, [groupedDays, zoomLevel, panOffset, flowLayoutMode]);

  useEffect(() => {
    const handleResize = () => recalculateConnectors();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [zoomLevel]);

  // Canvas Pan (Drag background to move canvas)
  const handleMouseDownCanvas = (e) => {
    if (e.target.closest('.flow-node-card') || e.target.closest('button') || e.target.closest('input')) {
      return;
    }
    setIsDraggingCanvas(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMoveCanvas = (e) => {
    if (!isDraggingCanvas) return;
    setPanOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUpCanvas = () => {
    setIsDraggingCanvas(false);
  };

  const handleZoom = (delta) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const currentZoom = zoomLevelRef.current;
    const currentPan = panOffsetRef.current;
    const nextZoom = Math.min(Math.max(Math.round((currentZoom + delta) * 10) / 10, 0.35), 2.2);

    if (nextZoom === currentZoom) return;

    const newPanX = centerX - (centerX - currentPan.x) * (nextZoom / currentZoom);
    const newPanY = centerY - (centerY - currentPan.y) * (nextZoom / currentZoom);

    setZoomLevel(nextZoom);
    setPanOffset({ x: Math.round(newPanX), y: Math.round(newPanY) });
  };

  // Quick stage switcher
  const handleQuickChangeStage = (e, recordId, currentStage) => {
    e.stopPropagation();
    const nextStages = ['Em Rascunho', 'Programada', 'Disparada', 'Cancelada'];
    const currIdx = nextStages.indexOf(currentStage);
    const nextStage = nextStages[(currIdx + 1) % nextStages.length];
    if (onUpdateRecord) {
      onUpdateRecord(recordId, { stage: nextStage });
    }
  };

  return (
    <div
      className="flow-view-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        background: 'radial-gradient(ellipse at top, #141a29 0%, #0a0d14 100%)',
        overflow: 'hidden',
        position: 'relative',
        userSelect: isDraggingCanvas ? 'none' : 'auto'
      }}
    >
      {/* 1. TOP FLOW CONTROL TOOLBAR */}
      <div
        className="flow-top-toolbar"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.65rem 1.25rem',
          background: 'rgba(16, 20, 31, 0.85)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--border-color)',
          zIndex: 20,
          gap: '1rem',
          flexWrap: 'wrap'
        }}
      >
        {/* Left: View Mode Switcher & Flow Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 0 15px rgba(59, 130, 246, 0.35)'
              }}
            >
              <Workflow size={17} />
            </div>
            <div>
              <h2 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>
                Fluxo Visual de Mensagens
              </h2>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                Scroll do mouse para Zoom • Arraste para mover • Clique no bloco para editar
              </p>
            </div>
          </div>

          <div style={{ width: '1px', height: '22px', background: 'var(--border-color)', margin: '0 0.25rem' }} />

          {/* Mode switch (Dias vs Linear) */}
          <div
            style={{
              display: 'flex',
              background: 'rgba(0, 0, 0, 0.35)',
              padding: '0.2rem',
              borderRadius: '6px',
              border: '1px solid var(--border-subtle)',
              gap: '0.2rem'
            }}
          >
            <button
              type="button"
              onClick={() => setFlowLayoutMode('days')}
              className={`view-btn ${flowLayoutMode === 'days' ? 'active gold-tint' : ''}`}
              style={{ padding: '0.25rem 0.6rem', fontSize: '0.74rem' }}
              title="Organizar fluxo em colunas por Dia"
            >
              <CalendarIcon size={12} />
              <span>Por Dias (Linha do Tempo)</span>
            </button>
            <button
              type="button"
              onClick={() => setFlowLayoutMode('linear')}
              className={`view-btn ${flowLayoutMode === 'linear' ? 'active' : ''}`}
              style={{ padding: '0.25rem 0.6rem', fontSize: '0.74rem' }}
              title="Organizar em fluxo contínuo"
            >
              <Share2 size={12} />
              <span>Fluxo Contínuo</span>
            </button>
          </div>
        </div>

        {/* Center: Search Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, maxWidth: '280px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: 'rgba(0, 0, 0, 0.35)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              padding: '0.3rem 0.65rem',
              width: '100%'
            }}
          >
            <Search size={13} style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Buscar mensagem no fluxo..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                fontSize: '0.76rem',
                outline: 'none',
                width: '100%'
              }}
            />
            {searchFilter && (
              <button
                type="button"
                onClick={() => setSearchFilter('')}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem' }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Right: Zoom Controls, Center Button & Add Message */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {/* Zoom controls pill */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'rgba(0, 0, 0, 0.4)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              padding: '0.15rem 0.3rem',
              gap: '0.2rem'
            }}
          >
            <button
              type="button"
              onClick={() => handleZoom(-0.1)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '0.25rem 0.4rem',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center'
              }}
              title="Diminuir Zoom (-)"
            >
              <ZoomOut size={13} />
            </button>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', minWidth: '38px', textAlign: 'center', fontWeight: 600 }}>
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              type="button"
              onClick={() => handleZoom(0.1)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '0.25rem 0.4rem',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center'
              }}
              title="Aumentar Zoom (+)"
            >
              <ZoomIn size={13} />
            </button>
            <div style={{ width: '1px', height: '14px', background: 'var(--border-color)', margin: '0 0.15rem' }} />
            <button
              type="button"
              onClick={autoCenter}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#38bdf8',
                cursor: 'pointer',
                padding: '0.25rem 0.45rem',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                fontSize: '0.72rem',
                fontWeight: 600
              }}
              title="Centralizar e Ajustar Disparos na Tela"
            >
              <Maximize2 size={12} />
              <span>Centralizar</span>
            </button>
          </div>

          {/* Add Message Button */}
          {onAddNewMessage && (
            <button
              type="button"
              onClick={() => onAddNewMessage()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.4rem 0.85rem',
                borderRadius: '6px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                color: '#fff',
                border: 'none',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
                transition: 'all 0.15s ease'
              }}
            >
              <Plus size={14} />
              <span>Nova Mensagem</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. MAIN INTERACTIVE CANVAS AREA */}
      <div
        ref={canvasRef}
        className="flow-canvas"
        onMouseDown={handleMouseDownCanvas}
        onMouseMove={handleMouseMoveCanvas}
        onMouseUp={handleMouseUpCanvas}
        onMouseLeave={handleMouseUpCanvas}
        style={{
          flex: 1,
          overflow: 'hidden',
          position: 'relative',
          cursor: isDraggingCanvas ? 'grabbing' : 'grab',
          backgroundImage: `
            radial-gradient(circle, rgba(255, 255, 255, 0.07) 1px, transparent 1px)
          `,
          backgroundSize: '24px 24px'
        }}
      >
        {/* Canvas Transformation Wrapper */}
        <div
          ref={boardRef}
          className="flow-board"
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
            transformOrigin: '0 0',
            transition: isDraggingCanvas || isWheeling ? 'none' : 'transform 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
            display: 'inline-flex',
            gap: '3.2rem',
            position: 'absolute',
            top: 0,
            left: 0,
            minWidth: 'max-content',
            padding: '2.5rem'
          }}
        >
          {/* SVG Connectors Overlay */}
          <svg
            className="flow-connectors-svg"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              zIndex: 1,
              overflow: 'visible'
            }}
          >
            <defs>
              <marker
                id="flow-arrow-green"
                viewBox="0 0 10 10"
                refX="7"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#10b981" />
              </marker>

              <marker
                id="flow-arrow-gray"
                viewBox="0 0 10 10"
                refX="7"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#64748b" />
              </marker>

              <marker
                id="flow-arrow-blue"
                viewBox="0 0 10 10"
                refX="7"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#38bdf8" />
              </marker>

              <marker
                id="flow-arrow-day"
                viewBox="0 0 10 10"
                refX="7"
                refY="5"
                markerWidth="7"
                markerHeight="7"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#38bdf8" />
              </marker>

              <linearGradient id="inter-day-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.8" />
              </linearGradient>
            </defs>

            {connectors.map((conn) => {
              if (conn.type === 'vertical') {
                const path = `M ${conn.fromX} ${conn.fromY} L ${conn.toX} ${conn.toY}`;
                const isGreen = conn.fromStage === 'Disparada';
                const isBlue = conn.fromStage === 'Programada';

                return (
                  <g key={conn.id}>
                    <path
                      d={path}
                      fill="none"
                      stroke={isGreen ? '#10b981' : isBlue ? '#38bdf8' : '#475569'}
                      strokeWidth="2"
                      strokeLinecap="round"
                      markerEnd={isGreen ? 'url(#flow-arrow-green)' : isBlue ? 'url(#flow-arrow-blue)' : 'url(#flow-arrow-gray)'}
                    />
                  </g>
                );
              }

              if (conn.type === 'inter-day') {
                const deltaX = conn.toX - conn.fromX;
                const controlX1 = conn.fromX + deltaX * 0.55;
                const controlY1 = conn.fromY + 40;
                const controlX2 = conn.toX - deltaX * 0.45;
                const controlY2 = conn.toY - 40;

                const path = `M ${conn.fromX} ${conn.fromY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${conn.toX} ${conn.toY}`;

                return (
                  <g key={conn.id}>
                    <path
                      d={path}
                      fill="none"
                      stroke="#0ea5e9"
                      strokeWidth="6"
                      strokeOpacity="0.12"
                      strokeLinecap="round"
                    />
                    <path
                      d={path}
                      fill="none"
                      stroke="url(#inter-day-grad)"
                      strokeWidth="2.5"
                      strokeDasharray="6 4"
                      strokeLinecap="round"
                      markerEnd="url(#flow-arrow-day)"
                    />
                  </g>
                );
              }

              return null;
            })}
          </svg>

          {/* DAY COLUMNS */}
          {groupedDays.map((day) => {
            const dispatchedCount = day.messages.filter(m => getStageObj(m.stage).value === 'Disparada').length;
            const scheduledCount = day.messages.filter(m => getStageObj(m.stage).value === 'Programada').length;
            const draftCount = day.messages.filter(m => getStageObj(m.stage).value === 'Em Rascunho').length;

            return (
              <div
                key={`day-${day.dayNumber}-${day.dateStr}`}
                className="flow-day-column"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  width: '340px',
                  minWidth: '340px',
                  position: 'relative',
                  zIndex: 2
                }}
              >
                {/* Column Header (Dia 1, Dia 2, etc.) */}
                <div
                  className="flow-day-header"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '0.85rem 1rem',
                    background: 'rgba(21, 26, 39, 0.95)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px 12px 0 0',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
                    marginBottom: '1.25rem',
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span
                        style={{
                          fontSize: '0.82rem',
                          fontWeight: 800,
                          color: '#fff',
                          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                          padding: '0.2rem 0.55rem',
                          borderRadius: '6px',
                          boxShadow: '0 2px 6px rgba(245, 158, 11, 0.3)'
                        }}
                      >
                        {day.dayLabel}
                      </span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                        {day.dateStr}
                      </span>
                    </div>

                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {day.messages.length} {day.messages.length === 1 ? 'disparo' : 'disparos'}
                    </span>
                  </div>

                  {/* Day Status Summary Badges */}
                  <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                    {dispatchedCount > 0 && (
                      <span style={{ fontSize: '0.66rem', color: '#34d399', background: 'rgba(16, 185, 129, 0.12)', padding: '0.1rem 0.4rem', borderRadius: '4px', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                        ✓ {dispatchedCount} enviada{dispatchedCount > 1 ? 's' : ''}
                      </span>
                    )}
                    {scheduledCount > 0 && (
                      <span style={{ fontSize: '0.66rem', color: '#38bdf8', background: 'rgba(56, 189, 248, 0.12)', padding: '0.1rem 0.4rem', borderRadius: '4px', border: '1px solid rgba(56, 189, 248, 0.25)' }}>
                        ⏰ {scheduledCount} programada{scheduledCount > 1 ? 's' : ''}
                      </span>
                    )}
                    {draftCount > 0 && (
                      <span style={{ fontSize: '0.66rem', color: '#94a3b8', background: 'rgba(148, 163, 184, 0.12)', padding: '0.1rem 0.4rem', borderRadius: '4px', border: '1px solid rgba(148, 163, 184, 0.25)' }}>
                        📝 {draftCount} rascunho{draftCount > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>

                {/* Node Cards List */}
                <div
                  className="flow-day-cards"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2.5rem',
                    position: 'relative'
                  }}
                >
                  {day.messages.map((record) => {
                    const stageObj = getStageObj(record.stage);
                    const channelMeta = getChannelMeta(record.channel);
                    const fullText = resolveCopyVariables(record.copyText, record.variables, predefinedLinks);

                    const isDispatched = stageObj.value === 'Disparada';
                    const isScheduled = stageObj.value === 'Programada';
                    const isDraft = stageObj.value === 'Em Rascunho';
                    const isCanceled = stageObj.value === 'Cancelada';
                    const isSelected = selectedCardId === record.id;

                    const ChannelIcon = channelMeta.icon;

                    // COLOR CODING MATCHED ACROSS WHOLE BLOCK & CHANNEL BADGE:
                    // Rascunho -> Todo cinza
                    // Enviada/Disparada -> Todo verde
                    // Programada -> Todo azul
                    // Cancelada -> Todo vermelho
                    let cardBg = '#181e29';
                    let cardBorder = '#334155';
                    let cardGlow = '0 3px 12px rgba(0, 0, 0, 0.3)';
                    let handleColor = '#64748b';
                    let headerBg = 'rgba(255, 255, 255, 0.02)';

                    // Channel Badge Colors matching the card stage
                    let badgeColor = '#94a3b8';
                    let badgeBg = 'rgba(148, 163, 184, 0.1)';
                    let badgeBorder = 'rgba(148, 163, 184, 0.25)';

                    if (isDraft) {
                      cardBg = '#181e29'; // Caixa cinza
                      cardBorder = '#334155';
                      handleColor = '#64748b';
                      badgeColor = '#94a3b8'; // Nome cinza
                      badgeBg = 'rgba(148, 163, 184, 0.1)';
                      badgeBorder = 'rgba(148, 163, 184, 0.25)';
                      headerBg = 'rgba(255, 255, 255, 0.02)';
                    } else if (isDispatched) {
                      cardBg = 'linear-gradient(180deg, #10261f 0%, #0d1e19 100%)'; // Caixa verde
                      cardBorder = 'rgba(16, 185, 129, 0.45)';
                      cardGlow = '0 4px 18px rgba(16, 185, 129, 0.15)';
                      handleColor = '#10b981';
                      badgeColor = '#34d399'; // Nome verde
                      badgeBg = 'rgba(16, 185, 129, 0.15)';
                      badgeBorder = 'rgba(16, 185, 129, 0.35)';
                      headerBg = 'rgba(16, 185, 129, 0.08)';
                    } else if (isScheduled) {
                      cardBg = 'linear-gradient(180deg, #0e2033 0%, #0b1827 100%)'; // Caixa azul
                      cardBorder = 'rgba(14, 165, 233, 0.45)';
                      cardGlow = '0 4px 18px rgba(14, 165, 233, 0.15)';
                      handleColor = '#38bdf8';
                      badgeColor = '#38bdf8'; // Nome azul
                      badgeBg = 'rgba(14, 165, 233, 0.15)';
                      badgeBorder = 'rgba(14, 165, 233, 0.35)';
                      headerBg = 'rgba(14, 165, 233, 0.08)';
                    } else if (isCanceled) {
                      cardBg = 'linear-gradient(180deg, #2b171c 0%, #1e1115 100%)'; // Caixa vermelha
                      cardBorder = 'rgba(239, 68, 68, 0.4)';
                      handleColor = '#ef4444';
                      badgeColor = '#f87171'; // Nome vermelho
                      badgeBg = 'rgba(239, 68, 68, 0.15)';
                      badgeBorder = 'rgba(239, 68, 68, 0.35)';
                      headerBg = 'rgba(239, 68, 68, 0.08)';
                    }

                    return (
                      <div
                        key={record.id}
                        ref={el => { nodeRefs.current[record.id] = el; }}
                        className={`flow-node-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => {
                          setSelectedCardId(record.id);
                          if (onOpenRecord) onOpenRecord(record);
                        }}
                        style={{
                          background: cardBg,
                          borderRadius: '12px',
                          border: `1.5px solid ${cardBorder}`,
                          boxShadow: cardGlow,
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          position: 'relative',
                          transition: 'all 0.18s ease',
                          transform: isSelected ? 'scale(1.02)' : 'none'
                        }}
                      >
                        {/* Top Input Connection Port */}
                        <div
                          style={{
                            position: 'absolute',
                            top: '-7px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            background: '#10141f',
                            border: `2.5px solid ${handleColor}`,
                            zIndex: 4
                          }}
                        />

                        {/* A. CARD HEADER: Channel Badge (same color as block) & Status Badge */}
                        <div
                          style={{
                            padding: '0.6rem 0.8rem',
                            borderBottom: `1px solid ${isDispatched ? 'rgba(16, 185, 129, 0.2)' : isScheduled ? 'rgba(14, 165, 233, 0.2)' : 'rgba(255, 255, 255, 0.06)'}`,
                            background: headerBg,
                            borderRadius: '11px 11px 0 0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '0.5rem'
                          }}
                        >
                          {/* Channel Tag in block theme color */}
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '6px',
                              background: badgeBg,
                              border: `1px solid ${badgeBorder}`,
                              color: badgeColor,
                              fontSize: '0.73rem',
                              fontWeight: 700
                            }}
                          >
                            {channelMeta.isCustomIcon ? (
                              <ChannelIcon size={13} />
                            ) : (
                              <ChannelIcon size={13} strokeWidth={2.2} />
                            )}
                            <span>{channelMeta.label}</span>
                          </div>

                          {/* Stage Pill Indicator */}
                          <div
                            onClick={(e) => handleQuickChangeStage(e, record.id, record.stage)}
                            style={{
                              fontSize: '0.67rem',
                              fontWeight: 700,
                              padding: '0.15rem 0.45rem',
                              borderRadius: '999px',
                              background: stageObj.bg,
                              color: stageObj.color,
                              border: `1px solid ${stageObj.border}`,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              cursor: 'pointer'
                            }}
                            title="Clique para alternar o status do disparo"
                          >
                            <span>{stageObj.badgeIcon}</span>
                            <span>{stageObj.label}</span>
                          </div>
                        </div>

                        {/* Scheduled time info if Programada */}
                        {isScheduled && record.scheduledTime && (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              padding: '0.35rem 0.8rem',
                              background: 'rgba(14, 165, 233, 0.08)',
                              borderBottom: '1px solid rgba(14, 165, 233, 0.15)',
                              fontSize: '0.71rem',
                              color: '#38bdf8',
                              fontWeight: 600
                            }}
                          >
                            <Clock size={11} />
                            <span>Horário previsto: {record.scheduledTime}</span>
                          </div>
                        )}

                        {/* Dispatched info if Disparada */}
                        {isDispatched && (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              padding: '0.35rem 0.8rem',
                              background: 'rgba(16, 185, 129, 0.08)',
                              borderBottom: '1px solid rgba(16, 185, 129, 0.15)',
                              fontSize: '0.71rem',
                              color: '#34d399',
                              fontWeight: 600
                            }}
                          >
                            <CheckCheck size={12} />
                            <span>Disparo enviado com sucesso</span>
                          </div>
                        )}

                        {/* B. MESSAGE CONTENT */}
                        <div style={{ padding: '0.75rem 0.8rem' }}>
                          {/* Title */}
                          <div style={{ marginBottom: '0.45rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span
                              style={{
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                color: '#fff',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                maxWidth: '280px'
                              }}
                              title={record.title}
                            >
                              {record.title || 'Sem título'}
                            </span>
                          </div>

                          {/* WhatsApp / Message Chat Bubble */}
                          <div
                            style={{
                              background: 'rgba(0, 0, 0, 0.25)',
                              border: '1px solid rgba(255, 255, 255, 0.06)',
                              borderRadius: '8px',
                              padding: '0.65rem',
                              fontSize: '0.75rem',
                              color: 'var(--text-secondary)',
                              position: 'relative'
                            }}
                          >
                            {/* Attachment preview if present */}
                            {record.attachment && (
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.45rem',
                                  padding: '0.35rem 0.5rem',
                                  background: 'rgba(255, 255, 255, 0.04)',
                                  borderRadius: '5px',
                                  marginBottom: '0.5rem',
                                  border: '1px solid rgba(255, 255, 255, 0.06)'
                                }}
                              >
                                {record.attachment.previewUrl || record.attachment.thumbnailUrl ? (
                                  <img
                                    src={record.attachment.thumbnailUrl || record.attachment.previewUrl}
                                    alt="attachment"
                                    style={{ width: '24px', height: '24px', borderRadius: '4px', objectFit: 'cover' }}
                                  />
                                ) : (
                                  <Paperclip size={12} style={{ color: '#38bdf8' }} />
                                )}
                                <span style={{ fontSize: '0.68rem', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {record.attachment.name || 'Arquivo anexo'}
                                </span>
                              </div>
                            )}

                            {/* Formatted Copy */}
                            {renderFormattedCopy(fullText)}
                          </div>

                          {/* CTA / Button preview */}
                          {record.selectedLinkId && (
                            <div
                              style={{
                                marginTop: '0.5rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background: 'rgba(56, 189, 248, 0.08)',
                                border: '1px solid rgba(56, 189, 248, 0.2)',
                                borderRadius: '6px',
                                padding: '0.35rem 0.6rem',
                                fontSize: '0.72rem',
                                color: '#38bdf8'
                              }}
                            >
                              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}>
                                <ExternalLink size={11} />
                                {predefinedLinks.find(l => l.id === record.selectedLinkId)?.label || 'Acessar Link'}
                              </span>
                              <div
                                style={{
                                  width: '8px',
                                  height: '8px',
                                  borderRadius: '50%',
                                  border: '1.5px solid #38bdf8'
                                }}
                              />
                            </div>
                          )}
                        </div>

                        {/* C. CARD FOOTER: Actions */}
                        <div
                          style={{
                            padding: '0.45rem 0.8rem',
                            borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: 'rgba(0, 0, 0, 0.15)',
                            borderRadius: '0 0 11px 11px'
                          }}
                        >
                          {/* Quick Actions (Duplicate, Delete, Edit) */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            {onDuplicateRecord && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDuplicateRecord(record.id);
                                }}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: 'var(--text-muted)',
                                  cursor: 'pointer',
                                  padding: '0.2rem',
                                  borderRadius: '4px',
                                  display: 'flex',
                                  alignItems: 'center'
                                }}
                                title="Duplicar disparo"
                              >
                                <Copy size={12} />
                              </button>
                            )}

                            {onDeleteRecord && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm(`Tem certeza que deseja remover o disparo "${record.title}"?`)) {
                                    onDeleteRecord(record.id);
                                  }
                                }}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: 'var(--text-muted)',
                                  cursor: 'pointer',
                                  padding: '0.2rem',
                                  borderRadius: '4px',
                                  display: 'flex',
                                  alignItems: 'center'
                                }}
                                title="Excluir disparo"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onOpenRecord) onOpenRecord(record);
                              }}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#38bdf8',
                                cursor: 'pointer',
                                padding: '0.2rem 0.4rem',
                                borderRadius: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                fontSize: '0.69rem',
                                fontWeight: 600
                              }}
                              title="Editar mensagem"
                            >
                              <Edit3 size={11} />
                              <span>Editar</span>
                            </button>
                          </div>

                          {/* "Próximo passo" Connector Point */}
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              fontSize: '0.68rem',
                              color: handleColor,
                              fontWeight: 600
                            }}
                          >
                            <span>Próximo passo</span>
                            <div
                              style={{
                                width: '10px',
                                height: '10px',
                                borderRadius: '50%',
                                background: '#10141f',
                                border: `2px solid ${handleColor}`
                              }}
                            />
                          </div>
                        </div>

                        {/* Bottom Output Connection Port */}
                        <div
                          style={{
                            position: 'absolute',
                            bottom: '-7px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            background: '#10141f',
                            border: `2.5px solid ${handleColor}`,
                            zIndex: 4
                          }}
                        />
                      </div>
                    );
                  })}

                  {/* Add Step button inside the day column */}
                  {onAddNewMessage && (
                    <button
                      type="button"
                      onClick={() => onAddNewMessage({
                        scheduledDate: day.rawDate !== 'Sem Data' ? day.rawDate : campaign?.startDate || ''
                      })}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem',
                        padding: '0.6rem',
                        borderRadius: '8px',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1.5px dashed var(--border-color)',
                        color: 'var(--text-secondary)',
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#3b82f6';
                        e.currentTarget.style.color = '#60a5fa';
                        e.currentTarget.style.background = 'rgba(59, 130, 246, 0.05)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border-color)';
                        e.currentTarget.style.color = 'var(--text-secondary)';
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                      }}
                    >
                      <Plus size={14} />
                      <span>Inserir mensagem no {day.dayLabel}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
