import { supabase } from './supabase';
import { initialCampaigns } from '../data/initialData';

// Map DB snake_case record to Frontend CamelCase
export function formatCampaignFromDb(c, links = [], columns = [], messages = []) {
  return {
    id: c.id,
    name: c.name,
    tagline: c.tagline || '',
    status: c.status || 'Ativa',
    badgeColor: c.badge_color || '#38bdf8',
    startDate: c.start_date || '',
    endDate: c.end_date || '',
    predefinedLinks: links.map(l => ({
      id: l.id,
      label: l.label,
      url: l.url
    })),
    customColumns: columns.map(col => ({
      id: col.id,
      name: col.name,
      type: col.type,
      options: col.options || []
    })),
    messages: messages.map(m => formatDisparoFromDb(m))
  };
}

export function formatDisparoFromDb(m) {
  return {
    id: m.id,
    campaignId: m.campaign_id,
    title: m.title || '',
    stage: m.stage || 'Em Rascunho',
    channel: m.channel || 'Grupo Normal WhatsApp',
    scheduledDate: m.scheduled_date || '',
    scheduledTime: m.scheduled_time || '',
    selectedLinkId: m.selected_link_id || null,
    variables: m.variables || {},
    copyText: m.copy_text || '',
    notes: m.notes || '',
    customFields: m.custom_fields || {},
    attachment: m.attachment || null,
    position: m.position || 0
  };
}

function safeDate(val) {
  if (!val || typeof val !== 'string') return null;
  const trimmed = val.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  return null;
}

export function formatDisparoToDb(m, campaignId) {
  return {
    id: m.id,
    campaign_id: campaignId || m.campaignId,
    title: m.title || '',
    stage: m.stage || 'Em Rascunho',
    channel: m.channel || 'Grupo Normal WhatsApp',
    scheduled_date: safeDate(m.scheduledDate),
    scheduled_time: m.scheduledTime || null,
    selected_link_id: m.selectedLinkId || null,
    variables: m.variables || {},
    copy_text: m.copyText || '',
    notes: m.notes || '',
    custom_fields: m.customFields || {},
    attachment: m.attachment || null,
    position: m.position || 0,
    updated_at: new Date().toISOString()
  };
}

// ----------------------------------------------------
// 1. CARREGAR DADOS COMPLETOS DO BANCO
// ----------------------------------------------------
export async function fetchAllCampaignsFromDb() {
  try {
    const { data: camps, error: campErr } = await supabase
      .from('bflow_campaigns')
      .select('*')
      .order('created_at', { ascending: false });

    if (campErr) throw campErr;

    if (!camps || camps.length === 0) {
      return [];
    }

    const { data: links, error: linkErr } = await supabase
      .from('bflow_campaign_links')
      .select('*');
    if (linkErr) console.warn('Erro ao buscar links:', linkErr);

    const { data: cols, error: colErr } = await supabase
      .from('bflow_custom_columns')
      .select('*');
    if (colErr) console.warn('Erro ao buscar colunas:', colErr);

    const { data: disparos, error: dispErr } = await supabase
      .from('bflow_disparos')
      .select('*')
      .order('position', { ascending: true })
      .order('scheduled_date', { ascending: true });
    if (dispErr) console.warn('Erro ao buscar disparos:', dispErr);

    const safeLinks = links || [];
    const safeCols = cols || [];
    const safeDisparos = disparos || [];

    return camps.map(c => {
      const campLinks = safeLinks.filter(l => l.campaign_id === c.id);
      const campCols = safeCols.filter(col => col.campaign_id === c.id);
      const campDisparos = safeDisparos.filter(d => d.campaign_id === c.id);
      return formatCampaignFromDb(c, campLinks, campCols, campDisparos);
    });
  } catch (error) {
    console.error('Erro no fetchAllCampaignsFromDb:', error);
    throw error;
  }
}

// ----------------------------------------------------
// 2. UTILITÁRIOS DE LIMPEZA E IMPORTAÇÃO
// ----------------------------------------------------
export async function dbClearAllData() {
  try {
    await supabase.from('bflow_disparos').delete().neq('id', '___');
    await supabase.from('bflow_campaign_links').delete().neq('id', '___');
    await supabase.from('bflow_custom_columns').delete().neq('id', '___');
    await supabase.from('bflow_campaigns').delete().neq('id', '___');
    return true;
  } catch (err) {
    console.error('Erro ao limpar dados do Supabase:', err);
    throw err;
  }
}

