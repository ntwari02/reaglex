import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useRecentlyViewed = create(
  persist(
    (set, get) => ({
      items: [], // max 8 products

      addProduct: (product) => {
        const id = product._id || product.id;
        if (!id) return;
        const existing = get().items.filter((p) => (p._id || p.id) !== id);
        set({
          items: [
            {
              _id: id,
              id,
              title: product.title || product.name,
              price: product.price,
              image: product.images?.[0] || product.image || '',
              rating: product.averageRating || product.rating || 4.5,
              category: product.category || '',
            },
            ...existing,
          ].slice(0, 8),
        });
      },

      clear: () => set({ items: [] }),
    }),
    { name: 'recently-viewed' }
  )
);
