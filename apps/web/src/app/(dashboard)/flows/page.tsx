'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  GitBranch, 
  Play, 
  Save, 
  RotateCcw, 
  Plus, 
  Trash2, 
  Smartphone, 
  Send, 
  CheckCircle2, 
  MessageSquare, 
  Building2, 
  Sparkles, 
  Layers, 
  Settings2, 
  ArrowRight, 
  HelpCircle, 
  Users, 
  Zap, 
  Copy, 
  Edit3, 
  ChevronRight,
  ShieldCheck,
  Check,
  X,
  Search,
  Database,
  PhoneCall,
  ExternalLink,
  RefreshCw,
  Flame,
  Snowflake,
  Clock,
  User,
  DollarSign,
  MapPin,
  CreditCard,
  MessageCircle,
  MessageSquareText,
  UserCheck,
  UserPlus,
  Heart,
  Briefcase,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { 
  BotFlow, 
  BotStep, 
  FlowOption, 
  FaqRule,
  getStoredFlows,
  saveStoredFlows,
  getActiveFlowIdFromStorage,
  setActiveFlowIdInStorage,
  simulateFlowStep,
  compileFlowText
} from '@/lib/bot-flow';
import {
  ConversationConfig,
  ClientConversation,
  ConversationStats,
  CustomFaqRule,
  DEFAULT_CONVERSATION_CONFIG,
  ClassifiedContact,
  ContactType,
  ContactsStats,
} from '@/lib/conversation';
import { safeWhatsAppClient } from '../whatsapp/whatsapp-client';
import { useLeads } from '@/hooks/use-leads';
import toast from 'react-hot-toast';

