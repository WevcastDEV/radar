'use client';

import { usePipeline, useMoveLead } from '@/hooks/use-pipeline';
import { KanbanBoard } from '@/components/pipeline/kanban-board';
import { LeadCrmModal } from '@/components/pipeline/lead-crm-modal';
import { NewPipelineLeadModal } from '@/components/pipeline/new-pipeline-lead-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/utils';
import { LeadListItem } from '@radar/types';
import { 
  Plus, 
  Search, 
  Filter, 
  X, 
  DollarSign, 
  TrendingUp, 
  Users, 
  CheckCircle2,
  Sparkles,
  Flame
} from 'lucide-react';
import { useState, useMemo } from 'react';

export default function PipelinePage() {
  const { data: stages, isLoading } = usePipeline();
  const { mutate: moveLead } = useMoveLead();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSegment, setSelectedSegment] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');

  // Modal states
  const [selectedLeadForCrm, setSelectedLeadForCrm] = useState<LeadListItem | null>(null);
  const [isCrmModalOpen, setIsCrmModalOpen] = useState(false);
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);
  const [targetStageForNewLead, setTargetStageForNewLead] = useState<string | undefined>(undefined);

  // Cálculos de Métricas Globais do Pipeline
  const pipelineMetrics = useMemo(() => {
    if (!stages || stages.length === 0) {
      return { totalValue: 0, totalLeads: 0, avgTicket: 0, closedValue: 0 };
    }

    let totalValue = 0;
    let totalLeads = 0;
    let closedValue = 0;

    stages.forEach(stage => {
      totalValue += stage.totalValue || 0;
      totalLeads += stage.leads?.length || 0;
      // Estágios de fechamento
      if (stage.slug === 'fechado' || stage.name.toLowerCase().includes('fechado') || stage.name.toLowerCase().includes('ganho')) {
        closedValue += stage.totalValue || 0;
      }
    });

    const avgTicket = totalLeads > 0 ? totalValue / totalLeads : 0;

    return { totalValue, totalLeads, avgTicket, closedValue };
  }, [stages]);

  // Filtragem Dinâmica dos Leads dentro de cada Coluna
  const filteredStages = useMemo(() => {
    if (!stages) return [];
    if (!searchQuery.trim() && selectedSegment === 'all' && selectedPriority === 'all') return stages;

    const query = searchQuery.toLowerCase().trim();

    return stages.map(stage => {
      const filteredLeads = stage.leads.filter(lead => {
        // Busca textual por nome, telefone, contato ou cidade
        const leadPhone = (lead as any).phone || (lead as any).contacts?.[0]?.value || '';
        const contactName = (lead as any).contactName || '';
        const matchesName = lead.name.toLowerCase().includes(query);
        const matchesContact = contactName.toLowerCase().includes(query);
        const matchesPhone = leadPhone.replace(/\D/g, '').includes(query.replace(/\D/g, ''));
        const matchesCity = lead.address?.city?.toLowerCase().includes(query) || false;

        const matchesSearch = !query || matchesName || matchesContact || matchesPhone || matchesCity;

        // Filtro de Segmento
        const matchesSegment = selectedSegment === 'all' || 
          (lead.segment?.name || (lead as any).subcategory || '').toLowerCase() === selectedSegment.toLowerCase();

        // Filtro de Prioridade
        const matchesPriority = selectedPriority === 'all' || lead.priority === selectedPriority;

        return matchesSearch && matchesSegment && matchesPriority;
      });

      const filteredTotalValue = filteredLeads.reduce((acc, l) => acc + (Number(l.potentialValue) || 0), 0);

      return {
        ...stage,
        leads: filteredLeads,
        count: filteredLeads.length,
        totalValue: filteredTotalValue,
      };
    });
  }, [stages, searchQuery, selectedSegment, selectedPriority]);

  // Extrair segmentos únicos presentes para o seletor de filtro
  const availableSegments = useMemo(() => {
    if (!stages) return [];
    const set = new Set<string>();
    stages.forEach(s => {
      s.leads.forEach(l => {
        const segName = l.segment?.name || (l as any).subcategory;
        if (segName) set.add(segName);
      });
    });
    return Array.from(set).sort();
  }, [stages]);

  const handleDragEnd = (leadId: string, stageId: string) => {
    moveLead({ leadId, stageId });
  };

  const handleOpenLeadCrm = (lead: LeadListItem) => {
    setSelectedLeadForCrm(lead);
    setIsCrmModalOpen(true);
  };

  const handleAddLeadToStage = (stageId: string) => {
    setTargetStageForNewLead(stageId);
    setIsNewLeadModalOpen(true);
  };

  const handleOpenNewLeadGeneral = () => {
    setTargetStageForNewLead('stage-1');
    setIsNewLeadModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-4 h-full flex flex-col">
        <div className="h-20 bg-card rounded-2xl border border-border animate-pulse" />
        <div className="flex gap-4 flex-1 overflow-x-auto pb-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="min-w-[310px] bg-card rounded-2xl border border-border animate-pulse h-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Top Header & Ação Rápida */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <span>CRM Comercial</span>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
              Funil de Vendas
            </span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Gestão ativa de clientes e negociações comerciais. Clique no card para abrir o CRM ou arraste para avançar no funil.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button 
            onClick={handleOpenNewLeadGeneral}
            size="sm" 
            className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold gap-1.5 shadow-md"
          >
            <Plus className="w-4 h-4" />
            + Nova Oportunidade no CRM
          </Button>
        </div>
      </div>

      {/* Cards de Métricas do Pipeline */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-card border border-border flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-muted-foreground font-medium">Total no CRM</p>
            <h4 className="text-base sm:text-lg font-black text-foreground font-mono truncate">
              {formatCurrency(pipelineMetrics.totalValue)}
            </h4>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-card border border-border flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-muted-foreground font-medium">Oportunidades no CRM</p>
            <h4 className="text-base sm:text-lg font-black text-foreground font-mono truncate">
              {pipelineMetrics.totalLeads} clientes
            </h4>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-card border border-border flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-muted-foreground font-medium">Ticket Médio Estimado</p>
            <h4 className="text-base sm:text-lg font-black text-foreground font-mono truncate">
              {formatCurrency(pipelineMetrics.avgTicket)}
            </h4>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-card border border-border flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-muted-foreground font-medium">Contratos Ganhos / Fechados</p>
            <h4 className="text-base sm:text-lg font-black text-emerald-400 font-mono truncate">
              {formatCurrency(pipelineMetrics.closedValue)}
            </h4>
          </div>
        </div>
      </div>

      {/* Barra de Filtro e Busca Rápida no CRM */}
      <div className="flex flex-col sm:flex-row items-center gap-2.5 p-2.5 rounded-xl bg-card border border-border">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por empresa, decisor, WhatsApp ou cidade..."
            className="pl-8 h-9 text-xs bg-background border-border"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filtro por Prioridade */}
        <select
          value={selectedPriority}
          onChange={(e) => setSelectedPriority(e.target.value)}
          className="h-9 rounded-lg bg-background border border-border px-3 text-xs text-foreground cursor-pointer w-full sm:w-auto font-medium"
        >
          <option value="all">⚡ Todas Prioridades</option>
          <option value="HIGH">🔥 Alta Prioridade</option>
          <option value="MEDIUM">⚡ Média Prioridade</option>
          <option value="LOW">⏳ Baixa Prioridade</option>
        </select>

        {/* Filtro por Segmento */}
        {availableSegments.length > 0 && (
          <select
            value={selectedSegment}
            onChange={(e) => setSelectedSegment(e.target.value)}
            className="h-9 rounded-lg bg-background border border-border px-3 text-xs text-foreground cursor-pointer w-full sm:w-auto"
          >
            <option value="all">📁 Todos os Segmentos ({availableSegments.length})</option>
            {availableSegments.map(seg => (
              <option key={seg} value={seg}>{seg}</option>
            ))}
          </select>
        )}

        {(searchQuery || selectedSegment !== 'all' || selectedPriority !== 'all') && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => { setSearchQuery(''); setSelectedSegment('all'); setSelectedPriority('all'); }}
            className="h-9 text-xs text-muted-foreground hover:text-foreground gap-1 whitespace-nowrap"
          >
            <X className="w-3.5 h-3.5" />
            Limpar Filtros
          </Button>
        )}
      </div>
      
      {/* Quadro Kanban Interativo */}
      <div className="flex-1 overflow-hidden">
        <KanbanBoard 
          stages={filteredStages} 
          onDragEnd={handleDragEnd}
          onMoveStage={handleDragEnd}
          onSelectLead={handleOpenLeadCrm}
          onAddLeadToStage={handleAddLeadToStage}
        />
      </div>

      {/* Modal de Gestão CRM do Lead */}
      <LeadCrmModal
        lead={selectedLeadForCrm}
        isOpen={isCrmModalOpen}
        onClose={() => {
          setIsCrmModalOpen(false);
          setSelectedLeadForCrm(null);
        }}
      />

      {/* Modal de Cadastro Rápido de Lead */}
      <NewPipelineLeadModal
        isOpen={isNewLeadModalOpen}
        initialStageId={targetStageForNewLead}
        onClose={() => {
          setIsNewLeadModalOpen(false);
          setTargetStageForNewLead(undefined);
        }}
      />
    </div>
  );
}
