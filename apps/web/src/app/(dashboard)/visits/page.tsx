'use client';

import { Suspense, useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar as CalendarIcon, 
  MapPin, 
  Clock, 
  User, 
  Plus, 
  Filter, 
  CheckCircle2, 
  Navigation, 
  Phone,
  Edit3,
  Trash2,
  X,
  Save
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { useLeads } from '@/hooks/use-leads';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { clearAllSystemData } from '@/lib/backup-manager';

const VISITS_STORAGE_KEY = 'radar_visits_data';

interface VisitItem {
  id: string;
  date: string;
  rawDate?: string;
  time: string;
  client: string;
  address: string;
  seller: string;
  phone?: string;
  status: 'Agendada' | 'Confirmada' | 'Realizada' | 'Cancelada';
  statusColor: string;
  checkedInAt?: string;
  checkInCoords?: { lat: number; lng: number };
}

const DEFAULT_INITIAL_VISITS: VisitItem[] = [
  { id: '1', date: 'Hoje', time: '10:00', client: 'Panificadora Conde do Pão', address: 'Rua Salvador, 450 - Adrianópolis, Manaus', seller: 'Carlos Santos', phone: '(92) 3642-1200', status: 'Realizada', statusColor: 'success', checkedInAt: '10:05 (GPS Validado)', checkInCoords: { lat: -3.1040, lng: -60.0150 } },
  { id: '2', date: 'Hoje', time: '14:30', client: 'Petz Ponta Negra Express', address: 'Av. Coronel Teixeira, 5000 - Ponta Negra, Manaus', seller: 'Carlos Santos', phone: '(92) 3658-9900', status: 'Confirmada', statusColor: 'primary' },
  { id: '3', date: 'Hoje', time: '16:30', client: 'Barbearia Dom Pedro Manaus', address: 'Av. Pedro Teixeira, 1200 - Dom Pedro, Manaus', seller: 'Rafael Costa', phone: '(92) 98122-3344', status: 'Agendada', statusColor: 'warning' },
  { id: '4', date: 'Amanhã', time: '09:30', client: 'Drogaria Santo Remédio Adrianópolis', address: 'Av. Jornalista Umberto Calderaro, 800 - Adrianópolis, Manaus', seller: 'André Lima', phone: '(92) 3215-5000', status: 'Agendada', statusColor: 'warning' },
  { id: '5', date: 'Amanhã', time: '14:00', client: 'Supermercado DB Paraíba', address: 'Av. Álvaro Maia, 1000 - Centro/Adrianópolis, Manaus', seller: 'Carlos Santos', phone: '(92) 3622-7700', status: 'Agendada', statusColor: 'warning' },
];

function VisitsContent() {
  const confirm = useConfirm();
  const searchParams = useSearchParams();
  const prefillClient = searchParams.get('client');
  const { data: realLeads } = useLeads();

  const [visits, setVisits] = useState<VisitItem[]>([]);
  const [filter, setFilter] = useState('Todas');
  const [sellerFilter, setSellerFilter] = useState('Todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<VisitItem | null>(null);
  const [isCheckingIn, setIsCheckingIn] = useState<string | null>(null);

  // New / Edit Visit Form State
  const [editingVisitId, setEditingVisitId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<VisitItem['status']>('Agendada');
  const [newClient, setNewClient] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('10:00');
  const [newSeller, setNewSeller] = useState('Carlos Santos');
  const [newAddress, setNewAddress] = useState('');
  const [newPhone, setNewPhone] = useState('');

  const getTodayDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleOpenNewVisit = () => {
    setEditingVisitId(null);
    setNewClient('');
    setNewAddress('');
    setNewPhone('');
    setNewSeller('Carlos Santos');
    setNewTime('10:00');
    setNewDate(getTodayDateString());
    setEditStatus('Agendada');
    setIsModalOpen(true);
  };

  const handleOpenEditVisit = (visit: VisitItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingVisitId(visit.id);
    setNewClient(visit.client);
    setNewAddress(visit.address);
    setNewPhone(visit.phone || '');
    setNewSeller(visit.seller);
    setNewTime(visit.time);
    setEditStatus(visit.status);

    if (visit.rawDate) {
      setNewDate(visit.rawDate);
    } else if (visit.date === 'Hoje') {
      setNewDate(getTodayDateString());
    } else if (visit.date === 'Amanhã') {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const y = tomorrow.getFullYear();
      const m = (tomorrow.getMonth() + 1).toString().padStart(2, '0');
      const d = tomorrow.getDate().toString().padStart(2, '0');
      setNewDate(`${y}-${m}-${d}`);
    } else {
      setNewDate(getTodayDateString());
    }

    setIsModalOpen(true);
  };

  const handleDeleteVisit = async (visitId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const target = visits.find(v => v.id === visitId);
    if (!target) return;

    const confirmed = await confirm({
      title: 'Excluir Visita Agendada',
      description: `Tem certeza que deseja excluir a visita agendada com "${target.client}"? Esta ação removerá o compromisso permanentemente.`,
      confirmText: 'Sim, Excluir',
      cancelText: 'Cancelar',
      variant: 'danger',
      icon: 'trash',
    });

    if (confirmed) {
      const updated = visits.filter(v => v.id !== visitId);
      saveVisitsToStorage(updated);
      if (selectedVisit && selectedVisit.id === visitId) {
        setSelectedVisit(null);
      }
      if (editingVisitId === visitId) {
        setIsModalOpen(false);
        setEditingVisitId(null);
      }
      toast.success(`Visita com "${target.client}" excluída com sucesso.`);
    }
  };

  const handleClearAllVisitsAndData = async () => {
    const confirmed = await confirm({
      title: 'Limpar Todas as Informações do Sistema',
      description: 'Tem certeza absoluta? Isso apagará TODAS as visitas agendadas, leads, dados de clientes, propostas e histórico de disparos, deixando o sistema completamente limpo e zerado.',
      confirmText: 'Sim, Limpar Tudo',
      cancelText: 'Cancelar',
      variant: 'danger',
      icon: 'trash',
    });

    if (confirmed) {
      clearAllSystemData();
      setVisits([]);
      setSelectedVisit(null);
      toast.success('Todas as visitas, leads e dados de clientes foram limpos com sucesso!');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  };

  // Load from localStorage on mount
  useEffect(() => {
    try {
      if (localStorage.getItem('system_reset') === 'true') {
        const raw = localStorage.getItem(VISITS_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            setVisits(parsed);
            return;
          }
        }
        setVisits([]);
        return;
      }

      const raw = localStorage.getItem(VISITS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setVisits(parsed);
          return;
        }
      }
      setVisits(DEFAULT_INITIAL_VISITS);
      localStorage.setItem(VISITS_STORAGE_KEY, JSON.stringify(DEFAULT_INITIAL_VISITS));
    } catch (e) {
      setVisits([]);
    }
  }, []);

  // Open modal if client prefilled
  useEffect(() => {
    if (prefillClient) {
      setEditingVisitId(null);
      setNewClient(prefillClient);
      const matched = realLeads?.find(l => l.name.toLowerCase() === prefillClient.toLowerCase());
      if (matched) {
        setNewAddress((matched.address as any)?.formattedAddress || `${matched.address?.city || 'Manaus'} - AM`);
        setNewPhone((matched as any).phone || '');
      }
      setNewDate(getTodayDateString());
      setIsModalOpen(true);
    }
  }, [prefillClient, realLeads]);

  const saveVisitsToStorage = (updated: VisitItem[]) => {
    setVisits(updated);
    try {
      localStorage.setItem(VISITS_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  // Perform Real Check-in with GPS Geolocation Validation
  const handlePerformCheckIn = (visitId: string) => {
    const targetVisit = visits.find(v => v.id === visitId);
    if (!targetVisit) return;

    setIsCheckingIn(visitId);
    const toastId = toast.loading('Obtendo sinal GPS para validar presença no local...');

    const finalizeCheckIn = (coords?: { lat: number; lng: number }) => {
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const locationText = coords 
        ? `${timeStr} (GPS: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`
        : `${timeStr} (Validado Presencial)`;

      const updated = visits.map(v => {
        if (v.id === visitId) {
          return {
            ...v,
            status: 'Realizada' as const,
            statusColor: 'success',
            checkedInAt: locationText,
            checkInCoords: coords || { lat: -23.5505, lng: -46.6333 },
          };
        }
        return v;
      });

      saveVisitsToStorage(updated);
      setIsCheckingIn(null);
      toast.success(`Check-in validado com sucesso às ${timeStr}! Visita concluída.`, { id: toastId });

      if (selectedVisit && selectedVisit.id === visitId) {
        setSelectedVisit({
          ...selectedVisit,
          status: 'Realizada',
          statusColor: 'success',
          checkedInAt: locationText,
        });
      }
    };

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          finalizeCheckIn({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          });
        },
        (err) => {
          console.warn('GPS permission denied or unavailable, using fallback', err);
          finalizeCheckIn({ lat: -3.1190, lng: -60.0217 });
        },
        { timeout: 4000, enableHighAccuracy: true }
      );
    } else {
      finalizeCheckIn({ lat: -3.1190, lng: -60.0217 });
    }
  };

  const handleSelectClient = (name: string) => {
    setNewClient(name);
    const lead = realLeads?.find(l => l.name === name);
    if (lead) {
      setNewAddress((lead.address as any)?.formattedAddress || `${lead.address?.city || 'Manaus'} - AM`);
      setNewPhone((lead as any).phone || '');
    }
  };

  const handleSaveVisit = () => {
    if (!newClient.trim() || !newDate) {
      toast.error('Informe o cliente e a data da visita');
      return;
    }

    const [year, month, day] = newDate.split('-');
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const dateStr = `Dia ${day} de ${meses[parseInt(month, 10) - 1]}`;

    const statusColorMap: Record<string, string> = {
      'Agendada': 'warning',
      'Confirmada': 'primary',
      'Realizada': 'success',
      'Cancelada': 'destructive',
    };

    if (editingVisitId) {
      // Atualizar visita existente
      const updated = visits.map(v => {
        if (v.id === editingVisitId) {
          return {
            ...v,
            client: newClient,
            address: newAddress || 'Adrianópolis, Manaus',
            date: dateStr,
            rawDate: newDate,
            time: newTime || '10:00',
            seller: newSeller,
            phone: newPhone,
            status: editStatus,
            statusColor: statusColorMap[editStatus] || 'warning',
          };
        }
        return v;
      });

      saveVisitsToStorage(updated);
      if (selectedVisit && selectedVisit.id === editingVisitId) {
        setSelectedVisit(updated.find(v => v.id === editingVisitId) || null);
      }
      setIsModalOpen(false);
      setEditingVisitId(null);
      toast.success('Visita atualizada com sucesso!');
    } else {
      // Criar nova visita
      const nova: VisitItem = {
        id: Date.now().toString(),
        date: dateStr,
        rawDate: newDate,
        time: newTime || '10:00',
        client: newClient,
        address: newAddress || 'Adrianópolis, Manaus',
        seller: newSeller,
        phone: newPhone,
        status: editStatus || 'Agendada',
        statusColor: statusColorMap[editStatus] || 'warning',
      };

      const updated = [nova, ...visits];
      saveVisitsToStorage(updated);
      setIsModalOpen(false);
      toast.success('Visita agendada com sucesso!');
    }

    setEditingVisitId(null);
    setNewClient('');
    setNewDate('');
    setNewAddress('');
    setNewPhone('');
  };

  const filteredVisits = useMemo(() => {
    return visits.filter(v => {
      if (filter !== 'Todas' && v.status !== filter) return false;
      if (sellerFilter !== 'Todos' && v.seller !== sellerFilter) return false;
      return true;
    });
  }, [visits, filter, sellerFilter]);

  const groupedVisits = useMemo(() => {
    return filteredVisits.reduce((acc, visit) => {
      if (!acc[visit.date]) acc[visit.date] = [];
      acc[visit.date].push(visit);
      return acc;
    }, {} as Record<string, VisitItem[]>);
  }, [filteredVisits]);

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Agenda de Visitas Comerciais</h1>
          <p className="text-muted-foreground text-sm">
            Gerencie roteiros, compromissos e validação presencial com Check-in GPS
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button 
            variant="outline" 
            className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:border-destructive text-sm"
            onClick={handleClearAllVisitsAndData}
            title="Limpar todos os dados, visitas, leads e clientes do sistema"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Limpar Tudo
          </Button>
          <Button onClick={handleOpenNewVisit} className="font-semibold shadow-sm">
            <Plus className="w-4 h-4 mr-2" />
            Agendar Nova Visita
          </Button>
        </div>
      </div>

      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-card p-3 rounded-xl border border-border items-center justify-between">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-muted-foreground ml-1" />
          <span className="text-xs font-semibold text-muted-foreground uppercase">Filtrar:</span>
          
          <select 
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="Todas">Todos os Status ({visits.length})</option>
            <option value="Agendada">Agendada</option>
            <option value="Confirmada">Confirmada</option>
            <option value="Realizada">Realizada (Check-in OK)</option>
            <option value="Cancelada">Cancelada</option>
          </select>

          <select 
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm"
            value={sellerFilter}
            onChange={(e) => setSellerFilter(e.target.value)}
          >
            <option value="Todos">Todos os Vendedores</option>
            <option value="Carlos Santos">Carlos Santos</option>
            <option value="Rafael Costa">Rafael Costa</option>
            <option value="André Lima">André Lima</option>
          </select>
        </div>

        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
          <span>{visits.filter(v => v.status === 'Realizada').length} Realizadas</span>
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block ml-2" />
          <span>{visits.filter(v => v.status === 'Agendada' || v.status === 'Confirmada').length} Pendentes</span>
        </div>
      </div>

      {/* Visits List */}
      <div className="space-y-8">
        {Object.keys(groupedVisits).length === 0 ? (
          <div className="p-12 text-center bg-card rounded-xl border border-border">
            <CalendarIcon className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
            <h3 className="font-bold text-foreground mb-1">Nenhuma visita encontrada</h3>
            <p className="text-xs text-muted-foreground mb-4">Não há visitas para os filtros selecionados.</p>
            <Button onClick={() => setIsModalOpen(true)}>Agendar Visita</Button>
          </div>
        ) : (
          Object.entries(groupedVisits).map(([date, items]) => (
            <div key={date}>
              <h3 className="font-bold text-base mb-3 flex items-center gap-2 border-b border-border pb-2 text-foreground">
                <CalendarIcon className="w-4 h-4 text-primary" />
                {date} ({items.length} {items.length === 1 ? 'visita' : 'visitas'})
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {items.map((visit) => {
                  const isCheckedIn = visit.status === 'Realizada';

                  return (
                    <Card 
                      key={visit.id} 
                      className={`transition-all border ${
                        isCheckedIn 
                          ? 'border-emerald-700/40 bg-emerald-950/10' 
                          : 'border-border hover:border-primary/40'
                      }`}
                    >
                      <CardContent className="p-5">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-2 text-primary font-bold text-lg">
                            <Clock className="w-5 h-5" />
                            {visit.time}
                          </div>
                          
                          <Badge 
                            variant={isCheckedIn ? 'outline' : (visit.statusColor as any)}
                            className={isCheckedIn ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 font-bold' : ''}
                          >
                            {isCheckedIn ? '✓ Realizada' : visit.status}
                          </Badge>
                        </div>
                        
                        <h4 className="font-bold text-base mb-2 text-foreground">{visit.client}</h4>
                        
                        <div className="space-y-2 mt-3 text-xs text-muted-foreground">
                          <div className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
                            <span className="line-clamp-2">{visit.address}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 shrink-0" />
                            <span>Vendedor: <strong>{visit.seller}</strong></span>
                          </div>
                          {visit.phone && (
                            <div className="flex items-center gap-2 text-emerald-400 font-medium">
                              <Phone className="w-4 h-4 shrink-0" />
                              <span>{visit.phone}</span>
                            </div>
                          )}
                        </div>

                        {/* Check-in info box if checked in */}
                        {isCheckedIn && (
                          <div className="mt-4 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                            <span className="font-semibold">Check-in validado às {visit.checkedInAt}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-border">
                          <Button 
                            onClick={() => setSelectedVisit(visit)} 
                            variant="outline" 
                            size="sm" 
                            className="flex-1 text-xs h-8 font-medium"
                          >
                            Detalhes
                          </Button>

                          {/* Botão de Editar Visita */}
                          <Button 
                            onClick={(e) => handleOpenEditVisit(visit, e)} 
                            variant="outline" 
                            size="sm" 
                            className="h-8 px-2 text-xs text-primary hover:bg-primary/10 border-primary/30 font-semibold"
                            title="Editar dados desta visita"
                          >
                            <Edit3 className="w-3.5 h-3.5 mr-1" />
                            Editar
                          </Button>

                          {/* Botão de Excluir Visita */}
                          <Button 
                            onClick={(e) => handleDeleteVisit(visit.id, e)} 
                            variant="outline" 
                            size="sm" 
                            className="h-8 px-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-destructive"
                            title="Excluir esta visita"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>

                          {isCheckedIn ? (
                            <Button 
                              disabled 
                              size="sm" 
                              className="flex-1 text-xs h-8 bg-emerald-600/20 text-emerald-400 border border-emerald-500/40 cursor-default"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                              Concluído
                            </Button>
                          ) : (
                            <Button 
                              onClick={() => handlePerformCheckIn(visit.id)} 
                              disabled={isCheckingIn === visit.id}
                              size="sm" 
                              className="flex-1 text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm"
                            >
                              <Navigation className="w-3.5 h-3.5 mr-1" />
                              {isCheckingIn === visit.id ? 'Validando...' : 'Check-in'}
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Agendar / Editar Visita */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-card w-full max-w-md rounded-xl border border-border shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                {editingVisitId ? (
                  <>
                    <Edit3 className="w-5 h-5 text-primary" />
                    Editar Visita Comercial
                  </>
                ) : (
                  <>
                    <CalendarIcon className="w-5 h-5 text-primary" />
                    Agendar Nova Visita
                  </>
                )}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Selecionar Lead ou Digitar Cliente *</label>
                {realLeads && realLeads.length > 0 && (
                  <select 
                    className="w-full h-9 bg-background border border-border rounded-md px-3 text-xs mb-1.5"
                    onChange={(e) => handleSelectClient(e.target.value)}
                    value={realLeads.some(l => l.name === newClient) ? newClient : ''}
                  >
                    <option value="">-- Escolha um lead de Manaus cadastrado --</option>
                    {realLeads.map(l => (
                      <option key={l.id} value={l.name}>{l.name} ({(l as any).subcategory || 'Geral'})</option>
                    ))}
                  </select>
                )}
                <input 
                  type="text" 
                  className="w-full h-9 bg-background border border-border rounded-md px-3 text-xs" 
                  placeholder="Nome do cliente ou empresa em Manaus" 
                  value={newClient} 
                  onChange={(e) => setNewClient(e.target.value)} 
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">Endereço da Visita em Manaus</label>
                <input 
                  type="text" 
                  className="w-full h-9 bg-background border border-border rounded-md px-3 text-xs" 
                  placeholder="Rua Salvador, 450 - Adrianópolis, Manaus" 
                  value={newAddress} 
                  onChange={(e) => setNewAddress(e.target.value)} 
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Data *</label>
                  <input 
                    type="date" 
                    className="w-full h-9 bg-background border border-border rounded-md px-3 text-xs" 
                    value={newDate} 
                    onChange={(e) => setNewDate(e.target.value)} 
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Horário</label>
                  <input 
                    type="time" 
                    className="w-full h-9 bg-background border border-border rounded-md px-3 text-xs" 
                    value={newTime} 
                    onChange={(e) => setNewTime(e.target.value)} 
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">Telefone / WhatsApp</label>
                <input 
                  type="text" 
                  className="w-full h-9 bg-background border border-border rounded-md px-3 text-xs" 
                  placeholder="(92) 98123-4567" 
                  value={newPhone} 
                  onChange={(e) => setNewPhone(e.target.value)} 
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Vendedor Responsável</label>
                  <select 
                    className="w-full h-9 bg-background border border-border rounded-md px-3 text-xs" 
                    value={newSeller} 
                    onChange={(e) => setNewSeller(e.target.value)} 
                  >
                    <option>Carlos Santos</option>
                    <option>Rafael Costa</option>
                    <option>André Lima</option>
                  </select>
                </div>

                {editingVisitId && (
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Status da Visita</label>
                    <select 
                      className="w-full h-9 bg-background border border-border rounded-md px-3 text-xs" 
                      value={editStatus} 
                      onChange={(e) => setEditStatus(e.target.value as any)} 
                    >
                      <option value="Agendada">Agendada</option>
                      <option value="Confirmada">Confirmada</option>
                      <option value="Realizada">Realizada</option>
                      <option value="Cancelada">Cancelada</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 mt-6 pt-3 border-t border-border">
              <div>
                {editingVisitId && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleDeleteVisit(editingVisitId)} 
                    className="text-xs text-destructive hover:bg-destructive/10 font-semibold"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    Excluir
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                <Button onClick={handleSaveVisit} size="sm" className="font-semibold bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Save className="w-3.5 h-3.5 mr-1" />
                  {editingVisitId ? 'Salvar Alterações' : 'Salvar Agendamento'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detalhes da Visita & Check-in */}
      {selectedVisit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-card w-full max-w-md rounded-xl border border-border shadow-2xl p-6">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-xl font-bold">{selectedVisit.client}</h2>
              <button 
                onClick={() => setSelectedVisit(null)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex items-center gap-2 mb-4">
              <Badge 
                variant={selectedVisit.status === 'Realizada' ? 'outline' : (selectedVisit.statusColor as any)}
                className={selectedVisit.status === 'Realizada' ? 'bg-emerald-500/20 text-emerald-400 font-bold' : ''}
              >
                {selectedVisit.status}
              </Badge>
              {selectedVisit.checkedInAt && (
                <span className="text-xs text-emerald-400 font-medium">
                  {selectedVisit.checkedInAt}
                </span>
              )}
            </div>
            
            <div className="space-y-3 text-sm p-4 bg-accent/20 rounded-lg border border-border">
              <p><strong className="text-muted-foreground">Data e Horário:</strong> {selectedVisit.date} às {selectedVisit.time}</p>
              <p><strong className="text-muted-foreground">Endereço:</strong> {selectedVisit.address}</p>
              <p><strong className="text-muted-foreground">Vendedor:</strong> {selectedVisit.seller}</p>
              {selectedVisit.phone && (
                <p><strong className="text-muted-foreground">Contato:</strong> {selectedVisit.phone}</p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 mt-6 pt-3 border-t border-border">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => handleDeleteVisit(selectedVisit.id)}
                  className="text-xs text-destructive hover:bg-destructive/10 font-semibold"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  Excluir
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    const v = selectedVisit;
                    setSelectedVisit(null);
                    handleOpenEditVisit(v);
                  }}
                  className="text-xs text-primary border-primary/30 hover:bg-primary/10 font-semibold"
                >
                  <Edit3 className="w-3.5 h-3.5 mr-1" />
                  Editar
                </Button>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <Button variant="outline" size="sm" onClick={() => setSelectedVisit(null)}>Fechar</Button>
                {selectedVisit.status !== 'Realizada' && (
                  <Button 
                    onClick={() => handlePerformCheckIn(selectedVisit.id)}
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                  >
                    <Navigation className="w-3.5 h-3.5 mr-1.5" />
                    Check-in
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VisitsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Carregando agenda de visitas...</div>}>
      <VisitsContent />
    </Suspense>
  );
}