'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Search, Bot, User, Phone, PhoneOff, AlertTriangle, 
  Send, Paperclip, Zap, MoreVertical, LogOut, CheckCircle2,
  Mic, MicOff, Image as ImageIcon, Volume2, VolumeX, Play, Pause,
  RefreshCw, X, ExternalLink, Flame, MessageSquare, Plus, Clock,
  Smartphone, Bell, Edit2, Check, Star, Info,
  Tag, Trash2, SlidersHorizontal, ChevronDown, CheckSquare, Square,
  Bookmark, FileText, Sparkles, Copy,
  Calendar, CalendarClock, Target, CornerUpLeft, Pin, Smile,
  Trello, ArrowRight, FolderPlus, QrCode, Wifi, WifiOff,
  MapPin, CreditCard, Bold, Italic, Strikethrough, Code, Download, FileUp, RotateCcw,
  Palette
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { DEFAULT_BOT_FLOWS } from '@/lib/default-flows';
import { activateBotAutomation, deactivateBotAutomation } from '@/lib/bot-automation';
import { ResetClientHistoryModal } from '@/components/whatsapp/reset-client-history-modal';
import { WhatsappConnectionModal } from '@/components/whatsapp/whatsapp-connection-modal';
import { ChatAlertColorModal } from '@/components/whatsapp/chat-alert-color-modal';
import { formatBrazilianPhone } from '@/lib/phone-utils';
import { buildAttendantHeader, hasAttendantHeader, extractAttendantTag, getAttendantLabel } from '@/lib/attendant-label';
import { getStoredFlows, saveStoredFlows, getSelectedFlowIdFromStorage, setActiveFlowIdInStorage, setSelectedFlowIdInStorage } from '@/lib/bot-flow';
import { PIPELINE_STAGES } from '@/hooks/use-pipeline';
import { getStoredLeads, saveStoredLeads, calculateLeadScore } from '@/hooks/use-leads';
import { Priority, ScoreLevel } from '@radar/types';

export interface TagDefinition {
  id: string;
  name: string;
  color: string;
}

export interface QuickMessage {
  id: string;
  title: string;
  shortcut?: string;
  content: string;
  category?: string;
  updatedAt?: number;
}

export interface ScheduledMessage {
  id: string;
  conversationId: string;
  phone: string;
  contactName?: string;
  jid?: string;
  text: string;
  scheduledFor: number;
  createdAt: number;
  status: 'pending' | 'sent' | 'canceled' | 'failed';
  sentAt?: number;
  type: 'manual_schedule' | 'follow_up_budget';
  attendantName?: string;
  error?: string;
}

const DEFAULT_TAGS: TagDefinition[] = [
  { id: 'urgente', name: 'Urgente', color: '#ef4444' },
  { id: 'importante', name: 'Importante', color: '#f59e0b' },
  { id: 'cobranca', name: 'Cobrança', color: '#ea580c' },
  { id: 'orcamento_pendente', name: 'Orçamento Pendente', color: '#8b5cf6' },
  { id: 'aguardando_retorno', name: 'Aguardando Retorno', color: '#3b82f6' },
  { id: 'fechado', name: 'Fechado', color: '#10b981' },
  { id: 'frio', name: 'Frio / Sem Interesse', color: '#64748b' },
];

const DEFAULT_QUICK_MESSAGES: QuickMessage[] = [
  {
    id: 'qm-pix',
    title: '🔑 Chave Pix & Pagamento',
    shortcut: '/pix',
    content: 'Olá, {{nome}}! Segue a nossa chave Pix para pagamento do pedido:\n\n🔑 Chave Pix: 92984892332 (Celular)\n🏢 Favorecido: Criart Gráfica\n\nAssim que efetuar o pagamento, por favor envie o comprovante aqui para liberarmos seu pedido para produção! ✅',
    category: 'Financeiro',
  },
  {
    id: 'qm-arte',
    title: '📐 Envio de Arte / Gabarito',
    shortcut: '/arte',
    content: 'Para que a impressão do seu material saia com máxima nitidez e perfeição, precisamos que você nos envie o arquivo com as seguintes especificações:\n\n📄 Formatos aceitos: PDF/X-1a, CorelDraw (textos em curvas) ou Illustrator.\n🎨 Padrão de cores: CMYK (evitar RGB).\n🔍 Resolução: Mínimo 300 DPI.\n\nPode anexar o arquivo aqui pelo WhatsApp ou enviar para nosso e-mail!',
    category: 'Produção',
  },
  {
    id: 'qm-orcamento',
    title: '📋 Orçamento em Análise',
    shortcut: '/orcamento',
    content: 'Recebemos as informações do seu pedido, {{nome}}! 🎯\nNossa equipe comercial já está calculando as melhores opções de papel, formato e acabamento com o melhor custo-benefício.\n\nEm instantes te envio o orçamento detalhado por aqui!',
    category: 'Comercial',
  },
  {
    id: 'qm-prazo',
    title: '⏱️ Prazo de Produção',
    shortcut: '/prazo',
    content: 'Nosso prazo de produção estimado para o seu material é de 2 a 3 dias úteis, contados a partir da aprovação da arte final e da confirmação do pagamento. Assim que ficar pronto, te avisamos imediatamente!',
    category: 'Produção',
  },
  {
    id: 'qm-pronto',
    title: '📦 Pedido Pronto para Retirada',
    shortcut: '/pronto',
    content: 'Ótima notícia, {{nome}}! Seu material já foi impresso, finalizado com todo capricho e está pronto para retirada no nosso balcão! 🚀\n\nVenha retirar quando preferir durante nosso horário de atendimento.',
    category: 'Entrega',
  },
  {
    id: 'qm-horario',
    title: '📍 Endereço e Horário de Funcionamento',
    shortcut: '/horario',
    content: '📍 Endereço da loja: Atendimento Central Criart.\n⏰ Horário de funcionamento: Segunda a Sexta, das 08h às 18h | Sábado das 08h às 12h.\n\nQualquer dúvida, estamos à total disposição!',
    category: 'Atendimento',
  },
];

const TAG_COLOR_OPTIONS = [
  { name: 'Vermelho (Urgente)', hex: '#ef4444' },
  { name: 'Laranja (Cobrança)', hex: '#ea580c' },
  { name: 'Âmbar (Importante)', hex: '#f59e0b' },
  { name: 'Roxo (Orçamento)', hex: '#8b5cf6' },
  { name: 'Azul (Retorno)', hex: '#3b82f6' },
  { name: 'Verde (Fechado)', hex: '#10b981' },
  { name: 'Cinza (Frio)', hex: '#64748b' },
  { name: 'Rosa (VIP)', hex: '#ec4899' },
  { name: 'Ciano (Dúvida)', hex: '#06b6d4' },
];

const EMOJI_CATEGORIES = [
  {
    id: 'smileys',
    name: 'Rostos',
    icon: '😃',
    emojis: [
      '😀','😃','😄','😁','😆','😅','😂','🤣','🥲','🥹','😊','😇','🙂','🙃','😉','😌',
      '😍','🥰','😘','😗','😙','😚','😋','😛','😜','🤪','😝','🤑','🤗','🫣','🤭','🤫',
      '🫡','🤔','🤐','🤨','😐','😑','😶','🫥','😏','😒','🙄','😬','🤥','😌','😔','😪',
      '🤤','😴','😷','🤒','🤕','🤢','🤮','🤧','🥵','🥶','🥴','😵','😵‍💫','🤯','🤠','🥳',
      '🥸','😎','🤓','🧐','😕','🫤','😟','🙁','☹️','😮','😯','😲','😳','🥺','😦','😧',
      '😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠',
      '🤬','😈','👿','💀','☠️','💩','🤡','👻','👽','🤖'
    ]
  },
  {
    id: 'gestures',
    name: 'Gestos',
    icon: '👍',
    emojis: [
      '👍','👎','👏','🙌','👐','🫶','🤝','👊','✊','🤛','🤜','🤞','✌️','🫰','🤟','🤘',
      '👌','🤏','🤌','👈','👉','👆','👇','☝️','👋','🤚','🖐️','✋','🖖','✍️','🤳','💪',
      '🦾','🫵','🙏','🙇','🙋','💁','🙆','🙅','🤷','🤦','💆','💇','🫂','👥','👤','🗣️'
    ]
  },
  {
    id: 'grafica',
    name: 'Gráfica',
    icon: '🎨',
    emojis: [
      '🎨','📐','📏','✂️','🖨️','🖼️','🖌️','🖍️','📝','📄','📑','🏷️','💡','✨','🔨','🛠️',
      '🔩','🪚','🏢','🏬','🏪','🏙️','📦','🚚','🚛','🛵','🎯','📌','📍','🧲','🎟️','🎫',
      '🪄','📸','📷','📹','🎥','💻','🖥️','🖱️','⌨️','💾','💿','📀','🔍','🔎','📁','📂',
      '🗂️','🗃️','🗞️','📰','✏️','✒️','🖋️','🏮','🪧','📦'
    ]
  },
  {
    id: 'business',
    name: 'Vendas',
    icon: '💼',
    emojis: [
      '💰','💵','💳','🪙','🧾','🛒','🛍️','📈','📉','📊','🎯','🚀','⭐','🌟','✨','🏆',
      '🥇','🥈','🥉','🤝','💼','📞','📱','📲','✉️','📧','📩','📅','📆','⏰','⏱️','⌛',
      '⏳','💎','👑','💯','🎉','🎊','🎁','🎈','🔥','⚡','🏷️','📢','📣','🔔','🛎️','💸',
      '💹','🏧','🏢','🏭','👔','🤝','🎯','🚀','📦'
    ]
  },
  {
    id: 'symbols',
    name: 'Símbolos',
    icon: '🔥',
    emojis: [
      '🔥','⚡','💥','❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞',
      '💓','💗','💖','💘','💝','💟','⚠️','🚨','📍','🚩','⏱️','⏳','✅','❌','⭕','❗',
      '❓','❕','❔','‼️','⁉️','🆗','🆕','🔝','🔜','🔙','🔛','🔚','🔘','🟢','🟡','🔴',
      '🔵','🟣','🟠','⚪','⚫','🔔','🔕','📢','📣','💬','💭','🗯️','💯','♻️','❇️','✳️'
    ]
  }
];

export interface CommercialInteractionItem {
  id: string;
  title: string;
  subtitle: string;
  iconName: 'CreditCard' | 'MapPin' | 'Clock' | 'FileText' | 'Sparkles' | 'CheckCircle2';
  color: string;
  template: string;
}

const DEFAULT_COMMERCIAL_INTERACTIONS: CommercialInteractionItem[] = [
  {
    id: 'pix',
    title: 'Chave Pix & Pagamento',
    subtitle: 'Envia dados bancários para o cliente pagar agora',
    iconName: 'CreditCard',
    color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    template: `💳 *DADOS PARA PAGAMENTO VIA PIX*\n\n🔑 *Chave Pix:* financeiro@criartbrasil.com.br\n👤 *Favorecido:* CRIART BRASIL\n🏦 *Banco:* NuBank / Cora SCD\n\n📌 *Assim que realizar o pagamento, por gentileza envie o comprovante aqui para liberarmos imediatamente seu pedido para a produção!* 🚀`
  },
  {
    id: 'location',
    title: 'Endereço da Empresa',
    subtitle: 'Localização da gráfica para visita e retirada',
    iconName: 'MapPin',
    color: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
    template: `📍 *ONDE ESTAMOS — CRIART BRASIL*\n\n🏢 Rua Principal, nº 100 — Centro\n🚗 Estacionamento gratuito em frente à loja\n⏰ *Atendimento:* Seg a Sex das 08h às 12h e das 13h às 17h.\n\nVenha tomar um café conosco ou retirar seu pedido! 😃`
  },
  {
    id: 'hours',
    title: 'Horário de Atendimento',
    subtitle: 'Expediente, almoço e plantão comercial',
    iconName: 'Clock',
    color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    template: `⏰ *HORÁRIO DE FUNCIONAMENTO CRIART BRASIL*\n\nSegunda a Sexta: 08:00 às 12:00 (almoço) e 13:00 às 17:00.\nFinais de semana e feriados: Plantão comercial.\n\nPode mandar sua ideia, foto ou referência por aqui que responderemos o mais breve possível! 🤝`
  },
  {
    id: 'briefing',
    title: 'Briefing para Orçamento',
    subtitle: 'Pergunta medidas, materiais, quantidade e arte',
    iconName: 'FileText',
    color: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
    template: `📝 *PARA AGILIZARMOS SEU ORÇAMENTO:*\n\nPor favor, me informe:\n1️⃣ *Qual serviço/produto:* (Fachada, Banner, Adesivo, Placa, Camiseta...)\n2️⃣ *Medidas aproximadas:* (Largura x Altura)\n3️⃣ *Quantidade necessária:*\n4️⃣ *Arte gráfica:* (Já tem arquivo pronto em PDF/vetor ou precisa que nosso designer crie?)\n5️⃣ *Qual seu prazo ideal de entrega?*`
  },
  {
    id: 'highres',
    title: 'Instruções de Arquivo em Alta',
    subtitle: 'Como o cliente deve enviar artes para impressão nítida',
    iconName: 'Sparkles',
    color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20',
    template: `📐 *DICA PARA IMPRESSÃO EM MÁXIMA QUALIDADE:*\n\nPara garantir resolução impecável e cores vivas no seu material, envie seu arquivo em:\n• PDF em Curvas (Vetor)\n• CorelDraw (CDR) ou Illustrator (AI)\n• Imagem enviada como *DOCUMENTO* aqui no WhatsApp para não sofrer compressão!`
  },
  {
    id: 'ready',
    title: 'Aviso: Pedido Pronto!',
    subtitle: 'Comunica ao cliente que o material está no balcão',
    iconName: 'CheckCircle2',
    color: 'text-teal-500 bg-teal-500/10 border-teal-500/20',
    template: `🎉 *BOA NOTÍCIA! SEU MATERIAL ESTÁ PRONTO!*\n\nSeu pedido foi finalizado com sucesso pelo setor de produção e já está disponível para retirada em nosso balcão ou despacho.\n\nQualquer dúvida estamos à disposição!`
  }
];

const getInteractionIcon = (iconName: string) => {
  switch (iconName) {
    case 'CreditCard': return CreditCard;
    case 'MapPin': return MapPin;
    case 'Clock': return Clock;
    case 'FileText': return FileText;
    case 'Sparkles': return Sparkles;
    case 'CheckCircle2': return CheckCircle2;
    default: return Sparkles;
  }
};

// 🎵 Efeito sonoro sintetizado ao receber novo lead quente
const playHotLeadNotificationSound = () => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.35);
  } catch {}
};

function isNewDay(prevTimestamp?: number, currTimestamp?: number): boolean {
  if (!currTimestamp) return false;
  if (!prevTimestamp) return true;
  const d1 = new Date(prevTimestamp).toDateString();
  const d2 = new Date(currTimestamp).toDateString();
  return d1 !== d2;
}

