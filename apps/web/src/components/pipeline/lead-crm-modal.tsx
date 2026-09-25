'use client';

import { useState, useEffect } from 'react';
import { LeadListItem, SCORE_COLORS } from '@radar/types';
import { PIPELINE_STAGES, useUpdatePipelineLead, useMoveLead } from '@/hooks/use-pipeline';
import { useDeleteLead } from '@/hooks/use-leads';
import { formatCurrency } from '@/lib/utils';
import { formatBrazilianPhone, toWhatsAppJidDigits } from '@/lib/phone-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { 
  X, 
  Building, 
  User, 
  Phone, 
  MapPin, 
  DollarSign, 
  Tag, 
  FileText, 
  Trash2, 
  Calendar, 
  ExternalLink,
  Save,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';

interface LeadCrmModalProps {
  lead: LeadListItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function LeadCrmModal({ lead, isOpen, onClose }: LeadCrmModalProps) {
  const confirm = useConfirm();
  const { mutate: updateLead, isPending: isUpdating } = useUpdatePipelineLead();
  const { mutate: moveLead } = useMoveLead();
  const { mutate: deleteLead } = useDeleteLead();

  const [form, setForm] = useState({
    name: '',
    contactName: '',
    phone: '',
    potentialValue: 0,
    priority: 'HIGH' as 'HIGH' | 'MEDIUM' | 'LOW',
    pipelineStageId: 'stage-1',
    notes: '',
  });

  useEffect(() => {
    if (lead) {
      const currentStageId = (lead as any).pipelineStageId || 
        PIPELINE_STAGES.find(s => s.status === lead.status)?.id || 'stage-1';

      setForm({
        name: lead.name || '',
        contactName: (lead as any).contactName || '',
        phone: (lead as any).phone || (lead as any).contacts?.[0]?.value || '',
        potentialValue: Number(lead.potentialValue) || 2500,
        priority: (lead.priority || 'HIGH') as any,
        pipelineStageId: currentStageId,
        notes: (lead as any).notes || '',
      });
    }
  }, [lead]);

  if (!isOpen || !lead) return null;

  const currentStage = PIPELINE_STAGES.find(s => s.id === form.pipelineStageId) || PIPELINE_STAGES[0];
  const scoreTotal = lead.score?.total || 0;
  const scoreColor = SCORE_COLORS[lead.score?.level || 'LOW'] || '#3B82F6';

  const rawPhone = form.phone.replace(/\D/g, '');
  const cleanDigits = toWhatsAppJidDigits(rawPhone);
  const firstName = (form.contactName || form.name).split(' ')[0];
  const defaultWhatsAppMessage = encodeURIComponent(
    `Olá ${firstName}! Tudo bem?\n\nAqui é o Weverton da WCTech. Estou entrando em contato sobre a proposta e soluções para a ${form.name}.\n\nPodemos conversar um instante?`
  );
  const whatsappUrl = cleanDigits ? `https://wa.me/${cleanDigits}?text=${defaultWhatsAppMessage}` : null;

  const handleSave = () => {
    if (!form.name.trim()) {
      toast.error('O nome da empresa não pode ficar vazio.');
      return;
    }

    updateLead({
      id: lead.id,
      data: {
        name: form.name.trim(),
        contactName: form.contactName.trim(),
        phone: formatBrazilianPhone(form.phone),
        potentialValue: Number(form.potentialValue) || 0,
        priority: form.priority,
        pipelineStageId: form.pipelineStageId,
        notes: form.notes.trim(),
      },
    });

    onClose();
  };

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: 'Excluir Oportunidade do Pipeline',
      description: `Deseja realmente excluir "${lead.name}"? Esta ação removerá o lead da pipeline.`,
      confirmText: 'Sim, Excluir',
      cancelText: 'Cancelar',
      variant: 'danger',
      icon: 'trash',
    });

    if (confirmed) {
      deleteLead(lead.id);
      toast.success('Lead removido do pipeline!');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header com indicador de score e estágio */}
        <div className="p-4 sm:p-5 border-b border-border bg-accent/20 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 border shadow-sm"
              style={{ borderColor: scoreColor, color: scoreColor, backgroundColor: `${scoreColor}15` }}
              title={`Score: ${scoreTotal} pts`}
            >
              {scoreTotal}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-foreground truncate">{lead.name}</h2>
                <span 
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
                  style={{ backgroundColor: `${currentStage.color}20`, color: currentStage.color }}
                >
                  ● {currentStage.name}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1 truncate">
                <MapPin className="w-3 h-3 shrink-0" />
                <span>{(lead.address as any)?.formattedAddress || `${lead.address?.city || 'Manaus'} - ${lead.address?.state || 'AM'}`}</span>
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo com Grid de Gestão CRM */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {/* Seletor Rápido de Estágio no Pipeline */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <ArrowRight className="w-3.5 h-3.5 text-primary" />
              Etapa Atual no Funil Comercial
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {PIPELINE_STAGES.map((s) => {
                const isSelected = form.pipelineStageId === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setForm({ ...form, pipelineStageId: s.id })}
                    className={`px-2.5 py-2 rounded-xl text-xs font-bold text-left transition border flex items-center gap-1.5 truncate ${
                      isSelected
                        ? 'border-primary bg-primary/10 text-primary shadow-sm'
                        : 'border-border bg-background hover:bg-secondary text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <span 
                      className="w-2 h-2 rounded-full shrink-0" 
                      style={{ backgroundColor: s.color }} 
                    />
                    <span className="truncate">{s.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dados Financeiros e de Contato */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                Valor da Venda / Proposta (R$)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-muted-foreground font-mono">R$</span>
                <Input
                  type="number"
                  value={form.potentialValue}
                  onChange={(e) => setForm({ ...form, potentialValue: Number(e.target.value) || 0 })}
                  className="pl-9 h-9 text-xs font-mono font-bold bg-background"
                  placeholder="2500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                Prioridade da Oportunidade
              </label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value as any })}
                className="w-full h-9 rounded-md bg-background border border-border px-3 text-xs font-semibold text-foreground"
              >
                <option value="HIGH">🔥 Alta Prioridade</option>
                <option value="MEDIUM">⚡ Média Prioridade</option>
                <option value="LOW">⏳ Baixa Prioridade</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                Nome do Decisor / Contato
              </label>
              <Input
                type="text"
                value={form.contactName}
                onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                className="h-9 text-xs bg-background"
                placeholder="Ex: João Silva (Gerente)"
              />
            </div>
          </div>

          {/* Telefone & WhatsApp Action */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                Telefone / WhatsApp Comercial
              </label>
              <Input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="h-9 text-xs font-mono bg-background"
                placeholder="(92) 99999-9999"
              />
            </div>

            <div>
              {whatsappUrl ? (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full h-9 px-3 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow transition"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Conversar no WhatsApp Agora</span>
                </a>
              ) : (
                <Button disabled className="w-full h-9 text-xs opacity-50">
                  Sem telefone cadastrado
                </Button>
              )}
            </div>
          </div>

          {/* Anotações da Negociação (CRM Notes) */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-primary" />
                Anotações e Histórico da Negociação (CRM)
              </span>
              <span className="text-[10px] text-muted-foreground">Visível em toda a equipe</span>
            </label>
            <textarea
              rows={4}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Descreva aqui o briefing, equipamentos solicitados, preferências do cliente, prazos acordados ou próximos passos..."
              className="w-full rounded-xl bg-background border border-border p-3 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Atalhos Rápidos para Proposta e Visita */}
          <div className="p-3 rounded-xl bg-secondary/50 border border-border flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground font-medium">Ações Comerciais Rápidas:</span>
            <div className="flex items-center gap-2">
              <Link href={`/proposals?leadId=${lead.id}`}>
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 border-border bg-card">
                  <FileText className="w-3.5 h-3.5 text-blue-400" />
                  Gerar Proposta
                </Button>
              </Link>
              <Link href={`/visits?leadId=${lead.id}`}>
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 border-border bg-card">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  Agendar Visita
                </Button>
              </Link>
              <Link href={`/leads/${lead.id}`}>
                <Button variant="ghost" size="sm" className="h-8 text-xs gap-1 text-muted-foreground hover:text-foreground">
                  <span>Ver Ficha Completa</span>
                  <ExternalLink className="w-3 h-3" />
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Rodapé com Salvar e Excluir */}
        <div className="p-4 border-t border-border bg-accent/10 flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            className="text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10 gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Excluir Lead
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs h-9"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={isUpdating}
              className="text-xs h-9 bg-primary hover:bg-primary/90 font-bold gap-1.5 shadow"
            >
              <Save className="w-3.5 h-3.5" />
              {isUpdating ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
