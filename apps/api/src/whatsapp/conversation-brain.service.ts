import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export function isGroupOrBroadcastJid(jid?: string): boolean {
  if (!jid || typeof jid !== 'string') return true;
  const clean = jid.toLowerCase().trim();
  return (
    clean.endsWith('@g.us') ||
    clean.endsWith('@broadcast') ||
    clean.endsWith('@newsletter') ||
    clean.includes('status@broadcast') ||
    clean.includes('broadcast') ||
    clean.includes('@call')
  );
}

export type ContactType = 'cliente' | 'amigo';

export interface TagDefinition {
  id: string;
  name: string;
  color: string;
}

export const DEFAULT_WHATSAPP_TAGS: TagDefinition[] = [
  { id: 'urgente', name: 'Urgente', color: '#ef4444' },
  { id: 'importante', name: 'Importante', color: '#f59e0b' },
  { id: 'orcamento_pendente', name: 'Orçamento Pendente', color: '#8b5cf6' },
  { id: 'aguardando_retorno', name: 'Aguardando Retorno', color: '#3b82f6' },
  { id: 'fechado', name: 'Fechado', color: '#10b981' },
  { id: 'cobranca', name: 'Cobrança', color: '#ea580c' },
  { id: 'frio', name: 'Frio / Sem Interesse', color: '#64748b' },
];

export interface QuickMessage {
  id: string;
  title: string;
  shortcut?: string;
  content: string;
  category?: string;
  updatedAt?: number;
}

export const DEFAULT_WHATSAPP_QUICK_MESSAGES: QuickMessage[] = [
  {
    id: 'qm-pix',
    title: '🔑 Chave Pix & Pagamento',
    shortcut: '/pix',
    content: 'Olá, {{nome}}! Segue a nossa chave Pix para pagamento do pedido:\n\n🔑 Chave Pix: 92984892332 (Celular)\n🏢 Favorecido: Criart Gráfica\n\nAssim que efetuar o pagamento, por favor envie o comprovante aqui para liberarmos seu pedido para produção! ✅',
    category: 'Financeiro',
    updatedAt: Date.now(),
  },
  {
    id: 'qm-arte',
    title: '📐 Envio de Arte / Gabarito',
    shortcut: '/arte',
    content: 'Para que a impressão do seu material saia com máxima nitidez e perfeição, precisamos que você nos envie o arquivo com as seguintes especificações:\n\n📄 Formatos aceitos: PDF/X-1a, CorelDraw (textos em curvas) ou Illustrator.\n🎨 Padrão de cores: CMYK (evitar RGB).\n🔍 Resolução: Mínimo 300 DPI.\n\nPode anexar o arquivo aqui pelo WhatsApp ou enviar para nosso e-mail!',
    category: 'Produção',
    updatedAt: Date.now(),
  },
  {
    id: 'qm-orcamento',
    title: '📋 Orçamento em Análise',
    shortcut: '/orcamento',
    content: 'Recebemos as informações do seu pedido, {{nome}}! 🎯\nNossa equipe comercial já está calculando as melhores opções de papel, formato e acabamento com o melhor custo-benefício.\n\nEm instantes te envio o orçamento detalhado por aqui!',
    category: 'Comercial',
    updatedAt: Date.now(),
  },
  {
    id: 'qm-prazo',
    title: '⏱️ Prazo de Produção',
    shortcut: '/prazo',
    content: 'Nosso prazo de produção estimado para o seu material é de 2 a 3 dias úteis, contados a partir da aprovação da arte final e da confirmação do pagamento. Assim que ficar pronto, te avisamos imediatamente!',
    category: 'Produção',
    updatedAt: Date.now(),
  },
  {
    id: 'qm-pronto',
    title: '📦 Pedido Pronto para Retirada',
    shortcut: '/pronto',
    content: 'Ótima notícia, {{nome}}! Seu material já foi impresso, finalizado com todo capricho e está pronto para retirada no nosso balcão! 🚀\n\nVenha retirar quando preferir durante nosso horário de atendimento.',
    category: 'Entrega',
    updatedAt: Date.now(),
  },
  {
    id: 'qm-horario',
    title: '📍 Endereço e Horário de Funcionamento',
    shortcut: '/horario',
    content: '📍 Endereço da loja: Atendimento Central Criart.\n⏰ Horário de funcionamento: Segunda a Sexta, das 08h às 18h | Sábado das 08h às 12h.\n\nQualquer dúvida, estamos à total disposição!',
    category: 'Atendimento',
    updatedAt: Date.now(),
  },
];

export interface ClassifiedContact {
  id: string; // Número limpo (ex: 559292920233)
  jid: string;
  name: string;
  phone: string;
  type: ContactType;
  category: string; // 'Cliente Comercial' | 'Amigo / Pessoal' | 'Família' | 'Lead Quente' | 'Lead Novo'
  confidence: 'alta' | 'media';
  reason: string;
  classifiedBy: 'manual' | 'auto_detect';
  lastMessageSnippet: string;
  lastMessageSender: 'client' | 'bot' | 'human';
  lastInteractionAt: number;
  createdAt: number;
  totalMessages: number;
  botStatus: 'ativo' | 'silenciado';
  notes?: string;
  tags?: string[];
}

export interface ClientMessage {
  id: string;
  baileysId?: string;
  sender: 'client' | 'bot' | 'human';
  text: string;
  timestamp: number;
  intentDetected?: string;
  mediaType?: 'image' | 'audio' | 'document' | 'video';
  mediaUrl?: string;
  transcription?: string;
  isEdited?: boolean;
  editedAt?: number;
  isPinned?: boolean;
  isStarred?: boolean;
  isDeleted?: boolean;
  reactions?: { emoji: string; by: string }[];
  quotedMessage?: { id: string; sender: string; text: string };
}

export interface ScheduledMessage {
  id: string;
  conversationId: string;
  phone: string;
  contactName?: string;
  jid?: string;
  text: string;
  scheduledFor: number; // timestamp em ms
  createdAt: number;
  status: 'pending' | 'sent' | 'canceled' | 'failed';
  sentAt?: number;
  type: 'manual_schedule' | 'follow_up_budget';
  attendantName?: string;
  error?: string;
}

export interface ClientConversation {
  id: string; // Número limpo (ex: 559292920233)
  jid: string;
  name: string;
  phone: string;
  contactType?: ContactType;
  status: 'novo' | 'em_andamento' | 'qualificado' | 'atendimento_humano' | 'recusado' | 'concluido';
  interestScore: number; // 0 a 100
  leadTemperature: 'frio' | 'morno' | 'quente' | 'fechando';
  detectedIntents: string[];
  tags?: string[];
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
  unreadCount?: number;
  isRead?: boolean;
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
  private classifiedContacts: Map<string, ClassifiedContact> = new Map();
  private config: ConversationConfig = { ...DEFAULT_CONFIG };
  private tags: TagDefinition[] = [];
  private quickMessages: QuickMessage[] = [];
  private scheduledMessages: ScheduledMessage[] = [];

  constructor() {
    this.initDataDirectory();
    this.loadConfig();
    this.loadDeletedMessageIds();
    this.loadLidMappings();
    this.loadConversations();
    this.loadContactsDatabase();
    this.repairConversationData();
    this.loadTags();
    this.loadQuickMessages();
    this.loadScheduledMessages();
  }

