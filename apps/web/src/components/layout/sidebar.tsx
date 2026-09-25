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
  X, Plus, LogOut, GitBranch, UserCheck
} from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { useAuth } from '@/hooks/use-auth';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { WCTechSignature } from './wctech-signature';
import { UserProfileModal } from '@/components/user/user-profile-modal';

const navSections = [
  {
    label: 'Prospecção & CRM',
    items: [
      { title: 'Dashboard', href: '/', icon: LayoutDashboard },
      { title: 'Leads', href: '/leads', icon: Users },
      { title: 'CRM', href: '/pipeline', icon: Trello },
      { title: 'Mapa Inteligente', href: '/map', icon: MapIcon },
    ],
  },
  {
    label: 'Vendas & Atendimento',
    items: [
      { title: 'Visitas', href: '/visits', icon: Calendar },
      { title: 'Propostas', href: '/proposals', icon: FileText },
      { title: 'Produtos', href: '/products', icon: Package },
      { title: 'Clientes', href: '/customers', icon: Building2 },
    ],
  },
  {
    label: 'Automação',
    items: [
      { title: 'Robô WhatsApp', href: '/whatsapp', icon: MessageSquare },
      { title: 'Fluxos de Conversa', href: '/flows', icon: GitBranch, badge: 'NOVO' },
      { title: 'IA Comercial', href: '/ai', icon: BrainCircuit, badge: 'IA' },
    ],
  },
  {
    label: 'Gestão',
    items: [
      { title: 'Equipe', href: '/team', icon: Users2 },
      { title: 'Metas', href: '/goals', icon: Target },
      { title: 'Relatórios', href: '/reports', icon: BarChart3 },
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
  const { user } = useAuthStore();
  const { logout } = useAuth();

  const sidebarContent = (
    <>
      {/* Header */}
      <div className="p-3.5 border-b border-border">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-white text-xs shadow-md shrink-0 bg-slate-800 dark:bg-slate-700">
              RO
            </div>
            {!collapsed && (
              <div className="truncate flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-xs text-foreground truncate">Radar de Oportunidades</span>
                  <span className="text-[9px] uppercase font-black px-1.5 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 shrink-0">
                    PRO
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground truncate">Prospecção B2B Inteligente</p>
              </div>
            )}
          </div>
          {/* Mobile close */}
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition shrink-0 cursor-pointer md:hidden"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* New Prospection Button */}
      {!collapsed && (
        <div className="px-3 pt-3">
          <Link
            href="/leads?novo=true"
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-black text-white shadow-md transition-all active:scale-95 bg-slate-800 hover:bg-slate-700 dark:bg-slate-600 dark:hover:bg-slate-500"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>+ Nova Prospecção</span>
          </Link>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-3 scrollbar-hide">
        {navSections.map((section) => (
          <div key={section.label} className="space-y-1">
            {!collapsed && (
              <div className="px-3 pt-1.5 pb-0.5 text-[9px] font-black uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                <span>{section.label}</span>
                <span className="w-8 h-[1px] bg-border" />
              </div>
            )}
            {section.items.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(`${item.href}/`));
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
                  <div className="flex items-center gap-2.5 min-w-0">
                    <item.icon className={cn(
                      'w-4 h-4 shrink-0',
                      isActive && 'text-primary'
                    )} />
                    {!collapsed && (
                      <span className={cn('truncate', isActive && 'text-primary font-bold')}>{item.title}</span>
                    )}
                  </div>
                  {!collapsed && 'badge' in item && item.badge && (
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase shrink-0 bg-primary/20 text-primary border border-primary/30">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
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
                <p className="text-[10px] text-muted-foreground truncate">{user?.role?.name || 'Administrador'}</p>
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
    </>
  );
}
