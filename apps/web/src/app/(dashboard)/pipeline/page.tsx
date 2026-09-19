'use client';

import { usePipeline, useMoveLead } from '@/hooks/use-pipeline';
import { KanbanBoard } from '@/components/pipeline/kanban-board';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/utils';
import { 
  Plus, 
  Search, 
  Filter, 
  X, 
  DollarSign, 
  TrendingUp, 
  Users, 
  CheckCircle2,
  Sparkles 
} from 'lucide-react';
import { useState, useMemo } from 'react';
import Link from 'next/link';

export default function PipelinePage() {
  const { data: stages, isLoading } = usePipeline();
  const { mutate: moveLead } = useMoveLead();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSegment, setSelectedSegment] = useState('all');

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
    if (!searchQuery.trim() && selectedSegment === 'all') return stages;

    const query = searchQuery.toLowerCase().trim();

    return stages.map(stage => {
      const filteredLeads = stage.leads.filter(lead => {
        const matchesName = lead.name.toLowerCase().includes(query);
        const matchesCity = lead.address?.city?.toLowerCase().includes(query) || false;
        const matchesSegment = selectedSegment === 'all' || 
          (lead.segment?.name || '').toLowerCase() === selectedSegment.toLowerCase();

        return (matchesName || matchesCity) && matchesSegment;
      });

      const filteredTotalValue = filteredLeads.reduce((acc, l) => acc + (l.potentialValue || 0), 0);

      return {
        ...stage,
        leads: filteredLeads,
        count: filteredLeads.length,
        totalValue: filteredTotalValue,
      };
    });
  }, [stages, searchQuery, selectedSegment]);

  // Extrair segmentos únicos presentes para o seletor de filtro
  const availableSegments = useMemo(() => {
    if (!stages) return [];
    const set = new Set<string>();
    stages.forEach(s => {
      s.leads.forEach(l => {
        if (l.segment?.name) set.add(l.segment.name);
      });
    });
    return Array.from(set);
  }, [stages]);

  const handleDragEnd = (leadId: string, stageId: string) => {
    moveLead({ leadId, stageId });
  };

  if (isLoading) {
    return (
      <div className="space-y-4 h-full flex flex-col">
        <div className="h-20 bg-card rounded-2xl border border-border animate-pulse" />
        <div className="flex gap-4 flex-1 overflow-x-auto pb-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="min-w-[310px] bg-card rounded-2xl border border-border animate-pulse h-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Top Header & Métricas do Funil */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <span>Pipeline Comercial</span>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
              Kanban
            </span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Gerencie o avanço das oportunidades arrastando os cards ou clicando no botão de avançar etapa
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Link href="/leads?novo=true">
            <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold gap-1.5 shadow-md">
              <Plus className="w-4 h-4" />
              + Nova Prospecção
            </Button>
          </Link>
        </div>
      </div>

      {/* Cards de Métricas do Pipeline */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-card border border-border flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-muted-foreground font-medium">Total em Pipeline</p>
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
            <p className="text-[11px] text-muted-foreground font-medium">Oportunidades Ativas</p>
            <h4 className="text-base sm:text-lg font-black text-foreground font-mono truncate">
              {pipelineMetrics.totalLeads} leads
            </h4>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-card border border-border flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-muted-foreground font-medium">Ticket Médio</p>
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
            <p className="text-[11px] text-muted-foreground font-medium">Contratos Ganhos</p>
            <h4 className="text-base sm:text-lg font-black text-emerald-400 font-mono truncate">
              {formatCurrency(pipelineMetrics.closedValue)}
            </h4>
          </div>
        </div>
      </div>

      {/* Barra de Filtro e Busca Rápida no Kanban */}
      <div className="flex flex-col sm:flex-row items-center gap-2.5 p-2.5 rounded-xl bg-card border border-border">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar oportunidade por empresa ou cidade..."
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

        {availableSegments.length > 0 && (
          <select
            value={selectedSegment}
            onChange={(e) => setSelectedSegment(e.target.value)}
            className="h-9 rounded-lg bg-background border border-border px-3 text-xs text-foreground cursor-pointer w-full sm:w-auto"
          >
            <option value="all">📁 Todos os Segmentos</option>
            {availableSegments.map(seg => (
              <option key={seg} value={seg}>{seg}</option>
            ))}
          </select>
        )}

        {(searchQuery || selectedSegment !== 'all') && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => { setSearchQuery(''); setSelectedSegment('all'); }}
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
        />
      </div>
    </div>
  );
}
