import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Header from './components/Header';
import TableTabs from './components/TableTabs';
import ViewToolbar from './components/ViewToolbar';
import GridView from './components/GridView';
import FlowView from './components/FlowView';
import KanbanView from './components/KanbanView';
import CalendarView from './components/CalendarView';
import WhatsAppSimulatorView from './components/WhatsAppSimulatorView';
import CampaignsManager from './components/CampaignsManager';
import CampaignLinksModal from './components/CampaignLinksModal';
import RecordDetailModal from './components/RecordDetailModal';
import CustomFiltersSidebar from './components/CustomFiltersSidebar';
import ImportCsvModal from './components/ImportCsvModal';
import EditCampaignModal from './components/EditCampaignModal';

import { matchRecordWithFilter } from './data/initialData';
import {
  fetchAllCampaignsFromDb,
  dbClearAllData,
  dbCreateCampaign,
  dbUpdateCampaign,
  dbDeleteCampaign,
  dbSyncCampaignLinks,
  dbSyncCampaignColumns,
  dbCreateDisparo,
  dbUpdateDisparo,
  dbDeleteDisparo,
  dbBatchUpdateDisparos,
  fetchCustomFiltersFromDb,
  dbSaveCustomFilter,
  dbDeleteCustomFilter
} from './services/supabaseService';
import { supabase } from './services/supabase';

