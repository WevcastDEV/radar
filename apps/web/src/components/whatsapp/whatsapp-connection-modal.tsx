'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  QrCode, RefreshCw, Smartphone, CheckCircle2, AlertTriangle, 
  X, LogOut, ShieldCheck, Wifi, WifiOff, Loader2 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { safeWhatsAppClient } from '@/app/(dashboard)/whatsapp/whatsapp-client';
import { toast } from 'react-hot-toast';
import { useConfirm } from '@/components/ui/confirm-dialog';

interface WhatsappConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  botStatus: any;
  onRefreshStatus?: () => Promise<void>;
}

export function WhatsappConnectionModal({
  isOpen,
  onClose,
  botStatus,
  onRefreshStatus,
}: WhatsappConnectionModalProps) {
  const confirm = useConfirm();
  const [localStatus, setLocalStatus] = useState<any>(botStatus || {});
  const [isResetting, setIsResetting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Sincroniza estado com prop externa
  useEffect(() => {
    if (botStatus) {
      setLocalStatus(botStatus);
    }
  }, [botStatus]);

  // Função para buscar status em tempo real
  const fetchStatus = useCallback(async () => {
    try {
      const res = await safeWhatsAppClient.get('/status', { timeout: 3500 });
      const data = res.data?.data || res.data;
      if (data) {
        setLocalStatus(data);
        if (data.connected && !localStatus.connected) {
          toast.success('🎉 WhatsApp conectado com sucesso!');
          onRefreshStatus?.();
        }
      }
    } catch {
      // silencioso
    }
  }, [localStatus.connected, onRefreshStatus]);

  // Polling ativo a cada 2.5s enquanto o modal estiver aberto e desconectado
  useEffect(() => {
    if (!isOpen) {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      return;
    }

    fetchStatus();
    pollIntervalRef.current = setInterval(() => {
      fetchStatus();
    }, 2500);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [isOpen, fetchStatus]);

  // Forçar geração de novo QR Code
  const handleResetQr = async () => {
    setIsResetting(true);
    try {
      toast.loading('Gerando novo QR Code limpo...', { id: 'reset-qr' });
      await safeWhatsAppClient.post('/reset');
      await new Promise(r => setTimeout(r, 1200));
      await fetchStatus();
      await onRefreshStatus?.();
      toast.success('Novo QR Code gerado! Pronto para leitura.', { id: 'reset-qr' });
    } catch {
      toast.error('Erro ao gerar novo QR Code. Tente novamente.', { id: 'reset-qr' });
    } finally {
      setIsResetting(false);
    }
  };

  // Desconectar sessão ativa
  const handleDisconnect = async () => {
    const confirmed = await confirm({
      title: 'Desconectar WhatsApp',
      description: 'Deseja realmente desconectar este aparelho? Você precisará ler o QR Code novamente para reconectar.',
      confirmText: 'Sim, Desconectar',
      cancelText: 'Cancelar',
      variant: 'danger',
      icon: 'trash',
    });

    if (!confirmed) return;

    setIsDisconnecting(true);
    try {
      toast.loading('Desconectando WhatsApp...', { id: 'disc-wa' });
      await safeWhatsAppClient.post('/disconnect');
      await new Promise(r => setTimeout(r, 1000));
      await fetchStatus();
      await onRefreshStatus?.();
      toast.success('WhatsApp desconectado com sucesso.', { id: 'disc-wa' });
    } catch {
      toast.error('Falha ao desconectar. Verifique a conexão com o servidor.', { id: 'disc-wa' });
    } finally {
      setIsDisconnecting(false);
    }
  };

  if (!isOpen) return null;

  const isConnected = Boolean(localStatus?.connected);
  const qrCodeData = localStatus?.qrCode || null;
  const rawQrCode = localStatus?.rawQrCode || null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho do Modal */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl flex items-center justify-center ${
              isConnected ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-primary/10 text-primary border border-primary/20'
            }`}>
              {isConnected ? <Wifi className="w-5 h-5" /> : <QrCode className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Conexão do WhatsApp</h3>
              <p className="text-[11px] text-muted-foreground">Motor Baileys Web Socket</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition cursor-pointer"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Conteúdo do Modal */}
        <div className="p-6 flex flex-col items-center justify-center text-center">
          {isConnected ? (
            /* Estado CONECTADO */
            <div className="w-full flex flex-col items-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 border-2 border-emerald-500/30 flex items-center justify-center text-emerald-500 shadow-sm animate-in zoom-in-95">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div>
                <Badge className="bg-emerald-600 text-white font-bold text-xs px-3 py-0.5 mb-1.5">
                  🟢 WhatsApp Conectado e Ativo
                </Badge>
                <h4 className="text-lg font-black text-foreground">
                  {localStatus?.pushName || 'Sessão Autenticada'}
                </h4>
                {localStatus?.phone && (
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">
                    Telefone: +{localStatus.phone}
                  </p>
                )}
              </div>

              <div className="w-full bg-muted/40 border border-border rounded-xl p-3.5 text-left text-xs space-y-1.5">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Dispositivo:</span>
                  <span className="font-mono text-foreground font-medium">{localStatus?.deviceId || 'pc_local'}</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Status do Chat:</span>
                  <span className="text-emerald-500 font-semibold">Pronto para envio e recebimento</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Sincronização:</span>
                  <span className="text-foreground font-medium">Tempo Real</span>
                </div>
              </div>

              <div className="w-full flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={handleDisconnect}
                  disabled={isDisconnecting}
                  className="flex-1 text-xs text-rose-500 border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-400 gap-1.5"
                >
                  {isDisconnecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
                  Desconectar Este Aparelho
                </Button>
                <Button
                  onClick={onClose}
                  className="flex-1 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
                >
                  Concluir
                </Button>
              </div>
            </div>
          ) : (
            /* Estado DESCONECTADO (QR CODE) */
            <div className="w-full flex flex-col items-center space-y-3.5">
              <Badge variant="outline" className="border-amber-500/40 text-amber-500 bg-amber-500/10 text-[11px] px-2.5 py-0.5">
                <WifiOff className="w-3 h-3 mr-1 inline" /> Aguardando Leitura do QR Code
              </Badge>

              <h4 className="text-sm font-semibold text-foreground">
                Conecte seu WhatsApp com o QR Code abaixo
              </h4>

              {/* Caixa do QR Code em Alto Contraste */}
              <div className="p-3 bg-white rounded-2xl shadow-md border-2 border-primary/20 flex flex-col items-center justify-center min-h-[220px] min-w-[220px]">
                {qrCodeData ? (
                  <img
                    src={qrCodeData.startsWith('data:') ? qrCodeData : `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(rawQrCode || qrCodeData)}`}
                    alt="QR Code WhatsApp Baileys"
                    className="w-48 h-48 rounded-lg object-contain shadow-xs"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center p-6 text-zinc-600 gap-2">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    <span className="text-xs font-semibold">Gerando QR Code...</span>
                    <span className="text-[10px] text-zinc-400">Aguarde 2 segundos</span>
                  </div>
                )}
              </div>

              {/* Instruções Diretas e Limpas */}
              <div className="w-full bg-accent/40 border border-border rounded-xl p-3 text-left space-y-1 text-[11px] text-muted-foreground">
                <div className="flex items-start gap-1.5 font-medium text-foreground">
                  <span className="w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</span>
                  <span>Abra o WhatsApp no seu smartphone</span>
                </div>
                <div className="flex items-start gap-1.5 font-medium text-foreground">
                  <span className="w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</span>
                  <span>Acesse <strong>Aparelhos Conectados</strong> &gt; <strong>Conectar um aparelho</strong></span>
                </div>
                <div className="flex items-start gap-1.5 font-medium text-foreground">
                  <span className="w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">3</span>
                  <span>Aponte a câmera para este QR Code na tela</span>
                </div>
              </div>

              {/* Ações */}
              <div className="w-full flex items-center gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetQr}
                  disabled={isResetting}
                  className="flex-1 text-xs gap-1.5 font-semibold h-9"
                  title="Gera um novo QR code limpo caso o atual expire"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
                  Gerar Novo QR Code
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onClose}
                  className="text-xs font-semibold h-9 px-4"
                >
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
