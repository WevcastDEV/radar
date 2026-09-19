'use client';

import { useFilterStore } from '@/stores/filter-store';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Filter, X, MapPin } from 'lucide-react';
import { BRAZIL_REGIONS, getStatesByRegion } from '@/lib/brazil-states';

export function FiltersBar() {
  const { filters, setFilter, resetFilters } = useFilterStore();

  return (
    <div className="flex flex-col md:flex-row gap-3 bg-card p-3 rounded-xl border border-border items-center">
      <div className="relative flex-1 w-full">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar cidade, bairro..."
          className="pl-9 bg-background w-full"
          value={filters.search || ''}
          onChange={(e) => setFilter('search', e.target.value)}
        />
      </div>
      
      <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
        <select 
          className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-medium text-foreground cursor-pointer"
          value={filters.state || ''}
          onChange={(e) => setFilter('state', e.target.value)}
          title="Filtrar por Estado (UF)"
        >
          <option value="">🇧🇷 Todos os Estados</option>
          {BRAZIL_REGIONS.map((region) => (
            <optgroup key={region} label={`── ${region.toUpperCase()} ──`}>
              {getStatesByRegion(region).map((st) => (
                <option key={st.uf} value={st.uf}>
                  {st.uf} - {st.name} ({st.capital})
                </option>
              ))}
            </optgroup>
          ))}
        </select>

        <select 
          className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          value={filters.segmentId || ''}
          onChange={(e) => setFilter('segmentId', e.target.value)}
        >
          <option value="">Todos Segmentos</option>
          <option value="1">Comércio</option>
          <option value="2">Indústria</option>
          <option value="3">Condomínio</option>
        </select>

        <select 
          className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          value={filters.scoreMin || ''}
          onChange={(e) => setFilter('scoreMin', Number(e.target.value))}
        >
          <option value="">Qualquer Score</option>
          <option value="80">Score &gt; 80</option>
          <option value="60">Score &gt; 60</option>
          <option value="40">Score &gt; 40</option>
        </select>
        
        <Button variant="outline" size="sm" className="whitespace-nowrap" onClick={resetFilters}>
          <X className="w-4 h-4 mr-1" />
          Limpar
        </Button>
      </div>
    </div>
  );
}
