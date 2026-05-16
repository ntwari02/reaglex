import { create } from 'zustand';

export const useImmersiveSearch = create((set) => ({
  open: false,
  initialQuery: '',
  openSearch: (initialQuery = '') =>
    set({ open: true, initialQuery: String(initialQuery || '') }),
  closeSearch: () => set({ open: false, initialQuery: '' }),
  setInitialQuery: (q) => set({ initialQuery: String(q || '') }),
}));
