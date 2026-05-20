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

/**
 * Layer stack for 2030 account OS (mobile).
 * sheet: null | 'account' | 'settings' | 'appearance' | 'panel'
 * popup: null | 'editProfile' | 'logout'
 */
export const useAccountOverlay = create((set, get) => ({
  isOpen: false,
  sheet: null,
  panelId: null,
  settingsSection: 'profile',
  popup: null,

  openAccount: () => {
    freezeScroll();
    set({ isOpen: true, sheet: 'account', panelId: null, popup: null });
  },

  openSettings: () =>
    set({ isOpen: true, sheet: 'settings', panelId: null, popup: null }),

  openAppearance: () =>
    set({ isOpen: true, sheet: 'appearance', panelId: null, popup: null }),

  openPanel: (panelId, settingsSection = 'profile') => {
    if (!get().isOpen) freezeScroll();
    set({
      isOpen: true,
      sheet: 'panel',
      panelId,
      settingsSection: panelId === 'settings' ? settingsSection : 'profile',
      popup: null,
    });
  },

  openPopup: (popup) => set({ popup }),

  closePopup: () => set({ popup: null }),

  back: () => {
    const { sheet } = get();
    if (sheet === 'panel') return set({ sheet: 'account', panelId: null });
    if (sheet === 'appearance') return set({ sheet: 'settings' });
    if (sheet === 'settings') return set({ sheet: 'account' });
    return get().closeAll();
  },

  closeAll: () => {
    unfreezeScroll();
    set({ isOpen: false, sheet: null, panelId: null, popup: null });
  },

  clearAfterExit: () =>
    set({ sheet: null, panelId: null, popup: null }),
}));
