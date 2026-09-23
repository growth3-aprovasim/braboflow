import { BRABO_CHANNELS, DISPARO_STAGES } from '../data/initialData';
import { supabase } from './supabase';

/**
 * Robust CSV parser handling RFC 4180:
 * - Multiline strings with quotes
 * - Commas / Semicolons inside quotes
 * - Escaped quotes ("")
 * - Auto delimiter detection (, or ;)
 */
export function parseCsvText(text) {
  if (!text) return { headers: [], rows: [] };

  // Remove BOM if present
  let cleanText = text.replace(/^\uFEFF/, '').trim();

  // Detect delimiter (check first line)
  const firstLine = cleanText.split(/\r?\n/)[0] || '';
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semiCount = (firstLine.match(/;/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;

  let delimiter = ',';
  if (semiCount > commaCount && semiCount > tabCount) delimiter = ';';
  else if (tabCount > commaCount && tabCount > semiCount) delimiter = '\t';

  const rows = [];
  let currentRow = [];
  let currentField = '';
  let insideQuotes = false;
  let i = 0;

  while (i < cleanText.length) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        i += 2;
        continue;
      } else {
        insideQuotes = !insideQuotes;
        i++;
        continue;
      }
    }

    if (!insideQuotes && char === delimiter) {
      currentRow.push(currentField.trim());
      currentField = '';
      i++;
      continue;
    }

    if (!insideQuotes && (char === '\r' || char === '\n')) {
      currentRow.push(currentField.trim());
      currentField = '';

      if (currentRow.some(field => field.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];

      if (char === '\r' && nextChar === '\n') i += 2;
      else i++;
      continue;
    }

    currentField += char;
    i++;
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some(field => field.length > 0)) {
      rows.push(currentRow);
    }
  }

  if (rows.length === 0) return { headers: [], rows: [] };

  const headers = rows[0].map(h => h.trim());
  const dataRows = rows.slice(1);

  return { headers, rows: dataRows, delimiter };
}

/**
 * Normalizes Date strings into YYYY-MM-DD
 */
export function normalizeDate(str) {
  if (!str) return '';
  const s = String(str).trim();

  // ISO: 2026-09-18 or 2026-09-18T10:00:00
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    return s.substring(0, 10);
  }

  // Brazilian: 18/09/2026 or 18-09-2026
  const brMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (brMatch) {
    const day = brMatch[1].padStart(2, '0');
    const month = brMatch[2].padStart(2, '0');
    const year = brMatch[3];
    return `${year}-${month}-${day}`;
  }

  // American: 09/18/2026
  const usMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (usMatch) {
    const p1 = parseInt(usMatch[1], 10);
    const p2 = parseInt(usMatch[2], 10);
    const yr = usMatch[3].length === 2 ? `20${usMatch[3]}` : usMatch[3];
    if (p1 > 12) {
      return `${yr}-${String(p2).padStart(2, '0')}-${String(p1).padStart(2, '0')}`;
    }
    return `${yr}-${String(p1).padStart(2, '0')}-${String(p2).padStart(2, '0')}`;
  }

  return '';
}

/**
 * Normalizes Time strings into HH:mm
 */
export function normalizeTime(str) {
  if (!str) return '10:00';
  const s = String(str).trim().toLowerCase();

  const match = s.match(/(\d{1,2})[:hH](\d{2})/);
  if (match) {
    const hours = match[1].padStart(2, '0');
    const mins = match[2];
    return `${hours}:${mins}`;
  }

  const singleHour = s.match(/^(\d{1,2})h?$/);
  if (singleHour) {
    return `${singleHour[1].padStart(2, '0')}:00`;
  }

  return '10:00';
}

/**
 * Maps stage string from Airtable to standard BraboFlow stage
 */
