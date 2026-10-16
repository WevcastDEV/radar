'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  MessageSquare, 
  Flame, 
  History, 
  Users, 
  Bot, 
  ShieldAlert, 
  Sparkles,
  Loader2,
  X
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { safeWhatsAppClient } from '@/app/(dashboard)/whatsapp/whatsapp-client';

interface ResetClientHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ResetClientHistoryModal({
  isOpen,
  onClose,
  onSuccess,
}: ResetClientHistoryModalProps) {
  const [clearCrmLeads, setClearCrmLeads] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [typedConfirm, setTypedConfirm] = useState('');

  if (!isOpen) return null;

  const handleConfirmReset = async () => {
    if (typedConfirm.trim().toUpperCase() !== 'RESET') {
      toast.error('Digite RESET no campo abaixo para confirmar a exclusão.');
      return;
    }

    setIsResetting(true);
    const toastId = toast.loading('Limpando todo o histórico de clientes e preparando sistema...');

    try {
      const res = await safeWhatsAppClient.post('/reset-client-history', {
        clearCrmLeads,
      });

      // Limpa dados residuais no localStorage do navegador
      if (typeof window !== 'undefined') {
        localStorage.removeItem('radar_whatsapp_dispatched_history');
        localStorage.removeItem('whatsapp_dispatched_history');
        localStorage.removeItem('radar_whatsapp_selected_leads');
        
        if (clearCrmLeads) {
          import('@/lib/backup-manager').then(({ clearAllSystemData }) => {
            clearAllSystemData();
            window.dispatchEvent(new CustomEvent('leads_updated'));
            window.dispatchEvent(new CustomEvent('customers_updated'));
            window.dispatchEvent(new CustomEvent('visits_updated'));
          });
        }
      }

      toast.success(
        res?.data?.message || 'Todo o histórico de clientes foi limpo com sucesso! Sistema pronto para a empresa.',
        { id: toastId, duration: 3000 }
      );

      setTypedConfirm('');
      onSuccess?.();
      onClose();

      // Força um reload para limpar o cache em memória do React Query e estado local
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Erro ao resetar histórico.', { id: toastId });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div 
        className="bg-card w-full max-w-lg rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="p-5 border-b border-border bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-transparent flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600/20 text-rose-500 flex items-center justify-center border border-rose-500/30 shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-foreground">Reset para Nova Empresa</h3>
                <Badge variant="outline" className="text-[10px] border-rose-500/40 text-rose-400 font-bold">
                  Entrega Limpa
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Limpa dados e conversas acumuladas para entregar o sistema zerado à empresa contratante.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isResetting}
            className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-accent transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200/90 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-amber-300">
                Esta ação remove permanentemente dados de atendimento acumulados durante testes.
              </p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Suas configurações de sistema, usuários, robôs e modelos de mensagens rápidas <strong>serão preservados intactos</strong>.
              </p>
            </div>
          </div>

          {/* O que será limpo */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              O que será resetado e zerado:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div className="p-2.5 rounded-lg border border-border bg-accent/30 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Conversas & mensagens trocadas</span>
              </div>
              <div className="p-2.5 rounded-lg border border-border bg-accent/30 flex items-center gap-2">
                <Flame className="w-4 h-4 text-red-400 shrink-0" />
                <span>Leads Quentes & notificações</span>
              </div>
              <div className="p-2.5 rounded-lg border border-border bg-accent/30 flex items-center gap-2">
                <History className="w-4 h-4 text-blue-400 shrink-0" />
                <span>Histórico de disparos de teste</span>
              </div>
              <div className="p-2.5 rounded-lg border border-border bg-accent/30 flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Contatos & números atendidos</span>
              </div>
              <div className="p-2.5 rounded-lg border border-border bg-accent/30 flex items-center gap-2">
                <Bot className="w-4 h-4 text-purple-400 shrink-0" />
                <span>Sessões em andamento do robô</span>
              </div>
              <div className="p-2.5 rounded-lg border border-border bg-accent/30 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-teal-400 shrink-0" />
                <span>Áudios transcritos & notas</span>
              </div>
            </div>
          </div>

          {/* Checkbox Opcional CRM Leads */}
          <label className="flex items-start gap-3 p-3 rounded-xl border border-border bg-accent/20 cursor-pointer hover:bg-accent/40 transition-colors select-none">
            <input
              type="checkbox"
              checked={clearCrmLeads}
              onChange={(e) => setClearCrmLeads(e.target.checked)}
              className="mt-0.5 rounded border-border text-rose-600 focus:ring-rose-500 w-4 h-4 cursor-pointer"
            />
            <div className="space-y-0.5">
              <span className="font-semibold text-foreground text-xs block">
                Zerar também os Leads e Oportunidades do CRM (Recomendado para empresa nova)
              </span>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Apaga os leads de prospecção criados durante os testes para a nova empresa começar com a lista de clientes 100% limpa.
              </p>
            </div>
          </label>

          {/* Campo de confirmação */}
          <div className="pt-2 border-t border-border space-y-1.5">
            <label className="text-[11px] font-medium text-muted-foreground">
              Digite <strong className="text-rose-400 font-bold">RESET</strong> para liberar a limpeza:
            </label>
            <input
              type="text"
              placeholder="Digite RESET"
              value={typedConfirm}
              onChange={(e) => setTypedConfirm(e.target.value)}
              className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs font-mono uppercase tracking-wider focus:outline-hidden focus:border-rose-500"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border bg-muted/20 flex items-center justify-end gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isResetting}
            className="text-xs"
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleConfirmReset}
            disabled={isResetting || typedConfirm.trim().toUpperCase() !== 'RESET'}
            className="text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white gap-1.5 shadow-sm"
          >
            {isResetting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Resetando dados...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirmar e Limpar Histórico</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
