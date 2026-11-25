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
import CampaignTagsModal from './components/CampaignTagsModal';
import { Sparkles, Plus, Copy, Check, ExternalLink, Edit3, X } from 'lucide-react';
import RecordDetailModal from './components/RecordDetailModal';
import CustomFiltersSidebar from './components/CustomFiltersSidebar';
import EditCampaignModal from './components/EditCampaignModal';
import BulkEditModal from './components/BulkEditModal';
import LoginScreen from './components/LoginScreen';
import { getSavedSession, logoutSession, canUserEdit } from './services/authService';

import { matchRecordWithFilter, extractAllCampaignBracketTags, findMatchingFilterId } from './data/initialData';
import {
  fetchAllCampaignsFromDb,
  dbClearAllData,
  dbCreateCampaign,
  dbUpdateCampaign,
  dbDeleteCampaign,
  dbSyncCampaignLinks,
  dbSyncCampaignColumns,
  dbUpdateCampaignPlaceholders,
  dbCreateDisparo,
  dbUpdateDisparo,
  dbDeleteDisparo,
  dbBatchDeleteDisparos,
  dbBatchUpdateDisparos,
  fetchCustomFiltersFromDb,
  dbSaveCustomFilter,
  dbDeleteCustomFilter
} from './services/supabaseService';
import { supabase } from './services/supabase';

