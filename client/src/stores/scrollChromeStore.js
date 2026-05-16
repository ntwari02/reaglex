import { create } from 'zustand';

/** Shared scroll-driven chrome state (header + bottom nav). */
export const useScrollChrome = create((set) => ({
  headerHidden: false,
  navHidden: false,
  compact: false,
  setChrome: (partial) => set((s) => ({ ...s, ...partial })),
}));
