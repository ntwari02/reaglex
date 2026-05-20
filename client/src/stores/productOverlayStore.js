import { create } from 'zustand';
import { prefetchProduct } from '../hooks/queries/prefetchProduct';
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

function warmProduct(product) {
  prefetchProduct(product);
}

export const useProductOverlay = create((set) => ({
  product: null,
  isOpen: false,
  /** Bump when switching product inside overlay (content morph) */
  contentKey: 0,

  open: (product) => {
    if (!product) return;
    freezeScroll();
    warmProduct(product);
    set((s) => ({
      product,
      isOpen: true,
      contentKey: s.product && String(s.product._id || s.product.id) === String(product._id || product.id)
        ? s.contentKey
        : s.contentKey + 1,
    }));
  },

  switchProduct: (product) => {
    if (!product) return;
    warmProduct(product);
    set((s) => ({
      product,
      isOpen: true,
      contentKey: s.contentKey + 1,
    }));
  },

  close: () => {
    unfreezeScroll();
    set({ isOpen: false });
  },

  clearProduct: () => set({ product: null }),
}));
