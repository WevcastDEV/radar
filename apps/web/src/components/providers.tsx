'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { useState, useEffect, useRef } from 'react';
import { useToasterStore, resolveValue, toast } from 'react-hot-toast';
import { ConfirmDialogProvider } from '@/components/ui/confirm-dialog';
import { useThemeStore } from '@/stores/theme-store';
import { useBrandingStore } from '@/stores/branding-store';
import { useNotificationStore } from '@/stores/notification-store';

function ThemeInitializer() {
  const initTheme = useThemeStore((s) => s.initTheme);
  useEffect(() => {
    initTheme();
  }, [initTheme]);
  return null;
}

function BrandingInitializer() {
  const initBranding = useBrandingStore((s) => s.initBranding);
  useEffect(() => {
    initBranding();
  }, [initBranding]);
  return null;
}

/**
 * Ponte inteligente: Intercepta qualquer notificação de ação do sistema (toasts)
 * e redireciona silenciosamente para o Sininho de Notificações.
 * NENHUM popup flutuante sobrepõe a tela ou botões do sistema.
 */
function ToastToBellSync() {
  const { toasts } = useToasterStore();
  const addNotification = useNotificationStore((s) => s.addNotification);
  const loadFromStorage = useNotificationStore((s) => s.loadFromStorage);
  const processedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  useEffect(() => {
    if (!toasts || toasts.length === 0) return;

    toasts.forEach((t) => {
      if (!t.id || processedIdsRef.current.has(t.id)) return;
      processedIdsRef.current.add(t.id);

      // Remove imediatamente da fila interna do react-hot-toast para liberar memória
      try {
        toast.dismiss(t.id);
        toast.remove(t.id);
      } catch (e) {}

      // Extrai a mensagem de texto com segurança
      let messageText = '';
      try {
        const val = resolveValue(t.message, t);
        if (typeof val === 'string') {
          messageText = val;
        } else if (val && typeof val === 'object' && 'props' in val) {
          messageText = String((val as any).props?.children || 'Operação realizada');
        } else {
          messageText = String(val || 'Operação realizada');
        }
      } catch {
        messageText = 'Operação realizada';
      }

      if (!messageText || messageText === '[object Object]') {
        messageText = 'Ação concluída com sucesso';
      }

      const notifType: 'success' | 'error' | 'warning' | 'info' =
        t.type === 'error' ? 'error' : t.type === 'loading' ? 'info' : 'success';

      addNotification({
        id: t.id,
        title: messageText,
        type: notifType,
      });
    });
  }, [toasts, addNotification]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ConfirmDialogProvider>
        <ThemeInitializer />
        <BrandingInitializer />
        <ToastToBellSync />
        {children}
      </ConfirmDialogProvider>
    </QueryClientProvider>
  );
}
