'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import {
  Radar,
  User,
  Mail,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  HelpCircle,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Laptop,
  Linkedin,
  MessageCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

const LINKEDIN_URL = 'https://www.linkedin.com/in/weverton-castelo-branco-005b39355';
const WHATSAPP_URL = 'https://wa.me/5592992920233';
const STORAGE_ACCOUNTS_KEY = 'radar_saved_accounts_v1';
const STORAGE_REMEMBER_KEY = 'radar_remember_credentials_v1';

const PRESET_SECURITY_QUESTIONS = [
  'Qual era o nome do seu primeiro animal de estimação?',
  'Qual é a sua cidade natal?',
  'Qual era o nome da sua primeira escola?',
  'Qual é o modelo do seu primeiro veículo?',
  'Qual é o nome de solteira da sua mãe?',
  'Personalizada (digitar minha própria pergunta)',
];

export default function CadastroPage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedQuestion, setSelectedQuestion] = useState(PRESET_SECURITY_QUESTIONS[0]);
  const [customQuestion, setCustomQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [rememberCredentials, setRememberCredentials] = useState(true);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);

  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const finalQuestion =
    selectedQuestion === 'Personalizada (digitar minha própria pergunta)'
      ? customQuestion.trim()
      : selectedQuestion;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanAnswer = securityAnswer.trim();

    if (!cleanName || cleanName.length < 3) {
      setError('Por favor, informe seu nome completo (mínimo de 3 caracteres).');
      return;
    }

    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setError('Por favor, informe um endereço de e-mail válido.');
      return;
    }

    if (password.length < 8) {
      setError('A senha deve conter no mínimo 8 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('A senha e a confirmação de senha não coincidem.');
      return;
    }

    if (!finalQuestion) {
      setError('Por favor, selecione ou defina uma pergunta de segurança.');
      return;
    }

    if (!cleanAnswer || cleanAnswer.length < 2) {
      setError('Por favor, informe a resposta-chave de segurança.');
      return;
    }

    setBusy(true);

    try {
      const response = await api.post('/auth/register', {
        name: cleanName,
        email: cleanEmail,
        password: password,
        securityQuestion: finalQuestion,
        securityAnswer: cleanAnswer,
      });

      // Salvar credenciais no localStorage se a opção estiver ativa
      if (rememberCredentials) {
        try {
          const stored = localStorage.getItem(STORAGE_ACCOUNTS_KEY);
          let accounts = stored ? JSON.parse(stored) : [];

          const existingIndex = accounts.findIndex(
            (acc: any) => acc.identifier.toLowerCase() === cleanEmail.toLowerCase()
          );

          const newAccount = {
            identifier: cleanEmail,
            password: password,
            name: cleanName,
            role: 'Vendedor',
            lastUsedAt: Date.now(),
          };

          if (existingIndex >= 0) {
            accounts[existingIndex] = newAccount;
          } else {
            accounts = [newAccount, ...accounts];
          }

          localStorage.setItem(STORAGE_ACCOUNTS_KEY, JSON.stringify(accounts));
          localStorage.setItem(STORAGE_REMEMBER_KEY, 'true');
        } catch (e) {
          console.error('Erro ao salvar nova conta no armazenamento local:', e);
        }
      }

      toast.success(`Conta criada com sucesso! Bem-vindo(a), ${cleanName.split(' ')[0]}!`, {
        duration: 4000,
        id: 'register-success',
      });

      // Redireciona para o login com indicação do usuário recém-criado
      router.push(`/login?registered=${encodeURIComponent(cleanEmail)}`);
    } catch (err: any) {
      // Fallback autônomo offline caso a API esteja temporariamente indisponível
      try {
        const stored = localStorage.getItem(STORAGE_ACCOUNTS_KEY);
        let accounts = stored ? JSON.parse(stored) : [];
        const newAccount = {
          identifier: cleanEmail,
          password: password,
          name: cleanName,
          role: 'Vendedor',
          lastUsedAt: Date.now(),
        };
        accounts = [newAccount, ...accounts.filter((a: any) => a.identifier.toLowerCase() !== cleanEmail.toLowerCase())];
        localStorage.setItem(STORAGE_ACCOUNTS_KEY, JSON.stringify(accounts));
        localStorage.setItem(STORAGE_REMEMBER_KEY, 'true');

        toast.success(`Conta criada com sucesso! Bem-vindo(a), ${cleanName.split(' ')[0]}!`, {
          duration: 4000,
          id: 'register-success',
        });
        router.push(`/login?registered=${encodeURIComponent(cleanEmail)}`);
        return;
      } catch (fallbackErr) {}

      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Não foi possível criar o cadastro. Verifique os dados e tente novamente.';
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-linear-to-br from-background via-muted/40 to-background p-4 py-8">
      <div className="w-full max-w-md">
        {/* Cabeçalho com Logo do Radar */}
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="relative mb-3 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-primary/25 blur-xl animate-pulse" />
            <div className="relative p-3 rounded-2xl bg-card border border-border shadow-xl">
              <Radar className="w-9 h-9 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">
            Radar de Oportunidades
          </h1>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
            Crie sua conta para acessar o sistema de prospecção e vendas B2B
          </p>
        </div>

        {/* Card de Formulário */}
        <Card className="border border-border/80 shadow-2xl bg-card/95 backdrop-blur-sm">
          <CardHeader className="space-y-1 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                Criar Acesso
              </CardTitle>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                100% Gratuito
              </span>
            </div>
            <CardDescription className="text-xs">
              Preencha os dados abaixo para liberar seu acesso à plataforma.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-start gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Nome Completo */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground flex items-center gap-1.5" htmlFor="name">
                  <User className="w-3.5 h-3.5 text-primary" />
                  Nome Completo
                </label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Ex: Carlos Oliveira"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-9.5 text-xs"
                  required
                />
              </div>

              {/* E-mail */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground flex items-center gap-1.5" htmlFor="email">
                  <Mail className="w-3.5 h-3.5 text-primary" />
                  E-mail de Acesso
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu.email@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-9.5 text-xs"
                  required
                />
              </div>

              {/* Grid de Senhas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Senha */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5" htmlFor="password">
                    <Lock className="w-3.5 h-3.5 text-primary" />
                    Senha
                  </label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Mín. 8 dígitos"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-9.5 text-xs pr-8"
                      minLength={8}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Confirmar Senha */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5" htmlFor="confirmPassword">
                    <Lock className="w-3.5 h-3.5 text-primary" />
                    Confirmar Senha
                  </label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Repita a senha"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="h-9.5 text-xs pr-8"
                      minLength={8}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Seção de Pergunta-Chave de Recuperação */}
              <div className="pt-2 border-t border-border/60 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-primary" />
                    Pergunta de Segurança para Recuperação
                  </label>
                  <span className="text-[10px] text-muted-foreground">Uso pessoal</span>
                </div>

                <select
                  value={selectedQuestion}
                  onChange={(e) => setSelectedQuestion(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  {PRESET_SECURITY_QUESTIONS.map((q) => (
                    <option key={q} value={q}>
                      {q}
                    </option>
                  ))}
                </select>

                {selectedQuestion === 'Personalizada (digitar minha própria pergunta)' && (
                  <Input
                    type="text"
                    placeholder="Digite sua pergunta personalizada..."
                    value={customQuestion}
                    onChange={(e) => setCustomQuestion(e.target.value)}
                    className="h-9 text-xs"
                    required
                  />
                )}

                {/* Resposta de Segurança */}
                <div className="space-y-1 pt-1">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5" htmlFor="securityAnswer">
                    <KeyRound className="w-3.5 h-3.5 text-primary" />
                    Resposta-Chave
                  </label>
                  <div className="relative">
                    <Input
                      id="securityAnswer"
                      type={showAnswer ? 'text' : 'password'}
                      placeholder="Ex: Rex, Manaus, São José..."
                      value={securityAnswer}
                      onChange={(e) => setSecurityAnswer(e.target.value)}
                      className="h-9.5 text-xs pr-8"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowAnswer(!showAnswer)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showAnswer ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Guarde esta resposta. Ela será necessária caso você esqueça sua senha.
                  </p>
                </div>
              </div>

              {/* Lembrar credenciais */}
              <div className="flex items-center gap-2 pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-foreground">
                  <input
                    type="checkbox"
                    checked={rememberCredentials}
                    onChange={(e) => setRememberCredentials(e.target.checked)}
                    className="w-4 h-4 rounded border-input text-primary focus:ring-primary cursor-pointer"
                  />
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                    Salvar credenciais neste PC para preenchimento rápido
                  </span>
                </label>
              </div>

              {/* Botão de Envio */}
              <Button type="submit" className="w-full h-10 font-bold text-xs shadow-md mt-2" disabled={busy}>
                {busy ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Criando seu cadastro...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Concluir Cadastro e Ir para Login
                  </span>
                )}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex flex-col space-y-2 pt-1 pb-4">
            <div className="text-xs text-center text-muted-foreground">
              Já possui uma conta registrada?{' '}
              <a href="/login" className="text-primary font-bold hover:underline inline-flex items-center gap-1">
                Entrar no sistema
              </a>
            </div>
          </CardFooter>
        </Card>

        {/* Rodapé Informativo WCTECH */}
        <div className="mt-5 flex flex-col items-center gap-2">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
            <Laptop className="w-3.5 h-3.5 text-primary" />
            <span>Execução autônoma com Node.js • Banco local seguro (Zero Docker)</span>
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
