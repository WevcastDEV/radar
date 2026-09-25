'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bell, CheckCheck, Trash2, ExternalLink, MessageSquare, X, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { formatBrazilianPhone } from '@/lib/phone-utils';
import toast from 'react-hot-toast';

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
      Notification.requestPermission().then(perm => {
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
  if (seconds < 60) return 'Agora mesmo';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Há ${hours}h`;
  const days = Math.floor(hours / 24);
  return `Há ${days}d`;
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<HotLeadNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isClearing, setIsClearing] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const lastNotifiedIdRef = useRef<string | null>(null);
  const hasInitializedRef = useRef(false);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/whatsapp/hot-leads');
      const data = res.data?.data;
      if (data && Array.isArray(data.hotLeads)) {
        // Filtra newsletters e canais caso ainda constem
        const validLeads = data.hotLeads.filter(
          (h: HotLeadNotification) => !h.jid || (!h.jid.endsWith('@newsletter') && !h.jid.endsWith('@g.us'))
        );
        setNotifications(validLeads);
        const unread = validLeads.filter((h: HotLeadNotification) => !h.read && !h.isRejected).length;
        setUnreadCount(unread);

        // Detecta novas respostas não lidas
        const latestUnread = validLeads.find((h: HotLeadNotification) => !h.read && !h.isRejected);
        if (latestUnread) {
          if (hasInitializedRef.current && latestUnread.id !== lastNotifiedIdRef.current) {
            lastNotifiedIdRef.current = latestUnread.id;
            playNotificationChime();
            const clientName = latestUnread.leadName || formatBrazilianPhone(latestUnread.phone);
            triggerNativeNotification(
              `💬 Cliente Respondeu: ${clientName}`,
              `"${latestUnread.text}"`
            );
          } else if (!hasInitializedRef.current) {
            lastNotifiedIdRef.current = latestUnread.id;
          }
        }
        hasInitializedRef.current = true;
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 6000);
    return () => clearInterval(interval);
  }, []);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleMarkAsRead = async () => {
    try {
      await api.post('/whatsapp/hot-leads/mark-read');
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      toast.success('Notificações marcadas como lidas');
    } catch (e) {
      toast.error('Erro ao marcar como lidas');
    }
  };

  const handleClearAll = async () => {
    setIsClearing(true);
    try {
      await api.post('/whatsapp/hot-leads/clear');
      setNotifications([]);
      setUnreadCount(0);
      toast.success('Todas as notificações foram limpas!');
      setIsOpen(false);
    } catch (e) {
      toast.error('Erro ao limpar notificações');
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Botão do Sininho */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className={`relative p-2 rounded-xl border transition-all duration-200 flex items-center justify-center cursor-pointer group active:scale-95 ${
          isOpen
            ? 'bg-accent border-primary/50 text-foreground'
            : unreadCount > 0
            ? 'bg-accent/80 border-border hover:bg-accent text-foreground'
            : 'bg-transparent border-transparent hover:bg-accent/50 text-muted-foreground hover:text-foreground'
        }`}
        title={unreadCount > 0 ? `${unreadCount} cliente(s) responderam no WhatsApp!` : 'Notificações de clientes'}
      >
        <Bell className={`w-4 h-4 transition-transform duration-200 group-hover:rotate-12 ${
          unreadCount > 0 ? 'text-primary' : 'text-muted-foreground'
        }`} />

        {/* Ponto vermelho ou contador de alerta */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex items-center justify-center rounded-full h-4 min-w-[16px] px-1 bg-red-600 text-white font-black text-[10px] shadow-sm leading-none border border-card">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          </span>
        )}
      </button>

      {/* Dropdown Popover 100% OPACO (sem transparência de fundo) */}
      {isOpen && (
        <div 
          className="absolute right-0 mt-2 w-84 sm:w-96 rounded-2xl border border-slate-700 shadow-2xl z-[9999] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
          style={{ backgroundColor: '#0b132b', opacity: 1 }}
        >
          {/* Header do Popover com título e botões de ação organizados */}
          <div className="p-3.5 border-b border-slate-800 bg-slate-900/95 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-white flex items-center gap-1.5">
                    Respostas de Clientes
                    {unreadCount > 0 && (
                      <span className="bg-red-500/20 text-red-400 border border-red-500/40 font-bold text-[10px] px-1.5 py-0.2 rounded-full">
                        {unreadCount} não lida{unreadCount > 1 ? 's' : ''}
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

            {/* Barra de Ações (Limpar & Marcar Lidas) */}
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
              <span className="text-[11px] text-slate-400 font-medium">
                {notifications.length} {notifications.length === 1 ? 'conversa' : 'conversas'}
              </span>

              <div className="flex items-center gap-1.5">
                {unreadCount > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleMarkAsRead}
                    className="h-6 px-2 text-[11px] font-medium text-slate-300 hover:text-white hover:bg-slate-800"
                    title="Marcar todas as mensagens como lidas"
                  >
                    <CheckCheck className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                    Lidas
                  </Button>
                )}

                {notifications.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleClearAll}
                    disabled={isClearing}
                    className="h-6 px-2.5 text-[11px] font-bold border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300"
                    title="Apagar todas as notificações da lista"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    Limpar Tudo
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Lista de Notificações com fundo escuro sólido */}
          <div 
            className="max-h-[380px] overflow-y-auto divide-y divide-slate-800/70 p-1.5 space-y-1.5"
            style={{ backgroundColor: '#0b132b' }}
          >
            {notifications.length === 0 ? (
              <div className="p-8 text-center space-y-2.5">
                <div className="w-12 h-12 rounded-full bg-slate-800/80 text-emerald-400 flex items-center justify-center mx-auto border border-slate-700">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h5 className="font-bold text-xs text-white">Tudo em dia!</h5>
                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto leading-relaxed">
                    Nenhuma notificação pendente. Quando um cliente responder ao robô, o alerta aparecerá aqui instantaneamente com som e prévia.
                  </p>
                </div>
              </div>
            ) : (
              notifications.map((notif) => {
                const phoneDigits = notif.phone.replace(/\D/g, '');
                const cleanPhone = formatBrazilianPhone(notif.phone);
                const title = notif.leadName || cleanPhone;
                const isUnread = !notif.read;

                return (
                  <div
                    key={notif.id}
                    className={`p-3 rounded-xl border transition-all ${
                      isUnread 
                        ? 'bg-slate-900/90 border-emerald-500/30 shadow-xs' 
                        : 'bg-slate-900/50 border-slate-800/80 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`font-bold text-xs truncate ${
                            isUnread ? 'text-emerald-400' : 'text-slate-100'
                          }`}>
                            {title}
                          </span>

                          {notif.category && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 border border-slate-700 shrink-0">
                              {notif.category}
                            </span>
                          )}

                          {isUnread && (
                            <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" title="Não lida" />
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

                    {/* Rodapé do item com botão de ação para abrir WhatsApp */}
                    <div className="mt-2.5 flex items-center justify-end gap-2">
                      <a
                        href={`https://wa.me/${phoneDigits.startsWith('55') ? phoneDigits : `55${phoneDigits}`}?text=${encodeURIComponent('Olá! Vi sua resposta aqui.')}`}
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
          {notifications.length > 0 && (
            <div className="p-2.5 border-t border-slate-800 bg-slate-900/95 flex items-center justify-between text-[11px] text-slate-400">
              <span>Total: {notifications.length} resposta{notifications.length > 1 ? 's' : ''}</span>
              <Button
                size="sm"
                variant="outline"
                onClick={handleClearAll}
                disabled={isClearing}
                className="h-6 text-[10px] font-bold border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 gap-1 px-2"
              >
                <Trash2 className="w-3 h-3" />
                Limpar Notificações
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
