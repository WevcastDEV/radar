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
  Search
} from 'lucide-react';
import { BotFlow, BotStep, FlowOption, FaqRule } from '@/lib/bot-flow';
import { safeWhatsAppClient } from '../whatsapp/whatsapp-client';
import { useLeads } from '@/hooks/use-leads';
import toast from 'react-hot-toast';

export default function FlowsPage() {
  const { data: leads = [] } = useLeads();
  const [flows, setFlows] = useState<BotFlow[]>([]);
  const [activeFlowId, setActiveFlowId] = useState<string>('');
  const [selectedFlow, setSelectedFlow] = useState<BotFlow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'templates' | 'faq' | 'trigger'>('editor');

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

  // Carrega fluxos da API
  const loadFlows = async () => {
    setLoading(true);
    try {
      const res = await safeWhatsAppClient.get('/flows');
      const data = res.data?.data;
      if (data?.flows && Array.isArray(data.flows)) {
        setFlows(data.flows);
        const active = data.activeFlow || data.flows.find((f: BotFlow) => f.isActive) || data.flows[0];
        if (active) {
          setActiveFlowId(active.id);
          setSelectedFlow(active);
          initSimulation(active);
        }
      }
    } catch (err: any) {
      toast.error('Erro ao conectar à API de fluxos de conversação');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFlows();
  }, []);

  // Inicializa o simulador com a primeira mensagem do fluxo
  const initSimulation = (flow: BotFlow) => {
    if (!flow || !flow.steps || flow.steps.length === 0) {
      setSimMessages([]);
      setSimCurrentStepId(null);
      setSimData({});
      return;
    }
    const firstStep = flow.steps[0];
    const initialText = firstStep.message
      .replace(/\{\{nome_cliente\}\}/gi, 'Visitante')
      .replace(/\{\{minha_empresa\}\}/gi, flow.companyName || 'Nossa Empresa')
      .replace(/\{([^{}]+)\}/g, (_m, g) => g.split('|')[0]);

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

  // Envia mensagem no simulador de celular
  const handleSimSend = async (messageText?: string) => {
    const textToSend = (messageText || simInput).trim();
    if (!textToSend || !selectedFlow) return;

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // Adiciona a fala do usuário
    const newHistory = [...simMessages, { sender: 'user' as const, text: textToSend, time: timeStr }];
    setSimMessages(newHistory);
    setSimInput('');
    setIsSimTyping(true);

    try {
      const res = await safeWhatsAppClient.post('/flows/simulate', {
        flowId: selectedFlow.id,
        currentStepId: simCurrentStepId,
        message: textToSend,
        collectedData: simData,
      });

      const result = res.data?.data;
      if (result) {
        setTimeout(() => {
          setIsSimTyping(false);
          const replyTime = new Date();
          const replyTimeStr = `${String(replyTime.getHours()).padStart(2, '0')}:${String(replyTime.getMinutes()).padStart(2, '0')}`;
          
          setSimMessages(prev => [
            ...prev,
            {
              sender: 'bot',
              text: result.botReply,
              time: replyTimeStr,
            }
          ]);
          setSimCurrentStepId(result.nextStepId);
          if (result.updatedData) {
            setSimData(result.updatedData);
          }
        }, 600);
      }
    } catch {
      setIsSimTyping(false);
      setSimMessages(prev => [
        ...prev,
        {
          sender: 'bot',
          text: 'Obrigado pelo contato! Nossa equipe entrará em contato em instantes.',
          time: timeStr,
        }
      ]);
    }
  };

  useEffect(() => {
    if (simChatRef.current) {
      simChatRef.current.scrollTop = simChatRef.current.scrollHeight;
    }
  }, [simMessages, isSimTyping]);

  // Salvar alterações no fluxo atual
  const handleSaveFlow = async () => {
    if (!selectedFlow) return;
    setSaving(true);
    try {
      const res = await safeWhatsAppClient.post('/flows', selectedFlow);
      if (res.data?.success) {
        toast.success(`Fluxo "${selectedFlow.name}" salvo com sucesso!`);
        await loadFlows();
      }
    } catch (err: any) {
      toast.error('Erro ao salvar o fluxo de conversação.');
    } finally {
      setSaving(false);
    }
  };

  // Ativar fluxo para o robô de WhatsApp
  const handleActivateFlow = async (flowId: string) => {
    try {
      const res = await safeWhatsAppClient.post(`/flows/${flowId}/activate`);
      if (res.data?.success) {
        setActiveFlowId(flowId);
        toast.success(`Fluxo ativado para o robô de WhatsApp!`);
        await loadFlows();
      }
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
      segment: 'Comércio & Serviços',
      companyName: 'Minha Empresa',
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

    setFlows([newFlow, ...flows]);
    setSelectedFlow(newFlow);
    setEditingStepIndex(0);
    initSimulation(newFlow);
    toast.success('Novo fluxo criado! Personalize as etapas e salve.');
  };

  // Disparar fluxo para lista de leads
  const handleTriggerFlow = async () => {
    if (!selectedFlow) return;
    if (selectedLeadIds.length === 0) {
      toast.error('Selecione ao menos um cliente para acionar o fluxo.');
      return;
    }

    const leadsToDispatch = leads
      .filter((l: any) => selectedLeadIds.includes(l.id))
      .map((l: any) => ({
        id: l.id,
        name: l.name,
        phone: l.phone,
        category: l.category || l.subcategory || selectedFlow.segment,
      }));

    setIsTriggering(true);
    try {
      const res = await safeWhatsAppClient.post('/flows/trigger', {
        flowId: selectedFlow.id,
        leads: leadsToDispatch,
      });

      if (res.data?.success) {
        toast.success(`Disparo do fluxo "${selectedFlow.name}" iniciado para ${leadsToDispatch.length} clientes!`);
        setSelectedLeadIds([]);
      }
    } catch (err: any) {
      toast.error('Erro ao iniciar disparo do fluxo.');
    } finally {
      setIsTriggering(false);
    }
  };

  const currentStep: BotStep | undefined = selectedFlow?.steps[editingStepIndex];

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <GitBranch className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Fluxos de Conversação & Chatbot</h1>
              <p className="text-sm text-slate-500 dark:text-zinc-400">
                Configure todo o roteiro de perguntas, opções e respostas para conversar e acionar clientes automaticamente.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {selectedFlow && (
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
            </>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleCreateNewFlow}
            className="border-slate-300 dark:border-zinc-700"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Novo Fluxo
          </Button>

          <Button
            size="sm"
            onClick={handleSaveFlow}
            disabled={saving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm font-semibold"
          >
            <Save className="w-4 h-4 mr-1.5" /> {saving ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>
      </div>

      {/* Navegação de Abas */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-zinc-800 pb-2">
        <button
          onClick={() => setActiveTab('editor')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'editor'
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
              : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
          }`}
        >
          <Edit3 className="w-4 h-4" /> Editor do Fluxo
        </button>

        <button
          onClick={() => setActiveTab('templates')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'templates'
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
              : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
          }`}
        >
          <Building2 className="w-4 h-4" /> Modelos por Empresa ({flows.length})
        </button>

        <button
          onClick={() => setActiveTab('faq')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'faq'
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
              : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
          }`}
        >
          <HelpCircle className="w-4 h-4" /> Respostas Rápidas (FAQ)
        </button>

        <button
          onClick={() => setActiveTab('trigger')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'trigger'
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
              : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
          }`}
        >
          <Zap className="w-4 h-4 text-amber-500" /> Acionar Clientes
        </button>
      </div>

      {/* ABA: MODELOS PRONTOS POR TIPO DE EMPRESA */}
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

      {/* ABA: EDITOR DO FLUXO + SIMULADOR EM TEMPO REAL */}
      {activeTab === 'editor' && selectedFlow && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* COLUNA ESQUERDA: EDITOR DE ETAPAS (7 Colunas) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Informações Básicas da Empresa no Fluxo */}
            <Card className="border-slate-200 dark:border-zinc-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                  <Settings2 className="w-4 h-4 text-emerald-500" /> Identificação do Negócio
                </CardTitle>
                <CardDescription className="text-xs">
                  Esses dados são usados automaticamente nas saudações com a tag <code>{'{{minha_empresa}}'}</code>.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Nome do Fluxo</label>
                    <Input
                      value={selectedFlow.name}
                      onChange={e => setSelectedFlow({ ...selectedFlow, name: e.target.value })}
                      className="mt-1 text-sm font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Nome da Empresa / Marca</label>
                    <Input
                      value={selectedFlow.companyName}
                      onChange={e => setSelectedFlow({ ...selectedFlow, companyName: e.target.value })}
                      className="mt-1 text-sm font-medium"
                      placeholder="Ex: Clínica Saúde & Sorriso"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Segmento / Nicho</label>
                    <Input
                      value={selectedFlow.segment}
                      onChange={e => setSelectedFlow({ ...selectedFlow, segment: e.target.value })}
                      className="mt-1 text-sm font-medium"
                      placeholder="Ex: Saúde & Odontologia"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Resposta em caso de Recusa ("Sem interesse")</label>
                    <Input
                      value={selectedFlow.rejectionMessage || ''}
                      onChange={e => setSelectedFlow({ ...selectedFlow, rejectionMessage: e.target.value })}
                      className="mt-1 text-sm font-medium"
                      placeholder="Agradecemos sua atenção! Caso precise no futuro, estamos à disposição."
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Lista Horizontal / Seletor de Etapas */}
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-500" /> Etapas da Conversa ({selectedFlow.steps.length})
              </h2>
              <Button
                size="sm"
                variant="outline"
                className="text-xs border-dashed"
                onClick={() => {
                  const newStepId = `step-${Date.now()}`;
                  const newStep: BotStep = {
                    id: newStepId,
                    title: `Nova Pergunta ${selectedFlow.steps.length + 1}`,
                    type: 'question_choice',
                    message: 'Como podemos te ajudar?',
                    options: [
                      { id: `opt-1`, key: '1', label: 'Opção 1', nextStepId: 'step-final' },
                      { id: `opt-2`, key: '2', label: 'Opção 2', nextStepId: 'step-final' },
                    ],
                  };
                  setSelectedFlow({
                    ...selectedFlow,
                    steps: [...selectedFlow.steps, newStep],
                  });
                  setEditingStepIndex(selectedFlow.steps.length);
                  toast.success('Nova etapa adicionada!');
                }}
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar Etapa
              </Button>
            </div>

            {/* Stepper Visual */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
              {selectedFlow.steps.map((step, idx) => (
                <button
                  key={step.id}
                  onClick={() => setEditingStepIndex(idx)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 border ${
                    editingStepIndex === idx
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-800 hover:border-slate-300'
                  }`}
                >
                  <span className="w-5 h-5 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center text-[10px]">
                    {idx + 1}
                  </span>
                  <span className="max-w-[130px] truncate">{step.title}</span>
                </button>
              ))}
            </div>

            {/* Card Editor da Etapa Ativa */}
            {currentStep && (
              <Card className="border-slate-200 dark:border-zinc-800 shadow-sm">
                <CardHeader className="pb-3 border-b border-slate-100 dark:border-zinc-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs font-semibold">
                          Etapa {editingStepIndex + 1} de {selectedFlow.steps.length}
                        </Badge>
                        <Badge className="bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300 text-xs">
                          {currentStep.type === 'question_choice' && 'Pergunta com Opções'}
                          {currentStep.type === 'question_text' && 'Pergunta de Texto Livre'}
                          {currentStep.type === 'closing' && 'Encerramento / Transferência'}
                          {currentStep.type === 'greeting' && 'Saudação Inicial'}
                        </Badge>
                      </div>
                      <CardTitle className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                        {currentStep.title}
                      </CardTitle>
                    </div>

                    {selectedFlow.steps.length > 1 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                        onClick={() => {
                          const updated = selectedFlow.steps.filter((_, i) => i !== editingStepIndex);
                          setSelectedFlow({ ...selectedFlow, steps: updated });
                          setEditingStepIndex(Math.max(0, editingStepIndex - 1));
                          toast.success('Etapa removida.');
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-1" /> Excluir Etapa
                      </Button>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 pt-4">
                  {/* Título da Etapa */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Título / Identificador Interno</label>
                    <Input
                      value={currentStep.title}
                      onChange={e => {
                        const updated = [...selectedFlow.steps];
                        updated[editingStepIndex].title = e.target.value;
                        setSelectedFlow({ ...selectedFlow, steps: updated });
                      }}
                      className="mt-1 text-sm font-medium"
                    />
                  </div>

                  {/* Tipo de Etapa */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Tipo de Interação</label>
                    <div className="grid grid-cols-3 gap-2 mt-1">
                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...selectedFlow.steps];
                          updated[editingStepIndex].type = 'question_choice';
                          if (!updated[editingStepIndex].options) {
                            updated[editingStepIndex].options = [
                              { id: 'opt-1', key: '1', label: 'Opção 1', nextStepId: '' },
                            ];
                          }
                          setSelectedFlow({ ...selectedFlow, steps: updated });
                        }}
                        className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition-all ${
                          currentStep.type === 'question_choice'
                            ? 'border-emerald-500 bg-emerald-50/20 text-emerald-700 dark:text-emerald-300'
                            : 'border-slate-200 dark:border-zinc-800'
                        }`}
                      >
                        🔢 Pergunta com Opções
                        <p className="text-[10px] text-slate-400 font-normal mt-0.5">Cliente responde com 1, 2, 3...</p>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...selectedFlow.steps];
                          updated[editingStepIndex].type = 'question_text';
                          setSelectedFlow({ ...selectedFlow, steps: updated });
                        }}
                        className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition-all ${
                          currentStep.type === 'question_text'
                            ? 'border-emerald-500 bg-emerald-50/20 text-emerald-700 dark:text-emerald-300'
                            : 'border-slate-200 dark:border-zinc-800'
                        }`}
                      >
                        📝 Pergunta de Texto Livre
                        <p className="text-[10px] text-slate-400 font-normal mt-0.5">Cliente digita nome, cidade, etc.</p>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...selectedFlow.steps];
                          updated[editingStepIndex].type = 'closing';
                          updated[editingStepIndex].isEnd = true;
                          updated[editingStepIndex].action = 'transfer_human';
                          setSelectedFlow({ ...selectedFlow, steps: updated });
                        }}
                        className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition-all ${
                          currentStep.type === 'closing'
                            ? 'border-emerald-500 bg-emerald-50/20 text-emerald-700 dark:text-emerald-300'
                            : 'border-slate-200 dark:border-zinc-800'
                        }`}
                      >
                        🏁 Encerramento / Atendente
                        <p className="text-[10px] text-slate-400 font-normal mt-0.5">Transfere para humano ou finaliza</p>
                      </button>
                    </div>
                  </div>

                  {/* Mensagem enviada pelo robô */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                        Mensagem enviada pelo Robô no WhatsApp
                      </label>
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <span className="text-slate-400">Variáveis:</span>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...selectedFlow.steps];
                            updated[editingStepIndex].message += ' {{nome_cliente}}';
                            setSelectedFlow({ ...selectedFlow, steps: updated });
                          }}
                          className="px-1.5 py-0.5 bg-slate-100 dark:bg-zinc-800 rounded text-slate-600 dark:text-zinc-300 hover:bg-slate-200"
                        >
                          + Nome
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...selectedFlow.steps];
                            updated[editingStepIndex].message += ' {{minha_empresa}}';
                            setSelectedFlow({ ...selectedFlow, steps: updated });
                          }}
                          className="px-1.5 py-0.5 bg-slate-100 dark:bg-zinc-800 rounded text-slate-600 dark:text-zinc-300 hover:bg-slate-200"
                        >
                          + Empresa
                        </button>
                      </div>
                    </div>

                    <textarea
                      rows={5}
                      value={currentStep.message}
                      onChange={e => {
                        const updated = [...selectedFlow.steps];
                        updated[editingStepIndex].message = e.target.value;
                        setSelectedFlow({ ...selectedFlow, steps: updated });
                      }}
                      className="w-full text-sm p-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950 font-sans focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                      placeholder="Digite a mensagem do robô..."
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      💡 Dica anti-bloqueio: Use Spintax com chaves como <code>{'{Olá|Oi|Tudo bem?}'}</code> para alternar saudações automaticamente a cada cliente.
                    </p>
                  </div>

                  {/* Configuração de Opções (se for question_choice) */}
                  {currentStep.type === 'question_choice' && (
                    <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-zinc-800">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                          Opções de Resposta do Cliente
                        </label>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-xs h-7 text-emerald-600"
                          onClick={() => {
                            const updated = [...selectedFlow.steps];
                            const opts = updated[editingStepIndex].options || [];
                            const nextKey = String(opts.length + 1);
                            opts.push({
                              id: `opt-${Date.now()}`,
                              key: nextKey,
                              label: `Opção ${nextKey}`,
                              nextStepId: '',
                            });
                            updated[editingStepIndex].options = opts;
                            setSelectedFlow({ ...selectedFlow, steps: updated });
                          }}
                        >
                          <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar Opção
                        </Button>
                      </div>

                      <div className="space-y-2">
                        {(currentStep.options || []).map((opt, oIdx) => (
                          <div key={opt.id || oIdx} className="flex items-center gap-2 bg-slate-50 dark:bg-zinc-800/50 p-2.5 rounded-xl border border-slate-200 dark:border-zinc-700/60">
                            <span className="w-7 h-7 shrink-0 rounded-lg bg-emerald-500/10 text-emerald-600 font-bold flex items-center justify-center text-xs">
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
                    className="h-8 w-8 p-0 text-white/80 hover:text-white hover:bg-white/10"
                    title="Reiniciar Simulação"
                    onClick={() => initSimulation(selectedFlow)}
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </div>

                {/* Área de Mensagens do Chat */}
                <div 
                  ref={simChatRef}
                  className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#ECE5DD] dark:bg-[#0B141A] text-slate-900 dark:text-zinc-100"
                  style={{ backgroundImage: 'radial-gradient(#00000008 1px, transparent 1px)', backgroundSize: '16px 16px' }}
                >
                  <div className="text-center my-2">
                    <span className="bg-white/80 dark:bg-zinc-800/80 text-[10px] text-slate-500 dark:text-zinc-400 px-2.5 py-1 rounded-full shadow-xs">
                      🔒 As mensagens são protegidas com a criptografia de ponta a ponta
                    </span>
                  </div>

                  {simMessages.map((m, idx) => (
                    <div
                      key={idx}
                      className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed shadow-sm relative ${
                          m.sender === 'user'
                            ? 'bg-[#E7FFDB] dark:bg-[#005C4B] text-slate-900 dark:text-white rounded-tr-none'
                            : 'bg-white dark:bg-[#202C33] text-slate-900 dark:text-white rounded-tl-none'
                        }`}
                      >
                        <p className="whitespace-pre-line">{m.text}</p>
                        <div className="text-[9px] text-slate-400 dark:text-zinc-400 text-right mt-1 flex items-center justify-end gap-1">
                          <span>{m.time}</span>
                          {m.sender === 'user' && <Check className="w-3 h-3 text-sky-500" />}
                        </div>
                      </div>
                    </div>
                  ))}

                  {isSimTyping && (
                    <div className="flex items-center gap-1.5 bg-white dark:bg-[#202C33] p-2.5 rounded-2xl rounded-tl-none w-16 shadow-xs">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" />
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce delay-100" />
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce delay-200" />
                    </div>
                  )}
                </div>

                {/* Opções Rápidas de Resposta (se a etapa atual tiver opções) */}
                {currentStep && currentStep.options && currentStep.options.length > 0 && (
                  <div className="px-3 py-2 bg-slate-100 dark:bg-[#111B21] border-t border-slate-200 dark:border-zinc-800 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                    <span className="text-[10px] text-slate-400 font-bold shrink-0">Opções:</span>
                    {currentStep.options.map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => handleSimSend(opt.key)}
                        className="px-2.5 py-1 bg-white dark:bg-[#202C33] border border-slate-300 dark:border-zinc-700 text-slate-800 dark:text-zinc-200 rounded-lg text-[11px] font-semibold hover:bg-emerald-50 dark:hover:bg-emerald-950/30 whitespace-nowrap shadow-xs transition-colors shrink-0"
                      >
                        {opt.key} - {opt.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Campo de Entrada de Mensagem */}
                <div className="p-2.5 bg-slate-100 dark:bg-[#202C33] flex items-center gap-2 border-t border-slate-200 dark:border-zinc-800">
                  <Input
                    value={simInput}
                    onChange={e => setSimInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleSimSend();
                    }}
                    placeholder="Digite uma mensagem como cliente..."
                    className="h-9 text-xs bg-white dark:bg-[#2A3942] border-none rounded-full text-slate-900 dark:text-white"
                  />
                  <Button
                    size="sm"
                    onClick={() => handleSimSend()}
                    className="h-9 w-9 p-0 rounded-full bg-[#00A884] hover:bg-[#008f6f] text-white shrink-0 shadow-sm"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ABA: DÚVIDAS FREQUENTES (FAQ / RESPOSTAS DIRETAS) */}
      {activeTab === 'faq' && selectedFlow && (
        <Card className="border-slate-200 dark:border-zinc-800">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-emerald-500" /> Respostas Imediatas por Palavras-Chave (FAQ)
                </CardTitle>
                <CardDescription className="text-xs">
                  Quando o cliente fizer qualquer pergunta contendo essas palavras (ex: preço, localização, horário), o robô responde instantaneamente.
                </CardDescription>
              </div>

              <Button
                size="sm"
                onClick={() => {
                  const updatedRules = selectedFlow.faqRules || [];
                  updatedRules.push({
                    id: `faq-${Date.now()}`,
                    keywords: ['preco', 'valor'],
                    reply: 'Nossos preços partem de valores especiais. Entre em contato para cotação!',
                  });
                  setSelectedFlow({ ...selectedFlow, faqRules: updatedRules });
                }}
                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Nova Regra de FAQ
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 pt-4">
            {(selectedFlow.faqRules || []).map((faq, fIdx) => (
              <div key={faq.id || fIdx} className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                    Regra #{fIdx + 1}
                  </label>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-rose-500 hover:text-rose-600"
                    onClick={() => {
                      const updated = selectedFlow.faqRules?.filter((_, i) => i !== fIdx);
                      setSelectedFlow({ ...selectedFlow, faqRules: updated });
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Remover
                  </Button>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    Palavras-Chave Gatilho (separadas por vírgula)
                  </label>
                  <Input
                    value={(faq.keywords || []).join(', ')}
                    onChange={e => {
                      const kws = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                      const updated = [...(selectedFlow.faqRules || [])];
                      updated[fIdx].keywords = kws;
                      setSelectedFlow({ ...selectedFlow, faqRules: updated });
                    }}
                    className="mt-1 text-xs"
                    placeholder="Ex: preco, valor, quanto custa, tabela"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    Resposta Imediata do Robô
                  </label>
                  <textarea
                    rows={3}
                    value={faq.reply}
                    onChange={e => {
                      const updated = [...(selectedFlow.faqRules || [])];
                      updated[fIdx].reply = e.target.value;
                      setSelectedFlow({ ...selectedFlow, faqRules: updated });
                    }}
                    className="w-full mt-1 text-xs p-2.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 font-sans"
                    placeholder="Digite a resposta do robô..."
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ABA: ACIONAR CLIENTES COM O FLUXO */}
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
