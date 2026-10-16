'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Bell, 
  CheckCheck, 
  Trash2, 
  ExternalLink, 
  MessageSquare, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  Info,
  Sliders,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { formatBrazilianPhone } from '@/lib/phone-utils';
import { usePathname } from 'next/navigation';
import { useNotificationStore, SystemNotification } from '@/stores/notification-store';

export interface HotLeadNotification {
  id: string;
  phone: string;
  jid: string;
  pushName?: string;
  leadName?: string;
  category?: string;
  text: string;
  templateName?: string;
  timestamp: number;
  read: boolean;
  isRejected?: boolean;
}

type TabFilter = 'all' | 'whatsapp' | 'system';

// 🔔 Alerta sonoro agradável via Web Audio API (sem arquivos externos)
function playNotificationChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // Primeiro tom (880Hz - Lá)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now);
    gain1.gain.setValueAtTime(0.18, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.22);

    // Segundo tom mais alto (1174.6Hz - Ré)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1174.6, now + 0.12);
    gain2.gain.setValueAtTime(0.22, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.42);
  } catch (e) {}
}

// 🔔 Notificação Nativa do Navegador (Web Notification API)
function triggerNativeNotification(title: string, body: string) {
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'granted') {
      try {
        new Notification(title, { body, icon: '/favicon.ico' });
      } catch (e) {}
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then((perm) => {
        if (perm === 'granted') {
          try {
            new Notification(title, { body, icon: '/favicon.ico' });
          } catch (e) {}
        }
      });
    }
  }
}

