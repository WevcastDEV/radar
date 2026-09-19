'use client';

import { useLeads, useDeleteLead, useUpdateLead, useCreateLead, useBatchUpdateLeads } from '@/hooks/use-leads';
import { useFilterStore } from '@/stores/filter-store';
import { FiltersBar } from '@/components/dashboard/filters-bar';
import { Button } from '@/components/ui/button';
import { Plus, MapPin, Edit, Trash2, Eye, Folder, ExternalLink, Phone, MessageSquare, Database, Download } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { STATUS_LABELS } from '@radar/types';
import { useState, useMemo, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ImportMapsModal } from '@/components/leads/import-maps-modal';
import { BackupModal } from '@/components/leads/backup-modal';
import { clearAllSystemData } from '@/lib/backup-manager';
import toast from 'react-hot-toast';
import { detectCategory, getCategoryMeta } from '@/lib/categories';
import { BRAZIL_STATES, getStateByUF, detectStateAndCity, BRAZIL_REGIONS } from '@/lib/brazil-states';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { formatBrazilianPhone, toWhatsAppJidDigits } from '@/lib/phone-utils';
import { X, Sparkles, Building, User, DollarSign, Tag, Check, Snowflake, Flame, RotateCcw, Clock, AlertCircle, CheckSquare, Square } from 'lucide-react';

