import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LeadListItem, LeadDetail, CreateLeadRequest, LeadFilters, ScoreLevel, Priority, LeadStatus, ContactType } from '@radar/types';
import { detectCategory } from '@/lib/categories';
import { detectStateAndCity, getStateByUF } from '@/lib/brazil-states';
import { formatBrazilianPhone, extractBrazilianNationalDigits } from '@/lib/phone-utils';
import axios from 'axios';

const STORAGE_KEY = 'radar_leads_data';
export const WHATSAPP_DISPATCHED_KEY = 'radar_whatsapp_dispatched_history';

// Helper to calculate score for a lead based on real parameters
export function calculateLeadScore(lead: Partial<LeadListItem> & { phone?: string; website?: string; rating?: number }): { total: number; level: ScoreLevel; factors: any[] } {
  let score = 50;
  const factors: any[] = [];

  if (lead.phone) {
    score += 15;
    factors.push({ factor: 'Telefone comercial verificado disponível', points: 15, label: 'Contato' });
  }

  if (lead.website) {
    score += 10;
    factors.push({ factor: 'Presença digital com website oficial', points: 10, label: 'Presença Digital' });
  }

  if (lead.rating && lead.rating >= 4.0) {
    score += 15;
    factors.push({ factor: `Boa reputação Google Maps (${lead.rating} estrelas)`, points: 15, label: 'Reputação' });
  }

  const cat = (lead as any).subcategory || (lead as any).segment?.name || '';
  if (['Padaria', 'Supermercado', 'Pet Shop', 'Restaurante', 'Barbearia'].some(s => cat.includes(s))) {
    score += 15;
    factors.push({ factor: `Segmento de alto fluxo comercial em Manaus (${cat})`, points: 15, label: 'Segmento' });
  } else {
    factors.push({ factor: 'Segmento comercial regional Manaus', points: 10, label: 'Segmento' });
  }

  const finalTotal = Math.min(100, Math.max(10, score));
  let level = ScoreLevel.MEDIUM;
  if (finalTotal >= 80) level = ScoreLevel.HIGH;
  else if (finalTotal >= 65) level = ScoreLevel.GOOD;
  else if (finalTotal < 40) level = ScoreLevel.LOW;

  return { total: finalTotal, level, factors };
}

// Initial default seed for MANAUS - AM
const generateInitialLeads = (): LeadListItem[] => {
  const seedNames = [
    { name: 'Panificadora Conde do Pão', cat: 'Padaria', neighborhood: 'Adrianópolis', city: 'Manaus', state: 'AM', lat: -3.1040, lng: -60.0150, phone: '(92) 99142-1200' },
    { name: 'Petz Ponta Negra Express', cat: 'Pet Shop', neighborhood: 'Ponta Negra', city: 'Manaus', state: 'AM', lat: -3.0760, lng: -60.0820, phone: '(92) 98158-9900' },
    { name: 'Barbearia Dom Pedro Manaus', cat: 'Barbearia', neighborhood: 'Dom Pedro', city: 'Manaus', state: 'AM', lat: -3.0980, lng: -60.0450, phone: '(92) 98122-3344' },
    { name: 'Drogaria Santo Remédio Adrianópolis', cat: 'Farmácia', neighborhood: 'Adrianópolis', city: 'Manaus', state: 'AM', lat: -3.1120, lng: -60.0130, phone: '(92) 99215-5000' },
    { name: 'Supermercado DB Paraíba', cat: 'Supermercado', neighborhood: 'Adrianópolis', city: 'Manaus', state: 'AM', lat: -3.1180, lng: -60.0210, phone: '(92) 99322-7700' },
    { name: 'Restaurante Banzeiro Gastronomia', cat: 'Restaurante', neighborhood: 'Nossa Sra. das Graças', city: 'Manaus', state: 'AM', lat: -3.1145, lng: -60.0220, phone: '(92) 98234-1621' },
    { name: 'Academia Live Fitness Vieiralves', cat: 'Academia', neighborhood: 'Vieiralves', city: 'Manaus', state: 'AM', lat: -3.1090, lng: -60.0180, phone: '(92) 99188-4455' },
  ];

  return seedNames.map((s, i) => {
    const catInfo = detectCategory(s.name, [s.cat], s.city);
    return {
      id: `lead-manaus-${i + 1}`,
      name: s.name,
      tradeName: s.name,
      segment: {
        id: `seg-${i + 1}`,
        name: catInfo.subcategory,
        icon: catInfo.icon,
        color: catInfo.color,
      },
      category: catInfo.category,
      subcategory: catInfo.subcategory,
      status: LeadStatus.NEW,
      priority: Priority.HIGH,
      score: {
        total: 80 + (i % 4) * 5,
        level: ScoreLevel.HIGH,
      },
      address: {
        neighborhood: s.neighborhood,
        city: s.city,
        state: s.state,
        formattedAddress: `${s.neighborhood}, Manaus - AM`,
        latitude: s.lat,
        longitude: s.lng,
      },
      potentialValue: 3500 + i * 900,
      distance: +(1.2 + i * 0.8).toFixed(1),
      createdAt: new Date(Date.now() - i * 3600000 * 4).toISOString(),
      phone: s.phone,
    } as any;
  });
};

