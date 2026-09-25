import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface ClientMessage {
  id: string;
  sender: 'client' | 'bot' | 'human';
  text: string;
  timestamp: number;
  intentDetected?: string;
}

export interface ClientConversation {
  id: string; // Número limpo (ex: 559292920233)
  jid: string;
  name: string;
  phone: string;
  status: 'novo' | 'em_andamento' | 'qualificado' | 'atendimento_humano' | 'recusado' | 'concluido';
  interestScore: number; // 0 a 100
  leadTemperature: 'frio' | 'morno' | 'quente' | 'fechando';
  detectedIntents: string[];
  businessContext: {
    askedPrice?: boolean;
    askedLocation?: boolean;
    askedPayment?: boolean;
    askedServices?: boolean;
    askedSchedule?: boolean;
    askedGuarantee?: boolean;
    preferredService?: string;
    preferredDate?: string;
    clientBudget?: string;
  };
  lastMessageSnippet: string;
  lastMessageSender: 'client' | 'bot' | 'human';
  lastInteractionAt: number;
  createdAt: number;
  messagesCount: number;
  messages: ClientMessage[];
}

export interface CustomFaqRule {
  id: string;
  title: string;
  keywords: string[];
  answer: string;
  action?: 'continue' | 'transfer_human' | 'qualify_lead';
}

export interface ConversationConfig {
  businessName: string;
  ownerName: string;
  segment: string;
  description: string;
  priceInfo: string;
  paymentMethods: string;
  pixKey: string;
  address: string;
  workingHours: string;
  websiteUrl: string;
  phoneSupport: string;
  toneOfVoice: 'amigavel' | 'consultivo' | 'direto';
  botName: string;
  customFaq: CustomFaqRule[];
  typingDelayEnabled: boolean;
  welcomeMessageVariation: boolean;
}

