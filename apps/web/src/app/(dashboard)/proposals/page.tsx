'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Plus, 
  Search, 
  FileText, 
  Printer, 
  Send, 
  Copy, 
  CheckCircle2, 
  ShieldCheck, 
  DollarSign, 
  Sparkles, 
  Globe, 
  Cpu, 
  Layers, 
  Wrench,
  X,
  Check
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';

export interface ProposalItem {
  id: string;
  client: string;
  clientPhone?: string;
  clientContact?: string;
  title: string;
  category: 'site' | 'software' | 'automation' | 'support';
  total: number;
  pixDiscountPercent: number;
  installmentsCount: number;
  monthly: number;
  status: 'Criada' | 'Enviada' | 'Visualizada' | 'Negociação' | 'Aceita' | 'Recusada';
  statusColor: string;
  date: string;
  validUntil: string;
  deadline: string;
  seller: string;
  scope: string[];
  notes?: string;
}

const CATEGORY_DEFAULT_SCOPES: Record<string, { label: string; icon: any; scope: string[] }> = {
  site: {
    label: 'Criação de Site & Presença Digital',
    icon: Globe,
    scope: [
      'Design Exclusivo, Moderno e 100% Responsivo (Celular, Tablet e Computador)',
      'Otimização Completa para o Google (SEO Local e Carregamento Ultrarrápido)',
      'Botões de Ação Direta para Conversão de Clientes via WhatsApp',
      'Painel Administrativo Simplificado para Gerenciamento de Conteúdo e Fotos',
      'Configuração de Domínio Personalizado e Certificado de Segurança SSL (HTTPS)'
    ]
  },
  software: {
    label: 'Sistema / Software Sob Medida',
    icon: Cpu,
    scope: [
      'Desenvolvimento de Módulos Personalizados de Controle e Gestão',
      'Painel Dashboard com Métricas, Gráficos e Relatórios de Vendas',
      'Níveis de Acesso e Permissões Seguras para Usuários e Colaboradores',
      'Backup Automático em Nuvem e Proteção Criptográfica de Dados',
      'Treinamento Operacional Completo da Equipe e Manual de Uso'
    ]
  },
  automation: {
    label: 'Automação Comercial & Robô WhatsApp',
    icon: Layers,
    scope: [
      'Configuração de Atendente Virtual Inteligente 24/7 sem Deixar Clientes Esperando',
      'Triagem Automática de Dúvidas, Preços e Encaminhamento para Atendente Humano',
      'Integração de Notificações em Tempo Real de Novos Pedidos / Leads',
      'Blindagem Anti-Bloqueio com Motor de Variação de Textos e Intervalo Humano',
      'Relatórios Periódicos de Atendimentos e Taxa de Conversão de Clientes'
    ]
  },
  support: {
    label: 'Manutenção, Suporte & Redes',
    icon: Wrench,
    scope: [
      'Diagnóstico Preventivo Completo de Computadores e Servidores',
      'Otimização de Desempenho e Eliminação de Lentidão ou Travamentos',
      'Estruturação de Rede Cabeada, Wi-Fi Comercial e Segurança de Dados',
      'Atendimento Ágil com Chamados Presenciais e Suporte Remoto Imediato',
      'Tabela Diferenciada para Reposição de Peças e Upgrades'
    ]
  }
};

