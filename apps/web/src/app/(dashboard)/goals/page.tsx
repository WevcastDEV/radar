'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, Target, TrendingUp, Award, Edit, Trash2, Plus } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useConfirm } from '@/components/ui/confirm-dialog';

interface GoalItem {
  id: string;
  seller: string;
  type: string;
  target: number;
  current: number;
  isCurrency: boolean;
}

const INITIAL_GOALS: GoalItem[] = typeof window !== 'undefined' && localStorage.getItem('system_reset') === 'true' ? [] : [
  { id: '1', seller: 'Carlos Santos', type: 'Faturamento', target: 150000, current: 145000, isCurrency: true },
  { id: '2', seller: 'Carlos Santos', type: 'Visitas', target: 50, current: 45, isCurrency: false },
  { id: '3', seller: 'Rafael Costa', type: 'Faturamento', target: 120000, current: 98000, isCurrency: true },
  { id: '4', seller: 'Rafael Costa', type: 'Visitas', target: 45, current: 38, isCurrency: false },
  { id: '5', seller: 'André Lima', type: 'Faturamento', target: 100000, current: 75000, isCurrency: true },
  { id: '6', seller: 'André Lima', type: 'Visitas', target: 40, current: 30, isCurrency: false },
  { id: '7', seller: 'Lucas Silva', type: 'Novos Leads (SDR)', target: 200, current: 180, isCurrency: false },
  { id: '8', seller: 'Lucas Silva', type: 'Ligações (SDR)', target: 800, current: 450, isCurrency: false },
];

// Parser inteligente para valores em PT-BR (ex: 30.000,00 ou 30000 ou 30.000)
function parseSmartNumber(val: string): number {
  if (!val) return 0;
  let clean = val.toString().trim().replace(/R\$\s?/g, '');
  
  // Se tem ponto e vírgula: 30.000,00 -> remove ponto, troca vírgula por ponto
  if (clean.includes('.') && clean.includes(',')) {
    clean = clean.replace(/\./g, '').replace(',', '.');
  } else if (clean.includes(',')) {
    clean = clean.replace(',', '.');
  } else if (clean.includes('.')) {
    // Caso o usuário digite 30.000 (separador de milhar brasileiro)
    const parts = clean.split('.');
    if (parts.length > 1 && parts[parts.length - 1].length === 3) {
      clean = clean.replace(/\./g, '');
    }
  }
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : parsed;
}