export default function App() {
  // Supabase Connection Status
  const [supabaseStatus, setSupabaseStatus] = useState('syncing'); // 'syncing' | 'connected' | 'offline'

  // 1. Campaigns Data strictly from Supabase (with LocalStorage cache fallback only if previously fetched)
  const [campaigns, setCampaigns] = useState(() => {
    try {
      const saved = localStorage.getItem('brabo_airtable_campaigns_real');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [activeCampaignId, setActiveCampaignId] = useState(() => {
    try {
      return localStorage.getItem('brabo_airtable_active_campaign_id') || null;
    } catch {
      return null;
    }
  });

  // Fetch strictly from Supabase on Mount
  const loadDataFromSupabase = useCallback(async () => {
    try {
      setSupabaseStatus('syncing');
      const data = await fetchAllCampaignsFromDb();

      if (data) {
        setCampaigns(data);
        setActiveCampaignId(prev => {
          if (prev && data.some(c => c.id === prev)) return prev;
          return data[0]?.id || null;
        });
        try {
          localStorage.setItem('brabo_airtable_campaigns_real', JSON.stringify(data));
        } catch { /* ignore */ }
        setSupabaseStatus('connected');
      }

      // Fetch saved custom filters
      const dbFilters = await fetchCustomFiltersFromDb();
      if (dbFilters && dbFilters.length > 0) {
        setCustomFilters(dbFilters);
      }
    } catch (err) {
      console.warn('Supabase offline ou tabelas bflow_* ainda não criadas:', err.message || err);
      setSupabaseStatus('offline');
    }
  }, []);

  const realtimeTimerRef = useRef(null);

  useEffect(() => {
    loadDataFromSupabase();

    const debouncedReload = () => {
      if (realtimeTimerRef.current) clearTimeout(realtimeTimerRef.current);
      realtimeTimerRef.current = setTimeout(() => {
        fetchAllCampaignsFromDb().then(data => {
          if (data && data.length > 0) {
            setCampaigns(data);
          }
        }).catch(err => console.warn('Realtime fetch error:', err));
      }, 1000);
    };

    // Supabase Realtime Subscription for Live Collab
    const channel = supabase
      .channel('bflow-realtime-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bflow_campaigns' }, debouncedReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bflow_disparos' }, debouncedReload)
      .subscribe();

    return () => {
      if (realtimeTimerRef.current) clearTimeout(realtimeTimerRef.current);
      supabase.removeChannel(channel);
    };
  }, [loadDataFromSupabase]);

  // Save to LocalStorage safely (stripping any heavy dataUrls to prevent QuotaExceededError crash)
  useEffect(() => {
    try {
      const cleanCampaigns = campaigns.map(c => ({
        ...c,
        messages: (c.messages || []).map(m => {
          if (!m.attachment) return m;
          const { dataUrl, ...safeAttachment } = m.attachment;
          return { ...m, attachment: safeAttachment };
        })
      }));
      localStorage.setItem('brabo_airtable_campaigns_real', JSON.stringify(cleanCampaigns));
    } catch (err) {
      console.warn('Erro ao salvar campanhas no LocalStorage:', err);
    }
  }, [campaigns]);

  useEffect(() => {
    try {
      if (activeCampaignId) {
        localStorage.setItem('brabo_airtable_active_campaign_id', activeCampaignId);
      }
    } catch (err) {
      console.warn('Erro ao salvar activeCampaignId:', err);
    }
  }, [activeCampaignId]);

  // Current Active Campaign
  const activeCampaign = useMemo(() => {
    return campaigns.find(c => c.id === activeCampaignId) || campaigns[0] || null;
  }, [campaigns, activeCampaignId]);

  // Messages of active campaign
  const activeMessages = useMemo(() => {
    return activeCampaign?.messages || [];
  }, [activeCampaign]);

  // Flow Category Selection ('whatsapp' | 'email' | 'youtube' | 'all')
  const [activeFlowCategory, setActiveFlowCategory] = useState('whatsapp');

  // Breakdown Counts per Flow
  const flowCounts = useMemo(() => {
    const wa = activeMessages.filter(m => m.channel !== 'Email' && m.channel !== 'Comunidade YouTube').length;
    const email = activeMessages.filter(m => m.channel === 'Email').length;
    const youtube = activeMessages.filter(m => m.channel === 'Comunidade YouTube').length;
    return {
      whatsapp: wa,
      email,
      youtube,
      all: activeMessages.length
    };
  }, [activeMessages]);

  // Messages filtered by the active flow category
  const flowMessages = useMemo(() => {
    if (activeFlowCategory === 'email') {
      return activeMessages.filter(m => m.channel === 'Email');
    }
    if (activeFlowCategory === 'youtube') {
      return activeMessages.filter(m => m.channel === 'Comunidade YouTube');
    }
    if (activeFlowCategory === 'whatsapp') {
      return activeMessages.filter(m => m.channel !== 'Email' && m.channel !== 'Comunidade YouTube');
    }
    return activeMessages;
  }, [activeMessages, activeFlowCategory]);

  // 2. Navigation & View State - Default to 'campanhas' as requested
  const [activeTable, setActiveTable] = useState('campanhas'); // 'campanhas' | 'disparos' | 'links' | 'simulator'
  const [activeView, setActiveView] = useState('grid'); // 'grid' | 'kanban' | 'calendar' | 'simulator'

  // 3. Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterChannel, setFilterChannel] = useState('All');
  const [groupBy, setGroupBy] = useState('none');
  const [sortBy, setSortBy] = useState('date');
  const [sortDirection, setSortDirection] = useState('asc');
  const [rowDensity, setRowDensity] = useState('standard');

  // Custom Saved Filters State
  const defaultCustomFilters = [
    { id: 'all', name: 'Todos os Disparos', conjunction: 'AND', rules: [], isDefault: true },
    { id: 'rascunho', name: 'Em Rascunho', conjunction: 'AND', rules: [{ id: 'r1', field: 'stage', operator: 'equals', value: 'Em Rascunho' }], isDefault: true },
    { id: 'programada', name: 'Programada', conjunction: 'AND', rules: [{ id: 'r2', field: 'stage', operator: 'equals', value: 'Programada' }], isDefault: true },
    { id: 'disparada', name: 'Disparada', conjunction: 'AND', rules: [{ id: 'r3', field: 'stage', operator: 'equals', value: 'Disparada' }], isDefault: true },
    { id: 'cancelada', name: 'Cancelada', conjunction: 'AND', rules: [{ id: 'r4', field: 'stage', operator: 'equals', value: 'Cancelada' }], isDefault: true },
    {
      id: 'vip-rascunho', name: 'VIP em Rascunho', conjunction: 'AND', rules: [
        { id: 'r5', field: 'channel', operator: 'equals', value: 'Grupo VIP WhatsApp' },
        { id: 'r6', field: 'stage', operator: 'equals', value: 'Em Rascunho' }
      ], isDefault: false
    }
  ];

  const [customFilters, setCustomFilters] = useState(() => {
    try {
      const saved = localStorage.getItem('brabo_airtable_custom_filters_v2');
      if (saved) return JSON.parse(saved);
      return defaultCustomFilters;
    } catch {
      return defaultCustomFilters;
    }
  });

  const [activeCustomFilterId, setActiveCustomFilterId] = useState('all');
  const [isCustomSidebarOpen, setIsCustomSidebarOpen] = useState(true);

  useEffect(() => {
    try {
      localStorage.setItem('brabo_airtable_custom_filters_v2', JSON.stringify(customFilters));
    } catch (e) {
      console.warn('Erro ao salvar customFilters:', e);
    }
  }, [customFilters]);

  const handleCreateCustomFilter = (newFilter) => {
    setCustomFilters(prev => [...prev, newFilter]);
    setActiveCustomFilterId(newFilter.id);
    dbSaveCustomFilter(newFilter).catch(err => console.warn('Sync custom filter error:', err));
  };

  const handleUpdateCustomFilter = (filterId, updates) => {
    setCustomFilters(prev => {
      const updated = prev.map(f => f.id === filterId ? { ...f, ...updates } : f);
      const target = updated.find(f => f.id === filterId);
      if (target) dbSaveCustomFilter(target).catch(err => console.warn('Sync custom filter update error:', err));
      return updated;
    });
  };

  const handleDeleteCustomFilter = (filterId) => {
    setCustomFilters(prev => prev.filter(f => f.id !== filterId));
    if (activeCustomFilterId === filterId) {
      setActiveCustomFilterId('all');
    }
    dbDeleteCustomFilter(filterId).catch(err => console.warn('Sync delete custom filter error:', err));
  };

  // 4. Modal state
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [selectedRecordIds, setSelectedRecordIds] = useState([]);

  // Campaign Links Modal state
  const [isLinksModalOpen, setIsLinksModalOpen] = useState(false);
  const [linksModalCampaign, setLinksModalCampaign] = useState(null);

  // Global Airtable CSV Import Modal state
  const [isGlobalImportModalOpen, setIsGlobalImportModalOpen] = useState(false);

  // Active Campaign Edit Modal state
  const [isEditActiveCampaignModalOpen, setIsEditActiveCampaignModalOpen] = useState(false);

  // Active Custom Filter Object
  const activeCustomFilter = useMemo(() => {
    return customFilters.find(f => f.id === activeCustomFilterId) || customFilters[0];
  }, [customFilters, activeCustomFilterId]);

  // Column Visibility Management (Persisted per filter when saved filter is active, or global when in default view)
  const [defaultHiddenColumns, setDefaultHiddenColumns] = useState(() => {
    try {
      const saved = localStorage.getItem('brabo_grid_default_hidden_columns');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const activeHiddenColumns = useMemo(() => {
    if (activeCustomFilter && !activeCustomFilter.isDefault && activeCustomFilter.id !== 'all') {
      return activeCustomFilter.hiddenColumns || [];
    }
    return defaultHiddenColumns;
  }, [activeCustomFilter, defaultHiddenColumns]);

  const handleToggleColumnVisibility = (columnId) => {
    if (activeCustomFilter && !activeCustomFilter.isDefault && activeCustomFilter.id !== 'all') {
      // Isolate hidden columns to THIS specific saved filter!
      const current = activeCustomFilter.hiddenColumns || [];
      const next = current.includes(columnId)
        ? current.filter(id => id !== columnId)
        : [...current, columnId];
      handleUpdateCustomFilter(activeCustomFilter.id, { hiddenColumns: next });
    } else {
      // Update global default view
      setDefaultHiddenColumns(prev => {
        const next = prev.includes(columnId)
          ? prev.filter(id => id !== columnId)
          : [...prev, columnId];
        try {
          localStorage.setItem('brabo_grid_default_hidden_columns', JSON.stringify(next));
        } catch { /* ignore */ }
        return next;
      });
    }
  };

  const handleShowAllColumns = () => {
    if (activeCustomFilter && !activeCustomFilter.isDefault && activeCustomFilter.id !== 'all') {
      handleUpdateCustomFilter(activeCustomFilter.id, { hiddenColumns: [] });
    } else {
      setDefaultHiddenColumns([]);
      try {
        localStorage.setItem('brabo_grid_default_hidden_columns', JSON.stringify([]));
      } catch { /* ignore */ }
    }
  };

  // Toolbar dynamic multi-rule filter state
  const [toolbarFilter, setToolbarFilter] = useState(() => {
    try {
      const saved = localStorage.getItem('brabo_airtable_toolbar_filter');
      return saved ? JSON.parse(saved) : { conjunction: 'AND', rules: [] };
    } catch {
      return { conjunction: 'AND', rules: [] };
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('brabo_airtable_toolbar_filter', JSON.stringify(toolbarFilter));
    } catch (e) {
      console.warn('Erro ao salvar toolbarFilter:', e);
    }
  }, [toolbarFilter]);

  // Filter & Sort Messages for the Active Campaign & Selected Flow
  const filteredMessages = useMemo(() => {
    return flowMessages.filter(item => {
      // Global Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = item.title?.toLowerCase().includes(q);
        const matchChannel = item.channel?.toLowerCase().includes(q);
        const matchCopy = item.copyText?.toLowerCase().includes(q);
        const matchNotes = item.notes?.toLowerCase().includes(q);
        if (!matchTitle && !matchChannel && !matchCopy && !matchNotes) {
          return false;
        }
      }

      // Toolbar Channel filter (legacy/quick)
      if (filterChannel !== 'All' && item.channel !== filterChannel) {
        return false;
      }

      // Toolbar Dynamic Multi-Rule Filter
      if (toolbarFilter && toolbarFilter.rules && toolbarFilter.rules.length > 0) {
        if (!matchRecordWithFilter(item, toolbarFilter)) {
          return false;
        }
      }

      // Active Custom Filter Criteria from sidebar
      if (activeCustomFilter && !matchRecordWithFilter(item, activeCustomFilter)) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      let valA, valB;
      if (sortBy === 'default' || sortBy === 'date' || sortBy === 'scheduledDate') {
        const timeA = a.scheduledTime || '00:00';
        const timeB = b.scheduledTime || '00:00';
        const cleanTimeA = timeA.length === 5 ? timeA : timeA.padStart(5, '0');
        const cleanTimeB = timeB.length === 5 ? timeB : timeB.padStart(5, '0');
        const dateA = new Date(`${a.scheduledDate || '1970-01-01'}T${cleanTimeA}:00`).getTime();
        const dateB = new Date(`${b.scheduledDate || '1970-01-01'}T${cleanTimeB}:00`).getTime();
        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
      }
      if (sortBy === 'time' || sortBy === 'scheduledTime') {
        valA = a.scheduledTime || '';
        valB = b.scheduledTime || '';
      } else if (sortBy === 'title') {
        valA = a.title || '';
        valB = b.title || '';
      } else if (sortBy === 'stage') {
        valA = a.stage || '';
        valB = b.stage || '';
      } else if (sortBy === 'channel') {
        valA = a.channel || '';
        valB = b.channel || '';
      } else if (sortBy === 'copy' || sortBy === 'copyText') {
        valA = a.copyText || '';
        valB = b.copyText || '';
      } else if (sortBy === 'notes') {
        valA = a.notes || '';
        valB = b.notes || '';
      } else if (sortBy.startsWith('custom_') || a.customFields?.[sortBy] !== undefined || b.customFields?.[sortBy] !== undefined) {
        const cId = sortBy.replace('custom_', '');
        valA = (a.customFields?.[cId] ?? '').toString();
        valB = (b.customFields?.[cId] ?? '').toString();
      } else {
        valA = (a[sortBy] ?? '').toString();
        valB = (b[sortBy] ?? '').toString();
      }

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortDirection === 'asc' ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
    });
  }, [flowMessages, searchQuery, filterChannel, toolbarFilter, activeCustomFilter, sortBy, sortDirection]);

  // Automatic Dispatch: Quando o disparo estiver com o status "PROGRAMADO" e der o horário dele, muda automaticamente para "Disparada"
  useEffect(() => {
    const checkScheduledDisparos = () => {
      const now = new Date();
      const syncQueue = [];

      setCampaigns(prevCampaigns => {
        let hasAnyChange = false;
        const updatedCampaigns = prevCampaigns.map(camp => {
          let campChanged = false;
          const updatedMessages = (camp.messages || []).map(m => {
            const st = String(m.stage || '').trim().toLowerCase();
            const isProgramada = st.includes('program') || st.includes('agend');

            if (isProgramada && m.scheduledDate) {
              const timeStr = m.scheduledTime || '00:00';
              const cleanTime = timeStr.length === 5 ? timeStr : timeStr.padStart(5, '0');
              const scheduledDateTime = new Date(`${m.scheduledDate}T${cleanTime}:00`);

              if (!isNaN(scheduledDateTime.getTime()) && scheduledDateTime <= now) {
                campChanged = true;
                hasAnyChange = true;
                const updatedMsg = { ...m, stage: 'Disparada' };
                syncQueue.push({ campaignId: camp.id, message: updatedMsg });
                return updatedMsg;
              }
            }
            return m;
          });

          if (campChanged) {
            return { ...camp, messages: updatedMessages };
          }
          return camp;
        });

        if (hasAnyChange) {
          return updatedCampaigns;
        }
        return prevCampaigns;
      });

      if (syncQueue.length > 0) {
        syncQueue.forEach(({ campaignId, message }) => {
          dbUpdateDisparo(message.id, message, campaignId).catch(err => {
            console.warn('Auto-dispatch sync error:', err);
          });
        });
      }
    };

    checkScheduledDisparos();
    const interval = setInterval(checkScheduledDisparos, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleFilterByColumn = (fieldId) => {
    const targetField = fieldId === 'date' ? 'scheduledDate' : fieldId === 'time' ? 'scheduledTime' : fieldId === 'copy' ? 'copyText' : fieldId;
    const newRule = {
      id: `r-${Date.now()}`,
      field: targetField,
      operator: targetField === 'stage' ? 'equals' : targetField === 'scheduledDate' ? 'exact_date' : 'contains',
      value: targetField === 'stage' ? 'Programada' : '',
      value2: ''
    };
    setToolbarFilter(prev => ({
      conjunction: prev?.conjunction || 'AND',
      rules: [...(prev?.rules || []), newRule]
    }));
  };

  // Campaign Actions
  const handleSelectCampaign = (camp, flowCategory = 'whatsapp') => {
    setActiveCampaignId(camp.id);
    if (flowCategory) {
      setActiveFlowCategory(flowCategory);
    }
    setActiveTable('disparos');
  };

  const handleAddNewCampaign = async (newCamp) => {
    setCampaigns(prev => [newCamp, ...prev]);
    setActiveCampaignId(newCamp.id);
    setActiveTable('disparos');
    try {
      await dbCreateCampaign(newCamp);
      setSupabaseStatus('connected');
    } catch (err) {
      console.error('Erro ao salvar nova campanha no Supabase:', err);
      alert('Aviso: Houve um problema ao sincronizar com o banco Supabase: ' + (err.message || 'Erro de rede.'));
    }
  };

  const handleUpdateCampaign = (campaignId, updates) => {
    setCampaigns(prev => prev.map(c => {
      if (c.id === campaignId) {
        return { ...c, ...updates };
      }
      return c;
    }));
    dbUpdateCampaign(campaignId, updates).catch(err => console.warn('Sync update campaign error:', err));
  };

  const handleDeleteCampaign = (campaignId) => {
    const updated = campaigns.filter(c => c.id !== campaignId);
    setCampaigns(updated);
    if (activeCampaignId === campaignId) {
      setActiveCampaignId(updated[0]?.id || null);
    }
    dbDeleteCampaign(campaignId).catch(err => console.warn('Sync delete campaign error:', err));
  };

  const handleUpdateCampaignLinks = (campaignId, updatedLinks) => {
    setCampaigns(prev => prev.map(c => {
      if (c.id === campaignId) {
        return { ...c, predefinedLinks: updatedLinks };
      }
      return c;
    }));
    dbSyncCampaignLinks(campaignId, updatedLinks).catch(err => console.warn('Sync links error:', err));
  };

  const handleUpdateCampaignCustomColumns = (newCols) => {
    if (!activeCampaign) return;
    setCampaigns(prev => prev.map(c => {
      if (c.id === activeCampaign.id) {
        return { ...c, customColumns: newCols };
      }
      return c;
    }));
    dbSyncCampaignColumns(activeCampaign.id, newCols).catch(err => console.warn('Sync cols error:', err));
  };

  const handleOpenLinksModal = (camp) => {
    setLinksModalCampaign(camp || activeCampaign);
    setIsLinksModalOpen(true);
  };

  const updateDisparoTimerRef = useRef({});

  // Message Actions within active campaign
  const handleUpdateRecord = (messageId, updates) => {
    if (!activeCampaign) return;

    let finalMessageToSync = null;

    setCampaigns(prev => prev.map(c => {
      if (c.id === activeCampaign.id) {
        const updatedMessages = (c.messages || []).map(m => {
          if (m.id !== messageId) return m;

          // Se o usuário está alterando a Status explicitamente, respeita a nova Status
          if ('stage' in updates) {
            const updated = { ...m, ...updates };
            finalMessageToSync = updated;
            return updated;
          }

          // Se a mensagem não estiver "Em Rascunho" e houver alteração de qualquer campo, volta para "Em Rascunho"
          const shouldResetToDraft = m.stage && m.stage !== 'Em Rascunho';
          const finalUpdates = shouldResetToDraft ? { ...updates, stage: 'Em Rascunho' } : updates;
          const updated = { ...m, ...finalUpdates };
          finalMessageToSync = updated;

          return updated;
        });
        return { ...c, messages: updatedMessages };
      }
      return c;
    }));

    if (finalMessageToSync) {
      if (updateDisparoTimerRef.current[messageId]) {
        clearTimeout(updateDisparoTimerRef.current[messageId]);
      }
      updateDisparoTimerRef.current[messageId] = setTimeout(() => {
        dbUpdateDisparo(messageId, finalMessageToSync, activeCampaign.id).catch(err => console.warn('Sync disparo error:', err));
        delete updateDisparoTimerRef.current[messageId];
      }, 300);
    }

    if (selectedRecord && selectedRecord.id === messageId) {
      setSelectedRecord(prev => {
        if (!prev) return null;
        if ('stage' in updates) {
          return { ...prev, ...updates };
        }
        const shouldResetToDraft = prev.stage && prev.stage !== 'Em Rascunho';
        const finalUpdates = shouldResetToDraft ? { ...updates, stage: 'Em Rascunho' } : updates;
        return { ...prev, ...finalUpdates };
      });
    }
  };

  const handleAddNewMessage = (initialOverrides = {}) => {
    if (!activeCampaign) return;

    // Pick first predefined link if exists
    const defaultLink = activeCampaign.predefinedLinks?.[0];
    const defaultLinkId = defaultLink?.id || '';

    // Determine default channel based on activeFlowCategory
    let defaultChannel = 'Grupo Normal WhatsApp';
    if (activeFlowCategory === 'email') {
      defaultChannel = 'Email';
    } else if (activeFlowCategory === 'youtube') {
      defaultChannel = 'Comunidade YouTube';
    } else if (activeFlowCategory === 'whatsapp') {
      defaultChannel = 'Grupo Normal WhatsApp';
    }

    const assignedChannel = initialOverrides.channel || defaultChannel;

    const newId = `msg-${Date.now()}`;
    const newMsg = {
      id: newId,
      campaignId: activeCampaign.id,
      title: `Disparo ${activeMessages.length + 1} - ${assignedChannel}`,
      stage: initialOverrides.stage || 'Em Rascunho',
      channel: assignedChannel,
      scheduledDate: initialOverrides.scheduledDate || new Date().toISOString().split('T')[0],
      scheduledTime: '10:00',
      selectedLinkId: defaultLinkId,
      variables: initialOverrides.variables || (defaultLink ? { '1': { linkId: defaultLinkId, text: defaultLink.url } } : {}),
      copyText: `Fala *{primeiro_nome}*, aqui é da *Brabo Concursos*! 🦅\n\nLiberamos as vagas exclusivas para você.\n\n👇 *Acesse o link oficial abaixo:*\n{{1}}`,
      notes: '',
      ...initialOverrides
    };

    setCampaigns(prev => prev.map(c => {
      if (c.id === activeCampaign.id) {
        const remaining = (c.messages || []).filter(m => m.id !== newId);
        return { ...c, messages: [newMsg, ...remaining] };
      }
      return c;
    }));

    setSelectedRecord(newMsg);
    setIsRecordModalOpen(true);

    dbCreateDisparo(activeCampaign.id, newMsg).catch(err => console.warn('Sync new disparo error:', err));
  };

  const handleDeleteRecord = (messageId) => {
    if (!activeCampaign) return;

    setCampaigns(prev => prev.map(c => {
      if (c.id === activeCampaign.id) {
        return { ...c, messages: (c.messages || []).filter(m => m.id !== messageId) };
      }
      return c;
    }));

    if (selectedRecord && selectedRecord.id === messageId) {
      setIsRecordModalOpen(false);
      setSelectedRecord(null);
    }

    dbDeleteDisparo(messageId).catch(err => console.warn('Sync delete disparo error:', err));
  };

  const handleDuplicateRecord = (record) => {
    if (!activeCampaign) return;

    const duplicated = {
      ...record,
      id: `msg-${Date.now()}`,
      campaignId: activeCampaign.id,
      title: `${record.title} (Cópia)`
    };

    setCampaigns(prev => prev.map(c => {
      if (c.id === activeCampaign.id) {
        return { ...c, messages: [duplicated, ...(c.messages || [])] };
      }
      return c;
    }));

    dbCreateDisparo(activeCampaign.id, duplicated).catch(err => console.warn('Sync duplicate disparo error:', err));
  };

  const handleOpenRecord = (record) => {
    setSelectedRecord(record);
    setIsRecordModalOpen(true);
  };

  // Data Export & Import
  const handleExportData = (format) => {
    if (format === 'json') {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(campaigns, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `brabo_campanhas_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } else if (format === 'csv') {
      const headers = ['campanha', 'id', 'titulo', 'Status', 'canal', 'data', 'horario'];
      const rows = [];
      campaigns.forEach(c => {
        (c.messages || []).forEach(m => {
          rows.push([
            `"${c.name.replace(/"/g, '""')}"`,
            `"${m.id}"`,
            `"${m.title.replace(/"/g, '""')}"`,
            `"${m.stage || 'Em Rascunho'}"`,
            `"${m.channel}"`,
            `"${m.scheduledDate}"`,
            `"${m.scheduledTime}"`
          ].join(','));
        });
      });
      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", encodeURI(csvContent));
      downloadAnchor.setAttribute("download", `brabo_disparos_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    }
  };

  const handleImportData = (jsonString) => {
    try {
      const parsed = JSON.parse(jsonString);
      if (Array.isArray(parsed) && parsed.length > 0) {
        setCampaigns(parsed);
        setActiveCampaignId(parsed[0].id);
        alert('Campanhas e fluxos importados com sucesso!');
      } else {
        alert('Formato de backup inválido.');
      }
    } catch {
      alert('Erro ao carregar arquivo: JSON inválido.');
    }
  };

  const handleResetData = async () => {
    try {
      setSupabaseStatus('syncing');
      await dbClearAllData();
      setCampaigns([]);
      setActiveCampaignId(null);
      localStorage.removeItem('brabo_airtable_campaigns');
      localStorage.removeItem('brabo_airtable_campaigns_real');
      localStorage.removeItem('brabo_airtable_active_campaign_id');
      setSupabaseStatus('connected');
    } catch (err) {
      console.warn('Erro ao limpar dados:', err);
      setCampaigns([]);
      setActiveCampaignId(null);
      localStorage.clear();
      setSupabaseStatus('connected');
    }
  };

  return (
    <div className="app-container">
      {/* 1. Header estilo Airtable */}
      <Header
        campaigns={campaigns}
        activeCampaign={activeCampaign}
        onSelectCampaign={handleSelectCampaign}
        onOpenCampaignsManager={() => setActiveTable('campanhas')}
        onOpenLinksModal={handleOpenLinksModal}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onNewMessage={() => handleAddNewMessage()}
        onExportData={handleExportData}
        onImportData={handleImportData}
        onResetData={handleResetData}
        onOpenImportCsv={() => setIsGlobalImportModalOpen(true)}
        supabaseStatus={supabaseStatus}
      />

      {/* 2. View Toolbar (Controls for Active Campaign's messages) */}
      {activeTable === 'disparos' && (
        <ViewToolbar
          activeView={activeView}
          setActiveView={setActiveView}
          filterChannel={filterChannel}
          setFilterChannel={setFilterChannel}
          toolbarFilter={toolbarFilter}
          onUpdateToolbarFilter={setToolbarFilter}
          groupBy={groupBy}
          setGroupBy={setGroupBy}
          sortBy={sortBy}
          setSortBy={setSortBy}
          sortDirection={sortDirection}
          setSortDirection={setSortDirection}
          rowDensity={rowDensity}
          setRowDensity={setRowDensity}
          recordsCount={filteredMessages.length}
          campaign={activeCampaign}
          onOpenLinksModal={handleOpenLinksModal}
          onOpenEditCampaign={() => setIsEditActiveCampaignModalOpen(true)}
          hiddenColumns={activeHiddenColumns}
          onToggleColumnVisibility={handleToggleColumnVisibility}
          onShowAllColumns={handleShowAllColumns}
          activeCustomFilter={activeCustomFilter}
          activeFlowCategory={activeFlowCategory}
          setActiveFlowCategory={setActiveFlowCategory}
          flowCounts={flowCounts}
        />
      )}

      {/* 4. Main Views Area */}
      <main className="main-view-container">
        {/* Table: Disparos da Campanha Ativa com Barra Lateral de Filtros */}
        {activeTable === 'disparos' && activeCampaign && (
          <div style={{ display: 'flex', height: '100%', width: '100%', overflow: 'hidden' }}>
            {/* Custom Filters Sidebar on the Left */}
            <CustomFiltersSidebar
              customFilters={customFilters}
              activeFilterId={activeCustomFilterId}
              onSelectFilter={(f) => setActiveCustomFilterId(f.id)}
              onCreateFilter={handleCreateCustomFilter}
              onUpdateFilter={handleUpdateCustomFilter}
              onDeleteFilter={handleDeleteCustomFilter}
              records={flowMessages}
              isOpen={isCustomSidebarOpen}
              onToggleOpen={() => setIsCustomSidebarOpen(!isCustomSidebarOpen)}
              campaign={activeCampaign}
              activeFlowCategory={activeFlowCategory}
            />

            {/* Views Area on the Right */}
            <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
              {activeView === 'grid' && (
                <GridView
                  records={filteredMessages}
                  campaign={activeCampaign}
                  onUpdateRecord={handleUpdateRecord}
                  onOpenRecord={handleOpenRecord}
                  onDeleteRecord={handleDeleteRecord}
                  onDuplicateRecord={handleDuplicateRecord}
                  onAddNewRow={() => handleAddNewMessage()}
                  rowDensity={rowDensity}
                  groupBy={groupBy}
                  selectedRecordIds={selectedRecordIds}
                  setSelectedRecordIds={setSelectedRecordIds}
                  onOpenLinksModal={handleOpenLinksModal}
                  onUpdateCustomColumns={handleUpdateCampaignCustomColumns}
                  hiddenColumns={activeHiddenColumns}
                  activeFlowCategory={activeFlowCategory}
                  onSortBy={(fieldId, dir) => {
                    setSortBy(fieldId);
                    setSortDirection(dir);
                  }}
                  onGroupBy={(fieldId) => {
                    setGroupBy(prev => prev === fieldId ? 'none' : fieldId);
                  }}
                  onFilterBy={handleFilterByColumn}
                  onToggleColumnVisibility={handleToggleColumnVisibility}
                />
              )}

              {activeView === 'flow' && (
                <FlowView
                  records={filteredMessages}
                  campaign={activeCampaign}
                  onUpdateRecord={handleUpdateRecord}
                  onOpenRecord={handleOpenRecord}
                  onDeleteRecord={handleDeleteRecord}
                  onDuplicateRecord={handleDuplicateRecord}
                  onAddNewMessage={handleAddNewMessage}
                />
              )}

              {activeView === 'kanban' && (
                <KanbanView
                  records={filteredMessages}
                  campaign={activeCampaign}
                  onUpdateRecord={handleUpdateRecord}
                  onOpenRecord={handleOpenRecord}
                  onAddNewRecordWithStage={(stage) => handleAddNewMessage({ stage })}
                />
              )}

              {activeView === 'calendar' && (
                <CalendarView
                  records={filteredMessages}
                  onOpenRecord={handleOpenRecord}
                  onAddNewRecordWithDate={(date) => handleAddNewMessage({ scheduledDate: date })}
                />
              )}

              {activeView === 'simulator' && (
                <WhatsAppSimulatorView
                  records={filteredMessages}
                  campaign={activeCampaign}
                  onOpenRecord={handleOpenRecord}
                />
              )}
            </div>
          </div>
        )}

        {/* Table: Todas as Campanhas (ou se não houver campanha ativa) */}
        {(activeTable === 'campanhas' || (activeTable === 'disparos' && !activeCampaign)) && (
          <CampaignsManager
            campaigns={campaigns}
            onSelectCampaign={handleSelectCampaign}
            onAddNewCampaign={handleAddNewCampaign}
            onUpdateCampaign={handleUpdateCampaign}
            onDeleteCampaign={handleDeleteCampaign}
            onOpenLinksModal={handleOpenLinksModal}
            onUpdateCampaignLinks={handleUpdateCampaignLinks}
          />
        )}

        {/* Table: Links Predefinidos */}
        {activeTable === 'links' && activeCampaign && (
          <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <span style={{ fontSize: '0.74rem', color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase' }}>
                  Campanha: {activeCampaign.name}
                </span>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 700, color: '#fff' }}>
                  Links Predefinidos desta Campanha
                </h2>
                <p style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                  Todos os links cadastrados aqui ficam disponíveis para escolha nas mensagens.
                </p>
              </div>

              <button
                className="btn-primary"
                onClick={() => handleOpenLinksModal(activeCampaign)}
              >
                <span>+ Gerenciar / Adicionar Links</span>
              </button>
            </div>

            <div style={{ display: 'grid', gap: '1rem' }}>
              {(activeCampaign.predefinedLinks || []).map(lnk => (
                <div
                  key={lnk.id}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    padding: '1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fbbf24' }}>
                      🔗 {lnk.label}
                    </span>
                    <a
                      href={lnk.url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: '0.8rem', color: '#60a5fa', textDecoration: 'none' }}
                    >
                      {lnk.url}
                    </a>
                  </div>

                  <span style={{ fontSize: '0.75rem', color: '#4ade80', background: 'rgba(34, 197, 94, 0.15)', padding: '0.25rem 0.6rem', borderRadius: '6px' }}>
                    Ativo nas Mensagens
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Table: Simulador Direto */}
        {activeTable === 'simulator' && (
          <WhatsAppSimulatorView
            records={filteredMessages}
            campaign={activeCampaign}
            onOpenRecord={handleOpenRecord}
          />
        )}
      </main>

      {/* 5. Full Record Expand Modal */}
      <RecordDetailModal
        record={selectedRecord}
        campaign={activeCampaign}
        isOpen={isRecordModalOpen}
        onClose={() => {
          setIsRecordModalOpen(false);
          setSelectedRecord(null);
        }}
        onUpdateRecord={handleUpdateRecord}
        onDeleteRecord={handleDeleteRecord}
        onDuplicateRecord={handleDuplicateRecord}
        onOpenLinksModal={handleOpenLinksModal}
        activeFlowCategory={activeFlowCategory}
        hiddenColumns={activeHiddenColumns}
        onToggleColumnVisibility={handleToggleColumnVisibility}
      />

      {/* 6. Campaign Predefined Links Modal */}
      <CampaignLinksModal
        isOpen={isLinksModalOpen}
        onClose={() => {
          setIsLinksModalOpen(false);
          setLinksModalCampaign(null);
        }}
        campaign={linksModalCampaign || activeCampaign}
        onUpdateCampaignLinks={handleUpdateCampaignLinks}
      />

      {/* 7. Global Airtable CSV Import Modal */}
      <ImportCsvModal
        isOpen={isGlobalImportModalOpen}
        onClose={() => setIsGlobalImportModalOpen(false)}
        onImportCampaign={(newCamp) => {
          handleAddNewCampaign(newCamp);
          setIsGlobalImportModalOpen(false);
        }}
      />

      {/* 8. Active Campaign Edit Modal */}
      {activeCampaign && (
        <EditCampaignModal
          isOpen={isEditActiveCampaignModalOpen}
          onClose={() => setIsEditActiveCampaignModalOpen(false)}
          campaign={activeCampaign}
          onUpdateCampaign={handleUpdateCampaign}
          onUpdateLinks={handleUpdateCampaignLinks}
        />
      )}
    </div>
  );
}
