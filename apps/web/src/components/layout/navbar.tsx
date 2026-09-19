'use client';

import { Bell, Search, ChevronRight, LogOut } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';

const pageTitles: Record<string, { title: string; description: string }> = {
  '/': { title: 'Dashboard Geral', description: 'Métricas em tempo real, mapa e prospecção ativa' },
  '/leads': { title: 'Leads', description: 'Gerenciar e qualificar oportunidades de negócio' },
  '/pipeline': { title: 'Pipeline', description: 'Funil comercial Kanban interativo' },
  '/map': { title: 'Mapa Inteligente', description: 'Visualização geográfica de oportunidades' },
  '/visits': { title: 'Visitas', description: 'Agendamento e histórico de visitas presenciais' },
  '/proposals': { title: 'Propostas', description: 'Gerenciar propostas comerciais enviadas' },
  '/products': { title: 'Produtos', description: 'Catálogo de produtos e serviços' },
  '/customers': { title: 'Clientes', description: 'Base de clientes ativos e contratos' },
  '/whatsapp': { title: 'Robô WhatsApp', description: 'Automação de mensagens e follow-up' },
  '/ai': { title: 'IA Comercial', description: 'Inteligência artificial para vendas' },
  '/team': { title: 'Equipe', description: 'Gerenciar membros da equipe de vendas' },
  '/goals': { title: 'Metas', description: 'Acompanhar metas e objetivos do time' },
  '/reports': { title: 'Relatórios', description: 'Análises e relatórios gerenciais' },
  '/settings': { title: 'Configurações', description: 'Configurações do sistema e preferências' },
  '/users': { title: 'Usuários', description: 'Gerenciar usuários do sistema' },
};

export function Navbar() {
  const { logout } = useAuth();
  const pathname = usePathname();

  const pageInfo = useMemo(() => {
    return pageTitles[pathname || '/'] || { title: 'Página', description: '' };
  }, [pathname]);

  return (
    <header className="h-16 border-b border-border bg-card/95 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20 transition-colors duration-200">
      <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium truncate">
            <span className="font-semibold text-foreground/80">Radar</span>
            <ChevronRight className="w-3 h-3 text-muted-foreground" />
            <span className="text-foreground font-bold truncate">{pageInfo.title}</span>
          </div>
          <p className="hidden md:block text-[11px] text-muted-foreground truncate">
            {pageInfo.description}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className="relative w-full max-w-xs hidden lg:block">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar leads, clientes..."
            className="w-full pl-9 h-9 text-xs border-border focus-visible:ring-1"
          />
        </div>

        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full" />
        </Button>

        <Button variant="outline" size="sm" onClick={() => logout()} className="gap-1.5 text-xs">
          <LogOut className="w-3.5 h-3.5" />
          <span>Sair</span>
        </Button>
      </div>
    </header>
  );
}
