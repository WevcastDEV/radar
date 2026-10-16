'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, Medal, Award, Plus, UserPlus, Edit, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useConfirm } from '@/components/ui/confirm-dialog';

const DEFAULT_TEAM: any[] = [];

export default function TeamPage() {
  const confirm = useConfirm();
  const [team, setTeam] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('radar_team_members_v1');
        if (saved !== null) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            // Expurgar mocks antigos
            const clean = parsed.filter((m: any) => !['1', '2', '3', '4'].includes(m.id) && m.name !== 'Carlos Santos');
            return clean;
          }
        }
      } catch {}
    }
    return DEFAULT_TEAM;
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<any>(null);

  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('Vendedor');

  // Carrega lista central de funcionários da API
  const loadTeam = useCallback(async () => {
    try {
      const res = await fetch(`/api/teams?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        const list = json.data !== undefined ? json.data : json;
        if (Array.isArray(list)) {
          setTeam(list);
          try {
            localStorage.setItem('radar_team_members_v1', JSON.stringify(list));
          } catch {}
          return;
        }
      }
    } catch {}

    // Fallback local se backend offline
    try {
      const saved = localStorage.getItem('radar_team_members_v1');
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setTeam(parsed);
      }
    } catch {}
  }, []);

  useEffect(() => {
    loadTeam();
  }, [loadTeam]);

  const chartData = team.map(t => ({
    name: t.name ? t.name.split(' ')[0] : 'Vendedor',
    Vendas: t.sales || 0,
    Propostas: t.proposals || 0,
    Visitas: t.visits || 0,
  }));

  const handleSaveMember = async () => {
    if (!newName.trim()) return toast.error('Preencha o nome do funcionário');

    if (editingMember) {
      const updated = team.map(t => t.id === editingMember.id ? { ...t, name: newName.trim(), role: newRole } : t);
      setTeam(updated);
      try {
        localStorage.setItem('radar_team_members_v1', JSON.stringify(updated));
        await fetch(`/api/teams/${editingMember.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newName.trim(), role: newRole }),
        });
      } catch {}
      toast.success('Membro atualizado com sucesso!');
    } else {
      const parts = newName.trim().split(' ');
      const avatar = parts.length > 1 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : newName.trim().substring(0, 2).toUpperCase();
      const newM = {
        id: Date.now().toString(),
        rank: team.length + 1,
        name: newName.trim(),
        role: newRole,
        leads: 0, calls: 0, visits: 0, proposals: 0, sales: 0, conversion: 0, revenue: 0, ticket: 0,
        avatar
      };
      const updated = [...team, newM];
      setTeam(updated);
      try {
        localStorage.setItem('radar_team_members_v1', JSON.stringify(updated));
        await fetch('/api/teams', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newM),
        });
      } catch {}
      toast.success('Funcionário cadastrado com sucesso!');
    }
    setIsModalOpen(false);
    setEditingMember(null);
    setNewName('');
  };

  const handleDelete = async (id: string) => {
    const target = team.find(t => t.id === id);
    const confirmed = await confirm({
      title: 'Remover Membro da Equipe',
      description: target 
        ? `Tem certeza que deseja remover "${target.name}" (${target.role}) da equipe comercial?` 
        : 'Tem certeza que deseja remover este funcionário?',
      confirmText: 'Remover da Equipe',
      cancelText: 'Cancelar',
      variant: 'danger',
      icon: 'trash',
    });

    if (confirmed) {
      const updated = team.filter(t => t.id !== id);
      setTeam(updated);
      try {
        localStorage.setItem('radar_team_members_v1', JSON.stringify(updated));
        await fetch(`/api/teams/${id}`, { method: 'DELETE' });
      } catch {}
      toast.success('Membro removido do sistema!');
    }
  };

  const openEdit = (member: any) => {
    setEditingMember(member);
    setNewName(member.name);
    setNewRole(member.role);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Gestão da Equipe</h1>
          <p className="text-muted-foreground">Acompanhe a performance e ranking do time comercial</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsModalOpen(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Convidar Membro
          </Button>
          <Button onClick={() => window.location.href = '/goals'}>Configurar Metas</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {team.slice(0, 3).map((member, i) => (
          <Card key={member.id} className={`relative overflow-hidden ${i === 0 ? 'border-amber-400/50 shadow-[0_0_15px_rgba(251,191,36,0.1)]' : ''}`}>
            {i === 0 && <div className="absolute top-0 right-0 w-16 h-16 bg-amber-400/10 rounded-bl-full flex items-start justify-end p-3"><Trophy className="w-6 h-6 text-amber-400" /></div>}
            {i === 1 && <div className="absolute top-0 right-0 w-16 h-16 bg-slate-400/10 rounded-bl-full flex items-start justify-end p-3"><Medal className="w-6 h-6 text-slate-400" /></div>}
            {i === 2 && <div className="absolute top-0 right-0 w-16 h-16 bg-amber-700/10 rounded-bl-full flex items-start justify-end p-3"><Award className="w-6 h-6 text-amber-700" /></div>}
            
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-xl border-2 ${
                  i === 0 ? 'bg-amber-400/20 text-amber-500 border-amber-400' : 
                  i === 1 ? 'bg-slate-400/20 text-slate-400 border-slate-400' : 
                  'bg-amber-700/20 text-amber-700 border-amber-700'
                }`}>
                  {member.avatar}
                </div>
                <div>
                  <h3 className="font-bold text-lg">{member.name}</h3>
                  <p className="text-sm text-muted-foreground">{member.role}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-6">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Vendas (Mês)</p>
                  <p className="font-bold text-success text-xl">{member.sales}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Faturamento (Mês)</p>
                  <p className="font-bold text-foreground text-xl">{formatCurrency(member.revenue)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Todos os Memembros</CardTitle>
          <CardDescription>Desempenho detalhado de toda a equipe comercial</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-accent/50 text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-4 py-4 w-12 text-center">#</th>
                  <th className="px-6 py-4">Membro</th>
                  <th className="px-4 py-4 text-center">Leads</th>
                  <th className="px-4 py-4 text-center">Calls</th>
                  <th className="px-4 py-4 text-center">Visitas</th>
                  <th className="px-4 py-4 text-center">Propostas</th>
                  <th className="px-4 py-4 text-center">Vendas</th>
                  <th className="px-4 py-4 text-center">Conversão</th>
                  <th className="px-6 py-4 text-right">Faturamento</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {team.map((member, idx) => (
                  <tr key={member.id} className="border-b border-border hover:bg-cardHover/50 transition-colors">
                    <td className="px-4 py-4 text-center font-bold text-muted-foreground">{idx + 1}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">
                          {member.avatar}
                        </div>
                        <div>
                          <div className="font-bold">{member.name}</div>
                          <div className="text-xs text-muted-foreground">{member.role}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">{member.leads}</td>
                    <td className="px-4 py-4 text-center">{member.calls}</td>
                    <td className="px-4 py-4 text-center text-primary font-medium">{member.visits}</td>
                    <td className="px-4 py-4 text-center">{member.proposals}</td>
                    <td className="px-4 py-4 text-center text-success font-bold">{member.sales}</td>
                    <td className="px-4 py-4 text-center">{member.conversion}%</td>
                    <td className="px-6 py-4 text-right font-bold text-foreground">{formatCurrency(member.revenue)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-primary" onClick={() => openEdit(member)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={() => handleDelete(member.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Comparativo de Atividades</CardTitle>
        </CardHeader>
        <CardContent className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
              <XAxis dataKey="name" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <RechartsTooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#1F2937', color: '#F9FAFB' }} />
              <Legend />
              <Bar dataKey="Visitas" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Propostas" fill="#F59E0B" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Vendas" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Modal Convidar/Editar Membro */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-card w-full max-w-md rounded-xl border border-border shadow-2xl p-6">
            <h2 className="text-xl font-bold mb-4">{editingMember ? 'Editar Funcionário' : 'Novo Funcionário'}</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground">Nome Completo</label>
                <input type="text" className="w-full h-10 bg-background border border-border rounded-md px-3 mt-1" placeholder="Ex: Carlos Santos" value={newName} onChange={e => setNewName(e.target.value)} />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Cargo / Função</label>
                <select className="w-full h-10 bg-background border border-border rounded-md px-3 mt-1" value={newRole} onChange={e => setNewRole(e.target.value)}>
                  <option value="Vendedor Sênior">Vendedor Sênior</option>
                  <option value="Vendedor">Vendedor Pleno</option>
                  <option value="SDR">Pré-Vendas (SDR)</option>
                  <option value="Gerente Comercial">Gerente Comercial</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => { setIsModalOpen(false); setEditingMember(null); setNewName(''); }}>Cancelar</Button>
              <Button onClick={handleSaveMember}>{editingMember ? 'Salvar Alterações' : 'Cadastrar Membro'}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