const DEFAULT_CONFIG: ConversationConfig = {
  businessName: 'Radar de Oportunidades & Soluções Comerciais',
  ownerName: 'Weverton',
  segment: 'Tecnologia, Vendas & Prospecção B2B',
  description: 'Somos especialistas em geração de oportunidades, automação comercial, WhatsApp inteligente e aceleração de vendas para empresas.',
  priceInfo: 'Nossos planos e soluções partem de condições especiais com excelente retorno sobre investimento (a partir de R$ 97/mês com teste e demonstração).',
  paymentMethods: 'Aceitamos Pix (com liberação imediata), Cartão de Crédito em até 12x e Boleto Bancário.',
  pixKey: 'comercial@radardeoportunidades.com.br',
  address: 'Atendimento comercial digital para todo o Brasil com suporte direto e consultoria personalizada.',
  workingHours: 'De Segunda a Sexta das 08h às 18h e Sábados das 08h às 12h (horário de Brasília).',
  websiteUrl: 'https://radardeoportunidades.com.br',
  phoneSupport: '(92) 99292-0233',
  toneOfVoice: 'amigavel',
  botName: 'Assistente Virtual Comercial',
  typingDelayEnabled: true,
  welcomeMessageVariation: true,
  customFaq: [
    {
      id: 'faq-preco',
      title: 'Tabela de Preços e Valores',
      keywords: ['preco', 'quanto custa', 'quanto e', 'qual o valor', 'tabela', 'valores', 'orcamento', 'quanto que ta', 'precinho', 'desconto'],
      answer: '{Olá|Oi|Opa}! Nossos valores são super acessíveis e personalizados para o porte do seu negócio: {{preco_info}} 🚀 Aceitamos {{formas_pagamento}}. Gostaria que eu te apresentasse uma proposta sob medida?',
      action: 'continue',
    },
    {
      id: 'faq-localizacao',
      title: 'Endereço e Localização',
      keywords: ['onde fica', 'qual o endereco', 'onde voces ficam', 'onde e a loja', 'qual o bairro', 'ponto de referencia', 'tem estacionamento', 'como faco pra chegar'],
      answer: 'Nosso endereço / base de atendimento é: {{endereco}} 📍 Atendemos de {{horario_atendimento}}. Você gostaria de agendar uma conversa ou prefere tirar suas dúvidas por aqui mesmo?',
      action: 'continue',
    },
    {
      id: 'faq-pagamento',
      title: 'Formas de Pagamento e Pix',
      keywords: ['aceita pix', 'passa cartao', 'divide no cartao', 'parcela', 'quantas vezes', 'tem desconto no pix', 'chave pix', 'boleto', 'como pago'],
      answer: 'Facilitamos bastante o pagamento! Trabalhamos com: {{formas_pagamento}} 💳 Se preferir pagar no Pix, nossa chave é: {{chave_pix}}. Deseja que eu gere o link ou código Pix pra você agora?',
      action: 'continue',
    },
    {
      id: 'faq-horario',
      title: 'Horário de Funcionamento',
      keywords: ['ta aberto', 'abre sabado', 'funciona hoje', 'atende agora', 'horario de funcionamento', 'que horas abre', 'que horas fecha'],
      answer: 'Nosso horário de funcionamento é: {{horario_atendimento}} ⏰ Se você mandar mensagem fora do horário, nossa equipe responde logo na primeira hora útil!',
      action: 'continue',
    },
    {
      id: 'faq-servicos',
      title: 'Serviços e O Que Fazem',
      keywords: ['o que voces fazem', 'quais os servicos', 'como funciona', 'me explica', 'portfolio', 'catalogo', 'manda fotos', 'fotos', 'detalhes'],
      answer: '{{descricao_negocio}} ✨ Você também pode conferir mais detalhes e referências no link: {{link_site}}. Me conta: qual é a principal necessidade da sua empresa hoje?',
      action: 'continue',
    },
    {
      id: 'faq-garantia',
      title: 'Garantia e Confiança',
      keywords: ['e seguro', 'e confiavel', 'tem garantia', 'tem contrato', 'nota fiscal', 'posso confiar', 'e golpe'],
      answer: 'Pode ficar 100% tranquilo! Somos uma empresa séria e comprometida com a transparência e qualidade. Oferecemos garantia, suporte direto e você pode falar com o {{responsavel}} a qualquer momento!',
      action: 'continue',
    },
    {
      id: 'faq-humano',
      title: 'Falar com Atendente Humano / Weverton',
      keywords: ['falar com humano', 'atendente', 'pessoa', 'weverton', 'me liga', 'ligar', 'responsavel', 'falar com atendente', 'chamar alguem'],
      answer: 'Com certeza! Já estou transferindo seu atendimento para o {{responsavel}} assumir aqui diretamente com você. Só um momento! 🤝',
      action: 'transfer_human',
    },
  ],
};

function parseSpintax(text: string): string {
  if (!text) return '';
  return text.replace(/\{([^{}]+)\}/g, (_match, group) => {
    const choices = group.split('|').map((s: string) => s.trim());
    return choices[Math.floor(Math.random() * choices.length)] || '';
  });
}

