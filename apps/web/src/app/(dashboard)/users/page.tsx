'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, UserCheck, Shield, KeyRound, Edit, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useConfirm } from '@/components/ui/confirm-dialog';

interface UserSystemItem {
  id: string;
  name: string;
  email: string;
  role: 'Administrador' | 'Gestor Comercial' | 'Vendedor' | 'Técnico';
  status: 'Ativo' | 'Bloqueado';
  lastLogin: string;
}

const INITIAL_USERS: UserSystemItem[] = typeof window !== 'undefined' && localStorage.getItem('system_reset') === 'true' ? [] : [
  { id: 'USR-01', name: 'Weverton (Admin)', email: 'weverton@wctech.com.br', role: 'Administrador', status: 'Ativo', lastLogin: 'Agora mesmo' },
  { id: 'USR-02', name: 'Carlos Santos', email: 'carlos@radar.com', role: 'Vendedor', status: 'Ativo', lastLogin: 'Hoje às 14:20' },
  { id: 'USR-03', name: 'Rafael Costa', email: 'rafael@radar.com', role: 'Vendedor', status: 'Ativo', lastLogin: 'Hoje às 10:15' },
  { id: 'USR-04', name: 'André Lima', email: 'andre@radar.com', role: 'Vendedor', status: 'Ativo', lastLogin: 'Ontem às 18:00' },
  { id: 'USR-05', name: 'Lucas Silva', email: 'lucas@radar.com', role: 'Gestor Comercial', status: 'Ativo', lastLogin: '04/09/2026' },
];

export default function UsersPage() {
  const confirm = useConfirm();
  const [users, setUsers] = useState<UserSystemItem[]>(INITIAL_USERS);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserSystemItem | null>(null);

  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState<UserSystemItem['role']>('Vendedor');

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
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: UserSystemItem) => {
    setEditingUser(user);
    setFormName(user.name);
    setFormEmail(user.email);
    setFormRole(user.role);
    setIsModalOpen(true);
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
      setUsers(users.filter(u => u.id !== id));
      toast.success('Usuário removido!');
    }
  };

  const handleSave = () => {
    if (!formName.trim() || !formEmail.trim()) {
      toast.error('Informe nome e e-mail');
      return;
    }

    if (editingUser) {
      setUsers(users.map(u => u.id === editingUser.id ? { ...u, name: formName, email: formEmail, role: formRole } : u));
      toast.success('Usuário atualizado com sucesso!');
    } else {
      const novo: UserSystemItem = {
        id: `USR-${String(users.length + 1).padStart(2, '0')}`,
        name: formName,
        email: formEmail,
        role: formRole,
        status: 'Ativo',
        lastLogin: 'Nunca acessou'
      };
      setUsers([...users, novo]);
      toast.success('Novo usuário criado com sucesso!');
    }

    setIsModalOpen(false);
    setEditingUser(null);
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Usuários e Permissões</h1>
          <p className="text-muted-foreground">Gerencie quem tem acesso à plataforma e ao sistema comercial</p>
        </div>
        <Button onClick={handleOpenNew}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Usuário
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="bg-primary/20 p-3 rounded-full text-primary">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total de Contas</p>
              <h3 className="text-2xl font-bold text-foreground">{users.length} usuários</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="bg-success/20 p-3 rounded-full text-success">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Administradores</p>
              <h3 className="text-2xl font-bold text-success">{users.filter(u => u.role === 'Administrador').length} admin</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="bg-amber-500/20 p-3 rounded-full text-amber-500">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Acessos Comerciais</p>
              <h3 className="text-2xl font-bold text-foreground">{users.filter(u => u.role !== 'Administrador').length} vendedores/gestores</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-3 bg-card p-3 rounded-xl border border-border">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input 
            type="text"
            className="w-full bg-background border border-border rounded-md pl-9 pr-3 h-9 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Buscar por nome, e-mail ou cargo..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-accent/50 text-muted-foreground border-b border-border">
              <tr>
                <th className="px-6 py-4">Usuário</th>
                <th className="px-6 py-4">Cargo / Função</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Último Acesso</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(u => (
                <tr key={u.id} className="border-b border-border hover:bg-cardHover transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-foreground">{u.name}</div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={u.role === 'Administrador' ? 'default' : 'outline'}>
                      {u.role}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs px-2 py-1 rounded bg-success/10 text-success font-medium">
                      ● {u.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground text-xs">
                    {u.lastLogin}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-primary" onClick={() => handleOpenEdit(u)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={() => handleDelete(u.id)}>
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

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-card w-full max-w-md rounded-xl border border-border shadow-2xl p-6">
            <h2 className="text-xl font-bold mb-4">{editingUser ? 'Editar Usuário' : 'Novo Usuário'}</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground">Nome Completo</label>
                <input 
                  type="text" 
                  className="w-full h-10 bg-background border border-border rounded-md px-3 mt-1" 
                  placeholder="Ex: João Silva"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">E-mail de Acesso</label>
                <input 
                  type="email" 
                  className="w-full h-10 bg-background border border-border rounded-md px-3 mt-1" 
                  placeholder="joao@wctech.com.br"
                  value={formEmail}
                  onChange={e => setFormEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Nível de Permissão</label>
                <select 
                  className="w-full h-10 bg-background border border-border rounded-md px-3 mt-1"
                  value={formRole}
                  onChange={e => setFormRole(e.target.value as any)}
                >
                  <option value="Administrador">Administrador (Acesso Total)</option>
                  <option value="Gestor Comercial">Gestor Comercial</option>
                  <option value="Vendedor">Vendedor</option>
                  <option value="Técnico">Técnico de Campo</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave}>{editingUser ? 'Salvar Alterações' : 'Criar Acesso'}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
