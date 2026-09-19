import { Injectable, Logger, OnModuleInit, ForbiddenException } from '@nestjs/common';
import makeWASocket, { DisconnectReason, useMultiFileAuthState, Browsers } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import * as path from 'path';
import * as fs from 'fs';
import pino from 'pino';
import * as QRCode from 'qrcode';
import { WhatsappSafetyService } from './whatsapp-safety.service';
import { withTyping } from './typing';

interface UserSession {
  step: string;
  data: {
    tipo?: string;
    nome?: string;
    necessidade?: string;
    invalidTries?: number;
    humanHandled?: boolean;
    timestamp?: number;
    [key: string]: any;
  };
  timer?: NodeJS.Timeout;
}

// 🛡️ Motor Anti-Ban: Processador de Spintax para variação dinâmica de textos {Opção 1|Opção 2}

export interface HotLeadReply {
  id: string;
  phone: string;
  jid: string;
  pushName: string;
  leadName: string;
  category: string;
  text: string;
  templateName: string;
  timestamp: number;
  read: boolean;
  isRejected?: boolean;
}

export interface SdrConfig {
  enabled: boolean;
  businessName: string;
  businessNiche: string;
  intentResponses: {
    price: string;
    interested: string;
    moreInfo: string;
    human: string;
    notInterested: string;
  };
}

export function parseSpintax(text: string): string {
  if (!text) return text;
  const spintaxRegex = /(?<!\{)\{([^{}]*\|[^{}]*)\}(?!\})/g;
  let matches;
  let result = text;
  while ((matches = spintaxRegex.exec(result)) !== null) {
    const choices = matches[1].split('|');
    const randomChoice = choices[Math.floor(Math.random() * choices.length)];
    result = result.replace(matches[0], randomChoice);
    spintaxRegex.lastIndex = 0;
  }
  return result;
}

@Injectable()
export class WhatsappService implements OnModuleInit {
  private readonly logger = new Logger(WhatsappService.name);
  constructor(private readonly safety: WhatsappSafetyService) {}
  private sendInProgress = false;
  private sock: any;
  private qrCode: string | null = null;
  private rawQrCode: string | null = null;
  private isConnected = false;
  private isConnecting = false;
  private reconnectTimeout?: NodeJS.Timeout;

  // Armazena a sessão (estado e timer) de cada usuário em memória
  private userSessions = new Map<string, UserSession>();

  // Controle de ativação do robô automático de auto-resposta
  private isAutoReplyEnabled = true;

  // Controle da mensagem de cordialidade / boas-vindas inicial aos clientes
  private isCordialityEnabled = true;

  // Mapa de contatos sincronizados pelo WhatsApp (agenda de nomes do aparelho)
  private contactsMap = new Map<string, { name?: string; notify?: string }>();

  // Termos e apelidos pessoais padrão ignorados pelo robô (não responder como cliente)
  private defaultIgnoredContacts: string[] = [
    'dengosa',
    'leticia',
    'leticia tomais',
    'namorada',
    '26655322026119',
    '26655322026119@lid',
    'mae',
    'mãe',
    'familia',
    'família',
    'amor',
    'pai',
    'esposa',
    'marido',
    'namorado',
    'filho',
    'filha',
    'irma',
    'irmã',
    'irmao',
    'irmão',
    'tia',
    'tio',
    'sobrinho',
    'sobrinha',
    'vo',
    'vó',
    'vovô',
    'vovo',
    'primo',
    'prima',
  ];

  // Mapa de conversas com intervenção humana recente (Weverton conversou no chat)
  // senderId -> timestamp da última interação do usuário
  private humanHandledChats = new Map<string, number>();

  // IDs das mensagens enviadas pelo próprio robô (para não confundir com digitação manual do Weverton)
  private botSentMessageIds = new Set<string>();

  // Registro permanente de telefones de clientes já atendidos, contatados ou que interagiram
  
  // Lista de Respostas Recentes de Leads ("Leads Quentes")
  private hotLeads: HotLeadReply[] = [];

  // Configuração do Pré-Vendedor SDR Inteligente de Custo Zero (Multi-Nicho)
  private sdrConfig: SdrConfig = {
    enabled: true,
    businessName: 'WCTech',
    businessNiche: 'Criação de Sites, Sistemas e Automação',
    intentResponses: {
      price: '{Olá|Oi|Tudo bem?}! Ficamos muito felizes com seu interesse. Nossos valores variam de acordo com a complexidade e necessidade da sua empresa. Para te passarmos uma proposta exata e sem compromisso, você prefere que nosso especialista te ligue ou podemos enviar nossa tabela completa em PDF por aqui?',
      interested: '{Perfeito|Excelente|Muito obrigado pelo retorno!}! Preparamos um catálogo com nossas principais soluções e condições especiais. Você também pode conferir nossos projetos e avaliações no site oficial: https://wctech.web.app/ . Qual seria o melhor dia ou horário para conversarmos?',
      moreInfo: '{Com certeza|Perfeito!}! Desenvolvemos soluções sob medida focadas em gerar resultados, atrair clientes e simplificar sua rotina. Me conte brevemente: qual é o principal objetivo ou desafio da sua empresa no momento?',
      human: '{Com certeza|Entendido!}! Já notifiquei nosso especialista e ele assumirá a conversa com você aqui neste chat em instantes. Por favor, aguarde só um momento!',
      notInterested: '{Compreendo perfeitamente|Muito obrigado pela atenção!}! Caso precise no futuro, nossos canais continuam abertos. Desejamos muito sucesso para você e sua empresa!',
    }
  };

  private attendedPhones = new Map<string, { phone: string; reason: string; timestamp: number }>();

  // Estado da Fila de Disparos em Segundo Plano no Servidor (independente do navegador estar aberto)
  private serverDispatchQueue: {
    isRunning: boolean;
    isPaused: boolean;
    leads: Array<{
      id: string;
      name: string;
      phone: string;
      category?: string;
      message: string;
      image?: string;
      templateName?: string;
    }>;
    currentIndex: number;
    intervalSeconds: number;
    batchSize: number;
    batchPauseMinutes: number;
    sentInBatch: number;
    currentBatch: number;
    totalBatches: number;
    countdown: number;
    isBatchResting: boolean;
    batchRestCountdown: number;
    skipBatchRest: boolean;
    nextLead: { name: string; phone: string; category?: string } | null;
  } = {
    isRunning: false,
    isPaused: false,
    leads: [],
    currentIndex: 0,
    intervalSeconds: 240,
    batchSize: 10,
    batchPauseMinutes: 30,
    sentInBatch: 0,
    currentBatch: 1,
    totalBatches: 1,
    countdown: 0,
    isBatchResting: false,
    batchRestCountdown: 0,
    skipBatchRest: false,
    nextLead: null,
  };

  private serverDispatchTimer?: NodeJS.Timeout;

  // ═══════════════════════════════════════════════════════════════════
  // 🛡️ SISTEMA ANTI-BAN NÍVEL 2 — Controles Avançados de Segurança
  // ═══════════════════════════════════════════════════════════════════

  // Contador diário de mensagens enviadas (limite seguro: 40/dia para contas novas, 80/dia para contas aquecidas)
  private dailySendCount = 0;
  private dailySendDate: string = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  private readonly DAILY_LIMIT_SAFE = 40; // Máximo absoluto de mensagens por dia (hard cap)

  // Contador por hora para evitar spikes (max 8 por hora — Meta monitora bursts)
  private hourlySendCount = 0;
  private hourlySendHour: number = new Date().getHours();
  private readonly HOURLY_LIMIT = 8;

  // Warm-up: após conectar, esperar antes de disparar (evita detecção de "bot conectou e já começou a enviar")
  private connectionTimestamp: number = 0;
  private readonly WARMUP_DELAY_MS = 45_000; // 45 segundos mínimo após conexão

  // Horário comercial seguro (7h-20h) — fora desse horário o disparo é bloqueado
  private readonly SAFE_HOURS_START = 7;  // 07:00
  private readonly SAFE_HOURS_END = 20;   // 20:00

  // Cooldown entre leitura de presença e envio (evitar padrão "lê e responde instantaneamente")
  private lastPresenceUpdateTs: number = 0;

  // Rastreamento de quantas vezes o onWhatsApp foi consultado (Meta monitora lookups excessivos)
  private onWhatsAppLookupCount = 0;
  private onWhatsAppLookupHour: number = new Date().getHours();

  async onModuleInit() {
    this.loadHumanHandledChats();
    this.loadAttendedPhones();
    this.loadHotLeads();
    this.loadSdrConfig();
    this.logger.log('WhatsApp em modo seguro. Conecte explicitamente no painel.');
  }

  clearAuthFolder() {
    try {
      const authFolder = path.join(process.cwd(), 'auth_info_baileys');
      if (fs.existsSync(authFolder)) {
        fs.rmSync(authFolder, { recursive: true, force: true });
        this.logger.log('🗑️ Pasta auth_info_baileys limpa com sucesso.');
      }
    } catch (e: any) {
      this.logger.error(`Erro ao limpar pasta auth_info_baileys: ${e?.message}`);
    }
  }

