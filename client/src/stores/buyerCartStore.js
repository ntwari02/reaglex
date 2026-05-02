import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { trackRecommendationActivity } from '../services/recommendationEmailApi';

const defaultShipPreview = { country: 'RW', city: 'Kigali', state: '', zip: '' };

export const useBuyerCart = create(
  persist(
    (set, get) => ({
      items: [],
      cartOpen: false,
      /** Coarse destination for public / estimate shipping in cart drawer */
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
      openCart:  () => set({ cartOpen: true }),
      closeCart: () => set({ cartOpen: false }),

      addItem: (product, quantity = 1) => {
        const items = get().items;
        const existing = items.find((i) => i.id === product._id || i.id === product.id);
        if (existing) {
          set({
            items: items.map((i) =>
              i.id === existing.id ? { ...i, quantity: i.quantity + quantity } : i
            ),
          });
        } else {
          set({
            items: [
              ...items,
              {
                id: product._id || product.id,
                title: product.title || product.name,
                price: product.price,
                image: product.images?.[0] || product.image || '',
                seller: product.seller?.storeName || product.sellerName || 'Seller',
                quantity,
              },
            ],
          });
        }
        void trackRecommendationActivity({
          eventType: 'cart_add',
          productId: String(product?._id || product?.id || ''),
          category: product?.category || '',
          tags: Array.isArray(product?.tags) ? product.tags : [],
          meta: { quantity },
        });
      },

      removeItem: (id) => {
        set({ items: get().items.filter((i) => i.id !== id) });
        void trackRecommendationActivity({
          eventType: 'cart_remove',
          productId: String(id),
        });
      },

      updateQuantity: (id, quantity) => {
        if (quantity < 1) return get().removeItem(id);
        set({
          items: get().items.map((i) => (i.id === id ? { ...i, quantity } : i)),
        });
      },

      clearCart: () => set({ items: [] }),

      get total() {
        return get().items.reduce((sum, i) => sum + i.price * i.quantity, 0);
      },

      get count() {
        return get().items.reduce((sum, i) => sum + i.quantity, 0);
      },
    }),
    { name: 'buyer-cart' }
  )
);