function normalizeText(text: string): string {
  return (text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Bom dia';
  if (hour >= 12 && hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

@Injectable()
export class ConversationBrainService {
  private readonly logger = new Logger(ConversationBrainService.name);
  private conversations: Map<string, ClientConversation> = new Map();
  private config: ConversationConfig = { ...DEFAULT_CONFIG };

  constructor() {
    this.initDataDirectory();
    this.loadConfig();
    this.loadConversations();
  }

  private getDataDir(): string {
    const dir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  private initDataDirectory() {
    this.getDataDir();
  }

  private getConfigFilePath(): string {
    return path.join(this.getDataDir(), 'conversation_config.json');
  }

  private getDatabaseFilePath(): string {
    return path.join(this.getDataDir(), 'conversations_database.json');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ⚙️ GESTÃO DE CONFIGURAÇÃO MANUAL (EMPRESA, FAQ, TOM DE VOZ)
  // ═══════════════════════════════════════════════════════════════════════════

  private loadConfig() {
    try {
      const file = this.getConfigFilePath();
      if (fs.existsSync(file)) {
        const raw = fs.readFileSync(file, 'utf8');
        const parsed = JSON.parse(raw);
        this.config = {
          ...DEFAULT_CONFIG,
          ...parsed,
          customFaq: Array.isArray(parsed.customFaq) && parsed.customFaq.length > 0
            ? parsed.customFaq
            : DEFAULT_CONFIG.customFaq,
        };
        this.logger.log(`Configuração conversacional carregada com sucesso (${this.config.customFaq.length} regras de FAQ).`);
        return;
      }
    } catch (e: any) {
      this.logger.error(`Erro ao carregar conversation_config.json: ${e?.message}`);
    }
    this.config = { ...DEFAULT_CONFIG };
    this.saveConfig();
  }

  saveConfig(newConfig?: Partial<ConversationConfig>): ConversationConfig {
    if (newConfig) {
      this.config = {
        ...this.config,
        ...newConfig,
        customFaq: newConfig.customFaq || this.config.customFaq,
      };
    }
    try {
      fs.writeFileSync(this.getConfigFilePath(), JSON.stringify(this.config, null, 2), 'utf8');
      this.logger.log('Configuração conversacional manual salva no disco.');
    } catch (e: any) {
      this.logger.error(`Erro ao salvar conversation_config.json: ${e?.message}`);
    }
    return this.config;
  }

  getConfig(): ConversationConfig {
    return this.config;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 💾 BANCO DE DADOS DE CONVERSAS (HISTÓRICO, MEMÓRIA E CONTEXTO)
  // ═══════════════════════════════════════════════════════════════════════════

  private loadConversations() {
    try {
      const file = this.getDatabaseFilePath();
      if (fs.existsSync(file)) {
        const raw = fs.readFileSync(file, 'utf8');
        const list: ClientConversation[] = JSON.parse(raw);
        if (Array.isArray(list)) {
          this.conversations.clear();
          for (const item of list) {
            this.conversations.set(item.id, item);
          }
          this.logger.log(`Banco de dados de conversas carregado: ${this.conversations.size} contatos registrados.`);
          return;
        }
      }
    } catch (e: any) {
      this.logger.error(`Erro ao carregar conversations_database.json: ${e?.message}`);
    }
  }

  private saveConversationsToDisk() {
    try {
      const list = Array.from(this.conversations.values());
      fs.writeFileSync(this.getDatabaseFilePath(), JSON.stringify(list, null, 2), 'utf8');
    } catch (e: any) {
      this.logger.error(`Erro ao salvar conversations_database.json: ${e?.message}`);
    }
  }

  private extractCleanId(jidOrPhone: string): string {
    return (jidOrPhone || '').split('@')[0].replace(/\D/g, '');
  }

  getConversation(jidOrPhone: string): ClientConversation | undefined {
    const id = this.extractCleanId(jidOrPhone);
    return this.conversations.get(id);
  }

  getAllConversations(filter?: { status?: string; search?: string; limit?: number }): {
    items: ClientConversation[];
    total: number;
    stats: {
      totalConversations: number;
      totalMessages: number;
      hotLeadsCount: number;
      intentsRanking: Record<string, number>;
    };
  } {
    let list = Array.from(this.conversations.values());

    // Estatísticas gerais
    let totalMessages = 0;
    let hotLeadsCount = 0;
    const intentsRanking: Record<string, number> = {};

    for (const c of list) {
      totalMessages += c.messagesCount || (c.messages ? c.messages.length : 0);
      if (c.leadTemperature === 'quente' || c.leadTemperature === 'fechando' || c.status === 'qualificado') {
        hotLeadsCount++;
      }
      for (const intent of c.detectedIntents || []) {
        intentsRanking[intent] = (intentsRanking[intent] || 0) + 1;
      }
    }

    // Filtros
    if (filter?.status && filter.status !== 'all') {
      list = list.filter(c => c.status === filter.status);
    }

    if (filter?.search) {
      const q = normalizeText(filter.search);
      list = list.filter(c => 
        normalizeText(c.name).includes(q) || 
        c.phone.includes(q) || 
        c.id.includes(q) ||
        normalizeText(c.lastMessageSnippet).includes(q)
      );
    }

    // Ordenação: mais recentes primeiro
    list.sort((a, b) => b.lastInteractionAt - a.lastInteractionAt);

    const total = list.length;
    if (filter?.limit && filter.limit > 0) {
      list = list.slice(0, filter.limit);
    }

    return {
      items: list,
      total,
      stats: {
        totalConversations: this.conversations.size,
        totalMessages,
        hotLeadsCount,
        intentsRanking,
      },
    };
  }

  deleteConversation(jidOrPhone: string): boolean {
    const id = this.extractCleanId(jidOrPhone);
    const removed = this.conversations.delete(id);
    if (removed) this.saveConversationsToDisk();
    return removed;
  }

  clearAllConversations(): void {
    this.conversations.clear();
    this.saveConversationsToDisk();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 📝 REGISTRO DE MENSAGENS E ATUALIZAÇÃO DE CONTEXTO
  // ═══════════════════════════════════════════════════════════════════════════

  recordClientMessage(
    jid: string, 
    text: string, 
    pushName?: string, 
    leadInfo?: any
  ): ClientConversation {
    const cleanId = this.extractCleanId(jid);
    const now = Date.now();
    let conv = this.conversations.get(cleanId);

    const detectedIntent = this.detectIntent(text);

    if (!conv) {
      const displayName = leadInfo?.name || pushName || `Contato ${cleanId.slice(-4)}`;
      conv = {
        id: cleanId,
        jid,
        name: displayName,
        phone: cleanId,
        status: 'novo',
        interestScore: 20,
        leadTemperature: 'frio',
        detectedIntents: [],
        businessContext: {},
        lastMessageSnippet: text.slice(0, 120),
        lastMessageSender: 'client',
        lastInteractionAt: now,
        createdAt: now,
        messagesCount: 0,
        messages: [],
      };
      this.conversations.set(cleanId, conv);
    }

    // Atualiza nome se fornecido agora
    if (pushName && conv.name.startsWith('Contato ')) {
      conv.name = pushName;
    }
    if (leadInfo?.name) {
      conv.name = leadInfo.name;
    }

    // Atualiza status e temperatura
    conv.lastInteractionAt = now;
    conv.lastMessageSnippet = text.slice(0, 120);
    conv.lastMessageSender = 'client';
    conv.messagesCount = (conv.messagesCount || 0) + 1;

    // Detecta e acumula intenções
    if (detectedIntent && !conv.detectedIntents.includes(detectedIntent)) {
      conv.detectedIntents.push(detectedIntent);
    }

    // Atualiza o contexto do negócio
    if (detectedIntent === 'preco' || detectedIntent === 'orcamento') {
      conv.businessContext.askedPrice = true;
      conv.interestScore = Math.max(conv.interestScore, 50);
      conv.leadTemperature = 'morno';
    }
    if (detectedIntent === 'pagamento' || detectedIntent === 'pix') {
      conv.businessContext.askedPayment = true;
      conv.interestScore = Math.max(conv.interestScore, 85);
      conv.leadTemperature = 'quente';
      conv.status = 'qualificado';
    }
    if (detectedIntent === 'localizacao') {
      conv.businessContext.askedLocation = true;
      conv.interestScore = Math.max(conv.interestScore, 60);
      conv.leadTemperature = 'morno';
    }
    if (detectedIntent === 'servicos') {
      conv.businessContext.askedServices = true;
    }
    if (detectedIntent === 'garantia') {
      conv.businessContext.askedGuarantee = true;
    }

    conv.messages.push({
      id: `msg-${now}-${Math.random().toString(36).substring(2, 6)}`,
      sender: 'client',
      text,
      timestamp: now,
      intentDetected: detectedIntent || undefined,
    });

    // Mantém no máximo 50 mensagens em memória por conversa para leveza
    if (conv.messages.length > 50) {
      conv.messages = conv.messages.slice(-50);
    }

    this.saveConversationsToDisk();
    return conv;
  }

  recordBotReply(jid: string, text: string, intent?: string, action?: string): void {
    const cleanId = this.extractCleanId(jid);
    const conv = this.conversations.get(cleanId);
    if (!conv) return;

    const now = Date.now();
    conv.lastInteractionAt = now;
    conv.lastMessageSnippet = text.slice(0, 120);
    conv.lastMessageSender = 'bot';
    conv.messagesCount = (conv.messagesCount || 0) + 1;

    if (action === 'transfer_human') {
      conv.status = 'atendimento_humano';
    } else if (action === 'qualify_lead' || action === 'mark_hot') {
      conv.status = 'qualificado';
      conv.leadTemperature = 'quente';
      conv.interestScore = Math.max(conv.interestScore, 80);
    } else if (conv.status === 'novo') {
      conv.status = 'em_andamento';
    }

    conv.messages.push({
      id: `bot-${now}-${Math.random().toString(36).substring(2, 6)}`,
      sender: 'bot',
      text,
      timestamp: now,
      intentDetected: intent,
    });

    if (conv.messages.length > 50) {
      conv.messages = conv.messages.slice(-50);
    }

    this.saveConversationsToDisk();
  }

  recordHumanMessage(jid: string, text: string): void {
    const cleanId = this.extractCleanId(jid);
    const conv = this.conversations.get(cleanId);
    if (!conv) return;

    const now = Date.now();
    conv.status = 'atendimento_humano';
    conv.lastInteractionAt = now;
    conv.lastMessageSnippet = text.slice(0, 120);
    conv.lastMessageSender = 'human';
    conv.messagesCount = (conv.messagesCount || 0) + 1;

    conv.messages.push({
      id: `human-${now}-${Math.random().toString(36).substring(2, 6)}`,
      sender: 'human',
      text,
      timestamp: now,
    });

    this.saveConversationsToDisk();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 🧠 MOTOR CONVERSACIONAL NATURAL & EXPRESSÕES POPULARES
  // ═══════════════════════════════════════════════════════════════════════════

  detectIntent(text: string): string | null {
    const norm = normalizeText(text);

    // 1. Desinteresse / Recusa (prioridade absoluta)
    if (/\b(nao\s*tenho\s*interesse|nao\s*quero|sem\s*interesse|obrigad[oa]\s*nao|dispens|para\s*de\s*mandar|tire\s*meu\s*numero)\b/.test(norm)) {
      return 'recusa';
    }

    // 2. Preço / Orçamento / Quanto custa
    if (/\b(quanto\s*custa|quanto\s*que\s*ta|quanto\s*ta|quanto\s*e|qual\s*o\s*valor|qual\s*o\s*preco|tabela|orcamento|orcar|valores|preco|precinho|desconto|quanto\s*fica|quanto\s*sai)\b/.test(norm)) {
      return 'preco';
    }

    // 3. Pagamento / Pix / Parcelamento
    if (/\b(aceita\s*pix|chave\s*pix|passa\s*cartao|cartao|divide\s*no\s*cartao|quantas\s*vezes|parcela|parcelar|boleto|como\s*pago|formas\s*de\s*pagamento)\b/.test(norm)) {
      return 'pagamento';
    }

    // 4. Localização / Endereço / Onde fica
    if (/\b(onde\s*fica|onde\s*voces\s*estao|onde\s*e|qual\s*o\s*endereco|qual\s*o\s*bairro|onde\s*e\s*a\s*loja|tem\s*estacionamento|como\s*chegar|ponto\s*de\s*referencia)\b/.test(norm)) {
      return 'localizacao';
    }

    // 5. Horário / Funcionamento
    if (/\b(ta\s*aberto|funciona\s*hoje|abre\s*sabado|atende\s*agora|horario\s*de\s*funcionamento|que\s*horas\s*fecha|que\s*horas\s*abre|qual\s*o\s*horario)\b/.test(norm)) {
      return 'horario';
    }

    // 6. Serviços / O que fazem / Portfólio
    if (/\b(o\s*que\s*voces\s*fazem|quais\s*os\s*servicos|como\s*funciona|me\s*explica|portfolio|catalogo|manda\s*fotos|fotos|detalhes)\b/.test(norm)) {
      return 'servicos';
    }

    // 7. Confiança / Garantia / Segurança
    if (/\b(tem\s*garantia|e\s*seguro|e\s*confiavel|nota\s*fiscal|posso\s*confiar|contrato)\b/.test(norm)) {
      return 'garantia';
    }

    // 8. Falar com Atendente Humano / Weverton
    if (/\b(falar\s*com\s*humano|atendente|pessoa|weverton|me\s*liga|ligar|responsavel|falar\s*com\s*alguem)\b/.test(norm)) {
      return 'humano';
    }

    // 9. Saudações e Gírias
    if (/\b(e\s*ai|eai|e\s*ae|eae|opa|salve|fala\s*amigo|fala\s*chefe|fala\s*parceiro|blz|beleza|ola|oi|bom\s*dia|boa\s*tarde|boa\s*noite|tudo\s*bem|tudo\s*bom|como\s*vai)\b/.test(norm)) {
      return 'saudacao';
    }

    // 10. Afirmações / Confirmação Positiva
    if (/^(sim|quero|claro|com\s*certeza|pode\s*ser|vamos|perfeito|fechado|manda\s*ai|pode\s*mandar)[\s.!]*$/.test(norm)) {
      return 'interesse_positivo';
    }

    return null;
  }

  compileTemplate(template: string, clientName?: string): string {
    const greeting = getTimeGreeting();
    const name = clientName && !clientName.startsWith('Contato ') ? clientName : '';
    const formattedName = name ? ` ${name}` : '';

    let text = template || '';
    text = text
      .replace(/\{\{saudacao_tempo\}\}/gi, greeting)
      .replace(/\{\{nome_cliente\}\}/gi, name || 'amigo(a)')
      .replace(/\{\{nome_com_espaco\}\}/gi, formattedName)
      .replace(/\{\{nome_empresa\}\}/gi, this.config.businessName)
      .replace(/\{\{minha_empresa\}\}/gi, this.config.businessName)
      .replace(/\{\{responsavel\}\}/gi, this.config.ownerName)
      .replace(/\{\{segmento\}\}/gi, this.config.segment)
      .replace(/\{\{descricao_negocio\}\}/gi, this.config.description)
      .replace(/\{\{preco_info\}\}/gi, this.config.priceInfo)
      .replace(/\{\{formas_pagamento\}\}/gi, this.config.paymentMethods)
      .replace(/\{\{chave_pix\}\}/gi, this.config.pixKey)
      .replace(/\{\{endereco\}\}/gi, this.config.address)
      .replace(/\{\{horario_atendimento\}\}/gi, this.config.workingHours)
      .replace(/\{\{link_site\}\}/gi, this.config.websiteUrl)
      .replace(/\{\{telefone_suporte\}\}/gi, this.config.phoneSupport)
      .replace(/\{\{nome_bot\}\}/gi, this.config.botName);

    return parseSpintax(text);
  }

  /**
   * Responde de forma inteligente, natural e interativa a uma mensagem recebida
   */
  processConversationalReply(
    senderId: string, 
    userText: string, 
    clientName?: string
  ): {
    reply: string | null;
    intent: string | null;
    action?: 'continue' | 'transfer_human' | 'qualify_lead' | 'end';
  } {
    const norm = normalizeText(userText);
    const cleanId = this.extractCleanId(senderId);
    const conv = this.conversations.get(cleanId);
    const resolvedName = clientName || conv?.name;

    // 1. FAQ Customizado Manual (criado ou editado por Weverton na UI)
    if (this.config.customFaq && this.config.customFaq.length > 0) {
      for (const faq of this.config.customFaq) {
        if (!faq.keywords || faq.keywords.length === 0) continue;
        const matched = faq.keywords.some(kw => {
          const normKw = normalizeText(kw);
          return normKw && (norm.includes(normKw) || norm === normKw);
        });

        if (matched) {
          const compiled = this.compileTemplate(faq.answer, resolvedName);
          return {
            reply: compiled,
            intent: faq.id || 'faq_manual',
            action: faq.action || 'continue',
          };
        }
      }
    }

    // 2. Detecção de Intenção Conversacional Base
    const intent = this.detectIntent(userText);

    if (intent === 'saudacao') {
      const greeting = getTimeGreeting();
      const namePart = resolvedName && !resolvedName.startsWith('Contato ') ? `, ${resolvedName}` : '';
      const reply = parseSpintax(`{Olá|Opa|Oi}${namePart}! ${greeting} 😊\n\nComo posso te ajudar hoje na *${this.config.businessName}*? Você gostaria de conhecer nossos serviços, tirar dúvidas sobre valores ou falar diretamente com o ${this.config.ownerName}?`);
      return { reply, intent: 'saudacao', action: 'continue' };
    }

    if (intent === 'preco') {
      const reply = this.compileTemplate(
        `{Com certeza|Perfeito}! Nossos valores são super competitivos: {{preco_info}} 🚀\n\nFacilitamos o pagamento: {{formas_pagamento}}.\n\nQual é o principal serviço ou plano que você tem interesse em fechar?`,
        resolvedName
      );
      return { reply, intent: 'preco', action: 'continue' };
    }

    if (intent === 'pagamento') {
      const reply = this.compileTemplate(
        `Trabalhamos com opções bem flexíveis: {{formas_pagamento}} 💳\n\nPara pagamentos via Pix, nossa chave é: *{{chave_pix}}*.\n\nGostaria que eu gerasse a chave Pix ou o link de pagamento para você?`,
        resolvedName
      );
      return { reply, intent: 'pagamento', action: 'qualify_lead' };
    }

    if (intent === 'localizacao') {
      const reply = this.compileTemplate(
        `Ficamos localizados em: *{{endereco}}* 📍\n\nNosso horário de funcionamento é: {{horario_atendimento}}.\n\nVocê gostaria de agendar um atendimento ou prefere resolver tudo por aqui pelo WhatsApp?`,
        resolvedName
      );
      return { reply, intent: 'localizacao', action: 'continue' };
    }

    if (intent === 'horario') {
      const reply = this.compileTemplate(
        `Nosso horário de atendimento é: *{{horario_atendimento}}* ⏰\n\nPode me enviar sua dúvida que respondemos rapidinho!`,
        resolvedName
      );
      return { reply, intent: 'horario', action: 'continue' };
    }

    if (intent === 'servicos') {
      const reply = this.compileTemplate(
        `{{descricao_negocio}} ✨\n\nVocê também pode ver demonstrações e novidades no nosso site: {{link_site}}.\n\nQual é o seu objetivo principal hoje?`,
        resolvedName
      );
      return { reply, intent: 'servicos', action: 'continue' };
    }

    if (intent === 'garantia') {
      const reply = this.compileTemplate(
        `Pode confiar com total tranquilidade! Na *{{nome_empresa}}*, prezamos pela transparência e excelência em cada entrega. Oferecemos garantia, suporte de perto e contato direto com o {{responsavel}} a qualquer momento! 🤝`,
        resolvedName
      );
      return { reply, intent: 'garantia', action: 'continue' };
    }

    if (intent === 'humano') {
      const reply = this.compileTemplate(
        `Perfeito! Estou transferindo seu atendimento para o *{{responsavel}}* agora mesmo. Em instantes ele responderá pessoalmente aqui! 🤝`,
        resolvedName
      );
      return { reply, intent: 'humano', action: 'transfer_human' };
    }

    if (intent === 'interesse_positivo') {
      const reply = this.compileTemplate(
        `Excelente! Fico muito feliz com seu interesse 🚀\n\nVocê prefere que eu te envie as opções detalhadas por aqui ou quer que o *{{responsavel}}* te ligue rapidinho para combinarmos?`,
        resolvedName
      );
      return { reply, intent: 'interesse_positivo', action: 'qualify_lead' };
    }

    return { reply: null, intent: null };
  }
}
