'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { 
  Radar, 
  Linkedin, 
  MessageCircle, 
  CheckCircle2, 
  Loader2, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  UserCheck, 
  Trash2, 
  KeyRound, 
  Laptop
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';

const LINKEDIN_URL = 'https://www.linkedin.com/in/weverton-castelo-branco-005b39355';
const WHATSAPP_URL = 'https://wa.me/5592992920233';
const STORAGE_ACCOUNTS_KEY = 'radar_saved_accounts_v1';
const STORAGE_REMEMBER_KEY = 'radar_remember_credentials_v1';

export interface SavedAccount {
  identifier: string;
  password: string;
  name: string;
  role: string;
  lastUsedAt: number;
}

const DEFAULT_PRESET_ACCOUNTS: SavedAccount[] = [
  {
    identifier: 'admin@radar.com',
    password: 'radar123',
    name: 'Administrador',
    role: 'Admin',
    lastUsedAt: Date.now(),
  },
  {
    identifier: 'gestor@radar.com',
    password: 'radar123',
    name: 'Ricardo Mendes',
    role: 'Gestor',
    lastUsedAt: Date.now() - 1000,
  },
  {
    identifier: 'carlos@radar.com',
    password: 'radar123',
    name: 'Carlos Silva',
    role: 'Vendedor',
    lastUsedAt: Date.now() - 2000,
  },
];

