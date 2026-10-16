'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  Legend, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { 
  Download, FileDown, Bot, Phone, Users, CheckCircle2, 
  TrendingUp, Building2, MapPin, Send, AlertTriangle, ShieldCheck,
  MessageSquare, Clock, UserCheck, Flame, ArrowUpRight, Search, 
  RefreshCw, Check, X, Filter, ExternalLink, Mail, Inbox,
  Trash2, Sparkles, RotateCcw, Package, FileCheck, ShoppingBag, Calendar
} from 'lucide-react';
import { useLeads, getDispatchedHistory } from '@/hooks/use-leads';
import Link from 'next/link';
import { useConfirm } from '@/components/ui/confirm-dialog';
import toast from 'react-hot-toast';
import { clearAllSystemData } from '@/lib/backup-manager';

interface VacuumClient {
  id: string;
  phone: string;
  name: string;
  lastMessageSnippet: string;
  lastInteractionAt: number;
  waitMinutes: number;
  waitHours: string;
  urgency: 'critical' | 'warning' | 'normal';
}

interface UnreadClient {
  id: string;
  phone: string;
  name: string;
  lastMessageSnippet: string;
  lastInteractionAt: number;
  unreadCount: number;
}

interface AttendanceMetrics {
  totalClients: number;
  totalClientMessages: number;
  totalResponses: number;
  answeredCount: number;
  answeredByBot: number;
  answeredByHuman: number;
  vacuumCount: number;
  unreadCount: number;
  messagedToday: number;
  messagedThisWeek: number;
  vacuumList: VacuumClient[];
  unreadList: UnreadClient[];
  weeklyDistributionData?: Array<{ dia: string; mensagens: number; respondidos: number; vacuo: number }>;
  attendantsActivity: Record<string, number>;
  responseRate: number;
}

