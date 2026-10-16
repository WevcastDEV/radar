'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Target, TrendingUp, Award, Edit, Trash2, Plus, Lock, 
  ShieldCheck, Printer, CheckCircle2, DollarSign, Phone, 
  User, Users, FileText, Search, Download, ExternalLink, 
  Sparkles, Clock, ShoppingBag, Eye, Calendar, RefreshCw,
  History, ArrowRight, Check, Percent
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useAuthStore } from '@/stores/auth-store';
import { isUserAdmin, getUserRoleLabel } from '@/lib/auth';

export interface EditChange {
  field: string;
  label: string;
  oldValue: string;
  newValue: string;
}

export interface EditLog {
  id: string;
  timestamp: number;
  dateStr: string;
  userName: string;
  userRole?: string;
  itemType: 'meta' | 'venda';
  targetTitle: string;
  changes: EditChange[];
  notes?: string;
}

export interface GoalSale {
  id: string;
  goalId?: string;
  sellerName: string;
  sellerId?: string;
  clientName: string;
  clientPhone: string;
  value: number;
  category: string;
  notes?: string;
  createdAt: number;
  month?: number;
  year?: number;
  editLogs?: EditLog[];
}

export interface GoalItem {
  id: string;
  seller: string;
  sellerId?: string;
  type: string;
  category: string;
  target: number;
  current: number;
  isCurrency: boolean;
  salesCount: number;
  month: number;
  year: number;
  editLogs?: EditLog[];
}

const MONTHS = [
  { value: 1, name: 'Janeiro', short: 'Jan' },
  { value: 2, name: 'Fevereiro', short: 'Fev' },
  { value: 3, name: 'Março', short: 'Mar' },
  { value: 4, name: 'Abril', short: 'Abr' },
  { value: 5, name: 'Maio', short: 'Mai' },
  { value: 6, name: 'Junho', short: 'Jun' },
  { value: 7, name: 'Julho', short: 'Jul' },
  { value: 8, name: 'Agosto', short: 'Ago' },
  { value: 9, name: 'Setembro', short: 'Set' },
  { value: 10, name: 'Outubro', short: 'Out' },
  { value: 11, name: 'Novembro', short: 'Nov' },
  { value: 12, name: 'Dezembro', short: 'Dez' },
];

const DEFAULT_GRAFICA_GOALS: GoalItem[] = [];

const DEFAULT_SALES: GoalSale[] = [];

// Parser inteligente para valores em PT-BR (ex: 30.000,00 ou 30000 ou 30.000)
function parseSmartNumber(val: string): number {
  if (!val) return 0;
  let clean = val.toString().trim().replace(/R\$\s?/g, '');
  if (clean.includes('.') && clean.includes(',')) {
    clean = clean.replace(/\./g, '').replace(',', '.');
  } else if (clean.includes(',')) {
    clean = clean.replace(',', '.');
  } else if (clean.includes('.')) {
    const parts = clean.split('.');
    if (parts.length > 1 && parts[parts.length - 1].length === 3) {
      clean = clean.replace(/\./g, '');
    }
  }
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : parsed;
}

// Máscara brasileira de telefone (XX) XXXXX-XXXX
function formatPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits ? `(${digits}` : '';
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

