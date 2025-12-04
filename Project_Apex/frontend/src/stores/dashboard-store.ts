import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type PreferredCurrency = 'USD' | 'EUR' | 'NGN' | 'BTC';

interface DashboardState {
  sidebarOpen: boolean;
  setSidebarOpen: (value: boolean) => void;
  selectedTimeRange: '7d' | '30d' | 'all';
  setTimeRange: (value: '7d' | '30d' | 'all') => void;
  planFilter: 'all' | 'active' | 'inactive';
  setPlanFilter: (value: 'all' | 'active' | 'inactive') => void;
  preferredCurrency: PreferredCurrency;
  setPreferredCurrency: (value: PreferredCurrency) => void;
  activeDashboardTab: string | null;
  setActiveDashboardTab: (value: string | null) => void;
  useCompactLayout: boolean;
  toggleCompactLayout: () => void;
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      setSidebarOpen: (value) => set({ sidebarOpen: value }),
      selectedTimeRange: '30d',
      setTimeRange: (value) => set({ selectedTimeRange: value }),
      planFilter: 'active',
      setPlanFilter: (value) => set({ planFilter: value }),
      preferredCurrency: 'USD',
      setPreferredCurrency: (value) => set({ preferredCurrency: value }),
      activeDashboardTab: null,
      setActiveDashboardTab: (value) => set({ activeDashboardTab: value }),
      useCompactLayout: false,
      toggleCompactLayout: () => set((state) => ({ useCompactLayout: !state.useCompactLayout })),
    }),
    {
      name: 'dashboard-ui-store',
    }
  )
);
