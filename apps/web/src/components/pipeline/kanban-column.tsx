'use client';

import { PipelineStageData, LeadListItem } from '@radar/types';
import { KanbanCard } from './kanban-card';
import { formatCurrency } from '@/lib/utils';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Plus } from 'lucide-react';

interface KanbanColumnProps {
  stage: PipelineStageData;
  prevStage?: PipelineStageData;
  nextStage?: PipelineStageData;
  onDragStart: (e: React.DragEvent, leadId: string) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onMoveStage?: (leadId: string, targetStageId: string) => void;
  onSelectLead?: (lead: LeadListItem) => void;
  onAddLeadToStage?: (stageId: string) => void;
  isDragging: boolean;
}

export function KanbanColumn({ 
  stage, 
  prevStage,
  nextStage,
  onDragStart, 
  onDrop, 
  onDragOver, 
  onMoveStage,
  onSelectLead,
  onAddLeadToStage,
  isDragging 
}: KanbanColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    setIsDragOver(false);
    onDrop(e);
  };

  return (
    <div 
      className={cn(
        "min-w-[310px] w-[310px] max-w-[310px] flex flex-col h-full bg-card/60 rounded-2xl border transition-all duration-200 shadow-sm",
        isDragOver ? "border-primary ring-2 ring-primary/20 bg-card/90" : "border-border",
        isDragging && !isDragOver ? "border-dashed" : ""
      )}
      onDragOver={onDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Column Header */}
      <div className="p-3 border-b border-border bg-accent/20 rounded-t-2xl">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <div 
              className="w-3 h-3 rounded-full shrink-0 shadow-sm" 
              style={{ backgroundColor: stage.color }} 
            />
            <h3 className="font-bold text-xs text-foreground truncate">{stage.name}</h3>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onAddLeadToStage?.(stage.id)}
              className="w-5 h-5 rounded-md hover:bg-primary/20 text-muted-foreground hover:text-primary flex items-center justify-center transition-colors"
              title={`Adicionar oportunidade em ${stage.name}`}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <span className="bg-background text-[11px] px-2 py-0.2 rounded-full font-bold border border-border text-foreground">
              {stage.leads.length}
            </span>
          </div>
        </div>

        <div className="text-[11px] text-muted-foreground font-mono font-semibold">
          {formatCurrency(stage.totalValue || 0)}
        </div>
      </div>
      
      {/* Cards List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2.5">
        {stage.leads.map((lead) => (
          <KanbanCard 
            key={lead.id} 
            lead={lead} 
            currentStageId={stage.id}
            prevStage={prevStage}
            nextStage={nextStage}
            onDragStart={(e) => onDragStart(e, lead.id)} 
            onMoveStage={onMoveStage}
            onSelectLead={onSelectLead}
          />
        ))}
        {stage.leads.length === 0 && (
          <div className="h-28 flex flex-col items-center justify-center border-2 border-dashed border-border/80 rounded-xl text-xs text-muted-foreground gap-1 p-4 text-center">
            <span className="text-base">📋</span>
            <span>Nenhum lead nesta etapa</span>
            <button
              type="button"
              onClick={() => onAddLeadToStage?.(stage.id)}
              className="text-[10px] text-primary hover:underline font-bold mt-0.5"
            >
              + Adicionar lead aqui
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
