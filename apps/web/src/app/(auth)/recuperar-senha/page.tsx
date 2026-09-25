'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import {
  Radar,
  Mail,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  HelpCircle,
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

export default function RecuperarSenhaPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showAnswer, setShowAnswer] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState('');
  const [searchingQuestion, setSearchingQuestion] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleFindQuestion(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setError('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Por favor, informe um endereço de e-mail válido.');
      return;
    }

    setSearchingQuestion(true);
    try {
      const res = await api.post('/auth/recovery-question', { email: cleanEmail });
      const q = res.data?.data?.question || res.data?.question || '';
      if (!q) {
        throw new Error('Nenhuma pergunta de segurança configurada para este e-mail.');
      }
      setQuestion(q);
      toast.success('Pergunta de segurança localizada!');
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Não foi possível localizar o cadastro ou a pergunta de segurança.';
      setError(msg);
      toast.error(msg);
    } finally {
      setSearchingQuestion(false);
    }
  }

  async function handleSubmitRecovery(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const cleanEmail = email.trim().toLowerCase();
    const cleanAnswer = answer.trim();

    if (!cleanAnswer) {
      setError('Por favor, digite a resposta-chave de segurança.');
      return;
    }

    if (newPassword.length < 8) {
      setError('A nova senha deve ter no mínimo 8 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('A confirmação de senha não confere com a nova senha.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/auth/recover', {
        email: cleanEmail,
        securityAnswer: cleanAnswer,
        newPassword: newPassword,
      });

      toast.success('Senha redefinida com sucesso! Faça seu acesso com a nova senha.', {
        duration: 4000,
        id: 'recovery-success',
      });

      router.push(`/login?recovered=${encodeURIComponent(cleanEmail)}`);
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Resposta-chave incorreta ou falha ao redefinir a senha.';
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-linear-to-br from-background via-muted/40 to-background p-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo e Cabeçalho */}
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
            Recuperação segura de acesso via pergunta-chave
          </p>
        </div>

        {/* Card de Recuperação */}
        <Card className="border border-border/80 shadow-2xl bg-card/95 backdrop-blur-sm">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-primary" />
              Recuperar Senha
            </CardTitle>
            <CardDescription className="text-xs">
              {!question
                ? 'Informe o seu e-mail cadastrado para buscar a pergunta de segurança.'
                : 'Responda à sua pergunta-chave e defina uma nova senha.'}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-start gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {!question ? (
              /* ETAPA 1: Buscar Pergunta */
              <form onSubmit={handleFindQuestion} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5" htmlFor="email">
                    <Mail className="w-3.5 h-3.5 text-primary" />
                    E-mail Cadastrado
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu.email@empresa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-10 text-xs"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-10 font-bold text-xs shadow-md mt-2"
                  disabled={searchingQuestion}
                >
                  {searchingQuestion ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Consultando cadastro...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <HelpCircle className="w-4 h-4" />
                      Consultar Pergunta de Segurança
                    </span>
                  )}
                </Button>
              </form>
            ) : (
              /* ETAPA 2: Responder e Definir Nova Senha */
              <form onSubmit={handleSubmitRecovery} className="space-y-3.5">
                {/* Banner com a Pergunta */}
                <div className="p-3 rounded-xl bg-primary/10 border border-primary/25 space-y-1">
                  <span className="text-[10px] font-bold text-primary uppercase tracking-wider block">
                    Pergunta de Segurança:
                  </span>
                  <p className="text-xs font-semibold text-foreground">
                    "{question}"
                  </p>
                </div>

                {/* Resposta */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5" htmlFor="answer">
                    <KeyRound className="w-3.5 h-3.5 text-primary" />
                    Sua Resposta-Chave
                  </label>
                  <div className="relative">
                    <Input
                      id="answer"
                      type={showAnswer ? 'text' : 'password'}
                      placeholder="Digite a resposta correta..."
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
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
                </div>

                {/* Nova Senha */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5" htmlFor="newPassword">
                    <Lock className="w-3.5 h-3.5 text-primary" />
                    Nova Senha
                  </label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Mínimo de 8 caracteres"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
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

                {/* Confirmar Nova Senha */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5" htmlFor="confirmPassword">
                    <Lock className="w-3.5 h-3.5 text-primary" />
                    Confirmar Nova Senha
                  </label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Repita a nova senha"
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

                <Button
                  type="submit"
                  className="w-full h-10 font-bold text-xs shadow-md mt-2"
                  disabled={submitting}
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Redefinindo senha...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      Salvar Nova Senha e Concluir
                    </span>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-8 text-xs font-medium"
                  onClick={() => {
                    setQuestion('');
                    setAnswer('');
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                >
                  Trocar E-mail
                </Button>
              </form>
            )}
          </CardContent>

          <CardFooter className="flex flex-col space-y-2 pt-1 pb-4">
            <div className="text-xs text-center text-muted-foreground">
              Lembrou a senha anterior?{' '}
              <a href="/login" className="text-primary font-bold hover:underline inline-flex items-center gap-1">
                Voltar ao Login
              </a>
            </div>
          </CardFooter>
        </Card>

        {/* Rodapé Informativo WCTECH */}
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
