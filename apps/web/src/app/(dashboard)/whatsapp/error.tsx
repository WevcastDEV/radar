'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function WhatsAppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Erro na página do WhatsApp:', error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-6">
      <div className="bg-card border border-border shadow-xl rounded-2xl p-6 sm:p-8 max-w-lg w-full text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-500 mx-auto flex items-center justify-center">
          <AlertTriangle className="w-7 h-7" />
        </div>
        
        <h2 className="text-xl font-bold text-foreground">
          Instabilidade Temporária no Painel WhatsApp
        </h2>
        
        <p className="text-sm text-muted-foreground">
          Ocorreu um erro ao carregar o estado dos disparos ou da fila. Seus dados e clientes estão preservados com segurança.
        </p>

        {error?.message && (
          <div className="bg-accent/40 rounded-lg p-2.5 text-xs text-muted-foreground font-mono text-left break-all border border-border">
            {error.message}
          </div>
        )}

        <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
          <Button 
            onClick={() => reset()} 
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs h-10 px-5 gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Tentar Novamente
          </Button>
          <Button 
            variant="outline" 
            onClick={() => window.location.reload()} 
            className="text-xs h-10 px-5"
          >
            Recarregar Página Completa
          </Button>
        </div>
      </div>
    </div>
  );
}
