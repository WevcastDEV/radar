import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

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
  editLogs?: any[];
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
  updatedAt?: number;
  editLogs?: any[];
}

const DEFAULT_GRAFICA_GOALS: GoalItem[] = [];

const DEFAULT_SALES: GoalSale[] = [];

@Injectable()
export class GoalsService {
  private readonly logger = new Logger(GoalsService.name);
  private goals: GoalItem[] = [];
  private sales: GoalSale[] = [];

  constructor() {
    this.loadData();
  }

  private getDataDir(): string {
    let dir = path.join(process.cwd(), 'apps', 'api', 'data');
    if (!fs.existsSync(dir)) {
      if (fs.existsSync(path.join(process.cwd(), 'data'))) {
        dir = path.join(process.cwd(), 'data');
      } else {
        try {
          fs.mkdirSync(dir, { recursive: true });
        } catch {}
      }
    }
    return dir;
  }

  private getGoalsFilePath(): string {
    return path.join(this.getDataDir(), 'goals_database.json');
  }

  private getSalesFilePath(): string {
    return path.join(this.getDataDir(), 'sales_database.json');
  }

  private loadData() {
    try {
      const goalsPath = this.getGoalsFilePath();
      if (fs.existsSync(goalsPath)) {
        const raw = fs.readFileSync(goalsPath, 'utf8');
        try {
          const list = JSON.parse(raw);
          if (Array.isArray(list)) {
            // Respeita a lista existente no disco, MESMO QUE SEJA UM ARRAY VAZIO [] (itens apagados)
            this.goals = list;
          } else {
            this.goals = [...DEFAULT_GRAFICA_GOALS];
            this.saveGoals();
          }
        } catch {
          this.goals = [...DEFAULT_GRAFICA_GOALS];
          this.saveGoals();
        }
      } else {
        // Primeira inicialização do sistema
        this.goals = [...DEFAULT_GRAFICA_GOALS];
        this.saveGoals();
      }
    } catch (e: any) {
      this.logger.error(`Erro ao carregar goals_database.json: ${e?.message}`);
      this.goals = [];
    }

    try {
      const salesPath = this.getSalesFilePath();
      if (fs.existsSync(salesPath)) {
        const raw = fs.readFileSync(salesPath, 'utf8');
        try {
          const list = JSON.parse(raw);
          if (Array.isArray(list)) {
            // Respeita as vendas salvas, mesmo se estiver vazio []
            this.sales = list;
          } else {
            this.sales = [...DEFAULT_SALES];
            this.saveSales();
          }
        } catch {
          this.sales = [...DEFAULT_SALES];
          this.saveSales();
        }
      } else {
        // Primeira inicialização do sistema
        this.sales = [...DEFAULT_SALES];
        this.saveSales();
      }
    } catch (e: any) {
      this.logger.error(`Erro ao carregar sales_database.json: ${e?.message}`);
      this.sales = [];
    }
  }

  private saveGoals() {
    try {
      const mainPath = this.getGoalsFilePath();
      const content = JSON.stringify(this.goals, null, 2);
      fs.writeFileSync(mainPath, content, 'utf8');

      // Espelha para diretórios alternativos se existirem para consistência total entre diretórios de execução
      const altDir = mainPath.includes('apps')
        ? path.join(process.cwd(), 'data')
        : path.join(process.cwd(), 'apps', 'api', 'data');
      if (fs.existsSync(altDir)) {
        try {
          fs.writeFileSync(path.join(altDir, 'goals_database.json'), content, 'utf8');
        } catch {}
      }
    } catch (e: any) {
      this.logger.error(`Erro ao salvar goals_database.json: ${e?.message}`);
    }
  }

