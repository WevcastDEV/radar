'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/chat-comercial');
  }, [router]);

  return (
    <div className="flex h-full w-full items-center justify-center p-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm font-medium text-foreground">Abrindo Chat Comercial...</p>
        <p className="text-xs text-muted-foreground">Carregando painel de atendimento e prospecção em tempo real</p>
      </div>
    </div>
  );
}

