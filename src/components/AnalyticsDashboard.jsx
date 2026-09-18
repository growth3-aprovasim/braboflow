import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Users,
  Send,
  CheckCircle2,
  DollarSign,
  Percent,
  Radio,
  Calculator,
  ArrowUpRight
} from 'lucide-react';
import { CONTEST_OPTIONS, CHANNEL_OPTIONS } from '../data/initialData';

export default function AnalyticsDashboard({ records }) {
  // Calculation of KPIs
  const totalBroadcasts = records.length;
  const sentBroadcasts = records.filter(r => r.status === 'Disparadado');
  const scheduledBroadcasts = records.filter(r => r.status === 'Agendado');

  const totalAudienceImpacted = records.reduce((sum, r) => sum + (r.audienceCount || 0), 0);

  const avgDelivery = sentBroadcasts.length > 0
    ? (sentBroadcasts.reduce((sum, r) => sum + (r.deliveryRate || 0), 0) / sentBroadcasts.length).toFixed(1)
    : '98.5';

  const avgCTR = sentBroadcasts.length > 0
    ? (sentBroadcasts.reduce((sum, r) => sum + (r.clickRate || 0), 0) / sentBroadcasts.length).toFixed(1)
    : '22.8';

  // Calculator State
  const [calcAudience, setCalcAudience] = useState(15000);
  const [calcCTR, setCalcCTR] = useState(25);
  const [calcConversion, setCalcConversion] = useState(3.5);
  const [calcTicket, setCalcTicket] = useState(497);

  const projectedClicks = Math.round(calcAudience * (calcCTR / 100));
  const projectedSales = Math.round(projectedClicks * (calcConversion / 100));
  const projectedRevenue = projectedSales * calcTicket;

  return (
    <div className="analytics-container">
      {/* Header */}
      <div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <BarChart3 size={24} color="#f59e0b" />
          Inteligência de Disparos & Performance Brabo Concursos
        </h2>
        <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '0.25rem' }}>
          Acompanhamento consolidado de entregabilidade, engajamento e conversão de vendas dos disparos de WhatsApp, e-mail e SMS.
        </p>
      </div>

      {/* KPI Cards Row */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <span className="kpi-label">Volume Total de Destinatários</span>
          <span className="kpi-value">{totalAudienceImpacted.toLocaleString('pt-BR')}</span>
          <span className="kpi-subtext">
            <Users size={13} /> {totalBroadcasts} campanhas cadastradas
          </span>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">Taxa Média de Entrega</span>
          <span className="kpi-value">{avgDelivery}%</span>
          <span className="kpi-subtext" style={{ color: '#4ade80' }}>
            <CheckCircle2 size={13} /> Altíssima reputação de IP / WhatsApp
          </span>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">CTR Médio (Taxa de Cliques)</span>
          <span className="kpi-value">{avgCTR}%</span>
          <span className="kpi-subtext" style={{ color: '#fbbf24' }}>
            <ArrowUpRight size={13} /> 3.2x acima da média de mercado
          </span>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">Disparos Programadados / Fila</span>
          <span className="kpi-value">{scheduledBroadcasts.length}</span>
          <span className="kpi-subtext" style={{ color: '#60a5fa' }}>
            <Send size={13} /> Próximos envios desta semana
          </span>
        </div>
      </div>

      {/* Two columns breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Breakdown by Contest */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.5rem' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Distribuição de Disparos por Carreira / Concurso
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {CONTEST_OPTIONS.filter(c => c.value !== 'Geral').map(contest => {
              const contestCount = records.filter(r => r.targetContest === contest.value).length;
              const percentage = totalBroadcasts > 0 ? Math.round((contestCount / totalBroadcasts) * 100) : 0;

              return (
                <div key={contest.value}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.35rem' }}>
                    <span style={{ fontWeight: 600, color: '#e2e8f0' }}>{contest.label}</span>
                    <span style={{ color: '#f59e0b', fontWeight: 700 }}>{contestCount} ({percentage}%)</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: '#1e2638', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${percentage}%`, height: '100%', background: 'linear-gradient(90deg, #f59e0b, #fbbf24)', borderRadius: '4px' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Breakdown by Channel */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.5rem' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Presença por Canal de Comunicação
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {CHANNEL_OPTIONS.map(ch => {
              const chCount = records.filter(r => r.channel === ch.value).length;
              const percentage = totalBroadcasts > 0 ? Math.round((chCount / totalBroadcasts) * 100) : 0;

              return (
                <div key={ch.value}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.35rem' }}>
                    <span style={{ fontWeight: 600, color: ch.color }}>{ch.label}</span>
                    <span style={{ color: '#cbd5e1', fontWeight: 700 }}>{chCount} disparos</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: '#1e2638', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${percentage}%`, height: '100%', background: ch.color, borderRadius: '4px' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ROI & Conversion Projector */}
      <div style={{
        background: 'linear-gradient(135deg, #141b29, #0e1422)',
        border: '1px solid #28354d',
        borderRadius: '16px',
        padding: '1.75rem',
        boxShadow: 'var(--shadow-md)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
          <div style={{ background: 'rgba(245, 158, 11, 0.2)', padding: '0.4rem', borderRadius: '8px', color: '#f59e0b' }}>
            <Calculator size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>
              Simulador de Projeção Financeira do Próximo Disparo
            </h3>
            <p style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
              Ajuste as métricas para estimar cliques, matrículas e faturamento projetado para a Brabo Concursos.
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
          <div>
            <label style={{ fontSize: '0.74rem', color: '#94a3b8', display: 'block', marginBottom: '0.4rem' }}>
              Base de Leads / Alunos:
            </label>
            <input
              type="number"
              className="form-control"
              value={calcAudience}
              onChange={(e) => setCalcAudience(Number(e.target.value))}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.74rem', color: '#94a3b8', display: 'block', marginBottom: '0.4rem' }}>
              CTR Estimado (% de cliques):
            </label>
            <input
              type="number"
              className="form-control"
              value={calcCTR}
              onChange={(e) => setCalcCTR(Number(e.target.value))}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.74rem', color: '#94a3b8', display: 'block', marginBottom: '0.4rem' }}>
              Taxa de Conversão na Página (%):
            </label>
            <input
              type="number"
              step="0.1"
              className="form-control"
              value={calcConversion}
              onChange={(e) => setCalcConversion(Number(e.target.value))}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.74rem', color: '#94a3b8', display: 'block', marginBottom: '0.4rem' }}>
              Ticket Médio do Curso (R$):
            </label>
            <input
              type="number"
              className="form-control"
              value={calcTicket}
              onChange={(e) => setCalcTicket(Number(e.target.value))}
            />
          </div>
        </div>

        {/* Results bar */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.4)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          borderRadius: '10px',
          padding: '1.25rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '1rem',
          textAlign: 'center'
        }}>
          <div>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Cliques Projetados no Link</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fbbf24', fontFamily: 'var(--font-display)' }}>
              {projectedClicks.toLocaleString('pt-BR')} cliques
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Matrículas Estimadas</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#4ade80', fontFamily: 'var(--font-display)' }}>
              {projectedSales.toLocaleString('pt-BR')} novos alunos
            </div>
          </div>

          <div>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Faturamento Bruto Projetado</span>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#60a5fa', fontFamily: 'var(--font-display)' }}>
              R$ {projectedRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
