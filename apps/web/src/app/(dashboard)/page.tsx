'use client';

import { useDashboardStats } from '@/hooks/use-dashboard';
import { useLeads } from '@/hooks/use-leads';
import { useFilterStore } from '@/stores/filter-store';
import { StatsCards } from '@/components/dashboard/stats-cards';
import { FiltersBar } from '@/components/dashboard/filters-bar';
import { LeadsSidebar } from '@/components/dashboard/leads-sidebar';
import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import { MapMarker } from '@radar/types';
import { getStateByUF } from '@/lib/brazil-states';

// Map component must be loaded dynamically with no SSR due to Leaflet
const MapContainer = dynamic(
  () => import('@/components/map/map-container'),
  { 
    ssr: false,
    loading: () => <div className="w-full h-full bg-card animate-pulse rounded-xl border border-border flex items-center justify-center text-muted-foreground">Carregando mapa...</div>
  }
);

export default function DashboardPage() {
  const { filters } = useFilterStore();
  const { data: stats, isLoading: isLoadingStats } = useDashboardStats();
  const { data: leads, isLoading: isLoadingLeads } = useLeads(filters);

  // Dynamic map position based on state filter
  const { mapCenter, mapZoom } = useMemo(() => {
    if (filters.state && filters.state !== 'TODOS') {
      const st = getStateByUF(filters.state);
      if (st && st.coordinates) {
        return {
          mapCenter: [st.coordinates.lat, st.coordinates.lng] as [number, number],
          mapZoom: 12,
        };
      }
    }
    return {
      mapCenter: [-3.1190, -60.0217] as [number, number],
      mapZoom: 13,
    };
  }, [filters.state]);

  // Convert leads to map markers
  const markers = useMemo(() => {
    if (!leads) return [];
    return leads
      .filter(l => l.address?.latitude && l.address?.longitude)
      .map(l => ({
        id: l.id,
        name: l.name,
        latitude: l.address!.latitude!,
        longitude: l.address!.longitude!,
        segment: l.segment?.name,
        segmentIcon: l.segment?.icon,
        segmentColor: l.segment?.color,
        score: l.score?.total || 0,
        scoreLevel: l.score?.level || 'LOW' as any,
        status: l.status,
        priority: l.priority,
      } as MapMarker));
  }, [leads]);

  return (
    <div className="flex flex-col gap-4 h-full">
      <StatsCards stats={stats} isLoading={isLoadingStats} />
      
      <FiltersBar />
      
      <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-[500px]">
        <div className="lg:w-[70%] h-[400px] lg:h-full">
          <MapContainer markers={markers} center={mapCenter} zoom={mapZoom} />
        </div>
        <div className="lg:w-[30%] h-[400px] lg:h-full">
          <LeadsSidebar leads={leads || []} isLoading={isLoadingLeads} />
        </div>
      </div>
    </div>
  );
}
