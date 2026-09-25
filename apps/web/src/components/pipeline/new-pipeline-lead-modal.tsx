'use client';

import { useState, useEffect } from 'react';
import { PIPELINE_STAGES, useCreatePipelineLead } from '@/hooks/use-pipeline';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatBrazilianPhone } from '@/lib/phone-utils';
import { X, Plus, Building, User, Phone, DollarSign, Tag, FileText, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

interface NewPipelineLeadModalProps {
  isOpen: boolean;
  initialStageId?: string;
  onClose: () => void;
}

export function NewPipelineLeadModal({ isOpen, initialStageId, onClose }: NewPipelineLeadModalProps) {
  const { mutate: createLead, isPending } = useCreatePipelineLead();

  const [name, setName] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [potentialValue, setPotentialValue] = useState<number | string>(2500);
  const [stageId, setStageId] = useState('stage-1');
  const [priority, setPriority] = useState<'HIGH' | 'MEDIUM' | 'LOW'>('HIGH');
  const [city, setCity] = useState('Manaus');
  const [state, setState] = useState('AM');
  const [segment, setSegment] = useState('CFTV & Segurança Eletrônica');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (initialStageId) {
      setStageId(initialStageId);
    }
  }, [initialStageId, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Informe o nome da empresa ou cliente');
      return;
    }

    createLead({
      name: name.trim(),
      contactName: contactName.trim(),
      phone: formatBrazilianPhone(phone),
      potentialValue: Number(potentialValue) || 2500,
      stageId,
      priority,
      city: city.trim() || 'Manaus',
      state: state.trim() || 'AM',
      segment: segment.trim(),
      notes: notes.trim(),
    });

    // Reset form
    setName('');
    setContactName('');
    setPhone('');
    setPotentialValue(2500);
    setNotes('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-border bg-accent/20 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Nova Oportunidade no CRM</h2>
              <p className="text-xs text-muted-foreground">Cadastre um cliente direto no seu fluxo CRM</p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-3.5 overflow-y-auto flex-1">
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">
              Nome da Empresa / Estabelecimento *
            </label>
            <Input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9 text-xs bg-background"
              placeholder="Ex: Comercial Amazônia ou Dr. Carlos"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                Nome do Contato / Decisor
              </label>
              <Input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="h-9 text-xs bg-background"
                placeholder="Ex: Carlos Mendes"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                Telefone / WhatsApp Comercial
              </label>
              <Input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-9 text-xs font-mono bg-background"
                placeholder="(92) 99999-9999"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                Etapa Inicial no Funil
              </label>
              <select
                value={stageId}
                onChange={(e) => setStageId(e.target.value)}
                className="w-full h-9 rounded-md bg-background border border-border px-3 text-xs font-semibold text-foreground cursor-pointer"
              >
                {PIPELINE_STAGES.map((s) => (
                  <option key={s.id} value={s.id}>
                    ● {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                Valor Estimado da Oportunidade
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-muted-foreground font-mono">R$</span>
                <Input
                  type="number"
                  value={potentialValue}
                  onChange={(e) => setPotentialValue(e.target.value)}
                  className="pl-9 h-9 text-xs font-mono font-bold bg-background"
                  placeholder="2500"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1">
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                Prioridade
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full h-9 rounded-md bg-background border border-border px-3 text-xs font-semibold text-foreground cursor-pointer"
              >
                <option value="HIGH">🔥 Alta</option>
                <option value="MEDIUM">⚡ Média</option>
                <option value="LOW">⏳ Baixa</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                Segmento / Solução
              </label>
              <Input
                type="text"
                value={segment}
                onChange={(e) => setSegment(e.target.value)}
                className="h-9 text-xs bg-background"
                placeholder="Ex: CFTV, Alarme, Comércio, Padaria"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                Cidade
              </label>
              <Input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="h-9 text-xs bg-background"
                placeholder="Manaus"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                Estado (UF)
              </label>
              <Input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="h-9 text-xs bg-background uppercase font-bold"
                maxLength={2}
                placeholder="AM"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">
              Observações Iniciais / Briefing
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Cliente tem interesse em pacote completo de 8 câmeras com acesso remoto..."
              className="w-full rounded-xl bg-background border border-border p-2.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Botões */}
          <div className="pt-2 flex items-center justify-end gap-2">
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
              type="submit"
              size="sm"
              disabled={isPending}
              className="text-xs h-9 bg-primary hover:bg-primary/90 font-bold gap-1.5 shadow"
            >
              <Plus className="w-3.5 h-3.5" />
              {isPending ? 'Cadastrando...' : 'Adicionar ao CRM'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
