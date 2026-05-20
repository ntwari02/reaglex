import { create } from 'zustand';

export const useImmersiveSearch = create((set) => ({
  open: false,
  initialQuery: '',
  voiceOnOpen: false,
  openSearch: (initialQuery = '') =>
    set({ open: true, initialQuery: String(initialQuery || ''), voiceOnOpen: false }),
  openVoiceSearch: (initialQuery = '') =>
    set({ open: true, initialQuery: String(initialQuery || ''), voiceOnOpen: true }),
  closeSearch: () => set({ open: false, initialQuery: '', voiceOnOpen: false }),
  setInitialQuery: (q) => set({ initialQuery: String(q || '') }),
}));
