import express from 'express';
import cors from 'cors';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carregar variáveis de ambiente do .env da raiz do projeto
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || '';
const PORT = process.env.PORT || process.env.MCP_PORT || 3000;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

function safeDate(val) {
  if (!val || typeof val !== 'string') return null;
  const trimmed = val.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  return null;
}

function normalizeTime(val) {
  if (!val || typeof val !== 'string') return '10:00';
  const trimmed = val.trim();
  const match = trimmed.match(/(\d{1,2})[:hH](\d{2})/);
  if (match) {
    return `${match[1].padStart(2, '0')}:${match[2]}`;
  }
  return '10:00';
}

// ----------------------------------------------------
// CRIAÇÃO DO SERVIDOR MCP COM AS FERRAMENTAS DO BRABOFLOW
// ----------------------------------------------------
function createBraboMcpServer() {
  const server = new McpServer({
    name: 'BraboFlow MCP Server',
    version: '1.0.0'
  });

  // 1. Tool: Listar Campanhas
  server.tool(
    'braboflow_list_campaigns',
    'Lista todas as campanhas cadastradas no BraboFlow com status, datas e resumo de disparos.',
    {
      status: z.enum(['Ativa', 'Programada', 'Pausada', 'Concluída', 'Arquivada', 'Todas']).optional()
    },
    async ({ status }) => {
      let query = supabase.from('bflow_campaigns').select('*').order('created_at', { ascending: false });
      if (status && status !== 'Todas') {
        query = query.eq('status', status);
      }
      const { data: camps, error: campErr } = await query;
      if (campErr) {
        return { content: [{ type: 'text', text: `Erro ao buscar campanhas: ${campErr.message}` }], isError: true };
      }

      const { data: disparos } = await supabase.from('bflow_disparos').select('campaign_id, stage, channel');

      const result = (camps || []).map(c => {
        const msgs = (disparos || []).filter(d => d.campaign_id === c.id);
        return {
          id: c.id,
          name: c.name,
          tagline: c.tagline,
          status: c.status,
          badgeColor: c.badge_color,
          startDate: c.start_date,
          endDate: c.end_date,
          totalDisparos: msgs.length,
          whatsappDisparos: msgs.filter(m => m.channel.includes('WhatsApp')).length,
          emailDisparos: msgs.filter(m => m.channel === 'Email').length,
          youtubeDisparos: msgs.filter(m => m.channel.includes('YouTube')).length
        };
      });

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    }
  );

  // 2. Tool: Criar Nova Campanha
  server.tool(
    'braboflow_create_campaign',
    'Cria uma nova campanha no BraboFlow para receber copies e cronograma de disparos.',
    {
      name: z.string().describe('Nome da campanha (ex: "Lançamento Polícia Federal 2026")'),
      tagline: z.string().optional().describe('Objetivo ou tagline estratégica da campanha'),
      startDate: z.string().optional().describe('Data de início no formato YYYY-MM-DD'),
      endDate: z.string().optional().describe('Data de término no formato YYYY-MM-DD'),
      status: z.enum(['Ativa', 'Programada', 'Pausada', 'Concluída', 'Arquivada']).default('Ativa'),
      badgeColor: z.string().default('#facc15').describe('Cor hexadecimal para destaque do nome da campanha (Amarelo: #facc15, Azul: #38bdf8, Verde: #22c55e, etc)')
    },
    async (args) => {
      const campaignId = `camp-${Date.now()}`;
      const { data, error } = await supabase.from('bflow_campaigns').insert({
        id: campaignId,
        name: args.name.trim(),
        tagline: args.tagline?.trim() || 'Criada via Claude MCP',
        status: args.status,
        badge_color: args.badgeColor,
        start_date: safeDate(args.startDate),
        end_date: safeDate(args.endDate)
      }).select();

      if (error) {
        return { content: [{ type: 'text', text: `Erro ao criar campanha: ${error.message}` }], isError: true };
      }

      return {
        content: [{
          type: 'text',
          text: `✅ Campanha "${args.name}" criada com sucesso no BraboFlow!\nID da Campanha: ${campaignId}\nAgora você pode adicionar disparos e copies usando a ferramenta "braboflow_add_disparos_batch".`
        }]
      };
    }
  );

  // 3. Tool: Inserir Disparos / Copies em Lote
  server.tool(
    'braboflow_add_disparos_batch',
    'Insere em lote múltiplas copies e disparos em uma campanha. Para incluir links na copy, use a tag {{1}} no texto (ex: "Acesse a aula agora:\\n{{1}}"). Se você fornecer selectedLinkUrl ou linkLabel, o BraboFlow vinculará a variável {{1}} automaticamente.',
    {
      campaignId: z.string().describe('ID da campanha de destino'),
      disparos: z.array(z.object({
        title: z.string().describe('Nome ou identificação do momento do disparo (ex: "D01 - Aquecimento Aula 1")'),
        stage: z.enum(['Em Rascunho', 'Programada', 'Disparada', 'Cancelada']).default('Em Rascunho'),
        channel: z.enum([
          'Grupo Normal WhatsApp',
          'Grupo VIP WhatsApp',
          'Individual WhatsApp Janela Aberta',
          'Individual Janela Fechada WhatsApp',
          'Email',
          'Comunidade YouTube',
          'Grupo VIP Antigo WhatsApp',
          'Grupo Normal Antigo WhatsApp'
        ]).default('Grupo Normal WhatsApp'),
        scheduledDate: z.string().optional().describe('Data programada no formato YYYY-MM-DD'),
        scheduledTime: z.string().optional().describe('Horário do disparo (ex: "10:00", "19:30")'),
        copyText: z.string().describe('Texto completo da copy. Use a tag {{1}} onde o link deve aparecer (ex: "Acesse: {{1}}")'),
        notes: z.string().optional().describe('Observações ou instruções para a equipe'),
        selectedLinkId: z.string().optional().describe('ID de um link existente na campanha (ex: "lnk-1")'),
        selectedLinkUrl: z.string().optional().describe('URL do link oficial a ser vinculado (ex: "https://youtube.com/live/...")'),
        linkLabel: z.string().optional().describe('Nome amigável do link se for novo (ex: "Aula 01", "Checkout 50%")'),
        customFields: z.record(z.any()).optional().describe('Campos customizados adicionais')
      })).describe('Lista de disparos estruturados extraídos do documento')
    },
    async ({ campaignId, disparos }) => {
      // Verificar se a campanha existe
      const { data: camp, error: campErr } = await supabase
        .from('bflow_campaigns')
        .select('id, name')
        .eq('id', campaignId)
        .single();

      if (campErr || !camp) {
        return {
          content: [{ type: 'text', text: `Campanha com ID "${campaignId}" não encontrada no BraboFlow.` }],
          isError: true
        };
      }

      // Buscar links existentes da campanha para evitar duplicatas
      const { data: existingLinks } = await supabase
        .from('bflow_campaign_links')
        .select('*')
        .eq('campaign_id', campaignId);

      const linkMap = new Map();
      (existingLinks || []).forEach(l => {
        linkMap.set(l.url.trim(), l);
        linkMap.set(l.id, l);
      });

      let linkCounter = (existingLinks || []).length + 1;
      const newLinksToInsert = [];

      for (const d of disparos) {
        if (d.selectedLinkUrl && (d.selectedLinkUrl.startsWith('http://') || d.selectedLinkUrl.startsWith('https://'))) {
          const cleanUrl = d.selectedLinkUrl.trim();
          if (!linkMap.has(cleanUrl)) {
            const linkId = `lnk-${Date.now()}-${linkCounter++}`;
            const label = d.linkLabel?.trim() || `Link (${cleanUrl.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]})`;
            const linkObj = {
              id: linkId,
              campaign_id: campaignId,
              label,
              url: cleanUrl
            };
            linkMap.set(cleanUrl, linkObj);
            linkMap.set(linkId, linkObj);
            newLinksToInsert.push(linkObj);
          }
        }
      }

      if (newLinksToInsert.length > 0) {
        await supabase.from('bflow_campaign_links').insert(newLinksToInsert);
      }

      // Montar mensagens com resolução automática de variáveis {{1}}
      const recordsToInsert = disparos.map((d, idx) => {
        const messageId = `msg-${Date.now()}-${idx + 1}`;
        let linkObj = null;

        if (d.selectedLinkId && linkMap.has(d.selectedLinkId)) {
          linkObj = linkMap.get(d.selectedLinkId);
        } else if (d.selectedLinkUrl && linkMap.has(d.selectedLinkUrl.trim())) {
          linkObj = linkMap.get(d.selectedLinkUrl.trim());
        }

        let processedCopy = d.copyText || '';
        const variables = {};

        if (linkObj) {
          variables['1'] = { linkId: linkObj.id, text: linkObj.url };
          if (!processedCopy.includes('{{1}}') && d.linkLabel && processedCopy.includes(`{{${d.linkLabel}}}`)) {
            processedCopy = processedCopy.replace(`{{${d.linkLabel}}}`, '{{1}}');
          }
        }

        return {
          id: messageId,
          campaign_id: campaignId,
          title: d.title.trim(),
          stage: d.stage || 'Em Rascunho',
          channel: d.channel || 'Grupo Normal WhatsApp',
          scheduled_date: safeDate(d.scheduledDate) || new Date().toISOString().split('T')[0],
          scheduled_time: normalizeTime(d.scheduledTime),
          selected_link_id: linkObj?.id || null,
          variables,
          copy_text: processedCopy,
          notes: d.notes || '',
          custom_fields: d.customFields || {},
          position: idx,
          updated_at: new Date().toISOString()
        };
      });

      // Inserir em lotes de 50
      for (let i = 0; i < recordsToInsert.length; i += 50) {
        const chunk = recordsToInsert.slice(i, i + 50);
        const { error: insErr } = await supabase.from('bflow_disparos').insert(chunk);
        if (insErr) {
          return {
            content: [{ type: 'text', text: `Erro ao salvar disparos no banco: ${insErr.message}` }],
            isError: true
          };
        }
      }

      return {
        content: [{
          type: 'text',
          text: `🎉 Sucesso! ${recordsToInsert.length} disparos e copies foram adicionados à campanha "${camp.name}" no BraboFlow.\nSintaxe utilizada para links no texto: {{1}}`
        }]
      };
    }
  );

  // 4. Tool: Adicionar Links Oficiais
  server.tool(
    'braboflow_add_campaign_links',
    'Cadastra links oficiais (ex: "Aula 01", "Checkout", "Grupo VIP") vinculados a uma campanha.',
    {
      campaignId: z.string().describe('ID da campanha'),
      links: z.array(z.object({
        label: z.string().describe('Rótulo amigável do link (ex: "Aula 01 - YouTube", "Checkout 50% OFF")'),
        url: z.string().url().describe('URL completa (ex: "https://youtube.com/live/...")')
      }))
    },
    async ({ campaignId, links }) => {
      const { data: existing } = await supabase
        .from('bflow_campaign_links')
        .select('*')
        .eq('campaign_id', campaignId);

      const existingUrls = new Set((existing || []).map(l => l.url.trim()));
      const toInsert = [];

      links.forEach((l, i) => {
        const cleanUrl = l.url.trim();
        if (!existingUrls.has(cleanUrl)) {
          toInsert.push({
            id: `lnk-${Date.now()}-${i}`,
            campaign_id: campaignId,
            label: l.label.trim(),
            url: cleanUrl
          });
          existingUrls.add(cleanUrl);
        }
      });

      if (toInsert.length > 0) {
        const { error } = await supabase.from('bflow_campaign_links').insert(toInsert);
        if (error) {
          return { content: [{ type: 'text', text: `Erro ao inserir links: ${error.message}` }], isError: true };
        }
      }

      return {
        content: [{ type: 'text', text: `✅ ${toInsert.length} novos links cadastrados na campanha (duplicatas evitadas).` }]
      };
    }
  );

  // 5. Tool: Obter Detalhes e Disparos da Campanha
  server.tool(
    'braboflow_get_campaign_details',
    'Retorna todos os disparos, copies, datas, canais e links cadastrados em uma campanha.',
    {
      campaignId: z.string().describe('ID da campanha no BraboFlow')
    },
    async ({ campaignId }) => {
      const { data: camp, error: cErr } = await supabase
        .from('bflow_campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (cErr || !camp) {
        return { content: [{ type: 'text', text: `Campanha "${campaignId}" não encontrada.` }], isError: true };
      }

      const { data: links } = await supabase
        .from('bflow_campaign_links')
        .select('*')
        .eq('campaign_id', campaignId);

      const { data: disparos } = await supabase
        .from('bflow_disparos')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('position', { ascending: true })
        .order('scheduled_date', { ascending: true });

      const details = {
        campaign: {
          id: camp.id,
          name: camp.name,
          tagline: camp.tagline,
          status: camp.status,
          badgeColor: camp.badge_color,
          startDate: camp.start_date,
          endDate: camp.end_date
        },
        links: links || [],
        totalDisparos: (disparos || []).length,
        disparos: (disparos || []).map(d => ({
          id: d.id,
          title: d.title,
          stage: d.stage,
          channel: d.channel,
          scheduledDate: d.scheduled_date,
          scheduledTime: d.scheduled_time,
          selectedLinkId: d.selected_link_id,
          copyText: d.copy_text,
          notes: d.notes
        }))
      };

      return {
        content: [{ type: 'text', text: JSON.stringify(details, null, 2) }]
      };
    }
  );

  // 6. Tool: Atualizar Disparo
  server.tool(
    'braboflow_update_disparo',
    'Atualiza campos de um disparo (copyText, link, data, canal, status). Para links na copy, use a tag {{1}} no texto (ex: "Assista aqui: {{1}}") e forneça selectedLinkUrl ou selectedLinkId.',
    {
      disparoId: z.string().describe('ID do disparo a ser atualizado'),
      title: z.string().optional(),
      stage: z.enum(['Em Rascunho', 'Programada', 'Disparada', 'Cancelada']).optional(),
      channel: z.string().optional(),
      scheduledDate: z.string().optional(),
      scheduledTime: z.string().optional(),
      copyText: z.string().optional().describe('Texto da copy. Use {{1}} para onde o link deve entrar'),
      selectedLinkId: z.string().optional().describe('ID do link pré-definido da campanha (ex: "lnk-1")'),
      selectedLinkUrl: z.string().optional().describe('URL do link para vincular automaticamente ao disparo'),
      linkLabel: z.string().optional().describe('Rótulo amigável para o link se for novo (ex: "Aula 01")'),
      notes: z.string().optional()
    },
    async ({ disparoId, ...updates }) => {
      const { data: currentDisp, error: fetchErr } = await supabase
        .from('bflow_disparos')
        .select('*')
        .eq('id', disparoId)
        .single();

      if (fetchErr || !currentDisp) {
        return { content: [{ type: 'text', text: `Disparo "${disparoId}" não encontrado.` }], isError: true };
      }

      const dbUpdates = {};
      if (updates.title) dbUpdates.title = updates.title.trim();
      if (updates.stage) dbUpdates.stage = updates.stage;
      if (updates.channel) dbUpdates.channel = updates.channel;
      if (updates.scheduledDate) dbUpdates.scheduled_date = safeDate(updates.scheduledDate);
      if (updates.scheduledTime) dbUpdates.scheduled_time = normalizeTime(updates.scheduledTime);
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;

      // Tratar Link & Variáveis
      let linkId = updates.selectedLinkId || currentDisp.selected_link_id;

      if (updates.selectedLinkUrl) {
        const cleanUrl = updates.selectedLinkUrl.trim();
        const { data: existingLink } = await supabase
          .from('bflow_campaign_links')
          .select('*')
          .eq('campaign_id', currentDisp.campaign_id)
          .eq('url', cleanUrl)
          .maybeSingle();

        if (existingLink) {
          linkId = existingLink.id;
          if (updates.linkLabel && existingLink.label !== updates.linkLabel) {
            await supabase.from('bflow_campaign_links').update({ label: updates.linkLabel.trim() }).eq('id', existingLink.id);
          }
        } else {
          linkId = `lnk-${Date.now()}`;
          const newLabel = updates.linkLabel?.trim() || `Link (${cleanUrl.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]})`;
          await supabase.from('bflow_campaign_links').insert({
            id: linkId,
            campaign_id: currentDisp.campaign_id,
            label: newLabel,
            url: cleanUrl
          });
        }
      }

      if (linkId) {
        dbUpdates.selected_link_id = linkId;
        const { data: linkRecord } = await supabase
          .from('bflow_campaign_links')
          .select('*')
          .eq('id', linkId)
          .single();

        if (linkRecord) {
          const currentVars = currentDisp.variables || {};
          dbUpdates.variables = {
            ...currentVars,
            '1': { linkId: linkRecord.id, text: linkRecord.url }
          };
        }
      }

      if (updates.copyText !== undefined) {
        let processedCopy = updates.copyText;
        if (updates.linkLabel && processedCopy.includes(`{{${updates.linkLabel}}}`)) {
          processedCopy = processedCopy.replace(`{{${updates.linkLabel}}}`, '{{1}}');
        }
        dbUpdates.copy_text = processedCopy;
      }

      dbUpdates.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from('bflow_disparos')
        .update(dbUpdates)
        .eq('id', disparoId);

      if (error) {
        return { content: [{ type: 'text', text: `Erro ao atualizar disparo: ${error.message}` }], isError: true };
      }

  // 7. Tool: Excluir Disparos
  server.tool(
    'braboflow_delete_disparo',
    'Exclui um ou múltiplos disparos do BraboFlow pelo ID.',
    {
      disparoIds: z.array(z.string()).describe('Lista de IDs dos disparos a serem excluídos (ex: ["msg-123", "msg-456"])')
    },
    async ({ disparoIds }) => {
      if (!disparoIds || disparoIds.length === 0) {
        return { content: [{ type: 'text', text: 'Nenhum ID de disparo fornecido para exclusão.' }], isError: true };
      }

      const { error } = await supabase
        .from('bflow_disparos')
        .delete()
        .in('id', disparoIds);

      if (error) {
        return { content: [{ type: 'text', text: `Erro ao excluir disparos: ${error.message}` }], isError: true };
      }

      return {
        content: [{ type: 'text', text: `🗑️ ${disparoIds.length} disparo(s) excluído(s) com sucesso do BraboFlow!` }]
      };
    }
  );

  // 8. Tool: Excluir Campanha Completa
  server.tool(
    'braboflow_delete_campaign',
    'Exclui uma campanha inteira e todos os seus disparos e links associados.',
    {
      campaignId: z.string().describe('ID da campanha a ser excluída')
    },
    async ({ campaignId }) => {
      // Excluir disparos e links primeiro
      await supabase.from('bflow_disparos').delete().eq('campaign_id', campaignId);
      await supabase.from('bflow_campaign_links').delete().eq('campaign_id', campaignId);

      const { error } = await supabase.from('bflow_campaigns').delete().eq('id', campaignId);
      if (error) {
        return { content: [{ type: 'text', text: `Erro ao excluir campanha: ${error.message}` }], isError: true };
      }

      return {
        content: [{ type: 'text', text: `🗑️ Campanha "${campaignId}" e todos os seus disparos foram excluídos com sucesso.` }]
      };
    }
  );

  // 9. Tool: Duplicar Campanha Inteira (Clonagem Inteligente)
  server.tool(
    'braboflow_duplicate_campaign',
    'Clona uma campanha existente com todas as suas copies, cronograma de dias, links e configurações para criar um novo lançamento.',
    {
      sourceCampaignId: z.string().describe('ID da campanha de origem a ser clonada'),
      newCampaignName: z.string().describe('Nome da nova campanha (ex: "PRF 2026 - Turma Elite")'),
      newStartDate: z.string().optional().describe('Nova data de início no formato YYYY-MM-DD (as datas dos disparos serão ajustadas proporcionalmente)'),
      newEndDate: z.string().optional().describe('Nova data de término no formato YYYY-MM-DD')
    },
    async ({ sourceCampaignId, newCampaignName, newStartDate, newEndDate }) => {
      // Buscar campanha original
      const { data: origCamp, error: cErr } = await supabase
        .from('bflow_campaigns')
        .select('*')
        .eq('id', sourceCampaignId)
        .single();

      if (cErr || !origCamp) {
        return { content: [{ type: 'text', text: `Campanha original "${sourceCampaignId}" não encontrada.` }], isError: true };
      }

      const newCampId = `camp-${Date.now()}`;
      const { error: insCampErr } = await supabase.from('bflow_campaigns').insert({
        id: newCampId,
        name: newCampaignName.trim(),
        tagline: origCamp.tagline || 'Clonada via Claude MCP',
        status: 'Ativa',
        badge_color: origCamp.badge_color || '#facc15',
        start_date: safeDate(newStartDate) || origCamp.start_date,
        end_date: safeDate(newEndDate) || origCamp.end_date
      });

      if (insCampErr) {
        return { content: [{ type: 'text', text: `Erro ao criar nova campanha: ${insCampErr.message}` }], isError: true };
      }

      // Clonar Links
      const { data: origLinks } = await supabase
        .from('bflow_campaign_links')
        .select('*')
        .eq('campaign_id', sourceCampaignId);

      const linkIdMap = new Map();
      if (origLinks && origLinks.length > 0) {
        const newLinks = origLinks.map((l, idx) => {
          const newLinkId = `lnk-${Date.now()}-${idx + 1}`;
          linkIdMap.set(l.id, newLinkId);
          return {
            id: newLinkId,
            campaign_id: newCampId,
            label: l.label,
            url: l.url
          };
        });
        await supabase.from('bflow_campaign_links').insert(newLinks);
      }

      // Clonar Disparos
      const { data: origDisparos } = await supabase
        .from('bflow_disparos')
        .select('*')
        .eq('campaign_id', sourceCampaignId)
        .order('position', { ascending: true });

      if (origDisparos && origDisparos.length > 0) {
        // Calcular diferença de dias se nova data de início foi informada
        let dayDiff = 0;
        if (newStartDate && origCamp.start_date) {
          const origStart = new Date(origCamp.start_date);
          const newStart = new Date(newStartDate);
          dayDiff = Math.round((newStart - origStart) / (1000 * 60 * 60 * 24));
        }

        const newDisparos = origDisparos.map((d, idx) => {
          let adjustedDate = d.scheduled_date;
          if (dayDiff !== 0 && d.scheduled_date) {
            const dObj = new Date(d.scheduled_date);
            dObj.setDate(dObj.getDate() + dayDiff);
            adjustedDate = dObj.toISOString().split('T')[0];
          }

          // Remapear variáveis de links
          const newVars = {};
          if (d.variables && typeof d.variables === 'object') {
            for (const [k, v] of Object.entries(d.variables)) {
              const mappedLinkId = v.linkId ? linkIdMap.get(v.linkId) || v.linkId : null;
              newVars[k] = { ...v, linkId: mappedLinkId };
            }
          }

          return {
            id: `msg-${Date.now()}-${idx + 1}`,
            campaign_id: newCampId,
            title: d.title,
            stage: 'Em Rascunho', // Resetar para rascunho na nova campanha
            channel: d.channel,
            scheduled_date: adjustedDate,
            scheduled_time: d.scheduled_time,
            selected_link_id: d.selected_link_id ? linkIdMap.get(d.selected_link_id) || null : null,
            variables: newVars,
            copy_text: d.copy_text,
            notes: d.notes,
            custom_fields: d.custom_fields || {},
            position: idx,
            updated_at: new Date().toISOString()
          };
        });

        await supabase.from('bflow_disparos').insert(newDisparos);
      }

      return {
        content: [{
          type: 'text',
          text: `📋 Campanha clonada com sucesso!\nNova Campanha: "${newCampaignName}" (ID: ${newCampId})\nTotal de disparos clonados: ${origDisparos?.length || 0}\nTotal de links clonados: ${origLinks?.length || 0}`
        }]
      };
    }
  );

  // 10. Tool: Atualização em Massa de Disparos (Batch Update & Shift de Datas)
  server.tool(
    'braboflow_batch_update_disparos',
    'Permite aprovar, alterar status, canal ou adiar/antecipar datas de múltiplos disparos de uma vez.',
    {
      campaignId: z.string().describe('ID da campanha'),
      disparoIds: z.array(z.string()).optional().describe('Lista opcional de IDs específicos para atualizar'),
      filterStage: z.enum(['Em Rascunho', 'Programada', 'Disparada', 'Cancelada', 'Todos']).optional().describe('Filtrar disparos por status atual'),
      filterChannel: z.string().optional().describe('Filtrar disparos por canal atual'),
      newStage: z.enum(['Em Rascunho', 'Programada', 'Disparada', 'Cancelada']).optional().describe('Novo status para aplicar a todos os filtrados'),
      newChannel: z.string().optional().describe('Novo canal para aplicar a todos os filtrados'),
      shiftDays: z.number().optional().describe('Número de dias para adiantar (+) ou antecipar (-) as datas agendadas (ex: 1 para adiar 1 dia, -2 para antecipar 2 dias)')
    },
    async ({ campaignId, disparoIds, filterStage, filterChannel, newStage, newChannel, shiftDays }) => {
      let query = supabase.from('bflow_disparos').select('*').eq('campaign_id', campaignId);
      if (disparoIds && disparoIds.length > 0) {
        query = query.in('id', disparoIds);
      }
      if (filterStage && filterStage !== 'Todos') {
        query = query.eq('stage', filterStage);
      }
      if (filterChannel && filterChannel !== 'Todos') {
        query = query.eq('channel', filterChannel);
      }

      const { data: matched, error: qErr } = await query;
      if (qErr || !matched || matched.length === 0) {
        return { content: [{ type: 'text', text: 'Nenhum disparo encontrado correspondente aos filtros informados.' }] };
      }

      let updatedCount = 0;
      for (const d of matched) {
        const updates = { updated_at: new Date().toISOString() };
        if (newStage) updates.stage = newStage;
        if (newChannel) updates.channel = newChannel;
        if (shiftDays && shiftDays !== 0 && d.scheduled_date) {
          const dt = new Date(d.scheduled_date);
          dt.setDate(dt.getDate() + shiftDays);
          updates.scheduled_date = dt.toISOString().split('T')[0];
        }

        const { error: uErr } = await supabase.from('bflow_disparos').update(updates).eq('id', d.id);
        if (!uErr) updatedCount++;
      }

      return {
        content: [{
          type: 'text',
          text: `⚡ ${updatedCount} disparo(s) atualizado(s) em massa na campanha com sucesso!`
        }]
      };
    }
  );

  // 11. Tool: Buscar Copies no Histórico
  server.tool(
    'braboflow_search_copies',
    'Busca mensagens e copies em todo o histórico do BraboFlow por palavra-chave, canal ou status.',
    {
      query: z.string().describe('Termo de busca (ex: "Simulado", "Black", "Delegado", "Cespe")'),
      channel: z.string().optional().describe('Filtrar por canal específico'),
      limit: z.number().default(15).describe('Quantidade máxima de resultados')
    },
    async ({ query, channel, limit }) => {
      let req = supabase
        .from('bflow_disparos')
        .select('id, campaign_id, title, stage, channel, scheduled_date, copy_text, notes')
        .ilike('copy_text', `%${query.trim()}%`)
        .limit(limit);

      if (channel && channel !== 'Todos') {
        req = req.eq('channel', channel);
      }

      const { data: results, error } = await req;
      if (error) {
        return { content: [{ type: 'text', text: `Erro ao buscar copies: ${error.message}` }], isError: true };
      }

      const { data: camps } = await supabase.from('bflow_campaigns').select('id, name');
      const campMap = new Map((camps || []).map(c => [c.id, c.name]));

      const formatted = (results || []).map(r => ({
        id: r.id,
        campaignName: campMap.get(r.campaign_id) || r.campaign_id,
        title: r.title,
        channel: r.channel,
        stage: r.stage,
        scheduledDate: r.scheduled_date,
        copyPreview: (r.copy_text || '').slice(0, 300) + '...'
      }));

      return {
        content: [{
          type: 'text',
          text: `🔍 Encontrados ${formatted.length} disparos correspondentes à busca "${query}":\n\n${JSON.stringify(formatted, null, 2)}`
        }]
      };
    }
  );

  // 12. Tool: Relatório & Diagnóstico Estratégico da Campanha
  server.tool(
    'braboflow_get_campaign_analytics',
    'Gera um diagnóstico executivo da campanha: total por canal, copies sem link vinculado, disparos pendentes em rascunho e consistência de datas.',
    {
      campaignId: z.string().describe('ID da campanha para diagnóstico')
    },
    async ({ campaignId }) => {
      const { data: camp } = await supabase.from('bflow_campaigns').select('*').eq('id', campaignId).single();
      if (!camp) return { content: [{ type: 'text', text: `Campanha "${campaignId}" não encontrada.` }], isError: true };

      const { data: disparos } = await supabase.from('bflow_disparos').select('*').eq('campaign_id', campaignId);
      const { data: links } = await supabase.from('bflow_campaign_links').select('*').eq('campaign_id', campaignId);

      const msgs = disparos || [];
      const draftMsgs = msgs.filter(m => m.stage === 'Em Rascunho');
      const scheduledMsgs = msgs.filter(m => m.stage === 'Programada');
      const sentMsgs = msgs.filter(m => m.stage === 'Disparada');

      // Copies que usam {{1}} mas não têm link vinculado
      const missingLinkMsgs = msgs.filter(m => {
        const hasTag = (m.copy_text || '').includes('{{1}}');
        const hasLink = !!m.selected_link_id;
        return hasTag && !hasLink;
      });

      // Contagem por canais
      const channelsBreakdown = {};
      msgs.forEach(m => {
        channelsBreakdown[m.channel] = (channelsBreakdown[m.channel] || 0) + 1;
      });

      const report = {
        campaignName: camp.name,
        period: `${camp.start_date || 'N/A'} até ${camp.end_date || 'N/A'}`,
        status: camp.status,
        summary: {
          totalDisparos: msgs.length,
          disparosEmRascunho: draftMsgs.length,
          disparosProgramados: scheduledMsgs.length,
          disparosEnviados: sentMsgs.length,
          totalLinksCadastrados: (links || []).length
        },
        canais: channelsBreakdown,
        diagnosticoQualidade: {
          disparosSemLinkAssociado: missingLinkMsgs.map(m => ({ id: m.id, title: m.title })),
          alerta: missingLinkMsgs.length > 0 ? `⚠️ Atenção: Há ${missingLinkMsgs.length} disparo(s) com a tag {{1}} mas sem link associado!` : '✅ Todas as copies com link estão devidamente vinculadas.'
        }
      };

      return {
        content: [{ type: 'text', text: `📊 DIAGNÓSTICO DA CAMPANHA:\n\n${JSON.stringify(report, null, 2)}` }]
      };
    }
  );

  return server;
}

// ----------------------------------------------------
// SERVIDOR HTTP / SSE PARA CONEXÃO COM CLAUDE.AI
// ----------------------------------------------------
const app = express();
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'OPTIONS'], allowedHeaders: ['*'] }));
app.use(express.json({ limit: '10mb' }));

