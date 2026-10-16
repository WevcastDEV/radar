'use client';

import { PipelineStageData, LeadListItem } from '@radar/types';
import { KanbanColumn } from './kanban-column';
import { KanbanCard } from './kanban-card';
import { useState } from 'react';
import { MessageSquare, Phone, MapPin, Building, User, ChevronRight, Tag, ArrowRight, CheckCircle2, Plus } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { toWhatsAppJidDigits, formatBrazilianPhone } from '@/lib/phone-utils';
import Link from 'next/link';

interface KanbanBoardProps {
  stages: PipelineStageData[];
  viewMode?: 'focused' | 'compact' | 'table';
  selectedStageId?: string;
  onSelectStage?: (id: string) => void;
  onDragEnd: (leadId: string, stageId: string) => void;
  onMoveStage?: (leadId: string, stageId: string) => void;
  onSelectLead?: (lead: LeadListItem) => void;
  onAddLeadToStage?: (stageId: string) => void;
}

export function KanbanBoard({ 
  stages, 
  viewMode = 'focused',
  selectedStageId = 'all',
  onSelectStage,
  onDragEnd, 
  onMoveStage,
  onSelectLead,
  onAddLeadToStage,
}: KanbanBoardProps) {
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    setDraggedLeadId(leadId);
    e.dataTransfer.setData('text/plain', leadId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    if (draggedLeadId) {
      onDragEnd(draggedLeadId, stageId);
      setDraggedLeadId(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  // 1. VISÃO TABELA / LISTA GERENCIAL (SEM NENHUMA BARRA DE ARRASTAR)
  if (viewMode === 'table') {
    const allLeadsWithStage = stages.flatMap((stage) => 
      stage.leads.map((lead) => ({ lead, stage }))
    ).filter(({ stage }) => selectedStageId === 'all' || stage.id === selectedStageId);

    return (
      <div className="h-full flex flex-col bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-muted/40 border-b border-border text-[11px] font-bold text-muted-foreground uppercase tracking-wider sticky top-0 backdrop-blur-md">
              <tr>
                <th className="py-3 px-4">Empresa / Oportunidade</th>
                <th className="py-3 px-4">Estágio do Funil</th>
                <th className="py-3 px-4">Contato / WhatsApp</th>
                <th className="py-3 px-4">Prioridade</th>
                <th className="py-3 px-4">Cidade / Local</th>
                <th className="py-3 px-4 text-right">Ações Comerciais</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {allLeadsWithStage.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    <p className="text-sm font-medium">Nenhum cliente ou oportunidade encontrada com os filtros selecionados.</p>
                    <p className="text-xs text-muted-foreground mt-1">Clique em "+ Nova Oportunidade no CRM" para adicionar.</p>
                  </td>
                </tr>
              ) : (
                allLeadsWithStage.map(({ lead, stage }) => {
                  const rawPhone = (lead as any).phone || (lead as any).contacts?.[0]?.value || '';
                  const phoneVal = formatBrazilianPhone(rawPhone);
                  const cleanDigits = toWhatsAppJidDigits(rawPhone);
                  const priority = lead.priority;
                  const categoryName = lead.segment?.name || (lead as any).subcategory;

                  return (
                    <tr 
                      key={lead.id} 
                      onClick={() => onSelectLead?.(lead)}
                      className="hover:bg-muted/30 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4 font-bold text-foreground">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <span 
                              className="w-2.5 h-2.5 rounded-full shrink-0" 
                              style={{ backgroundColor: stage.color }} 
                            />
                            <span className="group-hover:text-primary transition-colors text-xs font-bold">{lead.name}</span>
                          </div>
                          {categoryName && (
                            <span className="text-[10px] text-muted-foreground pl-4 font-normal">
                              {categoryName}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5">
                          <select
                            value={stage.id}
                            onChange={(e) => onMoveStage?.(lead.id, e.target.value)}
                            className="h-8 rounded-lg bg-background border border-border px-2 text-xs font-bold text-foreground cursor-pointer hover:border-primary transition-all shadow-xs"
                            style={{ borderLeftColor: stage.color, borderLeftWidth: '3px' }}
                          >
                            {stages.map((s) => (
                              <option key={s.id} value={s.id} className="text-foreground bg-background">
                                {s.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {phoneVal ? (
                          <span className="font-mono text-foreground font-medium">{phoneVal}</span>
                        ) : (
                          <span className="text-muted-foreground/60">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          priority === 'HIGH'
                            ? 'bg-rose-500/15 text-rose-400 border border-rose-500/25'
                            : priority === 'MEDIUM'
                              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25'
                              : 'bg-muted text-muted-foreground'
                        }`}>
                          {priority === 'HIGH' ? '🔥 Alta' : priority === 'MEDIUM' ? '⚡ Média' : 'Baixa'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {lead.address?.city || '—'}
                      </td>
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/chat-comercial?phone=${cleanDigits || lead.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-400 font-bold border border-emerald-500/25 shadow-xs transition-all text-xs"
                            title="Abrir no Chat Comercial"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Chat</span>
                          </Link>

                          <Link
                            href={`/proposals?client=${encodeURIComponent(lead.name)}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary font-bold border border-primary/25 shadow-xs transition-all text-xs"
                            title="Gerar Proposta Comercial"
                          >
                            <Tag className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Proposta</span>
                          </Link>

                          <button
                            type="button"
                            onClick={() => onSelectLead?.(lead)}
                            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-foreground font-semibold border border-border transition-all text-xs"
                            title="Ver Histórico e CRM"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // 2. VISÃO FOCADA POR ESTÁGIO (GRADE ESTRUTURADA QUE CABE NA TELA, SEM SCROLL HORIZONTAL)
  if (viewMode === 'focused' && selectedStageId !== 'all') {
    const activeStage = stages.find((s) => s.id === selectedStageId) || stages[0];
    const prevStage = stages.find((_, idx) => stages[idx + 1]?.id === activeStage?.id);
    const nextStage = stages.find((_, idx) => stages[idx - 1]?.id === activeStage?.id);

    return (
      <div className="h-full flex flex-col bg-card/60 rounded-2xl border border-border p-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
          <div className="flex items-center gap-3">
            <div 
              className="w-4 h-4 rounded-full shadow-sm" 
              style={{ backgroundColor: activeStage.color }} 
            />
            <div>
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <span>{activeStage.name}</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-muted text-muted-foreground">
                  {activeStage.leads.length} leads
                </span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Total acumulado na etapa: <strong className="font-mono text-foreground">{formatCurrency(activeStage.totalValue || 0)}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onAddLeadToStage?.(activeStage.id)}
            className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs flex items-center gap-1.5 shadow-sm hover:bg-primary/90 transition-all"
          >
            <Plus className="w-4 h-4" />
            + Nova Oportunidade
          </button>
        </div>

        {activeStage.leads.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-muted-foreground border-2 border-dashed border-border/80 rounded-2xl">
            <span className="text-4xl mb-2">📋</span>
            <h4 className="font-bold text-sm text-foreground">Nenhuma oportunidade nesta etapa</h4>
            <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4">
              Use as outras etapas no menu acima ou clique no botão abaixo para adicionar um lead diretamente aqui.
            </p>
            <button
              type="button"
              onClick={() => onAddLeadToStage?.(activeStage.id)}
              className="px-4 py-2 rounded-xl bg-primary/10 text-primary font-bold text-xs hover:bg-primary/20 transition-colors"
            >
              + Adicionar Lead em {activeStage.name}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
            {activeStage.leads.map((lead) => (
              <KanbanCard 
                key={lead.id} 
                lead={lead} 
                currentStageId={activeStage.id}
                prevStage={prevStage}
                nextStage={nextStage}
                allStages={stages}
                onDragStart={(e) => handleDragStart(e, lead.id)} 
                onMoveStage={onMoveStage || onDragEnd}
                onSelectLead={onSelectLead}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // 3. VISÃO GERAL ORGANIZADA E CENTRADA (NUNCA COMPACTADA EM TELAS PEQUENAS)
  return (
    <div className="h-full overflow-y-auto pb-4">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 max-w-6xl mx-auto">
        {stages.map((stage, index) => {
          const prevStage = index > 0 ? stages[index - 1] : undefined;
          const nextStage = index < stages.length - 1 ? stages[index + 1] : undefined;

          return (
            <div key={stage.id} className="min-w-0 flex flex-col min-h-[420px] bg-card/40 rounded-2xl border border-border p-3 shadow-xs">
              <KanbanColumn
                stage={stage}
                prevStage={prevStage}
                nextStage={nextStage}
                allStages={stages}
                onDragStart={handleDragStart}
                onDrop={(e) => handleDrop(e, stage.id)}
                onDragOver={handleDragOver}
                onMoveStage={onMoveStage || onDragEnd}
                onSelectLead={onSelectLead}
                onAddLeadToStage={onAddLeadToStage}
                isDragging={!!draggedLeadId}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
