'use client';

import React from 'react';
import { 
  X, Eye, EyeOff, SlidersHorizontal, RotateCcw, 
  Sparkles, Check, ChevronDown, ChevronRight 
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NavItem {
  title: string;
  href: string;
  icon?: any;
  badge?: string;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

interface SidebarCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  sections: NavSection[];
  hiddenItems: string[];
  onToggleItem: (href: string) => void;
  onResetAll: () => void;
  onApplyCommercialFocus: () => void;
  collapsedSections: Record<string, boolean>;
  onToggleSectionCollapse: (label: string) => void;
}

export function SidebarCustomizerModal({
  isOpen,
  onClose,
  sections,
  hiddenItems,
  onToggleItem,
  onResetAll,
  onApplyCommercialFocus,
  collapsedSections,
  onToggleSectionCollapse,
}: SidebarCustomizerModalProps) {
  if (!isOpen) return null;

  const totalItems = sections.reduce((acc, s) => acc + s.items.length, 0);
  const hiddenCount = hiddenItems.length;
  const visibleCount = Math.max(0, totalItems - hiddenCount);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-border bg-accent/20 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-xs">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm text-foreground">Personalizar Menu Lateral</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
                  {visibleCount} visíveis · {hiddenCount} ocultos
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Oculte itens ou recolha tópicos para deixar sua barra limpa e focar no que é útil.
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Presets Rápidos */}
        <div className="px-4 py-2.5 bg-accent/30 border-b border-border flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-muted-foreground font-semibold text-[11px]">Atalhos rápidos:</span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onApplyCommercialFocus}
              className="h-7 text-[11px] gap-1.5 border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 font-bold"
              title="Deixa visível apenas Leads, CRM, Chat Comercial, Robô e Metas"
            >
              <Sparkles className="w-3 h-3" />
              Modo Foco Comercial
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onResetAll}
              className="h-7 text-[11px] gap-1 text-muted-foreground hover:text-foreground hover:bg-secondary"
              title="Exibe novamente todas as opções do menu"
            >
              <RotateCcw className="w-3 h-3" />
              Restaurar Padrão
            </Button>
          </div>
        </div>

        {/* Lista de Seções e Itens */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {sections.map((section) => {
            const isCollapsed = !!collapsedSections[section.label];
            const sectionHiddenItems = section.items.filter((item) => hiddenItems.includes(item.href));
            const allSectionHidden = sectionHiddenItems.length === section.items.length;

            return (
              <div 
                key={section.label} 
                className="rounded-xl border border-border bg-card/40 p-3 space-y-2 transition-all hover:border-border/80"
              >
                {/* Header da Seção */}
                <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-border/50">
                  <button
                    type="button"
                    onClick={() => onToggleSectionCollapse(section.label)}
                    className="flex items-center gap-2 text-left group cursor-pointer select-none"
                  >
                    {isCollapsed ? (
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-primary transition" />
                    )}
                    <span className="text-xs font-black uppercase tracking-wider text-foreground">
                      {section.label}
                    </span>
                    {isCollapsed && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-secondary text-muted-foreground font-semibold">
                        Recolhido
                      </span>
                    )}
                  </button>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground font-medium">
                      {section.items.length - sectionHiddenItems.length} de {section.items.length} ativos
                    </span>
                  </div>
                </div>

                {/* Grade de Itens da Seção */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                  {section.items.map((item) => {
                    const isHidden = hiddenItems.includes(item.href);
                    const Icon = item.icon;

                    return (
                      <div
                        key={item.href}
                        onClick={() => onToggleItem(item.href)}
                        className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer select-none transition-all ${
                          isHidden
                            ? 'bg-secondary/20 border-border/40 text-muted-foreground/60 opacity-60 hover:opacity-100 hover:bg-secondary/40'
                            : 'bg-accent/40 border-border text-foreground hover:bg-accent hover:border-primary/40 font-medium'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {Icon && (
                            <Icon className={`w-3.5 h-3.5 shrink-0 ${isHidden ? 'text-muted-foreground' : 'text-primary'}`} />
                          )}
                          <span className={`truncate ${isHidden ? 'line-through text-muted-foreground' : 'font-semibold'}`}>
                            {item.title}
                          </span>
                          {item.badge && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-secondary text-muted-foreground font-mono">
                              {item.badge}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 pl-1">
                          {isHidden ? (
                            <span className="flex items-center gap-1 text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-md font-semibold">
                              <EyeOff className="w-3 h-3 text-rose-400" />
                              Oculto
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-md font-bold">
                              <Eye className="w-3 h-3" />
                              Visível
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Rodapé com botão Concluir */}
        <div className="p-3.5 border-t border-border bg-accent/10 flex items-center justify-between gap-3">
          <p className="text-[11px] text-muted-foreground">
            Suas preferências são gravadas automaticamente no navegador.
          </p>
          <Button
            type="button"
            size="sm"
            onClick={onClose}
            className="text-xs h-8 bg-primary hover:bg-primary/90 font-bold px-4 gap-1.5 shadow"
          >
            <Check className="w-3.5 h-3.5" />
            Concluir
          </Button>
        </div>
      </div>
    </div>
  );
}