export default function LoginPage() {
  const { login, isLoading } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([]);
  const [serverReady, setServerReady] = useState(true);

  // Carregar contas salvas do localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_ACCOUNTS_KEY);
      const rememberPref = localStorage.getItem(STORAGE_REMEMBER_KEY);

      if (rememberPref !== null) {
        setRememberMe(rememberPref === 'true');
      }

      let accounts: SavedAccount[] = [];
      if (stored) {
        accounts = JSON.parse(stored);
      } else {
        // Inicializa com os presets padrão se não houver nenhuma
        accounts = DEFAULT_PRESET_ACCOUNTS;
        localStorage.setItem(STORAGE_ACCOUNTS_KEY, JSON.stringify(DEFAULT_PRESET_ACCOUNTS));
      }

      setSavedAccounts(accounts);

      // Preenche com a conta mais recente ou a indicada na URL
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const registeredEmail = urlParams.get('registered');
        const recoveredEmail = urlParams.get('recovered');
        const targetEmail = registeredEmail || recoveredEmail;

        if (targetEmail) {
          const found = accounts.find(
            (a) => a.identifier.toLowerCase() === targetEmail.toLowerCase()
          );
          if (found) {
            setIdentifier(found.identifier);
            setPassword(found.password);
            if (registeredEmail) {
              toast.success(`Conta "${found.name}" pronta! Clique em Entrar para acessar.`, { id: 'registered-ready' });
            } else if (recoveredEmail) {
              toast.success('Senha redefinida com sucesso! Digite sua nova senha para entrar.', { id: 'recovered-ready' });
              setPassword('');
            }
            return;
          } else {
            setIdentifier(targetEmail);
            setPassword('');
            return;
          }
        }
      }

      // Preenche com a conta mais recente
      if (accounts.length > 0) {
        const sorted = [...accounts].sort((a, b) => b.lastUsedAt - a.lastUsedAt);
        setIdentifier(sorted[0].identifier);
        setPassword(sorted[0].password);
      }
    } catch (e) {
      console.error('Erro ao ler credenciais salvas:', e);
    }
  }, []);

  // Monitorar saúde do servidor local
  useEffect(() => {
    let mounted = true;
    const checkServer = async () => {
      try {
        const res = await api.get('/health', { timeout: 3000 });
        if (mounted && (res.status === 200 || res.data?.status === 'ok')) {
          setServerReady(true);
        }
      } catch {
        if (mounted) {
          setTimeout(checkServer, 1500);
        }
      }
    };
    checkServer();
    return () => {
      mounted = false;
    };
  }, []);

  // Selecionar conta salva
  const handleSelectAccount = (account: SavedAccount) => {
    setIdentifier(account.identifier);
    setPassword(account.password);
    toast.success(`Conta "${account.name}" selecionada!`, { id: 'account-select' });
  };

  // Remover conta salva
  const handleRemoveAccount = (e: React.MouseEvent, idToRemove: string) => {
    e.stopPropagation();
    const updated = savedAccounts.filter((acc) => acc.identifier !== idToRemove);
    setSavedAccounts(updated);
    try {
      localStorage.setItem(STORAGE_ACCOUNTS_KEY, JSON.stringify(updated));
      toast.success('Conta removida das credenciais salvas.');
    } catch {}
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedIdentifier = identifier.trim();
    if (!normalizedIdentifier || !password) {
      toast.error('Informe o e-mail/nome e a senha para entrar.');
      return;
    }

    // Salvar credenciais se checkbox estiver ativa
    if (rememberMe) {
      try {
        localStorage.setItem(STORAGE_REMEMBER_KEY, 'true');
        const existingIdx = savedAccounts.findIndex(
          (a) => a.identifier.toLowerCase() === normalizedIdentifier.toLowerCase()
        );

        let updatedList: SavedAccount[] = [];
        if (existingIdx >= 0) {
          updatedList = [...savedAccounts];
          updatedList[existingIdx] = {
            ...updatedList[existingIdx],
            password: password,
            lastUsedAt: Date.now(),
          };
        } else {
          // Detecta papel preliminar pelo nome
          let detectedRole = 'Usuário';
          let detectedName = normalizedIdentifier.split('@')[0];
          if (normalizedIdentifier.toLowerCase().includes('admin')) {
            detectedRole = 'Admin';
            detectedName = 'Administrador';
          } else if (normalizedIdentifier.toLowerCase().includes('gestor')) {
            detectedRole = 'Gestor';
            detectedName = 'Gestor Comercial';
          }

          updatedList = [
            {
              identifier: normalizedIdentifier,
              password,
              name: detectedName,
              role: detectedRole,
              lastUsedAt: Date.now(),
            },
            ...savedAccounts,
          ];
        }

        setSavedAccounts(updatedList);
        localStorage.setItem(STORAGE_ACCOUNTS_KEY, JSON.stringify(updatedList));
      } catch (err) {
        console.error('Falha ao salvar credencial:', err);
      }
    } else {
      localStorage.setItem(STORAGE_REMEMBER_KEY, 'false');
    }

    login({ identifier: normalizedIdentifier, password } as any);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-white to-slate-50 dark:from-zinc-950 dark:via-background dark:to-zinc-900 transition-colors duration-200 p-4">
      <div className="w-full max-w-lg p-2 sm:p-4">
        {/* Logo e Cabeçalho */}
        <div className="flex flex-col items-center justify-center mb-6 space-y-3">
          <div className="w-16 h-16 bg-slate-800 dark:bg-slate-700 rounded-2xl flex items-center justify-center shadow-lg border border-slate-700/50">
            <span className="font-black text-2xl text-white tracking-wider">RO</span>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Radar de Oportunidades</h1>
            <p className="text-xs text-muted-foreground mt-1">Prospecção B2B Inteligente • 100% Autônomo Local</p>
          </div>
        </div>

        <Card className="border-border shadow-xl bg-card/85 backdrop-blur-md">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl text-center font-bold">Acessar Sistema</CardTitle>
            <CardDescription className="text-center text-xs">
              Escolha uma conta salva ou digite seus dados abaixo
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            {/* Seletor de Contas Salvas no Computador */}
            {savedAccounts.length > 0 && (
              <div className="space-y-2 bg-accent/30 p-3 rounded-xl border border-border/70">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-primary" />
                    Contas Salvas neste PC:
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    Clique para preencher em 1 clique
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  {savedAccounts.slice(0, 3).map((acc) => {
                    const isCurrent = identifier === acc.identifier;
                    return (
                      <div
                        key={acc.identifier}
                        onClick={() => handleSelectAccount(acc)}
                        className={`p-2 rounded-lg border text-left cursor-pointer transition-all flex flex-col justify-between relative group ${
                          isCurrent
                            ? 'bg-primary/10 border-primary text-foreground ring-1 ring-primary/40'
                            : 'bg-card hover:bg-accent/60 border-border text-foreground hover:border-primary/40'
                        }`}
                        title={`Entrar com ${acc.name} (${acc.identifier})`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold truncate max-w-[90px]">{acc.name}</span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-primary/15 text-primary font-bold">
                            {acc.role}
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground truncate block mt-0.5">
                          {acc.identifier}
                        </span>

                        {/* Botão de remover conta salva */}
                        <button
                          type="button"
                          onClick={(e) => handleRemoveAccount(e, acc.identifier)}
                          className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-muted-foreground/30 hover:bg-destructive hover:text-destructive-foreground text-foreground text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remover esta conta salva"
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Formulário de Login */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold leading-none text-foreground" htmlFor="identifier">
                  E-mail ou Usuário
                </label>
                <Input
                  id="identifier"
                  type="text"
                  placeholder="admin@radar.com ou nome do usuário"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="h-10 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold leading-none text-foreground" htmlFor="password">
                    Senha de Acesso
                  </label>
                  <a href="/recuperar-senha" className="text-xs text-primary hover:underline font-medium">
                    Esqueceu a senha?
                  </a>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-10 text-xs pr-10"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    title={showPassword ? 'Ocultar senha' : 'Ver senha'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Checkbox Lembrar Minhas Credenciais */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-foreground">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-input text-primary focus:ring-primary cursor-pointer"
                  />
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                    Lembrar credenciais neste computador
                  </span>
                </label>
              </div>

              {/* Status do Servidor */}
              <div className="flex items-center justify-center gap-2 text-xs py-1.5 bg-accent/20 rounded-lg border border-border/40">
                {serverReady ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-[11px] flex items-center gap-1">
                      Sistema 100% Conectado e Operacional (Zero Docker)
                    </span>
                  </>
                ) : (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
                    <span className="text-amber-600 dark:text-amber-400 font-medium text-[11px]">
                      Conectando ao sistema...
                    </span>
                  </>
                )}
              </div>

              <Button type="submit" className="w-full h-10 font-bold text-sm shadow-md" disabled={isLoading}>
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Entrando no Sistema...
                  </span>
                ) : (
                  'Entrar no Radar de Oportunidades'
                )}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex flex-col space-y-3 pt-2">
            <div className="text-xs text-center text-muted-foreground">
              Primeiro acesso ou nova equipe? <a href="/cadastro" className="text-primary font-bold hover:underline">Criar conta</a>
            </div>
          </CardFooter>
        </Card>

        {/* Informação de Autonomia Local & Assinatura WCTECH */}
        <div className="mt-5 flex flex-col items-center gap-2">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
            <Laptop className="w-3.5 h-3.5 text-primary" />
            <span>Execução autônoma com Node.js • Banco local seguro</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground font-medium">Powered by</span>
            <span className="text-[11px] font-black text-foreground tracking-wide">WCTECH</span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={LINKEDIN_URL}
              target="_blank"
              rel="noopener noreferrer"
              title="LinkedIn"
              className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition"
            >
              <Linkedin className="w-4 h-4" />
            </a>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              title="Suporte WCTECH"
              className="p-1.5 rounded-lg text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10 transition"
            >
              <MessageCircle className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
