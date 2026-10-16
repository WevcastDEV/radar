'use client';

import React from 'react';
import { Palette, Check, Sparkles, X, Bell, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface ChatAlertColorOption {
  id: string;
  name: string;
  hex: string;
  desc: string;
}

export const CHAT_ALERT_PRESETS: ChatAlertColorOption[] = [
  { id: 'orange', name: 'Laranja (Padrão Oficial)', hex: '#f97316', desc: 'Vibrante e chamativo para atendimento ágil' },
  { id: 'emerald', name: 'Verde Esmeralda', hex: '#10b981', desc: 'Tom clássico e limpo do WhatsApp' },
  { id: 'blue', name: 'Azul Elétrico', hex: '#3b82f6', desc: 'Estilo executivo e corporativo' },
  { id: 'violet', name: 'Roxo / Violeta', hex: '#8b5cf6', desc: 'Moderno, elegante e inovador' },
  { id: 'rose', name: 'Vermelho / Coral', hex: '#ef4444', desc: 'Máxima prioridade e alerta urgente' },
  { id: 'amber', name: 'Dourado / Âmbar', hex: '#f59e0b', desc: 'Tom premium ouro reluzente' },
  { id: 'pink', name: 'Rosa Choque', hex: '#ec4899', desc: 'Alto contraste visual e destaque' },
  { id: 'cyan', name: 'Ciano Neon', hex: '#06b6d4', desc: 'Claro, luminoso e futurista' },
];

export interface ChatAlertColorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentColor: string;
  onSelectColor: (hex: string) => void;
  onTestAlert: () => void;
  isTesting?: boolean;
}

export function ChatAlertColorModal({
  isOpen,
  onClose,
  currentColor,
  onSelectColor,
  onTestAlert,
  isTesting = false
}: ChatAlertColorModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-border bg-muted/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 transition-colors shadow-xs"
              style={{
                backgroundColor: `${currentColor}15`,
                borderColor: `${currentColor}40`,
                color: currentColor
              }}
            >
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                Cor do Alerta de Mensagem
              </h2>
              <p className="text-xs text-muted-foreground">
                Personalize a cor que pisca ao lado de Atendimentos quando chegar mensagem nova.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Preview Box */}
        <div className="p-4 bg-accent/20 border-b border-border space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
            Prévia ao Vivo do Alerta
          </span>
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-card border border-border shadow-xs">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold text-foreground">Atendimentos</span>
            </div>

            {/* Blinking Badge Preview */}
            <div 
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider animate-pulse border transition-all"
              style={{
                backgroundColor: `${currentColor}20`,
                borderColor: `${currentColor}70`,
                color: currentColor,
                boxShadow: `0 0 14px ${currentColor}60`
              }}
            >
              <span className="relative flex h-2.5 w-2.5">
                <span 
                  className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-80"
                  style={{ backgroundColor: currentColor }}
                />
                <span 
                  className="relative inline-flex rounded-full h-2.5 w-2.5"
                  style={{ backgroundColor: currentColor }}
                />
              </span>
              <span>1 Nova Mensagem</span>
            </div>
          </div>
        </div>

        {/* Color Palette List */}
        <div className="p-4 space-y-2 overflow-y-auto max-h-[50vh]">
          <label className="text-xs font-bold text-muted-foreground block mb-1">
            Selecione a Cor Desejada:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {CHAT_ALERT_PRESETS.map((preset) => {
              const isSelected = currentColor.toLowerCase() === preset.hex.toLowerCase();
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onSelectColor(preset.hex)}
                  className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between gap-3 cursor-pointer ${
                    isSelected
                      ? 'bg-accent border-primary ring-2 ring-primary/40 shadow-xs'
                      : 'bg-card border-border hover:bg-accent/60 hover:border-primary/40'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span 
                      className="w-5 h-5 rounded-full shrink-0 shadow-xs border border-white/20 flex items-center justify-center"
                      style={{ backgroundColor: preset.hex }}
                    >
                      {isSelected && <Check className="w-3 h-3 text-white stroke-[3]" />}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">
                        {preset.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {preset.desc}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/20 flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onTestAlert}
            className="text-xs h-9 gap-1.5 font-semibold text-muted-foreground hover:text-foreground"
            title="Disparar teste piscante por 5 segundos"
          >
            <Bell className={`w-3.5 h-3.5 ${isTesting ? 'animate-bounce text-primary' : ''}`} />
            <span>{isTesting ? 'Piscando...' : 'Testar Alerta (5s)'}</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={onClose}
            className="text-xs h-9 px-5 font-bold bg-primary text-primary-foreground shadow-sm cursor-pointer"
          >
            <Check className="w-3.5 h-3.5 mr-1" />
            Salvar & Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}