const INITIAL_PROPOSALS: ProposalItem[] = typeof window !== 'undefined' && localStorage.getItem('system_reset') === 'true' ? [] : [
  {
    id: 'PROP-2026-001',
    client: 'Panificadora & Confeitaria Conde',
    clientPhone: '92981234567',
    clientContact: 'Roberto Conde (Diretor)',
    title: 'Site Institucional + Cardápio Digital + Automação WhatsApp',
    category: 'site',
    total: 2800,
    pixDiscountPercent: 5,
    installmentsCount: 10,
    monthly: 150,
    status: 'Negociação',
    statusColor: 'warning',
    date: '08/09/2026',
    validUntil: '23/09/2026',
    deadline: '8 a 12 dias úteis',
    seller: 'Weverton (WCTech)',
    scope: [
      'Site Profissional com Cardápio Online Interativo e Fotos em Alta Resolução',
      'Integração Direta com Pedidos via WhatsApp para Reduzir Erros da Equipe',
      'Otimização para Busca do Google "Padaria em Manaus / Pão Quente"',
      'Certificado de Segurança SSL e Hospedagem em Alta Velocidade',
      'Garantia Técnica de 90 Dias e Suporte Humanizado'
    ],
    notes: 'Cliente solicitou inclusão de botão para encomendas de tortas e bolos com 24h de antecedência.'
  },
  {
    id: 'PROP-2026-002',
    client: 'Centro Automotivo Imperial',
    clientPhone: '92992345678',
    clientContact: 'Marcos Imperial',
    title: 'Sistema de Orçamentos, OS & Histórico de Clientes',
    category: 'software',
    total: 4500,
    pixDiscountPercent: 5,
    installmentsCount: 12,
    monthly: 220,
    status: 'Enviada',
    statusColor: 'primary',
    date: '09/09/2026',
    validUntil: '24/09/2026',
    deadline: '15 dias úteis',
    seller: 'Weverton (WCTech)',
    scope: [
      'Controle de Ordens de Serviço (OS) com Envio Automático em PDF no WhatsApp do Cliente',
      'Cadastro de Clientes, Placas de Veículos e Histórico Completo de Revisões',
      'Módulo de Caixa, Emissão de Recibos e Controle Financeiro Simples',
      'Painel no Celular para Acompanhar o Faturamento em Tempo Real',
      'Treinamento Presencial da Equipe de Balcão e Oficina'
    ]
  },
  {
    id: 'PROP-2026-003',
    client: 'Clínica OdontoPrime Manaus',
    clientPhone: '92984567890',
    clientContact: 'Dra. Vanessa Lins',
    title: 'Robô de Confirmação de Consultas & Captação no WhatsApp',
    category: 'automation',
    total: 1900,
    pixDiscountPercent: 5,
    installmentsCount: 6,
    monthly: 180,
    status: 'Aceita',
    statusColor: 'success',
    date: '05/09/2026',
    validUntil: '20/09/2026',
    deadline: '5 dias úteis',
    seller: 'Weverton (WCTech)',
    scope: [
      'Robô Automático de Disparo de Lembretes de Consulta 24h antes para Reduzir Faltas',
      'Menu de Autoatendimento com Informações de Convênios, Endereço e Horários',
      'Transferência Imediata para Atendente Humano em Casos de Emergência Dental',
      'Integração Completa sem Trocar o Número de WhatsApp da Clínica',
      'Suporte Prioritário e Relatório Mensal de Consultas Confirmadas'
    ]
  }
];

