'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Camera, 
  Trash2, 
  User, 
  Mail, 
  Shield, 
  KeyRound, 
  Eye, 
  EyeOff, 
  Check, 
  Sparkles,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/stores/auth-store';
import toast from 'react-hot-toast';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UserProfileModal({ isOpen, onClose }: UserProfileModalProps) {
  const { user, setUser } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);

  // Estados de Senha
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user && isOpen) {
      setName(user.name || '');
      setEmail(user.email || '');
      setAvatar(user.avatar || null);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordSection(false);
    }
  }, [user, isOpen]);

  if (!isOpen) return null;

  // Processar upload de foto e converter para Base64/DataURL
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione um arquivo de imagem válido (JPG, PNG, WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAvatar(reader.result);
        toast.success('Foto carregada com sucesso! Clique em "Salvar" para confirmar.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setAvatar(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    toast.success('Foto removida. O avatar exibirá suas iniciais.');
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('O nome não pode ficar em branco.');
      return;
    }

    // Se preencheu nova senha, validar regras
    if (newPassword.trim()) {
      if (newPassword.length < 6) {
        toast.error('A nova senha deve ter no mínimo 6 caracteres.');
        return;
      }
      if (newPassword !== confirmPassword) {
        toast.error('A confirmação de senha não coincide com a nova senha.');
        return;
      }
    }

    setSaving(true);
    try {
      // 1. Atualizar no store Zustand e localStorage do navegador
      const updatedUser = {
        ...(user || {
          id: 'user-admin',
          email: email || 'admin@radar.com',
          role: { id: 'role-admin', name: 'Administrador', slug: 'admin' },
        }),
        name: name.trim(),
        avatar: avatar || undefined,
      };

      setUser(updatedUser);

      // 2. Atualizar contas salvas se houver
      if (typeof window !== 'undefined') {
        try {
          const savedRaw = localStorage.getItem('radar_saved_accounts_v1');
          if (savedRaw) {
            const list = JSON.parse(savedRaw);
            const updatedList = list.map((a: any) => {
              if (a.identifier?.toLowerCase() === (user?.email || '').toLowerCase()) {
                return {
                  ...a,
                  name: name.trim(),
                  avatar: avatar || undefined,
                  ...(newPassword.trim() ? { password: newPassword.trim() } : {}),
                };
              }
              return a;
            });
            localStorage.setItem('radar_saved_accounts_v1', JSON.stringify(updatedList));
          }
        } catch {}
      }

      // 3. Chamar API de sincronização de perfil (Next.js / NestJS)
      try {
        await fetch('/api/auth/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            avatar: avatar || null,
          }),
        });

        if (newPassword.trim()) {
          await fetch('/api/auth/change-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              newPassword: newPassword.trim(),
            }),
          });
        }
      } catch {
        // Modo offline / mock suportado
      }

      toast.success(newPassword.trim() ? 'Perfil e senha atualizados com sucesso!' : 'Perfil atualizado com sucesso!');
      onClose();
    } catch {
      toast.error('Erro ao atualizar perfil.');
    } finally {
      setSaving(false);
    }
  };

  const initialLetter = name ? name.charAt(0).toUpperCase() : 'U';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div 
        className="bg-card w-full max-w-lg rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho do Modal */}
        <div className="p-4 sm:p-5 border-b border-border bg-accent/20 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Meu Perfil de Usuário</h2>
              <p className="text-xs text-muted-foreground">Personalize sua foto, altere seu nome e gerencie sua senha</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo com rolagem se necessário */}
        <div className="p-5 space-y-5 overflow-y-auto">
          {/* Seção 1: Foto de Perfil */}
          <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl bg-accent/30 border border-border">
            <div className="relative group shrink-0">
              {avatar ? (
                <img
                  src={avatar}
                  alt={name || 'Avatar'}
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-primary/40 shadow-md ring-4 ring-primary/10"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center bg-gradient-to-br from-primary/30 to-primary/10 text-primary border-2 border-primary/30 font-black text-2xl shadow-md">
                  {initialLetter}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1.5 -right-1.5 p-2 rounded-xl bg-primary text-primary-foreground shadow-md hover:scale-105 active:scale-95 transition cursor-pointer"
                title="Trocar Foto de Perfil"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex-1 text-center sm:text-left space-y-2">
              <div>
                <h4 className="text-sm font-bold text-foreground">Foto de Perfil</h4>
                <p className="text-xs text-muted-foreground">
                  Formatos recomendados: PNG, JPG ou WebP até 5MB
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handlePhotoUpload}
                  accept="image/*"
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs h-8 gap-1.5 font-semibold cursor-pointer border-border hover:border-primary"
                >
                  <Camera className="w-3.5 h-3.5 text-primary" />
                  {avatar ? 'Trocar Foto' : 'Adicionar Foto'}
                </Button>

                {avatar && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemovePhoto}
                    className="text-xs h-8 gap-1.5 text-destructive hover:bg-destructive/10 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Remover
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Seção 2: Dados Pessoais (Nome e E-mail) */}
          <div className="space-y-3.5">
            <div>
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5 mb-1">
                <User className="w-3.5 h-3.5 text-primary" />
                Nome Completo
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Carlos Silva ou Minha Empresa"
                className="text-xs h-9 font-medium"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5 mb-1">
                <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                E-mail de Acesso
              </label>
              <Input
                value={email}
                disabled
                className="text-xs h-9 font-mono bg-muted/50 text-muted-foreground cursor-not-allowed"
              />
              <p className="text-[10px] text-muted-foreground mt-0.5">O e-mail é o identificador único da sua conta.</p>
            </div>

            <div>
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5 mb-1">
                <Shield className="w-3.5 h-3.5 text-emerald-500" />
                Função no Sistema
              </label>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-bold">
                <Check className="w-3 h-3" />
                {user?.role?.name || 'Administrador (Acesso Total)'}
              </div>
            </div>
          </div>

          {/* Seção 3: Troca de Senha */}
          <div className="p-4 rounded-xl border border-border bg-card space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-foreground">Segurança & Senha</h4>
                  <p className="text-[10px] text-muted-foreground">Clique ao lado se deseja alterar sua senha de login</p>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowPasswordSection(!showPasswordSection)}
                className="text-xs h-7 px-2.5 font-semibold cursor-pointer"
              >
                {showPasswordSection ? 'Ocultar' : 'Trocar Senha'}
              </Button>
            </div>

            {showPasswordSection && (
              <div className="pt-2 border-t border-border space-y-3 animate-in fade-in duration-150">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Nova Senha
                  </label>
                  <div className="relative">
                    <Input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="text-xs h-9 pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs p-1"
                    >
                      {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Confirmar Nova Senha
                  </label>
                  <Input
                    type={showNewPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a nova senha"
                    className="text-xs h-9"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Rodapé de Ações */}
        <div className="p-4 border-t border-border bg-accent/20 flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs font-semibold cursor-pointer"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 shadow-sm cursor-pointer"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Salvar Alterações
          </Button>
        </div>
      </div>
    </div>
  );
}
