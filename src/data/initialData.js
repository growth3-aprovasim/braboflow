export const BRABO_CHANNELS = [
  { value: 'Grupo Normal WhatsApp', label: 'Grupo Normal WhatsApp', color: '#25D366', bg: 'rgba(37, 211, 102, 0.15)', badgeText: '🟢 Normal', category: 'whatsapp' },
  { value: 'Grupo VIP WhatsApp', label: 'Grupo VIP WhatsApp', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.15)', badgeText: '👑 VIP', category: 'whatsapp' },
  { value: 'Individual WhatsApp Janela Aberta', label: 'Individual WhatsApp Janela Aberta', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)', badgeText: '💬 Aberta (24h)', category: 'whatsapp' },
  { value: 'Individual Janela Fechada WhatsApp', label: 'Individual Janela Fechada WhatsApp', color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.15)', badgeText: '🔒 Fechada (Template)', category: 'whatsapp' },
  { value: 'Email', label: 'Email', color: '#a78bfa', bg: 'rgba(167, 139, 250, 0.15)', badgeText: '✉️ Email', category: 'email' },
  { value: 'Comunidade YouTube', label: 'Comunidade YouTube', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', badgeText: '📺 YouTube', category: 'youtube' },
  { value: 'Grupo VIP Antigo WhatsApp', label: 'Grupo VIP Antigo WhatsApp', color: '#d97706', bg: 'rgba(217, 119, 6, 0.15)', badgeText: '🏛️ VIP Antigo', category: 'whatsapp' },
  { value: 'Grupo Normal Antigo WhatsApp', label: 'Grupo Normal Antigo WhatsApp', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.15)', badgeText: '👥 Normal Antigo', category: 'whatsapp' },
];

export const FLOW_CATEGORIES = [
  { id: 'whatsapp', label: 'WhatsApp', icon: 'Smartphone', badge: '💬' },
  { id: 'email', label: 'Email', icon: 'Mail', badge: '✉️' },
  { id: 'youtube', label: 'YouTube', icon: 'YouTube', badge: '📺' },
  { id: 'all', label: 'Todos os Canais', icon: 'Layers', badge: '📋' }
];

export function getChannelCategory(channelValue) {
  if (channelValue === 'Email') return 'email';
  if (channelValue === 'Comunidade YouTube') return 'youtube';
  return 'whatsapp';
}

export function getChannelsByCategory(category) {
  if (!category || category === 'all') return BRABO_CHANNELS;
  return BRABO_CHANNELS.filter(ch => ch.category === category);
}

export const DISPARO_STAGES = [
  { value: 'Em Rascunho', label: 'Em Rascunho', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.15)', border: '#475569', badgeIcon: '📝' },
  { value: 'Programada', label: 'Programada', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)', border: '#0284c7', badgeIcon: '⏰' },
  { value: 'Disparada', label: 'Disparada', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.15)', border: '#16a34a', badgeIcon: '🚀' },
  { value: 'Cancelada', label: 'Cancelada', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', border: '#dc2626', badgeIcon: '⛔' }
];

export function getStageObj(stageValue) {
  if (!stageValue) return DISPARO_STAGES[0];
  const normalized = String(stageValue).trim().toLowerCase();

  const direct = DISPARO_STAGES.find(s =>
    s.value.toLowerCase() === normalized ||
    s.label.toLowerCase() === normalized
  );
  if (direct) return direct;

  // Fallbacks for legacy/alternative naming
  if (normalized.includes('rascunho') || normalized.includes('draft')) return DISPARO_STAGES[0];
  if (normalized.includes('program') || normalized.includes('analise') || normalized.includes('aprovad')) return DISPARO_STAGES[1];
  if (normalized.includes('dispar') || normalized.includes('enviad') || normalized.includes('sent')) return DISPARO_STAGES[2];
  if (normalized.includes('cancel')) return DISPARO_STAGES[3];

  return DISPARO_STAGES[0];
}

export function extractCopyVariables(copyText) {
  if (!copyText) return [];
  const matches = [...copyText.matchAll(/\{\{(\d+)\}\}/g)];
  const nums = new Set();
  for (const match of matches) {
    nums.add(match[1]);
  }
  return Array.from(nums).sort((a, b) => Number(a) - Number(b));
}

export function resolveCopyVariables(copyText, variables = {}, predefinedLinks = []) {
  if (!copyText) return '';
  let text = copyText;

  return text.replace(/\{\{(\d+)\}\}/g, (match, p1) => {
    const varConfig = variables?.[p1];
    if (varConfig) {
      if (varConfig.linkId) {
        const found = predefinedLinks.find(l => l.id === varConfig.linkId);
        if (found && found.url) return found.url;
      }
      if (varConfig.text) return varConfig.text;
    }
    return match;
  });
}

function evaluateSingleRule(item, rule) {
  if (!rule || !rule.field) return true;
  const { field, operator, value, value2 } = rule;

  // 1. Resolve field value from record
  let rawValue;
  if (field.startsWith('custom_')) {
    const colId = field.replace('custom_', '');
    rawValue = item.customFields?.[colId];
  } else if (field === 'attachment') {
    rawValue = item.attachment;
  } else if (field === 'attachmentPosition') {
    rawValue = item.attachment?.position || 'before';
  } else {
    rawValue = item[field];
  }

  const strVal = rawValue === null || rawValue === undefined ? '' : String(rawValue).trim();
  const lowerStr = strVal.toLowerCase();
  const targetLower = value === null || value === undefined ? '' : String(value).trim().toLowerCase();
  const todayIso = new Date().toISOString().split('T')[0];

  switch (operator) {
    // Universal emptiness
    case 'is_empty':
      if (field === 'attachment') return !item.attachment || !item.attachment.name;
      return strVal === '';
    case 'is_not_empty':
      if (field === 'attachment') return !!item.attachment && !!item.attachment.name;
      return strVal !== '';

    // Text & exact operators
    case 'equals':
      if (field === 'stage') {
        const itemStageObj = getStageObj(item.stage);
        const targetStageObj = getStageObj(value);
        return itemStageObj.value === targetStageObj.value;
      }
      return lowerStr === targetLower;

    case 'not_equals':
      if (field === 'stage') {
        const itemStageObj = getStageObj(item.stage);
        const targetStageObj = getStageObj(value);
        return itemStageObj.value !== targetStageObj.value;
      }
      return lowerStr !== targetLower;

    case 'contains':
      return lowerStr.includes(targetLower);

    case 'not_contains':
      return !lowerStr.includes(targetLower);

    case 'starts_with':
      return lowerStr.startsWith(targetLower);

    case 'ends_with':
      return lowerStr.endsWith(targetLower);

    // Date operators
    case 'exact_date':
      return strVal === value;

    case 'between': {
      if (!strVal) return false;
      const v1 = value || '';
      const v2 = value2 || '';
      if (v1 && v2) return strVal >= v1 && strVal <= v2;
      if (v1) return strVal >= v1;
      if (v2) return strVal <= v2;
      return true;
    }

    case 'before':
      return !!strVal && !!value && strVal < value;

    case 'after':
      return !!strVal && !!value && strVal > value;

    case 'is_today':
      return strVal === todayIso;

    case 'is_future':
      return !!strVal && strVal >= todayIso;

    case 'is_past':
      return !!strVal && strVal < todayIso;

    // Attachment specific operators
    case 'has_attachment':
      return !!item.attachment && !!item.attachment.name;

    case 'no_attachment':
      return !item.attachment || !item.attachment.name;

    case 'type_is':
      return item.attachment?.type === value;

    case 'position_is':
      return (item.attachment?.position || 'before') === value;

    // Checkbox operators
    case 'is_checked':
      return !!rawValue;

    case 'is_unchecked':
      return !rawValue;

    default:
      return true;
  }
}

export function matchRecordWithFilter(item, filter) {
  if (!filter) return true;

  // 1. Dynamic rules builder support (new flexible format)
  if (Array.isArray(filter.rules) && filter.rules.length > 0) {
    const validRules = filter.rules.filter(r => r && r.field && r.operator);
    if (validRules.length > 0) {
      const conjunction = (filter.conjunction || 'AND').toUpperCase();
      if (conjunction === 'OR') {
        return validRules.some(rule => evaluateSingleRule(item, rule));
      } else {
        return validRules.every(rule => evaluateSingleRule(item, rule));
      }
    }
  }

  // 2. Backward compatibility for legacy static filter structure
  // Channel filter
  if (filter.channel && filter.channel !== 'All' && item.channel !== filter.channel) {
    return false;
  }

  // Stage filter
  if (filter.stage && filter.stage !== 'All') {
    const itemStageObj = getStageObj(item.stage);
    const filterStageObj = getStageObj(filter.stage);
    if (itemStageObj.value !== filterStageObj.value) {
      return false;
    }
  }

  // Keyword / search term
  if (filter.search && filter.search.trim()) {
    const q = filter.search.toLowerCase().trim();
    const matchTitle = item.title?.toLowerCase().includes(q);
    const matchCopy = item.copyText?.toLowerCase().includes(q);
    if (!matchTitle && !matchCopy) return false;
  }

  // Date Range filter (scheduledDate)
  if (filter.startDate) {
    if (!item.scheduledDate || item.scheduledDate < filter.startDate) {
      return false;
    }
  }
  if (filter.endDate) {
    if (!item.scheduledDate || item.scheduledDate > filter.endDate) {
      return false;
    }
  }

  // Custom Fields filter (e.g. Checkbox "Verificação")
  if (filter.customFields && typeof filter.customFields === 'object') {
    for (const [colId, condition] of Object.entries(filter.customFields)) {
      if (!condition || condition === 'all') continue;
      const recordValue = item.customFields?.[colId];

      if (condition === 'checked') {
        if (!recordValue) return false;
      } else if (condition === 'unchecked') {
        if (recordValue) return false;
      } else if (typeof condition === 'string' && condition.trim()) {
        const textVal = String(recordValue || '').toLowerCase();
        if (!textVal.includes(condition.toLowerCase().trim())) return false;
      }
    }
  }

  return true;
}

export const initialCampaigns = [
  {
    id: 'camp-1',
    name: 'Operação Polícia Federal 2026 - Abertura de Turma',
    tagline: 'Lançamento de Turma de Elite Pós-Autorização',
    status: 'Ativa',
    badgeColor: '#f59e0b',
    startDate: '2026-09-08',
    endDate: '2026-09-18',
    predefinedLinks: [
      { id: 'lnk-1', label: 'Checkout 40% OFF Turma Black', url: 'https://braboconcursos.com.br/matricula-pf-black' },
      { id: 'lnk-2', label: 'Grupo VIP Oficial de Alunos', url: 'https://chat.whatsapp.com/brabo-pf-vip' },
      { id: 'lnk-3', label: 'Simulado Diagnóstico Gratuito', url: 'https://braboconcursos.com.br/simulado-pf-gratis' },
      { id: 'lnk-4', label: 'Link da Live de Abertura (YouTube)', url: 'https://youtube.com/live/brabo-pf-inaugural' }
    ],
    customColumns: [
      { id: 'col_verif', name: 'Verificação', type: 'checkbox', width: 110 }
    ],
    messages: [
      {
        id: 'msg-101',
        title: '01. Aquecimento: Aviso de Live com o Delegado',
        stage: 'Programada',
        channel: 'Grupo VIP WhatsApp',
        customFields: { col_verif: true },
        scheduledDate: '2026-09-09',
        scheduledTime: '09:00',
        selectedLinkId: 'lnk-4',
        attachment: {
          id: 'att-demo-1',
          name: 'live_delegado_banner.jpg',
          type: 'image',
          size: '1.2 MB',
          position: 'before',
          previewUrl: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?w=400&auto=format&fit=crop&q=80',
          thumbnailUrl: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?w=400&auto=format&fit=crop&q=80'
        },
        variables: {
          '1': { linkId: 'lnk-4', text: 'https://youtube.com/live/brabo-pf-inaugural' }
        },
        copyText: `Fala *{primeiro_nome}*, aqui é da *Brabo Concursos*! 🦅\n\nHoje às 20h teremos nossa Live Exclusiva de Abertura da *Operação PF* com o Delegado e mentores da Brabo.\n\nVamos destrinchar o plano de estudos pós-autorização e como antecipar os pontos mais cobrados de Direito e RLM.\n\nToque no link abaixo e ative o lembrete agora:\n{{1}}`,
        notes: 'Enviar 1 hora antes da transmissão.'
      },
      {
        id: 'msg-102',
        title: '02. Liberação de Simulado Diagnóstico',
        stage: 'Disparada',
        channel: 'Grupo Normal WhatsApp',
        scheduledDate: '2026-09-10',
        scheduledTime: '11:30',
        selectedLinkId: 'lnk-3',
        attachment: {
          id: 'att-demo-2',
          name: 'simulado_diagnostico_pf.pdf',
          type: 'document',
          size: '850 KB',
          position: 'before'
        },
        variables: {
          '1': { linkId: 'lnk-3', text: 'https://braboconcursos.com.br/simulado-pf-gratis' }
        },
        copyText: `Atenção concurseiros! 🚨\n\nO *Simulado Diagnóstico PF* da Brabo Concursos já está liberado gratuitamente na plataforma.\n\nDescubra agora sua pontuação líquida projetada estilo Cespe e veja onde você está perdendo pontos preciosos.\n\n👇 *Acesse o simulado agora:*\n{{1}}`,
        notes: 'Disparo simultâneo em todos os grupos normais.'
      },
      {
        id: 'msg-103',
        title: '03. Abertura Oficial: Cupom de 40% Liberado',
        stage: 'Programada',
        channel: 'Individual WhatsApp Janela Aberta',
        scheduledDate: '2026-09-11',
        scheduledTime: '14:00',
        selectedLinkId: 'lnk-1',
        attachment: {
          id: 'att-demo-3',
          name: 'cupom_black_40off.png',
          type: 'image',
          size: '920 KB',
          position: 'before',
          previewUrl: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=400&auto=format&fit=crop&q=80',
          thumbnailUrl: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=400&auto=format&fit=crop&q=80'
        },
        variables: {
          '1': { linkId: 'lnk-1', text: 'https://braboconcursos.com.br/matricula-pf-black' }
        },
        copyText: `Fala *{primeiro_nome}*! O lote com 40% de desconto para a *Turma Black Polícia Federal* foi liberado agora!\n\nVocê que participou do nosso aquecimento tem prioridade total antes da liberação geral.\n\nGaranta sua vaga com mentoria inclusa no link abaixo:\n{{1}}`,
        notes: 'Disparo direto 1 a 1 via Z-API / Evolution.'
      },
      {
        id: 'msg-104',
        title: '04. Alerta Geral de Condição Especial',
        stage: 'Em Rascunho',
        channel: 'Grupo VIP Antigo WhatsApp',
        scheduledDate: '2026-09-12',
        scheduledTime: '16:00',
        selectedLinkId: 'lnk-1',
        variables: {
          '1': { linkId: 'lnk-1', text: 'https://braboconcursos.com.br/matricula-pf-black' }
        },
        copyText: `Aos veteranos do Grupo VIP Antigo! ⚡\n\nComo vocês já confiam no método Brabo, liberamos um link com a mesma condição de primeira turma para quem quiser renovar para o ciclo PF 2026.\n\nAcesso imediato no link:\n{{1}}`,
        notes: 'Apenas para quem já esteve nos grupos de 2025.'
      },
      {
        id: 'msg-105',
        title: '05. Aviso Importante na Comunidade',
        stage: 'Em Rascunho',
        channel: 'Comunidade YouTube',
        scheduledDate: '2026-09-13',
        scheduledTime: '18:00',
        selectedLinkId: 'lnk-2',
        variables: {
          '1': { linkId: 'lnk-2', text: 'https://chat.whatsapp.com/brabo-pf-vip' }
        },
        copyText: `E aí, futuros federais! 🚔\n\nEstamos fechando o Grupo VIP onde os professores estão tirando dúvidas ao vivo da preparação da PF.\n\nQuem ainda não entrou, o link direto está aqui: {{1}}`,
        notes: 'Post na aba Comunidade do canal oficial.'
      },
      {
        id: 'msg-106',
        title: '06. Mensagem de Recuperação / Janela Fechada',
        stage: 'Cancelada',
        channel: 'Individual Janela Fechada WhatsApp',
        scheduledDate: '2026-09-14',
        scheduledTime: '10:00',
        selectedLinkId: 'lnk-1',
        variables: {
          '1': { linkId: 'lnk-1', text: 'https://braboconcursos.com.br/matricula-pf-black' }
        },
        copyText: `Brabo Concursos: {primeiro_nome}, identificamos que restam menos de 10 vagas no Lote 1 da Operacao PF. Finalize sua inscricao com condicao especial: {{1}}`,
        notes: 'HSM pré-aprovado na Meta para número fora da janela de 24h.'
      }
    ]
  },
  {
    id: 'camp-2',
    name: 'Reta Final PC-SP (Investigador & Escrivão)',
    tagline: 'Guerra Pós-Publicação de Edital',
    status: 'Ativa',
    badgeColor: '#ef4444',
    startDate: '2026-09-05',
    endDate: '2026-09-25',
    predefinedLinks: [
      { id: 'lnk-pc1', label: 'Combo Reta Final PC-SP 50% OFF', url: 'https://braboconcursos.com.br/reta-final-pcsp' },
      { id: 'lnk-pc2', label: 'Grupo Tático PC-SP Telegram/WhatsApp', url: 'https://chat.whatsapp.com/brabo-pcsp' },
      { id: 'lnk-pc3', label: 'Planilha Verticalizada Vunesp', url: 'https://braboconcursos.com.br/edital-verticalizado-pcsp' }
    ],
    messages: [
      {
        id: 'msg-201',
        title: '01. Planilha Verticalizada PC-SP Gratuita',
        stage: 'Disparada',
        channel: 'Grupo Normal WhatsApp',
        scheduledDate: '2026-09-08',
        scheduledTime: '10:00',
        selectedLinkId: 'lnk-pc3',
        variables: {
          '1': { linkId: 'lnk-pc3', text: 'https://braboconcursos.com.br/edital-verticalizado-pcsp' }
        },
        copyText: `Saiu a planilha com o *Edital Verticalizado da Polícia Civil de SP*!\n\nVeja quais tópicos do Direito Penal e Criminologia têm mais de 70% de incidência nas últimas provas da Vunesp.\n\nBaixe gratuitamente no link:\n{{1}}`,
        notes: 'Atrair leads quentes para compra do combo.'
      },
      {
        id: 'msg-202',
        title: '02. Cupom de 50% para Não-Alunos',
        stage: 'Programada',
        channel: 'Email',
        scheduledDate: '2026-09-11',
        scheduledTime: '15:30',
        selectedLinkId: 'lnk-pc1',
        variables: {
          '1': { linkId: 'lnk-pc1', text: 'https://braboconcursos.com.br/reta-final-pcsp' }
        },
        copyText: `*{primeiro_nome}*, falta pouco para a prova da PC-SP.\n\nCriamos um cupom de 50% para quem precisa acelerar a revisão nesta reta final com o time que mais aprova policiais em SP.\n\nClique e ative o desconto:\n{{1}}`,
        notes: 'Disparo via ActiveCampaign / RD.'
      },
      {
        id: 'msg-203',
        title: '03. Plantão de Dúvidas de Criminologia',
        stage: 'Programada',
        channel: 'Grupo VIP WhatsApp',
        scheduledDate: '2026-09-15',
        scheduledTime: '19:00',
        selectedLinkId: 'lnk-pc2',
        variables: {
          '1': { linkId: 'lnk-pc2', text: 'https://chat.whatsapp.com/brabo-pcsp' }
        },
        copyText: `Guerreiros da PC-SP! 🚨\n\nHoje às 20h tem plantão exclusivo no grupo com foco em Escolas Criminológicas: {{1}}\n\nEstejam a postos com caderno na mão!`,
        notes: ''
      }
    ]
  },
  {
    id: 'camp-3',
    name: 'Simulado Nacional Geral PRF 2026',
    tagline: 'Medição de Força & Ranqueamento',
    status: 'Programadada',
    badgeColor: '#eab308',
    startDate: '2026-09-18',
    endDate: '2026-09-28',
    predefinedLinks: [
      { id: 'lnk-prf1', label: 'Ranking Oficial do Simulado PRF', url: 'https://braboconcursos.com.br/ranking-prf' },
      { id: 'lnk-prf2', label: 'Mentoria Prática de Trânsito CTB', url: 'https://braboconcursos.com.br/mentoria-ctb-prf' }
    ],
    messages: [
      {
        id: 'msg-301',
        title: '01. Inscrições Abertas Simulado PRF',
        stage: 'Em Rascunho',
        channel: 'Grupo Normal Antigo WhatsApp',
        scheduledDate: '2026-09-18',
        scheduledTime: '12:00',
        selectedLinkId: 'lnk-prf1',
        variables: {
          '1': { linkId: 'lnk-prf1', text: 'https://braboconcursos.com.br/ranking-prf' }
        },
        copyText: `O maior simulado do Brasil para a *Polícia Rodoviária Federal* está de volta!\n\nMais de 20 mil inscritos previstos. Inscreva-se sem custo no link: {{1}}`,
        notes: 'Reaquecimento da base antiga.'
      }
    ]
  }
];