export default function ProposalsPage() {
  const [proposals, setProposals] = useState<ProposalItem[]>(INITIAL_PROPOSALS);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Estados dos Modais
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeOnePager, setActiveOnePager] = useState<ProposalItem | null>(null);

  // Fechar modais ao pressionar tecla ESC
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveOnePager(null);
        setIsCreateModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Formulário Nova Proposta
  const [formClient, setFormClient] = useState('');
  const [formClientPhone, setFormClientPhone] = useState('');
  const [formClientContact, setFormClientContact] = useState('');
  const [formCategory, setFormCategory] = useState<'site' | 'software' | 'automation' | 'support'>('site');
  const [formTitle, setFormTitle] = useState('Criação de Site Profissional & Otimização Google');
  const [formTotal, setFormTotal] = useState('2500');
  const [formMonthly, setFormMonthly] = useState('120');
  const [formDeadline, setFormDeadline] = useState('7 a 10 dias úteis');
  const [formScope, setFormScope] = useState<string[]>(CATEGORY_DEFAULT_SCOPES.site.scope);
  const [newScopeInput, setNewScopeInput] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Ao mudar de categoria no modal, preenche título e escopo sugeridos
  const handleCategoryChange = (cat: 'site' | 'software' | 'automation' | 'support') => {
    setFormCategory(cat);
    const defaults = CATEGORY_DEFAULT_SCOPES[cat];
    setFormScope(defaults.scope);
    if (cat === 'site') {
      setFormTitle('Criação de Site Profissional & Otimização Google');
      setFormTotal('2500');
      setFormMonthly('120');
    } else if (cat === 'software') {
      setFormTitle('Desenvolvimento de Sistema de Gestão Sob Medida');
      setFormTotal('4200');
      setFormMonthly('200');
    } else if (cat === 'automation') {
      setFormTitle('Automação de Atendimento & Robô Comercial WhatsApp');
      setFormTotal('1800');
      setFormMonthly('150');
    } else if (cat === 'support') {
      setFormTitle('Contrato Mensal de Suporte Técnico & Infraestrutura');
      setFormTotal('0');
      setFormMonthly('850');
    }
  };

  const handleToggleScopeItem = (index: number) => {
    setFormScope(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleAddScopeItem = () => {
    const val = newScopeInput.trim();
    if (!val) return;
    setFormScope(prev => [...prev, val]);
    setNewScopeInput('');
  };

  const handleSaveProposal = () => {
    if (!formClient.trim() || !formTitle.trim()) {
      toast.error('Preencha o nome do cliente e o título do projeto!');
      return;
    }

    const totalNum = Number(formTotal) || 0;
    const monthlyNum = Number(formMonthly) || 0;

    const today = new Date();
    const validDate = new Date(today.getTime() + 15 * 24 * 60 * 60 * 1000);

    const newProp: ProposalItem = {
      id: `PROP-2026-${String(proposals.length + 1).padStart(3, '0')}`,
      client: formClient.trim(),
      clientPhone: formClientPhone.trim(),
      clientContact: formClientContact.trim() || formClient.trim(),
      title: formTitle.trim(),
      category: formCategory,
      total: totalNum,
      pixDiscountPercent: 5,
      installmentsCount: totalNum > 3000 ? 12 : 10,
      monthly: monthlyNum,
      status: 'Criada',
      statusColor: 'outline',
      date: today.toLocaleDateString('pt-BR'),
      validUntil: validDate.toLocaleDateString('pt-BR'),
      deadline: formDeadline.trim() || '7 a 10 dias úteis',
      seller: 'Weverton (WCTech)',
      scope: formScope.length > 0 ? formScope : CATEGORY_DEFAULT_SCOPES[formCategory].scope,
      notes: formNotes.trim() || undefined
    };

    setProposals([newProp, ...proposals]);
    setIsCreateModalOpen(false);
    setActiveOnePager(newProp);
    toast.success('Proposta One-Pager gerada com sucesso!');
  };

  // Filtragem de propostas
  const filteredProposals = proposals.filter(p => {
    const matchesSearch = 
      p.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Disparo de impressão rápida (One-Pager em A4)
  const handlePrintOnePager = () => {
    window.print();
  };

  // Enviar proposta formatada diretamente no WhatsApp
  const handleSendViaWhatsApp = (prop: ProposalItem) => {
    const rawPhone = (prop.clientPhone || '').replace(/\D/g, '');
    const cleanPhone = rawPhone.length === 10 || rawPhone.length === 11 ? `55${rawPhone}` : rawPhone;

    const pixTotal = prop.total * (1 - prop.pixDiscountPercent / 100);

    const message = 
      `Olá *${prop.clientContact || prop.client}*! Tudo bem?\n\n` +
      `Aqui é o Weverton da *WCTech Soluções em Tecnologia*.\n\n` +
      `Conforme conversamos, elaborei a proposta comercial para o seu projeto:\n` +
      `📄 *Proposta:* ${prop.title} (${prop.id})\n` +
      `⏱️ *Prazo de Entrega:* ${prop.deadline}\n\n` +
      `💰 *Investimento:* ${formatCurrency(prop.total)} em até ${prop.installmentsCount}x sem juros\n` +
      `⚡ *À vista no PIX (${prop.pixDiscountPercent}% de desconto):* ${formatCurrency(pixTotal)}\n` +
      (prop.monthly > 0 ? `🛠️ *Manutenção/Suporte Mensal:* ${formatCurrency(prop.monthly)}/mês\n\n` : '\n') +
      `🛡️ *Garantia:* 90 dias com suporte prioritário incluso.\n\n` +
      `Você pode conferir nossos projetos recentes no site oficial: https://wctech.web.app/\n\n` +
      `Podemos formalizar o início do projeto?`;

    const encoded = encodeURIComponent(message);
    const waUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(waUrl, '_blank');
    toast.success('Proposta enviada para o WhatsApp!');
  };

  // Copiar resumo
  const handleCopyProposalText = (prop: ProposalItem) => {
    const pixTotal = prop.total * (1 - prop.pixDiscountPercent / 100);
    const text = 
      `PROPOSTA COMERCIAL WCTECH — ${prop.id}\n` +
      `Cliente: ${prop.client}\n` +
      `Projeto: ${prop.title}\n` +
      `Valor: ${formatCurrency(prop.total)} (À vista PIX: ${formatCurrency(pixTotal)})\n` +
      `Prazo: ${prop.deadline}\n` +
      `Site: https://wctech.web.app/`;
    navigator.clipboard.writeText(text);
    toast.success('Resumo da proposta copiado para a área de transferência!');
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Estilos específicos de impressão para garantir encaixe perfeito em 1 Página A4 */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #one-pager-printable, #one-pager-printable * {
            visibility: visible;
          }
          #one-pager-printable {
            position: fixed;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background: #ffffff !important;
            color: #0f172a !important;
            padding: 12mm !important;
            box-sizing: border-box !important;
            font-size: 11px !important;
          }
          .no-print {
            display: none !important;
          }
          .print-border {
            border-color: #cbd5e1 !important;
          }
          .print-bg-subtle {
            background-color: #f8fafc !important;
          }
          .print-text-dark {
            color: #0f172a !important;
          }
          .print-text-muted {
            color: #475569 !important;
          }
        }
      `}</style>

      {/* Header Principal */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" />
            Propostas Comerciais (One-Pager)
          </h1>
          <p className="text-muted-foreground text-sm">
            Gere propostas de alta conversão em 1 página PDF com envio direto para o WhatsApp do cliente
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm">
          <Plus className="w-4 h-4 mr-2" />
          Nova Proposta Comercial
        </Button>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col md:flex-row gap-3 bg-card p-3 rounded-xl border border-border items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por cliente, código ou escopo..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 bg-background w-full" 
          />
        </div>
        
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
          <select 
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs font-semibold shadow-sm"
          >
            <option value="all">Todas as Categorias</option>
            <option value="site">🌐 Sites & Presença Digital</option>
            <option value="software">💻 Sistemas & Softwares</option>
            <option value="automation">⚙️ Automação & Robô WhatsApp</option>
            <option value="support">🛠️ Manutenção & Suporte</option>
          </select>

          <select 
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs font-semibold shadow-sm"
          >
            <option value="all">Todos os Status</option>
            <option value="Criada">Criada</option>
            <option value="Enviada">Enviada</option>
            <option value="Visualizada">Visualizada</option>
            <option value="Negociação">Negociação</option>
            <option value="Aceita">Aceita</option>
            <option value="Recusada">Recusada</option>
          </select>
        </div>
      </div>

      {/* Tabela de Propostas */}
      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-accent/50 text-muted-foreground">
              <tr>
                <th className="px-6 py-4">Código</th>
                <th className="px-6 py-4">Cliente & Projeto</th>
                <th className="px-6 py-4">Categoria</th>
                <th className="px-6 py-4">Valor Total</th>
                <th className="px-6 py-4">Mensalidade</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4">Validade</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredProposals.map((prop) => {
                const CatMeta = CATEGORY_DEFAULT_SCOPES[prop.category] || CATEGORY_DEFAULT_SCOPES.site;
                const CatIcon = CatMeta.icon;

                return (
                  <tr key={prop.id} className="border-b border-border hover:bg-cardHover transition-colors">
                    <td className="px-6 py-4 font-mono text-xs font-bold text-primary">{prop.id}</td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-foreground hover:underline cursor-pointer" onClick={() => setActiveOnePager(prop)}>
                        {prop.client}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">{prop.title}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <CatIcon className="w-3.5 h-3.5 text-primary" />
                        <span>{CatMeta.label.split('&')[0].trim()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-emerald-400">
                      {prop.total > 0 ? formatCurrency(prop.total) : 'Sob Consulta'}
                    </td>
                    <td className="px-6 py-4 font-medium text-muted-foreground">
                      {prop.monthly > 0 ? `${formatCurrency(prop.monthly)}/mês` : '—'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Badge variant={prop.statusColor as any} className="text-xs py-0.5">
                        {prop.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-xs text-muted-foreground">{prop.validUntil}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center gap-2 justify-end">
                        {/* Ver Documento One-Pager */}
                        <Button 
                          onClick={() => setActiveOnePager(prop)} 
                          size="sm"
                          className="h-8 px-2.5 text-xs bg-primary/15 hover:bg-primary/25 text-primary border border-primary/30 font-semibold"
                          title="Visualizar Proposta em 1 Página PDF"
                        >
                          <FileText className="w-3.5 h-3.5 mr-1" />
                          One-Pager
                        </Button>

                        {/* Enviar no WhatsApp */}
                        <Button 
                          onClick={() => handleSendViaWhatsApp(prop)} 
                          size="sm"
                          className="h-8 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                          title="Enviar proposta pronta para o WhatsApp do cliente"
                        >
                          <Send className="w-3.5 h-3.5 mr-1" />
                          WhatsApp
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground bg-accent/30">
          <span>Total de {filteredProposals.length} propostas registradas</span>
          <span>Modelo de proposta padronizado pela WCTech</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL / VISUALIZADOR ONE-PAGER DE 1 PÁGINA (IMPRIMÍVEL EM PDF A4) */}
      {/* ========================================================================= */}
      {activeOnePager && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setActiveOnePager(null); }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-card w-full max-w-3xl rounded-2xl border border-border shadow-2xl overflow-hidden my-6 flex flex-col cursor-default"
          >
            {/* Barra Superior de Ações (Oculta na Impressão) */}
            <div className="p-4 bg-accent/40 border-b border-border flex flex-wrap items-center justify-between gap-3 no-print">
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs font-mono font-bold">
                  {activeOnePager.id}
                </Badge>
                <span className="text-sm font-semibold text-foreground truncate max-w-xs">
                  {activeOnePager.client}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button 
                  onClick={handlePrintOnePager}
                  size="sm" 
                  className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold h-8"
                  title="Gera o PDF de 1 página perfeitamente formatada em formato A4"
                >
                  <Printer className="w-3.5 h-3.5 mr-1.5" />
                  Imprimir / PDF
                </Button>

                <Button 
                  onClick={() => handleSendViaWhatsApp(activeOnePager)}
                  size="sm" 
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold h-8"
                >
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  WhatsApp
                </Button>

                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleCopyProposalText(activeOnePager)}
                  className="text-xs h-8"
                  title="Copiar texto de resumo"
                >
                  <Copy className="w-3.5 h-3.5 mr-1" />
                  Copiar
                </Button>

                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={() => setActiveOnePager(null)}
                  className="h-8 px-3 text-xs font-bold gap-1 bg-red-600 hover:bg-red-700 text-white shadow-sm"
                  title="Fechar Visualização (ESC)"
                >
                  <X className="w-4 h-4" />
                  <span>Fechar (ESC)</span>
                </Button>
              </div>
            </div>

            {/* CORPO DO DOCUMENTO ONE-PAGER (Elemento Impresso com id: one-pager-printable) */}
            <div id="one-pager-printable" className="p-8 bg-card text-foreground space-y-6">
              {/* Cabeçalho da Proposta */}
              <div className="flex justify-between items-start border-b border-border pb-6 print-border">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center font-black text-primary text-base">
                      WC
                    </div>
                    <div>
                      <h2 className="text-xl font-black tracking-tight text-foreground print-text-dark">WCTech Soluções</h2>
                      <p className="text-xs text-muted-foreground print-text-muted">Tecnologia, Desenvolvimento Web & Automação</p>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-muted-foreground space-y-0.5 print-text-muted">
                    <p>🌐 <strong>wctech.web.app</strong> • 📱 (92) 98108-7241</p>
                    <p>Manaus - Amazonas • Atendimento para todo o Brasil</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary">Proposta Comercial</span>
                  <p className="text-xl font-mono font-black text-foreground print-text-dark">{activeOnePager.id}</p>
                  <div className="mt-2 text-xs text-muted-foreground space-y-0.5 print-text-muted">
                    <p>Data de Emissão: <strong>{activeOnePager.date}</strong></p>
                    <p>Válida até: <strong>{activeOnePager.validUntil}</strong></p>
                  </div>
                </div>
              </div>

              {/* Informações do Cliente & Projeto */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-accent/20 border border-border print-bg-subtle print-border">
                <div>
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider print-text-muted">Apresentado Para:</span>
                  <h3 className="text-base font-bold text-foreground mt-0.5 print-text-dark">{activeOnePager.client}</h3>
                  <p className="text-xs text-muted-foreground print-text-muted">Aos cuidados de: <strong>{activeOnePager.clientContact || 'Responsável'}</strong></p>
                  {activeOnePager.clientPhone && (
                    <p className="text-xs text-muted-foreground print-text-muted">WhatsApp: {activeOnePager.clientPhone}</p>
                  )}
                </div>

                <div>
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider print-text-muted">Projeto Proposto:</span>
                  <h3 className="text-base font-bold text-primary mt-0.5 print-text-dark">{activeOnePager.title}</h3>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground print-text-muted">
                    <span>Prazo de Entrega: <strong>{activeOnePager.deadline}</strong></span>
                    <span>•</span>
                    <span>Consultor: <strong>{activeOnePager.seller}</strong></span>
                  </div>
                </div>
              </div>

              {/* Escopo de Entregáveis */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold uppercase tracking-wide text-foreground flex items-center gap-1.5 print-text-dark">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Escopo Detalhado & Entregáveis
                  </h4>
                  <span className="text-xs text-muted-foreground print-text-muted">Incluso na Proposta</span>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  {activeOnePager.scope.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-background/60 border border-border/80 print-bg-subtle print-border text-xs">
                      <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3 h-3" />
                      </div>
                      <span className="text-foreground/90 font-medium print-text-dark">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tabela de Investimento & Condições de Pagamento */}
              <div className="p-5 rounded-xl bg-accent/30 border border-border space-y-4 print-bg-subtle print-border">
                <h4 className="text-sm font-bold uppercase tracking-wide text-foreground flex items-center gap-1.5 print-text-dark">
                  <DollarSign className="w-4 h-4 text-primary" />
                  Investimento & Condições Comerciais
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* À Vista com Desconto PIX */}
                  <div className="p-3.5 rounded-lg bg-background border border-emerald-500/40 print-border">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">À Vista no PIX ({activeOnePager.pixDiscountPercent}% OFF)</span>
                    <p className="text-xl font-black text-emerald-400 mt-1">
                      {formatCurrency(activeOnePager.total * (1 - activeOnePager.pixDiscountPercent / 100))}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 print-text-muted">Pagamento na aprovação / início</p>
                  </div>

                  {/* Parcelado no Cartão */}
                  <div className="p-3.5 rounded-lg bg-background border border-border print-border">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider print-text-muted">Parcelado sem Juros</span>
                    <p className="text-xl font-black text-foreground mt-1 print-text-dark">
                      {activeOnePager.installmentsCount}x de {formatCurrency(activeOnePager.total / activeOnePager.installmentsCount)}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 print-text-muted">Total: {formatCurrency(activeOnePager.total)}</p>
                  </div>

                  {/* Mensalidade / Manutenção */}
                  <div className="p-3.5 rounded-lg bg-background border border-border print-border">
                    <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Suporte & Manutenção</span>
                    <p className="text-xl font-black text-primary mt-1 print-text-dark">
                      {activeOnePager.monthly > 0 ? `${formatCurrency(activeOnePager.monthly)}/mês` : 'Incluso no Setup'}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 print-text-muted">
                      {activeOnePager.monthly > 0 ? 'Sem fidelidade contratual' : 'Garantia de 90 dias'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Termos de Garantia e Aceite */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-border print-border text-xs text-muted-foreground print-text-muted">
                <div className="space-y-1">
                  <h5 className="font-bold text-foreground flex items-center gap-1.5 print-text-dark">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Garantia Técnica e Suporte WCTech
                  </h5>
                  <p>• Garantia completa de 90 dias para correções e ajustes sem custo adicional.</p>
                  <p>• Treinamento e suporte direto com nossa equipe pelo WhatsApp.</p>
                </div>

                <div className="text-right flex flex-col justify-end">
                  <p className="font-semibold text-foreground print-text-dark">Aprovação e Início Imediato:</p>
                  <p className="text-emerald-400 font-bold">📲 Responda "Proposta Aceita" pelo WhatsApp</p>
                  <p className="text-[11px]">WCTech Soluções • Atendimento Especializado</p>
                </div>
              </div>
            </div>

            {/* Barra Inferior Fixa de Ações (Oculta na Impressão) */}
            <div className="p-4 bg-accent/40 border-t border-border flex flex-wrap items-center justify-between gap-3 no-print">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <FileText className="w-4 h-4 text-primary" />
                <span>Proposta comercial pronta para envio ou download em PDF</span>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setActiveOnePager(null)}
                  className="text-xs h-9 px-4 font-bold border-border hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-colors gap-1.5"
                >
                  <X className="w-4 h-4" />
                  <span>Fechar Proposta</span>
                </Button>
                <Button 
                  onClick={handlePrintOnePager}
                  size="sm" 
                  className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold h-9 gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir / PDF</span>
                </Button>
                <Button 
                  onClick={() => handleSendViaWhatsApp(activeOnePager)}
                  size="sm" 
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold h-9 gap-1.5"
                >
                  <Send className="w-4 h-4" />
                  <span>Enviar no WhatsApp</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DE CRIAÇÃO DE NOVA PROPOSTA COMERCIAL */}
      {/* ========================================================================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-card w-full max-w-xl rounded-2xl border border-border shadow-2xl p-6 space-y-4 my-6">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Gerar Nova Proposta Comercial (One-Pager)
                </h2>
                <p className="text-xs text-muted-foreground">Preencha os dados para gerar o documento PDF de 1 página automaticamente</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsCreateModalOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Seleção Rápida de Categoria */}
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase">Categoria do Serviço</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1.5">
                {(['site', 'software', 'automation', 'support'] as const).map(cat => {
                  const isSelected = formCategory === cat;
                  const meta = CATEGORY_DEFAULT_SCOPES[cat];
                  const Icon = meta.icon;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => handleCategoryChange(cat)}
                      className={`p-2.5 rounded-xl border text-left transition-all flex flex-col items-center text-center gap-1.5 ${
                        isSelected 
                          ? 'bg-primary/15 border-primary text-primary font-bold shadow-sm' 
                          : 'bg-background hover:bg-accent border-border text-muted-foreground'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className="text-[11px] leading-tight">{meta.label.split('&')[0].trim()}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Campos do Cliente */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Nome da Empresa / Cliente *</label>
                <Input 
                  placeholder="Ex: Auto Mecânica Modelo" 
                  value={formClient} 
                  onChange={e => setFormClient(e.target.value)}
                  className="mt-1 h-9 text-xs" 
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Responsável / Contato</label>
                <Input 
                  placeholder="Ex: Dr. Roberto Carlos" 
                  value={formClientContact} 
                  onChange={e => setFormClientContact(e.target.value)}
                  className="mt-1 h-9 text-xs" 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">WhatsApp do Cliente (DDD + Número)</label>
                <Input 
                  placeholder="Ex: 92981087241" 
                  value={formClientPhone} 
                  onChange={e => setFormClientPhone(e.target.value)}
                  className="mt-1 h-9 text-xs" 
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Prazo Estimado de Entrega</label>
                <Input 
                  placeholder="Ex: 7 a 10 dias úteis" 
                  value={formDeadline} 
                  onChange={e => setFormDeadline(e.target.value)}
                  className="mt-1 h-9 text-xs" 
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground">Título Comercial do Projeto *</label>
              <Input 
                placeholder="Ex: Criação de Site + Sistema de Atendimento" 
                value={formTitle} 
                onChange={e => setFormTitle(e.target.value)}
                className="mt-1 h-9 text-xs font-semibold" 
              />
            </div>

            {/* Itens do Escopo */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-muted-foreground uppercase">Itens Inclusos no Escopo ({formScope.length})</label>
                <span className="text-[10px] text-muted-foreground">Clique no item para remover</span>
              </div>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {formScope.map((item, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => handleToggleScopeItem(idx)}
                    className="flex items-center justify-between p-1.5 px-2.5 rounded-lg bg-accent/30 hover:bg-destructive/10 border border-border text-xs cursor-pointer group transition-colors"
                  >
                    <span className="truncate flex items-center gap-1.5">
                      <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                      {item}
                    </span>
                    <X className="w-3 h-3 text-muted-foreground group-hover:text-destructive shrink-0 ml-2" />
                  </div>
                ))}
              </div>

              {/* Adicionar novo item */}
              <div className="flex gap-2 mt-2">
                <Input 
                  placeholder="Adicionar novo item de escopo..." 
                  value={newScopeInput} 
                  onChange={e => setNewScopeInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddScopeItem())}
                  className="h-8 text-xs bg-background" 
                />
                <Button size="sm" onClick={handleAddScopeItem} className="h-8 px-3 text-xs">
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {/* Valores e Condições */}
            <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-accent/20 border border-border">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Valor Total Setup (R$)</label>
                <Input 
                  type="number" 
                  value={formTotal} 
                  onChange={e => setFormTotal(e.target.value)}
                  placeholder="2500" 
                  className="mt-1 h-9 text-xs font-bold text-emerald-400 bg-background" 
                />
                <span className="text-[10px] text-muted-foreground">PIX com 5% de desconto automático</span>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Suporte Mensal Opcional (R$)</label>
                <Input 
                  type="number" 
                  value={formMonthly} 
                  onChange={e => setFormMonthly(e.target.value)}
                  placeholder="120" 
                  className="mt-1 h-9 text-xs font-semibold text-primary bg-background" 
                />
                <span className="text-[10px] text-muted-foreground">Ou 0 se não houver mensalidade</span>
              </div>
            </div>

            {/* Botões do Rodapé */}
            <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
              <Button variant="outline" size="sm" onClick={() => setIsCreateModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveProposal} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                <FileText className="w-4 h-4 mr-1.5" />
                Gerar Proposta One-Pager
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
