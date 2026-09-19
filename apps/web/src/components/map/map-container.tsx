'use client';

import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, ZoomControl, useMap, useMapEvents, Tooltip } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { MapMarker } from '@radar/types';
import { createCustomIcon } from './map-markers';
import { Button } from '@/components/ui/button';
import { Layers, CheckCircle2, Sparkles, Download, Check, Moon, Sun, Radar, Loader2, Plus, MapPin, X } from 'lucide-react';
import Link from 'next/link';
import { useLeads } from '@/hooks/use-leads';
import { detectCategory } from '@/lib/categories';
import { formatBrazilianPhone } from '@/lib/phone-utils';
import toast from 'react-hot-toast';

interface MapViewProps {
  markers: MapMarker[];
  center?: [number, number];
  zoom?: number;
  onImportProspect?: (prospect: any) => void;
  onScanArea?: (center: { lat: number; lng: number }) => void;
  isScanningArea?: boolean;
}

const MAP_STYLES = {
  dark: {
    name: '🌙 Modo Escuro (Noturno)',
    url: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    subdomains: 'abc',
    attribution: '&copy; Google Maps',
    className: 'dark-map-tiles',
  },
  google: {
    name: '☀️ Google Maps (Claro)',
    url: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    subdomains: 'abc',
    attribution: '&copy; Google Maps',
    className: '',
  },
  satellite: {
    name: '🛰️ Satélite Híbrido',
    url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    subdomains: 'abc',
    attribution: '&copy; Google Maps Satélite',
    className: '',
  },
  osm: {
    name: '🧭 OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    subdomains: 'abc',
    attribution: '&copy; OpenStreetMap contributors',
    className: '',
  }
};

type MapStyleKey = keyof typeof MAP_STYLES;

function ChangeView({ center, zoom }: { center: [number, number]; zoom?: number }) {
  const map = useMap();
  const prevRef = useRef<{ lat: number; lng: number; zoom?: number }>({ lat: center[0], lng: center[1], zoom });

  useEffect(() => {
    const latDiff = Math.abs(prevRef.current.lat - center[0]);
    const lngDiff = Math.abs(prevRef.current.lng - center[1]);
    const zoomDiff = zoom !== undefined && prevRef.current.zoom !== zoom;

    // Only update camera if center changed significantly (e.g. user selected a new location from search)
    if (latDiff > 0.001 || lngDiff > 0.001 || zoomDiff) {
      prevRef.current = { lat: center[0], lng: center[1], zoom };
      map.flyTo(center, zoom || map.getZoom(), { duration: 0.8 });
    }
  }, [center[0], center[1], zoom, map]);

  return null;
}

function MapZoomControls() {
  const map = useMap();
  return (
    <div className="absolute bottom-6 right-3 z-[1000] flex flex-col gap-1.5 shadow-2xl">
      <button
        type="button"
        onClick={() => map.zoomIn()}
        className="w-9 h-9 bg-card/95 hover:bg-accent text-foreground border border-border rounded-lg flex items-center justify-center font-bold text-lg shadow-md transition-all active:scale-95 hover:text-primary cursor-pointer"
        title="Aproximar Zoom (+)"
      >
        +
      </button>
      <button
        type="button"
        onClick={() => map.zoomOut()}
        className="w-9 h-9 bg-card/95 hover:bg-accent text-foreground border border-border rounded-lg flex items-center justify-center font-bold text-lg shadow-md transition-all active:scale-95 hover:text-primary cursor-pointer"
        title="Afastar Zoom (-)"
      >
        −
      </button>
      <button
        type="button"
        onClick={() => map.flyTo([-3.1190, -60.0217], 13, { duration: 0.6 })}
        className="w-9 h-9 bg-card/95 hover:bg-accent text-primary border border-border rounded-lg flex items-center justify-center text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer"
        title="Centralizar Manaus"
      >
        🎯
      </button>
    </div>
  );
}

