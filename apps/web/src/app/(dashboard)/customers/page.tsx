'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Search, 
  Users, 
  Phone, 
  Mail, 
  Edit, 
  Trash2, 
  MessageSquare, 
  Calendar, 
  Clock, 
  FileText, 
  Send, 
  MapPin, 
  Briefcase, 
  UserCheck, 
  RotateCcw,
  Building2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { formatBrazilianPhone, toWhatsAppJidDigits } from '@/lib/phone-utils';
import Link from 'next/link';

export interface CustomerObservation {
  id: string;
  text: string;
  createdAt: string;
  author: string;
}

export interface CustomerItem {
  id: string;
  name: string;
  contactName: string;
  role?: string;
  document: string;
  segment: string;
  phone: string;
  email: string;
  city?: string;
  address?: string;
  status: 'Ativo' | 'Em Negociação' | 'Implantação' | 'Contato Futuro' | 'Inativo';
  bestContactTime?: string;
  nextFollowUp?: string;
  seller: string;
  observations: CustomerObservation[];
}

const CUSTOMERS_STORAGE_KEY = 'radar_customers_data';

const DEFAULT_CUSTOMERS: CustomerItem[] = [];

export default function CustomersPage() {
  const confirm = useConfirm();
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');

  // Modal Novo / Editar Cliente
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerItem | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formContactName, setFormContactName] = useState('');
  const [formRole, setFormRole] = useState('');
  const [formDocument, setFormDocument] = useState('');
  const [formSegment, setFormSegment] = useState('Comércio');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formStatus, setFormStatus] = useState<CustomerItem['status']>('Ativo');
  const [formBestTime, setFormBestTime] = useState('');
  const [formNextFollowUp, setFormNextFollowUp] = useState('');
  const [formSeller, setFormSeller] = useState('');

  // Modal / Drawer de Observações
  const [selectedCustomerForObs, setSelectedCustomerForObs] = useState<CustomerItem | null>(null);
  const [newObsText, setNewObsText] = useState('');

  // Carregar dados
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CUSTOMERS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          // Filtrar exemplos antigos de teste (CLI-001, CLI-002) para manter painel zerado
          const cleaned = parsed.filter(c => c.id !== 'CLI-001' && c.id !== 'CLI-002');
          // Garantir que todos tenham array de observations
          const sanitized = cleaned.map((c: any) => ({
            ...c,
            contactName: c.contactName || c.name,
            observations: Array.isArray(c.observations) ? c.observations : [],
          }));
          setCustomers(sanitized);
          setIsLoaded(true);
          return;
        }
      }
      setCustomers([]);
      localStorage.setItem(CUSTOMERS_STORAGE_KEY, JSON.stringify([]));
    } catch {
      setCustomers([]);
    }
    setIsLoaded(true);
  }, []);

  const persistCustomers = (updated: CustomerItem[]) => {
    setCustomers(updated);
    try {
      localStorage.setItem(CUSTOMERS_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Erro ao salvar clientes:', e);
    }
  };

  // Filtragem
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const query = searchTerm.toLowerCase().trim();
      const matchesSearch = !query ||
        c.name.toLowerCase().includes(query) ||
        (c.contactName || '').toLowerCase().includes(query) ||
        (c.document || '').includes(query) ||
        (c.phone || '').includes(query) ||
        (c.email || '').toLowerCase().includes(query) ||
        (c.city || '').toLowerCase().includes(query) ||
        c.observations.some(obs => obs.text.toLowerCase().includes(query));

      const matchesStatus = statusFilter === 'Todos' || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [customers, searchTerm, statusFilter]);

  // Contadores
  const stats = useMemo(() => {
    const total = customers.length;
    const active = customers.filter(c => c.status === 'Ativo').length;
    const inNegotiation = customers.filter(c => c.status === 'Em Negociação').length;
    const future = customers.filter(c => c.status === 'Contato Futuro').length;
    return { total, active, inNegotiation, future };
  }, [customers]);

  const handleOpenNew = () => {
    setEditingCustomer(null);
    setFormName('');
    setFormContactName('');
    setFormRole('');
    setFormDocument('');
    setFormSegment('Comércio');
    setFormPhone('');
    setFormEmail('');
    setFormCity('');
    setFormAddress('');
    setFormStatus('Ativo');
    setFormBestTime('Qualquer horário');
    setFormNextFollowUp('');
    setFormSeller('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (customer: CustomerItem) => {
    setEditingCustomer(customer);
    setFormName(customer.name);
    setFormContactName(customer.contactName || '');
    setFormRole(customer.role || '');
    setFormDocument(customer.document || '');
    setFormSegment(customer.segment || 'Geral');
    setFormPhone(customer.phone || '');
    setFormEmail(customer.email || '');
    setFormCity(customer.city || '');
    setFormAddress(customer.address || '');
    setFormStatus(customer.status || 'Ativo');
    setFormBestTime(customer.bestContactTime || '');
    setFormNextFollowUp(customer.nextFollowUp || '');
    setFormSeller(customer.seller || '');
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    const target = customers.find(c => c.id === id);
    const confirmed = await confirm({
      title: 'Excluir Cliente',
      description: target 
        ? `Tem certeza que deseja excluir o cadastro de "${target.name}"? Esta ação removerá também todo o histórico de observações.` 
        : 'Tem certeza que deseja excluir este cliente?',
      confirmText: 'Excluir Definitivamente',
      cancelText: 'Cancelar',
      variant: 'danger',
      icon: 'trash',
    });

    if (confirmed) {
      persistCustomers(customers.filter(c => c.id !== id));
      toast.success('Cliente removido com sucesso!');
    }
  };

  const handleClearAll = async () => {
    const confirmed = await confirm({
      title: 'Limpar Todos os Clientes',
      description: 'Deseja remover todos os clientes cadastrados para recomeçar o painel limpo? Esta ação não pode ser desfeita.',
      confirmText: 'Sim, Limpar Clientes',
      cancelText: 'Cancelar',
      variant: 'danger',
      icon: 'trash',
    });

    if (confirmed) {
      persistCustomers([]);
      toast.success('Painel de clientes limpo com sucesso!');
    }
  };

  const handleSaveCustomer = () => {
    if (!formName.trim() || !formPhone.trim()) {
      toast.error('Preencha o nome do cliente e o telefone/WhatsApp para contato');
      return;
    }

    const formattedPhone = formatBrazilianPhone(formPhone);

    if (editingCustomer) {
      const updated = customers.map(c => c.id === editingCustomer.id ? {
        ...c,
        name: formName.trim(),
        contactName: formContactName.trim() || formName.trim(),
        role: formRole.trim(),
        document: formDocument.trim(),
        segment: formSegment.trim(),
        phone: formattedPhone,
        email: formEmail.trim(),
        city: formCity.trim(),
        address: formAddress.trim(),
        status: formStatus,
        bestContactTime: formBestTime.trim(),
        nextFollowUp: formNextFollowUp,
        seller: formSeller,
      } : c);
      persistCustomers(updated);
      toast.success('Cliente atualizado com sucesso!');
    } else {
      const novo: CustomerItem = {
        id: `CLI-${Date.now().toString().slice(-6)}`,
        name: formName.trim(),
        contactName: formContactName.trim() || formName.trim(),
        role: formRole.trim(),
        document: formDocument.trim(),
        segment: formSegment.trim(),
        phone: formattedPhone,
        email: formEmail.trim(),
        city: formCity.trim(),
        address: formAddress.trim(),
        status: formStatus,
        bestContactTime: formBestTime.trim(),
        nextFollowUp: formNextFollowUp,
        seller: formSeller,
        observations: [],
      };
      persistCustomers([novo, ...customers]);
      toast.success('Novo cliente cadastrado com sucesso!');
    }

    setIsModalOpen(false);
    setEditingCustomer(null);
  };

  // Gerenciamento de Observações
  const handleOpenObservations = (customer: CustomerItem) => {
    setSelectedCustomerForObs(customer);
    setNewObsText('');
  };

  const handleAddObservation = () => {
    if (!selectedCustomerForObs || !newObsText.trim()) return;

    const newObs: CustomerObservation = {
      id: `obs-${Date.now()}`,
      text: newObsText.trim(),
      createdAt: new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }),
      author: 'Weverton',
    };

    const updatedList = customers.map(c => {
      if (c.id === selectedCustomerForObs.id) {
        return {
          ...c,
          observations: [newObs, ...(c.observations || [])],
        };
      }
      return c;
    });

    persistCustomers(updatedList);
    setSelectedCustomerForObs(prev => prev ? {
      ...prev,
      observations: [newObs, ...(prev.observations || [])],
    } : null);

    setNewObsText('');
    toast.success('Observação registrada no histórico do cliente!');
  };

  const handleDeleteObservation = (obsId: string) => {
    if (!selectedCustomerForObs) return;

    const updatedList = customers.map(c => {
      if (c.id === selectedCustomerForObs.id) {
        return {
          ...c,
          observations: (c.observations || []).filter(o => o.id !== obsId),
        };
      }
      return c;
    });

    persistCustomers(updatedList);
    setSelectedCustomerForObs(prev => prev ? {
      ...prev,
      observations: (prev.observations || []).filter(o => o.id !== obsId),
    } : null);
    toast.success('Observação removida.');
  };

  if (!isLoaded) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Carregando painel de clientes...</div>;
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Painel de Clientes & Contatos</h1>
            <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20 font-bold">
              Histórico & Observações
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-0.5">
            Base central de contatos para acompanhamento futuro, agendamentos e histórico detalhado de observações.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          {customers.length > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleClearAll}
              className="text-xs text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              Limpar Clientes
            </Button>
          )}

          <Button 
            onClick={handleOpenNew} 
            className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-md"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            + Novo Cliente
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-card border-border shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground font-medium">Total de Clientes</p>
              <h4 className="text-base font-black text-foreground font-mono">{stats.total}</h4>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground font-medium">Clientes Ativos</p>
              <h4 className="text-base font-black text-emerald-500 font-mono">{stats.active}</h4>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground font-medium">Em Negociação</p>
              <h4 className="text-base font-black text-amber-500 font-mono">{stats.inNegotiation}</h4>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground font-medium">Contato Futuro</p>
              <h4 className="text-base font-black text-purple-400 font-mono">{stats.future}</h4>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Busca e Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 bg-card p-3 rounded-xl border border-border items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input 
            type="text"
            className="w-full bg-background border border-border rounded-lg pl-9 pr-3 h-9 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Buscar por cliente, decisor, telefone, e-mail, observação ou cidade..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <select 
          className="h-9 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:outline-none w-full sm:w-auto font-medium"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="Todos">Todos os Status</option>
          <option value="Ativo">Ativo</option>
          <option value="Em Negociação">Em Negociação</option>
          <option value="Implantação">Implantação</option>
          <option value="Contato Futuro">Contato Futuro</option>
          <option value="Inativo">Inativo</option>
        </select>
      </div>

      {/* Lista / Tabela Estruturada de Clientes */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="text-[11px] uppercase bg-muted/40 text-muted-foreground border-b border-border font-bold">
              <tr>
                <th className="px-5 py-3.5">Cliente / Empresa</th>
                <th className="px-5 py-3.5">Decisor / Contato</th>
                <th className="px-5 py-3.5">WhatsApp / Contato</th>
                <th className="px-5 py-3.5">Status & Retorno</th>
                <th className="px-5 py-3.5">Observações Feitas</th>
                <th className="px-5 py-3.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm font-semibold">Nenhum cliente encontrado.</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Cadastre novos clientes clicando no botão "+ Novo Cliente".
                    </p>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map(cust => {
                  const cleanDigits = toWhatsAppJidDigits(cust.phone.replace(/\D/g, ''));
                  const obsCount = cust.observations?.length || 0;
                  const latestObs = cust.observations?.[0];

                  return (
                    <tr key={cust.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-foreground text-sm flex items-center gap-1.5">
                          <span>{cust.name}</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <span className="font-mono">{cust.document || 'Sem documento'}</span>
                          {cust.segment && (
                            <>
                              <span>•</span>
                              <span>{cust.segment}</span>
                            </>
                          )}
                        </div>
                        {cust.city && (
                          <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-muted-foreground/60" />
                            <span>{cust.city}</span>
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-foreground flex items-center gap-1">
                          <UserCheck className="w-3.5 h-3.5 text-primary" />
                          <span>{cust.contactName || cust.name}</span>
                        </div>
                        {cust.role && (
                          <div className="text-[11px] text-muted-foreground mt-0.5">{cust.role}</div>
                        )}
                        {cust.email && (
                          <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5 font-mono">
                            <Mail className="w-3 h-3 text-muted-foreground/60" />
                            <span>{cust.email}</span>
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="font-mono text-xs font-bold text-foreground flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-emerald-500" />
                          <span>{cust.phone}</span>
                        </div>
                        {cleanDigits && (
                          <Link 
                            href={`/chat-comercial?phone=${cleanDigits}`}
                            className="inline-flex items-center gap-1 mt-1 text-[11px] font-semibold text-emerald-500 hover:text-emerald-400 hover:underline"
                          >
                            <MessageSquare className="w-3 h-3" />
                            Abrir Chat Comercial
                          </Link>
                        )}
                      </td>

                      <td className="px-5 py-3.5">
                        <Badge 
                          variant={
                            cust.status === 'Ativo' ? 'default' : 
                            cust.status === 'Em Negociação' ? 'outline' : 
                            cust.status === 'Contato Futuro' ? 'secondary' : 'destructive'
                          } 
                          className="text-[10px]"
                        >
                          {cust.status}
                        </Badge>
                        {cust.bestContactTime && (
                          <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1">
                            <Clock className="w-3 h-3 text-muted-foreground/60" />
                            <span>{cust.bestContactTime}</span>
                          </div>
                        )}
                        {cust.nextFollowUp && (
                          <div className="text-[11px] text-amber-500 font-medium flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3" />
                            <span>Retorno: {cust.nextFollowUp}</span>
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-3.5 max-w-xs">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleOpenObservations(cust)}
                          className="h-7 text-[11px] gap-1.5 border-border hover:bg-primary/10 hover:text-primary"
                        >
                          <FileText className="w-3 h-3 text-primary" />
                          <span>{obsCount} observações</span>
                        </Button>
                        {latestObs && (
                          <p className="text-[11px] text-muted-foreground italic mt-1 line-clamp-1">
                            "{latestObs.text}"
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10"
                            onClick={() => handleOpenEdit(cust)}
                            title="Editar Dados do Cliente"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDelete(cust.id)}
                            title="Excluir Cliente"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Cadastro / Edição do Cliente */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-xl rounded-2xl border border-border shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="border-b border-border pb-3">
              <h2 className="text-lg font-bold text-foreground">
                {editingCustomer ? 'Editar Informações do Cliente' : 'Novo Cliente para Contato'}
              </h2>
              <p className="text-xs text-muted-foreground">
                Cadastre todos os dados essenciais para contatar o cliente futuramente.
              </p>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Empresa / Razão Social *</label>
                  <input 
                    type="text" 
                    className="w-full h-9 bg-background border border-border rounded-lg px-3 mt-1 text-xs focus:ring-1 focus:ring-primary focus:outline-none" 
                    placeholder="Ex: Condomínio Jardim Tropical"
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Nome do Decisor / Contato Principal *</label>
                  <input 
                    type="text" 
                    className="w-full h-9 bg-background border border-border rounded-lg px-3 mt-1 text-xs focus:ring-1 focus:ring-primary focus:outline-none" 
                    placeholder="Ex: Carlos Oliveira (Gerente / Síndico)"
                    value={formContactName}
                    onChange={e => setFormContactName(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Telefone / WhatsApp *</label>
                  <input 
                    type="text" 
                    className="w-full h-9 bg-background border border-border rounded-lg px-3 mt-1 text-xs font-mono focus:ring-1 focus:ring-primary focus:outline-none" 
                    placeholder="(92) 99999-9999"
                    value={formPhone}
                    onChange={e => setFormPhone(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">E-mail de Contato</label>
                  <input 
                    type="email" 
                    className="w-full h-9 bg-background border border-border rounded-lg px-3 mt-1 text-xs focus:ring-1 focus:ring-primary focus:outline-none" 
                    placeholder="contato@empresa.com"
                    value={formEmail}
                    onChange={e => setFormEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Cargo / Função</label>
                  <input 
                    type="text" 
                    className="w-full h-9 bg-background border border-border rounded-lg px-3 mt-1 text-xs focus:ring-1 focus:ring-primary focus:outline-none" 
                    placeholder="Ex: Síndico, Diretor, Comprador"
                    value={formRole}
                    onChange={e => setFormRole(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">CNPJ ou CPF</label>
                  <input 
                    type="text" 
                    className="w-full h-9 bg-background border border-border rounded-lg px-3 mt-1 text-xs font-mono focus:ring-1 focus:ring-primary focus:outline-none" 
                    placeholder="00.000.000/0001-00"
                    value={formDocument}
                    onChange={e => setFormDocument(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Segmento</label>
                  <input 
                    type="text" 
                    className="w-full h-9 bg-background border border-border rounded-lg px-3 mt-1 text-xs focus:ring-1 focus:ring-primary focus:outline-none" 
                    placeholder="Ex: Condomínio, Logística..."
                    value={formSegment}
                    onChange={e => setFormSegment(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Status do Cliente</label>
                  <select 
                    className="w-full h-9 bg-background border border-border rounded-lg px-3 mt-1 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                    value={formStatus}
                    onChange={e => setFormStatus(e.target.value as any)}
                  >
                    <option value="Ativo">Ativo (Cliente Fechado)</option>
                    <option value="Em Negociação">Em Negociação</option>
                    <option value="Contato Futuro">Contato Futuro (Follow-up)</option>
                    <option value="Implantação">Em Implantação</option>
                    <option value="Inativo">Inativo</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Cidade / Estado</label>
                  <input 
                    type="text" 
                    className="w-full h-9 bg-background border border-border rounded-lg px-3 mt-1 text-xs focus:ring-1 focus:ring-primary focus:outline-none" 
                    placeholder="Ex: Manaus - AM"
                    value={formCity}
                    onChange={e => setFormCity(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Endereço Completo</label>
                  <input 
                    type="text" 
                    className="w-full h-9 bg-background border border-border rounded-lg px-3 mt-1 text-xs focus:ring-1 focus:ring-primary focus:outline-none" 
                    placeholder="Rua, número, bairro..."
                    value={formAddress}
                    onChange={e => setFormAddress(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Melhor Horário para Contatar</label>
                  <input 
                    type="text" 
                    className="w-full h-9 bg-background border border-border rounded-lg px-3 mt-1 text-xs focus:ring-1 focus:ring-primary focus:outline-none" 
                    placeholder="Ex: Manhã (09h às 11h) ou Terças-feiras"
                    value={formBestTime}
                    onChange={e => setFormBestTime(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Data do Próximo Retorno / Follow-up</label>
                  <input 
                    type="date" 
                    className="w-full h-9 bg-background border border-border rounded-lg px-3 mt-1 text-xs focus:ring-1 focus:ring-primary focus:outline-none" 
                    value={formNextFollowUp}
                    onChange={e => setFormNextFollowUp(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">Vendedor / Atendente Responsável</label>
                <input 
                  type="text" 
                  className="w-full h-9 bg-background border border-border rounded-lg px-3 mt-1 text-xs focus:ring-1 focus:ring-primary focus:outline-none" 
                  placeholder="Nome do atendente"
                  value={formSeller}
                  onChange={e => setFormSeller(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => { setIsModalOpen(false); setEditingCustomer(null); }}
              >
                Cancelar
              </Button>
              <Button 
                size="sm"
                onClick={handleSaveCustomer}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
              >
                {editingCustomer ? 'Salvar Alterações' : 'Cadastrar Cliente'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal / Histórico de Observações do Cliente */}
      {selectedCustomerForObs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-lg rounded-2xl border border-border shadow-2xl p-6 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-border pb-3 shrink-0">
              <div>
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <span>Observações do Cliente</span>
                  <Badge variant="outline" className="text-xs">{selectedCustomerForObs.name}</Badge>
                </h3>
                <p className="text-xs text-muted-foreground">
                  Anote feedbacks, pedidos especiais, horários preferidos e detalhes de conversas.
                </p>
              </div>
            </div>

            {/* Input de nova observação */}
            <div className="space-y-2 shrink-0">
              <textarea
                rows={3}
                className="w-full bg-background border border-border rounded-xl p-3 text-xs focus:ring-1 focus:ring-primary focus:outline-none resize-none"
                placeholder="Escreva uma nova observação feita pelo cliente..."
                value={newObsText}
                onChange={e => setNewObsText(e.target.value)}
              />
              <div className="flex justify-end">
                <Button 
                  size="sm"
                  onClick={handleAddObservation}
                  disabled={!newObsText.trim()}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  Adicionar Observação
                </Button>
              </div>
            </div>

            {/* Lista cronológica de observações */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {(!selectedCustomerForObs.observations || selectedCustomerForObs.observations.length === 0) ? (
                <div className="py-8 text-center text-muted-foreground">
                  <FileText className="w-8 h-8 mx-auto mb-1.5 opacity-30" />
                  <p className="text-xs font-medium">Nenhuma observação registrada ainda.</p>
                  <p className="text-[11px] text-muted-foreground">Escreva no campo acima para salvar o primeiro feedback.</p>
                </div>
              ) : (
                selectedCustomerForObs.observations.map(obs => (
                  <div key={obs.id} className="p-3 rounded-xl bg-muted/40 border border-border flex items-start justify-between gap-3 group">
                    <div className="space-y-1">
                      <p className="text-xs text-foreground font-medium whitespace-pre-wrap">{obs.text}</p>
                      <div className="text-[10px] text-muted-foreground flex items-center gap-2">
                        <span>{obs.createdAt}</span>
                        <span>•</span>
                        <span>Por: {obs.author || 'Atendente'}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteObservation(obs.id)}
                      className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors opacity-0 group-hover:opacity-100"
                      title="Excluir observação"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-border shrink-0">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSelectedCustomerForObs(null)}
              >
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