// ----------------------------------------------------
// 3. OPERAÇÕES DE CAMPANHA (CRUD)
// ----------------------------------------------------
export async function dbCreateCampaign(campaign) {
  const { error: campErr } = await supabase.from('bflow_campaigns').insert({
    id: campaign.id,
    name: campaign.name,
    tagline: campaign.tagline || '',
    status: campaign.status || 'Ativa',
    badge_color: campaign.badgeColor || '#38bdf8',
    start_date: safeDate(campaign.startDate),
    end_date: safeDate(campaign.endDate)
  });
  if (campErr) {
    console.error('Erro ao salvar bflow_campaigns:', campErr);
    throw campErr;
  }

  if (campaign.predefinedLinks?.length) {
    const links = campaign.predefinedLinks.map(l => ({
      id: l.id,
      campaign_id: campaign.id,
      label: l.label,
      url: l.url
    }));
    const { error: linkErr } = await supabase.from('bflow_campaign_links').insert(links);
    if (linkErr) {
      console.error('Erro ao salvar bflow_campaign_links:', linkErr);
      throw linkErr;
    }
  }

  if (campaign.customColumns?.length) {
    const cols = campaign.customColumns.map(c => ({
      id: c.id,
      campaign_id: campaign.id,
      name: c.name,
      type: c.type || 'text',
      options: c.options || []
    }));
    const { error: colErr } = await supabase.from('bflow_custom_columns').insert(cols);
    if (colErr) {
      console.error('Erro ao salvar bflow_custom_columns:', colErr);
      throw colErr;
    }
  }

  if (campaign.messages?.length) {
    const msgs = campaign.messages.map((m, idx) => ({
      ...formatDisparoToDb(m, campaign.id),
      position: idx
    }));

    // Inserir em lotes de 50 registros para evitar limite de payload
    for (let i = 0; i < msgs.length; i += 50) {
      const chunk = msgs.slice(i, i + 50);
      const { error: dispErr } = await supabase.from('bflow_disparos').insert(chunk);
      if (dispErr) {
        console.error(`Erro ao salvar lote de disparos (${i}-${i + chunk.length}):`, dispErr);
        throw dispErr;
      }
    }
  }
}

export async function dbUpdateCampaign(campaignId, updates) {
  const dbUpdates = {};
  if ('name' in updates) dbUpdates.name = updates.name;
  if ('tagline' in updates) dbUpdates.tagline = updates.tagline;
  if ('status' in updates) dbUpdates.status = updates.status;
  if ('badgeColor' in updates) dbUpdates.badge_color = updates.badgeColor;
  if ('startDate' in updates) dbUpdates.start_date = safeDate(updates.startDate);
  if ('endDate' in updates) dbUpdates.end_date = safeDate(updates.endDate);
  dbUpdates.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from('bflow_campaigns')
    .update(dbUpdates)
    .eq('id', campaignId);
  if (error) {
    console.error('Erro ao atualizar bflow_campaigns:', error);
    throw error;
  }
}

export async function dbDeleteCampaign(campaignId) {
  const { error } = await supabase
    .from('bflow_campaigns')
    .delete()
    .eq('id', campaignId);
  if (error) throw error;
}

// ----------------------------------------------------
// 4. OPERAÇÕES DE LINKS & COLUNAS
// ----------------------------------------------------
export async function dbSyncCampaignLinks(campaignId, links) {
  // Limpar links anteriores da campanha e re-inserir
  await supabase.from('bflow_campaign_links').delete().eq('campaign_id', campaignId);
  if (links && links.length > 0) {
    const toInsert = links.map(l => ({
      id: l.id,
      campaign_id: campaignId,
      label: l.label,
      url: l.url
    }));
    const { error } = await supabase.from('bflow_campaign_links').insert(toInsert);
    if (error) throw error;
  }
}

export async function dbSyncCampaignColumns(campaignId, columns) {
  await supabase.from('bflow_custom_columns').delete().eq('campaign_id', campaignId);
  if (columns && columns.length > 0) {
    const toInsert = columns.map(c => ({
      id: c.id,
      campaign_id: campaignId,
      name: c.name,
      type: c.type,
      options: c.options || []
    }));
    const { error } = await supabase.from('bflow_custom_columns').insert(toInsert);
    if (error) throw error;
  }
}

