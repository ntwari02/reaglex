import { create } from 'zustand';
import { useNavigationMemory } from './navigationMemoryStore';

function freezeScroll() {
  if (typeof window === 'undefined') return;
  const { pathname, search } = window.location;
  useNavigationMemory.getState().freezeForOverlay(pathname, search);
}

function unfreezeScroll() {
  if (typeof window === 'undefined') return;
  const { pathname, search } = window.location;
  useNavigationMemory.getState().unfreezeOverlay(pathname, search);
}

export const useMobileMenuOverlay = create((set, get) => ({
  isOpen: false,

  open: () => {
    if (!get().isOpen) freezeScroll();
    set({ isOpen: true });
  },

  close: () => {
    if (get().isOpen) unfreezeScroll();
    set({ isOpen: false });
  },

  toggle: () => {
    if (get().isOpen) get().close();
    else get().open();
  },
}));