export function getStoredLeads(): LeadListItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {

        // Normalização e limpeza de todos os telefones: remove DDI 55 e padroniza para (DD) 9XXXX-XXXX
        let phoneChanged = false;
        const updatedPhones = parsed.map(l => {
          let currentPhone = l.phone || '';
          if (typeof currentPhone === 'string' && currentPhone.startsWith('(92) 3')) {
            currentPhone = currentPhone.replace('(92) 3', '(92) 99');
          }
          const leadUF = l.address?.state;
          const stObj = leadUF ? getStateByUF(leadUF) : null;
          const defaultDDD = stObj?.ddds?.[0] || '92';
          const formatted = formatBrazilianPhone(currentPhone, defaultDDD);
          if (formatted && formatted !== l.phone) {
            phoneChanged = true;
            return {
              ...l,
              phone: formatted,
            };
          }
          return l;
        });
        if (phoneChanged) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPhones));
          return updatedPhones;
        }

        return parsed;
      }
    }
    if (localStorage.getItem('system_reset') === 'true') {
      return [];
    }
    const initial = generateInitialLeads();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  } catch (e) {
    console.error('Error reading leads from localStorage:', e);
    return [];
  }
}

export function saveStoredLeads(leads: LeadListItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
  } catch (e) {
    console.error('Error saving leads to localStorage:', e);
  }
}

// WhatsApp Dispatched History Management
export interface DispatchedLeadRecord {
  leadId: string;
  leadName: string;
  phone: string;
  category: string;
  date: string;       // e.g. "07/09/2026"
  dateLabel: string;  // e.g. "Hoje, 07 de Setembro de 2026"
  time: string;       // e.g. "14:32:05"
  messageSent: string;
  templateName: string;
  status: 'SENT' | 'FAILED';
  hasImage?: boolean;
  imageUrl?: string;
}

export function getDispatchedHistory(): DispatchedLeadRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(WHATSAPP_DISPATCHED_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map(p => ({
          ...p,
          imageUrl: p.imageUrl && p.imageUrl.startsWith('data:image') ? undefined : p.imageUrl,
        }));
      }
    }
    return [];
  } catch (e) {
    return [];
  }
}

export function saveDispatchedHistoryLocally(history: DispatchedLeadRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    const sanitized = history.map(h => ({
      ...h,
      imageUrl: h.imageUrl && h.imageUrl.startsWith('data:image') ? undefined : h.imageUrl,
    }));
    localStorage.setItem(WHATSAPP_DISPATCHED_KEY, JSON.stringify(sanitized));
  } catch (e) {
    console.warn('Erro ao salvar histórico de disparos no localStorage:', e);
  }
}