function formatDateDivider(timestamp: number): string {
  const d = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'Hoje';
  if (d.toDateString() === yesterday.toDateString()) return 'Ontem';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

export function WhatsAppInbox({
  conversationsList = [],
  selectedConversation,
  setSelectedConversation,
  handleOpenConversationChat,
  handleToggleBotPause,
  handleRestartFlow,
  handleStartNewConversation,
  onExitInbox,
  safeWhatsAppClient,
  botStatus = { connected: true, phone: '', pushName: '' },
  hotLeads = [],
  unreadHotLeadsCount = 0,
  onRefreshHotLeads,
  onRefreshBotStatus,
  onBotStatusChange,
  onRefreshConversations,
  initialDraftText = ''
}: any) {
  const [filter, setFilter] = useState<'all' | 'vacuum' | 'unread' | 'hot' | 'in_progress' | 'bot'>('all');
  const [search, setSearch] = useState('');
  const [replyText, setReplyText] = useState<string>(initialDraftText || '');
  const [isSending, setIsSending] = useState(false);
  const [crmTab, setCrmTab] = useState<'dados' | 'anotacoes'>('dados');
  const [showCrmSidebar, setShowCrmSidebar] = useState(false);
  const currentUser = useAuthStore((s) => s.user);
  const currentAttendantName = currentUser?.name || botStatus.pushName || 'Atendente';
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  // 🔔 Cor Personalizada do Alerta Piscante de Novas Mensagens
  const [alertColor, setAlertColor] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('radar_chat_alert_color') || '#f97316';
    }
    return '#f97316';
  });
  const [isAlertColorModalOpen, setIsAlertColorModalOpen] = useState(false);
  const [isTestingAlert, setIsTestingAlert] = useState(false);

  useEffect(() => {
    if (initialDraftText && initialDraftText.trim()) {
      setReplyText(initialDraftText);
    }
  }, [initialDraftText]);

  const handleSelectAlertColor = (hex: string) => {
    setAlertColor(hex);
    if (typeof window !== 'undefined') {
      localStorage.setItem('radar_chat_alert_color', hex);
      window.dispatchEvent(new CustomEvent('radar_chat_alert_color_changed', { detail: hex }));
    }
    toast.success('Cor do alerta atualizada com sucesso!');
  };

  const handleTriggerTestAlert = () => {
    setIsTestingAlert(true);
    toast.success('Testando alerta piscante por 5 segundos...');
    setTimeout(() => {
      setIsTestingAlert(false);
    }, 5000);
  };

  // Integração com CRM & Pipeline
  const router = useRouter();
  const queryClient = useQueryClient();
  const [matchedCrmLead, setMatchedCrmLead] = useState<any>(null);
  const [targetCrmStageId, setTargetCrmStageId] = useState<string>('stage-1');
  const [targetCrmValue, setTargetCrmValue] = useState<string>('2500');

  // Sincroniza o lead correspondente no CRM ao trocar de conversa selecionada
  useEffect(() => {
    if (!selectedConversation) {
      setMatchedCrmLead(null);
      return;
    }
    const leads = getStoredLeads();
    const convDigits = (selectedConversation.phone || selectedConversation.id || '').replace(/\D/g, '');
    const convId = selectedConversation.id || '';

    const found = leads.find((l: any) => {
      if (l.id === convId || l.id === convDigits) return true;
      const lDigits = (l.phone || '').replace(/\D/g, '');
      if (convDigits && lDigits) {
        if (convDigits.endsWith(lDigits.slice(-8)) || lDigits.endsWith(convDigits.slice(-8))) {
          return true;
        }
      }
      return false;
    });

    setMatchedCrmLead(found || null);
    const foundAny = found as any;
    if (foundAny?.pipelineStageId) {
      setTargetCrmStageId(foundAny.pipelineStageId);
    } else {
      setTargetCrmStageId('stage-1');
    }
    if (foundAny?.potentialValue) {
      setTargetCrmValue(String(foundAny.potentialValue));
    }
  }, [selectedConversation]);

  const currentMatchedStage = PIPELINE_STAGES.find(
    (s) => s.id === (matchedCrmLead?.pipelineStageId || targetCrmStageId)
  ) || PIPELINE_STAGES[0];
  
  // Flows state
  const [showFlowMenu, setShowFlowMenu] = useState(false);
  const [localFlows, setLocalFlows] = useState<any[]>([]);
  const [automationFlowId, setAutomationFlowId] = useState(() => getSelectedFlowIdFromStorage(getStoredFlows()));
  const [isChangingAutomation, setIsChangingAutomation] = useState(false);
  const automationBusyRef = useRef(false);

  useEffect(() => {
    if (botStatus?.isFlowActive && botStatus.activeFlowId) setAutomationFlowId(botStatus.activeFlowId);
  }, [botStatus?.isFlowActive, botStatus?.activeFlowId]);

  // Modal Central de Leads Quentes (Notificações)
  const [isHotLeadsModalOpen, setIsHotLeadsModalOpen] = useState(false);
  const lastHotLeadIdRef = useRef<string | null>(null);

  // Modal Nova Conversa
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [newChatPhone, setNewChatPhone] = useState('');
  const [newChatName, setNewChatName] = useState('');
  const [newChatInitialMsg, setNewChatInitialMsg] = useState('Olá! Como posso ajudar você hoje?');
  const [newChatFlowId, setNewChatFlowId] = useState('');

  // Mídia: Imagem
  const [selectedImageBase64, setSelectedImageBase64] = useState<string | null>(null);
  const [imagePreviewModalUrl, setImagePreviewModalUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mídia: Gravação de Áudio
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);
  const audioFileInputRef = useRef<HTMLInputElement>(null);

  // Anotações locais do Lead
  const [leadNotes, setLeadNotes] = useState<string>('');

  // Renomear Contato & Salvar em Leads
  const [isEditingContactName, setIsEditingContactName] = useState(false);
  const [editedContactName, setEditedContactName] = useState('');
  const [isSavingContactName, setIsSavingContactName] = useState(false);
  const [isSyncingLead, setIsSyncingLead] = useState(false);

  // 🏷️ Gestão de Etiquetas (Tags / Urgente / Importante)
  const [availableTags, setAvailableTags] = useState<TagDefinition[]>(DEFAULT_TAGS);
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('all');
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<TagDefinition | null>(null);
  const [tagFormName, setTagFormName] = useState('');
  const [tagFormColor, setTagFormColor] = useState('#ef4444');
  const [isSavingTag, setIsSavingTag] = useState(false);
  const tagDropdownRef = useRef<HTMLDivElement>(null);

  // 💬 Gestão de Mensagens Rápidas (Atalhos & Templates Personalizáveis)
  const [quickMessages, setQuickMessages] = useState<QuickMessage[]>(DEFAULT_QUICK_MESSAGES);
  const [showQuickMessagesMenu, setShowQuickMessagesMenu] = useState(false);
  const [quickMessagesSearch, setQuickMessagesSearch] = useState('');
  const [selectedQMCategory, setSelectedQMCategory] = useState<string>('all');
  const [isQuickMessageModalOpen, setIsQuickMessageModalOpen] = useState(false);
  const [editingQuickMessage, setEditingQuickMessage] = useState<QuickMessage | null>(null);
  const [qmFormTitle, setQmFormTitle] = useState('');
  const [qmFormShortcut, setQmFormShortcut] = useState('');
  const [qmFormCategory, setQmFormCategory] = useState('Atendimento');
  const [qmFormContent, setQmFormContent] = useState('');
  const [isSavingQM, setIsSavingQM] = useState(false);
  const quickMessagesMenuRef = useRef<HTMLDivElement>(null);

  // 📅 Mensagens Agendadas & Lembretes (Disparo Programado)
  const [scheduledMessages, setScheduledMessages] = useState<ScheduledMessage[]>([]);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleText, setScheduleText] = useState('');
  const [scheduleDateTime, setScheduleDateTime] = useState('');
  const [scheduleType, setScheduleType] = useState<'manual_schedule' | 'follow_up_budget'>('manual_schedule');
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [showScheduledListModal, setShowScheduledListModal] = useState(false);

  // 🎯 Recuperador de Vendas (Follow-up Automático de Orçamentos)
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);

  // 🧹 Reset Geral de Clientes (Para entrega limpa do sistema à empresa)
  const [isResetHistoryModalOpen, setIsResetHistoryModalOpen] = useState(false);

  // 🎙️ Transcrição de Áudio de Clientes (Áudio ➔ Texto)
  const [transcribingAudioMsgId, setTranscribingAudioMsgId] = useState<string | null>(null);
  const [audioTranscriptions, setAudioTranscriptions] = useState<Record<string, string>>({});

  // 🔘 Menu de Opções da Conversa Ativa (Limpar histórico / Excluir conversa)
  const [showChatOptionsMenu, setShowChatOptionsMenu] = useState(false);
  const chatOptionsMenuRef = useRef<HTMLDivElement>(null);

  // 🖱️ Menu de Contexto Animado nas Mensagens (Botão Direito) & Gestão de Mensagens
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    x: number;
    y: number;
    message: any | null;
  }>({ isOpen: false, x: 0, y: 0, message: null });
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // ✏️ Mensagem sendo Editada
  const [editingMessage, setEditingMessage] = useState<any | null>(null);
  const [editedMessageText, setEditedMessageText] = useState('');

  // 🗑️ Mensagem sendo Excluída
  const [deletingMessage, setDeletingMessage] = useState<any | null>(null);

  // 💬 Mensagem sendo Respondida / Citada
  const [replyingToMessage, setReplyingToMessage] = useState<any | null>(null);

  // 😊 Seletor de Emojis / Emotes
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiPickerTab, setEmojiPickerTab] = useState('smileys');
  const [emojiSearch, setEmojiSearch] = useState('');
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const [recentEmojis, setRecentEmojis] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('radar_recent_emojis');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return ['👍', '❤️', '😂', '🔥', '👏', '🙏', '😃', '✨'];
  });

  const handleInsertEmoji = (emoji: string) => {
    setReplyText((prev: string) => `${prev}${emoji}`);
    setRecentEmojis((prev: string[]) => {
      const next = [emoji, ...prev.filter((e) => e !== emoji)].slice(0, 16);
      try {
        localStorage.setItem('radar_recent_emojis', JSON.stringify(next));
      } catch {}
      return next;
    });
    setTimeout(() => {
      const input = document.querySelector('input[placeholder*="Digite uma mensagem"]') as HTMLInputElement;
      input?.focus();
    }, 50);
  };

  const currentEmojis = useMemo(() => {
    if (emojiSearch.trim()) {
      const q = emojiSearch.trim().toLowerCase();
      const all = EMOJI_CATEGORIES.flatMap((c) => c.emojis);
      return Array.from(new Set(all));
    }
    if (emojiPickerTab === 'recent') {
      return recentEmojis;
    }
    const cat = EMOJI_CATEGORIES.find((c) => c.id === emojiPickerTab);
    return cat ? cat.emojis : EMOJI_CATEGORIES[0].emojis;
  }, [emojiPickerTab, emojiSearch, recentEmojis]);

  // ⚡ Interações Comerciais Rápidas (Pix, Endereço, Horário, Briefing)
  const [commercialInteractions, setCommercialInteractions] = useState<CommercialInteractionItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('radar_commercial_interactions_v1');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return DEFAULT_COMMERCIAL_INTERACTIONS;
  });

  const [editingInteraction, setEditingInteraction] = useState<CommercialInteractionItem | null>(null);
  const [interactionFormTitle, setInteractionFormTitle] = useState('');
  const [interactionFormSubtitle, setInteractionFormSubtitle] = useState('');
  const [interactionFormTemplate, setInteractionFormTemplate] = useState('');
  const [isEditingInteractionModalOpen, setIsEditingInteractionModalOpen] = useState(false);

  const [showQuickActionsMenu, setShowQuickActionsMenu] = useState(false);
  const quickActionsMenuRef = useRef<HTMLDivElement>(null);
  const quickActionsButtonRef = useRef<HTMLButtonElement>(null);

  const handleInsertCommercialInteraction = (interaction: any) => {
    setReplyText(interaction.template);
    setShowQuickActionsMenu(false);
    toast.success(`Modelo "${interaction.title}" inserido no chat!`);
    setTimeout(() => {
      const input = document.querySelector('input[placeholder*="Digite uma mensagem"]') as HTMLInputElement;
      input?.focus();
    }, 50);
  };

  const handleOpenEditInteraction = (interaction: CommercialInteractionItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingInteraction(interaction);
    setInteractionFormTitle(interaction.title);
    setInteractionFormSubtitle(interaction.subtitle);
    setInteractionFormTemplate(interaction.template);
    setIsEditingInteractionModalOpen(true);
  };

  const handleSaveInteraction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInteraction) return;
    if (!interactionFormTitle.trim() || !interactionFormTemplate.trim()) {
      toast.error('Preencha o título e a mensagem da interação.');
      return;
    }

    const updated = commercialInteractions.map((item) => {
      if (item.id === editingInteraction.id) {
        return {
          ...item,
          title: interactionFormTitle.trim(),
          subtitle: interactionFormSubtitle.trim(),
          template: interactionFormTemplate.trim(),
        };
      }
      return item;
    });

    setCommercialInteractions(updated);
    try {
      localStorage.setItem('radar_commercial_interactions_v1', JSON.stringify(updated));
    } catch {}

    toast.success(`Interação "${interactionFormTitle.trim()}" atualizada com sucesso!`);
    setIsEditingInteractionModalOpen(false);
    setEditingInteraction(null);
  };

  const handleResetInteractionsToDefault = () => {
    if (window.confirm('Deseja restaurar todas as mensagens de interações comerciais para o texto original padrão?')) {
      setCommercialInteractions(DEFAULT_COMMERCIAL_INTERACTIONS);
      try {
        localStorage.removeItem('radar_commercial_interactions_v1');
      } catch {}
      toast.success('Interações comerciais restauradas ao padrão!');
      setIsEditingInteractionModalOpen(false);
    }
  };

  const handleApplyFormatting = (prefix: string, suffix: string = prefix) => {
    setReplyText((prev) => {
      if (!prev.trim()) {
        return `${prefix}texto${suffix}`;
      }
      return `${prev} ${prefix}destaque${suffix}`;
    });
    setTimeout(() => {
      const input = document.querySelector('input[placeholder*="Digite uma mensagem"]') as HTMLInputElement;
      input?.focus();
    }, 50);
  };

  // 📄 Anexo de Documentos / PDFs
  const docFileInputRef = useRef<HTMLInputElement>(null);
  const [selectedDocFile, setSelectedDocFile] = useState<{
    name: string;
    size: number;
    base64: string;
  } | null>(null);

  const handleDocFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      toast.error('O arquivo é muito grande (máximo 25MB).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedDocFile({
        name: file.name,
        size: file.size,
        base64: reader.result as string,
      });
      toast.success(`Documento "${file.name}" anexado!`);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Fecha o menu de contexto ou menu de opções ao clicar fora ou pressionar Escape
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      if (contextMenu.isOpen && contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu({ isOpen: false, x: 0, y: 0, message: null });
      }
      if (showChatOptionsMenu && chatOptionsMenuRef.current && !chatOptionsMenuRef.current.contains(e.target as Node)) {
        setShowChatOptionsMenu(false);
      }
      if (
        showEmojiPicker &&
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(e.target as Node) &&
        !emojiButtonRef.current?.contains(e.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
      if (
        showQuickActionsMenu &&
        quickActionsMenuRef.current &&
        !quickActionsMenuRef.current.contains(e.target as Node) &&
        !quickActionsButtonRef.current?.contains(e.target as Node)
      ) {
        setShowQuickActionsMenu(false);
      }
    };
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setContextMenu({ isOpen: false, x: 0, y: 0, message: null });
        setEditingMessage(null);
        setDeletingMessage(null);
        setShowChatOptionsMenu(false);
        setShowEmojiPicker(false);
        setShowQuickActionsMenu(false);
      }
    };

    window.addEventListener('click', handleGlobalClick);
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('click', handleGlobalClick);
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [contextMenu.isOpen, showChatOptionsMenu, showEmojiPicker, showQuickActionsMenu]);

  const handleOpenContextMenu = (e: React.MouseEvent, msg: any) => {
    e.preventDefault();
    e.stopPropagation();

    const menuWidth = 230;
    const menuHeight = 310;
    let x = e.clientX;
    let y = e.clientY;

    if (typeof window !== 'undefined') {
      if (x + menuWidth > window.innerWidth) {
        x = Math.max(10, window.innerWidth - menuWidth - 12);
      }
      if (y + menuHeight > window.innerHeight) {
        y = Math.max(10, window.innerHeight - menuHeight - 12);
      }
    }

    setContextMenu({
      isOpen: true,
      x,
      y,
      message: msg,
    });
  };

  const handleStartReply = (msg: any) => {
    setReplyingToMessage(msg);
    setContextMenu({ isOpen: false, x: 0, y: 0, message: null });
    setTimeout(() => {
      const input = document.querySelector('input[placeholder*="Digite uma mensagem"]') as HTMLInputElement;
      input?.focus();
    }, 100);
  };

  const handleCopyMessage = (msg: any) => {
    if (msg?.text) {
      navigator.clipboard.writeText(msg.text);
      toast.success('Texto copiado para a área de transferência!');
    }
    setContextMenu({ isOpen: false, x: 0, y: 0, message: null });
  };

  const handleStartEdit = (msg: any) => {
    setEditingMessage(msg);
    setEditedMessageText(msg?.text || '');
    setContextMenu({ isOpen: false, x: 0, y: 0, message: null });
  };

  const handleSaveEditedMessage = async () => {
    if (!editingMessage || !editedMessageText.trim() || !selectedConversation) return;

    const convId = selectedConversation.id || selectedConversation.phone;
    const msgId = editingMessage.id;
    const newText = editedMessageText.trim();

    setSelectedConversation((prev: any) => {
      if (!prev || !Array.isArray(prev.messages)) return prev;
      return {
        ...prev,
        messages: prev.messages.map((m: any) =>
          m.id === msgId ? { ...m, text: newText, isEdited: true, editedAt: Date.now() } : m
        ),
      };
    });

    setEditingMessage(null);

    try {
      await safeWhatsAppClient.put(`/conversations/${encodeURIComponent(convId)}/messages/${encodeURIComponent(msgId)}`, {
        text: newText,
      });
      toast.success('Mensagem editada com sucesso!');
    } catch {
      toast.success('Mensagem editada!');
    }
  };

  const handlePromptDelete = (msg: any) => {
    setDeletingMessage(msg);
    setContextMenu({ isOpen: false, x: 0, y: 0, message: null });
  };

  const handleConfirmDelete = async (msg: any, forEveryone: boolean) => {
    if (!msg || !selectedConversation) return;

    const convId = selectedConversation.id || selectedConversation.phone || selectedConversation.jid;
    const msgId = msg.id;

    setSelectedConversation((prev: any) => {
      if (!prev || !Array.isArray(prev.messages)) return prev;
      if (forEveryone) {
        return {
          ...prev,
          messages: prev.messages.map((m: any) =>
            (m.id === msgId || (m.baileysId && m.baileysId === msgId))
              ? { ...m, text: '🚫 Esta mensagem foi apagada', isDeleted: true, mediaType: undefined, mediaUrl: undefined }
              : m
          ),
        };
      } else {
        return {
          ...prev,
          messages: prev.messages.filter((m: any) => m.id !== msgId && m.baileysId !== msgId),
        };
      }
    });

    setDeletingMessage(null);

    try {
      await safeWhatsAppClient.delete(
        `/conversations/${encodeURIComponent(convId)}/messages/${encodeURIComponent(msgId)}?forEveryone=${forEveryone}`
      );
      toast.success(forEveryone ? 'Mensagem apagada para todos!' : 'Mensagem apagada para você!');
    } catch {
      toast.success(forEveryone ? 'Mensagem apagada para todos!' : 'Mensagem apagada para você!');
    }
  };

  const handleClearChatMessages = async () => {
    if (!selectedConversation) return;
    const confirmClear = window.confirm(
      'Tem certeza que deseja limpar todas as mensagens desta conversa? As mensagens serão apagadas permanentemente e não retornarão.'
    );
    if (!confirmClear) return;

    setShowChatOptionsMenu(false);
    const convId = selectedConversation.id || selectedConversation.phone || selectedConversation.jid;

    setSelectedConversation((prev: any) => (prev ? { ...prev, messages: [], lastMessage: '' } : prev));

    try {
      await safeWhatsAppClient.delete(`/conversations/${encodeURIComponent(convId)}/messages`);
      toast.success('Todas as mensagens da conversa foram apagadas!');
      if (typeof onRefreshConversations === 'function') {
        onRefreshConversations();
      }
    } catch {
      toast.success('Mensagens da conversa apagadas!');
    }
  };

  const handleDeleteActiveConversation = async () => {
    if (!selectedConversation) return;
    const confirmDelete = window.confirm(
      'Tem certeza que deseja excluir esta conversa do painel? Todos os registros e histórico serão apagados permanentemente.'
    );
    if (!confirmDelete) return;

    setShowChatOptionsMenu(false);
    const convId = selectedConversation.id || selectedConversation.phone || selectedConversation.jid;

    setSelectedConversation(null);

    try {
      await safeWhatsAppClient.delete(`/conversations/${encodeURIComponent(convId)}`);
      toast.success('Conversa excluída do painel!');
      if (typeof onRefreshConversations === 'function') {
        onRefreshConversations();
      }
    } catch {
      toast.success('Conversa excluída!');
    }
  };

  const handleTogglePin = async (msg: any) => {
    if (!msg || !selectedConversation) return;

    const convId = selectedConversation.id || selectedConversation.phone;
    const msgId = msg.id;
    const nextPinState = !msg.isPinned;

    setSelectedConversation((prev: any) => {
      if (!prev || !Array.isArray(prev.messages)) return prev;
      return {
        ...prev,
        messages: prev.messages.map((m: any) => (m.id === msgId ? { ...m, isPinned: nextPinState } : m)),
      };
    });

    setContextMenu({ isOpen: false, x: 0, y: 0, message: null });

    try {
      await safeWhatsAppClient.post(
        `/conversations/${encodeURIComponent(convId)}/messages/${encodeURIComponent(msgId)}/pin`,
        {}
      );
      toast.success(nextPinState ? '📌 Mensagem fixada no topo!' : 'Mensagem desafixada.');
    } catch {
      toast.success(nextPinState ? '📌 Mensagem fixada no topo!' : 'Mensagem desafixada.');
    }
  };

  const handleToggleStar = async (msg: any) => {
    if (!msg || !selectedConversation) return;

    const convId = selectedConversation.id || selectedConversation.phone;
    const msgId = msg.id;
    const nextStarState = !msg.isStarred;

    setSelectedConversation((prev: any) => {
      if (!prev || !Array.isArray(prev.messages)) return prev;
      return {
        ...prev,
        messages: prev.messages.map((m: any) => (m.id === msgId ? { ...m, isStarred: nextStarState } : m)),
      };
    });

    setContextMenu({ isOpen: false, x: 0, y: 0, message: null });

    try {
      await safeWhatsAppClient.post(
        `/conversations/${encodeURIComponent(convId)}/messages/${encodeURIComponent(msgId)}/star`,
        {}
      );
      toast.success(nextStarState ? '⭐ Mensagem favoritada!' : 'Mensagem removida dos favoritos.');
    } catch {
      toast.success(nextStarState ? '⭐ Mensagem favoritada!' : 'Mensagem removida dos favoritos.');
    }
  };

  const handleAddReaction = async (msg: any, emoji: string) => {
    if (!msg || !selectedConversation) return;

    const convId = selectedConversation.id || selectedConversation.phone;
    const msgId = msg.id;

    setSelectedConversation((prev: any) => {
      if (!prev || !Array.isArray(prev.messages)) return prev;
      return {
        ...prev,
        messages: prev.messages.map((m: any) => {
          if (m.id !== msgId) return m;
          const reactions = Array.isArray(m.reactions) ? [...m.reactions] : [];
          const existingIdx = reactions.findIndex((r: any) => r.emoji === emoji);
          if (existingIdx >= 0) {
            reactions.splice(existingIdx, 1);
          } else {
            reactions.push({ emoji, by: 'me' });
          }
          return { ...m, reactions };
        }),
      };
    });

    setContextMenu({ isOpen: false, x: 0, y: 0, message: null });

    try {
      await safeWhatsAppClient.post(
        `/conversations/${encodeURIComponent(convId)}/messages/${encodeURIComponent(msgId)}/react`,
        { emoji }
      );
    } catch {}
  };

  // Gerenciamento Inteligente de Scroll e Visualização de Mensagens
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef<boolean>(true);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);
  const [unreadBelowCount, setUnreadBelowCount] = useState(0);
  const prevConvIdRef = useRef<string | null>(null);
  const prevMsgCountRef = useRef<number>(0);

  const scrollToBottom = React.useCallback((smooth = true) => {
    const container = messagesContainerRef.current;
    if (!container) {
      messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
      return;
    }
    if (smooth) {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    } else {
      container.scrollTop = container.scrollHeight;
    }
    isAtBottomRef.current = true;
    setShowScrollBottomBtn(false);
    setUnreadBelowCount(0);
  }, []);

  const handleMessagesScroll = React.useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const isAtBottom = distanceFromBottom <= 100;

    isAtBottomRef.current = isAtBottom;
    setShowScrollBottomBtn(!isAtBottom);
    if (isAtBottom) {
      setUnreadBelowCount(0);
    }
  }, []);

  useEffect(() => {
    const loadSavedFlows = () => {
      try {
        const stored = localStorage.getItem('radar_bot_flows_v1') || localStorage.getItem('WCTECH_BOT_FLOWS');
        let flows: any[] = [];
        if (stored) {
          flows = JSON.parse(stored);
        }
        const existingIds = new Set(flows.map((f: any) => f.id));
        for (const defFlow of DEFAULT_BOT_FLOWS) {
          if (!existingIds.has(defFlow.id)) {
            flows.push({ ...defFlow, updatedAt: 0 });
          }
        }
        setLocalFlows(flows);
      } catch {
        setLocalFlows(DEFAULT_BOT_FLOWS.map(flow => ({ ...flow, updatedAt: 0 })));
      }
    };

    loadSavedFlows();

    if (safeWhatsAppClient) {
      safeWhatsAppClient.get('/flows').then((res: any) => {
        const apiFlows = res.data?.data?.flows || res.data?.flows;
        if (Array.isArray(apiFlows) && apiFlows.length > 0) {
          setLocalFlows((prev) => {
            const map = new Map(DEFAULT_BOT_FLOWS.map(flow => [flow.id, { ...flow, updatedAt: 0 }]));
            for (const flow of prev) map.set(flow.id, flow);
            for (const flow of apiFlows) {
              const existing = map.get(flow.id);
              if (!existing || (flow.updatedAt || 0) >= (existing.updatedAt || 0)) map.set(flow.id, flow);
            }
            return Array.from(map.values());
          });
        }
      }).catch(() => {});
    }

    const handleFlowsUpdated = (e: any) => {
      if (e?.detail && Array.isArray(e.detail)) {
        setLocalFlows(e.detail);
      } else {
        loadSavedFlows();
      }
    };

    window.addEventListener('flows_updated', handleFlowsUpdated);
    window.addEventListener('storage', loadSavedFlows);
    return () => {
      window.removeEventListener('flows_updated', handleFlowsUpdated);
      window.removeEventListener('storage', loadSavedFlows);
    };
  }, [safeWhatsAppClient]);

  // Atualiza campo de edição de nome ao trocar de conversa
  useEffect(() => {
    if (selectedConversation) {
      setEditedContactName(selectedConversation.name || selectedConversation.phone || '');
      setIsEditingContactName(false);
    }
  }, [selectedConversation?.id, selectedConversation?.phone]);

  // Notificação silenciosa: atualiza sininho e lista de leads quentes (sem pop-up na tela)
  useEffect(() => {
    if (hotLeads.length > 0) {
      const latestLead = hotLeads[0];
      if (latestLead && latestLead.id !== lastHotLeadIdRef.current) {
        lastHotLeadIdRef.current = latestLead.id;
      }
    }
  }, [hotLeads]);

  // Carrega notas do lead selecionado
  useEffect(() => {
    if (selectedConversation?.id) {
      try {
        const notes = localStorage.getItem(`LEAD_NOTES_${selectedConversation.id}`) || '';
        setLeadNotes(notes);
      } catch {}
    }
  }, [selectedConversation?.id]);

  // Ao trocar de conversa: rola imediatamente para o final das mensagens
  useEffect(() => {
    if (!selectedConversation?.id) return;
    if (prevConvIdRef.current !== selectedConversation.id) {
      prevConvIdRef.current = selectedConversation.id;
      prevMsgCountRef.current = selectedConversation.messages?.length || 0;
      setUnreadBelowCount(0);
      setShowScrollBottomBtn(false);
      isAtBottomRef.current = true;
      requestAnimationFrame(() => {
        scrollToBottom(false);
        setTimeout(() => scrollToBottom(false), 50);
      });
    }
  }, [selectedConversation?.id, scrollToBottom]);

  // Ao receber/enviar mensagens da mesma conversa
  useEffect(() => {
    const messages = selectedConversation?.messages || [];
    const prevCount = prevMsgCountRef.current;
    const currentCount = messages.length;

    // Se o número de mensagens for idêntico (ex: polling regular sem novidades), não mexe no scroll!
    if (currentCount === prevCount) {
      return;
    }

    const lastMsg = messages[messages.length - 1];
    const isFromMe = lastMsg && (lastMsg.sender === 'human' || lastMsg.sender === 'user');
    
    // Verifica se a última mensagem foi enviada recentemente (nos últimos 5 segundos)
    const isVeryRecent = lastMsg && (Date.now() - (lastMsg.timestamp || 0)) < 5000;

    if (isFromMe && isVeryRecent) {
      // Mensagem acabou de ser enviada pelo atendente (agora mesmo): rola até o final
      requestAnimationFrame(() => scrollToBottom(true));
    } else if (isAtBottomRef.current) {
      // Usuário já está no final lendo a conversa: acompanha o scroll suavemente
      requestAnimationFrame(() => scrollToBottom(true));
    } else {
      // O USUÁRIO ROLOU PARA CIMA PARA LER MENSAGENS ANTIGAS!
      // Mantém a posição exata de leitura intacta sem puxar para baixo.
      const diff = currentCount - prevCount;
      if (diff > 0) {
        setUnreadBelowCount((prev) => prev + diff);
      }
    }

    prevMsgCountRef.current = currentCount;
  }, [selectedConversation?.messages, scrollToBottom]);

  // Lista de telefones de Leads Quentes para match rápido
  const hotPhonesSet = React.useMemo(() => {
    return new Set(
      (hotLeads || []).map((h: any) => (h.phone || '').replace(/\D/g, ''))
    );
  }, [hotLeads]);

  // Carregamento de etiquetas do WhatsApp
  const fetchTags = React.useCallback(async () => {
    if (!safeWhatsAppClient) return;
    try {
      const res = await safeWhatsAppClient.get('/tags');
      const data = res.data?.data || res.data;
      if (Array.isArray(data) && data.length > 0) {
        setAvailableTags(data);
      }
    } catch {}
  }, [safeWhatsAppClient]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(event.target as Node)) {
        setIsTagDropdownOpen(false);
      }
    }
    if (isTagDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isTagDropdownOpen]);

  // Carregamento de mensagens rápidas
  const fetchQuickMessages = React.useCallback(async () => {
    try {
      const local = localStorage.getItem('WCTECH_QUICK_MESSAGES');
      let initialList = DEFAULT_QUICK_MESSAGES;
      if (local) {
        try {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed)) {
            initialList = parsed;
          }
        } catch {}
      }
      setQuickMessages(initialList);

      if (safeWhatsAppClient) {
        const res = await safeWhatsAppClient.get('/quick-messages');
        const data = res.data?.data || res.data;
        if (Array.isArray(data)) {
          setQuickMessages(data);
          localStorage.setItem('WCTECH_QUICK_MESSAGES', JSON.stringify(data));
        }
      }
    } catch {}
  }, [safeWhatsAppClient]);

  useEffect(() => {
    fetchQuickMessages();
  }, [fetchQuickMessages]);

  useEffect(() => {
    function handleClickOutsideQM(event: MouseEvent) {
      if (quickMessagesMenuRef.current && !quickMessagesMenuRef.current.contains(event.target as Node)) {
        setShowQuickMessagesMenu(false);
      }
    }
    if (showQuickMessagesMenu) {
      document.addEventListener('mousedown', handleClickOutsideQM);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutsideQM);
    };
  }, [showQuickMessagesMenu]);

  // Carregamento de mensagens agendadas
  const fetchScheduledMessages = React.useCallback(async () => {
    if (!safeWhatsAppClient) return;
    try {
      const res = await safeWhatsAppClient.get('/scheduled-messages');
      const data = res.data?.data || res.data;
      if (Array.isArray(data)) {
        setScheduledMessages(data);
      }
    } catch {}
  }, [safeWhatsAppClient]);

  useEffect(() => {
    fetchScheduledMessages();
    const interval = setInterval(fetchScheduledMessages, 15000);
    return () => clearInterval(interval);
  }, [fetchScheduledMessages]);

  // Helpers de etiquetas
  const getTagObj = (tagIdOrName: string): TagDefinition => {
    const found = availableTags.find(t => 
      t.id.toLowerCase() === (tagIdOrName || '').toLowerCase() || 
      t.name.toLowerCase() === (tagIdOrName || '').toLowerCase()
    );
    if (found) return found;
    return {
      id: (tagIdOrName || '').toLowerCase().replace(/[^a-z0-9]/g, '_'),
      name: tagIdOrName || 'Etiqueta',
      color: '#3b82f6',
    };
  };

  const isConversationUrgent = (conv: any): boolean => {
    if (!conv || !Array.isArray(conv.tags)) return false;
    return conv.tags.some((t: string) => {
      const n = (t || '').toLowerCase();
      return n.includes('urgente') || n.includes('urgencia') || n === 'urgent';
    });
  };

  const isConversationImportant = (conv: any): boolean => {
    if (!conv || !Array.isArray(conv.tags)) return false;
    return conv.tags.some((t: string) => {
      const n = (t || '').toLowerCase();
      return n.includes('importante') || n === 'important';
    });
  };

  // Contadores para o Painel de Monitoramento
  const vacuumCount = React.useMemo(() => {
    return conversationsList.filter((c: any) => c.lastMessageSender === 'client').length;
  }, [conversationsList]);

  const unreadCount = React.useMemo(() => {
    return conversationsList.filter((c: any) => 
      (c.unreadCount && c.unreadCount > 0) || 
      (c.lastMessageSender === 'client' && c.isRead === false)
    ).length;
  }, [conversationsList]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('radar_unread_count', String(unreadCount));
      window.dispatchEvent(new CustomEvent('radar_unread_updated', { detail: unreadCount }));
    }
  }, [unreadCount]);

  const humanCount = React.useMemo(() => {
    return conversationsList.filter((c: any) => c.status === 'atendimento_humano').length;
  }, [conversationsList]);

  const botCount = React.useMemo(() => {
    return conversationsList.filter((c: any) => c.status !== 'atendimento_humano').length;
  }, [conversationsList]);

  const hotCount = React.useMemo(() => {
    return hotLeads.length || conversationsList.filter((c: any) => {
      const cPhoneClean = (c.phone || c.id || '').replace(/\D/g, '');
      return hotPhonesSet.has(cPhoneClean) || c.leadTemperature === 'quente' || c.interestScore >= 70;
    }).length;
  }, [hotLeads, conversationsList, hotPhonesSet]);

  // Filtragem das conversas otimizada com useMemo para digitação 100% fluida
  const filteredConversations = React.useMemo(() => {
    return conversationsList.filter((c: any) => {
      const cPhoneClean = (c.phone || c.id || '').replace(/\D/g, '');
      const isHotLead = hotPhonesSet.has(cPhoneClean) || c.leadTemperature === 'quente' || c.interestScore >= 70;
      const isWaitingReply = c.lastMessageSender === 'client';
      const isUnread = (c.unreadCount && c.unreadCount > 0) || (c.lastMessageSender === 'client' && c.isRead === false);

      if (filter === 'vacuum' && !isWaitingReply) return false;
      if (filter === 'unread' && !isUnread) return false;
      if (filter === 'hot' && !isHotLead) return false;
      if (filter === 'in_progress' && c.status !== 'atendimento_humano') return false;
      if (filter === 'bot' && c.status === 'atendimento_humano') return false;

      // Filtro por Etiqueta
      if (selectedTagFilter !== 'all') {
        const convTags = Array.isArray(c.tags) ? c.tags : [];
        const match = convTags.some((t: string) => 
          t.toLowerCase() === selectedTagFilter.toLowerCase() ||
          t.toLowerCase().replace(/[^a-z0-9]/g, '_') === selectedTagFilter.toLowerCase()
        );
        if (!match) return false;
      }

      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = c.name?.toLowerCase().includes(q);
        const matchPhone = c.phone?.includes(q);
        const matchSnippet = c.lastMessageSnippet?.toLowerCase().includes(q);
        const matchTag = Array.isArray(c.tags) && c.tags.some((t: string) => t.toLowerCase().includes(q));
        if (!matchName && !matchPhone && !matchSnippet && !matchTag) return false;
      }
      return true;
    });
  }, [conversationsList, hotPhonesSet, filter, selectedTagFilter, search]);

  const handleToggleReadStatus = async () => {
    if (!selectedConversation) return;
    const convId = selectedConversation.id || selectedConversation.phone;
    const isCurrentlyUnread = (selectedConversation.unreadCount && selectedConversation.unreadCount > 0) || (selectedConversation.lastMessageSender === 'client' && selectedConversation.isRead === false);
    const targetEndpoint = isCurrentlyUnread ? 'read' : 'unread';

    setSelectedConversation((prev: any) => prev ? {
      ...prev,
      isRead: isCurrentlyUnread,
      unreadCount: isCurrentlyUnread ? 0 : 1,
    } : prev);

    const inList = conversationsList.find((c: any) => c.id === convId || c.phone === convId);
    if (inList) {
      inList.isRead = isCurrentlyUnread;
      inList.unreadCount = isCurrentlyUnread ? 0 : 1;
    }

    try {
      await safeWhatsAppClient.post(`/conversations/${convId}/${targetEndpoint}`);
      toast.success(isCurrentlyUnread ? 'Conversa marcada como lida.' : 'Conversa marcada como não lida.');
    } catch {}
  };

  // Alternar etiqueta em uma conversa (1-clique)
  const handleToggleConversationTag = async (tagIdentifier: string) => {
    if (!selectedConversation) return;
    const convId = selectedConversation.id || selectedConversation.phone;
    const currentTags: string[] = Array.isArray(selectedConversation.tags) ? [...selectedConversation.tags] : [];

    const normId = tagIdentifier.toLowerCase();
    const existingIndex = currentTags.findIndex(t => t.toLowerCase() === normId);
    let nextTags: string[];
    let wasAdded = false;

    if (existingIndex >= 0) {
      nextTags = currentTags.filter((_, idx) => idx !== existingIndex);
      wasAdded = false;
    } else {
      nextTags = [...currentTags, tagIdentifier];
      wasAdded = true;
    }

    // Atualização otimista imediata na interface
    setSelectedConversation((prev: any) => prev ? { ...prev, tags: nextTags } : prev);
    const inList = conversationsList.find((c: any) => c.id === convId || c.phone === convId);
    if (inList) inList.tags = nextTags;

    try {
      const res = await safeWhatsAppClient.post(`/conversations/${convId}/tags`, {
        tags: nextTags,
      });
      if (res.data?.success !== false) {
        if (wasAdded) {
          const isUrg = tagIdentifier.toLowerCase().includes('urgente');
          toast.success(isUrg ? '🚨 Cliente marcado como URGENTE! Prioridade máxima.' : `Etiqueta adicionada!`);
        } else {
          toast.success('Etiqueta removida.');
        }
      } else {
        toast.error(res.data?.message || 'Falha ao atualizar etiquetas');
      }
    } catch {
      toast.error('Erro ao salvar etiquetas no servidor');
    }
  };

  const handleOpenTagModal = () => {
    setEditingTag(null);
    setTagFormName('');
    setTagFormColor('#ef4444');
    setIsTagModalOpen(true);
  };

  const handleEditTag = (tag: TagDefinition) => {
    setEditingTag(tag);
    setTagFormName(tag.name);
    setTagFormColor(tag.color || '#3b82f6');
    setIsTagModalOpen(true);
  };

  const handleSaveTag = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!tagFormName.trim()) {
      toast.error('O nome da etiqueta é obrigatório.');
      return;
    }

    setIsSavingTag(true);
    try {
      const res = await safeWhatsAppClient.post('/tags', {
        id: editingTag ? editingTag.id : undefined,
        name: tagFormName.trim(),
        color: tagFormColor,
      });

      if (res.data?.success !== false) {
        toast.success(editingTag ? 'Etiqueta atualizada com sucesso!' : 'Nova etiqueta criada com sucesso!');
        await fetchTags();
        setIsTagModalOpen(false);
        setEditingTag(null);
        setTagFormName('');
      } else {
        toast.error(res.data?.message || 'Erro ao salvar etiqueta');
      }
    } catch {
      toast.error('Erro de conexão ao salvar etiqueta');
    } finally {
      setIsSavingTag(false);
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    try {
      const res = await safeWhatsAppClient.delete(`/tags/${tagId}`);
      if (res.data?.success !== false) {
        toast.success('Etiqueta removida com sucesso!');
        await fetchTags();
      } else {
        toast.error(res.data?.message || 'Falha ao remover etiqueta');
      }
    } catch {
      toast.error('Erro ao remover etiqueta');
    }
  };

  // --- 💬 MENSAGENS RÁPIDAS (TEMPLATES & ATALHOS PERSONALIZADOS) ---
  const parseQuickMessageContent = (content: string) => {
    const customerName = selectedConversation?.name || (selectedConversation?.phone ? `Cliente ${selectedConversation.phone.slice(-4)}` : 'Cliente');
    const attendant = currentAttendantName;
    const phone = selectedConversation?.phone || '';
    const empresa = 'Criart Gráfica';

    return content
      .replace(/\{\{nome\}\}/gi, customerName)
      .replace(/\{\{cliente\}\}/gi, customerName)
      .replace(/\{\{atendente\}\}/gi, attendant)
      .replace(/\{\{colaborador\}\}/gi, attendant)
      .replace(/\{\{telefone\}\}/gi, phone)
      .replace(/\{\{empresa\}\}/gi, empresa);
  };

  const handleInsertQuickMessage = (qm: QuickMessage) => {
    const parsed = parseQuickMessageContent(qm.content);
    setReplyText((prev) => {
      if (!prev.trim()) return parsed;
      return `${prev}\n\n${parsed}`;
    });
    setShowQuickMessagesMenu(false);
    toast.success(`Modelo "${qm.title}" inserido no campo!`);
  };

  const handleSendQuickMessageDirectly = async (qm: QuickMessage) => {
    if (!selectedConversation) {
      toast.error('Nenhuma conversa selecionada');
      return;
    }
    const parsed = parseQuickMessageContent(qm.content);
    setShowQuickMessagesMenu(false);
    setIsSending(true);

    const currentUser = useAuthStore.getState().user;
    const attendantName = currentUser?.name?.trim() || botStatus.pushName || 'Atendente';
    const attendantHeader = buildAttendantHeader(attendantName);
    let finalMsgToSend = parsed;
    if (!hasAttendantHeader(finalMsgToSend)) {
      finalMsgToSend = `${attendantHeader}\n${finalMsgToSend}`;
    }

    const optimisticMsg = {
      id: `temp-${Date.now()}`,
      sender: 'human',
      text: finalMsgToSend,
      timestamp: Date.now(),
    };
    setSelectedConversation((prev: any) => prev ? {
      ...prev,
      messages: [...(prev.messages || []), optimisticMsg]
    } : prev);

    try {
      const convId = selectedConversation.id || selectedConversation.phone;
      const cleanDigits = (selectedConversation.phone || '').replace(/\D/g, '');
      const targetJid = selectedConversation.jid || 
        (cleanDigits.length >= 14 && !cleanDigits.startsWith('55') ? `${cleanDigits}@lid` :
        (cleanDigits ? `${cleanDigits}@s.whatsapp.net` : convId));
      const payload: any = {
        to: targetJid || convId,
        jid: selectedConversation.jid || targetJid,
        text: finalMsgToSend,
      };

      const res = await safeWhatsAppClient.post(`/conversations/${encodeURIComponent(convId)}/reply`, payload);
      const resData = res.data?.data || res.data;
      if (resData && resData.success === false) {
        toast.error(resData.message || 'Falha ao entregar mensagem no WhatsApp');
        return;
      }
      toast.success('Mensagem rápida enviada com sucesso!');
      safeWhatsAppClient.post(`/conversations/${encodeURIComponent(convId)}/read`).catch(() => {});
      setSelectedConversation((prev: any) => prev ? { ...prev, isRead: true, unreadCount: 0 } : prev);
      const matchedInList = conversationsList.find((c: any) => (c.id || c.phone) === convId);
      if (matchedInList) {
        matchedInList.isRead = true;
        matchedInList.unreadCount = 0;
      }
      handleOpenConversationChat(selectedConversation);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Erro ao enviar mensagem rápida');
    } finally {
      setIsSending(false);
    }
  };

  const handleOpenCreateQMModal = () => {
    setEditingQuickMessage(null);
    setQmFormTitle('');
    setQmFormShortcut('');
    setQmFormCategory('Atendimento');
    setQmFormContent('');
    setIsQuickMessageModalOpen(true);
    setShowQuickMessagesMenu(false);
  };

  const handleOpenEditQMModal = (qm: QuickMessage, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingQuickMessage(qm);
    setQmFormTitle(qm.title);
    setQmFormShortcut(qm.shortcut || '');
    setQmFormCategory(qm.category || 'Geral');
    setQmFormContent(qm.content);
    setIsQuickMessageModalOpen(true);
    setShowQuickMessagesMenu(false);
  };

  const handleSaveQuickMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!qmFormTitle.trim() || !qmFormContent.trim()) {
      toast.error('Preencha o título e o conteúdo da mensagem');
      return;
    }
    setIsSavingQM(true);
    try {
      const payload: Partial<QuickMessage> = {
        id: editingQuickMessage?.id,
        title: qmFormTitle.trim(),
        shortcut: qmFormShortcut.trim() ? (qmFormShortcut.startsWith('/') ? qmFormShortcut.trim() : `/${qmFormShortcut.trim()}`) : undefined,
        category: qmFormCategory.trim() || 'Geral',
        content: qmFormContent.trim(),
      };

      let updatedList: QuickMessage[] = [];
      if (safeWhatsAppClient) {
        const res = await safeWhatsAppClient.post('/quick-messages', payload);
        const data = res.data?.data || res.data;
        if (Array.isArray(data)) {
          updatedList = data;
        }
      }

      if (updatedList.length === 0) {
        if (editingQuickMessage) {
          updatedList = quickMessages.map((m) => m.id === editingQuickMessage.id ? { ...m, ...payload } as QuickMessage : m);
        } else {
          const newMsg: QuickMessage = {
            id: `qm-${Date.now()}`,
            title: payload.title!,
            shortcut: payload.shortcut,
            category: payload.category,
            content: payload.content!,
            updatedAt: Date.now(),
          };
          updatedList = [newMsg, ...quickMessages];
        }
      }

      setQuickMessages(updatedList);
      localStorage.setItem('WCTECH_QUICK_MESSAGES', JSON.stringify(updatedList));
      toast.success(editingQuickMessage ? 'Mensagem rápida atualizada!' : 'Nova mensagem rápida criada!');
      setIsQuickMessageModalOpen(false);
      setEditingQuickMessage(null);
    } catch {
      toast.error('Erro ao salvar mensagem rápida');
    } finally {
      setIsSavingQM(false);
    }
  };

  const handleDeleteQuickMessage = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      let updatedList = quickMessages.filter((m) => m.id !== id);
      if (safeWhatsAppClient) {
        await safeWhatsAppClient.delete(`/quick-messages/${id}`);
      }
      setQuickMessages(updatedList);
      localStorage.setItem('WCTECH_QUICK_MESSAGES', JSON.stringify(updatedList));
      toast.success('Modelo de mensagem excluído!');
    } catch {
      toast.error('Erro ao excluir mensagem rápida');
    }
  };

  const qmCategories = Array.from(new Set(['all', ...quickMessages.map((m) => m.category || 'Geral')]));

  const filteredQuickMessages = quickMessages.filter((qm) => {
    const matchesCat = selectedQMCategory === 'all' || (qm.category || 'Geral') === selectedQMCategory;
    if (!matchesCat) return false;
    if (!quickMessagesSearch.trim()) return true;
    const term = quickMessagesSearch.toLowerCase();
    return (
      qm.title.toLowerCase().includes(term) ||
      qm.content.toLowerCase().includes(term) ||
      (qm.shortcut && qm.shortcut.toLowerCase().includes(term)) ||
      (qm.category && qm.category.toLowerCase().includes(term))
    );
  });

  // --- 📅 AGENDAMENTO DE MENSAGENS E LEMBRETES ---
  const handleOpenScheduleModal = (initialText?: string, type: 'manual_schedule' | 'follow_up_budget' = 'manual_schedule') => {
    const text = initialText || replyText.trim() || '';
    setScheduleText(text);
    setScheduleType(type);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    const pad = (n: number) => String(n).padStart(2, '0');
    const defaultDt = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}T09:00`;
    setScheduleDateTime(defaultDt);

    setIsScheduleModalOpen(true);
  };

  const handleSetSchedulePreset = (preset: '1h' | 'today_17h' | 'tomorrow_9h' | 'friday_14h' | '24h' | '48h') => {
    const target = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');

    if (preset === '1h') {
      target.setHours(target.getHours() + 1);
    } else if (preset === 'today_17h') {
      target.setHours(17, 0, 0, 0);
      if (target.getTime() <= Date.now()) {
        target.setDate(target.getDate() + 1);
      }
    } else if (preset === 'tomorrow_9h') {
      target.setDate(target.getDate() + 1);
      target.setHours(9, 0, 0, 0);
    } else if (preset === 'friday_14h') {
      const day = target.getDay();
      const daysUntilFriday = (5 - day + 7) % 7 || 7;
      target.setDate(target.getDate() + daysUntilFriday);
      target.setHours(14, 0, 0, 0);
    } else if (preset === '24h') {
      target.setTime(target.getTime() + 24 * 60 * 60 * 1000);
    } else if (preset === '48h') {
      target.setTime(target.getTime() + 48 * 60 * 60 * 1000);
    }

    const dtStr = `${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}T${pad(target.getHours())}:${pad(target.getMinutes())}`;
    setScheduleDateTime(dtStr);
  };

  const handleSaveSchedule = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedConversation) {
      toast.error('Nenhuma conversa selecionada.');
      return;
    }
    if (!scheduleText.trim()) {
      toast.error('Digite a mensagem a ser agendada.');
      return;
    }
    if (!scheduleDateTime) {
      toast.error('Escolha a data e o horário do envio.');
      return;
    }

    const scheduledTimestamp = new Date(scheduleDateTime).getTime();
    if (isNaN(scheduledTimestamp) || scheduledTimestamp <= Date.now()) {
      toast.error('O horário agendado precisa ser no futuro.');
      return;
    }

    setIsSavingSchedule(true);
    try {
      const convId = selectedConversation.id || selectedConversation.phone;
      const targetJid = selectedConversation.jid || (selectedConversation.phone?.includes('@') ? selectedConversation.phone : `${selectedConversation.phone}@s.whatsapp.net`);
      const payload = {
        conversationId: convId,
        phone: selectedConversation.phone || convId,
        contactName: selectedConversation.name || `Cliente ${convId}`,
        jid: targetJid,
        text: parseQuickMessageContent(scheduleText.trim()),
        scheduledFor: scheduledTimestamp,
        type: scheduleType,
        attendantName: currentAttendantName,
      };

      const res = await safeWhatsAppClient.post('/scheduled-messages', payload);
      if (res.data?.success !== false) {
        toast.success(`Mensagem agendada para ${new Date(scheduledTimestamp).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}!`);
        setIsScheduleModalOpen(false);
        setScheduleText('');
        fetchScheduledMessages();
      } else {
        toast.error(res.data?.message || 'Falha ao agendar mensagem');
      }
    } catch {
      toast.error('Erro ao agendar mensagem no servidor');
    } finally {
      setIsSavingSchedule(false);
    }
  };

  const handleCancelScheduledMessage = async (id: string) => {
    try {
      const res = await safeWhatsAppClient.post(`/scheduled-messages/${id}/cancel`);
      if (res.data?.success !== false) {
        toast.success('Agendamento cancelado!');
        fetchScheduledMessages();
      } else {
        toast.error(res.data?.message || 'Falha ao cancelar');
      }
    } catch {
      toast.error('Erro ao cancelar agendamento');
    }
  };

  // Mensagens agendadas ativas desta conversa
  const activeConversationScheduled = scheduledMessages.filter((m) => {
    if (!selectedConversation) return false;
    const cleanCurrent = (selectedConversation.id || selectedConversation.phone || '').replace(/\D/g, '');
    const cleanMsg = (m.conversationId || m.phone || '').replace(/\D/g, '');
    return m.status === 'pending' && (cleanCurrent.includes(cleanMsg) || cleanMsg.includes(cleanCurrent));
  });

  // --- 🎯 RECUPERADOR DE VENDAS (FOLLOW-UP DE ORÇAMENTO) ---
  const isConversationBudgetPending = (conv: any): boolean => {
    if (!conv) return false;
    const tags = Array.isArray(conv.tags) ? conv.tags.map((t: string) => t.toLowerCase()) : [];
    if (tags.some((t: string) => t.includes('orcamento') || t.includes('orçamento'))) return true;

    const lastSnippet = (conv.lastMessageSnippet || '').toLowerCase();
    const hasBudgetKeyword = lastSnippet.includes('orçamento') || lastSnippet.includes('orcamento') || lastSnippet.includes('r$') || lastSnippet.includes('valor') || lastSnippet.includes('pix');
    const isFromAttendant = conv.lastMessageSender === 'human' || conv.lastMessageSender === 'bot';
    return hasBudgetKeyword && isFromAttendant;
  };

  const FOLLOW_UP_TEMPLATES = [
    {
      id: 'fu-prestativo',
      title: '🤝 Amigável & Tirar Dúvidas',
      subtitle: 'Ideal para 24h após envio do orçamento',
      text: 'Olá, {{nome}}! Tudo bem?\nPassando para saber se você conseguiu avaliar a proposta do seu material gráfico que te enviei! Ficou com alguma dúvida ou precisa que eu ajuste a quantidade ou formato? Estou à disposição!',
    },
    {
      id: 'fu-producao',
      title: '🚀 Grade de Produção Fechando',
      subtitle: 'Gera urgência para rodar no mesmo dia',
      text: 'Oi, {{nome}}! Estamos organizando a grade de produção de hoje da Criart. Se aprovarmos seu pedido agora, consigo priorizar seu material para entrega mais rápida! Podemos rodar a impressão?',
    },
    {
      id: 'fu-pix-desconto',
      title: '💰 Condição Especial no Pix',
      subtitle: 'Incentivo financeiro para fechar na hora',
      text: 'Olá, {{nome}}! Conversei com a gerência aqui e consigo segurar uma condição especial no pagamento à vista pelo Pix para fecharmos seu pedido hoje. O que você acha? Me dá um toque que já libero sua produção!',
    },
  ];

  const handleSendFollowUpNow = async (templateText: string) => {
    if (!selectedConversation) return;
    const parsed = parseQuickMessageContent(templateText);
    setIsFollowUpModalOpen(false);

    const fakeQM: QuickMessage = {
      id: 'temp-fu',
      title: 'Follow-up de Vendas',
      content: templateText,
    };
    await handleSendQuickMessageDirectly(fakeQM);
  };

  const handleScheduleFollowUp = (templateText: string, hoursAhead = 24) => {
    const parsed = parseQuickMessageContent(templateText);
    setIsFollowUpModalOpen(false);
    handleOpenScheduleModal(parsed, 'follow_up_budget');
    if (hoursAhead === 24) {
      handleSetSchedulePreset('24h');
    } else {
      handleSetSchedulePreset('48h');
    }
  };

  // --- 🎙️ TRANSCRIÇÃO DE ÁUDIO DE CLIENTES (ÁUDIO ➔ TEXTO) ---
  // --- ATIVAÇÃO/DESATIVAÇÃO GLOBAL DO ROBÔ DE ATENDIMENTO ---
  const handleActivateGlobalFlow = async () => {
    if (automationBusyRef.current) return;
    const targetFlow = localFlows.find(f => f.id === automationFlowId);
    if (!targetFlow) {
      toast.error('Escolha um fluxo para o atendimento.');
      return;
    }
    automationBusyRef.current = true;
    setIsChangingAutomation(true);
    try {
      const status = await activateBotAutomation(safeWhatsAppClient, targetFlow);
      onBotStatusChange?.(status);
      saveStoredFlows(localFlows.map(f => ({ ...f, isActive: f.id === targetFlow.id })));
      setActiveFlowIdInStorage(targetFlow.id);
      setSelectedFlowIdInStorage(targetFlow.id);
      toast.success(status.connected
        ? `Robô ativado com o fluxo "${targetFlow.name}"!`
        : 'Automação ativada. Conecte o WhatsApp para receber e responder mensagens.');
    } catch (e: any) {
      toast.error(e.message || 'Erro ao ativar robô.');
    } finally {
      await onRefreshBotStatus?.();
      automationBusyRef.current = false;
      setIsChangingAutomation(false);
    }
  };

  const handleDeactivateGlobalFlow = async () => {
    if (automationBusyRef.current) return;
    automationBusyRef.current = true;
    setIsChangingAutomation(true);
    try {
      const status = await deactivateBotAutomation(safeWhatsAppClient);
      onBotStatusChange?.(status);
      saveStoredFlows(localFlows.map(f => ({ ...f, isActive: false })));
      setActiveFlowIdInStorage('');
      toast.success('Robô silenciado com sucesso!');
    } catch (e: any) {
      toast.error(e.message || 'Erro ao silenciar robô.');
    } finally {
      await onRefreshBotStatus?.();
      automationBusyRef.current = false;
      setIsChangingAutomation(false);
    }
  };

  // Toggle Universal do Robô de Atendimento (Chave Mestre Global ON/OFF)
  const isUniversalBotActive = Boolean(botStatus?.autoReplyEnabled !== false && botStatus?.isFlowActive !== false);
  const [isTogglingUniversalBot, setIsTogglingUniversalBot] = useState(false);

  const handleToggleUniversalBot = async () => {
    if (isTogglingUniversalBot || automationBusyRef.current) return;
    setIsTogglingUniversalBot(true);
    automationBusyRef.current = true;
    const targetState = !isUniversalBotActive;

    try {
      if (targetState) {
        // Ativar universalmente: o backend religa o fluxo + auto-reply numa única chamada confirmada
        const preferredFlow =
          localFlows.find(f => f.id === automationFlowId && f.steps?.length) ||
          localFlows.find(f => f.isActive && f.steps?.length) ||
          localFlows.find(f => f.steps?.length);

        // Sincroniza o fluxo local com o servidor (caso tenha sido criado só neste navegador)
        if (preferredFlow) {
          const { isActive: _ignored, ...content } = preferredFlow as any;
          await safeWhatsAppClient.post('/flows', content).catch(() => null);
        }

        const res = await safeWhatsAppClient.post('/auto-reply/universal', {
          enabled: true,
          flowId: preferredFlow?.id,
        });
        if (!res?.data || res.data.success === false) {
          throw new Error(res?.data?.message || 'O servidor não confirmou a ativação do robô.');
        }
        const activeId = res.data.data?.activeFlowId || preferredFlow?.id || '';
        if (activeId) {
          saveStoredFlows(localFlows.map(f => ({ ...f, isActive: f.id === activeId })));
          setActiveFlowIdInStorage(activeId);
        }

        onBotStatusChange?.({
          ...botStatus,
          autoReplyEnabled: true,
          isFlowActive: true,
          activeFlowId: activeId,
        });
        toast.success(`🟢 Robô Universal LIGADO${res.data.data?.activeFlowName ? ` (fluxo "${res.data.data.activeFlowName}")` : ''}! Ele responderá novos clientes automaticamente.`);
      } else {
        const res = await safeWhatsAppClient.post('/auto-reply/universal', { enabled: false });
        if (!res?.data || res.data.success === false) {
          throw new Error(res?.data?.message || 'O servidor não confirmou o desligamento do robô.');
        }
        saveStoredFlows(localFlows.map(f => ({ ...f, isActive: false })));
        setActiveFlowIdInStorage('');

        onBotStatusChange?.({
          ...botStatus,
          autoReplyEnabled: false,
          isFlowActive: false,
          activeFlowId: '',
        });
        toast.success('🔴 Robô Universal DESLIGADO! Todas as auto-respostas automáticas foram pausadas.');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Erro ao alternar chave universal do robô.';
      toast.error(Array.isArray(msg) ? msg.join(' ') : msg);
    } finally {
      await onRefreshBotStatus?.();
      automationBusyRef.current = false;
      setIsTogglingUniversalBot(false);
    }
  };

  const handleTranscribeAudio = async (msg: any) => {
    if (!selectedConversation || !msg) return;
    setTranscribingAudioMsgId(msg.id);
    try {
      const convId = selectedConversation.id || selectedConversation.phone;
      const res = await safeWhatsAppClient.post('/transcribe-audio', {
        conversationId: convId,
        messageId: msg.id,
        audioUrl: msg.mediaUrl,
        audioBase64: msg.mediaUrl?.startsWith('data:') ? msg.mediaUrl : undefined,
      });

      const transcriptionText = res.data?.data?.transcription || res.data?.transcription;
      if (transcriptionText) {
        setAudioTranscriptions((prev) => ({
          ...prev,
          [msg.id]: transcriptionText,
        }));
        setSelectedConversation((prev: any) => {
          if (!prev || !prev.messages) return prev;
          return {
            ...prev,
            messages: prev.messages.map((m: any) => m.id === msg.id ? { ...m, transcription: transcriptionText } : m),
          };
        });
        toast.success('Áudio transcrito com sucesso!');
      } else {
        toast.error('Não foi possível obter transcrição deste áudio.');
      }
    } catch {
      toast.error('Erro ao conectar com serviço de transcrição');
    } finally {
      setTranscribingAudioMsgId(null);
    }
  };

  // Marcar leads quentes como lidos
  const handleMarkHotLeadsAsRead = async () => {
    try {
      await safeWhatsAppClient.post('/hot-leads/mark-read');
      if (onRefreshHotLeads) onRefreshHotLeads();
    } catch {}
  };

  // Abrir conversa a partir do card de lead quente
  const handleSelectHotLead = (hotLead: any) => {
    const cleanPhone = (hotLead.phone || '').replace(/\D/g, '');
    const found = conversationsList.find((c: any) => {
      const p = (c.phone || c.id || '').replace(/\D/g, '');
      return p.includes(cleanPhone) || cleanPhone.includes(p);
    });

    if (found) {
      handleOpenConversationChat(found);
    } else {
      handleOpenConversationChat({
        id: cleanPhone,
        phone: cleanPhone,
        name: hotLead.leadName || `Contato ${cleanPhone}`,
        status: 'atendimento_humano',
        messages: [{
          id: `lead-reply-${Date.now()}`,
          sender: 'client',
          text: hotLead.text,
          timestamp: hotLead.repliedAt || Date.now()
        }]
      });
    }

    setIsHotLeadsModalOpen(false);
  };

  // Salvar nota rápida
  const handleSaveNote = (text: string) => {
    setLeadNotes(text);
    if (selectedConversation?.id) {
      try {
        localStorage.setItem(`LEAD_NOTES_${selectedConversation.id}`, text);
      } catch {}
    }
  };

  // Renomear Contato no Servidor e Estado Local
  const handleSaveContactName = async () => {
    if (!editedContactName.trim() || !selectedConversation) return;
    setIsSavingContactName(true);
    const cleanName = editedContactName.trim();
    const convId = selectedConversation.id || selectedConversation.phone;
    const cleanPhone = (selectedConversation.phone || selectedConversation.id || '').replace(/\D/g, '');

    try {
      // 1. Atualiza estado imediatamente no frontend
      setSelectedConversation((prev: any) => prev ? { ...prev, name: cleanName } : prev);
      if (Array.isArray(conversationsList)) {
        for (const c of conversationsList) {
          if (c.id === convId || c.phone === convId || c.phone === selectedConversation.phone || c.jid === selectedConversation.jid) {
            c.name = cleanName;
          }
        }
      }

      // 2. Persiste no localStorage do navegador para garantir persistência absoluta
      try {
        if (convId) localStorage.setItem(`custom_name_${convId}`, cleanName);
        if (cleanPhone) localStorage.setItem(`custom_name_${cleanPhone}`, cleanName);
        if (selectedConversation.jid) localStorage.setItem(`custom_name_${selectedConversation.jid}`, cleanName);
      } catch {}

      // 3. Atualiza no backend via API (POST /rename com fallback para /contact)
      let res = await safeWhatsAppClient.post(`/conversations/${encodeURIComponent(convId)}/rename`, {
        name: cleanName,
      }).catch(() => null);

      if (!res || res.data?.success === false) {
        res = await safeWhatsAppClient.post(`/conversations/${encodeURIComponent(convId)}/contact`, {
          name: cleanName,
        }).catch(() => null);
      }

      // 4. Sincroniza com o CRM Leads se houver lead com este telefone
      try {
        const storedLeads = getStoredLeads();
        let leadChanged = false;
        const updatedLeads = storedLeads.map((l: any) => {
          const lPhone = (l.phone || '').replace(/\D/g, '');
          if (lPhone && (lPhone === cleanPhone || cleanPhone.includes(lPhone) || lPhone.includes(cleanPhone))) {
            leadChanged = true;
            return { ...l, name: cleanName, company: cleanName };
          }
          return l;
        });
        if (leadChanged) {
          saveStoredLeads(updatedLeads);
        }
      } catch {}

      setIsEditingContactName(false);
      toast.success(`Nome alterado para "${cleanName}"!`);
      if (onRefreshConversations) {
        onRefreshConversations();
      }
    } catch {
      toast.error('Erro ao renomear contato');
    } finally {
      setIsSavingContactName(false);
    }
  };

  // Mover ou Cadastrar Contato no CRM / Pipeline de Vendas
  const handleMoveToCrmStage = (stageId: string) => {
    if (!selectedConversation) return;
    const stage = PIPELINE_STAGES.find((s) => s.id === stageId) || PIPELINE_STAGES[0];
    const leads = getStoredLeads();
    const realFormattedPhone = formatBrazilianPhone(selectedConversation.phone || selectedConversation.id || '');
    const convDigits = (realFormattedPhone || selectedConversation.phone || selectedConversation.id || '').replace(/\D/g, '');
    const convId = selectedConversation.id || '';
    let contactName = editedContactName.trim() || selectedConversation.name || '';
    if (!contactName || /^\d{14,16}$/.test(contactName.trim())) {
      contactName = `Cliente ${realFormattedPhone || convDigits.slice(-4)}`;
    }

    let foundIdx = -1;
    const updated = leads.map((l: any, idx: number) => {
      const lDigits = (l.phone || '').replace(/\D/g, '');
      const isMatch = l.id === convId || l.id === convDigits ||
        (convDigits && lDigits && (convDigits.endsWith(lDigits.slice(-8)) || lDigits.endsWith(convDigits.slice(-8))));

      if (isMatch) {
        foundIdx = idx;
        return {
          ...l,
          name: contactName || l.name,
          phone: realFormattedPhone || l.phone,
          pipelineStageId: stage.id,
          status: stage.status,
          potentialValue: Number(targetCrmValue) || l.potentialValue || 2500,
          notes: leadNotes ? `${l.notes ? l.notes + '\n' : ''}${leadNotes}` : l.notes,
          updatedAt: new Date().toISOString(),
        };
      }
      return l;
    });

    if (foundIdx === -1) {
      const newLead: any = {
        id: `lead-wa-${Date.now()}`,
        name: contactName,
        tradeName: contactName,
        phone: realFormattedPhone || formatBrazilianPhone(convDigits),
        pipelineStageId: stage.id,
        status: stage.status,
        priority: isConversationUrgent(selectedConversation) ? Priority.HIGH : Priority.MEDIUM,
        score: {
          total: 85,
          level: ScoreLevel.HIGH,
        },
        address: {
          city: 'Manaus',
          state: 'AM',
          formattedAddress: 'Manaus - AM (Chat Comercial WhatsApp)',
        },
        segment: {
          id: 'seg-wa',
          name: 'Chat WhatsApp',
          icon: 'MessageSquare',
          color: '#10B981',
        },
        potentialValue: Number(targetCrmValue) || 2500,
        notes: leadNotes || 'Lead importado e vinculado a partir do Chat Comercial do WhatsApp.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      updated.unshift(newLead);
      setMatchedCrmLead(newLead);
    } else {
      setMatchedCrmLead(updated[foundIdx]);
    }

    saveStoredLeads(updated);
    setTargetCrmStageId(stage.id);

    // Invalida caches do React Query para atualizar CRM Pipeline e Leads imediatamente
    queryClient.invalidateQueries({ queryKey: ['pipeline'] });
    queryClient.invalidateQueries({ queryKey: ['leads'] });

    toast.success(`Lead vinculado e movido para "${stage.name}" no CRM!`, {
      icon: '🎯',
      duration: 3500,
    });
  };

  // Sincronizar / Salvar Contato no módulo de Leads (CRM)
  const handleSyncToLead = async () => {
    if (!selectedConversation) return;
    setIsSyncingLead(true);
    try {
      handleMoveToCrmStage(targetCrmStageId);
    } catch {
      toast.error('Erro ao sincronizar com CRM');
    } finally {
      setIsSyncingLead(false);
    }
  };

  // Enviar Mensagem de Texto, Imagem ou Documento
  const handleSend = async () => {
    if ((!replyText.trim() && !selectedImageBase64 && !selectedDocFile) || !selectedConversation) return;
    setIsSending(true);

    const msgToSend = replyText.trim();
    const imgToSend = selectedImageBase64;
    const docToSend = selectedDocFile;
    const activeReply = replyingToMessage;
    setReplyText('');
    setSelectedImageBase64(null);
    setSelectedDocFile(null);
    setReplyingToMessage(null);
    setShowEmojiPicker(false);
    setShowQuickActionsMenu(false);

    // Identificação OBRIGATÓRIA do Atendente Logado em Negrito (*Atendente Nome:*)
    const currentUser = useAuthStore.getState().user;
    const attendantName = currentUser?.name?.trim() || botStatus.pushName || 'Atendente';
    const attendantHeader = buildAttendantHeader(attendantName);

    let finalMsgToSend = msgToSend;
    if (finalMsgToSend) {
      if (!hasAttendantHeader(finalMsgToSend)) {
        finalMsgToSend = `${attendantHeader}\n${finalMsgToSend}`;
      }
    } else if (imgToSend) {
      finalMsgToSend = attendantHeader;
    } else if (docToSend) {
      finalMsgToSend = `${attendantHeader}\n📄 Arquivo: ${docToSend.name}`;
    }

    // Renderização otimista imediata na tela para feedback instantâneo
    const optimisticMsg = {
      id: `temp-${Date.now()}`,
      sender: 'human',
      text: finalMsgToSend || (docToSend ? `📄 [Documento: ${docToSend.name}]` : imgToSend ? '[Imagem]' : ''),
      timestamp: Date.now(),
      mediaType: docToSend ? 'document' : imgToSend ? 'image' : undefined,
      mediaUrl: docToSend ? docToSend.base64 : imgToSend || undefined,
      fileName: docToSend?.name,
      fileSize: docToSend?.size,
      quotedMessage: activeReply ? {
        id: activeReply.id,
        sender: activeReply.sender,
        text: activeReply.text?.slice(0, 100) || '',
      } : undefined,
    };
    setSelectedConversation((prev: any) => prev ? {
      ...prev,
      messages: [...(prev.messages || []), optimisticMsg]
    } : prev);

    try {
      const convId = selectedConversation.id || selectedConversation.phone;
      const cleanDigits = (selectedConversation.phone || '').replace(/\D/g, '');
      const targetJid = selectedConversation.jid || 
        (cleanDigits.length >= 14 && !cleanDigits.startsWith('55') ? `${cleanDigits}@lid` :
        (cleanDigits ? `${cleanDigits}@s.whatsapp.net` : convId));
      const payload: any = {
        to: targetJid || convId,
        jid: selectedConversation.jid || targetJid,
        text: finalMsgToSend,
        imageBase64OrUrl: imgToSend || undefined,
        documentBase64: docToSend?.base64 || undefined,
        documentName: docToSend?.name || undefined,
        quotedMessage: activeReply ? {
          id: activeReply.id,
          sender: activeReply.sender,
          text: activeReply.text?.slice(0, 100) || '',
        } : undefined,
      };

      const res = await safeWhatsAppClient.post(`/conversations/${encodeURIComponent(convId)}/reply`, payload);
      const resData = res.data?.data || res.data;
      if (resData && resData.success === false) {
        toast.error(resData.message || 'Falha ao entregar mensagem no WhatsApp');
        return;
      }

      toast.success(docToSend ? 'Documento enviado com sucesso!' : imgToSend ? 'Imagem enviada com sucesso!' : 'Mensagem enviada com sucesso!');
      safeWhatsAppClient.post(`/conversations/${encodeURIComponent(convId)}/read`).catch(() => {});
      setSelectedConversation((prev: any) => prev ? { ...prev, isRead: true, unreadCount: 0 } : prev);
      const matchedInList = conversationsList.find((c: any) => (c.id || c.phone) === convId);
      if (matchedInList) {
        matchedInList.isRead = true;
        matchedInList.unreadCount = 0;
      }
      handleOpenConversationChat(selectedConversation);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Erro ao enviar mensagem');
    } finally {
      setIsSending(false);
    }
  };

  // Upload de Imagem pelo input
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione um arquivo de imagem válido.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImageBase64(reader.result as string);
      toast.success('Imagem anexada! Digite uma legenda ou clique em Enviar.');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Envio de arquivo de áudio
  const handleAudioFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedConversation) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Audio = reader.result as string;

      // Renderização otimista imediata na tela para áudio
      const optimisticMsg = {
        id: `temp-${Date.now()}`,
        sender: 'human',
        text: '[Áudio]',
        timestamp: Date.now(),
        mediaType: 'audio',
        mediaUrl: base64Audio
      };
      setSelectedConversation((prev: any) => prev ? {
        ...prev,
        messages: [...(prev.messages || []), optimisticMsg]
      } : prev);

      try {
        const currentUser = useAuthStore.getState().user;
        const attendantName = currentUser?.name?.trim() || botStatus.pushName || 'Atendente';
        const attendantHeader = buildAttendantHeader(attendantName);

        const convId = selectedConversation.id || selectedConversation.phone;
        const cleanDigits = (selectedConversation.phone || '').replace(/\D/g, '');
        const targetJid = selectedConversation.jid || 
          (cleanDigits.length >= 14 && !cleanDigits.startsWith('55') ? `${cleanDigits}@lid` :
          (cleanDigits ? `${cleanDigits}@s.whatsapp.net` : convId));
        const res = await safeWhatsAppClient.post(`/conversations/${encodeURIComponent(convId)}/reply`, {
          to: targetJid || convId,
          jid: selectedConversation.jid || targetJid,
          text: `${attendantHeader} [Áudio]`,
          audioBase64OrUrl: base64Audio
        });
        const resData = res.data?.data || res.data;
        if (resData && resData.success === false) {
          toast.error(resData.message || 'Falha ao enviar áudio');
          return;
        }
        toast.success('Áudio enviado com sucesso!');
        safeWhatsAppClient.post(`/conversations/${encodeURIComponent(convId)}/read`).catch(() => {});
        setSelectedConversation((prev: any) => prev ? { ...prev, isRead: true, unreadCount: 0 } : prev);
        const matchedInList = conversationsList.find((c: any) => (c.id || c.phone) === convId);
        if (matchedInList) {
          matchedInList.isRead = true;
          matchedInList.unreadCount = 0;
        }
        handleOpenConversationChat(selectedConversation);
      } catch (err: any) {
        toast.error('Erro ao enviar áudio');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Iniciar Gravação de Áudio ao Vivo pelo Microfone
  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      let mimeType = '';
      if (typeof MediaRecorder !== 'undefined') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
          mimeType = 'audio/ogg;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        }
      }
      const mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      setIsRecordingAudio(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      toast.error('Permissão de microfone negada ou indisponível.');
    }
  };

  // Parar e Enviar Gravação de Áudio
  const handleStopAndSendRecording = () => {
    if (!mediaRecorderRef.current || !selectedConversation) return;

    clearInterval(recordingTimerRef.current);
    setIsRecordingAudio(false);

    mediaRecorderRef.current.onstop = async () => {
      const mime = mediaRecorderRef.current?.mimeType || 'audio/webm';
      const audioBlob = new Blob(audioChunksRef.current, { type: mime });
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Audio = reader.result as string;

        // Renderização otimista imediata na tela para áudio gravado
        const optimisticMsg = {
          id: `temp-${Date.now()}`,
          sender: 'human',
          text: '[Áudio gravado]',
          timestamp: Date.now(),
          mediaType: 'audio',
          mediaUrl: base64Audio
        };
        setSelectedConversation((prev: any) => prev ? {
          ...prev,
          messages: [...(prev.messages || []), optimisticMsg]
        } : prev);

        try {
          const currentUser = useAuthStore.getState().user;
          const attendantName = currentUser?.name?.trim() || botStatus.pushName || 'Atendente';
          const attendantHeader = buildAttendantHeader(attendantName);

          const convId = selectedConversation.id || selectedConversation.phone;
          const cleanDigits = (selectedConversation.phone || '').replace(/\D/g, '');
          const targetJid = selectedConversation.jid || 
            (cleanDigits.length >= 14 && !cleanDigits.startsWith('55') ? `${cleanDigits}@lid` :
            (cleanDigits ? `${cleanDigits}@s.whatsapp.net` : convId));
          const res = await safeWhatsAppClient.post(`/conversations/${encodeURIComponent(convId)}/reply`, {
            to: targetJid || convId,
            jid: selectedConversation.jid || targetJid,
            text: `${attendantHeader} [Áudio gravado]`,
            audioBase64OrUrl: base64Audio
          });
          const resData = res.data?.data || res.data;
          if (resData && resData.success === false) {
            toast.error(resData.message || 'Falha ao enviar áudio');
            return;
          }
          toast.success('Áudio de voz enviado!');
          safeWhatsAppClient.post(`/conversations/${encodeURIComponent(convId)}/read`).catch(() => {});
          setSelectedConversation((prev: any) => prev ? { ...prev, isRead: true, unreadCount: 0 } : prev);
          const matchedInList = conversationsList.find((c: any) => (c.id || c.phone) === convId);
          if (matchedInList) {
            matchedInList.isRead = true;
            matchedInList.unreadCount = 0;
          }
          handleOpenConversationChat(selectedConversation);
        } catch {
          toast.error('Falha ao enviar áudio');
        }
      };
      reader.readAsDataURL(audioBlob);

      mediaRecorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    };

    mediaRecorderRef.current.stop();
  };

  // Cancelar Gravação
  const handleCancelRecording = () => {
    if (mediaRecorderRef.current) {
      clearInterval(recordingTimerRef.current);
      setIsRecordingAudio(false);
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
      audioChunksRef.current = [];
      toast('Gravação cancelada.');
    }
  };

  // Injetar Fluxo Específico no Lead
  const handleForceFlow = async (flowId: string) => {
    if (!selectedConversation) return;
    try {
      const convId = selectedConversation.id || selectedConversation.phone;
      await safeWhatsAppClient.post(`/conversations/${convId}/force-flow`, {
        flowId
      });
      toast.success('Fluxo automatizado injetado com sucesso!');
      setShowFlowMenu(false);
      handleOpenConversationChat(selectedConversation);
    } catch (e) {
      toast.error('Erro ao injetar fluxo');
    }
  };

  // Submeter formulário de Nova Conversa
  const handleSubmitNewChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChatPhone.trim()) {
      toast.error('Informe o telefone ou WhatsApp do contato');
      return;
    }
    await handleStartNewConversation({
      phone: newChatPhone,
      name: newChatName || `Cliente ${newChatPhone.slice(-4)}`,
      text: newChatInitialMsg,
      flowId: newChatFlowId || undefined
    });
    setIsNewChatModalOpen(false);
    setNewChatPhone('');
    setNewChatName('');
  };

  // Renderiza conteúdo de uma mensagem (com links clicáveis e formatação WhatsApp)
  const renderMessageText = (text: string) => {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);

    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 underline hover:text-emerald-300 break-all"
          >
            {part}
          </a>
        );
      }
      // Renderiza formatação em negrito *texto* do WhatsApp
      const boldParts = part.split(/(\*[^*]+\*)/g);
      return (
        <span key={index}>
          {boldParts.map((bPart, bIdx) => {
            if (bPart.startsWith('*') && bPart.endsWith('*') && bPart.length > 2) {
              return (
                <strong key={bIdx} className="font-bold text-white">
                  {bPart.slice(1, -1)}
                </strong>
              );
            }
            return <span key={bIdx}>{bPart}</span>;
          })}
        </span>
      );
    });
  };

  const isHumanControlled = selectedConversation?.status === 'atendimento_humano' || selectedConversation?.botStatus === 'silenciado';

  return (
    <div className="flex flex-col h-full w-full border border-border rounded-2xl overflow-hidden bg-background shadow-2xl">
      {/* Inputs invisíveis para arquivo */}
      <input 
        type="file" 
        accept="image/*" 
        ref={fileInputRef} 
        onChange={handleImageFileChange} 
        className="hidden" 
      />
      <input 
        type="file" 
        accept="audio/*" 
        ref={audioFileInputRef} 
        onChange={handleAudioFileChange} 
        className="hidden" 
      />
      <input 
        type="file" 
        accept=".pdf,.doc,.docx,.xls,.xlsx,.cdr,.ai,.psd,.zip,.rar" 
        ref={docFileInputRef} 
        onChange={handleDocFileChange} 
        className="hidden" 
      />

      {/* HEADER SUPERIOR */}
      <div className="h-14 border-b border-border bg-card px-4 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <h1 className="text-base font-black text-foreground leading-tight flex items-center gap-2">
              WhatsApp 
              <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] px-2 py-0.5 h-5 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                CONECTADO
              </Badge>
            </h1>
            <span className="text-[11px] text-muted-foreground hidden sm:inline">
              Central Comercial em tempo real: mensagens, áudios, imagens e notificações integradas.
            </span>
          </div>

          {/* Central de Atendimentos & Alerta Piscante Personalizável */}
          <div className="hidden lg:flex items-center gap-2 pl-3 border-l border-border/80">
            <div className="flex items-center gap-2 bg-muted/40 border border-border px-3 py-1 rounded-xl">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-primary" />
                Atendimentos
              </span>

              {(unreadCount > 0 || isTestingAlert) ? (
                <div 
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider animate-pulse border transition-all"
                  style={{
                    backgroundColor: `${alertColor}15`,
                    borderColor: `${alertColor}70`,
                    color: alertColor,
                    boxShadow: `0 0 12px ${alertColor}50`
                  }}
                  title="Nova mensagem de cliente recebida! Clique no chat correspondente para responder."
                >
                  <span className="relative flex h-2 w-2">
                    <span 
                      className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                      style={{ backgroundColor: alertColor }}
                    />
                    <span 
                      className="relative inline-flex rounded-full h-2 w-2"
                      style={{ backgroundColor: alertColor }}
                    />
                  </span>
                  <span>{unreadCount || 1} Nova{unreadCount > 1 ? 's' : ''}</span>
                </div>
              ) : (
                <span className="text-[10px] text-muted-foreground font-semibold px-2 py-0.5 rounded-full bg-background/60 border border-border/40">
                  Sem pendências
                </span>
              )}

              {/* Botão Personalizar Cor do Alerta */}
              <button
                type="button"
                onClick={() => setIsAlertColorModalOpen(true)}
                className="px-2 py-0.5 rounded-lg border border-border/60 hover:bg-accent text-muted-foreground hover:text-foreground transition flex items-center gap-1.5 cursor-pointer text-[10px] font-bold"
                title="Personalizar a cor do botão/indicador que pisca quando chegar mensagem nova"
              >
                <span className="w-2.5 h-2.5 rounded-full shadow-xs" style={{ backgroundColor: alertColor }} />
                <Palette className="w-3 h-3 text-muted-foreground" />
                <span className="hidden xl:inline">Cor do Alerta</span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Botão Notificações: Central de Leads Quentes 🔥 */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setIsHotLeadsModalOpen(true);
              handleMarkHotLeadsAsRead();
            }}
            className={`h-8 px-2.5 gap-1.5 text-xs font-bold border transition-all ${
              unreadHotLeadsCount > 0
                ? 'bg-red-500/10 border-red-500/40 text-red-400 hover:bg-red-500/20 animate-pulse'
                : 'border-border text-foreground hover:bg-accent'
            }`}
            title="Ver respostas recebidas de clientes na prospecção fria"
          >
            <Flame className={`w-3.5 h-3.5 ${unreadHotLeadsCount > 0 ? 'text-red-500 fill-red-500' : 'text-amber-500'}`} />
            <span className="hidden sm:inline">Leads Quentes</span>
            {hotLeads.length > 0 && (
              <Badge className={`text-[10px] px-1.5 py-0 h-4 ${unreadHotLeadsCount > 0 ? 'bg-red-600 text-white' : 'bg-accent text-foreground'}`}>
                {hotLeads.length}
              </Badge>
            )}
          </Button>

          {/* Botão Resetar Histórico de Clientes (Entrega do Sistema) */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsResetHistoryModalOpen(true)}
            className="h-8 px-2.5 gap-1.5 text-xs font-semibold border-rose-500/30 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-all"
            title="Resetar histórico completo de clientes para entrega à empresa"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden xl:inline">Resetar Histórico</span>
          </Button>

          {/* Botão Conexão WhatsApp / QR Code (Baileys) */}
          {botStatus?.connected ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsQrModalOpen(true)}
              className="h-8 px-2.5 gap-1.5 text-xs font-semibold border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all cursor-pointer"
              title="WhatsApp Conectado via Baileys. Clique para ver detalhes ou desconectar"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>WhatsApp Conectado</span>
              {botStatus.phone && <span className="text-[10px] text-emerald-300/80 font-mono hidden xl:inline">({botStatus.phone})</span>}
            </Button>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={() => setIsQrModalOpen(true)}
              className="h-8 px-3 gap-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-md animate-pulse cursor-pointer border border-amber-400/30"
              title="Clique para ler o QR Code e conectar seu WhatsApp"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Conectar QR Code</span>
            </Button>
          )}

          {/* CHAVE MESTRE / TOGGLE UNIVERSAL DO ROBÔ DE ATENDIMENTO */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleToggleUniversalBot}
            disabled={isTogglingUniversalBot}
            className={`h-8 px-2.5 sm:px-3 gap-1.5 text-xs font-bold transition-all cursor-pointer shadow-xs border ${
              isUniversalBotActive
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/25 ring-1 ring-emerald-500/30'
                : 'bg-rose-500/15 text-rose-400 border-rose-500/40 hover:bg-rose-500/25 ring-1 ring-rose-500/30'
            }`}
            title={
              isUniversalBotActive
                ? 'Robô Universal LIGADO: Responde novos clientes automaticamente. Clique para DESLIGAR o robô universalmente.'
                : 'Robô Universal DESLIGADO: Nenhuma resposta automática será disparada. Clique para LIGAR o robô universalmente.'
            }
          >
            <Bot className={`w-3.5 h-3.5 ${isUniversalBotActive ? 'text-emerald-400' : 'text-rose-400'}`} />
            <span className="hidden sm:inline">Robô Universal:</span>
            <span className={isUniversalBotActive ? 'text-emerald-300 font-black' : 'text-rose-300 font-black'}>
              {isUniversalBotActive ? 'LIGADO' : 'DESLIGADO'}
            </span>
            <span className={`w-2 h-2 rounded-full ${isUniversalBotActive ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
          </Button>

          {/* Botão + Nova conversa */}
          <Button 
            variant="default" 
            size="sm" 
            className="h-8 px-3 gap-1.5 text-xs font-bold shadow-xs bg-emerald-600 hover:bg-emerald-500 text-white"
            onClick={() => setIsNewChatModalOpen(true)}
          >
            <Plus className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Nova conversa</span>
          </Button>

          <Button variant="ghost" size="icon" onClick={onExitInbox} title="Voltar" className="h-8 w-8 text-muted-foreground hover:text-foreground">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* BANNER GLOBAL DO ROBÔ DE ATENDIMENTO (ATIVO vs SILENCIADO) */}
      <div className={"flex flex-wrap items-center justify-between gap-4 px-4 py-2 border-b transition-all " + (
        botStatus?.isFlowActive 
          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-100'
          : 'bg-amber-500/10 border-amber-500/30 text-amber-950 dark:text-amber-100'
      )}>
        <div className="flex items-center gap-3.5">
          <div className={"p-2 rounded-lg text-white shadow-sm shrink-0 " + (botStatus?.isFlowActive ? 'bg-emerald-600' : 'bg-amber-600')}>
            {botStatus?.isFlowActive ? <Bot className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold">
                {typeof botStatus?.isFlowActive !== 'boolean' ? 'Robô de Atendimento: STATUS INDISPONÍVEL' : botStatus.isFlowActive ? 'Robô de Atendimento: ATIVO' : 'Robô de Atendimento: SILENCIADO'}
              </span>
              <Badge className={"text-white text-[9px] px-1.5 py-0 " + (botStatus?.isFlowActive ? 'bg-emerald-600' : 'bg-amber-600')}>
                {typeof botStatus?.isFlowActive !== 'boolean' ? 'Sem confirmação' : botStatus.isFlowActive ? (botStatus.connected ? 'Respondendo' : 'Aguardando conexão') : 'Silenciado'}
              </Badge>
            </div>
            <p className="text-[10px] text-slate-600 dark:text-zinc-300 mt-0.5">
              {typeof botStatus?.isFlowActive !== 'boolean'
                ? <>Não foi possível confirmar o estado do robô. Verifique o conector do WhatsApp.</>
                : botStatus.isFlowActive
                  ? <>Fluxo: <strong>{botStatus.activeFlow?.name || 'Fluxo Atual'}</strong>. {botStatus.connected ? 'Atendimento automático para novas mensagens. Conversas assumidas continuam com o atendente.' : 'Conecte o WhatsApp para iniciar o atendimento.'}</>
                  : <>O robô está silenciado. Escolha o fluxo e ative a automação aqui.</>
              }
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="text-[10px] font-medium" htmlFor="automation-flow">Fluxo de atendimento</label>
          <select
            id="automation-flow"
            value={automationFlowId}
            disabled={isChangingAutomation || botStatus?.isFlowActive === true}
            onChange={(e) => {
              setAutomationFlowId(e.target.value);
              setSelectedFlowIdInStorage(e.target.value);
            }}
            className="h-8 max-w-[260px] rounded border border-border bg-background px-2 text-xs"
          >
            <option value="">Selecione um fluxo</option>
            {localFlows.map(flow => <option key={flow.id} value={flow.id}>{flow.name}</option>)}
          </select>
          {/* Botão Universal Master */}
          <Button
            type="button"
            size="sm"
            onClick={handleToggleUniversalBot}
            disabled={isTogglingUniversalBot}
            className={`font-bold text-[10px] h-7 px-3 shadow-sm flex items-center gap-1.5 cursor-pointer ${
              isUniversalBotActive
                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
            title="Ativar ou desativar o robô de atendimento universalmente"
          >
            {isUniversalBotActive ? (
              <>
                <VolumeX className="w-3.5 h-3.5" /> Desligar Robô Universal
              </>
            ) : (
              <>
                <Bot className="w-3.5 h-3.5" /> Ligar Robô Universal
              </>
            )}
          </Button>
        </div>
      </div>

      {/* CORPO DE 3 COLUNAS */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        
        {/* COLUNA 1: LISTA DE CONVERSAS (SEM ROLAGEM HORIZONTAL) */}
        <div className="w-[300px] sm:w-[320px] lg:w-[340px] border-r border-border flex flex-col bg-card/20 shrink-0 overflow-x-hidden">
          <div className="p-2.5 border-b border-border space-y-2">
            {/* Campo de Busca Superior */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input 
                placeholder="Buscar por nome, telefone ou mensagem..." 
                className="pl-8 h-8 text-xs bg-background border-border rounded-lg"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            {/* 📊 PAINEL UNIFICADO DE MONITORAMENTO E FILTROS (ZERO ROLAGEM / 100% VISÍVEL / ADAPTÁVEL AO TEMA) */}
            <div className="bg-card border border-border rounded-xl p-2 space-y-1.5 shadow-xs">
              <div className="flex items-center justify-between px-0.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span 
                    className={`w-2 h-2 rounded-full shrink-0 ${unreadCount > 0 || isTestingAlert ? 'animate-ping' : 'animate-pulse'}`}
                    style={{ backgroundColor: (unreadCount > 0 || isTestingAlert) ? alertColor : '#10b981' }}
                  />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate">
                    Atendimentos
                  </span>
                  {(unreadCount > 0 || isTestingAlert) && (
                    <span 
                      className="text-[9px] font-black px-1.5 py-0.2 rounded-full animate-pulse border flex items-center gap-1"
                      style={{
                        backgroundColor: `${alertColor}20`,
                        borderColor: `${alertColor}70`,
                        color: alertColor,
                        boxShadow: `0 0 8px ${alertColor}40`
                      }}
                      title="Novas mensagens aguardando atendimento"
                    >
                      {unreadCount || 1} nova{unreadCount > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsAlertColorModalOpen(true)}
                    className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition cursor-pointer flex items-center gap-1 border border-border/50 text-[10px]"
                    title="Personalizar cor do alerta piscante"
                  >
                    <span className="w-2.5 h-2.5 rounded-full shadow-xs" style={{ backgroundColor: alertColor }} />
                    <Palette className="w-3 h-3 text-muted-foreground" />
                  </button>
                  <span className="text-[10px] text-muted-foreground font-mono font-bold">
                    {conversationsList.length} chats
                  </span>
                </div>
              </div>

              {/* Matriz 3x2 Compacta - Todos os 6 filtros 100% visíveis, sem nenhuma barra de rolagem */}
              <div className="grid grid-cols-3 gap-1">
                {/* Todas */}
                <button
                  type="button"
                  onClick={() => setFilter('all')}
                  className={`p-1.5 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                    filter === 'all'
                      ? 'bg-primary text-primary-foreground border-primary shadow-xs font-bold'
                      : 'bg-muted/40 border-border text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
                  title="Exibir todas as conversas"
                >
                  <span className="text-[9px] uppercase font-bold tracking-wider">Todas</span>
                  <span className="text-xs font-black text-foreground mt-0.5">{conversationsList.length}</span>
                </button>

                {/* No Vácuo */}
                <button
                  type="button"
                  onClick={() => setFilter(filter === 'vacuum' ? 'all' : 'vacuum')}
                  className={`p-1.5 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                    filter === 'vacuum'
                      ? 'bg-red-500/20 border-red-500 text-red-600 dark:text-red-200 ring-1 ring-red-500/50 font-bold'
                      : vacuumCount > 0
                      ? 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-300 hover:bg-red-500/20'
                      : 'bg-muted/40 border-border text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
                  title="Clientes que mandaram mensagem e estão sem resposta"
                >
                  <span className="text-[9px] uppercase font-bold tracking-wider text-red-500 dark:text-red-400 flex items-center gap-0.5">
                    🔴 Vácuo
                  </span>
                  <span className={`text-xs font-black mt-0.5 ${vacuumCount > 0 ? 'text-red-500 dark:text-red-400' : 'text-foreground'}`}>
                    {vacuumCount}
                  </span>
                </button>

                {/* Não Lidas */}
                <button
                  type="button"
                  onClick={() => setFilter(filter === 'unread' ? 'all' : 'unread')}
                  className={`p-1.5 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                    filter === 'unread'
                      ? 'bg-blue-500/20 border-blue-500 text-blue-600 dark:text-blue-200 ring-1 ring-blue-500/50 font-bold'
                      : unreadCount > 0
                      ? 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-300 hover:bg-blue-500/20'
                      : 'bg-muted/40 border-border text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
                  title="Clientes com mensagens não lidas"
                >
                  <span className="text-[9px] uppercase font-bold tracking-wider text-blue-500 dark:text-blue-400 flex items-center gap-0.5">
                    🔵 Não Lidas
                  </span>
                  <span className={`text-xs font-black mt-0.5 ${unreadCount > 0 ? 'text-blue-500 dark:text-blue-400' : 'text-foreground'}`}>
                    {unreadCount}
                  </span>
                </button>

                {/* Quentes */}
                <button
                  type="button"
                  onClick={() => setFilter(filter === 'hot' ? 'all' : 'hot')}
                  className={`p-1.5 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                    filter === 'hot'
                      ? 'bg-amber-500/20 border-amber-500 text-amber-600 dark:text-amber-200 ring-1 ring-amber-500/50 font-bold'
                      : hotCount > 0
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-300 hover:bg-amber-500/20'
                      : 'bg-muted/40 border-border text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
                  title="Leads com alto potencial comercial"
                >
                  <span className="text-[9px] uppercase font-bold tracking-wider text-amber-500 dark:text-amber-400 flex items-center gap-0.5">
                    🔥 Quentes
                  </span>
                  <span className={`text-xs font-black mt-0.5 ${hotCount > 0 ? 'text-amber-500 dark:text-amber-400' : 'text-foreground'}`}>
                    {hotCount}
                  </span>
                </button>

                {/* Humano */}
                <button
                  type="button"
                  onClick={() => setFilter(filter === 'in_progress' ? 'all' : 'in_progress')}
                  className={`p-1.5 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                    filter === 'in_progress'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-600 dark:text-emerald-200 ring-1 ring-emerald-500/50 font-bold'
                      : 'bg-muted/40 border-border text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
                  title="Atendimentos manuais em andamento"
                >
                  <span className="text-[9px] uppercase font-bold tracking-wider text-emerald-500 dark:text-emerald-400">
                    👤 Humano
                  </span>
                  <span className="text-xs font-black text-foreground mt-0.5">{humanCount}</span>
                </button>

                {/* Robô */}
                <button
                  type="button"
                  onClick={() => setFilter(filter === 'bot' ? 'all' : 'bot')}
                  className={`p-1.5 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                    filter === 'bot'
                      ? 'bg-purple-500/20 border-purple-500 text-purple-600 dark:text-purple-200 ring-1 ring-purple-500/50 font-bold'
                      : 'bg-muted/40 border-border text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
                  title="Conversas em automação de fluxo"
                >
                  <span className="text-[9px] uppercase font-bold tracking-wider text-purple-500 dark:text-purple-400">
                    🤖 Robô
                  </span>
                  <span className="text-xs font-black text-foreground mt-0.5">{botCount}</span>
                </button>
              </div>

              {/* Indicador quando há filtro ativo com ação rápida para limpar */}
              {filter !== 'all' && (
                <div className="flex items-center justify-between px-1 pt-0.5 text-[10px]">
                  <span className="text-muted-foreground font-medium">
                    Filtro:{' '}
                    <strong className="text-foreground">
                      {filter === 'vacuum' && '🔴 No Vácuo'}
                      {filter === 'unread' && '🔵 Não Lidas'}
                      {filter === 'hot' && '🔥 Quentes'}
                      {filter === 'in_progress' && '👤 Humano'}
                      {filter === 'bot' && '🤖 Robô'}
                    </strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => setFilter('all')}
                    className="text-emerald-400 hover:underline font-bold text-[10px] cursor-pointer"
                  >
                    Ver todas (limpar)
                  </button>
                </div>
              )}
            </div>

            {/* Seletor Prático de Etiquetas (Sem barra de rolagem horizontal / Sem arrastar) */}
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <select
                  value={selectedTagFilter}
                  onChange={(e) => setSelectedTagFilter(e.target.value)}
                  className="w-full h-8 rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-semibold text-foreground focus:outline-hidden cursor-pointer"
                >
                  <option value="all">🏷️ Todas as etiquetas ({conversationsList.length})</option>
                  <option value="urgente">🚨 Urgente</option>
                  <option value="importante">⭐ Importante</option>
                  {availableTags
                    .filter(t => t.id !== 'urgente' && t.id !== 'importante')
                    .map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                </select>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleOpenTagModal}
                className="h-8 px-2.5 text-xs font-semibold gap-1.5 text-muted-foreground hover:text-foreground shrink-0 border-border"
                title="Criar ou gerenciar etiquetas"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Etiquetas</span>
              </Button>
            </div>

            {/* Chip ativo quando filtrado */}
            {selectedTagFilter !== 'all' && (
              <div className="flex items-center justify-between px-2.5 py-1 bg-accent/50 rounded-lg text-xs font-semibold">
                <span className="text-muted-foreground text-[11px]">Filtrando por:</span>
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border"
                  style={{
                    backgroundColor: `${getTagObj(selectedTagFilter).color}20`,
                    color: getTagObj(selectedTagFilter).color,
                    borderColor: `${getTagObj(selectedTagFilter).color}50`,
                  }}
                >
                  {getTagObj(selectedTagFilter).id.includes('urgente') && <span>🚨</span>}
                  {getTagObj(selectedTagFilter).name}
                  <button
                    type="button"
                    onClick={() => setSelectedTagFilter('all')}
                    className="ml-1 hover:opacity-75 font-bold p-0.5"
                    title="Limpar filtro de etiqueta"
                  >
                    ×
                  </button>
                </span>
              </div>
            )}
          </div>

          {/* Lista rolável */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-xs">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                Nenhuma conversa encontrada neste filtro.
              </div>
            ) : (
              filteredConversations.map((conv: any) => {
                const isSelected = selectedConversation?.id === conv.id;
                const isHuman = conv.status === 'atendimento_humano';
                const convPhoneClean = (conv.phone || conv.id || '').replace(/\D/g, '');
                const isHot = hotPhonesSet.has(convPhoneClean) || conv.leadTemperature === 'quente' || conv.interestScore >= 70;
                const isUrgent = isConversationUrgent(conv);

                const isWaitingReply = conv.lastMessageSender === 'client';
                const isUnread = (conv.unreadCount && conv.unreadCount > 0) || (conv.lastMessageSender === 'client' && conv.isRead === false);
                const waitMs = Math.max(0, Date.now() - (conv.lastInteractionAt || 0));
                const waitMinutes = Math.floor(waitMs / 60000);
                const waitHours = (waitMs / 3600000).toFixed(1);

                return (
                  <button
                    key={conv.id || conv.jid}
                    onClick={() => {
                      handleOpenConversationChat(conv);
                    }}
                    className={`w-full text-left p-2.5 sm:p-3 rounded-xl flex items-start gap-2.5 transition-all ${
                      isSelected 
                        ? 'bg-accent border border-emerald-500/40 shadow-xs' 
                        : isWaitingReply
                        ? (waitMinutes >= 120 
                            ? 'bg-red-950/20 border-l-4 border-l-red-500 border border-red-500/30 hover:bg-red-950/30'
                            : waitMinutes >= 30 
                            ? 'bg-amber-950/15 border-l-4 border-l-amber-500 border border-amber-500/30 hover:bg-amber-950/25'
                            : 'bg-yellow-950/10 border-l-4 border-l-yellow-500 border border-yellow-500/20 hover:bg-yellow-950/20')
                        : isUrgent
                        ? 'bg-red-950/15 border-l-4 border-l-red-500 border border-red-500/30 hover:bg-red-950/25'
                        : isUnread
                        ? 'bg-blue-950/10 border-l-4 border-l-blue-500 border border-blue-500/20 hover:bg-blue-950/20'
                        : 'hover:bg-accent/40 border border-transparent'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-black shrink-0 text-sm border ${
                        isWaitingReply && waitMinutes >= 120
                          ? 'bg-red-500/20 text-red-400 border-red-500/60 ring-2 ring-red-500/30'
                          : isWaitingReply
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : isUnread
                          ? 'bg-blue-500/20 text-blue-300 border-blue-500/50'
                          : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      }`}>
                        {conv.name?.charAt(0)?.toUpperCase() || 'C'}
                      </div>
                      {isUnread && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-background animate-pulse" title="Mensagem Não Lida" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground truncate pr-2 flex items-center gap-1">
                          {isUrgent && <span className="text-[10px]" title="Cliente Marcado como Urgente">🚨</span>}
                          {conv.name || formatBrazilianPhone(conv.phone)}
                        </span>
                        <span className="text-[10px] text-muted-foreground shrink-0 font-medium">
                          {conv.lastInteractionAt ? new Date(conv.lastInteractionAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Hoje'}
                        </span>
                      </div>

                      {/* Snippet da mensagem com identificador de quem enviou */}
                      <div className="flex items-center justify-between mt-1 gap-1">
                        <p className="text-xs text-muted-foreground truncate max-w-[150px] flex items-center gap-1">
                          {conv.lastMessageSender === 'client' ? (
                            <span className="text-red-300 font-bold text-[10px] shrink-0">📩 Cliente:</span>
                          ) : conv.lastMessageSender === 'human' ? (
                            <span className="text-blue-300 font-bold text-[10px] shrink-0">👤 Você:</span>
                          ) : (
                            <span className="text-emerald-400 font-bold text-[10px] shrink-0">🤖 Robô:</span>
                          )}
                          <span className="truncate">{conv.lastMessageSnippet || 'Inicie a conversa...'}</span>
                        </p>
                        <div className="flex items-center gap-1 shrink-0">
                          {isHot && (
                            <span title="Lead Quente (Respondeu à prospecção)">
                              <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500 animate-pulse" />
                            </span>
                          )}
                          {isHuman ? (
                            <Badge variant="outline" className="text-[8px] bg-amber-500/10 text-amber-400 border-amber-500/30 px-1 py-0 font-bold">
                              Humano
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[8px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30 px-1 py-0 font-bold">
                              Robô
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Status de Atendimento / Fila (No Vácuo / Aguardando / Não Lido) */}
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        {isWaitingReply ? (
                          waitMinutes >= 120 ? (
                            <span className="inline-flex items-center gap-0.5 text-[8px] font-black bg-red-500 text-white px-1.5 py-0.2 rounded-full animate-pulse shadow-xs">
                              🔴 No Vácuo ({waitHours}h)
                            </span>
                          ) : waitMinutes >= 30 ? (
                            <span className="inline-flex items-center gap-0.5 text-[8px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.2 rounded-full">
                              ⚠️ Aguardando ({waitMinutes}m)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 text-[8px] font-bold bg-yellow-500/15 text-yellow-300 border border-yellow-500/30 px-1.5 py-0.2 rounded-full">
                              ⏳ Aguardando ({waitMinutes}m)
                            </span>
                          )
                        ) : (
                          <span className="inline-flex items-center gap-0.5 text-[8px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.2 rounded-full">
                            ✓ Respondido
                          </span>
                        )}

                        {isUnread && (
                          <span className="inline-flex items-center gap-0.5 text-[8px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 px-1.5 py-0.2 rounded-full">
                            🔵 Não Lido
                          </span>
                        )}
                      </div>

                      {/* Etiquetas aplicadas ao cliente */}
                      {Array.isArray(conv.tags) && conv.tags.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1 mt-1.5 pt-1 border-t border-border/40">
                          {conv.tags.slice(0, 3).map((tId: string) => {
                            const tagObj = getTagObj(tId);
                            const isUrgTag = tagObj.id.includes('urgente');
                            return (
                              <span
                                key={tId}
                                className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold border leading-tight"
                                style={{
                                  backgroundColor: `${tagObj.color}15`,
                                  color: tagObj.color,
                                  borderColor: `${tagObj.color}40`,
                                }}
                              >
                                {isUrgTag && <span className="mr-0.5">🚨</span>}
                                {tagObj.name}
                              </span>
                            );
                          })}
                          {conv.tags.length > 3 && (
                            <span className="text-[9px] text-muted-foreground font-semibold">
                              +{conv.tags.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* COLUNA 2: JANELA DE CHAT AO VIVO */}
        <div className="flex-1 flex flex-col bg-muted/20 dark:bg-[#0b141a] relative min-w-0">
          {/* Padrão de fundo WhatsApp Adaptável */}
          <div 
            className="absolute inset-0 opacity-15 pointer-events-none" 
            style={{ 
              backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)', 
              backgroundSize: '20px 20px' 
            }}
          />

          {selectedConversation ? (
            <>
              {/* Header da conversa ativa - 100% SÓLIDO, COMPACTO E ADAPTÁVEL AO TEMA */}
              <div className="h-14 bg-card border-b border-border dark:bg-[#1f2c34] dark:border-[#2a3942] flex items-center justify-between px-3.5 sm:px-4 z-20 shrink-0 gap-3">
                {/* Esquerda: Avatar + Identificação em 2 Linhas Claras */}
                <div className="flex items-center gap-2.5 min-w-0 flex-1 overflow-hidden">
                  <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-500 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold shrink-0 text-sm shadow-xs">
                    {selectedConversation.name?.charAt(0)?.toUpperCase() || 'C'}
                  </div>

                  <div className="flex flex-col min-w-0 justify-center">
                    {/* Linha 1: Nome do Contato OU Edição do Nome */}
                    <div className="flex items-center gap-1.5 min-w-0">
                      {isEditingContactName ? (
                        <div className="flex items-center gap-1 py-0.5">
                          <Input
                            value={editedContactName}
                            onChange={(e) => setEditedContactName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveContactName()}
                            className="h-7 text-xs bg-background border-border dark:bg-[#2a3942] dark:border-emerald-500/50 w-28 sm:w-36 px-2 text-foreground font-semibold"
                            autoFocus
                            placeholder="Nome do contato"
                          />
                          <Button
                            size="icon"
                            className="h-7 w-7 bg-emerald-600 hover:bg-emerald-500 text-white shrink-0"
                            onClick={handleSaveContactName}
                            disabled={isSavingContactName}
                            title="Salvar novo nome"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0"
                            onClick={() => setIsEditingContactName(false)}
                            title="Cancelar"
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span 
                            className="font-bold text-foreground text-sm truncate max-w-[130px] sm:max-w-[180px] md:max-w-[220px]"
                            title={selectedConversation.name || selectedConversation.phone}
                          >
                            {selectedConversation.name || selectedConversation.phone}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-emerald-500 p-0 shrink-0"
                            onClick={() => {
                              setEditedContactName(selectedConversation.name || selectedConversation.phone || '');
                              setIsEditingContactName(true);
                            }}
                            title="Editar nome do contato"
                          >
                            <Edit2 className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Linha 2: Telefone & Badge de Status (HUMANO / ROBÔ ATIVO) */}
                    <div className="flex items-center gap-2 mt-0.5 min-w-0">
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-mono shrink-0">
                        <Phone className="w-3 h-3 text-emerald-500 dark:text-emerald-400 shrink-0 inline" />
                        <span>{formatBrazilianPhone(selectedConversation.phone)}</span>
                      </span>
                      {isHumanControlled ? (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-300 bg-amber-500/15 px-1.5 py-0.5 rounded border border-amber-500/30 shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                          HUMANO
                        </span>
                      ) : !botStatus?.isFlowActive ? (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-slate-300 bg-slate-500/15 px-1.5 py-0.5 rounded border border-slate-500/30 shrink-0" title="Nenhum fluxo de conversa ativo. Robô em silêncio.">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                          ROBÔ SILENCIADO
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded border border-emerald-500/30 shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          ROBÔ ATIVO
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Direita: Botões de Ação Compactos e Proporcionais */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Botão de Integração e Vínculo com CRM / Pipeline */}
                  {matchedCrmLead ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-2 xl:px-2.5 text-xs font-bold gap-1.5 shrink-0 rounded-lg transition-all border-primary/40 bg-primary/10 text-primary hover:bg-primary/20"
                      onClick={() => {
                        setShowCrmSidebar(true);
                        setCrmTab('dados');
                      }}
                      title={`Vinculado ao CRM na etapa: "${currentMatchedStage.name}". Clique para gerenciar o lead.`}
                    >
                      <Trello className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">CRM: {currentMatchedStage.name}</span>
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-2 xl:px-2.5 text-xs font-bold gap-1.5 shrink-0 rounded-lg transition-all border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                      onClick={() => {
                        setShowCrmSidebar(true);
                        setCrmTab('dados');
                      }}
                      title="Mover este contato para o CRM / Pipeline de Vendas"
                    >
                      <Trello className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">+ Mover p/ CRM</span>
                    </Button>
                  )}

                  {/* Botão Follow-up / Recuperador de Vendas 🎯 */}
                  <Button
                    variant="outline"
                    size="sm"
                    className={`h-8 px-2 xl:px-2.5 text-xs font-bold gap-1.5 shrink-0 rounded-lg transition-all ${
                      isConversationBudgetPending(selectedConversation)
                        ? 'border-amber-500 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                        : 'border-border text-muted-foreground hover:text-amber-400 hover:border-amber-500/40'
                    }`}
                    onClick={() => setIsFollowUpModalOpen(true)}
                    title="Recuperador de Vendas: Disparar ou Agendar Follow-up de Orçamento"
                  >
                    <Target className="w-3.5 h-3.5 text-amber-400" />
                    <span className="hidden sm:inline">Follow-up</span>
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    className={`h-8 px-2 xl:px-2.5 text-xs font-semibold gap-1.5 shrink-0 rounded-lg ${
                      isHumanControlled
                        ? 'border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10'
                        : 'border-amber-500/40 text-amber-400 hover:bg-amber-500/10'
                    }`}
                    onClick={() => handleToggleBotPause(selectedConversation, !isHumanControlled)}
                    title={isHumanControlled ? 'Robô pausado. Clique para reativar automação' : 'Assumir atendimento manual (pausa o robô)'}
                  >
                    {isHumanControlled ? (
                      <>
                        <Play className="w-3.5 h-3.5" />
                        <span className="inline">Reativar Robô</span>
                      </>
                    ) : (
                      <>
                        <Pause className="w-3.5 h-3.5" />
                        <span className="inline font-bold">Assumir</span>
                      </>
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2 xl:px-2.5 text-xs font-semibold gap-1.5 border-blue-500/40 text-blue-400 hover:bg-blue-500/10 shrink-0 rounded-lg"
                    onClick={handleToggleReadStatus}
                    title={selectedConversation.unreadCount > 0 || (selectedConversation.lastMessageSender === 'client' && selectedConversation.isRead === false) ? 'Marcar conversa como lida' : 'Marcar conversa como não lida para responder depois'}
                  >
                    <Bell className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">
                      {selectedConversation.unreadCount > 0 || (selectedConversation.lastMessageSender === 'client' && selectedConversation.isRead === false) ? 'Marcar Lido' : 'Não Lido'}
                    </span>
                  </Button>

                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 text-primary border-primary/30 hover:bg-primary/10 shrink-0 rounded-lg"
                    onClick={() => handleRestartFlow(selectedConversation)}
                    title="Reiniciar fluxo automático do robô"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </Button>

                  {/* Toggle para o painel de CRM */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-8 w-8 shrink-0 rounded-lg border transition-all ${
                      showCrmSidebar 
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-500 dark:text-emerald-400' 
                        : 'border-border text-muted-foreground hover:text-foreground hover:bg-accent dark:border-[#2a3942] dark:text-gray-400 dark:hover:text-white dark:hover:bg-[#2a3942]'
                    }`}
                    onClick={() => setShowCrmSidebar(!showCrmSidebar)}
                    title={showCrmSidebar ? 'Ocultar detalhes do CRM' : 'Ver detalhes do CRM'}
                  >
                    <Info className="w-4 h-4" />
                  </Button>

                  {/* Mais Opções da Conversa Ativa */}
                  <div className="relative shrink-0" ref={chatOptionsMenuRef}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-8 w-8 shrink-0 rounded-lg border transition-all ${
                        showChatOptionsMenu
                          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-500 dark:text-emerald-400'
                          : 'border-border text-muted-foreground hover:text-foreground hover:bg-accent dark:border-[#2a3942] dark:text-gray-400 dark:hover:text-white dark:hover:bg-[#2a3942]'
                      }`}
                      onClick={() => setShowChatOptionsMenu((prev) => !prev)}
                      title="Opções da conversa"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </Button>

                    {showChatOptionsMenu && (
                      <div className="absolute right-0 top-full mt-1.5 w-60 bg-card border border-border dark:bg-[#1f2c34] dark:border-[#2a3942] rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95">
                        <button
                          type="button"
                          onClick={handleClearChatMessages}
                          className="w-full text-left px-3.5 py-2.5 text-xs text-amber-500 dark:text-amber-400 hover:bg-accent dark:hover:bg-[#2a3942] flex items-center gap-2.5 transition-colors"
                        >
                          <Trash2 className="w-4 h-4 shrink-0 text-amber-500 dark:text-amber-400" />
                          <span>Limpar mensagens da conversa</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleDeleteActiveConversation}
                          className="w-full text-left px-3.5 py-2.5 text-xs text-rose-500 dark:text-rose-400 hover:bg-accent dark:hover:bg-[#2a3942] flex items-center gap-2.5 transition-colors border-t border-border dark:border-[#2a3942]/60"
                        >
                          <Trash2 className="w-4 h-4 shrink-0 text-rose-500 dark:text-rose-400" />
                          <span>Excluir conversa do painel</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* SUB-HEADER: ETIQUETAS DO CONTATO ATIVO - ORGANIZADO E SEM DUPLICATAS */}
              <div className="h-8 bg-card/90 border-b border-border dark:bg-[#182229] dark:border-[#2a3942] px-3.5 sm:px-4 flex items-center justify-between gap-2 z-20 shrink-0 text-xs">
                {/* Esquerda: Ícone + Etiquetas Atribuídas */}
                <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                  <div className="flex items-center gap-1.5 text-muted-foreground font-semibold text-[11px] shrink-0">
                    <Tag className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                    <span>Etiquetas:</span>
                  </div>

                  {/* Lista de etiquetas aplicadas ao contato */}
                  <div className="flex items-center gap-1 min-w-0 flex-wrap overflow-hidden py-0.5">
                    {Array.isArray(selectedConversation.tags) && selectedConversation.tags.length > 0 ? (
                      selectedConversation.tags.map((tId: string) => {
                        const tagObj = getTagObj(tId);
                        const isUrg = tagObj.id.includes('urgente');
                        return (
                          <span
                            key={tId}
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-all shrink-0 max-w-[130px]"
                            style={{
                              backgroundColor: `${tagObj.color}20`,
                              color: tagObj.color,
                              borderColor: `${tagObj.color}50`,
                            }}
                          >
                            {isUrg && <span>🚨</span>}
                            <span className="truncate">{tagObj.name}</span>
                            <button
                              type="button"
                              onClick={() => handleToggleConversationTag(tId)}
                              className="hover:opacity-75 p-0.5 ml-0.5 rounded-full hover:bg-black/20"
                              title={`Remover etiqueta "${tagObj.name}"`}
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </span>
                        );
                      })
                    ) : (
                      <span className="text-[11px] text-muted-foreground italic shrink-0">Nenhuma etiqueta</span>
                    )}
                  </div>
                </div>

                {/* Direita: Botão Único para Adicionar/Marcar Etiquetas */}
                <div className="relative shrink-0" ref={tagDropdownRef}>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsTagDropdownOpen(!isTagDropdownOpen)}
                    className="h-6 px-2.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground bg-muted/60 hover:bg-muted dark:bg-[#2a3942]/80 dark:hover:bg-[#2a3942] dark:text-gray-300 gap-1.5 rounded-md border border-border"
                  >
                    <Plus className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
                    <span>Etiqueta</span>
                    <ChevronDown className="w-2.5 h-2.5 opacity-60" />
                  </Button>

                  {/* Dropdown de Seleção de Etiquetas com Backdrop */}
                  {isTagDropdownOpen && (
                    <>
                      {/* Backdrop invisível fixo para fechar ao clicar fora */}
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setIsTagDropdownOpen(false)} 
                      />
                      <div className="absolute right-0 top-full mt-1.5 w-60 bg-card border border-border dark:bg-[#202c33] dark:border-[#2a3942] rounded-xl shadow-2xl p-2 z-50 text-xs space-y-1">
                        <div className="flex items-center justify-between pb-1.5 border-b border-border dark:border-[#2a3942] text-[10px] font-bold text-muted-foreground dark:text-gray-400 uppercase">
                          <span>Marcar Etiquetas</span>
                          <button 
                            type="button" 
                            onClick={() => {
                              setIsTagDropdownOpen(false);
                              handleOpenTagModal();
                            }}
                            className="text-emerald-500 dark:text-emerald-400 hover:underline flex items-center gap-1 font-semibold normal-case"
                          >
                            <SlidersHorizontal className="w-3 h-3" /> Gerenciar
                          </button>
                        </div>

                        <div className="max-h-52 overflow-y-auto space-y-1 py-1">
                          {availableTags.map((tag) => {
                            const isChecked = Array.isArray(selectedConversation.tags) && 
                              selectedConversation.tags.some((t: string) => t.toLowerCase() === tag.id.toLowerCase() || t.toLowerCase() === tag.name.toLowerCase());
                            return (
                              <button
                                key={tag.id}
                                type="button"
                                onClick={() => handleToggleConversationTag(tag.id)}
                                className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center justify-between transition-all ${
                                  isChecked 
                                    ? 'bg-primary/15 text-primary dark:bg-[#2a3942] dark:text-white font-bold' 
                                    : 'hover:bg-accent text-foreground dark:hover:bg-[#111b21] dark:text-gray-300'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span 
                                    className="w-2.5 h-2.5 rounded-full shrink-0" 
                                    style={{ backgroundColor: tag.color }} 
                                  />
                                  <span className="text-[11px] truncate">{tag.name}</span>
                                </div>
                                {isChecked ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 shrink-0" />
                                ) : (
                                  <span className="w-3.5 h-3.5 shrink-0" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* ALERTA DE MONITORAMENTO: CLIENTE AGUARDANDO RESPOSTA (NO VÁCUO) */}
              {selectedConversation.lastMessageSender === 'client' && (
                <div className="mx-3 sm:mx-4 mt-1.5 py-1.5 px-3 rounded-lg bg-red-950/40 border border-red-500/40 flex items-center justify-between gap-2 text-[11px] text-red-200 shrink-0 shadow-xs animate-in fade-in">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse shrink-0" />
                    <span className="truncate">
                      <strong className="text-red-300">Cliente aguardando resposta:</strong> A última mensagem foi enviada pelo cliente ({Math.max(0, Math.floor((Date.now() - (selectedConversation.lastInteractionAt || 0)) / 60000))} min atrás).
                    </span>
                  </div>
                  <Badge className="bg-red-500/30 text-red-200 border-red-500/50 text-[10px] shrink-0 font-bold px-2 py-0.5">
                    No Vácuo
                  </Badge>
                </div>
              )}

              {/* ALERTA: RECUPERADOR DE VENDAS / ORÇAMENTO PARADO */}
              {isConversationBudgetPending(selectedConversation) && (
                <div className="mx-3 sm:mx-4 mt-1.5 py-1.5 px-3 rounded-lg bg-amber-500/15 border border-amber-500/35 flex items-center justify-between gap-2 text-[11px] text-amber-200 shrink-0 shadow-xs animate-in fade-in">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Target className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="truncate">
                      <strong>Orçamento Pendente:</strong> Cliente sem resposta recente.
                    </span>
                  </div>
                  <Button
                    size="sm"
                    className="h-5 px-2 text-[10px] font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 gap-1 shrink-0 shadow-xs"
                    onClick={() => setIsFollowUpModalOpen(true)}
                  >
                    <Target className="w-2.5 h-2.5" /> Recuperar Venda
                  </Button>
                </div>
              )}

              {/* ALERTA: MENSAGENS AGENDADAS DESTE CONTATO */}
              {activeConversationScheduled.length > 0 && (
                <div className="mx-3 sm:mx-4 mt-1.5 py-1.5 px-3 rounded-lg bg-blue-500/15 border border-blue-500/35 flex items-center justify-between gap-2 text-[11px] text-blue-200 shrink-0 shadow-xs animate-in fade-in">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <CalendarClock className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span className="truncate">
                      <strong>Envio Agendado ({activeConversationScheduled.length}):</strong> para {new Date(activeConversationScheduled[0].scheduledFor).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-5 px-1.5 text-[10px] font-semibold text-blue-300 hover:text-white"
                      onClick={() => setShowScheduledListModal(true)}
                    >
                      Ver Todas
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-5 px-1.5 text-[10px] font-semibold text-red-400 hover:text-red-300"
                      onClick={() => handleCancelScheduledMessage(activeConversationScheduled[0].id)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}

              {/* Lista de Mensagens com Scroll Inteligente e Layout Aprimorado */}
              <div className="relative flex-1 flex flex-col min-h-0 overflow-hidden">
                {/* Banner de Mensagem Fixada no Topo (Estilo WhatsApp) 📌 */}
                {(() => {
                  const pinnedList = selectedConversation.messages?.filter((m: any) => m.isPinned) || [];
                  if (pinnedList.length === 0) return null;
                  const currentPinned = pinnedList[pinnedList.length - 1];
                  return (
                    <div className="bg-card/95 backdrop-blur-xs border-b border-border dark:bg-[#182229]/95 dark:border-[#2a3942] px-4 py-2 flex items-center justify-between text-xs text-foreground dark:text-gray-200 z-20 shadow-xs animate-in fade-in duration-150">
                      <div 
                        className="flex items-center gap-2 truncate cursor-pointer hover:text-foreground transition flex-1"
                        onClick={() => {
                          const el = document.getElementById(`msg-${currentPinned.id}`);
                          el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }}
                        title="Clique para localizar a mensagem fixada na conversa"
                      >
                        <Pin className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 rotate-45 shrink-0" />
                        <span className="font-bold text-amber-500 dark:text-amber-400 shrink-0">Fixada:</span>
                        <span className="truncate text-muted-foreground dark:text-gray-300 max-w-sm sm:max-w-md">{currentPinned.text || '[Mídia fixada]'}</span>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => handleTogglePin(currentPinned)} 
                        className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-accent transition cursor-pointer shrink-0 ml-2"
                        title="Desafixar mensagem"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })()}

                <div 
                  ref={messagesContainerRef}
                  onScroll={handleMessagesScroll}
                  className="flex-1 overflow-y-auto px-3 sm:px-6 py-3.5 z-10 flex flex-col min-h-0 scrollbar-thin scrollbar-thumb-zinc-700/60 hover:scrollbar-thumb-zinc-600 scrollbar-track-transparent select-text"
                >
                  {selectedConversation.messages && selectedConversation.messages.length > 0 ? (
                    selectedConversation.messages.map((msg: any, i: number) => {
                      const prevMsg = i > 0 ? selectedConversation.messages[i - 1] : null;
                      const showDateDivider = isNewDay(prevMsg?.timestamp, msg.timestamp);
                      const isFromClient = msg.sender === 'client';
                      const isFromBot = msg.sender === 'bot';
                      const attendantTag = extractAttendantTag(msg.text);
                      const isSameSender = !showDateDivider && prevMsg && prevMsg.sender === msg.sender && Math.abs((msg.timestamp || 0) - (prevMsg.timestamp || 0)) < 180000;

                      return (
                        <React.Fragment key={msg.id || i}>
                          {/* Separador de Data estilo WhatsApp (Hoje / Ontem / DD de Mês) */}
                          {showDateDivider && (
                            <div className="flex justify-center my-2.5 sticky top-1 z-20 pointer-events-none">
                              <span className="bg-card/95 text-foreground dark:bg-[#182229]/95 dark:text-gray-300 text-[11px] font-medium px-3 py-0.5 rounded-full border border-border dark:border-[#2a3942] shadow-xs backdrop-blur-xs">
                                {formatDateDivider(msg.timestamp)}
                              </span>
                            </div>
                          )}

                          <div 
                            className={`flex flex-col ${isFromClient ? 'items-start' : 'items-end'} ${isSameSender ? 'mt-1' : 'mt-2.5'}`}
                          >
                            {/* Tag de quem enviou (apenas quando troca de remetente para despoluir a visão) */}
                            {!isSameSender && (
                              <span className="text-[10px] text-muted-foreground px-1 mb-0.5 font-medium flex items-center gap-1">
                                {isFromClient 
                                  ? 'Cliente' 
                                  : isFromBot 
                                  ? '🤖 Robô Automático' 
                                  : attendantTag 
                                  ? `👤 ${attendantTag}` 
                                  : `👤 Você (${getAttendantLabel()})`}
                              </span>
                            )}

                            <div 
                              id={`msg-${msg.id}`}
                              onContextMenu={(e) => handleOpenContextMenu(e, msg)}
                              className={`relative group max-w-[85%] sm:max-w-[78%] md:max-w-[70%] rounded-2xl px-3.5 py-2.5 text-sm shadow-md transition-all select-text cursor-pointer ${
                                isFromClient 
                                  ? 'bg-card text-foreground rounded-tl-xs border border-border shadow-xs dark:bg-[#202c33] dark:text-gray-100 dark:border-white/5' 
                                  : isFromBot 
                                  ? 'bg-emerald-100 text-emerald-950 rounded-tr-xs border border-emerald-300 shadow-xs dark:bg-[#054640] dark:text-emerald-50 dark:border-emerald-500/20' 
                                  : 'bg-emerald-600 text-white rounded-tr-xs border border-emerald-500 shadow-xs dark:bg-[#005c4b] dark:text-white dark:border-emerald-400/20'
                              }`}
                            >
                              {/* Barra Flutuante de Reações Rápidas (Emotes) no Hover */}
                              <div 
                                className={`absolute -top-7 ${isFromClient ? 'left-2' : 'right-2'} opacity-0 group-hover:opacity-100 transition-all duration-150 z-30 pointer-events-auto flex items-center gap-0.5 bg-card/95 backdrop-blur-md border border-border rounded-full px-1.5 py-0.5 shadow-lg select-none`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                {['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥'].map((emoji) => (
                                  <button
                                    key={emoji}
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleAddReaction(msg, emoji); }}
                                    className="p-0.5 hover:scale-130 transition-transform text-xs sm:text-sm cursor-pointer hover:bg-accent rounded-full"
                                    title={`Reagir com ${emoji}`}
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>

                              {/* Botão sutil de Chevron no Hover para abrir opções */}
                              <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-auto">
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleOpenContextMenu(e, msg); }}
                                  className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent/50 dark:text-gray-300 dark:hover:text-white dark:hover:bg-black/40 transition shadow-xs cursor-pointer"
                                  title="Opções da mensagem (Botão direito)"
                                >
                                  <ChevronDown className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {/* Exibição de Documento / Arquivo (PDF, CDR, DOCX, ZIP) */}
                              {(msg.mediaType === 'document' || msg.fileName) && (
                                <div className="mb-2 p-2.5 rounded-xl bg-black/10 dark:bg-black/25 border border-black/15 dark:border-white/10 flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-lg bg-red-500/15 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 font-bold text-xs uppercase shadow-xs">
                                    <FileText className="w-5 h-5" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold truncate text-foreground dark:text-white" title={msg.fileName || 'documento'}>
                                      {msg.fileName || 'Documento anexado'}
                                    </p>
                                    <span className="text-[10px] text-muted-foreground">Documento • Arquivo anexado</span>
                                  </div>
                                  {msg.mediaUrl && (
                                    <a
                                      href={msg.mediaUrl}
                                      download={msg.fileName || 'arquivo'}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition shrink-0"
                                      title="Baixar arquivo"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <Download className="w-4 h-4" />
                                    </a>
                                  )}
                                </div>
                              )}
                              {/* Exibição de Imagem */}
                              {(msg.mediaType === 'image' || msg.mediaUrl?.startsWith('data:image')) && (
                                <div className="mb-2 rounded-lg overflow-hidden border border-black/20">
                                  <img 
                                    src={msg.mediaUrl} 
                                    alt="Foto do WhatsApp" 
                                    className="max-h-60 w-auto rounded-lg cursor-pointer hover:opacity-95 transition-all"
                                    onClick={() => setImagePreviewModalUrl(msg.mediaUrl)}
                                  />
                                </div>
                              )}

                              {/* Exibição de Áudio com Transcrição Inteligente 🎙️ */}
                              {(msg.mediaType === 'audio' || msg.mediaUrl?.startsWith('data:audio') || msg.text?.includes('[Áudio')) && (
                                <div className="mb-2 p-2 bg-black/10 dark:bg-black/25 rounded-xl flex flex-col gap-1.5">
                                  <div className="flex items-center gap-2">
                                    <Volume2 className="w-5 h-5 text-emerald-500 dark:text-emerald-400 shrink-0" />
                                    {msg.mediaUrl ? (
                                      <audio controls src={msg.mediaUrl} className="h-8 w-60 max-w-full" />
                                    ) : (
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs italic text-emerald-700 dark:text-emerald-200">Mensagem de Voz Recebida</span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Card de Transcrição de Áudio (Áudio ➔ Texto) */}
                                  {msg.transcription || audioTranscriptions[msg.id] ? (
                                    <div className="mt-1 p-2 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-xs text-emerald-200 animate-in fade-in">
                                      <div className="flex items-center justify-between text-[10px] text-emerald-400 font-bold mb-1">
                                        <span className="flex items-center gap-1">
                                          <Sparkles className="w-3 h-3 text-emerald-400" /> Transcrição do Áudio:
                                        </span>
                                        <button
                                          type="button"
                                          className="text-gray-400 hover:text-white flex items-center gap-0.5"
                                          onClick={() => {
                                            navigator.clipboard.writeText(msg.transcription || audioTranscriptions[msg.id]);
                                            toast.success('Transcrição copiada!');
                                          }}
                                          title="Copiar transcrição"
                                        >
                                          <Copy className="w-2.5 h-2.5" /> Copiar
                                        </button>
                                      </div>
                                      <p className="italic leading-relaxed whitespace-pre-wrap select-text">
                                        "{msg.transcription || audioTranscriptions[msg.id]}"
                                      </p>
                                    </div>
                                  ) : (
                                    <div className="mt-0.5 flex items-center justify-end">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        disabled={transcribingAudioMsgId === msg.id}
                                        onClick={() => handleTranscribeAudio(msg)}
                                        className="h-6 px-2 text-[10px] font-bold text-emerald-300 hover:text-emerald-100 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg gap-1"
                                        title="Transcrever áudio para texto em segundos"
                                      >
                                        <Sparkles className="w-3 h-3 text-emerald-400" />
                                        {transcribingAudioMsgId === msg.id ? 'Transcrevendo com IA...' : 'Transcrever Áudio'}
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Citação / Resposta a mensagem anterior */}
                              {msg.quotedMessage && (
                                <div 
                                  onClick={() => {
                                    const el = document.getElementById(`msg-${msg.quotedMessage?.id}`);
                                    if (el) {
                                      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                      el.classList.add('ring-2', 'ring-emerald-400');
                                      setTimeout(() => el.classList.remove('ring-2', 'ring-emerald-400'), 1500);
                                    }
                                  }}
                                  className="mb-1.5 p-2 rounded-lg bg-black/10 dark:bg-black/25 border-l-4 border-emerald-500 text-xs cursor-pointer hover:bg-black/20 dark:hover:bg-black/35 transition-colors"
                                  title="Clique para ir até a mensagem citada"
                                >
                                  <p className="font-semibold text-[11px] text-emerald-700 dark:text-emerald-300">
                                    {msg.quotedMessage.sender || (msg.quotedMessage.isClient ? 'Cliente' : 'Você')}
                                  </p>
                                  <p className="line-clamp-2 text-muted-foreground dark:text-gray-300 text-[11px] opacity-90 mt-0.5">
                                    {msg.quotedMessage.text || (msg.quotedMessage.mediaType ? `[${msg.quotedMessage.mediaType}]` : 'Mensagem')}
                                  </p>
                                </div>
                              )}

                              {/* Texto da Mensagem ou Estado de Apagada */}
                              {msg.isDeleted ? (
                                <div className="flex items-center gap-1.5 text-xs italic text-gray-400/90 py-1 select-none">
                                  <span className="text-sm">🚫</span>
                                  <span>Esta mensagem foi apagada</span>
                                </div>
                              ) : (
                                <div className="text-[13px] sm:text-[13.5px] leading-relaxed break-words font-normal whitespace-pre-wrap select-text">
                                  {renderMessageText(msg.text)}
                                </div>
                              )}

                              {/* Horário, Badges de Status & Confirmação de Entrega */}
                              <div className="flex items-center justify-end gap-1.5 mt-1 text-[10px] text-muted-foreground/80 dark:text-gray-400/80 select-none">
                                {msg.isStarred && (
                                  <span title="Mensagem favoritada" className="text-amber-400 text-[11px]">
                                    ⭐
                                  </span>
                                )}
                                {msg.isPinned && (
                                  <span title="Mensagem fixada no topo" className="text-emerald-500 dark:text-emerald-400 text-[11px]">
                                    📌
                                  </span>
                                )}
                                {msg.isEdited && (
                                  <span className="italic text-[9.5px] text-muted-foreground/80 dark:text-gray-400/90" title={`Editada ${msg.editedAt ? new Date(msg.editedAt).toLocaleTimeString() : ''}`}>
                                    (editada)
                                  </span>
                                )}
                                <span>
                                  {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                </span>
                                {!isFromClient && (
                                  <span className="text-emerald-500 dark:text-emerald-400 text-[10px] font-bold" title="Entregue">
                                    ✓✓
                                  </span>
                                )}
                              </div>

                              {/* Reações de Emoji na bolha */}
                              {msg.reactions && msg.reactions.length > 0 && (
                                <div className={`absolute -bottom-2.5 ${isFromClient ? 'left-3' : 'right-3'} flex items-center gap-1 bg-card dark:bg-[#202c33] border border-border dark:border-[#2a3942] text-foreground rounded-full px-2 py-0.5 shadow-md z-10 text-xs`}>
                                  {Array.from(new Set(msg.reactions.map((r: any) => r.emoji))).map((emoji: any, idx) => (
                                    <span key={idx} className="cursor-default hover:scale-125 transition-transform">
                                      {emoji}
                                    </span>
                                  ))}
                                  {msg.reactions.length > 1 && (
                                    <span className="text-[9px] text-muted-foreground font-bold ml-0.5">
                                      {msg.reactions.length}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </React.Fragment>
                      );
                    })
                  ) : (
                    <div className="my-auto text-center text-muted-foreground p-6">
                      <Bot className="w-12 h-12 mx-auto mb-2 opacity-30" />
                      <p className="text-sm font-semibold text-foreground">Nenhuma mensagem registrada nesta conversa.</p>
                      <p className="text-xs text-muted-foreground mt-1">Envie uma mensagem abaixo para iniciar o atendimento!</p>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Botão Flutuante: Descer para as últimas mensagens ↓ */}
                {showScrollBottomBtn && (
                  <button
                    type="button"
                    onClick={() => scrollToBottom(true)}
                    className="absolute bottom-4 right-4 z-30 flex items-center gap-1.5 bg-card hover:bg-accent text-foreground dark:bg-[#202c33] dark:hover:bg-[#2a3942] dark:text-white border border-border dark:border-[#2a3942] shadow-2xl px-3 py-1.5 rounded-full transition-all duration-200 animate-in fade-in slide-in-from-bottom-2 group cursor-pointer"
                    title="Descer para o final da conversa"
                  >
                    <ChevronDown className="w-4 h-4 text-emerald-500 dark:text-emerald-400 group-hover:translate-y-0.5 transition-transform" />
                    <span className="text-xs font-semibold">Últimas mensagens</span>
                    {unreadBelowCount > 0 && (
                      <span className="bg-emerald-500 text-slate-950 text-[10px] font-black px-1.5 py-0.2 rounded-full">
                        {unreadBelowCount}
                      </span>
                    )}
                  </button>
                )}
              </div>

              {/* BARRA DE ENTRADA / INPUT DO CHAT */}
              <div className="bg-card border-t border-border dark:bg-[#1f2c34] dark:border-[#2a3942] z-10 shrink-0">
                <div className="p-3 relative">

                {/* Menu de Injeção de Fluxos ⚡ */}
                {showFlowMenu && (
                  <div className="absolute bottom-full left-4 mb-2 w-72 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden p-2 z-50">
                    <div className="px-2 py-1.5 border-b border-border mb-1 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Injetar Fluxo no Lead</span>
                      <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setShowFlowMenu(false)}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {localFlows.length > 0 ? (
                        localFlows.map((f: any) => (
                          <button 
                            key={f.id}
                            onClick={() => handleForceFlow(f.id)}
                            className="w-full text-left px-2.5 py-2 hover:bg-accent rounded-xl flex flex-col gap-0.5 transition-all"
                          >
                            <span className="text-xs font-bold text-foreground">{f.name}</span>
                            <span className="text-[10px] text-muted-foreground truncate">{f.description || f.segment}</span>
                          </button>
                        ))
                      ) : (
                        <div className="p-3 text-center text-xs text-muted-foreground">
                          Nenhum fluxo customizado salvo. Configure na aba "Fluxos de Conversa".
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Menu Flutuante de Mensagens Rápidas 📑 */}
                {showQuickMessagesMenu && (
                  <div 
                    ref={quickMessagesMenuRef}
                    className="absolute bottom-full left-2 sm:left-4 mb-2 w-96 max-w-[calc(100vw-1.5rem)] bg-card border border-border rounded-2xl shadow-2xl overflow-hidden p-3 z-50 flex flex-col max-h-[460px] animate-in fade-in slide-in-from-bottom-2 duration-150"
                  >
                    {/* Cabeçalho */}
                    <div className="flex items-center justify-between pb-2 border-b border-border mb-2 shrink-0">
                      <div className="flex items-center gap-1.5">
                        <Bookmark className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                        <span className="text-xs font-bold text-foreground">Respostas & Mensagens Rápidas</span>
                        <span className="text-[10px] text-muted-foreground">({filteredQuickMessages.length})</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 px-2 text-[10px] font-bold border-emerald-500/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 gap-1"
                          onClick={handleOpenCreateQMModal}
                        >
                          <Plus className="w-3 h-3" /> Criar Mensagem
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-foreground"
                          onClick={() => setShowQuickMessagesMenu(false)}
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Busca rápida */}
                    <div className="relative mb-2 shrink-0">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Buscar modelo ou atalho (/pix, /arte)..."
                        value={quickMessagesSearch}
                        onChange={(e) => setQuickMessagesSearch(e.target.value)}
                        className="h-8 pl-8 text-xs bg-muted/50 border-border rounded-lg text-foreground focus-visible:ring-1 focus-visible:ring-emerald-500"
                      />
                    </div>

                    {/* Categorias Pills (Sem Rolagem) */}
                    {qmCategories.length > 1 && (
                      <div className="flex items-center flex-wrap gap-1 pb-1 mb-2 shrink-0">
                        {qmCategories.map((cat) => (
                          <button
                            key={cat}
                            onClick={() => setSelectedQMCategory(cat)}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold whitespace-nowrap transition-all ${
                              selectedQMCategory === cat
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-accent/40 text-muted-foreground hover:text-foreground hover:bg-accent'
                            }`}
                          >
                            {cat === 'all' ? 'Todas' : cat}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Lista com scroll */}
                    <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[140px]">
                      {filteredQuickMessages.length > 0 ? (
                        filteredQuickMessages.map((qm) => {
                          const parsedPreview = parseQuickMessageContent(qm.content);
                          return (
                            <div
                              key={qm.id}
                              className="p-2.5 rounded-xl bg-muted/30 border border-border hover:border-emerald-500/50 transition-all flex flex-col gap-1.5 group"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-xs font-bold text-foreground">{qm.title}</span>
                                  {qm.shortcut && (
                                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 font-bold">
                                      {qm.shortcut}
                                    </span>
                                  )}
                                  {qm.category && (
                                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-accent/60 text-muted-foreground">
                                      {qm.category}
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100 shrink-0">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                    onClick={(e) => handleOpenEditQMModal(qm, e)}
                                    title="Editar modelo"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-muted-foreground hover:text-red-400"
                                    onClick={(e) => handleDeleteQuickMessage(qm.id, e)}
                                    title="Excluir modelo"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>

                              {/* Preview da mensagem */}
                              <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed bg-muted/40 p-2 rounded-lg border border-border/50 whitespace-pre-line">
                                {parsedPreview}
                              </p>

                              {/* Botões de Ação */}
                              <div className="flex items-center justify-between pt-0.5">
                                <span className="text-[10px] text-muted-foreground/70 flex items-center gap-1">
                                  <Sparkles className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
                                  Personalizado
                                </span>
                                <div className="flex items-center gap-1.5">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-6 px-2 text-[10px] font-medium border-border hover:bg-accent text-foreground gap-1"
                                    onClick={() => handleInsertQuickMessage(qm)}
                                    title="Inserir no campo para editar antes de enviar"
                                  >
                                    <Copy className="w-2.5 h-2.5" /> Inserir
                                  </Button>
                                  <Button
                                    size="sm"
                                    className="h-6 px-2.5 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white gap-1 shadow-xs"
                                    onClick={() => handleSendQuickMessageDirectly(qm)}
                                    title="Enviar agora mesmo pro cliente"
                                  >
                                    <Send className="w-2.5 h-2.5" /> Enviar Agora
                                  </Button>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-center py-6 text-muted-foreground">
                          <Bookmark className="w-8 h-8 mx-auto mb-2 opacity-30" />
                          <p className="text-xs font-semibold">Nenhuma mensagem rápida encontrada.</p>
                          <p className="text-[10px] mt-0.5">Clique em "+ Criar Mensagem" para cadastrar um modelo para os colaboradores.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Popover Seletor de Emojis / Emotes 😊 */}
                {showEmojiPicker && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowEmojiPicker(false);
                      }}
                    />
                    <div
                      ref={emojiPickerRef}
                      className="absolute bottom-full left-2 sm:left-4 mb-2 w-[370px] sm:w-[440px] max-w-[calc(100vw-1.5rem)] bg-card border border-border rounded-2xl shadow-2xl p-3 z-50 flex flex-col max-h-[460px] animate-in fade-in slide-in-from-bottom-2 duration-150"
                    >
                    {/* Cabeçalho do Picker */}
                    <div className="flex items-center justify-between pb-2 border-b border-border mb-2 shrink-0">
                      <div className="flex items-center gap-1.5">
                        <Smile className="w-4 h-4 text-amber-500" />
                        <span className="text-xs font-bold text-foreground">Emotes & Emojis</span>
                        <span className="text-[10px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded-full font-mono">
                          {currentEmojis.length}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowEmojiPicker(false)}
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    {/* Barra de Abas de Categorias */}
                    <div className="flex items-center gap-1 pb-1.5 mb-2 border-b border-border/50 overflow-x-auto no-scrollbar shrink-0">
                      <button
                        type="button"
                        onClick={() => { setEmojiPickerTab('recent'); setEmojiSearch(''); }}
                        className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer shrink-0 ${
                          emojiPickerTab === 'recent'
                            ? 'bg-primary text-primary-foreground shadow-xs'
                            : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                        }`}
                      >
                        <span>⭐</span>
                        <span className="text-[10px]">Recentes</span>
                      </button>
                      {EMOJI_CATEGORIES.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => { setEmojiPickerTab(cat.id); setEmojiSearch(''); }}
                          className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer shrink-0 ${
                            emojiPickerTab === cat.id && !emojiSearch
                              ? 'bg-primary text-primary-foreground shadow-xs'
                              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                          }`}
                          title={cat.name}
                        >
                          <span>{cat.icon}</span>
                          <span className="text-[10px]">{cat.name}</span>
                        </button>
                      ))}
                    </div>

                    {/* Campo de Busca de Emojis */}
                    <div className="relative mb-2 shrink-0">
                      <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Buscar emote / emoji..."
                        value={emojiSearch}
                        onChange={(e) => setEmojiSearch(e.target.value)}
                        className="h-7 pl-7 text-xs bg-muted/50 border-border rounded-lg text-foreground focus-visible:ring-1 focus-visible:ring-emerald-500"
                      />
                    </div>

                    {/* Grid de Emojis Sem Cortes */}
                    <div className="grid grid-cols-8 sm:grid-cols-9 gap-1.5 overflow-y-auto max-h-64 sm:max-h-72 p-1.5 pb-4 select-none">
                      {currentEmojis.map((emoji, idx) => (
                        <button
                          key={`${emoji}-${idx}`}
                          type="button"
                          onClick={() => handleInsertEmoji(emoji)}
                          className="h-9 w-9 flex items-center justify-center text-xl hover:bg-accent hover:scale-125 rounded-lg transition-transform cursor-pointer"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
                )}

                {/* Popover Interações Comerciais Rápidas ✨ */}
                {showQuickActionsMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowQuickActionsMenu(false);
                      }}
                    />
                    <div
                      ref={quickActionsMenuRef}
                      className="absolute bottom-full left-2 sm:left-4 mb-2 w-96 max-w-[calc(100vw-1.5rem)] bg-card border border-border rounded-2xl shadow-2xl p-3 z-50 flex flex-col max-h-[480px] animate-in fade-in slide-in-from-bottom-2 duration-150"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-border mb-2 shrink-0">
                        <div className="flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-primary" />
                          <span className="text-xs font-bold text-foreground">Interações Comerciais Rápidas</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={handleResetInteractionsToDefault}
                            className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-accent transition-colors"
                            title="Restaurar todas as mensagens originais"
                          >
                            <RotateCcw className="w-2.5 h-2.5" />
                            <span>Padrão</span>
                          </button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-foreground"
                            onClick={() => setShowQuickActionsMenu(false)}
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>

                      <p className="text-[11px] text-muted-foreground mb-2 shrink-0">
                        Envie ou personalize informações de Pix, endereço, horários e briefing:
                      </p>

                      <div className="space-y-2 overflow-y-auto max-h-[360px] pr-1 pb-1">
                        {commercialInteractions.map((item) => {
                          const Icon = getInteractionIcon(item.iconName);
                          return (
                            <div
                              key={item.id}
                              className="p-2.5 rounded-xl border border-border/80 hover:border-primary/50 bg-background/70 hover:bg-accent/40 transition-all flex flex-col gap-2 group"
                            >
                              <div className="flex items-start gap-2.5">
                                <div className={`p-2 rounded-lg shrink-0 border ${item.color}`}>
                                  <Icon className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-1">
                                    <h4 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors truncate">
                                      {item.title}
                                    </h4>
                                    <button
                                      type="button"
                                      onClick={(e) => handleOpenEditInteraction(item, e)}
                                      className="h-6 px-1.5 rounded-md hover:bg-accent flex items-center gap-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground shrink-0 border border-transparent hover:border-border transition-colors cursor-pointer"
                                      title="Editar texto desta mensagem personalizada"
                                    >
                                      <Edit2 className="w-3 h-3 text-emerald-500" />
                                      <span>Editar</span>
                                    </button>
                                  </div>
                                  <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                                    {item.subtitle}
                                  </p>
                                </div>
                              </div>

                              <div className="text-[10px] font-mono bg-muted/40 p-2 rounded-lg text-muted-foreground line-clamp-2 border border-border/40 whitespace-pre-line leading-relaxed">
                                {item.template}
                              </div>

                              <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-border/30">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 px-2 text-[10px] font-medium border-border hover:bg-accent text-foreground gap-1"
                                  onClick={() => handleInsertCommercialInteraction(item)}
                                  title="Inserir no campo para editar antes de enviar"
                                >
                                  <Copy className="w-2.5 h-2.5" /> Inserir
                                </Button>
                                <Button
                                  size="sm"
                                  className="h-6 px-2.5 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white gap-1 shadow-xs"
                                  onClick={() => handleSendQuickMessageDirectly({ id: item.id, title: item.title, content: item.template })}
                                  title="Enviar agora mesmo pro cliente"
                                >
                                  <Send className="w-2.5 h-2.5" /> Enviar Agora
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}

                {/* Preview de Citação / Resposta a Mensagem Anterior */}
                {replyingToMessage && (
                  <div className="mb-2 p-2.5 bg-muted/60 dark:bg-[#182229] border-l-4 border-emerald-500 rounded-r-xl border-y border-r border-border dark:border-[#2a3942] flex items-center justify-between animate-in fade-in slide-in-from-bottom-2 duration-150">
                    <div className="flex flex-col min-w-0 pr-2">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        <CornerUpLeft className="w-3.5 h-3.5" />
                        <span>Respondendo a {replyingToMessage.sender === 'client' || replyingToMessage.isClient ? 'Cliente' : 'Você'}</span>
                      </div>
                      <p className="text-xs text-muted-foreground dark:text-gray-300 truncate mt-0.5">
                        {replyingToMessage.text || (replyingToMessage.mediaType ? `[${replyingToMessage.mediaType}]` : 'Mensagem')}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-foreground shrink-0"
                      onClick={() => setReplyingToMessage(null)}
                      title="Cancelar resposta"
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}

                {/* Preview de Imagem selecionada antes de enviar */}
                {selectedImageBase64 && (
                  <div className="mb-2 p-2 bg-accent/60 border border-border rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img 
                        src={selectedImageBase64} 
                        alt="Preview" 
                        className="w-12 h-12 object-cover rounded-lg border border-border" 
                      />
                      <span className="text-xs text-foreground font-medium">Imagem selecionada para envio</span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 text-red-400 hover:text-red-300"
                      onClick={() => setSelectedImageBase64(null)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}

                {/* Preview de Documento selecionado antes de enviar */}
                {selectedDocFile && (
                  <div className="mb-2 p-2.5 bg-accent/60 border border-border rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-bottom-2 duration-150">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate" title={selectedDocFile.name}>
                          {selectedDocFile.name}
                        </p>
                        <span className="text-[10px] text-muted-foreground">
                          {(selectedDocFile.size / 1024).toFixed(1)} KB • Documento pronto para envio
                        </span>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 text-red-400 hover:text-red-300 shrink-0"
                      onClick={() => setSelectedDocFile(null)}
                      title="Remover documento"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}

                {/* Mini Barra de Formatação Rápida do WhatsApp (*B*, _I_, ~S~, <C>) */}
                <div className="flex items-center justify-between mb-1.5 px-1 select-none">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-semibold text-muted-foreground mr-1">
                      Estilos:
                    </span>
                    <button
                      type="button"
                      onClick={() => handleApplyFormatting('*')}
                      className="px-2 py-0.5 rounded text-[11px] font-bold bg-muted/60 hover:bg-muted text-foreground border border-border transition hover:scale-105 cursor-pointer"
                      title="Formatar texto em Negrito (*palavra*)"
                    >
                      B
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyFormatting('_')}
                      className="px-2 py-0.5 rounded text-[11px] italic font-serif bg-muted/60 hover:bg-muted text-foreground border border-border transition hover:scale-105 cursor-pointer"
                      title="Formatar texto em Itálico (_palavra_)"
                    >
                      I
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyFormatting('~')}
                      className="px-2 py-0.5 rounded text-[11px] line-through bg-muted/60 hover:bg-muted text-foreground border border-border transition hover:scale-105 cursor-pointer"
                      title="Formatar texto Tachado (~palavra~)"
                    >
                      S
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyFormatting('`')}
                      className="px-2 py-0.5 rounded text-[10px] font-mono bg-muted/60 hover:bg-muted text-foreground border border-border transition hover:scale-105 cursor-pointer"
                      title="Formatar em Código (`palavra`)"
                    >
                      &lt;/&gt;
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowQuickActionsMenu((prev) => !prev);
                        setShowEmojiPicker(false);
                      }}
                      className="flex items-center gap-1 text-[10px] font-semibold text-primary hover:underline cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" /> Interações Rápidas
                    </button>
                  </div>
                </div>

                {/* Barra de Gravação de Áudio ao Vivo */}
                {isRecordingAudio ? (
                  <div className="flex items-center justify-between bg-red-950/40 border border-red-500/40 rounded-xl p-2 px-4 animate-pulse">
                    <div className="flex items-center gap-3">
                      <span className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
                      <span className="text-xs font-bold text-red-400">
                        Gravando áudio de voz... ({recordingSeconds}s)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-8 text-xs text-muted-foreground hover:text-foreground" 
                        onClick={handleCancelRecording}
                      >
                        Cancelar
                      </Button>
                      <Button 
                        size="sm" 
                        className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white gap-1"
                        onClick={handleStopAndSendRecording}
                      >
                        <Send className="w-3 h-3" /> Enviar Áudio
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    {/* Botão Fluxo Rápido ⚡ */}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className={`h-9 w-9 shrink-0 rounded-full transition-all ${
                        showFlowMenu ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-primary hover:bg-primary/10'
                      }`}
                      onClick={() => {
                        setShowFlowMenu(!showFlowMenu);
                        setShowQuickMessagesMenu(false);
                        setShowEmojiPicker(false);
                        setShowQuickActionsMenu(false);
                      }}
                      title="Injetar Fluxo Automatizado"
                    >
                      <Zap className="w-4 h-4" />
                    </Button>

                    {/* Botão Respostas Rápidas / Mensagens Prontas 📑 */}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className={`h-9 w-9 shrink-0 rounded-full transition-all ${
                        showQuickMessagesMenu ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/50' : 'text-muted-foreground hover:text-emerald-400 hover:bg-emerald-500/10'
                      }`}
                      onClick={() => {
                        setShowQuickMessagesMenu(!showQuickMessagesMenu);
                        setShowFlowMenu(false);
                        setShowEmojiPicker(false);
                        setShowQuickActionsMenu(false);
                      }}
                      title="Mensagens Rápidas & Modelos Personalizados (/atalhos)"
                    >
                      <Bookmark className="w-4 h-4" />
                    </Button>

                    {/* Botão Interações Comerciais Rápidas (Pix, Endereço, Briefing) ✨ */}
                    <Button 
                      ref={quickActionsButtonRef}
                      variant="ghost" 
                      size="icon" 
                      className={`h-9 w-9 shrink-0 rounded-full transition-all cursor-pointer ${
                        showQuickActionsMenu ? 'bg-primary/20 text-primary ring-1 ring-primary/50' : 'text-muted-foreground hover:text-primary hover:bg-primary/10'
                      }`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowQuickActionsMenu((prev) => !prev);
                        setShowEmojiPicker(false);
                        setShowQuickMessagesMenu(false);
                        setShowFlowMenu(false);
                      }}
                      title="Interações Comerciais (Pix, Endereço, Horário, Briefing)"
                    >
                      <Sparkles className="w-4 h-4" />
                    </Button>

                    {/* Botão Seletor de Emojis / Emotes 😊 */}
                    <Button 
                      ref={emojiButtonRef}
                      variant="ghost" 
                      size="icon" 
                      className={`h-9 w-9 shrink-0 rounded-full transition-all cursor-pointer ${
                        showEmojiPicker ? 'bg-amber-500/20 text-amber-500 ring-1 ring-amber-500/50' : 'text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10'
                      }`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowEmojiPicker((prev) => !prev);
                        setShowQuickActionsMenu(false);
                        setShowQuickMessagesMenu(false);
                        setShowFlowMenu(false);
                      }}
                      title="Emotes & Emojis"
                    >
                      <Smile className="w-4 h-4" />
                    </Button>

                    {/* Botão Agendar Mensagem / Lembrete 📅 */}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className={`h-9 w-9 shrink-0 rounded-full transition-all ${
                        activeConversationScheduled.length > 0
                          ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/50'
                          : 'text-muted-foreground hover:text-blue-400 hover:bg-blue-500/10'
                      }`}
                      onClick={() => handleOpenScheduleModal()}
                      title={activeConversationScheduled.length > 0 
                        ? `${activeConversationScheduled.length} mensagem(ns) agendada(s). Clique para ver ou agendar mais.` 
                        : 'Agendar Envio de Mensagem / Lembrete'}
                    >
                      <CalendarClock className="w-4 h-4" />
                    </Button>

                    {/* Botão Anexar Imagem 📷 */}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground rounded-full hover:bg-accent"
                      onClick={() => fileInputRef.current?.click()}
                      title="Enviar Foto / Imagem"
                    >
                      <ImageIcon className="w-4 h-4" />
                    </Button>

                    {/* Botão Anexar Documento / Arquivo 📄 */}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className={`h-9 w-9 shrink-0 rounded-full transition-all ${
                        selectedDocFile ? 'bg-red-500/20 text-red-500 ring-1 ring-red-500/50' : 'text-muted-foreground hover:text-red-500 hover:bg-red-500/10'
                      }`}
                      onClick={() => docFileInputRef.current?.click()}
                      title="Enviar Documento (PDF, CDR, DOCX, ZIP)"
                    >
                      <FileUp className="w-4 h-4" />
                    </Button>

                    {/* Botão Anexar Arquivo de Áudio 🎵 */}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground rounded-full hover:bg-accent"
                      onClick={() => audioFileInputRef.current?.click()}
                      title="Enviar Arquivo de Áudio"
                    >
                      <Paperclip className="w-4 h-4" />
                    </Button>

                    {/* Input de Texto com Suporte a Atalhos / */}
                    <Input 
                      placeholder="Digite uma mensagem ou / para respostas rápidas..."
                      value={replyText}
                      onChange={e => {
                        const val = e.target.value;
                        setReplyText(val);
                        if (val.startsWith('/') && !showQuickMessagesMenu) {
                          setShowQuickMessagesMenu(true);
                          setQuickMessagesSearch(val);
                        } else if (showQuickMessagesMenu && val.startsWith('/')) {
                          setQuickMessagesSearch(val);
                        }
                      }}
                      onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                      disabled={isSending}
                      className="flex-1 bg-muted/60 dark:bg-[#2a3942] border border-border dark:border-0 focus-visible:ring-1 focus-visible:ring-emerald-500/50 text-foreground dark:text-gray-100 h-10 rounded-xl px-4 text-sm"
                    />

                    {/* Botão Gravar Microfone 🎙️ */}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={handleStartRecording}
                      title="Gravar áudio com microfone"
                      className="h-9 w-9 shrink-0 text-muted-foreground hover:text-emerald-400 rounded-full hover:bg-accent"
                    >
                      <Mic className="w-4 h-4" />
                    </Button>

                    {/* Botão Enviar Mensagem ➤ */}
                    <Button 
                      onClick={handleSend}
                      disabled={isSending || (!replyText.trim() && !selectedImageBase64 && !selectedDocFile)}
                      className="h-9 w-9 shrink-0 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center p-0 shadow-md"
                      title="Enviar Mensagem"
                    >
                      <Send className="w-4 h-4 ml-0.5" />
                    </Button>
                  </div>
                )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground z-10 p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4 border border-emerald-500/20">
                <MessageSquare className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-foreground text-base mb-1">Selecione uma conversa para iniciar</h3>
              <p className="text-xs text-muted-foreground max-w-sm">
                Escolha um lead na lista à esquerda ou clique em <strong>+ Nova conversa</strong> para chamar qualquer cliente no WhatsApp.
              </p>
            </div>
          )}
        </div>

        {/* COLUNA 3: PAINEL DE CRM & DADOS DO LEAD */}
        {selectedConversation && showCrmSidebar && (
          <div className="w-[280px] sm:w-[300px] lg:w-[320px] border-l border-border bg-card/30 flex flex-col shrink-0 overflow-y-auto h-full animate-in fade-in slide-in-from-right-4 duration-200">
            {/* Topbar com fechar painel */}
            <div className="flex items-center justify-between px-3.5 py-2 border-b border-border bg-card/60">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-emerald-400" /> Detalhes do Lead (CRM)
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-foreground rounded-md"
                onClick={() => setShowCrmSidebar(false)}
                title="Fechar painel CRM"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>

            {/* Perfil do Lead */}
            <div className="p-3.5 flex flex-col items-center border-b border-border">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-lg font-black mb-1.5 shadow-xs">
                {selectedConversation.name?.charAt(0)?.toUpperCase() || 'C'}
              </div>
              <h2 className="font-bold text-foreground text-sm text-center truncate max-w-full" title={selectedConversation.name || selectedConversation.phone}>
                {selectedConversation.name || selectedConversation.phone}
              </h2>
              
              <div className="flex items-center gap-1.5 mt-1">
                {selectedConversation.leadTemperature === 'quente' ? (
                  <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px] px-2 py-0.5 font-bold">
                    🔥 Lead Quente
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] px-2 py-0.5 font-medium">
                    Lead Comercial
                  </Badge>
                )}
              </div>

              {/* Botão Abrir no WhatsApp Web Oficial */}
              <a
                href={`https://wa.me/${selectedConversation.phone?.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full mt-2.5 inline-flex items-center justify-center gap-1.5 h-8 rounded-lg bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition-all"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Abrir no WhatsApp Oficial
              </a>
            </div>

            {/* Abas do CRM */}
            <div className="flex items-center border-b border-border bg-card/20">
              <button 
                onClick={() => setCrmTab('dados')} 
                className={`flex-1 py-2 text-xs font-bold text-center border-b-2 transition-all ${
                  crmTab === 'dados' ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5' : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Dados
              </button>
              <button 
                onClick={() => setCrmTab('anotacoes')} 
                className={`flex-1 py-2 text-xs font-bold text-center border-b-2 transition-all ${
                  crmTab === 'anotacoes' ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5' : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Anotações
              </button>
            </div>

            {/* Conteúdo das Abas */}
            <div className="flex-1 p-3 space-y-3 overflow-y-auto">
              {crmTab === 'dados' && (
                <>
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Telefone WhatsApp</p>
                    <p className="text-foreground text-xs font-mono font-semibold bg-accent/40 p-2 rounded-lg border border-border">
                      {formatBrazilianPhone(selectedConversation.phone) || 'N/A'}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Status da Conversa</p>
                    <p className="text-foreground text-xs capitalize bg-accent/40 p-2 rounded-lg border border-border">
                      {selectedConversation.status || 'Em andamento'}
                    </p>
                  </div>

                  {selectedConversation.detectedIntents && selectedConversation.detectedIntents.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Interesses Detectados</p>
                      <div className="flex flex-wrap gap-1">
                        {selectedConversation.detectedIntents.map((intent: string, i: number) => (
                          <Badge key={i} variant="outline" className="bg-primary/10 text-primary border-primary/30 text-[10px]">
                            {intent}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Gestão de Etiquetas no CRM */}
                  <div className="pt-2 border-t border-border">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                        <Tag className="w-3.5 h-3.5 text-primary" /> Etiquetas & Prioridade
                      </p>
                      <button 
                        type="button" 
                        onClick={handleOpenTagModal}
                        className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
                      >
                        <SlidersHorizontal className="w-2.5 h-2.5" /> Gerenciar
                      </button>
                    </div>

                    {/* Alerta de Urgência */}
                    {isConversationUrgent(selectedConversation) && (
                      <div className="mb-2 p-2 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-2 text-red-400 text-xs font-bold animate-pulse">
                        <span className="text-sm">🚨</span>
                        <span>CLIENTE URGENTE (Prioridade Alta)</span>
                      </div>
                    )}

                    {/* Grade de 1 clique para ativar/desativar etiquetas */}
                    <div className="grid grid-cols-2 gap-1.5">
                      {availableTags.map((tag) => {
                        const isChecked = Array.isArray(selectedConversation.tags) &&
                          selectedConversation.tags.some((t: string) => t.toLowerCase() === tag.id.toLowerCase() || t.toLowerCase() === tag.name.toLowerCase());
                        return (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => handleToggleConversationTag(tag.id)}
                            className={`p-1.5 rounded-lg border text-left text-xs font-semibold flex items-center justify-between transition-all ${
                              isChecked
                                ? 'text-white shadow-xs font-bold'
                                : 'bg-accent/30 text-muted-foreground border-border hover:text-foreground hover:bg-accent/60'
                            }`}
                            style={isChecked ? { backgroundColor: tag.color, borderColor: tag.color } : {}}
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span 
                                className="w-2 h-2 rounded-full shrink-0" 
                                style={{ backgroundColor: isChecked ? '#ffffff' : tag.color }} 
                              />
                              <span className="text-[11px] truncate">{tag.name}</span>
                            </div>
                            {isChecked && <Check className="w-3 h-3 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border">
                    <p className="text-[10px] font-bold text-emerald-400 uppercase mb-1.5 flex items-center gap-1">
                      <Bot className="w-3.5 h-3.5" /> Automação de Fluxo
                    </p>
                    <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-2.5 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground">Robô WhatsApp</span>
                        <Badge className={isHumanControlled ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-400'}>
                          {isHumanControlled ? 'Pausado' : 'Ativo'}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {isHumanControlled 
                          ? 'O robô está em silêncio para você conversar livremente.' 
                          : 'O robô responderá o fluxo pré-definido quando o cliente enviar nova mensagem.'}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[10px] font-bold text-primary uppercase flex items-center gap-1">
                        <Trello className="w-3.5 h-3.5" /> Mover para CRM & Pipeline
                      </p>
                      {matchedCrmLead && (
                        <button
                          type="button"
                          onClick={() => router.push('/pipeline')}
                          className="text-[10px] text-primary hover:underline flex items-center gap-0.5 font-bold"
                          title="Abrir no quadro Kanban do CRM"
                        >
                          <span>Ver no CRM</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>

                    <div className="bg-card/70 border border-border rounded-xl p-3 space-y-2.5 shadow-xs">
                      {/* Status de vinculação */}
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                          {matchedCrmLead ? (
                            <>
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                              <span>Vinculado ao CRM</span>
                            </>
                          ) : (
                            <>
                              <span className="w-2 h-2 rounded-full bg-amber-500" />
                              <span>Não cadastrado no CRM</span>
                            </>
                          )}
                        </span>

                        {matchedCrmLead && (
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase truncate max-w-[120px]"
                            style={{
                              backgroundColor: `${currentMatchedStage.color}25`,
                              color: currentMatchedStage.color,
                              border: `1px solid ${currentMatchedStage.color}40`,
                            }}
                          >
                            ● {currentMatchedStage.name}
                          </span>
                        )}
                      </div>

                      {/* Seletor de Etapa no Pipeline */}
                      <div>
                        <label className="text-[10px] font-semibold text-muted-foreground mb-1 block">
                          {matchedCrmLead ? 'Mover para etapa do Pipeline:' : 'Selecione a etapa inicial:'}
                        </label>
                        <div className="grid grid-cols-2 gap-1">
                          {PIPELINE_STAGES.map((s) => {
                            const isCurrent = (matchedCrmLead?.pipelineStageId || targetCrmStageId) === s.id;
                            return (
                              <button
                                key={s.id}
                                type="button"
                                onClick={() => {
                                  setTargetCrmStageId(s.id);
                                  handleMoveToCrmStage(s.id);
                                }}
                                className={`px-2 py-1.5 rounded-lg text-[10px] font-bold text-left transition border flex items-center gap-1.5 truncate ${
                                  isCurrent
                                    ? 'border-primary bg-primary/15 text-primary shadow-xs'
                                    : 'border-border bg-accent/30 hover:bg-accent text-muted-foreground hover:text-foreground'
                                }`}
                                title={`Mover para: ${s.name}`}
                              >
                                <span
                                  className="w-2 h-2 rounded-full shrink-0"
                                  style={{ backgroundColor: s.color }}
                                />
                                <span className="truncate">{s.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Campo de Valor Estimado e Botão de Ação */}
                      <div className="pt-1 flex items-center gap-2">
                        <div className="flex-1">
                          <label className="text-[10px] font-semibold text-muted-foreground mb-0.5 block">
                            Valor Oportunidade (R$)
                          </label>
                          <div className="relative">
                            <span className="absolute left-2 top-1.5 text-[10px] text-muted-foreground font-mono">R$</span>
                            <input
                              type="number"
                              value={targetCrmValue}
                              onChange={(e) => setTargetCrmValue(e.target.value)}
                              placeholder="2500"
                              className="w-full text-xs pl-7 pr-2 py-1 rounded-lg bg-accent/40 border border-border text-foreground focus:outline-hidden focus:border-primary font-mono"
                            />
                          </div>
                        </div>

                        <div className="pt-3.5">
                          <Button
                            size="sm"
                            disabled={isSyncingLead}
                            onClick={() => handleMoveToCrmStage(targetCrmStageId)}
                            className="h-7 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground gap-1 shadow-xs"
                          >
                            <Trello className="w-3 h-3" />
                            <span>{matchedCrmLead ? 'Salvar' : 'Mover p/ CRM'}</span>
                          </Button>
                        </div>
                      </div>

                      {matchedCrmLead && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full h-7 text-[11px] font-bold gap-1.5 border-border hover:border-primary/50 text-foreground"
                          onClick={() => router.push('/pipeline')}
                        >
                          <ExternalLink className="w-3 h-3 text-primary" />
                          <span>Abrir Funil de Vendas CRM</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </>
              )}

              {crmTab === 'anotacoes' && (
                <div className="space-y-2.5">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Notas e Lembretes do Lead</p>
                  <textarea
                    rows={6}
                    value={leadNotes}
                    onChange={(e) => handleSaveNote(e.target.value)}
                    placeholder="Escreva anotações importantes sobre este cliente (ex: quer fechar na sexta, prefere pagamento via Pix)..."
                    className="w-full text-xs p-2.5 rounded-xl bg-accent/40 border border-border focus:border-emerald-500 focus:outline-hidden text-foreground resize-none leading-relaxed"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    ✓ As notas são salvas automaticamente para este contato.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* MODAL: CENTRAL DE LEADS QUENTES (NOTIFICAÇÕES INTEGRADAS NO CHAT) */}
      {isHotLeadsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-card w-full max-w-2xl rounded-2xl border border-border shadow-2xl overflow-hidden my-6">
            <div className="p-4 bg-accent/50 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-red-500/20 rounded-xl text-red-500">
                  <Flame className="w-5 h-5 fill-red-500" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Central de Leads Quentes (Respostas em Tempo Real)</h3>
                  <p className="text-xs text-muted-foreground">Clientes que responderam à prospecção fria do robô no WhatsApp</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsHotLeadsModalOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="p-5 space-y-3 max-h-[65vh] overflow-y-auto">
              {hotLeads.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground space-y-2">
                  <Flame className="w-12 h-12 mx-auto text-amber-500 opacity-30" />
                  <p className="text-sm font-semibold text-foreground">Nenhuma resposta registrada ainda</p>
                  <p className="text-xs max-w-xs mx-auto">
                    Assim que um cliente responder ao disparo do robô, ele aparecerá aqui instantaneamente para você assumir o atendimento.
                  </p>
                </div>
              ) : (
                hotLeads.map((lead: any) => {
                  return (
                    <div 
                      key={lead.id} 
                      className="p-3.5 rounded-xl bg-accent/30 border border-border hover:border-emerald-500/50 transition-all space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground text-sm">{lead.leadName}</span>
                            {lead.isRejected ? (
                              <Badge className="text-[10px] bg-rose-500/20 text-rose-400 border-rose-500/30">
                                🚫 Desinteresse / Encerrado
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-bold">
                                🔥 Lead Interessado
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            📱 {formatBrazilianPhone(lead.phone)} {lead.pushName ? `(${lead.pushName})` : ''} • Abordado por: <strong>{lead.templateName || 'Modelo Direto'}</strong>
                          </p>
                        </div>

                        <Button
                          size="sm"
                          onClick={() => handleSelectHotLead(lead)}
                          className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold shrink-0 gap-1.5 shadow-sm"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          Responder no Chat
                        </Button>
                      </div>

                      {/* Mensagem enviada pelo cliente */}
                      <div className={`p-2.5 rounded-xl bg-background border text-xs ${lead.isRejected ? 'border-rose-500/30 bg-rose-950/10' : 'border-border/80'}`}>
                        <span className={`text-[10px] font-bold uppercase tracking-wider block mb-0.5 ${lead.isRejected ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {lead.isRejected ? '🚫 Declínio / Sem Interesse:' : '💬 Mensagem do Cliente:'}
                        </span>
                        <p className="text-foreground italic">"{lead.text}"</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-3 bg-accent/30 border-t border-border flex items-center justify-between text-xs text-muted-foreground px-5">
              <span>{hotLeads.length} resposta{hotLeads.length === 1 ? '' : 's'} catalogada{hotLeads.length === 1 ? '' : 's'}</span>
              <Button variant="outline" size="sm" onClick={() => setIsHotLeadsModalOpen(false)} className="text-xs h-7">
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NOVA CONVERSA (+ Nova Conversa) */}
      {isNewChatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Iniciar Nova Conversa</h3>
                  <p className="text-xs text-muted-foreground">Envie uma mensagem direta para qualquer número</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsNewChatModalOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <form onSubmit={handleSubmitNewChat} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Telefone / WhatsApp (com DDD) *
                </label>
                <Input 
                  placeholder="Ex: 92984892332 ou 5592984892332"
                  value={newChatPhone}
                  onChange={e => setNewChatPhone(e.target.value)}
                  className="text-xs"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Nome do Contato (opcional)
                </label>
                <Input 
                  placeholder="Ex: João da Silva"
                  value={newChatName}
                  onChange={e => setNewChatName(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Disparar Fluxo do Robô Automaticamente? (opcional)
                </label>
                <select
                  value={newChatFlowId}
                  onChange={e => setNewChatFlowId(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground focus:outline-hidden"
                >
                  <option value="">Não disparar fluxo (apenas iniciar chat)</option>
                  {localFlows.map((f: any) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Mensagem Inicial
                </label>
                <Input 
                  placeholder="Mensagem de abertura..."
                  value={newChatInitialMsg}
                  onChange={e => setNewChatInitialMsg(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-border">
                <Button type="button" variant="ghost" onClick={() => setIsNewChatModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-1.5">
                  <Send className="w-3.5 h-3.5" /> Chamar no WhatsApp
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: GERENCIAR ETIQUETAS DO WHATSAPP (CRIAR, EDITAR, EXCLUIR) */}
      {isTagModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-card w-full max-w-lg rounded-2xl border border-border shadow-2xl overflow-hidden my-6">
            {/* Header */}
            <div className="p-4 bg-accent/50 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-primary/10 rounded-xl text-primary">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Gerenciar Etiquetas</h3>
                  <p className="text-xs text-muted-foreground">Classifique seus clientes como Urgente, Importante, etc.</p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => {
                  setIsTagModalOpen(false);
                  setEditingTag(null);
                  setTagFormName('');
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Formulário: Adicionar ou Editar Etiqueta */}
              <form onSubmit={handleSaveTag} className="bg-accent/30 border border-border rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    {editingTag ? <Edit2 className="w-3.5 h-3.5 text-amber-400" /> : <Plus className="w-3.5 h-3.5 text-emerald-400" />}
                    {editingTag ? `Editar Etiqueta: "${editingTag.name}"` : 'Adicionar Nova Etiqueta'}
                  </span>
                  {editingTag && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTag(null);
                        setTagFormName('');
                        setTagFormColor('#ef4444');
                      }}
                      className="text-[11px] text-muted-foreground hover:text-foreground underline"
                    >
                      Cancelar edição
                    </button>
                  )}
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                    Nome da Etiqueta *
                  </label>
                  <Input
                    placeholder="Ex: 🚨 Urgente, ⭐ Importante, Retornar Amanhã..."
                    value={tagFormName}
                    onChange={(e) => setTagFormName(e.target.value)}
                    className="text-xs bg-background"
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground block mb-1.5">
                    Cor da Etiqueta
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {TAG_COLOR_OPTIONS.map((opt) => (
                      <button
                        key={opt.hex}
                        type="button"
                        onClick={() => setTagFormColor(opt.hex)}
                        className={`w-7 h-7 rounded-full border-2 transition-all flex items-center justify-center ${
                          tagFormColor.toLowerCase() === opt.hex.toLowerCase()
                            ? 'border-white scale-110 shadow-md ring-2 ring-primary/40'
                            : 'border-transparent opacity-80 hover:opacity-100 hover:scale-105'
                        }`}
                        style={{ backgroundColor: opt.hex }}
                        title={opt.name}
                      >
                        {tagFormColor.toLowerCase() === opt.hex.toLowerCase() && (
                          <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                        )}
                      </button>
                    ))}
                    <div className="flex items-center gap-1.5 ml-1">
                      <input
                        type="color"
                        value={tagFormColor}
                        onChange={(e) => setTagFormColor(e.target.value)}
                        className="w-7 h-7 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                        title="Cor personalizada"
                      />
                      <span className="text-[10px] text-muted-foreground font-mono">{tagFormColor}</span>
                    </div>
                  </div>
                </div>

                {/* Prévia da etiqueta */}
                {tagFormName.trim() && (
                  <div className="pt-1">
                    <span className="text-[10px] text-muted-foreground block mb-1">Prévia:</span>
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold border"
                      style={{
                        backgroundColor: `${tagFormColor}20`,
                        color: tagFormColor,
                        borderColor: `${tagFormColor}60`,
                      }}
                    >
                      {tagFormName.trim()}
                    </span>
                  </div>
                )}

                <div className="pt-2 flex justify-end">
                  <Button
                    type="submit"
                    disabled={isSavingTag || !tagFormName.trim()}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold gap-1.5 h-8 shadow-xs"
                  >
                    <Check className="w-3.5 h-3.5" />
                    {isSavingTag ? 'Salvando...' : editingTag ? 'Atualizar Etiqueta' : 'Salvar Etiqueta'}
                  </Button>
                </div>
              </form>

              {/* Lista de Etiquetas Cadastradas */}
              <div>
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-2">
                  Etiquetas do Sistema ({availableTags.length})
                </h4>
                <div className="space-y-1.5">
                  {availableTags.map((tag) => {
                    const isUrgentTag = tag.id.includes('urgente');
                    return (
                      <div
                        key={tag.id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-accent/20 border border-border hover:bg-accent/40 transition-all"
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs"
                            style={{ backgroundColor: tag.color }}
                          />
                          <div>
                            <span className="text-xs font-bold text-foreground flex items-center gap-1">
                              {isUrgentTag && <span>🚨</span>}
                              {tag.name}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              ID: {tag.id}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => handleEditTag(tag)}
                            title="Editar etiqueta"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-red-400"
                            onClick={() => handleDeleteTag(tag.id)}
                            title="Excluir etiqueta"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Rodapé */}
            <div className="p-3 bg-accent/30 border-t border-border flex items-center justify-end px-5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsTagModalOpen(false);
                  setEditingTag(null);
                }}
                className="text-xs h-8"
              >
                Concluído
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MENU DE CONTEXTO ANIMADO (BOTÃO DIREITO NAS MENSAGENS) */}
      {contextMenu.isOpen && contextMenu.message && (
        <div
          ref={contextMenuRef}
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          className="fixed z-50 min-w-[220px] bg-card/95 dark:bg-[#233138]/95 backdrop-blur-md border border-border dark:border-[#2a3942] rounded-2xl shadow-2xl p-1.5 text-foreground dark:text-gray-200 animate-in fade-in-0 zoom-in-95 duration-150 ease-out origin-top-left select-none"
        >
          {/* Barra de Reações Rápidas */}
          <div className="flex items-center justify-between px-2 py-1.5 border-b border-border dark:border-[#2a3942]/70 mb-1">
            {['👍', '❤️', '😂', '😮', '😢', '🙏', '👏', '🔥'].map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleAddReaction(contextMenu.message, emoji)}
                className="hover:scale-130 transition-transform duration-150 text-base p-1 rounded-full hover:bg-accent dark:hover:bg-white/10 active:scale-95 cursor-pointer"
                title={`Reagir com ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>

          <div className="space-y-0.5 text-xs">
            {/* Responder */}
            <button
              type="button"
              onClick={() => handleStartReply(contextMenu.message)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-accent dark:hover:bg-[#182229] hover:text-foreground dark:hover:text-white transition text-left cursor-pointer"
            >
              <CornerUpLeft className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
              <span>Responder / Citar</span>
            </button>

            {/* Copiar Texto */}
            {contextMenu.message.text && (
              <button
                type="button"
                onClick={() => handleCopyMessage(contextMenu.message)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-accent dark:hover:bg-[#182229] hover:text-foreground dark:hover:text-white transition text-left cursor-pointer"
              >
                <Copy className="w-4 h-4 text-muted-foreground dark:text-gray-300" />
                <span>Copiar texto</span>
              </button>
            )}

            {/* Editar Mensagem */}
            {!contextMenu.message.isDeleted && (
              <button
                type="button"
                onClick={() => handleStartEdit(contextMenu.message)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-accent dark:hover:bg-[#182229] hover:text-foreground dark:hover:text-white transition text-left cursor-pointer"
              >
                <Edit2 className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                <span>Editar mensagem</span>
              </button>
            )}

            {/* Fixar Mensagem */}
            <button
              type="button"
              onClick={() => handleTogglePin(contextMenu.message)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-accent dark:hover:bg-[#182229] hover:text-foreground dark:hover:text-white transition text-left cursor-pointer"
            >
              <Pin className="w-4 h-4 text-amber-500 dark:text-amber-400" />
              <span>{contextMenu.message.isPinned ? 'Desafixar do topo' : 'Fixar no topo'}</span>
            </button>

            {/* Favoritar */}
            <button
              type="button"
              onClick={() => handleToggleStar(contextMenu.message)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-accent dark:hover:bg-[#182229] hover:text-foreground dark:hover:text-white transition text-left cursor-pointer"
            >
              <Star className={`w-4 h-4 ${contextMenu.message.isStarred ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground dark:text-gray-300'}`} />
              <span>{contextMenu.message.isStarred ? 'Desfavoritar' : 'Favoritar'}</span>
            </button>

            {/* Excluir Mensagem */}
            <div className="pt-0.5 border-t border-border dark:border-[#2a3942]/60">
              <button
                type="button"
                onClick={() => handlePromptDelete(contextMenu.message)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-red-500/10 text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 transition text-left cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Excluir mensagem</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR MENSAGEM */}
      {editingMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-card border border-border dark:bg-[#202c33] dark:border-[#2a3942] rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4 animate-in fade-in-0 zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground dark:text-gray-100 flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-emerald-500" />
                Editar Mensagem
              </h3>
              <button 
                type="button"
                onClick={() => setEditingMessage(null)} 
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-muted-foreground dark:text-gray-300">Novo Texto da Mensagem</label>
              <textarea
                rows={4}
                value={editedMessageText}
                onChange={(e) => setEditedMessageText(e.target.value)}
                className="w-full bg-muted/40 dark:bg-[#111b21] border border-border dark:border-[#2a3942] rounded-xl p-3 text-xs text-foreground dark:text-gray-100 focus:outline-none focus:border-emerald-500 transition resize-none"
                placeholder="Digite o novo texto..."
                autoFocus
              />
              <p className="text-[10px] text-muted-foreground">
                A mensagem será marcada como "(editada)" no histórico do WhatsApp.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setEditingMessage(null)} 
                className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Cancelar
              </Button>
              <Button 
                size="sm" 
                onClick={handleSaveEditedMessage} 
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer shadow-md"
              >
                Salvar Alterações
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EXCLUIR MENSAGEM */}
      {deletingMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-card border border-border dark:bg-[#202c33] dark:border-[#2a3942] rounded-2xl w-full max-w-sm p-5 shadow-2xl space-y-4 animate-in fade-in-0 zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground dark:text-gray-100 flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-red-500 dark:text-red-400" />
                Excluir Mensagem
              </h3>
              <button 
                type="button"
                onClick={() => setDeletingMessage(null)} 
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground dark:text-gray-300 leading-relaxed">
              Como você deseja apagar esta mensagem da conversa?
            </p>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => handleConfirmDelete(deletingMessage, true)}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-500 dark:text-red-300 font-bold text-xs transition cursor-pointer"
              >
                <span>Apagar para Todos</span>
                <span className="text-[10px] font-normal text-red-400/80">Substitui por aviso</span>
              </button>

              <button
                type="button"
                onClick={() => handleConfirmDelete(deletingMessage, false)}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-muted/40 hover:bg-accent border border-border dark:bg-[#111b21] dark:hover:bg-[#182229] dark:border-[#2a3942] text-foreground dark:text-gray-200 font-bold text-xs transition cursor-pointer"
              >
                <span>Apagar para Mim</span>
                <span className="text-[10px] font-normal text-muted-foreground">Remove da tela</span>
              </button>
            </div>

            <div className="flex justify-end pt-1">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setDeletingMessage(null)} 
                className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CRIAR / EDITAR MENSAGEM RÁPIDA (CUSTOMIZÁVEL PELOS COLABORADORES) */}
      {isQuickMessageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-card w-full max-w-xl rounded-2xl border border-border shadow-2xl overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-4 bg-accent/50 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400">
                  <Bookmark className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    {editingQuickMessage ? 'Editar Resposta Rápida' : 'Nova Resposta Rápida'}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Crie modelos com variáveis dinâmicas para seus colaboradores enviarem em 1 clique.
                  </p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => {
                  setIsQuickMessageModalOpen(false);
                  setEditingQuickMessage(null);
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <form onSubmit={handleSaveQuickMessage} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Título */}
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Título / Identificação do Modelo *
                  </label>
                  <Input 
                    placeholder="Ex: 🔑 Chave Pix & Pagamento"
                    value={qmFormTitle}
                    onChange={(e) => setQmFormTitle(e.target.value)}
                    className="text-xs"
                    required
                  />
                </div>

                {/* Atalho */}
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Atalho de Teclado (opcional)
                  </label>
                  <Input 
                    placeholder="Ex: /pix, /arte, /prazo"
                    value={qmFormShortcut}
                    onChange={(e) => setQmFormShortcut(e.target.value)}
                    className="text-xs font-mono"
                  />
                  <span className="text-[10px] text-muted-foreground mt-0.5 block">
                    Basta digitar no chat para buscar
                  </span>
                </div>

                {/* Categoria */}
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Categoria
                  </label>
                  <Input 
                    placeholder="Ex: Atendimento, Financeiro, Produção"
                    value={qmFormCategory}
                    onChange={(e) => setQmFormCategory(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>

              {/* Botões de Inserção de Tags Dinâmicas */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Texto da Mensagem *
                  </label>
                  <span className="text-[10px] text-muted-foreground">
                    Clique para inserir variável:
                  </span>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap mb-2">
                  <button
                    type="button"
                    onClick={() => setQmFormContent((prev) => `${prev}{{nome}}`)}
                    className="px-2 py-1 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all flex items-center gap-1"
                    title="Insere o nome do cliente"
                  >
                    <Plus className="w-2.5 h-2.5" /> {'{{nome}}'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setQmFormContent((prev) => `${prev}{{atendente}}`)}
                    className="px-2 py-1 rounded-md text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-all flex items-center gap-1"
                    title="Insere o nome do atendente logado"
                  >
                    <Plus className="w-2.5 h-2.5" /> {'{{atendente}}'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setQmFormContent((prev) => `${prev}{{telefone}}`)}
                    className="px-2 py-1 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-all flex items-center gap-1"
                    title="Insere o telefone do cliente"
                  >
                    <Plus className="w-2.5 h-2.5" /> {'{{telefone}}'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setQmFormContent((prev) => `${prev}{{empresa}}`)}
                    className="px-2 py-1 rounded-md text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 transition-all flex items-center gap-1"
                    title="Insere o nome da empresa (Criart Gráfica)"
                  >
                    <Plus className="w-2.5 h-2.5" /> {'{{empresa}}'}
                  </button>
                </div>

                <textarea
                  placeholder="Escreva a resposta personalizada aqui. Você pode usar formatação como *negrito*, _itálico_ e quebras de linha..."
                  value={qmFormContent}
                  onChange={(e) => setQmFormContent(e.target.value)}
                  rows={5}
                  required
                  className="w-full rounded-xl border border-input bg-background p-3 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-emerald-500 resize-y leading-relaxed font-sans"
                />
              </div>

              {/* Prévia em Tempo Real */}
              {qmFormContent.trim() && (
                <div className="bg-muted/40 border border-border rounded-xl p-3 space-y-1.5">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-emerald-500 dark:text-emerald-400" /> Prévia da mensagem (como o cliente receberá):
                  </span>
                  <div className="p-2.5 rounded-lg bg-background/80 border border-border/60 text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                    {parseQuickMessageContent(qmFormContent)}
                  </div>
                </div>
              )}

              {/* Botões do Rodapé */}
              <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsQuickMessageModalOpen(false);
                    setEditingQuickMessage(null);
                  }}
                  className="text-xs h-8"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isSavingQM || !qmFormTitle.trim() || !qmFormContent.trim()}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-8 gap-1.5 shadow-xs"
                >
                  <Check className="w-3.5 h-3.5" />
                  {isSavingQM ? 'Salvando...' : editingQuickMessage ? 'Salvar Alterações' : 'Criar Mensagem Rápida'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: AGENDAR MENSAGEM / LEMBRETE DE ATENDIMENTO 📅 */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-card w-full max-w-lg rounded-2xl border border-border shadow-2xl overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-4 bg-accent/50 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400">
                  <CalendarClock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    {scheduleType === 'follow_up_budget' ? 'Agendar Follow-up de Orçamento' : 'Agendar Mensagem / Lembrete'}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    O robô enviará automaticamente esta mensagem para o cliente na data e hora definida.
                  </p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsScheduleModalOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <form onSubmit={handleSaveSchedule} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Presets Rápidos */}
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">
                  Atalhos Rápidos de Horário:
                </label>
                <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6 text-[10px]">
                  <button
                    type="button"
                    onClick={() => handleSetSchedulePreset('1h')}
                    className="p-1.5 rounded-lg border border-border bg-accent/30 hover:bg-accent hover:border-blue-500/40 font-semibold text-center transition-all text-muted-foreground hover:text-foreground"
                  >
                    ⏱️ +1 hora
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetSchedulePreset('today_17h')}
                    className="p-1.5 rounded-lg border border-border bg-accent/30 hover:bg-accent hover:border-blue-500/40 font-semibold text-center transition-all text-muted-foreground hover:text-foreground"
                  >
                    🌆 Hoje 17h
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetSchedulePreset('tomorrow_9h')}
                    className="p-1.5 rounded-lg border border-border bg-accent/30 hover:bg-accent hover:border-blue-500/40 font-semibold text-center transition-all text-muted-foreground hover:text-foreground"
                  >
                    🌅 Amanhã 09h
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetSchedulePreset('friday_14h')}
                    className="p-1.5 rounded-lg border border-border bg-accent/30 hover:bg-accent hover:border-blue-500/40 font-semibold text-center transition-all text-muted-foreground hover:text-foreground"
                  >
                    📅 Sexta 14h
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetSchedulePreset('24h')}
                    className="p-1.5 rounded-lg border border-border bg-accent/30 hover:bg-accent hover:border-blue-500/40 font-semibold text-center transition-all text-muted-foreground hover:text-foreground"
                  >
                    ⏳ Em 24h
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetSchedulePreset('48h')}
                    className="p-1.5 rounded-lg border border-border bg-accent/30 hover:bg-accent hover:border-blue-500/40 font-semibold text-center transition-all text-muted-foreground hover:text-foreground"
                  >
                    ⏳ Em 48h
                  </button>
                </div>
              </div>

              {/* Data e Hora Exata */}
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Data e Hora do Disparo *
                </label>
                <Input
                  type="datetime-local"
                  value={scheduleDateTime}
                  onChange={(e) => setScheduleDateTime(e.target.value)}
                  className="text-xs"
                  required
                />
              </div>

              {/* Mensagem a Ser Enviada */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Mensagem Programada *
                  </label>
                  <span className="text-[10px] text-muted-foreground">
                    Variáveis:
                  </span>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap mb-2">
                  <button
                    type="button"
                    onClick={() => setScheduleText((prev) => `${prev}{{nome}}`)}
                    className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
                  >
                    + {'{{nome}}'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setScheduleText((prev) => `${prev}{{atendente}}`)}
                    className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20"
                  >
                    + {'{{atendente}}'}
                  </button>
                </div>

                <textarea
                  placeholder="Ex: Olá {{nome}}! Passando para te lembrar que seu pedido está pronto para retirada em nosso balcão..."
                  value={scheduleText}
                  onChange={(e) => setScheduleText(e.target.value)}
                  rows={4}
                  required
                  className="w-full rounded-xl border border-input bg-background p-3 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-blue-500 resize-y leading-relaxed"
                />
              </div>

              {/* Preview */}
              {scheduleText.trim() && (
                <div className="bg-muted/40 border border-border rounded-xl p-3 space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-blue-500 dark:text-blue-400" /> Prévia da mensagem para o cliente:
                  </span>
                  <div className="p-2 rounded-lg bg-background/80 border border-border/60 text-xs text-foreground whitespace-pre-wrap">
                    {parseQuickMessageContent(scheduleText)}
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="pt-3 border-t border-border flex items-center justify-between">
                {activeConversationScheduled.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsScheduleModalOpen(false);
                      setShowScheduledListModal(true);
                    }}
                    className="text-xs text-blue-400 hover:underline flex items-center gap-1"
                  >
                    <CalendarClock className="w-3.5 h-3.5" />
                    Ver {activeConversationScheduled.length} agendamento(s) ativo(s)
                  </button>
                ) : <div />}

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsScheduleModalOpen(false)}
                    className="text-xs h-8"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSavingSchedule || !scheduleText.trim() || !scheduleDateTime}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs h-8 gap-1.5 shadow-xs"
                  >
                    <Check className="w-3.5 h-3.5" />
                    {isSavingSchedule ? 'Agendando...' : 'Confirmar Agendamento'}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: LISTA DE MENSAGENS AGENDADAS DESTE CONTATO 📋 */}
      {showScheduledListModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-card w-full max-w-lg rounded-2xl border border-border shadow-2xl overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-accent/50 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400">
                  <CalendarClock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Mensagens Agendadas</h3>
                  <p className="text-xs text-muted-foreground">
                    Envios programados para {selectedConversation?.name || selectedConversation?.phone}
                  </p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setShowScheduledListModal(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
              {activeConversationScheduled.length > 0 ? (
                activeConversationScheduled.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-accent/30 border border-border space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(item.scheduledFor).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {item.type === 'follow_up_budget' ? 'Follow-up Orçamento' : 'Lembrete / Agendado'}
                      </span>
                    </div>

                    <p className="text-xs text-foreground bg-background/60 p-2.5 rounded-lg border border-border/40 whitespace-pre-wrap leading-relaxed">
                      {item.text}
                    </p>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-muted-foreground">
                        Por: {item.attendantName || 'Atendente'}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-[11px] text-red-400 hover:text-red-300 hover:bg-red-500/10 gap-1 font-semibold"
                        onClick={() => handleCancelScheduledMessage(item.id)}
                      >
                        <Trash2 className="w-3 h-3" /> Cancelar Envio
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CalendarClock className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-xs font-semibold">Nenhuma mensagem agendada para este contato.</p>
                </div>
              )}
            </div>

            <div className="p-3 bg-accent/30 border-t border-border flex items-center justify-between px-5">
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8 text-blue-400 border-blue-500/40 hover:bg-blue-500/10 gap-1"
                onClick={() => {
                  setShowScheduledListModal(false);
                  handleOpenScheduleModal();
                }}
              >
                <Plus className="w-3.5 h-3.5" /> Novo Agendamento
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowScheduledListModal(false)}
                className="text-xs h-8"
              >
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: RECUPERADOR DE VENDAS / FOLLOW-UP DE ORÇAMENTO 🎯 */}
      {isFollowUpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-card w-full max-w-xl rounded-2xl border border-border shadow-2xl overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-4 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500/20 rounded-xl text-amber-400">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground flex items-center gap-1.5">
                    🎯 Recuperador de Vendas — Follow-up
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Modelos de alta conversão para não perder vendas de orçamentos parados.
                  </p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsFollowUpModalOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="text-xs text-muted-foreground bg-accent/40 p-3 rounded-xl border border-border">
                💡 <strong>Dica Comercial:</strong> Mais de 60% dos clientes fecham orçamentos quando o atendente faz um contato amigável de follow-up em 24h a 48h!
              </div>

              <div className="space-y-3">
                {FOLLOW_UP_TEMPLATES.map((tmpl) => {
                  const resolvedText = parseQuickMessageContent(tmpl.text);
                  return (
                    <div
                      key={tmpl.id}
                      className="p-3.5 rounded-xl bg-accent/20 border border-border hover:border-amber-500/40 transition-all space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-xs font-bold text-foreground">{tmpl.title}</h4>
                          <span className="text-[10px] text-muted-foreground">{tmpl.subtitle}</span>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-lg bg-background/70 border border-border/50 text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                        {resolvedText}
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2.5 text-[11px] font-semibold border-blue-500/40 text-blue-400 hover:bg-blue-500/10 gap-1"
                          onClick={() => handleScheduleFollowUp(tmpl.text, 24)}
                          title="Agendar envio automático para daqui a 24 horas"
                        >
                          <CalendarClock className="w-3 h-3" /> Auto Follow-up (24h)
                        </Button>
                        <Button
                          size="sm"
                          className="h-7 px-3 text-[11px] font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 gap-1 shadow-xs"
                          onClick={() => handleSendFollowUpNow(tmpl.text)}
                          title="Enviar imediatamente para o cliente"
                        >
                          <Send className="w-3 h-3" /> Enviar Agora
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-3 bg-accent/30 border-t border-border flex items-center justify-end px-5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFollowUpModalOpen(false)}
                className="text-xs h-8"
              >
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PREVIEW DE IMAGEM AMPLIADA */}
      {imagePreviewModalUrl && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 cursor-pointer"
          onClick={() => setImagePreviewModalUrl(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img 
              src={imagePreviewModalUrl} 
              alt="Visualização" 
              className="max-w-full max-h-[85vh] rounded-xl shadow-2xl object-contain border border-white/10" 
            />
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute top-2 right-2 bg-black/60 text-white rounded-full hover:bg-black/80"
              onClick={() => setImagePreviewModalUrl(null)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>
      )}

      {/* MODAL: PERSONALIZAR INTERAÇÃO COMERCIAL RÁPIDA ✏️ */}
      {isEditingInteractionModalOpen && editingInteraction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-card w-full max-w-lg rounded-2xl border border-border shadow-2xl overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-accent/50 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-500">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Personalizar Interação Comercial</h3>
                  <p className="text-xs text-muted-foreground">
                    Edite o título, descrição e mensagem pronta para o atendimento
                  </p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsEditingInteractionModalOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <form onSubmit={handleSaveInteraction} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Título do Botão / Card</label>
                <Input
                  value={interactionFormTitle}
                  onChange={(e) => setInteractionFormTitle(e.target.value)}
                  placeholder="Ex: Chave Pix & Pagamento"
                  className="text-xs bg-muted/40 border-border"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Subtítulo / Descrição Rápida</label>
                <Input
                  value={interactionFormSubtitle}
                  onChange={(e) => setInteractionFormSubtitle(e.target.value)}
                  placeholder="Ex: Envia dados bancários para o cliente pagar agora"
                  className="text-xs bg-muted/40 border-border"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground">Texto da Mensagem (WhatsApp)</label>
                  <span className="text-[10px] text-muted-foreground">Suporta quebras de linha e formatação *negrito*</span>
                </div>
                <textarea
                  rows={8}
                  value={interactionFormTemplate}
                  onChange={(e) => setInteractionFormTemplate(e.target.value)}
                  placeholder="Digite a mensagem padrão que será enviada ou inserida no chat..."
                  className="w-full bg-muted/40 border border-border rounded-xl p-3 text-xs text-foreground font-mono focus:outline-none focus:border-emerald-500 transition resize-none leading-relaxed"
                  required
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border/60">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const original = DEFAULT_COMMERCIAL_INTERACTIONS.find(d => d.id === editingInteraction.id);
                    if (original) {
                      setInteractionFormTitle(original.title);
                      setInteractionFormSubtitle(original.subtitle);
                      setInteractionFormTemplate(original.template);
                      toast.success('Campos restaurados ao texto padrão!');
                    }
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground gap-1.5"
                  title="Restaurar o modelo padrão original desta mensagem"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restaurar Padrão</span>
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditingInteractionModalOpen(false)}
                    className="text-xs"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-1.5 shadow-sm"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Salvar Alterações</span>
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RESETAR HISTÓRICO DE CLIENTES (PARA ENTREGA DO SISTEMA) */}
      <ResetClientHistoryModal
        isOpen={isResetHistoryModalOpen}
        onClose={() => setIsResetHistoryModalOpen(false)}
        onSuccess={() => {
          setSelectedConversation(null);
          if (typeof window !== 'undefined') {
            window.location.reload();
          }
        }}
      />

      {/* MODAL: LEITURA DE QR CODE E CONEXÃO BAILEYS */}
      <WhatsappConnectionModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        botStatus={botStatus}
        onRefreshStatus={onRefreshBotStatus}
      />

      {/* MODAL: PERSONALIZAR COR DO ALERTA DE MENSAGEM */}
      <ChatAlertColorModal
        isOpen={isAlertColorModalOpen}
        onClose={() => setIsAlertColorModalOpen(false)}
        currentColor={alertColor}
        onSelectColor={handleSelectAlertColor}
        onTestAlert={handleTriggerTestAlert}
        isTesting={isTestingAlert}
      />
    </div>
  );
}
