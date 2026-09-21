import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Smartphone, Calendar as CalIcon, Check, Clock, Edit3, XCircle } from 'lucide-react';
import { BRABO_CHANNELS, getStageObj } from '../data/initialData';

export default function CalendarView({
  records,
  onOpenRecord,
  onAddNewRecordWithDate
}) {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 8, 1)); // Setembro 2026

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const dayNames = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const todayStr = '2026-09-08';

  const getRecordsForDay = (day) => {
    const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return records.filter(r => r.scheduledDate === dayStr);
  };

  return (
    <div className="calendar-container">
      {/* Calendar Header Nav */}
      <div className="calendar-header-nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h2 style={{ 
            fontFamily: 'var(--font-display)', 
            fontSize: '1.25rem', 
            fontWeight: 700, 
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <CalIcon size={20} color="#f59e0b" />
            {monthNames[month]} de {year}
          </h2>

          {/* Mini Legend for Stages */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginLeft: '1rem', fontSize: '0.7rem', color: '#94a3b8' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }} />
              📝 Rascunho (Tracejado)
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6' }} />
              🕒 Programada
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }} />
              🚀 Disparada (Riscada)
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <button 
            className="btn-secondary" 
            onClick={() => setCurrentDate(new Date(2026, 8, 1))}
            style={{ fontSize: '0.75rem' }}
          >
            Hoje
          </button>
          <button className="btn-secondary" onClick={prevMonth} style={{ padding: '0.4rem' }}>
            <ChevronLeft size={16} />
          </button>
          <button className="btn-secondary" onClick={nextMonth} style={{ padding: '0.4rem' }}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Days Grid */}
      <div className="calendar-grid">
        {dayNames.map(day => (
          <div key={day} className="calendar-day-header">
            {day}
          </div>
        ))}

        {Array.from({ length: firstDayIndex }).map((_, idx) => (
          <div key={`empty-${idx}`} className="calendar-day-cell" style={{ opacity: 0.3 }} />
        ))}

        {Array.from({ length: totalDays }).map((_, idx) => {
          const day = idx + 1;
          const dayRecords = getRecordsForDay(day);
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const isToday = dateStr === todayStr;

          return (
            <div 
              key={day} 
              className={`calendar-day-cell ${isToday ? 'today' : ''}`}
              onClick={() => onAddNewRecordWithDate(dateStr)}
              title={`Clique para agendar disparo no dia ${day}/${month + 1}`}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="calendar-day-number">{day}</span>
                {dayRecords.length > 0 && (
                  <span style={{ 
                    fontSize: '0.65rem', 
                    color: '#f59e0b', 
                    fontWeight: 700 
                  }}>
                    {dayRecords.length} {dayRecords.length === 1 ? 'disparo' : 'disparos'}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginTop: '0.25rem' }}>
                {dayRecords.map(record => {
                  const chObj = BRABO_CHANNELS.find(ch => ch.value === record.channel) || BRABO_CHANNELS[0];
                  const stageObj = getStageObj(record.stage);
                  const isDisparada = stageObj.value === 'Disparada';
                  const isRascunho = stageObj.value === 'Em Rascunho';
                  const isProgramada = stageObj.value === 'Programada';
                  const isCancelada = stageObj.value === 'Cancelada';

                  return (
                    <div
                      key={record.id}
                      className="calendar-event-pill"
                      style={{ 
                        borderLeftColor: stageObj.color,
                        borderLeftWidth: '3px',
                        borderLeftStyle: 'solid',
                        borderStyle: isRascunho ? 'dashed' : 'solid',
                        borderWidth: isRascunho ? '1px 1px 1px 3px' : '0 0 0 3px',
                        borderColor: isRascunho ? 'rgba(245, 158, 11, 0.4)' : undefined,
                        backgroundColor: isDisparada 
                          ? 'rgba(34, 197, 94, 0.08)' 
                          : isProgramada 
                            ? 'rgba(59, 130, 246, 0.12)' 
                            : isRascunho 
                              ? 'rgba(245, 158, 11, 0.08)' 
                              : 'rgba(239, 68, 68, 0.08)',
                        opacity: isDisparada ? 0.75 : isCancelada ? 0.45 : 1,
                        padding: '0.3rem 0.45rem',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenRecord(record);
                      }}
                      title={`${record.scheduledTime} - ${record.title} (${stageObj.label} • ${record.channel})`}
                    >
                      {/* Stage indicator icon */}
                      <span style={{ fontSize: '0.68rem', flexShrink: 0 }}>
                        {isDisparada ? '🚀' : isProgramada ? '🕒' : isRascunho ? '📝' : '✕'}
                      </span>

                      <span style={{ fontWeight: 700, color: stageObj.color, fontSize: '0.68rem', flexShrink: 0 }}>
                        {record.scheduledTime}
                      </span>

                      <span style={{ 
                        fontSize: '0.64rem', 
                        padding: '0.05rem 0.25rem', 
                        borderRadius: '3px', 
                        background: chObj.bg,
                        color: chObj.color,
                        fontWeight: 600,
                        flexShrink: 0
                      }}>
                        {chObj.badgeText}
                      </span>

                      <span style={{ 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis', 
                        whiteSpace: 'nowrap',
                        fontSize: '0.74rem',
                        color: isDisparada ? '#94a3b8' : '#f1f5f9',
                        textDecoration: (isDisparada || isCancelada) ? 'line-through' : 'none',
                        fontWeight: isProgramada ? 600 : 400
                      }}>
                        {record.title}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
