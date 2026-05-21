import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { trackRecommendationActivity } from '../services/recommendationEmailApi';

const defaultShipPreview = { country: 'RW', city: 'Kigali', state: '', zip: '' };

export interface CartLine {
  id: string;
  title: string;
  price: number;
  image: string;
  seller: string;
  quantity: number;
}

interface BuyerCartState {
  items: CartLine[];
  shippingPreviewLocation: typeof defaultShipPreview;
  setShippingPreviewLocation: (loc: Partial<typeof defaultShipPreview>) => void;
  addItem: (product: Record<string, unknown>, quantity?: number) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  replaceItems: (
    items: CartLine[],
    shippingPreviewLocation?: { country: string; city: string; state?: string; zip?: string },
  ) => void;
  subtotal: () => number;
  itemCount: () => number;
}

export const useBuyerCart = create<BuyerCartState>()(
  persist(
    (set, get) => ({
      items: [],
      shippingPreviewLocation: { ...defaultShipPreview },
      setShippingPreviewLocation: (loc) =>
        set({
          shippingPreviewLocation: {
            country: String(loc.country || defaultShipPreview.country).trim() || defaultShipPreview.country,
            city: String(loc.city || defaultShipPreview.city).trim() || defaultShipPreview.city,
            state: String(loc.state ?? '').trim(),
            zip: String(loc.zip ?? '').trim(),
          },
        }),

      addItem: (product, quantity = 1) => {
        const items = get().items;
        const pid = String(product._id ?? product.id ?? '');
        const existing = items.find((i) => i.id === pid);
        if (existing) {
          set({
            items: items.map((i) =>
              i.id === existing.id ? { ...i, quantity: i.quantity + quantity } : i,
            ),
          });
        } else {
          const imgs = product.images as unknown;
          const firstImg =
            Array.isArray(imgs) && imgs.length ? String((imgs[0] as { url?: string })?.url ?? imgs[0]) : '';
          set({
            items: [
              ...items,
              {
                id: pid,
                title: String(product.title ?? product.name ?? ''),
                price: Number(product.price ?? 0),
                image: firstImg,
                seller: String(
                  (product.seller as Record<string, unknown> | undefined)?.storeName ??
                    product.sellerName ??
                    'Seller',
                ),
                quantity,
              },
            ],
          });
        }
        void trackRecommendationActivity({
          eventType: 'cart_add',
          productId: pid,
          category: String(product.category ?? ''),
          tags: Array.isArray(product.tags) ? (product.tags as string[]) : [],
          meta: { quantity },
        });
      },

      removeItem: (id: string) => {
        set({ items: get().items.filter((i) => i.id !== id) });
        void trackRecommendationActivity({
          eventType: 'cart_remove',
          productId: String(id),
        });
      },

      updateQuantity: (id: string, quantity: number) => {
        if (quantity < 1) return get().removeItem(id);
        set({
          items: get().items.map((i) => (i.id === id ? { ...i, quantity } : i)),
        });
      },

      clearCart: () => set({ items: [] }),

      replaceItems: (items, shippingPreviewLocation) => {
        const next = (items || []).map((i) => ({
          id: String(i.id),
          title: String(i.title || 'Product'),
          price: Number(i.price) || 0,
          image: String(i.image || ''),
          seller: String(i.seller || 'Seller'),
          quantity: Math.max(1, Number(i.quantity) || 1),
        }));
        const patch: Partial<BuyerCartState> = { items: next };
        if (shippingPreviewLocation) {
          patch.shippingPreviewLocation = {
            country: String(shippingPreviewLocation.country || defaultShipPreview.country).trim(),
            city: String(shippingPreviewLocation.city || defaultShipPreview.city).trim(),
            state: String(shippingPreviewLocation.state ?? '').trim(),
            zip: String(shippingPreviewLocation.zip ?? '').trim(),
          };
        }
        set(patch);
      },

      subtotal: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),

      itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    {
      name: 'buyer-cart',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        items: s.items,
        shippingPreviewLocation: s.shippingPreviewLocation,
      }),
    },
  ),
);
