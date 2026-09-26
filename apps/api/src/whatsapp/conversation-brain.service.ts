import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export type ContactType = 'cliente' | 'amigo';

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
}

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
  contactType?: ContactType;
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
  private classifiedContacts: Map<string, ClassifiedContact> = new Map();
  private config: ConversationConfig = { ...DEFAULT_CONFIG };

  constructor() {
    this.initDataDirectory();
    this.loadConfig();
    this.loadConversations();
    this.loadContactsDatabase();
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

  // ═══════════════════════════════════════════════════════════════════════════
  // 👥 BANCO DE DADOS DE CONTATOS (CLIENTES vs AMIGOS / PESSOAL)
  // ═══════════════════════════════════════════════════════════════════════════

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

  private saveContactsDatabase() {
    try {
      const list = Array.from(this.classifiedContacts.values());
      fs.writeFileSync(this.getContactsDatabaseFilePath(), JSON.stringify(list, null, 2), 'utf8');
    } catch (e: any) {
      this.logger.error(`Erro ao salvar whatsapp_contacts_database.json: ${e?.message}`);
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

  private saveConversationsToDisk() {
    try {
      const list = Array.from(this.conversations.values());
      fs.writeFileSync(this.getDatabaseFilePath(), JSON.stringify(list, null, 2), 'utf8');
    } catch (e: any) {
      this.logger.error(`Erro ao salvar conversations_database.json: ${e?.message}`);
    }
  }

  private extractCleanId(jidOrPhone: string): string {
    const raw = (jidOrPhone || '').split('@')[0].trim();
    const digits = raw.replace(/\D/g, '');
    if (digits.length >= 4) return digits;
    const slug = raw.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    return slug || `contact_${Date.now()}`;
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

  recordHumanMessage(jid: string, text: string): void {
    const cleanId = this.extractCleanId(jid);
    const conv = this.conversations.get(cleanId);
    const now = Date.now();

    if (conv) {
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
