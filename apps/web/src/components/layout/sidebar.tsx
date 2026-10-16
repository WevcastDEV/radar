'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, MessageSquare,
  Users, Trello, Map as MapIcon,
  Calendar, FileText, Package,
  Building2, Users2, Target,
  BarChart3, BrainCircuit, Settings,
  X, Plus, LogOut, GitBranch, UserCheck, Download,
  ChevronDown, ChevronRight, SlidersHorizontal
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { useAuth } from '@/hooks/use-auth';
import { isUserAdmin, getUserRoleLabel } from '@/lib/auth';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { WCTechSignature } from './wctech-signature';
import { UserProfileModal } from '@/components/user/user-profile-modal';
import { SidebarCustomizerModal } from './sidebar-customizer-modal';
import { useBrandingStore } from '@/stores/branding-store';

const navSections = [
  {
    label: 'Atendimento & Conversas',
    items: [
      { title: 'Chat Comercial', href: '/chat-comercial', icon: MessageSquare, badge: 'ATIVO' },
      { title: 'Fluxos de Conversa', href: '/flows', icon: GitBranch },
    ],
  },
  {
    label: 'Prospecção & CRM',
    items: [
      { title: 'Leads', href: '/leads', icon: Users },
      { title: 'CRM (Funil de Vendas)', href: '/pipeline', icon: Trello },
      { title: 'Visitas', href: '/visits', icon: Calendar },
      { title: 'Propostas', href: '/proposals', icon: FileText },
    ],
  },
  {
    label: 'Vendas & Clientes',
    items: [
      { title: 'Produtos & Serviços', href: '/products', icon: Package },
      { title: 'Painel de Clientes', href: '/customers', icon: Building2 },
    ],
  },
  {
    label: 'Gestão & Desempenho',
    items: [
      { title: 'Equipe', href: '/team', icon: Users2 },
      { title: 'Metas & Vendas', href: '/goals', icon: Target },
      { title: 'Relatórios & Limpeza', href: '/reports', icon: BarChart3 },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { title: 'Usuários', href: '/users', icon: UserCheck },
      { title: 'Configurações', href: '/settings', icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const { user } = useAuthStore();
  const { logout } = useAuth();

  const isAdmin = isUserAdmin(user);

  // Estados persistentes no LocalStorage: seções recolhidas e itens ocultos
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [hiddenNavItems, setHiddenNavItems] = useState<string[]>([]);

  // 🔔 Notificação piscante de novas mensagens do Chat Comercial com cor personalizável
  const [unreadChatCount, setUnreadChatCount] = useState<number>(0);
  const [alertColor, setAlertColor] = useState<string>('#f97316');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const savedColor = localStorage.getItem('radar_chat_alert_color') || '#f97316';
    setAlertColor(savedColor);

    const savedUnread = parseInt(localStorage.getItem('radar_unread_count') || '0', 10);
    if (!isNaN(savedUnread)) {
      setUnreadChatCount(savedUnread);
    }

    const handleColorChange = (e: any) => {
      if (e.detail) setAlertColor(e.detail);
    };

    const handleUnreadChange = (e: any) => {
      if (typeof e.detail === 'number') setUnreadChatCount(e.detail);
    };

    window.addEventListener('radar_chat_alert_color_changed', handleColorChange);
    window.addEventListener('radar_unread_updated', handleUnreadChange);

    return () => {
      window.removeEventListener('radar_chat_alert_color_changed', handleColorChange);
      window.removeEventListener('radar_unread_updated', handleUnreadChange);
    };
  }, []);

  useEffect(() => {
    try {
      const storedCollapsed = localStorage.getItem('radar_sidebar_collapsed_sections');
      if (storedCollapsed) {
        setCollapsedSections(JSON.parse(storedCollapsed));
      }
      const storedHidden = localStorage.getItem('radar_sidebar_hidden_items');
      if (storedHidden) {
        setHiddenNavItems(JSON.parse(storedHidden));
      }
    } catch {}
  }, []);

  const toggleSectionCollapse = (label: string) => {
    setCollapsedSections((prev) => {
      const next = { ...prev, [label]: !prev[label] };
      try {
        localStorage.setItem('radar_sidebar_collapsed_sections', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const toggleHideItem = (href: string) => {
    setHiddenNavItems((prev) => {
      const exists = prev.includes(href);
      const next = exists ? prev.filter((h) => h !== href) : [...prev, href];
      try {
        localStorage.setItem('radar_sidebar_hidden_items', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleResetHidden = () => {
    setHiddenNavItems([]);
    setCollapsedSections({});
    try {
      localStorage.removeItem('radar_sidebar_hidden_items');
      localStorage.removeItem('radar_sidebar_collapsed_sections');
    } catch {}
  };

  const handleCommercialFocus = () => {
    // Foco comercial: mantém Chat Comercial, Fluxos, Leads, CRM, Clientes, Metas e Configurações
    const essentialHrefs = ['/chat-comercial', '/flows', '/leads', '/pipeline', '/customers', '/goals', '/settings'];
    const allHrefs: string[] = [];
    navSections.forEach((s) => s.items.forEach((i) => allHrefs.push(i.href)));
    const toHide = allHrefs.filter((h) => !essentialHrefs.includes(h));
    setHiddenNavItems(toHide);
    try {
      localStorage.setItem('radar_sidebar_hidden_items', JSON.stringify(toHide));
    } catch {}
  };

  // Seções filtradas para renderização
  const visibleNavSections = navSections.map((section) => ({
    ...section,
    items: section.items.filter((item) => {
      if (item.href === '/users' && !isAdmin) return false;
      if (hiddenNavItems.includes(item.href)) return false;
      return true;
    }),
  })).filter((section) => section.items.length > 0 || !collapsed);

  const { companyName, companySlogan, companyLogo, logoStyle } = useBrandingStore();
  const brandInitials = (companyName || 'CRIART')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || 'CB';

  const sidebarContent = (
    <>
      {/* Header / Brand Banner */}
      <div className="p-3 border-b border-border bg-card/40">
        {collapsed ? (
          <div className="flex items-center justify-center py-1">
            {companyLogo ? (
              <Link
                href="/settings"
                className="w-11 h-11 rounded-xl flex items-center justify-center overflow-hidden bg-card/90 border border-border/80 shadow-xs p-1 hover:border-primary/50 hover:shadow-md transition-all group"
                title={`${companyName || 'CRIART BRASIL'} - Configurações`}
              >
                <img
                  src={companyLogo}
                  alt={companyName || 'Logo'}
                  className="w-full h-full object-contain rounded-lg group-hover:scale-105 transition-transform"
                />
              </Link>
            ) : (
              <Link
                href="/settings"
                className="w-11 h-11 rounded-xl flex items-center justify-center font-black text-primary-foreground text-sm shadow-md bg-primary hover:scale-105 transition-transform"
                title={`${companyName || 'CRIART BRASIL'} - Configurações`}
              >
                {brandInitials}
              </Link>
            )}
          </div>
        ) : (
          <div className="relative rounded-2xl bg-gradient-to-b from-card/95 via-card/75 to-muted/20 border border-border/70 p-3 shadow-xs overflow-hidden group transition-all duration-300 hover:border-primary/40 hover:shadow-md">
            {/* Ambient light glow in brand color */}
            <div className="absolute -top-12 -right-12 w-28 h-28 bg-primary/10 rounded-full blur-2xl pointer-events-none group-hover:bg-primary/20 transition-all duration-500" />

            {/* Mobile close button */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setMobileOpen(false);
              }}
              className="absolute top-2 right-2 p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition shrink-0 cursor-pointer md:hidden z-20"
              title="Fechar menu"
            >
              <X className="w-4 h-4" />
            </button>

            <Link
              href="/settings"
              className="block group/brand cursor-pointer"
              title="Clique para gerenciar a identidade e cores da empresa em Configurações"
            >
              {logoStyle === 'hero' && companyLogo ? (
                /* Estilo Hero: Medalhão Central com Iluminação Ambiente Suave */
                <div className="flex flex-col items-center text-center relative z-10 py-1">
                  <div className="relative mb-2">
                    <div className="absolute inset-0 bg-primary/25 rounded-2xl blur-lg scale-90 transition-all duration-500 group-hover/brand:bg-primary/35" />
                    <div className="relative w-16 h-16 rounded-2xl bg-card border-2 border-primary/30 shadow-md p-1.5 flex items-center justify-center overflow-hidden transition-all duration-300 group-hover/brand:border-primary group-hover/brand:scale-105">
                      <img
                        src={companyLogo}
                        alt={companyName || 'Logo'}
                        className="w-full h-full object-contain rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-1.5 w-full px-1">
                    <span className="font-black text-sm text-foreground tracking-tight line-clamp-1 group-hover/brand:text-primary transition-colors" title={companyName || 'CRIART BRASIL'}>
                      {companyName || 'CRIART BRASIL'}
                    </span>
                    <span className="text-[9px] uppercase font-black px-1.5 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 shrink-0">
                      PRO
                    </span>
                  </div>

                  <p className="text-[11px] font-medium text-muted-foreground mt-0.5 line-clamp-2 px-1 leading-snug" title={companySlogan || 'Comunicação Visual'}>
                    {companySlogan || 'Comunicação Visual'}
                  </p>

                  <div className="flex items-center justify-center gap-1.5 mt-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                    <span className="text-[10px] text-muted-foreground font-semibold">Sistema Online</span>
                  </div>
                </div>
              ) : (
                /* Estilo Executivo Moderno (Horizontal): Ícone 48x48 + Nome + Slogan + Status */
                <div className="flex items-center gap-3 relative z-10">
                  {companyLogo ? (
                    <div className="relative w-12 h-12 rounded-xl p-0.5 bg-gradient-to-br from-primary/30 via-border/60 to-border/20 border border-border/80 shadow-sm shrink-0 flex items-center justify-center overflow-hidden group-hover/brand:scale-105 group-hover/brand:border-primary/50 transition-all duration-300">
                      <div className="w-full h-full rounded-[10px] bg-card/90 flex items-center justify-center overflow-hidden p-0.5">
                        <img
                          src={companyLogo}
                          alt={companyName || 'Logo'}
                          className="w-full h-full object-contain rounded-md transition-transform duration-300"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-primary-foreground text-sm shadow-md shrink-0 bg-primary group-hover/brand:scale-105 transition-all">
                      {brandInitials}
                    </div>
                  )}

                  <div className="truncate flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-black text-xs text-foreground tracking-tight truncate group-hover/brand:text-primary transition-colors" title={companyName || 'CRIART BRASIL'}>
                        {companyName || 'CRIART BRASIL'}
                      </span>
                      <span className="text-[9px] uppercase font-black px-1.5 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 shrink-0">
                        PRO
                      </span>
                    </div>
                    <p className="text-[10.5px] font-medium text-muted-foreground truncate mt-0.5 leading-tight" title={companySlogan || 'Comunicação Visual'}>
                      {companySlogan || 'Comunicação Visual'}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                      <span className="text-[10px] text-muted-foreground/80 font-semibold truncate">Sistema Ativo</span>
                    </div>
                  </div>
                </div>
              )}
            </Link>
          </div>
        )}
      </div>

      {/* New Prospection Button & Customize Menu */}
      {!collapsed && (
        <div className="px-3 pt-3 space-y-1.5">
          <Link
            href="/leads?novo=true"
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-black text-white shadow-md transition-all active:scale-95 bg-slate-800 hover:bg-slate-700 dark:bg-slate-600 dark:hover:bg-slate-500"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>+ Nova Prospecção</span>
          </Link>

          <button
            type="button"
            onClick={() => setIsCustomizerOpen(true)}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:bg-accent/60 border border-dashed border-border/70 transition-all cursor-pointer group"
            title="Personalizar itens visíveis e recolhimento do menu"
          >
            <div className="flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-primary group-hover:rotate-45 transition-transform" />
              <span>Personalizar Menu</span>
            </div>
            {hiddenNavItems.length > 0 ? (
              <span className="text-[9px] px-1.5 py-0.2 rounded-full font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                {hiddenNavItems.length} ocultos
              </span>
            ) : (
              <span className="text-[10px] text-muted-foreground opacity-60 group-hover:opacity-100">
                Organizar
              </span>
            )}
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-2.5 scrollbar-hide">
        {visibleNavSections.map((section) => {
          const isSectionCollapsed = !!collapsedSections[section.label];
          const isSectionActive = section.items.some((item) => 
            pathname === item.href || (item.href !== '/' && pathname?.startsWith(`${item.href}/`))
          );

          return (
            <div key={section.label} className="space-y-1">
              {!collapsed && (
                <button
                  type="button"
                  onClick={() => toggleSectionCollapse(section.label)}
                  className="w-full px-3 pt-2 pb-1 text-[10px] font-black uppercase tracking-wider text-muted-foreground hover:text-foreground flex items-center justify-between group cursor-pointer transition select-none"
                  title={`Clique para ${isSectionCollapsed ? 'expandir' : 'recolher'} o tópico "${section.label}"`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    {isSectionCollapsed ? (
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-transform shrink-0" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-transform shrink-0" />
                    )}
                    <span className="truncate">{section.label}</span>
                    {section.label === 'Atendimento & Conversas' && unreadChatCount > 0 && (
                      <span 
                        className="w-2 h-2 rounded-full animate-ping shrink-0" 
                        style={{ backgroundColor: alertColor }} 
                        title="Novas mensagens recebidas em Atendimento!"
                      />
                    )}
                    {isSectionActive && isSectionCollapsed && (
                      <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" title="Página ativa nesta categoria" />
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {isSectionCollapsed && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-secondary text-muted-foreground font-mono">
                        {section.items.length}
                      </span>
                    )}
                    <span className="w-5 h-[1px] bg-border group-hover:bg-primary/40 transition-colors" />
                  </div>
                </button>
              )}

              {/* Itens da Seção: Ocultam quando recolhido ("fecha e some") */}
              {(!isSectionCollapsed || collapsed) && section.items.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(`${item.href}/`));
                const isDownload = item.href.includes('/download-conector');

                if (isDownload) {
                  return (
                    <a
                      key={item.href}
                      href={item.href}
                      download="radar-conector-whatsapp.zip"
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        'flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 my-0.5 shadow-xs cursor-pointer',
                        collapsed && 'justify-center px-0'
                      )}
                      title={collapsed ? item.title : 'Baixar Conector Local do WhatsApp (.zip - 360 KB)'}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <item.icon className="w-4 h-4 shrink-0 text-emerald-500 animate-pulse" />
                        {!collapsed && (
                          <span className="truncate">{item.title}</span>
                        )}
                      </div>
                      {!collapsed && 'badge' in item && item.badge && (
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase shrink-0 bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">
                          {item.badge}
                        </span>
                      )}
                    </a>
                  );
                }

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all',
                      isActive
                        ? 'bg-primary/10 text-primary font-bold border-l-[3px] border-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent',
                      collapsed && 'justify-center px-0 border-l-0'
                    )}
                    title={collapsed ? item.title : undefined}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 relative">
                      <div className="relative">
                        <item.icon className={cn(
                          'w-4 h-4 shrink-0',
                          isActive && 'text-primary'
                        )} />
                        {collapsed && item.href === '/chat-comercial' && unreadChatCount > 0 && (
                          <span 
                            className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full animate-ping"
                            style={{ backgroundColor: alertColor }}
                          />
                        )}
                      </div>
                      {!collapsed && (
                        <span className={cn('truncate', isActive && 'text-primary font-bold')}>{item.title}</span>
                      )}
                    </div>
                    {!collapsed && item.href === '/chat-comercial' && unreadChatCount > 0 ? (
                      <span 
                        className="text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase shrink-0 border animate-pulse flex items-center gap-1"
                        style={{
                          backgroundColor: `${alertColor}20`,
                          borderColor: `${alertColor}70`,
                          color: alertColor,
                          boxShadow: `0 0 10px ${alertColor}60`
                        }}
                        title={`${unreadChatCount} nova(s) mensagem(ns) recebida(s)`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: alertColor }} />
                        {unreadChatCount} NOVO{unreadChatCount > 1 ? 'S' : ''}
                      </span>
                    ) : !collapsed && 'badge' in item && item.badge ? (
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase shrink-0 bg-primary/20 text-primary border border-primary/30">
                        {item.badge}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>



      {/* Footer section */}
      <div className="border-t border-border">
        {/* User Area */}
        <div className="p-3">
          <div 
            onClick={() => setIsProfileModalOpen(true)}
            title="Clique para editar seu perfil (Foto, Nome e Senha)"
            className={cn(
              'flex items-center gap-3 p-2 -m-2 rounded-xl transition-all cursor-pointer hover:bg-accent/80 group border border-transparent hover:border-border',
              collapsed && 'justify-center p-0 m-0'
            )}
          >
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user?.name || 'Avatar'}
                className="w-8 h-8 rounded-lg object-cover shrink-0 border border-primary/40 shadow-xs ring-2 ring-primary/20"
              />
            ) : (
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border bg-accent text-foreground border-border group-hover:border-primary/50 transition">
                <span className="text-xs font-bold">{user?.name?.charAt(0) || 'U'}</span>
              </div>
            )}
            {!collapsed && (
              <div className="overflow-hidden flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <p className="text-xs font-bold text-foreground truncate group-hover:text-primary transition">{user?.name || 'Usuário'}</p>
                  <span className="text-[10px] text-muted-foreground group-hover:text-primary opacity-0 group-hover:opacity-100 transition">✏️</span>
                </div>
                <p className="text-[10px] text-muted-foreground truncate">{getUserRoleLabel(user)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Utility Buttons */}
        <div className={cn('px-3 pb-2', collapsed ? 'flex flex-col gap-1.5 items-center' : 'flex items-center justify-between gap-2')}>
          <ThemeToggle />
          <button
            type="button"
            onClick={logout}
            title="Sair da plataforma"
            className={cn(
              'relative p-2 rounded-xl border transition-all duration-200 flex items-center justify-center shrink-0 cursor-pointer active:scale-95 bg-secondary hover:bg-destructive/10 border-border text-muted-foreground hover:text-destructive',
              collapsed ? 'w-10' : 'flex-1 gap-1.5 text-xs font-semibold'
            )}
          >
            <LogOut className="w-4 h-4" />
            {!collapsed && <span>Sair</span>}
          </button>
        </div>

        {/* WCTECH Signature */}
        <div className="px-3 pb-3">
          <WCTechSignature collapsed={collapsed} />
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden md:flex flex-col justify-between shrink-0 select-none min-h-screen transition-all duration-200 z-30 bg-card border-r border-border',
          collapsed ? 'w-[72px]' : 'w-64'
        )}
      >
        <div className="flex flex-col justify-between h-full min-h-screen relative">
          {sidebarContent}
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-card border-r border-border flex flex-col">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Modal de Edição de Perfil de Usuário */}
      <UserProfileModal 
        isOpen={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)} 
      />

      {/* Modal de Personalização do Menu Lateral (Ocultar Itens e Recolher Tópicos) */}
      <SidebarCustomizerModal
        isOpen={isCustomizerOpen}
        onClose={() => setIsCustomizerOpen(false)}
        sections={navSections}
        hiddenItems={hiddenNavItems}
        onToggleItem={toggleHideItem}
        onResetAll={handleResetHidden}
        onApplyCommercialFocus={handleCommercialFocus}
        collapsedSections={collapsedSections}
        onToggleSectionCollapse={toggleSectionCollapse}
      />
    </>
  );
}
