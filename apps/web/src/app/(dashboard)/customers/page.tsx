'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Building2, Users, DollarSign, Phone, Mail, Edit, Trash2, ShieldCheck, Eye } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { clearAllSystemData } from '@/lib/backup-manager';

interface CustomerItem {
  id: string;
  name: string;
  tradeName?: string;
  document: string;
  segment: string;
  plan: string;
  monthlyFee: number;
  contractValue: number;
  status: 'Ativo' | 'Implantação' | 'Inadimplente';
  startDate: string;
  seller: string;
  phone: string;
  email: string;
}

const INITIAL_CUSTOMERS: CustomerItem[] = typeof window !== 'undefined' && localStorage.getItem('system_reset') === 'true' ? [] : [
  {
    id: 'CLI-001',
    name: 'Condomínio Reserva do Parque',
    tradeName: 'Reserva do Parque',
    document: '12.345.678/0001-90',
    segment: 'Condomínio',
    plan: 'CFTV IP + Controle de Acesso',
    monthlyFee: 1200,
    contractValue: 18500,
    status: 'Ativo',
    startDate: '10/01/2024',
    seller: 'Carlos Santos',
    phone: '(11) 98765-4321',
    email: 'sindico@reservadoparque.com.br'
  },
  {
    id: 'CLI-002',
    name: 'Logística Express ABC Ltda',
    tradeName: 'Express ABC',
    document: '98.765.432/0001-10',
    segment: 'Indústria / Logística',
    plan: 'Alarme Monitorado 24h + Cerca',
    monthlyFee: 850,
    contractValue: 12400,
    status: 'Ativo',
    startDate: '15/02/2024',
    seller: 'Carlos Santos',
    phone: '(11) 97654-3210',
    email: 'seguranca@expressabc.com.br'
  },
  {
    id: 'CLI-003',
    name: 'Clínica Bem Estar Saúde',
    tradeName: 'Clínica Bem Estar',
    document: '45.678.901/0001-23',
    segment: 'Saúde / Clínica',
    plan: 'Controle Biométrico + CFTV',
    monthlyFee: 450,
    contractValue: 5600,
    status: 'Ativo',
    startDate: '02/03/2024',
    seller: 'André Lima',
    phone: '(11) 96543-2109',
    email: 'contato@clinicabemestar.med.br'
  },
  {
    id: 'CLI-004',
    name: 'Supermercado Vida Nova',
    tradeName: 'Vida Nova Supermercados',
    document: '23.456.789/0001-45',
    segment: 'Comércio / Varejo',
    plan: 'CFTV Alta Resolução (32 Câmeras)',
    monthlyFee: 2500,
    contractValue: 45000,
    status: 'Implantação',
    startDate: '20/05/2024',
    seller: 'Rafael Costa',
    phone: '(11) 95432-1098',
    email: 'financeiro@vidanova.com.br'
  },
  {
    id: 'CLI-005',
    name: 'Escritório Contábil Alfa',
    tradeName: 'Alfa Contabilidade',
    document: '34.567.890/0001-67',
    segment: 'Serviços',
    plan: 'CFTV Nuvem + Alarme',
    monthlyFee: 350,
    contractValue: 4200,
    status: 'Ativo',
    startDate: '11/04/2024',
    seller: 'Weverton',
    phone: '(11) 94321-0987',
    email: 'ti@alfacontabil.com.br'
  }
];

const CUSTOMERS_STORAGE_KEY = 'radar_customers_data';

