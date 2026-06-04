import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { trackRecommendationActivity } from '../services/recommendationEmailApi';

const defaultShipPreview = {
  country: 'RW',
  countryName: 'Rwanda',
  city: 'Kigali',
  state: '',
  zip: '',
  displayLabel: 'Kigali, Rwanda',
};

function cartLineKey(id, variantSku) {
  return `${String(id)}::${String(variantSku || '').trim()}`;
}

function matchesLine(item, key) {
  const k = item.cartKey || cartLineKey(item.id, item.variantSku);
  return k === key || item.id === key;
}

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
            countryName: String(loc.countryName || loc.country || defaultShipPreview.countryName).trim(),
            city: String(loc.city || defaultShipPreview.city).trim() || defaultShipPreview.city,
            state: String(loc.state ?? '').trim(),
            zip: String(loc.zip ?? '').trim(),
            displayLabel: String(loc.displayLabel || '').trim(),
          },
        }),
      openCart:  () => set({ cartOpen: true }),
      closeCart: () => set({ cartOpen: false }),

      addItem: (product, quantity = 1) => {
        const items = get().items;
        const id = product._id || product.id;
        const variantSku = String(product.variantSku || product.sku || '').trim();
        const key = cartLineKey(id, variantSku);
        const existing = items.find((i) => matchesLine(i, key));
        const unitPrice = Number(product.price) || 0;
        if (existing) {
          set({
            items: items.map((i) =>
              matchesLine(i, key) ? { ...i, quantity: i.quantity + quantity, price: unitPrice || i.price } : i,
            ),
          });
        } else {
          set({
            items: [
              ...items,
              {
                cartKey: key,
                id,
                title: product.title || product.name,
                price: unitPrice,
                image: product.images?.[0] || product.image || '',
                seller: product.seller?.storeName || product.sellerName || 'Seller',
                variantSku: variantSku || undefined,
                selectedColor: product.selectedColor,
                selectedSize: product.selectedSize,
                quantity,
              },
            ],
          });
        }
        void trackRecommendationActivity({
          eventType: 'cart_add',
          productId: String(id || ''),
          category: product?.category || '',
          tags: Array.isArray(product?.tags) ? product.tags : [],
          meta: { quantity, variantSku: variantSku || undefined },
        });
      },

      removeItem: (key) => {
        set({ items: get().items.filter((i) => !matchesLine(i, key)) });
        void trackRecommendationActivity({
          eventType: 'cart_remove',
          productId: String(key).split('::')[0] || String(key),
        });
      },

      updateQuantity: (key, quantity) => {
        if (quantity < 1) return get().removeItem(key);
        set({
          items: get().items.map((i) => (matchesLine(i, key) ? { ...i, quantity } : i)),
        });
      },

      clearCart: () => set({ items: [] }),

      /** Replace cart from cloud merge (cross-device sync). */
      replaceItems: (items, shippingPreviewLocation) => {
        const next = (items || []).map((i) => {
          const id = i.id || i.productId;
          const variantSku = i.variantSku ? String(i.variantSku).trim() : undefined;
          return {
            cartKey: i.cartKey || cartLineKey(id, variantSku),
            id,
            title: i.title || 'Product',
            price: Number(i.price) || 0,
            image: i.image || '',
            seller: i.seller || 'Seller',
            variantSku,
            quantity: Math.max(1, Number(i.quantity) || 1),
          };
        });
        const patch = { items: next };
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
