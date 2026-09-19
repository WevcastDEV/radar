'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, HardDrive, Smartphone, CheckCircle2, RefreshCw, MapPin, LogOut, Database, Download, Upload, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import toast from 'react-hot-toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { BackupModal } from '@/components/leads/backup-modal';
import { clearAllSystemData } from '@/lib/backup-manager';

export default function SettingsPage() {
  const confirm = useConfirm();
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [whatsappStatus, setWhatsappStatus] = useState<{ connected: boolean; qrCode: string | null }>({
    connected: false,
    qrCode: null,
  });

  const [googleKeyInput, setGoogleKeyInput] = useState('');
  const [hasGoogleKey, setHasGoogleKey] = useState(false);
  const [savedGoogleKey, setSavedGoogleKey] = useState('');

  const fetchWhatsAppStatus = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/whatsapp/status');
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setWhatsappStatus(json.data);
        }
      }
    } catch {
      // Backend offline ou iniciando
    }
  };

  const handleReconnectWhatsApp = async (forceNewSession = true) => {
    setIsReconnecting(true);
    try {
      setWhatsappStatus({ connected: false, qrCode: null });
      await fetch('http://localhost:3001/api/whatsapp/reconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceNewSession }),
      });
      toast.success('Gerando novo QR Code... Aponte a câmera!');
      setTimeout(fetchWhatsAppStatus, 1200);
      setTimeout(fetchWhatsAppStatus, 2500);
      setTimeout(fetchWhatsAppStatus, 4500);
    } catch {
      toast.error('Erro ao solicitar novo QR Code');
    } finally {
      setIsReconnecting(false);
    }
  };

  const handleDisconnectWhatsApp = async () => {
    const confirmed = await confirm({
      title: 'Desconectar WhatsApp',
      description: 'Deseja desparear o WhatsApp atual? A sessão será finalizada e um novo QR Code será gerado para conectar outro celular.',
      confirmText: 'Desconectar Aparelho',
      cancelText: 'Cancelar',
      variant: 'warning',
      icon: 'alert',
    });

    if (confirmed) {
      setIsReconnecting(true);
      try {
        setWhatsappStatus({ connected: false, qrCode: null });
        await fetch('http://localhost:3001/api/whatsapp/disconnect', { method: 'POST' });
        toast.success('WhatsApp desconectado! Gerando novo QR Code...');
        setTimeout(fetchWhatsAppStatus, 1200);
        setTimeout(fetchWhatsAppStatus, 2500);
      } catch {
        toast.error('Erro ao desconectar WhatsApp');
      } finally {
        setIsReconnecting(false);
      }
    }
  };

  const fetchGoogleKey = async () => {
    try {
      const res = await fetch('/api/config/google-key');
      if (res.ok) {
        const data = await res.json();
        setHasGoogleKey(data.hasKey);
        setSavedGoogleKey(data.maskedKey);
      }
    } catch {
      // ignore
    }
  };

  const handleSaveGoogleKey = async () => {
    if (!googleKeyInput.trim()) {
      toast.error('Cole sua chave do Google antes de salvar');
      return;
    }

    try {
      const res = await fetch('/api/config/google-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: googleKeyInput.trim() }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Chave da API do Google salva com sucesso!');
        localStorage.setItem('google_places_api_key', googleKeyInput.trim());
        setGoogleKeyInput('');
        fetchGoogleKey();
      } else {
        toast.error(data.error || 'Erro ao salvar chave');
      }
    } catch {
      toast.error('Erro de conexão ao salvar chave');
    }
  };

  useEffect(() => {
    fetchWhatsAppStatus();
    fetchGoogleKey();
    const interval = setInterval(fetchWhatsAppStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleHardReset = () => {
    clearAllSystemData();
    toast.success('Todas as informações, leads, visitas e dados de clientes foram limpos com sucesso!');
    setIsResetModalOpen(false);
    
    setTimeout(() => {
      window.location.href = '/leads';
    }, 1200);
  };

  return (
    <div className="space-y-6 pb-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Configurações do Sistema</h1>
        <p className="text-muted-foreground">Gerencie as preferências e os dados da sua plataforma</p>
      </div>

      <div className="grid gap-6">
        {/* WhatsApp Bot Connection */}
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Smartphone className="w-5 h-5 text-primary" />
                  Robô de Atendimento WhatsApp (Wev Engineer)
                </CardTitle>
                <CardDescription>
                  Conecte seu WhatsApp para ativar a triagem rápida automática e encaminhamento para o Weverton
                </CardDescription>
              </div>
              <Badge variant={whatsappStatus.connected ? 'default' : 'outline'} className={whatsappStatus.connected ? 'bg-success text-success-foreground' : 'text-amber-500 border-amber-500/30'}>
                {whatsappStatus.connected ? '● Conectado e Ativo' : 'Aguardando Leitura do QR Code'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {whatsappStatus.connected ? (
              <div className="p-4 rounded-lg bg-success/10 border border-success/30 text-success flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <CheckCircle2 className="w-8 h-8 flex-shrink-0 text-emerald-400" />
                  <div>
                    <p className="font-bold">O robô do WhatsApp está pareado e respondendo!</p>
                    <p className="text-xs opacity-90">
                      Novos clientes que mandarem mensagem receberão a triagem automática e encaminhamento direto para você.
                    </p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleDisconnectWhatsApp}
                  disabled={isReconnecting}
                  className="text-xs border-destructive/30 text-destructive hover:bg-destructive/10 shrink-0 font-medium"
                >
                  <LogOut className="w-3.5 h-3.5 mr-1.5" />
                  Desconectar / Trocar Aparelho
                </Button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-lg bg-card border border-border">
                {whatsappStatus.qrCode ? (
                  <div className="bg-white p-3 rounded-xl shadow-lg border border-border flex flex-col items-center">
                    <img 
                      src={whatsappStatus.qrCode.startsWith('data:') ? whatsappStatus.qrCode : `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(whatsappStatus.qrCode)}`}
                      alt="QR Code WhatsApp"
                      className="w-52 h-52 rounded-lg"
                    />
                    <span className="text-[11px] text-zinc-700 font-semibold mt-2 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      Aponte a câmera do WhatsApp agora
                    </span>
                  </div>
                ) : (
                  <div className="w-52 h-52 bg-amber-500/10 border border-amber-500/30 rounded-xl flex flex-col items-center justify-center text-center p-4 text-xs text-amber-300">
                    <RefreshCw className="w-6 h-6 animate-spin mb-2 text-amber-400" />
                    <span className="font-semibold text-foreground">Gerando novo QR Code...</span>
                    <span className="text-[11px] text-muted-foreground mt-1">Aguarde 2 segundos</span>
                  </div>
                )}
                
                <div className="space-y-3 flex-1">
                  <h4 className="font-semibold text-foreground text-sm">Como conectar seu WhatsApp:</h4>
                  <ol className="text-xs text-muted-foreground space-y-2 list-decimal list-inside">
                    <li>Abra o aplicativo do <strong>WhatsApp</strong> no seu celular;</li>
                    <li>Vá em <strong>Configurações</strong> ou nos <strong>três pontinhos</strong> (canto superior);</li>
                    <li>Selecione <strong>Aparelhos conectados</strong> e clique em <strong>Conectar aparelho</strong>;</li>
                    <li>Aponte a câmera para o <strong>QR Code</strong> ao lado.</li>
                  </ol>
                  <div className="pt-2 flex flex-wrap gap-2">
                    <Button 
                      variant="default" 
                      size="sm" 
                      onClick={() => handleReconnectWhatsApp(true)}
                      disabled={isReconnecting}
                      className="text-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isReconnecting ? 'animate-spin' : ''}`} />
                      {isReconnecting ? 'Gerando QR Code...' : 'Gerar Novo QR Code'}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={fetchWhatsAppStatus}
                      className="text-xs"
                    >
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                      Atualizar Status
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Google Places API Configuration */}
        <Card className="border-border bg-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <MapPin className="w-5 h-5 text-primary" />
                  Google Maps & Places API (Busca Oficial de Leads)
                </CardTitle>
                <CardDescription>
                  Configure sua chave oficial do Google Cloud para buscar comércios e condomínios com telefones do Google Meu Negócio
                </CardDescription>
              </div>
              <Badge variant={hasGoogleKey ? 'default' : 'outline'} className={hasGoogleKey ? 'bg-success text-success-foreground' : 'text-muted-foreground'}>
                {hasGoogleKey ? '● Chave Google Conectada' : 'Modo Gratuito Ativo (OpenStreetMap)'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-accent/20 border border-border space-y-3">
              <div>
                <label className="text-sm font-medium text-foreground">Chave de API do Google Cloud (API Key)</label>
                <div className="flex gap-2 mt-1">
                  <input 
                    type="password"
                    className="flex-1 h-10 bg-background border border-border rounded-md px-3 text-sm font-mono"
                    placeholder={hasGoogleKey ? `Chave salva: ${savedGoogleKey}` : 'Cole aqui sua chave: AIzaSy...'}
                    value={googleKeyInput}
                    onChange={e => setGoogleKeyInput(e.target.value)}
                  />
                  <Button onClick={handleSaveGoogleKey}>
                    Salvar Chave
                  </Button>
                </div>
              </div>

              {hasGoogleKey && (
                <p className="text-xs text-success flex items-center gap-1 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Chave oficial do Google ativa ({savedGoogleKey}). Todas as buscas de leads consultarão o Google Maps diretamente!
                </p>
              )}

              <div className="pt-2 border-t border-border/50 text-xs text-muted-foreground space-y-1.5">
                <p className="font-semibold text-foreground">💡 Como conseguir sua chave gratuita no Google Cloud (US$ 200 de crédito todo mês):</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Acesse o <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" className="text-primary hover:underline">Google Cloud Console</a> com sua conta Google;</li>
                  <li>Crie um projeto (ex: <em>Radar de Vendas</em>);</li>
                  <li>No menu, vá em <strong>APIs e Serviços</strong> &gt; <strong>Biblioteca</strong> e ative a <strong>Places API (New)</strong>;</li>
                  <li>Vá em <strong>Credenciais</strong> &gt; <strong>Criar Credenciais</strong> &gt; <strong>Chave de API</strong>;</li>
                  <li>Copie a chave que começa com <code className="bg-background px-1 rounded">AIza...</code> e cole no campo acima!</li>
                </ol>
                <p className="text-[11px] text-muted-foreground pt-1">
                  * O Google não cobra nada para até 28.000 buscas por mês dentro da franquia gratuita de US$ 200/mês.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Backup e Migração de Dados */}
        <Card className="border-primary/30 shadow-sm bg-gradient-to-br from-card to-primary/[0.02]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                <CardTitle>Backup e Migração de Dados</CardTitle>
              </div>
              <Badge variant="outline" className="text-primary border-primary/30">
                100% Portátil
              </Badge>
            </div>
            <CardDescription>
              Exporte seus leads para atualizar o sistema, trocar de computador ou abrir no Excel / Google Sheets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between p-4 border border-border rounded-lg bg-card/60">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <h4 className="font-semibold text-foreground text-sm">Central de Backup Completo & Restauração</h4>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Gera arquivo <code className="bg-muted px-1.5 py-0.5 rounded text-[11px] font-mono">.json</code> com todas as notas, coordenadas e histórico para restauração imediata, ou <code className="bg-muted px-1.5 py-0.5 rounded text-[11px] font-mono">.csv</code> compatível com Excel brasileiro.
                </p>
              </div>
              <Button 
                onClick={() => setIsBackupModalOpen(true)} 
                className="whitespace-nowrap shrink-0 shadow-sm"
              >
                <Database className="w-4 h-4 mr-2" />
                Gerenciar Backup & Migração
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Zona de Perigo - Hard Reset */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Zona de Perigo
            </CardTitle>
            <CardDescription>Ações irreversíveis que afetam o banco de dados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between p-4 border border-destructive/20 bg-destructive/5 rounded-lg">
              <div>
                <h4 className="font-bold text-foreground">Hard Reset (Limpar tudo)</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Isso apagará TODOS os leads, clientes, propostas, visitas e configurações do banco de dados para você começar do zero absoluto.
                </p>
              </div>
              <Button variant="destructive" onClick={() => setIsResetModalOpen(true)} className="whitespace-nowrap">
                <HardDrive className="w-4 h-4 mr-2" />
                Hard Reset
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal de Confirmação do Hard Reset */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-card w-full max-w-md rounded-xl border border-border shadow-2xl p-6 text-center">
            <div className="w-16 h-16 bg-destructive/20 text-destructive rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold mb-2">Você tem certeza absoluta?</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Esta ação <strong>NÃO</strong> pode ser desfeita. Todos os dados comerciais, clientes e históricos serão deletados permanentemente. Digite SIM para confirmar.
            </p>
            
            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={() => setIsResetModalOpen(false)}>Cancelar</Button>
              <Button variant="destructive" onClick={handleHardReset}>SIM, Limpar Tudo</Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Backup e Migração */}
      <BackupModal 
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
      />
    </div>
  );
}
