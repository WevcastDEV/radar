'use client';

import { LeadListItem, PipelineStageData } from '@radar/types';
import { Card } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { SCORE_COLORS } from '@radar/types';
import { Phone, ChevronRight, ChevronLeft, ExternalLink, MapPin, Building } from 'lucide-react';
import Link from 'next/link';

interface KanbanCardProps {
  lead: LeadListItem;
  currentStageId: string;
  prevStage?: PipelineStageData;
  nextStage?: PipelineStageData;
  onDragStart: (e: React.DragEvent) => void;
  onMoveStage?: (leadId: string, targetStageId: string) => void;
}

export function KanbanCard({ 
  lead, 
  currentStageId,
  prevStage,
  nextStage,
  onDragStart,
  onMoveStage 
}: KanbanCardProps) {
  const priorityColor = SCORE_COLORS[lead.score?.level || 'LOW'] || '#3B82F6';
  
  // Format WhatsApp number
  const rawPhone = ((lead as any).phone || '').replace(/\D/g, '');
  const cleanPhone = rawPhone.length === 10 || rawPhone.length === 11 ? `55${rawPhone}` : rawPhone;
  const whatsappUrl = cleanPhone ? `https://wa.me/${cleanPhone}` : null;

  return (
    <Card 
      className="p-3 cursor-grab active:cursor-grabbing hover:border-primary/50 transition-all bg-card relative overflow-hidden group shadow-sm hover:shadow-md"
      draggable
      onDragStart={onDragStart}
    >
      {/* Priority Indicator Bar */}
      <div 
        className="absolute left-0 top-0 bottom-0 w-1" 
        style={{ backgroundColor: priorityColor }} 
      />
      
      <div className="pl-2 space-y-2">
        {/* Header: Title and Link to Details */}
        <div className="flex justify-between items-start gap-1">
          <Link 
            href={`/leads/${lead.id}`}
            className="font-bold text-xs text-foreground hover:text-primary transition-colors truncate max-w-[85%] flex items-center gap-1"
            title="Ver detalhes do lead"
          >
            <span>{lead.name}</span>
            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          </Link>

          <div 
            className="w-5 h-5 rounded-full border flex items-center justify-center text-[9px] font-black shrink-0"
            style={{ borderColor: priorityColor, color: priorityColor }}
            title={`Score do Lead: ${lead.score?.total || 0} pts`}
          >
            {lead.score?.total || 0}
          </div>
        </div>
        
        {/* Category Badge & Address */}
        <div className="flex flex-wrap items-center gap-1.5">
          {lead.segment && (
            <span 
              className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider inline-block"
              style={{ 
                backgroundColor: lead.segment.color ? `${lead.segment.color}20` : 'rgba(59, 130, 246, 0.15)', 
                color: lead.segment.color || '#3B82F6' 
              }}
            >
              {lead.segment.name}
            </span>
          )}

          {lead.address?.city && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 truncate max-w-[140px]">
              <MapPin className="w-2.5 h-2.5 shrink-0" />
              <span className="truncate">{lead.address.city}</span>
            </span>
          )}
        </div>

        {/* Value and Phone Action */}
        <div className="flex justify-between items-center pt-1 border-t border-border/60 text-xs">
          <div className="font-bold text-foreground font-mono">
            {formatCurrency(lead.potentialValue || 0)}
          </div>

          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="px-2 py-0.5 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-500 text-[10px] font-bold flex items-center gap-1 transition-colors"
              title="Abrir conversa no WhatsApp"
            >
              <Phone className="w-2.5 h-2.5" />
              <span>WhatsApp</span>
            </a>
          )}
        </div>

        {/* Quick Stage Progression Buttons */}
        <div className="flex items-center justify-between gap-1 pt-1.5 border-t border-border/40 text-[10px]">
          {prevStage ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onMoveStage?.(lead.id, prevStage.id);
              }}
              className="px-1.5 py-1 rounded bg-secondary hover:bg-accent text-muted-foreground hover:text-foreground flex items-center gap-0.5 transition-colors"
              title={`Voltar para: ${prevStage.name}`}
            >
              <ChevronLeft className="w-3 h-3" />
              <span className="truncate max-w-[70px]">{prevStage.name}</span>
            </button>
          ) : <div />}

          {nextStage ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onMoveStage?.(lead.id, nextStage.id);
              }}
              className="px-2 py-1 rounded bg-primary/10 hover:bg-primary/20 text-primary font-bold flex items-center gap-0.5 transition-colors ml-auto shadow-sm"
              title={`Avançar para: ${nextStage.name}`}
            >
              <span className="truncate max-w-[85px]">{nextStage.name}</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          ) : (
            <span className="text-[9px] text-emerald-500 font-bold ml-auto px-1.5 py-0.5 bg-emerald-500/10 rounded">
              ✓ Concluído
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}
