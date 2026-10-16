'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Search, 
  UserCheck, 
  Shield, 
  ShieldCheck,
  ShieldAlert,
  Crown,
  KeyRound, 
  Edit, 
  Trash2, 
  Camera, 
  User, 
  Eye, 
  EyeOff, 
  Lock 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useAuthStore } from '@/stores/auth-store';
import { UserProfileModal } from '@/components/user/user-profile-modal';
import { getPersistentProfile, savePersistentProfile } from '@/lib/user-profiles';
import { isUserAdmin, getUserRoleLabel } from '@/lib/auth';

interface UserSystemItem {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'Administrador' | 'Gestor Comercial' | 'Vendedor' | 'Técnico';
  status: 'Ativo' | 'Bloqueado';
  lastLogin: string;
}

const INITIAL_USERS: UserSystemItem[] = [
  { id: 'USR-00', name: 'Tom (Administrador)', email: 'tom@criart.com', role: 'Administrador', status: 'Ativo', lastLogin: 'Agora mesmo' },
  { id: 'USR-01', name: 'Weverton (Admin)', email: 'weverton@wctech.com.br', role: 'Administrador', status: 'Ativo', lastLogin: 'Agora mesmo' },
  { id: 'USR-02', name: 'Karyna', email: 'karyna@criart.com', role: 'Vendedor', status: 'Ativo', lastLogin: 'Hoje às 15:10' },
  { id: 'USR-03', name: 'Carlos Santos', email: 'carlos@radar.com', role: 'Vendedor', status: 'Ativo', lastLogin: 'Hoje às 14:20' },
  { id: 'USR-04', name: 'Rafael Costa', email: 'rafael@radar.com', role: 'Vendedor', status: 'Ativo', lastLogin: 'Hoje às 10:15' },
  { id: 'USR-05', name: 'André Lima', email: 'andre@radar.com', role: 'Vendedor', status: 'Ativo', lastLogin: 'Ontem às 18:00' },
  { id: 'USR-06', name: 'Lucas Silva', email: 'lucas@radar.com', role: 'Gestor Comercial', status: 'Ativo', lastLogin: '04/09/2026' },
  { id: 'USR-07', name: 'Camila Rocha', email: 'camila@radar.com', role: 'Vendedor', status: 'Ativo', lastLogin: 'Ontem às 11:30' },
  { id: 'USR-08', name: 'Fernanda Lima', email: 'fernanda@radar.com', role: 'Vendedor', status: 'Ativo', lastLogin: 'Ontem às 16:45' },
  { id: 'USR-09', name: 'Larissa Menezes', email: 'larissa@radar.com', role: 'Vendedor', status: 'Ativo', lastLogin: 'Hoje às 09:00' },
];