export default function FlowsPage() {
  const { data: leads = [] } = useLeads();
  const [flows, setFlows] = useState<BotFlow[]>(() => getStoredFlows());
  const [activeFlowId, setActiveFlowId] = useState<string>(() => {
    const list = getStoredFlows();
    return getActiveFlowIdFromStorage(list);
  });
  const [selectedFlow, setSelectedFlow] = useState<BotFlow | null>(() => {
    const list = getStoredFlows();
    const actId = getActiveFlowIdFromStorage(list);
    return list.find((f) => f.id === actId) || list[0] || null;
  });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'knowledge' | 'conversations' | 'contacts' | 'faq' | 'editor' | 'templates' | 'trigger'>('contacts');

  // Estado do Banco de Contatos Classificados (Clientes vs Amigos)
  const [contacts, setContacts] = useState<ClassifiedContact[]>([]);
  const [contactsStats, setContactsStats] = useState<ContactsStats>({
    totalContacts: 0,
    clientsCount: 0,
    friendsCount: 0,
    botActiveCount: 0,
  });
  const [contactsSearch, setContactsSearch] = useState('');
  const [contactsTypeFilter, setContactsTypeFilter] = useState<'all' | 'cliente' | 'amigo'>('all');
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [newFriendInput, setNewFriendInput] = useState('');
  const [newFriendNotes, setNewFriendNotes] = useState('');

  // Estado da Configuração Manual da Empresa e Conhecimento
  const [config, setConfig] = useState<ConversationConfig>(DEFAULT_CONVERSATION_CONFIG);
  const [savingConfig, setSavingConfig] = useState(false);
  const [saving, setSaving] = useState(false);

  // Estado do Banco de Dados de Conversas
  const [conversations, setConversations] = useState<ClientConversation[]>([]);
  const [convStats, setConvStats] = useState<ConversationStats>({
    totalConversations: 0,
    totalMessages: 0,
    hotLeadsCount: 0,
    intentsRanking: {},
  });
  const [convSearch, setConvSearch] = useState('');
  const [convStatusFilter, setConvStatusFilter] = useState('all');
  const [selectedConversation, setSelectedConversation] = useState<ClientConversation | null>(null);
  const [loadingConversations, setLoadingConversations] = useState(false);

  // Filtros da aba de modelos
  const [templateSearch, setTemplateSearch] = useState('');

  // Estado do Editor de Etapa Selecionada
  const [editingStepIndex, setEditingStepIndex] = useState<number>(0);

  // Estado do Simulador de WhatsApp
  const [simMessages, setSimMessages] = useState<Array<{ sender: 'bot' | 'user'; text: string; time: string }>>([]);
  const [simCurrentStepId, setSimCurrentStepId] = useState<string | null>(null);
  const [simInput, setSimInput] = useState('');
  const [simData, setSimData] = useState<Record<string, string>>({});
  const [isSimTyping, setIsSimTyping] = useState(false);
  const simChatRef = useRef<HTMLDivElement>(null);

  // Estado do Disparador de Leads
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [isTriggering, setIsTriggering] = useState(false);

  // Filtro de modelos por busca
  const filteredFlows = useMemo(() => {
    if (!templateSearch.trim()) return flows;
    const query = templateSearch.toLowerCase().trim();
    return flows.filter(flow => {
      return (
        flow.name.toLowerCase().includes(query) ||
        flow.segment.toLowerCase().includes(query) ||
        flow.companyName.toLowerCase().includes(query) ||
        flow.description.toLowerCase().includes(query)
      );
    });
  }, [flows, templateSearch]);

  // Carrega configurações manuais da API
  const loadConversationConfig = async () => {
    try {
      const res = await safeWhatsAppClient.get('/conversation-config');
      if (res.data?.data) {
        setConfig(res.data.data);
      }
    } catch {}
  };

  // Carrega banco de dados de conversas gravadas
  const loadConversations = async () => {
    try {
      setLoadingConversations(true);
      const query = new URLSearchParams();
      if (convStatusFilter !== 'all') query.set('status', convStatusFilter);
      if (convSearch) query.set('search', convSearch);
      const res = await safeWhatsAppClient.get(`/conversations?${query.toString()}`);
      if (res.data?.data) {
        setConversations(res.data.data.items || []);
        if (res.data.data.stats) {
          setConvStats(res.data.data.stats);
        }
      }
    } catch {
    } finally {
      setLoadingConversations(false);
    }
  };

  // Carrega fluxos da API com sincronização transparente
  const loadFlows = async () => {
    try {
      const res = await safeWhatsAppClient.get('/flows');
      const data = res.data?.data;
      if (data?.flows && Array.isArray(data.flows) && data.flows.length > 0) {
        setFlows(data.flows);
        saveStoredFlows(data.flows);
        const active = data.activeFlow || data.flows.find((f: BotFlow) => f.isActive) || data.flows[0];
        if (active) {
          setActiveFlowId(active.id);
          setActiveFlowIdInStorage(active.id);
          setSelectedFlow(active);
          initSimulation(active);
        }
      }
    } catch {
      // Modo resiliente local ativo
    }
  };

  useEffect(() => {
    if (selectedFlow) {
      initSimulation(selectedFlow);
    }
    loadFlows();
    loadConversationConfig();
    loadConversations();
    loadClassifiedContacts();
  }, []);

  // Recarrega contatos ao trocar filtro ou busca
  useEffect(() => {
    if (activeTab === 'contacts') {
      loadClassifiedContacts();
    }
  }, [activeTab, contactsTypeFilter, contactsSearch]);

  // Recarrega conversas ao trocar de filtro ou busca
  useEffect(() => {
    if (activeTab === 'conversations') {
      loadConversations();
    }
  }, [activeTab, convStatusFilter, convSearch]);

  // Carrega lista de contatos classificados
  const loadClassifiedContacts = async () => {
    try {
      setLoadingContacts(true);
      const params = new URLSearchParams();
      if (contactsTypeFilter !== 'all') params.append('type', contactsTypeFilter);
      if (contactsSearch) params.append('search', contactsSearch);

      const res = await safeWhatsAppClient.get(`/whatsapp/contacts?${params.toString()}`);
      if (res.data?.success && res.data?.data) {
        setContacts(res.data.data.items || []);
        if (res.data.data.stats) {
          setContactsStats(res.data.data.stats);
        }
      }
    } catch (e: any) {
      console.warn('Erro ao carregar contatos classificados:', e);
    } finally {
      setLoadingContacts(false);
    }
  };

  const handleToggleContactType = async (jidOrPhone: string, newType: ContactType, name?: string) => {
    try {
      const res = await safeWhatsAppClient.post('/whatsapp/contacts/classify', {
        jid: jidOrPhone,
        type: newType,
        name,
      });
      if (res.data?.success) {
        toast.success(newType === 'amigo' 
          ? 'Contato marcado como Amigo! Robô silenciado para conversas pessoais.' 
          : 'Contato marcado como Cliente! Robô ativará fluxo de atendimento.');
        loadClassifiedContacts();
        loadConversations();
      }
    } catch {
      toast.error('Erro ao atualizar classificação do contato.');
    }
  };

  const handleAddFriend = async () => {
    if (!newFriendInput.trim()) {
      toast.error('Por favor informe o nome ou telefone do amigo.');
      return;
    }
    try {
      const res = await safeWhatsAppClient.post('/whatsapp/contacts/add-friend', {
        phoneOrName: newFriendInput.trim(),
        notes: newFriendNotes.trim() || 'Cadastrado manualmente como Amigo',
      });
      if (res.data?.success) {
        toast.success(`"${newFriendInput}" cadastrado como Amigo!`);
        setShowAddFriendModal(false);
        setNewFriendInput('');
        setNewFriendNotes('');
        loadClassifiedContacts();
      }
    } catch {
      toast.error('Erro ao cadastrar amigo.');
    }
  };

  const handleClearHumanSilence = async (id?: string) => {
    try {
      const res = await safeWhatsAppClient.post('/whatsapp/contacts/clear-silence', { id });
      if (res.data?.success) {
        toast.success(res.data?.message || 'Silêncio liberado!');
        loadClassifiedContacts();
        loadConversations();
      }
    } catch {
      toast.error('Erro ao liberar silêncio.');
    }
  };

  const handleDeleteContact = async (id: string) => {
    if (!confirm('Deseja remover este contato da base?')) return;
    try {
      const res = await safeWhatsAppClient.delete(`/whatsapp/contacts/${id}`);
      if (res.data?.success) {
        toast.success('Contato removido.');
        loadClassifiedContacts();
      }
    } catch {
      toast.error('Erro ao remover contato.');
    }
  };

  // Salvar configuração manual do negócio
  const handleSaveConfig = async (newConf?: ConversationConfig) => {
    const toSave = newConf || config;
    try {
      setSavingConfig(true);
      await safeWhatsAppClient.post('/conversation-config', toSave);
      setConfig(toSave);
      toast.success('Configurações manuais e inteligência do robô salvas com sucesso!');
    } catch {
      toast.error('Erro ao salvar configurações.');
    } finally {
      setSavingConfig(false);
    }
  };

  // Remover conversa individual do banco de dados
  const handleDeleteConversation = async (id: string) => {
    try {
      await safeWhatsAppClient.delete(`/conversations/${id}`);
      setConversations(prev => prev.filter(c => c.id !== id));
      if (selectedConversation?.id === id) setSelectedConversation(null);
      toast.success('Conversa removida do histórico.');
    } catch {
      toast.error('Erro ao remover conversa.');
    }
  };

  // Limpar todo o banco de conversas
  const handleClearAllConversations = async () => {
    if (!confirm('Deseja realmente limpar todo o histórico de conversas do banco de dados?')) return;
    try {
      await safeWhatsAppClient.delete('/conversations');
      setConversations([]);
      setSelectedConversation(null);
      setConvStats({ totalConversations: 0, totalMessages: 0, hotLeadsCount: 0, intentsRanking: {} });
      toast.success('Banco de dados de conversas limpo com sucesso.');
    } catch {
      toast.error('Erro ao limpar conversas.');
    }
  };

  // Inicializa o simulador com a primeira mensagem do fluxo
  const initSimulation = (flow: BotFlow) => {
    if (!flow || !flow.steps || flow.steps.length === 0) {
      setSimMessages([]);
      setSimCurrentStepId(null);
      setSimData({});
      return;
    }
    const firstStep = flow.steps[0];
    const initialText = compileFlowText(firstStep.message, flow, undefined, {});

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    setSimMessages([
      {
        sender: 'bot',
        text: initialText,
        time: timeStr,
      }
    ]);
    setSimCurrentStepId(firstStep.id);
    setSimData({});
  };

  // Scroll automático do simulador
  useEffect(() => {
    if (simChatRef.current) {
      simChatRef.current.scrollTop = simChatRef.current.scrollHeight;
    }
  }, [simMessages, isSimTyping]);

  // Enviar mensagem no simulador de WhatsApp
  const handleSimSend = async (messageText?: string) => {
    const textToSend = messageText || simInput;
    if (!textToSend.trim() || !selectedFlow) return;

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const newMessages = [
      ...simMessages,
      {
        sender: 'user' as const,
        text: textToSend,
        time: timeStr,
      }
    ];

    setSimMessages(newMessages);
    setSimInput('');
    setIsSimTyping(true);

    try {
      // 1. Tenta simulação com a inteligência conversacional primeiro se for pergunta de FAQ/Preço/Endereço
      const norm = textToSend.toLowerCase();
      const isQuickDoubt = /preco|valor|custa|onde fica|endereco|pix|cartao|horario|quem e|o que fazem/.test(norm);

      let botReply = '';
      let nextStepId = simCurrentStepId;

      if (isQuickDoubt) {
        try {
          const brainSim = await safeWhatsAppClient.post('/conversations/simulate', {
            message: textToSend,
            name: 'Cliente Teste'
          });
          if (brainSim.data?.data?.reply) {
            botReply = brainSim.data.data.reply;
          }
        } catch {}
      }

      if (!botReply) {
        const stepResult = simulateFlowStep(
          selectedFlow, 
          simCurrentStepId, 
          textToSend, 
          simData
        );
        botReply = stepResult.botReply;
        nextStepId = stepResult.nextStepId;
        setSimData(stepResult.updatedData);
      }

      setTimeout(() => {
        setIsSimTyping(false);
        const replyNow = new Date();
        const replyTime = `${String(replyNow.getHours()).padStart(2, '0')}:${String(replyNow.getMinutes()).padStart(2, '0')}`;

        setSimMessages(prev => [
          ...prev,
          {
            sender: 'bot',
            text: botReply,
            time: replyTime,
          }
        ]);
        setSimCurrentStepId(nextStepId);
      }, 700);

    } catch {
      setIsSimTyping(false);
    }
  };

  // Salvar alterações do fluxo
  const handleSaveFlow = async () => {
    if (!selectedFlow) return;
    try {
      setSaving(true);
      const updatedList = flows.map((f) => (f.id === selectedFlow.id ? selectedFlow : f));
      setFlows(updatedList);
      saveStoredFlows(updatedList);

      try {
        await safeWhatsAppClient.post('/flows', selectedFlow);
      } catch {}

      toast.success('Fluxo de conversação salvo com sucesso!');
    } catch {
      toast.error('Erro ao salvar o fluxo.');
    } finally {
      setSaving(false);
    }
  };

  // Ativar fluxo selecionado para o robô de WhatsApp
  const handleActivateFlow = async (flowId: string) => {
    try {
      const updatedList = flows.map((f) => ({
        ...f,
        isActive: f.id === flowId,
      }));
      setFlows(updatedList);
      saveStoredFlows(updatedList);
      setActiveFlowId(flowId);
      setActiveFlowIdInStorage(flowId);

      const targetFlow = updatedList.find(f => f.id === flowId);
      if (targetFlow) {
        setSelectedFlow(targetFlow);
        initSimulation(targetFlow);
      }

      try {
        await safeWhatsAppClient.post(`/flows/${flowId}/activate`);
      } catch {}

      toast.success(`Fluxo ativado para o robô de WhatsApp!`);
    } catch {
      toast.error('Erro ao ativar o fluxo.');
    }
  };

  // Selecionar outro fluxo para edição
  const handleSelectFlow = (flow: BotFlow) => {
    setSelectedFlow(flow);
    setEditingStepIndex(0);
    initSimulation(flow);
    setActiveTab('editor');
  };

  // Criar novo fluxo do zero
  const handleCreateNewFlow = () => {
    const newFlow: BotFlow = {
      id: `flow-custom-${Date.now()}`,
      name: 'Novo Fluxo Personalizado',
      segment: config.segment || 'Comércio & Serviços',
      companyName: config.businessName || 'Minha Empresa',
      description: 'Fluxo construído sob medida para atendimento e qualificação de clientes.',
      isActive: false,
      isTemplate: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      steps: [
        {
          id: 'step-1',
          title: 'Primeira Saudação e Apresentação',
          type: 'question_choice',
          message: '{Olá|Oi|Tudo bem?} Seja bem-vindo(a) à *{{minha_empresa}}*! 👋\n\nComo posso te ajudar hoje?\n\n*1️⃣* - Quero saber mais sobre os serviços\n*2️⃣* - Fazer um orçamento sem compromisso\n*3️⃣* - Falar com atendente humano',
          options: [
            { id: 'opt-1', key: '1', label: 'Conhecer Serviços', nextStepId: 'step-2' },
            { id: 'opt-2', key: '2', label: 'Fazer Orçamento', nextStepId: 'step-2', action: 'qualify_lead' },
            { id: 'opt-3', key: '3', label: 'Falar com Humano', nextStepId: 'step-humano', action: 'transfer_human' },
          ],
        },
        {
          id: 'step-2',
          title: 'Pergunta do Nome ou Detalhes',
          type: 'question_text',
          message: 'Com certeza! Para te passarmos as melhores informações, qual é o seu *Nome* e o que você precisa?',
          freeTextNextStepId: 'step-3',
          saveToField: 'detalhes_cliente',
        },
        {
          id: 'step-3',
          title: 'Encerramento e Transferência',
          type: 'closing',
          message: 'Perfeito! Anotei seus dados. Nosso especialista já está assumindo a conversa aqui para te passar todos os detalhes. Aguarde só um instante!',
          isEnd: true,
          action: 'transfer_human',
        },
        {
          id: 'step-humano',
          title: 'Transferência Imediata',
          type: 'closing',
          message: 'Com certeza! Já notifiquei nossa equipe e um atendente continuará seu atendimento agora mesmo.',
          isEnd: true,
          action: 'transfer_human',
        }
      ],
      faqRules: [
        {
          id: 'faq-1',
          keywords: ['preco', 'valor', 'quanto custa', 'tabela'],
          reply: 'Nossos valores são sob medida para cada cliente. Descreva o que você precisa que já te passamos a cotação exata!',
        }
      ],
    };

    setFlows(prev => [newFlow, ...prev]);
    setSelectedFlow(newFlow);
    setEditingStepIndex(0);
    initSimulation(newFlow);
    setActiveTab('editor');
    toast.success('Novo fluxo criado!');
  };

  // Disparo para Leads
  const handleTriggerFlow = async () => {
    if (!selectedFlow || selectedLeadIds.length === 0) return;
    const leadsToTrigger = leads
      .filter((l: any) => selectedLeadIds.includes(l.id) && l.phone)
      .map((l: any) => ({
        id: l.id,
        name: l.name,
        phone: l.phone,
        category: l.category || l.subcategory,
      }));

    if (leadsToTrigger.length === 0) {
      toast.error('Nenhum lead com telefone válido selecionado.');
      return;
    }

    try {
      setIsTriggering(true);
      await safeWhatsAppClient.post('/flows/trigger', {
        flowId: selectedFlow.id,
        leads: leadsToTrigger,
      });

      toast.success(`Disparo do fluxo "${selectedFlow.name}" iniciado para ${leadsToTrigger.length} clientes!`);
      setSelectedLeadIds([]);
    } catch (err: any) {
      toast.error(err?.message || 'Falha ao acionar clientes.');
    } finally {
      setIsTriggering(false);
    }
  };

  const currentStep: BotStep | undefined = selectedFlow?.steps[editingStepIndex];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      
      {/* 🛡️ Banner de Blindagem contra Grupos de WhatsApp */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-sm shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                Proteção de Grupos de WhatsApp: 100% Blindado
              </span>
              <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] px-2 py-0.5">
                Ativo
              </Badge>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-zinc-400 mt-0.5">
              O robô <strong>nunca responde</strong>, lê, interage ou dispara em grupos (<code className="text-emerald-700 dark:text-emerald-400">@g.us</code>), canais (<code className="text-emerald-700 dark:text-emerald-400">@newsletter</code>), transmissões ou status. Somente atendimentos individuais de pessoas reais.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-emerald-500/40 text-emerald-700 dark:text-emerald-300 text-xs">
            💬 Banco de Conversas Ativo
          </Badge>
          <Badge variant="outline" className="border-blue-500/40 text-blue-700 dark:text-blue-300 text-xs">
            ⚙️ Configuração Manual Pronta
          </Badge>
        </div>
      </div>

      {/* Cabeçalho Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <GitBranch className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Fluxos de Conversa & Inteligência Comercial</h1>
              <p className="text-sm text-slate-500 dark:text-zinc-400">
                Atendimento humanizado para pessoas, banco de conversas persistente e configurações manuais da sua empresa.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeTab === 'knowledge' && (
            <Button
              size="sm"
              onClick={() => handleSaveConfig()}
              disabled={savingConfig}
              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm font-semibold"
            >
              <Save className="w-4 h-4 mr-1.5" /> {savingConfig ? 'Salvando...' : 'Salvar Dados da Empresa'}
            </Button>
          )}

          {activeTab === 'faq' && (
            <Button
              size="sm"
              onClick={() => handleSaveConfig()}
              disabled={savingConfig}
              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm font-semibold"
            >
              <Save className="w-4 h-4 mr-1.5" /> {savingConfig ? 'Salvando...' : 'Salvar Base de Perguntas'}
            </Button>
          )}

          {activeTab === 'editor' && selectedFlow && (
            <>
              {selectedFlow.id === activeFlowId ? (
                <Badge className="bg-emerald-500 text-white font-semibold px-3 py-1.5 flex items-center gap-1.5 shadow-sm">
                  <CheckCircle2 className="w-4 h-4" /> Fluxo Ativo no WhatsApp
                </Badge>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleActivateFlow(selectedFlow.id)}
                  className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                >
                  <Play className="w-4 h-4 mr-1.5" /> Ativar para WhatsApp
                </Button>
              )}

              <Button
                size="sm"
                onClick={handleSaveFlow}
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm font-semibold"
              >
                <Save className="w-4 h-4 mr-1.5" /> {saving ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleCreateNewFlow}
            className="border-slate-300 dark:border-zinc-700"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Novo Roteiro
          </Button>
        </div>
      </div>

      {/* Navegação de Abas */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-zinc-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('knowledge')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
            activeTab === 'knowledge'
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
              : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
          }`}
        >
          <Building2 className="w-4 h-4 text-emerald-500" /> Configuração Manual & Empresa
        </button>

        <button
          onClick={() => {
            setActiveTab('conversations');
            loadConversations();
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
            activeTab === 'conversations'
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
              : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
          }`}
        >
          <Database className="w-4 h-4 text-blue-500" /> Banco de Conversas ({convStats.totalConversations})
        </button>

        <button
          onClick={() => {
            setActiveTab('contacts');
            loadClassifiedContacts();
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
            activeTab === 'contacts'
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
              : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
          }`}
        >
          <Users className="w-4 h-4 text-emerald-500" /> Identificação de Contatos (Clientes vs Amigos) ({contactsStats.totalContacts})
        </button>

        <button
          onClick={() => setActiveTab('faq')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
            activeTab === 'faq'
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
              : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
          }`}
        >
          <HelpCircle className="w-4 h-4 text-amber-500" /> FAQ & Gatilhos ({config.customFaq.length})
        </button>

        <button
          onClick={() => setActiveTab('editor')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
            activeTab === 'editor'
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
              : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
          }`}
        >
          <Edit3 className="w-4 h-4 text-emerald-500" /> Editor de Fluxo ({selectedFlow?.steps.length || 0} etapas)
        </button>

        <button
          onClick={() => setActiveTab('templates')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
            activeTab === 'templates'
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
              : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
          }`}
        >
          <Layers className="w-4 h-4 text-purple-500" /> Modelos por Nicho ({flows.length})
        </button>

        <button
          onClick={() => setActiveTab('trigger')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
            activeTab === 'trigger'
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
              : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
          }`}
        >
          <Zap className="w-4 h-4 text-amber-500" /> Acionar Clientes
        </button>
      </div>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* ABA 1: CONFIGURAÇÃO MANUAL & INFORMAÇÕES DA EMPRESA                  */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'knowledge' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Coluna Esquerda: Formulários da Empresa (8 colunas) */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* Card 1: Identificação Comercial & Responsável */}
              <Card className="border-slate-200 dark:border-zinc-800 shadow-xs">
                <CardHeader className="pb-3 border-b border-slate-100 dark:border-zinc-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-emerald-500" /> Identificação do Negócio & Atendimento
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Dados usados automaticamente nas saudações e quando as pessoas perguntam sobre sua empresa.
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="text-xs font-semibold text-emerald-600 border-emerald-500/40">
                      Configuração Manual
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="pt-4 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                        Nome da Empresa / Marca
                      </label>
                      <Input
                        value={config.businessName}
                        onChange={e => setConfig({ ...config, businessName: e.target.value })}
                        className="mt-1 text-xs"
                        placeholder="Ex: Minha Empresa / Radar Comercial"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">Variável: <code>{'{{nome_empresa}}'}</code></p>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                        Nome do Responsável / Atendente Humano
                      </label>
                      <Input
                        value={config.ownerName}
                        onChange={e => setConfig({ ...config, ownerName: e.target.value })}
                        className="mt-1 text-xs"
                        placeholder="Ex: Weverton"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">Variável: <code>{'{{responsavel}}'}</code></p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                        Segmento de Atuação
                      </label>
                      <Input
                        value={config.segment}
                        onChange={e => setConfig({ ...config, segment: e.target.value })}
                        className="mt-1 text-xs"
                        placeholder="Ex: Tecnologia, Imobiliária, Clínica, etc."
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                        Telefone / WhatsApp Comercial
                      </label>
                      <Input
                        value={config.phoneSupport}
                        onChange={e => setConfig({ ...config, phoneSupport: e.target.value })}
                        className="mt-1 text-xs"
                        placeholder="Ex: (92) 99292-0233"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                      O Que Sua Empresa Faz (Diferenciais & Soluções)
                    </label>
                    <textarea
                      rows={3}
                      value={config.description}
                      onChange={e => setConfig({ ...config, description: e.target.value })}
                      className="w-full mt-1 text-xs p-2.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 font-sans"
                      placeholder="Descreva de forma clara e atrativa o que vocês oferecem..."
                    />
                    <p className="text-[10px] text-slate-400 mt-0.5">Enviado quando o cliente pergunta "o que vocês fazem?", "quais os serviços?" ou "como funciona?".</p>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                      Link do Site, Instagram ou Catálogo de Produtos
                    </label>
                    <Input
                      value={config.websiteUrl}
                      onChange={e => setConfig({ ...config, websiteUrl: e.target.value })}
                      className="mt-1 text-xs"
                      placeholder="Ex: https://meusite.com.br ou https://instagram.com/minhaloja"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Variável: <code>{'{{link_site}}'}</code></p>
                  </div>
                </CardContent>
              </Card>

              {/* Card 2: Valores, Preços & Pagamentos */}
              <Card className="border-slate-200 dark:border-zinc-800 shadow-xs">
                <CardHeader className="pb-3 border-b border-slate-100 dark:border-zinc-800">
                  <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-500" /> Tabela de Preços, Formas de Pagamento & Pix
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Configure os valores padrão e dados para fechamento quando a pessoa perguntar preço ou quiser pagar.
                  </CardDescription>
                </CardHeader>

                <CardContent className="pt-4 space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                      Informações de Preços / Valores Padrão
                    </label>
                    <textarea
                      rows={2}
                      value={config.priceInfo}
                      onChange={e => setConfig({ ...config, priceInfo: e.target.value })}
                      className="w-full mt-1 text-xs p-2.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 font-sans"
                      placeholder="Ex: Planos a partir de R$ 97/mês com teste grátis ou Serviços a partir de R$ 150..."
                    />
                    <p className="text-[10px] text-slate-400 mt-0.5">Enviado automaticamente quando o lead perguntar "quanto custa?", "qual o valor?", "tabela?" ou "precinho".</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                        Formas de Pagamento Aceitas
                      </label>
                      <Input
                        value={config.paymentMethods}
                        onChange={e => setConfig({ ...config, paymentMethods: e.target.value })}
                        className="mt-1 text-xs"
                        placeholder="Ex: Pix com 5% de desconto, Cartão em até 12x ou Boleto"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                        Chave Pix para Fechamento
                      </label>
                      <Input
                        value={config.pixKey}
                        onChange={e => setConfig({ ...config, pixKey: e.target.value })}
                        className="mt-1 text-xs font-mono font-medium"
                        placeholder="Ex: CNPJ, E-mail ou Telefone da Chave Pix"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Card 3: Endereço & Horários de Funcionamento */}
              <Card className="border-slate-200 dark:border-zinc-800 shadow-xs">
                <CardHeader className="pb-3 border-b border-slate-100 dark:border-zinc-800">
                  <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-500" /> Endereço, Localização & Horários de Funcionamento
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Responde instantaneamente quando os clientes perguntarem "onde fica?" ou "está aberto?".
                  </CardDescription>
                </CardHeader>

                <CardContent className="pt-4 space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                      Endereço / Localização / Ponto de Referência
                    </label>
                    <Input
                      value={config.address}
                      onChange={e => setConfig({ ...config, address: e.target.value })}
                      className="mt-1 text-xs"
                      placeholder="Ex: Av. Paulista, 1000 - Sala 42 (Próximo ao metrô / Estacionamento no local)"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                      Horário de Funcionamento
                    </label>
                    <Input
                      value={config.workingHours}
                      onChange={e => setConfig({ ...config, workingHours: e.target.value })}
                      className="mt-1 text-xs"
                      placeholder="Ex: Segunda a Sexta das 08h às 18h e Sábados até 12h"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Coluna Direita: Tom de Voz e Simulador Rápido (4 colunas) */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* Tom de Voz do Robô */}
              <Card className="border-slate-200 dark:border-zinc-800 shadow-xs">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-500" /> Tom de Voz do Atendente
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Escolha como o robô se comunica com as pessoas no WhatsApp.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3 pt-0">
                  <div
                    onClick={() => setConfig({ ...config, toneOfVoice: 'amigavel' })}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                      config.toneOfVoice === 'amigavel'
                        ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20 dark:bg-emerald-950/20'
                        : 'border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900 dark:text-white">😊 Amigável & Empático (Recomendado)</span>
                      {config.toneOfVoice === 'amigavel' && <Check className="w-4 h-4 text-emerald-500" />}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                      Caloroso, com saudações amigáveis, emojis leves e perguntas atenciosas.
                    </p>
                  </div>

                  <div
                    onClick={() => setConfig({ ...config, toneOfVoice: 'consultivo' })}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                      config.toneOfVoice === 'consultivo'
                        ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20 dark:bg-emerald-950/20'
                        : 'border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900 dark:text-white">👔 Consultivo & Especialista</span>
                      {config.toneOfVoice === 'consultivo' && <Check className="w-4 h-4 text-emerald-500" />}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                      Focado em autoridade, solução de dores, clareza técnica e segurança.
                    </p>
                  </div>

                  <div
                    onClick={() => setConfig({ ...config, toneOfVoice: 'direto' })}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                      config.toneOfVoice === 'direto'
                        ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20 dark:bg-emerald-950/20'
                        : 'border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900 dark:text-white">⚡ Direto & Rápido</span>
                      {config.toneOfVoice === 'direto' && <Check className="w-4 h-4 text-emerald-500" />}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                      Objetivo e sucinto. Responde rápido e direciona logo para o fechamento.
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 space-y-2">
                    <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                      Nome do Assistente Virtual
                    </label>
                    <Input
                      value={config.botName}
                      onChange={e => setConfig({ ...config, botName: e.target.value })}
                      className="h-8 text-xs"
                      placeholder="Ex: Assistente Virtual Weverton"
                    />
                  </div>

                  <Button
                    onClick={() => handleSaveConfig()}
                    disabled={savingConfig}
                    className="w-full mt-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm"
                  >
                    <Save className="w-4 h-4 mr-1.5" /> {savingConfig ? 'Gravando...' : 'Salvar Todas as Configurações'}
                  </Button>
                </CardContent>
              </Card>

              {/* Dicas de Humanização */}
              <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-50/30 dark:bg-emerald-950/20 text-xs space-y-2">
                <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" /> Dicas de Conversão
                </span>
                <p className="text-slate-600 dark:text-zinc-400 text-[11px] leading-relaxed">
                  • <strong>Variáveis Automáticas:</strong> Você pode usar <code>{'{{nome_cliente}}'}</code>, <code>{'{{minha_empresa}}'}</code> e <code>{'{{responsavel}}'}</code> em qualquer texto.<br />
                  • <strong>Spintax:</strong> Use <code>{'{Olá|Oi|Opa}'}</code> para variar as saudações dinamicamente a cada mensagem.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* ABA 2: BANCO DE DADOS DE CONVERSAS (MEMÓRIA & HISTÓRICO REAL)        */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'conversations' && (
        <div className="space-y-6">
          
          {/* Métricas do Banco de Conversas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-slate-200 dark:border-zinc-800 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">Total de Conversas</p>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">{convStats.totalConversations}</h3>
                </div>
              </div>
            </Card>

            <Card className="border-slate-200 dark:border-zinc-800 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">Mensagens Trocadas</p>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">{convStats.totalMessages}</h3>
                </div>
              </div>
            </Card>

            <Card className="border-slate-200 dark:border-zinc-800 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Flame className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">Leads Quentes</p>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">{convStats.hotLeadsCount}</h3>
                </div>
              </div>
            </Card>

            <Card className="border-slate-200 dark:border-zinc-800 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">Grupos Ignorados</p>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">100% Blindado</h3>
                </div>
              </div>
            </Card>
          </div>

          {/* Barra de Filtros e Busca */}
          <div className="bg-white dark:bg-zinc-900 p-3 rounded-xl border border-slate-200 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
            <div className="relative w-full sm:w-96">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                value={convSearch}
                onChange={e => setConvSearch(e.target.value)}
                placeholder="Buscar por cliente, telefone ou trecho da mensagem..."
                className="pl-9 pr-8 h-9 text-xs"
              />
              {convSearch && (
                <button
                  onClick={() => setConvSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={convStatusFilter}
                onChange={e => setConvStatusFilter(e.target.value)}
                className="h-9 text-xs rounded-md border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 font-medium"
              >
                <option value="all">Todos os Status</option>
                <option value="qualificado">🔥 Qualificado / Lead Quente</option>
                <option value="em_andamento">⚡ Em Andamento</option>
                <option value="atendimento_humano">🤝 Atendimento Humano</option>
                <option value="novo">🆕 Novo</option>
                <option value="recusado">🚫 Recusado</option>
              </select>

              <Button
                size="sm"
                variant="outline"
                onClick={loadConversations}
                disabled={loadingConversations}
                className="text-xs h-9"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loadingConversations ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={handleClearAllConversations}
                className="text-xs h-9 border-rose-500/30 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                Limpar
              </Button>
            </div>
          </div>

          {/* Lista de Conversas Registradas */}
          {conversations.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-2xl border border-dashed border-slate-300 dark:border-zinc-800">
              <Database className="w-10 h-10 text-slate-400 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-700 dark:text-zinc-300">Nenhuma conversa registrada no banco</p>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-md mx-auto">
                Assim que clientes entrarem em contato no WhatsApp, as mensagens e as dúvidas detectadas ficarão salvas aqui automaticamente.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {conversations.map(conv => (
                <Card
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv)}
                  className="cursor-pointer hover:shadow-md transition-all border-slate-200 dark:border-zinc-800 hover:border-emerald-500/50"
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          {conv.name || `WhatsApp ${conv.phone}`}
                        </CardTitle>
                        <p className="text-xs text-slate-500 dark:text-zinc-400 font-mono mt-0.5">
                          {conv.phone}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        {/* Badge Cliente vs Amigo */}
                        {conv.contactType === 'amigo' ? (
                          <Badge className="bg-indigo-500/10 text-indigo-600 border border-indigo-500/30 text-[9px] font-bold px-2 py-0.5">
                            🤝 Amigo (Silenciado)
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 text-[9px] font-bold px-2 py-0.5">
                            💼 Cliente (Robô Ativo)
                          </Badge>
                        )}

                        {/* Badge de Temperatura */}
                        {conv.leadTemperature === 'quente' ? (
                          <Badge className="bg-amber-500 text-white text-[9px] flex items-center gap-1">
                            <Flame className="w-3 h-3" /> Quente
                          </Badge>
                        ) : conv.leadTemperature === 'morno' ? (
                          <Badge variant="outline" className="border-amber-500/40 text-amber-600 text-[9px]">
                            ⚡ Morno
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-slate-500 text-[9px]">
                            ❄️ Frio
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0 space-y-2 text-xs">
                    {/* Trecho da Última Mensagem */}
                    <div className="p-2 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 text-[11px] text-slate-700 dark:text-zinc-300 line-clamp-2">
                      <span className="font-semibold text-slate-500">
                        {conv.lastMessageSender === 'client' ? 'Cliente: ' : conv.lastMessageSender === 'bot' ? 'Robô: ' : 'Weverton: '}
                      </span>
                      "{conv.lastMessageSnippet}"
                    </div>

                    {/* Dúvidas / Intenções Detectadas */}
                    {conv.detectedIntents && conv.detectedIntents.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {conv.detectedIntents.map(intent => (
                          <Badge key={intent} variant="outline" className="text-[9px] px-1.5 py-0 bg-slate-100 dark:bg-zinc-800">
                            {intent === 'preco' ? '💲 Preço' :
                             intent === 'pagamento' ? '💳 Pagamento/Pix' :
                             intent === 'localizacao' ? '📍 Endereço' :
                             intent === 'horario' ? '⏰ Horário' :
                             intent === 'servicos' ? '📦 Serviços' :
                             intent === 'garantia' ? '🛡️ Garantia' :
                             intent === 'humano' ? '👤 Atendente' : intent}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between border-t border-slate-100 dark:border-zinc-800/80 pt-2 text-[10px] text-slate-400">
                      <span>{conv.messagesCount || (conv.messages ? conv.messages.length : 0)} mensagens</span>
                      <span>{new Date(conv.lastInteractionAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        size="sm"
                        className="w-full text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white dark:bg-zinc-800 dark:hover:bg-zinc-700 h-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedConversation(conv);
                        }}
                      >
                        <MessageSquareText className="w-3.5 h-3.5 mr-1" /> Ver Conversa
                      </Button>

                      {/* Botão de Alternância Rápida Amigo vs Cliente */}
                      <Button
                        size="sm"
                        variant="outline"
                        className={`h-8 px-2.5 text-[11px] font-bold shrink-0 ${
                          conv.contactType === 'amigo'
                            ? 'border-emerald-500/40 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                            : 'border-indigo-500/40 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          const nextType = conv.contactType === 'amigo' ? 'cliente' : 'amigo';
                          handleToggleContactType(conv.id, nextType, conv.name);
                        }}
                        title={conv.contactType === 'amigo' ? 'Mudar para Cliente Comercial (Robô responderá)' : 'Mudar para Amigo Pessoal (Robô silenciado)'}
                      >
                        {conv.contactType === 'amigo' ? '💼 Tornar Cliente' : '🤝 Marcar Amigo'}
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-slate-400 hover:text-rose-500 shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteConversation(conv.id);
                        }}
                        title="Remover conversa"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Modal / Visualizador de Conversa Completa */}
          {selectedConversation && (
            <div 
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
              onClick={() => setSelectedConversation(null)}
            >
              <div 
                className="bg-white dark:bg-zinc-950 rounded-3xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden"
                onClick={e => e.stopPropagation()}
              >
                {/* Cabeçalho do Chat */}
                <div className="p-4 bg-[#075E54] text-white flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-400/20 border border-emerald-300/40 flex items-center justify-center font-bold text-sm">
                      {selectedConversation.name.charAt(0) || 'C'}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold">{selectedConversation.name}</h4>
                      <p className="text-[11px] text-emerald-200">{selectedConversation.phone}</p>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedConversation(null)}
                    className="text-white hover:bg-emerald-800/60 rounded-full w-8 h-8 p-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {/* Balões de Mensagem Estilo WhatsApp */}
                <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#E5DDD5] dark:bg-[#0b141a]">
                  {selectedConversation.messages && selectedConversation.messages.length > 0 ? (
                    selectedConversation.messages.map(msg => (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${
                          msg.sender === 'client' ? 'items-start' : 'items-end'
                        }`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs shadow-xs ${
                            msg.sender === 'client'
                              ? 'bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-100 rounded-tl-xs'
                              : msg.sender === 'human'
                              ? 'bg-blue-600 text-white rounded-tr-xs'
                              : 'bg-[#DCF8C6] dark:bg-[#005c4b] text-slate-900 dark:text-zinc-100 rounded-tr-xs'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="font-bold text-[10px] opacity-75">
                              {msg.sender === 'client' ? selectedConversation.name : msg.sender === 'human' ? 'Weverton (Manual)' : 'Radar Bot (Robô)'}
                            </span>
                            {msg.intentDetected && (
                              <span className="text-[9px] px-1 rounded bg-black/10 dark:bg-white/10 font-mono">
                                {msg.intentDetected}
                              </span>
                            )}
                          </div>
                          <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                          <div className="text-[9px] text-right mt-1 opacity-60">
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10 text-xs text-slate-500">
                      Nenhuma mensagem registrada nesta conversa ainda.
                    </div>
                  )}
                </div>

                {/* Rodapé Informativo */}
                <div className="p-3 bg-slate-100 dark:bg-zinc-900 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-500">
                    Status: <strong>{selectedConversation.status}</strong> • Temperatura: <strong>{selectedConversation.leadTemperature}</strong>
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-7 border-rose-500/40 text-rose-500 hover:bg-rose-50"
                    onClick={() => handleDeleteConversation(selectedConversation.id)}
                  >
                    <Trash2 className="w-3 h-3 mr-1" /> Remover do Banco
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* ABA: IDENTIFICAÇÃO DE CONTATOS (CLIENTES vs AMIGOS / PESSOAL)       */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'contacts' && (
        <div className="space-y-6">
          {/* Métricas do Banco de Contatos */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-slate-200 dark:border-zinc-800 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">Total de Contatos</p>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">{contactsStats.totalContacts}</h3>
                </div>
              </div>
            </Card>

            <Card className="border-slate-200 dark:border-zinc-800 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">Clientes Comerciais</p>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">{contactsStats.clientsCount}</h3>
                </div>
              </div>
            </Card>

            <Card className="border-slate-200 dark:border-zinc-800 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <Heart className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">Amigos & Pessoal</p>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">{contactsStats.friendsCount}</h3>
                </div>
              </div>
            </Card>

            <Card className="border-slate-200 dark:border-zinc-800 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">Robô Automático</p>
                  <h3 className="text-xl font-bold text-emerald-600 dark:text-emerald-400">100% Ativo</h3>
                </div>
              </div>
            </Card>
          </div>

          {/* Banner Explicativo Inteligente */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-blue-500/10 to-transparent border border-emerald-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-500" />
                Separação Inteligente: Clientes Comerciais vs Amigos e Família
              </h4>
              <p className="text-xs text-slate-600 dark:text-zinc-300 max-w-3xl leading-relaxed">
                Quando um <strong>Cliente</strong> manda mensagem, o robô responde instantaneamente com o fluxo comercial ativo e tira dúvidas de orçamento. Para <strong>Amigos e Familiares</strong>, o robô silencia automaticamente para preservar suas conversas pessoais normais.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                onClick={() => setShowAddFriendModal(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-9 shadow-sm"
              >
                <UserPlus className="w-4 h-4 mr-1.5" /> + Cadastrar Amigo
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleClearHumanSilence()}
                className="text-xs h-9 border-slate-300 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800"
                title="Libera pausas temporárias para todos os clientes"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" /> Liberar Silêncios
              </Button>
            </div>
          </div>

          {/* Barra de Filtros e Busca de Contatos */}
          <div className="bg-white dark:bg-zinc-900 p-3 rounded-xl border border-slate-200 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
            <div className="relative w-full sm:w-96">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                value={contactsSearch}
                onChange={e => setContactsSearch(e.target.value)}
                placeholder="Buscar por contato, nome ou número..."
                className="pl-9 pr-8 h-9 text-xs"
              />
              {contactsSearch && (
                <button
                  onClick={() => setContactsSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
              <div className="flex items-center p-1 bg-slate-100 dark:bg-zinc-800 rounded-lg text-xs">
                <button
                  onClick={() => setContactsTypeFilter('all')}
                  className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                    contactsTypeFilter === 'all'
                      ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Todos ({contactsStats.totalContacts})
                </button>
                <button
                  onClick={() => setContactsTypeFilter('cliente')}
                  className={`px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1 ${
                    contactsTypeFilter === 'cliente'
                      ? 'bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                      : 'text-slate-500 hover:text-emerald-600'
                  }`}
                >
                  <Briefcase className="w-3.5 h-3.5" /> Clientes ({contactsStats.clientsCount})
                </button>
                <button
                  onClick={() => setContactsTypeFilter('amigo')}
                  className={`px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1 ${
                    contactsTypeFilter === 'amigo'
                      ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-500 hover:text-indigo-600'
                  }`}
                >
                  <Heart className="w-3.5 h-3.5" /> Amigos ({contactsStats.friendsCount})
                </button>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={loadClassifiedContacts}
                disabled={loadingContacts}
                className="text-xs h-9"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loadingContacts ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </div>
          </div>

          {/* Grid de Contatos */}
          {contacts.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-2xl border border-dashed border-slate-300 dark:border-zinc-800">
              <Users className="w-10 h-10 text-slate-400 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-700 dark:text-zinc-300">Nenhum contato encontrado</p>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-md mx-auto">
                Assim que você receber mensagens no WhatsApp ou cadastrar amigos, eles aparecerão aqui com identificação automática.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {contacts.map(c => (
                <Card
                  key={c.id}
                  className={`transition-all border ${
                    c.type === 'amigo'
                      ? 'border-indigo-500/20 bg-indigo-500/[0.02] dark:border-indigo-500/30'
                      : 'border-emerald-500/20 bg-emerald-500/[0.02] dark:border-emerald-500/30'
                  }`}
                >
                  <CardHeader className="pb-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 shadow-xs ${
                          c.type === 'amigo'
                            ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
                            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        }`}>
                          {c.name ? c.name.charAt(0).toUpperCase() : (c.type === 'amigo' ? 'A' : 'C')}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                            {c.name}
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-zinc-400 font-mono">
                            {c.phone}
                          </p>
                        </div>
                      </div>

                      {/* Badge Principal */}
                      {c.type === 'amigo' ? (
                        <Badge className="bg-indigo-500 text-white text-[10px] font-bold px-2 py-0.5 flex items-center gap-1 shrink-0">
                          <Heart className="w-3 h-3" /> Amigo (Silenciado)
                        </Badge>
                      ) : (
                        <Badge className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 flex items-center gap-1 shrink-0">
                          <Briefcase className="w-3 h-3" /> Cliente (Robô Ativo)
                        </Badge>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0 space-y-2.5 text-xs">
                    {/* Tag de Motivo de Reconhecimento */}
                    <div className="p-2 rounded-xl bg-slate-100/80 dark:bg-zinc-800/80 border border-slate-200/60 dark:border-zinc-700/60 text-[11px]">
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-zinc-300 font-medium">
                        <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
                        <span className="truncate">{c.reason || 'Identificação automática'}</span>
                      </div>
                      {c.notes && (
                        <p className="text-[10px] text-slate-400 mt-1 italic truncate">{c.notes}</p>
                      )}
                    </div>

                    {/* Última Mensagem */}
                    {c.lastMessageSnippet && (
                      <div className="p-2 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 text-[11px] text-slate-700 dark:text-zinc-300 line-clamp-2">
                        <span className="font-semibold text-slate-500">
                          {c.lastMessageSender === 'client' ? 'Ele(a): ' : c.lastMessageSender === 'bot' ? 'Robô: ' : 'Weverton: '}
                        </span>
                        "{c.lastMessageSnippet}"
                      </div>
                    )}

                    <div className="flex items-center justify-between border-t border-slate-100 dark:border-zinc-800 pt-2 text-[10px] text-slate-400">
                      <span>{c.totalMessages || 0} mensagens</span>
                      <span>{new Date(c.lastInteractionAt).toLocaleDateString([], { day: '2-digit', month: '2-digit' })} às {new Date(c.lastInteractionAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    {/* Ações com 1 clique */}
                    <div className="flex items-center gap-2 pt-1">
                      {c.type === 'cliente' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full text-xs font-semibold h-8 border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
                          onClick={() => handleToggleContactType(c.id, 'amigo', c.name)}
                        >
                          <Heart className="w-3.5 h-3.5 mr-1.5" /> Mudar para Amigo
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full text-xs font-semibold h-8 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                          onClick={() => handleToggleContactType(c.id, 'cliente', c.name)}
                        >
                          <Briefcase className="w-3.5 h-3.5 mr-1.5" /> Mudar para Cliente
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-slate-400 hover:text-rose-500 shrink-0"
                        onClick={() => handleDeleteContact(c.id)}
                        title="Remover da base de contatos"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Modal de Cadastrar Amigo */}
          {showAddFriendModal && (
            <div 
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
              onClick={() => setShowAddFriendModal(false)}
            >
              <div 
                className="bg-white dark:bg-zinc-950 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-zinc-800 space-y-4"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600">
                      <Heart className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Cadastrar Amigo / Pessoal</h3>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowAddFriendModal(false)}
                    className="h-8 w-8 p-0 rounded-full"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  Cadastre o nome ou telefone de um amigo ou familiar. O robô nunca enviará scripts ou mensagens comerciais de fluxo para ele.
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                      Nome ou Telefone do Amigo
                    </label>
                    <Input
                      value={newFriendInput}
                      onChange={e => setNewFriendInput(e.target.value)}
                      placeholder="Ex: Letícia, Marcos, 92991234567..."
                      className="text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                      Observação / Relação (Opcional)
                    </label>
                    <Input
                      value={newFriendNotes}
                      onChange={e => setNewFriendNotes(e.target.value)}
                      placeholder="Ex: Namorada, Amigo de infância, Família..."
                      className="text-xs"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowAddFriendModal(false)}
                    className="text-xs"
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleAddFriend}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs"
                  >
                    <Check className="w-3.5 h-3.5 mr-1" /> Salvar como Amigo
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      {activeTab === 'faq' && (
        <Card className="border-slate-200 dark:border-zinc-800 shadow-xs">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-zinc-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-emerald-500" /> Base de Perguntas e Respostas Manuais (FAQ)
                </CardTitle>
                <CardDescription className="text-xs">
                  Adicione ou edite regras de perguntas e respostas. Quando qualquer pessoa perguntar sobre essas dúvidas no WhatsApp, o robô responde instantaneamente.
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    const newRule: CustomFaqRule = {
                      id: `faq-${Date.now()}`,
                      title: 'Nova Dúvida Frequente',
                      keywords: ['duvida', 'pergunta'],
                      answer: '{Olá|Oi}! Temos total satisfação em te atender. Em que posso te ajudar?',
                      action: 'continue',
                    };
                    setConfig({
                      ...config,
                      customFaq: [newRule, ...config.customFaq],
                    });
                  }}
                  className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Nova Dúvida / Gatilho
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 pt-4">
            {config.customFaq.map((faq, fIdx) => (
              <div 
                key={faq.id || fIdx} 
                className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs font-bold text-slate-700 dark:text-zinc-200">
                      Regra #{fIdx + 1}
                    </Badge>
                    <Input
                      value={faq.title}
                      onChange={e => {
                        const updated = [...config.customFaq];
                        updated[fIdx].title = e.target.value;
                        setConfig({ ...config, customFaq: updated });
                      }}
                      className="h-7 text-xs font-bold w-64"
                      placeholder="Título da Dúvida"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={faq.action || 'continue'}
                      onChange={e => {
                        const updated = [...config.customFaq];
                        updated[fIdx].action = e.target.value as any;
                        setConfig({ ...config, customFaq: updated });
                      }}
                      className="h-7 text-xs rounded-md border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2"
                    >
                      <option value="continue">Continuar conversa</option>
                      <option value="qualify_lead">🔥 Marcar Lead Quente</option>
                      <option value="transfer_human">🤝 Transferir para Weverton</option>
                    </select>

                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-rose-500 hover:text-rose-600"
                      onClick={() => {
                        const updated = config.customFaq.filter((_, i) => i !== fIdx);
                        setConfig({ ...config, customFaq: updated });
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" /> Remover
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    Palavras-Chave Gatilho (como as pessoas costumam perguntar no WhatsApp, separadas por vírgula)
                  </label>
                  <Input
                    value={(faq.keywords || []).join(', ')}
                    onChange={e => {
                      const kws = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                      const updated = [...config.customFaq];
                      updated[fIdx].keywords = kws;
                      setConfig({ ...config, customFaq: updated });
                    }}
                    className="mt-1 text-xs"
                    placeholder="Ex: preco, quanto custa, tabela, valor, desconto"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    Resposta Imediata do Robô (com suporte a Spintax e variáveis)
                  </label>
                  <textarea
                    rows={3}
                    value={faq.answer}
                    onChange={e => {
                      const updated = [...config.customFaq];
                      updated[fIdx].answer = e.target.value;
                      setConfig({ ...config, customFaq: updated });
                    }}
                    className="w-full mt-1 text-xs p-2.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 font-sans"
                    placeholder="Digite a resposta humanizada do robô..."
                  />
                </div>
              </div>
            ))}

            <div className="pt-2 flex justify-end">
              <Button
                size="sm"
                onClick={() => handleSaveConfig()}
                disabled={savingConfig}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm"
              >
                <Save className="w-4 h-4 mr-1.5" /> {savingConfig ? 'Gravando...' : 'Salvar Base de Perguntas e Respostas'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* ABA 4: MODELOS PRONTOS POR TIPO DE EMPRESA                           */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          {/* Barra de Busca de Modelos */}
          <div className="bg-white dark:bg-zinc-900 p-3 rounded-xl border border-slate-200 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
            <div className="relative w-full sm:w-96">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                value={templateSearch}
                onChange={e => setTemplateSearch(e.target.value)}
                placeholder="Buscar por segmento, empresa ou palavra-chave..."
                className="pl-9 pr-8 h-9 text-xs"
              />
              {templateSearch && (
                <button
                  type="button"
                  onClick={() => setTemplateSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 text-xs p-1 font-bold"
                  title="Limpar pesquisa"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
              Exibindo <strong>{filteredFlows.length}</strong> de <strong>{flows.length}</strong> modelos em colunas
            </div>
          </div>

          {filteredFlows.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-xl border border-dashed border-slate-300 dark:border-zinc-800">
              <Building2 className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700 dark:text-zinc-300">Nenhum segmento encontrado</p>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">Tente buscar por outro termo.</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 text-xs"
                onClick={() => setTemplateSearch('')}
              >
                Limpar Busca
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredFlows.map(flow => (
                <Card 
                  key={flow.id} 
                  className={`transition-all duration-200 border cursor-pointer hover:shadow-md ${
                    selectedFlow?.id === flow.id
                      ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/10 dark:bg-emerald-950/10'
                      : 'border-slate-200 dark:border-zinc-800'
                  }`}
                  onClick={() => handleSelectFlow(flow)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Badge variant="outline" className="mb-2 text-xs font-semibold">
                          {flow.segment}
                        </Badge>
                        <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          {flow.name}
                        </CardTitle>
                      </div>
                      {flow.id === activeFlowId && (
                        <Badge className="bg-emerald-500 text-white text-xs">Ativo</Badge>
                      )}
                    </div>
                    <CardDescription className="text-xs line-clamp-2 mt-1">
                      {flow.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0 text-xs text-slate-500 dark:text-zinc-400 space-y-2">
                    <div className="flex items-center justify-between border-t border-slate-100 dark:border-zinc-800/80 pt-2">
                      <span>🏢 Empresa: <strong>{flow.companyName}</strong></span>
                      <span><strong>{flow.steps?.length || 0}</strong> etapas</span>
                    </div>
                    <div className="flex items-center gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="default"
                        className="w-full text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white dark:bg-zinc-800 dark:hover:bg-zinc-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectFlow(flow);
                        }}
                      >
                        <Edit3 className="w-3.5 h-3.5 mr-1" /> Editar & Testar
                      </Button>
                      {flow.id !== activeFlowId && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs border-emerald-500/40 text-emerald-600 hover:bg-emerald-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleActivateFlow(flow.id);
                          }}
                        >
                          Ativar
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* ABA 5: EDITOR DO FLUXO + SIMULADOR EM TEMPO REAL                     */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'editor' && selectedFlow && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* COLUNA ESQUERDA: EDITOR DE ETAPAS (7 Colunas) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Informações Básicas do Fluxo */}
            <Card className="border-slate-200 dark:border-zinc-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                  <Settings2 className="w-4 h-4 text-emerald-500" /> Identificação do Fluxo
                </CardTitle>
                <CardDescription className="text-xs">
                  Esses dados são usados automaticamente nas saudações com a tag <code>{'{{minha_empresa}}'}</code>.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                      Nome da Empresa no Fluxo
                    </label>
                    <Input
                      value={selectedFlow.companyName}
                      onChange={e => setSelectedFlow({ ...selectedFlow, companyName: e.target.value })}
                      className="mt-1 text-xs"
                      placeholder="Ex: Minha Clínica / Minha Loja"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                      Segmento de Atuação
                    </label>
                    <Input
                      value={selectedFlow.segment}
                      onChange={e => setSelectedFlow({ ...selectedFlow, segment: e.target.value })}
                      className="mt-1 text-xs"
                      placeholder="Ex: Clínicas & Saúde"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    Título do Fluxo
                  </label>
                  <Input
                    value={selectedFlow.name}
                    onChange={e => setSelectedFlow({ ...selectedFlow, name: e.target.value })}
                    className="mt-1 text-xs"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Colunas de Etapas da Conversa */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      Etapas da Conversa ({selectedFlow.steps.length})
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                      Clique em qualquer coluna para visualizar, editar ou testar o passo.
                    </p>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const newStep: BotStep = {
                      id: `step-${Date.now()}`,
                      title: `Etapa ${selectedFlow.steps.length + 1}`,
                      type: 'question_choice',
                      message: 'Qual serviço você procura?\n\n*1️⃣* - Opção A\n*2️⃣* - Opção B',
                      options: [
                        { id: `opt-${Date.now()}-1`, key: '1', label: 'Opção A', nextStepId: '' },
                        { id: `opt-${Date.now()}-2`, key: '2', label: 'Opção B', nextStepId: '' },
                      ],
                    };
                    const updated = [...selectedFlow.steps, newStep];
                    setSelectedFlow({ ...selectedFlow, steps: updated });
                    setEditingStepIndex(updated.length - 1);
                  }}
                  className="text-xs h-8 border-dashed border-emerald-500/40 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 font-semibold"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar Etapa
                </Button>
              </div>

              {/* Grid em Colunas Moderno */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 mb-4">
                {selectedFlow.steps.map((step, idx) => {
                  const isSelected = editingStepIndex === idx;
                  const stepTypeLabel = 
                    step.type === 'question_choice' ? 'Múltipla Escolha' :
                    step.type === 'question_text' ? 'Texto Livre' : 'Encerramento';

                  return (
                    <div
                      key={step.id || idx}
                      onClick={() => setEditingStepIndex(idx)}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between gap-2 shadow-xs group ${
                        isSelected
                          ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/40 dark:bg-emerald-950/40 shadow-sm'
                          : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 hover:shadow-xs'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            isSelected 
                              ? 'bg-emerald-600 text-white shadow-xs' 
                              : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300'
                          }`}>
                            {idx + 1}
                          </span>
                          <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                            Passo {idx + 1}
                          </span>
                        </div>

                        {isSelected ? (
                          <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white text-[9px] px-1.5 py-0 font-semibold">
                            Editando
                          </Badge>
                        ) : (
                          <span className="text-[9px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                            Editar →
                          </span>
                        )}
                      </div>

                      <div>
                        <h4 className={`text-xs font-bold leading-tight ${
                          isSelected ? 'text-emerald-950 dark:text-emerald-100' : 'text-slate-900 dark:text-white'
                        }`}>
                          {step.title}
                        </h4>
                        <p className="text-[10px] text-slate-500 dark:text-zinc-400 line-clamp-1 mt-0.5">
                          {step.message.replace(/[\n\r]+/g, ' ')}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 dark:border-zinc-800 text-[10px]">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${
                          isSelected
                            ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200'
                            : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400'
                        }`}>
                          {stepTypeLabel}
                        </span>

                        {step.options && step.options.length > 0 && (
                          <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-medium">
                            {step.options.length} {step.options.length === 1 ? 'opção' : 'opções'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Painel de Edição da Etapa Selecionada */}
            {currentStep && (
              <Card className="border-slate-200 dark:border-zinc-800 shadow-sm">
                <CardHeader className="pb-3 border-b border-slate-100 dark:border-zinc-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-bold flex items-center gap-2">
                        <Edit3 className="w-4 h-4 text-emerald-500" />
                        Editando Etapa #{editingStepIndex + 1}: {currentStep.title}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Configure o texto da mensagem e como o cliente deve responder.
                      </CardDescription>
                    </div>

                    {selectedFlow.steps.length > 1 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-rose-500 hover:text-rose-600 h-8 text-xs"
                        onClick={() => {
                          const updated = selectedFlow.steps.filter((_, i) => i !== editingStepIndex);
                          setSelectedFlow({ ...selectedFlow, steps: updated });
                          setEditingStepIndex(Math.max(0, editingStepIndex - 1));
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" /> Excluir Etapa
                      </Button>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                        Título Interno da Etapa
                      </label>
                      <Input
                        value={currentStep.title}
                        onChange={e => {
                          const updated = [...selectedFlow.steps];
                          updated[editingStepIndex].title = e.target.value;
                          setSelectedFlow({ ...selectedFlow, steps: updated });
                        }}
                        className="mt-1 text-xs"
                        placeholder="Ex: Pergunta de Horário"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                        Tipo de Resposta Esperada
                      </label>
                      <select
                        value={currentStep.type}
                        onChange={e => {
                          const updated = [...selectedFlow.steps];
                          updated[editingStepIndex].type = e.target.value as any;
                          setSelectedFlow({ ...selectedFlow, steps: updated });
                        }}
                        className="w-full mt-1 h-9 text-xs rounded-md border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 font-medium"
                      >
                        <option value="question_choice">Múltipla Escolha (Opções 1, 2, 3...)</option>
                        <option value="question_text">Resposta Livre (Nome, Dúvida ou Texto)</option>
                        <option value="closing">Encerramento / Transferência Humana</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                      Mensagem do Robô no WhatsApp
                    </label>
                    <textarea
                      rows={5}
                      value={currentStep.message}
                      onChange={e => {
                        const updated = [...selectedFlow.steps];
                        updated[editingStepIndex].message = e.target.value;
                        setSelectedFlow({ ...selectedFlow, steps: updated });
                      }}
                      className="w-full mt-1 text-xs p-3 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 font-sans leading-relaxed"
                      placeholder="Digite a mensagem que o robô enviará..."
                    />
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-[10px] text-slate-400">
                      <span>Tags disponíveis:</span>
                      <code className="bg-slate-100 dark:bg-zinc-800 px-1 py-0.5 rounded cursor-pointer hover:bg-slate-200" onClick={() => {
                        const updated = [...selectedFlow.steps];
                        updated[editingStepIndex].message += ' {{nome_cliente}}';
                        setSelectedFlow({ ...selectedFlow, steps: updated });
                      }}>{'{{nome_cliente}}'}</code>
                      <code className="bg-slate-100 dark:bg-zinc-800 px-1 py-0.5 rounded cursor-pointer hover:bg-slate-200" onClick={() => {
                        const updated = [...selectedFlow.steps];
                        updated[editingStepIndex].message += ' {{minha_empresa}}';
                        setSelectedFlow({ ...selectedFlow, steps: updated });
                      }}>{'{{minha_empresa}}'}</code>
                    </div>
                  </div>

                  {/* Configuração de Opções (para question_choice) */}
                  {currentStep.type === 'question_choice' && (
                    <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-zinc-800">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                          Opções e Encaminhamentos
                        </label>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const updated = [...selectedFlow.steps];
                            const currentOptions = updated[editingStepIndex].options || [];
                            const nextKey = String(currentOptions.length + 1);
                            currentOptions.push({
                              id: `opt-${Date.now()}`,
                              key: nextKey,
                              label: `Opção ${nextKey}`,
                              nextStepId: '',
                              action: 'none',
                            });
                            updated[editingStepIndex].options = currentOptions;
                            setSelectedFlow({ ...selectedFlow, steps: updated });
                          }}
                          className="h-7 text-xs"
                        >
                          <Plus className="w-3 h-3 mr-1" /> Nova Opção
                        </Button>
                      </div>

                      <div className="space-y-2">
                        {(currentStep.options || []).map((opt, oIdx) => (
                          <div key={opt.id || oIdx} className="p-2.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/50 flex items-center gap-2">
                            <span className="w-7 h-7 rounded-md bg-white dark:bg-zinc-800 border flex items-center justify-center font-bold text-xs shrink-0">
                              {opt.key}
                            </span>
                            <div className="flex-1 min-w-0">
                              <Input
                                value={opt.label}
                                onChange={e => {
                                  const updated = [...selectedFlow.steps];
                                  updated[editingStepIndex].options![oIdx].label = e.target.value;
                                  setSelectedFlow({ ...selectedFlow, steps: updated });
                                }}
                                className="h-8 text-xs font-medium"
                                placeholder="Rótulo da opção (ex: Agendar Horário)"
                              />
                            </div>
                            <div className="w-44 shrink-0">
                              <select
                                value={opt.nextStepId || ''}
                                onChange={e => {
                                  const updated = [...selectedFlow.steps];
                                  updated[editingStepIndex].options![oIdx].nextStepId = e.target.value;
                                  setSelectedFlow({ ...selectedFlow, steps: updated });
                                }}
                                className="w-full h-8 text-xs rounded-md border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2"
                              >
                                <option value="">Próximo Passo...</option>
                                {selectedFlow.steps.map(s => (
                                  <option key={s.id} value={s.id}>
                                    ➡️ {s.title}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-slate-400 hover:text-rose-500"
                              onClick={() => {
                                const updated = [...selectedFlow.steps];
                                updated[editingStepIndex].options = updated[editingStepIndex].options?.filter((_, i) => i !== oIdx);
                                setSelectedFlow({ ...selectedFlow, steps: updated });
                              }}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Configuração de Próximo Passo para Texto Livre */}
                  {currentStep.type === 'question_text' && (
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-zinc-800">
                      <div>
                        <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                          Próximo Passo após o Cliente Responder
                        </label>
                        <select
                          value={currentStep.freeTextNextStepId || ''}
                          onChange={e => {
                            const updated = [...selectedFlow.steps];
                            updated[editingStepIndex].freeTextNextStepId = e.target.value;
                            setSelectedFlow({ ...selectedFlow, steps: updated });
                          }}
                          className="w-full mt-1 h-9 text-xs rounded-md border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2"
                        >
                          <option value="">Próximo passo na lista...</option>
                          {selectedFlow.steps.map(s => (
                            <option key={s.id} value={s.id}>
                              ➡️ {s.title}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                          Salvar Resposta no Campo do Lead
                        </label>
                        <Input
                          value={currentStep.saveToField || ''}
                          onChange={e => {
                            const updated = [...selectedFlow.steps];
                            updated[editingStepIndex].saveToField = e.target.value;
                            setSelectedFlow({ ...selectedFlow, steps: updated });
                          }}
                          className="mt-1 h-9 text-xs"
                          placeholder="Ex: nome_paciente, necessidade"
                        />
                      </div>
                    </div>
                  )}

                  {/* Ação ao Finalizar a Etapa */}
                  <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Ação no CRM:</span>
                      <p className="text-[10px] text-slate-400">Qualificar o lead ou transferir para atendente humano nesta etapa.</p>
                    </div>

                    <select
                      value={currentStep.action || 'none'}
                      onChange={e => {
                        const updated = [...selectedFlow.steps];
                        updated[editingStepIndex].action = e.target.value as any;
                        setSelectedFlow({ ...selectedFlow, steps: updated });
                      }}
                      className="h-8 text-xs rounded-md border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 font-medium"
                    >
                      <option value="none">Nenhuma ação extra</option>
                      <option value="qualify_lead">🔥 Marcar como Lead Qualificado</option>
                      <option value="transfer_human">🤝 Transferir para Atendente Humano</option>
                      <option value="mark_hot">⭐ Marcar como Lead Quente</option>
                    </select>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* COLUNA DIREITA: SIMULADOR DE WHATSAPP (5 Colunas) */}
          <div className="lg:col-span-5 sticky top-6">
            <Card className="border-slate-300 dark:border-zinc-800 shadow-xl overflow-hidden bg-slate-900 text-white rounded-[32px] p-2">
              
              {/* Moldura do Celular */}
              <div className="bg-slate-950 rounded-[28px] overflow-hidden flex flex-col h-[640px] border border-slate-800">
                
                {/* Barra de Status do Celular */}
                <div className="px-6 py-2 bg-[#075E54] text-white flex items-center justify-between text-[11px] font-medium tracking-tight">
                  <span>18:30</span>
                  <div className="w-16 h-4 bg-black rounded-full mx-auto" />
                  <div className="flex items-center gap-1.5">
                    <span>5G</span>
                    <span>100%</span>
                  </div>
                </div>

                {/* Cabeçalho do WhatsApp */}
                <div className="px-4 py-3 bg-[#075E54] text-white flex items-center justify-between shadow-md">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-emerald-400/20 border border-emerald-300/40 flex items-center justify-center font-bold text-sm">
                      {selectedFlow.companyName.charAt(0) || 'R'}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold leading-tight">{selectedFlow.companyName || 'Radar Bot'}</h4>
                      <p className="text-[10px] text-emerald-200 font-medium">Conta Comercial • online</p>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => initSimulation(selectedFlow)}
                    className="text-white hover:bg-emerald-800/60 rounded-full w-8 h-8 p-0"
                    title="Reiniciar Simulação"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </div>

                {/* Área de Conversa do WhatsApp */}
                <div 
                  ref={simChatRef}
                  className="flex-1 p-3 overflow-y-auto space-y-2.5 bg-[#E5DDD5] dark:bg-[#0b141a]"
                >
                  <div className="text-center my-1">
                    <span className="bg-white/80 dark:bg-zinc-800/80 px-2.5 py-1 rounded-full text-[10px] text-slate-500 font-medium shadow-2xs">
                      🔒 As mensagens são protegidas de ponta a ponta
                    </span>
                  </div>

                  {simMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex flex-col ${
                        msg.sender === 'user' ? 'items-end' : 'items-start'
                      }`}
                    >
                      <div
                        className={`max-w-[82%] rounded-2xl px-3.5 py-2 text-xs shadow-xs ${
                          msg.sender === 'user'
                            ? 'bg-[#DCF8C6] dark:bg-[#005c4b] text-slate-900 dark:text-zinc-100 rounded-tr-xs'
                            : 'bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-100 rounded-tl-xs'
                        }`}
                      >
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                        <div className="text-[9px] text-right mt-1 text-slate-400">
                          {msg.time}
                        </div>
                      </div>
                    </div>
                  ))}

                  {isSimTyping && (
                    <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-800 px-3 py-2 rounded-2xl rounded-tl-xs w-16 text-slate-400 text-xs">
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  )}
                </div>

                {/* Botões de Resposta Rápida (para question_choice) */}
                {currentStep && currentStep.type === 'question_choice' && currentStep.options && currentStep.options.length > 0 && (
                  <div className="p-2 bg-slate-900/90 border-t border-slate-800 flex gap-1.5 overflow-x-auto">
                    {currentStep.options.map(opt => (
                      <Button
                        key={opt.id}
                        size="sm"
                        variant="outline"
                        onClick={() => handleSimSend(opt.key)}
                        className="text-[11px] h-7 bg-slate-800 border-slate-700 hover:bg-emerald-600 hover:text-white shrink-0"
                      >
                        {opt.key} - {opt.label}
                      </Button>
                    ))}
                  </div>
                )}

                {/* Campo de Digitação */}
                <div className="p-2.5 bg-slate-900 border-t border-slate-800 flex items-center gap-2">
                  <Input
                    value={simInput}
                    onChange={e => setSimInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSimSend()}
                    placeholder="Digite como cliente (ex: 1, quanto custa?, onde fica?)..."
                    className="h-9 text-xs bg-slate-950 border-slate-800 text-white rounded-full px-4 focus-visible:ring-emerald-500"
                  />
                  <Button
                    size="sm"
                    onClick={() => handleSimSend()}
                    disabled={!simInput.trim() || isSimTyping}
                    className="h-9 w-9 rounded-full p-0 bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* ABA 6: ACIONAR CLIENTES COM O FLUXO                                  */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'trigger' && selectedFlow && (
        <Card className="border-slate-200 dark:border-zinc-800">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-zinc-800">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" /> Acionamento Automático de Clientes
                </CardTitle>
                <CardDescription className="text-xs">
                  Selecione leads da sua base para enviar a primeira mensagem do fluxo <strong>"{selectedFlow.name}"</strong>. Quando o cliente responder, o robô conduzirá toda a conversa sozinho.
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (selectedLeadIds.length === leads.length) {
                      setSelectedLeadIds([]);
                    } else {
                      setSelectedLeadIds(leads.filter((l: any) => l.phone).map((l: any) => l.id));
                    }
                  }}
                  className="text-xs"
                >
                  {selectedLeadIds.length === leads.length ? 'Desmarcar Todos' : 'Selecionar Todos com Telefone'}
                </Button>

                <Button
                  size="sm"
                  disabled={selectedLeadIds.length === 0 || isTriggering}
                  onClick={handleTriggerFlow}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm"
                >
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  {isTriggering
                    ? 'Iniciando Disparos...'
                    : `Acionar ${selectedLeadIds.length} Clientes`}
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-4">
            <div className="border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden">
              <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-zinc-800">
                {leads.map((lead: any) => {
                  const isSelected = selectedLeadIds.includes(lead.id);
                  const hasPhone = Boolean(lead.phone);

                  return (
                    <div
                      key={lead.id}
                      onClick={() => {
                        if (!hasPhone) return;
                        setSelectedLeadIds(prev => 
                          isSelected ? prev.filter(id => id !== lead.id) : [...prev, lead.id]
                        );
                      }}
                      className={`p-3 flex items-center justify-between text-xs transition-colors cursor-pointer ${
                        !hasPhone 
                          ? 'opacity-40 cursor-not-allowed bg-slate-50 dark:bg-zinc-950'
                          : isSelected
                          ? 'bg-emerald-50/50 dark:bg-emerald-950/20'
                          : 'hover:bg-slate-50 dark:hover:bg-zinc-800/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={!hasPhone}
                          onChange={() => {}}
                          className="rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{lead.name}</p>
                          <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                            {lead.phone || 'Sem telefone'} • {lead.address?.city || 'Brasil'}
                          </p>
                        </div>
                      </div>

                      <Badge variant="outline" className="text-[10px]">
                        {lead.category || lead.subcategory || 'Geral'}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