  private async connectToWhatsApp(cleanAuth: boolean = false) {
    if (this.isConnecting) {
      this.logger.warn('Tentativa de conexão ignorada: processo de conexão já em andamento.');
      return;
    }
    this.isConnecting = true;

    const authFolder = path.join(process.cwd(), 'auth_info_baileys');

    if (cleanAuth) {
      this.clearAuthFolder();
    }

    if (!fs.existsSync(authFolder)) {
      fs.mkdirSync(authFolder, { recursive: true });
    }

    try {
      const { state, saveCreds } = await useMultiFileAuthState(authFolder);

      // Encerra socket antigo com segurança se existir
      if (this.sock) {
        try {
          this.sock.ev.removeAllListeners('connection.update');
          this.sock.ev.removeAllListeners('creds.update');
          this.sock.ev.removeAllListeners('messages.upsert');
          this.sock.end(undefined);
        } catch (e) {}
        this.sock = undefined;
      }

      this.sock = makeWASocket({
        auth: state,
        browser: Browsers.macOS('Desktop'),
        printQRInTerminal: false, // QR disponível somente no painel autenticado
        logger: pino({ level: 'silent' }) as any,
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 60000,
        keepAliveIntervalMs: 25000,
        syncFullHistory: false,
      });

      this.sock.ev.on('creds.update', saveCreds);

      this.sock.ev.on('connection.update', async (update: any) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          this.rawQrCode = qr;
          try {
            this.qrCode = await QRCode.toDataURL(qr, {
              margin: 2,
              scale: 8,
              errorCorrectionLevel: 'M',
            });
          } catch (err) {
            this.qrCode = qr;
          }
          this.logger.log('📱 Novo QR Code gerado! Pronto para leitura no painel.');
        }

        if (connection === 'close') {
          const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
          const isLoggedOut =
            statusCode === DisconnectReason.loggedOut ||
            statusCode === 401 ||
            statusCode === 403 ||
            statusCode === 500;

          this.isConnected = false;
          this.isConnecting = false;
          this.logger.warn(`Conexão WhatsApp fechada. Código: ${statusCode}. Deslogado/Sessão Inválida: ${isLoggedOut}`);

          if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = undefined;
          }

          if (isLoggedOut) {
            this.logger.log('Sessão expirada ou deslogada pelo celular. Limpando credenciais para gerar novo QR Code...');
            this.qrCode = null;
            this.rawQrCode = null;
            this.clearAuthFolder();
            this.logger.warn('Reconexão suspensa: reveja a sessão no painel.');
          } else {
            // Reconexão automática por oscilação de rede (408, 428, 515 restartRequired)
            this.reconnectTimeout = setTimeout(() => this.connectToWhatsApp(false), 3000);
          }
        } else if (connection === 'open') {
          this.logger.log('✅ Bot do WhatsApp conectado com sucesso!');
          this.isConnected = true;
          this.isConnecting = false;
          this.qrCode = null;
          this.rawQrCode = null;
          this.connectionTimestamp = Date.now();
          this.logger.log(`🛡️ [Anti-Ban] Warm-up ativado: aguardando ${Math.round(this.WARMUP_DELAY_MS / 1000)}s antes de permitir disparos.`);
        }
      });
    } catch (err: any) {
      this.isConnecting = false;
      this.logger.error(`Erro ao inicializar socket do WhatsApp: ${err?.message}`);
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = undefined;
      }
      this.reconnectTimeout = setTimeout(() => this.connectToWhatsApp(true), 3000);
    }

    // Sincronização abrangente de contatos e conversas da agenda do aparelho via Baileys
    this.sock.ev.on('messaging-history.set', ({ chats, contacts }: any) => {
      if (contacts && Array.isArray(contacts)) {
        for (const c of contacts) {
          if (c.id) {
            this.contactsMap.set(c.id, {
              name: c.name || (c as any).verifiedName || c.notify,
              notify: c.notify,
            });
          }
          if (c.lid) {
            this.contactsMap.set(c.lid, {
              name: c.name || (c as any).verifiedName || c.notify,
              notify: c.notify,
            });
          }
        }
      }
      if (chats && Array.isArray(chats)) {
        for (const ch of chats) {
          if (ch.id && ch.name) {
            const prev = this.contactsMap.get(ch.id) || {};
            this.contactsMap.set(ch.id, {
              name: ch.name || prev.name,
              notify: prev.notify,
            });
          }
        }
      }
    });

    this.sock.ev.on('contacts.set', ({ contacts }: any) => {
      if (contacts && Array.isArray(contacts)) {
        for (const c of contacts) {
          if (c.id) {
            this.contactsMap.set(c.id, {
              name: c.name || c.verifiedName || c.notify,
              notify: c.notify,
            });
          }
          if (c.lid) {
            this.contactsMap.set(c.lid, {
              name: c.name || c.verifiedName || c.notify,
              notify: c.notify,
            });
          }
        }
      }
    });

    this.sock.ev.on('chats.set', ({ chats }: any) => {
      if (chats && Array.isArray(chats)) {
        for (const ch of chats) {
          if (ch.id && ch.name) {
            const prev = this.contactsMap.get(ch.id) || {};
            this.contactsMap.set(ch.id, {
              name: ch.name || prev.name,
              notify: prev.notify,
            });
          }
        }
      }
    });

    this.sock.ev.on('chats.upsert', (chats: any[]) => {
      if (Array.isArray(chats)) {
        for (const ch of chats) {
          if (ch.id && ch.name) {
            const prev = this.contactsMap.get(ch.id) || {};
            this.contactsMap.set(ch.id, {
              name: ch.name || prev.name,
              notify: prev.notify,
            });
          }
        }
      }
    });

    this.sock.ev.on('chats.update', (updates: any[]) => {
      if (Array.isArray(updates)) {
        for (const ch of updates) {
          if (ch.id && ch.name) {
            const prev = this.contactsMap.get(ch.id) || {};
            this.contactsMap.set(ch.id, {
              name: ch.name || prev.name,
              notify: prev.notify,
            });
          }
        }
      }
    });

    this.sock.ev.on('contacts.upsert', (contacts: any[]) => {
      if (Array.isArray(contacts)) {
        for (const c of contacts) {
          if (c.id) {
            this.contactsMap.set(c.id, {
              name: c.name || c.verifiedName || c.notify,
              notify: c.notify,
            });
          }
          if (c.lid) {
            this.contactsMap.set(c.lid, {
              name: c.name || c.verifiedName || c.notify,
              notify: c.notify,
            });
          }
        }
      }
    });

    this.sock.ev.on('contacts.update', (updates: any[]) => {
      if (Array.isArray(updates)) {
        for (const u of updates) {
          if (u.id) {
            const prev = this.contactsMap.get(u.id) || {};
            this.contactsMap.set(u.id, {
              name: u.name || prev.name,
              notify: u.notify || prev.notify,
            });
          }
          if (u.lid) {
            const prev = this.contactsMap.get(u.lid) || {};
            this.contactsMap.set(u.lid, {
              name: u.name || prev.name,
              notify: u.notify || prev.notify,
            });
          }
        }
      }
    });

    // Regras Automáticas do Bot e Monitoramento de Intervenção Humana
    this.sock.ev.on('messages.upsert', async (event: any) => {
      // Record every opt-out in a batch before waiting on any outbound typing.
      for (const msg of event.messages || []) {
        if (msg.key?.fromMe || !msg.message) continue;
        const jid = msg.key?.remoteJid;
        if (!jid || !/^\d+@(s\.whatsapp\.net|lid)$/.test(jid)) continue;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || '';
        try {
          this.safety.recordInbound(jid, text, Number(msg.messageTimestamp) * 1000);
          const normalized = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
          if (this.detectRejectionIntent(normalized)) this.safety.suppress(jid, 'Pedido de interrupção recebido');
        } catch { this.logger.error('Falha ao registrar entrada; resposta suspensa.'); return; }
      }
      for (const msg of event.messages || []) {
        if (!msg.key) continue;
        try { await this.handleIncomingMessage(msg, event.type); }
        catch { this.logger.error('Falha no processamento da entrada; nenhuma retentativa automática.'); }
      }
    });
  }

  private async handleIncomingMessage(msg: any, eventType: string) {
      // Se a mensagem partiu do próprio Weverton / do seu aparelho WhatsApp:
      if (msg.key.fromMe) {
        // Se a mensagem foi disparada pelo próprio robô (fila ou resposta automática), NÃO é intervenção manual!
        if (msg.key.id && this.botSentMessageIds.has(msg.key.id)) {
          return;
        }
        const targetId = msg.key.remoteJid;
        if (targetId) {
          this.registerHumanIntervention(targetId);
        }
        return;
      }

      // Se o robô de auto-resposta estiver desativado globalmente, não processa
      // Descadastro é processado mesmo quando as respostas automáticas estão desligadas.

      if (!msg.message) return;

      const senderId = msg.key.remoteJid;
      // Ignorar grupos do WhatsApp (@g.us) e canais/broadcasts (@broadcast)
      if (!senderId || senderId.endsWith('@g.us') || senderId.endsWith('@broadcast')) {
        return;
      }

      const text = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || '';
      const normalized = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
      try {
        const timestamp = Number(msg.messageTimestamp) * 1000;
        // Historical sync must not manufacture a fresh service window.
        if (Number.isFinite(timestamp) && timestamp > 0) this.safety.recordInbound(senderId, text, timestamp);
        if (this.detectRejectionIntent(normalized)) {
          this.safety.suppress(senderId, 'Pedido de interrupção recebido no WhatsApp');
          const session = this.userSessions.get(senderId);
          if (session?.timer) clearTimeout(session.timer);
          this.userSessions.delete(senderId);
          this.registerAttendedPhone(senderId, 'Descadastro / desinteresse');
          return;
        }
      } catch {
        this.logger.error('Falha no registro de segurança; resposta automática suspensa.');
        return;
      }
      if (!this.isAutoReplyEnabled || eventType !== 'notify') return;
      const pushName = msg.pushName || '';

      // Registra automaticamente que o contato respondeu/interagiu para nunca mais ser re-prospectado friamente
      this.registerAttendedPhone(senderId, pushName ? `Cliente Respondeu no WhatsApp (${pushName})` : 'Cliente Respondeu no WhatsApp');

      // 1. Filtro de Segurança: Bloquear respostas para contatos pessoais e familiares (ex: Dengosa, Letícia, Mãe, Família, etc.)
      const ignoredCheck = this.isPersonalOrIgnoredContact(senderId, pushName);
      if (ignoredCheck.isIgnored) {
        this.logger.log(`🛡️ [Auto-Reply Ignorado] Contato pessoal detectado: "${pushName || senderId}" (regra: "${ignoredCheck.matchedTerm}"). Robô não responderá.`);
        return;
      }



      // 2. Filtro de Intervenção Humana: Se o Weverton está conversando nesse chat recentemente
      if (this.isHumanHandled(senderId)) {
        const lower = text.trim().toLowerCase();
        // O robô só reabre o atendimento se a pessoa pedir explicitamente "menu" ou "atendimento"
        if (lower === 'menu' || lower === 'atendimento' || lower === 'iniciar' || lower === 'inicio') {
          this.humanHandledChats.delete(senderId);
          this.saveHumanHandledChats();
          this.userSessions.delete(senderId);
          this.logger.log(`🔄 Cliente "${pushName || senderId}" solicitou reabertura do menu. Robô reativado para este chat.`);
        } else {
          this.logger.log(`🤫 [Silêncio Humano] Conversa com "${pushName || senderId}" está em atendimento humano por Weverton. Robô silenciado.`);
          return;
        }
      }

      if (!text) return;

      this.processIncomingLeadReply(senderId, pushName, text);
      this.logger.log('Mensagem recebida; política de envio aplicada.');
      await this.handleBotLogic(senderId, text);
  }

  // 🛡️ Reconhecimento Robusto de Desinteresse e Recusa (Fast-Exit Shield)
  detectRejectionIntent(normalizedText: string): boolean {
    if (!normalizedText) return false;
    const t = normalizedText;
    if (/^(sair|stop|cancelar|pare|parar)[\s.!]*$/i.test(t) || /\b(pare de enviar|nao quero receber)\b/i.test(t)) return true;

    // 1. Frases diretas de desinteresse
    if (/\b(nao\s+tenho\s+interesse|nao\s+temos\s+interesse|sem\s+interesse|nenhum\s+interesse|zero\s+interesse)\b/i.test(t)) {
      return true;
    }

    // 2. Não quero / não precisa / não preciso
    if (/\b(nao\s+quero|nao\s+queremos|nao\s+precisa|nao\s+preciso|nao\s+precisamos|nao\s+necessito|nao\s+temos\s+necessidade)\b/i.test(t)) {
      return true;
    }

    // 3. Obrigado não / Não, obrigado / Agradeço mas não
    if (/\b(obrigad[oa]\s+nao|obrigad[oa]\s+mas\s+nao|agradeco\s+mas\s+nao|agradeco\s+nao|nao\s+obrigad[oa]|nao\s+agradeco)\b/i.test(t)) {
      return true;
    }

    // 4. Já temos / já contratamos / já possuo / já conto com
    if (/\b(ja\s+temos|ja\s+possuimos|ja\s+possuo|ja\s+contratamos|ja\s+temos\s+empresa|ja\s+temos\s+suporte|ja\s+tenho\s+quem\s+faca|ja\s+temos\s+site|ja\s+temos\s+parceiro)\b/i.test(t)) {
      return true;
    }

    // 5. Dispensamos / deixa pra lá / no momento não
    if (/\b(dispensa|dispensamos|deixa\s+pra\s+la|deixa\s+quieto|nao\s+vlw|nao\s+valeu|agora\s+nao|por\s+enquanto\s+nao|no\s+momento\s+nao|hoje\s+nao)\b/i.test(t)) {
      return true;
    }

    // 6. Pedido explícito para sair / parar de mandar
    if (/\b(para\s+de\s+mandar|pare\s+de\s+mandar|tire\s+meu\s+numero|remover\s+meu\s+numero|remover\s+da\s+lista|sair\s+da\s+lista|nao\s+me\s+mande\s+mais|nao\s+incomode)\b/i.test(t)) {
      return true;
    }

    // 7. Resposta isolada ou negativa curta
    if (/^(nao|ñ|n|nop|nops)[\s\.,!]*$/i.test(t)) {
      return true;
    }

    // 8. Início explícito de negativa com ação ou despedida
    if (/^(nao|ñ)\s+(obrigad|valeu|vlw|quero|preciso|precisa|tenho|temos|vou|da|posso|tem)/i.test(t)) {
      return true;
    }

    return false;
  }

  markLeadAsRejected(senderId: string, replyText: string) {
    const cleanSenderPhone = senderId.split('@')[0].replace(/\D/g, '');

    // Atualiza nos Leads Quentes
    for (const h of this.hotLeads) {
      const hPhone = (h.phone || '').replace(/\D/g, '');
      if (h.jid === senderId || (hPhone && cleanSenderPhone && (cleanSenderPhone.includes(hPhone) || hPhone.includes(cleanSenderPhone)))) {
        h.isRejected = true;
        h.category = 'Recusado / Sem Interesse';
        h.read = true;
      }
    }
    this.saveHotLeadsToDisk();

    // Atualiza no Histórico de Disparos permanente
    const history = this.getDispatchedHistory();
    let modified = false;
    for (const record of history) {
      const recDigits = (record.phone || '').replace(/\D/g, '');
      if (recDigits && cleanSenderPhone && (cleanSenderPhone.includes(recDigits) || recDigits.includes(cleanSenderPhone))) {
        record.hasReplied = true;
        record.isRejected = true;
        record.replyText = replyText;
        record.repliedAt = Date.now();
        modified = true;
      }
    }
    if (modified) {
      try {
        fs.writeFileSync(this.getHistoryFilePath(), JSON.stringify(history, null, 2), 'utf8');
      } catch (e) {}
    }
  }

  private async handleBotLogic(senderId: string, text: string) {
    const trimmed = text.trim();
    const normalized = trimmed
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    const lower = trimmed.toLowerCase();

    // 🛡️ RECONHECIMENTO DE DESINTERESSE & ENCERRAMENTO IMEDIATO (PRIORIDADE ABSOLUTA #1)
    // Executa antes de qualquer outra intenção para encerrar o mais rápido possível e com máxima cortesia
    if (this.detectRejectionIntent(normalized)) {
      this.logger.log(`🚫 [Recusa/Desinteresse Detectado] Cliente ${senderId} informou desinteresse: "${text}"`);

      this.safety.suppress(senderId, 'Pedido de interrupção recebido');

      // 2. Silenciamento Total e Permanente do Robô para este contato
      this.registerHumanIntervention(senderId);
      this.registerAttendedPhone(senderId, 'Lead Recusou / Sem Interesse Declarado');

      // 3. Finaliza a sessão do robô e cancela qualquer timer pendente
      const currentSession = this.userSessions.get(senderId);
      if (currentSession?.timer) {
        clearTimeout(currentSession.timer);
      }
      this.userSessions.set(senderId, {
        step: 'FINALIZADO',
        data: { notInterested: true, rejectedAt: Date.now(), humanHandled: true }
      });

      // 4. Marca o Lead Quente e histórico como "Recusado / Sem Interesse" para manter o funil limpo
      this.markLeadAsRejected(senderId, text);
      return;
    }

    // 🤖 Pré-Vendedor SDR Inteligente de Custo Zero (Multi-Nicho)
    if (this.sdrConfig && this.sdrConfig.enabled) {
      // 1. Intenção de Preço / Orçamento
      const isPriceIntent = /\b(quanto\s*custa|qual\s*o\s*valor|preco|orcamento|tabela|quanto\s*e|valores|custo|orcar)\b/i.test(normalized);
      if (isPriceIntent) {
        const reply = parseSpintax(this.sdrConfig.intentResponses.price);
        await this.sendMessage(senderId, reply, undefined, 'service');
        this.logger.log(`🤖 [SDR Custo Zero] Resposta de Preço/Orçamento enviada para ${senderId}`);
        return;
      }

      // 2. Intenção de Interesse Positivo / Confirmação (COM DEFESA ANTI-FALSO-POSITIVO)
      const hasNegation = /\b(nao|n|ñ|sem|nem|nunca|jamais|dispens|recus)\b/i.test(normalized);
      const isPositiveIntent = !hasNegation && /\b(sim|tenho\s*interesse|pode\s*mandar|gostaria|pode\s*sim|quero|manda\s*ai|com\s*certeza|mande|claro|perfeito)\b/i.test(normalized);
      if (isPositiveIntent) {
        const reply = parseSpintax(this.sdrConfig.intentResponses.interested);
        await this.sendMessage(senderId, reply, undefined, 'service');
        this.logger.log(`🤖 [SDR Custo Zero] Resposta de Interesse/Catálogo enviada para ${senderId}`);
        return;
      }

      // 3. Intenção de Mais Informações / Explicação
      const isMoreInfoIntent = /\b(como\s*funciona|me\s*explica|detalhes|apresentacao|catalogo|portfolio|informacoes)\b/i.test(normalized);
      if (isMoreInfoIntent) {
        const reply = parseSpintax(this.sdrConfig.intentResponses.moreInfo);
        await this.sendMessage(senderId, reply, undefined, 'service');
        this.logger.log(`🤖 [SDR Custo Zero] Resposta de Detalhes enviada para ${senderId}`);
        return;
      }

      // 4. Intenção de Atendimento Humano
      const isHumanIntent = /\b(atendente|humano|falar\s*com|ligar|telefone|responsavel|weverton)\b/i.test(normalized);
      if (isHumanIntent) {
        const reply = parseSpintax(this.sdrConfig.intentResponses.human);
        await this.sendMessage(senderId, reply, undefined, 'service');
        this.registerHumanIntervention(senderId);
        this.logger.log(`🤖 [SDR Custo Zero] Transferência para Humano realizada para ${senderId}`);
        return;
      }
    }

    const existingSession = this.userSessions.get(senderId);

    // Se a conversa já foi finalizada ou transferida para o humano, o robô NÃO envia mais mensagens automáticas
    // a menos que o cliente digite expressamente "menu" para reabrir
    if (existingSession && existingSession.step === 'FINALIZADO') {
      const trimmedCmd = lower;
      if (trimmedCmd === 'menu' || trimmedCmd === 'iniciar' || trimmedCmd === 'inicio' || trimmedCmd === 'cancelar') {
        this.userSessions.delete(senderId);
      } else {
        // Silêncio: o atendimento já é do Weverton / Suporte humano
        this.logger.log(`Cliente ${senderId} já finalizado. Mensagem recebida tratada pelo atendente humano.`);
        return;
      }
    }

    const session: UserSession = this.userSessions.get(senderId) || { step: 'INICIO', data: {} };

    // Cancela o timer de inatividade anterior, se houver
    if (session.timer) {
      clearTimeout(session.timer);
      delete session.timer;
    }

    // Comandos explícitos para voltar ao menu inicial
    if (lower === 'cancelar' || lower === 'menu' || lower === 'iniciar' || lower === 'inicio') {
      session.step = 'INICIO';
    }

    switch (session.step) {
      case 'INICIO':
        // Se o SDR estiver ativo, mensagens gerais desconhecidas não recebem menu de câmeras/CFTV antigo:
        // Silencia para atendimento humano manual no WhatsApp
        if (this.sdrConfig && this.sdrConfig.enabled) {
          this.logger.log(`🤖 [SDR Custo Zero] Mensagem de ${senderId} não mapeada para intenções conhecidas. Silenciando para intervenção humana.`);
          this.registerHumanIntervention(senderId);
          return;
        }

        // Se a mensagem de cordialidade estiver pausada pelo usuário, não envia saudação automática
        if (!this.isCordialityEnabled) {
          this.logger.log(`⏸️ [Cordialidade Pausada] Mensagem de cordialidade/boas-vindas silenciada para ${senderId}.`);
          return;
        }

        // Envia a saudação inicial e o menu APENAS se o cliente tiver pedido explicitamente "menu"
        await this.sendMessage(
          senderId,
          `Olá! Bem-vindo(a) à *${this.sdrConfig?.businessName || 'WCTech'}*! 💻\n\n` +
          'Como podemos te ajudar?\n\n' +
          '*1️⃣* - Criação de Sites e Landing Pages\n' +
          '*2️⃣* - Sistemas e Aplicativos Sob Medida\n' +
          '*3️⃣* - Automação de Processos e WhatsApp\n' +
          '*4️⃣* - Falar com Especialista Técnico',
          undefined,
          'service'
        );
        session.step = 'MENU';
        break;

      case 'MENU':
        if (trimmed === '1' || lower.includes('empresa') || lower.includes('condominio') || lower.includes('condomínio')) {
          session.data.tipo = 'Empresarial';
          await this.sendMessage(senderId, 'Ótimo! Para começarmos, qual o seu nome ou o nome da sua empresa?', undefined, 'service');
          session.step = 'COLETA_NOME';
        } else if (trimmed === '2' || lower.includes('residencial') || lower.includes('casa')) {
          session.data.tipo = 'Residencial';
          await this.sendMessage(senderId, 'Perfeito! Para começarmos, qual é o seu nome?', undefined, 'service');
          session.step = 'COLETA_NOME';
        } else if (trimmed === '3' || lower.includes('suporte') || lower.includes('cliente')) {
          await this.sendMessage(senderId, 'Certo! Um de nossos técnicos de suporte já vai te atender aqui. Por favor, aguarde só um instante.', undefined, 'service');
          session.step = 'FINALIZADO';
        } else if (trimmed === '4' || lower.includes('weverton') || lower.includes('falar')) {
          await this.sendMessage(senderId, 'Tudo bem! Já notifiquei o Weverton e ele entrará em contato com você aqui nesta conversa em instantes.', undefined, 'service');
          session.step = 'FINALIZADO';
        } else {
          // Se a pessoa respondeu algo fora das opções do menu (ex: conversa normal):
          session.data.invalidTries = (session.data.invalidTries || 0) + 1;
          if (session.data.invalidTries >= 2) {
            this.logger.log(`Cliente ${senderId} respondeu fora das opções 2x. Silenciando robô e mantendo para atendimento humano.`);
            session.step = 'FINALIZADO';
            this.registerHumanIntervention(senderId);
            return;
          }
          await this.sendMessage(senderId, 'Por favor, digite o número da opção desejada:\n\n*1* - Empresa\n*2* - Residencial\n*3* - Suporte\n*4* - Falar com Weverton', undefined, 'service');
        }
        break;

      case 'COLETA_NOME':
        session.data.nome = trimmed;
        await this.sendMessage(
          senderId,
          `Muito prazer, *${trimmed}*! Qual serviço você gostaria de contratar?\n\n` +
          'Trabalhamos com:\n' +
          '• Instalação e Manutenção de Câmeras (CFTV)\n' +
          '• Alarme e Segurança Eletrônica\n' +
          '• Controle de Acesso\n' +
          '• Formatação de PC e Notebook\n' +
          '• Criação de Sites, Sistemas e Lojas Virtuais\n\n' +
          'Pode descrever brevemente o que você precisa:',
          undefined,
          'service'
        );
        session.step = 'COLETA_NECESSIDADE';
        break;

      case 'COLETA_NECESSIDADE':
        session.data.necessidade = trimmed;
        await this.sendMessage(
          senderId,
          `Perfeito! Entendi que você precisa de: *${trimmed}*.\n\n` +
          `Já organizei suas informações. O Weverton assumirá o atendimento agora mesmo para te passar detalhes e orçamento.\n\n` +
          `Aguarde só um instante!`,
          undefined,
          'service'
        );

        this.logger.log(
          `\n========================================\n` +
          `🎯 NOVO LEAD TRIADO COM SUCESSO!\n` +
          `Nome: ${session.data.nome}\n` +
          `Tipo: ${session.data.tipo}\n` +
          `Necessidade: ${session.data.necessidade}\n` +
          `Contato: ${senderId}\n` +
          `========================================\n`
        );

        session.step = 'FINALIZADO';
        break;
    }

    // Timer de inatividade de 5 minutos:
    // APENAS se o cliente já começou ativamente a fornecer dados de orçamento (COLETA_NOME ou COLETA_NECESSIDADE).
    // NUNCA no menu geral de opções e NUNCA se o Weverton já interagiu no chat.
    if (session.step === 'COLETA_NOME' || session.step === 'COLETA_NECESSIDADE') {
      session.timer = setTimeout(async () => {
        const current = this.userSessions.get(senderId);
        if (current && (current.step === 'COLETA_NOME' || current.step === 'COLETA_NECESSIDADE')) {
          if (this.isHumanHandled(senderId)) return;
          await this.sendMessage(
            senderId,
            'Oi! Percebi que você não respondeu. Gostaria de continuar seu atendimento? ⏱️\n' +
            'Pode digitar sua resposta a qualquer momento para continuarmos de onde paramos!',
            undefined,
            'service'
          );
        }
      }, 5 * 60 * 1000); // 5 minutos
    }

    this.userSessions.set(senderId, session);
  }

  // ═══════════════════════════════════════════════════════════════════
  // 🛡️ SISTEMA ANTI-BAN NÍVEL 2 — Métodos de Verificação de Segurança
  // ═══════════════════════════════════════════════════════════════════

  /** Reseta contadores diários e horários quando o dia/hora muda */
  private refreshRateLimitCounters() {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentHour = now.getHours();

    if (todayStr !== this.dailySendDate) {
      this.logger.log(`🛡️ [Anti-Ban] Novo dia detectado (${todayStr}). Contadores zerados.`);
      this.dailySendCount = 0;
      this.dailySendDate = todayStr;
    }

    if (currentHour !== this.hourlySendHour) {
      this.hourlySendCount = 0;
      this.hourlySendHour = currentHour;
    }

    if (currentHour !== this.onWhatsAppLookupHour) {
      this.onWhatsAppLookupCount = 0;
      this.onWhatsAppLookupHour = currentHour;
    }
  }

  /** Verifica se está dentro do horário comercial seguro */
  private isWithinSafeHours(): boolean {
    const hour = new Date().getHours();
    return hour >= this.SAFE_HOURS_START && hour < this.SAFE_HOURS_END;
  }

  /** Verifica se o período de warm-up pós-conexão já passou */
  private isWarmupComplete(): boolean {
    if (this.connectionTimestamp === 0) return true;
    return (Date.now() - this.connectionTimestamp) >= this.WARMUP_DELAY_MS;
  }

  /** Gate de segurança completo: retorna null se OK, ou string com motivo de bloqueio */
  private checkSafetyGate(): string | null {
    this.refreshRateLimitCounters();

    if (!this.isConnected) {
      return 'WhatsApp não conectado';
    }

    if (!this.isWarmupComplete()) {
      const remaining = Math.ceil((this.WARMUP_DELAY_MS - (Date.now() - this.connectionTimestamp)) / 1000);
      return `Warm-up ativo: aguarde mais ${remaining}s após conexão`;
    }

    if (!this.isWithinSafeHours()) {
      return `Fora do horário seguro (${this.SAFE_HOURS_START}h-${this.SAFE_HOURS_END}h). Disparo bloqueado para proteção.`;
    }

    if (this.dailySendCount >= this.DAILY_LIMIT_SAFE) {
      return `Limite diário atingido (${this.DAILY_LIMIT_SAFE} mensagens). Aguarde amanhã.`;
    }

    if (this.hourlySendCount >= this.HOURLY_LIMIT) {
      return `Limite horário atingido (${this.HOURLY_LIMIT}/hora). Aguarde a próxima hora.`;
    }

    return null; // Tudo OK
  }

  /** Incrementa contadores após envio bem-sucedido */
  private recordSuccessfulSend() {
    this.refreshRateLimitCounters();
    this.dailySendCount++;
    this.hourlySendCount++;
    this.logger.log(`🛡️ [Anti-Ban] Envio registrado: ${this.dailySendCount}/${this.DAILY_LIMIT_SAFE} diário | ${this.hourlySendCount}/${this.HOURLY_LIMIT} horário`);
  }

  /** Gera um delay humanizado com distribuição gaussiana (mais natural que uniforme) */
  private generateHumanDelay(baseMs: number, variationPercent: number = 0.35): number {
    // Box-Muller para distribuição gaussiana — imita padrão de digitação humana
    const u1 = Math.random();
    const u2 = Math.random();
    const gaussian = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    const variation = gaussian * variationPercent; // Desvio padrão = 35% do base
    const clamped = Math.max(-0.5, Math.min(0.5, variation)); // Clamp a ±50%
    return Math.max(1000, Math.round(baseMs * (1 + clamped)));
  }

  /** Throttle de lookup onWhatsApp (máx 30/hora para evitar detecção) */
  private canDoWhatsAppLookup(): boolean {
    this.refreshRateLimitCounters();
    return this.onWhatsAppLookupCount < 30;
  }

  private recordWhatsAppLookup() {
    this.onWhatsAppLookupCount++;
  }

  // Obter Status, QR Code e Status do Robô Automático
  getStatus() {
    this.refreshRateLimitCounters();
    return {
      connected: this.isConnected,
      qrCode: this.qrCode,
      rawQrCode: this.rawQrCode,
      isConnecting: this.isConnecting,
      autoReplyEnabled: this.isAutoReplyEnabled,
      cordialityEnabled: this.isCordialityEnabled,
      queue: this.getQueueStatus(),
      // 🛡️ Métricas de Segurança Anti-Ban
      antiBan: {
        dailySent: this.dailySendCount,
        dailyLimit: this.DAILY_LIMIT_SAFE,
        hourlySent: this.hourlySendCount,
        hourlyLimit: this.HOURLY_LIMIT,
        isWithinSafeHours: this.isWithinSafeHours(),
        isWarmupComplete: this.isWarmupComplete(),
        safetyGate: this.checkSafetyGate(),
      },
    };
  }

  setAutoReplyEnabled(enabled: boolean) {
    this.isAutoReplyEnabled = enabled;
    this.logger.log(`🤖 Robô automático de auto-respostas ${enabled ? 'ATIVADO' : 'DESATIVADO'}`);
    return { autoReplyEnabled: this.isAutoReplyEnabled };
  }

  setCordialityEnabled(enabled: boolean) {
    this.isCordialityEnabled = enabled;
    this.logger.log(`🤝 Mensagem de cordialidade/saudação ${enabled ? 'ATIVADA' : 'PAUSADA'}`);
    return { cordialityEnabled: this.isCordialityEnabled };
  }

  // Métodos de Controle da Fila de Disparo em Segundo Plano
  getQueueStatus() {
    return {
      isRunning: this.serverDispatchQueue.isRunning,
      isPaused: this.serverDispatchQueue.isPaused,
      totalLeads: this.serverDispatchQueue.leads.length,
      currentIndex: this.serverDispatchQueue.currentIndex,
      countdown: this.serverDispatchQueue.countdown,
      isBatchResting: this.serverDispatchQueue.isBatchResting,
      batchRestCountdown: this.serverDispatchQueue.batchRestCountdown,
      sentInBatch: this.serverDispatchQueue.sentInBatch,
      currentBatch: this.serverDispatchQueue.currentBatch,
      totalBatches: this.serverDispatchQueue.totalBatches,
      nextLead: this.serverDispatchQueue.nextLead,
    };
  }

  async startServerQueue(config: {
    leads: Array<{
      id: string;
      name: string;
      phone: string;
      category?: string;
      message: string;
      image?: string;
      templateName?: string;
    }>;
    image?: string;
    intervalSeconds?: number;
    batchSize?: number;
    batchPauseMinutes?: number;
  }) {
    if (this.serverDispatchQueue.isRunning) {
      this.stopServerQueue();
    }

    const campaignImage = config.image;
    const resolvedLeads = (config.leads || []).map(l => ({
      ...l,
      image: l.image || campaignImage || undefined,
    }));

    const intervalSecs = config.intervalSeconds && config.intervalSeconds > 0 ? config.intervalSeconds : 240;
    const bSize = config.batchSize && config.batchSize > 0 ? config.batchSize : 5; // 🛡️ Anti-Ban: 5 leads por lote
    const bPauseMins = config.batchPauseMinutes && config.batchPauseMinutes > 0 ? config.batchPauseMinutes : 30; // 🛡️ Anti-Ban: 30min de descanso entre lotes
    const totalBatches = Math.ceil(resolvedLeads.length / bSize);

    this.serverDispatchQueue = {
      isRunning: true,
      isPaused: false,
      leads: resolvedLeads,
      currentIndex: 0,
      intervalSeconds: intervalSecs,
      batchSize: bSize,
      batchPauseMinutes: bPauseMins,
      sentInBatch: 0,
      currentBatch: 1,
      totalBatches: totalBatches,
      countdown: 0,
      isBatchResting: false,
      batchRestCountdown: 0,
      skipBatchRest: false,
      nextLead: config.leads[0] ? {
        name: config.leads[0].name,
        phone: config.leads[0].phone,
        category: config.leads[0].category,
      } : null,
    };

    this.logger.log(`🚀 Iniciando fila de disparos em segundo plano no servidor para ${config.leads.length} clientes (Intervalo: ${intervalSecs}s | Lote: ${bSize} | Pausa: ${bPauseMins}m)`);
    this.runServerQueueLoop();
    return this.getQueueStatus();
  }

  pauseServerQueue() {
    this.serverDispatchQueue.isPaused = true;
    this.logger.log('⏸️ Fila de disparos pausada no servidor.');
    return this.getQueueStatus();
  }

  resumeServerQueue() {
    this.serverDispatchQueue.isPaused = false;
    this.logger.log('▶️ Fila de disparos retomada no servidor.');
    return this.getQueueStatus();
  }

  skipServerBatchRest() {
    this.serverDispatchQueue.skipBatchRest = true;
    this.logger.log('⏩ Descanso do lote adiantado pelo usuário no servidor.');
    return this.getQueueStatus();
  }

  stopServerQueue() {
    this.serverDispatchQueue.isRunning = false;
    this.serverDispatchQueue.isPaused = false;
    this.serverDispatchQueue.leads = [];
    this.serverDispatchQueue.currentIndex = 0;
    this.serverDispatchQueue.sentInBatch = 0;
    this.serverDispatchQueue.currentBatch = 1;
    this.serverDispatchQueue.countdown = 0;
    this.serverDispatchQueue.batchRestCountdown = 0;
    this.serverDispatchQueue.isBatchResting = false;
    this.serverDispatchQueue.skipBatchRest = false;
    this.serverDispatchQueue.nextLead = null;
    if (this.serverDispatchTimer) {
      clearTimeout(this.serverDispatchTimer);
      delete this.serverDispatchTimer;
    }
    this.logger.log('⏹️ Fila de disparos cancelada no servidor.');
    return this.getQueueStatus();
  }

  private async runServerQueueLoop() {
    while (this.serverDispatchQueue.isRunning && this.serverDispatchQueue.currentIndex < this.serverDispatchQueue.leads.length) {
      while (this.serverDispatchQueue.isPaused && this.serverDispatchQueue.isRunning) {
        await new Promise(r => setTimeout(r, 1000));
      }

      if (!this.serverDispatchQueue.isRunning) break;

      const idx = this.serverDispatchQueue.currentIndex;
      const currentLead = this.serverDispatchQueue.leads[idx];
      if (!currentLead) break;

      // 🛡️ Proteção Anti-Reenvio: Garante que leads já atendidos ou contatados nunca recebam mensagens repetidas
      if (this.isAttendedPhone(currentLead.phone)) {
        this.logger.warn(`🛡️ [Anti-Reenvio Servidor] Cliente "${currentLead.name}" (${currentLead.phone}) já foi atendido anteriormente. Pulando envio.`);
        this.serverDispatchQueue.currentIndex = idx + 1;
        continue;
      }

      this.logger.log(`[Fila Servidor ${idx + 1}/${this.serverDispatchQueue.leads.length}] Disparando para ${currentLead.name} (${currentLead.phone})...`);

      // Envia a mensagem com ou sem imagem
      let sendSuccess = false;
      let sendResult: any = null;
      try {
        sendResult = await this.sendMessage(currentLead.phone, currentLead.message, currentLead.image);
        sendSuccess = sendResult?.success || false;

        // 🛡️ Se o envio foi bloqueado pelo Escudo Anti-Ban (limite diário, limite horário, horário comercial ou warm-up):
        // Pausa a fila preventivamente para proteger o número. O lead atual é mantido no índice para retomada futura!
        if (!sendSuccess && sendResult?.message?.includes('[Proteção Anti-Ban]')) {
          this.logger.warn(`🛡️ [Fila Anti-Ban] Fila pausada automaticamente para proteger o chip: ${sendResult.message}`);
          this.serverDispatchQueue.isPaused = true;
          await new Promise(r => setTimeout(r, 2000));
          continue;
        }
        
        // Grava no histórico permanente
        const now = new Date();
        const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        const dateLabel = `Hoje, ${now.getDate()} de ${meses[now.getMonth()]} de ${now.getFullYear()}`;
        this.saveDispatchedHistory({
          leadId: currentLead.id,
          leadName: currentLead.name,
          phone: currentLead.phone,
          category: currentLead.category || 'Geral',
          date: now.toLocaleDateString('pt-BR'),
          dateLabel,
          time: now.toLocaleTimeString('pt-BR'),
          messageSent: currentLead.message,
          templateName: currentLead.templateName || 'Modelo Automático',
          status: sendSuccess ? 'SENT' : 'FAILED',
          hasImage: !!currentLead.image,
        });
      } catch (err: any) {
        this.logger.error(`Erro ao disparar na fila para ${currentLead.name}:`, err?.message || err);
      }

      this.serverDispatchQueue.currentIndex = idx + 1;
      this.serverDispatchQueue.sentInBatch++;

      const hasMore = this.serverDispatchQueue.currentIndex < this.serverDispatchQueue.leads.length;
      if (!hasMore || !this.serverDispatchQueue.isRunning) break;

      // Define o próximo cliente que receberá mensagem
      const nextUpcoming = this.serverDispatchQueue.leads[this.serverDispatchQueue.currentIndex];
      this.serverDispatchQueue.nextLead = nextUpcoming ? {
        name: nextUpcoming.name,
        phone: nextUpcoming.phone,
        category: nextUpcoming.category,
      } : null;

      // Verifica se completou o lote (ex: 10 clientes)
      if (this.serverDispatchQueue.sentInBatch >= this.serverDispatchQueue.batchSize) {
        this.serverDispatchQueue.isBatchResting = true;
        this.serverDispatchQueue.skipBatchRest = false;
        const totalRestSecs = this.serverDispatchQueue.batchPauseMinutes * 60;
        this.logger.log(`🛡️ Lote ${this.serverDispatchQueue.currentBatch} concluído no servidor. Entrando em descanso por ${this.serverDispatchQueue.batchPauseMinutes} minutos.`);

        for (let rSec = totalRestSecs; rSec > 0; rSec--) {
          if (!this.serverDispatchQueue.isRunning || this.serverDispatchQueue.skipBatchRest) break;
          while (this.serverDispatchQueue.isPaused && this.serverDispatchQueue.isRunning) {
            await new Promise(r => setTimeout(r, 1000));
          }
          this.serverDispatchQueue.batchRestCountdown = rSec;
          await new Promise(r => setTimeout(r, 1000));
        }

        this.serverDispatchQueue.isBatchResting = false;
        this.serverDispatchQueue.batchRestCountdown = 0;
        this.serverDispatchQueue.skipBatchRest = false;
        if (!this.serverDispatchQueue.isRunning) break;

        this.serverDispatchQueue.currentBatch++;
        this.serverDispatchQueue.sentInBatch = 0;
        this.logger.log(`Iniciando Lote ${this.serverDispatchQueue.currentBatch} de ${this.serverDispatchQueue.totalBatches} no servidor.`);
      } else {
        // 🛡️ Intervalo com variação orgânica dinâmica (Jitter Anti-Ban de ±20%)
        // Evita cadência mecânica rígida monitorada pelos algoritmos da Meta
        const baseInterval = this.serverDispatchQueue.intervalSeconds;
        const jitterPercent = (Math.random() * 0.4) - 0.2; // -20% a +20%
        const actualInterval = Math.max(30, Math.round(baseInterval * (1 + jitterPercent)));

        for (let sec = actualInterval; sec > 0; sec--) {
          if (!this.serverDispatchQueue.isRunning) break;
          while (this.serverDispatchQueue.isPaused && this.serverDispatchQueue.isRunning) {
            await new Promise(r => setTimeout(r, 1000));
          }
          this.serverDispatchQueue.countdown = sec;
          await new Promise(r => setTimeout(r, 1000));
        }
        this.serverDispatchQueue.countdown = 0;
      }
    }

    this.logger.log('✅ Fila de disparos em segundo plano no servidor finalizada com sucesso!');
    this.stopServerQueue();
  }

  async reconnect(forceNewSession: boolean = true) {
    this.logger.log(`🔄 Solicitada reconexão do WhatsApp (forceNewSession: ${forceNewSession})...`);

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = undefined;
    }

    this.isConnected = false;
    this.qrCode = null;
    this.rawQrCode = null;

    if (this.sock) {
      try {
        this.sock.ev.removeAllListeners('connection.update');
        this.sock.ev.removeAllListeners('creds.update');
        this.sock.ev.removeAllListeners('messages.upsert');
        this.sock.end(undefined);
      } catch (e) {}
      this.sock = undefined;
    }

    this.isConnecting = false;

    if (forceNewSession || !this.isConnected) {
      this.clearAuthFolder();
    }

    await new Promise(r => setTimeout(r, 400));
    await this.connectToWhatsApp(forceNewSession);
  }

  async disconnect() {
    this.logger.log('🔌 Desconectando WhatsApp e despareando aparelho...');
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = undefined;
    }
    if (this.sock) {
      try {
        await this.sock.logout();
      } catch (e) {}
      try {
        this.sock.ev.removeAllListeners('connection.update');
        this.sock.end(undefined);
      } catch (e) {}
      this.sock = undefined;
    }
    this.isConnected = false;
    this.qrCode = null;
    this.rawQrCode = null;
    this.isConnecting = false;
    this.clearAuthFolder();
    // Reconexão somente por ação explícita no painel.
  }

  // Normalização e geração de candidatos para números brasileiros (Manaus DDD 92 e nacional)
  private normalizeBrazilianPhone(rawPhone: string): { clean: string; candidates: string[] } {
    let clean = rawPhone.replace(/\D/g, '');
    
    // Remove repetição acidental de 55 no início (ex: 5555...)
    while (clean.startsWith('5555') && clean.length >= 14) {
      clean = clean.slice(2);
    }

    const candidates: string[] = [];

    // Caso 1: Começa com 55 e tem 11 dígitos (ex: 55993560683 - 55 DDI + 9 dígitos locais sem DDD)
    if (clean.startsWith('55') && clean.length === 11) {
      const nineDigits = clean.slice(2);
      // Prioridade 1: Assume Manaus (DDD 92) com os 9 dígitos
      candidates.push(`5592${nineDigits}`);
      // Sem o nono dígito
      candidates.push(`5592${nineDigits.slice(1)}`);
      // Prioridade 2: Assume que é DDD 55 (Rio Grande do Sul)
      candidates.push(`55${clean}`);
      const ddd55Rest = clean.slice(3);
      candidates.push(`5555${ddd55Rest}`);
      return { clean, candidates };
    }

    let national = clean;
    // Se já começa com 55 e tem pelo menos 12 dígitos (55 + DDD + número)
    if (national.startsWith('55') && national.length >= 12) {
      national = national.slice(2);
    }

    // Se faltar o DDD (8 ou 9 dígitos), assume Manaus (DDD 92)
    if (national.length === 8) {
      const first = national[0];
      const nineDigit = ['6', '7', '8', '9'].includes(first) ? `9${national}` : national;
      national = `92${nineDigit}`;
    } else if (national.length === 9) {
      national = `92${national}`;
    }

    // Celular padrão de 11 dígitos (DDD 2 dígitos + 9 dígitos)
    if (national.length === 11) {
      const ddd = national.slice(0, 2);
      const ninthDigit = national[2];
      const rest = national.slice(3);

      // Formato padrão com 9
      candidates.push(`55${national}`);

      // Formato legado sem o 9 (contas antigas do WhatsApp no Brasil)
      if (ninthDigit === '9') {
        candidates.push(`55${ddd}${rest}`);
      }
    } else if (national.length === 10) {
      // 10 dígitos (DDD + 8 dígitos)
      const ddd = national.slice(0, 2);
      const firstDigit = national[2];
      const rest = national.slice(2);

      // Se começar com 6, 7, 8 ou 9, é celular que está sem o nono dígito
      if (['6', '7', '8', '9'].includes(firstDigit)) {
        candidates.push(`55${ddd}9${rest}`);
      }
      candidates.push(`55${national}`);
    } else {
      candidates.push(`55${clean}`);
      candidates.push(clean);
    }

    return { clean, candidates };
  }

  // All outbound paths share this gate; typing is a conversational indicator only.
  async sendMessage(to: string, text: string, imageBase64OrUrl?: string, purpose: 'marketing' | 'service' = 'marketing'): Promise<{ success: boolean; message: string; jid?: string; isLandline?: boolean }> {
    if (this.sendInProgress) return { success: false, message: 'SEND_BUSY: aguarde o envio em andamento.' };
    if (!this.sock || !this.isConnected) return { success: false, message: 'CHANNEL_DISCONNECTED: conecte o canal no painel.' };
    if (typeof to !== 'string' || !/^\d{6,20}@(s\.whatsapp\.net|lid)$/.test(to)) {
      return { success: false, message: 'INVALID_RECIPIENT: responda somente a uma conversa recebida válida.' };
    }
    if (typeof text !== 'string' || !text.trim() || text.length > 4096) return { success: false, message: 'INVALID_TEXT: use de 1 a 4096 caracteres.' };
    // Legacy service replies are text-only; arbitrary remote URLs are never fetched.
    if (imageBase64OrUrl) return { success: false, message: 'MEDIA_REQUIRES_OFFICIAL_API: mídia indisponível neste modo.' };
    this.sendInProgress = true;
    let reservation: string | undefined;
    let transportStarted = false;
    const socket = this.sock;
    try {
      const finalText = parseSpintax(text);
      reservation = this.safety.reserve(to, finalText, purpose);
      const sent = await withTyping({
        text: finalText,
        enabled: this.safety.getStatus().typingEnabled,
        presence: state => socket.sendPresenceUpdate(state, to),
        assertAllowed: () => {
          this.safety.assertStillAllowed(to, purpose);
          if (this.sock !== socket || !this.isConnected || !this.isAutoReplyEnabled) throw new ForbiddenException('SEND_CANCELED: canal ou atendimento pausado.');
        },
        send: async () => {
          transportStarted = true;
          return socket.sendMessage(to, { text: finalText });
        },
      });
      if (sent?.key?.id) {
        this.botSentMessageIds.add(sent.key.id);
        setTimeout(() => this.botSentMessageIds.delete(sent.key.id), 5 * 60 * 1000).unref();
      }
      this.safety.complete(reservation, 'sent');
      return { success: true, message: 'Mensagem aceita pelo canal; entrega não confirmada.', jid: to };
    } catch (error: any) {
      if (reservation) {
        try { this.safety.complete(reservation, transportStarted ? 'unknown' : 'failed'); }
        catch { this.logger.error('Registro de envio indisponível; envios bloqueados pelo controle de segurança.'); }
      }
      return { success: false, message: transportStarted ? 'SEND_UNKNOWN: resultado incerto; não reenviar automaticamente.' : (error?.message || 'SEND_BLOCKED') };
    } finally {
      this.sendInProgress = false;
    }
  }
  // Persistência em disco do Histórico de Disparos (data/whatsapp_history.json)
  private getHistoryFilePath(): string {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    return path.join(dataDir, 'whatsapp_history.json');
  }


  // --- MÉTODOS DE LEAD QUENTE, TESTE A/B E SDR INTELIGENTE CUSTO ZERO ---

  private getHotLeadsFilePath(): string {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    return path.join(dataDir, 'hot_leads.json');
  }

  private loadHotLeads() {
    try {
      const file = this.getHotLeadsFilePath();
      if (fs.existsSync(file)) {
        const raw = fs.readFileSync(file, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) this.hotLeads = parsed;
      }
    } catch (e) {
      this.logger.error('Erro ao ler hot_leads.json:', e);
    }
  }

  private saveHotLeadsToDisk() {
    try {
      const file = this.getHotLeadsFilePath();
      fs.writeFileSync(file, JSON.stringify(this.hotLeads.slice(0, 200), null, 2), 'utf8');
    } catch (e) {
      this.logger.error('Erro ao salvar hot_leads.json:', e);
    }
  }

  getHotLeads(): { hotLeads: HotLeadReply[]; unreadCount: number } {
    const unreadCount = this.hotLeads.filter(h => !h.read).length;
    return { hotLeads: this.hotLeads, unreadCount };
  }

  markHotLeadsAsRead(): boolean {
    this.hotLeads = this.hotLeads.map(h => ({ ...h, read: true }));
    this.saveHotLeadsToDisk();
    return true;
  }

  private getSdrConfigFilePath(): string {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    return path.join(dataDir, 'sdr_config.json');
  }

  private loadSdrConfig() {
    try {
      const file = this.getSdrConfigFilePath();
      if (fs.existsSync(file)) {
        const raw = fs.readFileSync(file, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          this.sdrConfig = { ...this.sdrConfig, ...parsed };
        }
      }
    } catch (e) {
      this.logger.error('Erro ao ler sdr_config.json:', e);
    }
  }

  getSdrConfig(): SdrConfig {
    return this.sdrConfig;
  }

  saveSdrConfig(newConfig: Partial<SdrConfig>): SdrConfig {
    this.sdrConfig = {
      ...this.sdrConfig,
      ...newConfig,
      intentResponses: {
        ...this.sdrConfig.intentResponses,
        ...(newConfig.intentResponses || {})
      }
    };
    try {
      fs.writeFileSync(this.getSdrConfigFilePath(), JSON.stringify(this.sdrConfig, null, 2), 'utf8');
    } catch (e) {
      this.logger.error('Erro ao salvar sdr_config.json:', e);
    }
    return this.sdrConfig;
  }

  // Processa a resposta recebida, marcando como Lead Quente e rastreando para o Teste A/B
  private processIncomingLeadReply(senderId: string, pushName: string, text: string) {
    if (!text || !text.trim()) return;

    const rawNumber = senderId.split('@')[0].replace(/\D/g, '');
    const cleanDisplayPhone = this.formatPhoneForDisplay(rawNumber);

    // Procura no histórico de disparos qual modelo de mensagem foi enviado para este número
    const history = this.getDispatchedHistory();
    let matchedIndex = -1;
    let matchedRecord: any = null;

    for (let i = 0; i < history.length; i++) {
      const h = history[i];
      const hPhone = (h.phone || '').replace(/\D/g, '');
      if (hPhone && (rawNumber.endsWith(hPhone) || hPhone.endsWith(rawNumber) || rawNumber.slice(-8) === hPhone.slice(-8))) {
        matchedIndex = i;
        matchedRecord = h;
        break;
      }
    }

    const templateName = matchedRecord?.templateName || 'Modelo Direto';
    const leadName = matchedRecord?.leadName || pushName || 'Lead';
    const category = matchedRecord?.category || 'Geral';
    const normalized = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    const isRejection = this.detectRejectionIntent(normalized);

    // Atualiza o histórico para o cálculo do Teste A/B
    if (matchedRecord && matchedIndex >= 0) {
      history[matchedIndex].hasReplied = true;
      history[matchedIndex].replyText = text;
      history[matchedIndex].repliedAt = Date.now();
      if (isRejection) {
        history[matchedIndex].isRejected = true;
      }
      try {
        fs.writeFileSync(this.getHistoryFilePath(), JSON.stringify(history, null, 2), 'utf8');
      } catch (e) {}
    }

    // Registra como Lead Quente se não foi registrado nos últimos 30 minutos
    const recentDuplicate = this.hotLeads.find(
      h => (h.jid === senderId || h.phone === cleanDisplayPhone) && Date.now() - h.timestamp < 30 * 60 * 1000
    );

    if (!recentDuplicate) {
      const newHotLead: HotLeadReply = {
        id: `hot-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        phone: cleanDisplayPhone || rawNumber,
        jid: senderId,
        pushName: pushName || '',
        leadName,
        category: isRejection ? 'Recusado / Sem Interesse' : category,
        text,
        templateName,
        timestamp: Date.now(),
        read: isRejection ? true : false,
        isRejected: isRejection
      };

      this.hotLeads = [newHotLead, ...this.hotLeads.slice(0, 199)];
      this.saveHotLeadsToDisk();
      this.logger.log(`🔥 [LEAD QUENTE] ${leadName} (${cleanDisplayPhone}) respondeu ao ${templateName}: "${text}"`);
    }
  }

  // Métricas do Teste A/B de Modelos de Mensagem
  getAbAnalytics() {
    const history = this.getDispatchedHistory();
    const statsMap = new Map<string, { dispatched: number; replied: number }>();

    for (const record of history) {
      if (record.status !== 'SENT') continue;
      const tpl = record.templateName || 'Padrão';
      const current = statsMap.get(tpl) || { dispatched: 0, replied: 0 };
      current.dispatched += 1;
      if (record.hasReplied) {
        current.replied += 1;
      }
      statsMap.set(tpl, current);
    }

    let totalDispatched = 0;
    let totalReplied = 0;

    const templates = Array.from(statsMap.entries()).map(([templateName, data]) => {
      totalDispatched += data.dispatched;
      totalReplied += data.replied;
      const conversionRate = data.dispatched > 0 ? Number(((data.replied / data.dispatched) * 100).toFixed(1)) : 0;
      return {
        templateName,
        dispatched: data.dispatched,
        replied: data.replied,
        conversionRate,
        isChampion: false
      };
    });

    // Determina o modelo campeão com maior taxa de resposta
    if (templates.length > 0) {
      templates.sort((a, b) => b.conversionRate - a.conversionRate || b.replied - a.replied);
      if (templates[0].replied > 0) {
        templates[0].isChampion = true;
      }
    }

    const globalRate = totalDispatched > 0 ? Number(((totalReplied / totalDispatched) * 100).toFixed(1)) : 0;

    return {
      templates,
      totalDispatched,
      totalReplied,
      globalRate
    };
  }

  getDispatchedHistory(): any[] {
    try {
      const file = this.getHistoryFilePath();
      if (fs.existsSync(file)) {
        const raw = fs.readFileSync(file, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      this.logger.error('Erro ao ler whatsapp_history.json:', e);
    }
    return [];
  }

  // Formata qualquer telefone para a exibição limpa sem 55 no início: (DD) 9XXXX-XXXX
  formatPhoneForDisplay(rawPhone: string): string {
    if (!rawPhone) return '';
    let clean = rawPhone.replace(/\D/g, '');
    if (!clean) return rawPhone;

    while (clean.startsWith('5555') && clean.length >= 14) {
      clean = clean.slice(2);
    }

    let national = clean;
    if (national.startsWith('55') && (national.length === 12 || national.length === 13)) {
      national = national.slice(2);
    } else if (national.startsWith('55') && national.length === 11) {
      national = `92${national.slice(2)}`;
    } else if (national.length === 8) {
      const first = national[0];
      const nineDigit = ['6', '7', '8', '9'].includes(first) ? `9${national}` : national;
      national = `92${nineDigit}`;
    } else if (national.length === 9) {
      national = `92${national}`;
    }

    if (national.length === 11) {
      const ddd = national.slice(0, 2);
      return `(${ddd}) ${national.slice(2, 7)}-${national.slice(7)}`;
    }
    if (national.length === 10) {
      const ddd = national.slice(0, 2);
      return `(${ddd}) ${national.slice(2, 6)}-${national.slice(6)}`;
    }
    return rawPhone;
  }

  saveDispatchedHistory(record: any): any[] {
    try {
      const cleanPhone = this.formatPhoneForDisplay(record.phone);
      // Sanitiza: remove qualquer base64 pesado para manter o histórico leve e rápido
      const sanitized = {
        ...record,
        phone: cleanPhone || record.phone,
        imageUrl: record.imageUrl && record.imageUrl.startsWith('data:image') ? undefined : record.imageUrl,
      };

      const current = this.getDispatchedHistory();
      // Não duplica se for o mesmo lead no mesmo dia
      const exists = current.some(c => c.leadId === sanitized.leadId && c.date === sanitized.date && c.time === sanitized.time);
      const updated = exists 
        ? current 
        : [sanitized, ...current.filter(c => !(c.leadId === sanitized.leadId && c.date === sanitized.date))];

      const file = this.getHistoryFilePath();
      fs.writeFileSync(file, JSON.stringify(updated, null, 2), 'utf8');
      this.logger.log(`Histórico salvo em disco no servidor: ${sanitized.leadName} (${sanitized.phone})`);

      if (sanitized.status === 'SENT') {
        this.registerAttendedPhone(sanitized.phone, `Disparado na Campanha (${sanitized.leadName || 'Lead'})`);
      }

      return updated;
    } catch (e) {
      this.logger.error('Erro ao salvar whatsapp_history.json no servidor:', e);
      return [];
    }
  }

  clearDispatchedHistory(): boolean {
    try {
      const file = this.getHistoryFilePath();
      fs.writeFileSync(file, JSON.stringify([], null, 2), 'utf8');
      this.logger.log('Histórico de disparos zerado no servidor.');
      return true;
    } catch (e) {
      this.logger.error('Erro ao limpar whatsapp_history.json:', e);
      return false;
    }
  }

  // Normalização de texto sem acentos e minúsculo
  private normalizeText(str: string): string {
    return (str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  // Persistência em disco dos contatos/termos pessoais ignorados
  private getIgnoredContactsFilePath(): string {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    return path.join(dataDir, 'whatsapp_ignored_contacts.json');
  }

  getIgnoredContacts(): string[] {
    try {
      const file = this.getIgnoredContactsFilePath();
      if (fs.existsSync(file)) {
        const raw = fs.readFileSync(file, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      this.saveIgnoredContacts(this.defaultIgnoredContacts);
      return this.defaultIgnoredContacts;
    } catch (e) {
      this.logger.error('Erro ao ler whatsapp_ignored_contacts.json:', e);
      return this.defaultIgnoredContacts;
    }
  }

  saveIgnoredContacts(list: string[]): string[] {
    try {
      const unique = Array.from(new Set(list.map(s => s.trim()).filter(Boolean)));
      const file = this.getIgnoredContactsFilePath();
      fs.writeFileSync(file, JSON.stringify(unique, null, 2), 'utf8');
      this.logger.log(`Lista de contatos pessoais ignorados atualizada (${unique.length} termos/números).`);
      return unique;
    } catch (e) {
      this.logger.error('Erro ao salvar whatsapp_ignored_contacts.json:', e);
      return list;
    }
  }

  // Persistência em disco das conversas em atendimento humano (silenciadas pelo robô)
  private getHumanChatsFilePath(): string {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    return path.join(dataDir, 'whatsapp_human_chats.json');
  }

  loadHumanHandledChats() {
    try {
      const file = this.getHumanChatsFilePath();
      if (fs.existsSync(file)) {
        const raw = fs.readFileSync(file, 'utf8');
        const parsed = JSON.parse(raw);
        if (typeof parsed === 'object' && parsed !== null) {
          for (const [k, v] of Object.entries(parsed)) {
            this.humanHandledChats.set(k, Number(v) || Date.now());
          }
          this.logger.log(`Carregadas ${this.humanHandledChats.size} conversas sob controle humano.`);
        }
      }
    } catch (e) {
      this.logger.error('Erro ao carregar whatsapp_human_chats.json:', e);
    }
  }

  saveHumanHandledChats() {
    try {
      const file = this.getHumanChatsFilePath();
      const obj: Record<string, number> = {};
      for (const [k, v] of this.humanHandledChats.entries()) {
        obj[k] = v;
      }
      fs.writeFileSync(file, JSON.stringify(obj, null, 2), 'utf8');
    } catch (e) {
      this.logger.error('Erro ao salvar whatsapp_human_chats.json:', e);
    }
  }

  isHumanHandled(senderId: string): boolean {
    if (!this.humanHandledChats.has(senderId)) return false;
    // Conversas atendidas pelo atendente humano ficam em silêncio PERMANENTE (removido limite de 48h para evitar reenvio indevido)
    // O robô só volta se o usuário remover o chat explicitamente ou se o cliente digitar "menu"
    return true;
  }

  registerHumanIntervention(targetId: string) {
    if (!targetId || targetId.endsWith('@g.us') || targetId.endsWith('@broadcast')) return;

    // Cancela qualquer timer de inatividade pendente para esse chat
    const session = this.userSessions.get(targetId);
    if (session?.timer) {
      clearTimeout(session.timer);
      delete session.timer;
    }

    // Marca a sessão como finalizada para o robô
    this.userSessions.set(targetId, {
      step: 'FINALIZADO',
      data: { humanHandled: true, timestamp: Date.now() },
    });

    this.humanHandledChats.set(targetId, Date.now());
    this.saveHumanHandledChats();
    this.registerAttendedPhone(targetId, 'Intervenção Humana');
    this.logger.log(`👤 [Intervenção Humana] Atendente humano interagiu no chat "${targetId}". Robô silenciado.`);
  }

  getHumanHandledChats(): Array<{ id: string; timestamp: number }> {
    return Array.from(this.humanHandledChats.entries()).map(([id, timestamp]) => ({
      id,
      timestamp,
    }));
  }

  clearHumanHandledChat(id?: string) {
    if (id) {
      this.humanHandledChats.delete(id);
      this.userSessions.delete(id);
    } else {
      this.humanHandledChats.clear();
      this.userSessions.clear();
    }
    this.saveHumanHandledChats();
    return { success: true };
  }

  // ==========================================
  // SISTEMA DE PROTEÇÃO ANTI-REENVIO PERMANENTE
  // ==========================================

  // Normalização e extração de variantes de números de telefone nacionais (com/sem 55, com/sem 9º dígito)
  extractNationalPhoneDigits(raw: string): string[] {
    if (!raw) return [];
    const digits = raw.replace(/\D/g, '');
    if (!digits || digits.length < 8) return [];

    let national = digits;
    if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
      national = digits.slice(2);
    } else if (digits.startsWith('55') && digits.length === 11) {
      // Caso 55 + 9 dígitos sem DDD (Manaus DDD 92)
      national = `92${digits.slice(2)}`;
    }

    const variants = new Set<string>();
    variants.add(digits);
    variants.add(national);
    if (digits.startsWith('55') && digits.length === 11) {
      variants.add(digits.slice(2));
      variants.add(`92${digits.slice(2)}`);
      variants.add(`5592${digits.slice(2)}`);
    }

    // Variações com/sem o 9º dígito móvel do Brasil (DDDs com 2 dígitos + 8 ou 9 dígitos)
    if (national.length === 11 && national[2] === '9') {
      const eightDigit = national.slice(0, 2) + national.slice(3);
      variants.add(eightDigit);
      variants.add(`55${eightDigit}`);
      variants.add(`55${national}`);
    } else if (national.length === 10) {
      const nineDigit = national.slice(0, 2) + '9' + national.slice(2);
      variants.add(nineDigit);
      variants.add(`55${nineDigit}`);
      variants.add(`55${national}`);
    }

    return Array.from(variants);
  }

  // Caminho do arquivo de clientes e telefones já atendidos/contatados
  private getAttendedPhonesFilePath(): string {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    return path.join(dataDir, 'whatsapp_attended_phones.json');
  }

  loadAttendedPhones() {
    try {
      const file = this.getAttendedPhonesFilePath();
      if (fs.existsSync(file)) {
        const raw = fs.readFileSync(file, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (item && item.phone) {
              const variants = this.extractNationalPhoneDigits(item.phone);
              for (const v of variants) {
                this.attendedPhones.set(v, {
                  phone: item.phone,
                  reason: item.reason || 'Atendido',
                  timestamp: item.timestamp || Date.now(),
                });
              }
            }
          }
          this.logger.log(`🛡️ Carregados ${this.attendedPhones.size} registros de números atendidos (anti-reenvio).`);
        }
      }

      // Também sincroniza a partir do histórico existente em disco
      const history = this.getDispatchedHistory();
      let seededFromHistory = 0;
      for (const h of history) {
        if (h.phone && h.status === 'SENT') {
          const variants = this.extractNationalPhoneDigits(h.phone);
          for (const v of variants) {
            if (!this.attendedPhones.has(v)) {
              this.attendedPhones.set(v, {
                phone: h.phone,
                reason: `Disparado no Histórico (${h.leadName || 'Lead'})`,
                timestamp: Date.now(),
              });
              seededFromHistory++;
            }
          }
        }
      }
      if (seededFromHistory > 0) {
        this.saveAttendedPhones();
        this.logger.log(`🛡️ Sincronizados +${seededFromHistory} telefones enviados do histórico para a proteção anti-reenvio.`);
      }
    } catch (e) {
      this.logger.error('Erro ao carregar whatsapp_attended_phones.json:', e);
    }
  }

  saveAttendedPhones() {
    try {
      const file = this.getAttendedPhonesFilePath();
      const uniqueList = this.getAttendedPhonesList();
      fs.writeFileSync(file, JSON.stringify(uniqueList, null, 2), 'utf8');
    } catch (e) {
      this.logger.error('Erro ao salvar whatsapp_attended_phones.json:', e);
    }
  }

  registerAttendedPhone(rawPhoneOrJid: string, reason: string) {
    if (!rawPhoneOrJid) return;
    const variants = this.extractNationalPhoneDigits(rawPhoneOrJid);
    if (variants.length === 0) {
      const clean = rawPhoneOrJid.replace(/\D/g, '');
      if (clean) variants.push(clean);
    }

    const now = Date.now();
    for (const v of variants) {
      this.attendedPhones.set(v, {
        phone: rawPhoneOrJid,
        reason,
        timestamp: now,
      });
    }
    this.saveAttendedPhones();
    this.logger.log(`🛡️ [Proteção Anti-Reenvio] Número registrado como atendido: "${rawPhoneOrJid}" (Motivo: ${reason}).`);
  }

  isAttendedPhone(rawPhoneOrJid: string): boolean {
    if (!rawPhoneOrJid) return false;

    // Se o chat já está marcado como intervenção humana
    if (this.humanHandledChats.has(rawPhoneOrJid)) {
      return true;
    }

    const variants = this.extractNationalPhoneDigits(rawPhoneOrJid);
    for (const v of variants) {
      if (this.attendedPhones.has(v)) {
        return true;
      }
      // Verifica também na lista de chats humanos
      for (const humanId of this.humanHandledChats.keys()) {
        if (humanId.includes(v)) return true;
      }
    }

    return false;
  }

  getAttendedPhonesList(): Array<{ phone: string; reason: string; timestamp: number }> {
    const seen = new Set<string>();
    const list: Array<{ phone: string; reason: string; timestamp: number }> = [];

    for (const record of this.attendedPhones.values()) {
      const key = record.phone.replace(/\D/g, '');
      if (!seen.has(key)) {
        seen.add(key);
        list.push(record);
      }
    }

    return list;
  }

  unlockAttendedPhone(phone: string): { success: boolean; unlocked: string } {
    const variants = this.extractNationalPhoneDigits(phone);
    variants.push(phone.replace(/\D/g, ''));

    for (const v of variants) {
      this.attendedPhones.delete(v);
      for (const [k] of this.humanHandledChats.entries()) {
        if (k.includes(v)) {
          this.humanHandledChats.delete(k);
        }
      }
    }

    this.saveAttendedPhones();
    this.saveHumanHandledChats();
    this.logger.log(`🔓 Número "${phone}" desbloqueado manualmente da proteção anti-reenvio.`);
    return { success: true, unlocked: phone };
  }

  // Verifica se o remetente é um contato pessoal ou familiar
  isPersonalOrIgnoredContact(senderId: string, pushName?: string): { isIgnored: boolean; matchedTerm?: string } {
    const ignoredList = this.getIgnoredContacts();
    const cleanSenderPhone = senderId.replace(/\D/g, '');
    const cleanSenderId = senderId.toLowerCase();

    // Coleta nomes possíveis: salvo na agenda do aparelho ou pushName do WhatsApp
    const savedContact = this.contactsMap.get(senderId);
    const namesToCheck: string[] = [];
    if (savedContact?.name) namesToCheck.push(savedContact.name);
    if (savedContact?.notify) namesToCheck.push(savedContact.notify);
    if (pushName) namesToCheck.push(pushName);

    const normalizedNames = namesToCheck.map(n => this.normalizeText(n));

    for (const rawItem of ignoredList) {
      const item = rawItem.trim();
      if (!item) continue;

      // 1. Se for exato ou parte do JID/LID (ex: "26655322026119@lid", "26655322026119", etc.)
      const lowItem = item.toLowerCase();
      if (cleanSenderId.includes(lowItem) || lowItem === cleanSenderId) {
        return { isIgnored: true, matchedTerm: item };
      }

      // 2. Se for número de telefone ou dígitos do identificador (ex: "92991234567" ou "26655322026119")
      const cleanItem = item.replace(/\D/g, '');
      if (cleanItem.length >= 8 && cleanSenderPhone.includes(cleanItem)) {
        return { isIgnored: true, matchedTerm: item };
      }

      // 3. Se for nome, apelido ou palavra-chave (ex: "dengosa", "leticia", "namorada", "mae")
      const normItem = this.normalizeText(item);
      if (normItem.length > 0) {
        for (const name of normalizedNames) {
          if (name.includes(normItem)) {
            return { isIgnored: true, matchedTerm: item };
          }
        }
      }
    }

    return { isIgnored: false };
  }
}
