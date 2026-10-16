'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Package,
  Store,
  X,
  Check,
  Trash2,
  Building2
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';
import { useConfirm } from '@/components/ui/confirm-dialog';

export type ProposalCategory = 'produtos' | 'servicos' | 'recorrencia' | 'projetos' | 'geral';

export interface ProposalItem {
  id: string;
  client: string;
  clientPhone?: string;
  clientContact?: string;
  title: string;
  category: ProposalCategory;
  total: number;
  pixDiscountPercent: number;
  installmentsCount: number;
  monthly: number;
  status: 'Criada' | 'Enviada' | 'Visualizada' | 'Negociação' | 'Aceita' | 'Recusada';
  statusColor: string;
  date: string;
  validUntil: string;
  deadline: string;
  companyName: string;
  companyPhone?: string;
  companyDetails?: string;
  seller: string;
  scope: string[];
  notes?: string;
}

const CATEGORY_DEFAULT_SCOPES: Record<ProposalCategory, { label: string; icon: any; defaultTitle: string; defaultTotal: number; defaultMonthly: number; scope: string[] }> = {
  produtos: {
    label: 'Produtos & Mercadorias',
    icon: Package,
    defaultTitle: 'Fornecimento de Produtos / Mercadorias Comerciais',
    defaultTotal: 1500,
    defaultMonthly: 0,
    scope: [
      'Separação e fornecimento com conferência rigorosa de itens',
      'Garantia de procedência e nota fiscal inclusa',
      'Condições comerciais negociadas e prazo de entrega pontual',
      'Suporte e assistência direta ao cliente'
    ]
  },
  servicos: {
    label: 'Prestação de Serviços & Mão de Obra',
    icon: Wrench,
    defaultTitle: 'Prestação de Serviços Especializados / Execução',
    defaultTotal: 1800,
    defaultMonthly: 0,
    scope: [
      'Execução técnica por profissionais qualificados',
      'Relatório de entrega e alinhamento de expectativas',
      'Garantia sobre os serviços prestados',
      'Atendimento prioritário em caso de dúvidas'
    ]
  },
  recorrencia: {
    label: 'Planos & Mensalidade',
    icon: Layers,
    defaultTitle: 'Plano de Acompanhamento Mensal / Suporte Contínuo',
    defaultTotal: 0,
    defaultMonthly: 350,
    scope: [
      'Atendimento e suporte contínuo durante todo o mês',
      'Acompanhamento periódico preventivo e corretivo',
      'Canal direto no WhatsApp para chamados e solicitações',
      'Relatório mensal de acompanhamento e resultados'
    ]
  },
  projetos: {
    label: 'Projetos, Obras & Instalações',
    icon: Cpu,
    defaultTitle: 'Projeto Comercial / Instalação & Implementação',
    defaultTotal: 3500,
    defaultMonthly: 0,
    scope: [
      'Planejamento, cronograma de execução e entrega estruturada',
      'Instalação, testes e validação técnica completa',
      'Treinamento e orientações de uso para a equipe',
      'Garantia integral e manual de instruções'
    ]
  },
  geral: {
    label: 'Proposta Comercial Geral',
    icon: Store,
    defaultTitle: 'Proposta Comercial de Soluções e Atendimento',
    defaultTotal: 2000,
    defaultMonthly: 0,
    scope: [
      'Atendimento personalizado de acordo com as necessidades do cliente',
      'Cronograma transparente com prazos acordados',
      'Condições de pagamento facilitadas (PIX com desconto ou parcelado)',
      'Garantia de satisfação e acompanhamento dedicado'
    ]
  }
};

const PROPOSALS_STORAGE_KEY = 'radar_proposals_data';

