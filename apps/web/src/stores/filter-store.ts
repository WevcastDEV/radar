import { create } from 'zustand';
import { LeadFilters } from '@radar/types';

interface FilterState {
  filters: LeadFilters;
  setFilter: (key: keyof LeadFilters, value: any) => void;
  setFilters: (filters: LeadFilters) => void;
  resetFilters: () => void;
}

const initialFilters: LeadFilters = {};

export const useFilterStore = create<FilterState>((set) => ({
  filters: initialFilters,
  setFilter: (key, value) =>
    set((state) => ({
      filters: { ...state.filters, [key]: value },
    })),
  setFilters: (filters) => set({ filters }),
  resetFilters: () => set({ filters: initialFilters }),
}));
