'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { safeWhatsAppClient } from '@/app/(dashboard)/whatsapp/whatsapp-client';
import { WhatsAppInbox } from '@/components/whatsapp/whatsapp-inbox';
import { toast } from 'react-hot-toast';

function ChatComercialContent() {
  const searchParams = useSearchParams();
  const targetPhone = searchParams.get('phone');
  const targetId = searchParams.get('id');
  const targetName = searchParams.get('name');
  const targetText = searchParams.get('text') || searchParams.get('message');

  const [conversationsList, setConversationsList] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [botStatus, setBotStatus] = useState<any>({ connected: false, phone: '', pushName: '' });
  const [hotLeads, setHotLeads] = useState<any[]>([]);
  const [unreadHotLeadsCount, setUnreadHotLeadsCount] = useState<number>(0);
  
  const selectedConvRef = useRef<any>(null);
  const handledParamRef = useRef<string | null>(null);

  // Keep ref synchronized
  useEffect(() => {
    selectedConvRef.current = selectedConversation;
  }, [selectedConversation]);

  const fetchBotStatus = useCallback(async () => {
    try {
      const res = await safeWhatsAppClient.get('/status');
      const data = res.data?.data || res.data;
      if (data) {
        setBotStatus(data);
      }
    } catch {
      setBotStatus((prev: any) => ({ ...prev, connected: false, isFlowActive: undefined }));
    }
  }, []);

  const fetchHotLeads = useCallback(async () => {
    try {
      const res = await safeWhatsAppClient.get('/hot-leads');
      const data = res.data?.data || res.data;
      if (data && Array.isArray(data.hotLeads)) {
        setHotLeads(data.hotLeads);
        setUnreadHotLeadsCount(data.unreadCount || 0);
      }
    } catch {}
  }, []);

  const isFetchingConvRef = useRef(false);
  const convListCacheRef = useRef<any[]>([]);

  const fetchConversationsList = useCallback(async () => {
    if (isFetchingConvRef.current) return;
    isFetchingConvRef.current = true;
    try {
      const res = await safeWhatsAppClient.get('/conversations', { timeout: 4000 });
      const raw = res.data?.data || res.data;
      const rawItems = Array.isArray(raw) ? raw : (raw?.items || []);
      const items = rawItems.map((c: any) => {
        try {
          if (typeof window !== 'undefined') {
            const cleanPhone = (c.phone || c.id || '').replace(/\D/g, '');
            const custom = localStorage.getItem(`custom_name_${c.id}`) ||
                           (cleanPhone ? localStorage.getItem(`custom_name_${cleanPhone}`) : null) ||
                           (c.jid ? localStorage.getItem(`custom_name_${c.jid}`) : null);
            if (custom && custom.trim()) {
              return { ...c, name: custom.trim() };
            }
          }
        } catch {}
        return c;
      });

      // Otimização: Só atualiza state se a lista de conversas realmente mudou
      const prevItems = convListCacheRef.current;
      const changed = prevItems.length !== items.length || 
        (items.length > 0 && prevItems.length > 0 && (
          prevItems[0]?.id !== items[0]?.id || 
          prevItems[0]?.name !== items[0]?.name ||
          prevItems[0]?.lastInteractionAt !== items[0]?.lastInteractionAt ||
          prevItems[0]?.lastMessageSnippet !== items[0]?.lastMessageSnippet ||
          prevItems[0]?.unreadCount !== items[0]?.unreadCount
        ));

      if (changed || prevItems.length === 0) {
        convListCacheRef.current = items;
        setConversationsList(items);
      }

      // Atualiza mensagens da conversa aberta em segundo plano sem disparar re-render se nada mudou
      if (selectedConvRef.current?.id) {
        const activeId = selectedConvRef.current.id;
        const cRes = await safeWhatsAppClient.get(`/conversations/${activeId}`, { timeout: 4000 });
        const cData = cRes.data?.data || cRes.data;
        if (cData) {
          try {
            if (typeof window !== 'undefined') {
              const cleanPhone = (cData.phone || cData.id || '').replace(/\D/g, '');
              const custom = localStorage.getItem(`custom_name_${cData.id}`) ||
                             (cleanPhone ? localStorage.getItem(`custom_name_${cleanPhone}`) : null) ||
                             (cData.jid ? localStorage.getItem(`custom_name_${cData.jid}`) : null);
              if (custom && custom.trim()) {
                cData.name = custom.trim();
              }
            }
          } catch {}
          setSelectedConversation((prev: any) => {
            if (!prev || prev.id !== activeId) return prev;
            const prevMsgs = prev.messages || [];
            const newMsgs = cData.messages || [];

            // Preserva mensagens que foram marcadas como apagadas localmente contra sobrescritas em polling
            const localDeletedIds = new Set(prevMsgs.filter((m: any) => m.isDeleted).map((m: any) => m.id));
            const safeNewMsgs = newMsgs.map((m: any) => {
              if (localDeletedIds.has(m.id) || (m.baileysId && localDeletedIds.has(m.baileysId))) {
                return { ...m, isDeleted: true, text: '🚫 Esta mensagem foi apagada', mediaType: undefined, mediaUrl: undefined };
              }
              return m;
            });

            const sameMsgCount = prevMsgs.length === safeNewMsgs.length;
            const sameStatus = prev.status === cData.status;
            const sameName = prev.name === cData.name;
            const sameTags = JSON.stringify(prev.tags || []) === JSON.stringify(cData.tags || []);
            
            if (sameMsgCount && sameStatus && sameName && sameTags) {
              const lastPrev = prevMsgs[prevMsgs.length - 1];
              const lastNew = safeNewMsgs[safeNewMsgs.length - 1];
              if ((!lastPrev && !lastNew) || (lastPrev?.id === lastNew?.id && lastPrev?.text === lastNew?.text)) {
                return prev;
              }
            }
            return { ...prev, ...cData, messages: safeNewMsgs };
          });
        }
      }
    } catch (error) {
      // Silencioso para evitar poluição no console
    } finally {
      isFetchingConvRef.current = false;
    }
  }, []);

  const handleOpenConversationChat = useCallback(async (conv: any) => {
    setSelectedConversation(conv);
    try {
      const convId = conv.id || conv.phone || conv.jid;
      const res = await safeWhatsAppClient.get(`/conversations/${convId}`);
      const data = res.data?.data || res.data;
      if (data) {
        setSelectedConversation({
          ...data,
          isRead: data.isRead ?? conv.isRead,
          unreadCount: data.unreadCount ?? conv.unreadCount ?? 0,
        });
      }
    } catch (error) {
      console.error('Failed to open chat', error);
    }
  }, []);

  // Seleciona automaticamente o lead se vier por parâmetro de URL (?phone=... ou ?id=...)
  useEffect(() => {
    const paramKey = targetPhone || targetId;
    if (paramKey && handledParamRef.current !== paramKey && conversationsList.length > 0) {
      handledParamRef.current = paramKey;
      const cleanTarget = paramKey.replace(/\D/g, '');
      const found = conversationsList.find((c: any) => {
        const cPhone = (c.phone || c.id || '').replace(/\D/g, '');
        return cPhone.includes(cleanTarget) || cleanTarget.includes(cPhone);
      });

      if (found) {
        handleOpenConversationChat(found);
      } else {
        // Se ainda não estiver na lista em memória, tenta abrir diretamente
        handleOpenConversationChat({
          id: cleanTarget,
          phone: cleanTarget,
          name: targetName || `Contato ${cleanTarget.slice(-4)}`,
          status: 'atendimento_humano',
          messages: []
        });
      }
    }
  }, [targetPhone, targetId, conversationsList, handleOpenConversationChat]);

  const handleToggleBotPause = async (conv: any, paused: boolean) => {
    try {
      const convId = conv.id || conv.phone || conv.jid;
      if (paused) {
        setSelectedConversation((prev: any) => prev ? { ...prev, status: 'atendimento_humano', botStatus: 'silenciado' } : null);
        await safeWhatsAppClient.post(`/conversations/${convId}/pause-bot`);
        toast.success('Robô pausado. Atendimento assumido.');
      } else {
        setSelectedConversation((prev: any) => prev ? { ...prev, status: 'em_andamento', botStatus: 'ativo' } : null);
        await safeWhatsAppClient.post(`/conversations/${convId}/resume-bot`);
        toast.success('Robô reativado para responder automaticamente.');
      }
      fetchConversationsList();
    } catch (e) {
      toast.error('Erro ao alternar status do robô');
    }
  };

  const handleRestartFlow = async (conv: any) => {
    try {
      const convId = conv.id || conv.phone || conv.jid;
      await safeWhatsAppClient.post(`/conversations/${convId}/restart-flow`);
      toast.success('Fluxo reiniciado para o primeiro passo.');
      handleOpenConversationChat(conv);
      fetchConversationsList();
    } catch (e) {
      toast.error('Erro ao reiniciar fluxo');
    }
  };

  const handleStartNewConversation = async (data: { phone: string; name: string; text?: string; flowId?: string }) => {
    try {
      const cleanPhone = data.phone.replace(/\D/g, '');
      const replyRes = await safeWhatsAppClient.post('/conversations/reply', {
        to: cleanPhone,
        name: data.name,
        text: data.text || 'Olá! Como posso ajudar você hoje?'
      });

      const resData = replyRes.data?.data || replyRes.data;
      if (resData && resData.success !== false) {
        toast.success(`Conversa iniciada com ${data.name || data.phone}!`);
        await fetchConversationsList();
        
        const newConv = {
          id: cleanPhone,
          phone: cleanPhone,
          name: data.name || `Contato ${cleanPhone}`,
          status: 'atendimento_humano',
          messages: [{
            id: `msg-${Date.now()}`,
            sender: 'human',
            text: data.text || 'Olá! Como posso ajudar você hoje?',
            timestamp: Date.now()
          }]
        };
        setSelectedConversation(newConv);

        if (data.flowId) {
          try {
            await safeWhatsAppClient.post(`/conversations/${cleanPhone}/force-flow`, {
              flowId: data.flowId
            });
            toast.success('Fluxo automatizado disparado!');
          } catch {}
        }
      } else {
        toast.error(resData?.message || 'Erro ao iniciar conversa');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Falha ao conectar novo número.');
    }
  };

  useEffect(() => {
    fetchBotStatus();
    fetchHotLeads();
    fetchConversationsList();

    // Polling inteligente e otimizado:
    // Conversas: 3s ativo / 10s quando aba em segundo plano
    let convTimer: NodeJS.Timeout;
    let isUnmounted = false;

    const scheduleNextConvPoll = () => {
      if (isUnmounted) return;
      const isHidden = typeof document !== 'undefined' && document.hidden;
      const delay = isHidden ? 10000 : 3000;
      convTimer = setTimeout(async () => {
        if (!isUnmounted) {
          await fetchConversationsList();
          scheduleNextConvPoll();
        }
      }, delay);
    };
    scheduleNextConvPoll();

    // Hot Leads: 8s
    const hotLeadsInterval = setInterval(() => {
      if (typeof document === 'undefined' || !document.hidden) {
        fetchHotLeads();
      }
    }, 8000);

    // Status do Robô: 15s
    const botStatusInterval = setInterval(() => {
      if (typeof document === 'undefined' || !document.hidden) {
        fetchBotStatus();
      }
    }, 15000);

    // Retorno de foco: sincroniza imediatamente ao abrir a aba
    const handleVisibility = () => {
      if (typeof document !== 'undefined' && !document.hidden) {
        fetchConversationsList();
        fetchHotLeads();
        fetchBotStatus();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      isUnmounted = true;
      clearTimeout(convTimer);
      clearInterval(hotLeadsInterval);
      clearInterval(botStatusInterval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [fetchBotStatus, fetchHotLeads, fetchConversationsList]);

  return (
    <div className="h-full w-full p-1 sm:p-2 flex flex-col overflow-hidden">
      <WhatsAppInbox
        conversationsList={conversationsList}
        selectedConversation={selectedConversation}
        setSelectedConversation={setSelectedConversation}
        handleOpenConversationChat={handleOpenConversationChat}
        handleToggleBotPause={handleToggleBotPause}
        handleRestartFlow={handleRestartFlow}
        handleStartNewConversation={handleStartNewConversation}
        onExitInbox={() => window.history.back()}
        safeWhatsAppClient={safeWhatsAppClient}
        botStatus={botStatus}
        onRefreshBotStatus={fetchBotStatus}
        onBotStatusChange={setBotStatus}
        hotLeads={hotLeads}
        unreadHotLeadsCount={unreadHotLeadsCount}
        onRefreshHotLeads={fetchHotLeads}
        onRefreshConversations={fetchConversationsList}
        initialDraftText={targetText || ''}
      />
    </div>
  );
}

export default function ChatComercialPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Carregando Chat Comercial...</div>}>
      <ChatComercialContent />
    </Suspense>
  );
}