function MapEventsListener({ 
  onMapClick, 
  onCenterChange 
}: { 
  onMapClick: (lat: number, lng: number) => void;
  onCenterChange?: (center: { lat: number; lng: number }) => void;
}) {
  const map = useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
    moveend() {
      if (onCenterChange) {
        const c = map.getCenter();
        onCenterChange({ lat: c.lat, lng: c.lng });
      }
    }
  });
  return null;
}

export default function MapView({ 
  markers, 
  center = [-3.1190, -60.0217], 
  zoom = 13, 
  onImportProspect,
  onScanArea,
  isScanningArea = false,
}: MapViewProps) {
  const [mounted, setMounted] = useState(false);
  const [currentStyle, setCurrentStyle] = useState<MapStyleKey>('dark');
  const [isStyleMenuOpen, setIsStyleMenuOpen] = useState(false);
  const { data: allLeads } = useLeads();
  const [importingMarkerId, setImportingMarkerId] = useState<string | null>(null);

  // Coordenadas atuais do centro do mapa para o escaneador
  const [currentCenter, setCurrentCenter] = useState<{ lat: number; lng: number }>({ lat: center[0], lng: center[1] });

  // Ponto clicado pelo usuário em qualquer parte do mapa
  const [clickedPoint, setClickedPoint] = useState<{
    lat: number;
    lng: number;
    name: string;
    address: string;
    phone: string;
    subcategory: string;
    category: string;
    isLoading: boolean;
  } | null>(null);

  const [isAddingClickedLead, setIsAddingClickedLead] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem('radar_map_style') as MapStyleKey;
      if (saved && MAP_STYLES[saved]) {
        setCurrentStyle(saved);
      } else {
        setCurrentStyle('dark');
      }
    } catch (e) {
      setCurrentStyle('dark');
    }
  }, []);

  const handleSelectStyle = (key: MapStyleKey) => {
    setCurrentStyle(key);
    try {
      localStorage.setItem('radar_map_style', key);
    } catch (e) {
      console.error(e);
    }
  };

  const isDarkMode = currentStyle === 'dark';

  const toggleDarkMode = () => {
    const next = isDarkMode ? 'google' : 'dark';
    handleSelectStyle(next);
  };

  // Tratar clique em qualquer local do mapa (rua, prédio, comércio)
  const handleMapClick = async (lat: number, lng: number) => {
    setClickedPoint({
      lat,
      lng,
      name: 'Identificando local...',
      address: `Coordenadas: ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
      phone: '',
      subcategory: 'Comércio Geral',
      category: 'Comércio & Serviços',
      isLoading: true,
    });

    try {
      const res = await fetch(`/api/places?lat=${lat}&lng=${lng}&reverse=true`);
      const data = await res.json();
      if (data.success && data.data && data.data.length > 0) {
        const p = data.data[0];
        setClickedPoint({
          lat,
          lng,
          name: p.name || 'Estabelecimento Comercial',
          address: p.formatted_address || `${lat.toFixed(5)}, ${lng.toFixed(5)} - Manaus - AM`,
          phone: formatBrazilianPhone(p.phone || ''),
          subcategory: p.subcategory || 'Comércio Geral',
          category: p.category || 'Comércio & Serviços',
          isLoading: false,
        });
      } else {
        setClickedPoint(prev => prev ? {
          ...prev,
          name: 'Novo Estabelecimento / Endereço',
          address: `Manaus - AM (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
          isLoading: false
        } : null);
      }
    } catch (e) {
      setClickedPoint(prev => prev ? { ...prev, isLoading: false } : null);
    }
  };

  const handleConfirmClickedLead = async () => {
    if (!clickedPoint) return;
    setIsAddingClickedLead(true);
    try {
      const catInfo = detectCategory(clickedPoint.name, [clickedPoint.subcategory], clickedPoint.address);
      if (onImportProspect) {
        await onImportProspect({
          name: clickedPoint.name,
          address: clickedPoint.address,
          formatted_address: clickedPoint.address,
          latitude: clickedPoint.lat,
          longitude: clickedPoint.lng,
          lat: clickedPoint.lat,
          lng: clickedPoint.lng,
          phone: formatBrazilianPhone(clickedPoint.phone),
          types: [catInfo.subcategory],
          subcategory: catInfo.subcategory,
          category: catInfo.category,
        });
      }
      setClickedPoint(null);
    } catch (err) {
      toast.error('Erro ao adicionar o local aos leads.');
    } finally {
      setIsAddingClickedLead(false);
    }
  };

  if (!mounted) return <div className="w-full h-full bg-card animate-pulse rounded-xl" />;

  const activeStyle = MAP_STYLES[currentStyle];

  return (
    <div className="w-full h-full relative rounded-xl overflow-hidden border border-border">
      {/* Barra de Controles Flutuante Superior: Modo Escuro & Estilos */}
      <div className="absolute top-3 right-3 z-[1000] flex items-center gap-2">
        {/* Botão de 1 Clique: Alternar Modo Escuro / Claro */}
        <Button 
          variant="secondary" 
          size="sm" 
          onClick={toggleDarkMode}
          className={`backdrop-blur-md border shadow-lg text-xs flex items-center gap-1.5 h-8 px-3 font-bold transition-all ${
            isDarkMode 
              ? 'bg-primary/25 text-primary border-primary/40 hover:bg-primary/35 shadow-primary/20' 
              : 'bg-card/90 text-foreground border-border hover:bg-card'
          }`}
          title={isDarkMode ? 'Mudar para Modo Claro (Google Maps)' : 'Mudar para Modo Escuro (Dark Matter)'}
        >
          {isDarkMode ? (
            <>
              <Moon className="w-3.5 h-3.5 text-primary" />
              <span>Modo Escuro</span>
            </>
          ) : (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span>Modo Claro</span>
            </>
          )}
        </Button>

        {/* Menu Seletor de Camadas */}
        <div className="relative">
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={() => setIsStyleMenuOpen(!isStyleMenuOpen)}
            className="bg-card/90 backdrop-blur-md border border-border shadow-lg text-xs flex items-center gap-1.5 h-8 px-2.5 font-medium hover:bg-accent"
          >
            <Layers className="w-3.5 h-3.5 text-primary" />
            <span>Camadas</span>
          </Button>

          {isStyleMenuOpen && (
            <div className="absolute right-0 mt-1.5 w-52 bg-card border border-border rounded-lg shadow-xl p-1.5 space-y-1 z-50 animate-in fade-in zoom-in-95">
              {(Object.keys(MAP_STYLES) as MapStyleKey[]).map((key) => (
                <button
                  key={key}
                  onClick={() => {
                    handleSelectStyle(key);
                    setIsStyleMenuOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 text-xs rounded-md font-medium transition-colors flex items-center justify-between ${
                    currentStyle === key 
                      ? 'bg-primary text-primary-foreground font-bold' 
                      : 'hover:bg-accent text-foreground'
                  }`}
                >
                  <span>{MAP_STYLES[key].name}</span>
                  {currentStyle === key && <span className="text-xs">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top Left Floating Controls: Escanear Área */}
      <div className="absolute top-3 left-3 z-[1000] flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onScanArea && onScanArea(currentCenter)}
          disabled={isScanningArea}
          className="bg-card/95 backdrop-blur-md border border-primary/50 shadow-xl text-xs flex items-center gap-1.5 h-8 px-3 font-bold text-primary hover:bg-primary/10 transition-all hover:scale-105"
          title="Escanear todos os comércios visíveis nesta região de Manaus"
        >
          {isScanningArea ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
              <span>Escaneando Comércios...</span>
            </>
          ) : (
            <>
              <Radar className="w-3.5 h-3.5 text-primary" />
              <span>🔍 Escanear Comércios Desta Área</span>
            </>
          )}
        </Button>
      </div>

      {/* Bottom Floating Tip */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[1000] bg-card/95 backdrop-blur-md border border-border/80 px-3.5 py-1.5 rounded-full shadow-xl text-[11px] text-foreground flex items-center gap-2 pointer-events-none">
        <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
        <span><strong>Clique em qualquer comércio, rua ou endereço</strong> no mapa para adicionar aos Leads!</span>
      </div>

      <MapContainer 
        center={center} 
        zoom={zoom} 
        minZoom={3}
        maxZoom={21}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%', zIndex: 0 }}
        zoomControl={false}
      >
        <ChangeView center={center} zoom={zoom} />
        <MapEventsListener onMapClick={handleMapClick} onCenterChange={setCurrentCenter} />
        <TileLayer
          key={currentStyle}
          attribution={activeStyle.attribution}
          url={activeStyle.url}
          subdomains={activeStyle.subdomains || 'abc'}
          className={activeStyle.className || ''}
          maxZoom={21}
          maxNativeZoom={20}
        />
        <MapZoomControls />
        
        {/* Ponto Clicado pelo Usuário no Mapa (Permite salvar qualquer comércio ou endereço) */}
        {clickedPoint && (
          <Marker
            position={[clickedPoint.lat, clickedPoint.lng]}
            icon={createCustomIcon({
              id: 'clicked-point',
              name: clickedPoint.name,
              latitude: clickedPoint.lat,
              longitude: clickedPoint.lng,
              segment: clickedPoint.subcategory,
              segmentIcon: 'MapPin',
              segmentColor: '#F59E0B',
              score: 80,
              scoreLevel: 'HIGH',
              status: 'NEW' as any,
              priority: 'HIGH' as any,
              isRegisteredLead: false,
            } as any)}
          >
            <Popup className="custom-popup" autoPan>
              <div className="p-1 min-w-[260px] max-w-xs space-y-2">
                <div className="flex items-center justify-between border-b border-border pb-1.5">
                  <span className="text-[11px] font-bold text-amber-500 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    Ponto Selecionado no Mapa
                  </span>
                  <button 
                    onClick={() => setClickedPoint(null)}
                    className="text-muted-foreground hover:text-foreground text-xs"
                  >
                    ✕
                  </button>
                </div>

                {clickedPoint.isLoading ? (
                  <div className="py-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span>Identificando endereço e comércio...</span>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="text-[10px] text-muted-foreground font-semibold uppercase">Nome do Comércio / Estabelecimento</label>
                      <input
                        type="text"
                        className="w-full text-xs font-bold h-7 px-2 rounded-md bg-background border border-border mt-0.5 text-foreground focus:outline-none focus:border-primary"
                        value={clickedPoint.name}
                        onChange={(e) => setClickedPoint({ ...clickedPoint, name: e.target.value })}
                        placeholder="Nome do local (ex: Porteira Steakhouse)"
                      />
                    </div>

                    <div>
                      <p className="text-[10px] text-muted-foreground font-semibold uppercase">Endereço Identificado</p>
                      <p className="text-xs text-foreground mt-0.5 leading-snug">
                        {clickedPoint.address}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[10px] text-muted-foreground font-semibold uppercase">Pasta / Categoria:</span>
                      <span className="text-[11px] px-2 py-0.5 rounded font-semibold bg-primary/15 text-primary border border-primary/30">
                        📂 {clickedPoint.subcategory}
                      </span>
                    </div>

                    <div>
                      <label className="text-[10px] text-muted-foreground font-semibold uppercase">Telefone / WhatsApp (opcional)</label>
                      <input
                        type="text"
                        className="w-full text-xs h-7 px-2 rounded-md bg-background border border-border mt-0.5 text-foreground focus:outline-none focus:border-primary"
                        value={clickedPoint.phone}
                        onChange={(e) => setClickedPoint({ ...clickedPoint, phone: e.target.value })}
                        placeholder="(92) 99999-9999"
                      />
                    </div>

                    <Button
                      size="sm"
                      className="w-full text-xs h-8 mt-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md flex items-center justify-center gap-1.5"
                      disabled={isAddingClickedLead}
                      onClick={handleConfirmClickedLead}
                    >
                      {isAddingClickedLead ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                      {isAddingClickedLead ? 'Adicionando...' : '📥 Adicionar aos Meus Leads'}
                    </Button>
                  </>
                )}
              </div>
            </Popup>
          </Marker>
        )}

        <MarkerClusterGroup
          chunkedLoading
          maxClusterRadius={40}
        >
          {markers.map((marker: any) => {
            const markerName = (marker.name || '').trim().toLowerCase();
            const existingLead = allLeads?.find(l => 
              l.id === marker.id || 
              (l.name && l.name.trim().toLowerCase() === markerName)
            );
            const isAlreadyRegistered = !!existingLead || marker.isRegisteredLead === true;

            return (
              <Marker 
                key={marker.id} 
                position={[marker.latitude, marker.longitude]}
                icon={createCustomIcon({
                  ...marker,
                  isRegisteredLead: isAlreadyRegistered
                })}
              >
                {/* Balão de Informações ao Passar o Mouse (Hover Card) */}
                <Tooltip 
                  direction="top" 
                  offset={[0, -20]} 
                  opacity={0.98} 
                  className="custom-map-tooltip"
                >
                  <div className="space-y-1.5 min-w-[200px] max-w-xs">
                    <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-1">
                      <h4 className="font-bold text-xs text-foreground truncate">{marker.name}</h4>
                      <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-primary/20 text-primary shrink-0">
                        Score {marker.score || 80}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="font-semibold text-foreground flex items-center gap-1">
                        <span>📂</span> {marker.segment || 'Comércio'}
                      </span>
                      {marker.phone && (
                        <span className="text-emerald-400 font-medium">
                          📞 {formatBrazilianPhone(marker.phone)}
                        </span>
                      )}
                    </div>

                    {isAlreadyRegistered ? (
                      <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>✓ Na sua lista de leads</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-[10px] text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                        <Sparkles className="w-3 h-3" />
                        <span>✨ Clique para importar aos leads</span>
                      </div>
                    )}
                  </div>
                </Tooltip>

                <Popup className="custom-popup">
                  <div className="p-1 min-w-[220px] space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-sm leading-tight text-foreground">{marker.name}</h3>
                    </div>

                    <div className="text-xs text-muted-foreground flex items-center justify-between">
                      <span className="font-medium text-foreground">{marker.segment}</span>
                      <span className="bg-primary/20 text-primary px-2 py-0.5 rounded-full font-bold text-[10px]">
                        Score: {marker.score}
                      </span>
                    </div>

                    {marker.phone && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                        <span>📞</span> {formatBrazilianPhone(marker.phone)}
                      </p>
                    )}

                    {/* Status de Presença na Lista de Leads */}
                    {isAlreadyRegistered ? (
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                        <span>✓ Já está na lista de leads</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-bold">
                        <Sparkles className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                        <span>Novo Estabelecimento no Maps</span>
                      </div>
                    )}

                    {/* Botões de Ação */}
                    {isAlreadyRegistered ? (
                      <Link href={`/leads/${existingLead?.id || marker.id}`} className="block w-full">
                        <Button size="sm" className="w-full text-xs h-7 mt-0.5 font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
                          Ver Detalhes do Lead
                        </Button>
                      </Link>
                    ) : (
                      <Button 
                        size="sm" 
                        className="w-full text-xs h-7 mt-0.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md flex items-center justify-center gap-1.5"
                        disabled={importingMarkerId === marker.id}
                        onClick={async () => {
                          if (onImportProspect) {
                            setImportingMarkerId(marker.id);
                            try {
                              await onImportProspect(marker);
                            } finally {
                              setImportingMarkerId(null);
                            }
                          }
                        }}
                      >
                        <Download className="w-3.5 h-3.5" />
                        {importingMarkerId === marker.id ? 'Importando...' : 'Importar Lead'}
                      </Button>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
}