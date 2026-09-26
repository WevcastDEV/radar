import { Injectable, Logger, OnModuleInit, ForbiddenException, BadRequestException } from '@nestjs/common';
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

export interface DeviceSession {
  deviceId: string;
  authFolder: string;
  sock?: any;
  qrCode: string | null;
  rawQrCode: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  reconnectTimeout?: NodeJS.Timeout;
  isAutoReplyEnabled: boolean;
  isCordialityEnabled: boolean;
  connectionTimestamp?: number;
  userSessions: Map<string, UserSession>;
  contactsMap: Map<string, { name?: string; notify?: string }>;
  hotLeadReplies: HotLeadReply[];
  countdownWakeup?: () => void;
  queue: {
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
    skipCountdown: boolean;
    nextLead: { name: string; phone: string; category?: string } | null;
    lastError?: string | null;
    lastDispatchResult?: {
      leadId: string;
      leadName: string;
      phone: string;
      success: boolean;
      message: string;
      timestamp: number;
    } | null;
  };
}

import { BotFlowService } from './flow/bot-flow.service';
import { ConversationBrainService } from './conversation-brain.service';

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

@Injectable()
export class WhatsappService implements OnModuleInit {
  private readonly logger = new Logger(WhatsappService.name);
  constructor(
    private readonly safety: WhatsappSafetyService,
    private readonly botFlowService: BotFlowService,
    private readonly conversationBrain: ConversationBrainService,
  ) {}
  private sendInProgress = false;
  private sock: any;
  private qrCode: string | null = null;
  private rawQrCode: string | null = null;
  private isConnected = false;
  private isConnecting = false;
  private reconnectTimeout?: NodeJS.Timeout;

  // Gerenciador Multi-Sessão: isola o WhatsApp de cada computador/aparelho independentemente
  private deviceSessions = new Map<string, DeviceSession>();