// Sincroniza o histórico com o servidor permanente para nunca perder clientes mesmo após limpar cache
export async function syncDispatchedHistoryWithServer(): Promise<DispatchedLeadRecord[]> {
  try {
    const res = await axios.get('http://localhost:3001/api/whatsapp/history', { timeout: 4000 });
    const serverData = res.data?.data || res.data;
    if (Array.isArray(serverData)) {
      const local = getDispatchedHistory();
      const map = new Map<string, DispatchedLeadRecord>();
      
      // Insere dados do servidor
      serverData.forEach((item: any) => {
        const key = `${item.leadId}_${item.date}`;
        map.set(key, item);
      });
      
      // Mescla com dados locais não sincronizados
      local.forEach(item => {
        const key = `${item.leadId}_${item.date}`;
        if (!map.has(key)) map.set(key, item);
      });

      const merged = Array.from(map.values());
      saveDispatchedHistoryLocally(merged);

      // Também sincroniza o status dos leads locais para CONTACTED
      const leads = getStoredLeads();
      let leadsChanged = false;
      const dispatchedIdSet = new Set(merged.map(m => m.leadId));
      const dispatchedPhoneSet = new Set<string>();
      merged.forEach(m => {
        const digits = (m.phone || '').replace(/\D/g, '');
        if (digits.length >= 8) {
          dispatchedPhoneSet.add(digits);
          if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
            dispatchedPhoneSet.add(digits.slice(2));
          }
        }
      });

      const updatedLeads = leads.map(l => {
        const leadPhoneDigits = ((l as any).phone || (l as any).contacts?.[0]?.value || '').replace(/\D/g, '');
        const leadNat = leadPhoneDigits.startsWith('55') && (leadPhoneDigits.length === 12 || leadPhoneDigits.length === 13)
          ? leadPhoneDigits.slice(2)
          : leadPhoneDigits;

        const isDispatched = dispatchedIdSet.has(l.id) || 
          (leadPhoneDigits && (dispatchedPhoneSet.has(leadPhoneDigits) || dispatchedPhoneSet.has(leadNat)));

        if (isDispatched && l.status === LeadStatus.NEW) {
          leadsChanged = true;
          return {
            ...l,
            status: LeadStatus.CONTACTED,
            lastContactAt: new Date().toISOString(),
          };
        }
        return l;
      });
      if (leadsChanged) {
        saveStoredLeads(updatedLeads);
      }

      return merged;
    }
  } catch (e) {
    // Se o servidor estiver indisponível no momento, usa o histórico local
  }
  return getDispatchedHistory();
}

export function markLeadAsDispatched(record: DispatchedLeadRecord): void {
  if (typeof window === 'undefined') return;
  try {
    const sanitized: DispatchedLeadRecord = {
      ...record,
      imageUrl: record.imageUrl && record.imageUrl.startsWith('data:image') ? undefined : record.imageUrl,
    };

    const current = getDispatchedHistory();
    // Evita duplicatas
    const updatedHistory = [sanitized, ...current.filter(r => !(r.leadId === sanitized.leadId && r.date === sanitized.date))];
    saveDispatchedHistoryLocally(updatedHistory);

    // Salva também no servidor de forma permanente em disco
    axios.post('http://localhost:3001/api/whatsapp/history', sanitized, { timeout: 5000 }).catch(err => {
      console.warn('Aviso: Não foi possível salvar histórico no servidor:', err?.message);
    });

    // Atualiza status do lead para CONTACTED
    const leads = getStoredLeads();
    const updatedLeads = leads.map(l => {
      if (l.id === record.leadId) {
        return {
          ...l,
          status: LeadStatus.CONTACTED,
          lastContactAt: new Date().toISOString(),
          whatsappDispatchedAt: `${record.date} ${record.time}`,
        };
      }
      return l;
    });
    saveStoredLeads(updatedLeads);
  } catch (e) {
    console.error('Error recording dispatched lead:', e);
  }
}

export function clearDispatchedHistory(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(WHATSAPP_DISPATCHED_KEY);
  axios.delete('http://localhost:3001/api/whatsapp/history', { timeout: 4000 }).catch(e => {
    console.warn('Aviso: Não foi possível limpar histórico no servidor:', e?.message);
  });
}

export function useLeads(filters?: LeadFilters) {
  return useQuery({
    queryKey: ['leads', filters],
    queryFn: async () => {
      const all = getStoredLeads();
      if (!filters) return all;
      return all.filter(lead => {
        if (filters.status && lead.status !== filters.status) return false;
        if (filters.priority && lead.priority !== filters.priority) return false;
        if (filters.segmentId && lead.segment?.id !== filters.segmentId) return false;
        if (filters.state && filters.state !== 'TODOS') {
          const leadState = (lead.address?.state || '').toUpperCase();
          if (leadState !== filters.state.toUpperCase()) return false;
        }
        if (filters.scoreMin && (lead.score?.total || 0) < filters.scoreMin) return false;
        if (filters.search) {
          const q = filters.search.toLowerCase();
          const matchesName = lead.name?.toLowerCase().includes(q);
          const matchesTrade = lead.tradeName?.toLowerCase().includes(q);
          const matchesCity = lead.address?.city?.toLowerCase().includes(q);
          const matchesSub = (lead as any).subcategory?.toLowerCase().includes(q);
          if (!matchesName && !matchesTrade && !matchesCity && !matchesSub) return false;
        }
        return true;
      });
    },
  });
}