// Formatar tempo decorrido relativo
function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 45) return 'Agora mesmo';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Há ${hours}h`;
  const days = Math.floor(hours / 24);
  return `Há ${days}d`;
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [whatsappNotifications, setWhatsappNotifications] = useState<HotLeadNotification[]>([]);
  const [isClearing, setIsClearing] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const lastNotifiedIdRef = useRef<string | null>(null);
  const hasInitializedRef = useRef(false);
  const pathname = usePathname();

  // Store de Notificações do Sistema (ações, alertas, confirmações silenciosas)
  const systemNotifications = useNotificationStore((s) => s.notifications);
  const markAllSystemAsRead = useNotificationStore((s) => s.markAllAsRead);
  const markSystemAsRead = useNotificationStore((s) => s.markAsRead);
  const clearAllSystem = useNotificationStore((s) => s.clearAll);
  const removeSystemNotification = useNotificationStore((s) => s.removeNotification);
  const loadSystemFromStorage = useNotificationStore((s) => s.loadFromStorage);

  // Inicializa armazenamento local do sistema
  useEffect(() => {
    loadSystemFromStorage();
  }, [loadSystemFromStorage]);

  // Fecha o dropdown imediatamente ao trocar de rota
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Busca mensagens do WhatsApp
  const fetchWhatsappNotifications = async () => {
    try {
      const res = await api.get('/whatsapp/hot-leads');
      const data = res.data?.data;
      if (data && Array.isArray(data.hotLeads)) {
        const validLeads = data.hotLeads.filter(
          (h: HotLeadNotification) => !h.jid || (!h.jid.endsWith('@newsletter') && !h.jid.endsWith('@g.us'))
        );
        setWhatsappNotifications(validLeads);

        // Detecta novas respostas não lidas
        const latestUnread = validLeads.find((h: HotLeadNotification) => !h.read && !h.isRejected);
        if (latestUnread) {
          if (hasInitializedRef.current && latestUnread.id !== lastNotifiedIdRef.current) {
            lastNotifiedIdRef.current = latestUnread.id;
            playNotificationChime();
            const clientName = latestUnread.leadName || formatBrazilianPhone(latestUnread.phone);
            triggerNativeNotification(`💬 Cliente Respondeu: ${clientName}`, `"${latestUnread.text}"`);
          } else if (!hasInitializedRef.current) {
            lastNotifiedIdRef.current = latestUnread.id;
          }
        }
        hasInitializedRef.current = true;
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchWhatsappNotifications();
    const interval = setInterval(fetchWhatsappNotifications, 6000);
    return () => clearInterval(interval);
  }, []);

  // Fechar dropdown ao clicar fora ou ao pressionar Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Contadores
  const systemUnread = useMemo(
    () => systemNotifications.filter((n) => !n.read).length,
    [systemNotifications]
  );
  const whatsappUnread = useMemo(
    () => whatsappNotifications.filter((n) => !n.read && !n.isRejected).length,
    [whatsappNotifications]
  );
  const totalUnreadCount = systemUnread + whatsappUnread;
  const totalCount = systemNotifications.length + whatsappNotifications.length;

  // Unifica e ordena cronologicamente
  type UnifiedItem = 
    | { kind: 'system'; item: SystemNotification; timestamp: number }
    | { kind: 'whatsapp'; item: HotLeadNotification; timestamp: number };

  const unifiedList = useMemo<UnifiedItem[]>(() => {
    const list: UnifiedItem[] = [];

    if (activeTab === 'all' || activeTab === 'system') {
      systemNotifications.forEach((n) => {
        list.push({ kind: 'system', item: n, timestamp: n.timestamp });
      });
    }

    if (activeTab === 'all' || activeTab === 'whatsapp') {
      whatsappNotifications.forEach((w) => {
        list.push({ kind: 'whatsapp', item: w, timestamp: w.timestamp });
      });
    }

    return list.sort((a, b) => b.timestamp - a.timestamp);
  }, [systemNotifications, whatsappNotifications, activeTab]);

  // Marcar todas como lidas
  const handleMarkAllAsRead = async () => {
    markAllSystemAsRead();
    if (whatsappUnread > 0) {
      try {
        await api.post('/whatsapp/hot-leads/mark-read');
        setWhatsappNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      } catch (e) {}
    }
  };

  // Limpar todas
  const handleClearAll = async () => {
    setIsClearing(true);
    try {
      clearAllSystem();
      if (whatsappNotifications.length > 0) {
        await api.post('/whatsapp/hot-leads/clear');
        setWhatsappNotifications([]);
      }
      setIsOpen(false);
    } catch (e) {
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Botão do Sininho */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`relative p-2 rounded-xl border transition-all duration-200 flex items-center justify-center cursor-pointer group active:scale-95 ${
          isOpen
            ? 'bg-accent border-primary/50 text-foreground'
            : totalUnreadCount > 0
            ? 'bg-accent/80 border-border hover:bg-accent text-foreground'
            : 'bg-transparent border-transparent hover:bg-accent/50 text-muted-foreground hover:text-foreground'
        }`}
        title={
          totalUnreadCount > 0
            ? `${totalUnreadCount} notificação(ões) não lida(s)`
            : 'Central de Notificações'
        }
      >
        <Bell
          className={`w-4 h-4 transition-transform duration-200 group-hover:rotate-12 ${
            totalUnreadCount > 0 ? 'text-primary' : 'text-muted-foreground'
          }`}
        />

        {/* Badge de Alerta com Contador */}
        {totalUnreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex items-center justify-center rounded-full h-4 min-w-[16px] px-1 bg-emerald-600 text-white font-black text-[10px] shadow-sm leading-none border border-card">
              {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
            </span>
          </span>
        )}
      </button>

      {/* Dropdown Popover 100% OPACO (sem transparência de fundo) */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-[9990] bg-black/30 backdrop-blur-[1px]"
            onClick={() => setIsOpen(false)}
          />
          <div
            className="absolute right-0 mt-2 w-88 sm:w-[420px] rounded-2xl border border-slate-700 shadow-2xl z-[9999] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
            style={{ backgroundColor: '#0b132b', opacity: 1 }}
          >
            {/* Header do Popover com título e abas */}
            <div className="p-3.5 border-b border-slate-800 bg-slate-900/98 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-white flex items-center gap-1.5">
                      Central de Notificações
                      {totalUnreadCount > 0 && (
                        <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold text-[10px] px-1.5 py-0.2 rounded-full">
                          {totalUnreadCount} nova{totalUnreadCount > 1 ? 's' : ''}
                        </span>
                      )}
                    </h4>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  title="Fechar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Filtro por Abas: Todas | Sistema | WhatsApp */}
              <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-lg border border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setActiveTab('all')}
                  className={`flex-1 py-1 text-[11px] font-bold rounded-md transition-all ${
                    activeTab === 'all'
                      ? 'bg-slate-800 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Todas ({totalCount})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('system')}
                  className={`flex-1 py-1 text-[11px] font-bold rounded-md transition-all flex items-center justify-center gap-1 ${
                    activeTab === 'system'
                      ? 'bg-slate-800 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>Sistema</span>
                  {systemUnread > 0 && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('whatsapp')}
                  className={`flex-1 py-1 text-[11px] font-bold rounded-md transition-all flex items-center justify-center gap-1 ${
                    activeTab === 'whatsapp'
                      ? 'bg-slate-800 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>WhatsApp</span>
                  {whatsappUnread > 0 && (
                    <span className="w-2 h-2 rounded-full bg-red-400" />
                  )}
                </button>
              </div>

              {/* Barra de Ações: Marcar Lidas & Limpar */}
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
                <span className="text-[11px] text-slate-400 font-medium">
                  {unifiedList.length} registro{unifiedList.length === 1 ? '' : 's'}
                </span>

                <div className="flex items-center gap-1.5">
                  {totalUnreadCount > 0 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleMarkAllAsRead}
                      className="h-6 px-2 text-[11px] font-medium text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer"
                      title="Marcar todas como lidas"
                    >
                      <CheckCheck className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                      Marcar lidas
                    </Button>
                  )}

                  {totalCount > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleClearAll}
                      disabled={isClearing}
                      className="h-6 px-2.5 text-[11px] font-bold border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 cursor-pointer"
                      title="Limpar histórico de notificações"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      Limpar
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Lista com scroll e fundo escuro sólido */}
            <div
              className="max-h-[380px] overflow-y-auto divide-y divide-slate-800/70 p-2 space-y-1.5"
              style={{ backgroundColor: '#0b132b' }}
            >
              {unifiedList.length === 0 ? (
                <div className="p-8 text-center space-y-2.5">
                  <div className="w-12 h-12 rounded-full bg-slate-800/80 text-emerald-400 flex items-center justify-center mx-auto border border-slate-700">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h5 className="font-bold text-xs text-white">Tudo em dia!</h5>
                    <p className="text-[11px] text-slate-400 max-w-xs mx-auto leading-relaxed">
                      Nenhuma notificação pendente no momento. As ações do sistema e respostas do WhatsApp são registradas aqui silenciosamente.
                    </p>
                  </div>
                </div>
              ) : (
                unifiedList.map((entry) => {
                  if (entry.kind === 'system') {
                    const notif = entry.item;
                    const isUnread = !notif.read;

                    // Cores e ícones específicos para cada tipo de ação do sistema
                    const iconConfig = {
                      success: {
                        icon: CheckCircle2,
                        text: 'text-emerald-400',
                        bg: 'bg-emerald-500/10',
                        border: 'border-emerald-500/20',
                      },
                      error: {
                        icon: AlertCircle,
                        text: 'text-red-400',
                        bg: 'bg-red-500/10',
                        border: 'border-red-500/20',
                      },
                      warning: {
                        icon: AlertTriangle,
                        text: 'text-amber-400',
                        bg: 'bg-amber-500/10',
                        border: 'border-amber-500/20',
                      },
                      info: {
                        icon: Info,
                        text: 'text-blue-400',
                        bg: 'bg-blue-500/10',
                        border: 'border-blue-500/20',
                      },
                    }[notif.type] || {
                      icon: CheckCircle2,
                      text: 'text-emerald-400',
                      bg: 'bg-emerald-500/10',
                      border: 'border-emerald-500/20',
                    };

                    const IconComp = iconConfig.icon;

                    return (
                      <div
                        key={`sys-${notif.id}`}
                        onClick={() => markSystemAsRead(notif.id)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer ${
                          isUnread
                            ? 'bg-slate-900/90 border-slate-700/80 shadow-xs'
                            : 'bg-slate-900/50 border-slate-800/80 hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2.5">
                          <div className="flex items-start gap-2.5 min-w-0 flex-1">
                            <div
                              className={`w-7 h-7 rounded-lg ${iconConfig.bg} ${iconConfig.border} border flex items-center justify-center ${iconConfig.text} shrink-0 mt-0.5`}
                            >
                              <IconComp className="w-4 h-4" />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span
                                  className={`font-semibold text-xs leading-snug break-words ${
                                    isUnread ? 'text-white' : 'text-slate-300'
                                  }`}
                                >
                                  {notif.title}
                                </span>
                                {isUnread && (
                                  <span
                                    className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"
                                    title="Não lida"
                                  />
                                )}
                              </div>

                              {notif.description && (
                                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                                  {notif.description}
                                </p>
                              )}

                              <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                                <span className="text-slate-400 font-medium">Sistema</span>
                                <span>•</span>
                                <span>{formatTimeAgo(notif.timestamp)}</span>
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeSystemNotification(notif.id);
                            }}
                            className="p-1 rounded-md text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors shrink-0"
                            title="Remover notificação"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  }

                  // Notificação de WhatsApp (Cliente Respondeu)
                  const notif = entry.item;
                  const phoneDigits = notif.phone.replace(/\D/g, '');
                  const cleanPhone = formatBrazilianPhone(notif.phone);
                  const title = notif.leadName || cleanPhone;
                  const isUnread = !notif.read;

                  return (
                    <div
                      key={`wa-${notif.id}`}
                      className={`p-3 rounded-xl border transition-all ${
                        isUnread
                          ? 'bg-slate-900/90 border-emerald-500/30 shadow-xs'
                          : 'bg-slate-900/50 border-slate-800/80 hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`font-bold text-xs truncate ${
                                isUnread ? 'text-emerald-400' : 'text-slate-100'
                              }`}
                            >
                              {title}
                            </span>

                            {notif.category && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 border border-slate-700 shrink-0">
                                {notif.category}
                              </span>
                            )}

                            {isUnread && (
                              <span
                                className="w-2 h-2 rounded-full bg-red-500 shrink-0"
                                title="Não lida"
                              />
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                            <span className="text-emerald-400 font-medium">📞 {cleanPhone}</span>
                            <span>•</span>
                            <span>{formatTimeAgo(notif.timestamp)}</span>
                          </div>

                          {/* Balão com o texto da resposta do cliente */}
                          <div className="mt-2 p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs text-slate-200 font-sans leading-relaxed">
                            <p className="line-clamp-3 italic">"{notif.text}"</p>
                          </div>
                        </div>
                      </div>

                      {/* Rodapé com botão de ação para abrir WhatsApp */}
                      <div className="mt-2.5 flex items-center justify-end gap-2">
                        <a
                          href={`https://wa.me/${
                            phoneDigits.startsWith('55') ? phoneDigits : `55${phoneDigits}`
                          }?text=${encodeURIComponent('Olá! Vi sua resposta aqui.')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 rounded-lg transition-all"
                        >
                          <span>Abrir conversa</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Rodapé fixo do Popover */}
            {totalCount > 0 && (
              <div className="p-2.5 border-t border-slate-800 bg-slate-900/98 flex items-center justify-between text-[11px] text-slate-400">
                <span>
                  Total: {totalCount} notificaç{totalCount === 1 ? 'ão' : 'ões'}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleClearAll}
                  disabled={isClearing}
                  className="h-6 text-[10px] font-bold border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 gap-1 px-2 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  Limpar Histórico
                </Button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