export default function GoalsPage() {
  const confirm = useConfirm();
  const [goals, setGoals] = useState<GoalItem[]>(INITIAL_GOALS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<GoalItem | null>(null);
  
  const [newSeller, setNewSeller] = useState('');
  const [newType, setNewType] = useState('Faturamento');
  const [newTarget, setNewTarget] = useState('');
  const [newCurrent, setNewCurrent] = useState('0');

  // Cálculos globais dinâmicos
  const currencyGoals = goals.filter(g => g.isCurrency);
  const globalTarget = currencyGoals.reduce((acc, g) => acc + g.target, 0);
  const globalCurrent = currencyGoals.reduce((acc, g) => acc + g.current, 0);
  const globalPercent = globalTarget > 0 ? ((globalCurrent / globalTarget) * 100).toFixed(1) : '0';

  const handleOpenNew = () => {
    setEditingGoal(null);
    setNewSeller('');
    setNewType('Faturamento');
    setNewTarget('');
    setNewCurrent('0');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (goal: GoalItem) => {
    setEditingGoal(goal);
    setNewSeller(goal.seller);
    setNewType(goal.type);
    setNewTarget(goal.target.toString());
    setNewCurrent(goal.current.toString());
    setIsModalOpen(true);
  };

  const handleDeleteGoal = async (id: string) => {
    const target = goals.find(g => g.id === id);
    const confirmed = await confirm({
      title: 'Remover Meta Comercial',
      description: target 
        ? `Tem certeza que deseja remover a meta de "${target.type}" do vendedor "${target.seller}"?` 
        : 'Tem certeza que deseja remover esta meta?',
      confirmText: 'Remover Meta',
      cancelText: 'Cancelar',
      variant: 'danger',
      icon: 'trash',
    });

    if (confirmed) {
      setGoals(goals.filter(g => g.id !== id));
      toast.success('Meta removida com sucesso!');
    }
  };

  const handleSaveGoal = () => {
    if (!newSeller.trim()) {
      toast.error('Informe o nome do vendedor');
      return;
    }

    const targetNum = parseSmartNumber(newTarget);
    const currentNum = parseSmartNumber(newCurrent);

    if (targetNum <= 0) {
      toast.error('Informe um valor de meta válido');
      return;
    }

    const isCurr = newType === 'Faturamento';

    if (editingGoal) {
      setGoals(goals.map(g => g.id === editingGoal.id ? {
        ...g,
        seller: newSeller,
        type: newType,
        target: targetNum,
        current: currentNum,
        isCurrency: isCurr
      } : g));
      toast.success('Meta atualizada com sucesso!');
    } else {
      const nova: GoalItem = {
        id: Date.now().toString(),
        seller: newSeller,
        type: newType,
        target: targetNum,
        current: currentNum,
        isCurrency: isCurr
      };
      setGoals([nova, ...goals]);
      toast.success('Meta criada com sucesso!');
    }

    setIsModalOpen(false);
    setEditingGoal(null);
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Metas e Objetivos</h1>
          <p className="text-muted-foreground">Acompanhe o atingimento das metas da equipe</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-card border border-border px-3 py-1.5 rounded-md">
            <CalendarIcon className="w-4 h-4 text-muted-foreground" />
            <select className="bg-transparent border-none text-sm focus:outline-none">
              <option>Mês Atual</option>
              <option>Junho 2024</option>
              <option>Maio 2024</option>
            </select>
          </div>
          <Button onClick={handleOpenNew}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Meta
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="bg-primary/20 p-3 rounded-full"><Target className="w-6 h-6 text-primary" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Meta Global (Faturamento)</p>
              <h3 className="text-2xl font-bold text-foreground">{formatCurrency(globalTarget)}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-success/5 border-success/20">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="bg-success/20 p-3 rounded-full"><TrendingUp className="w-6 h-6 text-success" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Realizado Global</p>
              <h3 className="text-2xl font-bold text-success">{formatCurrency(globalCurrent)}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-amber-500/5 border-amber-500/20">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="bg-amber-500/20 p-3 rounded-full"><Award className="w-6 h-6 text-amber-500" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Atingimento Global</p>
              <h3 className="text-2xl font-bold text-amber-500">{globalPercent}%</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <h3 className="font-bold text-lg border-b border-border pb-2 mb-4">Metas por Membro da Equipe</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {goals.map((goal) => {
          const percent = goal.target > 0 ? Math.min(100, Math.round((goal.current / goal.target) * 100)) : 0;
          return (
            <Card key={goal.id} className="hover:border-primary/50 transition-colors">
              <CardContent className="p-5">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-bold text-foreground text-lg">{goal.seller}</h4>
                    <p className="text-xs text-muted-foreground">{goal.type}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-bold text-sm ${percent >= 100 ? 'text-success' : percent >= 80 ? 'text-primary' : 'text-warning'}`}>
                      {percent}%
                    </span>
                    <div className="flex items-center gap-1 ml-2">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => handleOpenEdit(goal)} title="Editar Meta">
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteGoal(goal.id)} title="Remover Meta">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-1 mb-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Atual: <strong className="text-foreground">{goal.isCurrency ? formatCurrency(goal.current) : goal.current}</strong></span>
                    <span className="text-muted-foreground">Meta: <strong className="text-foreground">{goal.isCurrency ? formatCurrency(goal.target) : goal.target}</strong></span>
                  </div>
                </div>
                
                <div className="w-full h-2 bg-accent rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-300 ${percent >= 100 ? 'bg-success' : percent >= 80 ? 'bg-primary' : 'bg-warning'}`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Modal Nova / Editar Meta */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-card w-full max-w-md rounded-xl border border-border shadow-2xl p-6">
            <h2 className="text-xl font-bold mb-4">{editingGoal ? 'Editar Meta' : 'Nova Meta'}</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground">Vendedor / Responsável</label>
                <input 
                  type="text" 
                  className="w-full h-10 bg-background border border-border rounded-md px-3 mt-1" 
                  placeholder="Ex: Weverton" 
                  value={newSeller} 
                  onChange={e => setNewSeller(e.target.value)} 
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Tipo de Meta</label>
                <select 
                  className="w-full h-10 bg-background border border-border rounded-md px-3 mt-1" 
                  value={newType} 
                  onChange={e => setNewType(e.target.value)}
                >
                  <option value="Faturamento">Faturamento (R$)</option>
                  <option value="Visitas">Visitas Agendadas</option>
                  <option value="Novos Leads">Novos Leads</option>
                  <option value="Ligações">Ligações Realizadas</option>
                </select>
              </div>

              <div>
                <label className="text-sm text-muted-foreground">
                  {newType === 'Faturamento' ? 'Valor Alvo da Meta (R$)' : 'Quantidade Alvo'}
                </label>
                <input 
                  type="text" 
                  className="w-full h-10 bg-background border border-border rounded-md px-3 mt-1 font-mono" 
                  placeholder={newType === 'Faturamento' ? 'Ex: 30000 ou 30.000,00' : 'Ex: 50'} 
                  value={newTarget} 
                  onChange={e => setNewTarget(e.target.value)} 
                />
                {newType === 'Faturamento' && newTarget && (
                  <p className="text-xs text-primary mt-1 font-medium">
                    Formato reconhecido: {formatCurrency(parseSmartNumber(newTarget))}
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm text-muted-foreground">
                  {newType === 'Faturamento' ? 'Valor Já Realizado / Atual (R$)' : 'Progresso Atual'}
                </label>
                <input 
                  type="text" 
                  className="w-full h-10 bg-background border border-border rounded-md px-3 mt-1 font-mono" 
                  placeholder={newType === 'Faturamento' ? 'Ex: 0 ou 15000' : 'Ex: 0'} 
                  value={newCurrent} 
                  onChange={e => setNewCurrent(e.target.value)} 
                />
                {newType === 'Faturamento' && newCurrent && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Formato reconhecido: {formatCurrency(parseSmartNumber(newCurrent))}
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => { setIsModalOpen(false); setEditingGoal(null); }}>
                Cancelar
              </Button>
              <Button onClick={handleSaveGoal}>
                {editingGoal ? 'Salvar Alterações' : 'Criar Meta'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