export default function ProposalsPage() {
  const confirm = useConfirm();
  const [proposals, setProposals] = useState<ProposalItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Estados dos Modais
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeOnePager, setActiveOnePager] = useState<ProposalItem | null>(null);

  // Formulário Nova Proposta Universal
  const [formCompany, setFormCompany] = useState('');
  const [formCompanyPhone, setFormCompanyPhone] = useState('');
  const [formSeller, setFormSeller] = useState('');
  const [formClient, setFormClient] = useState('');
  const [formClientPhone, setFormClientPhone] = useState('');
  const [formClientContact, setFormClientContact] = useState('');
  const [formCategory, setFormCategory] = useState<ProposalCategory>('geral');
  const [formTitle, setFormTitle] = useState(CATEGORY_DEFAULT_SCOPES.geral.defaultTitle);
  const [formTotal, setFormTotal] = useState(String(CATEGORY_DEFAULT_SCOPES.geral.defaultTotal));
  const [formMonthly, setFormMonthly] = useState(String(CATEGORY_DEFAULT_SCOPES.geral.defaultMonthly));
  const [formDeadline, setFormDeadline] = useState('5 a 7 dias úteis');
  const [formScope, setFormScope] = useState<string[]>(CATEGORY_DEFAULT_SCOPES.geral.scope);
  const [newScopeInput, setNewScopeInput] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Carregar dados limpos do localStorage - ZERO exemplos
  useEffect(() => {
    try {
      const savedCompany = localStorage.getItem('radar_company_name') || '';
      const savedPhone = localStorage.getItem('radar_company_phone') || '';
      const savedSeller = localStorage.getItem('radar_seller_name') || '';
      setFormCompany(savedCompany || 'Minha Empresa');
      setFormCompanyPhone(savedPhone);
      setFormSeller(savedSeller || 'Comercial');

      const raw = localStorage.getItem(PROPOSALS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          // Remove quaisquer exemplos antigos mockados
          const mockClients = [
            'Panificadora & Confeitaria Conde',
            'Centro Automotivo Imperial',
            'Clínica OdontoPrime Manaus',
            'Padaria Bella Vista'
          ];
          const cleanList = parsed.filter(p => 
            !['PROP-2026-001', 'PROP-2026-002', 'PROP-2026-003', 'PROP-2026-004'].includes(p.id) &&
            !mockClients.includes(p.client)
          );
          setProposals(cleanList);
          localStorage.setItem(PROPOSALS_STORAGE_KEY, JSON.stringify(cleanList));
          setIsLoaded(true);
          return;
        }
      }
      setProposals([]);
      localStorage.setItem(PROPOSALS_STORAGE_KEY, JSON.stringify([]));
    } catch {
      setProposals([]);
    }
    setIsLoaded(true);
  }, []);

  const persistProposals = (newProps: ProposalItem[]) => {
    setProposals(newProps);
    try {
      localStorage.setItem(PROPOSALS_STORAGE_KEY, JSON.stringify(newProps));
    } catch (e) {
      console.error('Erro ao salvar propostas:', e);
    }
  };

  // Fechar modais ao pressionar tecla ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveOnePager(null);
        setIsCreateModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Ao mudar de categoria no modal, preenche valores sugeridos
  const handleCategoryChange = (cat: ProposalCategory) => {
    setFormCategory(cat);
    const defaults = CATEGORY_DEFAULT_SCOPES[cat];
    setFormScope(defaults.scope);
    setFormTitle(defaults.defaultTitle);
    setFormTotal(String(defaults.defaultTotal));
    setFormMonthly(String(defaults.defaultMonthly));
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

  const handleOpenCreateModal = () => {
    setFormClient('');
    setFormClientPhone('');
    setFormClientContact('');
    handleCategoryChange('geral');
    setFormNotes('');
    setIsCreateModalOpen(true);
  };

  const handleDeleteProposal = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const target = proposals.find(p => p.id === id);
    if (!target) return;

    const confirmed = await confirm({
      title: 'Excluir Proposta Comercial',
      description: `Tem certeza que deseja excluir a proposta de "${target.client}"? Esta ação removerá o orçamento permanentemente.`,
      confirmText: 'Sim, Excluir',
      cancelText: 'Cancelar',
      variant: 'danger',
      icon: 'trash',
    });

    if (confirmed) {
      const updated = proposals.filter(p => p.id !== id);
      persistProposals(updated);
      if (activeOnePager && activeOnePager.id === id) {
        setActiveOnePager(null);
      }
      toast.success('Proposta excluída com sucesso!');
    }
  };

  const handleClearAllProposals = async () => {
    const confirmed = await confirm({
      title: 'Limpar Todas as Propostas Comerciais',
      description: 'Deseja remover todas as propostas cadastradas? A lista ficará 100% zerada.',
      confirmText: 'Sim, Limpar Propostas',
      cancelText: 'Cancelar',
      variant: 'danger',
      icon: 'trash',
    });

    if (confirmed) {
      persistProposals([]);
      setActiveOnePager(null);
      toast.success('Todas as propostas foram limpas com sucesso!');
    }
  };

  const handleSaveProposal = () => {
    if (!formClient.trim() || !formTitle.trim()) {
      toast.error('Preencha o nome do cliente e o título da proposta!');
      return;
    }

    const totalNum = Number(formTotal) || 0;
    const monthlyNum = Number(formMonthly) || 0;
    const today = new Date();
    const validDate = new Date(today.getTime() + 15 * 24 * 60 * 60 * 1000);

    const companyFinal = formCompany.trim() || 'Minha Empresa';
    const sellerFinal = formSeller.trim() || 'Comercial';
    const phoneFinal = formCompanyPhone.trim();

    // Salvar preferências de empresa/vendedor para futuras propostas
    try {
      localStorage.setItem('radar_company_name', companyFinal);
      localStorage.setItem('radar_seller_name', sellerFinal);
      if (phoneFinal) localStorage.setItem('radar_company_phone', phoneFinal);
    } catch {}

    const newProp: ProposalItem = {
      id: `PROP-${Date.now().toString().slice(-6)}`,
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
      deadline: formDeadline.trim() || 'A combinar',
      companyName: companyFinal,
      companyPhone: phoneFinal,
      companyDetails: 'Atendimento Comercial e Vendas',
      seller: sellerFinal,
      scope: formScope.length > 0 ? formScope : CATEGORY_DEFAULT_SCOPES[formCategory].scope,
      notes: formNotes.trim() || undefined
    };

    persistProposals([newProp, ...proposals]);
    setIsCreateModalOpen(false);
    setActiveOnePager(newProp);
    toast.success('Proposta One-Pager gerada com sucesso!');
  };

  // Filtragem de propostas
  const filteredProposals = useMemo(() => {
    return proposals.filter(p => {
      const matchesSearch = 
        p.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [proposals, searchQuery, categoryFilter, statusFilter]);

  // Impressão rápida (One-Pager em A4)
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
      `Aqui é o(a) ${prop.seller || 'consultor comercial'} da *${prop.companyName || 'nossa empresa'}*.\n\n` +
      `Conforme alinhamos, elaborei a proposta comercial para o seu atendimento:\n` +
      `📄 *Proposta:* ${prop.title} (${prop.id})\n` +
      `⏱️ *Prazo de Entrega / Execução:* ${prop.deadline}\n\n` +
      `💰 *Investimento:* ${formatCurrency(prop.total)} em até ${prop.installmentsCount}x sem juros\n` +
      `⚡ *À vista no PIX (${prop.pixDiscountPercent}% de desconto):* ${formatCurrency(pixTotal)}\n` +
      (prop.monthly > 0 ? `🔄 *Mensalidade / Acompanhamento:* ${formatCurrency(prop.monthly)}/mês\n\n` : '\n') +
      `🛡️ *Garantia:* Garantia e suporte prioritário inclusos.\n\n` +
      `Podemos formalizar o início do atendimento?`;

    const encoded = encodeURIComponent(message);
    const waUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(waUrl, '_blank');
    toast.success('Proposta formatada enviada para o WhatsApp!');
  };

  // Copiar resumo
  const handleCopyProposalText = (prop: ProposalItem) => {
    const pixTotal = prop.total * (1 - prop.pixDiscountPercent / 100);
    const text = 
      `PROPOSTA COMERCIAL — ${prop.companyName || 'Nossa Empresa'}\n` +
      `Código: ${prop.id}\n` +
      `Cliente: ${prop.client}\n` +
      `Item / Projeto: ${prop.title}\n` +
      `Valor: ${formatCurrency(prop.total)} (À vista PIX: ${formatCurrency(pixTotal)})\n` +
      `Prazo: ${prop.deadline}\n` +
      `Vendedor: ${prop.seller}`;
    navigator.clipboard.writeText(text);
    toast.success('Resumo da proposta copiado!');
  };

  if (!isLoaded) {
    return (
      <div className="p-8 text-center text-muted-foreground animate-pulse text-xs">
        Carregando propostas comerciais...
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Estilos específicos de impressão para 1 Página A4 */}
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
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="w-6 h-6 text-primary" />
              Propostas Comerciais (One-Pager)
            </h1>
            <Badge variant="outline" className="text-xs bg-muted/60 text-muted-foreground border-border">
              Universal para qualquer Comércio
            </Badge>
          </div>
          <p className="text-muted-foreground text-xs mt-1">
            Gere orçamentos e propostas comerciais profissionais em 1 página PDF com envio direto para o WhatsApp.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {proposals.length > 0 && (
            <Button 
              variant="outline" 
              size="sm"
              className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:border-destructive text-xs h-9"
              onClick={handleClearAllProposals}
              title="Limpar todas as propostas cadastradas"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              Limpar Propostas
            </Button>
          )}

          <Button 
            onClick={handleOpenCreateModal} 
            className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-sm h-9"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Nova Proposta Comercial
          </Button>
        </div>
      </div>

      {/* Zero Examples / Empty State */}
      {proposals.length === 0 ? (
        <div className="bg-card rounded-2xl border border-dashed border-border p-12 text-center max-w-xl mx-auto my-8 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mx-auto mb-4">
            <FileText className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-foreground">Nenhuma proposta comercial cadastrada</h3>
          <p className="text-xs text-muted-foreground mt-1.5 max-w-md mx-auto leading-relaxed">
            Seu painel de propostas está 100% limpo. Crie orçamentos adaptáveis para qualquer tipo de negócio (comércio varejista, serviços, projetos ou planos recorrentes) sem informações desnecessárias.
          </p>
          <div className="mt-6 flex justify-center">
            <Button 
              onClick={handleOpenCreateModal}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs shadow-md h-10 px-5"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Criar Minha Primeira Proposta
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Barra de Filtros e Busca */}
          <div className="flex flex-col md:flex-row gap-3 bg-card p-3 rounded-xl border border-border items-center justify-between">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por cliente, código ou título..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 bg-background w-full h-9 text-xs" 
              />
            </div>
            
            <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
              <select 
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="h-9 rounded-lg border border-border bg-background px-3 py-1 text-xs font-semibold text-foreground"
              >
                <option value="all">Todas as Categorias</option>
                <option value="produtos">📦 Produtos & Mercadorias</option>
                <option value="servicos">🛠️ Prestação de Serviços</option>
                <option value="recorrencia">🔄 Planos / Mensalidade</option>
                <option value="projetos">📋 Projetos & Obras</option>
                <option value="geral">✨ Geral</option>
              </select>

              <select 
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="h-9 rounded-lg border border-border bg-background px-3 py-1 text-xs font-semibold text-foreground"
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
          <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="text-[11px] uppercase bg-muted/40 text-muted-foreground border-b border-border font-bold">
                  <tr>
                    <th className="px-5 py-3">Código</th>
                    <th className="px-5 py-3">Cliente & Proposta</th>
                    <th className="px-5 py-3">Categoria</th>
                    <th className="px-5 py-3">Valor Total</th>
                    <th className="px-5 py-3">Mensalidade</th>
                    <th className="px-5 py-3 text-center">Status</th>
                    <th className="px-5 py-3">Validade</th>
                    <th className="px-5 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredProposals.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-10 text-center text-muted-foreground">
                        <p className="text-xs">Nenhuma proposta encontrada para os filtros aplicados.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredProposals.map((prop) => {
                      const CatMeta = CATEGORY_DEFAULT_SCOPES[prop.category] || CATEGORY_DEFAULT_SCOPES.geral;
                      const CatIcon = CatMeta.icon;

                      return (
                        <tr key={prop.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-5 py-3.5 font-mono text-muted-foreground font-bold">
                            {prop.id}
                          </td>
                          <td className="px-5 py-3.5">
                            <div 
                              className="font-bold text-foreground hover:text-primary cursor-pointer transition-colors" 
                              onClick={() => setActiveOnePager(prop)}
                            >
                              {prop.client}
                            </div>
                            <div className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{prop.title}</div>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                              <CatIcon className="w-3.5 h-3.5 text-primary" />
                              <span>{CatMeta.label.split('&')[0].trim()}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 font-mono font-bold text-foreground">
                            {prop.total > 0 ? formatCurrency(prop.total) : 'Sob Consulta'}
                          </td>
                          <td className="px-5 py-3.5 font-mono text-muted-foreground">
                            {prop.monthly > 0 ? `${formatCurrency(prop.monthly)}/mês` : '—'}
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <Badge variant={prop.statusColor as any} className="text-[10px]">
                              {prop.status}
                            </Badge>
                          </td>
                          <td className="px-5 py-3.5 text-muted-foreground">{prop.validUntil}</td>
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center gap-1.5 justify-end">
                              {/* Ver Documento One-Pager */}
                              <Button 
                                onClick={() => setActiveOnePager(prop)} 
                                size="sm"
                                className="h-7 px-2 text-xs bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 font-semibold"
                                title="Visualizar Proposta em 1 Página PDF"
                              >
                                <FileText className="w-3.5 h-3.5 mr-1" />
                                One-Pager
                              </Button>

                              {/* Enviar no WhatsApp */}
                              <Button 
                                onClick={() => handleSendViaWhatsApp(prop)} 
                                size="sm"
                                className="h-7 px-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                                title="Enviar proposta no WhatsApp"
                              >
                                <Send className="w-3.5 h-3.5 mr-1" />
                                WhatsApp
                              </Button>

                              {/* Excluir Proposta */}
                              <Button 
                                onClick={(e) => handleDeleteProposal(prop.id, e)} 
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                title="Excluir Proposta"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div className="p-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground bg-muted/20">
              <span>Total de {filteredProposals.length} propostas registradas</span>
              <span>Visualização One-Pager otimizada para alta conversão</span>
            </div>
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* MODAL ONE-PAGER IMPRIMÍVEL (1 PÁGINA A4) */}
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
            <div className="p-4 bg-muted/40 border-b border-border flex flex-wrap items-center justify-between gap-3 no-print">
              <div className="flex items-center gap-2">
                <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-mono font-bold">
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
                  title="Gera o PDF de 1 página A4"
                >
                  <Printer className="w-3.5 h-3.5 mr-1.5" />
                  Imprimir / Salvar PDF
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
                  title="Copiar texto"
                >
                  <Copy className="w-3.5 h-3.5 mr-1" />
                  Copiar
                </Button>

                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setActiveOnePager(null)}
                  className="h-8 px-2 text-xs"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* CORPO DO DOCUMENTO ONE-PAGER */}
            <div id="one-pager-printable" className="p-8 bg-card text-foreground space-y-6">
              {/* Cabeçalho da Proposta */}
              <div className="flex justify-between items-start border-b border-border pb-6 print-border">
                <div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center font-black text-primary text-base">
                      <Store className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black tracking-tight text-foreground print-text-dark">
                        {activeOnePager.companyName || 'Proposta Comercial'}
                      </h2>
                      <p className="text-xs text-muted-foreground print-text-muted">
                        {activeOnePager.companyDetails || 'Soluções Comerciais e Atendimento'}
                      </p>
                    </div>
                  </div>
                  {activeOnePager.companyPhone && (
                    <div className="mt-2 text-xs text-muted-foreground print-text-muted">
                      <p>📱 Contato: <strong>{activeOnePager.companyPhone}</strong></p>
                    </div>
                  )}
                </div>

                <div className="text-right">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary">Proposta Comercial</span>
                  <p className="text-xl font-mono font-black text-foreground print-text-dark">{activeOnePager.id}</p>
                  <div className="mt-2 text-xs text-muted-foreground space-y-0.5 print-text-muted">
                    <p>Emissão: <strong>{activeOnePager.date}</strong></p>
                    <p>Validade: <strong>{activeOnePager.validUntil}</strong></p>
                  </div>
                </div>
              </div>

              {/* Informações do Cliente */}
              <div className="p-4 rounded-xl bg-muted/40 border border-border print-bg-subtle print-border flex flex-col sm:flex-row justify-between gap-4">
                <div>
                  <span className="text-[10px] font-bold uppercase text-muted-foreground print-text-muted tracking-wider">Apresentado para:</span>
                  <h3 className="text-base font-black text-foreground print-text-dark">{activeOnePager.client}</h3>
                  {activeOnePager.clientContact && (
                    <p className="text-xs text-muted-foreground print-text-muted">Aos cuidados de: <strong>{activeOnePager.clientContact}</strong></p>
                  )}
                  {activeOnePager.clientPhone && (
                    <p className="text-xs text-muted-foreground print-text-muted">WhatsApp: {activeOnePager.clientPhone}</p>
                  )}
                </div>

                <div className="sm:text-right">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground print-text-muted tracking-wider">Atendimento:</span>
                  <p className="text-xs text-foreground print-text-dark font-semibold">Responsável: <strong>{activeOnePager.seller}</strong></p>
                  <p className="text-xs text-muted-foreground print-text-muted">Prazo: <strong>{activeOnePager.deadline}</strong></p>
                </div>
              </div>

              {/* Objeto / Título da Proposta */}
              <div>
                <h4 className="text-sm font-bold text-foreground print-text-dark uppercase tracking-wider flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-primary" />
                  Objeto da Proposta
                </h4>
                <div className="p-3.5 rounded-xl border border-border bg-card print-border">
                  <p className="text-sm font-bold text-foreground print-text-dark">{activeOnePager.title}</p>
                  {activeOnePager.notes && (
                    <p className="text-xs text-muted-foreground print-text-muted mt-1 italic">{activeOnePager.notes}</p>
                  )}
                </div>
              </div>

              {/* Itens do Escopo */}
              <div>
                <h4 className="text-sm font-bold text-foreground print-text-dark uppercase tracking-wider flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  O que está incluso nesta proposta:
                </h4>
                <div className="grid grid-cols-1 gap-2">
                  {activeOnePager.scope.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 p-2 rounded-lg bg-muted/20 border border-border/60 print-border text-xs">
                      <span className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 font-bold text-[10px] mt-0.5">
                        ✓
                      </span>
                      <span className="text-foreground print-text-dark">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Valores & Condições de Pagamento */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-xl border border-border bg-muted/30 print-border space-y-1.5">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground print-text-muted tracking-wider">Investimento Total</span>
                  <div className="text-2xl font-black text-foreground print-text-dark font-mono">
                    {formatCurrency(activeOnePager.total)}
                  </div>
                  <p className="text-xs text-muted-foreground print-text-muted">
                    Em até <strong>{activeOnePager.installmentsCount}x sem juros</strong> no cartão
                  </p>
                  <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    À vista com {activeOnePager.pixDiscountPercent}% no PIX: {formatCurrency(activeOnePager.total * (1 - activeOnePager.pixDiscountPercent / 100))}
                  </p>
                </div>

                {activeOnePager.monthly > 0 && (
                  <div className="p-4 rounded-xl border border-border bg-muted/30 print-border space-y-1.5">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground print-text-muted tracking-wider">Mensalidade / Acompanhamento</span>
                    <div className="text-2xl font-black text-primary print-text-dark font-mono">
                      {formatCurrency(activeOnePager.monthly)}<span className="text-xs font-normal text-muted-foreground">/mês</span>
                    </div>
                    <p className="text-xs text-muted-foreground print-text-muted">
                      Suporte e acompanhamento contínuo
                    </p>
                  </div>
                )}
              </div>

              {/* Assinaturas */}
              <div className="grid grid-cols-2 gap-8 pt-8 border-t border-border print-border text-center text-xs">
                <div>
                  <div className="border-b border-border print-border pb-8 mb-2" />
                  <p className="font-bold text-foreground print-text-dark">{activeOnePager.companyName}</p>
                  <p className="text-[11px] text-muted-foreground print-text-muted">{activeOnePager.seller}</p>
                </div>
                <div>
                  <div className="border-b border-border print-border pb-8 mb-2" />
                  <p className="font-bold text-foreground print-text-dark">{activeOnePager.client}</p>
                  <p className="text-[11px] text-muted-foreground print-text-muted">{activeOnePager.clientContact || 'Aceite do Cliente'}</p>
                </div>
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
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Nova Proposta Comercial
                </h2>
                <p className="text-xs text-muted-foreground">Preencha os dados para gerar o documento PDF e envio no WhatsApp</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsCreateModalOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Dados da Empresa Emissora (Universal) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 rounded-xl bg-muted/30 border border-border">
              <div>
                <label className="text-[11px] font-semibold text-foreground">Sua Empresa</label>
                <Input 
                  placeholder="Nome da sua Empresa" 
                  value={formCompany} 
                  onChange={e => setFormCompany(e.target.value)}
                  className="mt-1 h-8 text-xs bg-background" 
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-foreground">Vendedor / Responsável</label>
                <Input 
                  placeholder="Seu Nome" 
                  value={formSeller} 
                  onChange={e => setFormSeller(e.target.value)}
                  className="mt-1 h-8 text-xs bg-background" 
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-foreground">Seu WhatsApp / Telefone</label>
                <Input 
                  placeholder="(00) 00000-0000" 
                  value={formCompanyPhone} 
                  onChange={e => setFormCompanyPhone(e.target.value)}
                  className="mt-1 h-8 text-xs bg-background" 
                />
              </div>
            </div>

            {/* Seleção Rápida de Categoria Universal */}
            <div>
              <label className="text-xs font-semibold text-foreground">Tipo / Categoria de Atendimento</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1.5">
                {(Object.keys(CATEGORY_DEFAULT_SCOPES) as ProposalCategory[]).map(cat => {
                  const isSelected = formCategory === cat;
                  const meta = CATEGORY_DEFAULT_SCOPES[cat];
                  const Icon = meta.icon;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => handleCategoryChange(cat)}
                      className={`p-2 rounded-xl border text-left transition-all flex items-center gap-2 ${
                        isSelected 
                          ? 'bg-primary/10 border-primary text-primary font-bold shadow-sm' 
                          : 'bg-background hover:bg-muted/50 border-border text-muted-foreground'
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className="text-[11px] leading-tight truncate">{meta.label.split('&')[0].trim()}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Campos do Cliente */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-foreground">Nome da Empresa / Cliente *</label>
                <Input 
                  placeholder="Ex: Mercado Central, Drogaria Silva, etc." 
                  value={formClient} 
                  onChange={e => setFormClient(e.target.value)}
                  className="mt-1 h-9 text-xs" 
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground">Contato / Responsável</label>
                <Input 
                  placeholder="Ex: João Silva" 
                  value={formClientContact} 
                  onChange={e => setFormClientContact(e.target.value)}
                  className="mt-1 h-9 text-xs" 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-foreground">WhatsApp do Cliente</label>
                <Input 
                  placeholder="Ex: 92981087241" 
                  value={formClientPhone} 
                  onChange={e => setFormClientPhone(e.target.value)}
                  className="mt-1 h-9 text-xs" 
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground">Prazo Estimado</label>
                <Input 
                  placeholder="Ex: 3 a 5 dias úteis, Imediato, etc." 
                  value={formDeadline} 
                  onChange={e => setFormDeadline(e.target.value)}
                  className="mt-1 h-9 text-xs" 
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground">Título Comercial da Proposta *</label>
              <Input 
                placeholder="Título da proposta ou serviço" 
                value={formTitle} 
                onChange={e => setFormTitle(e.target.value)}
                className="mt-1 h-9 text-xs font-semibold" 
              />
            </div>

            {/* Itens do Escopo */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-foreground">Itens / Entregas Inclusas ({formScope.length})</label>
                <span className="text-[10px] text-muted-foreground">Clique no X para remover</span>
              </div>
              <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                {formScope.map((item, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-center justify-between p-1.5 px-2.5 rounded-lg bg-muted/40 border border-border text-xs group"
                  >
                    <span className="truncate flex items-center gap-1.5">
                      <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                      {item}
                    </span>
                    <button 
                      type="button" 
                      onClick={() => handleToggleScopeItem(idx)}
                      className="text-muted-foreground hover:text-destructive shrink-0 ml-2"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Adicionar novo item */}
              <div className="flex gap-2 mt-2">
                <Input 
                  placeholder="Digitar novo item de entrega / produto..." 
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

            {/* Valores */}
            <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-muted/30 border border-border">
              <div>
                <label className="text-xs font-semibold text-foreground">Valor Total (R$)</label>
                <Input 
                  type="number" 
                  value={formTotal} 
                  onChange={e => setFormTotal(e.target.value)}
                  placeholder="0.00" 
                  className="mt-1 h-9 text-xs font-bold text-foreground bg-background" 
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground">Mensalidade (R$, Opcional)</label>
                <Input 
                  type="number" 
                  value={formMonthly} 
                  onChange={e => setFormMonthly(e.target.value)}
                  placeholder="0.00" 
                  className="mt-1 h-9 text-xs font-semibold text-foreground bg-background" 
                />
              </div>
            </div>

            {/* Botões do Rodapé */}
            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button variant="outline" size="sm" onClick={() => setIsCreateModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveProposal} size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold">
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
