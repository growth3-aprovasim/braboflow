import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  X,
  Layers,
  Sparkles,
  ArrowRight,
  Database,
  Calendar,
  Clock,
  Send,
  Link as LinkIcon,
  Paperclip
} from 'lucide-react';
import { parseCsvText, analyzeCsvHeaders, buildCampaignFromAirtableCsv, syncAirtableAttachmentsToSupabase } from '../services/airtableCsvImporter';

export default function ImportCsvModal({ isOpen, onClose, onImportCampaign }) {
  const [dragActive, setDragActive] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [campaignName, setCampaignName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFile = (file) => {
    if (!file || (!file.name.endsWith('.csv') && file.type !== 'text/csv' && file.type !== 'application/vnd.ms-excel')) {
      setErrorMsg('Por favor, selecione um arquivo válido no formato .csv exportado do Airtable.');
      return;
    }

    setErrorMsg('');
    setCsvFile(file);

    // Default campaign name from file name
    const cleanName = file.name.replace(/\.csv$/i, '').replace(/[-_]/g, ' ').trim();
    const formattedName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
    setCampaignName(formattedName || 'Nova Campanha Importada');

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const { headers, rows, delimiter } = parseCsvText(text);

        if (!headers || headers.length === 0 || !rows || rows.length === 0) {
          setErrorMsg('O arquivo CSV parece estar vazio ou não possui linhas de dados.');
          return;
        }

        const analysis = analyzeCsvHeaders(headers);
        setParsedData({ headers, rows, delimiter, analysis });
      } catch (err) {
        console.error('Erro ao ler CSV:', err);
        setErrorMsg('Falha ao processar a estrutura do arquivo CSV.');
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleConfirmImport = async () => {
    if (!parsedData || !campaignName.trim()) return;

    setIsProcessing(true);
    try {
      const result = buildCampaignFromAirtableCsv(campaignName, parsedData.headers, parsedData.rows);
      await onImportCampaign(result.campaign);

      // Mirror attachments to Supabase Storage in background
      syncAirtableAttachmentsToSupabase(result.campaign).catch(err => {
        console.warn('Background Supabase storage upload notice:', err);
      });

      handleClose();
    } catch (err) {
      console.error('Erro ao importar campanha:', err);
      setErrorMsg('Erro ao salvar os disparos importados no banco de dados.');
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setCsvFile(null);
    setParsedData(null);
    setCampaignName('');
    setErrorMsg('');
    setIsProcessing(false);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '880px', width: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              background: 'rgba(59, 130, 246, 0.15)',
              color: 'var(--accent-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', color: '#fbbf24', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Importador Airtable • 100% Compatível
              </span>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', margin: 0 }}>
                Importar Campanha e Disparos via CSV
              </h3>
            </div>
          </div>

          <button className="btn-ghost" onClick={handleClose}>
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {errorMsg && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Upload Dropzone */}
          {!parsedData ? (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${dragActive ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                background: dragActive ? 'rgba(59, 130, 246, 0.08)' : 'var(--bg-card)',
                borderRadius: '12px',
                padding: '3rem 2rem',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '1rem'
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFile(e.target.files[0]);
                  }
                }}
              />

              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(59, 130, 246, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-primary)'
              }}>
                <UploadCloud size={32} />
              </div>

              <div>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff', marginBottom: '0.35rem' }}>
                  Arraste seu arquivo CSV do Airtable aqui
                </h4>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', maxWidth: '440px', margin: '0 auto' }}>
                  Ou clique para selecionar o arquivo CSV exportado da sua tabela do Airtable.
                </p>
              </div>

              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.75rem',
                color: '#94a3b8',
                background: 'rgba(255, 255, 255, 0.04)',
                padding: '0.4rem 0.8rem',
                borderRadius: '20px',
                border: '1px solid var(--border-color)'
              }}>
                <Sparkles size={13} color="#f59e0b" />
                <span>Mapeamento automático de Título, Status, Canal, Data, Horário, Copy e Colunas Extras</span>
              </div>
            </div>
          ) : (
            /* Analysis & Confirmation View */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* File Info Bar */}
              <div style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '0.9rem 1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <FileSpreadsheet size={22} color="#10b981" />
                  <div>
                    <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.9rem' }}>{csvFile?.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {(csvFile?.size / 1024).toFixed(1)} KB • Separador detectado: "{parsedData.delimiter}"
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => { setParsedData(null); setCsvFile(null); }}
                  style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}
                >
                  Trocar arquivo
                </button>
              </div>

              {/* Campaign Name Input */}
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>Nome da Nova Campanha no BraboFlow *</label>
                <input
                  type="text"
                  className="form-control"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="Ex: Reta Final PC-SP 2026"
                  required
                />
              </div>

              {/* Stats Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.85rem' }}>
                <div style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem'
                }}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '6px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Send size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>{parsedData.rows.length}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Disparos / Linhas</div>
                  </div>
                </div>

                <div style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem'
                }}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '6px', background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckCircle2 size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>
                      {Object.values(parsedData.analysis).filter(v => v && !Array.isArray(v)).length}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Campos Padrão Mapeados</div>
                  </div>
                </div>

                <div style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem'
                }}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '6px', background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Layers size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>
                      {parsedData.analysis.custom.length}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Colunas Customizadas</div>
                  </div>
                </div>
              </div>

              {/* Column Mapping Details */}
              <div style={{
                background: 'var(--bg-sidebar)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.6rem'
              }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase' }}>
                  Colunas Detectadas no CSV:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {parsedData.headers.map((h, i) => {
                    const isCustom = parsedData.analysis.custom.some(c => c.index === i);
                    return (
                      <span
                        key={i}
                        style={{
                          fontSize: '0.72rem',
                          padding: '0.2rem 0.55rem',
                          borderRadius: '4px',
                          background: isCustom ? 'rgba(168, 85, 247, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                          border: `1px solid ${isCustom ? 'rgba(168, 85, 247, 0.3)' : 'rgba(56, 189, 248, 0.3)'}`,
                          color: isCustom ? '#c084fc' : '#38bdf8',
                          fontWeight: 500
                        }}
                      >
                        {h} {isCustom ? '(Personalizada)' : '✓'}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Data Preview Table (First 4 rows) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Prévia das Primeiras Linhas:
                </span>
                <div style={{
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  overflowX: 'auto',
                  maxHeight: '180px',
                  background: 'var(--bg-card)'
                }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.74rem' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-sidebar)', borderBottom: '1px solid var(--border-color)' }}>
                        {parsedData.headers.map((h, idx) => (
                          <th key={idx} style={{ padding: '0.45rem 0.65rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {parsedData.rows.slice(0, 4).map((row, rIdx) => (
                        <tr key={rIdx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          {parsedData.headers.map((_, cIdx) => (
                            <td key={cIdx} style={{ padding: '0.45rem 0.65rem', color: 'var(--text-main)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {row[cIdx] || <span style={{ color: 'var(--text-muted)' }}>-</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button type="button" className="btn-ghost" onClick={handleClose} disabled={isProcessing}>
            Cancelar
          </button>

          {parsedData && (
            <button
              type="button"
              className="btn-primary"
              onClick={handleConfirmImport}
              disabled={isProcessing || !campaignName.trim()}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Database size={15} />
              <span>{isProcessing ? 'Importando para Supabase...' : `Importar ${parsedData.rows.length} Disparos`}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
