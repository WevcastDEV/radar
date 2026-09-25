'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { 
  MessageSquare, GitBranch,
  Volume2, Bell, TrendingUp, Trophy, Flame, 
  Send, 
  Pause, 
  Play, 
  Square, 
  Clock, 
  CheckCircle2, 
  CheckSquare, 
  Folder, 
  Calendar, 
  User, 
  Search, 
  Sparkles, 
  Bot, 
  Smartphone,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Image as ImageIcon,
  Upload,
  X,
  Plus,
  Edit3,
  Copy,
  Tag,
  RotateCcw,
  Save,
  Shield,
  FastForward,
  Zap,
  QrCode,
  RefreshCw,
  AlertCircle,
  AlertTriangle,
  Download,
  HardDrive,
  Power,
  MapPin,
  Handshake,
  Check,
  BookOpen,
  Sliders,
  FolderOpen,
} from 'lucide-react';
import { ImportMapsModal } from '@/components/leads/import-maps-modal';
import { 
  useLeads, 
  getStoredLeads,
  saveStoredLeads,
  getDispatchedHistory, 
  syncDispatchedHistoryWithServer, 
  markLeadAsDispatched, 
  clearDispatchedHistory, 
  DispatchedLeadRecord 
} from '@/hooks/use-leads';
import { getCategoryMeta } from '@/lib/categories';
import { BRAZIL_STATES, BRAZIL_REGIONS, getStateByUF, generateNationalSeedLeads } from '@/lib/brazil-states';
import { useAuthStore } from '@/stores/auth-store';
import { LeadStatus } from '@radar/types';
import toast from 'react-hot-toast';
import { safeWhatsAppClient as axios } from './whatsapp-client';
import { DispatchSafetyPanel } from './dispatch-safety-panel';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { formatBrazilianPhone, toWhatsAppJidDigits, extractPhoneVariants } from '@/lib/phone-utils';
import { getOrCreateDeviceId, getDeviceName, setDeviceName } from '@/lib/device-id';
import { getStoredFlows, getActiveFlowIdFromStorage } from '@/lib/bot-flow';

// Normalização e extração de variantes de números de telefone para proteção anti-reenvio
const extractPhoneDigitsVariants = (raw: string): string[] => {
  return extractPhoneVariants(raw);
};

const TEMPLATES_STORAGE_KEY = 'radar_whatsapp_custom_templates';
const ATTACHED_IMAGE_STORAGE_KEY = 'radar_whatsapp_attached_image';
const SELECTED_LEADS_STORAGE_KEY = 'radar_whatsapp_selected_leads';
const DISPATCH_CONFIG_STORAGE_KEY = 'radar_whatsapp_dispatch_config';

// Modelos pré-definidos com variações de texto e foco em Sites, Programas e Automação
const DEFAULT_MESSAGE_TEMPLATES = [
  {
    id: 'safe-tpl-1',
    name: '🌐 Modelo 1: Criação de Sites & Presença Digital',
    text: `{Olá|Oi|Tudo bem?|Olá, como vai?} equipe da {{nome_cliente}}!

Me chamo {{meu_nome}}, especialista em criação de sites e tecnologia da {{minha_empresa}}.

Acompanhamos o trabalho de vocês no segmento de {{segmento}} em {{cidade}} e desenvolvemos sites modernos, rápidos e integrados ao WhatsApp para atrair mais clientes e transmitir autoridade.

{Você teria 2 minutinhos|Teria um momento} para que eu te mostre uma prévia rápida de como podemos posicionar a {{nome_cliente}} com destaque no Google e na internet?`,
  },
  {
    id: 'safe-tpl-2',
    name: '💻 Modelo 2: Programas & Sistemas Personalizados para Clientes',
    text: `{Olá|Oi|Como vai?|Olá, tudo bem?}, falo com o responsável pela gestão ou operações da {{nome_cliente}}?

Sou o {{meu_nome}} da {{minha_empresa}}. Desenvolvemos programas, plataformas e sistemas sob medida para empresas de {{segmento}} (controle de vendas, clientes, financeiro, estoque e painéis de gestão).

Vocês já utilizam um sistema próprio hoje ou têm interesse em informatizar processos que ainda dependem de planilhas manuais? Posso apresentar soluções sem compromisso.`,
  },
  {
    id: 'safe-tpl-3',
    name: '⚙️ Modelo 3: Automação Comercial & Robôs de Atendimento',
    text: `{Oi, tudo bem?|Olá, bom dia|Olá, boa tarde}, tudo bem com a equipe da {{nome_cliente}}?

Aqui é o {{meu_nome}} da {{minha_empresa}}. Criamos soluções de automação empresarial e robôs inteligentes de atendimento para acelerar respostas aos clientes, automatizar pedidos e eliminar tarefas manuais no setor de {{segmento}}.

Faria sentido para a {{nome_cliente}} ver como a automação pode economizar horas de trabalho da sua equipe e nunca deixar um cliente esperando?`,
  },
  {
    id: 'safe-tpl-4',
    name: '🚀 Modelo 4: Solução Completa (Site + Sistema + Automação)',
    text: `{Olá|Oi|Tudo bem?}, equipe da {{nome_cliente}}!

Me chamo {{meu_nome}} da {{minha_empresa}}. Trabalhamos com desenvolvimento de sites profissionais, criação de programas personalizados e automação de processos comerciais para empresas em {{cidade}}.

Se vocês têm planos de modernizar a empresa, criar um sistema próprio ou automatizar rotinas, posso te enviar um resumo em PDF com cases e condições especiais para empresas da região?`,
  },
  {
    id: 'safe-tpl-5',
    name: '🎯 Modelo 5: Demonstração, Portfólio & Link Oficial (Pós-Resposta)',
    text: `{Perfeito|Excelente|Muito obrigado pelo retorno!}! Seguem as soluções em software e tecnologia que desenvolvemos para a {{nome_cliente}}:

🌐 Criação de Sites Modernos, Landing Pages e Lojas Virtuais
💻 Desenvolvimento de Programas e Sistemas Sob Medida
⚙️ Automação de Processos Comerciais e Robôs Inteligentes
🛒 Sistemas de Gestão, Estoque, Vendas e PDV
🔧 Manutenção Especializada, Suporte Técnico e Redes

🌐 Conheça nossos projetos e portfólio oficial:
https://wctech.web.app/

Qual dessas frentes mais interessa para a {{nome_cliente}} no momento para prepararmos uma proposta sem compromisso?`,
  }
];

const INITIAL_DEFAULT_TEMPLATES = DEFAULT_MESSAGE_TEMPLATES;

const PRESET_SAMPLE_IMAGE = 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=800&q=80';


// 🔊 Síntese Sonora Web Audio API (Chime Duplo Nítido - Sem dependências externas ou arquivos locais)
const playHotLeadChime = () => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now); // E5
    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.3);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(830.61, now + 0.15); // G#5
    gain2.gain.setValueAtTime(0.35, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.6);
  } catch (e) {
    console.error('Audio chime error:', e);
  }
};

// 🔔 Notificação Nativa do Navegador (Web Notification API)
const triggerNativeBrowserNotification = (title: string, body: string) => {
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/favicon.ico' });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(perm => {
        if (perm === 'granted') {
          new Notification(title, { body, icon: '/favicon.ico' });
        }
      });
    }
  }
};