  private getDataDir(): string {
    const candidates = [
      path.join(process.cwd(), 'apps', 'api', 'data'),
      path.join(process.cwd(), 'data'),
    ];
    for (const dir of candidates) {
      if (fs.existsSync(dir)) return dir;
    }
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

  private getContactsDatabaseFilePath(): string {
    return path.join(this.getDataDir(), 'whatsapp_contacts_database.json');
  }

  private getTagsFilePath(): string {
    return path.join(this.getDataDir(), 'whatsapp_tags.json');
  }

  private getQuickMessagesFilePath(): string {
    return path.join(this.getDataDir(), 'whatsapp_quick_messages.json');
  }

  private getDeletedMessagesFilePath(): string {
    return path.join(this.getDataDir(), 'deleted_message_ids.json');
  }

  private deletedMessageIds: Set<string> = new Set();

  private loadDeletedMessageIds() {
    try {
      const file = this.getDeletedMessagesFilePath();
      if (fs.existsSync(file)) {
        const raw = fs.readFileSync(file, 'utf8');
        const list: string[] = JSON.parse(raw);
        if (Array.isArray(list)) {
          this.deletedMessageIds = new Set(list);
          this.logger.log(`Tombstones de mensagens apagadas carregados: ${this.deletedMessageIds.size} IDs.`);
        }
      }
    } catch (e: any) {
      this.logger.error(`Erro ao carregar deleted_message_ids.json: ${e?.message}`);
    }
  }

  private saveDeletedMessageIds() {
    try {
      const arr = Array.from(this.deletedMessageIds).slice(-10000);
      fs.writeFileSync(this.getDeletedMessagesFilePath(), JSON.stringify(arr, null, 2), 'utf8');
    } catch (e: any) {
      this.logger.error(`Erro ao salvar deleted_message_ids.json: ${e?.message}`);
    }
  }

  isMessageDeleted(messageId: string): boolean {
    if (!messageId) return false;
    return this.deletedMessageIds.has(messageId);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 👥 BANCO DE DADOS DE CONTATOS (CLIENTES vs AMIGOS / PESSOAL)
  // ═══════════════════════════════════════════════════════════════════════════

  private lidToPhoneCache: Map<string, string> = new Map();

  private getAuthInfoDir(): string {
    const candidates = [
      path.join(process.cwd(), 'apps', 'api', 'auth_info_baileys'),
      path.join(process.cwd(), 'auth_info_baileys'),
    ];
    for (const dir of candidates) {
      if (fs.existsSync(dir)) return dir;
    }
    return '';
  }

  loadLidMappings() {
    const authDir = this.getAuthInfoDir();
    if (!authDir || !fs.existsSync(authDir)) return;
    try {
      const scanDir = (dir: string) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            scanDir(fullPath);
          } else if (entry.name.startsWith('lid-mapping-') && entry.name.endsWith('_reverse.json')) {
            try {
              const lid = entry.name.replace('lid-mapping-', '').replace('_reverse.json', '').replace(/\D/g, '');
              const raw = fs.readFileSync(fullPath, 'utf8');
              const resolved = JSON.parse(raw);
              if (resolved && typeof resolved === 'string') {
                const cleanPn = resolved.replace(/\D/g, '');
                if (cleanPn) {
                  this.lidToPhoneCache.set(lid, cleanPn);
                }
              }
            } catch {}
          }
        }
      };
      scanDir(authDir);
      this.logger.log(`Mapeamentos LID -> Telefone carregados: ${this.lidToPhoneCache.size} correspondências.`);
    } catch (e: any) {
      this.logger.warn(`Aviso ao carregar mapeamentos LID: ${e?.message}`);
    }
  }

  private repairConversationData() {
    let modified = false;
    for (const [id, conv] of this.conversations.entries()) {
      const resolved = this.resolveRealPhone(conv.phone || conv.id || conv.jid);
      if (resolved.displayPhone && resolved.displayPhone !== conv.phone && resolved.rawPhone !== conv.phone) {
        conv.phone = resolved.displayPhone;
        modified = true;
      }
      if (conv.name && conv.name.startsWith('Contato ') && conv.name.length > 15) {
        conv.name = `Contato ${resolved.displayPhone}`;
        modified = true;
      }
    }
    for (const [id, contact] of this.classifiedContacts.entries()) {
      const resolved = this.resolveRealPhone(contact.phone || contact.id || contact.jid);
      if (resolved.displayPhone && resolved.displayPhone !== contact.phone && resolved.rawPhone !== contact.phone) {
        contact.phone = resolved.displayPhone;
        modified = true;
      }
    }
    if (modified) {
      this.saveConversationsToDisk(true);
      this.saveContactsDatabase(true);
      this.logger.log('Auto-correção de telefones e nomes de conversas executada com sucesso.');
    }
  }

  resolveRealPhone(jidOrPhone: string): { rawPhone: string; displayPhone: string } {
    if (!jidOrPhone) return { rawPhone: '', displayPhone: '' };
    const clean = jidOrPhone.split('@')[0].split(':')[0].replace(/\D/g, '');
    if (!clean) return { rawPhone: '', displayPhone: '' };

    // Se já é número com padrão brasileiro direto (10, 11 dígitos, ou 12/13 com DDI 55)
    if (clean.length <= 13 && (clean.startsWith('55') || clean.length === 10 || clean.length === 11)) {
      return {
        rawPhone: clean,
        displayPhone: this.formatBrazilianPhoneWithDDD(clean),
      };
    }

    // Se já está no cache de LID -> Telefone
    if (this.lidToPhoneCache.has(clean)) {
      const cached = this.lidToPhoneCache.get(clean)!;
      return {
        rawPhone: cached,
        displayPhone: this.formatBrazilianPhoneWithDDD(cached),
      };
    }

    // Varredura recursiva em todas as pastas de auth_info_baileys
    const authDir = this.getAuthInfoDir();
    if (authDir && fs.existsSync(authDir)) {
      try {
        const findReverse = (dir: string): string | null => {
          const entries = fs.readdirSync(dir, { withFileTypes: true });
          for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
              const found = findReverse(fullPath);
              if (found) return found;
            } else if (entry.name === `lid-mapping-${clean}_reverse.json`) {
              const raw = fs.readFileSync(fullPath, 'utf8');
              const resolved = JSON.parse(raw);
              if (resolved && typeof resolved === 'string') {
                return resolved.replace(/\D/g, '');
              }
            }
          }
          return null;
        };

        const resolvedPn = findReverse(authDir);
        if (resolvedPn) {
          this.lidToPhoneCache.set(clean, resolvedPn);
          return {
            rawPhone: resolvedPn,
            displayPhone: this.formatBrazilianPhoneWithDDD(resolvedPn),
          };
        }
      } catch {}
    }

    // Fallback: se algum contato classificado tem telefone mapeado
    for (const [_, contact] of this.classifiedContacts.entries()) {
      if ((contact.id === clean || contact.jid?.includes(clean)) && contact.phone && contact.phone !== clean) {
        const pn = contact.phone.replace(/\D/g, '');
        if (pn.length <= 13 && pn.length >= 10) {
          this.lidToPhoneCache.set(clean, pn);
          return {
            rawPhone: pn,
            displayPhone: this.formatBrazilianPhoneWithDDD(pn),
          };
        }
      }
    }

    return {
      rawPhone: clean,
      displayPhone: this.formatBrazilianPhoneWithDDD(clean),
    };
  }

  updateConversationContact(
    idOrPhone: string,
    data: { name?: string; phone?: string; notes?: string; contactType?: ContactType; crmStage?: string }
  ): boolean {
    const conv = this.getConversationRef(idOrPhone);
    if (!conv) return false;

    if (data.name && data.name.trim()) {
      conv.name = data.name.trim();
    }
    if (data.phone && data.phone.trim()) {
      const resolved = this.resolveRealPhone(data.phone.trim());
      conv.phone = resolved.displayPhone || data.phone.trim();
    }
    if (data.contactType) {
      conv.contactType = data.contactType;
    }
    if (data.notes !== undefined) {
      if (!conv.businessContext) conv.businessContext = {};
      (conv.businessContext as any).notes = data.notes;
    }
    if (data.crmStage) {
      if (!conv.businessContext) conv.businessContext = {};
      (conv.businessContext as any).crmStage = data.crmStage;
    }

    const cleanId = this.extractCleanId(idOrPhone);
    const contact = this.classifiedContacts.get(cleanId) || this.classifiedContacts.get(conv.id);
    if (contact) {
      if (data.name && data.name.trim()) contact.name = data.name.trim();
      if (data.phone && data.phone.trim()) contact.phone = conv.phone;
      if (data.contactType) contact.type = data.contactType;
      if (data.notes !== undefined) contact.notes = data.notes;
    }

    this.saveConversationsToDisk(true);
    this.saveContactsDatabase(true);
    return true;
  }

  formatBrazilianPhoneWithDDD(cleanNumber: string): string {
    if (!cleanNumber) return '';
    let digits = cleanNumber.replace(/\D/g, '');
    if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
      digits = digits.slice(2);
    }
    const ddd = digits.slice(0, 2);
    let num = digits.slice(2);
    if (num.length === 8 && ['6', '7', '8', '9'].includes(num[0])) {
      num = '9' + num;
    }
    if (num.length === 9) {
      return `(${ddd}) ${num.slice(0, 5)}-${num.slice(5)}`;
    }
    if (num.length === 8) {
      return `(${ddd}) ${num.slice(0, 4)}-${num.slice(4)}`;
    }
    return cleanNumber;
  }

    private loadContactsDatabase() {
    try {
      const file = this.getContactsDatabaseFilePath();
      if (fs.existsSync(file)) {
        const raw = fs.readFileSync(file, 'utf8');
        const list: ClassifiedContact[] = JSON.parse(raw);
        if (Array.isArray(list)) {
          this.classifiedContacts.clear();
          for (const item of list) {
            this.classifiedContacts.set(item.id, item);
          }
          this.logger.log(`Banco de contatos classificados carregado: ${this.classifiedContacts.size} contatos (Clientes & Amigos).`);
          return;
        }
      }
    } catch (e: any) {
      this.logger.error(`Erro ao carregar whatsapp_contacts_database.json: ${e?.message}`);
    }

    this.seedInitialContacts();
  }

  private seedInitialContacts() {
    try {
      const ignoredFile = path.join(this.getDataDir(), 'whatsapp_ignored_contacts.json');
      if (fs.existsSync(ignoredFile)) {
        const list: string[] = JSON.parse(fs.readFileSync(ignoredFile, 'utf8'));
        for (const item of list) {
          const clean = item.replace(/\D/g, '');
          if (clean.length >= 8) {
            this.classifiedContacts.set(clean, {
              id: clean,
              jid: `${clean}@s.whatsapp.net`,
              name: item,
              phone: clean,
              type: 'amigo',
              category: 'Amigo / Família',
              confidence: 'alta',
              reason: 'Cadastrado na lista de contatos pessoais/familiares',
              classifiedBy: 'auto_detect',
              lastMessageSnippet: '',
              lastMessageSender: 'client',
              lastInteractionAt: Date.now(),
              createdAt: Date.now(),
              totalMessages: 0,
              botStatus: 'silenciado',
              notes: 'Contato pessoal. O robô não enviará mensagens de vendas.',
            });
          }
        }
      }

      for (const [id, conv] of this.conversations.entries()) {
        if (!this.classifiedContacts.has(id)) {
          const isFriend = conv.contactType === 'amigo' || this.isTextOrNameFriend(conv.name, conv.lastMessageSnippet);
          this.classifiedContacts.set(id, {
            id,
            jid: conv.jid || `${id}@s.whatsapp.net`,
            name: conv.name,
            phone: conv.phone || id,
            type: isFriend ? 'amigo' : 'cliente',
            category: isFriend ? 'Amigo / Pessoal' : (conv.status === 'qualificado' ? 'Lead Quente' : 'Cliente Comercial'),
            confidence: 'media',
            reason: isFriend ? 'Detectado por padrão pessoal' : 'Interagiu no WhatsApp comercial',
            classifiedBy: 'auto_detect',
            lastMessageSnippet: conv.lastMessageSnippet || '',
            lastMessageSender: conv.lastMessageSender || 'client',
            lastInteractionAt: conv.lastInteractionAt || Date.now(),
            createdAt: conv.createdAt || Date.now(),
            totalMessages: conv.messagesCount || (conv.messages ? conv.messages.length : 0),
            botStatus: isFriend ? 'silenciado' : 'ativo',
          });
        }
      }

      this.saveContactsDatabase();
      this.logger.log(`Seed inicial de contatos realizado com sucesso (${this.classifiedContacts.size} contatos).`);
    } catch (e: any) {
      this.logger.warn(`Aviso no seed inicial de contatos: ${e?.message}`);
    }
  }

  private saveContactsTimer: NodeJS.Timeout | null = null;
  private isSavingContacts = false;
  private pendingSaveContacts = false;

  private saveContactsDatabase(immediate = false) {
    if (immediate) {
      if (this.saveContactsTimer) {
        clearTimeout(this.saveContactsTimer);
        this.saveContactsTimer = null;
      }
      try {
        const list = Array.from(this.classifiedContacts.values());
        const filePath = this.getContactsDatabaseFilePath();
        const tmpPath = `${filePath}.tmp`;
        fs.writeFileSync(tmpPath, JSON.stringify(list), 'utf8');
        fs.renameSync(tmpPath, filePath);
      } catch (e: any) {
        this.logger.error(`Erro ao salvar whatsapp_contacts_database.json (sync): ${e?.message}`);
      }
      return;
    }

    if (this.saveContactsTimer) return;
    this.saveContactsTimer = setTimeout(() => {
      this.saveContactsTimer = null;
      this.flushContactsAsync();
    }, 450);
  }

  private async flushContactsAsync() {
    if (this.isSavingContacts) {
      this.pendingSaveContacts = true;
      return;
    }
    this.isSavingContacts = true;
    try {
      const list = Array.from(this.classifiedContacts.values());
      const filePath = this.getContactsDatabaseFilePath();
      const tmpPath = `${filePath}.tmp`;
      await fs.promises.writeFile(tmpPath, JSON.stringify(list), 'utf8');
      await fs.promises.rename(tmpPath, filePath);
    } catch (e: any) {
      this.logger.error(`Erro ao salvar whatsapp_contacts_database.json (async): ${e?.message}`);
    } finally {
      this.isSavingContacts = false;
      if (this.pendingSaveContacts) {
        this.pendingSaveContacts = false;
        this.saveContactsDatabase();
      }
    }
  }

  isTextOrNameFriend(name?: string, text?: string): boolean {
    const friendKeywords = [
      'dengosa', 'leticia', 'leticia tomais', 'namorada', 'namorado', 'esposa', 'marido',
      'amor', 'mae', 'pai', 'irmao', 'irma', 'filho', 'filha', 'tia', 'tio', 'primo', 'prima',
      'amigo', 'amiga', 'brother', 'mano', 'parca', 'parceiro', 'vo', 'vovo'
    ];
    const normName = normalizeText(name || '');
    for (const kw of friendKeywords) {
      if (kw && normName.includes(kw)) return true;
    }
    const normText = normalizeText(text || '');
    if (normText && /\b(te amo|saudades|sumido|e ai sumido|eae sumido|partiu|churras|churrasco|cerveja|breja|futebol|pelada|bora sair|casa da mae|minha mae|vem ca|vem pra ca|manda um pix emprestado|meu mano|fala tu|salve mano)\b/.test(normText)) {
      return true;
    }
    return false;
  }

  identifyContact(
    jid: string,
    pushName?: string,
    messageText?: string,
    leadRecord?: any,
    extraIgnoredTerms?: string[]
  ): { type: ContactType; reason: string; isAmigo: boolean; contact: ClassifiedContact } {
    const cleanId = this.extractCleanId(jid);
    const now = Date.now();
    let contact = this.classifiedContacts.get(cleanId);

    // 1. Se já está registrado e foi definido MANUALMENTE pelo usuário: respeita 100%!
    if (contact && contact.classifiedBy === 'manual') {
      if (messageText) {
        contact.lastMessageSnippet = messageText.slice(0, 120);
        contact.lastInteractionAt = now;
        contact.totalMessages = (contact.totalMessages || 0) + 1;
        this.saveContactsDatabase();
      }
      return {
        type: contact.type,
        reason: contact.reason || `Definido manualmente como ${contact.type === 'amigo' ? 'Amigo' : 'Cliente'}`,
        isAmigo: contact.type === 'amigo',
        contact,
      };
    }

    const normName = normalizeText(pushName || contact?.name || leadRecord?.name || '');
    const normText = normalizeText(messageText || '');
    const cleanPhone = cleanId;

    // 2. Termos pessoais, familiares e gírias de amizade
    const friendKeywords = [
      'dengosa', 'leticia', 'leticia tomais', 'namorada', 'namorado', 'esposa', 'marido',
      'amor', 'mae', 'pai', 'irmao', 'irma', 'filho', 'filha', 'tia', 'tio', 'primo', 'prima',
      'amigo', 'amiga', 'brother', 'mano', 'parca', 'parceiro', 'vo', 'vovo'
    ];

    if (extraIgnoredTerms && Array.isArray(extraIgnoredTerms)) {
      for (const t of extraIgnoredTerms) {
        const nt = normalizeText(t);
        if (nt && !friendKeywords.includes(nt)) friendKeywords.push(nt);
      }
    }

    let isFriendByTerm = false;
    let matchedReason = '';

    for (const kw of friendKeywords) {
      if (!kw) continue;
      const cleanKwDigits = kw.replace(/\D/g, '');
      if (cleanKwDigits.length >= 8 && (cleanId.includes(cleanKwDigits) || cleanKwDigits.includes(cleanId))) {
        isFriendByTerm = true;
        matchedReason = `Número cadastrado na lista de amigos/família (${kw})`;
        break;
      }
      if (normName.includes(kw)) {
        isFriendByTerm = true;
        matchedReason = `Nome ou apelido pessoal identificado: "${kw}"`;
        break;
      }
    }

    if (!isFriendByTerm && normText) {
      if (/\b(te amo|saudades|sumido|e ai sumido|eae sumido|partiu|churras|churrasco|cerveja|breja|futebol|pelada|bora sair|casa da mae|minha mae|vem ca|vem pra ca|manda um pix emprestado|meu mano|fala tu|salve mano)\b/.test(normText)) {
        isFriendByTerm = true;
        matchedReason = `Expressão pessoal/informal detectada na conversa`;
      }
    }

    if (isFriendByTerm) {
      const updatedContact: ClassifiedContact = {
        id: cleanId,
        jid,
        name: pushName || contact?.name || `Amigo (${cleanPhone.slice(-4)})`,
        phone: cleanPhone,
        type: 'amigo',
        category: 'Amigo / Pessoal',
        confidence: 'alta',
        reason: matchedReason,
        classifiedBy: contact?.classifiedBy || 'auto_detect',
        lastMessageSnippet: messageText ? messageText.slice(0, 120) : (contact?.lastMessageSnippet || ''),
        lastMessageSender: 'client',
        lastInteractionAt: now,
        createdAt: contact?.createdAt || now,
        totalMessages: (contact?.totalMessages || 0) + (messageText ? 1 : 0),
        botStatus: 'silenciado',
        notes: contact?.notes || 'Identificado como contato pessoal/amigo. O robô não responderá com mensagens comerciais.',
      };
      this.classifiedContacts.set(cleanId, updatedContact);
      this.saveContactsDatabase();
      return { type: 'amigo', reason: matchedReason, isAmigo: true, contact: updatedContact };
    }

    // 3. Sinais de CLIENTE / COMERCIAL:
    let isCommercialLead = false;
    let commercialReason = '';

    if (leadRecord) {
      isCommercialLead = true;
      commercialReason = leadRecord?.templateName ? `Disparo Comercial (${leadRecord.templateName})` : 'Lead cadastrado no Radar';
    } else if (normText) {
      if (/\b(preco|quanto custa|quanto e|quanto que ta|valor|orcamento|orcar|tabela|servico|servicos|site|software|sistema|automacao|bot|prospeccao|radar|vendas|empresa|negocio|contratar|plano|mensalidade|pix|pagamento|cartao|nota fiscal|garantia|endereco|horario|atendimento|portfolio|catalogo|lead|proposta|solucao)\b/.test(normText)) {
        isCommercialLead = true;
        commercialReason = `Termo comercial detectado: interesse em produtos/serviços`;
      }
    }

    // 4. Se não for amigo comprovado, em ambiente de negócios novo contato é tratado como CLIENTE (Lead Novo)
    // para que a pessoa NUNCA fique no vácuo sem atendimento!
    const finalType: ContactType = 'cliente';
    const finalReason = isCommercialLead ? commercialReason : 'Novo contato WhatsApp (Potencial Cliente)';
    const finalCategory = isCommercialLead ? 'Cliente Comercial' : 'Lead Novo';

    const updatedContact: ClassifiedContact = {
      id: cleanId,
      jid,
      name: leadRecord?.name || pushName || contact?.name || `Cliente (${cleanPhone.slice(-4)})`,
      phone: cleanPhone,
      type: finalType,
      category: finalCategory,
      confidence: isCommercialLead ? 'alta' : 'media',
      reason: finalReason,
      classifiedBy: contact?.classifiedBy || 'auto_detect',
      lastMessageSnippet: messageText ? messageText.slice(0, 120) : (contact?.lastMessageSnippet || ''),
      lastMessageSender: 'client',
      lastInteractionAt: now,
      createdAt: contact?.createdAt || now,
      totalMessages: (contact?.totalMessages || 0) + (messageText ? 1 : 0),
      botStatus: 'ativo',
      notes: contact?.notes,
    };

    this.classifiedContacts.set(cleanId, updatedContact);
    this.saveContactsDatabase();

    return { type: 'cliente', reason: finalReason, isAmigo: false, contact: updatedContact };
  }

  getAllClassifiedContacts(filter?: { type?: string; search?: string; limit?: number }): {
    items: ClassifiedContact[];
    total: number;
    stats: {
      totalContacts: number;
      clientsCount: number;
      friendsCount: number;
      botActiveCount: number;
    };
  } {
    let list = Array.from(this.classifiedContacts.values());

    let clientsCount = 0;
    let friendsCount = 0;
    let botActiveCount = 0;

    for (const c of list) {
      if (c.type === 'cliente') clientsCount++;
      if (c.type === 'amigo') friendsCount++;
      if (c.botStatus === 'ativo') botActiveCount++;
    }

    if (filter?.type && filter.type !== 'all') {
      list = list.filter(c => c.type === filter.type);
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

    list.sort((a, b) => b.lastInteractionAt - a.lastInteractionAt);
    const total = list.length;
    if (filter?.limit && filter.limit > 0) {
      list = list.slice(0, filter.limit);
    }

    return {
      items: list,
      total,
      stats: {
        totalContacts: this.classifiedContacts.size,
        clientsCount,
        friendsCount,
        botActiveCount,
      },
    };
  }

  classifyContact(jidOrPhone: string, type: ContactType, name?: string, notes?: string): ClassifiedContact {
    const cleanId = this.extractCleanId(jidOrPhone);
    const now = Date.now();
    let contact = this.classifiedContacts.get(cleanId);

    if (!contact) {
      contact = {
        id: cleanId,
        jid: `${cleanId}@s.whatsapp.net`,
        name: name || (type === 'amigo' ? `Amigo (${cleanId.slice(-4)})` : `Cliente (${cleanId.slice(-4)})`),
        phone: cleanId,
        type,
        category: type === 'amigo' ? 'Amigo / Pessoal' : 'Cliente Comercial',
        confidence: 'alta',
        reason: 'Definido manualmente pelo usuário',
        classifiedBy: 'manual',
        lastMessageSnippet: '',
        lastMessageSender: 'client',
        lastInteractionAt: now,
        createdAt: now,
        totalMessages: 0,
        botStatus: type === 'amigo' ? 'silenciado' : 'ativo',
        notes: notes || (type === 'amigo' ? 'Contato pessoal (Robô silenciado)' : 'Cliente comercial (Robô ativo)'),
      };
    } else {
      contact.type = type;
      contact.category = type === 'amigo' ? 'Amigo / Pessoal' : 'Cliente Comercial';
      contact.classifiedBy = 'manual';
      contact.reason = 'Definido manualmente pelo usuário';
      contact.botStatus = type === 'amigo' ? 'silenciado' : 'ativo';
      if (name) contact.name = name;
      if (notes) contact.notes = notes;
      contact.lastInteractionAt = now;
    }

    this.classifiedContacts.set(cleanId, contact);
    this.saveContactsDatabase();

    const conv = this.conversations.get(cleanId);
    if (conv) {
      conv.contactType = type;
      if (name) conv.name = name;
      this.saveConversationsToDisk();
    }

    this.logger.log(`Contato ${cleanId} reclassificado manualmente como "${type.toUpperCase()}".`);
    return contact;
  }

  deleteClassifiedContact(jidOrPhone: string): boolean {
    const cleanId = this.extractCleanId(jidOrPhone);
    const removed = this.classifiedContacts.delete(cleanId);
    if (removed) this.saveContactsDatabase();
    return removed;
  }

  getClassifiedContact(jidOrPhone: string): ClassifiedContact | undefined {
    const cleanId = this.extractCleanId(jidOrPhone);
    return this.classifiedContacts.get(cleanId);
  }

  setBotSilenced(jidOrPhone: string, silenced: boolean): void {
    const cleanId = this.extractCleanId(jidOrPhone);
    const now = Date.now();
    let contact = this.classifiedContacts.get(cleanId);
    if (contact) {
      contact.botStatus = silenced ? 'silenciado' : 'ativo';
      contact.lastInteractionAt = now;
      this.saveContactsDatabase();
    }
    const conv = this.conversations.get(cleanId);
    if (conv) {
      conv.status = silenced ? 'atendimento_humano' : 'em_andamento';
      conv.lastInteractionAt = now;
      this.saveConversationsToDisk();
    }
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

  private saveConversationsTimer: NodeJS.Timeout | null = null;
  private isSavingConversations = false;
  private pendingSaveConversations = false;

  private saveConversationsToDisk(immediate = false) {
    if (immediate) {
      if (this.saveConversationsTimer) {
        clearTimeout(this.saveConversationsTimer);
        this.saveConversationsTimer = null;
      }
      try {
        const list = Array.from(this.conversations.values());
        const filePath = this.getDatabaseFilePath();
        const tmpPath = `${filePath}.tmp`;
        fs.writeFileSync(tmpPath, JSON.stringify(list), 'utf8');
        fs.renameSync(tmpPath, filePath);
      } catch (e: any) {
        this.logger.error(`Erro ao salvar conversations_database.json (sync): ${e?.message}`);
      }
      return;
    }

    if (this.saveConversationsTimer) return;
    this.saveConversationsTimer = setTimeout(() => {
      this.saveConversationsTimer = null;
      this.flushConversationsAsync();
    }, 350);
  }

  private async flushConversationsAsync() {
    if (this.isSavingConversations) {
      this.pendingSaveConversations = true;
      return;
    }
    this.isSavingConversations = true;
    try {
      const list = Array.from(this.conversations.values());
      const filePath = this.getDatabaseFilePath();
      const tmpPath = `${filePath}.tmp`;
      await fs.promises.writeFile(tmpPath, JSON.stringify(list), 'utf8');
      await fs.promises.rename(tmpPath, filePath);
    } catch (e: any) {
      this.logger.error(`Erro ao salvar conversations_database.json (async): ${e?.message}`);
    } finally {
      this.isSavingConversations = false;
      if (this.pendingSaveConversations) {
        this.pendingSaveConversations = false;
        this.saveConversationsToDisk();
      }
    }
  }

  private loadTags() {
    try {
      const file = this.getTagsFilePath();
      if (fs.existsSync(file)) {
        const raw = fs.readFileSync(file, 'utf8');
        const list: TagDefinition[] = JSON.parse(raw);
        if (Array.isArray(list) && list.length > 0) {
          this.tags = list;
          this.logger.log(`Etiquetas do WhatsApp carregadas: ${this.tags.length} etiquetas registradas.`);
          return;
        }
      }
    } catch (e: any) {
      this.logger.error(`Erro ao carregar whatsapp_tags.json: ${e?.message}`);
    }
    this.tags = [...DEFAULT_WHATSAPP_TAGS];
    this.saveTags();
  }

  private saveTags() {
    try {
      fs.writeFileSync(this.getTagsFilePath(), JSON.stringify(this.tags, null, 2), 'utf8');
    } catch (e: any) {
      this.logger.error(`Erro ao salvar whatsapp_tags.json: ${e?.message}`);
    }
  }

  private extractCleanId(jidOrPhone: string): string {
    const raw = (jidOrPhone || '').split('@')[0].trim();
    const digits = raw.replace(/\D/g, '');
    if (digits.length >= 4) return digits;
    const slug = raw.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    return slug || `contact_${Date.now()}`;
  }

  getConversationRef(jidOrPhone: string): ClientConversation | undefined {
    if (!jidOrPhone) return undefined;
    const id = this.extractCleanId(jidOrPhone);
    let conv = this.conversations.get(id);
    if (!conv) {
      for (const c of this.conversations.values()) {
        if (c.jid === jidOrPhone || c.phone === jidOrPhone || c.id === jidOrPhone) {
          conv = c;
          break;
        }
        const cPhoneDigits = (c.phone || '').replace(/\D/g, '');
        if (cPhoneDigits && (cPhoneDigits === id || id.endsWith(cPhoneDigits) || cPhoneDigits.endsWith(id))) {
          conv = c;
          break;
        }
      }
    }
    return conv;
  }

  getConversationRefByMessageId(messageId: string): ClientConversation | undefined {
    if (!messageId) return undefined;
    for (const c of this.conversations.values()) {
      if (Array.isArray(c.messages) && c.messages.some(m => m.id === messageId || m.baileysId === messageId)) {
        return c;
      }
    }
    return undefined;
  }

  getConversation(jidOrPhone: string): ClientConversation | undefined {
    const conv = this.getConversationRef(jidOrPhone);
    if (!conv) return undefined;
    const resolved = this.resolveRealPhone(conv.phone || conv.id || conv.jid);
    const displayPhone = resolved.displayPhone || conv.phone;
    let name = conv.name;
    if (name && name.startsWith('Contato ') && name.length > 15) {
      name = `Contato ${displayPhone}`;
    }
    return {
      ...conv,
      phone: displayPhone,
      name,
    };
  }

  getAllConversations(filter?: { status?: string; search?: string; tag?: string; limit?: number }): {
    items: any[];
    total: number;
    stats: {
      totalConversations: number;
      totalMessages: number;
      hotLeadsCount: number;
      vacuumCount: number;
      unreadCount: number;
      humanCount: number;
      botCount: number;
      messagedToday: number;
      intentsRanking: Record<string, number>;
    };
  } {
    let list = Array.from(this.conversations.values());
    const now = Date.now();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startOfDayTs = startOfDay.getTime();

    // Estatísticas gerais
    let totalMessages = 0;
    let hotLeadsCount = 0;
    let vacuumCount = 0;
    let unreadCount = 0;
    let humanCount = 0;
    let botCount = 0;
    let messagedToday = 0;
    const intentsRanking: Record<string, number> = {};

    for (const c of list) {
      totalMessages += c.messagesCount || (c.messages ? c.messages.length : 0);
      if (c.leadTemperature === 'quente' || c.leadTemperature === 'fechando' || c.status === 'qualificado') {
        hotLeadsCount++;
      }
      if (c.lastMessageSender === 'client') {
        vacuumCount++;
      }
      const isUnread = (c.unreadCount && c.unreadCount > 0) || (c.lastMessageSender === 'client' && c.isRead === false);
      if (isUnread) {
        unreadCount++;
      }
      if (c.status === 'atendimento_humano') {
        humanCount++;
      } else {
        botCount++;
      }
      if (c.lastInteractionAt >= startOfDayTs) {
        messagedToday++;
      }
      for (const intent of c.detectedIntents || []) {
        intentsRanking[intent] = (intentsRanking[intent] || 0) + 1;
      }
    }

    // Filtros
    if (filter?.status && filter.status !== 'all') {
      if (filter.status === 'vacuum') {
        list = list.filter(c => c.lastMessageSender === 'client');
      } else if (filter.status === 'unread') {
        list = list.filter(c => (c.unreadCount && c.unreadCount > 0) || (c.lastMessageSender === 'client' && c.isRead === false));
      } else if (filter.status === 'bot') {
        list = list.filter(c => c.status !== 'atendimento_humano');
      } else if (filter.status === 'human') {
        list = list.filter(c => c.status === 'atendimento_humano');
      } else {
        list = list.filter(c => c.status === filter.status);
      }
    }

    if (filter?.tag && filter.tag !== 'all') {
      const qTag = normalizeText(filter.tag);
      list = list.filter(c => Array.isArray(c.tags) && c.tags.some(t => normalizeText(t) === qTag || t.toLowerCase() === filter.tag.toLowerCase()));
    }

    if (filter?.search) {
      const q = normalizeText(filter.search);
      list = list.filter(c => 
        normalizeText(c.name).includes(q) || 
        c.phone.includes(q) || 
        c.id.includes(q) || 
        normalizeText(c.lastMessageSnippet).includes(q) ||
        (Array.isArray(c.tags) && c.tags.some(t => normalizeText(t).includes(q)))
      );
    }

    // Ordenação: mais recentes primeiro
    list.sort((a, b) => b.lastInteractionAt - a.lastInteractionAt);

    const total = list.length;
    if (filter?.limit && filter.limit > 0) {
      list = list.slice(0, filter.limit);
    }

    const items = list.map(c => {
      const resolved = this.resolveRealPhone(c.phone || c.id || c.jid);
      const displayPhone = resolved.displayPhone || c.phone;
      let name = c.name;
      if (name && name.startsWith('Contato ') && name.length > 15) {
        name = `Contato ${displayPhone}`;
      }
      const isWaitingReply = c.lastMessageSender === 'client';
      const waitingTimeMinutes = isWaitingReply ? Math.max(0, Math.floor((now - c.lastInteractionAt) / 60000)) : 0;
      const unreadCountNum = typeof c.unreadCount === 'number' ? c.unreadCount : (c.lastMessageSender === 'client' && c.isRead === false ? 1 : 0);
      const isReadBool = c.isRead !== undefined ? c.isRead : (c.lastMessageSender !== 'client');

      // Otimização de Performance: Omitir o array gigante de histórico de mensagens na listagem geral do sidebar.
      // Envia apenas a última mensagem para preview instantâneo no card do contato, reduzindo o payload em ~98%.
      const { messages, ...restOfConv } = c;
      const lastMsg = (messages && messages.length > 0) ? [messages[messages.length - 1]] : [];

      return {
        ...restOfConv,
        messagesCount: c.messagesCount || (messages ? messages.length : 0),
        messages: lastMsg,
        phone: displayPhone,
        name,
        isWaitingReply,
        waitingTimeMinutes,
        unreadCount: unreadCountNum,
        isRead: isReadBool,
      };
    });

    return {
      items,
      total,
      stats: {
        totalConversations: this.conversations.size,
        totalMessages,
        hotLeadsCount,
        vacuumCount,
        unreadCount,
        humanCount,
        botCount,
        messagedToday,
        intentsRanking,
      },
    };
  }

  markConversationAsRead(jidOrPhone: string): boolean {
    const clean = this.extractCleanId(jidOrPhone);
    const conv = this.conversations.get(clean);
    if (conv) {
      conv.unreadCount = 0;
      conv.isRead = true;
      this.saveConversationsToDisk();
      return true;
    }
    return false;
  }

  markConversationAsUnread(jidOrPhone: string): boolean {
    const clean = this.extractCleanId(jidOrPhone);
    const conv = this.conversations.get(clean);
    if (conv) {
      conv.unreadCount = Math.max(1, (conv.unreadCount || 0) + 1);
      conv.isRead = false;
      this.saveConversationsToDisk();
      return true;
    }
    return false;
  }

  deleteConversation(jidOrPhone: string): boolean {
    if (!jidOrPhone) return false;
    let removed = false;
    const conv = this.getConversationRef(jidOrPhone);
    if (conv) {
      if (Array.isArray(conv.messages)) {
        for (const m of conv.messages) {
          if (m.id) this.deletedMessageIds.add(m.id);
          if (m.baileysId) this.deletedMessageIds.add(m.baileysId);
        }
        this.saveDeletedMessageIds();
      }
      this.conversations.delete(conv.id);
      removed = true;
    }
    const clean = this.extractCleanId(jidOrPhone);
    if (this.conversations.has(clean)) {
      this.conversations.delete(clean);
      removed = true;
    }
    if (this.conversations.has(jidOrPhone)) {
      this.conversations.delete(jidOrPhone);
      removed = true;
    }
    if (removed) {
      this.saveConversationsToDisk(true);
    }
    return removed;
  }

  clearConversationMessages(jidOrPhone: string): boolean {
    const conv = this.getConversationRef(jidOrPhone);
    if (!conv || !Array.isArray(conv.messages)) return false;

    for (const m of conv.messages) {
      if (m.id) this.deletedMessageIds.add(m.id);
      if (m.baileysId) this.deletedMessageIds.add(m.baileysId);
    }
    this.saveDeletedMessageIds();

    conv.messages = [];
    conv.messagesCount = 0;
    conv.lastMessageSnippet = '';
    conv.unreadCount = 0;

    this.saveConversationsToDisk(true);
    return true;
  }

  editMessage(jidOrPhone: string, messageId: string, newText: string): boolean {
    let conv = this.getConversationRef(jidOrPhone) || this.getConversationRefByMessageId(messageId);
    if (!conv || !Array.isArray(conv.messages)) return false;

    const msg = conv.messages.find(m => m.id === messageId || m.baileysId === messageId);
    if (!msg) return false;

    msg.text = newText;
    msg.isEdited = true;
    msg.editedAt = Date.now();

    // Atualiza snippet da última mensagem se for ela
    const lastMsg = conv.messages[conv.messages.length - 1];
    if (lastMsg && (lastMsg.id === messageId || lastMsg.baileysId === messageId)) {
      conv.lastMessageSnippet = newText.slice(0, 80);
    }

    this.saveConversationsToDisk();
    return true;
  }

  deleteMessage(jidOrPhone: string, messageId: string, forEveryone: boolean = false): boolean {
    if (!messageId) return false;

    // Registra tombstone para o messageId para nunca mais ressuscitar
    this.deletedMessageIds.add(messageId);

    let conv = this.getConversationRef(jidOrPhone) || this.getConversationRefByMessageId(messageId);
    if (!conv || !Array.isArray(conv.messages)) {
      this.saveDeletedMessageIds();
      return true;
    }

    const msg = conv.messages.find(m => m.id === messageId || m.baileysId === messageId);
    if (!msg) {
      this.saveDeletedMessageIds();
      return true;
    }

    if (msg.baileysId) {
      this.deletedMessageIds.add(msg.baileysId);
    }
    if (msg.id) {
      this.deletedMessageIds.add(msg.id);
    }
    this.saveDeletedMessageIds();

    if (forEveryone) {
      msg.isDeleted = true;
      msg.text = '🚫 Esta mensagem foi apagada';
      msg.mediaType = undefined;
      msg.mediaUrl = undefined;
    } else {
      conv.messages = conv.messages.filter(m => m.id !== messageId && m.baileysId !== messageId);
    }

    if (conv.messages.length > 0) {
      const lastMsg = conv.messages[conv.messages.length - 1];
      conv.lastMessageSnippet = lastMsg.text?.slice(0, 80) || '';
      conv.lastMessageSender = lastMsg.sender;
    } else {
      conv.lastMessageSnippet = '';
    }

    this.saveConversationsToDisk(true);
    return true;
  }

  togglePinMessage(jidOrPhone: string, messageId: string): boolean {
    let conv = this.getConversationRef(jidOrPhone) || this.getConversationRefByMessageId(messageId);
    if (!conv || !Array.isArray(conv.messages)) return false;

    const msg = conv.messages.find(m => m.id === messageId || m.baileysId === messageId);
    if (!msg) return false;

    msg.isPinned = !msg.isPinned;
    this.saveConversationsToDisk();
    return true;
  }

  toggleStarMessage(jidOrPhone: string, messageId: string): boolean {
    let conv = this.getConversationRef(jidOrPhone) || this.getConversationRefByMessageId(messageId);
    if (!conv || !Array.isArray(conv.messages)) return false;

    const msg = conv.messages.find(m => m.id === messageId || m.baileysId === messageId);
    if (!msg) return false;

    msg.isStarred = !msg.isStarred;
    this.saveConversationsToDisk();
    return true;
  }

  reactToMessage(jidOrPhone: string, messageId: string, emoji: string): boolean {
    let conv = this.getConversationRef(jidOrPhone) || this.getConversationRefByMessageId(messageId);
    if (!conv || !Array.isArray(conv.messages)) return false;

    const msg = conv.messages.find(m => m.id === messageId || m.baileysId === messageId);
    if (!msg) return false;

    if (!Array.isArray(msg.reactions)) {
      msg.reactions = [];
    }
    const existingIdx = msg.reactions.findIndex(r => r.emoji === emoji);
    if (existingIdx >= 0) {
      msg.reactions.splice(existingIdx, 1);
    } else {
      msg.reactions.push({ emoji, by: 'me' });
    }

    this.saveConversationsToDisk();
    return true;
  }

  clearAllConversations(): void {
    for (const c of this.conversations.values()) {
      if (Array.isArray(c.messages)) {
        for (const m of c.messages) {
          if (m.id) this.deletedMessageIds.add(m.id);
          if (m.baileysId) this.deletedMessageIds.add(m.baileysId);
        }
      }
    }
    this.saveDeletedMessageIds();
    this.conversations.clear();
    this.saveConversationsToDisk(true);
  }

  clearAllClientHistory(): {
    conversationsCleared: number;
    contactsCleared: number;
    scheduledCleared: number;
  } {
    const conversationsCleared = this.conversations.size;
    const contactsCleared = this.classifiedContacts.size;
    const scheduledCleared = this.scheduledMessages.length;

    for (const c of this.conversations.values()) {
      if (Array.isArray(c.messages)) {
        for (const m of c.messages) {
          if (m.id) this.deletedMessageIds.add(m.id);
          if (m.baileysId) this.deletedMessageIds.add(m.baileysId);
        }
      }
    }
    this.saveDeletedMessageIds();

    this.conversations.clear();
    this.saveConversationsToDisk(true);

    this.classifiedContacts.clear();
    this.saveContactsDatabase(true);

    this.scheduledMessages = [];
    this.saveScheduledMessages();

    this.logger.log(`🧹 [RESET CLIENTES] Histórico de clientes limpo: ${conversationsCleared} conversas, ${contactsCleared} contatos classificados e ${scheduledCleared} agendamentos removidos.`);

    return {
      conversationsCleared,
      contactsCleared,
      scheduledCleared,
    };
  }

  updateContactName(jidOrPhone: string, newName: string): ClientConversation | null {
    if (!newName || !newName.trim()) return null;
    const cleanName = newName.trim();
    const cleanId = this.extractCleanId(jidOrPhone);

    let conv = this.getConversationRef(jidOrPhone);
    if (!conv && cleanId) {
      conv = this.conversations.get(cleanId) || null;
    }
    if (!conv && jidOrPhone) {
      for (const [_, c] of this.conversations.entries()) {
        if (
          c.id === jidOrPhone ||
          c.jid === jidOrPhone ||
          c.phone === jidOrPhone ||
          c.phone?.replace(/\D/g, '') === cleanId ||
          c.id?.replace(/\D/g, '') === cleanId
        ) {
          conv = c;
          break;
        }
      }
    }

    if (!conv) {
      this.logger.warn(`Não foi possível localizar conversa para renomear: "${jidOrPhone}"`);
      return null;
    }

    conv.name = cleanName;
    if (conv.id) {
      this.conversations.set(conv.id, conv);
    }
    this.saveConversationsToDisk(true);

    // Sincroniza também no banco de contatos classificados
    const contactKeys = [cleanId, conv.id, conv.phone?.replace(/\D/g, '')].filter(Boolean) as string[];
    for (const ck of contactKeys) {
      const contact = this.classifiedContacts.get(ck);
      if (contact) {
        contact.name = cleanName;
        this.saveContactsDatabase();
        break;
      }
    }

    this.logger.log(`Nome do contato "${conv.id || cleanId}" atualizado para "${cleanName}".`);
    return conv;
  }

  updateConversationTags(jidOrPhone: string, tags: string[]): ClientConversation | null {
    const cleanId = this.extractCleanId(jidOrPhone);
    const conv = this.conversations.get(cleanId);
    if (!conv) return null;

    const uniqueTags = Array.from(new Set(tags.filter(t => Boolean(t && t.trim())).map(t => t.trim())));
    conv.tags = uniqueTags;
    this.saveConversationsToDisk();

    // Sincroniza também no banco de contatos classificados
    const contact = this.classifiedContacts.get(cleanId);
    if (contact) {
      contact.tags = uniqueTags;
      this.saveContactsDatabase();
    }

    this.logger.log(`Etiquetas atualizadas para "${cleanId}": [${uniqueTags.join(', ')}].`);
    return conv;
  }

  getAvailableTags(): TagDefinition[] {
    if (!this.tags || this.tags.length === 0) {
      this.loadTags();
    }
    return this.tags;
  }

  addOrUpdateTag(data: { id?: string; name: string; color?: string }): TagDefinition {
    const name = (data.name || '').trim();
    if (!name) throw new Error('Nome da etiqueta é obrigatório.');

    const color = data.color || '#3b82f6';
    const id = data.id || name.toLowerCase().replace(/[^a-z0-9_-]/g, '_');

    if (!this.tags || this.tags.length === 0) {
      this.loadTags();
    }

    const existingIndex = this.tags.findIndex(t => t.id === id);
    let tag: TagDefinition;
    if (existingIndex >= 0) {
      this.tags[existingIndex] = {
        ...this.tags[existingIndex],
        name,
        color,
      };
      tag = this.tags[existingIndex];
    } else {
      tag = { id, name, color };
      this.tags.push(tag);
    }
    this.saveTags();
    return tag;
  }

  deleteTag(tagId: string): boolean {
    if (!this.tags || this.tags.length === 0) {
      this.loadTags();
    }
    const initialLen = this.tags.length;
    this.tags = this.tags.filter(t => t.id !== tagId);
    if (this.tags.length !== initialLen) {
      this.saveTags();
      return true;
    }
    return false;
  }

  // ═══════════════════════════════════════════════════════════════════
  // ⚡ MENSAGENS RÁPIDAS / MODELOS PERSONALIZADOS
  // ═══════════════════════════════════════════════════════════════════

  private loadQuickMessages() {
    try {
      const file = this.getQuickMessagesFilePath();
      if (fs.existsSync(file)) {
        const raw = fs.readFileSync(file, 'utf8');
        const list: QuickMessage[] = JSON.parse(raw);
        if (Array.isArray(list)) {
          this.quickMessages = list;
          this.logger.log(`Mensagens rápidas carregadas: ${this.quickMessages.length} modelos registrados.`);
          return;
        }
      }
    } catch (e: any) {
      this.logger.error(`Erro ao carregar whatsapp_quick_messages.json: ${e?.message}`);
    }
    this.quickMessages = [...DEFAULT_WHATSAPP_QUICK_MESSAGES];
    this.saveQuickMessages();
  }

  private saveQuickMessages() {
    try {
      fs.writeFileSync(this.getQuickMessagesFilePath(), JSON.stringify(this.quickMessages || [], null, 2), 'utf8');
    } catch (e: any) {
      this.logger.error(`Erro ao salvar whatsapp_quick_messages.json: ${e?.message}`);
    }
  }

  getQuickMessages(): QuickMessage[] {
    if (this.quickMessages === undefined) {
      this.loadQuickMessages();
    }
    return this.quickMessages || [];
  }

  saveQuickMessage(data: Partial<QuickMessage>): QuickMessage {
    if (this.quickMessages === undefined) {
      this.loadQuickMessages();
    }
    if (!this.quickMessages) this.quickMessages = [];

    const title = (data.title || '').trim();
    const content = (data.content || '').trim();
    if (!title || !content) {
      throw new Error('Título e conteúdo são obrigatórios para a mensagem rápida.');
    }

    let id = data.id?.trim();
    if (!id) {
      id = 'qm_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
    }

    let shortcut = data.shortcut?.trim() || '';
    if (shortcut && !shortcut.startsWith('/')) {
      shortcut = '/' + shortcut;
    }

    const category = data.category?.trim() || 'Geral';

    const existingIndex = this.quickMessages.findIndex(m => m.id === id);
    let qm: QuickMessage;
    if (existingIndex >= 0) {
      this.quickMessages[existingIndex] = {
        ...this.quickMessages[existingIndex],
        title,
        shortcut,
        content,
        category,
        updatedAt: Date.now(),
      };
      qm = this.quickMessages[existingIndex];
    } else {
      qm = {
        id,
        title,
        shortcut,
        content,
        category,
        updatedAt: Date.now(),
      };
      this.quickMessages.push(qm);
    }
    this.saveQuickMessages();
    return qm;
  }

  deleteQuickMessage(id: string): boolean {
    if (this.quickMessages === undefined) {
      this.loadQuickMessages();
    }
    if (!this.quickMessages) this.quickMessages = [];
    const initialLen = this.quickMessages.length;
    this.quickMessages = this.quickMessages.filter(m => m.id !== id);
    if (this.quickMessages.length !== initialLen) {
      this.saveQuickMessages();
      return true;
    }
    return false;
  }

  // ═══════════════════════════════════════════════════════════════════
  // 📅 MENSAGENS AGENDADAS & FOLLOW-UP AUTOMÁTICO
  // ═══════════════════════════════════════════════════════════════════

  private getScheduledMessagesFilePath(): string {
    return path.join(this.getDataDir(), 'whatsapp_scheduled_messages.json');
  }

  private loadScheduledMessages() {
    try {
      const file = this.getScheduledMessagesFilePath();
      if (fs.existsSync(file)) {
        const raw = fs.readFileSync(file, 'utf8');
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          this.scheduledMessages = list;
          this.logger.log(`Mensagens agendadas carregadas: ${this.scheduledMessages.length} registros.`);
          return;
        }
      }
    } catch (e: any) {
      this.logger.error(`Erro ao carregar whatsapp_scheduled_messages.json: ${e?.message}`);
    }
    this.scheduledMessages = [];
  }

  private saveScheduledMessages() {
    try {
      fs.writeFileSync(this.getScheduledMessagesFilePath(), JSON.stringify(this.scheduledMessages, null, 2), 'utf8');
    } catch (e: any) {
      this.logger.error(`Erro ao salvar whatsapp_scheduled_messages.json: ${e?.message}`);
    }
  }

  getScheduledMessages(filter?: { conversationId?: string; status?: string }): ScheduledMessage[] {
    if (!this.scheduledMessages) {
      this.loadScheduledMessages();
    }
    let list = [...this.scheduledMessages];
    if (filter?.conversationId) {
      const clean = this.extractCleanId(filter.conversationId);
      list = list.filter(m => this.extractCleanId(m.conversationId) === clean || this.extractCleanId(m.phone) === clean);
    }
    if (filter?.status) {
      list = list.filter(m => m.status === filter.status);
    }
    return list.sort((a, b) => a.scheduledFor - b.scheduledFor);
  }

  saveScheduledMessage(data: Partial<ScheduledMessage>): ScheduledMessage {
    if (!this.scheduledMessages) {
      this.loadScheduledMessages();
    }
    const text = (data.text || '').trim();
    if (!text) {
      throw new Error('Texto da mensagem agendada é obrigatório.');
    }
    if (!data.scheduledFor || data.scheduledFor <= Date.now()) {
      throw new Error('Data e horário de agendamento devem ser no futuro.');
    }

    const id = data.id || 'sch_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
    const conversationId = data.conversationId || data.phone || '';
    const phone = data.phone || data.conversationId || '';

    const scheduled: ScheduledMessage = {
      id,
      conversationId,
      phone,
      contactName: data.contactName,
      jid: data.jid,
      text,
      scheduledFor: data.scheduledFor,
      createdAt: data.createdAt || Date.now(),
      status: 'pending',
      type: data.type || 'manual_schedule',
      attendantName: data.attendantName,
    };

    const idx = this.scheduledMessages.findIndex(m => m.id === id);
    if (idx >= 0) {
      this.scheduledMessages[idx] = { ...this.scheduledMessages[idx], ...scheduled };
    } else {
      this.scheduledMessages.push(scheduled);
    }
    this.saveScheduledMessages();
    return scheduled;
  }

  cancelScheduledMessage(id: string): boolean {
    if (!this.scheduledMessages) {
      this.loadScheduledMessages();
    }
    const msg = this.scheduledMessages.find(m => m.id === id);
    if (msg && msg.status === 'pending') {
      msg.status = 'canceled';
      this.saveScheduledMessages();
      return true;
    }
    return false;
  }

  deleteScheduledMessage(id: string): boolean {
    if (!this.scheduledMessages) {
      this.loadScheduledMessages();
    }
    const prevLen = this.scheduledMessages.length;
    this.scheduledMessages = this.scheduledMessages.filter(m => m.id !== id);
    if (this.scheduledMessages.length !== prevLen) {
      this.saveScheduledMessages();
      return true;
    }
    return false;
  }

  updateScheduledMessageStatus(id: string, status: 'sent' | 'canceled' | 'failed', error?: string): boolean {
    if (!this.scheduledMessages) {
      this.loadScheduledMessages();
    }
    const msg = this.scheduledMessages.find(m => m.id === id);
    if (msg) {
      msg.status = status;
      if (status === 'sent') msg.sentAt = Date.now();
      if (error) msg.error = error;
      this.saveScheduledMessages();
      return true;
    }
    return false;
  }

  saveMessageTranscription(conversationId: string, messageId: string, transcription: string): boolean {
    const clean = this.extractCleanId(conversationId);
    const conv = this.conversations.get(clean);
    if (conv && conv.messages) {
      const msg = conv.messages.find(m => m.id === messageId);
      if (msg) {
        msg.transcription = transcription;
        this.saveConversationsToDisk();
        return true;
      }
    }
    return false;
  }

  getAttendanceReport() {
    const list = Array.from(this.conversations.values());
    const now = Date.now();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startOfDayTs = startOfDay.getTime();

    const startOfWeek = new Date();
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfWeekTs = startOfWeek.getTime();

    let totalClients = 0;
    let answeredCount = 0;
    let answeredByBot = 0;
    let answeredByHuman = 0;
    let vacuumCount = 0;
    let unreadCount = 0;
    let messagedToday = 0;
    let messagedThisWeek = 0;
    let totalClientMessages = 0;
    let totalResponses = 0;

    const vacuumList: Array<{
      id: string;
      phone: string;
      name: string;
      lastMessageSnippet: string;
      lastInteractionAt: number;
      waitMinutes: number;
      waitHours: string;
      urgency: 'critical' | 'warning' | 'normal';
    }> = [];

    const unreadList: Array<{
      id: string;
      phone: string;
      name: string;
      lastMessageSnippet: string;
      lastInteractionAt: number;
      unreadCount: number;
    }> = [];

    const attendantsActivity: Record<string, number> = {};

    // Dias da semana para gráfico dos últimos 7 dias
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const weekDaysMap: Record<string, { dia: string; mensagens: number; respondidos: number; vacuo: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now - i * 86400000);
      const name = dayNames[d.getDay()];
      weekDaysMap[name] = { dia: name, mensagens: 0, respondidos: 0, vacuo: 0 };
    }

    for (const c of list) {
      const resolved = this.resolveRealPhone(c.phone || c.id || c.jid);
      const displayPhone = resolved.displayPhone || c.phone || c.id;
      let displayName = c.name;
      if (!displayName || (displayName.startsWith('Contato ') && displayName.length > 15)) {
        displayName = `Cliente (${displayPhone})`;
      }

      const hasClientMsg = (c.messages || []).some(m => m.sender === 'client') || c.lastMessageSender === 'client';
      if (!hasClientMsg && (!c.messages || c.messages.length === 0)) continue;

      totalClients++;

      for (const m of (c.messages || [])) {
        if (m.sender === 'client') {
          totalClientMessages++;
        } else if (m.sender === 'bot') {
          totalResponses++;
        } else if (m.sender === 'human') {
          totalResponses++;
          // Assinatura no formato *<Título> <Nome>:* — o título é personalizável em Configurações
          const match = (m.text || '').match(/^\s*\*[^\s*:]+\s+([^*\n]+?):?\*:?/);
          const attName = match ? match[1].trim() : 'Atendente Geral';
          attendantsActivity[attName] = (attendantsActivity[attName] || 0) + 1;
        }

        const msgDay = dayNames[new Date(m.timestamp || c.lastInteractionAt).getDay()];
        if (weekDaysMap[msgDay]) {
          if (m.sender === 'client') {
            weekDaysMap[msgDay].mensagens++;
          } else {
            weekDaysMap[msgDay].respondidos++;
          }
        }
      }

      if (c.lastInteractionAt >= startOfDayTs) {
        messagedToday++;
      }
      if (c.lastInteractionAt >= startOfWeekTs) {
        messagedThisWeek++;
      }

      const isUnread = (c.unreadCount && c.unreadCount > 0) || (c.lastMessageSender === 'client' && c.isRead === false);
      if (isUnread) {
        unreadCount++;
        unreadList.push({
          id: c.id,
          phone: displayPhone,
          name: displayName,
          lastMessageSnippet: c.lastMessageSnippet || 'Mensagem não lida...',
          lastInteractionAt: c.lastInteractionAt,
          unreadCount: c.unreadCount || 1,
        });
      }

      if (c.lastMessageSender === 'client') {
        vacuumCount++;
        const waitMs = Math.max(0, now - c.lastInteractionAt);
        const waitMinutes = Math.floor(waitMs / (1000 * 60));
        const waitHours = (waitMs / (1000 * 60 * 60)).toFixed(1);

        let urgency: 'critical' | 'warning' | 'normal' = 'normal';
        if (waitMinutes >= 120) urgency = 'critical';
        else if (waitMinutes >= 30) urgency = 'warning';

        vacuumList.push({
          id: c.id,
          phone: displayPhone,
          name: displayName,
          lastMessageSnippet: c.lastMessageSnippet || 'Aguardando atendimento...',
          lastInteractionAt: c.lastInteractionAt,
          waitMinutes,
          waitHours,
          urgency,
        });

        const lastDay = dayNames[new Date(c.lastInteractionAt).getDay()];
        if (weekDaysMap[lastDay]) {
          weekDaysMap[lastDay].vacuo++;
        }
      } else {
        answeredCount++;
        if (c.lastMessageSender === 'human') {
          answeredByHuman++;
        } else {
          answeredByBot++;
        }
      }
    }

    vacuumList.sort((a, b) => b.waitMinutes - a.waitMinutes);
    unreadList.sort((a, b) => b.lastInteractionAt - a.lastInteractionAt);

    const weeklyDistributionData = Object.values(weekDaysMap);

    return {
      totalClients,
      totalClientMessages,
      totalResponses,
      answeredCount,
      answeredByBot,
      answeredByHuman,
      vacuumCount,
      unreadCount,
      messagedToday,
      messagedThisWeek,
      vacuumList,
      unreadList,
      weeklyDistributionData,
      attendantsActivity,
      responseRate: totalClients > 0 ? +((answeredCount / totalClients) * 100).toFixed(1) : 100,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 📝 REGISTRO DE MENSAGENS E ATUALIZAÇÃO DE CONTEXTO
  // ═══════════════════════════════════════════════════════════════════════════

  recordClientMessage(
    jid: string, 
    text: string, 
    pushName?: string, 
    leadInfo?: any,
    mediaType?: 'image' | 'audio' | 'document' | 'video',
    mediaUrl?: string,
    baileysId?: string
  ): ClientConversation | null {
    // BLINDAGEM TOTAL: Ignorar absolutamente qualquer grupo ou broadcast
    if (isGroupOrBroadcastJid(jid)) return null;

    // Se este ID de mensagem foi apagado anteriormente, JAMAIS adiciona/ressuscita!
    if (baileysId && this.deletedMessageIds.has(baileysId)) {
      return null;
    }

    const cleanId = this.extractCleanId(jid);
    const now = Date.now();
    let conv = this.getConversationRef(jid) || this.conversations.get(cleanId);

    const detectedIntent = this.detectIntent(text);
    const resolvedPhone = this.resolveRealPhone(jid);
    const displayPhone = resolvedPhone.displayPhone || cleanId;

    if (!conv) {
      const displayName = leadInfo?.name || pushName || `Contato ${displayPhone}`;
      conv = {
        id: cleanId,
        jid,
        name: displayName,
        phone: displayPhone,
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
        unreadCount: 1,
        isRead: false,
      };
      this.conversations.set(cleanId, conv);
    }

    // Atualiza nome se fornecido agora ou se era placeholder
    if (pushName && pushName.trim()) {
      const p = pushName.trim();
      const isPlaceholder = !conv.name || 
        conv.name.startsWith('Contato ') || 
        conv.name.startsWith('Cliente ') || 
        conv.name === 'Lead' || 
        conv.name === '❣️' || 
        conv.name.length <= 2 || 
        conv.name.replace(/\D/g, '').length >= 10;
      if (isPlaceholder) {
        conv.name = p;
      }
    }
    if (leadInfo?.name) {
      conv.name = leadInfo.name;
    }

    // Sempre garante que o telefone exibido seja o telefone real formatado
    if (displayPhone && (!conv.phone || conv.phone === cleanId || conv.phone.replace(/\D/g, '').length >= 14)) {
      conv.phone = displayPhone;
    }

    // Atualiza status e temperatura
    conv.lastInteractionAt = now;
    conv.lastMessageSnippet = text.slice(0, 120);
    conv.lastMessageSender = 'client';
    conv.messagesCount = (conv.messagesCount || 0) + 1;
    conv.unreadCount = (conv.unreadCount || 0) + 1;
    conv.isRead = false;

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

    // DEDUPLICAÇÃO BLINDADA: se esta mensagem exata já foi registrada nesta conversa, não duplica!
    if (baileysId && conv.messages.some(m => (m.baileysId && m.baileysId === baileysId) || m.id === baileysId)) {
      return conv;
    }

    const msgId = baileysId || `msg-${now}-${Math.random().toString(36).substring(2, 6)}`;
    if (this.deletedMessageIds.has(msgId)) {
      return conv;
    }

    conv.messages.push({
      id: msgId,
      baileysId,
      sender: 'client',
      text,
      timestamp: now,
      intentDetected: detectedIntent || undefined,
      mediaType,
      mediaUrl,
    });

    // Mantém no máximo 50 mensagens em memória por conversa para leveza
    if (conv.messages.length > 50) {
      conv.messages = conv.messages.slice(-50);
    }

    // Identifica e sincroniza classificação do contato (Cliente vs Amigo)
    const identified = this.identifyContact(jid, pushName, text, leadInfo);
    conv.contactType = identified.type;

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

    // Sincroniza dados com o Banco de Contatos Classificados
    const contact = this.classifiedContacts.get(cleanId);
    if (contact) {
      contact.lastMessageSnippet = text.slice(0, 120);
      contact.lastMessageSender = 'bot';
      contact.lastInteractionAt = now;
      contact.totalMessages = (contact.totalMessages || 0) + 1;
      this.saveContactsDatabase();
    }
  }

  recordHumanMessage(
    jid: string, 
    text: string, 
    mediaType?: 'image' | 'audio' | 'document' | 'video', 
    mediaUrl?: string,
    baileysId?: string
  ): void {
    if (isGroupOrBroadcastJid(jid)) return;

    if (baileysId && this.deletedMessageIds.has(baileysId)) {
      return;
    }

    const cleanId = this.extractCleanId(jid);
    let conv = this.getConversationRef(jid) || this.conversations.get(cleanId);
    const now = Date.now();

    const resolvedPhoneHuman = this.resolveRealPhone(jid);
    const displayPhoneHuman = resolvedPhoneHuman.displayPhone || cleanId;

    let validJid = jid;
    if (!validJid.includes('@')) {
      if (cleanId.length >= 14 && !cleanId.startsWith('55')) {
        validJid = `${cleanId}@lid`;
      } else {
        const d = cleanId.startsWith('55') ? cleanId : `55${cleanId}`;
        validJid = `${d}@s.whatsapp.net`;
      }
    }

    if (!conv) {
      conv = {
        id: cleanId,
        jid: validJid,
        name: `Contato ${displayPhoneHuman}`,
        phone: displayPhoneHuman,
        status: 'atendimento_humano',
        interestScore: 20,
        leadTemperature: 'morno',
        detectedIntents: [],
        businessContext: {},
        lastMessageSnippet: text.slice(0, 120),
        lastMessageSender: 'human',
        lastInteractionAt: now,
        createdAt: now,
        messagesCount: 0,
        messages: [],
        unreadCount: 0,
        isRead: true,
      };
      this.conversations.set(cleanId, conv);
    }

    if (conv) {
      conv.status = 'atendimento_humano';
      if (displayPhoneHuman) { conv.phone = displayPhoneHuman; }
      conv.lastInteractionAt = now;
      conv.lastMessageSnippet = text.slice(0, 120);
      conv.lastMessageSender = 'human';
      conv.messagesCount = (conv.messagesCount || 0) + 1;
      conv.unreadCount = 0;
      conv.isRead = true;

      // DEDUPLICAÇÃO BLINDADA
      if (baileysId && conv.messages.some(m => (m.baileysId && m.baileysId === baileysId) || m.id === baileysId)) {
        return;
      }

      const msgId = baileysId || `human-${now}-${Math.random().toString(36).substring(2, 6)}`;
      if (this.deletedMessageIds.has(msgId)) {
        return;
      }

      conv.messages.push({
        id: msgId,
        baileysId,
        sender: 'human',
        text,
        timestamp: now,
        mediaType,
        mediaUrl,
      });

      if (conv.messages.length > 50) {
        conv.messages = conv.messages.slice(-50);
      }

      this.saveConversationsToDisk();
    }

    // Sincroniza dados com o Banco de Contatos Classificados
    let contact = this.classifiedContacts.get(cleanId);
    if (!contact) {
      contact = {
        id: cleanId,
        jid,
        name: conv?.name || `Contato ${cleanId}`,
        phone: cleanId,
        type: 'cliente',
        category: 'Cliente Comercial',
        confidence: 'alta',
        reason: 'Atendimento manual / WhatsApp',
        classifiedBy: 'auto_detect',
        lastMessageSnippet: text.slice(0, 120),
        lastMessageSender: 'human',
        lastInteractionAt: now,
        createdAt: now,
        totalMessages: 1,
        botStatus: 'silenciado',
      };
      this.classifiedContacts.set(cleanId, contact);
    } else {
      contact.botStatus = 'silenciado';
      contact.lastMessageSnippet = text.slice(0, 120);
      contact.lastMessageSender = 'human';
      contact.lastInteractionAt = now;
      contact.totalMessages = (contact.totalMessages || 0) + 1;
    }
    this.saveContactsDatabase();
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