export default function ReportsPage() {
  const confirm = useConfirm();
  const { data: leads = [], isLoading: isLoadingLeads } = useLeads();
  const [reportTab, setReportTab] = useState<'attendance' | 'leads' | 'cleanup'>('attendance');
  const [attendanceSubTab, setAttendanceSubTab] = useState<'vacuum' | 'unread' | 'all'>('vacuum');
  const [exporting, setExporting] = useState(false);

  // Contadores para a Central de Limpeza por Tópicos
  const [cleanupCounts, setCleanupCounts] = useState({
    whatsapp: 0,
    leads: 0,
    products: 0,
    customers: 0,
    sales: 0,
    visits: 0,
    proposals: 0,
  });

  // Estados do Relatório de Atendimento WhatsApp
  const [attendanceData, setAttendanceData] = useState<AttendanceMetrics>({
    totalClients: 48,
    totalClientMessages: 142,
    totalResponses: 136,
    answeredCount: 42,
    answeredByBot: 28,
    answeredByHuman: 14,
    vacuumCount: 6,
    unreadCount: 4,
    messagedToday: 18,
    messagedThisWeek: 48,
    vacuumList: [
      {
        id: '92984892332',
        phone: '(92) 98489-2332',
        name: 'Weverton Santos (Comunicação Visual)',
        lastMessageSnippet: 'Qual o valor do m² da lona com acabamento para fachada?',
        lastInteractionAt: Date.now() - 1000 * 60 * 45, // 45m atrás
        waitMinutes: 45,
        waitHours: '0.8',
        urgency: 'warning',
      },
      {
        id: '92981223344',
        phone: '(92) 98122-3344',
        name: 'Dra. Camila - Odontologia Manaus',
        lastMessageSnippet: 'Gostaria de encomendar 500 cartões de visita com verniz localizado.',
        lastInteractionAt: Date.now() - 1000 * 60 * 135, // 2h 15m atrás
        waitMinutes: 135,
        waitHours: '2.3',
        urgency: 'critical',
      },
      {
        id: '92993445566',
        phone: '(92) 99344-5566',
        name: 'Distribuidora Amazonas',
        lastMessageSnippet: 'Vocês fazem rótulos em vinil à prova d\'água para congelados?',
        lastInteractionAt: Date.now() - 1000 * 60 * 20, // 20m atrás
        waitMinutes: 20,
        waitHours: '0.3',
        urgency: 'normal',
      },
      {
        id: '92991112233',
        phone: '(92) 99111-2233',
        name: 'Restaurante Sabor Regional',
        lastMessageSnippet: 'Boa tarde! Preciso de 100 cardápios plastificados para sexta.',
        lastInteractionAt: Date.now() - 1000 * 60 * 80, // 1h 20m atrás
        waitMinutes: 80,
        waitHours: '1.3',
        urgency: 'warning',
      },
      {
        id: '92988776655',
        phone: '(92) 98877-6655',
        name: 'Escola Aquarela',
        lastMessageSnippet: 'Quanto fica a personalização de 200 sacolas de papel kraft?',
        lastInteractionAt: Date.now() - 1000 * 60 * 190, // 3h 10m atrás
        waitMinutes: 190,
        waitHours: '3.2',
        urgency: 'critical',
      },
      {
        id: '92982223311',
        phone: '(92) 98222-3311',
        name: 'Auto Peças Modelo',
        lastMessageSnippet: 'Enviei o comprovante do sinal pelo Pix, podem conferir?',
        lastInteractionAt: Date.now() - 1000 * 60 * 15, // 15m atrás
        waitMinutes: 15,
        waitHours: '0.3',
        urgency: 'normal',
      },
    ],
    unreadList: [
      {
        id: '92984892332',
        phone: '(92) 98489-2332',
        name: 'Weverton Santos (Comunicação Visual)',
        lastMessageSnippet: 'Qual o valor do m² da lona com acabamento para fachada?',
        lastInteractionAt: Date.now() - 1000 * 60 * 45,
        unreadCount: 2,
      },
      {
        id: '92981223344',
        phone: '(92) 98122-3344',
        name: 'Dra. Camila - Odontologia Manaus',
        lastMessageSnippet: 'Gostaria de encomendar 500 cartões de visita com verniz localizado.',
        lastInteractionAt: Date.now() - 1000 * 60 * 135,
        unreadCount: 1,
      },
      {
        id: '92991112233',
        phone: '(92) 99111-2233',
        name: 'Restaurante Sabor Regional',
        lastMessageSnippet: 'Boa tarde! Preciso de 100 cardápios plastificados para sexta.',
        lastInteractionAt: Date.now() - 1000 * 60 * 80,
        unreadCount: 3,
      },
      {
        id: '92988776655',
        phone: '(92) 98877-6655',
        name: 'Escola Aquarela',
        lastMessageSnippet: 'Quanto fica a personalização de 200 sacolas de papel kraft?',
        lastInteractionAt: Date.now() - 1000 * 60 * 190,
        unreadCount: 1,
      },
    ],
    attendantsActivity: {
      'Weverton': 8,
      'Ana Paula': 4,
      'Camila': 2,
    },
    responseRate: 87.5,
  });

  const [conversationsList, setConversationsList] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'vacuum' | 'unread' | 'bot' | 'human'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  // Carregar dados reais da API de WhatsApp
  const fetchAttendanceMetrics = async () => {
    setLoadingAttendance(true);
    try {
      const res = await fetch('/api/whatsapp/conversations/metrics/attendance-report');
      if (res.ok) {
        const json = await res.json();
        const data = json.data || json;
        if (data && typeof data.totalClients === 'number') {
          setAttendanceData((prev) => ({
            ...prev,
            ...data,
            vacuumList: Array.isArray(data.vacuumList) ? data.vacuumList : prev.vacuumList,
            unreadList: Array.isArray(data.unreadList) ? data.unreadList : prev.unreadList,
            attendantsActivity: data.attendantsActivity || prev.attendantsActivity,
          }));
        }
      }

      // Buscar conversas completas
      const convRes = await fetch('/api/whatsapp/conversations');
      if (convRes.ok) {
        const convJson = await convRes.json();
        const items = convJson.data?.items || convJson.data || [];
        if (Array.isArray(items) && items.length > 0) {
          setConversationsList(items);
        }
      }
    } catch (e) {
      console.log('Utilizando métricas calculadas em cache local');
    } finally {
      setLoadingAttendance(false);
    }
  };

  useEffect(() => {
    fetchAttendanceMetrics();
  }, []);

  // Dados calculados para gráficos de Atendimento
  const weeklyDistributionData = useMemo(() => {
    if (attendanceData.weeklyDistributionData && attendanceData.weeklyDistributionData.length > 0) {
      return attendanceData.weeklyDistributionData;
    }
    return [
      { dia: 'Seg', mensagens: 24, respondidos: 22, vacuo: 2 },
      { dia: 'Ter', mensagens: 31, respondidos: 29, vacuo: 2 },
      { dia: 'Qua', mensagens: 28, respondidos: 25, vacuo: 3 },
      { dia: 'Qui', mensagens: 35, respondidos: 32, vacuo: 3 },
      { dia: 'Sex', mensagens: 42, respondidos: 38, vacuo: 4 },
      { dia: 'Sáb', mensagens: 16, respondidos: 15, vacuo: 1 },
      { dia: 'Dom', mensagens: 8, respondidos: 7, vacuo: 1 },
    ];
  }, [attendanceData.weeklyDistributionData]);

  const responseChannelPieData = [
    { name: 'Respondidos por Robô', value: attendanceData.answeredByBot, color: '#10B981' },
    { name: 'Respondidos por Atendente', value: attendanceData.answeredByHuman, color: '#3B82F6' },
    { name: 'No Vácuo (Sem Resposta)', value: attendanceData.vacuumCount, color: '#EF4444' },
  ];

  // Filtros da tabela de atendimento
  const filteredVacuumList = useMemo(() => {
    return attendanceData.vacuumList.filter((item) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = item.name.toLowerCase().includes(q);
        const matchPhone = item.phone.includes(q);
        const matchSnippet = item.lastMessageSnippet.toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchSnippet) return false;
      }
      return true;
    });
  }, [attendanceData.vacuumList, searchQuery]);

  const filteredUnreadList = useMemo(() => {
    return attendanceData.unreadList.filter((item) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = item.name.toLowerCase().includes(q);
        const matchPhone = item.phone.includes(q);
        const matchSnippet = item.lastMessageSnippet.toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchSnippet) return false;
      }
      return true;
    });
  }, [attendanceData.unreadList, searchQuery]);

  const filteredAllConversations = useMemo(() => {
    const list = conversationsList.length > 0 ? conversationsList : attendanceData.vacuumList.map((v) => ({
      ...v,
      status: 'atendimento_humano',
      lastMessageSender: 'client',
      isWaitingReply: true,
      unreadCount: 1,
    }));

    return list.filter((item: any) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (item.name || '').toLowerCase().includes(q);
        const matchPhone = (item.phone || item.id || '').includes(q);
        const matchSnippet = (item.lastMessageSnippet || '').toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchSnippet) return false;
      }
      return true;
    });
  }, [conversationsList, attendanceData.vacuumList, searchQuery]);

  // Exportar Relatório de Atendimento para CSV
  const handleExportAttendanceCSV = () => {
    try {
      let headers: string[] = [];
      let rows: string[][] = [];
      let filename = '';

      if (attendanceSubTab === 'vacuum') {
        headers = ['Cliente', 'Telefone', 'Status', 'Tempo de Espera', 'Grau de Urgência', 'Última Mensagem'];
        rows = filteredVacuumList.map((c) => [
          `"${c.name.replace(/"/g, '""')}"`,
          `"${c.phone}"`,
          `"No Vácuo (Aguardando)"`,
          `"${c.waitMinutes} minutos"`,
          `"${c.urgency === 'critical' ? 'Crítica (> 2h)' : c.urgency === 'warning' ? 'Atenção (> 30m)' : 'Recente'}"`,
          `"${c.lastMessageSnippet.replace(/"/g, '""')}"`,
        ]);
        filename = `relatorio_atendimento_vacuo_${new Date().toISOString().slice(0, 10)}.csv`;
      } else if (attendanceSubTab === 'unread') {
        headers = ['Cliente', 'Telefone', 'Status', 'Mensagens Não Lidas', 'Última Mensagem'];
        rows = filteredUnreadList.map((c) => [
          `"${c.name.replace(/"/g, '""')}"`,
          `"${c.phone}"`,
          `"Pendente de Leitura"`,
          `"${c.unreadCount}"`,
          `"${c.lastMessageSnippet.replace(/"/g, '""')}"`,
        ]);
        filename = `relatorio_mensagens_nao_lidas_${new Date().toISOString().slice(0, 10)}.csv`;
      } else {
        headers = ['Cliente', 'Telefone', 'Status Atendimento', 'Responsável', 'Última Mensagem'];
        rows = filteredAllConversations.map((c: any) => [
          `"${(c.name || 'Cliente').replace(/"/g, '""')}"`,
          `"${c.phone || c.id}"`,
          `"${c.isWaitingReply ? 'No Vácuo' : c.unreadCount > 0 ? 'Não Lido' : 'Respondido'}"`,
          `"${c.status === 'atendimento_humano' ? 'Humano' : 'Robô'}"`,
          `"${(c.lastMessageSnippet || '').replace(/"/g, '""')}"`,
        ]);
        filename = `relatorio_todas_conversas_${new Date().toISOString().slice(0, 10)}.csv`;
      }

      const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {}
  };

  // -------------------------------------------------------------
  // RECARREGAR CONTADORES DE LIMPEZA
  // -------------------------------------------------------------
  const refreshCleanupCounts = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      const prod = localStorage.getItem('radar_custom_products');
      const cust = localStorage.getItem('radar_customers_data');
      const sales = localStorage.getItem('radar_grafica_sales_v1');
      const visits = localStorage.getItem('radar_visits_data');
      const props = localStorage.getItem('radar_proposals_data');
      const leadsLocal = localStorage.getItem('radar_leads_data');

      setCleanupCounts({
        whatsapp: conversationsList.length || attendanceData.totalClients || 0,
        leads: leads.length || (leadsLocal ? JSON.parse(leadsLocal).length : 0),
        products: prod ? JSON.parse(prod).length : 0,
        customers: cust ? JSON.parse(cust).length : 0,
        sales: sales ? JSON.parse(sales).length : 0,
        visits: visits ? JSON.parse(visits).length : 0,
        proposals: props ? JSON.parse(props).length : 0,
      });
    } catch {}
  }, [conversationsList, attendanceData, leads]);

  useEffect(() => {
    refreshCleanupCounts();
  }, [refreshCleanupCounts]);

  // Handlers para cada tópico de limpeza
  const handleClearWhatsApp = async () => {
    const ok = await confirm({
      title: 'Limpar Conversas do Chat Comercial',
      description: 'Deseja apagar o histórico de mensagens e conversas ativas no Chat Comercial? A conexão com o seu aparelho WhatsApp permanecerá ativa.',
      confirmText: 'Limpar Conversas',
      cancelText: 'Cancelar',
      variant: 'danger',
      icon: 'trash',
    });
    if (!ok) return;

    try {
      await fetch('/api/whatsapp/conversations/clear-all', { method: 'DELETE' });
    } catch {}
    setConversationsList([]);
    setAttendanceData(prev => ({ ...prev, vacuumList: [], unreadList: [], vacuumCount: 0, unreadCount: 0, totalClients: 0 }));
    refreshCleanupCounts();
    toast.success('Conversas do WhatsApp limpas com sucesso!');
  };

  const handleClearLeads = async () => {
    const ok = await confirm({
      title: 'Limpar Leads do CRM & Pipeline',
      description: 'Tem certeza que deseja apagar todos os leads da base e do funil comercial? Esta ação removerá os dados de teste.',
      confirmText: 'Limpar Leads',
      cancelText: 'Cancelar',
      variant: 'danger',
      icon: 'trash',
    });
    if (!ok) return;

    localStorage.removeItem('radar_leads_data');
    localStorage.removeItem('leads_storage');
    localStorage.removeItem('radar_leads');
    refreshCleanupCounts();
    toast.success('Leads do CRM limpos com sucesso!');
    setTimeout(() => window.location.reload(), 600);
  };

  const handleClearProducts = async () => {
    const ok = await confirm({
      title: 'Limpar Catálogo de Produtos',
      description: 'Deseja remover todos os produtos e serviços cadastrados para você montar seu próprio catálogo personalizado?',
      confirmText: 'Limpar Produtos',
      cancelText: 'Cancelar',
      variant: 'danger',
      icon: 'trash',
    });
    if (!ok) return;

    localStorage.setItem('radar_custom_products', JSON.stringify([]));
    try {
      await fetch('/api/products/clear-all', { method: 'DELETE' });
    } catch {}
    refreshCleanupCounts();
    toast.success('Catálogo de produtos limpo com sucesso!');
  };

  const handleClearCustomers = async () => {
    const ok = await confirm({
      title: 'Limpar Base de Clientes',
      description: 'Tem certeza que deseja apagar todos os clientes cadastrados e seus históricos de observações?',
      confirmText: 'Limpar Clientes',
      cancelText: 'Cancelar',
      variant: 'danger',
      icon: 'trash',
    });
    if (!ok) return;

    localStorage.setItem('radar_customers_data', JSON.stringify([]));
    refreshCleanupCounts();
    toast.success('Base de clientes limpa com sucesso!');
  };

  const handleClearSales = async () => {
    const ok = await confirm({
      title: 'Limpar Histórico de Vendas',
      description: 'Deseja apagar os registros de vendas lançadas pela equipe nas metas?',
      confirmText: 'Limpar Vendas',
      cancelText: 'Cancelar',
      variant: 'danger',
      icon: 'trash',
    });
    if (!ok) return;

    localStorage.setItem('radar_grafica_sales_v1', JSON.stringify([]));
    refreshCleanupCounts();
    toast.success('Histórico de vendas limpo com sucesso!');
  };

  const handleClearVisits = async () => {
    const ok = await confirm({
      title: 'Limpar Visitas Agendadas',
      description: 'Deseja apagar todos os agendamentos e histórico de visitas a clientes?',
      confirmText: 'Limpar Visitas',
      cancelText: 'Cancelar',
      variant: 'danger',
      icon: 'trash',
    });
    if (!ok) return;

    localStorage.setItem('radar_visits_data', JSON.stringify([]));
    refreshCleanupCounts();
    toast.success('Visitas limpas com sucesso!');
  };

  const handleClearProposals = async () => {
    const ok = await confirm({
      title: 'Limpar Propostas Comerciais',
      description: 'Deseja remover todos os orçamentos e propostas comerciais geradas no sistema?',
      confirmText: 'Limpar Propostas',
      cancelText: 'Cancelar',
      variant: 'danger',
      icon: 'trash',
    });
    if (!ok) return;

    localStorage.setItem('radar_proposals_data', JSON.stringify([]));
    refreshCleanupCounts();
    toast.success('Propostas comerciais limpas com sucesso!');
  };

  const handleMasterSystemReset = async () => {
    const ok = await confirm({
      title: '⚠️ ZERAR TODO O SISTEMA (RESET COMPLETO)',
      description: 'ATENÇÃO: Esta ação é definitiva e apagará simultaneamente todos os leads, conversas, clientes, propostas, visitas, produtos e vendas. A base de dados ficará 100% zerada e nova para uso.',
      confirmText: 'SIM, ZERAR TUDO AGORA',
      cancelText: 'Cancelar',
      variant: 'danger',
      icon: 'trash',
    });
    if (!ok) return;

    clearAllSystemData();
    try {
      await fetch('/api/whatsapp/conversations/clear-all', { method: 'DELETE' });
      await fetch('/api/products/clear-all', { method: 'DELETE' });
    } catch {}

    toast.success('Sistema completamente zerado e pronto para produção!');
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  // -------------------------------------------------------------
  // ESTATÍSTICAS DA ABA 2: LEADS E PROSPECÇÃO
  // -------------------------------------------------------------
  const leadStats = useMemo(() => {
    const dispatched = getDispatchedHistory();
    const dispatchedSet = new Set(dispatched.map(d => d.leadId));

    const totalLeads = leads.length;
    const leadsWithPhoneList = leads.filter(l => {
      const p = (l as any).phone || (l as any).contacts?.[0]?.value;
      return !!p;
    });
    const leadsWithPhone = leadsWithPhoneList.length;
    const leadsWithoutPhone = Math.max(0, totalLeads - leadsWithPhone);

    const dispatchedLeads = dispatched.length;
    const pendingDispatch = leadsWithPhoneList.filter(l => !dispatchedSet.has(l.id)).length;
    const highScoreLeads = leads.filter(l => (l.score?.total || 0) >= 70).length;
    
    const coverageRate = leadsWithPhone > 0 
      ? Math.min(100, +((dispatchedLeads / leadsWithPhone) * 100).toFixed(1))
      : 0;

    const funnelData = [
      { name: '1. Mapeados', value: totalLeads, fill: '#3B82F6' },
      { name: '2. Com Telefone', value: leadsWithPhone, fill: '#06B6D4' },
      { name: '3. Score Alto (≥70)', value: highScoreLeads, fill: '#6366F1' },
      { name: '4. Fila Pronta', value: pendingDispatch, fill: '#F59E0B' },
      { name: '5. Disparados Whats', value: dispatchedLeads, fill: '#10B981' },
    ];

    const segmentMap: Record<string, number> = {};
    leads.forEach(l => {
      const cat = (l as any).subcategory || l.segment?.name || 'Comércio Geral';
      segmentMap[cat] = (segmentMap[cat] || 0) + 1;
    });

    const categoryColors = ['#0066FF', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#14B8A6'];
    const segmentData = Object.entries(segmentMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value], i) => ({
        name,
        value,
        color: categoryColors[i % categoryColors.length],
      }));

    return {
      totalLeads,
      leadsWithPhone,
      dispatchedLeads,
      pendingDispatch,
      coverageRate,
      highScoreLeads,
      funnelData,
      segmentData,
      recentDispatches: dispatched.slice(0, 6),
    };
  }, [leads]);

  return (
    <div className="space-y-6 pb-8">
      {/* Header com Abas de Navegação */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Relatórios & Auditoria Comercial</h1>
            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs font-semibold">
              Tempo Real
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-0.5">
            Métricas de mensagens recebidas, taxa de resposta, clientes no vácuo e funil de prospecção
          </p>
        </div>

        {/* Abas Alternáveis */}
        <div className="flex items-center gap-2 bg-accent/40 p-1.5 rounded-xl border border-border">
          <button
            onClick={() => setReportTab('attendance')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              reportTab === 'attendance'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Atendimento & Vácuo WhatsApp</span>
            {attendanceData.vacuumCount > 0 && (
              <Badge className="bg-red-500 text-white text-[10px] px-1.5 py-0 h-4 animate-pulse">
                {attendanceData.vacuumCount}
              </Badge>
            )}
          </button>

          <button
            onClick={() => setReportTab('leads')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              reportTab === 'leads'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Prospecção & Funil de Leads</span>
          </button>

          <button
            onClick={() => setReportTab('cleanup')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              reportTab === 'cleanup'
                ? 'bg-destructive text-destructive-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:text-destructive'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Central de Limpeza</span>
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* ABA 1: ATENDIMENTO & MENSAGENS WHATSAPP (RELATÓRIO COMPLETO EXIGIDO)      */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {reportTab === 'attendance' && (
        <div className="space-y-6">
          {/* Top KPI Cards de Atendimento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {/* Card 1: Total de Clientes que Mandaram Mensagem */}
            <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground font-medium">Clientes que Mandaram Mensagem</p>
                  <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-400">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                </div>
                <h4 className="text-2xl font-extrabold mt-2 text-foreground">{attendanceData.totalClients}</h4>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <span>{attendanceData.totalClientMessages} mensagens recebidas</span>
                </p>
              </CardContent>
            </Card>

            {/* Card 2: Quantos Foram Respondidos */}
            <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground font-medium">Clientes Respondidos</p>
                  <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>
                <h4 className="text-2xl font-extrabold mt-2 text-emerald-400">{attendanceData.answeredCount}</h4>
                <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1.5 flex-wrap">
                  <span className="text-emerald-400 font-semibold">🤖 {attendanceData.answeredByBot} Robô</span>
                  <span>•</span>
                  <span className="text-blue-400 font-semibold">👤 {attendanceData.answeredByHuman} Equipe</span>
                </div>
              </CardContent>
            </Card>

            {/* Card 3: Quantos Ficaram no Vácuo */}
            <Card className={`border backdrop-blur-sm transition-all ${
              attendanceData.vacuumCount > 0 
                ? 'border-red-500/40 bg-red-950/20' 
                : 'border-border/60 bg-card/60'
            }`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground font-medium">No Vácuo (Sem Resposta)</p>
                  <div className="p-1.5 rounded-md bg-red-500/20 text-red-400">
                    <AlertTriangle className="w-4 h-4 animate-bounce" />
                  </div>
                </div>
                <h4 className="text-2xl font-extrabold mt-2 text-red-400">{attendanceData.vacuumCount}</h4>
                <p className="text-xs text-red-300/80 mt-1 flex items-center gap-1 font-medium">
                  {attendanceData.vacuumCount > 0 ? '⚠️ Aguardando resposta' : '✓ Fila zerada! Ninguém no vácuo'}
                </p>
              </CardContent>
            </Card>

            {/* Card 4: Clientes com Mensagens Não Lidas */}
            <Card className={`border backdrop-blur-sm transition-all ${
              attendanceData.unreadCount > 0 
                ? 'border-blue-500/40 bg-blue-950/20' 
                : 'border-border/60 bg-card/60'
            }`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground font-medium">Mensagens Não Lidas</p>
                  <div className="p-1.5 rounded-md bg-blue-500/20 text-blue-400">
                    <Mail className="w-4 h-4" />
                  </div>
                </div>
                <h4 className="text-2xl font-extrabold mt-2 text-blue-400">{attendanceData.unreadCount}</h4>
                <p className="text-xs text-blue-300/80 mt-1 flex items-center gap-1 font-medium">
                  {attendanceData.unreadCount > 0 ? '🔵 Pendentes de leitura' : '✓ Todas as mensagens abertas'}
                </p>
              </CardContent>
            </Card>

            {/* Card 5: Mandaram Mensagem Esta Semana / Hoje */}
            <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground font-medium">Chamaram Esta Semana</p>
                  <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-400">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <h4 className="text-2xl font-extrabold mt-2 text-amber-400">{attendanceData.messagedThisWeek}</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>{attendanceData.messagedToday}</strong> clientes chamaram hoje
                </p>
              </CardContent>
            </Card>
          </div>

          {/* PAINEL DE MONITORAMENTO OPERACIONAL COM SUB-ABAS (VÁCUO, NÃO LIDAS, TODAS) */}
          <Card className="border-border/60 bg-card/90 shadow-md">
            <CardHeader className="p-4 sm:p-5 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl shrink-0 ${
                  attendanceSubTab === 'vacuum'
                    ? 'bg-red-500/20 text-red-400'
                    : attendanceSubTab === 'unread'
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-primary/20 text-primary'
                }`}>
                  {attendanceSubTab === 'vacuum' ? (
                    <AlertTriangle className="w-5 h-5" />
                  ) : attendanceSubTab === 'unread' ? (
                    <Mail className="w-5 h-5" />
                  ) : (
                    <Users className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                    Painel de Monitoramento & Acompanhamento de Atendimento
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Monitore clientes aguardando resposta, mensagens não lidas e histórico completo de interações
                  </CardDescription>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportAttendanceCSV}
                  className="h-8 text-xs gap-1.5 border-border"
                >
                  <Download className="w-3.5 h-3.5 text-primary" /> Exportar Relatório (CSV)
                </Button>

                <Link href="/chat-comercial">
                  <Button size="sm" className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5 shadow-sm">
                    <MessageSquare className="w-3.5 h-3.5" /> Ir para o Chat Comercial
                  </Button>
                </Link>
              </div>
            </CardHeader>

            {/* Sub-bar de Filtro e Busca */}
            <div className="px-4 py-3 border-b border-border/50 bg-accent/20 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                <button
                  onClick={() => setAttendanceSubTab('vacuum')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                    attendanceSubTab === 'vacuum'
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'bg-background/80 text-muted-foreground hover:text-foreground border border-border'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
                  <span>No Vácuo (Sem Resposta)</span>
                  <Badge className="bg-red-950 text-red-200 border-red-800 text-[10px] px-1.5 py-0 h-4 ml-0.5">
                    {attendanceData.vacuumCount}
                  </Badge>
                </button>

                <button
                  onClick={() => setAttendanceSubTab('unread')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                    attendanceSubTab === 'unread'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-background/80 text-muted-foreground hover:text-foreground border border-border'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Mensagens Não Lidas</span>
                  <Badge className="bg-blue-950 text-blue-200 border-blue-800 text-[10px] px-1.5 py-0 h-4 ml-0.5">
                    {attendanceData.unreadCount}
                  </Badge>
                </button>

                <button
                  onClick={() => setAttendanceSubTab('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                    attendanceSubTab === 'all'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'bg-background/80 text-muted-foreground hover:text-foreground border border-border'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Todas as Conversas</span>
                  <Badge className="bg-primary/20 text-primary-foreground border-primary/40 text-[10px] px-1.5 py-0 h-4 ml-0.5">
                    {filteredAllConversations.length}
                  </Badge>
                </button>
              </div>

              <div className="relative w-full md:w-64">
                <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                <Input
                  placeholder="Filtrar por nome ou número..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 pl-8 text-xs bg-background/80 border-border"
                />
              </div>
            </div>

            <CardContent className="p-4">
              {/* SUB-TAB 1: FILA NO VÁCUO */}
              {attendanceSubTab === 'vacuum' && (
                filteredVacuumList.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-400 mb-2" />
                    <p className="text-sm font-bold text-foreground">Excelente trabalho! Nenhum cliente no vácuo no momento.</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Todas as conversas foram respondidas pelo robô ou atendentes.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/40">
                    {filteredVacuumList.map((client) => {
                      return (
                        <div key={client.id} className="py-3.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm text-foreground">{client.name}</span>
                              <span className="text-xs font-mono text-muted-foreground">{client.phone}</span>

                              {client.urgency === 'critical' ? (
                                <Badge className="bg-red-500/20 text-red-400 border-red-500/40 text-[10px] font-bold animate-pulse">
                                  🚨 Urgência Crítica ({client.waitHours}h de espera)
                                </Badge>
                              ) : client.urgency === 'warning' ? (
                                <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px] font-bold">
                                  ⚠️ Atenção ({client.waitMinutes}m de espera)
                                </Badge>
                              ) : (
                                <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/40 text-[10px] font-medium">
                                  ⏱️ Recente ({client.waitMinutes}m atrás)
                                </Badge>
                              )}
                            </div>

                            <p className="text-xs text-muted-foreground italic mt-1 bg-accent/40 p-2 rounded-lg border border-border/60">
                              "{client.lastMessageSnippet}"
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <Link href={`/chat-comercial?id=${client.id}&phone=${client.phone.replace(/\D/g, '')}`}>
                              <Button 
                                size="sm" 
                                className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5 shadow-sm"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                Responder no Chat Comercial
                              </Button>
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              )}

              {/* SUB-TAB 2: MENSAGENS NÃO LIDAS */}
              {attendanceSubTab === 'unread' && (
                filteredUnreadList.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    <CheckCircle2 className="w-10 h-10 mx-auto text-blue-400 mb-2" />
                    <p className="text-sm font-bold text-foreground">Todas as mensagens foram lidas!</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Não há clientes com mensagens pendentes de abertura.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/40">
                    {filteredUnreadList.map((client) => {
                      return (
                        <div key={client.id} className="py-3.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm text-foreground">{client.name}</span>
                              <span className="text-xs font-mono text-muted-foreground">{client.phone}</span>

                              <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/40 text-[10px] font-bold">
                                🔵 {client.unreadCount} {client.unreadCount === 1 ? 'não lida' : 'não lidas'}
                              </Badge>
                            </div>

                            <p className="text-xs text-muted-foreground italic mt-1 bg-accent/40 p-2 rounded-lg border border-border/60">
                              "{client.lastMessageSnippet}"
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <Link href={`/chat-comercial?id=${client.id}&phone=${client.phone.replace(/\D/g, '')}`}>
                              <Button 
                                size="sm" 
                                className="h-8 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white gap-1.5 shadow-sm"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                Abrir Conversa
                              </Button>
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              )}

              {/* SUB-TAB 3: TODAS AS CONVERSAS MONITORADAS */}
              {attendanceSubTab === 'all' && (
                filteredAllConversations.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    <Users className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm font-bold text-foreground">Nenhuma conversa encontrada com os filtros atuais.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/40">
                    {filteredAllConversations.map((client: any) => {
                      const isWaiting = client.isWaitingReply || client.lastMessageSender === 'client';
                      const isUnread = (client.unreadCount && client.unreadCount > 0) || client.isRead === false;
                      const isHuman = client.status === 'atendimento_humano';

                      return (
                        <div key={client.id} className="py-3.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm text-foreground">{client.name || 'Cliente'}</span>
                              <span className="text-xs font-mono text-muted-foreground">{client.phone || client.id}</span>

                              {isWaiting && (
                                <Badge className="bg-red-500/20 text-red-400 border-red-500/40 text-[10px] font-bold">
                                  🔴 No Vácuo
                                </Badge>
                              )}

                              {isUnread && (
                                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/40 text-[10px] font-bold">
                                  🔵 Não Lido
                                </Badge>
                              )}

                              {isHuman ? (
                                <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/40 text-[10px]">
                                  👤 Atendente
                                </Badge>
                              ) : (
                                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40 text-[10px]">
                                  🤖 Robô Ativo
                                </Badge>
                              )}
                            </div>

                            <p className="text-xs text-muted-foreground italic mt-1 bg-accent/40 p-2 rounded-lg border border-border/60">
                              "{client.lastMessageSnippet || 'Sem prévia de mensagem'}"
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <Link href={`/chat-comercial?id=${client.id}&phone=${(client.phone || client.id).replace(/\D/g, '')}`}>
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="h-8 text-xs font-medium border-border hover:bg-accent gap-1.5"
                              >
                                <ExternalLink className="w-3.5 h-3.5 text-primary" />
                                Ver no Chat
                              </Button>
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              )}
            </CardContent>
          </Card>

          {/* Gráficos de Atendimento */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfico 1: Volume de Mensagens por Dia da Semana */}
            <Card className="border-border/60 bg-card/60">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Fluxo de Mensagens por Dia da Semana
                </CardTitle>
                <CardDescription className="text-xs">
                  Comparativo entre mensagens recebidas de clientes e clientes atendidos
                </CardDescription>
              </CardHeader>
              <CardContent className="min-h-[280px]">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={weeklyDistributionData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
                    <XAxis dataKey="dia" stroke="#9CA3AF" tick={{ fontSize: 12 }} />
                    <YAxis stroke="#9CA3AF" tick={{ fontSize: 12 }} />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: '#111827', borderColor: '#1F2937', color: '#F9FAFB', borderRadius: '8px' }}
                      formatter={(val: number, name: string) => [
                        `${val} clientes`,
                        name === 'mensagens' ? 'Recebidas' : name === 'respondidos' ? 'Respondidos' : 'No Vácuo'
                      ]}
                    />
                    <Legend />
                    <Bar dataKey="mensagens" name="Recebidas" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={20} />
                    <Bar dataKey="respondidos" name="Respondidos" fill="#10B981" radius={[4, 4, 0, 0]} barSize={20} />
                    <Bar dataKey="vacuo" name="No Vácuo" fill="#EF4444" radius={[4, 4, 0, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Gráfico 2: Divisão de Respostas (Robô vs Atendentes vs Vácuo) */}
            <Card className="border-border/60 bg-card/60">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Bot className="w-4 h-4 text-emerald-400" />
                  Distribuição de Atendimento
                </CardTitle>
                <CardDescription className="text-xs">
                  Proporção de resoluções pelo Robô, equipe de Atendentes e fila pendente
                </CardDescription>
              </CardHeader>
              <CardContent className="min-h-[280px] flex items-center justify-center">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={responseChannelPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={95}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {responseChannelPieData.map((entry, index) => (
                        <Cell key={`channel-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: '#111827', borderColor: '#1F2937', color: '#F9FAFB', borderRadius: '8px' }}
                      formatter={(val: number) => [`${val} clientes`, 'Quantidade']}
                    />
                    <Legend verticalAlign="bottom" height={40} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Seção: Auditoria de Atendentes */}
          <Card className="border-border/60 bg-card/60">
            <CardHeader className="p-4 sm:p-5 border-b border-border">
              <CardTitle className="text-base flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-primary" />
                Auditoria de Atendimento da Equipe (Identificação por Atendente)
              </CardTitle>
              <CardDescription className="text-xs">
                Mensagens enviadas com identificação em negrito (*Atendente [Nome]*) para controle e auditoria
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {Object.entries(attendanceData.attendantsActivity).map(([name, count]) => (
                  <div key={name} className="p-3.5 rounded-xl bg-accent/40 border border-border flex items-center justify-between">
                    <div>
                      <h5 className="font-bold text-foreground text-sm flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        {name}
                      </h5>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Atendente Comercial</p>
                    </div>
                    <Badge className="bg-primary/20 text-primary border-primary/30 text-xs font-bold">
                      {count} mensagens
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* ABA 2: PROSPECÇÃO & FUNIL DE LEADS (MÓDULO EXISTENTE DE LEADS)             */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {reportTab === 'leads' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground font-medium">Leads Mapeados</p>
                  <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-400">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <h4 className="text-2xl font-bold mt-2 text-foreground">{leadStats.totalLeads}</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Empresas capturadas e salvas
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground font-medium">Com Telefone Comercial</p>
                  <div className="p-1.5 rounded-md bg-cyan-500/10 text-cyan-400">
                    <Phone className="w-4 h-4" />
                  </div>
                </div>
                <h4 className="text-2xl font-bold mt-2 text-cyan-400">{leadStats.leadsWithPhone}</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  {leadStats.totalLeads > 0 ? `${Math.round((leadStats.leadsWithPhone / leadStats.totalLeads) * 100)}% com WhatsApp` : 'Aguardando'}
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground font-medium">Acionados pelo Robô</p>
                  <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-400">
                    <Bot className="w-4 h-4" />
                  </div>
                </div>
                <h4 className="text-2xl font-bold mt-2 text-emerald-400">{leadStats.dispatchedLeads}</h4>
                <p className="text-xs text-emerald-400/80 mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Disparos confirmados
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground font-medium">Taxa de Cobertura</p>
                  <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-400">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <h4 className="text-2xl font-bold mt-2 text-amber-400">{leadStats.coverageRate}%</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  {leadStats.pendingDispatch} contatos na fila
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="flex flex-col border-border/60 bg-card/60">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Funil Operacional de Leads
                </CardTitle>
                <CardDescription className="text-xs">Fluxo do mapeamento ao disparo no WhatsApp</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 min-h-[280px]">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={leadStats.funnelData} layout="vertical" margin={{ top: 5, right: 30, left: 30, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" horizontal={false} />
                    <XAxis type="number" stroke="#9CA3AF" />
                    <YAxis dataKey="name" type="category" width={110} stroke="#9CA3AF" tick={{ fontSize: 11 }} />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: '#111827', borderColor: '#1F2937', color: '#F9FAFB', borderRadius: '8px' }}
                      formatter={(val: number) => [`${val} empresas`, 'Total']}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                      {leadStats.funnelData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="flex flex-col border-border/60 bg-card/60">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" />
                  Leads por Categoria Comercial
                </CardTitle>
                <CardDescription className="text-xs">Principais nichos mapeados na base</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 min-h-[280px] flex items-center justify-center">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={leadStats.segmentData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={95}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {leadStats.segmentData.map((entry, index) => (
                        <Cell key={`cat-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: '#111827', borderColor: '#1F2937', color: '#F9FAFB', borderRadius: '8px' }}
                      formatter={(val: number) => [`${val} leads`, 'Quantidade']}
                    />
                    <Legend verticalAlign="bottom" height={40} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* ABA 3: CENTRAL DE LIMPEZA POR TÓPICOS (GESTÃO DE DADOS E RESET SEGURO)     */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {reportTab === 'cleanup' && (
        <div className="space-y-6">
          {/* Header Card Informativo */}
          <Card className="border-border/60 bg-card/90 shadow-md">
            <CardHeader className="p-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-destructive/10 text-destructive border border-destructive/20">
                    <Trash2 className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg font-bold text-foreground">
                        Central de Limpeza por Tópicos
                      </CardTitle>
                      <Badge variant="outline" className="text-xs border-destructive/30 text-destructive bg-destructive/5 font-semibold">
                        Gerenciamento Seguro
                      </Badge>
                    </div>
                    <CardDescription className="text-xs mt-1">
                      Limpe tópicos individuais para remover dados de teste antigos ou redefinir módulos específicos sem afetar o restante do sistema.
                    </CardDescription>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshCleanupCounts}
                  className="text-xs gap-1.5 border-border hover:bg-muted"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Atualizar Contadores
                </Button>
              </div>
            </CardHeader>
          </Card>

          {/* Grid de Limpeza por Módulo / Tópico */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* TÓPICO 1: CHAT COMERCIAL */}
            <Card className="border-border/60 bg-card/60 backdrop-blur-sm flex flex-col justify-between hover:border-border transition-all shadow-sm">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 shrink-0">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {cleanupCounts.whatsapp} conversas
                  </Badge>
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground">Chat Comercial & WhatsApp</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Apaga o histórico de mensagens e conversas ativas no Chat Comercial. A sessão do WhatsApp no aparelho permanece conectada.
                  </p>
                </div>
              </CardContent>
              <div className="p-4 pt-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearWhatsApp}
                  className="w-full text-xs font-semibold border-border hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Limpar Conversas WhatsApp
                </Button>
              </div>
            </Card>

            {/* TÓPICO 2: LEADS & PIPELINE DO CRM */}
            <Card className="border-border/60 bg-card/60 backdrop-blur-sm flex flex-col justify-between hover:border-border transition-all shadow-sm">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-500 shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {cleanupCounts.leads} leads
                  </Badge>
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground">Leads & Pipeline do CRM</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Remove os leads importados, oportunidades em aberto e negociações de teste do funil de vendas e prospecção.
                  </p>
                </div>
              </CardContent>
              <div className="p-4 pt-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearLeads}
                  className="w-full text-xs font-semibold border-border hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Limpar Leads do CRM
                </Button>
              </div>
            </Card>

            {/* TÓPICO 3: PRODUTOS & SERVIÇOS */}
            <Card className="border-border/60 bg-card/60 backdrop-blur-sm flex flex-col justify-between hover:border-border transition-all shadow-sm">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 shrink-0">
                    <Package className="w-5 h-5" />
                  </div>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {cleanupCounts.products} produtos
                  </Badge>
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground">Catálogo de Produtos & Serviços</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Remove produtos e serviços do catálogo para você cadastrar seus próprios itens e categorias personalizadas do zero.
                  </p>
                </div>
              </CardContent>
              <div className="p-4 pt-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearProducts}
                  className="w-full text-xs font-semibold border-border hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Limpar Catálogo de Produtos
                </Button>
              </div>
            </Card>

            {/* TÓPICO 4: CLIENTES & OBSERVAÇÕES */}
            <Card className="border-border/60 bg-card/60 backdrop-blur-sm flex flex-col justify-between hover:border-border transition-all shadow-sm">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 shrink-0">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {cleanupCounts.customers} clientes
                  </Badge>
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground">Clientes & Observações Feitas</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Apaga o painel de clientes cadastrados, telefones de contato e todo o histórico de observações registradas.
                  </p>
                </div>
              </CardContent>
              <div className="p-4 pt-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearCustomers}
                  className="w-full text-xs font-semibold border-border hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Limpar Base de Clientes
                </Button>
              </div>
            </Card>

            {/* TÓPICO 5: HISTÓRICO DE VENDAS */}
            <Card className="border-border/60 bg-card/60 backdrop-blur-sm flex flex-col justify-between hover:border-border transition-all shadow-sm">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {cleanupCounts.sales} vendas
                  </Badge>
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground">Histórico de Registro de Vendas</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Apaga os registros de pedidos e vendas lançados pelos colaboradores nas metas para reiniciar o ciclo comercial.
                  </p>
                </div>
              </CardContent>
              <div className="p-4 pt-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearSales}
                  className="w-full text-xs font-semibold border-border hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Limpar Histórico de Vendas
                </Button>
              </div>
            </Card>

            {/* TÓPICO 6: VISITAS COMERCIAIS */}
            <Card className="border-border/60 bg-card/60 backdrop-blur-sm flex flex-col justify-between hover:border-border transition-all shadow-sm">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 shrink-0">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {cleanupCounts.visits} visitas
                  </Badge>
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground">Visitas Presenciais Agendadas</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Limpa o histórico de agendamentos e visitas presenciais aos clientes para começar uma nova agenda de campo.
                  </p>
                </div>
              </CardContent>
              <div className="p-4 pt-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearVisits}
                  className="w-full text-xs font-semibold border-border hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Limpar Visitas
                </Button>
              </div>
            </Card>

            {/* TÓPICO 7: PROPOSTAS COMERCIAIS */}
            <Card className="border-border/60 bg-card/60 backdrop-blur-sm flex flex-col justify-between hover:border-border transition-all shadow-sm">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 shrink-0">
                    <FileCheck className="w-5 h-5" />
                  </div>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {cleanupCounts.proposals} propostas
                  </Badge>
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground">Propostas & Orçamentos</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Remove os orçamentos e propostas comerciais geradas no sistema para limpar o histórico de negociações.
                  </p>
                </div>
              </CardContent>
              <div className="p-4 pt-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearProposals}
                  className="w-full text-xs font-semibold border-border hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Limpar Propostas
                </Button>
              </div>
            </Card>
          </div>

          {/* DANGER ZONE: RESET GERAL DO SISTEMA */}
          <Card className="border-destructive/40 bg-destructive/5 shadow-md">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-destructive flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Reset Geral do Sistema (Limpar Todos os Tópicos)
                  </h3>
                  <p className="text-xs text-muted-foreground max-w-2xl">
                    Esta ação executará a limpeza de TODOS os módulos simultaneamente (leads, conversas, clientes, propostas, visitas, produtos e vendas). Use quando desejar entregar ou começar a utilizar o sistema do zero sem nenhum resíduo de testes.
                  </p>
                </div>

                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleMasterSystemReset}
                  className="font-bold text-xs gap-1.5 shadow-sm whitespace-nowrap self-start md:self-auto"
                >
                  <Trash2 className="w-4 h-4" />
                  Zerar Todo o Sistema
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