export default function LeadsPage() {
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { filters } = useFilterStore();
  const { data: leads, isLoading } = useLeads(filters);
  const { mutate: deleteLead } = useDeleteLead();
  const { mutate: updateLead } = useUpdateLead();
  const { mutate: createLead } = useCreateLead();
  const { mutate: batchUpdateLeads } = useBatchUpdateLeads();
  
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);
  const [isColdScannerOpen, setIsColdScannerOpen] = useState(false);
  const [selectedColdLeadIds, setSelectedColdLeadIds] = useState<string[]>([]);
  const [coldHoursFilter, setColdHoursFilter] = useState<number>(24);
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [selectedStateFilter, setSelectedStateFilter] = useState<string>('TODOS');
  const [editingLead, setEditingLead] = useState<any>(null);

  // Auto-abrir modal se a URL contiver ?novo=true (ex: clique no botão da sidebar)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('novo') === 'true') {
        setIsNewLeadModalOpen(true);
      }
    }
  }, []);

  // Fechar modais ao pressionar tecla ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsNewLeadModalOpen(false);
        setIsImportModalOpen(false);
        setIsBackupModalOpen(false);
        setIsColdScannerOpen(false);
        setEditingLead(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleClearAllData = async () => {
    const confirmed = await confirm({
      title: 'Limpar Todas as Informações do Sistema',
      description: 'Tem certeza absoluta? Isso apagará TODOS os leads, clientes, visitas agendadas, propostas e histórico de disparos, deixando o sistema completamente limpo e zerado.',
      confirmText: 'Sim, Limpar Tudo',
      cancelText: 'Cancelar',
      variant: 'danger',
      icon: 'trash',
    });

    if (confirmed) {
      clearAllSystemData();
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Todas as informações, leads, visitas e clientes foram limpos com sucesso!');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  };

  // New lead form state
  const [newLeadForm, setNewLeadForm] = useState({
    name: '',
    contactName: '',
    phone: '',
    address: '',
    city: 'Manaus',
    state: 'AM',
    segment: 'Comércio & Varejo',
    potentialValue: 2500,
    priority: 'HIGH' as 'HIGH' | 'MEDIUM' | 'LOW',
    notes: '',
  });
  // Calculate categories and counts dynamically
  const categoriesMap = useMemo(() => {
    if (!leads) return { all: 0, whatsapp_dispatched: 0, cold_list: 0 };
    const counts: Record<string, number> = { 
      all: leads.length,
      whatsapp_dispatched: leads.filter((l: any) => l.status === 'CONTACTED' || l.whatsappDispatchedAt).length,
      cold_list: leads.filter((l: any) => l.isCold || l.status === 'INACTIVE').length,
    };

    leads.forEach((l: any) => {
      const sub = l.subcategory || l.segment?.name || 'Outros';
      counts[sub] = (counts[sub] || 0) + 1;
    });

    return counts;
  }, [leads]);

  // Filter by selected folder tab and state (UF)
  const filteredLeads = useMemo(() => {
    if (!leads) return [];
    let list = leads;
    if (selectedStateFilter !== 'TODOS') {
      list = list.filter((l: any) => (l.address?.state || '').toUpperCase() === selectedStateFilter);
    }
    if (selectedFolder === 'all') return list;
    if (selectedFolder === 'whatsapp_dispatched') {
      return list.filter((l: any) => l.status === 'CONTACTED' || l.whatsappDispatchedAt);
    }
    if (selectedFolder === 'cold_list') {
      return list.filter((l: any) => l.isCold || l.status === 'INACTIVE');
    }
    return list.filter((l: any) => (l.subcategory || l.segment?.name) === selectedFolder);
  }, [leads, selectedFolder, selectedStateFilter]);

  // Candidatos para Lista Fria (leads com contato que não avançaram)
  const candidateColdLeads = useMemo(() => {
    if (!leads) return [];
    return leads.filter((l: any) => {
      if (l.isCold || l.status === 'INACTIVE') return false;
      const isDispatched = l.status === 'CONTACTED' || !!l.whatsappDispatchedAt;
      if (!isDispatched) return false;

      if (coldHoursFilter > 0 && l.whatsappDispatchedAt) {
        const diffMs = Date.now() - new Date(l.whatsappDispatchedAt).getTime();
        const diffHours = diffMs / (1000 * 60 * 60);
        return diffHours >= coldHoursFilter;
      }
      return true;
    });
  }, [leads, coldHoursFilter]);

  const toggleSelectAllCold = () => {
    if (selectedColdLeadIds.length === candidateColdLeads.length) {
      setSelectedColdLeadIds([]);
    } else {
      setSelectedColdLeadIds(candidateColdLeads.map((l: any) => l.id));
    }
  };

  const toggleSelectColdLead = (id: string) => {
    setSelectedColdLeadIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleMoveToCold = (lead: any) => {
    updateLead({
      id: lead.id,
      data: {
        isCold: true,
        status: 'INACTIVE',
        coldSince: new Date().toISOString(),
        coldReason: 'Sem resposta após contato'
      }
    });
    toast.success(`"${lead.name}" movido para a Lista Fria!`);
  };

  const handleRestoreActive = (lead: any) => {
    updateLead({
      id: lead.id,
      data: {
        isCold: false,
        status: 'NEW',
        coldSince: null
      }
    });
    toast.success(`"${lead.name}" restaurado para a lista ativa!`);
  };

  const handleReheatLead = (lead: any) => {
    const phone = formatBrazilianPhone(lead.phone || lead.contacts?.[0]?.value || '');
    if (!phone) {
      toast.error('Este lead não possui telefone cadastrado');
      return;
    }
    const cleanDigits = toWhatsAppJidDigits(phone);
    const firstName = (lead.contactName || lead.name).split(' ')[0];
    const text = encodeURIComponent(
      `Olá ${firstName}! Tudo bem?\n\n` +
      `Aqui é o Weverton da WCTech. Tentei contato anteriormente sobre nossas soluções para a sua empresa.\n\n` +
      `Como não tive seu retorno, imagino que a rotina esteja corrida. Ainda faz sentido batermos um papo rápido ou prefere que eu encerre os contatos por enquanto?\n\n` +
      `Fico no seu aguardo!`
    );
    window.open(`https://wa.me/${cleanDigits}?text=${text}`, '_blank');
  };

  const handleBatchMoveToCold = () => {
    if (selectedColdLeadIds.length === 0) {
      toast.error('Selecione pelo menos um lead para mover para a Lista Fria');
      return;
    }

    batchUpdateLeads({
      ids: selectedColdLeadIds,
      data: {
        isCold: true,
        status: 'INACTIVE',
        coldSince: new Date().toISOString(),
        coldReason: 'Sem resposta detectada pelo scanner'
      }
    });

    toast.success(`${selectedColdLeadIds.length} leads movidos para a Lista Fria com sucesso!`);
    setIsColdScannerOpen(false);
    setSelectedColdLeadIds([]);
  };

  const handleEdit = (lead: any) => setEditingLead({
    ...lead,
    subcategory: lead.subcategory || lead.segment?.name || ''
  });
  
  const handleSaveEdit = () => {
    if (editingLead) {
      updateLead({ 
        id: editingLead.id, 
        data: { 
          name: editingLead.name, 
          potentialValue: editingLead.potentialValue,
          phone: formatBrazilianPhone(editingLead.phone),
          subcategory: editingLead.subcategory,
        } 
      });
      toast.success('Lead atualizado com sucesso!');
      setEditingLead(null);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const confirmed = await confirm({
      title: 'Excluir Oportunidade / Lead',
      description: `Tem certeza que deseja excluir o lead "${name}"? Os dados de contato, histórico e propostas associados serão removidos.`,
      confirmText: 'Excluir Lead',
      cancelText: 'Cancelar',
      variant: 'danger',
      icon: 'trash',
    });

    if (confirmed) {
      deleteLead(id);
      toast.success('Lead removido com sucesso!');
    }
  };

  const handleCreateManualLead = () => {
    if (!newLeadForm.name.trim()) {
      toast.error('Informe o nome da empresa ou estabelecimento');
      return;
    }

    const detected = detectStateAndCity(newLeadForm.address, newLeadForm.phone);
    const targetState = newLeadForm.state || detected.state || 'AM';
    const targetCity = newLeadForm.city || detected.city || 'Manaus';
    const stObj = getStateByUF(targetState);
    const catInfo = detectCategory(newLeadForm.name, [newLeadForm.segment], newLeadForm.address || `${targetCity} - ${targetState}`);

    const chosenCategory = newLeadForm.segment && newLeadForm.segment !== 'Outro' ? newLeadForm.segment : catInfo.subcategory;

    createLead({
      name: newLeadForm.name.trim(),
      phone: formatBrazilianPhone(newLeadForm.phone, stObj?.ddds?.[0] || '92'),
      potentialValue: Number(newLeadForm.potentialValue) || 2000,
      address: {
        neighborhood: '',
        city: targetCity,
        state: targetState,
        formattedAddress: newLeadForm.address ? `${newLeadForm.address}, ${targetCity} - ${targetState}` : `${targetCity} - ${targetState}`,
        latitude: (stObj?.coordinates.lat || -3.1190) + (Math.random() * 0.04 - 0.02),
        longitude: (stObj?.coordinates.lng || -60.0217) + (Math.random() * 0.04 - 0.02),
      },
      segment: chosenCategory,
      category: catInfo.category,
      subcategory: chosenCategory,
    });

    toast.success(`Lead criado com sucesso na pasta [${chosenCategory}] (${targetState})!`);
    setIsNewLeadModalOpen(false);
    setNewLeadForm({ 
      name: '', 
      contactName: '',
      phone: '', 
      address: '', 
      city: 'Manaus', 
      state: 'AM', 
      segment: 'Comércio & Varejo', 
      potentialValue: 2500,
      priority: 'HIGH',
      notes: ''
    });
  };

  // Dynamically generate folder tabs for every single category present in the system
  const folderTabs = useMemo(() => {
    const list: Array<{ id: string; label: string; icon: string; count: number; color?: string }> = [
      { id: 'all', label: 'Todas as Pastas', icon: '📁', count: categoriesMap['all'] || 0 },
      { id: 'whatsapp_dispatched', label: 'Acionados no WhatsApp', icon: '💬', count: categoriesMap['whatsapp_dispatched'] || 0 },
      { id: 'cold_list', label: 'Lista Fria (Sem Resposta)', icon: '🧊', count: categoriesMap['cold_list'] || 0, color: '#38BDF8' },
    ];

    if (!leads || leads.length === 0) return list;

    // Discover all unique categories present in leads
    const presentCategories = new Set<string>();
    leads.forEach((l: any) => {
      const sub = l.subcategory || l.segment?.name;
      if (sub && sub !== 'all' && sub !== 'whatsapp_dispatched' && sub !== 'cold_list') {
        presentCategories.add(sub);
      }
    });

    // Create dynamic folder tabs with real-time badges and counts
    const dynamicFolders = Array.from(presentCategories).map(catName => {
      const meta = getCategoryMeta(catName);
      return {
        id: catName,
        label: meta.subcategory,
        icon: meta.badge.split(' ')[0] || '📁',
        count: categoriesMap[catName] || 0,
        color: meta.color,
      };
    });

    // Sort: highest count first, then alphabetically
    dynamicFolders.sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.label.localeCompare(b.label);
    });

    return [...list, ...dynamicFolders];
  }, [leads, categoriesMap]);

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold">Base de Leads Prospectados</h1>
          <p className="text-sm text-muted-foreground">
            {leads?.length || 0} leads organizados automaticamente por categorias e pastas
          </p>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap gap-2 w-full sm:w-auto">
          <Button 
            variant="outline" 
            className="text-primary border-primary hover:bg-primary/10 flex-1 sm:flex-initial" 
            onClick={() => setIsImportModalOpen(true)}
          >
            <MapPin className="w-4 h-4 mr-2" />
            Importar do Google Maps
          </Button>
          <Button 
            variant="outline" 
            className="border-border hover:bg-muted text-foreground flex-1 sm:flex-initial" 
            onClick={() => setIsBackupModalOpen(true)}
            title="Exportar base completa para migrar de sistema ou restaurar backup"
          >
            <Database className="w-4 h-4 mr-2 text-primary" />
            Backup & Migração
          </Button>
          <Button 
            variant="outline" 
            className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:border-destructive flex-1 sm:flex-initial" 
            onClick={handleClearAllData}
            title="Limpar todos os dados, leads, visitas e clientes do sistema"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Limpar Tudo
          </Button>
          <Button 
            variant="outline" 
            className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/15 hover:border-cyan-400 flex-1 sm:flex-initial gap-1.5" 
            onClick={() => {
              setIsColdScannerOpen(true);
              setSelectedColdLeadIds(candidateColdLeads.map(l => l.id));
            }}
            title="Escanear e mover leads sem resposta para a Lista Fria"
          >
            <Snowflake className="w-4 h-4 text-cyan-400" />
            <span>Lista Fria</span>
            {categoriesMap['cold_list'] > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-bold">
                {categoriesMap['cold_list']}
              </span>
            )}
          </Button>
          <Button 
            className="flex-1 sm:flex-initial"
            onClick={() => setIsNewLeadModalOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Lead
          </Button>
        </div>
      </div>

      {/* Modal de Importação Maps */}
      <ImportMapsModal 
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />

      {/* Modal de Backup e Migração de Dados */}
      <BackupModal 
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
      />

      {/* Categorias / Pastas Horizontais & Filtro de Estados */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pt-1">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide flex-1">
          <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 shrink-0 pr-1">
            <Folder className="w-3.5 h-3.5 text-primary" />
            Pastas:
          </span>
          {folderTabs.map((folder) => {
            const isActive = selectedFolder === folder.id;
            return (
              <button
                key={folder.id}
                onClick={() => setSelectedFolder(folder.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap border ${
                  isActive 
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm' 
                    : 'bg-card text-muted-foreground hover:text-foreground hover:bg-accent/40 border-border'
                }`}
              >
                <span>{folder.icon}</span>
                <span>{folder.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  isActive ? 'bg-primary-foreground/20 text-white' : 'bg-accent text-muted-foreground'
                }`}>
                  {folder.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Seletor de Estados do Brasil */}
        <div className="shrink-0 flex items-center gap-2 w-full sm:w-auto">
          <label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
            🇧🇷 Estado:
          </label>
          <select
            value={selectedStateFilter}
            onChange={(e) => setSelectedStateFilter(e.target.value)}
            className="h-8 px-2.5 rounded-md bg-background border border-input text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary w-full sm:w-auto"
          >
            <option value="TODOS">🇧🇷 Todos os Estados</option>
            {BRAZIL_REGIONS.map(reg => (
              <optgroup key={reg} label={`Região ${reg}`}>
                {BRAZIL_STATES.filter(s => s.region === reg).map(s => (
                  <option key={s.uf} value={s.uf}>{s.uf} - {s.name} (DDD {s.ddds.slice(0, 2).join(',')})</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      </div>

      {/* Cold List Informative Banner */}
      {selectedFolder === 'cold_list' && (
        <div className="bg-sky-950/40 border border-sky-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sky-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 shrink-0">
              <Snowflake className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-sky-100 flex items-center gap-2">
                Pasta de Leads Frios (Sem Resposta)
                <span className="text-xs px-2 py-0.5 rounded-full bg-sky-500/20 border border-sky-400/30 text-sky-300 font-mono">
                  {filteredLeads.length} leads
                </span>
              </h4>
              <p className="text-xs text-sky-300/80">
                Leads que receberam contato inicial mas não responderam. Reaqueça-os com mensagens estratégicas de encerramento ou restaure-os para ativos a qualquer momento.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => setIsColdScannerOpen(true)}
            className="bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold gap-1.5 shrink-0 shadow-sm"
          >
            <Snowflake className="w-3.5 h-3.5" />
            Escanear Leads Sem Resposta
          </Button>
        </div>
      )}

      <FiltersBar />

      {/* Table Container */}
      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-accent/50 text-muted-foreground border-b border-border">
              <tr>
                <th className="px-6 py-4">Empresa / Estabelecimento</th>
                <th className="px-6 py-4">Pasta / Categoria</th>
                <th className="px-6 py-4 text-center">Score IA</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Localização</th>
                <th className="px-6 py-4">Contato Direto</th>
                <th className="px-6 py-4">Valor Estimado</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">
                    Carregando leads...
                  </td>
                </tr>
              ) : filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">
                    <p className="font-medium text-foreground mb-1">Nenhum lead encontrado nesta pasta.</p>
                    <p className="text-xs">Use o botão "Importar do Google Maps" para prospectar e adicionar novos estabelecimentos.</p>
                  </td>
                </tr>
              ) : filteredLeads.map((lead: any) => {
                const subcategory = lead.subcategory || lead.segment?.name || 'Comércio';
                const catInfo = detectCategory(lead.name, [subcategory], lead.address?.city || '');
                const phone = formatBrazilianPhone(lead.phone || lead.contacts?.[0]?.value || '');

                return (
                  <tr key={lead.id} className="hover:bg-accent/20 transition-colors">
                    {/* Nome do Lead */}
                    <td className="px-6 py-4 font-semibold">
                      <Link 
                        href={`/leads/${lead.id}`} 
                        className="text-foreground hover:text-primary transition-colors flex items-center gap-1.5"
                      >
                        {lead.name}
                      </Link>
                      {lead.address?.formattedAddress && (
                        <p className="text-xs font-normal text-muted-foreground truncate max-w-xs mt-0.5">
                          {lead.address.formattedAddress}
                        </p>
                      )}
                    </td>

                    {/* Pasta / Segmento */}
                    <td className="px-6 py-4">
                      <span 
                        className="text-xs px-2.5 py-1 rounded-md font-semibold inline-flex items-center gap-1 border"
                        style={{ 
                          backgroundColor: `${catInfo.color}15`, 
                          color: catInfo.color,
                          borderColor: `${catInfo.color}35`
                        }}
                      >
                        <span>{catInfo.badge.split(' ')[0]}</span>
                        <span>{subcategory}</span>
                      </span>
                    </td>

                    {/* Score */}
                    <td className="px-6 py-4 text-center">
                      <div 
                        className="w-8 h-8 mx-auto rounded-full border-2 flex items-center justify-center font-bold text-xs" 
                        style={{ 
                          borderColor: (lead.score?.total || 50) >= 70 ? '#10B981' : '#F59E0B',
                          color: (lead.score?.total || 50) >= 70 ? '#10B981' : '#F59E0B'
                        }}
                      >
                        {lead.score?.total || 50}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      {lead.isCold || lead.status === 'INACTIVE' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-500/10 text-sky-400 border border-sky-500/30">
                          <Snowflake className="w-3 h-3" />
                          Lista Fria
                        </span>
                      ) : (
                        <Badge variant="outline">{(STATUS_LABELS as Record<string, string>)[lead.status as string] || 'Novo'}</Badge>
                      )}
                    </td>

                    {/* Localização */}
                    <td className="px-6 py-4 text-muted-foreground text-xs">
                      <div className="flex items-center gap-1.5">
                        {lead.address?.state && (
                          <span className="px-1.5 py-0.2 rounded bg-accent text-[10px] font-bold text-foreground border border-border">
                            {lead.address.state}
                          </span>
                        )}
                        <span>{[lead.address?.neighborhood, lead.address?.city].filter(Boolean).join(', ') || [lead.address?.city, lead.address?.state].filter(Boolean).join(' - ') || 'Brasil'}</span>
                      </div>
                    </td>

                    {/* Contato Direto */}
                    <td className="px-6 py-4 text-xs">
                      {phone ? (
                        <a 
                          href={`https://wa.me/${toWhatsAppJidDigits(phone)}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-emerald-400 font-medium hover:underline"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          {phone}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">Não informado</span>
                      )}
                    </td>

                    {/* Valor Estimado */}
                    <td className="px-6 py-4 font-semibold text-foreground">
                      {formatCurrency(lead.potentialValue || 2500)}
                    </td>

                    {/* Ações */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center gap-1 justify-end">
                        {lead.isCold || lead.status === 'INACTIVE' ? (
                          <>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 px-2 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 text-xs font-bold gap-1" 
                              onClick={() => handleReheatLead(lead)}
                              title="Reaquecer no WhatsApp com mensagem de encerramento"
                            >
                              <Flame className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Reaquecer</span>
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-sky-400 hover:text-sky-300 hover:bg-sky-500/10" 
                              onClick={() => handleRestoreActive(lead)}
                              title="Restaurar para Lead Ativo"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </Button>
                          </>
                        ) : (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-muted-foreground hover:text-sky-400 hover:bg-sky-500/10" 
                            onClick={() => handleMoveToCold(lead)}
                            title="Mover para Lista Fria (Sem Resposta)"
                          >
                            <Snowflake className="w-4 h-4" />
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-primary" 
                          onClick={() => router.push(`/leads/${lead.id}`)}
                          title="Visualizar Lead"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-primary" 
                          onClick={() => handleEdit(lead)}
                          title="Editar Lead"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-destructive" 
                          onClick={() => handleDelete(lead.id, lead.name)}
                          title="Excluir Lead"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Editar Lead */}
      {editingLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-card w-full max-w-md rounded-xl border border-border shadow-2xl p-6">
            <h2 className="text-xl font-bold mb-4">Editar Lead</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground">Nome do Estabelecimento</label>
                <input 
                  type="text" 
                  className="w-full h-10 bg-background border border-border rounded-md px-3 mt-1" 
                  value={editingLead.name}
                  onChange={(e) => setEditingLead({...editingLead, name: e.target.value})}
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Telefone / WhatsApp</label>
                <input 
                  type="text" 
                  className="w-full h-10 bg-background border border-border rounded-md px-3 mt-1" 
                  value={editingLead.phone || ''}
                  onChange={(e) => setEditingLead({...editingLead, phone: e.target.value})}
                  placeholder="(11) 99999-9999"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Pasta / Categoria</label>
                <input 
                  type="text" 
                  className="w-full h-10 bg-background border border-border rounded-md px-3 mt-1" 
                  value={editingLead.subcategory || ''}
                  onChange={(e) => setEditingLead({...editingLead, subcategory: e.target.value})}
                  placeholder="Ex: Padaria, Pet Shop, Hotelaria, Odontologia..."
                />
                <p className="text-[11px] text-muted-foreground mt-1">Ao definir uma nova categoria, a pasta correspondente será criada e sincronizada automaticamente.</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Valor Potencial Estimado (R$)</label>
                <input 
                  type="number" 
                  className="w-full h-10 bg-background border border-border rounded-md px-3 mt-1" 
                  value={editingLead.potentialValue || ''}
                  onChange={(e) => setEditingLead({...editingLead, potentialValue: Number(e.target.value)})}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setEditingLead(null)}>Cancelar</Button>
              <Button onClick={handleSaveEdit}>Salvar Alterações</Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Novo Lead Manual - Layout Aprimorado Enterprise */}
      {isNewLeadModalOpen && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setIsNewLeadModalOpen(false); }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-card w-full max-w-2xl rounded-2xl border border-border shadow-2xl overflow-hidden my-6 flex flex-col cursor-default animate-in fade-in zoom-in-95 duration-200"
          >
            {/* Header do Modal */}
            <div className="p-4 sm:p-5 border-b border-border bg-accent/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">Cadastrar Nova Oportunidade</h2>
                  <p className="text-xs text-muted-foreground">Adicione um novo lead manual para prospecção no mapa e pipeline</p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsNewLeadModalOpen(false)}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Conteúdo do Formulário */}
            <div className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Linha 1: Nome da Empresa e Decisor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5 mb-1">
                    <Building className="w-3.5 h-3.5 text-primary" />
                    Nome da Empresa / Estabelecimento *
                  </label>
                  <input 
                    type="text" 
                    className="w-full h-9 bg-background border border-border rounded-lg px-3 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary" 
                    placeholder="Ex: Padaria & Confeitaria Modelo"
                    value={newLeadForm.name}
                    onChange={(e) => setNewLeadForm({...newLeadForm, name: e.target.value})}
                    autoFocus
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5 mb-1">
                    <User className="w-3.5 h-3.5 text-primary" />
                    Responsável / Decisor Principal
                  </label>
                  <input 
                    type="text" 
                    className="w-full h-9 bg-background border border-border rounded-lg px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary" 
                    placeholder="Ex: Carlos Mendonça (Gerente / Síndico)"
                    value={newLeadForm.contactName}
                    onChange={(e) => setNewLeadForm({...newLeadForm, contactName: e.target.value})}
                  />
                </div>
              </div>

              {/* Linha 2: Telefone/WhatsApp e Categoria */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5 mb-1">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    Telefone / WhatsApp Comercial *
                  </label>
                  <input 
                    type="text" 
                    className="w-full h-9 bg-background border border-border rounded-lg px-3 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary" 
                    placeholder="Ex: (92) 99123-4567 ou 92981087241"
                    value={newLeadForm.phone}
                    onChange={(e) => setNewLeadForm({...newLeadForm, phone: e.target.value})}
                  />
                  <span className="text-[10px] text-muted-foreground mt-0.5 block">Formatado automaticamente para envio de mensagens</span>
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5 mb-1">
                    <Tag className="w-3.5 h-3.5 text-primary" />
                    Segmento / Pasta do Sistema
                  </label>
                  <select
                    value={newLeadForm.segment}
                    onChange={(e) => setNewLeadForm({...newLeadForm, segment: e.target.value})}
                    className="w-full h-9 bg-background border border-border rounded-lg px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    <option value="Comércio & Varejo">🛒 Comércio & Varejo Geral</option>
                    <option value="Padaria & Confeitaria">🥖 Padaria & Confeitaria</option>
                    <option value="Supermercado & Mercadinho">🏪 Supermercado & Mercadinho</option>
                    <option value="Condomínio Residencial">🏢 Condomínio Residencial / Comercial</option>
                    <option value="Clínica & Saúde">🩺 Clínica, Consultório & Odontologia</option>
                    <option value="Restaurante & Gastronomia">🍽️ Restaurante, Bar & Alimentação</option>
                    <option value="Oficina & Mecânica">🔧 Oficina Mecânica & Auto Peças</option>
                    <option value="Hotelaria & Pousada">🏨 Hotelaria & Pousadas</option>
                    <option value="Educação & Escolas">📚 Escola, Curso & Faculdade</option>
                    <option value="Indústria & Logística">🏭 Indústria & Galpão Logístico</option>
                    <option value="Prestação de Serviços">💼 Prestação de Serviços</option>
                    <option value="Outro">📁 Outro segmento personalizado...</option>
                  </select>
                </div>
              </div>

              {/* Linha 3: Localização (Estado, Cidade e Endereço) */}
              <div className="p-3.5 rounded-xl bg-accent/20 border border-border space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Estado (UF)</label>
                    <select
                      value={newLeadForm.state}
                      onChange={(e) => {
                        const uf = e.target.value;
                        const s = getStateByUF(uf);
                        setNewLeadForm({
                          ...newLeadForm,
                          state: uf,
                          city: s ? s.capital : newLeadForm.city,
                        });
                      }}
                      className="w-full h-9 bg-background border border-border rounded-lg px-3 text-xs text-foreground mt-1 cursor-pointer"
                    >
                      {BRAZIL_REGIONS.map(reg => (
                        <optgroup key={reg} label={`Região ${reg}`}>
                          {BRAZIL_STATES.filter(s => s.region === reg).map(s => (
                            <option key={s.uf} value={s.uf}>{s.uf} - {s.name}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Cidade</label>
                    <input 
                      type="text" 
                      className="w-full h-9 bg-background border border-border rounded-lg px-3 text-xs text-foreground mt-1" 
                      placeholder="Ex: Manaus"
                      value={newLeadForm.city}
                      onChange={(e) => setNewLeadForm({...newLeadForm, city: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Endereço Completo / Bairro</label>
                  <input 
                    type="text" 
                    className="w-full h-9 bg-background border border-border rounded-lg px-3 text-xs text-foreground mt-1" 
                    placeholder="Ex: Av. Djalma Batista, 1000 - Nossa Senhora das Graças"
                    value={newLeadForm.address}
                    onChange={(e) => setNewLeadForm({...newLeadForm, address: e.target.value})}
                  />
                </div>
              </div>

              {/* Linha 4: Valor Potencial e Prioridade */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5 mb-1">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                    Valor Estimado do Contrato (R$)
                  </label>
                  <input 
                    type="number" 
                    className="w-full h-9 bg-background border border-border rounded-lg px-3 text-xs font-bold text-emerald-400 focus:outline-none focus:ring-1 focus:ring-primary" 
                    value={newLeadForm.potentialValue}
                    onChange={(e) => setNewLeadForm({...newLeadForm, potentialValue: Number(e.target.value)})}
                  />
                  <span className="text-[10px] text-muted-foreground mt-0.5 block">Usado para cálculo do total no Pipeline Kanban</span>
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5 mb-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Nível de Prioridade
                  </label>
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setNewLeadForm({...newLeadForm, priority: 'HIGH'})}
                      className={`h-9 rounded-lg border text-xs font-bold transition-all ${
                        newLeadForm.priority === 'HIGH'
                          ? 'bg-red-500/20 text-red-400 border-red-500 shadow-sm'
                          : 'bg-background hover:bg-accent text-muted-foreground border-border'
                      }`}
                    >
                      🔥 Alta
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewLeadForm({...newLeadForm, priority: 'MEDIUM'})}
                      className={`h-9 rounded-lg border text-xs font-bold transition-all ${
                        newLeadForm.priority === 'MEDIUM'
                          ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500 shadow-sm'
                          : 'bg-background hover:bg-accent text-muted-foreground border-border'
                      }`}
                    >
                      ⚡ Média
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewLeadForm({...newLeadForm, priority: 'LOW'})}
                      className={`h-9 rounded-lg border text-xs font-bold transition-all ${
                        newLeadForm.priority === 'LOW'
                          ? 'bg-blue-500/20 text-blue-400 border-blue-500 shadow-sm'
                          : 'bg-background hover:bg-accent text-muted-foreground border-border'
                      }`}
                    >
                      📋 Normal
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Rodapé de Ações */}
            <div className="p-4 border-t border-border bg-accent/20 flex items-center justify-between">
              <span className="text-xs text-muted-foreground hidden sm:inline">
                Pressione <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono border">ESC</kbd> para cancelar
              </span>
              <div className="flex gap-2.5 w-full sm:w-auto justify-end">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsNewLeadModalOpen(false)}
                  className="text-xs h-9 px-4"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleCreateManualLead} 
                  size="sm" 
                  className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold h-9 px-5 gap-1.5 shadow-md"
                >
                  <Check className="w-4 h-4" />
                  Cadastrar Oportunidade
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Scanner de Leads Sem Resposta (Lista Fria) */}
      {isColdScannerOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsColdScannerOpen(false)}
        >
          <div 
            className="bg-card w-full max-w-2xl rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-5 border-b border-border bg-gradient-to-r from-sky-950/40 via-card to-card flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 shrink-0">
                  <Snowflake className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    Scanner de Clientes Sem Resposta
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30">
                      Lista Fria
                    </span>
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Identifique automaticamente clientes que foram abordados ou contatados via WhatsApp mas ainda não deram retorno.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsColdScannerOpen(false)} 
                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                title="Fechar (ESC)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filtro de Tempo e Ações Rápidas */}
            <div className="p-4 border-b border-border bg-accent/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-sky-400 shrink-0" />
                <span className="text-xs font-semibold text-muted-foreground">Período sem resposta:</span>
                <select
                  value={coldHoursFilter}
                  onChange={(e) => setColdHoursFilter(Number(e.target.value))}
                  className="h-8 px-2.5 rounded-lg bg-background border border-border text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value={0}>Todos os contatados sem retorno</option>
                  <option value={24}>Há mais de 24 horas</option>
                  <option value={48}>Há mais de 48 horas (Recomendado)</option>
                  <option value={168}>Há mais de 7 dias (Muito Frios)</option>
                </select>
              </div>

              {candidateColdLeads.length > 0 && (
                <button
                  type="button"
                  onClick={toggleSelectAllCold}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-400 hover:text-sky-300 transition-colors"
                >
                  {selectedColdLeadIds.length === candidateColdLeads.length ? (
                    <CheckSquare className="w-4 h-4 text-sky-400" />
                  ) : (
                    <Square className="w-4 h-4 text-muted-foreground" />
                  )}
                  <span>
                    {selectedColdLeadIds.length === candidateColdLeads.length ? 'Desmarcar Todos' : `Selecionar Todos (${candidateColdLeads.length})`}
                  </span>
                </button>
              )}
            </div>

            {/* Lista de Leads Detectados */}
            <div className="p-4 overflow-y-auto flex-1 divide-y divide-border space-y-2">
              {candidateColdLeads.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3">
                    <Check className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-foreground mb-1">Nenhum cliente pendente de resposta!</h4>
                  <p className="text-xs max-w-md mx-auto">
                    Todos os seus leads contatados dentro deste critério já responderam, viraram clientes ou já foram transferidos para a Lista Fria.
                  </p>
                </div>
              ) : (
                candidateColdLeads.map((lead: any) => {
                  const isSelected = selectedColdLeadIds.includes(lead.id);
                  const phone = formatBrazilianPhone(lead.phone || lead.contacts?.[0]?.value || '');
                  const dispatchedDate = lead.whatsappDispatchedAt 
                    ? new Date(lead.whatsappDispatchedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
                    : null;

                  return (
                    <div 
                      key={lead.id}
                      onClick={() => toggleSelectColdLead(lead.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected 
                          ? 'bg-sky-500/10 border-sky-500/40' 
                          : 'bg-card hover:bg-accent/40 border-border'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input 
                          type="checkbox" 
                          checked={isSelected}
                          onChange={() => {}} // Controlled via row click
                          className="w-4 h-4 rounded text-sky-500 border-border focus:ring-sky-500"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-foreground">{lead.name}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-accent text-muted-foreground font-semibold">
                              {lead.subcategory || lead.segment?.name || 'Geral'}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-1">
                            {lead.contactName && <span>Contato: <strong className="text-foreground">{lead.contactName}</strong></span>}
                            {phone && <span>{phone}</span>}
                            {dispatchedDate && (
                              <span className="text-amber-400 font-medium flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Disparado em {dispatchedDate}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-bold text-foreground block">
                          {formatCurrency(lead.potentialValue || 2500)}
                        </span>
                        <span className="text-[10px] text-sky-400 font-medium">
                          {isSelected ? '✓ Marcado' : 'Clique para marcar'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border bg-accent/20 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                <strong className="text-sky-400 font-bold">{selectedColdLeadIds.length}</strong> de {candidateColdLeads.length} leads selecionados
              </span>
              <div className="flex items-center gap-2.5">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsColdScannerOpen(false)}
                  className="text-xs h-9 px-4"
                >
                  Cancelar
                </Button>
                <Button 
                  size="sm" 
                  disabled={selectedColdLeadIds.length === 0}
                  onClick={handleBatchMoveToCold}
                  className="bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white text-xs font-bold h-9 px-4 gap-1.5 shadow-md"
                >
                  <Snowflake className="w-4 h-4" />
                  Mover Selecionados para Lista Fria ({selectedColdLeadIds.length})
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
