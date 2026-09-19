'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { ConfirmDialogProvider } from '@/components/ui/confirm-dialog';
import { useThemeStore } from '@/stores/theme-store';

function ThemeInitializer() {
  const initTheme = useThemeStore(s => s.initTheme);
  useEffect(() => { initTheme(); }, [initTheme]);
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
        {children}
        <Toaster 
          position="top-right"
          toastOptions={{
            className: '!bg-card !text-card-foreground !border !border-border',
            style: {
              background: 'hsl(var(--card))',
              color: 'hsl(var(--card-foreground))',
              border: '1px solid hsl(var(--border))'
            }
          }} 
        />
      </ConfirmDialogProvider>
    </QueryClientProvider>
  );
}
