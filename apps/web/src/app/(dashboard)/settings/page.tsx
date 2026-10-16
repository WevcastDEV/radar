'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, HardDrive, Smartphone, CheckCircle2, RefreshCw, RotateCcw, MapPin, LogOut, Database, Download, Upload, ShieldCheck, Building2, Trash2, Palette, Sparkles, Image as ImageIcon, Check, Sun, Moon, Monitor, Save, UploadCloud, X as CloseIcon, Instagram, Linkedin, Github, UserCheck, User, MessageSquare, Server, Wifi, Copy, CheckCheck, ExternalLink, Laptop } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import toast from 'react-hot-toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { BackupModal } from '@/components/leads/backup-modal';
import { ResetClientHistoryModal } from '@/components/whatsapp/reset-client-history-modal';
import { clearAllSystemData } from '@/lib/backup-manager';
import { getOrCreateDeviceId } from '@/lib/device-id';
import { useBrandingStore, ColorPalette, LogoStyle } from '@/stores/branding-store';
import { useThemeStore } from '@/stores/theme-store';

function getBackendDirectUrl(): string {
  if (typeof window !== 'undefined' && window.location.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return `http://${window.location.hostname}:3001`;
  }
  return 'http://127.0.0.1:3001';
}

export default function SettingsPage() {
  const confirm = useConfirm();
  const branding = useBrandingStore();
  const { theme, setTheme } = useThemeStore();

  const [companyName, setCompanyName] = useState(branding.companyName);
  const [companySlogan, setCompanySlogan] = useState(branding.companySlogan);
  const [platformTitle, setPlatformTitle] = useState(branding.platformTitle);
  const [companyLogo, setCompanyLogo] = useState(branding.companyLogo);
  const [logoStyle, setLogoStyle] = useState<LogoStyle>(branding.logoStyle || 'compact');
  const [instagramUrl, setInstagramUrl] = useState(branding.instagramUrl || 'https://instagram.com/criart.acre?igsh=MXZ0eG9qNGk1b3h5OQ==');
  const [linkedinUrl, setLinkedinUrl] = useState(branding.linkedinUrl || 'https://www.linkedin.com/in/weverton-castelo-branco-005b39355');
  const [githubUrl, setGithubUrl] = useState(branding.githubUrl || 'https://github.com/WevcastDEV');
  const [previewTheme, setPreviewTheme] = useState<'dark' | 'light'>('dark');
  const [colorPalette, setColorPalette] = useState<ColorPalette>(branding.colorPalette);
  const [customPrimaryColor, setCustomPrimaryColor] = useState(branding.customPrimaryColor || '#f97316');
  const [isSavingBranding, setIsSavingBranding] = useState(false);

  const brandInitials = (companyName || 'CRIART')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || 'CB';

  useEffect(() => {
    setCompanyName(branding.companyName);
    setCompanySlogan(branding.companySlogan);
    setPlatformTitle(branding.platformTitle);
    setCompanyLogo(branding.companyLogo);
    setLogoStyle(branding.logoStyle || 'compact');
    setInstagramUrl(branding.instagramUrl || 'https://instagram.com/criart.acre?igsh=MXZ0eG9qNGk1b3h5OQ==');
    setLinkedinUrl(branding.linkedinUrl || 'https://www.linkedin.com/in/weverton-castelo-branco-005b39355');
    setGithubUrl(branding.githubUrl || 'https://github.com/WevcastDEV');
    setColorPalette(branding.colorPalette);
    setCustomPrimaryColor(branding.customPrimaryColor || '#f97316');
  }, [branding.companyName, branding.companySlogan, branding.platformTitle, branding.companyLogo, branding.logoStyle, branding.instagramUrl, branding.linkedinUrl, branding.githubUrl, branding.colorPalette, branding.customPrimaryColor]);

  // Título personalizável do atendente (assinatura em negrito no WhatsApp)
  const [attendantLabel, setAttendantLabel] = useState(branding.attendantLabel || 'Atendente');
  const [isSavingAttendantLabel, setIsSavingAttendantLabel] = useState(false);
  useEffect(() => {
    setAttendantLabel(branding.attendantLabel || 'Atendente');
  }, [branding.attendantLabel]);

  const ATTENDANT_LABEL_PRESETS = ['Atendente', 'Consultor', 'Consultora', 'Vendedor', 'Vendedora', 'Especialista', 'Suporte', 'Equipe'];
  const cleanAttendantLabel = (attendantLabel || '').replace(/[*\n\r:]/g, '').replace(/\s+/g, ' ').trim().slice(0, 30);
  const [attendantPreviewName, setAttendantPreviewName] = useState('Weverton');
  useEffect(() => {
    try {
      const n = JSON.parse(localStorage.getItem('radar_user_profile') || '{}')?.name;
      if (n) setAttendantPreviewName(String(n).split(' ')[0]);
    } catch {}
  }, []);

  const handleSaveAttendantLabel = async (value?: string) => {
    const finalLabel = (value ?? cleanAttendantLabel).replace(/[*\n\r:]/g, '').replace(/\s+/g, ' ').trim().slice(0, 30);
    if (!finalLabel) {
      toast.error('Informe um título para o atendente (ex: Consultor, Vendedor).');
      return;
    }
    setAttendantLabel(finalLabel);
    setIsSavingAttendantLabel(true);
    try {
      await branding.saveSettings({ attendantLabel: finalLabel });
      toast.success(`Título atualizado! Suas mensagens serão assinadas como "*${finalLabel} Nome:*"`);
    } finally {
      setIsSavingAttendantLabel(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('A imagem da logo deve ter no máximo 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        setCompanyLogo(base64);
        branding.setLogo(base64);
        toast.success('Logotipo carregado com sucesso!');
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePaletteSelect = (pal: ColorPalette) => {
    setColorPalette(pal);
    branding.setPalette(pal, customPrimaryColor);
  };

  const handleCustomColorChange = (color: string) => {
    setCustomPrimaryColor(color);
    setColorPalette('custom');
    branding.setPalette('custom', color);
  };

  const handleLogoStyleChange = (style: LogoStyle) => {
    setLogoStyle(style);
    branding.setLogoStyle(style);
    toast.success(`Estilo do logo alterado para: ${style === 'compact' ? 'Executivo Horizontal' : 'Medalhão Central'}`);
  };

  const handleSaveBranding = async () => {
    setIsSavingBranding(true);
    try {
      const ok = await branding.saveSettings({
        companyName,
        companySlogan,
        platformTitle,
        companyLogo,
        logoStyle,
        instagramUrl,
        linkedinUrl,
        githubUrl,
        attendantLabel: cleanAttendantLabel || 'Atendente',
        colorPalette,
        customPrimaryColor,
        themeMode: theme,
      });
      if (ok) {
        toast.success('Configurações salvas permanentemente no computador!');
      } else {
        toast.success('Salvo localmente com sucesso!');
      }
    } catch {
      toast.error('Erro ao salvar no computador.');
    } finally {
      setIsSavingBranding(false);
    }
  };

  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isResetClientHistoryModalOpen, setIsResetClientHistoryModalOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [whatsappStatus, setWhatsappStatus] = useState<{ connected: boolean; qrCode: string | null }>({
    connected: false,
    qrCode: null,
  });

  const [serverInfo, setServerInfo] = useState<{
    serverIp: string;
    webPort: number;
    apiPort: number;
    localUrl: string;
    networkUrl: string;
    hostname: string;
  } | null>(null);
  const [copiedNetworkUrl, setCopiedNetworkUrl] = useState(false);

  const fetchServerInfo = async () => {
    try {
      let res = await fetch('/api/server-info', { signal: AbortSignal.timeout(3000) }).catch(() => null);
      if (!res || !res.ok) {
        res = await fetch(`${getBackendDirectUrl()}/api/server-info`, { signal: AbortSignal.timeout(3000) }).catch(() => null);
      }
      if (res && res.ok) {
        const json = await res.json();
        const data = json.data || json;
        if (data && data.serverIp) {
          setServerInfo(data);
        }
      }
    } catch {}
  };

  const handleCopyNetworkUrl = (url: string) => {
    try {
      navigator.clipboard.writeText(url);
      setCopiedNetworkUrl(true);
      toast.success('Link da Rede Local copiado!');
      setTimeout(() => setCopiedNetworkUrl(false), 3000);
    } catch {
      toast.error('Não foi possível copiar automaticamente.');
    }
  };

  const fetchWhatsAppStatus = async () => {
    try {
      const deviceId = getOrCreateDeviceId();
      const headers = { 'x-device-id': deviceId };
      let res = await fetch('/api/whatsapp/status', { headers, signal: AbortSignal.timeout(3000) }).catch(() => null);
      if (!res || !res.ok) {
        res = await fetch(`${getBackendDirectUrl()}/api/whatsapp/status`, { headers, signal: AbortSignal.timeout(3000) }).catch(() => null);
      }
      if (res && res.ok) {
        const json = await res.json();
        const data = json.data || json;
        if (data) {
          setWhatsappStatus({
            connected: Boolean(data.connected),
            qrCode: data.qrCode || null,
          });
        }
      }
    } catch {
      // Backend offline ou iniciando
    }
  };

  const handleResetWhatsApp = async () => {
    setIsReconnecting(true);
    toast.loading('Redefinindo sessão e forçando novo QR Code...', { id: 'reset-qr' });
    try {
      const deviceId = getOrCreateDeviceId();
      setWhatsappStatus({ connected: false, qrCode: null });

      const headers = { 'Content-Type': 'application/json', 'x-device-id': deviceId };
      const p1 = fetch('/api/whatsapp/reset', { method: 'POST', headers, signal: AbortSignal.timeout(5000) }).catch(() => {});
      const p2 = fetch(`${getBackendDirectUrl()}/api/whatsapp/reset`, { method: 'POST', headers, signal: AbortSignal.timeout(5000) }).catch(() => {});

      await Promise.race([Promise.all([p1, p2]), new Promise(r => setTimeout(r, 1200))]);
      toast.success('Conexão resetada! Aponte a câmera para o QR Code.', { id: 'reset-qr' });

      setTimeout(fetchWhatsAppStatus, 1000);
      setTimeout(fetchWhatsAppStatus, 2500);
      setTimeout(fetchWhatsAppStatus, 4500);
      setTimeout(fetchWhatsAppStatus, 7000);
    } catch {
      toast.error('Erro ao redefinir WhatsApp', { id: 'reset-qr' });
    } finally {
      setIsReconnecting(false);
    }
  };

  const handleReconnectWhatsApp = async (forceNewSession = true) => {
    return handleResetWhatsApp();
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
        const deviceId = getOrCreateDeviceId();
        setWhatsappStatus({ connected: false, qrCode: null });
        const headers = { 'Content-Type': 'application/json', 'x-device-id': deviceId };
        await fetch('/api/whatsapp/disconnect', { method: 'POST', headers }).catch(() => {
          return fetch(`${getBackendDirectUrl()}/api/whatsapp/disconnect`, { method: 'POST', headers });
        });
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

  useEffect(() => {
    fetchWhatsAppStatus();
    fetchServerInfo();
    const interval = setInterval(fetchWhatsAppStatus, 3000);
    const serverInterval = setInterval(fetchServerInfo, 10000);
    return () => {
      clearInterval(interval);
      clearInterval(serverInterval);
    };
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
        {/* Personalização da Empresa e Cores da Plataforma */}
        <Card className="border-primary/40 shadow-sm bg-gradient-to-br from-card to-primary/[0.04]">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
                  <Palette className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-foreground flex items-center gap-2 text-lg">
                    Personalização da Empresa & Cores
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
                      Salvo no PC
                    </span>
                  </CardTitle>
                  <CardDescription>
                    Altere o nome da plataforma, adicione o logotipo da sua empresa e escolha as cores do programa.
                  </CardDescription>
                </div>
              </div>

              <Button
                onClick={handleSaveBranding}
                disabled={isSavingBranding}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs gap-1.5 shadow-sm shrink-0"
              >
                <Save className={`w-4 h-4 ${isSavingBranding ? 'animate-spin' : ''}`} />
                {isSavingBranding ? 'Salvando...' : 'Salvar no Computador'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Seletor de Paletas de Cores */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  Paleta de Cores do Programa
                </label>
                <span className="text-[11px] text-muted-foreground">
                  Altera botões, detalhes e destaques em todo o sistema
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
                {/* 1. Laranja Criart */}
                <button
                  type="button"
                  onClick={() => handlePaletteSelect('orange')}
                  className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between gap-2 cursor-pointer ${
                    colorPalette === 'orange'
                      ? 'border-orange-500 bg-orange-500/10 ring-2 ring-orange-500/30'
                      : 'border-border bg-card/60 hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-orange-500 shadow-xs" />
                      <span className="w-2.5 h-2.5 rounded-full bg-zinc-900 border border-zinc-700" />
                      <span className="w-2.5 h-2.5 rounded-full bg-white border border-zinc-300" />
                    </div>
                    {colorPalette === 'orange' && <Check className="w-4 h-4 text-orange-500" />}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">Laranja Criart</p>
                    <p className="text-[10px] text-muted-foreground">Original</p>
                  </div>
                </button>

                {/* 2. Verde Esmeralda */}
                <button
                  type="button"
                  onClick={() => handlePaletteSelect('emerald')}
                  className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between gap-2 cursor-pointer ${
                    colorPalette === 'emerald'
                      ? 'border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/30'
                      : 'border-border bg-card/60 hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-emerald-500 shadow-xs" />
                      <span className="w-2.5 h-2.5 rounded-full bg-teal-800" />
                    </div>
                    {colorPalette === 'emerald' && <Check className="w-4 h-4 text-emerald-500" />}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">Esmeralda</p>
                    <p className="text-[10px] text-muted-foreground">Verde Moderno</p>
                  </div>
                </button>

                {/* 3. Azul Corporativo */}
                <button
                  type="button"
                  onClick={() => handlePaletteSelect('blue')}
                  className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between gap-2 cursor-pointer ${
                    colorPalette === 'blue'
                      ? 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/30'
                      : 'border-border bg-card/60 hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-blue-600 shadow-xs" />
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-800" />
                    </div>
                    {colorPalette === 'blue' && <Check className="w-4 h-4 text-blue-500" />}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">Azul Safira</p>
                    <p className="text-[10px] text-muted-foreground">Corporativo</p>
                  </div>
                </button>

                {/* 4. Roxo Neon */}
                <button
                  type="button"
                  onClick={() => handlePaletteSelect('violet')}
                  className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between gap-2 cursor-pointer ${
                    colorPalette === 'violet'
                      ? 'border-violet-500 bg-violet-500/10 ring-2 ring-violet-500/30'
                      : 'border-border bg-card/60 hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-violet-500 shadow-xs" />
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-900" />
                    </div>
                    {colorPalette === 'violet' && <Check className="w-4 h-4 text-violet-500" />}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">Roxo Neon</p>
                    <p className="text-[10px] text-muted-foreground">Criativo</p>
                  </div>
                </button>

                {/* 5. Rosa Carmim / Pink */}
                <button
                  type="button"
                  onClick={() => handlePaletteSelect('rose')}
                  className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between gap-2 cursor-pointer ${
                    colorPalette === 'rose'
                      ? 'border-rose-500 bg-rose-500/10 ring-2 ring-rose-500/30'
                      : 'border-border bg-card/60 hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-rose-500 shadow-xs" />
                      <span className="w-2.5 h-2.5 rounded-full bg-pink-800" />
                    </div>
                    {colorPalette === 'rose' && <Check className="w-4 h-4 text-rose-500" />}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">Rosa Carmim</p>
                    <p className="text-[10px] text-muted-foreground">Vibrante & Fashion</p>
                  </div>
                </button>

                {/* 6. Âmbar / Ouro */}
                <button
                  type="button"
                  onClick={() => handlePaletteSelect('amber')}
                  className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between gap-2 cursor-pointer ${
                    colorPalette === 'amber'
                      ? 'border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/30'
                      : 'border-border bg-card/60 hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-amber-500 shadow-xs" />
                      <span className="w-2.5 h-2.5 rounded-full bg-yellow-800" />
                    </div>
                    {colorPalette === 'amber' && <Check className="w-4 h-4 text-amber-500" />}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">Âmbar & Ouro</p>
                    <p className="text-[10px] text-muted-foreground">Premium & Luxo</p>
                  </div>
                </button>

                {/* 7. Ciano Elétrico */}
                <button
                  type="button"
                  onClick={() => handlePaletteSelect('cyan')}
                  className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between gap-2 cursor-pointer ${
                    colorPalette === 'cyan'
                      ? 'border-cyan-500 bg-cyan-500/10 ring-2 ring-cyan-500/30'
                      : 'border-border bg-card/60 hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-cyan-500 shadow-xs" />
                      <span className="w-2.5 h-2.5 rounded-full bg-cyan-900" />
                    </div>
                    {colorPalette === 'cyan' && <Check className="w-4 h-4 text-cyan-500" />}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">Ciano Elétrico</p>
                    <p className="text-[10px] text-muted-foreground">Tech & Futurista</p>
                  </div>
                </button>

                {/* 8. Índigo Profundo */}
                <button
                  type="button"
                  onClick={() => handlePaletteSelect('indigo')}
                  className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between gap-2 cursor-pointer ${
                    colorPalette === 'indigo'
                      ? 'border-indigo-500 bg-indigo-500/10 ring-2 ring-indigo-500/30'
                      : 'border-border bg-card/60 hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-indigo-500 shadow-xs" />
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-900" />
                    </div>
                    {colorPalette === 'indigo' && <Check className="w-4 h-4 text-indigo-500" />}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">Índigo</p>
                    <p className="text-[10px] text-muted-foreground">Profundo & Moderno</p>
                  </div>
                </button>

                {/* 9. Verde Petróleo / Teal */}
                <button
                  type="button"
                  onClick={() => handlePaletteSelect('teal')}
                  className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between gap-2 cursor-pointer ${
                    colorPalette === 'teal'
                      ? 'border-teal-500 bg-teal-500/10 ring-2 ring-teal-500/30'
                      : 'border-border bg-card/60 hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-teal-500 shadow-xs" />
                      <span className="w-2.5 h-2.5 rounded-full bg-teal-900" />
                    </div>
                    {colorPalette === 'teal' && <Check className="w-4 h-4 text-teal-500" />}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">Verde Petróleo</p>
                    <p className="text-[10px] text-muted-foreground">Equilíbrio & Foco</p>
                  </div>
                </button>

                {/* 10. Vermelho Rubi */}
                <button
                  type="button"
                  onClick={() => handlePaletteSelect('ruby')}
                  className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between gap-2 cursor-pointer ${
                    colorPalette === 'ruby'
                      ? 'border-red-500 bg-red-500/10 ring-2 ring-red-500/30'
                      : 'border-border bg-card/60 hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-red-500 shadow-xs" />
                      <span className="w-2.5 h-2.5 rounded-full bg-red-950" />
                    </div>
                    {colorPalette === 'ruby' && <Check className="w-4 h-4 text-red-500" />}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">Vermelho Rubi</p>
                    <p className="text-[10px] text-muted-foreground">Alta Energia</p>
                  </div>
                </button>

                {/* 11. Preto & Branco */}
                <button
                  type="button"
                  onClick={() => handlePaletteSelect('monochrome')}
                  className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between gap-2 cursor-pointer ${
                    colorPalette === 'monochrome'
                      ? 'border-zinc-400 bg-zinc-500/10 ring-2 ring-zinc-400/30'
                      : 'border-border bg-card/60 hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-zinc-950 dark:bg-white border border-border shadow-xs" />
                      <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                      <span className="w-2.5 h-2.5 rounded-full bg-zinc-300" />
                    </div>
                    {colorPalette === 'monochrome' && <Check className="w-4 h-4 text-foreground" />}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">Preto e Branco</p>
                    <p className="text-[10px] text-muted-foreground">Minimalista</p>
                  </div>
                </button>

                {/* 12. Cor Livre / Personalizada */}
                <div
                  className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between gap-2 ${
                    colorPalette === 'custom'
                      ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
                      : 'border-border bg-card/60 hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <input
                      type="color"
                      value={customPrimaryColor}
                      onChange={(e) => handleCustomColorChange(e.target.value)}
                      className="w-5 h-5 rounded cursor-pointer border-0 p-0 bg-transparent"
                      title="Clique para escolher qualquer cor personalizada"
                    />
                    {colorPalette === 'custom' && <Check className="w-4 h-4 text-primary" />}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">Personalizada</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{customPrimaryColor}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Alternador de Tema: Claro / Escuro / Sistema */}
            <div className="pt-2 border-t border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-foreground">Modo Visual de Exibição</p>
                <p className="text-[11px] text-muted-foreground">Escolha entre modo escuro de alto contraste ou modo claro</p>
              </div>

              <div className="flex items-center gap-1.5 p-1 bg-muted/50 rounded-xl border border-border">
                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    theme === 'dark' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Moon className="w-3.5 h-3.5 text-blue-400" />
                  Escuro
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    theme === 'light' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                  Claro
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('system')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    theme === 'system' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  Auto
                </button>
              </div>
            </div>

            {/* Dados da Empresa & Logotipo */}
            <div className="pt-4 border-t border-border grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Inputs de Nome e Slogan */}
              <div className="space-y-3.5">
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    Nome da Empresa / Plataforma
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Ex: CRIART BRASIL"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-card border border-border text-foreground focus:ring-1 focus:ring-primary outline-none"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Exibido na barra lateral, no cabeçalho e nos relatórios.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    Slogan / Ramo de Atuação
                  </label>
                  <input
                    type="text"
                    value={companySlogan}
                    onChange={(e) => setCompanySlogan(e.target.value)}
                    placeholder="Ex: Comunicação Visual, Gráfica & Móveis Planejados"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-card border border-border text-foreground focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    Título da Aba do Navegador
                  </label>
                  <input
                    type="text"
                    value={platformTitle}
                    onChange={(e) => setPlatformTitle(e.target.value)}
                    placeholder="Ex: CRIART BRASIL"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-card border border-border text-foreground focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>

                {/* Redes Sociais */}
                <div className="pt-2 border-t border-border/70 space-y-2.5">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    Redes Sociais & Links (Menu & Cabeçalho)
                  </span>

                  <div>
                    <label className="text-[11px] font-semibold text-foreground flex items-center gap-1.5 mb-1">
                      <Instagram className="w-3.5 h-3.5 text-pink-500" />
                      Link do Instagram Pessoal
                    </label>
                    <input
                      type="url"
                      value={instagramUrl}
                      onChange={(e) => setInstagramUrl(e.target.value)}
                      placeholder="https://www.instagram.com/wctechn_"
                      className="w-full px-3 py-2 text-xs rounded-xl bg-card border border-border text-foreground focus:ring-1 focus:ring-primary outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-foreground flex items-center gap-1.5 mb-1">
                      <Linkedin className="w-3.5 h-3.5 text-blue-500" />
                      Link do LinkedIn
                    </label>
                    <input
                      type="url"
                      value={linkedinUrl}
                      onChange={(e) => setLinkedinUrl(e.target.value)}
                      placeholder="https://www.linkedin.com/in/..."
                      className="w-full px-3 py-2 text-xs rounded-xl bg-card border border-border text-foreground focus:ring-1 focus:ring-primary outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-foreground flex items-center gap-1.5 mb-1">
                      <Github className="w-3.5 h-3.5" />
                      Link do GitHub
                    </label>
                    <input
                      type="url"
                      value={githubUrl}
                      onChange={(e) => setGithubUrl(e.target.value)}
                      placeholder="https://github.com/WevcastDEV"
                      className="w-full px-3 py-2 text-xs rounded-xl bg-card border border-border text-foreground focus:ring-1 focus:ring-primary outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Upload, Estilo e Pré-visualização do Logotipo */}
              <div className="space-y-4 pt-3 border-t border-border/70">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                      <ImageIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-foreground block">
                        Logotipo & Identidade Visual da Empresa
                      </span>
                      <span className="text-[10px] text-muted-foreground block">
                        Personalize a imagem que aparece no topo do menu lateral e em todo o sistema
                      </span>
                    </div>
                  </div>
                  {companyLogo && (
                    <button
                      type="button"
                      onClick={() => {
                        setCompanyLogo('');
                        branding.setLogo('');
                        toast.success('Logotipo removido! Usando ícone padrão.');
                      }}
                      className="text-[11px] text-destructive hover:underline flex items-center gap-1 cursor-pointer font-medium"
                    >
                      <CloseIcon className="w-3.5 h-3.5" />
                      Remover Logotipo
                    </button>
                  )}
                </div>

                {/* Escolha do Estilo de Apresentação no Menu */}
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    Estilo de Exibição no Menu Lateral:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Estilo 1: Executivo Horizontal (Recomendado) */}
                    <div
                      onClick={() => handleLogoStyleChange('compact')}
                      className={`relative p-3 rounded-xl border cursor-pointer transition-all ${
                        logoStyle === 'compact'
                          ? 'bg-primary/10 border-primary shadow-xs ring-1 ring-primary/40'
                          : 'bg-card/70 border-border/80 hover:bg-accent/50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                            logoStyle === 'compact' ? 'border-primary bg-primary' : 'border-muted-foreground'
                          }`}>
                            {logoStyle === 'compact' && <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />}
                          </div>
                          <span className="text-xs font-black text-foreground">Executivo Horizontal</span>
                        </div>
                        <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                          Recomendado
                        </span>
                      </div>
                      <p className="text-[10.5px] text-muted-foreground mt-1.5 leading-snug">
                        Emblema 48x48 elegante ao lado do nome e slogan. Visual limpo, executivo (estilo Linear/Stripe) e sem caixas pretas vazias.
                      </p>
                    </div>

                    {/* Estilo 2: Medalhão Central (Hero) */}
                    <div
                      onClick={() => handleLogoStyleChange('hero')}
                      className={`relative p-3 rounded-xl border cursor-pointer transition-all ${
                        logoStyle === 'hero'
                          ? 'bg-primary/10 border-primary shadow-xs ring-1 ring-primary/40'
                          : 'bg-card/70 border-border/80 hover:bg-accent/50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                            logoStyle === 'hero' ? 'border-primary bg-primary' : 'border-muted-foreground'
                          }`}>
                            {logoStyle === 'hero' && <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />}
                          </div>
                          <span className="text-xs font-black text-foreground">Medalhão Central (Hero)</span>
                        </div>
                        <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-primary/20 text-primary border border-primary/30">
                          Destaque
                        </span>
                      </div>
                      <p className="text-[10.5px] text-muted-foreground mt-1.5 leading-snug">
                        Logotipo ampliado e centralizado com iluminação ambiente suave, sem molduras retangulares cortando as laterais.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Upload & Troca de Imagem */}
                <div className="p-3.5 rounded-xl border border-dashed border-border/80 bg-muted/15 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-card border border-border p-1 flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                      {companyLogo ? (
                        <img src={companyLogo} alt="Logo" className="w-full h-full object-contain" />
                      ) : (
                        <div className="w-full h-full rounded-lg bg-primary flex items-center justify-center font-black text-primary-foreground text-xs">
                          {brandInitials}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">
                        {companyLogo ? 'Logotipo Atual Carregado' : 'Nenhuma imagem carregada'}
                      </p>
                      <p className="text-[10.5px] text-muted-foreground">
                        {companyLogo ? 'Imagem ativa no sistema e salva no computador' : 'O sistema está usando as iniciais estilizadas da empresa'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs cursor-pointer transition-all shadow-sm active:scale-95">
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>{companyLogo ? 'Trocar Imagem...' : 'Carregar Imagem do PC'}</span>
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/jpg, image/svg+xml, image/webp"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Live Preview Fiel ao Menu Lateral */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      Pré-visualização em tempo real (como aparece no menu lateral):
                    </span>

                    {/* Alternador de tema da prévia */}
                    <div className="flex items-center gap-1 bg-muted/40 p-0.5 rounded-lg border border-border/70 text-[10px]">
                      <button
                        type="button"
                        onClick={() => setPreviewTheme('dark')}
                        className={`px-2 py-0.5 rounded-md font-semibold transition-all ${
                          previewTheme === 'dark' ? 'bg-zinc-800 text-white shadow-xs' : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        🌙 Escuro
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewTheme('light')}
                        className={`px-2 py-0.5 rounded-md font-semibold transition-all ${
                          previewTheme === 'light' ? 'bg-white text-zinc-900 shadow-xs' : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        ☀️ Claro
                      </button>
                    </div>
                  </div>

                  {/* Mockup da Sidebar */}
                  <div className={`p-4 rounded-2xl border transition-colors duration-200 flex items-center justify-center ${
                    previewTheme === 'dark' ? 'bg-zinc-950/90 border-zinc-800' : 'bg-slate-100 border-slate-200'
                  }`}>
                    <div className="w-full max-w-[280px]">
                      {/* O Card do Cabeçalho Renderizado Exatamente como no Sidebar */}
                      <div className={`relative rounded-2xl border p-3 shadow-xs overflow-hidden transition-all ${
                        previewTheme === 'dark'
                          ? 'bg-gradient-to-b from-zinc-900/95 via-zinc-900/80 to-zinc-950/50 border-zinc-800'
                          : 'bg-gradient-to-b from-white via-white/90 to-slate-50 border-slate-200 shadow-sm'
                      }`}>
                        {/* Ambient glow */}
                        <div className="absolute -top-12 -right-12 w-28 h-28 bg-primary/10 rounded-full blur-2xl pointer-events-none" />

                        {logoStyle === 'hero' && companyLogo ? (
                          <div className="flex flex-col items-center text-center relative z-10 py-1">
                            <div className="relative mb-2">
                              <div className="absolute inset-0 bg-primary/25 rounded-2xl blur-lg scale-90" />
                              <div className={`relative w-16 h-16 rounded-2xl border-2 border-primary/30 shadow-md p-1.5 flex items-center justify-center overflow-hidden ${
                                previewTheme === 'dark' ? 'bg-zinc-900' : 'bg-white'
                              }`}>
                                <img
                                  src={companyLogo}
                                  alt="Logo"
                                  className="w-full h-full object-contain rounded-xl"
                                />
                              </div>
                            </div>

                            <div className="flex items-center justify-center gap-1.5 w-full px-1">
                              <span className={`font-black text-sm tracking-tight line-clamp-1 ${
                                previewTheme === 'dark' ? 'text-white' : 'text-zinc-900'
                              }`}>
                                {companyName || 'CRIART BRASIL'}
                              </span>
                              <span className="text-[9px] uppercase font-black px-1.5 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 shrink-0">
                                PRO
                              </span>
                            </div>

                            <p className={`text-[11px] font-medium mt-0.5 line-clamp-2 px-1 leading-snug ${
                              previewTheme === 'dark' ? 'text-zinc-400' : 'text-zinc-600'
                            }`}>
                              {companySlogan || 'Comunicação Visual'}
                            </p>

                            <div className="flex items-center justify-center gap-1.5 mt-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                              <span className={`text-[10px] font-semibold ${
                                previewTheme === 'dark' ? 'text-zinc-400' : 'text-zinc-600'
                              }`}>Sistema Online</span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3 relative z-10">
                            {companyLogo ? (
                              <div className={`relative w-12 h-12 rounded-xl p-0.5 bg-gradient-to-br from-primary/30 via-border/60 to-border/20 border shadow-sm shrink-0 flex items-center justify-center overflow-hidden ${
                                previewTheme === 'dark' ? 'border-zinc-800' : 'border-slate-200'
                              }`}>
                                <div className={`w-full h-full rounded-[10px] flex items-center justify-center overflow-hidden p-0.5 ${
                                  previewTheme === 'dark' ? 'bg-zinc-900' : 'bg-white'
                                }`}>
                                  <img
                                    src={companyLogo}
                                    alt="Logo"
                                    className="w-full h-full object-contain rounded-md"
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-primary-foreground text-sm shadow-md shrink-0 bg-primary">
                                {brandInitials}
                              </div>
                            )}

                            <div className="truncate flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className={`font-black text-xs tracking-tight truncate ${
                                  previewTheme === 'dark' ? 'text-white' : 'text-zinc-900'
                                }`}>
                                  {companyName || 'CRIART BRASIL'}
                                </span>
                                <span className="text-[9px] uppercase font-black px-1.5 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 shrink-0">
                                  PRO
                                </span>
                              </div>
                              <p className={`text-[10.5px] font-medium truncate mt-0.5 leading-tight ${
                                previewTheme === 'dark' ? 'text-zinc-400' : 'text-zinc-600'
                              }`}>
                                {companySlogan || 'Comunicação Visual'}
                              </p>
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                                <span className={`text-[10px] font-semibold truncate ${
                                  previewTheme === 'dark' ? 'text-zinc-400' : 'text-zinc-600'
                                }`}>Sistema Ativo</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-[10.5px] text-muted-foreground flex items-start gap-2 leading-relaxed">
                  <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>
                    <strong>Dica para o melhor resultado:</strong> Recomendamos imagens com fundo transparente (PNG ou SVG) ou em formato quadrado (1:1). As alterações ficam salvas permanentemente no disco deste computador.
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Identificação do Atendente no WhatsApp (Título / Cargo Personalizado) */}
        <Card className="border-primary/40 shadow-sm bg-gradient-to-br from-card to-primary/[0.04]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-foreground flex items-center gap-2 text-lg">
                  <UserCheck className="w-5 h-5 text-primary" />
                  Identificação do Atendente (Título / Cargo no WhatsApp)
                </CardTitle>
                <CardDescription>
                  Personalize como a sua equipe se identifica nas mensagens enviadas aos clientes. Em vez de aparecer <strong>*Atendente [Nome]:*</strong>, você pode escolher <strong>*Consultor [Nome]:*</strong>, <strong>*Vendedor [Nome]:*</strong>, <strong>*Especialista [Nome]:*</strong> ou qualquer outro título de sua preferência.
                </CardDescription>
              </div>
              <Badge className="bg-primary/20 text-primary border-primary/30 text-xs px-2.5 py-1">
                Atualmente: *{cleanAttendantLabel || 'Atendente'}*
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Opções e Input */}
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1.5">
                    Sugestões Rápidas de Títulos:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {ATTENDANT_LABEL_PRESETS.map((preset) => {
                      const isSelected = cleanAttendantLabel.toLowerCase() === preset.toLowerCase();
                      return (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => {
                            setAttendantLabel(preset);
                            handleSaveAttendantLabel(preset);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                            isSelected
                              ? 'bg-primary text-primary-foreground border-primary shadow-xs scale-105'
                              : 'bg-background hover:bg-muted text-foreground border-border hover:border-primary/50'
                          }`}
                        >
                          {preset}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">
                    Ou Digite um Título Personalizado:
                  </label>
                  <div className="flex gap-2">
                    <Input
                      value={attendantLabel}
                      onChange={(e) => setAttendantLabel(e.target.value)}
                      placeholder="Ex: Consultor, Especialista, Vendedor..."
                      maxLength={30}
                      className="text-xs h-9 font-medium"
                    />
                    <Button
                      size="sm"
                      onClick={() => handleSaveAttendantLabel()}
                      disabled={isSavingAttendantLabel || !cleanAttendantLabel}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shrink-0 gap-1.5"
                    >
                      {isSavingAttendantLabel ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                      Salvar
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Limite de até 30 caracteres. Caracteres especiais como asteriscos (*) e dois-pontos (:) são formatados automaticamente.
                  </p>
                </div>
              </div>

              {/* Pré-visualização da Mensagem */}
              <div className="bg-background/90 rounded-2xl border border-border p-4 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-foreground mb-2">
                    <MessageSquare className="w-4 h-4 text-emerald-500" />
                    <span>Como o cliente verá no WhatsApp:</span>
                  </div>
                  <div className="bg-[#0b141a] dark:bg-[#0b141a] p-3 rounded-xl border border-border/40 shadow-inner">
                    <div className="max-w-[85%] ml-auto bg-[#005c4b] text-[#e9edef] rounded-lg p-2.5 shadow text-xs space-y-1">
                      <p className="font-bold text-emerald-300">
                        *{cleanAttendantLabel || 'Atendente'} {attendantPreviewName}:*
                      </p>
                      <p className="text-[11px] leading-relaxed">
                        Olá! Recebi sua mensagem e já estou verificando o seu pedido aqui no sistema. Como posso te ajudar hoje?
                      </p>
                      <div className="text-[9px] text-[#8696a0] text-right font-mono flex items-center justify-end gap-1 pt-0.5">
                        <span>14:30</span>
                        <span className="text-[#53bdeb]">✓✓</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-[11px] text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>
                    Aplicado instantaneamente em todas as mensagens manuais enviadas pelo Chat Comercial.
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Servidor Central & Acesso Multi-Máquinas na Rede Local (LAN) */}
        <Card className="border-primary/40 bg-gradient-to-br from-card via-card to-primary/[0.04] shadow-sm">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
                  <Server className="w-6 h-6" />
                </div>
                <div>
                  <CardTitle className="text-foreground flex items-center gap-2 text-lg">
                    Servidor Central & Acesso de Outros Computadores (Rede Local)
                  </CardTitle>
                  <CardDescription>
                    Este computador opera como o <strong>Servidor Central</strong> da empresa. Outros computadores, notebooks e celulares na mesma rede Wi-Fi ou cabo se conectam pelo IP abaixo com WhatsApp e banco de dados 100% sincronizados.
                  </CardDescription>
                </div>
              </div>
              <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 text-xs px-3 py-1 font-bold shrink-0 self-start sm:self-center">
                ● Servidor Ativo (Porta 3000)
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Links de Acesso */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Neste Computador (Servidor) */}
              <div className="p-4 rounded-xl border border-border bg-card/70 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                    <Laptop className="w-3.5 h-3.5 text-primary" />
                    Acesso Neste Computador (PC Servidor):
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Localhost</span>
                </div>
                <div className="flex items-center justify-between gap-2 bg-muted/40 p-2.5 rounded-lg border border-border font-mono text-xs font-bold text-foreground">
                  <span>http://localhost:3000</span>
                  <a
                    href="http://localhost:3000"
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    title="Abrir no navegador"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Use este link quando estiver operando diretamente nesta máquina servidora.
                </p>
              </div>

              {/* Em Outros Computadores da Empresa (Via IP da Rede) */}
              <div className="p-4 rounded-xl border-2 border-primary/30 bg-primary/[0.03] space-y-2 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Wifi className="w-3.5 h-3.5 text-emerald-500" />
                    Link para Outros PCs & Notebooks (Rede Local):
                  </span>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">
                    Compartilhe este link
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 bg-card p-2 rounded-lg border border-primary/40 font-mono text-xs font-black text-primary shadow-xs">
                  <span className="truncate">{serverInfo?.networkUrl || `http://${typeof window !== 'undefined' ? window.location.hostname : '192.168.0.29'}:3000`}</span>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleCopyNetworkUrl(serverInfo?.networkUrl || `http://${window.location.hostname}:3000`)}
                    className="h-7 px-2.5 text-xs font-bold gap-1 shadow-xs shrink-0"
                  >
                    {copiedNetworkUrl ? (
                      <>
                        <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> Copiar Link
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Abra o navegador em qualquer outro computador da loja ou escritório e cole este endereço para trabalhar.
                </p>
              </div>
            </div>

            {/* Status de Compartilhamento Centralizado do WhatsApp */}
            <div className="p-4 rounded-xl bg-muted/40 border border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-500" />
                  <h4 className="text-xs font-bold text-foreground">Sessão Compartilhada do WhatsApp Multi-Operador</h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">
                    100% Sincronizado
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  O WhatsApp conectado no PC Servidor alimenta todas as máquinas da rede. Qualquer atendente conectado pelo IP pode conversar, enviar propostas e acompanhar a esteira comercial sem precisar escanear QR Code novamente. As mensagens saem identificadas com a assinatura do atendente logado.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* WhatsApp Connection */}
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Smartphone className="w-5 h-5 text-primary" />
                  Conexão WhatsApp (Chat Comercial)
                </CardTitle>
                <CardDescription>
                  Pareie seu aparelho WhatsApp para atender clientes, sincronizar contatos e responder mensagens diretamente pelo Chat Comercial.
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
                    <p className="font-bold">O WhatsApp está conectado e pronto para uso!</p>
                    <p className="text-xs opacity-90">
                      Você pode enviar e receber mensagens, visualizar o nome e número real dos clientes e sincronizar com o CRM pelo Chat Comercial.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleResetWhatsApp}
                    disabled={isReconnecting}
                    className="text-xs border-amber-500/40 text-amber-500 hover:bg-amber-500/10 shrink-0 font-medium"
                    title="Redefinir sessão e gerar novo QR Code"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 mr-1.5 ${isReconnecting ? 'animate-spin' : ''}`} />
                    Redefinir Conexão
                  </Button>
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
                      onClick={handleResetWhatsApp}
                      disabled={isReconnecting}
                      className="text-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                    >
                      <RotateCcw className={`w-3.5 h-3.5 mr-1.5 ${isReconnecting ? 'animate-spin' : ''}`} />
                      {isReconnecting ? 'Redefinindo...' : '⚡ Redefinir & Forçar QR Code'}
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

        {/* Entrega para Nova Empresa - Reset de Clientes */}
        <Card className="border-rose-500/40 bg-rose-500/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-foreground">Entrega para Nova Empresa (Reset de Clientes)</CardTitle>
                  <CardDescription>
                    Limpe todo o histórico de conversas gravadas, áudios, transcrições, leads quentes e mensagens de teste do WhatsApp antes de entregar o sistema ao cliente/empresa.
                  </CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="text-rose-500 border-rose-500/30 font-semibold">
                🏢 Entrega Limpa
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between p-4 border border-rose-500/20 bg-card/60 rounded-xl">
              <div className="space-y-1">
                <h4 className="font-bold text-foreground text-sm flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" /> Preserva Robô, Fluxos e Configurações
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Zera as conversas de teste acumuladas, áudios transcritos, contatos de teste e fila de agendamentos, mantendo todos os fluxos de mensagens, usuários e regras prontos para a empresa utilizar.
                </p>
              </div>
              <Button
                onClick={() => setIsResetClientHistoryModalOpen(true)}
                className="whitespace-nowrap shrink-0 bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-sm"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Resetar Histórico de Clientes
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

      {/* Modal de Reset para Nova Empresa */}
      <ResetClientHistoryModal
        isOpen={isResetClientHistoryModalOpen}
        onClose={() => setIsResetClientHistoryModalOpen(false)}
      />
    </div>
  );
}
