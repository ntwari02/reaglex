import { create } from 'zustand';

export const useMotionUi = create((set) => ({
  quickPreviewProduct: null,
  openQuickPreview: (product) => set({ quickPreviewProduct: product || null }),
  closeQuickPreview: () => set({ quickPreviewProduct: null }),

  visualSearchOpen: false,
  openVisualSearch: () => set({ visualSearchOpen: true }),
  closeVisualSearch: () => set({ visualSearchOpen: false }),

  arProduct: null,
  openAr: (product) => set({ arProduct: product || null }),
  closeAr: () => set({ arProduct: null }),

  flyBurst: null,
  triggerFlyToCart: (payload) =>
    set({ flyBurst: { ...payload, at: Date.now() } }),
  clearFlyBurst: () => set({ flyBurst: null }),
}));