export default function GoalsPage() {
  const confirm = useConfirm();
  const user = useAuthStore((s) => s.user);

  // Perfil administrativo
  const isActualAdmin = isUserAdmin(user);

  // Modo de visualização: Administrador (Gestão de Metas da Equipe) vs Funcionário (Minhas Metas e Lançamento)
  const [viewRole, setViewRole] = useState<'admin' | 'employee'>(isActualAdmin ? 'admin' : 'employee');
  const isAdminView = isActualAdmin && viewRole === 'admin';

  // Estados principais
  const [goals, setGoals] = useState<GoalItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('radar_grafica_goals_v3');
        if (saved !== null) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            // Expurgar exemplos fictícios antigos se houver
            return parsed.filter(
              (g) =>
                !g.id?.includes('karyna') &&
                !g.id?.includes('marcos') &&
                !g.id?.includes('thiago') &&
                !g.id?.includes('lucas') &&
                !g.id?.includes('beatriz') &&
                !g.id?.includes('colab-')
            );
          }
        }
      } catch {}
    }
    return DEFAULT_GRAFICA_GOALS;
  });

  const [sales, setSales] = useState<GoalSale[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('radar_grafica_sales_v1');
        if (saved !== null) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            return parsed.filter((s) => !['sale-1', 'sale-2', 'sale-3', 'sale-4'].includes(s.id));
          }
        }
      } catch {}
    }
    return DEFAULT_SALES;
  });

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const [selectedSellerFilter, setSelectedSellerFilter] = useState<string>('all');
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<number | 'all'>('all');
  const [selectedYearFilter, setSelectedYearFilter] = useState<number>(currentYear);
  const [salesSearchQuery, setSalesSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'sellers' | 'sales' | 'audit'>('overview');

  // Modais
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [isEditSaleModalOpen, setIsEditSaleModalOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<GoalSale | null>(null);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<GoalItem | null>(null);

  // Modal de Histórico de Auditoria
  const [auditLogModalData, setAuditLogModalData] = useState<{
    title: string;
    subtitle?: string;
    logs: EditLog[];
  } | null>(null);

  // Taxa de Comissão de Vendas (Padrão 1%, customizável pelo usuário)
  const [commissionRate, setCommissionRate] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('radar_goals_commission_rate');
        if (saved !== null) {
          const parsed = parseFloat(saved);
          if (!isNaN(parsed) && parsed >= 0) return parsed;
        }
      } catch {}
    }
    return 1.0;
  });
  const [isCommissionModalOpen, setIsCommissionModalOpen] = useState(false);
  const [tempCommissionRate, setTempCommissionRate] = useState('1.0');

  const handleSaveCommissionRate = (newRate: number) => {
    if (isNaN(newRate) || newRate < 0) {
      return toast.error('Informe uma porcentagem válida de comissão.');
    }
    const cleanRate = Number(newRate.toFixed(2));
    setCommissionRate(cleanRate);
    try {
      localStorage.setItem('radar_goals_commission_rate', String(cleanRate));
    } catch {}
    toast.success(`Taxa de comissão atualizada para ${cleanRate}%!`);
    setIsCommissionModalOpen(false);
  };

  // Clientes e Produtos cadastrados no sistema para auto-preenchimento
  const [registeredCustomers, setRegisteredCustomers] = useState<any[]>([]);
  const [registeredProducts, setRegisteredProducts] = useState<any[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const custRaw = localStorage.getItem('radar_customers_data');
        if (custRaw) {
          const parsed = JSON.parse(custRaw);
          if (Array.isArray(parsed)) {
            setRegisteredCustomers(parsed.filter((c: any) => !['CLI-001', 'CLI-002'].includes(c.id)));
          }
        }
      } catch {}

      try {
        const prodRaw = localStorage.getItem('radar_custom_products');
        if (prodRaw) {
          const parsed = JSON.parse(prodRaw);
          if (Array.isArray(parsed)) {
            setRegisteredProducts(parsed.filter((p: any) => !['PRD-001', 'PRD-002', 'PRD-003'].includes(p.id)));
          }
        }
      } catch {}
    }
  }, [isSaleModalOpen, isEditSaleModalOpen]);

  // Formulário de Registro de Venda pelo Funcionário
  const defaultSellerName = user?.name || '';
  const [saleSeller, setSaleSeller] = useState(defaultSellerName);
  const [saleClientName, setSaleClientName] = useState('');
  const [saleClientPhone, setSaleClientPhone] = useState('');
  const [saleValue, setSaleValue] = useState('');
  const [saleCategory, setSaleCategory] = useState('Vendas & Serviços');
  const [saleNotes, setSaleNotes] = useState('');
  const [saleMonth, setSaleMonth] = useState<number>(currentMonth);
  const [saleYear, setSaleYear] = useState<number>(currentYear);

  // Formulário de Edição de Venda
  const [editSaleSeller, setEditSaleSeller] = useState('');
  const [editSaleClientName, setEditSaleClientName] = useState('');
  const [editSaleClientPhone, setEditSaleClientPhone] = useState('');
  const [editSaleValue, setEditSaleValue] = useState('');
  const [editSaleCategory, setEditSaleCategory] = useState('Vendas & Serviços');
  const [editSaleNotes, setEditSaleNotes] = useState('');
  const [editSaleMonth, setEditSaleMonth] = useState<number>(currentMonth);
  const [editSaleYear, setEditSaleYear] = useState<number>(currentYear);
  const [editSaleReason, setEditSaleReason] = useState('');

  // Formulário de Criação/Edição de Metas (ADMIN)
  const [newSeller, setNewSeller] = useState('');
  const [newCategory, setNewCategory] = useState('Vendas & Serviços');
  const [newType, setNewType] = useState('Faturamento (R$)');
  const [newTarget, setNewTarget] = useState('');
  const [newCurrent, setNewCurrent] = useState('0');
  const [newMonth, setNewMonth] = useState<number>(currentMonth);
  const [newYear, setNewYear] = useState<number>(currentYear);
  const [replicateToAllMonths, setReplicateToAllMonths] = useState(false);

  // Estados de Sincronização em Tempo Real
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date>(new Date());

  // Carregar dados da API e fallback local
  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsSyncing(true);
    try {
      const goalsRes = await fetch(`/api/goals?t=${Date.now()}`, { cache: 'no-store' });
      if (goalsRes.ok) {
        const json = await goalsRes.json();
        const items = json.data !== undefined ? json.data : json;
        if (Array.isArray(items)) {
          const cleaned = items.filter(
            (g: any) =>
              !g.id?.includes('karyna') &&
              !g.id?.includes('marcos') &&
              !g.id?.includes('thiago') &&
              !g.id?.includes('lucas') &&
              !g.id?.includes('beatriz') &&
              !g.id?.includes('colab-')
          );
          setGoals(cleaned);
          try {
            localStorage.setItem('radar_grafica_goals_v3', JSON.stringify(cleaned));
          } catch {}
        }
      }

      const salesRes = await fetch(`/api/goals/sales?t=${Date.now()}`, { cache: 'no-store' });
      if (salesRes.ok) {
        const json = await salesRes.json();
        const items = json.data !== undefined ? json.data : json;
        if (Array.isArray(items)) {
          const cleaned = items.filter((s: any) => !['sale-1', 'sale-2', 'sale-3', 'sale-4'].includes(s.id));
          setSales(cleaned);
          try {
            localStorage.setItem('radar_grafica_sales_v1', JSON.stringify(cleaned));
          } catch {}
        }
      }
      setLastSyncedAt(new Date());
    } catch {
      // Fallback para localStorage se backend estiver indisponível
      try {
        const savedGoals = localStorage.getItem('radar_grafica_goals_v3');
        if (savedGoals !== null) {
          const parsed = JSON.parse(savedGoals);
          if (Array.isArray(parsed)) {
            setGoals(
              parsed.filter(
                (g: any) =>
                  !g.id?.includes('karyna') &&
                  !g.id?.includes('marcos') &&
                  !g.id?.includes('thiago') &&
                  !g.id?.includes('lucas') &&
                  !g.id?.includes('beatriz') &&
                  !g.id?.includes('colab-')
              )
            );
          }
        }
        const savedSales = localStorage.getItem('radar_grafica_sales_v1');
        if (savedSales !== null) {
          const parsed = JSON.parse(savedSales);
          if (Array.isArray(parsed)) {
            setSales(parsed.filter((s: any) => !['sale-1', 'sale-2', 'sale-3', 'sale-4'].includes(s.id)));
          }
        }
      } catch {}
    } finally {
      if (!isSilent) setIsSyncing(false);
    }
  }, []);

  // Sincronização Automática Contínua (Tempo Real a cada 3.5 segundos + Foco + Armazenamento)
  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      loadData(true);
    }, 3500);

    const handleFocus = () => loadData(true);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') loadData(true);
    };
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'radar_grafica_goals_v3' || e.key === 'radar_grafica_sales_v1') {
        loadData(true);
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('storage', handleStorage);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('storage', handleStorage);
    };
  }, [loadData]);

  const persistGoalsLocal = (newGoals: GoalItem[]) => {
    setGoals(newGoals);
    try {
      localStorage.setItem('radar_grafica_goals_v3', JSON.stringify(newGoals));
    } catch {}
  };

  const persistSalesLocal = (newSales: GoalSale[]) => {
    setSales(newSales);
    try {
      localStorage.setItem('radar_grafica_sales_v1', JSON.stringify(newSales));
    } catch {}
  };

  // Lista dinâmica e completa de todos os colaboradores ativos
  const distinctSellers = useMemo(() => {
    const set = new Set<string>();
    if (user?.name) set.add(user.name.trim());

    // Membros da equipe cadastrados em radar_team_members_v1
    if (typeof window !== 'undefined') {
      try {
        const teamSaved = localStorage.getItem('radar_team_members_v1');
        if (teamSaved) {
          const teamParsed = JSON.parse(teamSaved);
          if (Array.isArray(teamParsed)) {
            teamParsed.forEach((m: any) => {
              if (m.name && m.name.trim()) set.add(m.name.trim());
            });
          }
        }
      } catch {}

      try {
        const saved = localStorage.getItem('radar_system_users_v1');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            parsed.forEach((u: any) => {
              if (u.name && u.status !== 'Bloqueado') {
                const clean = u.name.replace(/\s*\(Admin\)/i, '').trim();
                if (clean) set.add(clean);
              }
            });
          }
        }
      } catch {}
    }

    goals.forEach((g) => {
      if (g.category !== 'Faturamento Geral' && !g.seller.includes('Meta Global') && !g.seller.includes('Geral')) {
        set.add(g.seller.trim());
      }
    });

    sales.forEach((s) => {
      if (s.sellerName) set.add(s.sellerName.trim());
    });

    return Array.from(set).filter(Boolean);
  }, [goals, sales, user?.name]);

  // Cálculos consolidados (ADM: Toda a equipe | Funcionário: Seus dados pessoais)
  const currencyGoals = useMemo(() => {
    return goals.filter((g) => {
      if (!g.isCurrency || g.category === 'Faturamento Geral' || g.seller.includes('Meta Global')) {
        return false;
      }
      if (selectedMonthFilter !== 'all') {
        const gMonth = g.month || 10;
        if (gMonth !== Number(selectedMonthFilter)) return false;
      }
      if (selectedYearFilter) {
        const gYear = g.year || currentYear;
        if (gYear !== Number(selectedYearFilter)) return false;
      }
      return true;
    });
  }, [goals, selectedMonthFilter, selectedYearFilter, currentYear]);

  const relevantGoals = useMemo(() => {
    if (!isAdminView && user?.name) {
      const myName = user.name.toLowerCase();
      const myGoals = currencyGoals.filter(
        (g) => g.seller.toLowerCase().includes(myName) || myName.includes(g.seller.toLowerCase())
      );
      if (myGoals.length > 0) return myGoals;
    }
    return currencyGoals;
  }, [currencyGoals, isAdminView, user?.name]);

  const displayTarget = useMemo(() => {
    return relevantGoals.reduce((acc, g) => acc + g.target, 0);
  }, [relevantGoals]);

  const displayCurrent = useMemo(() => {
    return relevantGoals.reduce((acc, g) => acc + g.current, 0);
  }, [relevantGoals]);

  const displayPercent = useMemo(() => {
    return displayTarget > 0 ? ((displayCurrent / displayTarget) * 100).toFixed(1) : '0';
  }, [displayTarget, displayCurrent]);

  const relevantSalesCount = useMemo(() => {
    let list = [...sales];
    if (selectedMonthFilter !== 'all') {
      list = list.filter((s) => {
        const sMonth = s.month || (new Date(s.createdAt).getMonth() + 1);
        return sMonth === Number(selectedMonthFilter);
      });
    }
    if (selectedYearFilter) {
      list = list.filter((s) => {
        const sYear = s.year || new Date(s.createdAt).getFullYear();
        return sYear === Number(selectedYearFilter);
      });
    }
    if (!isAdminView && user?.name) {
      const myName = user.name.toLowerCase();
      return list.filter(
        (s) => s.sellerName.toLowerCase().includes(myName) || myName.includes(s.sellerName.toLowerCase())
      ).length;
    }
    return list.length;
  }, [sales, isAdminView, user?.name, selectedMonthFilter, selectedYearFilter]);

  const averageTicket = relevantSalesCount > 0 ? displayCurrent / relevantSalesCount : 0;

  // Filtragem de Metas
  const filteredGoals = useMemo(() => {
    let list = [...goals];
    if (!isAdminView && user?.name) {
      const myName = user.name.toLowerCase();
      const myGoals = list.filter(
        (g) => g.seller.toLowerCase().includes(myName) || myName.includes(g.seller.toLowerCase())
      );
      if (myGoals.length > 0) list = myGoals;
    }
    if (selectedSellerFilter !== 'all') {
      const q = selectedSellerFilter.toLowerCase();
      list = list.filter((g) => g.seller.toLowerCase().includes(q));
    }
    if (selectedMonthFilter !== 'all') {
      list = list.filter((g) => (g.month || 10) === Number(selectedMonthFilter));
    }
    if (selectedYearFilter) {
      list = list.filter((g) => (g.year || currentYear) === Number(selectedYearFilter));
    }
    return list;
  }, [goals, selectedSellerFilter, selectedMonthFilter, selectedYearFilter, isAdminView, user?.name, currentYear]);

  // Filtragem de Vendas Lançadas
  const filteredSales = useMemo(() => {
    let list = [...sales];
    if (!isAdminView && user?.name) {
      const myName = user.name.toLowerCase();
      list = list.filter(
        (s) => s.sellerName.toLowerCase().includes(myName) || myName.includes(s.sellerName.toLowerCase())
      );
    } else if (selectedSellerFilter !== 'all') {
      const q = selectedSellerFilter.toLowerCase();
      list = list.filter((s) => s.sellerName.toLowerCase().includes(q));
    }
    if (selectedMonthFilter !== 'all') {
      list = list.filter((s) => {
        const sMonth = s.month || (new Date(s.createdAt).getMonth() + 1);
        return sMonth === Number(selectedMonthFilter);
      });
    }
    if (selectedYearFilter) {
      list = list.filter((s) => {
        const sYear = s.year || new Date(s.createdAt).getFullYear();
        return sYear === Number(selectedYearFilter);
      });
    }
    if (salesSearchQuery.trim()) {
      const q = salesSearchQuery.toLowerCase();
      list = list.filter(
        (s) =>
          s.clientName.toLowerCase().includes(q) ||
          s.clientPhone.includes(q) ||
          s.sellerName.toLowerCase().includes(q) ||
          (s.notes && s.notes.toLowerCase().includes(q)) ||
          s.category.toLowerCase().includes(q)
      );
    }
    return list;
  }, [sales, selectedSellerFilter, selectedMonthFilter, selectedYearFilter, salesSearchQuery, isAdminView, user?.name]);

  // Todos os Logs de Auditoria consolidados (Metas e Vendas)
  const allAuditLogs = useMemo(() => {
    const list: EditLog[] = [];
    goals.forEach((g) => {
      if (g.editLogs && Array.isArray(g.editLogs)) {
        list.push(...g.editLogs);
      }
    });
    sales.forEach((s) => {
      if (s.editLogs && Array.isArray(s.editLogs)) {
        list.push(...s.editLogs);
      }
    });
    return list.sort((a, b) => b.timestamp - a.timestamp);
  }, [goals, sales]);

  // ═══════════════════════════════════════════════════════════════════
  // AÇÃO: REGISTRAR NOVA VENDA (FUNCIONÁRIO OU ADMIN)
  // ═══════════════════════════════════════════════════════════════════
  const handleOpenSaleModal = (prefillSeller?: string) => {
    const sellerToUse =
      prefillSeller ||
      (distinctSellers.length > 0 ? distinctSellers[0] : (user?.name || defaultSellerName));
    setSaleSeller(sellerToUse);
    setSaleClientName('');
    setSaleClientPhone('');
    setSaleValue('');
    setSaleCategory('Vendas & Serviços');
    setSaleNotes('');
    setSaleMonth(typeof selectedMonthFilter === 'number' ? selectedMonthFilter : currentMonth);
    setSaleYear(selectedYearFilter || currentYear);
    setIsSaleModalOpen(true);
  };

  const handleSaveSale = async () => {
    if (!saleSeller.trim()) {
      return toast.error('Informe o nome do vendedor responsável.');
    }
    if (!saleClientName.trim()) {
      return toast.error('Informe o nome do cliente ou empresa atendida.');
    }
    if (!saleClientPhone.trim() || saleClientPhone.replace(/\D/g, '').length < 8) {
      return toast.error('Informe um telefone válido do cliente.');
    }
    const val = parseSmartNumber(saleValue);
    if (val <= 0) {
      return toast.error('Informe um valor de venda válido.');
    }

    const payload = {
      sellerName: saleSeller.trim(),
      clientName: saleClientName.trim(),
      clientPhone: saleClientPhone.trim(),
      value: val,
      category: saleCategory,
      notes: saleNotes.trim(),
      month: saleMonth,
      year: saleYear,
      createdAt: Date.now(),
    };

    try {
      const res = await fetch('/api/goals/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(`🎉 Venda de ${formatCurrency(val)} registrada com sucesso para ${payload.clientName}!`);
        setIsSaleModalOpen(false);
        loadData();
        return;
      }
    } catch {}

    // Fallback local se backend offline
    const newSaleItem: GoalSale = {
      id: `sale-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      sellerName: payload.sellerName,
      clientName: payload.clientName,
      clientPhone: payload.clientPhone,
      value: val,
      category: payload.category,
      notes: payload.notes,
      month: payload.month,
      year: payload.year,
      createdAt: Date.now(),
      editLogs: [],
    };

    const updatedSales = [newSaleItem, ...sales];
    persistSalesLocal(updatedSales);

    // Incrementa meta local ou cria meta para o vendedor se não existir
    let foundGoal = false;
    const updatedGoals = goals.map((g) => {
      const isMatch =
        g.seller.toLowerCase().includes(payload.sellerName.toLowerCase()) ||
        payload.sellerName.toLowerCase().includes(g.seller.toLowerCase());

      if (isMatch || g.category === 'Faturamento Geral') {
        foundGoal = true;
        return {
          ...g,
          current: Number((g.current + val).toFixed(2)),
          salesCount: (g.salesCount || 0) + 1,
        };
      }
      return g;
    });

    if (!foundGoal) {
      const newGoal: GoalItem = {
        id: `goal-${Date.now()}`,
        seller: payload.sellerName,
        type: `${payload.category} - Vendas`,
        category: payload.category,
        target: val > 10000 ? val * 2 : 10000,
        current: val,
        isCurrency: true,
        salesCount: 1,
        month: payload.month,
        year: payload.year,
        editLogs: [],
      };
      updatedGoals.unshift(newGoal);
    }

    persistGoalsLocal(updatedGoals);
    toast.success(`🎉 Venda de ${formatCurrency(val)} registrada com sucesso!`);
    setIsSaleModalOpen(false);
  };

  // ═══════════════════════════════════════════════════════════════════
  // AÇÃO: EDITAR VENDA LANÇADA (COM LOG DE AUDITORIA COMPLETO)
  // ═══════════════════════════════════════════════════════════════════
  const handleOpenEditSale = (sale: GoalSale) => {
    setEditingSale(sale);
    setEditSaleSeller(sale.sellerName);
    setEditSaleClientName(sale.clientName);
    setEditSaleClientPhone(sale.clientPhone);
    setEditSaleValue(sale.value.toString());
    setEditSaleCategory(sale.category);
    setEditSaleNotes(sale.notes || '');
    setEditSaleMonth(sale.month || (new Date(sale.createdAt).getMonth() + 1));
    setEditSaleYear(sale.year || new Date(sale.createdAt).getFullYear());
    setEditSaleReason('');
    setIsEditSaleModalOpen(true);
  };

  const handleSaveEditSale = async () => {
    if (!editingSale) return;
    if (!editSaleSeller.trim()) {
      return toast.error('Informe o nome do vendedor responsável.');
    }
    if (!editSaleClientName.trim()) {
      return toast.error('Informe o nome do cliente atendido.');
    }
    if (!editSaleClientPhone.trim() || editSaleClientPhone.replace(/\D/g, '').length < 8) {
      return toast.error('Informe um telefone válido do cliente.');
    }
    const val = parseSmartNumber(editSaleValue);
    if (val <= 0) {
      return toast.error('Informe um valor de venda válido.');
    }

    // Validação OBRIGATÓRIA da descrição/motivo da alteração
    if (!editSaleReason.trim() || editSaleReason.trim().length < 3) {
      return toast.error('A descrição/motivo da alteração é OBRIGATÓRIA para salvar qualquer modificação no lançamento.');
    }

    // Calcula diferenças para o log de auditoria
    const changes: EditChange[] = [];
    if (editingSale.sellerName.trim() !== editSaleSeller.trim()) {
      changes.push({
        field: 'sellerName',
        label: 'Vendedor Responsável',
        oldValue: editingSale.sellerName,
        newValue: editSaleSeller.trim(),
      });
    }
    if (editingSale.clientName.trim() !== editSaleClientName.trim()) {
      changes.push({
        field: 'clientName',
        label: 'Nome do Cliente',
        oldValue: editingSale.clientName,
        newValue: editSaleClientName.trim(),
      });
    }
    if (editingSale.clientPhone.trim() !== editSaleClientPhone.trim()) {
      changes.push({
        field: 'clientPhone',
        label: 'Telefone WhatsApp',
        oldValue: editingSale.clientPhone,
        newValue: editSaleClientPhone.trim(),
      });
    }
    if (editingSale.value !== val) {
      changes.push({
        field: 'value',
        label: 'Valor da Venda',
        oldValue: formatCurrency(editingSale.value),
        newValue: formatCurrency(val),
      });
    }
    if (editingSale.category !== editSaleCategory) {
      changes.push({
        field: 'category',
        label: 'Produto / Categoria',
        oldValue: editingSale.category,
        newValue: editSaleCategory,
      });
    }
    if ((editingSale.notes || '').trim() !== editSaleNotes.trim()) {
      changes.push({
        field: 'notes',
        label: 'Observações',
        oldValue: editingSale.notes || '(vazio)',
        newValue: editSaleNotes.trim() || '(vazio)',
      });
    }
    const oldM = editingSale.month || (new Date(editingSale.createdAt).getMonth() + 1);
    if (oldM !== editSaleMonth) {
      const oldMName = MONTHS.find((m) => m.value === oldM)?.name || String(oldM);
      const newMName = MONTHS.find((m) => m.value === editSaleMonth)?.name || String(editSaleMonth);
      changes.push({
        field: 'month',
        label: 'Mês de Referência',
        oldValue: oldMName,
        newValue: newMName,
      });
    }
    const oldY = editingSale.year || new Date(editingSale.createdAt).getFullYear();
    if (oldY !== editSaleYear) {
      changes.push({
        field: 'year',
        label: 'Ano de Referência',
        oldValue: String(oldY),
        newValue: String(editSaleYear),
      });
    }

    const valDiff = val - editingSale.value;

    const newLog: EditLog = {
      id: `log-sale-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
      dateStr: new Date().toLocaleString('pt-BR'),
      userName: user?.name || 'Administrador',
      userRole: isAdminView ? 'Administrador' : 'Colaborador',
      itemType: 'venda',
      targetTitle: `Venda para ${editSaleClientName.trim()} (${formatCurrency(val)})`,
      notes: editSaleReason.trim(),
      changes:
        changes.length > 0
          ? changes
          : [
              {
                field: 'justification',
                label: 'Revisão / Justificativa',
                oldValue: '(confirmado)',
                newValue: editSaleReason.trim(),
              },
            ],
    };

    const updatedSaleItem: GoalSale = {
      ...editingSale,
      sellerName: editSaleSeller.trim(),
      clientName: editSaleClientName.trim(),
      clientPhone: editSaleClientPhone.trim(),
      value: val,
      category: editSaleCategory,
      notes: editSaleNotes.trim(),
      month: editSaleMonth,
      year: editSaleYear,
      editLogs: [newLog, ...(editingSale.editLogs || [])],
    };

    const updatedSales = sales.map((s) => (s.id === editingSale.id ? updatedSaleItem : s));
    persistSalesLocal(updatedSales);

    // Ajusta o valor na meta comercial se o valor da venda foi alterado
    if (valDiff !== 0) {
      const updatedGoals = goals.map((g) => {
        const isMatch =
          g.seller.toLowerCase().includes(updatedSaleItem.sellerName.toLowerCase()) ||
          updatedSaleItem.sellerName.toLowerCase().includes(g.seller.toLowerCase()) ||
          g.category === 'Faturamento Geral';

        if (isMatch) {
          return {
            ...g,
            current: Math.max(0, Number((g.current + valDiff).toFixed(2))),
          };
        }
        return g;
      });
      persistGoalsLocal(updatedGoals);
    }

    try {
      await fetch(`/api/goals/sales/${editingSale.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSaleItem),
      });
    } catch {}

    toast.success(
      `Venda atualizada com sucesso!${
        changes.length > 0 ? ` (${changes.length} modificações registradas no log)` : ''
      }`
    );
    setIsEditSaleModalOpen(false);
    setEditingSale(null);
    setEditSaleReason('');
    loadData(true);
  };

  // ═══════════════════════════════════════════════════════════════════
  // AÇÃO: ESTORNAR / EXCLUIR VENDA LANÇADA
  // ═══════════════════════════════════════════════════════════════════
  const handleDeleteSale = async (sale: GoalSale) => {
    const confirmed = await confirm({
      title: 'Estornar Venda Lançada',
      description: `Tem certeza que deseja estornar a venda de ${formatCurrency(sale.value)} feita para "${sale.clientName}"? O valor será subtraído da meta de ${sale.sellerName}.`,
      confirmText: 'Estornar Venda',
      cancelText: 'Cancelar',
      variant: 'danger',
      icon: 'trash',
    });

    if (!confirmed) return;

    try {
      const res = await fetch(`/api/goals/sales/${sale.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Venda estornada com sucesso!');
        loadData();
        return;
      }
    } catch {}

    // Fallback local
    const updatedSales = sales.filter((s) => s.id !== sale.id);
    persistSalesLocal(updatedSales);

    const updatedGoals = goals.map((g) => {
      const isMatch =
        g.seller.toLowerCase().includes(sale.sellerName.toLowerCase()) ||
        g.category.toLowerCase() === sale.category.toLowerCase();

      if (isMatch || g.category === 'Faturamento Geral') {
        return {
          ...g,
          current: Math.max(0, Number((g.current - sale.value).toFixed(2))),
          salesCount: Math.max(0, (g.salesCount || 1) - 1),
        };
      }
      return g;
    });
    persistGoalsLocal(updatedGoals);
    toast.success('Venda estornada localmente com sucesso!');
  };

  const handleClearAllSales = async () => {
    const confirmed = await confirm({
      title: 'Limpar Todo o Histórico de Vendas',
      description: 'Tem certeza que deseja apagar todas as vendas registradas pelos colaboradores? Esta ação limpará o histórico para você começar um novo ciclo do zero.',
      confirmText: 'Limpar Todas as Vendas',
      cancelText: 'Cancelar',
      variant: 'danger',
      icon: 'trash',
    });
    if (!confirmed) return;
    setSales([]);
    try {
      localStorage.setItem('radar_grafica_sales_v1', JSON.stringify([]));
    } catch {}
    toast.success('Histórico de vendas limpo com sucesso!');
  };

  // ═══════════════════════════════════════════════════════════════════
  // AÇÃO: CRIAR OU EDITAR METAS
  // ═══════════════════════════════════════════════════════════════════
  const handleOpenNewGoal = (prefillSeller?: string) => {
    setViewRole('admin');
    setEditingGoal(null);
    setNewSeller(prefillSeller || '');
    setNewCategory('Vendas & Serviços');
    setNewType('Faturamento (R$)');
    setNewTarget('');
    setNewCurrent('0');
    setNewMonth(typeof selectedMonthFilter === 'number' ? selectedMonthFilter : currentMonth);
    setNewYear(selectedYearFilter || currentYear);
    setReplicateToAllMonths(false);
    setIsGoalModalOpen(true);
  };

  const handleOpenEditGoal = (goal: GoalItem) => {
    setViewRole('admin');
    setEditingGoal(goal);
    setNewSeller(goal.seller);
    setNewCategory(goal.category || 'Vendas & Serviços');
    setNewType(goal.isCurrency ? 'Faturamento (R$)' : 'Quantidade');
    setNewTarget(goal.target.toString());
    setNewCurrent(goal.current.toString());
    setNewMonth(goal.month || currentMonth);
    setNewYear(goal.year || currentYear);
    setReplicateToAllMonths(false);
    setIsGoalModalOpen(true);
  };

  const handleDeleteGoal = async (id: string) => {
    const target = goals.find((g) => g.id === id);
    const confirmed = await confirm({
      title: 'Remover Meta Comercial',
      description: target
        ? `Tem certeza que deseja remover a meta de "${target.type}" do colaborador "${target.seller}"? Esta alteração será sincronizada em tempo real.`
        : 'Tem certeza que deseja remover esta meta?',
      confirmText: 'Remover Meta',
      cancelText: 'Cancelar',
      variant: 'danger',
      icon: 'trash',
    });

    if (confirmed) {
      const updated = goals.filter((g) => g.id !== id);
      persistGoalsLocal(updated);

      try {
        const res = await fetch(`/api/goals/${id}`, { method: 'DELETE' });
        if (res.ok) {
          toast.success('Meta removida e sincronizada com sucesso!');
        }
      } catch {}

      loadData(true);
    }
  };

  const handleSaveGoal = async () => {
    if (!newSeller.trim()) {
      return toast.error('Informe o vendedor ou equipe responsável');
    }
    const targetNum = parseSmartNumber(newTarget);
    const currentNum = parseSmartNumber(newCurrent);

    if (targetNum <= 0) {
      return toast.error('Informe um valor de meta válido');
    }

    const isCurr = newType.includes('Faturamento') || newType.includes('R$');

    if (editingGoal) {
      // Diferenças para o log de auditoria
      const changes: EditChange[] = [];
      if (editingGoal.seller.trim() !== newSeller.trim()) {
        changes.push({
          field: 'seller',
          label: 'Vendedor / Equipe',
          oldValue: editingGoal.seller,
          newValue: newSeller.trim(),
        });
      }
      if (editingGoal.category !== newCategory) {
        changes.push({
          field: 'category',
          label: 'Categoria',
          oldValue: editingGoal.category,
          newValue: newCategory,
        });
      }
      if (editingGoal.target !== targetNum) {
        changes.push({
          field: 'target',
          label: 'Valor da Meta',
          oldValue: editingGoal.isCurrency ? formatCurrency(editingGoal.target) : String(editingGoal.target),
          newValue: isCurr ? formatCurrency(targetNum) : String(targetNum),
        });
      }
      if (editingGoal.current !== currentNum) {
        changes.push({
          field: 'current',
          label: 'Realizado Atual',
          oldValue: editingGoal.isCurrency ? formatCurrency(editingGoal.current) : String(editingGoal.current),
          newValue: isCurr ? formatCurrency(currentNum) : String(currentNum),
        });
      }
      if ((editingGoal.month || 1) !== newMonth) {
        const oldM = MONTHS.find((m) => m.value === (editingGoal.month || 1))?.name || String(editingGoal.month);
        const newM = MONTHS.find((m) => m.value === newMonth)?.name || String(newMonth);
        changes.push({
          field: 'month',
          label: 'Mês da Meta',
          oldValue: oldM,
          newValue: newM,
        });
      }
      if ((editingGoal.year || currentYear) !== newYear) {
        changes.push({
          field: 'year',
          label: 'Ano da Meta',
          oldValue: String(editingGoal.year || currentYear),
          newValue: String(newYear),
        });
      }

      const newLog: EditLog | null =
        changes.length > 0
          ? {
              id: `log-goal-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              timestamp: Date.now(),
              dateStr: new Date().toLocaleString('pt-BR'),
              userName: user?.name || 'Administrador',
              userRole: 'Administrador',
              itemType: 'meta',
              targetTitle: `Meta de ${newSeller.trim()} (${newCategory})`,
              changes,
            }
          : null;

      const payload: GoalItem = {
        ...editingGoal,
        seller: newSeller.trim(),
        type: `${newCategory} - ${newType}`,
        category: newCategory,
        target: targetNum,
        current: currentNum,
        isCurrency: isCurr,
        month: newMonth,
        year: newYear,
        editLogs: newLog ? [newLog, ...(editingGoal.editLogs || [])] : editingGoal.editLogs,
      };

      const updated = goals.map((g) => (g.id === editingGoal.id ? payload : g));
      persistGoalsLocal(updated);

      try {
        await fetch(`/api/goals/${editingGoal.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } catch {}

      toast.success(
        `Meta de "${payload.seller}" atualizada com sucesso!${
          changes.length > 0 ? ` (${changes.length} modificações registradas no log)` : ''
        }`
      );
      loadData(true);
    } else {
      // Nova meta (com suporte a replicar para todos os 12 meses do ano)
      if (replicateToAllMonths) {
        const newGoalsList: GoalItem[] = [];
        for (let m = 1; m <= 12; m++) {
          newGoalsList.push({
            id: `goal-${Date.now()}-m${m}`,
            seller: newSeller.trim(),
            type: `${newCategory} - ${newType}`,
            category: newCategory,
            target: targetNum,
            current: m === newMonth ? currentNum : 0,
            isCurrency: isCurr,
            salesCount: 0,
            month: m,
            year: newYear,
            editLogs: [],
          });
        }
        persistGoalsLocal([...newGoalsList, ...goals]);
        for (const g of newGoalsList) {
          try {
            await fetch('/api/goals', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(g),
            });
          } catch {}
        }
        toast.success(
          `Metas anuais criadas com sucesso para todos os 12 meses de ${newYear} para "${newSeller}"!`
        );
      } else {
        const nova: GoalItem = {
          id: `goal-${Date.now()}`,
          seller: newSeller.trim(),
          type: `${newCategory} - ${newType}`,
          category: newCategory,
          target: targetNum,
          current: currentNum,
          isCurrency: isCurr,
          salesCount: 0,
          month: newMonth,
          year: newYear,
          editLogs: [],
        };
        persistGoalsLocal([nova, ...goals]);
        try {
          await fetch('/api/goals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nova),
          });
        } catch {}
        toast.success(
          `Nova meta criada para "${nova.seller}" no mês de ${
            MONTHS.find((m) => m.value === newMonth)?.name || newMonth
          }/${newYear}!`
        );
      }
      loadData(true);
    }

    setIsGoalModalOpen(false);
    setEditingGoal(null);
  };

  // Exportar histórico de vendas para CSV
  const handleExportSalesCSV = () => {
    try {
      const headers = ['Data', 'Vendedor', 'Cliente', 'Telefone', 'Categoria', 'Valor (R$)', `Comissao (${commissionRate}%) (R$)`, 'Observacoes'];
      const rows = filteredSales.map((s) => [
        `"${new Date(s.createdAt).toLocaleString('pt-BR')}"`,
        `"${s.sellerName.replace(/"/g, '""')}"`,
        `"${s.clientName.replace(/"/g, '""')}"`,
        `"${s.clientPhone}"`,
        `"${s.category.replace(/"/g, '""')}"`,
        `"${s.value.toFixed(2).replace('.', ',')}"`,
        `"${(s.value * (commissionRate / 100)).toFixed(2).replace('.', ',')}"`,
        `"${(s.notes || '').replace(/"/g, '""')}"`,
      ]);

      const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `relatorio_vendas_metas_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Planilha de vendas exportada com sucesso!');
    } catch {
      toast.error('Erro ao exportar planilha.');
    }
  };

  return (
    <div className="space-y-6 pb-10">
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* BARRA SUPERIOR: CONTROLE DE PERFIL & PERMISSÕES                    */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold">Gestão de Metas & Registro de Vendas</h1>
            <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-semibold">
              <Printer className="w-3 h-3 mr-1" /> Gráfica Integrada
            </Badge>

            {/* Indicador de Tempo Real Sincronizado */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-semibold shadow-xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Tempo Real Sincronizado</span>
            </div>
          </div>
          <p className="text-muted-foreground text-sm mt-0.5">
            Lançamento de pedidos pelos funcionários, acompanhamento de metas individuais e auditoria para administradores.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Botão de Sincronização Manual */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              loadData(false);
              toast.success('Metas e vendas sincronizadas com o servidor!');
            }}
            disabled={isSyncing}
            className="h-9 px-3 text-xs border-border gap-1.5 hover:bg-accent text-foreground"
            title="Sincronizar em tempo real com o servidor"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-primary' : 'text-muted-foreground'}`} />
            <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar'}</span>
          </Button>

          {/* Seletor de Modo de Visualização (ADM vs Funcionário) */}
          {isActualAdmin ? (
            <div className="flex items-center gap-2 bg-accent/40 p-1.5 rounded-xl border border-border">
              <button
                onClick={() => setViewRole('admin')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  isAdminView
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Visão Administrador (ADM)</span>
              </button>

              <button
                onClick={() => setViewRole('employee')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  !isAdminView
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Visão Funcionário (Vendedor)</span>
              </button>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold shadow-xs">
              <User className="w-3.5 h-3.5" />
              <span>Visão do Funcionário ({user?.name || 'Acesso Comum'})</span>
            </div>
          )}
        </div>
      </div>

      {/* Banner Informativo de Papel */}
      {isAdminView ? (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>
              <strong>Painel Administrativo Ativo:</strong> Você pode acompanhar o progresso de cada funcionário, calibrar metas e auditar todos os pedidos lançados.
            </span>
          </div>
          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px] w-fit">
            Acesso Total (ADM)
          </Badge>
        </div>
      ) : (
        <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/25 text-blue-400 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-4 h-4 shrink-0 text-blue-400" />
            <span>
              <strong>Espaço do Colaborador:</strong> Lançou um pedido ou fechou um orçamento? Clique em <strong>"+ Registrar Venda do Funcionário"</strong> para somar diretamente à sua meta.
            </span>
          </div>
          <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/40 text-[10px] w-fit">
            Acesso Comum
          </Badge>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* AÇÕES RÁPIDAS NO TOPO: LANÇAR VENDA & CRIAR META                   */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card/60 p-3.5 rounded-2xl border border-border">
        {/* Filtro por Colaborador (Exclusivo ADM) */}
        {isAdminView ? (
          <div className="flex items-center gap-2 flex-1">
            <Users className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-xs font-bold text-foreground shrink-0">Filtrar Vendedor:</span>
            <select
              value={selectedSellerFilter}
              onChange={(e) => setSelectedSellerFilter(e.target.value)}
              className="h-8 bg-background border border-border rounded-lg px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary max-w-xs"
            >
              <option value="all">Equipe Completa (Todos os Funcionários)</option>
              {distinctSellers.map((seller) => (
                <option key={seller} value={seller}>
                  {seller}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-1">
            <User className="w-4 h-4 text-blue-400 shrink-0" />
            <span className="text-xs font-bold text-foreground">
              Metas e Vendas de: <span className="text-primary font-black">{user?.name || 'Seu Usuário'}</span>
            </span>
          </div>
        )}

        {/* Botões de Ação */}
        <div className="flex items-center gap-2">
          {/* Botão Principal: REGISTRAR VENDA (Acessível a Funcionários e ADM) */}
          <Button
            onClick={() => handleOpenSaleModal()}
            className="h-9 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs gap-1.5 shadow-md hover:shadow-emerald-600/20"
          >
            <Sparkles className="w-4 h-4" />
            + Registrar Venda do Funcionário
          </Button>

          {/* Botão de Nova Meta */}
          <Button
            onClick={() => handleOpenNewGoal()}
            variant="outline"
            className="h-9 border-border text-foreground hover:bg-accent text-xs font-bold gap-1.5"
          >
            <Plus className="w-4 h-4 text-primary" />
            + Nova Meta
          </Button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SELETOR ANUAL & MENSAL COMPLETO (TODOS OS 12 MESES DO ANO)         */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="bg-card/70 border border-border rounded-2xl p-3 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-2.5 px-1">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary shrink-0" />
            <span className="text-xs font-bold text-foreground">Período Selecionado:</span>
            <Badge variant="outline" className="text-xs font-bold bg-primary/10 text-primary border-primary/20">
              {selectedMonthFilter === 'all'
                ? `Ano Inteiro de ${selectedYearFilter}`
                : `${MONTHS.find((m) => m.value === selectedMonthFilter)?.name} de ${selectedYearFilter}`}
            </Badge>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
            {/* Botão de Personalização de Comissão (Padrão 1%, customizável) */}
            <button
              onClick={() => {
                setTempCommissionRate(commissionRate.toString());
                setIsCommissionModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 text-xs font-bold transition-all shadow-xs cursor-pointer group"
              title="Clique para personalizar a taxa de comissão de vendas"
            >
              <Percent className="w-3.5 h-3.5 text-emerald-400 group-hover:rotate-12 transition-transform" />
              <span>Comissão: <strong className="text-emerald-300 font-mono">{commissionRate}%</strong></span>
              <span className="text-[10px] bg-emerald-500/20 px-1.5 py-0.5 rounded text-emerald-300 font-semibold ml-0.5">
                Personalizar
              </span>
            </button>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-muted-foreground">Ano:</span>
              <select
                value={selectedYearFilter}
                onChange={(e) => setSelectedYearFilter(Number(e.target.value))}
                className="h-8 bg-background border border-border rounded-lg px-2.5 text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {[2024, 2025, 2026, 2027, 2028].map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 12 Meses Pill Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedMonthFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              selectedMonthFilter === 'all'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-accent/40 text-muted-foreground hover:text-foreground hover:bg-accent'
            }`}
          >
            Todos os Meses ({selectedYearFilter})
          </button>

          {MONTHS.map((m) => {
            const isSelected = selectedMonthFilter === m.value;
            const isCurrent = m.value === currentMonth && selectedYearFilter === currentYear;

            return (
              <button
                key={m.value}
                onClick={() => setSelectedMonthFilter(m.value)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-xs font-bold'
                    : 'bg-accent/30 text-muted-foreground hover:text-foreground hover:bg-accent'
                }`}
              >
                <span>{m.name}</span>
                {isCurrent && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-emerald-400'}`}
                    title="Mês Atual"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 5 CARDS DE INDICADORES CONSOLIDADOS (INCLUINDO COMISSÃO)           */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Meta de Faturamento */}
        <Card className="border-border/60 bg-card/60 backdrop-blur-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">
                {isAdminView ? 'Meta de Faturamento (Equipe)' : 'Sua Meta do Mês'}
              </p>
              <h4 className="text-2xl font-black mt-1 text-foreground">{formatCurrency(displayTarget)}</h4>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {isAdminView
                  ? `${currencyGoals.length} fluxos comerciais ativos`
                  : `${relevantGoals.length} meta(s) atribuída(s)`}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Target className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Realizado no Mês */}
        <Card className="border-border/60 bg-card/60 backdrop-blur-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">
                {isAdminView ? 'Realizado no Mês (Equipe)' : 'Seu Realizado no Mês'}
              </p>
              <h4 className="text-2xl font-black mt-1 text-emerald-400">{formatCurrency(displayCurrent)}</h4>
              <p className="text-[11px] text-emerald-400/80 mt-0.5 font-semibold">
                ✓ {relevantSalesCount} pedidos {isAdminView ? 'lançados pela equipe' : 'registrados por você'}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Atingimento Médio */}
        <Card className="border-border/60 bg-card/60 backdrop-blur-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">
                {isAdminView ? 'Atingimento da Meta' : 'Seu Atingimento'}
              </p>
              <h4 className="text-2xl font-black mt-1 text-amber-400">{displayPercent}%</h4>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Faltam {formatCurrency(Math.max(0, displayTarget - displayCurrent))}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
              <Award className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Ticket Médio por Venda */}
        <Card className="border-border/60 bg-card/60 backdrop-blur-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">
                {isAdminView ? 'Ticket Médio da Equipe' : 'Seu Ticket Médio'}
              </p>
              <h4 className="text-2xl font-black mt-1 text-foreground">{formatCurrency(averageTicket)}</h4>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Média por pedido fechado
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400">
              <DollarSign className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 5: Comissão Comercial (Padrão 1%, customizável) */}
        <Card className="border-border/60 bg-card/60 backdrop-blur-xs relative group overflow-hidden border-emerald-500/20 hover:border-emerald-500/40 transition-all">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="text-xs text-muted-foreground font-medium">
                  {isAdminView ? 'Comissão da Equipe' : 'Sua Comissão'}
                </p>
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[9px] font-bold px-1.5 py-0">
                  {commissionRate}%
                </Badge>
              </div>
              <h4 className="text-2xl font-black mt-1 text-emerald-400 font-mono">
                {formatCurrency(displayCurrent * (commissionRate / 100))}
              </h4>
              <button
                onClick={() => {
                  setTempCommissionRate(commissionRate.toString());
                  setIsCommissionModalOpen(true);
                }}
                className="text-[11px] text-emerald-400/80 hover:text-emerald-300 hover:underline mt-0.5 flex items-center gap-1 font-semibold cursor-pointer"
                title="Clique para alterar a porcentagem de comissão"
              >
                Personalizar taxa &gt;
              </button>
            </div>
            <button
              onClick={() => {
                setTempCommissionRate(commissionRate.toString());
                setIsCommissionModalOpen(true);
              }}
              className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/30 hover:scale-105 transition-all cursor-pointer shadow-xs"
              title="Clique para personalizar a comissão"
            >
              <Percent className="w-5 h-5" />
            </button>
          </CardContent>
        </Card>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ABAS DO SISTEMA: VISÃO GERAL | VENDEDORES | HISTÓRICO DE VENDAS     */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex items-center gap-2 border-b border-border pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'overview'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
          }`}
        >
          <Target className="w-3.5 h-3.5" />
          <span>
            {isAdminView
              ? `Metas por Categoria & Colaborador (${filteredGoals.length})`
              : `Minhas Metas (${filteredGoals.length})`}
          </span>
        </button>

        {isAdminView && (
          <button
            onClick={() => setActiveTab('sellers')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'sellers'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Ranking & Desempenho dos Funcionários</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('sales')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'sales'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>
            {isAdminView
              ? `Histórico de Todas as Vendas (${filteredSales.length})`
              : `Minhas Vendas Lançadas (${filteredSales.length})`}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'audit'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>
            Logs de Auditoria & Alterações ({allAuditLogs.length})
          </span>
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ABA 1: CARDS DE METAS POR CATEGORIA E COLABORADOR                   */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'overview' && (
        filteredGoals.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-border rounded-2xl bg-card/40 p-8 space-y-3">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <Target className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-foreground">Nenhuma meta comercial cadastrada ainda</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Defina metas individuais personalizadas para você ou para a equipe comercial para acompanhar o progresso das vendas em tempo real.
            </p>
            <div className="pt-2 flex justify-center gap-2">
              <Button
                onClick={() => handleOpenNewGoal()}
                className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold gap-1.5"
              >
                <Plus className="w-4 h-4" />
                + Cadastrar Nova Meta de Vendas
              </Button>
              <Button
                onClick={() => handleOpenSaleModal()}
                variant="outline"
                className="border-border text-foreground text-xs font-bold gap-1.5 hover:bg-accent"
              >
                <Sparkles className="w-4 h-4 text-emerald-400" />
                + Lançar Venda Direta
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredGoals.map((goal) => {
              const percent = goal.target > 0 ? Math.min(100, Math.round((goal.current / goal.target) * 100)) : 0;
              const isHit = goal.current >= goal.target;

              return (
                <Card
                  key={goal.id}
                  className={`transition-all hover:border-primary/50 bg-card/70 backdrop-blur-xs relative overflow-hidden ${
                    isHit ? 'border-emerald-500/40 shadow-sm shadow-emerald-500/5' : 'border-border/60'
                  }`}
                >
                  {isHit && (
                    <div className="absolute top-0 right-0 bg-emerald-500 text-black text-[9px] font-black px-2 py-0.5 rounded-bl-md uppercase tracking-wider">
                      🏆 Meta Batida!
                    </div>
                  )}

                  <CardContent className="p-5">
                    <div className="flex justify-between items-start mb-3">
                      <div className="pr-4">
                        <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                          <Badge variant="outline" className="text-[10px] bg-accent/60 border-border font-medium">
                            {goal.category || 'Gráfica'}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20 font-bold">
                            {MONTHS.find((m) => m.value === (goal.month || 10))?.name || 'Mês'}/{goal.year || currentYear}
                          </Badge>
                          {goal.editLogs && goal.editLogs.length > 0 && (
                            <button
                              onClick={() =>
                                setAuditLogModalData({
                                  title: 'Histórico de Alterações da Meta',
                                  subtitle: `${goal.seller} • ${goal.category} (${MONTHS.find((m) => m.value === (goal.month || 10))?.name}/${goal.year || currentYear})`,
                                  logs: goal.editLogs || [],
                                })
                              }
                              className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded-md hover:bg-amber-500/20 flex items-center gap-1 font-semibold cursor-pointer"
                              title="Clique para ver o log de quem editou e o que mudou"
                            >
                              <History className="w-2.5 h-2.5" />
                              Editada ({goal.editLogs.length})
                            </button>
                          )}
                        </div>
                        <h4 className="font-bold text-foreground text-base leading-snug">{goal.seller}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{goal.type}</p>
                      </div>

                      <div className="flex flex-col items-end shrink-0">
                        <span
                          className={`font-black text-sm ${
                            isHit ? 'text-emerald-400' : percent >= 70 ? 'text-primary' : 'text-amber-400'
                          }`}
                        >
                          {percent}%
                        </span>

                        {/* Botões do ADM */}
                        {isAdminView && (
                          <div className="flex items-center gap-1 mt-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-primary"
                              onClick={() => handleOpenEditGoal(goal)}
                              title="Editar Meta (ADM)"
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-destructive"
                              onClick={() => handleDeleteGoal(goal.id)}
                              title="Remover Meta (ADM)"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Detalhe de Valores */}
                    <div className="space-y-1 mb-3 pt-2.5 border-t border-border/50">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">
                          Realizado:{' '}
                          <strong className="text-emerald-400 font-bold">
                            {goal.isCurrency ? formatCurrency(goal.current) : goal.current}
                          </strong>
                        </span>
                        <span className="text-muted-foreground">
                          Meta:{' '}
                          <strong className="text-foreground font-bold">
                            {goal.isCurrency ? formatCurrency(goal.target) : goal.target}
                          </strong>
                        </span>
                      </div>

                      {goal.isCurrency && (
                        <div className="flex justify-between text-xs pt-0.5">
                          <span className="text-muted-foreground">Comissão ({commissionRate}%):</span>
                          <strong className="text-emerald-400 font-bold font-mono">
                            {formatCurrency(goal.current * (commissionRate / 100))}
                          </strong>
                        </div>
                      )}

                      {goal.salesCount > 0 && (
                        <p className="text-[10px] text-muted-foreground flex items-center justify-between">
                          <span>{goal.salesCount} vendas fechadas</span>
                          <span>Falta: {formatCurrency(Math.max(0, goal.target - goal.current))}</span>
                        </p>
                      )}
                    </div>

                    {/* Barra de Progresso */}
                    <div className="w-full h-2.5 bg-accent/80 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isHit ? 'bg-emerald-500' : percent >= 70 ? 'bg-primary' : 'bg-amber-500'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>

                    {/* Botão de Lançar Venda Direto neste Vendedor */}
                    <div className="mt-3.5 pt-2 border-t border-border/40 flex justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenSaleModal(goal.seller)}
                        className="h-7 text-[11px] font-bold border-border hover:bg-emerald-600/10 hover:text-emerald-400 gap-1"
                      >
                        <Plus className="w-3 h-3 text-emerald-400" />
                        {isAdminView ? `Lançar Venda p/ ${goal.seller.split(' ')[0]}` : '+ Lançar Venda nesta Meta'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ABA 2: RANKING & DESEMPENHO INDIVIDUAL DOS FUNCIONÁRIOS (ADM VIEW)  */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'sellers' && isAdminView && (
        <Card className="border-border/60 bg-card/80">
          <CardHeader className="p-4 sm:p-5 border-b border-border">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Painel de Desempenho e Metas dos Colaboradores
            </CardTitle>
            <CardDescription className="text-xs">
              Visão consolidada por funcionário para os gestores acompanharem quem já bateu meta e quem precisa de suporte.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-accent/40 text-muted-foreground uppercase text-[10px] border-b border-border">
                  <tr>
                    <th className="px-4 py-3">Funcionário / Vendedor</th>
                    <th className="px-4 py-3">Especialidade / Fluxo</th>
                    <th className="px-4 py-3 text-right">Meta (R$)</th>
                    <th className="px-4 py-3 text-right">Vendido (R$)</th>
                    <th className="px-4 py-3 text-right">Comissão ({commissionRate}%)</th>
                    <th className="px-4 py-3 text-center">% Atingido</th>
                    <th className="px-4 py-3 text-center">Pedidos</th>
                    <th className="px-4 py-3 text-right">Ticket Médio</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {distinctSellers.map((sellerName) => {
                    const sellerGoals = currencyGoals.filter((g) => g.seller === sellerName);
                    const sellerSales = sales.filter((s) => s.sellerName === sellerName);
                    const target = sellerGoals.reduce((acc, g) => acc + g.target, 0);
                    const current = sellerGoals.reduce((acc, g) => acc + g.current, 0);
                    const percent = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
                    const salesCount = sellerSales.length;
                    const ticket = salesCount > 0 ? current / salesCount : 0;
                    const isHit = target > 0 && current >= target;

                    return (
                      <tr key={sellerName} className="hover:bg-accent/20 transition-colors">
                        <td className="px-4 py-3.5 font-bold text-foreground">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-[11px] uppercase">
                              {sellerName.substring(0, 2)}
                            </div>
                            <span>{sellerName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-muted-foreground">
                          {sellerGoals.map((g) => g.category).join(', ') || 'Comercial'}
                        </td>
                        <td className="px-4 py-3.5 text-right font-medium text-foreground">{formatCurrency(target)}</td>
                        <td className="px-4 py-3.5 text-right font-bold text-emerald-400">{formatCurrency(current)}</td>
                        <td className="px-4 py-3.5 text-right font-bold text-emerald-300 font-mono">
                          {formatCurrency(current * (commissionRate / 100))}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span
                            className={`font-black ${
                              isHit ? 'text-emerald-400' : percent >= 70 ? 'text-primary' : 'text-amber-400'
                            }`}
                          >
                            {percent}%
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center font-semibold text-foreground">{salesCount}</td>
                        <td className="px-4 py-3.5 text-right text-muted-foreground">{formatCurrency(ticket)}</td>
                        <td className="px-4 py-3.5 text-center">
                          {target === 0 ? (
                            <Badge variant="outline" className="text-muted-foreground border-border text-[10px]">
                              Sem Meta
                            </Badge>
                          ) : isHit ? (
                            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px] font-bold">
                              🏆 Meta Batida
                            </Badge>
                          ) : percent >= 70 ? (
                            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-[10px]">
                              🔥 No Ritmo
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px]">
                              ⚠️ Atenção
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedSellerFilter(sellerName);
                                setActiveTab('sales');
                              }}
                              className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                              title={`Ver histórico de vendas de ${sellerName}`}
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" />
                              Vendas
                            </Button>

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenSaleModal(sellerName)}
                              className="h-7 px-2 text-[11px] text-emerald-400 hover:bg-emerald-500/10"
                              title={`Lançar venda para ${sellerName}`}
                            >
                              <Plus className="w-3.5 h-3.5 mr-0.5" />
                              Venda
                            </Button>

                            {/* Ações de Gestão de Metas Exclusivas do Administrador */}
                            {isAdminView && (
                              <>
                                {sellerGoals.length > 0 ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleOpenEditGoal(sellerGoals[0])}
                                    className="h-7 px-2 text-[11px] text-primary border-primary/30 hover:bg-primary/10 gap-1 font-semibold"
                                    title={`Editar meta comercial de ${sellerName}`}
                                  >
                                    <Edit className="w-3 h-3" />
                                    Editar
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleOpenNewGoal(sellerName)}
                                    className="h-7 px-2 text-[11px] text-amber-400 border-amber-400/30 hover:bg-amber-400/10 gap-1 font-semibold"
                                    title={`Definir meta para ${sellerName}`}
                                  >
                                    <Plus className="w-3 h-3" />
                                    Criar Meta
                                  </Button>
                                )}

                                {sellerGoals.length > 0 && (
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => handleDeleteGoal(sellerGoals[0].id)}
                                    className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                    title={`Excluir meta de ${sellerName}`}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ABA 3: HISTÓRICO DE VENDAS LANÇADAS (COM TELEFONE, CLIENTE, OBS)    */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'sales' && (
        <Card className="border-border/60 bg-card/90 shadow-md">
          <CardHeader className="p-4 sm:p-5 border-b border-border flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-emerald-400" />
                Histórico de Vendas Lançadas pelos Funcionários
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">
                  {filteredSales.length} pedidos
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                Controle detalhado de cada venda com valor, cliente atendido, telefone de contato e observações técnicas.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              {filteredSales.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearAllSales}
                  className="h-8 text-xs gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Limpar Vendas
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={handleExportSalesCSV}
                className="h-8 text-xs gap-1.5 border-border"
              >
                <Download className="w-3.5 h-3.5 text-primary" />
                Exportar Planilha (CSV)
              </Button>

              <Button
                size="sm"
                onClick={() => handleOpenSaleModal()}
                className="h-8 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-1.5 shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5" />
                + Lançar Venda
              </Button>
            </div>
          </CardHeader>

          {/* Busca e Filtro de Vendas */}
          <div className="px-4 py-3 border-b border-border/50 bg-accent/20 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative w-full md:w-72">
              <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Buscar cliente, vendedor, telefone ou produto..."
                value={salesSearchQuery}
                onChange={(e) => setSalesSearchQuery(e.target.value)}
                className="h-8 pl-8 text-xs bg-background/80 border-border"
              />
            </div>

            <div className="text-xs text-muted-foreground flex items-center gap-3 flex-wrap">
              <div>
                Total somado nas vendas exibidas:{' '}
                <strong className="text-emerald-400 font-bold font-mono">
                  {formatCurrency(filteredSales.reduce((acc, s) => acc + s.value, 0))}
                </strong>
              </div>
              <span className="hidden sm:inline text-border">•</span>
              <div>
                Comissão Total ({commissionRate}%):{' '}
                <strong className="text-emerald-300 font-bold font-mono">
                  {formatCurrency(filteredSales.reduce((acc, s) => acc + s.value, 0) * (commissionRate / 100))}
                </strong>
              </div>
            </div>
          </div>

          <CardContent className="p-4">
            {filteredSales.length === 0 ? (
              <div className="py-14 text-center text-muted-foreground space-y-3">
                <ShoppingBag className="w-10 h-10 mx-auto text-muted-foreground/60" />
                <div>
                  <p className="text-sm font-bold text-foreground">Nenhuma venda registrada ainda no sistema.</p>
                  <p className="text-xs text-muted-foreground mt-0.5 max-w-sm mx-auto">
                    Ao registrar uma venda, o valor será contabilizado na meta do colaborador e aparecerá aqui para auditoria.
                  </p>
                </div>
                <div>
                  <Button
                    size="sm"
                    onClick={() => handleOpenSaleModal()}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs gap-1.5 shadow-sm"
                  >
                    <Sparkles className="w-4 h-4" />
                    + Lançar Primeira Venda
                  </Button>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {filteredSales.map((sale) => (
                  <div
                    key={sale.id}
                    className="py-3.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 hover:bg-accent/10 px-2 rounded-lg transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Nome do Cliente */}
                        <span className="font-bold text-sm text-foreground">{sale.clientName}</span>

                        {/* Telefone Formatado com link rápido WhatsApp */}
                        <a
                          href={`https://wa.me/55${sale.clientPhone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-mono text-emerald-400 hover:underline flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20"
                          title="Chamar cliente no WhatsApp"
                        >
                          <Phone className="w-3 h-3" />
                          {sale.clientPhone}
                        </a>

                        {/* Categoria */}
                        <Badge variant="outline" className="text-[10px] bg-accent/60 border-border">
                          {sale.category}
                        </Badge>

                        {/* Vendedor */}
                        <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-semibold">
                          👤 {sale.sellerName}
                        </Badge>

                        {/* Comissão da Venda */}
                        <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px] font-bold font-mono">
                          Comissão ({commissionRate}%): {formatCurrency(sale.value * (commissionRate / 100))}
                        </Badge>

                        {/* Mês e Ano de Competência */}
                        <Badge variant="outline" className="text-[10px] bg-accent/60 border-border text-muted-foreground">
                          {MONTHS.find((m) => m.value === (sale.month || new Date(sale.createdAt).getMonth() + 1))?.name || 'Mês'}/
                          {sale.year || new Date(sale.createdAt).getFullYear()}
                        </Badge>

                        {/* Data e Hora */}
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(sale.createdAt).toLocaleDateString('pt-BR')} às{' '}
                          {new Date(sale.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {/* Observação / Detalhes */}
                      {sale.notes && (
                        <p className="text-xs text-muted-foreground italic mt-1.5 bg-accent/30 p-2 rounded-lg border border-border/40">
                          "{sale.notes}"
                        </p>
                      )}
                    </div>

                    {/* Valor e Ações */}
                    <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
                      <div className="text-right">
                        <span className="text-base font-extrabold text-emerald-400 font-mono block">
                          {formatCurrency(sale.value)}
                        </span>
                        <span className="text-[10px] font-semibold text-emerald-300 font-mono block">
                          {formatCurrency(sale.value * (commissionRate / 100))} ({commissionRate}%)
                        </span>
                        {sale.editLogs && sale.editLogs.length > 0 && (
                          <button
                            onClick={() =>
                              setAuditLogModalData({
                                title: 'Histórico de Alterações da Venda',
                                subtitle: `Cliente: ${sale.clientName} • Vendedor: ${sale.sellerName}`,
                                logs: sale.editLogs || [],
                              })
                            }
                            className="text-[10px] text-amber-400 hover:underline flex items-center gap-1 justify-end font-semibold cursor-pointer mt-0.5"
                            title="Clique para ver quem editou e o que mudou"
                          >
                            <History className="w-2.5 h-2.5" />
                            Editado ({sale.editLogs.length})
                          </button>
                        )}
                      </div>

                      {/* Botão de Editar Venda */}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleOpenEditSale(sale)}
                        className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10"
                        title="Editar valores e dados desta venda"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Button>

                      {/* Botão de Estorno (Apenas ADM) */}
                      {isAdminView && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDeleteSale(sale)}
                          className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          title="Estornar esta venda (ADM)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ABA 4: LOGS DE AUDITORIA & HISTÓRICO DE TODAS AS ALTERAÇÕES        */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'audit' && (
        <Card className="border-border/60 bg-card/90 shadow-md">
          <CardHeader className="p-4 sm:p-5 border-b border-border flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <History className="w-4 h-4 text-amber-400" />
                Logs de Auditoria & Modificações do Sistema
                <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px]">
                  {allAuditLogs.length} alterações registradas
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                Rastreamento completo e auditável de quem editou, data, hora e o que foi mudado (de X para Y).
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            {allAuditLogs.length === 0 ? (
              <div className="py-14 text-center text-muted-foreground space-y-2">
                <History className="w-10 h-10 mx-auto text-muted-foreground/60" />
                <p className="text-sm font-bold text-foreground">Nenhuma alteração registrada ainda.</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Sempre que um usuário ou administrador editar uma meta ou venda lançada, o histórico detalhado será arquivado automaticamente aqui com data, hora e valores comparados.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {allAuditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-4 rounded-xl border border-border/60 bg-accent/20 space-y-2.5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/40 pb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          className={`text-[10px] font-bold ${
                            log.itemType === 'meta'
                              ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                              : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          }`}
                        >
                          {log.itemType === 'meta' ? 'Meta Comercial' : 'Venda Lançada'}
                        </Badge>
                        <span className="font-bold text-sm text-foreground">{log.targetTitle}</span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-primary" />
                          <strong className="text-foreground">{log.userName}</strong>
                          {log.userRole && (
                            <span className="text-[10px] text-muted-foreground">({log.userRole})</span>
                          )}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 font-mono text-[11px]">
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          {log.dateStr}
                        </span>
                      </div>
                    </div>

                    {/* Lista de Modificações ("De X para Y") */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-1">
                      {log.changes.map((ch, idx) => (
                        <div
                          key={idx}
                          className="bg-background/80 border border-border/50 rounded-lg p-2.5 text-xs space-y-1"
                        >
                          <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                            {ch.label}
                          </span>
                          <div className="flex items-center gap-1.5 flex-wrap font-mono text-xs">
                            <span className="line-through text-destructive/80 bg-destructive/10 px-1.5 py-0.5 rounded text-[11px]">
                              {ch.oldValue || '(vazio)'}
                            </span>
                            <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                            <span className="font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded text-[11px]">
                              {ch.newValue || '(vazio)'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {log.notes && (
                      <p className="text-xs text-muted-foreground italic bg-accent/30 p-2 rounded-md">
                        Nota: {log.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODAL 1: REGISTRAR VENDA PELO FUNCIONÁRIO (COM TODOS OS CAMPOS)     */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {isSaleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-card w-full max-w-lg rounded-2xl border border-border shadow-2xl p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">Lançar Nova Venda / Pedido</h2>
                  <p className="text-xs text-muted-foreground">
                    Os valores serão somados automaticamente à meta do colaborador
                  </p>
                </div>
              </div>
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">
                Meta Ativa
              </Badge>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Vendedor / Funcionário Responsável */}
              <div>
                <label className="font-bold text-foreground block mb-1">Funcionário / Vendedor Responsável</label>
                <div className="space-y-1.5">
                  <select
                    className="w-full h-9 bg-background border border-border rounded-lg px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    value={distinctSellers.includes(saleSeller) ? saleSeller : (saleSeller ? '__custom__' : '')}
                    onChange={(e) => {
                      if (e.target.value === '__custom__') {
                        setSaleSeller('');
                      } else {
                        setSaleSeller(e.target.value);
                      }
                    }}
                  >
                    <option value="">-- Selecione o Vendedor ou digite abaixo --</option>
                    {distinctSellers.map((seller) => (
                      <option key={seller} value={seller}>
                        {seller}
                      </option>
                    ))}
                    <option value="__custom__">+ Outro Vendedor (Digitar nome)</option>
                  </select>
                  {(!distinctSellers.includes(saleSeller) || saleSeller === '') && (
                    <input
                      type="text"
                      placeholder="Ex: Everton Castelo"
                      value={saleSeller}
                      onChange={(e) => setSaleSeller(e.target.value)}
                      className="w-full h-9 bg-background border border-border rounded-lg px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  )}
                </div>
              </div>

              {/* Cliente */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-foreground">Para quem vendeu? (Cliente ou Empresa)</label>
                  {registeredCustomers.length > 0 && (
                    <span className="text-[10px] text-primary font-medium">Clientes cadastrados disponíveis</span>
                  )}
                </div>
                {registeredCustomers.length > 0 ? (
                  <div className="space-y-1.5">
                    <select
                      className="w-full h-9 bg-background border border-border rounded-lg px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      value={registeredCustomers.some((c) => c.name === saleClientName) ? saleClientName : (saleClientName ? '__custom__' : '')}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '__custom__') {
                          setSaleClientName('');
                        } else {
                          setSaleClientName(val);
                          const matched = registeredCustomers.find((c) => c.name === val);
                          if (matched && matched.phone) {
                            setSaleClientPhone(formatPhoneInput(matched.phone));
                          }
                        }
                      }}
                    >
                      <option value="">-- Selecione da Base de Clientes ou Digite Abaixo --</option>
                      {registeredCustomers.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name} {c.phone ? `(${c.phone})` : ''}
                        </option>
                      ))}
                      <option value="__custom__">+ Outro Cliente (Digitar nome)</option>
                    </select>
                    {(!registeredCustomers.some((c) => c.name === saleClientName) || saleClientName === '') && (
                      <input
                        type="text"
                        placeholder="Ex: Restaurante Sabor Regional ou Carlos Silva"
                        value={saleClientName}
                        onChange={(e) => setSaleClientName(e.target.value)}
                        className="w-full h-9 bg-background border border-border rounded-lg px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    )}
                  </div>
                ) : (
                  <input
                    type="text"
                    placeholder="Ex: Restaurante Sabor Regional ou Carlos Silva"
                    value={saleClientName}
                    onChange={(e) => setSaleClientName(e.target.value)}
                    className="w-full h-9 bg-background border border-border rounded-lg px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                )}
              </div>

              {/* Telefone do Cliente com Máscara Brasileira */}
              <div>
                <label className="font-bold text-foreground block mb-1">Telefone com DDD do Cliente (WhatsApp)</label>
                <input
                  type="text"
                  placeholder="Ex: (92) 99111-2233"
                  value={saleClientPhone}
                  onChange={(e) => setSaleClientPhone(formatPhoneInput(e.target.value))}
                  className="w-full h-9 bg-background border border-border rounded-lg px-3 font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <span className="text-[10px] text-muted-foreground mt-0.5 block">
                  Informe com o código de área (DDD) para integração direta com WhatsApp.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Valor da Venda */}
                <div>
                  <label className="font-bold text-foreground block mb-1">Quanto foi vendido? (Valor R$)</label>
                  <input
                    type="text"
                    placeholder="Ex: 1500,00 ou 350"
                    value={saleValue}
                    onChange={(e) => setSaleValue(e.target.value)}
                    className="w-full h-9 bg-background border border-border rounded-lg px-3 font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  {saleValue && (
                    <p className="text-[10px] text-emerald-400 mt-1 font-bold">
                      Formatado: {formatCurrency(parseSmartNumber(saleValue))}
                    </p>
                  )}
                </div>

                {/* Categoria / Linha de Produto */}
                <div>
                  <label className="font-bold text-foreground block mb-1">Produto / Categoria</label>
                  {registeredProducts.length > 0 ? (
                    <div className="space-y-1">
                      <select
                        value={saleCategory}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSaleCategory(val);
                          const matched = registeredProducts.find((p) => p.name === val || p.category === val);
                          if (matched && matched.price && matched.price > 0 && !saleValue) {
                            setSaleValue(matched.price.toString());
                          }
                        }}
                        className="w-full h-9 bg-background border border-border rounded-lg px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="Vendas & Serviços">Vendas & Serviços (Geral)</option>
                        {registeredProducts.map((p) => (
                          <option key={p.id} value={p.name}>
                            {p.name} {p.price ? `- ${formatCurrency(p.price)}` : ''}
                          </option>
                        ))}
                        <option value="Comunicação Visual">Comunicação Visual</option>
                        <option value="Papelaria & Gráfica">Papelaria & Gráfica</option>
                        <option value="Outros">Outros</option>
                      </select>
                    </div>
                  ) : (
                    <input
                      type="text"
                      placeholder="Ex: Comunicação Visual ou Fachada"
                      value={saleCategory}
                      onChange={(e) => setSaleCategory(e.target.value)}
                      className="w-full h-9 bg-background border border-border rounded-lg px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  )}
                </div>
              </div>

              {/* Observação */}
              <div>
                <label className="font-bold text-foreground block mb-1">Observação / Detalhes da Venda</label>
                <textarea
                  rows={2}
                  placeholder="Ex: Sinal de 50% pago no Pix, restante na entrega."
                  value={saleNotes}
                  onChange={(e) => setSaleNotes(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg p-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
              <Button variant="outline" size="sm" onClick={() => setIsSaleModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleSaveSale}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold gap-1.5 shadow-sm"
              >
                <CheckCircle2 className="w-4 h-4" />
                Confirmar e Somar à Meta
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODAL 2: DEFINIÇÃO DE METAS PELO ADMINISTRADOR                     */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {isGoalModalOpen && isAdminView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  {editingGoal ? 'Editar Meta Comercial' : 'Nova Meta da Gráfica'}
                </h2>
                <p className="text-xs text-muted-foreground">Defina metas factíveis alinhadas aos fluxos da gráfica</p>
              </div>
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40 text-[10px]">
                Admin
              </Badge>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-foreground">Colaborador / Vendedor / Equipe</label>
                  <span className="text-[10px] text-muted-foreground">Selecione ou digite</span>
                </div>
                <div className="space-y-1.5">
                  <select
                    className="w-full h-9 bg-background border border-border rounded-lg px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    value={distinctSellers.includes(newSeller) ? newSeller : (newSeller ? '__custom__' : '')}
                    onChange={(e) => {
                      if (e.target.value === '__custom__') {
                        setNewSeller('');
                      } else {
                        setNewSeller(e.target.value);
                      }
                    }}
                  >
                    <option value="">-- Selecione um Colaborador da Equipe --</option>
                    {distinctSellers.map((seller) => (
                      <option key={seller} value={seller}>
                        {seller}
                      </option>
                    ))}
                    <option value="__custom__">+ Outro colaborador / equipe externa</option>
                  </select>
                  {(!distinctSellers.includes(newSeller) || newSeller === '') && (
                    <input
                      type="text"
                      className="w-full h-9 bg-background border border-border rounded-lg px-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="Ou digite o nome completo do vendedor/equipe"
                      value={newSeller}
                      onChange={(e) => setNewSeller(e.target.value)}
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="font-bold text-foreground block mb-1">Fluxo de Produto / Categoria da Gráfica</label>
                <select
                  className="w-full h-9 bg-background border border-border rounded-lg px-3 text-xs"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                >
                  <option value="Comunicação Visual">Comunicação Visual (Banners, Fachadas, Placas ACM)</option>
                  <option value="Papelaria & Offset">Papelaria Corporativa (Cartões, Pastas, Timbrados)</option>
                  <option value="Adesivos & Rótulos">Rótulos & Adesivos em Vinil (Meio-Corte)</option>
                  <option value="Brindes & Sacolas">Brindes Promocionais & Sacolas Kraft</option>
                  <option value="Orçamentos WhatsApp">Orçamentos Fechados no WhatsApp</option>
                  <option value="Prospecção B2B">Prospecção B2B (Novos Clientes)</option>
                  <option value="Faturamento Geral">Faturamento Global da Gráfica</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-foreground block mb-1">Unidade da Meta</label>
                <select
                  className="w-full h-9 bg-background border border-border rounded-lg px-3 text-xs"
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                >
                  <option value="Faturamento (R$)">Faturamento em Dinheiro (R$)</option>
                  <option value="Quantidade de Pedidos">Quantidade de Orçamentos/Pedidos Fechados</option>
                  <option value="Novos Clientes">Quantidade de Novos Clientes Atendidos</option>
                  <option value="Ligações e Visitas">Ligações e Contatos Ativos</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-foreground block mb-1">
                  {newType.includes('Faturamento') || newType.includes('R$')
                    ? 'Valor Alvo da Meta (R$)'
                    : 'Quantidade Alvo'}
                </label>
                <input
                  type="text"
                  className="w-full h-9 bg-background border border-border rounded-lg px-3 font-mono text-xs"
                  placeholder={newType.includes('Faturamento') ? 'Ex: 35000 ou 35.000,00' : 'Ex: 100'}
                  value={newTarget}
                  onChange={(e) => setNewTarget(e.target.value)}
                />
                {newType.includes('Faturamento') && newTarget && (
                  <p className="text-[10px] text-emerald-400 mt-1 font-medium">
                    Valor formatado: {formatCurrency(parseSmartNumber(newTarget))}
                  </p>
                )}
              </div>

              <div>
                <label className="font-bold text-foreground block mb-1">
                  {newType.includes('Faturamento') || newType.includes('R$')
                    ? 'Valor Já Realizado / Atual (R$)'
                    : 'Progresso Atual'}
                </label>
                <input
                  type="text"
                  className="w-full h-9 bg-background border border-border rounded-lg px-3 font-mono text-xs"
                  placeholder={newType.includes('Faturamento') ? 'Ex: 0 ou 15000' : 'Ex: 0'}
                  value={newCurrent}
                  onChange={(e) => setNewCurrent(e.target.value)}
                />
                {newType.includes('Faturamento') && newCurrent && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Valor formatado: {formatCurrency(parseSmartNumber(newCurrent))}
                  </p>
                )}
              </div>

              {/* Mês e Ano da Meta */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-foreground block mb-1">Mês da Meta</label>
                  <select
                    className="w-full h-9 bg-background border border-border rounded-lg px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    value={newMonth}
                    onChange={(e) => setNewMonth(Number(e.target.value))}
                  >
                    {MONTHS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-foreground block mb-1">Ano da Meta</label>
                  <select
                    className="w-full h-9 bg-background border border-border rounded-lg px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    value={newYear}
                    onChange={(e) => setNewYear(Number(e.target.value))}
                  >
                    {[2024, 2025, 2026, 2027, 2028].map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {!editingGoal && (
                <div className="p-2.5 rounded-xl bg-accent/40 border border-border flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    id="replicateAll"
                    checked={replicateToAllMonths}
                    onChange={(e) => setReplicateToAllMonths(e.target.checked)}
                    className="w-4 h-4 rounded text-primary focus:ring-primary border-border cursor-pointer"
                  />
                  <label htmlFor="replicateAll" className="text-xs font-bold text-foreground cursor-pointer select-none">
                    Replicar esta meta para todos os 12 meses do ano ({newYear})
                  </label>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsGoalModalOpen(false);
                  setEditingGoal(null);
                }}
              >
                Cancelar
              </Button>
              <Button size="sm" onClick={handleSaveGoal} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold">
                {editingGoal ? 'Salvar Alterações' : 'Criar Meta Comercial'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODAL 3: EDITAR VENDA LANÇADA (COM AUDITORIA AUTOMÁTICA)           */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {isEditSaleModalOpen && editingSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-card w-full max-w-lg rounded-2xl border border-border shadow-2xl p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-primary/20 text-primary">
                  <Edit className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">Editar Venda Lançada</h2>
                  <p className="text-xs text-muted-foreground">
                    Todas as modificações de valores e dados serão registradas no log de auditoria
                  </p>
                </div>
              </div>
              <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px]">
                Edição Auditada
              </Badge>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Vendedor */}
              <div>
                <label className="font-bold text-foreground block mb-1">Funcionário / Vendedor</label>
                <input
                  type="text"
                  value={editSaleSeller}
                  onChange={(e) => setEditSaleSeller(e.target.value)}
                  className="w-full h-9 bg-background border border-border rounded-lg px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Cliente */}
              <div>
                <label className="font-bold text-foreground block mb-1">Cliente ou Empresa Atendida</label>
                <input
                  type="text"
                  value={editSaleClientName}
                  onChange={(e) => setEditSaleClientName(e.target.value)}
                  className="w-full h-9 bg-background border border-border rounded-lg px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Telefone WhatsApp */}
              <div>
                <label className="font-bold text-foreground block mb-1">Telefone WhatsApp</label>
                <input
                  type="text"
                  value={editSaleClientPhone}
                  onChange={(e) => setEditSaleClientPhone(formatPhoneInput(e.target.value))}
                  className="w-full h-9 bg-background border border-border rounded-lg px-3 font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Valor e Categoria */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-foreground block mb-1">Valor da Venda (R$)</label>
                  <input
                    type="text"
                    value={editSaleValue}
                    onChange={(e) => setEditSaleValue(e.target.value)}
                    className="w-full h-9 bg-background border border-border rounded-lg px-3 font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  {editSaleValue && (
                    <p className="text-[10px] text-emerald-400 mt-1 font-bold">
                      Formatado: {formatCurrency(parseSmartNumber(editSaleValue))}
                    </p>
                  )}
                </div>

                <div>
                  <label className="font-bold text-foreground block mb-1">Produto / Categoria</label>
                  <input
                    type="text"
                    value={editSaleCategory}
                    onChange={(e) => setEditSaleCategory(e.target.value)}
                    className="w-full h-9 bg-background border border-border rounded-lg px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Mês e Ano */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-foreground block mb-1">Mês de Competência</label>
                  <select
                    value={editSaleMonth}
                    onChange={(e) => setEditSaleMonth(Number(e.target.value))}
                    className="w-full h-9 bg-background border border-border rounded-lg px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {MONTHS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-foreground block mb-1">Ano</label>
                  <select
                    value={editSaleYear}
                    onChange={(e) => setEditSaleYear(Number(e.target.value))}
                    className="w-full h-9 bg-background border border-border rounded-lg px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {[2024, 2025, 2026, 2027, 2028].map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Observações */}
              <div>
                <label className="font-bold text-foreground block mb-1">Observações / Detalhes</label>
                <textarea
                  rows={2}
                  value={editSaleNotes}
                  onChange={(e) => setEditSaleNotes(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg p-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </div>

              {/* Justificativa OBRIGATÓRIA da Alteração */}
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-amber-500 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    Motivo / Justificativa da Alteração <span className="text-destructive font-black">*</span>
                  </label>
                  <span className="text-[10px] text-amber-500 font-bold bg-amber-500/20 px-2 py-0.5 rounded-full">
                    OBRIGATÓRIO
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Por norma de auditoria, toda edição em lançamento de venda exige uma descrição detalhando o motivo (ex: correção de valor, ajuste de vendedor, troca de cliente).
                </p>
                <textarea
                  rows={2}
                  required
                  value={editSaleReason}
                  onChange={(e) => setEditSaleReason(e.target.value)}
                  placeholder="Descreva obrigatoriamente o motivo da alteração..."
                  className={`w-full bg-background border rounded-lg p-2.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 resize-none ${
                    !editSaleReason.trim()
                      ? 'border-amber-500/60 focus:ring-amber-500'
                      : 'border-emerald-500/50 focus:ring-emerald-500'
                  }`}
                />
                {!editSaleReason.trim() ? (
                  <p className="text-[10px] text-amber-500 font-semibold flex items-center gap-1">
                    ⚠️ Preenchimento obrigatório para poder salvar as modificações.
                  </p>
                ) : (
                  <p className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                    ✓ Justificativa informada com sucesso.
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsEditSaleModalOpen(false);
                  setEditingSale(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleSaveEditSale}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold gap-1.5"
              >
                <Check className="w-4 h-4" />
                Salvar Modificações & Registrar Log
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODAL 4: DETALHES DE AUDITORIA & HISTÓRICO DE MODIFICAÇÕES         */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {auditLogModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-card w-full max-w-lg rounded-2xl border border-border shadow-2xl p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">{auditLogModalData.title}</h2>
                  {auditLogModalData.subtitle && (
                    <p className="text-xs text-muted-foreground">{auditLogModalData.subtitle}</p>
                  )}
                </div>
              </div>
              <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px]">
                {auditLogModalData.logs.length} alteração(ões)
              </Badge>
            </div>

            <div className="max-h-[60vh] overflow-y-auto space-y-3 pr-1 text-xs">
              {auditLogModalData.logs.length === 0 ? (
                <p className="text-center py-6 text-muted-foreground">Nenhuma alteração registrada para este item.</p>
              ) : (
                auditLogModalData.logs.map((log) => (
                  <div key={log.id} className="p-3.5 rounded-xl border border-border/70 bg-accent/30 space-y-2">
                    <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-1.5">
                      <span className="font-bold text-foreground flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-primary" />
                        {log.userName}
                        {log.userRole && (
                          <span className="text-[10px] text-muted-foreground font-normal">({log.userRole})</span>
                        )}
                      </span>
                      <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-400" />
                        {log.dateStr}
                      </span>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      {log.changes.map((ch, idx) => (
                        <div key={idx} className="bg-background/90 p-2 rounded-lg border border-border/50 text-[11px]">
                          <span className="text-muted-foreground font-bold uppercase text-[9px] block mb-0.5">
                            {ch.label}
                          </span>
                          <div className="flex items-center gap-1.5 flex-wrap font-mono">
                            <span className="line-through text-destructive/80 bg-destructive/10 px-1.5 py-0.5 rounded">
                              {ch.oldValue || '(vazio)'}
                            </span>
                            <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                            <span className="font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                              {ch.newValue || '(vazio)'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {log.notes && (
                      <div className="bg-amber-500/10 border border-amber-500/25 p-2 rounded-lg text-xs space-y-0.5">
                        <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider block">
                          Motivo / Justificativa informada:
                        </span>
                        <p className="text-foreground italic font-medium">
                          &ldquo;{log.notes}&rdquo;
                        </p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-border">
              <Button size="sm" variant="outline" onClick={() => setAuditLogModalData(null)}>
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODAL 5: PERSONALIZAR PORCENTAGEM DE COMISSÃO                     */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {isCommissionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                  <Percent className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">Taxa de Comissão de Vendas</h2>
                  <p className="text-xs text-muted-foreground">
                    Personalize a porcentagem calculada sobre os pedidos
                  </p>
                </div>
              </div>
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">
                {commissionRate}% Atual
              </Badge>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-foreground block mb-1.5">
                  Porcentagem de Comissão (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    placeholder="1.0"
                    value={tempCommissionRate}
                    onChange={(e) => setTempCommissionRate(e.target.value)}
                    className="w-full h-10 bg-background border border-border rounded-xl px-3 pr-8 font-mono text-base font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    autoFocus
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">
                    %
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  A comissão padrão da gráfica é de <strong>1,0%</strong>, mas você pode definir qualquer valor decimal (ex: 0.5%, 1.5%, 2%, 5%).
                </p>
              </div>

              {/* Botões de atalho rápido */}
              <div>
                <label className="font-bold text-muted-foreground block mb-1 text-[11px]">
                  Sugestões Rápidas:
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[0.5, 1.0, 1.5, 2.0, 3.0, 5.0, 10.0].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => setTempCommissionRate(rate.toString())}
                      className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                        Number(tempCommissionRate) === rate
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-accent/40 text-foreground border-border hover:bg-accent'
                      }`}
                    >
                      {rate}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Pré-visualização do impacto */}
              <div className="p-3 rounded-xl bg-accent/30 border border-border/60 space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                  Simulação do Realizado no Período
                </span>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Total Realizado:</span>
                  <span className="font-bold text-foreground">{formatCurrency(displayCurrent)}</span>
                </div>
                <div className="flex justify-between items-center text-xs pt-1 border-t border-border/40">
                  <span className="text-muted-foreground">Nova Comissão Calculada:</span>
                  <span className="font-bold text-emerald-400 font-mono text-sm">
                    {formatCurrency(displayCurrent * (Math.max(0, parseFloat(tempCommissionRate) || 0) / 100))}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-border">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setTempCommissionRate('1.0');
                  handleSaveCommissionRate(1.0);
                }}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Restaurar Padrão (1%)
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsCommissionModalOpen(false)}
                  className="text-xs border-border"
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleSaveCommissionRate(parseFloat(tempCommissionRate) || 0)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-1.5 shadow-sm"
                >
                  <Check className="w-4 h-4" />
                  Salvar Porcentagem
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