export function useLead(id: string) {
  return useQuery({
    queryKey: ['leads', id],
    queryFn: async () => {
      const leads = getStoredLeads();
      const baseLead = leads.find(l => l.id === id) || leads[0];
      if (!baseLead) return null;

      const catInfo = detectCategory(
        baseLead.name,
        [(baseLead as any).subcategory || baseLead.segment?.name || ''],
        baseLead.address?.city || 'Manaus'
      );

      const phone = (baseLead as any).phone || '(92) 99999-9999';
      const website = (baseLead as any).website || '';
      const scoreCalc = calculateLeadScore({ ...baseLead, phone, website });

      const detail: LeadDetail = {
        ...baseLead,
        segment: {
          id: baseLead.segment?.id || 'seg-1',
          name: (baseLead as any).subcategory || baseLead.segment?.name || catInfo.subcategory,
          icon: catInfo.icon,
          color: catInfo.color,
        },
        category: (baseLead as any).category || catInfo.category,
        subcategory: (baseLead as any).subcategory || catInfo.subcategory,
        isNightOperation: false,
        is24hOperation: false,
        hasHighTraffic: true,
        hasLargeExterior: false,
        isNewBusiness: false,
        hasMultipleBranches: false,
        contacts: [
          { id: 'c1', type: ContactType.WHATSAPP, value: phone, isPrimary: true, label: 'WhatsApp Principal' },
          ...(website ? [{ id: 'c2', type: ContactType.WEBSITE, value: website, isPrimary: false, label: 'Website' }] : []),
        ],
        scoreFactors: (baseLead as any).scoreFactors || scoreCalc.factors,
        score: baseLead.score || { total: scoreCalc.total, level: scoreCalc.level },
      } as any;

      return detail;
    },
    enabled: !!id,
  });
}

