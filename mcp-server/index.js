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

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://bjfapsvlhojiouarbzap.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_2LOoQ4MKWn-iFjKADxT-AQ_aElQoYkS';
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
    'Insere em lote múltiplas copies e disparos extraídos de documentos/briefings para dentro de uma campanha do BraboFlow.',
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
        copyText: z.string().describe('Texto completo da copy / mensagem que será disparada'),
        notes: z.string().optional().describe('Observações ou instruções para a equipe'),
        selectedLinkUrl: z.string().optional().describe('Link oficial de destino/checkout a ser vinculado ao disparo'),
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

      // Preparar links pré-definidos se houver URLs
      const linkMap = new Map();
      let linkCounter = 1;

      for (const d of disparos) {
        if (d.selectedLinkUrl && (d.selectedLinkUrl.startsWith('http://') || d.selectedLinkUrl.startsWith('https://'))) {
          if (!linkMap.has(d.selectedLinkUrl)) {
            const linkId = `lnk-${Date.now()}-${linkCounter++}`;
            let domain = 'Oficial';
            try { domain = new URL(d.selectedLinkUrl).hostname.replace('www.', ''); } catch { /* ignore */ }
            const linkObj = {
              id: linkId,
              campaign_id: campaignId,
              label: `Link (${domain})`,
              url: d.selectedLinkUrl
            };
            linkMap.set(d.selectedLinkUrl, linkObj);
          }
        }
      }

      if (linkMap.size > 0) {
        const linksToInsert = Array.from(linkMap.values());
        await supabase.from('bflow_campaign_links').upsert(linksToInsert);
      }

      // Montar mensagens
      const recordsToInsert = disparos.map((d, idx) => {
        const messageId = `msg-${Date.now()}-${idx + 1}`;
        const linkObj = d.selectedLinkUrl ? linkMap.get(d.selectedLinkUrl) : null;
        const variables = {};
        if (linkObj) {
          variables['1'] = { linkId: linkObj.id, text: linkObj.url };
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
          copy_text: d.copyText || '',
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
          text: `🎉 Sucesso! ${recordsToInsert.length} disparos e copies foram adicionados à campanha "${camp.name}" no BraboFlow.\nEles já estão visíveis na planilha Airtable, no Kanban e no Calendário!`
        }]
      };
    }
  );

  // 4. Tool: Adicionar Links Oficiais
  server.tool(
    'braboflow_add_campaign_links',
    'Cadastra links de checkout, grupo VIP, YouTube ou inscrição vinculados a uma campanha.',
    {
      campaignId: z.string().describe('ID da campanha'),
      links: z.array(z.object({
        label: z.string().describe('Rótulo do link (ex: "Checkout 50% OFF", "Grupo VIP WhatsApp")'),
        url: z.string().url().describe('URL completa (ex: "https://...")')
      }))
    },
    async ({ campaignId, links }) => {
      const toInsert = links.map((l, i) => ({
        id: `lnk-${Date.now()}-${i}`,
        campaign_id: campaignId,
        label: l.label.trim(),
        url: l.url.trim()
      }));

      const { error } = await supabase.from('bflow_campaign_links').insert(toInsert);
      if (error) {
        return { content: [{ type: 'text', text: `Erro ao inserir links: ${error.message}` }], isError: true };
      }

      return {
        content: [{ type: 'text', text: `✅ ${links.length} links predefinidos foram cadastrados na campanha.` }]
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
    'Atualiza campos específicos de um disparo existente (copy, data, canal, status, etc).',
    {
      disparoId: z.string().describe('ID do disparo a ser atualizado'),
      title: z.string().optional(),
      stage: z.enum(['Em Rascunho', 'Programada', 'Disparada', 'Cancelada']).optional(),
      channel: z.string().optional(),
      scheduledDate: z.string().optional(),
      scheduledTime: z.string().optional(),
      copyText: z.string().optional(),
      notes: z.string().optional()
    },
    async ({ disparoId, ...updates }) => {
      const dbUpdates = {};
      if (updates.title) dbUpdates.title = updates.title.trim();
      if (updates.stage) dbUpdates.stage = updates.stage;
      if (updates.channel) dbUpdates.channel = updates.channel;
      if (updates.scheduledDate) dbUpdates.scheduled_date = safeDate(updates.scheduledDate);
      if (updates.scheduledTime) dbUpdates.scheduled_time = normalizeTime(updates.scheduledTime);
      if (updates.copyText !== undefined) dbUpdates.copy_text = updates.copyText;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
      dbUpdates.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('bflow_disparos')
        .update(dbUpdates)
        .eq('id', disparoId)
        .select();

      if (error) {
        return { content: [{ type: 'text', text: `Erro ao atualizar disparo: ${error.message}` }], isError: true };
      }

      return {
        content: [{ type: 'text', text: `✅ Disparo "${disparoId}" atualizado com sucesso no BraboFlow!` }]
      };
    }
  );

  return server;
}

// ----------------------------------------------------
// SERVIDOR HTTP / SSE PARA CONEXÃO COM CLAUDE.AI
// ----------------------------------------------------
const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

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
      'braboflow_update_disparo'
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
const streamableServer = createBraboMcpServer();
const streamableTransport = new StreamableHTTPServerTransport({ endpoint: '/mcp' });
await streamableServer.connect(streamableTransport);

app.all('/mcp', async (req, res) => {
  console.log(`📡 Requisição Streamable HTTP (${req.method}) de Claude.ai`);
  await streamableTransport.handleRequest(req, res, req.body);
});

// 2. Endpoint SSE (Server-Sent Events - Legado para compatibilidade retroativa)
app.get('/sse', async (req, res) => {
  console.log('📡 Nova conexão SSE recebida de Claude.ai');
  
  const mcpServer = createBraboMcpServer();
  const transport = new SSEServerTransport('/messages', res);
  
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