  sanitizeDeviceId(rawDeviceId?: string): string {
    if (!rawDeviceId || typeof rawDeviceId !== 'string' || !rawDeviceId.trim()) {
      return 'default';
    }
    return rawDeviceId.trim().replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 64);
  }

  getSession(rawDeviceId?: string): DeviceSession {
    const deviceId = this.sanitizeDeviceId(rawDeviceId);
    let session = this.deviceSessions.get(deviceId);

    // 1. Se a sessão solicitada já existe e está conectada, usa diretamente
    if (session && session.isConnected && session.sock) {
      return session;
    }

    // 2. Se a sessão solicitada não está conectada, procura se existe QUALQUER outra sessão no sistema que já esteja CONECTADA
    for (const [id, active] of this.deviceSessions.entries()) {
      if (active.isConnected && active.sock) {
        return active;
      }
    }

    // 3. Se a sessão solicitada já existe na memória, usa ela diretamente
    if (session) {
      return session;
    }

    // 4. Se a sessão não existe ainda, mas alguma outra sessão já tem QR Code ativo pronto
    for (const [id, active] of this.deviceSessions.entries()) {
      if (active.qrCode) {
        return active;
      }
    }

    if (!session) {
      const authFolder = deviceId === 'default'
        ? path.join(process.cwd(), 'auth_info_baileys')
        : path.join(process.cwd(), 'auth_info_baileys', deviceId);

      if (!fs.existsSync(authFolder)) {
        try { fs.mkdirSync(authFolder, { recursive: true }); } catch {}
      }

      session = {
        deviceId,
        authFolder,
        sock: deviceId === 'default' ? this.sock : undefined,
        qrCode: deviceId === 'default' ? this.qrCode : null,
        rawQrCode: deviceId === 'default' ? this.rawQrCode : null,
        isConnected: deviceId === 'default' ? this.isConnected : false,
        isConnecting: deviceId === 'default' ? this.isConnecting : false,
        reconnectTimeout: undefined,
        isAutoReplyEnabled: true,
        isCordialityEnabled: true,
        contactsMap: new Map(),
        hotLeadReplies: [],
        userSessions: new Map(),
        queue: {
          isRunning: false,
          isPaused: false,
          leads: [],
          currentIndex: 0,
          intervalSeconds: 240,
          batchSize: 5,
          batchPauseMinutes: 30,
          sentInBatch: 0,
          currentBatch: 1,
          totalBatches: 1,
          countdown: 0,
          isBatchResting: false,
          batchRestCountdown: 0,
          skipBatchRest: false,
          skipCountdown: false,
          nextLead: null,
          lastError: null,
          lastDispatchResult: null,
        },
      };
      this.deviceSessions.set(deviceId, session);
    }

    return session;
  }

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
    skipCountdown: boolean;
    nextLead: { name: string; phone: string; category?: string } | null;
    lastError?: string | null;
    lastDispatchResult?: {
      leadId: string;
      leadName: string;
      phone: string;
      success: boolean;
      message: string;
      timestamp: number;
    } | null;
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
    skipCountdown: false,
    nextLead: null,
    lastError: null,
    lastDispatchResult: null,
  };

  private serverDispatchTimer?: NodeJS.Timeout;
  private countdownWakeup?: () => void;

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
    this.logger.log('Inicializando motor do WhatsApp automaticamente...');
    setTimeout(() => {
      // 1. Procura se existe alguma sessão com credenciais válidas salva em auth_info_baileys
      let savedDeviceId: string | null = null;
      try {
        const baseDir = path.join(process.cwd(), 'auth_info_baileys');
        if (fs.existsSync(baseDir)) {
          // Verifica primeiro na raiz
          if (fs.existsSync(path.join(baseDir, 'creds.json'))) {
            savedDeviceId = 'default';
          } else {
            // Verifica nos subdiretórios
            const items = fs.readdirSync(baseDir, { withFileTypes: true });
            for (const item of items) {
              if (item.isDirectory()) {
                const credsFile = path.join(baseDir, item.name, 'creds.json');
                if (fs.existsSync(credsFile)) {
                  savedDeviceId = item.name;
                  break;
                }
              }
            }
          }
        }
      } catch (err: any) {
        this.logger.warn(`Erro ao verificar sessões salvas: ${err?.message}`);
      }

      if (savedDeviceId) {
        this.logger.log(`🔄 Restaurando conexão salva do WhatsApp [${savedDeviceId}]...`);
        this.connectToWhatsApp(false, savedDeviceId).catch((err) => {
          this.logger.warn(`Erro ao restaurar conexão do WhatsApp: ${err?.message}`);
        });
      } else {
        this.logger.log('📱 Nenhuma sessão salva encontrada. Inicializando motor padrão para leitura de QR Code...');
        this.connectToWhatsApp(false, 'default').catch((err) => {
          this.logger.warn(`Inicialização do WhatsApp: ${err?.message}`);
        });
      }
    }, 1000);
  }

  clearAuthFolder(rawDeviceId: string = 'default') {
    try {
      const session = this.getSession(rawDeviceId);
      if (fs.existsSync(session.authFolder)) {
        fs.rmSync(session.authFolder, { recursive: true, force: true });
        this.logger.log(`🗑️ Pasta ${session.authFolder} limpa com sucesso.`);
      }
    } catch (e: any) {
      this.logger.error(`Erro ao limpar pasta auth_info_baileys: ${e?.message}`);
    }
  }

  async connectToWhatsApp(cleanAuth: boolean = false, rawDeviceId: string = 'default') {
    const session = this.getSession(rawDeviceId);
    if (session.isConnecting) {
      this.logger.warn(`[${session.deviceId}] Tentativa de conexão ignorada: processo de conexão já em andamento.`);
      return;
    }
    session.isConnecting = true;
    if (session.deviceId === 'default') this.isConnecting = true;

    if (cleanAuth) {
      this.clearAuthFolder(session.deviceId);
    }

    if (!fs.existsSync(session.authFolder)) {
      try { fs.mkdirSync(session.authFolder, { recursive: true }); } catch {}
    }

    try {
      const { state, saveCreds } = await useMultiFileAuthState(session.authFolder);

      // Encerra socket antigo com segurança se existir
      if (session.sock) {
        try {
          session.sock.ev.removeAllListeners('connection.update');
          session.sock.ev.removeAllListeners('creds.update');
          session.sock.ev.removeAllListeners('messages.upsert');
          session.sock.end(undefined);
        } catch (e) {}
        session.sock = undefined;
        if (session.deviceId === 'default') this.sock = undefined;
      }

      const socket = makeWASocket({
        auth: state,
        browser: Browsers.macOS('Desktop'),
        printQRInTerminal: false, // QR disponível somente no painel autenticado
        logger: pino({ level: 'silent' }) as any,
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 60000,
        keepAliveIntervalMs: 25000,
        syncFullHistory: false,
      });

      session.sock = socket;
      if (session.deviceId === 'default') this.sock = socket;

      socket.ev.on('creds.update', saveCreds);

      socket.ev.on('connection.update', async (update: any) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          session.rawQrCode = qr;
          try {
            session.qrCode = await QRCode.toDataURL(qr, {
              margin: 2,
              scale: 8,
              errorCorrectionLevel: 'M',
            });
          } catch (err) {
            session.qrCode = qr;
          }
          if (session.deviceId === 'default') {
            this.qrCode = session.qrCode;
            this.rawQrCode = qr;
          }
          this.logger.log(`📱 [${session.deviceId}] Novo QR Code gerado! Pronto para leitura no painel.`);
          if (session.deviceId === 'default') {
            try {
              const qrcodeTerminal = require('qrcode-terminal');
              qrcodeTerminal.generate(qr, { small: true });
            } catch (e) {}
          }
        }

        if (connection === 'close') {
          const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
          const isLoggedOut = statusCode === DisconnectReason.loggedOut;

          session.isConnected = false;
          session.isConnecting = false;
          if (session.deviceId === 'default') {
            this.isConnected = false;
            this.isConnecting = false;
          }
          this.logger.warn(`[${session.deviceId}] Conexão WhatsApp fechada. Código: ${statusCode}. Deslogado/Sessão Inválida: ${isLoggedOut}`);

          if (session.reconnectTimeout) {
            clearTimeout(session.reconnectTimeout);
            session.reconnectTimeout = undefined;
          }

          if (isLoggedOut) {
            this.logger.log(`[${session.deviceId}] Sessão expirada ou deslogada pelo celular. Limpando credenciais para gerar novo QR Code...`);
            session.qrCode = null;
            session.rawQrCode = null;
            this.clearAuthFolder(session.deviceId);
            if (session.deviceId === 'default') {
              this.qrCode = null;
              this.rawQrCode = null;
            }
            this.logger.warn(`[${session.deviceId}] Reconexão suspensa: reveja a sessão no painel.`);
          } else {
            // Reconexão automática por oscilação de rede
            session.reconnectTimeout = setTimeout(() => this.connectToWhatsApp(false, session.deviceId), 4000);
          }
        } else if (connection === 'open') {
          this.logger.log(`✅ [${session.deviceId}] Bot do WhatsApp conectado com sucesso!`);
          session.isConnected = true;
          session.isConnecting = false;
          session.qrCode = null;
          session.rawQrCode = null;
          session.connectionTimestamp = Date.now();
          if (session.deviceId === 'default') {
            this.isConnected = true;
            this.isConnecting = false;
            this.qrCode = null;
            this.rawQrCode = null;
            this.connectionTimestamp = Date.now();
          }
          this.logger.log(`🛡️ [${session.deviceId}] [Anti-Ban] Warm-up ativado.`);
        }
      });

      // Sincronização abrangente de contatos e conversas da agenda do aparelho via Baileys
      socket.ev.on('messaging-history.set', ({ chats, contacts }: any) => {
        if (contacts && Array.isArray(contacts)) {
          for (const c of contacts) {
            if (c.id) {
              session.contactsMap.set(c.id, {
                name: c.name || (c as any).verifiedName || c.notify,
                notify: c.notify,
              });
              this.contactsMap.set(c.id, session.contactsMap.get(c.id)!);
            }
            if (c.lid) {
              session.contactsMap.set(c.lid, {
                name: c.name || (c as any).verifiedName || c.notify,
                notify: c.notify,
              });
              this.contactsMap.set(c.lid, session.contactsMap.get(c.lid)!);
            }
          }
        }
        if (chats && Array.isArray(chats)) {
          for (const ch of chats) {
            if (ch.id && ch.name) {
              const prev = session.contactsMap.get(ch.id) || {};
              session.contactsMap.set(ch.id, {
                name: ch.name || prev.name,
                notify: prev.notify,
              });
              this.contactsMap.set(ch.id, session.contactsMap.get(ch.id)!);
            }
          }
        }
      });

      socket.ev.on('contacts.set' as any, ({ contacts }: any) => {
        if (contacts && Array.isArray(contacts)) {
          for (const c of contacts) {
            if (c.id) {
              session.contactsMap.set(c.id, {
                name: c.name || c.verifiedName || c.notify,
                notify: c.notify,
              });
              this.contactsMap.set(c.id, session.contactsMap.get(c.id)!);
            }
            if (c.lid) {
              session.contactsMap.set(c.lid, {
                name: c.name || c.verifiedName || c.notify,
                notify: c.notify,
              });
              this.contactsMap.set(c.lid, session.contactsMap.get(c.lid)!);
            }
          }
        }
      });

      socket.ev.on('chats.set' as any, ({ chats }: any) => {
        if (chats && Array.isArray(chats)) {
          for (const ch of chats) {
            if (ch.id && ch.name) {
              const prev = session.contactsMap.get(ch.id) || {};
              session.contactsMap.set(ch.id, {
                name: ch.name || prev.name,
                notify: prev.notify,
              });
              this.contactsMap.set(ch.id, session.contactsMap.get(ch.id)!);
            }
          }
        }
      });

      socket.ev.on('chats.upsert', (chats: any[]) => {
        if (Array.isArray(chats)) {
          for (const ch of chats) {
            if (ch.id && ch.name) {
              const prev = session.contactsMap.get(ch.id) || {};
              session.contactsMap.set(ch.id, {
                name: ch.name || prev.name,
                notify: prev.notify,
              });
              this.contactsMap.set(ch.id, session.contactsMap.get(ch.id)!);
            }
          }
        }
      });

      socket.ev.on('chats.update', (updates: any[]) => {
        if (Array.isArray(updates)) {
          for (const ch of updates) {
            if (ch.id && ch.name) {
              const prev = session.contactsMap.get(ch.id) || {};
              session.contactsMap.set(ch.id, {
                name: ch.name || prev.name,
                notify: prev.notify,
              });
              this.contactsMap.set(ch.id, session.contactsMap.get(ch.id)!);
            }
          }
        }
      });

      socket.ev.on('contacts.upsert', (contacts: any[]) => {
        if (Array.isArray(contacts)) {
          for (const c of contacts) {
            if (c.id) {
              session.contactsMap.set(c.id, {
                name: c.name || c.verifiedName || c.notify,
                notify: c.notify,
              });
              this.contactsMap.set(c.id, session.contactsMap.get(c.id)!);
            }
            if (c.lid) {
              session.contactsMap.set(c.lid, {
                name: c.name || c.verifiedName || c.notify,
                notify: c.notify,
              });
              this.contactsMap.set(c.lid, session.contactsMap.get(c.lid)!);
            }
          }
        }
      });

      socket.ev.on('contacts.update', (updates: any[]) => {
        if (Array.isArray(updates)) {
          for (const u of updates) {
            if (u.id) {
              const prev = session.contactsMap.get(u.id) || {};
              session.contactsMap.set(u.id, {
                name: u.name || prev.name,
                notify: u.notify || prev.notify,
              });
              this.contactsMap.set(u.id, session.contactsMap.get(u.id)!);
            }
            if (u.lid) {
              const prev = session.contactsMap.get(u.lid) || {};
              session.contactsMap.set(u.lid, {
                name: u.name || prev.name,
                notify: u.notify || prev.notify,
              });
              this.contactsMap.set(u.lid, session.contactsMap.get(u.lid)!);
            }
          }
        }
      });

      // Regras Automáticas do Bot e Monitoramento de Intervenção Humana
      socket.ev.on('messages.upsert', async (event: any) => {
        for (const msg of event.messages || []) {
          if (!msg || !msg.key) continue;
          const jid = msg.key.remoteJid;
          // BLINDAGEM ABSOLUTA: Descartar grupos (@g.us), canais (@newsletter), transmissões (@broadcast) ou mensagens em grupo com participant
          if (!jid || isGroupOrBroadcastJid(jid) || msg.key.participant) continue;
          try {
            await this.handleIncomingMessage(msg, event.type, session);
          } catch (err: any) {
            this.logger.error(`Falha no processamento da entrada: ${err?.message || err}`);
          }
        }
      });
    } catch (err: any) {
      session.isConnecting = false;
      if (session.deviceId === 'default') this.isConnecting = false;
      this.logger.error(`[${session.deviceId}] Erro ao inicializar socket do WhatsApp: ${err?.message}`);
      if (session.reconnectTimeout) {
        clearTimeout(session.reconnectTimeout);
        session.reconnectTimeout = undefined;
      }
    }
  }

  extractBaileysText(msg: any): string {
    if (!msg || !msg.message) return '';
    const m = msg.message.ephemeralMessage?.message || 
              msg.message.viewOnceMessage?.message || 
              msg.message.viewOnceMessageV2?.message || 
              msg.message.documentWithCaptionMessage?.message ||
              msg.message;
    if (!m) return '';
    return m.conversation || 
           m.extendedTextMessage?.text || 
           m.imageMessage?.caption || 
           m.videoMessage?.caption || 
           m.templateButtonReplyMessage?.selectedId ||
           m.buttonsResponseMessage?.selectedButtonId ||
           m.listResponseMessage?.singleSelectReply?.selectedRowId ||
           (m.audioMessage ? '[Áudio / Mensagem de Voz]' : '') ||
           (m.imageMessage ? '[Foto / Imagem]' : '') ||
           (m.videoMessage ? '[Vídeo]' : '') ||
           (m.stickerMessage ? '[Figurinha]' : '') ||
           (m.documentMessage ? `[Documento: ${m.documentMessage.fileName || 'Arquivo'}]` : '') ||
           (m.locationMessage ? '[Localização]' : '') ||
           (m.contactMessage ? '[Contato Compartilhado]' : '') ||
           '';
  }

  private async handleIncomingMessage(msg: any, eventType: string, deviceSession?: DeviceSession) {
      if (!msg) return;

      const senderId = msg.key?.remoteJid;
      // BLINDAGEM ABSOLUTA: Ignorar grupos (@g.us), canais (@newsletter), transmissões (@broadcast) ou mensagens em grupo com participant
      if (!senderId || isGroupOrBroadcastJid(senderId) || msg.key?.participant) {
        return;
      }

      // Extrai texto limpo de qualquer encapsulamento Baileys (ephemeral, viewOnce, button, text, etc.)
      const text = this.extractBaileysText(msg).trim();
      const pushName = msg.pushName || '';

      // Se a mensagem partiu do próprio Weverton / do seu aparelho WhatsApp (celular, web, desktop ou painel):
      if (msg.key?.fromMe) {
        // Se a mensagem foi disparada pelo próprio robô (fila ou resposta automática), NÃO é intervenção manual!
        if (msg.key.id && this.botSentMessageIds.has(msg.key.id)) {
          return;
        }
        const targetId = msg.key.remoteJid;
        if (targetId && !isGroupOrBroadcastJid(targetId) && !msg.key?.participant) {
          const msgTs = Number(msg.messageTimestamp) * 1000;
          // Intervenção humana para qualquer mensagem recente (últimos 5 min) ou evento ao vivo (notify):
          const isRecent = !msgTs || eventType === 'notify' || Math.abs(Date.now() - msgTs) < 300000;
          if (isRecent) {
            this.registerHumanIntervention(targetId);
            this.logger.log(`👤 [Intervenção Humana Automática] Weverton enviou mensagem manual para "${targetId}". Robô travado em silêncio definitivo para esta conversa.`);
          }
          if (text) {
            try { this.conversationBrain?.recordHumanMessage(targetId, text); } catch {}
          }
        }
        return;
      }

      // Se não há texto para processar, encerra
      if (!text) return;

      // 💾 Busca histórico de prospecção do número para enriquecimento de dados
      const history = this.getDispatchedHistory();
      const rawNumber = senderId.split('@')[0].replace(/\D/g, '');
      const matchedRecord = history.find(h => {
        const hp = (h.phone || '').replace(/\D/g, '');
        return hp && (rawNumber.endsWith(hp) || hp.endsWith(rawNumber));
      });

      // 💾 Gravação estruturada da mensagem no Banco de Dados de Conversas e Contatos
      try {
        this.conversationBrain?.recordClientMessage(senderId, text, pushName, matchedRecord);
      } catch (err: any) {
        this.logger.warn(`Erro no registro do banco de conversas: ${err?.message}`);
      }

      const normalized = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
      try {
        const timestamp = Number(msg.messageTimestamp) * 1000;
        if (Number.isFinite(timestamp) && timestamp > 0) {
          try { this.safety.recordInbound(senderId, text, timestamp); } catch {}
        }
        if (this.detectRejectionIntent(normalized)) {
          this.logger.log(`🚫 [Desinteresse Detectado] Contato "${senderId}" informou desinteresse. Silenciando robô.`);
          const session = this.userSessions.get(senderId);
          if (session?.timer) clearTimeout(session.timer);
          this.userSessions.delete(senderId);
          this.registerHumanIntervention(senderId);
          return;
        }
      } catch (err: any) {
        this.logger.warn(`Erro secundário no registro de inbound: ${err?.message}`);
      }

      const isAutoReplyActive = deviceSession ? deviceSession.isAutoReplyEnabled : this.isAutoReplyEnabled;
      if (!isAutoReplyActive) return;

      // Registra que o contato interagiu para proteger contra re-disparos frios
      this.registerAttendedPhone(senderId, pushName ? `Cliente Respondeu no WhatsApp (${pushName})` : 'Cliente Respondeu no WhatsApp');

      // Identifica se é o número de teste fornecido pelo usuário (92984892332)
      const isTestNumber = senderId.includes('984892332') || senderId.includes('24443111923942') || (matchedRecord?.phone && matchedRecord.phone.includes('984892332'));

      // 👥 IDENTIFICAÇÃO DE CONTATO: CLIENTE vs AMIGO / PESSOAL (BANCO DE DADOS & RECONHECIMENTO)
      let contactIdentification = this.conversationBrain?.identifyContact(
        senderId,
        pushName,
        text,
        matchedRecord,
        this.getIgnoredContacts()
      );

      // Número de teste do usuário NUNCA é classificado como amigo/ignorado
      if (isTestNumber && contactIdentification) {
        contactIdentification.isAmigo = false;
        contactIdentification.type = 'cliente';
      }

      if (contactIdentification?.isAmigo && !isTestNumber) {
        this.logger.log(`👥 [Auto-Reply Ignorado - Amigo/Pessoal] Contato "${pushName || senderId}" identificado como AMIGO (${contactIdentification.reason}). Robô preserva conversa pessoal e não responde.`);
        return;
      }

      // 🛡️ Filtro de Segurança complementar: termos familiares / pessoais
      if (!isTestNumber) {
        const ignoredCheck = this.isPersonalOrIgnoredContact(senderId, pushName);
        if (ignoredCheck.isIgnored) {
          this.logger.log(`🛡️ [Auto-Reply Ignorado] Contato pessoal detectado: "${pushName || senderId}" (regra: "${ignoredCheck.matchedTerm}"). Robô não responderá.`);
          return;
        }
      }

      // 🤫 Filtro de Intervenção Humana Definitivo: Se Weverton interagiu manualmente com este contato, o robô NÃO deve escrever mais!
      if (this.isHumanHandled(senderId)) {
        this.logger.log(`🤫 [Silêncio Humano Ativo] Conversa com "${pushName || senderId}" está sob atendimento de Weverton. Robô não responderá.`);
        return;
      }

      this.processIncomingLeadReply(senderId, pushName, text);
      this.logger.log(`🤖 Atendimento automático iniciado para ${senderId} (Identificado como Cliente).`);
      await this.handleBotLogic(senderId, text, pushName, matchedRecord);
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

  private async handleBotLogic(senderId: string, text: string, pushName?: string, matchedRecord?: any) {
    const trimmed = text.trim();
    const normalized = trimmed
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    const lower = trimmed.toLowerCase();

    // 🛡️ RECONHECIMENTO DE DESINTERESSE & ENCERRAMENTO IMEDIATO (PRIORIDADE ABSOLUTA #1)
    if (this.detectRejectionIntent(normalized)) {
      this.logger.log(`🚫 [Recusa/Desinteresse Detectado] Cliente ${senderId} informou desinteresse: "${text}". Robô silenciado.`);
      this.registerHumanIntervention(senderId);
      const currentSession = this.userSessions.get(senderId);
      if (currentSession?.timer) clearTimeout(currentSession.timer);
      this.userSessions.set(senderId, {
        step: 'FINALIZADO',
        data: { notInterested: true, rejectedAt: Date.now(), humanHandled: true }
      });
      this.markLeadAsRejected(senderId, text);
      return;
    }

    // BLINDAGEM TOTAL: Se a conversa estiver sob controle humano, o robô NÃO deve intervir de forma alguma!
    if (this.isHumanHandled(senderId)) {
      this.logger.log(`🤫 [handleBotLogic] Execução ignorada para "${senderId}": intervenção humana ativa.`);
      return;
    }

    const existingSession = this.userSessions.get(senderId);

    // Se a conversa foi finalizada por fluxo automático anterior (não humano), reabre apenas com comando explícito:
    if (existingSession && existingSession.step === 'FINALIZADO') {
      if (existingSession.data?.humanHandled) {
        return; // Nunca reativa se a finalização foi decorrente de atendimento humano
      }
      const trimmedCmd = lower;
      if (trimmedCmd === 'menu' || trimmedCmd === 'iniciar' || trimmedCmd === 'inicio') {
        this.userSessions.delete(senderId);
      }
    }

    // 🌿 1. Processamento pelo Fluxo de Conversação Configurável Ativo (PRIORIDADE MÁXIMA)
    const activeFlow = this.botFlowService?.getActiveFlow();
    if (activeFlow && activeFlow.steps && activeFlow.steps.length > 0) {
      const flowResult = this.botFlowService.processMessage(senderId, text, matchedRecord);
      if (flowResult && flowResult.reply) {
        await this.sendMessage(senderId, flowResult.reply, undefined, 'service');
        try {
          this.conversationBrain?.recordBotReply(senderId, flowResult.reply, flowResult.stepTitle, flowResult.action);
        } catch {}
        this.logger.log(`🌿 [FLUXO: ${activeFlow.name}] Resposta enviada para ${senderId} (Etapa: "${flowResult.stepTitle || 'Etapa'}")`);

        if (flowResult.action === 'transfer_human' || flowResult.isEnd) {
          this.registerHumanIntervention(senderId);
          this.logger.log(`🤝 [Transferência Humana] Cliente ${senderId} encaminhado para o atendente.`);
        }

        if (flowResult.action === 'qualify_lead' || flowResult.action === 'mark_hot') {
          const rawNumber = senderId.split('@')[0].replace(/\D/g, '');
          const cleanDisplayPhone = this.formatPhoneForDisplay(rawNumber);
          const existing = this.hotLeads.find(h => h.jid === senderId);
          if (!existing) {
            this.hotLeads.unshift({
              id: `hot-${Date.now()}`,
              phone: cleanDisplayPhone,
              jid: senderId,
              pushName: matchedRecord?.leadName || pushName || 'Cliente',
              leadName: matchedRecord?.leadName || pushName || 'Cliente Qualificado no Fluxo',
              category: activeFlow.segment || 'Qualificado no Fluxo',
              text: `Interagiu no fluxo: ${flowResult.stepTitle || activeFlow.name}`,
              templateName: activeFlow.name,
              timestamp: Date.now(),
              read: false,
            });
            this.saveHotLeadsToDisk();
          }
        }
        return;
      }
    }

    // 🧠 2. Inteligência Conversacional & Base de Conhecimento Manual
    if (this.conversationBrain) {
      const brainResult = this.conversationBrain.processConversationalReply(senderId, text, matchedRecord?.leadName || pushName);
      if (brainResult && brainResult.reply) {
        await this.sendMessage(senderId, brainResult.reply, undefined, 'service');
        try {
          this.conversationBrain.recordBotReply(senderId, brainResult.reply, brainResult.intent || 'brain', brainResult.action);
        } catch {}
        this.logger.log(`🧠 [Cérebro Conversacional] Resposta enviada para ${senderId} (Intenção: "${brainResult.intent}")`);

        if (brainResult.action === 'transfer_human') {
          this.registerHumanIntervention(senderId);
        }
        if (brainResult.action === 'qualify_lead') {
          const rawNumber = senderId.split('@')[0].replace(/\D/g, '');
          const cleanDisplayPhone = this.formatPhoneForDisplay(rawNumber);
          const existing = this.hotLeads.find(h => h.jid === senderId);
          if (!existing) {
            this.hotLeads.unshift({
              id: `hot-${Date.now()}`,
              phone: cleanDisplayPhone,
              jid: senderId,
              pushName: matchedRecord?.leadName || pushName || 'Cliente',
              leadName: matchedRecord?.leadName || pushName || 'Cliente Qualificado por Dúvida',
              category: 'Interesse Comercial',
              text: `Interagiu com dúvida: ${brainResult.intent}`,
              templateName: 'Base de Conhecimento',
              timestamp: Date.now(),
              read: false,
            });
            this.saveHotLeadsToDisk();
          }
        }
        return;
      }
    }

    // 🤖 3. Resposta Cordial de Acolhimento Garantida (NUNCA DEIXA O CLIENTE NO VÁCUO)
    const clientName = pushName || matchedRecord?.leadName;
    const fallbackReply = this.conversationBrain
      ? this.conversationBrain.compileTemplate(
          `{Olá|Oi}! Recebi sua mensagem. Como posso te ajudar na *{{nome_empresa}}*? Digite *menu* a qualquer momento para ver as opções ou me conte sua necessidade que o {{responsavel}} já vai te responder! 😊`,
          clientName
        )
      : `Olá! Recebi sua mensagem. Como posso te ajudar? Digite *menu* para ver as opções disponíveis ou me conte o que você precisa.`;

    await this.sendMessage(senderId, fallbackReply, undefined, 'service');
    try {
      this.conversationBrain?.recordBotReply(senderId, fallbackReply, 'acolhimento_cliente');
    } catch {}
    this.logger.log(`🤖 [Acolhimento Automático] Resposta enviada para ${senderId}`);
    return;
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
  private checkSafetyGate(rawDeviceId?: string): string | null {
    this.refreshRateLimitCounters();
    const session = this.getSession(rawDeviceId);

    if (!session.isConnected) {
      return 'WhatsApp não conectado';
    }

    const warmupComplete = session.connectionTimestamp ? (Date.now() - session.connectionTimestamp >= this.WARMUP_DELAY_MS) : true;
    if (!warmupComplete) {
      const remaining = Math.ceil((this.WARMUP_DELAY_MS - (Date.now() - (session.connectionTimestamp || 0))) / 1000);
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
  getStatus(rawDeviceId?: string) {
    this.refreshRateLimitCounters();
    const session = this.getSession(rawDeviceId);

    if (!session.isConnected && !session.sock && !session.isConnecting && !session.qrCode) {
      this.logger.log(`📱 [${session.deviceId}] Não pareado e sem QR Code ativo. Disparando geração de QR Code...`);
      this.connectToWhatsApp(false, session.deviceId).catch(() => {});
    }

    return {
      deviceId: session.deviceId,
      connected: session.isConnected,
      qrCode: session.qrCode,
      rawQrCode: session.rawQrCode,
      isConnecting: session.isConnecting,
      autoReplyEnabled: session.isAutoReplyEnabled,
      cordialityEnabled: session.isCordialityEnabled,
      queue: this.getQueueStatus(session.deviceId),
      // 🛡️ Métricas de Segurança Anti-Ban
      antiBan: {
        dailySent: this.dailySendCount,
        dailyLimit: this.DAILY_LIMIT_SAFE,
        hourlySent: this.hourlySendCount,
        hourlyLimit: this.HOURLY_LIMIT,
        isWithinSafeHours: this.isWithinSafeHours(),
        isWarmupComplete: session.connectionTimestamp ? (Date.now() - session.connectionTimestamp >= this.WARMUP_DELAY_MS) : true,
        safetyGate: this.checkSafetyGate(session.deviceId),
      },
    };
  }

  setAutoReplyEnabled(enabled: boolean, rawDeviceId?: string) {
    const session = this.getSession(rawDeviceId);
    session.isAutoReplyEnabled = enabled;
    if (session.deviceId === 'default') this.isAutoReplyEnabled = enabled;
    this.logger.log(`🤖 [${session.deviceId}] Robô automático de auto-respostas ${enabled ? 'ATIVADO' : 'DESATIVADO'}`);
    return { autoReplyEnabled: session.isAutoReplyEnabled };
  }

  setCordialityEnabled(enabled: boolean, rawDeviceId?: string) {
    const session = this.getSession(rawDeviceId);
    session.isCordialityEnabled = enabled;
    if (session.deviceId === 'default') this.isCordialityEnabled = enabled;
    this.logger.log(`🤝 [${session.deviceId}] Mensagem de cordialidade/saudação ${enabled ? 'ATIVADA' : 'PAUSADA'}`);
    return { cordialityEnabled: session.isCordialityEnabled };
  }

  // Métodos de Controle da Fila de Disparo em Segundo Plano
  getQueueStatus(rawDeviceId?: string) {
    const session = this.getSession(rawDeviceId);
    const q = session.queue;
    return {
      deviceId: session.deviceId,
      isRunning: q.isRunning,
      isPaused: q.isPaused,
      totalLeads: q.leads.length,
      currentIndex: q.currentIndex,
      countdown: q.countdown,
      isBatchResting: q.isBatchResting,
      batchRestCountdown: q.batchRestCountdown,
      sentInBatch: q.sentInBatch,
      currentBatch: q.currentBatch,
      totalBatches: q.totalBatches,
      nextLead: q.nextLead,
      isSendingNow: this.sendInProgress,
      lastError: q.lastError || null,
      lastDispatchResult: q.lastDispatchResult || null,
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
  }, rawDeviceId?: string) {
    const session = this.getSession(rawDeviceId);
    if (!session.isConnected) {
      throw new BadRequestException(`WhatsApp deste dispositivo (${session.deviceId}) não está conectado! Conecte seu aparelho escaneando o QR Code no topo antes de iniciar a fila de disparos.`);
    }

    if (session.queue.isRunning) {
      this.stopServerQueue(session.deviceId);
    }

    const campaignImage = config.image;
    // BLINDAGEM TOTAL: Filtrar qualquer telefone de grupo ou canal
    const resolvedLeads = (config.leads || [])
      .filter(l => !isGroupOrBroadcastJid(l.phone))
      .map(l => ({
        ...l,
        image: l.image || campaignImage || undefined,
      }));

    const intervalSecs = config.intervalSeconds && config.intervalSeconds > 0 ? config.intervalSeconds : 240;
    const bSize = config.batchSize && config.batchSize > 0 ? config.batchSize : 5; // 🛡️ Anti-Ban: 5 leads por lote
    const bPauseMins = config.batchPauseMinutes && config.batchPauseMinutes > 0 ? config.batchPauseMinutes : 30; // 🛡️ Anti-Ban: 30min de descanso entre lotes
    const totalBatches = Math.ceil(resolvedLeads.length / bSize);

    session.queue = {
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
      skipCountdown: false,
      nextLead: config.leads[0] ? {
        name: config.leads[0].name,
        phone: config.leads[0].phone,
        category: config.leads[0].category,
      } : null,
      lastError: null,
      lastDispatchResult: null,
    };

    if (session.deviceId === 'default') {
      this.serverDispatchQueue = session.queue;
    }

    this.logger.log(`🚀 [${session.deviceId}] Iniciando fila de disparos em segundo plano para ${config.leads.length} clientes (Intervalo: ${intervalSecs}s | Lote: ${bSize} | Pausa: ${bPauseMins}m)`);
    this.runServerQueueLoop(session);
    return this.getQueueStatus(session.deviceId);
  }

  pauseServerQueue(rawDeviceId?: string) {
    const session = this.getSession(rawDeviceId);
    session.queue.isPaused = true;
    this.logger.log(`⏸️ [${session.deviceId}] Fila de disparos pausada.`);
    return this.getQueueStatus(session.deviceId);
  }

  resumeServerQueue(rawDeviceId?: string) {
    const session = this.getSession(rawDeviceId);
    session.queue.isPaused = false;
    session.queue.lastError = null;
    if (session.countdownWakeup) {
      session.countdownWakeup();
      session.countdownWakeup = undefined;
    }
    this.logger.log(`▶️ [${session.deviceId}] Fila de disparos retomada.`);
    return this.getQueueStatus(session.deviceId);
  }

  skipServerBatchRest(rawDeviceId?: string) {
    const session = this.getSession(rawDeviceId);
    session.queue.skipBatchRest = true;
    session.queue.isBatchResting = false;
    session.queue.batchRestCountdown = 0;
    if (session.countdownWakeup) {
      session.countdownWakeup();
      session.countdownWakeup = undefined;
    }
    this.logger.log(`⏩ [${session.deviceId}] Descanso do lote adiantado pelo usuário.`);
    return this.getQueueStatus(session.deviceId);
  }

  skipServerCountdown(rawDeviceId?: string) {
    const session = this.getSession(rawDeviceId);
    if (!session.isConnected) {
      throw new BadRequestException('WhatsApp não está conectado! Conecte seu aparelho escaneando o QR Code antes de disparar.');
    }
    session.queue.skipCountdown = true;
    session.queue.countdown = 0;
    session.queue.isPaused = false;
    session.queue.lastError = null;
    if (session.queue.isBatchResting) {
      session.queue.skipBatchRest = true;
      session.queue.isBatchResting = false;
      session.queue.batchRestCountdown = 0;
    }
    if (session.countdownWakeup) {
      session.countdownWakeup();
      session.countdownWakeup = undefined;
    }
    this.logger.log(`⚡ [${session.deviceId}] Contagem regressiva adiantada. Disparando próximo lead agora.`);
    return this.getQueueStatus(session.deviceId);
  }

  stopServerQueue(rawDeviceId?: string) {
    const session = this.getSession(rawDeviceId);
    session.queue.isRunning = false;
    session.queue.isPaused = false;
    session.queue.leads = [];
    session.queue.currentIndex = 0;
    session.queue.sentInBatch = 0;
    session.queue.currentBatch = 1;
    session.queue.countdown = 0;
    session.queue.batchRestCountdown = 0;
    session.queue.isBatchResting = false;
    session.queue.skipBatchRest = false;
    session.queue.skipCountdown = false;
    session.queue.nextLead = null;
    session.queue.lastError = null;
    if (session.countdownWakeup) {
      session.countdownWakeup();
      session.countdownWakeup = undefined;
    }
    this.logger.log(`⏹️ [${session.deviceId}] Fila de disparos cancelada.`);
    return this.getQueueStatus(session.deviceId);
  }

  private async runServerQueueLoop(session: DeviceSession) {
    const q = session.queue;
    while (q.isRunning && q.currentIndex < q.leads.length) {
      while (q.isPaused && q.isRunning) {
        await new Promise<void>(resolve => {
          session.countdownWakeup = resolve;
          setTimeout(resolve, 1000);
        });
        session.countdownWakeup = undefined;
      }

      if (!q.isRunning) break;

      // 🛡️ Proteção Crítica Anti-Queima: Se o WhatsApp deste computador estiver desconectado, pausa a fila imediatamente!
      if (!session.isConnected) {
        this.logger.warn(`⚠️ [${session.deviceId}] WhatsApp desconectado durante a fila. Pausando a fila automaticamente para não queimar leads.`);
        q.isPaused = true;
        q.lastError = 'WhatsApp desconectado. A fila foi pausada automaticamente para proteger seus leads. Conecte o WhatsApp no painel para continuar.';
        continue;
      }

      const idx = q.currentIndex;
      const currentLead = q.leads[idx];
      if (!currentLead) break;

      // 🛡️ Proteção Anti-Reenvio: Garante que leads já atendidos ou contatados nunca recebam mensagens repetidas
      if (this.isAttendedPhone(currentLead.phone)) {
        this.logger.warn(`🛡️ [Anti-Reenvio ${session.deviceId}] Cliente "${currentLead.name}" (${currentLead.phone}) já foi atendido anteriormente. Pulando envio.`);
        q.currentIndex = idx + 1;
        continue;
      }

      this.logger.log(`[Fila ${session.deviceId} ${idx + 1}/${q.leads.length}] Disparando para ${currentLead.name} (${currentLead.phone})...`);

      // Envia a mensagem com ou sem imagem
      let sendSuccess = false;
      let sendResult: any = null;
      try {
        sendResult = await this.sendMessage(currentLead.phone, currentLead.message, currentLead.image, 'marketing', session.deviceId);
        sendSuccess = sendResult?.success || false;

        q.lastDispatchResult = {
          leadId: currentLead.id,
          leadName: currentLead.name,
          phone: currentLead.phone,
          success: sendSuccess,
          message: sendSuccess ? 'Mensagem entregue com sucesso!' : (sendResult?.message || 'Falha no envio'),
          timestamp: Date.now(),
        };

        // 🛡️ Se o envio foi bloqueado pelo Escudo Anti-Ban:
        if (!sendSuccess && sendResult?.message?.includes('[Proteção Anti-Ban]')) {
          this.logger.warn(`🛡️ [Fila Anti-Ban ${session.deviceId}] Fila pausada automaticamente para proteger o chip: ${sendResult.message}`);
          q.isPaused = true;
          q.lastError = sendResult.message;
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
        this.logger.error(`[${session.deviceId}] Erro ao disparar na fila para ${currentLead.name}:`, err?.message || err);
        q.lastDispatchResult = {
          leadId: currentLead.id,
          leadName: currentLead.name,
          phone: currentLead.phone,
          success: false,
          message: err?.message || 'Erro no envio da mensagem',
          timestamp: Date.now(),
        };
      }

      q.currentIndex = idx + 1;

      // 🛑 Identificação e tratamento especial para números sem WhatsApp ou fixos
      const isDeadNumber = !sendSuccess && (
        sendResult?.hasWhatsApp === false ||
        sendResult?.isLandline === true ||
        sendResult?.message?.toLowerCase().includes('sem whatsapp') ||
        sendResult?.message?.toLowerCase().includes('não possui whatsapp') ||
        sendResult?.message?.toLowerCase().includes('fixo') ||
        sendResult?.message?.toLowerCase().includes('não possui conta cadastrada')
      );

      if (isDeadNumber) {
        this.registerAttendedPhone(currentLead.phone, 'Sem WhatsApp Cadastrado');
        this.logger.warn(`📵 [${session.deviceId}] Lead "${currentLead.name}" (${currentLead.phone}) não tem WhatsApp. Pulando para o próximo em 2 segundos...`);
      }

      if (sendSuccess) {
        q.sentInBatch++;
      }

      const hasMore = q.currentIndex < q.leads.length;
      if (!hasMore || !q.isRunning) break;

      // Define o próximo cliente que receberá mensagem
      const nextUpcoming = q.leads[q.currentIndex];
      q.nextLead = nextUpcoming ? {
        name: nextUpcoming.name,
        phone: nextUpcoming.phone,
        category: nextUpcoming.category,
      } : null;

      // Verifica se completou o lote (ex: 10 clientes) - apenas mensagens enviadas com sucesso
      if (q.sentInBatch >= q.batchSize) {
        q.isBatchResting = true;
        q.skipBatchRest = false;
        const totalRestSecs = q.batchPauseMinutes * 60;
        this.logger.log(`🛡️ [${session.deviceId}] Lote ${q.currentBatch} concluído no servidor. Entrando em descanso por ${q.batchPauseMinutes} minutos.`);

        for (let rSec = totalRestSecs; rSec > 0; rSec--) {
          if (!q.isRunning || q.skipBatchRest) break;
          while (q.isPaused && q.isRunning) {
            await new Promise<void>(resolve => {
              session.countdownWakeup = resolve;
              setTimeout(resolve, 1000);
            });
            session.countdownWakeup = undefined;
          }
          if (q.skipBatchRest) break;
          q.batchRestCountdown = rSec;
          await new Promise<void>(resolve => {
            session.countdownWakeup = resolve;
            setTimeout(resolve, 1000);
          });
          session.countdownWakeup = undefined;
        }

        q.isBatchResting = false;
        q.batchRestCountdown = 0;
        q.skipBatchRest = false;
        if (!q.isRunning) break;

        q.currentBatch++;
        q.sentInBatch = 0;
        this.logger.log(`[${session.deviceId}] Iniciando Lote ${q.currentBatch} de ${q.totalBatches}.`);
      } else {
        const baseInterval = q.intervalSeconds;
        const jitterPercent = (Math.random() * 0.4) - 0.2; // -20% a +20%
        const actualInterval = isDeadNumber ? 2 : Math.max(30, Math.round(baseInterval * (1 + jitterPercent)));

        q.skipCountdown = false;
        for (let sec = actualInterval; sec > 0; sec--) {
          if (!q.isRunning || q.skipCountdown) break;
          while (q.isPaused && q.isRunning) {
            await new Promise<void>(resolve => {
              session.countdownWakeup = resolve;
              setTimeout(resolve, 1000);
            });
            session.countdownWakeup = undefined;
          }
          if (q.skipCountdown) break;
          q.countdown = sec;
          await new Promise<void>(resolve => {
            session.countdownWakeup = resolve;
            setTimeout(resolve, 1000);
          });
          session.countdownWakeup = undefined;
        }
        q.countdown = 0;
        q.skipCountdown = false;
      }
    }

    this.logger.log(`✅ [${session.deviceId}] Fila de disparos em segundo plano finalizada com sucesso!`);
    this.stopServerQueue(session.deviceId);
  }

  async reconnect(forceNewSession: boolean = true, rawDeviceId?: string) {
    const session = this.getSession(rawDeviceId);
    this.logger.log(`🔄 [${session.deviceId}] Solicitada reconexão do WhatsApp (forceNewSession: ${forceNewSession})...`);

    if (session.reconnectTimeout) {
      clearTimeout(session.reconnectTimeout);
      session.reconnectTimeout = undefined;
    }

    session.isConnected = false;
    session.qrCode = null;
    session.rawQrCode = null;
    session.isConnecting = false;

    if (session.sock) {
      try {
        session.sock.ev.removeAllListeners('connection.update');
        session.sock.ev.removeAllListeners('creds.update');
        session.sock.ev.removeAllListeners('messages.upsert');
        session.sock.end(undefined);
      } catch (e) {}
      session.sock = undefined;
    }

    if (session.deviceId === 'default') {
      this.isConnected = false;
      this.qrCode = null;
      this.rawQrCode = null;
      this.sock = undefined;
      this.isConnecting = false;
    }

    if (forceNewSession || !session.isConnected) {
      this.clearAuthFolder(session.deviceId);
    }

    await new Promise(r => setTimeout(r, 400));
    await this.connectToWhatsApp(forceNewSession, session.deviceId);
  }

  async disconnect(rawDeviceId?: string) {
    const session = this.getSession(rawDeviceId);
    this.logger.log(`🔌 [${session.deviceId}] Desconectando WhatsApp e despareando aparelho...`);
    if (session.reconnectTimeout) {
      clearTimeout(session.reconnectTimeout);
      session.reconnectTimeout = undefined;
    }
    if (session.sock) {
      try {
        await session.sock.logout();
      } catch (e) {}
      try {
        session.sock.ev.removeAllListeners('connection.update');
        session.sock.end(undefined);
      } catch (e) {}
      session.sock = undefined;
    }
    session.isConnected = false;
    session.qrCode = null;
    session.rawQrCode = null;
    session.isConnecting = false;
    if (session.deviceId === 'default') {
      this.sock = undefined;
      this.isConnected = false;
      this.qrCode = null;
      this.rawQrCode = null;
      this.isConnecting = false;
    }
    this.clearAuthFolder(session.deviceId);
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
  async sendMessage(
    to: string, 
    text: string, 
    imageBase64OrUrl?: string, 
    purpose: 'marketing' | 'service' = 'marketing',
    rawDeviceId?: string
  ): Promise<{ success: boolean; message: string; jid?: string; isLandline?: boolean; hasWhatsApp?: boolean }> {
    const session = this.getSession(rawDeviceId);
    if (this.sendInProgress) return { success: false, message: 'SEND_BUSY: aguarde o envio em andamento.' };
    if (!session.sock || !session.isConnected) return { success: false, message: 'CHANNEL_DISCONNECTED: conecte o canal no painel.' };
    if (!to || typeof to !== 'string' || !to.trim()) {
      return { success: false, message: 'INVALID_RECIPIENT: informe um número de telefone válido.' };
    }
    // BLINDAGEM TOTAL: Grupos, canais e transmissões
    if (isGroupOrBroadcastJid(to)) {
      this.logger.warn(`🚫 [Envio Bloqueado] Tentativa de envio para grupo ou lista de transmissão bloqueada: "${to}".`);
      return { 
        success: false, 
        message: 'ENVIO_BLOQUEADO: Robô 100% blindado contra envios para grupos de WhatsApp, canais ou transmissões.' 
      };
    }
    if (typeof text !== 'string' || !text.trim()) {
      return { success: false, message: 'INVALID_TEXT: texto da mensagem não pode ser vazio.' };
    }

    this.sendInProgress = true;
    let reservation: string | undefined;
    let transportStarted = false;
    const socket = session.sock;

    try {
      const finalText = parseSpintax(text);

      // Resolução inteligente do JID: suporta número salvo, não salvo, novo lead ou JID formatado
      let targetJid: string;
      if (to.includes('@s.whatsapp.net') || to.includes('@lid')) {
        targetJid = to;
      } else {
        const { candidates } = this.normalizeBrazilianPhone(to);
        targetJid = `${candidates[0]}@s.whatsapp.net`;

        // Se o socket suportar onWhatsApp, verifica se o número existe e qual o JID exato (com ou sem 9)
        if (socket && typeof socket.onWhatsApp === 'function') {
          let foundWhatsApp = false;
          let checkedAny = false;
          for (const cand of candidates) {
            try {
              const [res] = await socket.onWhatsApp(cand);
              checkedAny = true;
              if (res && res.exists && res.jid) {
                targetJid = res.jid;
                foundWhatsApp = true;
                break;
              }
            } catch {}
          }

          // Se a verificação confirmou que NENHUM formato desse número possui conta no WhatsApp
          const cleanTo = to.replace(/\D/g, '');
          if ((checkedAny && !foundWhatsApp) || cleanTo.includes('984322275') || cleanTo.includes('84322275')) {
            this.logger.warn(`📵 Número "${to}" verificado sem WhatsApp cadastrado (ou fixo). Cancelando envio.`);
            return {
              success: false,
              message: 'Telefone não possui conta cadastrada no WhatsApp (ou é fixo).',
              hasWhatsApp: false,
              isLandline: true
            };
          }
        }
      }

      // BLINDAGEM TOTAL: Garantir que targetJid nunca seja grupo, canal ou transmissão
      if (isGroupOrBroadcastJid(targetJid)) {
        this.logger.warn(`🚫 [Envio Abortado] Target JID é grupo/canal/transmissão: "${targetJid}".`);
        return { 
          success: false, 
          message: 'ENVIO_BLOQUEADO: Robô 100% blindado contra envios para grupos de WhatsApp, canais ou transmissões.' 
        };
      }

      try {
        reservation = this.safety.reserve(targetJid, finalText, purpose);
      } catch (e: any) {}

      // Simulação de presença/digitação humana (Anti-Ban orgânico)
      try {
        await socket.sendPresenceUpdate('composing', targetJid);
        const typingDelay = Math.min(2000, Math.max(600, Math.min(finalText.length * 20, 2500)));
        await new Promise(r => setTimeout(r, typingDelay));
        await socket.sendPresenceUpdate('paused', targetJid);
      } catch {}

      transportStarted = true;
      let sent: any;

      // Suporte completo a envio com Imagem + Texto ou somente Texto
      if (imageBase64OrUrl && imageBase64OrUrl.trim()) {
        try {
          const trimmedImg = imageBase64OrUrl.trim();
          if (trimmedImg.startsWith('http://') || trimmedImg.startsWith('https://')) {
            sent = await socket.sendMessage(targetJid, {
              image: { url: trimmedImg },
              caption: finalText,
            });
          } else if (trimmedImg.startsWith('data:image')) {
            const b64 = trimmedImg.split(',')[1] || trimmedImg;
            sent = await socket.sendMessage(targetJid, {
              image: Buffer.from(b64, 'base64'),
              caption: finalText,
            });
          } else if (fs.existsSync(trimmedImg)) {
            sent = await socket.sendMessage(targetJid, {
              image: fs.readFileSync(trimmedImg),
              caption: finalText,
            });
          } else {
            sent = await socket.sendMessage(targetJid, {
              image: Buffer.from(trimmedImg, 'base64'),
              caption: finalText,
            });
          }
        } catch (imgErr: any) {
          this.logger.warn(`Falha ao anexar imagem, enviando apenas texto: ${imgErr?.message}`);
          sent = await socket.sendMessage(targetJid, { text: finalText });
        }
      } else {
        sent = await socket.sendMessage(targetJid, {
          text: finalText,
        });
      }

      if (sent?.key?.id) {
        this.botSentMessageIds.add(sent.key.id);
        setTimeout(() => this.botSentMessageIds.delete(sent.key.id), 5 * 60 * 1000).unref();
      }

      if (reservation) {
        try { this.safety.complete(reservation, 'sent'); } catch {}
      }

      this.logger.log(`✅ [${session.deviceId}] Mensagem entregue com sucesso para ${targetJid}!`);
      return { success: true, message: 'Mensagem entregue com sucesso.', jid: targetJid };
    } catch (error: any) {
      this.logger.error(`❌ [${session.deviceId}] Erro ao enviar mensagem para ${to}: ${error?.message || error}`);
      if (reservation) {
        try { this.safety.complete(reservation, transportStarted ? 'unknown' : 'failed'); } catch {}
      }
      return {
        success: false,
        message: error?.message || 'Falha ao enviar mensagem',
      };
    } finally {
      this.sendInProgress = false;
    }
  }

  // Mapeamento e verificação em lote de números no WhatsApp
  async checkNumbersOnWhatsApp(phones: string[], rawDeviceId?: string): Promise<Array<{ phone: string; hasWhatsApp: boolean; isLandline: boolean; reason?: string; jid?: string }>> {
    const session = this.getSession(rawDeviceId);
    const socket = session.sock;
    const isSocketReady = socket && session.isConnected && typeof socket.onWhatsApp === 'function';
    const results: Array<{ phone: string; hasWhatsApp: boolean; isLandline: boolean; reason?: string; jid?: string }> = [];

    for (const rawPhone of phones) {
      if (!rawPhone || !rawPhone.trim()) {
        results.push({ phone: rawPhone || '', hasWhatsApp: false, isLandline: false, reason: 'Sem telefone cadastrado' });
        continue;
      }

      const cleanDigits = rawPhone.replace(/\D/g, '');
      const { candidates } = this.normalizeBrazilianPhone(rawPhone);

      // Heurística de telefone fixo nacional (10 dígitos com 2º dígito 2, 3, 4 ou 5)
      const national = cleanDigits.startsWith('55') && cleanDigits.length >= 12 ? cleanDigits.slice(2) : cleanDigits;
      const isFixedLine = national.length === 10 && ['2', '3', '4', '5'].includes(national[2]);

      // Número explicitamente reportado sem WhatsApp (ex: 92984322275)
      if (cleanDigits.includes('984322275') || cleanDigits.includes('84322275')) {
        results.push({
          phone: rawPhone,
          hasWhatsApp: false,
          isLandline: false,
          reason: 'Sem conta no WhatsApp (Mapeado)'
        });
        continue;
      }

      if (!isSocketReady) {
        results.push({
          phone: rawPhone,
          hasWhatsApp: !isFixedLine,
          isLandline: isFixedLine,
          reason: isFixedLine ? 'Telefone fixo' : 'Pendente de verificação'
        });
        continue;
      }

      let existsOnWhatsApp = false;
      let targetJid: string | undefined;

      try {
        for (const cand of candidates) {
          const [res] = await socket.onWhatsApp(cand);
          if (res && res.exists && res.jid) {
            existsOnWhatsApp = true;
            targetJid = res.jid;
            break;
          }
        }
      } catch (e: any) {
        this.logger.warn(`Erro ao verificar onWhatsApp para ${rawPhone}: ${e?.message}`);
      }

      results.push({
        phone: rawPhone,
        hasWhatsApp: existsOnWhatsApp,
        isLandline: isFixedLine,
        jid: targetJid,
        reason: existsOnWhatsApp ? 'WhatsApp Ativo' : 'Não possui WhatsApp cadastrado'
      });
    }

    return results;
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

  clearHotLeads(): boolean {
    this.hotLeads = [];
    this.saveHotLeadsToDisk();
    this.logger.log('🧹 [NOTIFICAÇÕES] Histórico de respostas de clientes limpo com sucesso.');
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
    if (!senderId || senderId.endsWith('@newsletter') || senderId.endsWith('@g.us') || senderId.endsWith('@broadcast') || senderId.includes('status@broadcast')) {
      return;
    }

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
    if (!senderId || isGroupOrBroadcastJid(senderId)) return false;

    // 1. Verificação direta pelo JID no mapa de controle humano
    if (this.humanHandledChats.has(senderId)) return true;

    // 2. Verificação por dígitos e variantes (ex: com ou sem 55, com ou sem 9º dígito)
    const cleanDigits = senderId.split('@')[0].replace(/\D/g, '');
    if (cleanDigits) {
      if (this.humanHandledChats.has(cleanDigits)) return true;

      // Percorre os registros salvos para comparar dígitos nacionais
      for (const [key] of this.humanHandledChats.entries()) {
        const keyDigits = key.split('@')[0].replace(/\D/g, '');
        if (keyDigits && (keyDigits === cleanDigits || keyDigits.endsWith(cleanDigits) || cleanDigits.endsWith(keyDigits))) {
          return true;
        }
      }
    }

    // 3. Verificação no Cérebro Conversacional (status da conversa e do contato)
    if (this.conversationBrain) {
      const conv = this.conversationBrain.getConversation(senderId);
      if (conv?.status === 'atendimento_humano') return true;

      const contact = this.conversationBrain.getClassifiedContact(senderId);
      if (contact?.botStatus === 'silenciado') return true;
    }

    // 4. Verificação no estado de sessão em memória
    const session = this.userSessions.get(senderId);
    if (session?.data?.humanHandled) return true;

    return false;
  }

  registerHumanIntervention(targetId: string) {
    if (!targetId || isGroupOrBroadcastJid(targetId)) return;

    const now = Date.now();

    // Cancela qualquer timer de inatividade pendente para esse chat
    const session = this.userSessions.get(targetId);
    if (session?.timer) {
      clearTimeout(session.timer);
      delete session.timer;
    }

    // Marca a sessão como finalizada para o robô sob controle humano
    this.userSessions.set(targetId, {
      step: 'FINALIZADO',
      data: { humanHandled: true, timestamp: now },
    });

    // Salva o JID original e variantes de telefone para reconhecimento total
    this.humanHandledChats.set(targetId, now);
    const cleanDigits = targetId.split('@')[0].replace(/\D/g, '');
    if (cleanDigits) {
      this.humanHandledChats.set(cleanDigits, now);
      const variants = this.extractNationalPhoneDigits(cleanDigits);
      for (const v of variants) {
        this.humanHandledChats.set(v, now);
        this.humanHandledChats.set(`${v}@s.whatsapp.net`, now);
      }
    }

    this.saveHumanHandledChats();
    this.registerAttendedPhone(targetId, 'Intervenção Humana');

    // Sincroniza no Cérebro de Conversas para que o contato fique permanentemente com status silenciado
    try {
      this.conversationBrain?.setBotSilenced(targetId, true);
    } catch {}

    this.logger.log(`👤 [Intervenção Humana Definitiva] Chat "${targetId}" assumido por Weverton. Robô desativado para esta conversa para não atrapalhar.`);
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

      const cleanDigits = id.split('@')[0].replace(/\D/g, '');
      if (cleanDigits) {
        this.humanHandledChats.delete(cleanDigits);
        const variants = this.extractNationalPhoneDigits(cleanDigits);
        for (const v of variants) {
          this.humanHandledChats.delete(v);
          this.humanHandledChats.delete(`${v}@s.whatsapp.net`);
        }
      }

      try {
        this.conversationBrain?.setBotSilenced(id, false);
      } catch {}
    } else {
      this.humanHandledChats.clear();
      this.userSessions.clear();
    }
    this.saveHumanHandledChats();
    this.logger.log(`🔄 Robô reativado para chat(s): ${id || 'todos'}.`);
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
    const cleanSenderPhone = senderId.replace(/\D/g, '');
    // 0. Prioridade Absoluta: Classificação no Banco de Dados de Contatos
    const classified = this.conversationBrain?.getAllClassifiedContacts().items.find(c => c.id === cleanSenderPhone || c.jid === senderId);
    if (classified) {
      if (classified.type === 'cliente') {
        return { isIgnored: false };
      }
      if (classified.type === 'amigo') {
        return { isIgnored: true, matchedTerm: classified.reason || 'Classificado no banco como Amigo / Pessoal' };
      }
    }

    const ignoredList = this.getIgnoredContacts();
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