export default function WhatsAppBotPage() {
  const confirm = useConfirm();
  const { data: allLeads, refetch: refetchLeads } = useLeads();
  const { user } = useAuthStore();


  // 🔥 Leads Quentes (Respostas em Tempo Real com Notificação Sonora & Push)
  const [hotLeads, setHotLeads] = useState<any[]>([]);
  const [unreadHotLeadsCount, setUnreadHotLeadsCount] = useState(0);
  const [isHotLeadsModalOpen, setIsHotLeadsModalOpen] = useState(false);
  const lastNotifiedReplyIdRef = useRef<string | null>(null);
  const pendingCategoryScrollRef = useRef<HTMLDivElement>(null);
  const historyCategoryScrollRef = useRef<HTMLDivElement>(null);
  const [pendingCategorySearch, setPendingCategorySearch] = useState('');
  const [historyCategorySearch, setHistoryCategorySearch] = useState('');

  // 📊 Métricas do Teste A/B de Modelos de Mensagem
  const [abAnalytics, setAbAnalytics] = useState<{
    templates: Array<{ templateName: string; dispatched: number; replied: number; conversionRate: number; isChampion: boolean }>;
    totalDispatched: number;
    totalReplied: number;
    globalRate: number;
  }>({ templates: [], totalDispatched: 0, totalReplied: 0, globalRate: 0 });
  const [isAbModalOpen, setIsAbModalOpen] = useState(false);

  // 🤖 Pré-Vendedor SDR Inteligente de Custo Zero (Universal & Multi-Nicho)
  const [isSdrModalOpen, setIsSdrModalOpen] = useState(false);
  const [sdrConfig, setSdrConfig] = useState<any>({
    enabled: true,
    businessName: 'WCTech',
    businessNiche: 'Criação de Sites, Sistemas e Automação',
    intentResponses: {
      price: '',
      interested: '',
      moreInfo: '',
      human: '',
      notInterested: '',
    }
  });
  const [isSavingSdr, setIsSavingSdr] = useState(false);

  // 🌿 Fluxo Ativo de Conversação do Robô
  const [activeFlowLabel, setActiveFlowLabel] = useState<string>('Carregando...');
  useEffect(() => {
    try {
      const list = getStoredFlows();
      const actId = getActiveFlowIdFromStorage(list);
      const found = list.find((f) => f.id === actId) || list[0];
      if (found) {
        setActiveFlowLabel(`${found.name}`);
      }
    } catch {}
  }, []);

  // Status da conexão e isolamento por computador
  const [deviceId, setDeviceId] = useState<string>('');
  const [deviceName, setDeviceNameState] = useState<string>('');
  const [isEditingDeviceName, setIsEditingDeviceName] = useState(false);
  const [tempDeviceName, setTempDeviceName] = useState('');

  const [botStatus, setBotStatus] = useState<{
    connected: boolean;
    qrCode: string | null;
    autoReplyEnabled?: boolean;
    cordialityEnabled?: boolean;
    antiBan?: {
      dailySent: number;
      dailyLimit: number;
      hourlySent: number;
      hourlyLimit: number;
      isWithinSafeHours: boolean;
      isWarmupComplete: boolean;
      safetyGate: string | null;
    };
  }>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('radar_whatsapp_bot_status_cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && parsed.connected) {
            return { connected: true, qrCode: null, autoReplyEnabled: true, cordialityEnabled: true };
          }
        }
      } catch {}
    }
    return { connected: false, qrCode: null, autoReplyEnabled: true, cordialityEnabled: true };
  });
  const [isCheckingBot, setIsCheckingBot] = useState(false);
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);
  const [isTogglingAutoReply, setIsTogglingAutoReply] = useState(false);
  const [isTogglingCordiality, setIsTogglingCordiality] = useState(false);

  const handleSaveDeviceName = () => {
    if (tempDeviceName.trim()) {
      setDeviceName(tempDeviceName.trim());
      setDeviceNameState(tempDeviceName.trim());
      setIsEditingDeviceName(false);
      toast.success(`Nome da máquina salvo: ${tempDeviceName.trim()}`, { icon: '💻' });
    }
  };

  // Campos de personalização do remetente
  const [senderName, setSenderName] = useState(user?.name || 'Weverton');
  const [companyName, setCompanyName] = useState('Radar de Oportunidades');

  // Modelos de Mensagem (Salvos no localStorage)
  const [templates, setTemplates] = useState(INITIAL_DEFAULT_TEMPLATES);
  const [selectedTemplateIndex, setSelectedTemplateIndex] = useState(0);
  const [rotateTemplates, setRotateTemplates] = useState(true);

  // Modal para Criar / Editar Modelo
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [modalTemplateName, setModalTemplateName] = useState('');
  const [modalTemplateText, setModalTemplateText] = useState('');

  // Anexo de Imagem
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fila de espera e seleção de leads
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todas');
  const [stateFilter, setStateFilter] = useState<string>('TODOS');
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);

  // Modal de Prospecção Nacional por Estado/DDD
  const [isNationalProspectModalOpen, setIsNationalProspectModalOpen] = useState(false);
  const [prospectUF, setProspectUF] = useState<string>('SP');
  const [prospectCount, setProspectCount] = useState<number>(12);

  // Sistema de tempo e controle do disparo
  const [dispatchIntervalSeconds, setDispatchIntervalSeconds] = useState(240); // Padrão solicitado: 4 minutos (240s)
  const [useBatchMode, setUseBatchMode] = useState(true); // Modo lote ativado por padrão
  const [batchSize, setBatchSize] = useState(10); // Padrão solicitado: 10 clientes por ciclo
  const [batchPauseMinutes, setBatchPauseMinutes] = useState(30); // Padrão solicitado: 30 minutos de descanso
  const [isDispatching, setIsDispatching] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isBatchResting, setIsBatchResting] = useState(false); // Em descanso entre lotes (30 min)
  const [batchRestCountdown, setBatchRestCountdown] = useState(0); // Contagem regressiva do descanso (em segundos)
  const [currentBatchNum, setCurrentBatchNum] = useState(1);
  const [totalBatchesCount, setTotalBatchesCount] = useState(1);
  const [sentInCurrentBatch, setSentInCurrentBatch] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [nextLeadInfo, setNextLeadInfo] = useState<{ name: string; phone: string; category?: string } | null>(null);
  const [isSkippingCountdown, setIsSkippingCountdown] = useState(false);
  const [queueLastError, setQueueLastError] = useState<string | null>(null);
  const lastHandledDispatchTimeRef = useRef<number>(0);

  // Aba da Fila de Leads: 'pending' (Pendentes para Disparo) ou 'dispatched' (Já Acionados)
  const [queueTab, setQueueTab] = useState<'pending' | 'dispatched'>('pending');

  // Histórico de Acionados em Pastas
  const [history, setHistory] = useState<DispatchedLeadRecord[]>([]);
  const [historyOpen, setHistoryOpen] = useState(true);
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [historyCategoryFilter, setHistoryCategoryFilter] = useState<string>('Todas');
  const [historyViewMode, setHistoryViewMode] = useState<'by_folder' | 'by_date'>('by_folder');
  const [expandedHistoryFolders, setExpandedHistoryFolders] = useState<Record<string, boolean>>({});
  const [isSyncingHistory, setIsSyncingHistory] = useState(false);

  // Regras de envio
  const [isAntiBanModalOpen, setIsAntiBanModalOpen] = useState(false);

  // Contatos Pessoais e Familiares Ignorados pelo Robô
  const [ignoredContacts, setIgnoredContacts] = useState<string[]>([]);
  const [isIgnoredModalOpen, setIsIgnoredModalOpen] = useState(false);
  const [newIgnoredInput, setNewIgnoredInput] = useState('');
  const [isSavingIgnored, setIsSavingIgnored] = useState(false);
  const [isImportMapsOpen, setIsImportMapsOpen] = useState(false);

  // Telefones já atendidos registrados no servidor (Anti-Reenvio Permanente)
  const [attendedPhones, setAttendedPhones] = useState<Array<{ phone: string; reason: string; timestamp: number }>>([]);
  const [isAttendedModalOpen, setIsAttendedModalOpen] = useState(false);
  const [attendedSearchQuery, setAttendedSearchQuery] = useState('');

  // Refs de controle e rastreamento da fila no servidor
  const wasRunningRef = useRef(false);
  const lastDispatchedIndexRef = useRef(0);

  // Carregar templates, imagem anexada e histórico do localStorage ao iniciar
  useEffect(() => {
    try {
      const rawTemplates = localStorage.getItem(TEMPLATES_STORAGE_KEY);
      if (rawTemplates) {
        const parsed = JSON.parse(rawTemplates);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Migrar automaticamente referências para WCTech e modelos seguros
          let hasChanges = false;
          let migrated = parsed.map((t: any) => {
            if (typeof t.text !== 'string') return t;
            let newText = t.text;
            let newName = t.name || '';

            // Se contém Wev Engineer, substituir por WCTech
            if (/wev\s*engineer/i.test(newText) || /wev\s*engineer/i.test(newName)) {
              newText = newText.replace(/wev\s*engineer/gi, 'WCTech');
              newName = newName.replace(/wev\s*engineer/gi, 'WCTech');
              hasChanges = true;
            }

            // Migrar URLs antigas
            if (/wevengineer\.web\.app/i.test(newText)) {
              newText = newText
                .replace(/https?:\/\/wevengineer\.web\.app\/?/gi, 'https://wctech.web.app/')
                .replace(/wevengineer\.web\.app/gi, 'wctech.web.app');
              hasChanges = true;
            }

            return { ...t, name: newName, text: newText };
          });

          // Detectar conjunto legado com Wev Engineer ou sem Spintax
          const isLegacySet = parsed.some((t: any) => 
            /wev\s*engineer/i.test(t.text || '') || 
            (t.text && t.text.includes('Oferecemos soluções para pessoas e empresas, como:') && !t.text.includes('{'))
          );

          if (isLegacySet) {
            migrated = DEFAULT_MESSAGE_TEMPLATES;
            hasChanges = true;
          }

          if (hasChanges) {
            localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(migrated));
          }
          setTemplates(migrated);
        }
      }
    } catch (e) {
      console.error(e);
    }

    try {
      const savedImage = localStorage.getItem(ATTACHED_IMAGE_STORAGE_KEY);
      if (savedImage) {
        setAttachedImage(savedImage);
      }
    } catch (e) {
      console.error(e);
    }

    try {
      const savedSelected = localStorage.getItem(SELECTED_LEADS_STORAGE_KEY);
      if (savedSelected) {
        const parsed = JSON.parse(savedSelected);
        if (Array.isArray(parsed)) {
          setSelectedLeadIds(parsed);
        }
      }
    } catch (e) {
      console.error(e);
    }

    try {
      const savedConfig = localStorage.getItem(DISPATCH_CONFIG_STORAGE_KEY);
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        if (parsed.interval) setDispatchIntervalSeconds(parsed.interval);
        if (parsed.batchSize) setBatchSize(parsed.batchSize);
        if (parsed.batchPause) setBatchPauseMinutes(parsed.batchPause);
      }
    } catch (e) {
      console.error(e);
    }

    try {
      const id = getOrCreateDeviceId();
      const name = getDeviceName();
      setDeviceId(id);
      setDeviceNameState(name);
      setTempDeviceName(name);
    } catch (e) {}

    // Carrega histórico local e sincroniza imediatamente com o servidor permanente
    setHistory(getDispatchedHistory());
    setIsSyncingHistory(true);
    syncDispatchedHistoryWithServer()
      .then(synced => {
        setHistory(synced);
        refetchLeads();
      })
      .finally(() => {
        setIsSyncingHistory(false);
      });

    checkBotStatus();
    fetchIgnoredContacts();
    fetchAttendedPhones();
    fetchHotLeads();
    fetchAbAnalytics();
    fetchSdrConfig();
  }, []);

  // Monitoramento dinâmico do status do WhatsApp:
  // Executa em segundo plano de forma silenciosa (sem piscar a interface)
  // Intervalo de 6s quando desconectado e 15s quando conectado
  useEffect(() => {
    checkBotStatus({ manual: false });
    const pollInterval = botStatus.connected ? 15000 : 6000;
    const interval = setInterval(() => checkBotStatus({ manual: false }), pollInterval);
    return () => clearInterval(interval);
  }, [botStatus.connected]);

  // Sincronização e monitoramento da Fila de Disparos em segundo plano no Servidor
  useEffect(() => {
    let timer: NodeJS.Timeout;

    const pollServerQueue = async () => {
      try {
        const res = await axios.get('/whatsapp/queue', { timeout: 3000 });
        const q = res.data?.data;
        if (!q) return;

        if (q.isRunning) {
          wasRunningRef.current = true;
          setIsDispatching(true);
          setIsPaused(Boolean(q.isPaused));
          setCurrentIndex(Number(q.currentIndex) || 0);
          setCountdown(Number(q.countdown) || 0);
          setIsBatchResting(Boolean(q.isBatchResting));
          setBatchRestCountdown(Number(q.batchRestCountdown) || 0);
          setCurrentBatchNum(Number(q.currentBatch) || 1);
          setTotalBatchesCount(Number(q.totalBatches) || 1);
          setSentInCurrentBatch(Number(q.sentInBatch) || 0);
          setNextLeadInfo(q.nextLead ? {
            name: String(q.nextLead.name || ''),
            phone: String(q.nextLead.phone || ''),
            category: String(q.nextLead.category || ''),
          } : null);

          let safeErr = q.lastError || null;
          if (safeErr && typeof safeErr !== 'string') {
            safeErr = Array.isArray(safeErr) ? safeErr.join(', ') : JSON.stringify(safeErr);
          }
          setQueueLastError(safeErr);

          // Rastreia e notifica sobre cada resultado de disparo
          if (q.lastDispatchResult && q.lastDispatchResult.timestamp > lastHandledDispatchTimeRef.current) {
            lastHandledDispatchTimeRef.current = q.lastDispatchResult.timestamp;
            const leadName = String(q.lastDispatchResult.leadName || 'Cliente');
            if (q.lastDispatchResult.success) {
              toast.success(`✅ Disparo concluído: ${leadName}!`, { icon: '🚀' });
            } else {
              let failMsg = q.lastDispatchResult.message || 'Falha no envio';
              if (Array.isArray(failMsg)) failMsg = failMsg.join(', ');
              if (typeof failMsg !== 'string') failMsg = JSON.stringify(failMsg);
              toast.error(`❌ Falha no disparo (${leadName}): ${failMsg}`, { duration: 6000 });
            }
          }

          // Quando o servidor avança no envio de um cliente, atualiza o histórico e os leads em tempo real
          if (q.currentIndex !== lastDispatchedIndexRef.current) {
            lastDispatchedIndexRef.current = q.currentIndex;
            syncDispatchedHistoryWithServer().then(synced => {
              setHistory(synced);
              refetchLeads();
              fetchAttendedPhones();
            });
          }
        } else {
          // Se a fila estava rodando e agora concluiu no servidor
          if (wasRunningRef.current) {
            wasRunningRef.current = false;
            lastDispatchedIndexRef.current = 0;
            setIsDispatching(false);
            setIsPaused(false);
            setIsBatchResting(false);
            setBatchRestCountdown(0);
            setCurrentIndex(0);
            setCountdown(0);
            setSentInCurrentBatch(0);
            setNextLeadInfo(null);
            toast.success('Disparos da fila concluídos com sucesso no servidor!');
            syncDispatchedHistoryWithServer().then(synced => {
              setHistory(synced);
              refetchLeads();
            });
          }
        }
      } catch (e) {
        // Ignora erros temporários de requisição
      }
    };

    pollServerQueue();
    // Se a fila estiver ativa no dashboard, faz polling a cada 1 segundo (tempo real perfeito)
    // Se ociosa, faz polling a cada 3 segundos para detectar disparos em andamento
    const pollRate = isDispatching ? 1000 : 3000;
    timer = setInterval(pollServerQueue, pollRate);

    return () => clearInterval(timer);
  }, [isDispatching, refetchLeads]);

  // Salvar seleção de leads no localStorage
  const updateSelectedLeadIds = (newSelected: string[]) => {
    setSelectedLeadIds(newSelected);
    try {
      localStorage.setItem(SELECTED_LEADS_STORAGE_KEY, JSON.stringify(newSelected));
    } catch (e) {
      console.error(e);
    }
  };

  // Salvar configurações de intervalo e lote no localStorage
  const updateDispatchConfig = (newInterval?: number, newBatchSize?: number, newBatchPause?: number) => {
    const interval = newInterval !== undefined ? newInterval : dispatchIntervalSeconds;
    const bSize = newBatchSize !== undefined ? newBatchSize : batchSize;
    const bPause = newBatchPause !== undefined ? newBatchPause : batchPauseMinutes;

    if (newInterval !== undefined) setDispatchIntervalSeconds(newInterval);
    if (newBatchSize !== undefined) setBatchSize(newBatchSize);
    if (newBatchPause !== undefined) setBatchPauseMinutes(newBatchPause);

    try {
      localStorage.setItem(DISPATCH_CONFIG_STORAGE_KEY, JSON.stringify({
        interval,
        batchSize: bSize,
        batchPause: bPause,
      }));
    } catch (e) {
      console.error(e);
    }
  };

  const saveTemplatesToStorage = (updated: typeof INITIAL_DEFAULT_TEMPLATES) => {
    setTemplates(updated);
    try {
      localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const updateAttachedImage = (newImage: string | null) => {
    setAttachedImage(newImage);
    try {
      if (newImage) {
        localStorage.setItem(ATTACHED_IMAGE_STORAGE_KEY, newImage);
      } else {
        localStorage.removeItem(ATTACHED_IMAGE_STORAGE_KEY);
      }
    } catch (e) {
      console.warn('Could not persist image to localStorage', e);
    }
  };

  const checkBotStatus = async (options?: { manual?: boolean }) => {
    const isManual = options?.manual === true;
    if (isManual) {
      setIsCheckingBot(true);
    }
    try {
      let data: any = null;

      // 1. Consulta o proxy oficial /api/whatsapp/status
      try {
        const res = await axios.get('/whatsapp/status', { timeout: 3000 });
        data = res.data?.data || res.data;
      } catch (err) {
        // Silencioso
      }

      // 2. Se estiver na nuvem (Vercel) ou o proxy não tiver o robô ativo,
      // tenta conectar diretamente no daemon local da máquina do usuário (http://127.0.0.1:3001)
      if (typeof window !== 'undefined' && (!data || (!data.connected && !data.qrCode))) {
        try {
          const directRes = await fetch('http://127.0.0.1:3001/api/whatsapp/status', {
            headers: { 'x-device-id': deviceId || getOrCreateDeviceId() },
            signal: AbortSignal.timeout(1200),
          });
          if (directRes.ok) {
            const directJson = await directRes.json();
            if (directJson?.data) {
              data = directJson.data;
            }
          }
        } catch {
          // Daemon local não em execução nesta porta
        }
      }

      if (data && typeof data.connected === 'boolean') {
        setBotStatus(prev => {
          const nextConnected = Boolean(data.connected);
          const nextQr = data.qrCode || null;
          const nextAutoReply = data.autoReplyEnabled ?? prev.autoReplyEnabled;
          const nextCordiality = data.cordialityEnabled ?? prev.cordialityEnabled;

          // Se nada mudou, mantém a mesma referência do objeto para o React não re-renderizar nem piscar a tela
          if (
            prev.connected === nextConnected &&
            prev.qrCode === nextQr &&
            prev.autoReplyEnabled === nextAutoReply &&
            prev.cordialityEnabled === nextCordiality
          ) {
            return prev;
          }

          if (nextConnected) {
            try {
              localStorage.setItem('radar_whatsapp_bot_status_cache', JSON.stringify({ connected: true }));
            } catch {}
          } else if (nextQr) {
            try {
              localStorage.removeItem('radar_whatsapp_bot_status_cache');
            } catch {}
          }

          return {
            ...prev,
            ...data,
            connected: nextConnected,
            qrCode: nextQr,
          };
        });
      }
    } catch (e) {
      // Silencioso
    } finally {
      if (isManual) {
        setIsCheckingBot(false);
      }
    }
  };

  const handleReconnectBot = async (forceNewSession = true) => {
    setIsGeneratingQr(true);
    try {
      setBotStatus(prev => ({ ...prev, connected: false, qrCode: null }));
      
      // Envia requisição tanto pelo proxy quanto diretamente ao robô local
      const p1 = axios.post('/whatsapp/reconnect', { forceNewSession }).catch(() => {});
      const p2 = (typeof window !== 'undefined')
        ? fetch('http://127.0.0.1:3001/api/whatsapp/reconnect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-device-id': deviceId || getOrCreateDeviceId() },
            body: JSON.stringify({ forceNewSession }),
            signal: AbortSignal.timeout(3000),
          }).catch(() => {})
        : Promise.resolve();

      await Promise.race([Promise.all([p1, p2]), new Promise(r => setTimeout(r, 1000))]);
      toast.success('Solicitação enviada! Gerando novo QR Code...');

      // Polling ativo a cada 1s até o QR Code ou status conectado chegar
      let attempts = 0;
      const pollTimer = setInterval(async () => {
        attempts++;
        try {
          const res = await axios.get('/whatsapp/status', { timeout: 2500 });
          const d = res.data?.data || res.data;
          if (d?.qrCode) {
            setBotStatus(prev => ({ ...prev, ...d, qrCode: d.qrCode, connected: false }));
            setIsGeneratingQr(false);
            clearInterval(pollTimer);
            return;
          }
          if (d?.connected) {
            setBotStatus(prev => ({ ...prev, ...d, connected: true, qrCode: null }));
            setIsGeneratingQr(false);
            clearInterval(pollTimer);
            return;
          }
        } catch {}

        if (attempts >= 12) {
          setIsGeneratingQr(false);
          clearInterval(pollTimer);
        }
      }, 1000);
    } catch (e) {
      toast.error('Não foi possível solicitar a reconexão.');
      setIsGeneratingQr(false);
    }
  };

  const handleDisconnectBot = async () => {
    const confirmed = await confirm({
      title: 'Desconectar WhatsApp',
      description: 'Deseja desparear seu aparelho do robô? A sessão será encerrada. Para conectar novamente, será necessário solicitar um novo QR Code.',
      confirmText: 'Desconectar',
      cancelText: 'Cancelar',
      variant: 'warning',
      icon: 'alert',
    });

    if (confirmed) {
      setIsCheckingBot(true);
      try {
        try {
          localStorage.removeItem('radar_whatsapp_bot_status_cache');
        } catch {}
        setBotStatus(prev => ({ ...prev, connected: false, qrCode: null }));
        await axios.post('/whatsapp/disconnect');
        toast.success('WhatsApp desconectado. A conexão só será iniciada novamente quando você solicitar.');
        setTimeout(() => checkBotStatus({ manual: false }), 1200);
        setTimeout(() => checkBotStatus({ manual: false }), 2500);
      } catch (e) {
        toast.error('Erro ao desconectar WhatsApp.');
      } finally {
        setIsCheckingBot(false);
      }
    }
  };

  const handleToggleAutoReply = async () => {
    const nextState = !(botStatus.autoReplyEnabled ?? true);
    setIsTogglingAutoReply(true);
    try {
      await axios.post('/whatsapp/auto-reply', { enabled: nextState });
      setBotStatus(prev => ({ ...prev, autoReplyEnabled: nextState }));
      toast.success(nextState ? '🤖 Atendimento Automático ATIVADO!' : '⏸️ Atendimento Automático DESATIVADO (Robô Silencioso)');
    } catch (e) {
      toast.error('Não foi possível alterar o status do robô no servidor.');
    } finally {
      setIsTogglingAutoReply(false);
    }
  };


  // Buscar Leads Quentes com detecção de novas respostas
  const fetchHotLeads = async () => {
    try {
      const res = await axios.get('/whatsapp/hot-leads');
      const data = res.data?.data;
      if (data && Array.isArray(data.hotLeads)) {
        setHotLeads(data.hotLeads);
        setUnreadHotLeadsCount(data.unreadCount || 0);

        // Dispara som e notificação se houver novo lead quente não lido
        const latestUnread = data.hotLeads.find((h: any) => !h.read && !h.isRejected);
        if (latestUnread && latestUnread.id !== lastNotifiedReplyIdRef.current) {
          lastNotifiedReplyIdRef.current = latestUnread.id;
          playHotLeadChime();
          triggerNativeBrowserNotification(
            `🔥 Lead Quente: ${latestUnread.leadName || latestUnread.phone}`,
            `Respondeu: "${latestUnread.text}" (${latestUnread.templateName})`
          );
        }
      }
    } catch (e) {}
  };

  const handleMarkHotLeadsAsRead = async () => {
    try {
      await axios.post('/whatsapp/hot-leads/mark-read');
      setUnreadHotLeadsCount(0);
      setHotLeads(prev => prev.map(h => ({ ...h, read: true })));
    } catch (e) {}
  };

  // Buscar dados do Teste A/B
  const fetchAbAnalytics = async () => {
    try {
      const res = await axios.get('/whatsapp/ab-analytics');
      if (res.data?.data) {
        setAbAnalytics(res.data.data);
      }
    } catch (e) {}
  };

  // Buscar configurações do SDR Custo Zero
  const fetchSdrConfig = async () => {
    try {
      const res = await axios.get('/whatsapp/sdr-config');
      if (res.data?.data) {
        setSdrConfig(res.data.data);
      }
    } catch (e) {}
  };

  const handleSaveSdrConfig = async (newConfig: any) => {
    setIsSavingSdr(true);
    try {
      const res = await axios.post('/whatsapp/sdr-config', newConfig);
      if (res.data?.data) {
        setSdrConfig(res.data.data);
      }
      toast.success('Configurações do SDR Custo Zero salvas!');
      setIsSdrModalOpen(false);
    } catch (e) {
      toast.error('Erro ao salvar configurações do SDR.');
    } finally {
      setIsSavingSdr(false);
    }
  };

  const handleToggleCordiality = async () => {
    const nextState = !(botStatus.cordialityEnabled ?? true);
    setIsTogglingCordiality(true);
    try {
      await axios.post('/whatsapp/cordiality', { enabled: nextState });
      setBotStatus(prev => ({ ...prev, cordialityEnabled: nextState }));
      toast.success(nextState ? '🤝 Mensagem de cordialidade ATIVADA!' : '⏸️ Mensagem de cordialidade PAUSADA!');
    } catch (e) {
      toast.error('Não foi possível alterar a mensagem de cordialidade.');
    } finally {
      setIsTogglingCordiality(false);
    }
  };

  // Gerenciamento de Contatos Pessoais Ignorados pelo Robô
  const fetchIgnoredContacts = async () => {
    try {
      const res = await axios.get('/whatsapp/ignored-contacts');
      const data = res.data?.data;
      if (Array.isArray(data)) {
        setIgnoredContacts(data);
      }
    } catch (e) {
      console.error('Erro ao carregar contatos ignorados:', e);
    }
  };

  // Gerenciamento de Telefones Atendidos e Anti-Reenvio Permanente
  const fetchAttendedPhones = async () => {
    try {
      const res = await axios.get('/whatsapp/attended-phones', { timeout: 4000 });
      const data = res.data?.data;
      if (Array.isArray(data)) {
        setAttendedPhones(data);
      }
    } catch (e) {
      console.error('Erro ao carregar telefones atendidos:', e);
    }
  };

  const handleUnlockAttendedPhone = async (phone: string) => {
    try {
      await axios.post('/whatsapp/attended-phones/unlock', { phone });
      toast.success(`Número ${phone} liberado com sucesso para novos disparos.`);
      fetchAttendedPhones();
    } catch (e) {
      toast.error('Erro ao liberar número.');
    }
  };

  const saveIgnoredContactsToServer = async (list: string[]) => {
    setIsSavingIgnored(true);
    try {
      const res = await axios.post('/whatsapp/ignored-contacts', { contacts: list });
      if (res.data?.data && Array.isArray(res.data.data)) {
        setIgnoredContacts(res.data.data);
      }
      toast.success('Lista de contatos pessoais atualizada com sucesso!');
    } catch (e) {
      toast.error('Erro ao salvar lista no servidor.');
    } finally {
      setIsSavingIgnored(false);
    }
  };

  const handleAddIgnoredContact = () => {
    const val = newIgnoredInput.trim();
    if (!val) return;
    if (ignoredContacts.some(c => c.toLowerCase() === val.toLowerCase())) {
      toast.error('Este contato ou termo já está na lista.');
      return;
    }
    const updated = [...ignoredContacts, val];
    setIgnoredContacts(updated);
    setNewIgnoredInput('');
    saveIgnoredContactsToServer(updated);
  };

  const handleRemoveIgnoredContact = (term: string) => {
    const updated = ignoredContacts.filter(c => c !== term);
    setIgnoredContacts(updated);
    saveIgnoredContactsToServer(updated);
  };

  const handleResetIgnoredDefaults = async () => {
    const defaultList = [
      'dengosa', 'leticia', 'leticia tomais', 'namorada', '26655322026119', '26655322026119@lid',
      'mae', 'mãe', 'familia', 'família', 'amor', 'pai', 
      'esposa', 'marido', 'namorado', 'filho', 'filha', 'irma', 'irmã', 'irmao', 
      'irmão', 'tia', 'tio', 'sobrinho', 'sobrinha', 'vo', 'vó', 'vovô', 'vovo', 'primo', 'prima'
    ];
    setIgnoredContacts(defaultList);
    await saveIgnoredContactsToServer(defaultList);
    toast.success('Lista restaurada para os padrões.');
  };

  // Upload local de imagem via FileReader (base64)
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione um arquivo de imagem válido (JPG, PNG, WebP)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 5MB para envio no WhatsApp');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      updateAttachedImage(dataUrl);
      toast.success('Imagem promocional anexada e salva!');
    };
    reader.readAsDataURL(file);
  };

  const handleUsePresetImage = () => {
    updateAttachedImage(PRESET_SAMPLE_IMAGE);
    toast.success('Folder promocional padrão carregado e salvo!');
  };

  const handleRemoveImage = () => {
    updateAttachedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    toast('Imagem removida do disparo.');
  };

  // Gerenciamento de Modelos Personalizados
  const handleOpenCreateTemplate = () => {
    setEditingTemplateId(null);
    setModalTemplateName(`Modelo ${templates.length + 1}: Minha Mensagem Personalizada`);
    setModalTemplateText(`Olá *{{nome_cliente}}*! Tudo bem? Me chamo *{{meu_nome}}* da *{{minha_empresa}}*.

Entramos em contato pois notamos o destaque da sua empresa no setor de *{{segmento}}* aqui em *{{cidade}}*.

🌐 Conheça mais em: https://wctech.web.app/

Gostaria de saber mais sobre nossas soluções exclusivas?`);
    setIsTemplateModalOpen(true);
  };

  const handleOpenEditTemplate = (index: number) => {
    const tpl = templates[index];
    if (!tpl) return;
    setEditingTemplateId(tpl.id);
    setModalTemplateName(tpl.name);
    setModalTemplateText(tpl.text);
    setIsTemplateModalOpen(true);
  };

  const handleSaveModalTemplate = () => {
    if (!modalTemplateName.trim() || !modalTemplateText.trim()) {
      toast.error('Preencha o nome do modelo e o texto da mensagem');
      return;
    }

    if (editingTemplateId) {
      // Atualizar existente
      const updated = templates.map(t => t.id === editingTemplateId ? { ...t, name: modalTemplateName, text: modalTemplateText } : t);
      saveTemplatesToStorage(updated);
      toast.success('Modelo de mensagem atualizado com sucesso!');
    } else {
      // Criar novo modelo
      const newTpl = {
        id: `tpl-${Date.now()}`,
        name: modalTemplateName,
        text: modalTemplateText,
      };
      const updated = [...templates, newTpl];
      saveTemplatesToStorage(updated);
      setSelectedTemplateIndex(updated.length - 1);
      toast.success(`Novo modelo "${modalTemplateName}" salvo e ativado!`);
    }

    setIsTemplateModalOpen(false);
  };

  const handleDeleteTemplate = async (index: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (templates.length <= 1) {
      toast.error('Você deve manter ao menos um modelo de mensagem ativo.');
      return;
    }

    const tplToDelete = templates[index];
    if (!tplToDelete) return;

    const confirmed = await confirm({
      title: 'Excluir Modelo de Mensagem',
      description: `Tem certeza que deseja excluir o modelo "${tplToDelete.name}"?`,
      confirmText: 'Excluir Modelo',
      cancelText: 'Cancelar',
      variant: 'danger',
      icon: 'trash',
    });

    if (confirmed) {
      const updated = templates.filter((_, idx) => idx !== index);
      saveTemplatesToStorage(updated);
      setSelectedTemplateIndex(0);
      toast.success(`Modelo "${tplToDelete.name}" removido com sucesso.`);
    }
  };

  const handleDeleteCurrentEditingTemplate = async () => {
    if (templates.length <= 1) {
      toast.error('Você deve manter ao menos um modelo de mensagem ativo.');
      return;
    }

    const confirmed = await confirm({
      title: 'Excluir Modelo Ativo',
      description: `Tem certeza que deseja excluir o modelo "${modalTemplateName}"?`,
      confirmText: 'Excluir Modelo',
      cancelText: 'Cancelar',
      variant: 'danger',
      icon: 'trash',
    });

    if (confirmed) {
      const updated = templates.filter(t => t.id !== editingTemplateId);
      saveTemplatesToStorage(updated);
      setSelectedTemplateIndex(0);
      setIsTemplateModalOpen(false);
      toast.success(`Modelo "${modalTemplateName}" removido com sucesso.`);
    }
  };

  // Inserir tag de texto no textarea do modal
  const handleInsertTagInModal = (tagText: string) => {
    setModalTemplateText(prev => prev + ` ${tagText}`);
  };

  // Alterar nome/título do modelo ativo diretamente na página
  const handleTemplateNameChange = (newName: string) => {
    const updated = [...templates];
    updated[selectedTemplateIndex] = { ...updated[selectedTemplateIndex], name: newName };
    saveTemplatesToStorage(updated);
  };

  // Inserir tag de texto diretamente na página principal
  const handleInsertTagOnPage = (tagText: string) => {
    const current = templates[selectedTemplateIndex]?.text || '';
    handleTemplateTextChange(current + ` ${tagText}`);
    toast.success(`Tag ${tagText} inserida na mensagem!`);
  };

  // Inserir variação de saudação na página
  const handleInsertSpintaxOnPage = () => {
    const current = templates[selectedTemplateIndex]?.text || '';
    handleTemplateTextChange(`{Olá|Oi|Tudo bem?|Olá, como vai?} ` + current);
    toast.success('Variação Spintax inserida no início da mensagem!');
  };

  // Inserir variação de saudação no modal
  const handleInsertSpintaxInModal = () => {
    setModalTemplateText(prev => `{Olá|Oi|Tudo bem?|Olá, como vai?} ` + prev);
    toast.success('Variação Spintax inserida!');
  };

  // Salvar explicitamente o modelo atual com feedback
  const handleExplicitSaveCurrentTemplate = () => {
    saveTemplatesToStorage(templates);
    toast.success(`Modelo "${templates[selectedTemplateIndex]?.name}" salvo com sucesso!`);
  };

  // Restaurar mensagens originais de fábrica
  const handleResetToDefaultTemplates = async () => {
    const confirmed = await confirm({
      title: 'Restaurar Modelos de Fábrica',
      description: 'Deseja restaurar os modelos originais? Todas as mensagens personalizadas serão substituídas pelo texto padrão inicial.',
      confirmText: 'Restaurar Modelos',
      cancelText: 'Manter Meus Modelos',
      variant: 'warning',
      icon: 'alert',
    });

    if (confirmed) {
      saveTemplatesToStorage(INITIAL_DEFAULT_TEMPLATES);
      setSelectedTemplateIndex(0);
      toast.success('Modelos de mensagem restaurados com sucesso!');
    }
  };

  // Carregar modelos de mensagem
  const handleLoadSafeAntiBanTemplates = async () => {
    const confirmed = await confirm({
      title: 'Carregar Modelos de Mensagem',
      description: 'Deseja carregar os modelos de mensagem? Adapte o conteúdo ao consentimento do contato. Nenhum modelo garante proteção contra bloqueios.',
      confirmText: 'Ativar Modelos de Mensagem',
      cancelText: 'Cancelar',
      variant: 'info',
      icon: 'help',
    });

    if (confirmed) {
      saveTemplatesToStorage(DEFAULT_MESSAGE_TEMPLATES);
      setSelectedTemplateIndex(0);
      toast.success('5 Modelos de Mensagem carregados e ativados!');
    }
  };

  // Conjunto de IDs de leads já acionados
  const dispatchedLeadIds = useMemo(() => {
    return new Set(history.map(h => h.leadId).filter(Boolean));
  }, [history]);

  // Conjunto de dígitos normalizados de telefones já acionados no histórico
  const dispatchedPhonesSet = useMemo(() => {
    const set = new Set<string>();
    history.forEach(h => {
      if (h.phone) {
        const variants = extractPhoneDigitsVariants(h.phone);
        variants.forEach(v => set.add(v));
      }
    });
    return set;
  }, [history]);

  // Conjunto de nomes de leads já acionados no histórico
  const dispatchedNamesSet = useMemo(() => {
    const set = new Set<string>();
    history.forEach(h => {
      if (h.leadName) set.add(h.leadName.trim().toLowerCase());
    });
    return set;
  }, [history]);

  // Conjunto de dígitos normalizados de todos os clientes já atendidos, contatados ou em negociação
  const attendedPhoneDigitsSet = useMemo(() => {
    const set = new Set<string>();

    // 1. Telefones registrados no servidor como atendidos / respondidos / sob intervenção humana
    attendedPhones.forEach(item => {
      const variants = extractPhoneDigitsVariants(item.phone);
      variants.forEach(v => set.add(v));
    });

    // 2. Telefones que constam no histórico de disparos
    history.forEach(h => {
      if (h.phone) {
        const variants = extractPhoneDigitsVariants(h.phone);
        variants.forEach(v => set.add(v));
      }
    });

    // 3. Leads do CRM que já avançaram além de NOVO (ex: CONTACTED, QUALIFIED, PROPOSAL, WON)
    (allLeads || []).forEach(lead => {
      if (lead.status && lead.status !== LeadStatus.NEW) {
        const phone = (lead as any).phone || (lead as any).contacts?.[0]?.value;
        if (phone) {
          const variants = extractPhoneDigitsVariants(phone);
          variants.forEach(v => set.add(v));
        }
      }
    });

    return set;
  }, [attendedPhones, history, allLeads]);

  // Fila de espera disponível: leads com telefone que AINDA NÃO foram acionados nem atendidos
  const availableQueueLeads = useMemo(() => {
    if (!allLeads) return [];
    return allLeads.filter(lead => {
      const phone = (lead as any).phone || (lead as any).contacts?.[0]?.value;
      if (!phone) return false;

      // 📵 Isolamento de clientes sem WhatsApp ou com telefone fixo (ex: 92984322275)
      if ((lead as any).hasWhatsApp === false || (lead as any).noWhatsApp === true || (lead as any).whatsappStatus === 'NO_WHATSAPP') {
        return false;
      }
      const cleanDigits = phone.replace(/\D/g, '');
      if (cleanDigits.includes('984322275') || cleanDigits.includes('84322275')) {
        return false;
      }

      // 🛡️ Proteção Anti-Reenvio: se o lead já foi acionado por ID, por nome ou por telefone
      if (dispatchedLeadIds.has(lead.id)) return false;
      if (dispatchedNamesSet.has(lead.name.trim().toLowerCase())) return false;

      const variants = extractPhoneDigitsVariants(phone);
      if (variants.some(v => dispatchedPhonesSet.has(v) || attendedPhoneDigitsSet.has(v))) return false;

      // 🛡️ Proteção Anti-Reenvio: se o CRM já indica que o lead foi contatado/atendido
      if (lead.status && lead.status !== LeadStatus.NEW) return false;
      
      const sub = (lead as any).subcategory || lead.segment?.name || 'Geral';
      if (categoryFilter !== 'Todas' && sub !== categoryFilter) return false;

      if (stateFilter !== 'TODOS') {
        const leadState = (lead.address?.state || '').toUpperCase();
        if (leadState !== stateFilter) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = lead.name.toLowerCase().includes(q);
        const matchesSub = sub.toLowerCase().includes(q);
        const matchesPhone = phone.includes(q);
        const matchesCity = (lead.address?.city || '').toLowerCase().includes(q);
        const matchesState = (lead.address?.state || '').toLowerCase().includes(q);
        if (!matchesName && !matchesSub && !matchesPhone && !matchesCity && !matchesState) return false;
      }

      return true;
    });
  }, [allLeads, dispatchedLeadIds, dispatchedPhonesSet, dispatchedNamesSet, attendedPhoneDigitsSet, categoryFilter, searchQuery, stateFilter]);

  // Lista de clientes que JÁ FORAM ACIONADOS / CONTATADOS (colocados em área dedicada)
  const alreadyContactedLeads = useMemo(() => {
    const list: any[] = [];
    const seenKeys = new Set<string>();

    // 1. Leads de allLeads identificados como já acionados
    (allLeads || []).forEach((lead: any) => {
      const phone = lead.phone || lead.contacts?.[0]?.value || '';
      const variants = phone ? extractPhoneDigitsVariants(phone) : [];
      const isDispatched = dispatchedLeadIds.has(lead.id) ||
        dispatchedNamesSet.has(lead.name.trim().toLowerCase()) ||
        variants.some(v => dispatchedPhonesSet.has(v) || attendedPhoneDigitsSet.has(v)) ||
        (lead.status && lead.status !== LeadStatus.NEW);

      if (isDispatched) {
        const key = phone ? phone.replace(/\D/g, '') : lead.name.toLowerCase();
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          if (variants.length) variants.forEach(v => seenKeys.add(v));

          const hist = history.find(h => 
            (h.leadId && h.leadId === lead.id) || 
            (h.phone && variants.some(v => extractPhoneDigitsVariants(h.phone).includes(v))) || 
            (h.leadName && h.leadName.trim().toLowerCase() === lead.name.trim().toLowerCase())
          );

          list.push({
            id: lead.id,
            name: lead.name,
            phone: phone || hist?.phone || '',
            subcategory: lead.subcategory || lead.segment?.name || hist?.category || 'Geral',
            address: lead.address || { city: 'Manaus', state: 'AM' },
            dispatchedAt: hist ? `${hist.date} às ${hist.time}` : 'Acionado anteriormente',
            dispatchedMessage: hist?.messageSent || 'Mensagem enviada via WhatsApp',
            dispatchedStatus: hist?.status || 'SENT',
            templateName: hist?.templateName || 'Modelo Padrão',
          });
        }
      }
    });

    // 2. Registros do histórico do servidor que possam não estar na lista local
    history.forEach(h => {
      const clean = (h.phone || '').replace(/\D/g, '');
      const key = clean || (h.leadName ? h.leadName.toLowerCase() : '');
      if (key && !seenKeys.has(key)) {
        seenKeys.add(key);
        list.push({
          id: h.leadId || `hist-${clean}`,
          name: h.leadName || 'Cliente Acionado',
          phone: h.phone,
          subcategory: h.category || 'Geral',
          address: { city: 'Manaus', state: 'AM' },
          dispatchedAt: `${h.date} às ${h.time}`,
          dispatchedMessage: h.messageSent,
          dispatchedStatus: h.status,
          templateName: h.templateName,
        });
      }
    });

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return list.filter(l => 
        l.name.toLowerCase().includes(q) || 
        l.phone.includes(q) || 
        (l.subcategory && l.subcategory.toLowerCase().includes(q))
      );
    }

    return list;
  }, [allLeads, history, dispatchedLeadIds, dispatchedPhonesSet, dispatchedNamesSet, attendedPhoneDigitsSet, searchQuery]);

  // Função para reativar cliente já acionado e recolocá-lo na fila de pendentes
  const handleReactivateLead = async (lead: any) => {
    try {
      const phone = lead.phone;
      if (phone) {
        await axios.post('/whatsapp/attended-phones/unlock', { phone });
      }
      
      const cleanDigits = (phone || '').replace(/\D/g, '');
      setHistory(prev => prev.filter(h => {
        if (h.leadId && h.leadId === lead.id) return false;
        if (phone && h.phone && h.phone.replace(/\D/g, '') === cleanDigits) return false;
        if (h.leadName && h.leadName.trim().toLowerCase() === lead.name.trim().toLowerCase()) return false;
        return true;
      }));

      const stored = getStoredLeads();
      const updated = stored.map(l => {
        const itemPhone = ((l as any).phone || (l as any).phones?.[0]?.number || '').replace(/\D/g, '');
        if (l.id === lead.id || (cleanDigits && itemPhone === cleanDigits)) {
          return { ...l, status: LeadStatus.NEW };
        }
        return l;
      });
      saveStoredLeads(updated);

      refetchLeads();
      fetchAttendedPhones();
      toast.success(`"${lead.name}" reativado! Movido de volta para a fila de pendentes.`);
    } catch (e) {
      toast.error('Erro ao reativar cliente.');
    }
  };

  // Garante que selectedLeadIds só contenha clientes da fila de pendentes (nunca clientes já acionados)
  useEffect(() => {
    const availableIdSet = new Set(availableQueueLeads.map(l => l.id));
    setSelectedLeadIds(prev => {
      const filtered = prev.filter(id => availableIdSet.has(id));
      if (filtered.length !== prev.length) {
        try {
          localStorage.setItem(SELECTED_LEADS_STORAGE_KEY, JSON.stringify(filtered));
        } catch {}
        return filtered;
      }
      return prev;
    });
  }, [availableQueueLeads]);

  // Todos os clientes que possuem telefone verificado no cadastro com WhatsApp ativo
  const allLeadsWithPhone = useMemo(() => {
    if (!allLeads) return [];
    return allLeads.filter((l: any) => {
      const phone = l.phone || l.contacts?.[0]?.value;
      if (!phone) return false;
      if (l.hasWhatsApp === false || l.noWhatsApp === true || l.whatsappStatus === 'NO_WHATSAPP') return false;
      const cleanDigits = phone.replace(/\D/g, '');
      if (cleanDigits.includes('984322275') || cleanDigits.includes('84322275')) return false;
      return true;
    });
  }, [allLeads]);

  const categoryTabs = useMemo(() => {
    const counts: Record<string, number> = {};
    let totalEligible = 0;
    if (allLeads) {
      allLeads.forEach((l: any) => {
        const phone = l.phone || l.contacts?.[0]?.value;
        if (!phone) return;
        if (l.hasWhatsApp === false || l.noWhatsApp === true || l.whatsappStatus === 'NO_WHATSAPP') return;
        const cleanDigits = phone.replace(/\D/g, '');
        if (cleanDigits.includes('984322275') || cleanDigits.includes('84322275')) return;

        // Se já foi acionado
        if (dispatchedLeadIds.has(l.id)) return;
        if (dispatchedNamesSet.has(l.name.trim().toLowerCase())) return;
        const variants = extractPhoneDigitsVariants(phone);
        if (variants.some(v => dispatchedPhonesSet.has(v) || attendedPhoneDigitsSet.has(v))) return;
        if (l.status && l.status !== LeadStatus.NEW) return;

        totalEligible++;
        const sub = l.subcategory || l.segment?.name || 'Geral';
        counts[sub] = (counts[sub] || 0) + 1;
      });
    }

    const availableCategories = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);

    const tabs = [
      { id: 'Todas', label: 'Todas', emoji: '📁', count: totalEligible },
      ...availableCategories.map(cat => {
        const meta = getCategoryMeta(cat);
        return {
          id: cat,
          label: meta.subcategory,
          emoji: meta.badge.split(' ')[0] || '📁',
          count: counts[cat] || 0,
          color: meta.color,
        };
      })
    ];

    return tabs;
  }, [allLeads, dispatchedLeadIds, dispatchedPhonesSet, dispatchedNamesSet, attendedPhoneDigitsSet]);

  const handleSelectAll = () => {
    if (selectedLeadIds.length === availableQueueLeads.length && availableQueueLeads.length > 0) {
      updateSelectedLeadIds([]);
    } else {
      updateSelectedLeadIds(availableQueueLeads.map(l => l.id));
    }
  };

  const handleToggleLead = (id: string) => {
    if (selectedLeadIds.includes(id)) {
      updateSelectedLeadIds(selectedLeadIds.filter(i => i !== id));
    } else {
      updateSelectedLeadIds([...selectedLeadIds, id]);
    }
  };

  // Substituição dinâmica com formatação em Negrito
  const compileMessage = (templateText: string = '', lead: any = {}): string => {
    if (!templateText || typeof templateText !== 'string') return '';
    const clientName = lead?.name || 'Cliente';
    const segment = (lead as any)?.subcategory || lead?.segment?.name || 'Comércio';
    const city = lead?.address?.city || 'sua cidade';
    const state = lead?.address?.state || 'Brasil';
    const neighborhood = lead?.address?.neighborhood || '';
    
    return templateText
      .replace(/\*?\{\{nome_cliente\}\}\*?/g, `*${clientName}*`)
      .replace(/\*?\{\{meu_nome\}\}\*?/g, `*${(senderName || '').trim()}*`)
      .replace(/\*?\{\{minha_empresa\}\}\*?/g, `*${(companyName || '').trim()}*`)
      .replace(/\*?\{\{segmento\}\}\*?/g, `*${segment}*`)
      .replace(/\*?\{\{cidade\}\}\*?/g, `*${city}*`)
      .replace(/\*?\{\{estado\}\}\*?/g, `*${state}*`)
      .replace(/\*?\{\{bairro\}\}\*?/g, neighborhood ? `*${neighborhood}*` : `*${city}*`);
  };

  const previewMessage = useMemo(() => {
    const sampleLead = availableQueueLeads.find(l => selectedLeadIds.includes(l.id)) || availableQueueLeads[0] || {
      name: 'Panificadora Conde do Pão',
      subcategory: 'Padaria',
      address: { city: 'São Paulo', state: 'SP', neighborhood: 'Jardins' }
    };
    const currentTemplate = templates[selectedTemplateIndex] || templates[0];
    return compileMessage(currentTemplate.text, sampleLead);
  }, [templates, selectedTemplateIndex, senderName, companyName, availableQueueLeads, selectedLeadIds]);

  const modalPreviewCompiled = useMemo(() => {
    const sampleLead = availableQueueLeads[0] || {
      name: 'Panificadora Conde do Pão',
      subcategory: 'Padaria',
      address: { city: 'São Paulo', state: 'SP', neighborhood: 'Jardins' }
    };
    return compileMessage(modalTemplateText, sampleLead);
  }, [modalTemplateText, senderName, companyName, availableQueueLeads]);

  const handleTemplateTextChange = (newText: string) => {
    const updated = [...templates];
    updated[selectedTemplateIndex] = { ...updated[selectedTemplateIndex], text: newText };
    saveTemplatesToStorage(updated);
  };

  const dispatchSingleLead = async (lead: any, template: { name: string; text: string }) => {
    const rawPhone = (lead as any).phone || (lead as any).contacts?.[0]?.value || '';
    const leadUF = lead.address?.state;
    const stObj = leadUF ? getStateByUF(leadUF) : null;
    const defaultDDD = stObj?.ddds?.[0] || '92';

    const fullPhone = toWhatsAppJidDigits(rawPhone, defaultDDD);
    const displayPhone = formatBrazilianPhone(rawPhone, defaultDDD);
    const formattedMessage = compileMessage(template.text, lead);

    let sendSuccess = false;
    let failureReason = '';

    try {
      const res = await axios.post('/whatsapp/send', {
        to: fullPhone,
        text: formattedMessage,
        image: attachedImage || undefined,
        leadId: lead.id,
        leadName: lead.name,
        phone: displayPhone,
        category: (lead as any).subcategory || lead.segment?.name || 'Geral',
        templateName: template.name,
      }, { timeout: 45000 });

      const resData = res.data?.data || res.data;
      if (resData?.success) {
        sendSuccess = true;
      } else {
        failureReason = resData?.message || 'Falha no envio';
        if (resData?.hasWhatsApp === false || resData?.isLandline === true) {
          try {
            const rawLeads = localStorage.getItem('radar_leads_data') || localStorage.getItem('radar_leads');
            if (rawLeads) {
              const parsed = JSON.parse(rawLeads);
              const updated = parsed.map((l: any) => l.id === lead.id ? { ...l, hasWhatsApp: false, noWhatsApp: true, isLandline: true, whatsappStatus: 'NO_WHATSAPP' } : l);
              localStorage.setItem('radar_leads_data', JSON.stringify(updated));
              localStorage.setItem('radar_leads', JSON.stringify(updated));
            }
          } catch (e) {}
        }
      }
    } catch (e: any) {
      failureReason = e?.response?.data?.message || e?.message || 'Erro de comunicação com o robô';
    }

    if (!sendSuccess) {
      toast.error(`⚠️ ${lead.name}: ${failureReason}`, { duration: 7000 });
    }

    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR');
    const timeStr = now.toLocaleTimeString('pt-BR');
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const dateLabel = `${now.getDate()} de ${meses[now.getMonth()]} de ${now.getFullYear()}`;

    const record: DispatchedLeadRecord = {
      leadId: lead.id,
      leadName: lead.name,
      phone: displayPhone,
      category: (lead as any).subcategory || lead.segment?.name || 'Geral',
      date: dateStr,
      dateLabel,
      time: timeStr,
      messageSent: formattedMessage,
      templateName: template.name,
      status: sendSuccess ? 'SENT' : 'FAILED',
      hasImage: !!attachedImage,
      imageUrl: attachedImage || undefined,
    };

    if (sendSuccess) {
      markLeadAsDispatched(record);
      // Remove da fila de seleção
      setSelectedLeadIds(prev => {
        const updated = prev.filter(id => id !== lead.id);
        try {
          localStorage.setItem(SELECTED_LEADS_STORAGE_KEY, JSON.stringify(updated));
        } catch (e) {
          console.error(e);
        }
        return updated;
      });
    }

    setHistory(prev => [record, ...prev]);
    refetchLeads();

    return record;
  };

  const handleOpenDirectWhatsApp = (lead: any) => {
    const rawPhone = (lead as any).phone || (lead as any).contacts?.[0]?.value || '';
    const leadUF = lead.address?.state;
    const stObj = leadUF ? getStateByUF(leadUF) : null;
    const defaultDDD = stObj?.ddds?.[0] || '92';

    const fullPhone = toWhatsAppJidDigits(rawPhone, defaultDDD);
    const displayPhone = formatBrazilianPhone(rawPhone, defaultDDD);
    const currentTemplate = templates[selectedTemplateIndex] || templates[0];
    const formattedMessage = compileMessage(currentTemplate.text, lead);

    // Abre diretamente no WhatsApp Web ou Desktop com a mensagem preenchida
    const webUrl = `https://web.whatsapp.com/send?phone=${fullPhone}&text=${encodeURIComponent(formattedMessage)}`;
    window.open(webUrl, '_blank', 'noopener,noreferrer');

    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR');
    const timeStr = now.toLocaleTimeString('pt-BR');
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const dateLabel = `${now.getDate()} de ${meses[now.getMonth()]} de ${now.getFullYear()}`;

    const record: DispatchedLeadRecord = {
      leadId: lead.id,
      leadName: lead.name,
      phone: displayPhone,
      category: (lead as any).subcategory || lead.segment?.name || 'Geral',
      date: dateStr,
      dateLabel,
      time: timeStr,
      messageSent: formattedMessage,
      templateName: `${currentTemplate.name} (Modo Direto Web)`,
      status: 'SENT',
      hasImage: false,
    };

    markLeadAsDispatched(record);
    setSelectedLeadIds(prev => {
      const updated = prev.filter(id => id !== lead.id);
      try {
        localStorage.setItem(SELECTED_LEADS_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    setHistory(prev => [record, ...prev]);
    refetchLeads();
    toast.success(`⚡ WhatsApp Web aberto para ${lead.name}! Enviando direto da sua máquina sem precisar de robô.`, { icon: '💬', duration: 5000 });
  };

  const formatTimeMinutesSeconds = (totalSeconds: any) => {
    const s = Number(totalSeconds);
    if (!Number.isFinite(s) || s < 0) return '00:00';
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSkipBatchRest = async () => {
    try {
      await axios.post('/whatsapp/queue/skip-rest');
      toast.success('Descanso do lote adiantado! Iniciando próximo ciclo no servidor agora...');
    } catch (e) {
      toast.error('Não foi possível adiantar o descanso do lote.');
    }
  };

  const handleSkipCountdown = async () => {
    if (!botStatus.connected) {
      toast.error('⚠️ WhatsApp não está conectado! Conecte seu aparelho escaneando o QR Code no topo da página antes de disparar.', {
        duration: 6000,
        icon: '📱'
      });
      return;
    }

    setIsSkippingCountdown(true);
    setCountdown(0);
    try {
      const res = await axios.post('/whatsapp/queue/skip-countdown');
      if (res.data?.success) {
        toast.success('⚡ Disparo imediato acionado! Enviando mensagem agora...', { icon: '⚡' });
      }
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Não foi possível adiantar o disparo.';
      toast.error(msg);
    } finally {
      setIsSkippingCountdown(false);
    }
  };

  const handleGenerateNationalLeads = (targetUF: string, count: number) => {
    try {
      const generated = generateNationalSeedLeads(targetUF, count);
      const existingRaw = localStorage.getItem('radar_leads_data') || localStorage.getItem('radar_leads');
      const existing = existingRaw ? JSON.parse(existingRaw) : [];
      const updated = [...generated, ...existing];
      localStorage.setItem('radar_leads_data', JSON.stringify(updated));
      localStorage.setItem('radar_leads', JSON.stringify(updated));
      refetchLeads();
      updateSelectedLeadIds(generated.map(l => l.id));
      const st = getStateByUF(targetUF);
      toast.success(`🎉 ${count} novos clientes de ${st?.name || targetUF} (DDD ${st?.ddds[0] || 'BR'}) adicionados à fila!`);
      setIsNationalProspectModalOpen(false);
    } catch (e) {
      toast.error('Erro ao gerar novos clientes comerciais.');
    }
  };

  const handleSeedMoreLeads = () => {
    setIsNationalProspectModalOpen(true);
  };

  const handleStartDispatch = async () => {
    try {
      if (!botStatus.connected) {
        toast.error('⚠️ WhatsApp não está conectado! Conecte seu aparelho escaneando o QR Code no topo da página antes de iniciar os disparos.', {
          duration: 7000,
          icon: '📱'
        });
        return;
      }

      let leadsToProcess: any[] = [];

      if (selectedLeadIds.length > 0) {
        // 1. O usuário selecionou clientes específicos na tabela: filtra para garantir que nenhum já atendido seja enviado por engano
        const selected = (allLeads || []).filter(l => {
          const phone = (l as any).phone || (l as any).contacts?.[0]?.value;
          return selectedLeadIds.includes(l.id) && phone;
        });

        const safeLeads = selected.filter(lead => {
          const phone = (lead as any).phone || (lead as any).contacts?.[0]?.value || '';
          if ((lead as any).hasWhatsApp === false || (lead as any).noWhatsApp === true || (lead as any).whatsappStatus === 'NO_WHATSAPP') return false;
          const cleanDigits = phone.replace(/\D/g, '');
          if (cleanDigits.includes('984322275') || cleanDigits.includes('84322275')) return false;

          const variants = extractPhoneDigitsVariants(phone);
          const isAttended = variants.some(v => attendedPhoneDigitsSet.has(v)) || dispatchedLeadIds.has(lead.id) || (lead.status && lead.status !== LeadStatus.NEW);
          return !isAttended;
        });

        if (safeLeads.length < selected.length) {
          const blockedCount = selected.length - safeLeads.length;
          toast(`🛡️ Proteção Anti-Reenvio: ${blockedCount} cliente(s) selecionado(s) já haviam sido atendidos e foram preservados.`, { icon: '🛡️' });
        }

        leadsToProcess = safeLeads;
      } else if (availableQueueLeads.length > 0) {
        // 2. Não selecionou manualmente, envia para os clientes da fila que ainda não foram acionados nem atendidos
        leadsToProcess = availableQueueLeads;
      }

      if (leadsToProcess.length === 0) {
        toast.error('🛡️ Nenhum cliente pendente para envio. Todos os clientes selecionados ou da fila já foram atendidos ou contatados!');
        return;
      }

      const effectiveBatchSize = useBatchMode ? Math.max(1, batchSize) : leadsToProcess.length;
      const totalBatches = Math.ceil(leadsToProcess.length / effectiveBatchSize);

      setTotalBatchesCount(totalBatches);
      setCurrentBatchNum(1);
      setSentInCurrentBatch(0);

      const tpls = templates && templates.length > 0 ? templates : DEFAULT_MESSAGE_TEMPLATES;
      const payloadLeads = leadsToProcess.map((lead, i) => {
        const templateIdx = rotateTemplates ? (i % (tpls.length || 1)) : selectedTemplateIndex;
        const currentTemplate = tpls[templateIdx] || tpls[0] || { text: 'Olá {{nome_cliente}}', name: 'Padrão' };
        const rawPhone = (lead as any).phone || (lead as any).contacts?.[0]?.value || '';
        const leadUF = lead.address?.state;
        const stObj = leadUF ? getStateByUF(leadUF) : null;
        const defaultDDD = stObj?.ddds?.[0] || '92';

        const fullPhone = toWhatsAppJidDigits(rawPhone, defaultDDD);
        const displayPhone = formatBrazilianPhone(rawPhone, defaultDDD);
        const formattedMessage = compileMessage(currentTemplate?.text || '', lead);
        return {
          id: lead.id,
          name: lead.name || 'Cliente',
          phone: fullPhone,
          phoneFormatted: displayPhone,
          category: (lead as any).subcategory || lead.segment?.name || 'Geral',
          templateName: currentTemplate?.name || 'Padrão',
          message: formattedMessage,
        };
      });

      const mediaNotice = attachedImage ? 'com Imagem Promocional' : 'em modo Texto';
      const batchNotice = useBatchMode ? ` [Em lotes de ${effectiveBatchSize} com pausa de ${batchPauseMinutes}min]` : '';

      const res = await axios.post('/whatsapp/queue/start', {
        leads: payloadLeads,
        image: attachedImage || undefined,
        intervalSeconds: dispatchIntervalSeconds,
        batchSize: effectiveBatchSize,
        batchPauseMinutes: batchPauseMinutes,
      });

      const q = res.data?.data;
      setIsDispatching(true);
      setIsPaused(false);
      setIsBatchResting(false);
      setBatchRestCountdown(0);
      if (q) {
        setCurrentIndex(Number(q.currentIndex) || 0);
        setCurrentBatchNum(Number(q.currentBatch) || 1);
        setTotalBatchesCount(Number(q.totalBatches) || totalBatches);
        setSentInCurrentBatch(Number(q.sentInBatch) || 0);
        setCountdown(Number(q.countdown) || 0);
        setNextLeadInfo(q.nextLead ? {
          name: String(q.nextLead.name || ''),
          phone: String(q.nextLead.phone || ''),
          category: String(q.nextLead.category || ''),
        } : null);
      }

      toast.success(`Disparos iniciados no servidor ${mediaNotice}${batchNotice} para ${leadsToProcess.length} clientes! Você já pode trocar de aba ou minimizar.`);
    } catch (e: any) {
      console.error('Erro ao iniciar disparos:', e);
      let msg = e?.response?.data?.message || e?.response?.data?.error || e?.message || 'Erro ao iniciar fila de disparos no servidor';
      if (Array.isArray(msg)) msg = msg.join(', ');
      if (typeof msg !== 'string') msg = JSON.stringify(msg);
      toast.error(msg);
    }
  };

  const handlePauseDispatch = async () => {
    try {
      await axios.post('/whatsapp/queue/pause');
      setIsPaused(true);
      toast('Disparos pausados no servidor. Clique em "Continuar" para retomar.', { icon: '⏸️' });
    } catch (e: any) {
      let msg = e?.response?.data?.message || e?.message || 'Erro ao pausar disparos no servidor.';
      if (typeof msg !== 'string') msg = JSON.stringify(msg);
      toast.error(msg);
    }
  };

  const handleResumeDispatch = async () => {
    try {
      await axios.post('/whatsapp/queue/resume');
      setIsPaused(false);
      toast.success('Retomando fila de disparos no servidor!');
    } catch (e: any) {
      let msg = e?.response?.data?.message || e?.message || 'Erro ao retomar disparos no servidor.';
      if (typeof msg !== 'string') msg = JSON.stringify(msg);
      toast.error(msg);
    }
  };

  const handleStopDispatch = async () => {
    try {
      await axios.post('/whatsapp/queue/stop');
      setIsDispatching(false);
      setIsPaused(false);
      setIsBatchResting(false);
      setBatchRestCountdown(0);
      setCurrentIndex(0);
      setCountdown(0);
      setSentInCurrentBatch(0);
      setNextLeadInfo(null);
      toast('Fila de disparos cancelada no servidor.', { icon: '⏹️' });
      syncDispatchedHistoryWithServer().then(synced => {
        setHistory(synced);
        refetchLeads();
      });
    } catch (e: any) {
      let msg = e?.response?.data?.message || e?.message || 'Erro ao cancelar disparos no servidor.';
      if (typeof msg !== 'string') msg = JSON.stringify(msg);
      toast.error(msg);
    }
  };

  // 📁 Contagem e agrupamento de histórico por pasta/categoria
  const historyCategoriesMap = useMemo(() => {
    const counts: Record<string, number> = { 'Todas': history.length };
    history.forEach(item => {
      const cat = item.category || 'Geral';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [history]);

  const historyCategoriesList = useMemo(() => {
    const list = Object.keys(historyCategoriesMap).filter(k => k !== 'Todas');
    list.sort((a, b) => (historyCategoriesMap[b] || 0) - (historyCategoriesMap[a] || 0));
    return list;
  }, [historyCategoriesMap]);

  const filteredHistory = useMemo(() => {
    let list = history;
    if (historyCategoryFilter !== 'Todas') {
      list = list.filter(h => (h.category || 'Geral') === historyCategoryFilter);
    }
    if (!historySearchQuery.trim()) return list;
    const q = historySearchQuery.toLowerCase();
    return list.filter(h => 
      (h.leadName || '').toLowerCase().includes(q) || 
      (h.phone || '').includes(q) || 
      (h.category || '').toLowerCase().includes(q) ||
      (h.templateName || '').toLowerCase().includes(q)
    );
  }, [history, historySearchQuery, historyCategoryFilter]);

  const groupedHistoryByDate = useMemo(() => {
    const groups: Record<string, DispatchedLeadRecord[]> = {};
    filteredHistory.forEach(item => {
      const key = item.dateLabel || item.date;
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    return groups;
  }, [filteredHistory]);

  const groupedHistory = groupedHistoryByDate; // Compatibilidade com exportações

  const groupedHistoryByFolder = useMemo(() => {
    const groups: Record<string, DispatchedLeadRecord[]> = {};
    filteredHistory.forEach(item => {
      const cat = item.category || 'Geral';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });
    return groups;
  }, [filteredHistory]);

  const toggleFolderExpand = (folderName: string) => {
    setExpandedHistoryFolders(prev => {
      const current = prev[folderName] !== undefined
        ? prev[folderName]
        : (historyCategoryFilter === folderName);
      return {
        ...prev,
        [folderName]: !current
      };
    });
  };

  const handleExpandAllFolders = () => {
    const next: Record<string, boolean> = {};
    historyCategoriesList.forEach(f => { next[f] = true; });
    Object.keys(groupedHistoryByFolder).forEach(f => { next[f] = true; });
    setExpandedHistoryFolders(next);
  };

  const handleCollapseAllFolders = () => {
    const next: Record<string, boolean> = {};
    historyCategoriesList.forEach(f => { next[f] = false; });
    Object.keys(groupedHistoryByFolder).forEach(f => { next[f] = false; });
    setExpandedHistoryFolders(next);
  };

  const handleSelectHistoryCategory = (cat: string) => {
    setHistoryCategoryFilter(cat);
    if (cat === 'Todas') {
      const next: Record<string, boolean> = {};
      historyCategoriesList.forEach(f => { next[f] = false; });
      setExpandedHistoryFolders(next);
    } else {
      setExpandedHistoryFolders({ [cat]: true });
    }
  };

  const handleExportHistoryCSV = () => {
    try {
      const headers = ['Data', 'Horario', 'Cliente', 'WhatsApp', 'Pasta/Categoria', 'Modelo', 'Midia', 'Status'];
      const rows = history.map(item => [
        `"${item.date}"`,
        `"${item.time}"`,
        `"${(item.leadName || '').replace(/"/g, '""')}"`,
        `"${item.phone}"`,
        `"${item.category || 'Geral'}"`,
        `"${(item.templateName || '').replace(/"/g, '""')}"`,
        item.hasImage ? '"Foto"' : '"Texto"',
        `"${item.status}"`,
      ].join(';'));

      const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `historico_acionamentos_whatsapp_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Planilha do histórico de disparos baixada com sucesso!');
    } catch (e) {
      toast.error('Erro ao exportar histórico para CSV');
    }
  };

  const handleClearHistory = async () => {
    const confirmed = await confirm({
      title: 'Limpar Histórico de Acionados',
      description: 'Atenção: Deseja realmente limpar o histórico de clientes acionados? O registro do servidor também será limpo e os clientes poderão ser reacionados.',
      confirmText: 'Sim, Limpar Histórico',
      cancelText: 'Cancelar',
      variant: 'danger',
      icon: 'trash',
    });

    if (confirmed) {
      clearDispatchedHistory();
      setHistory([]);
      refetchLeads();
      toast.success('Histórico limpo com sucesso.');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Banner Superior */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-primary/10 p-5 rounded-xl border border-primary/20 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-[#25D366]/20 text-[#25D366] p-3 rounded-xl">
            <Bot className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              Robô de Disparos WhatsApp (Imagem + Mensagem)
              <Sparkles className="w-5 h-5 text-amber-400" />
            </h1>
            <p className="text-sm text-muted-foreground">
              Crie modelos personalizados, visualize a prévia exata no padrão WhatsApp e envie com imagens para clientes em <strong>Manaus - AM</strong>.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Botão de Fluxos de Conversação */}
          <Link href="/flows">
            <Button
              size="sm"
              variant="outline"
              className="h-9 px-3 text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
              title="Configurar fluxo interativo de perguntas, opções e respostas para o robô"
            >
              <GitBranch className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>🌿 Fluxos de Conversa</span>
              {activeFlowLabel && activeFlowLabel !== 'Carregando...' && (
                <span className="max-w-[130px] truncate text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-500/30">
                  {activeFlowLabel}
                </span>
              )}
            </Button>
          </Link>

          {/* Botão de Ligar / Desligar Respostas Automáticas */}
          <Button
            onClick={handleToggleAutoReply}
            disabled={isTogglingAutoReply}
            size="sm"
            variant="outline"
            className={`h-9 px-3 text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 ${
              botStatus.autoReplyEnabled ?? true
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/25'
                : 'bg-destructive/15 text-destructive border-destructive/40 hover:bg-destructive/25'
            }`}
            title="Clique para ligar ou desligar as respostas automáticas do robô no WhatsApp"
          >
            <Power className="w-3.5 h-3.5" />
            {(botStatus.autoReplyEnabled ?? true) ? '🤖 Atendimento Automático: LIGADO' : '🔇 Atendimento Automático: DESLIGADO'}
          </Button>

          {/* Botão de Pausar / Ativar Mensagem de Cordialidade */}
          <Button
            onClick={handleToggleCordiality}
            disabled={isTogglingCordiality}
            size="sm"
            variant="outline"
            className={`h-9 px-3 text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 ${
              botStatus.cordialityEnabled ?? true
                ? 'bg-blue-500/15 text-blue-400 border-blue-500/40 hover:bg-blue-500/25'
                : 'bg-amber-500/15 text-amber-400 border-amber-500/40 hover:bg-amber-500/25'
            }`}
            title="Pausar ou reativar a mensagem inicial de cordialidade e boas-vindas do robô"
          >
            <Handshake className="w-3.5 h-3.5" />
            {(botStatus.cordialityEnabled ?? true) ? '🤝 Cordialidade: ATIVA' : '⏸️ Cordialidade: PAUSADA'}
          </Button>

          {/* Botão de Gestão de Contatos Pessoais / Familiares */}
          <Button
            onClick={() => setIsIgnoredModalOpen(true)}
            size="sm"
            variant="outline"
            className="h-9 px-3 text-xs font-semibold bg-card/80 border-border hover:bg-accent/50 text-foreground flex items-center gap-1.5 shadow-sm"
            title="Gerenciar nomes, apelidos e números pessoais (ex: Dengosa, Mãe, Família) que o robô não deve responder"
          >
            <Shield className="w-3.5 h-3.5 text-amber-500" />
            <span>🛡️ Contatos Pessoais ({ignoredContacts.length})</span>
          </Button>

          {/* Botão de Proteção Anti-Reenvio Permanente */}
          <Button
            onClick={() => setIsAttendedModalOpen(true)}
            size="sm"
            variant="outline"
            className="h-9 px-3 text-xs font-semibold bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-400 flex items-center gap-1.5 shadow-sm"
            title="Clientes que já foram atendidos, contatados ou responderam no WhatsApp. Estão protegidos contra reenvios acidentais."
          >
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>🛡️ Anti-Reenvio ({attendedPhoneDigitsSet.size} protegidos)</span>
          </Button>

          {/* Botão de regras de envio */}
          <Button
            onClick={() => setIsAntiBanModalOpen(true)}
            size="sm"
            className="h-9 px-3.5 text-xs font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-600 text-white flex items-center gap-1.5 shadow-md border-0 transition-all"
            title="Consentimento, descadastro e regras de envio"
          >
            <Shield className="w-3.5 h-3.5 text-emerald-200 animate-pulse" />
            <span>🛡️ Regras de envio</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 text-white font-bold hidden sm:inline">
              Consultar regras
            </span>
          </Button>

          {/* Identificação de Computador & Conexão Isolada */}
          <div className="flex items-center gap-1.5 bg-card/80 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-border text-xs h-9">
            <HardDrive className="w-3.5 h-3.5 text-primary shrink-0" />
            {isEditingDeviceName ? (
              <div className="flex items-center gap-1">
                <Input
                  value={tempDeviceName}
                  onChange={(e) => setTempDeviceName(e.target.value)}
                  className="h-6 w-28 text-[11px] px-1.5 py-0"
                  placeholder="Nome do PC"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveDeviceName(); }}
                />
                <Button size="sm" variant="ghost" onClick={handleSaveDeviceName} className="h-6 w-6 p-0 text-emerald-400">
                  <Check className="w-3 h-3" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-foreground truncate max-w-[130px] sm:max-w-[170px]" title={`Identificador do PC: ${deviceId}`}>
                  {deviceName || 'Este Computador'}
                </span>
                <button
                  type="button"
                  onClick={() => { setTempDeviceName(deviceName); setIsEditingDeviceName(true); }}
                  className="text-muted-foreground hover:text-foreground text-[10px]"
                  title="Renomear este computador"
                >
                  <Edit3 className="w-2.5 h-2.5" />
                </button>
              </div>
            )}
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-primary/10 text-primary border border-primary/20 shrink-0 font-medium hidden sm:inline" title="Cada computador possui sua própria sessão de WhatsApp separada e não derruba outros computadores">
              Sessão Exclusiva
            </span>
          </div>

          <div className="flex items-center gap-2 bg-card/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-border text-xs h-9">
            <span className={`w-2.5 h-2.5 rounded-full ${botStatus.connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <span className="font-medium">
              {botStatus.connected ? 'WhatsApp Pareado' : 'Aparelho Desconectado'}
            </span>
            {botStatus.connected ? (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleDisconnectBot} 
                className="h-6 px-1.5 text-[10px] text-destructive hover:bg-destructive/10"
                title="Desconectar este aparelho para escanear com outro celular"
              >
                Trocar Aparelho
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => checkBotStatus({ manual: true })} className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-foreground">
                {isCheckingBot ? '...' : 'Atualizar'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Alerta de Desconexão / QR Code */}
      {!botStatus.connected && (
        <Card className="border-amber-500/40 bg-amber-500/10 shadow-md">
          <CardContent className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-amber-300">Robô do WhatsApp Desconectado neste PC</h3>
                  <Badge variant="outline" className="text-[10px] bg-amber-500/20 text-amber-200 border-amber-500/40">
                    💻 {deviceName || 'Este Computador'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1 max-w-xl">
                  <strong>Conexão individual e segura:</strong> Conectar o WhatsApp deste computador <u>não desconecta</u> nem interfere nos outros computadores da sua equipe, mesmo usando o mesmo usuário!
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-amber-200/90 bg-amber-500/15 p-2 rounded-lg border border-amber-500/20 max-w-xl">
                  <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>
                    <strong>Prefere não escanear QR Code?</strong> Use o botão <strong>⚡ WhatsApp Web</strong> em qualquer lead abaixo para abrir a conversa já pronta direto no seu navegador.
                  </span>
                </div>
                {botStatus.qrCode ? (
                  <div className="mt-3 p-3 bg-white rounded-xl inline-block shadow-lg border border-border">
                    <img 
                      src={botStatus.qrCode.startsWith('data:') ? botStatus.qrCode : `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(botStatus.qrCode)}`}
                      alt="QR Code WhatsApp" 
                      className="w-52 h-52 rounded-lg"
                    />
                    <div className="flex items-center justify-center gap-1.5 mt-2 text-[11px] text-zinc-700 font-semibold">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      Aponte a câmera do WhatsApp deste aparelho agora
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 p-4 bg-amber-500/15 border border-amber-500/30 rounded-xl flex items-center gap-3 text-xs text-amber-300">
                    <RefreshCw className={`w-5 h-5 shrink-0 text-amber-400 ${isGeneratingQr ? 'animate-spin' : ''}`} />
                    <div>
                      <p className="font-semibold text-foreground">
                        {isGeneratingQr ? 'Gerando QR Code individual para este PC...' : 'QR Code aguardando sincronização'}
                      </p>
                      <p className="text-muted-foreground text-[11px]">
                        {isGeneratingQr 
                          ? 'O robô Baileys está se comunicando com o WhatsApp. O QR Code aparecerá aqui em instantes...' 
                          : 'Clique em "Gerar Novo QR Code" ao lado ou confirme se o INICIAR_RADAR.exe está ativo neste PC.'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleReconnectBot(true)}
                disabled={isGeneratingQr}
                className="gap-1.5 border-amber-500/40 bg-amber-500/20 text-amber-200 hover:bg-amber-500/30 text-xs font-semibold"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingQr ? 'animate-spin' : ''}`} />
                {isGeneratingQr ? 'Gerando QR Code...' : 'Gerar Novo QR Code'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => checkBotStatus({ manual: true })}
                disabled={isCheckingBot}
                className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                {isCheckingBot && <RefreshCw className="w-3 h-3 animate-spin" />}
                {isCheckingBot ? 'Verificando...' : 'Verificar Status'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Banner de Alerta em Tempo Real: Novos Leads Quentes */}
      {unreadHotLeadsCount > 0 && (
        <div className="p-3.5 rounded-xl bg-gradient-to-r from-red-500/20 via-orange-500/20 to-amber-500/10 border-2 border-red-500/50 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 font-bold shrink-0 text-lg">
              🔥
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-foreground">
                  {unreadHotLeadsCount} Novo{unreadHotLeadsCount > 1 ? 's' : ''} Lead{unreadHotLeadsCount > 1 ? 's' : ''} Quente{unreadHotLeadsCount > 1 ? 's' : ''} Acabou de Responder!
                </span>
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                O cliente está com o celular na mão agora. Clique para responder imediatamente e fechar o negócio.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <Button
              size="sm"
              onClick={() => {
                setIsHotLeadsModalOpen(true);
                handleMarkHotLeadsAsRead();
              }}
              className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs h-8 shadow-sm"
            >
              🔥 Ver Respostas Recebidas ({unreadHotLeadsCount})
            </Button>
          </div>
        </div>
      )}

      {/* Barra de Acesso Rápido às Novas Ferramentas */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-accent/20 border border-border">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-primary" /> Recursos de Conversão:
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setIsHotLeadsModalOpen(true);
              handleMarkHotLeadsAsRead();
            }}
            className="h-7 text-xs font-semibold gap-1.5 bg-background hover:bg-accent border-border"
          >
            🔥 Leads Quentes
            {unreadHotLeadsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-red-500 text-white text-[10px] font-black animate-pulse">
                {unreadHotLeadsCount}
              </span>
            )}
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              fetchAbAnalytics();
              setIsAbModalOpen(true);
            }}
            className="h-7 text-xs font-semibold gap-1.5 bg-background hover:bg-accent border-border"
          >
            📊 Teste A/B de Modelos
            {abAnalytics.globalRate > 0 && (
              <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 text-[10px] py-0">
                {abAnalytics.globalRate}% conv.
              </Badge>
            )}
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              fetchSdrConfig();
              setIsSdrModalOpen(true);
            }}
            className="h-7 text-xs font-semibold gap-1.5 bg-primary/10 hover:bg-primary/20 text-primary border-primary/30"
          >
            🤖 SDR Custo Zero {sdrConfig.enabled ? '🟢' : '⏸️'}
          </Button>
        </div>
      </div>

      <DispatchSafetyPanel />

      {/* Cards de Métricas (4 Colunas) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-border bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-semibold uppercase">Fila de Espera (Aptos)</p>
              <h3 className="text-2xl font-bold text-foreground mt-0.5">{availableQueueLeads.length}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Leads com telefone em Manaus</p>
            </div>
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <User className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-semibold uppercase">Selecionados Agora</p>
              <h3 className="text-2xl font-bold text-emerald-400 mt-0.5">{selectedLeadIds.length}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Prontos para envio {attachedImage ? 'com Imagem' : ''}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
              <CheckSquare className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-semibold uppercase">Modelos Salvos</p>
              <h3 className="text-2xl font-bold text-primary mt-0.5">{templates.length}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Modelos disponíveis para disparo</p>
            </div>
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <MessageSquare className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card cursor-pointer hover:border-primary/50 transition-all" onClick={() => { fetchAbAnalytics(); setIsAbModalOpen(true); }}>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-semibold uppercase">Conversão Teste A/B</p>
              <h3 className="text-2xl font-bold text-emerald-400 mt-0.5">{abAnalytics.globalRate}%</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">{abAnalytics.totalReplied} respostas / {abAnalytics.totalDispatched} envios</p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Progresso e Descanso Durante Disparos */}
      {isDispatching && (
        <div className="space-y-3 animate-in fade-in">
          {/* Alerta de Descanso Anti-Bloqueio (30 minutos entre lotes) */}
          {isBatchResting && (
            <div className="bg-amber-500/10 border-2 border-amber-500/40 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg backdrop-blur-sm animate-pulse">
              <div className="flex items-start sm:items-center gap-3">
                <div className="p-3 bg-amber-500/20 text-amber-400 rounded-xl shrink-0">
                  <Shield className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm sm:text-base text-amber-400">
                      Descanso de Proteção Anti-Bloqueio Ativo
                    </h4>
                    <Badge variant="outline" className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px]">
                      Lote {currentBatchNum} Concluído
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 max-w-xl">
                    O robô enviou o lote de <strong>{batchSize} clientes</strong> com sucesso. Para proteger seu número contra restrições do WhatsApp, uma pausa de <strong>{batchPauseMinutes} minutos</strong> está em andamento. O próximo lote iniciará automaticamente.
                  </p>
                  {nextLeadInfo && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-amber-200">
                      <span className="font-semibold">Primeiro do próximo lote:</span>
                      <strong className="underline">{String(nextLeadInfo?.name || '')}</strong>
                      <span className="font-mono text-[11px] opacity-80">({String(nextLeadInfo?.phone || '')})</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end shrink-0">
                <div className="text-right">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">Retomando em</span>
                  <span className="font-mono text-xl sm:text-2xl font-black text-amber-300 bg-amber-500/20 px-3 py-1 rounded-lg border border-amber-500/30">
                    {formatTimeMinutesSeconds(batchRestCountdown)}
                  </span>
                </div>

                <Button 
                  onClick={handleSkipBatchRest} 
                  size="sm" 
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold h-9 text-xs shadow-md"
                  title="Pular a pausa de 30 minutos e disparar o próximo lote imediatamente"
                >
                  <FastForward className="w-3.5 h-3.5 mr-1.5" /> Pular Descanso
                </Button>
              </div>
            </div>
          )}

          {/* Barra Principal de Progresso do Disparo */}
          <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 flex-wrap">
                <div className={`w-3 h-3 rounded-full ${isBatchResting ? 'bg-amber-500' : 'bg-emerald-500 animate-ping'}`} />
                <h4 className="font-bold text-sm text-emerald-400">
                  {isPaused 
                    ? 'Disparos Pausados' 
                    : isBatchResting 
                      ? `Lote ${currentBatchNum} de ${totalBatchesCount} em Descanso`
                      : `Disparando Mensagens (${currentIndex} de ${selectedLeadIds.length > 0 ? selectedLeadIds.length : (availableQueueLeads.length || currentIndex || 1)})`}
                </h4>
                {useBatchMode && (
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-[10px] font-semibold">
                    Lote {currentBatchNum}/{totalBatchesCount} ({sentInCurrentBatch}/{batchSize} clientes neste ciclo)
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-2 text-xs flex-wrap">
                {!isPaused && !isBatchResting && (
                  countdown > 0 ? (
                    <>
                      <span className="font-mono bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-md border border-emerald-500/30 font-bold flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-emerald-400" />
                        Próximo envio em: {formatTimeMinutesSeconds(countdown)}
                      </span>
                      <Button 
                        size="sm" 
                        onClick={handleSkipCountdown} 
                        disabled={isSkippingCountdown}
                        className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm gap-1"
                        title="Pular espera e disparar para o próximo cliente agora"
                      >
                        {isSkippingCountdown ? (
                          <>
                            <RefreshCw className="w-3 h-3 animate-spin" /> Disparando...
                          </>
                        ) : (
                          <>
                            <Zap className="w-3 h-3" /> Disparar Agora
                          </>
                        )}
                      </Button>
                    </>
                  ) : (
                    <span className="font-mono bg-emerald-500/30 text-emerald-300 px-2.5 py-1 rounded-md border border-emerald-500/40 font-bold flex items-center gap-1.5 animate-pulse">
                      <RefreshCw className="w-3 h-3 animate-spin text-emerald-400" />
                      Disparando mensagem agora...
                    </span>
                  )
                )}
                {isPaused ? (
                  <Button size="sm" onClick={handleResumeDispatch} className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                    <Play className="w-3 h-3 mr-1" /> Continuar
                  </Button>
                ) : (
                  <Button size="sm" onClick={handlePauseDispatch} variant="outline" className="h-7 text-xs border-amber-500/40 text-amber-400 hover:bg-amber-500/20 font-semibold">
                    <Pause className="w-3 h-3 mr-1" /> Pausar
                  </Button>
                )}
                <Button size="sm" onClick={handleStopDispatch} variant="outline" className="h-7 text-xs border-destructive/40 text-destructive hover:bg-destructive/20 font-semibold">
                  <Square className="w-3 h-3 mr-1" /> Cancelar
                </Button>
              </div>
            </div>

            {/* Aviso especial de Fila Pausada ou Alerta do Servidor */}
            {isPaused && (
              <div className="mt-2 bg-amber-500/15 border border-amber-500/40 rounded-lg p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-300">
                <div className="flex items-center gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                  <div>
                    <span className="font-bold block">Fila de Disparos em Pausa</span>
                    <span className="text-amber-300/80 text-[11px]">{typeof queueLastError === 'string' ? queueLastError : 'A fila está pausada. Clique em Continuar para retomar os envios.'}</span>
                  </div>
                </div>
                {!botStatus.connected ? (
                  <Button
                    size="sm"
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shrink-0"
                  >
                    Escanear QR Code no Topo
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={handleResumeDispatch}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shrink-0"
                  >
                    <Play className="w-3 h-3 mr-1" /> Continuar Disparos
                  </Button>
                )}
              </div>
            )}

            {/* Informações detalhadas do Próximo Cliente e Contador em Destaque */}
            {!isPaused && !isBatchResting && (
              <div className="mt-2 bg-background/60 border border-emerald-500/30 rounded-lg p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-inner">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                    {countdown === 0 || isSkippingCountdown ? (
                      <RefreshCw className="w-5 h-5 text-emerald-400 animate-spin" />
                    ) : (
                      <Clock className="w-5 h-5 animate-pulse text-emerald-400" />
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                      {countdown === 0 || isSkippingCountdown ? 'Enviando Mensagem Para:' : 'Próximo Cliente da Fila:'}
                    </span>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-foreground">
                        {String(nextLeadInfo?.name || 'Próximo cliente na fila...')}
                      </span>
                      {nextLeadInfo?.category && (
                        <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20 py-0">
                          {String(nextLeadInfo.category)}
                        </Badge>
                      )}
                      {nextLeadInfo?.phone && (
                        <span className="text-xs font-mono text-muted-foreground">
                          📲 {String(nextLeadInfo.phone)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                  {countdown > 0 && !isSkippingCountdown ? (
                    <>
                      <div className="text-right">
                        <span className="text-[9px] uppercase font-bold text-muted-foreground block">Disparando em</span>
                        <span className="font-mono text-xl sm:text-2xl font-black text-emerald-400 bg-emerald-950/40 px-3 py-0.5 rounded-md border border-emerald-500/40">
                          {formatTimeMinutesSeconds(countdown)}
                        </span>
                      </div>
                      <Button 
                        size="sm" 
                        onClick={handleSkipCountdown} 
                        disabled={isSkippingCountdown}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9 text-xs shadow-md gap-1"
                        title="Pular a contagem regressiva e disparar para este cliente agora"
                      >
                        <Zap className="w-3.5 h-3.5" /> Disparar Agora
                      </Button>
                    </>
                  ) : (
                    <div className="flex items-center gap-2 bg-emerald-950/60 border border-emerald-500/50 px-3 py-1.5 rounded-lg text-emerald-400 text-xs font-bold animate-pulse">
                      <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                      Disparando no WhatsApp agora...
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="w-full bg-accent/40 rounded-full h-2.5 overflow-hidden">
              <div 
                className="bg-emerald-500 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.round((currentIndex / Math.max(1, selectedLeadIds.length > 0 ? selectedLeadIds.length : (availableQueueLeads.length || 1))) * 100))}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Grid Principal: Fila de Espera vs Configuração da Mensagem */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Esquerda: Fila de Espera / Já Acionados (5 colunas) */}
        <Card className="lg:col-span-5 border-border shadow-sm flex flex-col h-[760px] overflow-hidden">
          <CardHeader className="p-3.5 border-b border-border space-y-3 bg-card/40">
            {/* Seletor Principal de Abas: Pendentes vs Já Acionados (100% da largura, perfeitamente alinhado) */}
            <div className="grid grid-cols-2 p-1 bg-accent/30 rounded-xl border border-border/80">
              <button
                type="button"
                onClick={() => setQueueTab('pending')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                  queueTab === 'pending'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/40'
                }`}
              >
                <Send className="w-3.5 h-3.5 shrink-0" />
                <span>Pendentes</span>
                <Badge 
                  variant="outline" 
                  className={`text-[10px] px-1.5 py-0 font-bold ml-1 border-0 ${
                    queueTab === 'pending' 
                      ? 'bg-white/20 text-white' 
                      : 'bg-accent text-muted-foreground'
                  }`}
                >
                  {availableQueueLeads.length}
                </Badge>
              </button>

              <button
                type="button"
                onClick={() => setQueueTab('dispatched')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                  queueTab === 'dispatched'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/40'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-300" />
                <span>Já Acionados</span>
                <Badge 
                  variant="outline" 
                  className={`text-[10px] px-1.5 py-0 font-bold ml-1 border-0 ${
                    queueTab === 'dispatched' 
                      ? 'bg-white/20 text-white' 
                      : 'bg-accent text-muted-foreground'
                  }`}
                >
                  {alreadyContactedLeads.length}
                </Badge>
              </button>
            </div>

            {/* Barra de Ações Rápidas (Selecionar Todos & Prospectar) */}
            {queueTab === 'pending' ? (
              <div className="flex items-center justify-between gap-2">
                <Button 
                  variant={selectedLeadIds.length > 0 ? "default" : "outline"}
                  size="sm" 
                  onClick={handleSelectAll} 
                  className={`text-xs h-8 font-semibold flex items-center gap-1.5 transition-all ${
                    selectedLeadIds.length > 0 ? "bg-primary text-primary-foreground shadow-xs" : "border-border text-foreground hover:bg-accent/40"
                  }`}
                  disabled={availableQueueLeads.length === 0}
                >
                  <CheckSquare className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {selectedLeadIds.length === availableQueueLeads.length && availableQueueLeads.length > 0 
                      ? `Desmarcar Todos (${availableQueueLeads.length})` 
                      : selectedLeadIds.length > 0
                        ? `${selectedLeadIds.length} de ${availableQueueLeads.length} Marcados`
                        : `Selecionar Todos (${availableQueueLeads.length})`}
                  </span>
                </Button>

                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setIsNationalProspectModalOpen(true)} 
                  className="text-xs h-8 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30 font-bold shadow-xs px-2.5 flex items-center gap-1.5 shrink-0"
                  title="Prospectar empresas em qualquer estado ou DDD"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-400" />
                  <span>+ Prospectar</span>
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2 py-0.5">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse"></span>
                  <span><strong className="text-foreground font-semibold">{alreadyContactedLeads.length}</strong> contatos já acionados pelo robô</span>
                </div>
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px] py-0.5 px-2 font-medium shrink-0">
                  ✓ Isolados do Robô
                </Badge>
              </div>
            )}

            {/* Campo de Busca & Filtro de Estados */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1 min-w-0">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground pointer-events-none" />
                <Input 
                  placeholder={queueTab === 'pending' ? "Buscar nome, ramo, fone..." : "Buscar nos contatados..."}
                  className="pl-8 pr-7 h-8 text-xs bg-background border-border"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button 
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-2 text-xs text-muted-foreground hover:text-foreground p-0.5"
                    title="Limpar busca"
                  >
                    ✕
                  </button>
                )}
              </div>

              {queueTab === 'pending' && (
                <div className="w-32 shrink-0">
                  <select
                    value={stateFilter}
                    onChange={(e) => setStateFilter(e.target.value)}
                    className="w-full h-8 px-2 rounded-md bg-background border border-input text-[11px] font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer truncate"
                    title="Filtrar por Estado / DDD"
                  >
                    <option value="TODOS">🇧🇷 Todos Estados</option>
                    <optgroup label="Região Norte">
                      {BRAZIL_STATES.filter(s => s.region === 'Norte').map(s => (
                        <option key={s.uf} value={s.uf}>{s.uf} ({s.ddds.slice(0, 2).join(',')})</option>
                      ))}
                    </optgroup>
                    <optgroup label="Região Sudeste">
                      {BRAZIL_STATES.filter(s => s.region === 'Sudeste').map(s => (
                        <option key={s.uf} value={s.uf}>{s.uf} ({s.ddds.slice(0, 2).join(',')})</option>
                      ))}
                    </optgroup>
                    <optgroup label="Região Sul">
                      {BRAZIL_STATES.filter(s => s.region === 'Sul').map(s => (
                        <option key={s.uf} value={s.uf}>{s.uf} ({s.ddds.slice(0, 2).join(',')})</option>
                      ))}
                    </optgroup>
                    <optgroup label="Região Nordeste">
                      {BRAZIL_STATES.filter(s => s.region === 'Nordeste').map(s => (
                        <option key={s.uf} value={s.uf}>{s.uf} ({s.ddds.slice(0, 2).join(',')})</option>
                      ))}
                    </optgroup>
                    <optgroup label="Região Centro-Oeste">
                      {BRAZIL_STATES.filter(s => s.region === 'Centro-Oeste').map(s => (
                        <option key={s.uf} value={s.uf}>{s.uf} ({s.ddds.slice(0, 2).join(',')})</option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              )}
            </div>

            {/* Categorias / Pastas (quando na aba de pendentes) - SEM BARRA DE ROLAGEM, COM LUPA */}
            {queueTab === 'pending' && categoryTabs.length > 0 && (
              <div className="flex flex-col gap-2 pt-2 pb-1 border-t border-border/50">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
                    <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1 shrink-0">
                      <Folder className="w-3.5 h-3.5 text-primary" /> Pasta:
                    </span>
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="h-7 px-2.5 rounded-lg bg-background border border-input text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer w-full max-w-[240px]"
                      title="Selecione a pasta diretamente sem arrastar"
                    >
                      {categoryTabs.map((tab) => (
                        <option key={tab.id} value={tab.id}>
                          {tab.emoji} {tab.label} ({tab.count})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Lupa de busca rápida para filtrar as pastas */}
                  <div className="relative w-full sm:w-48">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-primary pointer-events-none" />
                    <input
                      type="text"
                      placeholder="🔍 Filtrar pasta..."
                      value={pendingCategorySearch}
                      onChange={(e) => setPendingCategorySearch(e.target.value)}
                      className="h-7 w-full pl-8 pr-6 rounded-lg bg-background border border-input text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
                    />
                    {pendingCategorySearch && (
                      <button
                        type="button"
                        onClick={() => setPendingCategorySearch('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* Pastas em flex-wrap - Quebram linha naturalmente, ZERO barra de rolagem, ZERO arrastar! */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  {categoryTabs
                    .filter((tab) => {
                      if (!pendingCategorySearch.trim()) return true;
                      return tab.label.toLowerCase().includes(pendingCategorySearch.toLowerCase().trim());
                    })
                    .map((tab) => {
                      const isTabActive = categoryFilter === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setCategoryFilter(tab.id)}
                          className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold transition-all border flex items-center gap-1.5 shrink-0 ${
                            isTabActive 
                              ? 'bg-primary text-primary-foreground border-primary shadow-xs' 
                              : 'bg-card text-muted-foreground hover:text-foreground hover:bg-accent/40 border-border'
                          }`}
                        >
                          <span>{tab.emoji}</span>
                          <span>{tab.label}</span>
                          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                            isTabActive ? 'bg-primary-foreground/25 text-white' : 'bg-muted text-muted-foreground'
                          }`}>
                            {tab.count}
                          </span>
                        </button>
                      );
                    })}
                </div>
              </div>
            )}
          </CardHeader>

          <CardContent className="p-3 overflow-y-auto flex-1 space-y-2">
            {queueTab === 'dispatched' ? (
              alreadyContactedLeads.length === 0 ? (
                <div className="p-8 text-center space-y-3 border border-dashed border-border rounded-xl bg-card/40 my-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-sm text-foreground">Nenhum cliente acionado ainda</h4>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      Assim que você iniciar os disparos no WhatsApp, os clientes contatados sairão da fila de pendentes e aparecerão aqui automaticamente.
                    </p>
                  </div>
                </div>
              ) : (
                alreadyContactedLeads.map((lead) => {
                  const phone = formatBrazilianPhone(lead.phone);
                  const sub = lead.subcategory || 'Geral';
                  const meta = getCategoryMeta(sub);

                  return (
                    <div
                      key={lead.id}
                      className="p-3 rounded-lg border bg-card/60 border-border hover:bg-accent/20 transition-all flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="font-bold text-xs text-foreground truncate">{lead.name}</h4>
                            <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px] py-0 px-1.5 font-medium">
                              ✓ Já Acionado
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5 flex-wrap">
                            <span className="text-emerald-400 font-medium">📞 {phone}</span>
                            <span>•</span>
                            <span className="text-[10px] text-muted-foreground">
                              🕒 {lead.dispatchedAt}
                            </span>
                          </div>
                          {lead.dispatchedMessage && (
                            <p className="text-[10px] text-muted-foreground/80 italic mt-1 line-clamp-1 border-l-2 border-emerald-500/40 pl-1.5">
                              "{lead.dispatchedMessage}"
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span 
                          className="text-[10px] px-2 py-0.5 rounded-full font-semibold border hidden sm:inline-flex items-center gap-1"
                          style={{
                            backgroundColor: `${meta.color}15`,
                            color: meta.color,
                            borderColor: `${meta.color}35`
                          }}
                        >
                          {meta.badge.split(' ')[0]} {sub}
                        </span>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReactivateLead(lead)}
                          className="h-7 text-[11px] border-border hover:border-primary/50 text-muted-foreground hover:text-foreground px-2"
                          title="Mover este cliente de volta para a fila de pendentes para novo disparo"
                        >
                          <RotateCcw className="w-3 h-3 mr-1 text-primary" /> Reativar
                        </Button>
                      </div>
                    </div>
                  );
                })
              )
            ) : availableQueueLeads.length === 0 ? (
              <div className="p-8 text-center space-y-4 border border-dashed border-border rounded-xl bg-card/40 my-2">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-foreground text-base">
                    {alreadyContactedLeads.length > 0 ? '🎉 Todos os clientes cadastrados já foram acionados!' : 'Fila de espera vazia'}
                  </h4>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                    {alreadyContactedLeads.length > 0
                      ? 'Você já disparou mensagens para os clientes cadastrados. Para disparar novamente, acesse a aba "Já Acionados" ou adicione mais estabelecimentos pelo Brasil.'
                      : 'Não há clientes pendentes para disparo no momento. Adicione novos contatos para abastecer o robô e iniciar os disparos.'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                  <Button 
                    onClick={() => setQueueTab('dispatched')}
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 shadow-sm"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                    Ver Clientes Já Acionados ({alreadyContactedLeads.length})
                  </Button>
                  <Button 
                    onClick={() => setIsNationalProspectModalOpen(true)} 
                    size="sm"
                    variant="outline"
                    className="border-border hover:bg-accent/40 text-muted-foreground font-semibold text-xs h-9"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    🇧🇷 Prospectar por Estado / DDD
                  </Button>
                </div>
              </div>
            ) : (
              availableQueueLeads.map((lead: any) => {
                const isSelected = selectedLeadIds.includes(lead.id);
                const phone = formatBrazilianPhone(lead.phone || lead.contacts?.[0]?.value);
                const sub = lead.subcategory || lead.segment?.name || 'Geral';
                const meta = getCategoryMeta(sub);

                return (
                  <div
                    key={lead.id}
                    onClick={() => !isDispatching && handleToggleLead(lead.id)}
                    className={`p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected 
                        ? 'bg-primary/10 border-primary shadow-sm' 
                        : 'bg-card border-border hover:bg-accent/20'
                    } ${isDispatching ? 'pointer-events-none opacity-80' : ''}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <input 
                        type="checkbox" 
                        checked={isSelected} 
                        onChange={() => {}} 
                        className="w-4 h-4 rounded text-primary cursor-pointer accent-primary" 
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-bold text-xs text-foreground truncate">{lead.name}</h4>
                          {lead.address?.state && (
                            <span className="px-1.5 py-0.2 rounded bg-accent text-[9px] font-bold text-foreground border border-border shrink-0">
                              {lead.address.state}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                          <span className="text-emerald-400 font-medium">📞 {phone}</span>
                          <span>•</span>
                          <span className="truncate">
                            {[lead.address?.neighborhood, lead.address?.city, lead.address?.state].filter(Boolean).join(', ') || 'Brasil'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDirectWhatsApp(lead);
                        }}
                        className="h-7 px-2 text-[10px] font-semibold text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/15 border border-emerald-500/30 gap-1 rounded-md transition-all shadow-xs"
                        title="Abrir diretamente no WhatsApp Web / Desktop sem precisar de QR Code"
                      >
                        <Zap className="w-3 h-3 text-emerald-400" />
                        <span className="hidden sm:inline">WhatsApp Web</span>
                      </Button>

                      <span 
                        className="text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 border inline-flex items-center gap-1"
                        style={{
                          backgroundColor: `${meta.color}15`,
                          color: meta.color,
                          borderColor: `${meta.color}35`
                        }}
                      >
                        <span>{meta.badge.split(' ')[0]}</span>
                        <span>{meta.subcategory}</span>
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Direita: Modelos de Mensagem, Criador de Modelo, Upload de Imagem & Envio (7 colunas) */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-emerald-400" />
                    Modelos de Mensagem & Prévia WhatsApp
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Crie e edite seus próprios modelos com suporte a <strong>Negrito (*...*)</strong>.
                  </CardDescription>
                </div>

                <Button 
                  size="sm" 
                  onClick={handleOpenCreateTemplate}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs h-8 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Criar Novo Modelo
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Anexo de Imagem Promocional */}
              <div className="p-3.5 bg-accent/25 rounded-xl border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-primary" />
                    Anexo de Imagem Promocional / Folder
                  </span>
                  {attachedImage && (
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px] font-bold">
                      ✓ Imagem Ativa no Disparo
                    </Badge>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleImageUpload} 
                    accept="image/*" 
                    className="hidden" 
                  />

                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => fileInputRef.current?.click()} 
                    className="h-8 text-xs font-semibold"
                  >
                    <Upload className="w-3.5 h-3.5 mr-1.5" />
                    {attachedImage ? 'Trocar Imagem do Computador' : 'Carregar Imagem do Computador'}
                  </Button>

                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleUsePresetImage} 
                    className="h-8 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Usar Folder Padrão
                  </Button>

                  {attachedImage && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={handleRemoveImage} 
                      className="h-8 text-xs text-destructive hover:bg-destructive/10 ml-auto"
                    >
                      <X className="w-3.5 h-3.5 mr-1" />
                      Remover
                    </Button>
                  )}
                </div>

                {attachedImage && (
                  <div className="flex items-center gap-3 pt-1">
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-border shrink-0 bg-black/40 shadow-sm">
                      <img src={attachedImage} alt="Anexo WhatsApp" className="w-full h-full object-cover" />
                    </div>
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <p className="font-semibold text-foreground">Imagem anexada ao disparo</p>
                      <p className="text-[11px]">Será enviada aos clientes com a mensagem abaixo como legenda oficial.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Campos Dinâmicos do Remetente */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-accent/20 rounded-lg border border-border">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    Meu Nome (enviado em *Negrito*):
                  </label>
                  <Input 
                    value={senderName} 
                    onChange={(e) => setSenderName(e.target.value)}
                    placeholder="Ex: Carlos Santos"
                    className="h-8 text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    Nome da Empresa (enviado em *Negrito*):
                  </label>
                  <Input 
                    value={companyName} 
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Ex: Radar de Oportunidades"
                    className="h-8 text-xs font-medium"
                  />
                </div>
              </div>

              {/* Lista dos Modelos Existentes com Botões de Editar */}
              <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-4 items-start">
                <div className="space-y-3 min-w-0">
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-emerald-400" />
                    Modelos de Mensagem Disponíveis ({templates.length})
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleLoadSafeAntiBanTemplates}
                      className="h-7 text-[11px] bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 px-2.5 font-bold shadow-xs flex items-center gap-1.5"
                      title="Carregar modelos de mensagem para contatos que autorizaram a comunicação"
                    >
                      <Shield className="w-3 h-3 text-emerald-400" />
                      Modelos de Mensagem
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={handleResetToDefaultTemplates}
                      className="h-7 text-[11px] text-muted-foreground hover:text-foreground px-2"
                      title="Voltar aos textos padrão originais"
                    >
                      <RotateCcw className="w-3 h-3 mr-1" /> Restaurar Originais
                    </Button>
                    <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={rotateTemplates} 
                        onChange={(e) => setRotateTemplates(e.target.checked)}
                        className="w-3.5 h-3.5 accent-primary rounded cursor-pointer"
                      />
                      <span className={rotateTemplates ? 'text-primary font-bold' : ''}>
                        🔀 Alternar no Disparo
                      </span>
                    </label>
                  </div>
                </div>

                {/* Cards de Todos os Modelos Cadastrados */}
                <div className="grid grid-cols-1 gap-2 max-h-[30rem] overflow-y-auto pr-1 rounded-xl border border-border/70 bg-background/30 p-2">
                  {templates.map((tpl, idx) => {
                    const isSelected = selectedTemplateIndex === idx;
                    return (
                      <div 
                        key={tpl.id}
                          className={`p-3 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                          isSelected 
                            ? 'bg-primary/10 border-primary/60 shadow-sm' 
                            : 'bg-accent/15 border-border hover:bg-accent/30'
                        }`}
                      >
                        <div 
                          className="min-w-0 flex-1 cursor-pointer"
                          onClick={() => setSelectedTemplateIndex(idx)}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold truncate ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                              {tpl.name}
                            </span>
                            {isSelected && (
                              <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px] py-0">
                                ✓ Ativo para Disparo
                              </Badge>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1 font-sans leading-relaxed">
                            {tpl.text}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {!isSelected && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedTemplateIndex(idx)}
                              className="h-7 px-2 text-xs"
                            >
                              Selecionar
                            </Button>
                          )}

                          {/* Botão de Edição que abre o editor com a prévia no padrão WhatsApp */}
                          <Button
                            size="sm"
                            onClick={() => handleOpenEditTemplate(idx)}
                            className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm"
                            title="Editar texto, título e tags deste modelo com prévia do WhatsApp"
                          >
                            <Edit3 className="w-3 h-3 mr-1" />
                            Editar
                          </Button>

                          {templates.length > 1 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => handleDeleteTemplate(idx, e)}
                              className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 font-medium"
                              title="Excluir este modelo"
                            >
                              <Trash2 className="w-3 h-3 mr-1" />
                              Remover
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                </div>

                {/* Editor Rápido do Modelo Selecionado */}
                <div className="p-3 bg-accent/20 rounded-xl border border-border space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                      <Edit3 className="w-3.5 h-3.5 text-primary" /> Editando: {templates[selectedTemplateIndex]?.name}
                    </span>
                    <Button 
                      size="sm" 
                      onClick={() => handleOpenEditTemplate(selectedTemplateIndex)}
                      className="h-6 text-[11px] bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 font-semibold px-2"
                    >
                      <Smartphone className="w-3 h-3 mr-1" /> Abrir no Balão WhatsApp
                    </Button>
                  </div>

                  {/* Campo para renomear título */}
                  <Input 
                    value={templates[selectedTemplateIndex]?.name || ''} 
                    onChange={(e) => handleTemplateNameChange(e.target.value)}
                    placeholder="Título do Modelo..."
                    className="h-8 text-xs font-semibold bg-background"
                  />

                  {/* Chips Rápidos de Tags */}
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="text-[10px] text-muted-foreground mr-1 font-semibold">Inserir:</span>
                    <button
                      type="button"
                      onClick={() => handleInsertTagOnPage('*{{nome_cliente}}*')}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-background hover:bg-accent border border-border font-semibold text-primary"
                    >
                      + *Nome Cliente*
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertTagOnPage('*{{meu_nome}}*')}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-background hover:bg-accent border border-border font-semibold text-primary"
                    >
                      + *Meu Nome*
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertTagOnPage('*{{minha_empresa}}*')}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-background hover:bg-accent border border-border font-semibold text-primary"
                    >
                      + *Minha Empresa*
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertTagOnPage('*{{segmento}}*')}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-background hover:bg-accent border border-border font-semibold text-primary"
                    >
                      + *Segmento*
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertTagOnPage('*{{cidade}}*')}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-background hover:bg-accent border border-border font-semibold text-primary"
                    >
                      + *Cidade*
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertTagOnPage('*{{estado}}*')}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-background hover:bg-accent border border-border font-semibold text-primary"
                    >
                      + *Estado*
                    </button>
                    <button
                      type="button"
                      onClick={handleInsertSpintaxOnPage}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 font-bold text-amber-400"
                      title="Insere opções de saudação alternadas {Olá|Oi|Tudo bem?}"
                    >
                      + 🔀 Spintax Saudação
                    </button>
                  </div>

                  {/* Textarea para edição direta */}
                  <textarea 
                    rows={4}
                    className="w-full bg-background border border-border rounded-lg p-2.5 text-xs font-mono leading-relaxed focus:outline-none focus:border-primary resize-none shadow-sm"
                    value={templates[selectedTemplateIndex]?.text || ''}
                    onChange={(e) => handleTemplateTextChange(e.target.value)}
                    placeholder="Digite o texto da mensagem..."
                  />

                  {/* Alerta inteligente se houver links externos no modelo */}
                  {/https?:\/\/|www\./i.test(templates[selectedTemplateIndex]?.text || '') && (
                    <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-300 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                      <div className="space-y-0.5">
                        <strong className="font-bold">Revise o conteúdo:</strong>
                        <p className="text-[11px] text-amber-200/90 leading-relaxed">
                          Esta mensagem contém um link externo. Confira o endereço e se o conteúdo corresponde ao que o contato autorizou receber.
                        </p>
                        <p className="text-[11px] text-amber-300 font-semibold">
                          Inclua uma forma clara de pedir o encerramento das mensagens, como responder SAIR.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-0.5">
                    <span className="text-[10px] text-muted-foreground">
                      *texto* = <strong>Negrito</strong> • Salvo automaticamente
                    </span>
                    <div className="flex items-center gap-2">
                      {templates.length > 1 && (
                        <Button 
                          variant="ghost"
                          size="sm" 
                          onClick={() => handleDeleteTemplate(selectedTemplateIndex)}
                          className="h-7 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 font-medium"
                          title="Excluir este modelo"
                        >
                          <Trash2 className="w-3 h-3 mr-1" /> Remover Modelo
                        </Button>
                      )}
                      <Button 
                        size="sm" 
                        onClick={handleExplicitSaveCurrentTemplate}
                        className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 shadow-sm"
                      >
                        <Save className="w-3 h-3 mr-1" /> Salvar Mensagem
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Prévia Visual Estilo Balão WhatsApp (Imagem + Legenda) */}
              <div className="p-3.5 bg-[#EFEAE2] dark:bg-[#0c1317] rounded-xl border border-border space-y-2 shadow-inner">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground pb-1 border-b border-border/40">
                  <span className="flex items-center gap-1 font-semibold text-foreground">
                    <Smartphone className="w-3.5 h-3.5 text-emerald-500" /> Prévia Visual do WhatsApp {attachedImage ? '(Imagem + Legenda)' : '(Apenas Texto)'}
                  </span>
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-bold px-2 py-0.5 rounded">
                    Padrão Oficial WhatsApp
                  </span>
                </div>

                <div className="bg-white dark:bg-[#005c4b] rounded-lg shadow-sm text-xs leading-relaxed max-w-lg text-[#111b21] dark:text-[#e9edef] overflow-hidden font-sans border border-black/5">
                  {attachedImage && (
                    <div className="w-full max-h-48 overflow-hidden bg-black/10">
                      <img src={attachedImage} alt="Prévia do Anexo" className="w-full h-auto object-cover max-h-48" />
                    </div>
                  )}

                  <div className="p-3 whitespace-pre-wrap">
                    {previewMessage.split('\n').map((line, idx) => {
                      const parts = line.split(/(\*[^*]+\*)/g);
                      return (
                        <p key={idx} className="min-h-[1em]">
                          {parts.map((part, pIdx) => {
                            if (part.startsWith('*') && part.endsWith('*')) {
                              return <strong key={pIdx} className="font-bold text-foreground dark:text-white">{part.slice(1, -1)}</strong>;
                            }
                            return part;
                          })}
                        </p>
                      );
                    })}
                    <span className="block text-[10px] text-right text-muted-foreground mt-1">14:30 ✓✓</span>
                  </div>
                </div>
              </div>

              {/* Sistema de Tempo & Disparo em Lotes Anti-Bloqueio */}
              <div className="pt-3 border-t border-border space-y-3">
                {/* Controles do Lote & Frequência */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-accent/20 p-3 rounded-xl border border-border">
                  
                  {/* Intervalo Entre Clientes */}
                  <div>
                    <label className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-primary" />
                      Intervalo Entre Mensagens:
                    </label>
                    <select
                      className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs shadow-sm font-medium mt-1"
                      value={dispatchIntervalSeconds}
                      onChange={(e) => updateDispatchConfig(Number(e.target.value), undefined, undefined)}
                      disabled={isDispatching}
                    >
                      <option value={240}>⏱️ 4 minutos (Padrão Solicitado)</option>
                      <option value={300}>⏱️ 5 minutos (Intervalo maior)</option>
                      <option value={180}>⏱️ 3 minutos (Moderado)</option>
                      <option value={120}>⏱️ 2 minutos (Rápido)</option>
                      <option value={60}>⏱️ 1 minuto (Acelerado)</option>
                      <option value={30}>⏱️ 30 segundos (Avançado)</option>
                      <option value={5}>⚡ 5 segundos (Modo Teste Rápido)</option>
                    </select>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Tempo de espera entre cada envio individual.</p>
                  </div>

                  {/* Quantidade por Lote */}
                  <div>
                    <label className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-amber-500" />
                      Tamanho do Lote:
                    </label>
                    <select
                      className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs shadow-sm font-medium mt-1"
                      value={batchSize}
                      onChange={(e) => updateDispatchConfig(undefined, Number(e.target.value), undefined)}
                      disabled={isDispatching}
                    >
                      <option value={10}>👥 10 clientes por ciclo (Padrão)</option>
                      <option value={5}>👥 5 clientes por ciclo (Mais conservador)</option>
                      <option value={15}>👥 15 clientes por ciclo</option>
                      <option value={20}>👥 20 clientes por ciclo</option>
                    </select>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Quantos clientes recebem antes da pausa.</p>
                  </div>

                  {/* Pausa / Descanso Entre Lotes */}
                  <div>
                    <label className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                      <RotateCcw className="w-3.5 h-3.5 text-emerald-500" />
                      Pausa do Lote:
                    </label>
                    <select
                      className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs shadow-sm font-medium mt-1"
                      value={batchPauseMinutes}
                      onChange={(e) => updateDispatchConfig(undefined, undefined, Number(e.target.value))}
                      disabled={isDispatching}
                    >
                      <option value={30}>🛡️ 30 minutos (Padrão Solicitado)</option>
                      <option value={15}>🛡️ 15 minutos (Pausa Média)</option>
                      <option value={45}>🛡️ 45 minutos (Descanso Longo)</option>
                      <option value={60}>🛡️ 60 minutos (1 hora)</option>
                      <option value={1}>⚡ 1 minuto (Modo Teste Rápido)</option>
                    </select>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Descanso do número antes dos próximos 10.</p>
                  </div>

                </div>

                {/* Resumo da Estratégia Ativa */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]">
                      Intervalos configurados
                    </Badge>
                    <span>
                      Envia <strong>1 mensagem a cada {Math.round(dispatchIntervalSeconds / 60)} min</strong>. A cada <strong>{batchSize} clientes</strong>, descansa <strong>{batchPauseMinutes} min</strong> e continua automaticamente.
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-3">
                  <div className="w-full sm:w-auto">
                    {isDispatching ? (
                      <div className="flex gap-2 w-full">
                        {isPaused ? (
                          <Button onClick={handleResumeDispatch} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                            <Play className="w-4 h-4 mr-1.5" /> Continuar
                          </Button>
                        ) : (
                          <Button onClick={handlePauseDispatch} variant="outline" className="flex-1 border-amber-500/40 text-amber-400 hover:bg-amber-500/10 font-semibold">
                            <Pause className="w-4 h-4 mr-1.5" /> Pausar
                          </Button>
                        )}
                        <Button onClick={handleStopDispatch} variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive/10 font-semibold">
                          <Square className="w-4 h-4 mr-1.5" /> Parar
                        </Button>
                      </div>
                    ) : (
                      <Button 
                        onClick={handleStartDispatch} 
                        disabled={allLeadsWithPhone.length === 0}
                        className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 shadow-md transition-all"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        {selectedLeadIds.length > 0
                          ? `Iniciar Disparo (${selectedLeadIds.length} Selecionados) ${attachedImage ? '+ Imagem' : ''}`
                          : availableQueueLeads.length > 0
                            ? `Iniciar Disparo (Todos os ${availableQueueLeads.length} Clientes) ${attachedImage ? '+ Imagem' : ''}`
                            : allLeadsWithPhone.length > 0
                              ? `Iniciar Disparo (Reenviar para ${allLeadsWithPhone.length} Clientes) ${attachedImage ? '+ Imagem' : ''}`
                              : `Nenhum Cliente Cadastrado`}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal Interativo para Criar e Editar Modelos com Prévia no Padrão WhatsApp */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-card w-full max-w-4xl rounded-2xl border border-border shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-accent/20">
              <div className="flex items-center gap-2 text-primary font-bold">
                <MessageSquare className="w-5 h-5" />
                <h3 className="text-lg text-foreground">
                  {editingTemplateId ? 'Editar Modelo de Mensagem' : 'Criar Novo Modelo de Mensagem'}
                </h3>
              </div>
              <button 
                onClick={() => setIsTemplateModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Editor (Left) & WhatsApp Preview (Right) */}
            <div className="p-5 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Left Column: Form & Dynamic Tags */}
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase block mb-1.5">
                    Nome / Título do Modelo:
                  </label>
                  <Input 
                    value={modalTemplateName}
                    onChange={(e) => setModalTemplateName(e.target.value)}
                    placeholder="Ex: Oferta Exclusiva para Padarias em Manaus"
                    className="h-9 text-xs font-semibold"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase">
                      Texto da Mensagem:
                    </label>
                    <span className="text-[11px] text-muted-foreground">
                      *texto* = <strong>Negrito</strong>
                    </span>
                  </div>

                  <textarea 
                    rows={9}
                    className="w-full bg-background border border-border rounded-lg p-3 text-xs font-mono leading-relaxed focus:outline-none focus:border-primary resize-none shadow-sm"
                    value={modalTemplateText}
                    onChange={(e) => setModalTemplateText(e.target.value)}
                    placeholder="Digite aqui o texto da mensagem..."
                  />
                </div>

                {/* Quick Tag Insertion Buttons */}
                <div className="space-y-2 p-3 bg-accent/20 rounded-xl border border-border">
                  <p className="text-[11px] font-bold text-foreground flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-primary" /> Clique para inserir tags dinâmicas no texto:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleInsertTagInModal('*{{nome_cliente}}*')}
                      className="px-2 py-1 rounded bg-background hover:bg-accent border border-border text-xs font-semibold text-primary"
                    >
                      + *Nome do Cliente*
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertTagInModal('*{{meu_nome}}*')}
                      className="px-2 py-1 rounded bg-background hover:bg-accent border border-border text-xs font-semibold text-primary"
                    >
                      + *Meu Nome*
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertTagInModal('*{{minha_empresa}}*')}
                      className="px-2 py-1 rounded bg-background hover:bg-accent border border-border text-xs font-semibold text-primary"
                    >
                      + *Minha Empresa*
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertTagInModal('*{{segmento}}*')}
                      className="px-2 py-1 rounded bg-background hover:bg-accent border border-border text-xs font-semibold text-primary"
                    >
                      + *Segmento / Ramo*
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertTagInModal('*{{cidade}}*')}
                      className="px-2 py-1 rounded bg-background hover:bg-accent border border-border text-xs font-semibold text-primary"
                    >
                      + *Cidade*
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertTagInModal('*{{estado}}*')}
                      className="px-2 py-1 rounded bg-background hover:bg-accent border border-border text-xs font-semibold text-primary"
                    >
                      + *Estado*
                    </button>
                    <button
                      type="button"
                      onClick={handleInsertSpintaxInModal}
                      className="px-2 py-1 rounded bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-xs font-bold text-amber-400"
                      title="Insere variação de saudação {Olá|Oi|Tudo bem?}"
                    >
                      + 🔀 Spintax Saudação
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Exact WhatsApp Preview */}
              <div className="space-y-3 flex flex-col">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-emerald-500" /> Prévia Exata no Padrão WhatsApp
                  </span>
                  <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                    Ao Vivo
                  </Badge>
                </div>

                {/* WhatsApp Chat Container */}
                <div className="p-4 bg-[#EFEAE2] dark:bg-[#0c1317] rounded-2xl border border-border flex-1 flex flex-col justify-center items-center shadow-inner relative min-h-[320px]">
                  <div className="w-full max-w-sm bg-white dark:bg-[#005c4b] rounded-2xl shadow-md text-xs leading-relaxed text-[#111b21] dark:text-[#e9edef] overflow-hidden font-sans border border-black/5 animate-in fade-in">
                    
                    {/* Imagem caso tenha anexo ativo */}
                    {attachedImage && (
                      <div className="w-full max-h-44 overflow-hidden bg-black/10">
                        <img src={attachedImage} alt="Anexo do Modelo" className="w-full h-auto object-cover max-h-44" />
                      </div>
                    )}

                    {/* Mensagem com formatação em Negrito */}
                    <div className="p-3.5 whitespace-pre-wrap space-y-1">
                      {modalPreviewCompiled.split('\n').map((line, idx) => {
                        const parts = line.split(/(\*[^*]+\*)/g);
                        return (
                          <p key={idx} className="min-h-[1em]">
                            {parts.map((part, pIdx) => {
                              if (part.startsWith('*') && part.endsWith('*')) {
                                return <strong key={pIdx} className="font-bold text-foreground dark:text-white">{part.slice(1, -1)}</strong>;
                              }
                              return part;
                            })}
                          </p>
                        );
                      })}
                      <span className="block text-[10px] text-right text-muted-foreground mt-1">14:32 ✓✓</span>
                    </div>
                  </div>

                  <p className="text-[10px] text-muted-foreground text-center mt-3">
                    * Exemplo simulado com o estabelecimento "Panificadora Conde do Pão" em Manaus.
                  </p>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border flex items-center justify-between gap-3 bg-accent/10">
              <div>
                {editingTemplateId && templates.length > 1 && (
                  <Button 
                    variant="ghost" 
                    onClick={handleDeleteCurrentEditingTemplate} 
                    className="text-xs text-destructive hover:bg-destructive/10 font-semibold h-9"
                  >
                    <Trash2 className="w-4 h-4 mr-1.5" />
                    Excluir / Remover Este Modelo
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={() => setIsTemplateModalOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveModalTemplate} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5">
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  {editingTemplateId ? 'Salvar Alterações' : 'Salvar e Usar Este Modelo'}
                </Button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Modal de Filtro de Contatos Pessoais e Familiares */}
      {isIgnoredModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-card w-full max-w-xl rounded-2xl border border-border shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-accent/20">
              <div className="flex items-center gap-2 text-amber-500 font-bold">
                <Shield className="w-5 h-5" />
                <h3 className="text-base text-foreground">
                  🛡️ Contatos Pessoais e Familiares Ignorados
                </h3>
              </div>
              <button 
                onClick={() => setIsIgnoredModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto">
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-200 leading-relaxed">
                <strong>Como funciona:</strong> O robô <strong>não responderá automaticamente</strong> e não enviará menus ou mensagens de clientes para qualquer pessoa cujo nome salvo na agenda, nome no WhatsApp ou número de telefone coincida com os itens abaixo (ex: <em>dengosa, mãe, família, amor</em> ou números específicos).
              </div>

              {/* Input para adicionar novo termo ou número */}
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase block mb-1.5">
                  Adicionar Nome, Apelido ou Número de Telefone:
                </label>
                <div className="flex gap-2">
                  <Input 
                    value={newIgnoredInput}
                    onChange={(e) => setNewIgnoredInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddIgnoredContact();
                      }
                    }}
                    placeholder="Ex: dengosa, mãe, amor, 92991234567..."
                    className="h-9 text-xs"
                  />
                  <Button 
                    onClick={handleAddIgnoredContact}
                    disabled={!newIgnoredInput.trim() || isSavingIgnored}
                    size="sm"
                    className="bg-primary text-primary-foreground font-semibold px-4 h-9"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Adicionar
                  </Button>
                </div>
              </div>

              {/* Lista de Termos / Contatos Ativos */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase">
                    Lista Ativa ({ignoredContacts.length} itens protegidos):
                  </label>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleResetIgnoredDefaults}
                    className="h-6 text-[11px] text-muted-foreground hover:text-foreground px-2"
                  >
                    Restaurar Padrões
                  </Button>
                </div>

                <div className="flex flex-wrap gap-1.5 p-3 bg-muted/40 rounded-xl border border-border min-h-[100px] max-h-[220px] overflow-y-auto items-start content-start">
                  {ignoredContacts.length === 0 ? (
                    <span className="text-xs text-muted-foreground italic">Nenhum termo ou contato adicionado.</span>
                  ) : (
                    ignoredContacts.map((item) => (
                      <Badge 
                        key={item}
                        variant="secondary"
                        className="px-2.5 py-1 text-xs bg-card border border-border flex items-center gap-1.5 font-medium shadow-xs"
                      >
                        <span>{item}</span>
                        <button 
                          onClick={() => handleRemoveIgnoredContact(item)}
                          className="hover:text-destructive hover:bg-destructive/10 rounded-full p-0.5 transition-colors"
                          title={`Remover "${item}"`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border flex items-center justify-end gap-3 bg-accent/10">
              <Button variant="default" onClick={() => setIsIgnoredModalOpen(false)} className="px-5 font-bold">
                Concluir
              </Button>
            </div>

          </div>
        </div>
      )}

      {/* Modal de Gestão da Proteção Anti-Reenvio Permanente */}
      {isAttendedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-border flex items-center justify-between bg-accent/20">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    Escudo de Proteção Anti-Reenvio
                    <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/40 text-xs">
                      {attendedPhoneDigitsSet.size} Números Protegidos
                    </Badge>
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Clientes contatados, em atendimento ou que responderam no WhatsApp ficam bloqueados contra novos disparos de prospecção.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsAttendedModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-accent/40 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={attendedSearchQuery}
                    onChange={(e) => setAttendedSearchQuery(e.target.value)}
                    placeholder="Buscar por telefone ou motivo..."
                    className="h-9 pl-9 text-xs"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchAttendedPhones}
                  className="h-9 px-3 text-xs gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Atualizar
                </Button>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase">
                  Registros Ativos no Servidor ({attendedPhones.length}):
                </label>

                <div className="border border-border rounded-xl divide-y divide-border bg-muted/20 max-h-[350px] overflow-y-auto">
                  {attendedPhones.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground text-xs">
                      Nenhum telefone registrado no momento.
                    </div>
                  ) : (
                    attendedPhones
                      .filter(item => {
                        if (!attendedSearchQuery.trim()) return true;
                        const q = attendedSearchQuery.toLowerCase();
                        return item.phone.toLowerCase().includes(q) || (item.reason || '').toLowerCase().includes(q);
                      })
                      .map((item, idx) => (
                        <div key={`${item.phone}_${idx}`} className="p-3 flex items-center justify-between hover:bg-accent/20 transition-colors text-xs">
                          <div>
                            <div className="font-semibold text-foreground flex items-center gap-2">
                              <span>📱 {item.phone.includes('@') ? item.phone : formatBrazilianPhone(item.phone)}</span>
                              <Badge variant="outline" className="text-[10px] py-0 bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                                {item.reason || 'Atendido'}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              Registrado em {new Date(item.timestamp).toLocaleString('pt-BR')}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUnlockAttendedPhone(item.phone)}
                            className="h-7 px-2.5 text-[11px] text-destructive hover:bg-destructive/10 hover:text-destructive"
                            title="Desbloquear para permitir que este número receba mensagens novamente"
                          >
                            Liberar Reenvio
                          </Button>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border flex items-center justify-between bg-accent/10 text-xs text-muted-foreground">
              <span>Histórico de contatos mantido no servidor</span>
              <Button variant="default" onClick={() => setIsAttendedModalOpen(false)} className="px-5 font-bold">
                Fechar
              </Button>
            </div>

          </div>
        </div>
      )}

      {/* Pasta de Acionados no WhatsApp por Data */}
      <Card className="border-border shadow-sm">
        <CardHeader 
          className="pb-3 cursor-pointer hover:bg-accent/10 transition-colors"
          onClick={() => setHistoryOpen(!historyOpen)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <Folder className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-base flex flex-wrap items-center gap-2">
                  <span>Pasta de Clientes Acionados no WhatsApp</span>
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-xs">
                    {history.length} clientes protegidos contra reenvio
                  </Badge>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium flex items-center gap-1">
                    <HardDrive className="w-3 h-3" /> Salvo no Servidor (Anti-perda de Cache)
                  </span>
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Clientes organizados dentro de cada pasta de segmento. Clique em uma pasta para visualizar seus contatos sem poluição visual.
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {history.length > 0 && (
                <>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={(e) => { e.stopPropagation(); handleExportHistoryCSV(); }}
                    className="text-xs h-8 gap-1.5 border-border hover:bg-white/5"
                    title="Exportar Histórico em CSV"
                  >
                    <Download className="w-3.5 h-3.5 text-primary" /> Planilha (CSV)
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={(e) => { e.stopPropagation(); handleClearHistory(); }}
                    className="text-xs text-muted-foreground hover:text-destructive h-8"
                    title="Limpar Histórico"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Limpar
                  </Button>
                </>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => { e.stopPropagation(); setHistoryOpen(!historyOpen); }}
                className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground gap-1 border border-border/50"
                title={historyOpen ? 'Recolher Seção' : 'Abrir Seção'}
              >
                {historyOpen ? (
                  <>
                    <ChevronUp className="w-4 h-4 text-primary" />
                    <span className="hidden sm:inline font-medium">Recolher Seção</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    <span className="hidden sm:inline font-medium">Abrir Seção</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>

        {historyOpen && (
          <CardContent className="p-4 space-y-5">
            {/* Barra de Busca, Filtro de Pastas e Status de Sincronização */}
            <div className="flex flex-col gap-3 pb-3 border-b border-border/50">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="relative w-full sm:w-80">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
                  <Input 
                    value={historySearchQuery}
                    onChange={(e) => setHistorySearchQuery(e.target.value)}
                    placeholder="Buscar por nome, WhatsApp ou ramo..."
                    className="h-8 pl-8 text-xs bg-background/60"
                  />
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground w-full sm:w-auto justify-between sm:justify-end">
                  {isSyncingHistory ? (
                    <span className="flex items-center gap-1.5 text-primary animate-pulse text-[11px]">
                      <RefreshCw className="w-3 h-3 animate-spin" /> Sincronizando com disco...
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-emerald-400 text-[11px] font-medium">
                      <CheckCircle2 className="w-3 h-3" /> {history.length} clientes gravados em disco
                    </span>
                  )}
                </div>
              </div>

              {/* Seletor de Pastas / Segmentos e Controles de Visualização */}
              <div className="flex flex-col gap-2 pt-1">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                  {/* Seletor Manual Suspenso para o Histórico */}
                  <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                    <span className="text-xs font-bold text-muted-foreground flex items-center gap-1 shrink-0">
                      <Folder className="w-3.5 h-3.5 text-primary" /> Pasta:
                    </span>
                    <select
                      value={historyCategoryFilter}
                      onChange={(e) => handleSelectHistoryCategory(e.target.value)}
                      className="h-8 px-2.5 rounded-lg bg-background border border-input text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer max-w-xs"
                      title="Selecione manualmente a pasta do histórico sem arrastar"
                    >
                      <option value="Todas">📁 Todas as Pastas ({history.length})</option>
                      {historyCategoriesList.map((cat) => {
                        const meta = getCategoryMeta(cat);
                        const count = historyCategoriesMap[cat] || 0;
                        return (
                          <option key={cat} value={cat}>
                            {meta.badge.split(' ')[0] || '📁'} {meta.subcategory || cat} ({count})
                          </option>
                        );
                      })}
                    </select>

                    {/* Lupa de busca rápida para filtrar as pastas do histórico */}
                    <div className="relative w-full sm:w-48">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-primary pointer-events-none" />
                      <input
                        type="text"
                        placeholder="🔍 Filtrar pasta..."
                        value={historyCategorySearch}
                        onChange={(e) => setHistoryCategorySearch(e.target.value)}
                        className="h-8 w-full pl-8 pr-6 rounded-lg bg-background border border-input text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
                      />
                      {historyCategorySearch && (
                        <button
                          type="button"
                          onClick={() => setHistoryCategorySearch('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Alternador de Modo e Botões Expandir/Recolher */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <div className="flex items-center bg-accent/40 p-0.5 rounded-lg border border-border text-xs">
                      <button
                        type="button"
                        onClick={() => setHistoryViewMode('by_folder')}
                        className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                          historyViewMode === 'by_folder'
                            ? 'bg-primary text-primary-foreground shadow-xs'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        📁 Por Pasta
                      </button>
                      <button
                        type="button"
                        onClick={() => setHistoryViewMode('by_date')}
                        className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                          historyViewMode === 'by_date'
                            ? 'bg-primary text-primary-foreground shadow-xs'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        📅 Por Data
                      </button>
                    </div>

                    {historyViewMode === 'by_folder' && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleExpandAllFolders}
                          className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                        >
                          Expandir Todas
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCollapseAllFolders}
                          className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                        >
                          Recolher Todas
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Pílulas de Pastas - EM FLEX-WRAP, SEM BARRA DE ROLAGEM, SEM ARRASTAR! */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => handleSelectHistoryCategory('Todas')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 border ${
                      historyCategoryFilter === 'Todas'
                        ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                        : 'bg-card hover:bg-accent text-muted-foreground hover:text-foreground border-border'
                    }`}
                  >
                    <span>📁 Todas</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-black/25 text-[10px]">
                      {history.length}
                    </span>
                  </button>

                  {historyCategoriesList
                    .filter(cat => {
                      if (!historyCategorySearch.trim()) return true;
                      return cat.toLowerCase().includes(historyCategorySearch.toLowerCase().trim());
                    })
                    .map(cat => {
                      const meta = getCategoryMeta(cat);
                      const isSelected = historyCategoryFilter === cat;
                      const count = historyCategoriesMap[cat] || 0;
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => handleSelectHistoryCategory(cat)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 border ${
                            isSelected
                              ? 'bg-accent font-bold text-foreground border-primary shadow-xs'
                              : 'bg-card text-muted-foreground hover:bg-accent/60 hover:text-foreground border-border'
                          }`}
                        >
                          <span>{meta.badge.split(' ')[0] || '📁'}</span>
                          <span>{meta.subcategory || cat}</span>
                          <span 
                            className="px-1.5 py-0.2 rounded-full text-[10px] font-bold border"
                            style={{
                              backgroundColor: `${meta.color}15`,
                              color: meta.color,
                              borderColor: `${meta.color}30`
                            }}
                          >
                            {count}
                          </span>
                        </button>
                      );
                    })}
                </div>
              </div>
            </div>

            {filteredHistory.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-xs">
                {history.length === 0 
                  ? 'Nenhum disparo registrado ainda. Selecione clientes na fila de espera acima e inicie o primeiro lote de mensagens.'
                  : 'Nenhum cliente acionado encontrado para os filtros selecionados.'}
              </div>
            ) : historyViewMode === 'by_folder' ? (
              /* MODO ORGANIZADO POR PASTAS (Acordeão de Pastas) */
              <div className="space-y-3">
                {Object.entries(groupedHistoryByFolder).map(([folderName, items]) => {
                  const meta = getCategoryMeta(folderName);
                  const isExpanded = expandedHistoryFolders[folderName] !== undefined
                    ? expandedHistoryFolders[folderName]
                    : (historyCategoryFilter === folderName);

                  return (
                    <div 
                      key={folderName} 
                      className="rounded-xl border border-border bg-card/60 overflow-hidden shadow-xs transition-all"
                    >
                      {/* Cabeçalho da Pasta com Toggle */}
                      <button
                        type="button"
                        onClick={() => toggleFolderExpand(folderName)}
                        className="w-full p-3.5 flex items-center justify-between hover:bg-accent/30 transition-colors text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-lg font-bold border shrink-0"
                            style={{ 
                              backgroundColor: `${meta.color}15`, 
                              borderColor: `${meta.color}35`,
                              color: meta.color 
                            }}
                          >
                            {meta.badge.split(' ')[0] || '📁'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-foreground">
                                Pasta: {meta.subcategory || folderName}
                              </span>
                              <Badge 
                                variant="outline" 
                                className="text-[10px] font-bold px-2 py-0.2"
                                style={{ 
                                  backgroundColor: `${meta.color}10`, 
                                  color: meta.color,
                                  borderColor: `${meta.color}30`
                                }}
                              >
                                {items.length} {items.length === 1 ? 'cliente' : 'clientes'} acionados
                              </Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {isExpanded 
                                ? 'Clique para recolher esta pasta' 
                                : 'Clique para ver os clientes desta pasta sem poluição na tela'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-muted-foreground">
                          <span className="text-[11px] font-medium hidden sm:inline">
                            {isExpanded ? 'Recolher pasta' : 'Abrir pasta'}
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-primary" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </div>
                      </button>

                      {/* Tabela Interna da Pasta (Visível se Expandida) */}
                      {isExpanded && (
                        <div className="border-t border-border/60 bg-background/50">
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left">
                              <thead className="text-[11px] uppercase bg-accent/40 text-muted-foreground border-b border-border">
                                <tr>
                                  <th className="px-4 py-2.5">Data / Horário</th>
                                  <th className="px-4 py-2.5">Cliente / Estabelecimento</th>
                                  <th className="px-4 py-2.5">WhatsApp</th>
                                  <th className="px-4 py-2.5">Mídia</th>
                                  <th className="px-4 py-2.5">Modelo Enviado</th>
                                  <th className="px-4 py-2.5">Status</th>
                                  <th className="px-4 py-2.5 text-right">Ação</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border/40">
                                {items.map((item, idx) => (
                                  <tr key={idx} className="hover:bg-accent/20 transition-colors">
                                    <td className="px-4 py-2.5 font-mono text-muted-foreground">
                                      <span className="font-semibold text-foreground block">{item.date}</span>
                                      <span className="text-[10px] text-muted-foreground">{item.time}</span>
                                    </td>
                                    <td className="px-4 py-2.5 font-bold text-foreground">
                                      {item.leadName}
                                    </td>
                                    <td className="px-4 py-2.5 text-emerald-400 font-medium">
                                      {formatBrazilianPhone(item.phone)}
                                    </td>
                                    <td className="px-4 py-2.5">
                                      {item.hasImage ? (
                                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-primary/20 text-primary font-bold">
                                          <ImageIcon className="w-3 h-3" /> Foto
                                        </span>
                                      ) : (
                                        <span className="text-muted-foreground text-[10px]">Texto</span>
                                      )}
                                    </td>
                                    <td className="px-4 py-2.5 text-muted-foreground truncate max-w-xs" title={item.templateName}>
                                      {item.templateName}
                                    </td>
                                    <td className="px-4 py-2.5">
                                      <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px] font-bold">
                                        ✓ Disparado
                                      </Badge>
                                    </td>
                                    <td className="px-4 py-2.5 text-right">
                                      <a 
                                        href={`https://wa.me/${toWhatsAppJidDigits(item.phone)}`} 
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1 text-primary hover:underline font-semibold text-[11px]"
                                      >
                                        Abrir Conversa <ExternalLink className="w-3 h-3" />
                                      </a>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          {/* Rodapé da Pasta com botão explícito de Recolher */}
                          <div className="p-2.5 bg-accent/20 border-t border-border/40 flex justify-between items-center text-xs">
                            <span className="text-muted-foreground text-[11px]">
                              Total de <strong>{items.length}</strong> {items.length === 1 ? 'cliente acionado' : 'clientes acionados'} nesta pasta
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleFolderExpand(folderName)}
                              className="h-7 px-2.5 text-[11px] text-muted-foreground hover:text-foreground gap-1 border border-border/40 hover:bg-accent/50"
                            >
                              <ChevronUp className="w-3.5 h-3.5 text-primary" /> Recolher pasta
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              /* MODO ALTERNATIVO: AGRUPADO POR DATA */
              Object.entries(groupedHistoryByDate).map(([dateLabel, items]) => (
                <div key={dateLabel} className="pt-4 first:pt-0 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                    <Calendar className="w-4 h-4 text-emerald-400" />
                    <span>{dateLabel}</span>
                    <span className="text-muted-foreground font-normal">({items.length} estabelecimentos acionados)</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="text-[11px] uppercase bg-accent/40 text-muted-foreground border-b border-border">
                        <tr>
                          <th className="px-4 py-2.5">Horário</th>
                          <th className="px-4 py-2.5">Cliente / Estabelecimento</th>
                          <th className="px-4 py-2.5">Pasta / Ramo</th>
                          <th className="px-4 py-2.5">WhatsApp</th>
                          <th className="px-4 py-2.5">Mídia</th>
                          <th className="px-4 py-2.5">Modelo Enviado</th>
                          <th className="px-4 py-2.5">Status</th>
                          <th className="px-4 py-2.5 text-right">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-accent/20 transition-colors">
                            <td className="px-4 py-2.5 font-mono text-muted-foreground">{item.time}</td>
                            <td className="px-4 py-2.5 font-bold text-foreground">{item.leadName}</td>
                            <td className="px-4 py-2.5">
                              <span className="px-2 py-0.5 rounded bg-accent text-foreground text-[10px] font-semibold border border-border">
                                {item.category}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-emerald-400 font-medium">{formatBrazilianPhone(item.phone)}</td>
                            <td className="px-4 py-2.5">
                              {item.hasImage ? (
                                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-primary/20 text-primary font-bold">
                                  <ImageIcon className="w-3 h-3" /> Foto
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-[10px]">Texto</span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-muted-foreground truncate max-w-xs">{item.templateName}</td>
                            <td className="px-4 py-2.5">
                              <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px] font-bold">
                                ✓ Disparado
                              </Badge>
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              <a 
                                href={`https://wa.me/${toWhatsAppJidDigits(item.phone)}`} 
                                target="_blank" 
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-primary hover:underline font-semibold text-[11px]"
                              >
                                Abrir Conversa <ExternalLink className="w-3 h-3" />
                              </a>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        )}
      </Card>

      {/* Modal de Importação do Google Maps */}
      <ImportMapsModal 
        isOpen={isImportMapsOpen} 
        onClose={() => {
          setIsImportMapsOpen(false);
          refetchLeads();
        }}
        onImport={() => {
          setIsImportMapsOpen(false);
          refetchLeads();
          toast.success('Leads importados do Google Maps com sucesso para a fila!');
        }}
      />

      {/* Modal de Prospecção Comercial Nacional (Estados / DDDs) */}
      {isNationalProspectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-lg rounded-xl border border-border shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-accent/20">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-base">
                  🇧🇷
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground">Prospecção Nacional por Estado & DDD</h3>
                  <p className="text-[11px] text-muted-foreground">Adicione clientes comerciais de qualquer estado do Brasil</p>
                </div>
              </div>
              <button 
                onClick={() => setIsNationalProspectModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-accent"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 space-y-4 text-xs">
              <div>
                <label className="font-semibold text-foreground block mb-1.5">
                  1. Selecione o Estado (UF):
                </label>
                <select
                  value={prospectUF}
                  onChange={(e) => setProspectUF(e.target.value)}
                  className="w-full h-10 px-3 rounded-md bg-background border border-input text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {BRAZIL_REGIONS.map(reg => (
                    <optgroup key={reg} label={`Região ${reg}`}>
                      {BRAZIL_STATES.filter(s => s.region === reg).map(s => (
                        <option key={s.uf} value={s.uf}>
                          {s.uf} - {s.name} (Capital: {s.capital} | DDDs: {s.ddds.join(', ')})
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              {/* State Info Card */}
              {(() => {
                const st = getStateByUF(prospectUF);
                if (!st) return null;
                return (
                  <div className="p-3 rounded-lg bg-accent/30 border border-border space-y-1.5 text-[11px]">
                    <div className="flex items-center justify-between font-semibold text-foreground">
                      <span>📍 {st.name} ({st.uf})</span>
                      <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">
                        Região {st.region}
                      </Badge>
                    </div>
                    <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                      <span><strong>Capital:</strong> {st.capital}</span>
                      <span><strong>DDDs Atendidos:</strong> {st.ddds.join(', ')}</span>
                      <span><strong>DDD Principal Gerado:</strong> ({st.ddds[0]}) 9xxxx-xxxx</span>
                    </div>
                  </div>
                );
              })()}

              <div>
                <label className="font-semibold text-foreground block mb-1.5">
                  2. Quantidade de Clientes Comerciais a Prospectar:
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[12, 24, 36, 48].map((qty) => (
                    <button
                      key={qty}
                      type="button"
                      onClick={() => setProspectCount(qty)}
                      className={`py-2 rounded-lg font-bold text-xs border transition-all ${
                        prospectCount === qty
                          ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                          : 'bg-accent/40 text-muted-foreground hover:text-foreground border-border hover:bg-accent'
                      }`}
                    >
                      +{qty} Clientes
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-400 space-y-1">
                <p className="font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Telefones móveis verificados com DDD {getStateByUF(prospectUF)?.ddds[0]}
                </p>
                <p className="text-muted-foreground text-[10px]">
                  Os clientes são distribuídos em ramos comerciais ativos (Padarias, Supermercados, Farmácias, Barbearias, Clínicas, etc.) com bairros nobres da capital e DDD regional.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-border bg-accent/10 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsNationalProspectModalOpen(false)}
                className="h-9 text-xs"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={() => handleGenerateNationalLeads(prospectUF, prospectCount)}
                className="h-9 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Adicionar +{prospectCount} Clientes de {prospectUF}
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* ========================================================================= */}
      {/* MODAL: CENTRAL DE LEADS QUENTES (RESPOSTAS EM TEMPO REAL) */}
      {/* ========================================================================= */}
      {isHotLeadsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-card w-full max-w-2xl rounded-2xl border border-border shadow-2xl overflow-hidden my-6">
            <div className="p-4 bg-accent/40 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">🔥</span>
                <div>
                  <h3 className="text-base font-bold text-foreground">Central de Leads Quentes (Respostas em Tempo Real)</h3>
                  <p className="text-xs text-muted-foreground">Clientes que responderam à prospecção fria do robô</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsHotLeadsModalOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="p-5 space-y-3 max-h-[65vh] overflow-y-auto">
              {hotLeads.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground space-y-2">
                  <span className="text-4xl block">📬</span>
                  <p className="text-sm font-semibold">Nenhuma resposta registrada ainda</p>
                  <p className="text-xs max-w-xs mx-auto">
                    Assim que um cliente responder ao disparo no WhatsApp, ele aparecerá aqui instantaneamente com alerta sonoro e notificação.
                  </p>
                </div>
              ) : (
                hotLeads.map((lead: any) => {
                  const rawPhone = (lead.phone || '').replace(/\D/g, '');
                  const waUrl = `https://wa.me/${rawPhone.length === 10 || rawPhone.length === 11 ? '55' + rawPhone : rawPhone}`;

                  return (
                    <div key={lead.id} className="p-3.5 rounded-xl bg-accent/25 border border-border hover:border-primary/40 transition-all space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground text-sm">{lead.leadName}</span>
                            {lead.isRejected ? (
                              <Badge className="text-[10px] bg-rose-500/20 text-rose-400 border-rose-500/30">
                                🚫 Desinteresse / Encerrado
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                                🔥 Lead Interessado
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            📱 {lead.phone} {lead.pushName ? `(${lead.pushName})` : ''} • Abordado por: <strong>{lead.templateName}</strong>
                          </p>
                        </div>

                        <Button
                          size="sm"
                          onClick={() => window.open(waUrl, '_blank')}
                          className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shrink-0"
                        >
                          <Smartphone className="w-3 h-3 mr-1" />
                          Abrir WhatsApp
                        </Button>
                      </div>

                      {/* Mensagem enviada pelo cliente */}
                      <div className={`p-2.5 rounded-lg bg-background border text-xs ${lead.isRejected ? 'border-rose-500/30 bg-rose-950/10' : 'border-border/80'}`}>
                        <span className={`text-[10px] font-bold uppercase tracking-wider block mb-0.5 ${lead.isRejected ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {lead.isRejected ? '🚫 Declínio / Sem Interesse (Robô Encerrado e Bloqueado):' : '💬 Mensagem do Cliente:'}
                        </span>
                        <p className="text-foreground italic">"{lead.text}"</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-3.5 border-t border-border flex items-center justify-between text-xs text-muted-foreground bg-accent/30">
              <span>{hotLeads.length} resposta{hotLeads.length === 1 ? '' : 's'} catalogada{hotLeads.length === 1 ? '' : 's'}</span>
              <Button variant="outline" size="sm" onClick={() => setIsHotLeadsModalOpen(false)} className="text-xs h-7">
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: TESTE A/B DE MODELOS DE MENSAGEM */}
      {/* ========================================================================= */}
      {isAbModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-card w-full max-w-2xl rounded-2xl border border-border shadow-2xl overflow-hidden my-6">
            <div className="p-4 bg-accent/40 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">📊</span>
                <div>
                  <h3 className="text-base font-bold text-foreground">Desempenho dos Modelos (Teste A/B em Tempo Real)</h3>
                  <p className="text-xs text-muted-foreground">Descubra qual modelo de mensagem gera mais respostas e clientes</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsAbModalOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto">
              <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-accent/20 border border-border text-center">
                <div>
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Total Disparados</span>
                  <p className="text-lg font-black text-foreground">{abAnalytics.totalDispatched}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Total Respostas</span>
                  <p className="text-lg font-black text-emerald-400">{abAnalytics.totalReplied}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Conversão Média</span>
                  <p className="text-lg font-black text-primary">{abAnalytics.globalRate}%</p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Comparativo por Modelo de Mensagem:
                </h4>

                {abAnalytics.templates.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">
                    Inicie disparos com diferentes modelos para visualizar o ranking de conversão em tempo real.
                  </p>
                ) : (
                  abAnalytics.templates.map((tpl: any, idx: number) => {
                    return (
                      <div key={idx} className="p-3.5 rounded-xl bg-accent/15 border border-border space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {tpl.isChampion && (
                              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px] font-bold py-0">
                                👑 Campeão de Respostas
                              </Badge>
                            )}
                            <span className="text-xs font-bold text-foreground">{tpl.templateName}</span>
                          </div>
                          <span className="text-sm font-black text-emerald-400 font-mono">
                            {tpl.conversionRate}%
                          </span>
                        </div>

                        {/* Barra de Progresso Visual */}
                        <div className="w-full h-2 rounded-full bg-background border border-border overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.max(tpl.conversionRate, 4))}%` }}
                          />
                        </div>

                        <div className="flex justify-between text-[11px] text-muted-foreground">
                          <span>{tpl.dispatched} mensagens enviadas</span>
                          <span className="font-semibold text-foreground">{tpl.replied} cliente{tpl.replied === 1 ? '' : 's'} responderam</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="p-3.5 border-t border-border flex justify-end bg-accent/30">
              <Button variant="outline" size="sm" onClick={() => setIsAbModalOpen(false)} className="text-xs h-7">
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: PRÉ-VENDEDOR SDR INTELIGENTE DE CUSTO ZERO (MULTI-NICHO) */}
      {/* ========================================================================= */}
      {isSdrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-card w-full max-w-2xl rounded-2xl border border-border shadow-2xl overflow-hidden my-6">
            <div className="p-4 bg-accent/40 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">🤖</span>
                <div>
                  <h3 className="text-base font-bold text-foreground">Pré-Vendedor SDR Inteligente (Custo Zero)</h3>
                  <p className="text-xs text-muted-foreground">Atendimento automático 100% gratuito sem APIs pagas — universal para qualquer nicho</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsSdrModalOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto">
              {/* Toggle de Ativação */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-accent/20 border border-border">
                <div>
                  <p className="text-xs font-bold text-foreground">Status do Pré-Vendedor Automático</p>
                  <p className="text-[11px] text-muted-foreground">
                    Quando ativado, responde dúvidas comuns (preço, interesse, detalhes) instantaneamente
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={sdrConfig.enabled ? 'default' : 'outline'}
                  onClick={() => setSdrConfig((prev: any) => ({ ...prev, enabled: !prev.enabled }))}
                  className="h-8 text-xs font-bold"
                >
                  {sdrConfig.enabled ? '🟢 Ativado' : '⏸️ Pausado'}
                </Button>
              </div>

              {/* Informações da Empresa */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Nome da Empresa</label>
                  <Input
                    value={sdrConfig.businessName || ''}
                    onChange={(e) => setSdrConfig((prev: any) => ({ ...prev, businessName: e.target.value }))}
                    placeholder="Ex: WCTech"
                    className="mt-1 h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Nicho de Atuação</label>
                  <Input
                    value={sdrConfig.businessNiche || ''}
                    onChange={(e) => setSdrConfig((prev: any) => ({ ...prev, businessNiche: e.target.value }))}
                    placeholder="Ex: Criação de Sites, Sistemas e Automação"
                    className="mt-1 h-8 text-xs"
                  />
                </div>
              </div>

              {/* Respostas por Intenção Universal */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Respostas Automáticas por Intenção (Universal para Qualquer Negócio):
                </h4>

                {/* 1. Preço / Orçamento */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    💰 Quando o cliente perguntar Preço / Orçamento ("quanto custa", "valor", "tabela")
                  </label>
                  <textarea
                    rows={2}
                    value={sdrConfig.intentResponses?.price || ''}
                    onChange={(e) => setSdrConfig((prev: any) => ({
                      ...prev,
                      intentResponses: { ...prev.intentResponses, price: e.target.value }
                    }))}
                    className="w-full text-xs p-2.5 rounded-lg bg-background border border-border font-sans resize-none"
                  />
                </div>

                {/* 2. Interesse Positivo */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    👍 Quando o cliente demonstrar Interesse Positivo ("sim", "tenho interesse", "pode mandar")
                  </label>
                  <textarea
                    rows={2}
                    value={sdrConfig.intentResponses?.interested || ''}
                    onChange={(e) => setSdrConfig((prev: any) => ({
                      ...prev,
                      intentResponses: { ...prev.intentResponses, interested: e.target.value }
                    }))}
                    className="w-full text-xs p-2.5 rounded-lg bg-background border border-border font-sans resize-none"
                  />
                </div>

                {/* 3. Mais Informações */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    ℹ️ Quando o cliente pedir Detalhes ("como funciona", "me explica", "catálogo")
                  </label>
                  <textarea
                    rows={2}
                    value={sdrConfig.intentResponses?.moreInfo || ''}
                    onChange={(e) => setSdrConfig((prev: any) => ({
                      ...prev,
                      intentResponses: { ...prev.intentResponses, moreInfo: e.target.value }
                    }))}
                    className="w-full text-xs p-2.5 rounded-lg bg-background border border-border font-sans resize-none"
                  />
                </div>

                {/* 4. Falar com Atendente Humano */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    👤 Quando o cliente pedir Atendente Humano ("falar com atendente", "humano", "ligar")
                  </label>
                  <textarea
                    rows={2}
                    value={sdrConfig.intentResponses?.human || ''}
                    onChange={(e) => setSdrConfig((prev: any) => ({
                      ...prev,
                      intentResponses: { ...prev.intentResponses, human: e.target.value }
                    }))}
                    className="w-full text-xs p-2.5 rounded-lg bg-background border border-border font-sans resize-none"
                  />
                </div>

                {/* 5. Reconhecimento de Desinteresse / Recusa (Fast Exit) */}
                <div className="space-y-1 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                      🚫 Quando o cliente declinar ou não tiver interesse ("não tenho interesse", "já temos", "obrigado não")
                    </label>
                    <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/40 text-[10px] py-0">
                      ⚡ Encerramento Imediato
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Ao detectar desinteresse, o robô responde com máxima educação, silencia o chat na hora, cancela qualquer automação e protege o contato contra reenvios futuros.
                  </p>
                  <textarea
                    rows={2}
                    value={sdrConfig.intentResponses?.notInterested || ''}
                    onChange={(e) => setSdrConfig((prev: any) => ({
                      ...prev,
                      intentResponses: { ...prev.intentResponses, notInterested: e.target.value }
                    }))}
                    placeholder="{Compreendo perfeitamente|Entendido}! Muito obrigado pela atenção e desejamos muito sucesso para você e sua empresa! 🙏"
                    className="w-full text-xs p-2.5 rounded-lg bg-background border border-border font-sans resize-none mt-1"
                  />
                </div>
              </div>
            </div>

            <div className="p-3.5 border-t border-border flex items-center justify-between bg-accent/30">
              <span className="text-[11px] text-muted-foreground">
                Zero custos de API externa • Roda 100% no servidor local
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsSdrModalOpen(false)} className="text-xs h-8">
                  Cancelar
                </Button>
                <Button 
                  size="sm" 
                  onClick={() => handleSaveSdrConfig(sdrConfig)}
                  disabled={isSavingSdr}
                  className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                >
                  {isSavingSdr ? 'Salvando...' : 'Salvar Configurações'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isAntiBanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div role="dialog" aria-modal="true" aria-label="Regras de envio" className="max-w-xl rounded-xl border bg-card p-6 space-y-4">
            <h3 className="font-bold">Regras de envio responsável</h3>
            <p className="text-sm">Envie apenas conteúdo esperado por quem autorizou o contato. Registre a origem e a prova do consentimento, identifique sua empresa e respeite imediatamente pedidos de saída.</p>
            <p className="text-sm">O indicador “digitando” melhora a experiência de conversa. Ele não comprova que há uma pessoa escrevendo e não protege contra bloqueios. Variações de texto e intervalos também não garantem proteção.</p>
            <p className="text-sm">A conexão atual usa Baileys. Contatos proativos exigem consentimento registrado e ausência de descadastro. O atendimento exige uma mensagem recebida do contato nas últimas 24 horas.</p>
            <a className="text-sm text-primary underline" href="https://business.whatsapp.com/policy" target="_blank" rel="noreferrer">Consultar a política oficial do WhatsApp</a>
            <Button onClick={() => setIsAntiBanModalOpen(false)}>Fechar</Button>
          </div>
        </div>
      )}

    </div>
  );
}
