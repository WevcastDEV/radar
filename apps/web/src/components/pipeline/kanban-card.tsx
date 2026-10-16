'use client';

import { LeadListItem, PipelineStageData, SCORE_COLORS } from '@radar/types';
import { Card } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { formatBrazilianPhone, toWhatsAppJidDigits } from '@/lib/phone-utils';
import { Phone, ChevronRight, ChevronLeft, MapPin, Building, User, FileText, Sparkles, MessageSquare } from 'lucide-react';
import Link from 'next/link';

interface KanbanCardProps {
  lead: LeadListItem;
  currentStageId: string;
  prevStage?: PipelineStageData;
  nextStage?: PipelineStageData;
  allStages?: PipelineStageData[];
  onDragStart: (e: React.DragEvent) => void;
  onMoveStage?: (leadId: string, targetStageId: string) => void;
  onSelectLead?: (lead: LeadListItem) => void;
}

export function KanbanCard({ 
  lead, 
  currentStageId,
  prevStage,
  nextStage,
  allStages,
  onDragStart,
  onMoveStage,
  onSelectLead,
}: KanbanCardProps) {
  const priorityColor = SCORE_COLORS[lead.score?.level || 'LOW'] || '#3B82F6';
  
  // Format WhatsApp number
  const phoneVal = (lead as any).phone || (lead as any).contacts?.[0]?.value || '';
  const rawDigits = phoneVal.replace(/\D/g, '');
  const cleanDigits = toWhatsAppJidDigits(rawDigits);
  const firstName = ((lead as any).contactName || lead.name).split(' ')[0];
  const defaultWhatsAppMessage = encodeURIComponent(
    `Olá ${firstName}! Tudo bem? Gostaria de falar sobre as propostas e soluções para a ${lead.name}.`
  );
  const chatUrl = `/chat-comercial?phone=${cleanDigits || (lead.phone ? lead.phone.replace(/\D/g, '') : lead.id)}&name=${encodeURIComponent(lead.name)}&text=${defaultWhatsAppMessage}`;
  const notesText = (lead as any).notes;
  const contactName = (lead as any).contactName;

  return (
    <Card 
      className="p-3 cursor-pointer hover:border-primary/50 transition-all bg-card relative overflow-hidden group shadow-sm hover:shadow-md select-none"
      draggable
      onDragStart={onDragStart}
      onClick={() => onSelectLead?.(lead)}
    >
      {/* Barra de Prioridade Lateral */}
      <div 
        className="absolute left-0 top-0 bottom-0 w-1.5" 
        style={{ backgroundColor: priorityColor }} 
      />
      
      <div className="pl-2 space-y-2">
        {/* Topo: Nome da Empresa */}
        <div className="flex justify-between items-start gap-1">
          <div className="min-w-0 flex-1">
            <h4 
              className="font-bold text-xs text-foreground group-hover:text-primary transition-colors truncate"
              title={lead.name}
            >
              {lead.name}
            </h4>
            {contactName && (
              <p className="text-[10px] text-muted-foreground flex items-center gap-1 truncate mt-0.5">
                <User className="w-2.5 h-2.5 shrink-0 text-muted-foreground/70" />
                <span className="truncate">{contactName}</span>
              </p>
            )}
          </div>
        </div>
        
        {/* Badges de Segmento e Cidade */}
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
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 truncate max-w-[130px]">
              <MapPin className="w-2.5 h-2.5 shrink-0 text-muted-foreground/70" />
              <span className="truncate">{lead.address.city}</span>
            </span>
          )}
        </div>

        {/* Prévia de Anotações CRM se existirem */}
        {notesText && (
          <div 
            className="text-[10px] text-muted-foreground/90 bg-accent/30 rounded-md px-2 py-1 flex items-start gap-1 line-clamp-1 border border-border/50"
            title={notesText}
          >
            <FileText className="w-2.5 h-2.5 shrink-0 mt-0.5 text-primary/80" />
            <span className="truncate">{notesText}</span>
          </div>
        )}

        {/* Contato Direto e Botão WhatsApp / Chat Comercial */}
        <div className="flex justify-between items-center pt-1 border-t border-border/60 text-xs gap-1">
          <div className="text-[11px] font-mono text-foreground font-semibold truncate flex items-center gap-1">
            <Phone className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
            <span className="truncate">{formatBrazilianPhone(phoneVal) || 'Sem telefone'}</span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Atalho direto para atendimento no Chat Comercial da plataforma */}
            <Link
              href={chatUrl}
              onClick={(e) => e.stopPropagation()}
              className="px-2.5 py-1 rounded-md bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-400 hover:text-emerald-300 text-[10px] font-bold flex items-center gap-1.5 transition-all border border-emerald-500/25 shadow-xs"
              title="Abrir mensagem no Chat Comercial da plataforma"
            >
              <MessageSquare className="w-3 h-3" />
              <span>Chat Comercial</span>
            </Link>
          </div>
        </div>

        {/* Seletor Rápido de Etapa no Funil (Sem precisar arrastar horizontalmente) */}
        <div className="pt-1.5 border-t border-border/40 space-y-1.5">
          {allStages && allStages.length > 0 && (
            <div className="flex items-center gap-1.5 w-full" onClick={(e) => e.stopPropagation()}>
              <span className="text-[9px] text-muted-foreground font-semibold shrink-0">Etapa:</span>
              <select
                value={currentStageId}
                onChange={(e) => {
                  e.stopPropagation();
                  onMoveStage?.(lead.id, e.target.value);
                }}
                className="h-6 rounded bg-background border border-border px-1.5 text-[10px] text-foreground font-bold flex-1 cursor-pointer hover:border-primary/50 transition-colors"
                style={{
                  color: allStages.find(s => s.id === currentStageId)?.color || '#3B82F6'
                }}
              >
                {allStages.map((s) => (
                  <option key={s.id} value={s.id} className="text-foreground bg-background">
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center justify-between gap-1 text-[10px]">
            {prevStage ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveStage?.(lead.id, prevStage.id);
                }}
                className="px-1.5 py-0.5 rounded bg-secondary hover:bg-accent text-muted-foreground hover:text-foreground flex items-center gap-0.5 transition-colors border border-border/50 text-[10px]"
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
                className="px-2 py-0.5 rounded bg-primary/10 hover:bg-primary/20 text-primary font-bold flex items-center gap-0.5 transition-colors ml-auto shadow-sm border border-primary/30 text-[10px]"
                title={`Avançar para: ${nextStage.name}`}
              >
                <span className="truncate max-w-[85px]">{nextStage.name}</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            ) : (
              <span className="text-[9px] text-emerald-400 font-bold ml-auto px-1.5 py-0.5 bg-emerald-500/10 rounded border border-emerald-500/30">
                ✓ Ganho / Fechado
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