export default function UsersPage() {
  const confirm = useConfirm();
  const { user: currentUser, setUser: setCurrentUser } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [users, setUsers] = useState<UserSystemItem[]>(() => {
    let baseList = INITIAL_USERS;
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('radar_system_users_v1');
        if (saved !== null) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) baseList = parsed;
        }
      } catch {}
    }

    return baseList.map((u) => {
      const p = getPersistentProfile(u.email, u.id);
      if (!p) return u;
      return {
        ...u,
        name: p.name || u.name,
        avatar: p.avatar !== undefined ? p.avatar : u.avatar,
      };
    });
  });

  const [isMounted, setIsMounted] = useState(false);

  // Carrega e sincroniza usuários da API central
  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch(`/api/users?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        const list = json.data !== undefined ? json.data : json;
        if (Array.isArray(list)) {
          const merged = list.map((u: UserSystemItem) => {
            const p = getPersistentProfile(u.email, u.id);
            if (!p) return u;
            return {
              ...u,
              name: p.name || u.name,
              avatar: p.avatar !== undefined ? p.avatar : u.avatar,
            };
          });
          setUsers(merged);
          try {
            localStorage.setItem('radar_system_users_v1', JSON.stringify(merged));
          } catch {}
          return;
        }
      }
    } catch {}

    // Fallback local se a API estiver indisponível
    try {
      const saved = localStorage.getItem('radar_system_users_v1');
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setUsers(parsed);
      }
    } catch {}
  }, []);

  useEffect(() => {
    setIsMounted(true);
    fetchUsers();
  }, [fetchUsers]);

  const isAdmin = isUserAdmin(currentUser);

  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserSystemItem | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState<UserSystemItem['role']>('Vendedor');
  const [formAvatar, setFormAvatar] = useState<string | null>(null);
  const [formPassword, setFormPassword] = useState('');
  const [formConfirmPassword, setFormConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Conceder ou Remover Permissão de Administrador para Colaboradores
  const handleToggleAdminPermission = async (targetUser: UserSystemItem) => {
    const isCurrentlyAdmin = targetUser.role === 'Administrador';
    const isSelf = currentUser?.email?.toLowerCase() === targetUser.email.toLowerCase();

    if (isCurrentlyAdmin && isSelf) {
      toast.error('Você não pode revogar sua própria permissão de administrador.');
      return;
    }

    const newRole: UserSystemItem['role'] = isCurrentlyAdmin ? 'Vendedor' : 'Administrador';
    const actionTitle = isCurrentlyAdmin ? 'Remover Permissão de Administrador' : 'Conceder Permissão de Administrador';
    const actionDesc = isCurrentlyAdmin
      ? `Tem certeza que deseja revogar o acesso de administrador de "${targetUser.name}" (${targetUser.email})? Ele passará a ser Colaborador/Vendedor sem acesso à gestão de usuários.`
      : `Deseja conceder permissão de Administrador para "${targetUser.name}" (${targetUser.email})? Ele terá acesso total às configurações, relatórios globais e gestão de colaboradores.`;

    const confirmed = await confirm({
      title: actionTitle,
      description: actionDesc,
      confirmText: isCurrentlyAdmin ? 'Remover Permissão' : 'Tornar Administrador',
      cancelText: 'Cancelar',
      variant: isCurrentlyAdmin ? 'danger' : 'info',
      icon: isCurrentlyAdmin ? 'alert' : 'help',
    });

    if (!confirmed) return;

    const updatedList = users.map((u) => (u.id === targetUser.id ? { ...u, role: newRole } : u));
    setUsers(updatedList);
    try {
      localStorage.setItem('radar_system_users_v1', JSON.stringify(updatedList));
      await fetch(`/api/users/${targetUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
    } catch {}

    if (isSelf) {
      setCurrentUser({
        ...currentUser,
        role: {
          ...currentUser.role,
          name: newRole,
          slug: isCurrentlyAdmin ? 'seller' : 'admin',
        },
      });
    }

    toast.success(
      isCurrentlyAdmin
        ? `Permissão de administrador removida de ${targetUser.name}.`
        : `👑 ${targetUser.name} agora possui acesso de Administrador!`
    );
  };

  // Sync if current user profile changes
  useEffect(() => {
    if (currentUser?.email) {
      setUsers((prev) => {
        const exists = prev.some((u) => u.email.toLowerCase() === currentUser.email.toLowerCase());
        if (!exists) {
          const userIsAdmin = isUserAdmin(currentUser);
          return [
            {
              id: currentUser.id || (userIsAdmin ? 'USR-ADMIN' : 'USR-COLAB'),
              name: currentUser.name || (userIsAdmin ? 'Administrador' : 'Colaborador'),
              email: currentUser.email,
              role: userIsAdmin ? 'Administrador' : 'Vendedor',
              avatar: currentUser.avatar,
              status: 'Ativo',
              lastLogin: 'Agora mesmo',
            },
            ...prev,
          ];
        }
        return prev.map((u) => {
          if (u.email.toLowerCase() === currentUser.email.toLowerCase()) {
            return {
              ...u,
              name: currentUser.name || u.name,
              avatar: currentUser.avatar !== undefined ? currentUser.avatar : u.avatar,
            };
          }
          return u;
        });
      });
    }
  }, [currentUser]);

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenNew = () => {
    setEditingUser(null);
    setFormName('');
    setFormEmail('');
    setFormRole('Vendedor');
    setFormAvatar(null);
    setFormPassword('');
    setFormConfirmPassword('');
    setShowPassword(false);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: UserSystemItem) => {
    setEditingUser(user);
    setFormName(user.name);
    setFormEmail(user.email);
    setFormRole(user.role);
    setFormAvatar(user.avatar || null);
    setFormPassword('');
    setFormConfirmPassword('');
    setShowPassword(false);
    setIsModalOpen(true);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Selecione uma imagem válida (JPG, PNG, WebP)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setFormAvatar(reader.result);
        toast.success('Foto carregada!');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDelete = async (id: string) => {
    const target = users.find(u => u.id === id);
    const confirmed = await confirm({
      title: 'Desativar Acesso de Usuário',
      description: target 
        ? `Tem certeza que deseja remover o acesso de "${target.name}" (${target.email})?` 
        : 'Tem certeza que deseja desativar este acesso?',
      confirmText: 'Desativar Usuário',
      cancelText: 'Cancelar',
      variant: 'danger',
      icon: 'trash',
    });

    if (confirmed) {
      const updated = users.filter(u => u.id !== id);
      setUsers(updated);
      try {
        localStorage.setItem('radar_system_users_v1', JSON.stringify(updated));
        await fetch(`/api/users/${id}`, { method: 'DELETE' });
      } catch {}

      toast.success('Usuário removido com sucesso!');
    }
  };

  const handleSave = async () => {
    if (!formName.trim() || !formEmail.trim()) {
      toast.error('Informe nome e e-mail');
      return;
    }

    if (!editingUser && !formPassword.trim()) {
      toast.error('Defina uma senha de acesso para o novo usuário');
      return;
    }

    if (formPassword.trim()) {
      if (formPassword.length < 6) {
        toast.error('A senha deve ter no mínimo 6 caracteres');
        return;
      }
      if (formPassword !== formConfirmPassword) {
        toast.error('A confirmação de senha não coincide');
        return;
      }
    }

    if (editingUser) {
      const isSelf = currentUser?.email?.toLowerCase() === editingUser.email.toLowerCase();
      if (isSelf && editingUser.role === 'Administrador' && formRole !== 'Administrador') {
        toast.error('Você não pode alterar sua própria função para remover o acesso de Administrador.');
        return;
      }

      const updatedUserObj = {
        id: editingUser.id,
        email: formEmail.trim(),
        name: formName.trim(),
        avatar: formAvatar || undefined,
      };
      savePersistentProfile(updatedUserObj);

      const updatedList = users.map(u => 
        u.id === editingUser.id 
          ? { 
              ...u, 
              name: formName.trim(), 
              email: formEmail.trim(), 
              role: formRole, 
              avatar: formAvatar || undefined 
            } 
          : u
      );
      setUsers(updatedList);
      try {
        localStorage.setItem('radar_system_users_v1', JSON.stringify(updatedList));
        await fetch(`/api/users/${editingUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formName.trim(),
            email: formEmail.trim(),
            role: formRole,
            avatar: formAvatar || undefined,
          }),
        });
      } catch {}

      // Se editou o usuário atualmente logado, sincroniza com o authStore
      if (currentUser?.email?.toLowerCase() === formEmail.trim().toLowerCase()) {
        setCurrentUser({
          ...currentUser,
          name: formName.trim(),
          avatar: formAvatar || undefined,
        });
      }

      toast.success('Usuário atualizado com sucesso!');
    } else {
      const novo: UserSystemItem = {
        id: `USR-${String(users.length + 1).padStart(2, '0')}`,
        name: formName.trim(),
        email: formEmail.trim(),
        role: formRole,
        avatar: formAvatar || undefined,
        status: 'Ativo',
        lastLogin: 'Nunca acessou'
      };
      savePersistentProfile({
        id: novo.id,
        email: novo.email,
        name: novo.name,
        avatar: novo.avatar,
      });
      const updatedList = [...users, novo];
      setUsers(updatedList);
      try {
        localStorage.setItem('radar_system_users_v1', JSON.stringify(updatedList));
        await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(novo),
        });
      } catch {}

      toast.success('Novo usuário criado com sucesso!');
    }

    setIsModalOpen(false);
    setEditingUser(null);
  };

  // Se a tela montou e o usuário logado não for Administrador, exibe aviso elegante de acesso negado
  if (isMounted && !isAdmin) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-border/80 bg-card shadow-2xl p-6 text-center space-y-5 animate-in fade-in-0 duration-200">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-500 shadow-inner">
            <Lock className="w-8 h-8" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-xl font-black text-foreground">Acesso Restrito: Apenas Administradores</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              A área de gestão de usuários, senhas e concessão de permissões é restrita exclusivamente a administradores do sistema.
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-accent/40 border border-border text-left space-y-1.5">
            <p className="text-[11px] font-bold text-foreground">Sua Conta Atual:</p>
            <p className="text-xs text-muted-foreground font-mono">{currentUser?.email || 'Colaborador não identificado'}</p>
            <span className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-slate-500/20 text-slate-300 font-bold">
              Função: {getUserRoleLabel(currentUser)}
            </span>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
            <Button variant="outline" size="sm" asChild className="text-xs font-semibold cursor-pointer">
              <Link href="/">Voltar ao Dashboard</Link>
            </Button>
            <Button size="sm" asChild className="text-xs font-bold bg-primary text-primary-foreground cursor-pointer">
              <Link href="/chat-comercial">Ir para Chat Comercial</Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <span>Usuários e Permissões</span>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
              Gestão de Acesso
            </span>
          </h1>
          <p className="text-muted-foreground text-xs mt-0.5">
            Gerencie fotos de perfil, nomes, cargos e credenciais de acesso de toda a equipe
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <Button 
            variant="outline"
            onClick={() => setIsProfileModalOpen(true)}
            className="text-xs h-9 font-semibold gap-1.5 border-border hover:border-primary cursor-pointer flex-1 md:flex-initial"
          >
            <User className="w-4 h-4 text-primary" />
            Meu Perfil
          </Button>

          <Button 
            onClick={handleOpenNew}
            className="text-xs h-9 font-bold gap-1.5 shadow-sm cursor-pointer flex-1 md:flex-initial"
          >
            <Plus className="w-4 h-4" />
            Novo Usuário
          </Button>
        </div>
      </div>

      {/* Cards de Métricas de Usuários */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="bg-primary/20 p-3 rounded-2xl text-primary border border-primary/30">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total de Contas</p>
              <h3 className="text-2xl font-black text-foreground">{users.length} usuários</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="bg-emerald-500/20 p-3 rounded-2xl text-emerald-500 border border-emerald-500/30">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Administradores</p>
              <h3 className="text-2xl font-black text-emerald-500">{users.filter(u => u.role === 'Administrador').length} admin</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="bg-amber-500/20 p-3 rounded-2xl text-amber-500 border border-amber-500/30">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Equipe Comercial</p>
              <h3 className="text-2xl font-black text-foreground">{users.filter(u => u.role !== 'Administrador').length} vendedores/gestores</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Busca de Usuários */}
      <div className="flex items-center gap-3 bg-card p-3 rounded-xl border border-border">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input 
            type="text"
            className="w-full bg-background border border-border rounded-lg pl-9 pr-3 h-9 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Buscar por nome, e-mail ou cargo..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Tabela de Usuários com Foto de Perfil */}
      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-accent/50 text-muted-foreground border-b border-border">
              <tr>
                <th className="px-6 py-4">Foto & Usuário</th>
                <th className="px-6 py-4">Cargo / Função</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Último Acesso</th>
                <th className="px-6 py-4 text-center">Permissões de Acesso</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(u => (
                <tr key={u.id} className="border-b border-border hover:bg-cardHover transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {u.avatar ? (
                        <img 
                          src={u.avatar} 
                          alt={u.name} 
                          className="w-9 h-9 rounded-xl object-cover border border-primary/30 shadow-xs ring-2 ring-primary/10 shrink-0" 
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-accent text-foreground font-bold text-xs border border-border shrink-0">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-foreground flex items-center gap-1.5">
                          {u.name}
                          {currentUser?.email?.toLowerCase() === u.email.toLowerCase() && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-primary/20 text-primary font-mono font-bold">
                              Você
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {u.role === 'Administrador' ? (
                      <Badge className="bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 gap-1 font-bold">
                        <Crown className="w-3 h-3" />
                        Administrador
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground gap-1">
                        <User className="w-3 h-3" />
                        {u.role}
                      </Badge>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs px-2 py-1 rounded bg-success/10 text-success font-medium">
                      ● {u.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground text-xs">
                    {u.lastLogin}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {u.role === 'Administrador' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentUser?.email?.toLowerCase() === u.email.toLowerCase()}
                        onClick={() => handleToggleAdminPermission(u)}
                        className="h-7 px-2.5 text-[11px] font-bold text-amber-500 hover:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 rounded-lg gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed mx-auto"
                        title={currentUser?.email?.toLowerCase() === u.email.toLowerCase() ? 'Você não pode remover seu próprio acesso de administrador' : 'Remover permissão de Administrador'}
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>Remover Admin</span>
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleAdminPermission(u)}
                        className="h-7 px-2.5 text-[11px] font-bold text-emerald-500 hover:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 rounded-lg gap-1.5 cursor-pointer mx-auto"
                        title="Conceder acesso de Administrador"
                      >
                        <Crown className="w-3.5 h-3.5" />
                        <span>Dar Permissão Admin</span>
                      </Button>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 hover:text-primary cursor-pointer" 
                        onClick={() => handleOpenEdit(u)}
                        title="Editar Usuário (Foto, Nome e Senha)"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 hover:text-destructive cursor-pointer" 
                        onClick={() => handleDelete(u.id)}
                        title="Desativar Usuário"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Criar / Editar Usuário com Foto, Nome e Senha */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl p-6 space-y-5 animate-in fade-in duration-200">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              {editingUser ? 'Editar Usuário & Acesso' : 'Novo Usuário do Sistema'}
            </h2>

            {/* Foto de Perfil */}
            <div className="flex items-center gap-3.5 p-3 rounded-xl bg-accent/30 border border-border">
              <div className="relative group shrink-0">
                {formAvatar ? (
                  <img
                    src={formAvatar}
                    alt={formName || 'Avatar'}
                    className="w-14 h-14 rounded-xl object-cover border border-primary/40 shadow-xs"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-accent text-foreground border border-border font-bold text-lg">
                    {formName ? formName.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 p-1 rounded-lg bg-primary text-primary-foreground shadow-xs hover:scale-105 transition cursor-pointer"
                  title="Carregar Foto"
                >
                  <Camera className="w-3 h-3" />
                </button>
              </div>

              <div className="flex-1 space-y-1">
                <p className="text-xs font-bold text-foreground">Foto de Perfil</p>
                <div className="flex items-center gap-2">
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
                    className="text-[11px] h-7 px-2 font-semibold cursor-pointer"
                  >
                    {formAvatar ? 'Alterar Foto' : 'Adicionar Foto'}
                  </Button>
                  {formAvatar && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setFormAvatar(null)}
                      className="text-[11px] h-7 px-2 text-destructive hover:bg-destructive/10 cursor-pointer"
                    >
                      Remover
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-foreground">Nome Completo</label>
                <input 
                  type="text" 
                  className="w-full h-9 bg-background border border-border rounded-lg px-3 mt-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary" 
                  placeholder="Ex: Carlos Silva"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-foreground">E-mail de Acesso</label>
                <input 
                  type="email" 
                  className="w-full h-9 bg-background border border-border rounded-lg px-3 mt-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary" 
                  placeholder="carlos@radar.com"
                  value={formEmail}
                  onChange={e => setFormEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-foreground">Nível de Permissão</label>
                <select 
                  className="w-full h-9 bg-background border border-border rounded-lg px-3 mt-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                  value={formRole}
                  onChange={e => setFormRole(e.target.value as any)}
                >
                  <option value="Administrador">Administrador (Acesso Total)</option>
                  <option value="Gestor Comercial">Gestor Comercial</option>
                  <option value="Vendedor">Vendedor</option>
                  <option value="Técnico">Técnico de Campo</option>
                </select>
              </div>

              {/* Seção de Senha */}
              <div className="p-3 rounded-xl bg-card border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-amber-500" />
                    {editingUser ? 'Alterar Senha (Opcional)' : 'Definir Senha de Acesso'}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span className="text-[10px]">{showPassword ? 'Ocultar' : 'Ver'}</span>
                  </button>
                </div>

                <input 
                  type={showPassword ? 'text' : 'password'}
                  className="w-full h-9 bg-background border border-border rounded-lg px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary" 
                  placeholder={editingUser ? 'Deixe em branco para manter a senha atual' : 'Mínimo 6 caracteres'}
                  value={formPassword}
                  onChange={e => setFormPassword(e.target.value)}
                />

                {formPassword.trim() && (
                  <input 
                    type={showPassword ? 'text' : 'password'}
                    className="w-full h-9 bg-background border border-border rounded-lg px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary animate-in fade-in duration-100" 
                    placeholder="Confirme a nova senha"
                    value={formConfirmPassword}
                    onChange={e => setFormConfirmPassword(e.target.value)}
                  />
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button size="sm" onClick={handleSave} className="font-bold">
                {editingUser ? 'Salvar Alterações' : 'Criar Acesso'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Meu Perfil */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </div>
  );
}