export default function App() {
  // Authentication & Role State ('editor' = full access, 'viewer' = read-only)
  const [currentUser, setCurrentUser] = useState(() => getSavedSession());
  const [isPostLoginLoading, setIsPostLoginLoading] = useState(false);
  const isReadOnly = !canUserEdit(currentUser);
  const filterRole = currentUser?.role === 'viewer' ? 'viewer' : 'editor';
  const filterRoleRef = useRef(filterRole);
  filterRoleRef.current = filterRole;

  // Light / Dark Theme State
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('bflow_theme') || 'dark';
    } catch {
      return 'dark';
    }
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('bflow_theme', theme);
    } catch { /* ignore */ }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleLogout = () => {
    logoutSession();
    setCurrentUser(null);
    setSelectedRecord(null);
    setIsRecordModalOpen(false);
  };

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

  const campaignsRef = useRef(campaigns);
  campaignsRef.current = campaigns;
  const undoStackRef = useRef([]);
  const redoStackRef = useRef([]);
  const lastUndoGroupRef = useRef({ key: null, time: 0 });
  const undoToastTimerRef = useRef(null);
  const [undoToast, setUndoToast] = useState(null);

  const showUndoToast = useCallback((message) => {
    if (undoToastTimerRef.current) clearTimeout(undoToastTimerRef.current);
    setUndoToast(message);
    undoToastTimerRef.current = setTimeout(() => {
      setUndoToast(null);
    }, 2200);
  }, []);

  const pushUndoSnapshot = useCallback((groupKey = null) => {
    const now = Date.now();
    if (groupKey && lastUndoGroupRef.current.key === groupKey && now - lastUndoGroupRef.current.time < 1500) {
      lastUndoGroupRef.current.time = now;
      return;
    }
    lastUndoGroupRef.current = { key: groupKey, time: now };
    const snapshot = JSON.parse(JSON.stringify(campaignsRef.current || []));
    undoStackRef.current.push(snapshot);
    if (undoStackRef.current.length > 30) {
      undoStackRef.current.shift();
    }
    redoStackRef.current = [];
  }, []);

  const syncCampaignsDiffToDb = useCallback((prevList, nextList) => {
    const prevMap = new Map((prevList || []).map(c => [c.id, c]));
    const nextMap = new Map((nextList || []).map(c => [c.id, c]));

    // 1. Campanhas removidas
    for (const [id] of prevMap) {
      if (!nextMap.has(id)) {
        dbDeleteCampaign(id).catch(err => console.warn('Undo/Redo delete campaign error:', err));
      }
    }

    // 2. Campanhas adicionadas ou atualizadas
    for (const [id, nextCamp] of nextMap) {
      const prevCamp = prevMap.get(id);
      if (!prevCamp) {
        dbCreateCampaign(nextCamp)
          .then(() => {
            (nextCamp.messages || []).forEach(m => {
              dbCreateDisparo(id, m).catch(err => console.warn('Undo/Redo create disparo error:', err));
            });
          })
          .catch(err => console.warn('Undo/Redo create campaign error:', err));
        continue;
      }

      if (
        prevCamp.name !== nextCamp.name ||
        prevCamp.status !== nextCamp.status ||
        prevCamp.tagline !== nextCamp.tagline ||
        prevCamp.startDate !== nextCamp.startDate ||
        prevCamp.endDate !== nextCamp.endDate ||
        prevCamp.badgeColor !== nextCamp.badgeColor ||
        JSON.stringify(prevCamp.channelOptions) !== JSON.stringify(nextCamp.channelOptions) ||
        JSON.stringify(prevCamp.stageOptions) !== JSON.stringify(nextCamp.stageOptions)
      ) {
        dbUpdateCampaign(id, nextCamp).catch(err => console.warn('Undo/Redo update campaign error:', err));
      }

      if (JSON.stringify(prevCamp.customPlaceholders) !== JSON.stringify(nextCamp.customPlaceholders)) {
        dbUpdateCampaignPlaceholders(id, nextCamp.customPlaceholders || {}).catch(err => console.warn('Undo/Redo placeholders error:', err));
      }

      if (JSON.stringify(prevCamp.predefinedLinks) !== JSON.stringify(nextCamp.predefinedLinks)) {
        dbSyncCampaignLinks(id, nextCamp.predefinedLinks || []).catch(err => console.warn('Undo/Redo links error:', err));
      }

      if (JSON.stringify(prevCamp.customColumns) !== JSON.stringify(nextCamp.customColumns)) {
        dbSyncCampaignColumns(id, nextCamp.customColumns || []).catch(err => console.warn('Undo/Redo cols error:', err));
      }

      const prevMsgs = new Map((prevCamp.messages || []).map(m => [m.id, m]));
      const nextMsgs = new Map((nextCamp.messages || []).map(m => [m.id, m]));

      const deletedMsgIds = [];
      for (const [msgId] of prevMsgs) {
        if (!nextMsgs.has(msgId)) deletedMsgIds.push(msgId);
      }
      if (deletedMsgIds.length > 0) {
        dbBatchDeleteDisparos(deletedMsgIds).catch(err => console.warn('Undo/Redo delete disparos error:', err));
      }

      for (const [msgId, nextMsg] of nextMsgs) {
        const prevMsg = prevMsgs.get(msgId);
        lastLocalUpdateTimestampRef.current[msgId] = Date.now();
        if (!prevMsg) {
          dbCreateDisparo(id, nextMsg).catch(err => console.warn('Undo/Redo create disparo error:', err));
        } else if (JSON.stringify(prevMsg) !== JSON.stringify(nextMsg)) {
          dbUpdateDisparo(msgId, nextMsg, id).catch(err => console.warn('Undo/Redo update disparo error:', err));
        }
      }
    }
  }, []);

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
        // Preserva customPlaceholders locais/em cache caso o banco ainda não os tenha retornado
        let cachedCampaigns = [];
        try {
          const raw = localStorage.getItem('brabo_airtable_campaigns_real');
          if (raw) cachedCampaigns = JSON.parse(raw);
        } catch { /* ignore */ }

        const mergedData = data.map(dbCamp => {
          const cached = cachedCampaigns.find(c => c.id === dbCamp.id);
          const hasDbTags = dbCamp.customPlaceholders && Object.keys(dbCamp.customPlaceholders).length > 0;
          const hasDbChannels = Array.isArray(dbCamp.channelOptions) && dbCamp.channelOptions.length > 0;
          const hasDbStages = Array.isArray(dbCamp.stageOptions) && dbCamp.stageOptions.length > 0;

          return {
            ...dbCamp,
            customPlaceholders: hasDbTags
              ? dbCamp.customPlaceholders
              : (cached?.customPlaceholders || {}),
            channelOptions: hasDbChannels
              ? dbCamp.channelOptions
              : (cached?.channelOptions || null),
            stageOptions: hasDbStages
              ? dbCamp.stageOptions
              : (cached?.stageOptions || null)
          };
        });

        setCampaigns(mergedData);
        setActiveCampaignId(prev => {
          if (prev && mergedData.some(c => c.id === prev)) return prev;
          return mergedData[0]?.id || null;
        });
        try {
          localStorage.setItem('brabo_airtable_campaigns_real', JSON.stringify(mergedData));
        } catch { /* ignore */ }
        setSupabaseStatus('connected');
      }

      // Fetch saved custom filters scoped to the current user's role (editor vs viewer)
      const dbFilters = await fetchCustomFiltersFromDb(filterRoleRef.current);
      if (dbFilters && dbFilters.length > 0) {
        setCustomFilters(dbFilters);
      }
    } catch (err) {
      console.warn('Supabase offline ou tabelas bflow_* ainda não criadas:', err.message || err);
      setSupabaseStatus('offline');
    }
  }, []);

  const realtimeTimerRef = useRef(null);
  const lastLocalUpdateTimestampRef = useRef({});

  useEffect(() => {
    loadDataFromSupabase();

    const debouncedReload = () => {
      // Se houver salvamentos locais em andamento, adia o reload para não atropelar alterações do usuário
      const hasPendingSaves = Object.keys(updateDisparoTimerRef.current).length > 0;
      if (hasPendingSaves) {
        if (realtimeTimerRef.current) clearTimeout(realtimeTimerRef.current);
        realtimeTimerRef.current = setTimeout(debouncedReload, 1200);
        return;
      }

      if (realtimeTimerRef.current) clearTimeout(realtimeTimerRef.current);
      realtimeTimerRef.current = setTimeout(() => {
        fetchAllCampaignsFromDb().then(data => {
          if (data && data.length > 0) {
            setCampaigns(prevCampaigns => {
              if (!prevCampaigns || prevCampaigns.length === 0) return data;

              return data.map(dbCamp => {
                const prevCamp = prevCampaigns.find(c => c.id === dbCamp.id);
                if (!prevCamp) return dbCamp;

                // Merge inteligente: preserva mensagens atualizadas localmente nos últimos 5 segundos
                const mergedMessages = (dbCamp.messages || []).map(dbMsg => {
                  const prevMsg = (prevCamp.messages || []).find(m => m.id === dbMsg.id);
                  if (!prevMsg) return dbMsg;

                  const isPending = !!updateDisparoTimerRef.current[dbMsg.id];
                  const timeSinceLocalUpdate = Date.now() - (lastLocalUpdateTimestampRef.current[dbMsg.id] || 0);
                  const isRecentlyUpdated = timeSinceLocalUpdate < 5000;

                  if (isPending || isRecentlyUpdated) {
                    return {
                      ...dbMsg,
                      ...prevMsg,
                      customFields: {
                        ...(dbMsg.customFields || {}),
                        ...(prevMsg.customFields || {})
                      }
                    };
                  }
                  return {
                    ...dbMsg,
                    emailSubject: dbMsg.emailSubject !== undefined ? dbMsg.emailSubject : (prevMsg.emailSubject || ''),
                    emailPreheader: dbMsg.emailPreheader !== undefined ? dbMsg.emailPreheader : (prevMsg.emailPreheader || ''),
                    emailSenderName: dbMsg.emailSenderName !== undefined ? dbMsg.emailSenderName : (prevMsg.emailSenderName || ''),
                    emailSenderAddress: dbMsg.emailSenderAddress !== undefined ? dbMsg.emailSenderAddress : (prevMsg.emailSenderAddress || ''),
                    emailCtaText: dbMsg.emailCtaText !== undefined ? dbMsg.emailCtaText : (prevMsg.emailCtaText || ''),
                    emailCtaUrl: dbMsg.emailCtaUrl !== undefined ? dbMsg.emailCtaUrl : (prevMsg.emailCtaUrl || ''),
                    emailFooterText: dbMsg.emailFooterText !== undefined ? dbMsg.emailFooterText : (prevMsg.emailFooterText || ''),
                    templateName: dbMsg.templateName !== undefined ? dbMsg.templateName : (prevMsg.templateName || ''),
                    buttons: (dbMsg.buttons && dbMsg.buttons.length > 0) ? dbMsg.buttons : (prevMsg.buttons || []),
                    buttonText: dbMsg.buttonText !== undefined ? dbMsg.buttonText : (prevMsg.buttonText || ''),
                    buttonResponses: (dbMsg.buttonResponses && dbMsg.buttonResponses.length > 0) ? dbMsg.buttonResponses : (prevMsg.buttonResponses || [])
                  };
                });

                // Preserva mensagens criadas localmente que ainda não foram retornadas do banco
                const dbMsgIds = new Set((dbCamp.messages || []).map(m => m.id));
                const localOnlyMsgs = (prevCamp.messages || []).filter(m => !dbMsgIds.has(m.id));

                return {
                  ...dbCamp,
                  customPlaceholders: {
                    ...(prevCamp.customPlaceholders || {}),
                    ...(dbCamp.customPlaceholders || {})
                  },
                  messages: [...mergedMessages, ...localOnlyMsgs]
                };
              });
            });
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

  // Prevent accidental file drops outside designated dropzones from navigating away
  useEffect(() => {
    const preventDragDropNav = (e) => {
      e.preventDefault();
    };
    window.addEventListener('dragover', preventDragDropNav);
    window.addEventListener('drop', preventDragDropNav);
    return () => {
      window.removeEventListener('dragover', preventDragDropNav);
      window.removeEventListener('drop', preventDragDropNav);
    };
  }, []);

  // Save to LocalStorage safely (stripping any heavy dataUrls to prevent QuotaExceededError crash)
  useEffect(() => {
    try {
      const cleanCampaigns = campaigns.map(c => ({
        ...c,
        messages: (c.messages || []).map(m => {
          if (!m.attachment) return m;
          if (Array.isArray(m.attachment)) {
            const cleanList = m.attachment.map(a => {
              if (!a) return a;
              const { dataUrl: _dataUrl, ...safe } = a;
              return safe;
            });
            return { ...m, attachment: cleanList };
          }
          if (typeof m.attachment === 'object') {
            const { dataUrl: _dataUrl, ...safeAttachment } = m.attachment;
            return { ...m, attachment: safeAttachment };
          }
          return m;
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
    const wa = activeMessages.filter(m => m.channel !== 'Email' && m.channel !== 'Comunidade YouTube' && m.channel !== 'Automações' && m.channel !== 'Emergenciais').length;
    const email = activeMessages.filter(m => m.channel === 'Email').length;
    const youtube = activeMessages.filter(m => m.channel === 'Comunidade YouTube').length;
    const automacoes = activeMessages.filter(m => m.channel === 'Automações').length;
    const emergenciais = activeMessages.filter(m => m.channel === 'Emergenciais').length;
    return {
      whatsapp: wa,
      email,
      youtube,
      automacoes,
      emergenciais,
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
    if (activeFlowCategory === 'automacoes') {
      return activeMessages.filter(m => m.channel === 'Automações');
    }
    if (activeFlowCategory === 'emergenciais') {
      return activeMessages.filter(m => m.channel === 'Emergenciais');
    }
    if (activeFlowCategory === 'whatsapp') {
      return activeMessages.filter(m => m.channel !== 'Email' && m.channel !== 'Comunidade YouTube' && m.channel !== 'Automações' && m.channel !== 'Emergenciais');
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

  const customFiltersStorageKey = filterRole === 'viewer'
    ? 'brabo_airtable_custom_filters_viewer_v1'
    : 'brabo_airtable_custom_filters_v2';
  const toolbarFilterStorageKey = filterRole === 'viewer'
    ? 'brabo_airtable_toolbar_filter_viewer'
    : 'brabo_airtable_toolbar_filter';
  const defaultHiddenColsStorageKey = filterRole === 'viewer'
    ? 'brabo_grid_default_hidden_columns_viewer'
    : 'brabo_grid_default_hidden_columns';

  const [customFilters, setCustomFilters] = useState(() => {
    try {
      const saved = localStorage.getItem(customFiltersStorageKey);
      if (saved) return JSON.parse(saved);
      return defaultCustomFilters;
    } catch {
      return defaultCustomFilters;
    }
  });

  const [activeCustomFilterId, setActiveCustomFilterId] = useState('all');
  const [isCustomSidebarOpen, setIsCustomSidebarOpen] = useState(true);

  // Universal dynamic multi-rule filter state (single source of truth for Toolbar, Sidebar & Column headers)
  const [toolbarFilter, setToolbarFilter] = useState(() => {
    try {
      const saved = localStorage.getItem(toolbarFilterStorageKey);
      return saved ? JSON.parse(saved) : { conjunction: 'AND', rules: [] };
    } catch {
      return { conjunction: 'AND', rules: [] };
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(customFiltersStorageKey, JSON.stringify(customFilters));
    } catch (e) {
      console.warn('Erro ao salvar customFilters:', e);
    }
  }, [customFilters, customFiltersStorageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(toolbarFilterStorageKey, JSON.stringify(toolbarFilter));
    } catch (e) {
      console.warn('Erro ao salvar toolbarFilter:', e);
    }
  }, [toolbarFilter, toolbarFilterStorageKey]);

  // Reload role-specific filters when switching between Admin (editor) and Viewer
  const prevFilterRoleRef = useRef(filterRole);
  useEffect(() => {
    if (prevFilterRoleRef.current === filterRole) return;
    prevFilterRoleRef.current = filterRole;

    try {
      const savedFilters = localStorage.getItem(customFiltersStorageKey);
      setCustomFilters(savedFilters ? JSON.parse(savedFilters) : defaultCustomFilters);
    } catch {
      setCustomFilters(defaultCustomFilters);
    }

    try {
      const savedToolbar = localStorage.getItem(toolbarFilterStorageKey);
      setToolbarFilter(savedToolbar ? JSON.parse(savedToolbar) : { conjunction: 'AND', rules: [] });
    } catch {
      setToolbarFilter({ conjunction: 'AND', rules: [] });
    }

    try {
      const savedHidden = localStorage.getItem(defaultHiddenColsStorageKey);
      setDefaultHiddenColumns(savedHidden ? JSON.parse(savedHidden) : []);
    } catch {
      setDefaultHiddenColumns([]);
    }

    setActiveCustomFilterId('all');

    fetchCustomFiltersFromDb(filterRole).then(dbFilters => {
      if (dbFilters && dbFilters.length > 0) {
        setCustomFilters(dbFilters);
      }
    }).catch(() => { /* ignore */ });
  }, [filterRole, customFiltersStorageKey, toolbarFilterStorageKey, defaultHiddenColsStorageKey]);

  // Synchronized Filter Handlers
  const handleUpdateUniversalFilter = (newFilter) => {
    const updated = typeof newFilter === 'function' ? newFilter(toolbarFilter) : newFilter;
    setToolbarFilter(updated);

    // Sync with sidebar saved filters
    const matchedId = findMatchingFilterId(customFilters, updated);
    if (matchedId) {
      setActiveCustomFilterId(matchedId);
    } else {
      setActiveCustomFilterId('custom');
    }
  };

  const handleSelectSidebarFilter = (filter) => {
    setActiveCustomFilterId(filter.id);
    const newRules = Array.isArray(filter.rules) ? JSON.parse(JSON.stringify(filter.rules)) : [];
    setToolbarFilter({
      conjunction: filter.conjunction || 'AND',
      rules: newRules
    });
  };

  const handleCreateCustomFilter = (newFilter) => {
    setCustomFilters(prev => [...prev, newFilter]);
    setActiveCustomFilterId(newFilter.id);
    setToolbarFilter({
      conjunction: newFilter.conjunction || 'AND',
      rules: Array.isArray(newFilter.rules) ? JSON.parse(JSON.stringify(newFilter.rules)) : []
    });
    dbSaveCustomFilter(newFilter, filterRole).catch(err => console.warn('Sync custom filter error:', err));
  };

  const handleUpdateCustomFilter = (filterId, updates) => {
    setCustomFilters(prev => {
      const updated = prev.map(f => f.id === filterId ? { ...f, ...updates } : f);
      const target = updated.find(f => f.id === filterId);
      if (target) {
        dbSaveCustomFilter(target, filterRole).catch(err => console.warn('Sync custom filter update error:', err));
        if (activeCustomFilterId === filterId) {
          setToolbarFilter({
            conjunction: target.conjunction || 'AND',
            rules: Array.isArray(target.rules) ? JSON.parse(JSON.stringify(target.rules)) : []
          });
        }
      }
      return updated;
    });
  };

  const handleDeleteCustomFilter = (filterId) => {
    setCustomFilters(prev => prev.filter(f => f.id !== filterId));
    if (activeCustomFilterId === filterId) {
      setActiveCustomFilterId('all');
      setToolbarFilter({ conjunction: 'AND', rules: [] });
    }
    dbDeleteCustomFilter(filterId, filterRole).catch(err => console.warn('Sync delete custom filter error:', err));
  };

  // 4. Modal state
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [selectedRecordIds, setSelectedRecordIds] = useState([]);
  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);

  // Campaign Tags Modal state
  const [isTagsModalOpen, setIsTagsModalOpen] = useState(false);
  const [tagsModalCampaign, setTagsModalCampaign] = useState(null);

  // Active Campaign Tags & Count
  const activeTags = useMemo(() => {
    if (!activeCampaign?.messages) return [];
    return extractAllCampaignBracketTags(activeCampaign.messages);
  }, [activeCampaign?.messages]);

  const activeTagsCount = activeTags.length;

  // Active Campaign Edit Modal state
  const [isEditActiveCampaignModalOpen, setIsEditActiveCampaignModalOpen] = useState(false);

  // Active Table Tags View Message Expand & Direct Edit state
  const [expandedPageTagKey, setExpandedPageTagKey] = useState(null);
  const [expandedPageMessageIds, setExpandedPageMessageIds] = useState({});
  const [copiedPageMsgId, setCopiedPageMsgId] = useState(null);
  const [editingPageMsgId, setEditingPageMsgId] = useState(null);
  const [editingPageMsgTitle, setEditingPageMsgTitle] = useState('');
  const [editingPageMsgDraft, setEditingPageMsgDraft] = useState('');

  // Active Custom Filter Object
  const activeCustomFilter = useMemo(() => {
    return customFilters.find(f => f.id === activeCustomFilterId) || customFilters[0];
  }, [customFilters, activeCustomFilterId]);

  // Column Visibility Management (Persisted per filter when saved filter is active, or global when in default view)
  const [defaultHiddenColumns, setDefaultHiddenColumns] = useState(() => {
    try {
      const saved = localStorage.getItem(defaultHiddenColsStorageKey);
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
          localStorage.setItem(defaultHiddenColsStorageKey, JSON.stringify(next));
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
        localStorage.setItem(defaultHiddenColsStorageKey, JSON.stringify([]));
      } catch { /* ignore */ }
    }
  };

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

      // Universal Dynamic Multi-Rule Filter (Synchronized across Toolbar, Sidebar & Columns)
      if (toolbarFilter && toolbarFilter.rules && toolbarFilter.rules.length > 0) {
        if (!matchRecordWithFilter(item, toolbarFilter)) {
          return false;
        }
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
  }, [flowMessages, searchQuery, filterChannel, toolbarFilter, sortBy, sortDirection]);

  // Ordenação exata da tabela que o usuário está visualizando (agrupamento, filtros e ordenação)
  const currentTableOrderedRecords = useMemo(() => {
    if (!filteredMessages || filteredMessages.length === 0) return [];
    if (!groupBy || groupBy === 'none') {
      return filteredMessages;
    }
    const groups = {};
    filteredMessages.forEach(rec => {
      let key = 'Sem Categoria';
      if (groupBy === 'date' || groupBy === 'scheduledDate') {
        key = rec.scheduledDate || 'Sem Data Definida';
      } else if (groupBy === 'stage') {
        key = rec.stage || 'Em Rascunho';
      } else if (groupBy === 'channel') {
        key = rec.channel || 'Sem Canal';
      } else if (groupBy === 'time' || groupBy === 'scheduledTime') {
        key = rec.scheduledTime || 'Sem Horário';
      } else if (groupBy === 'title') {
        key = rec.title || 'Sem Nome';
      } else if (rec[groupBy]) {
        key = rec[groupBy];
      } else if (rec.customFields && rec.customFields[groupBy] !== undefined) {
        key = String(rec.customFields[groupBy] || 'Vazio');
      }
      if (!groups[key]) groups[key] = [];
      groups[key].push(rec);
    });
    return Object.values(groups).flat();
  }, [filteredMessages, groupBy]);

  const applyRestoredCampaigns = useCallback((nextCampaigns, toastMessage) => {
    const prevCampaigns = campaignsRef.current || [];
    setCampaigns(nextCampaigns);
    try {
      localStorage.setItem('brabo_airtable_campaigns_real', JSON.stringify(nextCampaigns));
    } catch { /* ignore */ }

    if (selectedRecord) {
      const updatedCamp = nextCampaigns.find(c => (c.messages || []).some(m => m.id === selectedRecord.id));
      const updatedRec = updatedCamp?.messages?.find(m => m.id === selectedRecord.id);
      if (updatedRec) {
        setSelectedRecord(updatedRec);
      } else {
        setSelectedRecord(null);
        setIsRecordModalOpen(false);
      }
    }

    if (activeCampaignId && !nextCampaigns.some(c => c.id === activeCampaignId)) {
      setActiveCampaignId(nextCampaigns[0]?.id || null);
    }

    syncCampaignsDiffToDb(prevCampaigns, nextCampaigns);
    showUndoToast(toastMessage);
  }, [activeCampaignId, selectedRecord, showUndoToast, syncCampaignsDiffToDb]);

  const handleUndo = useCallback(() => {
    if (isReadOnly) return;
    if (undoStackRef.current.length === 0) {
      showUndoToast('Nada para desfazer');
      return;
    }
    const previous = undoStackRef.current.pop();
    const currentSnapshot = JSON.parse(JSON.stringify(campaignsRef.current || []));
    redoStackRef.current.push(currentSnapshot);
    if (redoStackRef.current.length > 30) {
      redoStackRef.current.shift();
    }
    applyRestoredCampaigns(previous, 'Alteração desfeita (Ctrl+Z)');
  }, [applyRestoredCampaigns, isReadOnly, showUndoToast]);

  const handleRedo = useCallback(() => {
    if (isReadOnly) return;
    if (redoStackRef.current.length === 0) {
      showUndoToast('Nada para refazer');
      return;
    }
    const nextState = redoStackRef.current.pop();
    const currentSnapshot = JSON.parse(JSON.stringify(campaignsRef.current || []));
    undoStackRef.current.push(currentSnapshot);
    if (undoStackRef.current.length > 30) {
      undoStackRef.current.shift();
    }
    applyRestoredCampaigns(nextState, 'Alteração refeita (Ctrl+Shift+Z)');
  }, [applyRestoredCampaigns, isReadOnly, showUndoToast]);

  useEffect(() => {
    if (!currentUser || isReadOnly) return;

    const handleGlobalKeyDown = (e) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;

      const target = e.target;
      const tag = target?.tagName?.toLowerCase();
      const isEditable = tag === 'input' || tag === 'textarea' || target?.isContentEditable;
      if (isEditable) return;

      const key = e.key.toLowerCase();
      if (key === 'z' || e.code === 'KeyZ') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((key === 'y' || e.code === 'KeyY') && !e.shiftKey) {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [currentUser, isReadOnly, handleUndo, handleRedo]);

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
    handleUpdateUniversalFilter(prev => ({
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
    if (isReadOnly) return;
    pushUndoSnapshot();
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
    if (isReadOnly) return;
    pushUndoSnapshot(`camp-${campaignId}`);
    setCampaigns(prev => prev.map(c => {
      if (c.id === campaignId) {
        return { ...c, ...updates };
      }
      return c;
    }));
    dbUpdateCampaign(campaignId, updates).catch(err => console.warn('Sync update campaign error:', err));
  };

  const handleDeleteCampaign = (campaignId) => {
    if (isReadOnly) return;
    pushUndoSnapshot();
    const updated = campaigns.filter(c => c.id !== campaignId);
    setCampaigns(updated);
    if (activeCampaignId === campaignId) {
      setActiveCampaignId(updated[0]?.id || null);
    }
    dbDeleteCampaign(campaignId).catch(err => console.warn('Sync delete campaign error:', err));
  };

  const handleUpdateCampaignLinks = (campaignId, updatedLinks) => {
    if (isReadOnly) return;
    pushUndoSnapshot(`links-${campaignId}`);
    setCampaigns(prev => prev.map(c => {
      if (c.id === campaignId) {
        return { ...c, predefinedLinks: updatedLinks };
      }
      return c;
    }));
    dbSyncCampaignLinks(campaignId, updatedLinks).catch(err => console.warn('Sync links error:', err));
  };

  const handleUpdateCampaignCustomColumns = (newCols) => {
    if (isReadOnly || !activeCampaign) return;
    pushUndoSnapshot(`cols-${activeCampaign.id}`);
    setCampaigns(prev => prev.map(c => {
      if (c.id === activeCampaign.id) {
        return { ...c, customColumns: newCols };
      }
      return c;
    }));
    dbSyncCampaignColumns(activeCampaign.id, newCols).catch(err => console.warn('Sync cols error:', err));
  };

  const handleOpenTagsModal = (camp) => {
    if (isReadOnly) return;
    setTagsModalCampaign(camp || activeCampaign);
    setIsTagsModalOpen(true);
  };

  const handleUpdateCampaignPlaceholders = (campaignId, updatedPlaceholders) => {
    if (isReadOnly) return;
    pushUndoSnapshot(`tags-${campaignId}`);
    setCampaigns(prev => prev.map(c => {
      if (c.id === campaignId) {
        return { ...c, customPlaceholders: updatedPlaceholders };
      }
      return c;
    }));
    dbUpdateCampaignPlaceholders(campaignId, updatedPlaceholders).catch(err => {
      console.warn('Erro ao sincronizar tags da campanha no Supabase:', err);
    });
  };

  const updateDisparoTimerRef = useRef({});

  // Message Actions within active campaign
  const handleUpdateRecord = (messageId, updates) => {
    if (isReadOnly || !activeCampaign) return;
    pushUndoSnapshot(`msg-${messageId}`);

    // Registra timestamp da alteração local para impedir que reloads do realtime desfaçam os checks
    lastLocalUpdateTimestampRef.current[messageId] = Date.now();

    const currentMsg = (activeCampaign.messages || []).find(m => m.id === messageId);

    // Calcula de forma síncrona as atualizações finais para garantir persistência imediata
    const isOnlyCustomFields = Object.keys(updates).every(k => k === 'customFields');
    const shouldResetToDraft = !isOnlyCustomFields && currentMsg?.stage && currentMsg?.stage !== 'Em Rascunho' && !('stage' in updates);
    const finalUpdates = shouldResetToDraft ? { ...updates, stage: 'Em Rascunho' } : updates;
    const finalMessageToSync = currentMsg ? { ...currentMsg, ...finalUpdates } : { id: messageId, ...finalUpdates };

    setCampaigns(prev => prev.map(c => {
      if (c.id === activeCampaign.id) {
        const updatedMessages = (c.messages || []).map(m => {
          if (m.id !== messageId) return m;
          return { ...m, ...finalUpdates };
        });
        return { ...c, messages: updatedMessages };
      }
      return c;
    }));

    // Sincroniza imediatamente com o Supabase com debounce curto
    if (updateDisparoTimerRef.current[messageId]) {
      clearTimeout(updateDisparoTimerRef.current[messageId]);
    }
    updateDisparoTimerRef.current[messageId] = setTimeout(() => {
      dbUpdateDisparo(messageId, finalMessageToSync, activeCampaign.id).catch(err => console.warn('Sync disparo error:', err));
      delete updateDisparoTimerRef.current[messageId];
    }, 150);

    if (selectedRecord && selectedRecord.id === messageId) {
      setSelectedRecord(prev => {
        if (!prev) return null;
        return { ...prev, ...finalUpdates };
      });
    }
  };

  const handleAddNewMessage = (initialOverrides = {}) => {
    if (isReadOnly || !activeCampaign) return;
    pushUndoSnapshot();

    // Pick first predefined link if exists
    const defaultLink = activeCampaign.predefinedLinks?.[0];
    const defaultLinkId = defaultLink?.id || '';

    // Determine default channel based on activeFlowCategory
    let defaultChannel = 'Grupo Normal WhatsApp';
    if (activeFlowCategory === 'email') {
      defaultChannel = 'Email';
    } else if (activeFlowCategory === 'youtube') {
      defaultChannel = 'Comunidade YouTube';
    } else if (activeFlowCategory === 'automacoes') {
      defaultChannel = 'Automações';
    } else if (activeFlowCategory === 'emergenciais') {
      defaultChannel = 'Emergenciais';
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
      variables: initialOverrides.variables || (defaultLink ? { '[LINK]': { mode: 'link', linkId: defaultLinkId, text: defaultLink.url } } : {}),
      copyText: `Fala *{primeiro_nome}*, aqui é da *Brabo Concursos*! 🦅\n\nLiberamos as vagas exclusivas para você.\n\n👇 *Acesse o link oficial abaixo:*\n[LINK]`,
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
    if (isReadOnly || !activeCampaign) return;
    pushUndoSnapshot();

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

  const handleDeleteMultipleRecords = (recordIdsToDelete) => {
    if (isReadOnly) return;
    const ids = Array.isArray(recordIdsToDelete) ? recordIdsToDelete : selectedRecordIds;
    if (!activeCampaign || !ids || ids.length === 0) return;

    const count = ids.length;
    const confirmMsg = count === 1
      ? 'Tem certeza que deseja excluir o disparo selecionado?'
      : `Tem certeza que deseja excluir os ${count} disparos selecionados permanentemente?`;

    if (!window.confirm(confirmMsg)) return;
    pushUndoSnapshot();

    const idsSet = new Set(ids);

    setCampaigns(prev => prev.map(c => {
      if (c.id === activeCampaign.id) {
        return {
          ...c,
          messages: (c.messages || []).filter(m => !idsSet.has(m.id))
        };
      }
      return c;
    }));

    setSelectedRecordIds(prev => prev.filter(id => !idsSet.has(id)));

    if (selectedRecord && idsSet.has(selectedRecord.id)) {
      setIsRecordModalOpen(false);
      setSelectedRecord(null);
    }

    dbBatchDeleteDisparos(ids).catch(err => {
      console.warn('Sync batch delete disparos error:', err);
    });
  };

  const handleBulkUpdateRecords = (recordIds, updates) => {
    if (isReadOnly || !activeCampaign) return;
    const ids = Array.isArray(recordIds) ? recordIds : selectedRecordIds;
    if (!ids || ids.length === 0 || !updates || Object.keys(updates).length === 0) return;
    pushUndoSnapshot();

    const idsSet = new Set(ids);
    const updatedForSync = [];

    setCampaigns(prev => prev.map(c => {
      if (c.id !== activeCampaign.id) return c;
      const updatedMessages = (c.messages || []).map(m => {
        if (!idsSet.has(m.id)) return m;
        lastLocalUpdateTimestampRef.current[m.id] = Date.now();
        const mergedCustom = updates.customFields
          ? { ...(m.customFields || {}), ...updates.customFields }
          : m.customFields;

        const mergedMsg = {
          ...m,
          ...updates,
          ...(mergedCustom !== undefined ? { customFields: mergedCustom } : {})
        };
        updatedForSync.push(mergedMsg);
        return mergedMsg;
      });
      return { ...c, messages: updatedMessages };
    }));

    updatedForSync.forEach(msg => {
      dbUpdateDisparo(msg.id, msg, activeCampaign.id).catch(err => console.warn('Sync bulk update disparo error:', err));
    });
  };

  const handleDuplicateRecord = (record) => {
    if (isReadOnly || !activeCampaign) return;
    pushUndoSnapshot();

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
    if (!record) return;
    const recordId = typeof record === 'string' ? record : record?.id;
    // Sempre busca a versão mais recente do registro na campanha ativa
    const freshRecord = activeCampaign?.messages?.find(m => m.id === recordId) || record;
    setSelectedRecord(freshRecord);
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

  if (!currentUser) {
    return (
      <LoginScreen
        onLogin={(user) => {
          setIsPostLoginLoading(true);
          setCurrentUser(user);
          setTimeout(() => setIsPostLoginLoading(false), 1400);
        }}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    );
  }

  return (
    <div className="app-container">
      {isPostLoginLoading && (
        <div className="post-login-loader" role="status" aria-label="Carregando painel">
          <div className="post-login-orbit-stage">
            <div className="post-login-orbit-ring" />
            <div className="post-login-orbit-plane-arm">
              <svg
                className="post-login-orbit-plane"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M2.5 4.25a.75.75 0 0 1 1.07-.68l17.5 8a.75.75 0 0 1 0 1.36l-17.5 8a.75.75 0 0 1-1.02-.96L5.1 13H12a.75.75 0 0 0 0-1.5H5.1L2.55 4.53a.75.75 0 0 1-.05-.28Z" />
              </svg>
            </div>
            <img
              src="/icon.png?v=2"
              alt="BraboFlow"
              className="post-login-logo-b"
              style={{
                filter: theme === 'light'
                  ? 'brightness(0.15) drop-shadow(0 2px 6px rgba(15, 23, 42, 0.12))'
                  : 'drop-shadow(0 0 12px rgba(247, 186, 18, 0.25))'
              }}
            />
          </div>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.02em' }}>
            Carregando fluxos...
          </span>
        </div>
      )}
      {/* 1. Header estilo Airtable */}
      <Header
        campaigns={campaigns}
        activeCampaign={activeCampaign}
        onSelectCampaign={handleSelectCampaign}
        onOpenCampaignsManager={() => setActiveTable('campanhas')}
        onOpenTagsModal={handleOpenTagsModal}
        tagsCount={activeTagsCount}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onNewMessage={() => handleAddNewMessage()}
        onExportData={handleExportData}
        onImportData={handleImportData}
        onResetData={handleResetData}
        supabaseStatus={supabaseStatus}
        currentUser={currentUser}
        onLogout={handleLogout}
        theme={theme}
        onToggleTheme={toggleTheme}
        readOnly={isReadOnly}
      />

      {/* 2. View Toolbar (Controls for Active Campaign's messages) */}
      {activeTable === 'disparos' && (
        <ViewToolbar
          activeView={activeView}
          setActiveView={setActiveView}
          filterChannel={filterChannel}
          setFilterChannel={setFilterChannel}
          toolbarFilter={toolbarFilter}
          onUpdateToolbarFilter={handleUpdateUniversalFilter}
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
          onOpenTagsModal={handleOpenTagsModal}
          tagsCount={activeTagsCount}
          onOpenEditCampaign={() => setIsEditActiveCampaignModalOpen(true)}
          hiddenColumns={activeHiddenColumns}
          onToggleColumnVisibility={handleToggleColumnVisibility}
          onShowAllColumns={handleShowAllColumns}
          activeCustomFilter={activeCustomFilter}
          activeFlowCategory={activeFlowCategory}
          setActiveFlowCategory={setActiveFlowCategory}
          flowCounts={flowCounts}
          selectedRecordIds={selectedRecordIds}
          onDeleteMultipleRecords={handleDeleteMultipleRecords}
          onOpenBulkEdit={() => setIsBulkEditModalOpen(true)}
          onClearSelection={() => setSelectedRecordIds([])}
          readOnly={isReadOnly}
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
              currentFilter={toolbarFilter}
              onSelectFilter={handleSelectSidebarFilter}
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
                  allRecords={flowMessages}
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
                  onDeleteMultipleRecords={handleDeleteMultipleRecords}
                  onOpenBulkEdit={() => setIsBulkEditModalOpen(true)}
                  onUpdateCustomColumns={handleUpdateCampaignCustomColumns}
                  onUpdateCampaign={handleUpdateCampaign}
                  hiddenColumns={activeHiddenColumns}
                  activeFlowCategory={activeFlowCategory}
                  universalFilter={toolbarFilter}
                  onUpdateUniversalFilter={handleUpdateUniversalFilter}
                  onSortBy={(fieldId, dir) => {
                    setSortBy(fieldId);
                    setSortDirection(dir);
                  }}
                  onGroupBy={(fieldId) => {
                    setGroupBy(prev => prev === fieldId ? 'none' : fieldId);
                  }}
                  onFilterBy={handleFilterByColumn}
                  onToggleColumnVisibility={handleToggleColumnVisibility}
                  readOnly={isReadOnly}
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
            onOpenTagsModal={handleOpenTagsModal}
            readOnly={isReadOnly}
          />
        )}

        {/* Table: Central de Tags da Campanha */}
        {activeTable === 'tags' && activeCampaign && (
          <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <span style={{ fontSize: '0.74rem', color: 'var(--accent-text)', fontWeight: 700, textTransform: 'uppercase' }}>
                  Campanha: {activeCampaign.name}
                </span>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0.2rem 0' }}>
                  Tags [ ] da Campanha
                </h2>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
                  Altere em um só lugar tudo o que estiver entre colchetes como [LINK], [DATA], [CUPOM] em todas as mensagens. As tags permanecem intactas nas mensagens e são substituídas dinamicamente no preview e ao copiar o texto final.
                </p>
              </div>

              {!isReadOnly && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <button
                    className="btn-primary"
                    onClick={() => handleOpenTagsModal(activeCampaign)}
                  >
                    <Sparkles size={14} />
                    <span>⚡ Abrir Central de Tags [ ]</span>
                  </button>
                </div>
              )}
            </div>

            {/* Content for Tags */}
            <div style={{ display: 'grid', gap: '0.85rem' }}>
              {activeTags.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3.5rem 1.5rem', background: 'var(--bg-card)', border: '1px dashed var(--border-color)', borderRadius: '12px', color: 'var(--text-secondary)' }}>
                  <p style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>Nenhuma tag [ ] detectada nas mensagens ainda.</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Escreva termos entre colchetes como [DATA], [LINK] ou [CUPOM] nas copies para gerenciá-los aqui.</p>
                  {!isReadOnly && (
                    <button className="btn-secondary" style={{ marginTop: '0.5rem', color: 'var(--accent-text)', borderColor: 'var(--accent-border)' }} onClick={() => handleOpenTagsModal(activeCampaign)}>
                      + Cadastrar Tag na Central
                    </button>
                  )}
                </div>
              ) : (
                activeTags.map(tag => {
                  const rawKey = tag.rawTag;
                  const cfg = (activeCampaign.customPlaceholders || {})[rawKey] || (activeCampaign.customPlaceholders || {})[tag.key];
                  const hasVal = cfg && (cfg.text && cfg.text.trim());
                  const isPageExpanded = expandedPageTagKey === tag.key;

                  return (
                    <div
                      key={tag.key}
                      style={{
                        background: 'var(--bg-card)',
                        border: `1px solid ${hasVal ? 'rgba(34, 197, 94, 0.35)' : 'var(--border-color)'}`,
                        borderRadius: '10px',
                        padding: '1.15rem 1.35rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.85rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={{
                            background: 'var(--accent-soft)',
                            border: '1px solid var(--accent-border)',
                            color: 'var(--accent-text)',
                            fontWeight: 700,
                            fontSize: '0.9rem',
                            padding: '0.25rem 0.65rem',
                            borderRadius: '6px',
                            fontFamily: 'monospace'
                          }}>
                            {rawKey}
                          </span>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {tag.messages.length} {tag.messages.length === 1 ? 'mensagem usa esta tag' : 'mensagens usam esta tag'} ({tag.count} ocorrências)
                            </span>
                            {hasVal ? (
                              <span style={{ fontSize: '0.74rem', color: 'var(--success-text)', fontWeight: 600 }}>
                                ✅ Valor configurado: "{cfg.text}"
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.74rem', color: 'var(--amber-text)', fontWeight: 600 }}>
                                ⚠️ Falta preencher link ou frase
                              </span>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {tag.messages.length > 0 && (
                            <button
                              className="btn-ghost"
                              onClick={() => setExpandedPageTagKey(isPageExpanded ? null : tag.key)}
                              style={{
                                fontSize: '0.76rem',
                                padding: '0.35rem 0.65rem',
                                color: isPageExpanded ? 'var(--amber-text)' : 'var(--text-secondary)',
                                background: isPageExpanded ? 'var(--accent-soft)' : 'var(--bg-card-hover)',
                                borderRadius: '6px'
                              }}
                            >
                              {isPageExpanded ? 'Ocultar Mensagens' : `Ver Mensagens (${tag.messages.length})`}
                            </button>
                          )}
                          <button
                            className="btn-secondary"
                            onClick={() => handleOpenTagsModal(activeCampaign)}
                            style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem', color: 'var(--amber-text)', borderColor: 'var(--accent-border)' }}
                          >
                            Configurar Tag
                          </button>
                        </div>
                      </div>

                      {/* Expandable Messages in Page View */}
                      {isPageExpanded && tag.messages.length > 0 && (
                        <div style={{
                          background: 'var(--surface-nested)',
                          border: '1px solid var(--accent-border)',
                          borderRadius: '8px',
                          padding: '0.85rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.6rem'
                        }}>
                          <span style={{ fontSize: '0.72rem', color: 'var(--amber-text)', fontWeight: 700, textTransform: 'uppercase' }}>
                            Ocorrências nas Mensagens ({tag.messages.length}):
                          </span>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                            {tag.messages.map(m => {
                              const isMsgExpanded = !!expandedPageMessageIds[m.id];
                              const liveMsg = (activeCampaign?.messages || []).find(msg => msg.id === m.id) || m;
                              const rawMsgText = liveMsg.copyText || liveMsg.copySnippet || '';
                              const resolvedMsgText = resolveCopyVariables(rawMsgText, liveMsg.variables, activeCampaign?.predefinedLinks || [], activeCampaign?.customPlaceholders || {});

                              return (
                                <div
                                  key={m.id}
                                  style={{
                                    background: isMsgExpanded ? 'var(--bg-card)' : 'var(--bg-cell)',
                                    border: isMsgExpanded ? '1px solid var(--accent-border)' : '1px solid var(--border-color)',
                                    borderRadius: '6px',
                                    padding: '0.65rem 0.85rem',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.35rem'
                                  }}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                      <strong 
                                        onClick={() => handleOpenRecord(liveMsg)}
                                        style={{ 
                                          color: 'var(--text-primary)', 
                                          fontSize: '0.82rem', 
                                          cursor: 'pointer', 
                                          textDecoration: 'underline',
                                          textUnderlineOffset: '3px',
                                          transition: 'color 0.15s ease'
                                        }}
                                        title="Clique para abrir e modificar este disparo diretamente"
                                        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-text)'}
                                        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                                      >
                                        {liveMsg.title}
                                      </strong>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                      {!isReadOnly && (
                                        <button
                                          type="button"
                                          className="btn-secondary"
                                          onClick={() => {
                                            if (editingPageMsgId === m.id) {
                                              setEditingPageMsgId(null);
                                            } else {
                                              setEditingPageMsgId(m.id);
                                              setEditingPageMsgTitle(liveMsg.title || '');
                                              setEditingPageMsgDraft(rawMsgText);
                                            }
                                          }}
                                          style={{ 
                                            fontSize: '0.72rem', 
                                            padding: '0.2rem 0.55rem', 
                                            color: editingPageMsgId === m.id ? '#f59e0b' : '#F7BA12', 
                                            borderColor: editingPageMsgId === m.id ? 'rgba(245, 158, 11, 0.45)' : 'rgba(247, 186, 18, 0.4)', 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            gap: '0.3rem',
                                            background: editingPageMsgId === m.id ? 'rgba(245, 158, 11, 0.12)' : 'rgba(247, 186, 18, 0.1)',
                                            borderRadius: '4px'
                                          }}
                                          title="Editar este disparo diretamente no quadradinho"
                                        >
                                          <Edit3 size={12} />
                                          <span>{editingPageMsgId === m.id ? 'Fechar' : 'Editar'}</span>
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        className="btn-secondary"
                                        onClick={() => handleOpenRecord(liveMsg)}
                                        style={{ 
                                          fontSize: '0.72rem', 
                                          padding: '0.2rem 0.55rem', 
                                          color: '#94a3b8', 
                                          borderColor: 'rgba(148, 163, 184, 0.3)', 
                                          display: 'flex', 
                                          alignItems: 'center', 
                                          gap: '0.3rem',
                                          background: 'rgba(255, 255, 255, 0.04)'
                                        }}
                                        title="Abrir detalhes completos deste disparo"
                                      >
                                        <ExternalLink size={12} />
                                        <span>Abrir Disparo</span>
                                      </button>
                                      <button
                                        type="button"
                                        className="btn-ghost"
                                        onClick={() => {
                                          navigator.clipboard.writeText(resolvedMsgText);
                                          setCopiedPageMsgId(m.id);
                                          setTimeout(() => setCopiedPageMsgId(null), 2000);
                                        }}
                                        style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', color: '#22c55e', display: 'flex', alignItems: 'center', gap: '0.3rem', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '4px' }}
                                        title="Copiar texto final com tags resolvidas"
                                      >
                                        {copiedPageMsgId === m.id ? <Check size={12} /> : <Copy size={12} />}
                                        {copiedPageMsgId === m.id ? 'Copiado!' : 'Copiar Texto Final'}
                                      </button>
                                      <button
                                        type="button"
                                        className="btn-ghost"
                                        onClick={() => setExpandedPageMessageIds(p => ({ ...p, [m.id]: !p[m.id] }))}
                                        style={{ fontSize: '0.72rem', padding: '0.15rem 0.45rem', color: '#fbbf24' }}
                                      >
                                        {isMsgExpanded ? 'Recolher' : 'Expandir Mensagem'}
                                      </button>
                                    </div>
                                  </div>

                                  {editingPageMsgId === m.id ? (
                                    <div style={{
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '0.65rem',
                                      marginTop: '0.35rem',
                                      background: 'rgba(15, 23, 42, 0.95)',
                                      border: '1px solid rgba(247, 186, 18, 0.4)',
                                      borderRadius: '6px',
                                      padding: '0.85rem'
                                    }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                                        <span style={{ fontSize: '0.74rem', color: '#F7BA12', fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                          <Edit3 size={12} /> Editar Mensagem no Card
                                        </span>
                                        <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                                          Preserve a tag <strong style={{ color: '#fbbf24' }}>{tag.rawTag}</strong> no texto para manter a substituição dinâmica
                                        </span>
                                      </div>

                                      <div>
                                        <label style={{ display: 'block', fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.2rem' }}>
                                          Título do Disparo:
                                        </label>
                                        <input
                                          type="text"
                                          value={editingPageMsgTitle}
                                          onChange={(e) => setEditingPageMsgTitle(e.target.value)}
                                          style={{
                                            width: '100%',
                                            background: '#0b1120',
                                            color: '#f8fafc',
                                            border: '1px solid rgba(56, 189, 248, 0.3)',
                                            borderRadius: '5px',
                                            padding: '0.4rem 0.65rem',
                                            fontSize: '0.8rem',
                                            outline: 'none',
                                            boxSizing: 'border-box'
                                          }}
                                          placeholder="Título do disparo..."
                                        />
                                      </div>

                                      <div>
                                        <label style={{ display: 'block', fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.2rem' }}>
                                          Texto da Mensagem:
                                        </label>
                                        <textarea
                                          value={editingPageMsgDraft}
                                          onChange={(e) => setEditingPageMsgDraft(e.target.value)}
                                          rows={6}
                                          style={{
                                            width: '100%',
                                            background: '#0b1120',
                                            color: '#f8fafc',
                                            border: '1px solid rgba(56, 189, 248, 0.3)',
                                            borderRadius: '5px',
                                            padding: '0.6rem 0.65rem',
                                            fontSize: '0.82rem',
                                            lineHeight: '1.5',
                                            resize: 'vertical',
                                            fontFamily: 'inherit',
                                            outline: 'none',
                                            boxSizing: 'border-box'
                                          }}
                                          placeholder="Escreva a mensagem aqui..."
                                        />
                                      </div>

                                      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                                        <button
                                          type="button"
                                          className="btn-ghost"
                                          onClick={() => setEditingPageMsgId(null)}
                                          style={{ fontSize: '0.74rem', padding: '0.25rem 0.6rem', color: '#94a3b8' }}
                                        >
                                          <X size={12} style={{ marginRight: '0.25rem' }} /> Cancelar
                                        </button>
                                        <button
                                          type="button"
                                          className="btn-primary"
                                          onClick={() => {
                                            handleUpdateRecord(m.id, {
                                              title: editingPageMsgTitle.trim() || liveMsg.title,
                                              copyText: editingPageMsgDraft
                                            });
                                            setEditingPageMsgId(null);
                                          }}
                                          style={{
                                            fontSize: '0.74rem',
                                            padding: '0.28rem 0.75rem',
                                            background: 'linear-gradient(135deg, #F7BA12 0%, #e5ab0d 100%)',
                                            color: '#0c0d12',
                                            fontWeight: 700,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.35rem'
                                          }}
                                        >
                                          <Check size={12} /> Salvar Alterações
                                        </button>
                                      </div>
                                    </div>
                                  ) : !isMsgExpanded ? (
                                    <p 
                                      onClick={() => setExpandedPageMessageIds(p => ({ ...p, [m.id]: true }))}
                                      style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.76rem', cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                      title="Clique para expandir o texto e visualizar na íntegra"
                                    >
                                      {rawMsgText}
                                    </p>
                                  ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                      <div>
                                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Texto com Tag:</span>
                                        <div style={{
                                          background: 'var(--bg-cell)',
                                          border: '1px solid var(--accent-border)',
                                          borderRadius: '6px',
                                          padding: '0.75rem',
                                          color: 'var(--text-primary)',
                                          fontSize: '0.8rem',
                                          lineHeight: '1.5',
                                          whiteSpace: 'pre-wrap',
                                          fontFamily: 'inherit'
                                        }}>
                                          {rawMsgText}
                                        </div>
                                      </div>
                                      <div>
                                        <span style={{ fontSize: '0.68rem', color: '#16a34a', textTransform: 'uppercase', fontWeight: 600 }}>Preview Resolvido (Ao Copiar):</span>
                                        <div style={{
                                          background: 'rgba(34, 197, 94, 0.08)',
                                          border: '1px solid rgba(34, 197, 94, 0.35)',
                                          borderRadius: '6px',
                                          padding: '0.75rem',
                                          color: 'var(--text-primary)',
                                          fontSize: '0.8rem',
                                          lineHeight: '1.5',
                                          whiteSpace: 'pre-wrap',
                                          fontFamily: 'inherit'
                                        }}>
                                          {resolvedMsgText}
                                        </div>
                                      </div>
                                      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.5rem', marginTop: '0.3rem' }}>
                                        {!isReadOnly && (
                                          <button
                                            type="button"
                                            className="btn-secondary"
                                            onClick={() => {
                                              setEditingPageMsgId(m.id);
                                              setEditingPageMsgTitle(liveMsg.title || '');
                                              setEditingPageMsgDraft(rawMsgText);
                                            }}
                                            style={{
                                              fontSize: '0.75rem',
                                              padding: '0.35rem 0.75rem',
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: '0.35rem',
                                              color: '#F7BA12',
                                              borderColor: 'rgba(247, 186, 18, 0.4)',
                                              background: 'rgba(247, 186, 18, 0.1)'
                                            }}
                                            title="Editar o texto deste disparo diretamente no quadradinho"
                                          >
                                            <Edit3 size={13} />
                                            <span>Editar neste Card</span>
                                          </button>
                                        )}
                                        <button
                                          type="button"
                                          className="btn-primary"
                                          onClick={() => handleOpenRecord(liveMsg)}
                                          style={{
                                            fontSize: '0.75rem',
                                            padding: '0.35rem 0.75rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.35rem',
                                            background: 'linear-gradient(135deg, #F7BA12 0%, #e5ab0d 100%)',
                                            color: '#0c0d12',
                                            fontWeight: 700
                                          }}
                                          title="Abrir detalhes deste disparo em tela inteira"
                                        >
                                          <ExternalLink size={13} />
                                          <span>Abrir Modal Completo</span>
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
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
        recordsList={currentTableOrderedRecords}
        onNavigateRecord={(targetRecord) => {
          handleOpenRecord(targetRecord);
        }}
        isOpen={isRecordModalOpen}
        onClose={() => {
          setIsRecordModalOpen(false);
          setSelectedRecord(null);
        }}
        onUpdateRecord={handleUpdateRecord}
        onDeleteRecord={handleDeleteRecord}
        onDuplicateRecord={handleDuplicateRecord}
        onOpenTagsModal={handleOpenTagsModal}
        onUpdateCampaignPlaceholders={handleUpdateCampaignPlaceholders}
        activeFlowCategory={activeFlowCategory}
        hiddenColumns={activeHiddenColumns}
        onToggleColumnVisibility={handleToggleColumnVisibility}
        readOnly={isReadOnly}
      />

      {/* 6. Campaign Tags Modal */}
      <CampaignTagsModal
        isOpen={isTagsModalOpen}
        onClose={() => {
          setIsTagsModalOpen(false);
          setTagsModalCampaign(null);
        }}
        campaign={tagsModalCampaign || activeCampaign}
        onUpdateCampaignPlaceholders={handleUpdateCampaignPlaceholders}
        onUpdateRecord={handleUpdateRecord}
        onOpenRecord={(rec) => {
          setIsTagsModalOpen(false);
          setTagsModalCampaign(null);
          handleOpenRecord(rec);
        }}
      />

      {/* 9. Active Campaign Edit Modal */}
      {activeCampaign && (
        <EditCampaignModal
          isOpen={isEditActiveCampaignModalOpen}
          onClose={() => setIsEditActiveCampaignModalOpen(false)}
          campaign={activeCampaign}
          onUpdateCampaign={handleUpdateCampaign}
        />
      )}

      {/* 10. Bulk Edit Modal for Selected Disparos */}
      {!isReadOnly && (
        <BulkEditModal
          isOpen={isBulkEditModalOpen}
          onClose={() => setIsBulkEditModalOpen(false)}
          selectedCount={selectedRecordIds.length}
          campaign={activeCampaign}
          onApplyBulkEdit={(updates) => handleBulkUpdateRecords(selectedRecordIds, updates)}
        />
      )}

      {/* Undo / Redo Feedback Toast */}
      {undoToast && (
        <div
          role="status"
          style={{
            position: 'fixed',
            bottom: '1.25rem',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9998,
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            border: '1px solid var(--accent-border)',
            boxShadow: 'var(--shadow-lg)',
            borderRadius: '10px',
            padding: '0.5rem 1rem',
            fontSize: '0.8rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            pointerEvents: 'none'
          }}
        >
          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--accent-primary)' }} />
          <span>{undoToast}</span>
        </div>
      )}
    </div>
  );
}
