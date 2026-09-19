'use client';

import { useLeads, useCreateLead, useBatchCreateLeads } from '@/hooks/use-leads';
import { useFilterStore } from '@/stores/filter-store';
import { FiltersBar } from '@/components/dashboard/filters-bar';
import dynamic from 'next/dynamic';
import { useState, useMemo, useEffect } from 'react';
import { MapMarker } from '@radar/types';
import { Search, Loader2, MapPin, Plus, Check, Download, ChevronRight, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import { detectCategory } from '@/lib/categories';
import { getStateByUF } from '@/lib/brazil-states';

const MapContainer = dynamic(
  () => import('@/components/map/map-container'),
  { ssr: false, loading: () => <div className="w-full h-full bg-card animate-pulse rounded-xl flex items-center justify-center text-muted-foreground">Carregando mapa interativo...</div> }
);

export default function FullMapPage() {
  const { filters } = useFilterStore();
  const { data: leads } = useLeads(filters);
  const { mutateAsync: createLead } = useCreateLead();
  const { mutateAsync: batchCreateLeads } = useBatchCreateLeads();

  // Search & Prospecting state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([-3.1190, -60.0217]);
  const [mapZoom, setMapZoom] = useState(13);

  // Sync map center with selected state filter
  useEffect(() => {
    if (filters.state && filters.state !== 'TODOS') {
      const st = getStateByUF(filters.state);
      if (st && st.coordinates) {
        setMapCenter([st.coordinates.lat, st.coordinates.lng]);
        setMapZoom(12);
      }
    }
  }, [filters.state]);

  // Check if a prospect is already in leads
  const isAlreadyInLeads = (name: string) => {
    if (!leads) return false;
    const clean = name.trim().toLowerCase();
    return leads.some(l => l.name.trim().toLowerCase() === clean);
  };

  // Convert current leads to markers
  const leadMarkers = useMemo(() => {
    if (!leads) return [];
    return leads
      .filter(l => l.address?.latitude && l.address?.longitude)
      .map(l => {
        const catInfo = detectCategory(l.name, [(l as any).subcategory || l.segment?.name || ''], l.address?.city || '');
        return {
          id: l.id,
          name: l.name,
          latitude: l.address!.latitude!,
          longitude: l.address!.longitude!,
          segment: (l as any).subcategory || l.segment?.name || catInfo.subcategory,
          segmentIcon: catInfo.icon,
          segmentColor: catInfo.color,
          score: l.score?.total || 50,
          scoreLevel: l.score?.level || 'MEDIUM',
          status: l.status,
          priority: l.priority,
          phone: (l as any).phone,
          isRegisteredLead: true,
        } as any;
      });
  }, [leads]);

  // Convert search results to prospect markers
  const prospectMarkers = useMemo(() => {
    const existingLeadNames = new Set((leadMarkers || []).map(l => l.name.trim().toLowerCase()));

    return searchResults
      .filter(p => p.lat && p.lng)
      .map((p, idx) => {
        const inLeads = isAlreadyInLeads(p.name);
        const catInfo = detectCategory(p.name, p.types || [], p.formatted_address);
        return {
          id: p.place_id || `prospect-${idx}`,
          name: p.name,
          latitude: p.lat,
          longitude: p.lng,
          segment: catInfo.subcategory,
          segmentIcon: catInfo.icon,
          segmentColor: inLeads ? '#10B981' : '#059669',
          score: Math.floor(70 + Math.random() * 25),
          scoreLevel: 'HIGH',
          phone: p.phone,
          formatted_address: p.formatted_address,
          website: p.website,
          rating: p.rating,
          isRegisteredLead: inLeads,
        } as any;
      })
      .filter(p => !existingLeadNames.has(p.name.trim().toLowerCase()));
  }, [searchResults, leads, leadMarkers]);

  const allMarkers = useMemo(() => {
    return [...leadMarkers, ...prospectMarkers];
  }, [leadMarkers, prospectMarkers]);

  // Execute Prospecting Search
  const handleSearch = async (queryToUse?: string) => {
    const q = (queryToUse || searchQuery).trim();
    if (!q) return;

    setIsSearching(true);
    try {
      const res = await fetch(`/api/places?q=${encodeURIComponent(q)}`);
      const data = await res.json();

      if (data.success && data.data && data.data.length > 0) {
        setSearchResults(data.data);
        setIsPanelOpen(true);

        // Center map on the first found place
        const first = data.data.find((p: any) => p.lat && p.lng);
        if (first) {
          setMapCenter([first.lat, first.lng]);
          setMapZoom(14);
        }
        toast.success(`${data.data.length} estabelecimentos encontrados para prospecção!`);
      } else {
        toast('Nenhum estabelecimento encontrado. Experimente colocar a cidade (ex: Padarias em Manaus)', { icon: 'ℹ️' });
      }
    } catch (err) {
      toast.error('Erro ao buscar estabelecimentos no mapa.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleImportSingle = async (place: any) => {
    const formattedAddr = place.formatted_address || place.address || `${place.name}, Manaus - AM`;
    const catInfo = detectCategory(place.name, place.types || [], formattedAddr);
    await createLead({
      name: place.name,
      address: {
        neighborhood: '',
        city: 'Manaus',
        state: 'AM',
        formattedAddress: formattedAddr,
        latitude: place.lat || place.latitude,
        longitude: place.lng || place.longitude,
      },
      phone: place.phone || '',
      website: place.website || '',
      rating: place.rating || 4.5,
      segment: catInfo.subcategory,
      category: catInfo.category,
      subcategory: catInfo.subcategory,
    });
    toast.success(`"${place.name}" adicionado com sucesso na pasta [${catInfo.subcategory}]!`);
  };

  const handleImportAll = async () => {
    const unimported = searchResults.filter(p => !isAlreadyInLeads(p.name));
    if (unimported.length === 0) {
      toast('Todos os locais já foram adicionados aos seus leads!', { icon: 'ℹ️' });
      return;
    }

    await batchCreateLeads(unimported);
    toast.success(`${unimported.length} novos leads importados e organizados automaticamente em suas pastas!`);
  };

  const [isScanningArea, setIsScanningArea] = useState(false);

  const handleScanArea = async (centerCoords: { lat: number; lng: number }) => {
    setIsScanningArea(true);
    try {
      // 1. Identificar o bairro através de geocoding reverso
      const revRes = await fetch(`/api/places?lat=${centerCoords.lat}&lng=${centerCoords.lng}&reverse=true`);
      const revData = await revRes.json();
      const place = revData.data?.[0];
      const neighborhood = place?.neighborhood || 'Manaus';
      const scanQuery = `Comércios e Restaurantes em ${neighborhood} Manaus`;

      setSearchQuery(scanQuery);
      
      // 2. Buscar estabelecimentos nesta área
      const res = await fetch(`/api/places?q=${encodeURIComponent(scanQuery)}`);
      const data = await res.json();
      if (data.success && data.data && data.data.length > 0) {
        setSearchResults(data.data);
        setIsPanelOpen(true);
        toast.success(`Escaner da área [${neighborhood}]: ${data.data.length} comércios encontrados e prontos para adicionar!`);
      } else {
        const fallbackRes = await fetch(`/api/places?q=${encodeURIComponent(`Comércios em Manaus`)}`);
        const fbData = await fallbackRes.json();
        if (fbData.success && fbData.data) {
          setSearchResults(fbData.data);
          setIsPanelOpen(true);
          toast.success(`Encontrados ${fbData.data.length} estabelecimentos próximos!`);
        } else {
          toast('Nenhum estabelecimento comercial detectado nesta área.', { icon: 'ℹ️' });
        }
      }
    } catch (err) {
      toast.error('Erro ao escanear comércios desta área.');
    } finally {
      setIsScanningArea(false);
    }
  };

  const focusOnPlace = (lat: number, lng: number) => {
    setMapCenter([lat, lng]);
    setMapZoom(16);
  };

  const unimportedCount = searchResults.filter(p => !isAlreadyInLeads(p.name)).length;

  return (
    <div className="flex flex-col gap-3 h-[calc(100vh-100px)]">
      {/* Top Prospecting Bar */}
      <div className="bg-card p-3 rounded-xl border border-border shadow-sm flex flex-col gap-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar estabelecimentos para prospectar em Manaus (ex: Padarias no Vieiralves, Ponta Negra, Adrianópolis)..."
              className="pl-9 h-10 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <Button 
            onClick={() => handleSearch()} 
            disabled={isSearching || !searchQuery.trim()}
            className="h-10 px-5 font-semibold shrink-0"
          >
            {isSearching ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <MapPin className="w-4 h-4 mr-2" />}
            Prospectar no Mapa
          </Button>

          {searchResults.length > 0 && (
            <Button
              variant="outline"
              onClick={() => setIsPanelOpen(!isPanelOpen)}
              className="h-10 shrink-0 font-medium"
            >
              {isPanelOpen ? 'Ocultar Painel' : `Ver Resultados (${searchResults.length})`}
            </Button>
          )}
        </div>

        {/* Quick Search Chips */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-muted-foreground font-semibold">Pastas de Prospecção Manaus:</span>
          {[
            { label: '🥖 Padarias', query: 'Padarias em Manaus' },
            { label: '🐾 Pet Shops', query: 'Pet Shops em Manaus' },
            { label: '💈 Barbearias', query: 'Barbearias em Manaus' },
            { label: '💊 Drogarias', query: 'Drogarias em Manaus' },
            { label: '🛒 Supermercados', query: 'Supermercados em Manaus' },
            { label: '🍽️ Restaurantes', query: 'Restaurantes em Manaus' },
            { label: '🏋️ Academias', query: 'Academias em Manaus' },
            { label: '🦷 Odontologia', query: 'Dentistas e Clínicas Odontológicas em Manaus' },
            { label: '🏨 Hotéis', query: 'Hotéis e Pousadas em Manaus' },
            { label: '👗 Moda & Lojas', query: 'Lojas de Roupas em Manaus' },
            { label: '🚗 Oficinas Auto', query: 'Oficinas Mecânicas em Manaus' },
          ].map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={() => {
                setSearchQuery(chip.query);
                handleSearch(chip.query);
              }}
              className="px-2.5 py-1 rounded-md bg-accent/40 hover:bg-accent text-foreground hover:border-primary border border-border transition-colors font-medium"
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Map + Floating Prospect Drawer */}
      <div className="flex-1 rounded-xl overflow-hidden relative border border-border">
        <MapContainer 
          markers={allMarkers} 
          center={mapCenter} 
          zoom={mapZoom} 
          onImportProspect={handleImportSingle}
          onScanArea={handleScanArea}
          isScanningArea={isScanningArea}
        />

        {/* Floating Side Drawer for Search Results */}
        {isPanelOpen && searchResults.length > 0 && (
          <div className="absolute top-3 left-3 bottom-3 w-80 sm:w-96 z-[999] bg-card/95 backdrop-blur-md rounded-xl border border-border shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-left duration-200">
            {/* Drawer Header */}
            <div className="p-3 border-b border-border flex items-center justify-between bg-accent/30">
              <div>
                <h3 className="font-bold text-sm text-foreground">Estabelecimentos Encontrados</h3>
                <p className="text-xs text-muted-foreground">{searchResults.length} locais ({unimportedCount} novos)</p>
              </div>
              <div className="flex items-center gap-1">
                {unimportedCount > 0 && (
                  <Button 
                    size="sm" 
                    className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                    onClick={handleImportAll}
                  >
                    <Download className="w-3.5 h-3.5 mr-1" />
                    Importar Todos
                  </Button>
                )}
                <button 
                  onClick={() => setIsPanelOpen(false)}
                  className="p-1 text-muted-foreground hover:text-foreground rounded-md"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5 divide-y divide-border/40">
              {searchResults.map((place, idx) => {
                const isImported = isAlreadyInLeads(place.name);
                const catInfo = detectCategory(place.name, place.types || [], place.formatted_address);

                return (
                  <div key={place.place_id || idx} className="pt-2 first:pt-0 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-sm text-foreground line-clamp-1">{place.name}</h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span 
                            className="text-[10px] px-1.5 py-0.2 rounded font-semibold border"
                            style={{ 
                              backgroundColor: `${catInfo.color}15`, 
                              color: catInfo.color,
                              borderColor: `${catInfo.color}35`
                            }}
                          >
                            {catInfo.badge}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-400 font-medium">
                            ★ {place.rating || 4.5}
                          </span>
                        </div>
                      </div>

                      {place.lat && place.lng && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 px-1.5 text-[11px] text-muted-foreground hover:text-primary"
                          onClick={() => focusOnPlace(place.lat, place.lng)}
                          title="Focar este local no mapa"
                        >
                          <MapPin className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-2">{place.formatted_address}</p>

                    {place.phone && (
                      <p className="text-xs text-emerald-500 font-medium">📞 {place.phone}</p>
                    )}

                    <div className="pt-1">
                      {isImported ? (
                        <div className="flex items-center justify-center gap-1 py-1 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-bold w-full">
                          <Check className="w-3.5 h-3.5" /> Já Importado
                        </div>
                      ) : (
                        <Button 
                          size="sm" 
                          className="w-full text-xs h-7 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                          onClick={() => handleImportSingle(place)}
                        >
                          <Plus className="w-3 h-3 mr-1" /> Adicionar aos Leads
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}