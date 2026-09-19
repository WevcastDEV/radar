'use client';

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { AlertTriangle, AlertCircle, HelpCircle, Trash2, X } from 'lucide-react';
import { Button } from './button';

export interface ConfirmOptions {
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  icon?: 'trash' | 'alert' | 'help';
}

interface ConfirmContextType {
  confirm: (options?: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({});
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts?: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setOptions(opts || {});
      setIsOpen(true);
    });
  }, []);

  const handleConfirm = () => {
    setIsOpen(false);
    if (resolverRef.current) {
      resolverRef.current(true);
      resolverRef.current = null;
    }
  };

  const handleCancel = () => {
    setIsOpen(false);
    if (resolverRef.current) {
      resolverRef.current(false);
      resolverRef.current = null;
    }
  };

  // Suporte a tecla ESC para cancelar e fechar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const variant = options.variant || 'danger';
  const confirmText = options.confirmText || (variant === 'danger' ? 'Excluir' : 'Confirmar');
  const cancelText = options.cancelText || 'Cancelar';

  const renderIcon = () => {
    if (options.icon === 'trash' || variant === 'danger') {
      return (
        <div className="w-12 h-12 rounded-2xl bg-destructive/15 text-destructive border border-destructive/30 flex items-center justify-center shadow-lg shadow-destructive/10 shrink-0">
          <Trash2 className="w-6 h-6 animate-in zoom-in-50 duration-200" />
        </div>
      );
    }
    if (variant === 'warning') {
      return (
        <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-lg shadow-amber-500/10 shrink-0">
          <AlertCircle className="w-6 h-6 animate-in zoom-in-50 duration-200" />
        </div>
      );
    }
    return (
      <div className="w-12 h-12 rounded-2xl bg-primary/15 text-primary border border-primary/30 flex items-center justify-center shadow-lg shadow-primary/10 shrink-0">
        <HelpCircle className="w-6 h-6 animate-in zoom-in-50 duration-200" />
      </div>
    );
  };

  const getConfirmButtonClasses = () => {
    if (variant === 'danger') {
      return 'bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold shadow-md shadow-destructive/20';
    }
    if (variant === 'warning') {
      return 'bg-amber-600 hover:bg-amber-500 text-white font-semibold shadow-md shadow-amber-600/20';
    }
    return 'bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-md shadow-primary/20';
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}

      {isOpen && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={handleCancel}
          role="dialog"
          aria-modal="true"
        >
          <div 
            className="bg-card border border-border/80 rounded-2xl max-w-md w-full p-6 shadow-2xl shadow-black/80 relative overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col gap-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top decorative glow bar based on variant */}
            <div 
              className={`absolute top-0 left-0 right-0 h-1 ${
                variant === 'danger' 
                  ? 'bg-destructive shadow-[0_0_12px_rgba(239,68,68,0.8)]' 
                  : variant === 'warning' 
                  ? 'bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.8)]' 
                  : 'bg-primary shadow-[0_0_12px_rgba(59,130,246,0.8)]'
              }`} 
            />

            {/* Close X button */}
            <button
              onClick={handleCancel}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-accent/40 transition-colors"
              title="Fechar (ESC)"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header with Icon and Text */}
            <div className="flex items-start gap-4 pr-6">
              {renderIcon()}
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-foreground leading-snug">
                  {options.title || 'Tem certeza?'}
                </h3>
                {options.description && (
                  <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed break-words">
                    {options.description}
                  </p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border/50">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                className="h-9 px-4 text-xs font-medium border-border/80 hover:bg-accent/50 text-foreground"
              >
                {cancelText}
              </Button>
              <Button
                size="sm"
                onClick={handleConfirm}
                className={`h-9 px-5 text-xs ${getConfirmButtonClasses()}`}
                autoFocus
              >
                {confirmText}
              </Button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm deve ser utilizado dentro de um ConfirmDialogProvider');
  }
  return context.confirm;
}