export function useCreateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const leads = getStoredLeads();
      const catInfo = detectCategory(
        data.name || '',
        data.types || [data.segment || ''],
        data.address?.formattedAddress || data.address || ''
      );

      const rawAddr = typeof data.address === 'string' ? data.address : (data.address?.formattedAddress || data.formatted_address || '');
      const detected = detectStateAndCity(rawAddr, data.phone || '');
      const targetUF = data.address?.state || data.state || detected.state;
      const stObj = getStateByUF(targetUF);
      const defaultDDD = stObj?.ddds?.[0] || '92';
      const phone = formatBrazilianPhone(data.phone || '', defaultDDD);
      const website = data.website || '';
      const rating = data.rating || 4.5;
      const scoreCalc = calculateLeadScore({ name: data.name, phone, website, rating, subcategory: catInfo.subcategory } as any);

      const newLead: any = {
        id: data.id || `lead-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        name: data.name,
        tradeName: data.name,
        segment: {
          id: `seg-${Date.now()}`,
          name: catInfo.subcategory,
          icon: catInfo.icon,
          color: catInfo.color,
        },
        category: catInfo.category,
        subcategory: catInfo.subcategory,
        status: LeadStatus.NEW,
        priority: Priority.MEDIUM,
        score: {
          total: scoreCalc.total,
          level: scoreCalc.level,
        },
        scoreFactors: scoreCalc.factors,
        address: (() => {
          const rawAddr = typeof data.address === 'string' ? data.address : (data.address?.formattedAddress || data.formatted_address || '');
          const detected = detectStateAndCity(rawAddr, phone);
          const stObj = getStateByUF(data.address?.state || data.state || detected.state);
          if (typeof data.address === 'object' && data.address) {
            return {
              neighborhood: data.address.neighborhood || data.neighborhood || 'Centro',
              city: data.address.city || data.city || detected.city,
              state: data.address.state || data.state || detected.state,
              formattedAddress: data.address.formattedAddress || rawAddr || `${detected.city} - ${detected.state}`,
              latitude: data.address.latitude || data.lat || stObj?.coordinates.lat || -23.5505,
              longitude: data.address.longitude || data.lng || stObj?.coordinates.lng || -46.6333,
            };
          }
          return {
            neighborhood: data.neighborhood || 'Centro',
            city: data.city || detected.city,
            state: data.state || detected.state,
            formattedAddress: rawAddr || `${detected.city} - ${detected.state}`,
            latitude: data.lat || stObj?.coordinates.lat || -23.5505,
            longitude: data.lng || stObj?.coordinates.lng || -46.6333,
          };
        })(),
        phone,
        website,
        rating,
        potentialValue: data.potentialValue || 2500,
        distance: data.distance || 1.5,
        createdAt: new Date().toISOString(),
      };

      const updated = [newLead, ...leads.filter(l => l.id !== newLead.id)];
      saveStoredLeads(updated);
      return newLead;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}

export function useBatchCreateLeads() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (items: any[]) => {
      const leads = getStoredLeads();
      const newItems = items.map((data, idx) => {
        const catInfo = detectCategory(
          data.name || '',
          data.types || [data.segment || ''],
          data.address?.formattedAddress || data.formatted_address || data.address || ''
        );

        const addrStr = data.address?.formattedAddress || data.formatted_address || (typeof data.address === 'string' ? data.address : '') || '';
        const detected = detectStateAndCity(addrStr, data.phone || '');
        const stateUF = data.address?.state || data.state || detected.state;
        const cityName = data.address?.city || data.city || detected.city;
        const stObj = getStateByUF(stateUF);
        const defaultDDD = stObj?.ddds?.[0] || '92';
        const phone = formatBrazilianPhone(data.phone || '', defaultDDD);
        const website = data.website || '';
        const rating = data.rating || 4.5;
        const scoreCalc = calculateLeadScore({ name: data.name, phone, website, rating, subcategory: catInfo.subcategory } as any);

        return {
          id: data.place_id || `lead-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
          name: data.name,
          tradeName: data.name,
          segment: {
            id: `seg-${Date.now()}-${idx}`,
            name: catInfo.subcategory,
            icon: catInfo.icon,
            color: catInfo.color,
          },
          category: catInfo.category,
          subcategory: catInfo.subcategory,
          status: LeadStatus.NEW,
          priority: Priority.HIGH,
          score: {
            total: scoreCalc.total,
            level: scoreCalc.level,
          },
          scoreFactors: scoreCalc.factors,
          address: {
            neighborhood: (typeof data.address === 'object' && data.address?.neighborhood) || data.neighborhood || 'Centro',
            city: cityName,
            state: stateUF,
            formattedAddress: addrStr || `${cityName} - ${stateUF}`,
            latitude: (typeof data.address === 'object' && data.address?.latitude) || data.lat || stObj?.coordinates.lat || -23.5505,
            longitude: (typeof data.address === 'object' && data.address?.longitude) || data.lng || stObj?.coordinates.lng || -46.6333,
          },
          phone,
          website,
          rating,
          potentialValue: data.potentialValue || 2500,
          distance: +(1.0 + (idx % 8) * 0.7).toFixed(1),
          createdAt: new Date().toISOString(),
        };
      });

      // Avoid duplicates by name or id
      const existingNames = new Set(leads.map(l => l.name.trim().toLowerCase()));
      const filtered = newItems.filter(item => !existingNames.has(item.name.trim().toLowerCase()));

      const updated = [...filtered, ...leads];
      saveStoredLeads(updated);
      return filtered;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const leads = getStoredLeads();
      const index = leads.findIndex(l => l.id === id);
      if (index !== -1) {
        if (data.subcategory) {
          const catInfo = detectCategory(data.name || leads[index].name, [data.subcategory], leads[index].address?.city || 'Manaus');
          data.category = catInfo.category;
          data.subcategory = catInfo.subcategory;
          data.segment = {
            ...(leads[index] as any).segment,
            name: catInfo.subcategory,
            icon: catInfo.icon,
            color: catInfo.color,
          };
        }
        if (data.phone) {
          const leadUF = data.address?.state || leads[index].address?.state;
          const stObj = leadUF ? getStateByUF(leadUF) : null;
          const defaultDDD = stObj?.ddds?.[0] || '92';
          data.phone = formatBrazilianPhone(data.phone, defaultDDD);
        }
        leads[index] = { ...leads[index], ...data };
        saveStoredLeads(leads);
        return leads[index];
      }
      return null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}

export function useBatchUpdateLeads() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, data }: { ids: string[]; data: any }) => {
      const leads = getStoredLeads();
      const idSet = new Set(ids);
      const updated = leads.map(l => {
        if (idSet.has(l.id)) {
          return { ...l, ...data };
        }
        return l;
      });
      saveStoredLeads(updated);
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}

export function useDeleteLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const leads = getStoredLeads();
      const filtered = leads.filter(l => l.id !== id);
      saveStoredLeads(filtered);
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}

export function useNearbyLeads(lat: number, lng: number, radiusKm: number) {
  return useQuery({
    queryKey: ['leads', 'nearby', lat, lng, radiusKm],
    queryFn: async () => {
      const leads = getStoredLeads();
      return leads.slice(0, 15);
    },
  });
}