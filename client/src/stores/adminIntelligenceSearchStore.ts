import { create } from 'zustand';

export interface IntelligenceLivePulse {
  id: string;
  entityType: string;
  entityId: string;
  title: string;
  subtitle?: string;
  deepLink?: string;
  moduleLabel?: string;
  status?: string;
  event?: 'created' | 'updated';
  at: string;
}

interface AdminIntelligenceSearchState {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  liveConnected: boolean;
  setLiveConnected: (v: boolean) => void;
  livePulses: IntelligenceLivePulse[];
  pushLivePulse: (pulse: IntelligenceLivePulse) => void;
  clearLivePulses: () => void;
}

export const useAdminIntelligenceSearchStore = create<AdminIntelligenceSearchState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
  toggle: () => set((s) => ({ open: !s.open })),
  liveConnected: false,
  setLiveConnected: (liveConnected) => set({ liveConnected }),
  livePulses: [],
  pushLivePulse: (pulse) =>
    set((s) => ({
      livePulses: [pulse, ...s.livePulses].slice(0, 8),
    })),
  clearLivePulses: () => set({ livePulses: [] }),
}));