export function normalizeStage(str) {
  if (!str) return 'Em Rascunho';
  const s = String(str).trim().toLowerCase();

  if (s.includes('rascunho') || s.includes('draft')) return 'Em Rascunho';
  if (s.includes('program') || s.includes('agend') || s.includes('schedul') || s.includes('analise') || s.includes('aprov')) return 'Programada';
  if (s.includes('dispar') || s.includes('enviad') || s.includes('sent') || s.includes('conclu') || s.includes('done')) return 'Disparada';
  if (s.includes('cancel')) return 'Cancelada';

  return 'Em Rascunho';
}

/**
 * Maps channel string from Airtable to standard BraboFlow channel
 */
export function normalizeChannel(str) {
  if (!str) return 'Grupo Normal WhatsApp';
  const s = String(str).trim().toLowerCase();

  if (s.includes('email') || s.includes('e-mail')) return 'Email';
  if (s.includes('youtube') || s.includes('yt') || s.includes('comunidade')) return 'Comunidade YouTube';
  if (s.includes('vip antigo')) return 'Grupo VIP Antigo WhatsApp';
  if (s.includes('normal antigo')) return 'Grupo Normal Antigo WhatsApp';
  if (s.includes('vip')) return 'Grupo VIP WhatsApp';
  if (s.includes('fechada') || s.includes('template') || s.includes('hsm')) return 'Individual Janela Fechada WhatsApp';
  if (s.includes('aberta') || s.includes('24h') || s.includes('individual')) return 'Individual WhatsApp Janela Aberta';
  if (s.includes('grupo') || s.includes('whatsapp') || s.includes('whats') || s.includes('zap')) return 'Grupo Normal WhatsApp';

  return 'Grupo Normal WhatsApp';
}

/**
 * Parses Airtable's attachment field export:
 * Examples:
 * - "https://v5.airtableusercontent.com/v3/u/12/34/image.png (image.png)"
 * - "https://dl.airtable.com/.attachments/.../foto.jpg"
 * - "https://.../img1.png (img1.png), https://.../img2.jpg (img2.jpg)"
 */