// Middleware para garantir cabeçalhos de CORS e proxy reverso em todas as rotas
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Armazenar transportes ativos por sessão
const transports = new Map();

// Rota de Informações e Health Check
const mcpInfoHandler = (req, res) => {
  res.json({
    name: 'BraboFlow MCP Server',
    status: 'online',
    version: '1.0.0',
    description: 'Servidor MCP para integração do BraboFlow com Claude.ai',
    endpoints: {
      sse: '/sse',
      messages: '/messages',
      mcp: '/mcp'
    },
    tools: [
      'braboflow_list_campaigns',
      'braboflow_create_campaign',
      'braboflow_add_disparos_batch',
      'braboflow_add_campaign_links',
      'braboflow_get_campaign_details',
      'braboflow_update_disparo',
      'braboflow_delete_disparo',
      'braboflow_delete_campaign',
      'braboflow_duplicate_campaign',
      'braboflow_batch_update_disparos',
      'braboflow_search_copies',
      'braboflow_get_campaign_analytics'
    ]
  });
};

app.get(['/api/mcp-info', '/health'], mcpInfoHandler);

const distPath = path.resolve(__dirname, '../dist');
const hasDist = fs.existsSync(distPath);

if (!hasDist) {
  app.get('/', mcpInfoHandler);
}