export default function CustomersPage() {
  const confirm = useConfirm();
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerItem | null>(null);

  // Load from localStorage on mount
  useState(() => {
    if (typeof window === 'undefined') return;
    try {
      if (localStorage.getItem('system_reset') === 'true') {
        const raw = localStorage.getItem(CUSTOMERS_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            setCustomers(parsed);
            return;
          }
        }
        setCustomers([]);
        return;
      }

      const raw = localStorage.getItem(CUSTOMERS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCustomers(parsed);
          return;
        }
      }
      setCustomers(INITIAL_CUSTOMERS);
      localStorage.setItem(CUSTOMERS_STORAGE_KEY, JSON.stringify(INITIAL_CUSTOMERS));
    } catch {
      setCustomers([]);
    }
  });

  const saveCustomersToStorage = (updated: CustomerItem[]) => {
    setCustomers(updated);
    try {
      localStorage.setItem(CUSTOMERS_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  // Form states
  const [formName, setFormName] = useState('');
  const [formDocument, setFormDocument] = useState('');
  const [formSegment, setFormSegment] = useState('Comércio');
  const [formPlan, setFormPlan] = useState('');
  const [formMonthly, setFormMonthly] = useState('');
  const [formContract, setFormContract] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formSeller, setFormSeller] = useState('Weverton');

  // Cálculos dinâmicos
  const totalMRR = customers.reduce((acc, c) => acc + c.monthlyFee, 0);
  const totalContract = customers.reduce((acc, c) => acc + c.contractValue, 0);
  const activeCount = customers.filter(c => c.status === 'Ativo').length;

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.document.includes(searchTerm) ||
    c.plan.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.segment.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenNew = () => {
    setEditingCustomer(null);
    setFormName('');
    setFormDocument('');
    setFormSegment('Comércio');
    setFormPlan('');
    setFormMonthly('');
    setFormContract('');
    setFormPhone('');
    setFormSeller('Weverton');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (customer: CustomerItem) => {
    setEditingCustomer(customer);
    setFormName(customer.name);
    setFormDocument(customer.document);
    setFormSegment(customer.segment);
    setFormPlan(customer.plan);
    setFormMonthly(customer.monthlyFee.toString());
    setFormContract(customer.contractValue.toString());
    setFormPhone(customer.phone);
    setFormSeller(customer.seller);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    const target = customers.find(c => c.id === id);
    const confirmed = await confirm({
      title: 'Remover Cliente da Carteira',
      description: target 
        ? `Tem certeza que deseja remover o cliente "${target.name}" da carteira ativa?` 
        : 'Tem certeza que deseja remover este cliente da carteira?',
      confirmText: 'Remover Cliente',
      cancelText: 'Cancelar',
      variant: 'danger',
      icon: 'trash',
    });

    if (confirmed) {
      const updated = customers.filter(c => c.id !== id);
      saveCustomersToStorage(updated);
      toast.success('Cliente removido com sucesso!');
    }
  };

  const handleClearAllCustomersAndData = async () => {
    const confirmed = await confirm({
      title: 'Limpar Todas as Informações do Sistema',
      description: 'Tem certeza absoluta? Isso apagará TODOS os clientes cadastrados, leads, visitas e históricos do sistema, deixando a base 100% limpa e zerada.',
      confirmText: 'Sim, Limpar Tudo',
      cancelText: 'Cancelar',
      variant: 'danger',
      icon: 'trash',
    });

    if (confirmed) {
      clearAllSystemData();
      setCustomers([]);
      toast.success('Todos os clientes, leads e visitas foram limpos com sucesso!');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  };

  const handleSaveCustomer = () => {
    if (!formName.trim() || !formPlan.trim()) {
      toast.error('Preencha o nome do cliente e o serviço/plano contratado');
      return;
    }

    const monthlyNum = parseFloat(formMonthly) || 0;
    const contractNum = parseFloat(formContract) || 0;

    if (editingCustomer) {
      const updated = customers.map(c => c.id === editingCustomer.id ? {
        ...c,
        name: formName,
        document: formDocument || 'Não informado',
        segment: formSegment,
        plan: formPlan,
        monthlyFee: monthlyNum,
        contractValue: contractNum,
        phone: formPhone || '(11) 99999-9999',
        seller: formSeller,
      } : c);
      saveCustomersToStorage(updated);
      toast.success('Cliente atualizado com sucesso!');
    } else {
      const novo: CustomerItem = {
        id: `CLI-${String(customers.length + 1).padStart(3, '0')}`,
        name: formName,
        document: formDocument || 'Não informado',
        segment: formSegment,
        plan: formPlan,
        monthlyFee: monthlyNum,
        contractValue: contractNum,
        status: 'Ativo',
        startDate: new Date().toLocaleDateString('pt-BR'),
        seller: formSeller,
        phone: formPhone || '(11) 99999-9999',
        email: 'cliente@contato.com'
      };
      saveCustomersToStorage([novo, ...customers]);
      toast.success('Novo cliente cadastrado com sucesso!');
    }

    setIsModalOpen(false);
    setEditingCustomer(null);
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Clientes Ativos</h1>
          <p className="text-muted-foreground">Gerencie sua carteira de contratos fechados e mensalidades</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button 
            variant="outline" 
            className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:border-destructive text-sm"
            onClick={handleClearAllCustomersAndData}
            title="Limpar todos os dados, clientes, leads e visitas do sistema"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Limpar Tudo
          </Button>
          <Button onClick={handleOpenNew}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Cliente
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="bg-primary/20 p-3 rounded-full text-primary">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total de Clientes</p>
              <h3 className="text-2xl font-bold text-foreground">{customers.length} ({activeCount} ativos)</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="bg-success/20 p-3 rounded-full text-success">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Faturamento Recorrente (MRR)</p>
              <h3 className="text-2xl font-bold text-success">{formatCurrency(totalMRR)}/mês</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="bg-amber-500/20 p-3 rounded-full text-amber-500">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total em Contratos</p>
              <h3 className="text-2xl font-bold text-foreground">{formatCurrency(totalContract)}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex items-center gap-3 bg-card p-3 rounded-xl border border-border">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input 
            type="text"
            className="w-full bg-background border border-border rounded-md pl-9 pr-3 h-9 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Buscar por cliente, CNPJ/CPF, plano ou segmento..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Tabela de Clientes */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-accent/50 text-muted-foreground border-b border-border">
              <tr>
                <th className="px-6 py-4">Cliente / Razão Social</th>
                <th className="px-6 py-4">Segmento</th>
                <th className="px-6 py-4">Plano / Contrato</th>
                <th className="px-6 py-4">Mensalidade</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Responsável</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
                    Nenhum cliente encontrado.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map(cust => (
                  <tr key={cust.id} className="border-b border-border hover:bg-cardHover transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-foreground">{cust.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">{cust.document} • {cust.phone}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs px-2.5 py-1 rounded bg-primary/10 text-primary font-medium">
                        {cust.segment}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground">{cust.plan}</div>
                      <div className="text-xs text-muted-foreground">Início: {cust.startDate}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-success">{formatCurrency(cust.monthlyFee)}</div>
                      <div className="text-xs text-muted-foreground">Total: {formatCurrency(cust.contractValue)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={cust.status === 'Ativo' ? 'default' : cust.status === 'Implantação' ? 'outline' : 'destructive'}>
                        {cust.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {cust.seller}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                          onClick={() => handleOpenEdit(cust)}
                          title="Editar Cliente"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(cust.id)}
                          title="Excluir Cliente"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Novo / Editar Cliente */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-card w-full max-w-lg rounded-xl border border-border shadow-2xl p-6">
            <h2 className="text-xl font-bold mb-4">{editingCustomer ? 'Editar Cliente' : 'Novo Cliente'}</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground">Nome / Razão Social</label>
                <input 
                  type="text" 
                  className="w-full h-10 bg-background border border-border rounded-md px-3 mt-1" 
                  placeholder="Ex: Condomínio Jardim das Flores"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground">CNPJ ou CPF</label>
                  <input 
                    type="text" 
                    className="w-full h-10 bg-background border border-border rounded-md px-3 mt-1" 
                    placeholder="00.000.000/0001-00"
                    value={formDocument}
                    onChange={e => setFormDocument(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Segmento</label>
                  <select 
                    className="w-full h-10 bg-background border border-border rounded-md px-3 mt-1"
                    value={formSegment}
                    onChange={e => setFormSegment(e.target.value)}
                  >
                    <option value="Condomínio">Condomínio</option>
                    <option value="Comércio">Comércio / Varejo</option>
                    <option value="Indústria">Indústria / Logística</option>
                    <option value="Saúde">Saúde / Clínica</option>
                    <option value="Serviços">Serviços / Escritório</option>
                    <option value="Residencial">Residencial</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm text-muted-foreground">Plano / Serviço Contratado</label>
                <input 
                  type="text" 
                  className="w-full h-10 bg-background border border-border rounded-md px-3 mt-1" 
                  placeholder="Ex: CFTV IP 16 Câmeras + Alarme Monitorado"
                  value={formPlan}
                  onChange={e => setFormPlan(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground">Mensalidade (R$)</label>
                  <input 
                    type="number" 
                    className="w-full h-10 bg-background border border-border rounded-md px-3 mt-1" 
                    placeholder="Ex: 850"
                    value={formMonthly}
                    onChange={e => setFormMonthly(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Valor Total Contrato (R$)</label>
                  <input 
                    type="number" 
                    className="w-full h-10 bg-background border border-border rounded-md px-3 mt-1" 
                    placeholder="Ex: 12000"
                    value={formContract}
                    onChange={e => setFormContract(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground">Telefone / WhatsApp</label>
                  <input 
                    type="text" 
                    className="w-full h-10 bg-background border border-border rounded-md px-3 mt-1" 
                    placeholder="(11) 99999-9999"
                    value={formPhone}
                    onChange={e => setFormPhone(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Responsável</label>
                  <select 
                    className="w-full h-10 bg-background border border-border rounded-md px-3 mt-1"
                    value={formSeller}
                    onChange={e => setFormSeller(e.target.value)}
                  >
                    <option value="Weverton">Weverton</option>
                    <option value="Carlos Santos">Carlos Santos</option>
                    <option value="Rafael Costa">Rafael Costa</option>
                    <option value="André Lima">André Lima</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => { setIsModalOpen(false); setEditingCustomer(null); }}>
                Cancelar
              </Button>
              <Button onClick={handleSaveCustomer}>
                {editingCustomer ? 'Salvar Alterações' : 'Cadastrar Cliente'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