export function parseAirtableAttachment(rawVal) {
  if (!rawVal || typeof rawVal !== 'string') return null;
  const s = rawVal.trim();
  if (!s) return null;

  // Regex to extract URL and optional filename in parentheses
  const regex = /(https?:\/\/[^\s\(\),]+)(?:\s*\(([^\)]+)\))?/i;
  const match = s.match(regex);

  if (match) {
    const url = match[1];
    let name = match[2] || '';
    if (!name) {
      try {
        const urlObj = new URL(url);
        name = decodeURIComponent(urlObj.pathname.split('/').pop() || 'anexo');
      } catch {
        name = 'anexo';
      }
    }

    let type = 'document';
    const ext = name.split('.').pop()?.toLowerCase() || '';
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'heic', 'bmp'].includes(ext) || url.includes('/images/') || url.includes('image')) {
      type = 'image';
    } else if (['mp4', 'mov', 'webm', 'avi', 'mkv', 'm4v'].includes(ext) || url.includes('video')) {
      type = 'video';
    } else if (['mp3', 'wav', 'ogg', 'm4a', 'aac', 'opus', 'wma'].includes(ext) || url.includes('audio')) {
      type = 'audio';
    } else if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt'].includes(ext)) {
      type = 'document';
    }

    return {
      id: `att-csv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name,
      type,
      size: 'Anexo Airtable',
      position: 'before',
      fileUrl: url,
      publicUrl: url,
      previewUrl: url,
      thumbnailUrl: type === 'image' ? url : null
    };
  }

  return null;
}

/**
 * Analyzes Airtable CSV Headers and matches standard fields vs custom columns
 */
export function analyzeCsvHeaders(headers) {
  const columnMap = {
    title: null,
    stage: null,
    channel: null,
    scheduledDate: null,
    scheduledTime: null,
    copyText: null,
    notes: null,
    link: null,
    attachment: null,
    custom: [] // [{ originalHeader, sanitizedId, name, type, index }]
  };

  const usedHeaderIndices = new Set();
  const normalizeHeader = (h) => h.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  // First pass: Match primary standard fields
  headers.forEach((h, index) => {
    const clean = normalizeHeader(h);

    if (!columnMap.title && (clean === 'titulo' || clean === 'title' || clean === 'nome' || clean === 'name' || clean === 'disparo' || clean === 'mensagem' || clean === 'assunto' || clean === 'headline')) {
      columnMap.title = { index, header: h };
      usedHeaderIndices.add(index);
    } else if (!columnMap.copyText && (clean.includes('copy') || clean.includes('texto') || clean === 'corpo' || clean === 'body' || clean === 'content' || clean.includes('legenda') || clean.includes('mensagem'))) {
      columnMap.copyText = { index, header: h };
      usedHeaderIndices.add(index);
    } else if (!columnMap.channel && (clean === 'canal' || clean === 'channel' || clean === 'plataforma' || clean === 'meio' || clean === 'rede' || clean === 'tipo de envio' || clean === 'tipo')) {
      columnMap.channel = { index, header: h };
      usedHeaderIndices.add(index);
    } else if (!columnMap.stage && (clean === 'Status' || clean === 'status' || clean === 'stage' || clean === 'fase' || clean === 'situacao' || clean === 'estado')) {
      columnMap.stage = { index, header: h };
      usedHeaderIndices.add(index);
    } else if (!columnMap.scheduledDate && (clean.includes('data') || clean.includes('date') || clean === 'dia' || clean === 'quando')) {
      columnMap.scheduledDate = { index, header: h };
      usedHeaderIndices.add(index);
    } else if (!columnMap.scheduledTime && (clean.includes('hora') || clean.includes('time') || clean === 'horario')) {
      columnMap.scheduledTime = { index, header: h };
      usedHeaderIndices.add(index);
    } else if (!columnMap.notes && (clean.includes('nota') || clean.includes('note') || clean.includes('observ') || clean.includes('coment') || clean.includes('instru') || clean.includes('anotacao'))) {
      columnMap.notes = { index, header: h };
      usedHeaderIndices.add(index);
    } else if (!columnMap.link && (clean === 'link' || clean === 'links' || clean === 'url' || clean.includes('link de destino') || clean.includes('link oficial') || clean.includes('checkout') || clean.includes('destino'))) {
      columnMap.link = { index, header: h };
      usedHeaderIndices.add(index);
    } else if (!columnMap.attachment && (clean.includes('anexo') || clean.includes('attachment') || clean.includes('criativo') || clean.includes('creative') || clean.includes('imagem') || clean.includes('foto') || clean.includes('midia') || clean.includes('video') || clean.includes('banner') || clean === 'file' || clean === 'files')) {
      columnMap.attachment = { index, header: h };
      usedHeaderIndices.add(index);
    }
  });

  // Fallback: If title was not found, pick first unused column
  if (!columnMap.title) {
    const firstUnused = headers.findIndex((_, idx) => !usedHeaderIndices.has(idx));
    if (firstUnused !== -1) {
      columnMap.title = { index: firstUnused, header: headers[firstUnused] };
      usedHeaderIndices.add(firstUnused);
    }
  }

  // Second pass: Any other column in the CSV is converted to Custom Column
  headers.forEach((h, index) => {
    if (!usedHeaderIndices.has(index)) {
      const sanitizedId = 'col_' + h.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 25) + '_' + index;
      columnMap.custom.push({
        index,
        originalHeader: h,
        sanitizedId,
        name: h,
        type: 'text'
      });
    }
  });

  return columnMap;
}

/**
 * Builds the dynamic column order matching the exact visual sequence of the imported CSV
 */
export function buildColumnOrderFromCsv(headers, columnMap, customColIdByIndex = null) {
  const order = [];

  headers.forEach((h, idx) => {
    if (columnMap.title?.index === idx) order.push('title');
    else if (columnMap.stage?.index === idx) order.push('stage');
    else if (columnMap.channel?.index === idx) order.push('channel');
    else if (columnMap.scheduledDate?.index === idx) order.push('date');
    else if (columnMap.scheduledTime?.index === idx) order.push('time');
    else if (columnMap.attachment?.index === idx) order.push('creative');
    else if (columnMap.copyText?.index === idx) order.push('copy');
    else if (columnMap.notes?.index === idx) order.push('notes');
    else {
      const custom = columnMap.custom.find(c => c.index === idx);
      if (custom) {
        const colId = customColIdByIndex?.get(idx) || custom.sanitizedId;
        order.push(colId);
      }
    }
  });

  // Ensure mandatory core columns exist if not present in CSV
  ['title', 'stage', 'channel', 'date', 'time', 'creative', 'copy', 'notes'].forEach(col => {
    if (!order.includes(col)) order.push(col);
  });

  return order;
}

/**
 * Converts parsed CSV rows into a full BraboFlow Campaign with 100% columns, attachments, custom fields and messages!
 */
export function buildCampaignFromAirtableCsv(campaignName, headers, rows) {
  const columnMap = analyzeCsvHeaders(headers);
  const campaignId = `camp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  const predefinedLinks = [];
  const linkUrlMap = new Map();
  let linkCounter = 1;

  // 1. Create Custom Columns definitions with globally unique IDs scoped to this campaign
  const customColIdByIndex = new Map();
  const customColumns = columnMap.custom.map((c, idx) => {
    const rawClean = c.sanitizedId.replace(/^col_/, '');
    const uniqueColId = `col_${campaignId}_${idx}_${rawClean}`;
    customColIdByIndex.set(c.index, uniqueColId);
    return {
      id: uniqueColId,
      name: c.name,
      type: c.type || 'text',
      options: []
    };
  });

  // 2. Build Messages
  const messages = rows.map((row, rowIndex) => {
    const messageId = `msg-${Date.now()}-${rowIndex + 1}-${Math.random().toString(36).substring(2, 6)}`;

    const titleRaw = columnMap.title ? row[columnMap.title.index] : '';
    const title = titleRaw?.trim() || `Disparo ${(rowIndex + 1).toString().padStart(2, '0')}`;

    const stageRaw = columnMap.stage ? row[columnMap.stage.index] : '';
    const stage = normalizeStage(stageRaw);

    const channelRaw = columnMap.channel ? row[columnMap.channel.index] : '';
    const channel = normalizeChannel(channelRaw);

    const dateRaw = columnMap.scheduledDate ? row[columnMap.scheduledDate.index] : '';
    const scheduledDate = normalizeDate(dateRaw) || new Date().toISOString().split('T')[0];

    const timeRaw = columnMap.scheduledTime ? row[columnMap.scheduledTime.index] : '';
    const scheduledTime = normalizeTime(timeRaw);

    const copyRaw = columnMap.copyText ? row[columnMap.copyText.index] : '';
    const copyText = copyRaw || '';

    const notesRaw = columnMap.notes ? row[columnMap.notes.index] : '';
    const notes = notesRaw || '';

    // Handle Attachments / Creative column
    let attachment = null;
    if (columnMap.attachment) {
      const attachRaw = row[columnMap.attachment.index];
      attachment = parseAirtableAttachment(attachRaw);
    }

    // Handle Link column
    let selectedLinkId = null;
    const variables = {};

    if (columnMap.link) {
      const linkVal = row[columnMap.link.index]?.trim();
      if (linkVal && (linkVal.startsWith('http://') || linkVal.startsWith('https://') || linkVal.includes('.'))) {
        let cleanUrl = linkVal;
        if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
          cleanUrl = 'https://' + cleanUrl;
        }

        if (!linkUrlMap.has(cleanUrl)) {
          const newLinkId = `lnk-${campaignId}-${linkCounter++}`;
          linkUrlMap.set(cleanUrl, newLinkId);
          try {
            const domain = new URL(cleanUrl).hostname.replace('www.', '');
            predefinedLinks.push({
              id: newLinkId,
              label: `Link ${predefinedLinks.length + 1} (${domain})`,
              url: cleanUrl
            });
          } catch {
            predefinedLinks.push({
              id: newLinkId,
              label: `Link ${predefinedLinks.length + 1}`,
              url: cleanUrl
            });
          }
        }

        selectedLinkId = linkUrlMap.get(cleanUrl);
        variables['1'] = { linkId: selectedLinkId, text: cleanUrl };
      }
    }

    // Handle Custom Fields (100% of extra Airtable columns)
    const customFields = {};
    columnMap.custom.forEach(customCol => {
      const uniqueColId = customColIdByIndex.get(customCol.index);
      const val = row[customCol.index];
      if (val !== undefined && val !== null && val !== '') {
        customFields[uniqueColId] = val.trim();
      }
    });

    return {
      id: messageId,
      campaignId,
      title,
      stage,
      channel,
      scheduledDate,
      scheduledTime,
      selectedLinkId,
      variables,
      copyText,
      notes,
      customFields,
      attachment,
      position: rowIndex
    };
  });

  // Calculate campaign start & end date based on message schedule
  const dates = messages.map(m => m.scheduledDate).filter(Boolean).sort();
  const startDate = dates[0] || new Date().toISOString().split('T')[0];
  const endDate = dates[dates.length - 1] || '';

  const columnOrder = buildColumnOrderFromCsv(headers, columnMap, customColIdByIndex);

  // Set the adaptive column order in localStorage for instant alignment
  try {
    localStorage.setItem('brabo_grid_column_order_v4', JSON.stringify(columnOrder));
  } catch { /* ignore */ }

  const campaign = {
    id: campaignId,
    name: campaignName.trim(),
    tagline: `Importada do Airtable (${messages.length} disparos)`,
    status: 'Ativa',
    badgeColor: '#38bdf8',
    startDate,
    endDate,
    predefinedLinks,
    customColumns,
    messages
  };

  return {
    campaign,
    columnMap,
    columnOrder,
    rowCount: messages.length,
    customColumnsCount: customColumns.length
  };
}