// ----------------------------------------------------
// 5. OPERAÇÕES DE DISPAROS / MENSAGENS (CRUD)
// ----------------------------------------------------
export async function dbCreateDisparo(campaignId, disparo) {
  const dbData = formatDisparoToDb(disparo, campaignId);
  const { error } = await supabase.from('bflow_disparos').insert(dbData);
  if (error) throw error;
}

export async function dbUpdateDisparo(disparoId, updates, campaignId) {
  const dbUpdates = {};
  if ('title' in updates) dbUpdates.title = updates.title;
  if ('stage' in updates) dbUpdates.stage = updates.stage;
  if ('channel' in updates) dbUpdates.channel = updates.channel;
  if ('scheduledDate' in updates) dbUpdates.scheduled_date = updates.scheduledDate || null;
  if ('scheduledTime' in updates) dbUpdates.scheduled_time = updates.scheduledTime || null;
  if ('selectedLinkId' in updates) dbUpdates.selected_link_id = updates.selectedLinkId;
  if ('variables' in updates) dbUpdates.variables = updates.variables;
  if ('copyText' in updates) dbUpdates.copy_text = updates.copyText;
  if ('notes' in updates) dbUpdates.notes = updates.notes;
  if ('customFields' in updates) dbUpdates.custom_fields = updates.customFields;
  if ('attachment' in updates) dbUpdates.attachment = updates.attachment;
  if ('position' in updates) dbUpdates.position = updates.position;
  dbUpdates.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from('bflow_disparos')
    .update(dbUpdates)
    .eq('id', disparoId);
  if (error) throw error;
}

export async function dbDeleteDisparo(disparoId) {
  const { error } = await supabase
    .from('bflow_disparos')
    .delete()
    .eq('id', disparoId);
  if (error) throw error;
}

export async function dbBatchUpdateDisparos(disparos, campaignId) {
  const upsertData = disparos.map((m, idx) => ({
    ...formatDisparoToDb(m, campaignId),
    position: idx
  }));

  const { error } = await supabase
    .from('bflow_disparos')
    .upsert(upsertData, { onConflict: 'id' });
  if (error) throw error;
}

// ----------------------------------------------------
// 6. UPLOAD DE ANEXOS PARA O SUPABASE STORAGE (bflow-attachments)
// ----------------------------------------------------
export async function uploadAttachmentToSupabase(file, messageId) {
  try {
    const bucket = 'bflow-attachments';
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${messageId || 'temp'}/${Date.now()}_${cleanFileName}`;

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) {
      console.warn('Erro ao enviar anexo para o Supabase Storage:', error.message);
      return null;
    }

    const { data: publicData } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return {
      storagePath: path,
      publicUrl: publicData?.publicUrl || '',
      name: file.name,
      type: file.type,
      size: file.size
    };
  } catch (err) {
    console.error('Erro no uploadAttachmentToSupabase:', err);
    return null;
  }
}

// ----------------------------------------------------
// 7. FILTROS SALVOS (bflow_custom_filters)
// ----------------------------------------------------
export async function fetchCustomFiltersFromDb() {
  try {
    const { data, error } = await supabase
      .from('bflow_custom_filters')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;
    if (!data || data.length === 0) return null;

    return data.map(f => ({
      id: f.id,
      name: f.name,
      conjunction: f.conjunction || 'AND',
      rules: f.rules || [],
      hiddenColumns: f.hidden_columns || [],
      isDefault: f.is_default || false
    }));
  } catch (err) {
    console.warn('Erro ao buscar filtros customizados do DB:', err);
    return null;
  }
}

export async function dbSaveCustomFilter(filter) {
  const { error } = await supabase
    .from('bflow_custom_filters')
    .upsert({
      id: filter.id,
      name: filter.name,
      conjunction: filter.conjunction || 'AND',
      rules: filter.rules || [],
      hidden_columns: filter.hiddenColumns || [],
      is_default: filter.isDefault || false
    }, { onConflict: 'id' });
  if (error) throw error;
}

export async function dbDeleteCustomFilter(filterId) {
  const { error } = await supabase
    .from('bflow_custom_filters')
    .delete()
    .eq('id', filterId);
  if (error) throw error;
}