// 1. Endpoint HTTP Streamável (Novo Padrão Oficial Claude.ai / Streamable HTTP)
app.all('/mcp', async (req, res) => {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const mcpServer = createBraboMcpServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined // Modo stateless per-request: garante listagem de tools e execução sem perda de sessão
    });
    await mcpServer.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error('Erro ao processar requisição MCP Streamable HTTP:', err);
    if (!res.headersSent) {
      res.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: err.message }, id: null });
    }
  }
});

// 2. Endpoint SSE (Server-Sent Events) com suporte a proxy reverso e URL absoluta
app.get('/sse', async (req, res) => {
  console.log('📡 Nova conexão SSE recebida de Claude.ai');
  
  // Cabeçalhos essenciais para evitar buffering em Nginx / Easypanel / Cloudflare
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }

  // Resolver URL absoluta para o endpoint de mensagens POST
  const protocol = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const messagesUrl = host ? `${protocol}://${host}/messages` : '/messages';

  const mcpServer = createBraboMcpServer();
  const transport = new SSEServerTransport(messagesUrl, res);
  
  transports.set(transport.sessionId, transport);
  
  transport.onclose = () => {
    console.log(`🔌 Conexão SSE encerrada (${transport.sessionId})`);
    transports.delete(transport.sessionId);
  };

  await mcpServer.connect(transport);
});

// Endpoint POST para mensagens da sessão SSE
app.post('/messages', async (req, res) => {
  const sessionId = req.query.sessionId;
  const transport = transports.get(sessionId);

  if (!transport) {
    res.status(404).json({ error: `Sessão ${sessionId} não encontrada.` });
    return;
  }

  await transport.handlePostMessage(req, res);
});

// Servir frontend compilado se existir dist/
if (hasDist) {
  app.use(express.static(distPath));
  app.use((req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Iniciar servidor HTTP
app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 BRABOFLOW MCP SERVER RODANDO NA PORTA ${PORT}`);
  console.log(`📍 Endpoint local: http://localhost:${PORT}/sse`);
  console.log(`🔗 Supabase: ${SUPABASE_URL}`);
  console.log(`======================================================\n`);
});
