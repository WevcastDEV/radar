'use client';

import { Search, ChevronRight, LogOut, Instagram, Linkedin, Github } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import { NotificationBell } from './notification-bell';
import { useBrandingStore } from '@/stores/branding-store';

const pageTitles: Record<string, { title: string; description: string }> = {
  '/': { title: 'Dashboard Geral', description: 'Métricas em tempo real, mapa e prospecção ativa' },
  '/leads': { title: 'Leads', description: 'Gerenciar e qualificar oportunidades de negócio' },
  '/pipeline': { title: 'CRM', description: 'Funil comercial de vendas e gestão de clientes' },
  '/map': { title: 'Mapa Inteligente', description: 'Visualização geográfica de oportunidades' },
  '/visits': { title: 'Visitas', description: 'Agendamento e histórico de visitas presenciais' },
  '/proposals': { title: 'Propostas', description: 'Gerenciar propostas comerciais enviadas' },
  '/products': { title: 'Produtos', description: 'Catálogo de produtos e serviços' },
  '/customers': { title: 'Clientes', description: 'Base de clientes ativos e contratos' },
  '/whatsapp': { title: 'Robô WhatsApp', description: 'Automação de mensagens e follow-up' },
  '/chat-comercial': { title: 'Chat Comercial', description: 'Atendimento direto ao cliente e negociações em tempo real' },
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
  const { companyName, companyLogo, instagramUrl, linkedinUrl, githubUrl } = useBrandingStore();

  const isChatPage = pathname === '/chat-comercial' || pathname?.startsWith('/whatsapp');

  const pageInfo = useMemo(() => {
    return pageTitles[pathname || '/'] || { title: 'Página', description: '' };
  }, [pathname]);

  return (
    <header className="h-16 border-b border-border bg-card/95 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40 transition-colors duration-200">
      <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium truncate">
            {companyLogo ? (
              <img src={companyLogo} alt={companyName} className="w-4 h-4 object-contain rounded shrink-0 inline-block mr-0.5" />
            ) : null}
            <span className="font-bold text-foreground/90 truncate">{companyName || 'CRIART BRASIL'}</span>
            <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
            <span className="text-foreground font-bold truncate">{pageInfo.title}</span>
          </div>
          <p className="hidden md:block text-[11px] text-muted-foreground truncate">
            {pageInfo.description}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
        <div className="relative w-full max-w-xs hidden xl:block">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar leads, clientes..."
            className="w-full pl-9 h-9 text-xs border-border focus-visible:ring-1"
          />
        </div>

        {/* Redes Sociais no Topo Global (Instagram, LinkedIn, GitHub) */}
        <div className="flex items-center gap-1">
          <a
            href={instagramUrl || 'https://www.instagram.com/wctechn_'}
            target="_blank"
            rel="noopener noreferrer"
            title="Instagram (@wctechn_)"
            className="p-2 rounded-xl text-muted-foreground hover:text-pink-500 hover:bg-pink-500/10 transition-colors"
          >
            <Instagram className="w-4 h-4" />
          </a>
          <a
            href={linkedinUrl || 'https://www.linkedin.com/in/weverton-castelo-branco-005b39355'}
            target="_blank"
            rel="noopener noreferrer"
            title="LinkedIn Weverton Castelo Branco"
            className="p-2 rounded-xl text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 transition-colors"
          >
            <Linkedin className="w-4 h-4" />
          </a>
          <a
            href={githubUrl || 'https://github.com/WevcastDEV'}
            target="_blank"
            rel="noopener noreferrer"
            title="GitHub WevcastDEV"
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <Github className="w-4 h-4" />
          </a>
        </div>

        {/* Sininho de Notificações Unificado (Sistema + WhatsApp) */}
        <NotificationBell />

        <Button variant="outline" size="sm" onClick={() => logout()} className="gap-1.5 text-xs">
          <LogOut className="w-3.5 h-3.5" />
          <span>Sair</span>
        </Button>
      </div>
    </header>
  );
}
