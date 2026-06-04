import { create } from 'zustand';
import { useToastStore } from './toastStore';
import type { WishlistItem, Product } from '../types';
import { productAPI } from '../services/api';
import { trackRecommendationActivity } from '../services/recommendationEmailApi';

interface WishlistState {
  items: WishlistItem[];
  loading: boolean;
  productIds: Set<string>;
  fetchWishlist: (userId: string) => Promise<void>;
  addToWishlist: (userId: string | null | undefined, product: Product) => Promise<void>;
  removeFromWishlist: (itemId: string) => Promise<void>;
  isInWishlist: (productId: string) => boolean;
}

function guestKey(userId?: string | null) {
  return userId ? `wishlist_${userId}` : 'guest_wishlist';
}

function loadGuestItems(key: string): WishlistItem[] {
  try {
    const stored = localStorage.getItem(key);
    if (stored) return JSON.parse(stored) as WishlistItem[];
  } catch {
    /* ignore */
  }
  return [];
}

function saveGuestItems(key: string, items: WishlistItem[]) {
  localStorage.setItem(key, JSON.stringify(items));
}

export const useWishlistStore = create<WishlistState>((set, get) => ({
  items: [],
  loading: false,
  productIds: new Set(),

  fetchWishlist: async (userId: string) => {
    set({ loading: true });
    try {
      if (!userId) {
        const items = loadGuestItems('guest_wishlist');
        set({
          items,
          productIds: new Set(items.map((i) => String(i.product_id))),
          loading: false,
        });
        return;
      }

      const data = await productAPI.listWishlist();
      const items = (data?.items || []) as WishlistItem[];
      set({
        items,
        productIds: new Set(items.map((i) => String(i.product_id))),
        loading: false,
      });
      saveGuestItems(guestKey(userId), items);
    } catch (e) {
      console.error('Failed to load wishlist', e);
      const fallback = loadGuestItems(guestKey(userId));
      set({
        items: fallback,
        productIds: new Set(fallback.map((i) => String(i.product_id))),
        loading: false,
      });
    }
  },

  addToWishlist: async (userId, product) => {
    const pid = String(product.id);
    if (get().productIds.has(pid)) return;

    const toastStore = useToastStore.getState();

    if (userId) {
      try {
        await productAPI.toggleWishlist(pid);
        await get().fetchWishlist(userId);
        toastStore.showToast(`${product.title || product.name} added to wishlist!`, 'success');
        void trackRecommendationActivity({
          eventType: 'wishlist_add',
          productId: pid,
          category: (product as any).category || '',
          tags: Array.isArray((product as any).tags) ? (product as any).tags : [],
        });
        return;
      } catch (e) {
        console.error('Wishlist toggle failed', e);
        toastStore.showToast('Could not save to wishlist. Try again.', 'error');
        return;
      }
    }

    const now = new Date().toISOString();
    const newItem: WishlistItem = {
      id: `guest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      user_id: 'guest',
      product_id: product.id,
      created_at: now,
      product,
    };
    const updatedItems = [...get().items, newItem];
    set({
      items: updatedItems,
      productIds: new Set([...get().productIds, pid]),
    });
    saveGuestItems('guest_wishlist', updatedItems);
    toastStore.showToast(`${product.title || product.name} added to wishlist!`, 'success');
  },

  removeFromWishlist: async (itemId: string) => {
    const item = get().items.find((i) => i.id === itemId);
    const userId = item?.user_id;
    const productTitle = item?.product?.title || item?.product?.name || 'Item';
    const pid = item?.product_id ? String(item.product_id) : '';
    const toastStore = useToastStore.getState();

    if (userId && userId !== 'guest' && pid) {
      try {
        if (get().productIds.has(pid)) {
          await productAPI.toggleWishlist(pid);
        }
        await get().fetchWishlist(userId);
        toastStore.showToast(`${productTitle} removed from wishlist`, 'success');
        if (pid) {
          void trackRecommendationActivity({ eventType: 'wishlist_remove', productId: pid });
        }
        return;
      } catch (e) {
        console.error('Wishlist remove failed', e);
        toastStore.showToast('Could not update wishlist.', 'error');
        return;
      }
    }

    const updatedItems = get().items.filter((i) => i.id !== itemId);
    const ids = new Set(get().productIds);
    if (pid) ids.delete(pid);
    set({ items: updatedItems, productIds: ids });
    saveGuestItems(guestKey(userId), updatedItems);
    toastStore.showToast(`${productTitle} removed from wishlist`, 'success');
    if (pid) {
      void trackRecommendationActivity({ eventType: 'wishlist_remove', productId: pid });
    }
  },

  isInWishlist: (productId: string) => get().productIds.has(String(productId)),
}));