/**
 * Background helper to download Airtable images and upload them permanently to Supabase Storage
 */
export async function syncAirtableAttachmentsToSupabase(campaign) {
  if (!campaign || !campaign.messages) return;

  const messagesWithAttachments = campaign.messages.filter(m => m.attachment && m.attachment.fileUrl && m.attachment.fileUrl.startsWith('http'));

  for (const msg of messagesWithAttachments) {
    try {
      const response = await fetch(msg.attachment.fileUrl);
      if (!response.ok) continue;

      const blob = await response.blob();
      const ext = msg.attachment.name.split('.').pop() || 'png';
      const cleanFileName = msg.attachment.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `${campaign.id}/${msg.id}_${Date.now()}_${cleanFileName}`;

      const { data, error } = await supabase.storage
        .from('bflow-attachments')
        .upload(storagePath, blob, {
          contentType: blob.type || 'image/jpeg',
          upsert: true
        });

      if (!error) {
        const { data: publicData } = supabase.storage
          .from('bflow-attachments')
          .getPublicUrl(storagePath);

        if (publicData?.publicUrl) {
          msg.attachment.publicUrl = publicData.publicUrl;
          msg.attachment.previewUrl = publicData.publicUrl;
          msg.attachment.storagePath = storagePath;

          // Update message in database
          await supabase
            .from('bflow_disparos')
            .update({ attachment: msg.attachment })
            .eq('id', msg.id);
        }
      }
    } catch (err) {
      console.warn(`Fallback para URL original do anexo no disparo ${msg.id}:`, err);
    }
  }
}
