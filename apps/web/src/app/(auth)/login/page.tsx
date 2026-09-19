'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Radar, Linkedin, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const LINKEDIN_URL = 'https://www.linkedin.com/in/weverton-castelo-branco-005b39355';
const WHATSAPP_URL = 'https://wa.me/5592992920233';

export default function LoginPage() {
  const { login, isLoading } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedIdentifier = identifier.trim();
    if (!normalizedIdentifier || !password) {
      toast.error('Informe o e-mail/nome e a senha para entrar.');
      return;
    }
    login({ identifier: normalizedIdentifier, password } as any);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-white to-slate-50 dark:from-zinc-950 dark:via-background dark:to-zinc-900 transition-colors duration-200">
      <div className="w-full max-w-md p-4">
        <div className="flex flex-col items-center justify-center mb-8 space-y-4">
          <div className="w-16 h-16 bg-slate-800 dark:bg-slate-700 rounded-2xl flex items-center justify-center shadow-lg">
            <span className="font-black text-2xl text-white">RO</span>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Radar de Oportunidades</h1>
            <p className="text-xs text-muted-foreground mt-1">Prospecção B2B Inteligente</p>
          </div>
        </div>

        <Card className="border-border shadow-xl bg-card/80 backdrop-blur-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Login</CardTitle>
            <CardDescription className="text-center">
              Acesse sua conta para começar a prospectar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none" htmlFor="identifier">
                  E-mail ou nome
                </label>
                <Input
                  id="identifier"
                  type="text"
                  placeholder="nome@empresa.com ou seu nome"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium leading-none" htmlFor="password">
                    Senha
                  </label>
                  <a href="/recuperar-senha" className="text-sm text-primary hover:underline">
                    Recuperar senha
                  </a>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <div className="text-sm text-center text-muted-foreground">
              Ainda não possui acesso? <a href="/cadastro" className="text-primary hover:underline">Criar cadastro</a>
            </div>
          </CardFooter>
        </Card>

        {/* WCTECH Signature */}
        <div className="mt-6 flex flex-col items-center gap-2">
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
              title="WhatsApp"
              className="p-1.5 rounded-lg text-muted-foreground hover:text-green-500 hover:bg-green-500/10 transition"
            >
              <MessageCircle className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
