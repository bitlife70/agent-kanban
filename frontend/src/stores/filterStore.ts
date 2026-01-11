import { create } from 'zustand';
import { AgentStatus } from '../types/agent';

interface FilterStore {
  searchQuery: string;
  activeFilters: AgentStatus[];

  setSearchQuery: (query: string) => void;
  toggleFilter: (status: AgentStatus) => void;
  clearFilters: () => void;
}

export const useFilterStore = create<FilterStore>((set) => ({
  searchQuery: '',
  activeFilters: [],

  setSearchQuery: (query) => set({ searchQuery: query }),

  toggleFilter: (status) => set((state) => {
    const isActive = state.activeFilters.includes(status);
    return {
      activeFilters: isActive
        ? state.activeFilters.filter(s => s !== status)
        : [...state.activeFilters, status]
    };
  }),

  clearFilters: () => set({ searchQuery: '', activeFilters: [] })
}));