  private saveSales() {
    try {
      const mainPath = this.getSalesFilePath();
      const content = JSON.stringify(this.sales, null, 2);
      fs.writeFileSync(mainPath, content, 'utf8');

      const altDir = mainPath.includes('apps')
        ? path.join(process.cwd(), 'data')
        : path.join(process.cwd(), 'apps', 'api', 'data');
      if (fs.existsSync(altDir)) {
        try {
          fs.writeFileSync(path.join(altDir, 'sales_database.json'), content, 'utf8');
        } catch {}
      }
    } catch (e: any) {
      this.logger.error(`Erro ao salvar sales_database.json: ${e?.message}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // METAS
  // ═══════════════════════════════════════════════════════════════════

  findAll(filter?: { seller?: string; category?: string; month?: number; year?: number }): GoalItem[] {
    this.loadData();
    let list = [...this.goals];

    if (filter?.seller && filter.seller !== 'all') {
      const q = filter.seller.toLowerCase();
      list = list.filter((g) => g.seller.toLowerCase().includes(q));
    }

    if (filter?.category && filter.category !== 'all') {
      const q = filter.category.toLowerCase();
      list = list.filter((g) => g.category.toLowerCase().includes(q));
    }

    if (filter?.month) {
      list = list.filter((g) => g.month === Number(filter.month));
    }

    if (filter?.year) {
      list = list.filter((g) => g.year === Number(filter.year));
    }

    return list;
  }

  findById(id: string): GoalItem | undefined {
    return this.goals.find((g) => g.id === id);
  }

  createGoal(dto: Partial<GoalItem>): GoalItem {
    this.loadData();
    const id = dto.id || `goal-${Date.now()}`;
    const newGoal: GoalItem = {
      id,
      seller: dto.seller || 'Novo Vendedor',
      sellerId: dto.sellerId,
      type: dto.type || `${dto.category || 'Geral'} - Faturamento (R$)`,
      category: dto.category || 'Comunicação Visual',
      target: Number(dto.target) || 0,
      current: Number(dto.current) || 0,
      isCurrency: dto.isCurrency !== false,
      salesCount: Number(dto.salesCount) || 0,
      month: Number(dto.month) || 10,
      year: Number(dto.year) || 2026,
      updatedAt: Date.now(),
    };

    this.goals.push(newGoal);
    this.saveGoals();
    return newGoal;
  }

  updateGoal(id: string, dto: Partial<GoalItem>): GoalItem {
    this.loadData();
    const index = this.goals.findIndex((g) => g.id === id);
    if (index === -1) {
      throw new Error(`Meta com ID ${id} não encontrada.`);
    }

    this.goals[index] = {
      ...this.goals[index],
      ...dto,
      target: dto.target !== undefined ? Number(dto.target) : this.goals[index].target,
      current: dto.current !== undefined ? Number(dto.current) : this.goals[index].current,
      updatedAt: Date.now(),
    };

    this.saveGoals();
    return this.goals[index];
  }

  deleteGoal(id: string): boolean {
    this.loadData();
    const initialLen = this.goals.length;
    this.goals = this.goals.filter((g) => g.id !== id);
    if (this.goals.length !== initialLen) {
      this.saveGoals();
      return true;
    }
    return false;
  }

  // ═══════════════════════════════════════════════════════════════════
  // VENDAS (REGISTRO PELO FUNCIONÁRIO COM ATUALIZAÇÃO DA META)
  // ═══════════════════════════════════════════════════════════════════

  findAllSales(filter?: { seller?: string; category?: string; search?: string; limit?: number }): GoalSale[] {
    this.loadData();
    let list = [...this.sales];

    if (filter?.seller && filter.seller !== 'all') {
      const q = filter.seller.toLowerCase();
      list = list.filter((s) => s.sellerName.toLowerCase().includes(q));
    }

    if (filter?.category && filter.category !== 'all') {
      const q = filter.category.toLowerCase();
      list = list.filter((s) => s.category.toLowerCase().includes(q));
    }

    if (filter?.search) {
      const q = filter.search.toLowerCase();
      list = list.filter(
        (s) =>
          s.clientName.toLowerCase().includes(q) ||
          s.clientPhone.includes(q) ||
          s.sellerName.toLowerCase().includes(q) ||
          (s.notes && s.notes.toLowerCase().includes(q))
      );
    }

    list.sort((a, b) => b.createdAt - a.createdAt);

    if (filter?.limit && filter.limit > 0) {
      list = list.slice(0, filter.limit);
    }

    return list;
  }

  registerSale(data: {
    goalId?: string;
    sellerName: string;
    sellerId?: string;
    clientName: string;
    clientPhone: string;
    value: number;
    category: string;
    notes?: string;
    createdAt?: number;
  }): { sale: GoalSale; updatedGoal?: GoalItem } {
    this.loadData();
    const val = Number(data.value);
    if (isNaN(val) || val <= 0) {
      throw new Error('O valor da venda deve ser maior que zero.');
    }
    if (!data.clientName?.trim()) {
      throw new Error('O nome do cliente é obrigatório.');
    }
    if (!data.clientPhone?.trim()) {
      throw new Error('O telefone do cliente é obrigatório.');
    }
    if (!data.sellerName?.trim()) {
      throw new Error('O nome do vendedor é obrigatório.');
    }

    const createdAt = data.createdAt || Date.now();
    const d = new Date(createdAt);
    const saleMonth = (data as any).month || (d.getMonth() + 1);
    const saleYear = (data as any).year || d.getFullYear();

    const saleId = `sale-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newSale: GoalSale = {
      id: saleId,
      goalId: data.goalId,
      sellerName: data.sellerName.trim(),
      sellerId: data.sellerId,
      clientName: data.clientName.trim(),
      clientPhone: data.clientPhone.trim(),
      value: val,
      category: data.category || 'Comunicação Visual',
      notes: data.notes?.trim() || '',
      createdAt,
      month: saleMonth,
      year: saleYear,
      editLogs: (data as any).editLogs || [],
    };

    this.sales.unshift(newSale);
    this.saveSales();

    // Atualiza a meta individual correspondente
    let targetGoal: GoalItem | undefined;
    if (data.goalId) {
      targetGoal = this.goals.find((g) => g.id === data.goalId);
    }
    if (!targetGoal) {
      targetGoal = this.goals.find(
        (g) =>
          g.seller.toLowerCase().includes(data.sellerName.toLowerCase()) ||
          data.sellerName.toLowerCase().includes(g.seller.toLowerCase()) ||
          g.category.toLowerCase() === (data.category || '').toLowerCase()
      );
    }

    if (targetGoal) {
      targetGoal.current = Number((targetGoal.current + val).toFixed(2));
      targetGoal.salesCount = (targetGoal.salesCount || 0) + 1;
      targetGoal.updatedAt = Date.now();
    }

    // Atualiza a meta global da gráfica se existir
    const globalGoal = this.goals.find(
      (g) => g.category === 'Faturamento Geral' || g.seller.includes('Meta Global') || g.seller.includes('Geral')
    );
    if (globalGoal && globalGoal !== targetGoal) {
      globalGoal.current = Number((globalGoal.current + val).toFixed(2));
      globalGoal.salesCount = (globalGoal.salesCount || 0) + 1;
      globalGoal.updatedAt = Date.now();
    }

    this.saveGoals();

    this.logger.log(
      `Venda de R$ ${val} registrada por ${newSale.sellerName} para ${newSale.clientName} (${newSale.category}).`
    );

    return { sale: newSale, updatedGoal: targetGoal };
  }

  updateSale(
    saleId: string,
    data: Partial<GoalSale>
  ): { sale: GoalSale; updatedGoal?: GoalItem } {
    this.loadData();
    const saleIndex = this.sales.findIndex((s) => s.id === saleId);
    if (saleIndex === -1) {
      throw new Error(`Venda ${saleId} não encontrada.`);
    }

    const oldSale = { ...this.sales[saleIndex] };
    const updatedSale: GoalSale = {
      ...oldSale,
      ...data,
      id: oldSale.id,
    };

    const valDiff = (Number(updatedSale.value) || 0) - (Number(oldSale.value) || 0);

    this.sales[saleIndex] = updatedSale;
    this.saveSales();

    let targetGoal: GoalItem | undefined;
    if (valDiff !== 0) {
      if (updatedSale.goalId) {
        targetGoal = this.goals.find((g) => g.id === updatedSale.goalId);
      }
      if (!targetGoal) {
        targetGoal = this.goals.find(
          (g) =>
            g.seller.toLowerCase().includes(updatedSale.sellerName.toLowerCase()) ||
            g.category.toLowerCase() === updatedSale.category.toLowerCase()
        );
      }

      if (targetGoal) {
        targetGoal.current = Math.max(0, Number((targetGoal.current + valDiff).toFixed(2)));
        targetGoal.updatedAt = Date.now();
      }

      const globalGoal = this.goals.find(
        (g) => g.category === 'Faturamento Geral' || g.seller.includes('Meta Global') || g.seller.includes('Geral')
      );
      if (globalGoal && globalGoal !== targetGoal) {
        globalGoal.current = Math.max(0, Number((globalGoal.current + valDiff).toFixed(2)));
        globalGoal.updatedAt = Date.now();
      }

      this.saveGoals();
    }

    this.logger.log(`Venda ${saleId} atualizada com sucesso.`);
    return { sale: updatedSale, updatedGoal: targetGoal };
  }

  deleteSale(saleId: string): { success: boolean; removedSale?: GoalSale } {
    this.loadData();
    const saleIndex = this.sales.findIndex((s) => s.id === saleId);
    if (saleIndex === -1) {
      return { success: false };
    }

    const removed = this.sales[saleIndex];
    this.sales.splice(saleIndex, 1);
    this.saveSales();

    // Desconta o valor da meta
    let targetGoal: GoalItem | undefined;
    if (removed.goalId) {
      targetGoal = this.goals.find((g) => g.id === removed.goalId);
    }
    if (!targetGoal) {
      targetGoal = this.goals.find(
        (g) =>
          g.seller.toLowerCase().includes(removed.sellerName.toLowerCase()) ||
          g.category.toLowerCase() === removed.category.toLowerCase()
      );
    }

    if (targetGoal) {
      targetGoal.current = Math.max(0, Number((targetGoal.current - removed.value).toFixed(2)));
      targetGoal.salesCount = Math.max(0, (targetGoal.salesCount || 1) - 1);
      targetGoal.updatedAt = Date.now();
    }

    const globalGoal = this.goals.find(
      (g) => g.category === 'Faturamento Geral' || g.seller.includes('Meta Global') || g.seller.includes('Geral')
    );
    if (globalGoal && globalGoal !== targetGoal) {
      globalGoal.current = Math.max(0, Number((globalGoal.current - removed.value).toFixed(2)));
      globalGoal.salesCount = Math.max(0, (globalGoal.salesCount || 1) - 1);
      globalGoal.updatedAt = Date.now();
    }

    this.saveGoals();
    this.logger.log(`Venda ${saleId} estornada com sucesso.`);
    return { success: true, removedSale: removed };
  }

  // ═══════════════════════════════════════════════════════════════════
  // RESUMO E AUDITORIA PARA ADMINISTRADORES
  // ═══════════════════════════════════════════════════════════════════

  getSummary(filter?: { month?: number; year?: number }) {
    const currencyGoals = this.goals.filter(
      (g) => g.isCurrency && g.category !== 'Faturamento Geral' && !g.seller.includes('Meta Global')
    );

    const globalTarget = currencyGoals.reduce((acc, g) => acc + g.target, 0);
    const globalCurrent = currencyGoals.reduce((acc, g) => acc + g.current, 0);
    const globalPercent = globalTarget > 0 ? Number(((globalCurrent / globalTarget) * 100).toFixed(1)) : 0;

    const totalSalesCount = this.sales.length;
    const totalSalesValue = this.sales.reduce((acc, s) => acc + s.value, 0);
    const averageTicket = totalSalesCount > 0 ? Number((totalSalesValue / totalSalesCount).toFixed(2)) : 0;

    // Desempenho individual agrupado por vendedor
    const sellersPerformanceMap: Record<
      string,
      {
        sellerName: string;
        target: number;
        current: number;
        percent: number;
        salesCount: number;
        averageTicket: number;
        categories: string[];
        status: 'hit' | 'on_track' | 'warning';
      }
    > = {};

    for (const g of currencyGoals) {
      const name = g.seller;
      if (!sellersPerformanceMap[name]) {
        sellersPerformanceMap[name] = {
          sellerName: name,
          target: g.target,
          current: g.current,
          percent: g.target > 0 ? Number(((g.current / g.target) * 100).toFixed(1)) : 0,
          salesCount: g.salesCount || 0,
          averageTicket: g.salesCount > 0 ? Number((g.current / g.salesCount).toFixed(2)) : 0,
          categories: [g.category],
          status: g.current >= g.target ? 'hit' : (g.current / g.target) >= 0.7 ? 'on_track' : 'warning',
        };
      } else {
        const item = sellersPerformanceMap[name];
        item.target += g.target;
        item.current += g.current;
        item.salesCount += g.salesCount || 0;
        item.percent = item.target > 0 ? Number(((item.current / item.target) * 100).toFixed(1)) : 0;
        item.averageTicket = item.salesCount > 0 ? Number((item.current / item.salesCount).toFixed(2)) : 0;
        if (!item.categories.includes(g.category)) item.categories.push(g.category);
        item.status = item.current >= item.target ? 'hit' : (item.current / item.target) >= 0.7 ? 'on_track' : 'warning';
      }
    }

    const sellersRanking = Object.values(sellersPerformanceMap).sort((a, b) => b.current - a.current);

    return {
      globalTarget,
      globalCurrent,
      globalPercent,
      totalSalesCount,
      totalSalesValue,
      averageTicket,
      sellersRanking,
      recentSales: this.sales.slice(0, 10),
      totalGoalsCount: this.goals.length,
    };
  }
}
