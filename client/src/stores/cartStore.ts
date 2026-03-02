import { create } from 'zustand';
import { useToastStore } from './toastStore';
import type { CartItem, Product, ProductVariant, Profile } from '../types';

export interface SellerGroup {
  sellerId: string;
  seller: Profile | null;
  items: CartItem[];
  subtotal: number;
  shippingCost: number;
  tax: number;
  discount: number;
  total: number;
  appliedCoupon: { code: string; discount: number } | null;
  shippingMethod?: string;
  deliveryEstimate?: string;
  isAvailable: boolean;
  warnings: string[];
}

export interface CartValidation {
  itemId: string;
  isValid: boolean;
  warnings: string[];
  priceChanged?: boolean;
  stockChanged?: boolean;
  unavailable?: boolean;
}

interface CartState {
  items: CartItem[];
  savedForLater: CartItem[];
  selectedItems: Set<string>;
  loading: boolean;
  validating: boolean;
  appliedCoupon: { code: string; discount: number } | null;
  sellerCoupons: Record<string, { code: string; discount: number }>;
  selectedSellers: Set<string>;
  fetchCart: (userId: string) => Promise<void>;
  addToCart: (userId: string | null | undefined, product: Product, variant?: ProductVariant, quantity?: number) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  removeItemsBySeller: (sellerId: string) => Promise<void>;
  clearCart: (userId: string) => Promise<void>;
  saveForLater: (itemId: string) => Promise<void>;
  moveToCart: (itemId: string) => Promise<void>;
  applyCoupon: (code: string, subtotal: number, sellerId?: string) => Promise<void>;
  removeCoupon: (sellerId?: string) => void;
  getSubtotal: () => number;
  getTotal: () => number;
  getSellerGroups: () => Promise<SellerGroup[]>;
  validateCart: () => Promise<CartValidation[]>;
  syncCartPrices: () => Promise<void>;
  selectSeller: (sellerId: string, selected: boolean) => void;
  selectAllSellers: () => void;
  deselectAllSellers: () => void;
  getSelectedItems: () => CartItem[];
  getSelectedSubtotal: () => number;
  getSelectedTotal: () => number;
  selectItem: (itemId: string, selected: boolean) => void;
  selectAllItems: () => void;
  deselectAllItems: () => void;
  removeSelectedItems: () => Promise<void>;
  moveSelectedToWishlist: () => Promise<void>;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  savedForLater: [],
  selectedItems: new Set<string>(),
  loading: false,
  validating: false,
  appliedCoupon: null,
  sellerCoupons: {},
  selectedSellers: new Set<string>(),

  fetchCart: async (userId: string) => {
    set({ loading: true });
    
    // Load from localStorage
    try {
      const stored = localStorage.getItem(`cart_${userId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
      set({ items: parsed, loading: false });
      // Auto-select all sellers by default
      const sellerIds = new Set(parsed.map((item: CartItem) => item.product?.seller_id).filter(Boolean));
      set({ selectedSellers: sellerIds });
      // Removed automatic validation to prevent cart values from being lost
      } else {
        // Cart is empty - set empty array
        set({ items: [], loading: false });
      }
    } catch (error) {
      console.error('Error loading cart from localStorage:', error);
      set({ items: [], loading: false });
    }
  },

  addToCart: async (userId, product, variant, quantity = 1) => {
    // Flowchart Step 1: Buyer Clicks Add to Cart
    // Flowchart Step 2: Check if Buyer is Logged In
    // - If not logged in (userId is null/undefined), proceed with guest mode
    // - If logged in, proceed with user cart
    // - If demo user (userId starts with 'demo-'), treat as guest mode
    
    const variantId = variant?.id;
    
    // Flowchart Step 3: Check if Product Already in Cart
    const existing = get().items.find(
      item => item.product_id === product.id && item.variant_id === variantId
    );

    // Guest cart or demo user: keep everything client-side only
    const isGuestOrDemo = !userId || userId.startsWith('demo-');
    if (isGuestOrDemo) {
      // Flowchart: Not Logged In → Guest Mode → Proceed to Cart
      if (existing) {
        // Flowchart: Product Already in Cart → Increase Quantity
        set({
          items: get().items.map(item =>
            item.id === existing.id
              ? { ...item, quantity: item.quantity + quantity, updated_at: new Date().toISOString() }
              : item
          ),
        });
      } else {
        // Flowchart: Product Not in Cart → Add Product as New Cart Item
        const now = new Date().toISOString();
        const newItem: CartItem = {
          id: `guest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          user_id: userId || 'guest',
          product_id: product.id,
          variant_id: variantId,
          quantity,
          created_at: now,
          updated_at: now,
          product,
          variant,
        };
        set({ items: [...get().items, newItem] });
      }
      // Save to localStorage for guest/demo users
      const currentItems = get().items;
      localStorage.setItem('guest_cart', JSON.stringify(currentItems));
      
      // Show toast notification
      const toastStore = useToastStore.getState();
      if (existing) {
        toastStore.showToast(`${product.title} quantity updated in cart!`, 'success');
      } else {
        toastStore.showToast(`${product.title} added to cart!`, 'success');
      }
      
      // After adding/updating, cart will automatically recalculate via useEffect in Cart component
      // Flowchart: → Group Items by Seller → Recalculate Subtotal → Calculate Shipping → Calculate Taxes
      return;
    }

    // Real logged-in user: persist to localStorage
    if (existing) {
      // Flowchart: Product Already in Cart → Increase Quantity
      await get().updateQuantity(existing.id, existing.quantity + quantity);
    } else {
      // Flowchart: Product Not in Cart → Add Product as New Cart Item
      const now = new Date().toISOString();
      const newItem: CartItem = {
        id: `user-${userId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        user_id: userId,
        product_id: product.id,
        variant_id: variantId,
        quantity,
        created_at: now,
        updated_at: now,
        product,
        variant,
      };
      set({ items: [...get().items, newItem] });
      
      // Save to localStorage
      localStorage.setItem(`cart_${userId}`, JSON.stringify(get().items));
      
      // Show toast notification
      const toastStore = useToastStore.getState();
      toastStore.showToast(`${product.title} added to cart!`, 'success');
    }
    // After adding/updating, cart will automatically recalculate via useEffect in Cart component
    // Flowchart: → Group Items by Seller → Recalculate Subtotal → Calculate Shipping → Calculate Taxes
  },

  updateQuantity: async (itemId: string, quantity: number) => {
    // Flowchart: User Updates Cart → Change Quantity → Loop back to Increase Quantity
    const existing = get().items.find(item => item.id === itemId);
    if (!existing) return;

    // Update locally
    const updatedItems = get().items.map(item =>
      item.id === itemId ? { ...item, quantity, updated_at: new Date().toISOString() } : item
    );
    set({ items: updatedItems });
    
    // Save to localStorage
    if (existing.user_id && !existing.user_id.startsWith('guest-')) {
      localStorage.setItem(`cart_${existing.user_id}`, JSON.stringify(updatedItems));
    } else {
      localStorage.setItem('guest_cart', JSON.stringify(updatedItems));
    }
    
    // Flowchart: After quantity change → Group Items by Seller → Recalculate Subtotal → Calculate Shipping → Calculate Taxes
  },

  removeItem: async (itemId: string) => {
    // Flowchart: User Updates Cart → Remove Item → Delete Cart Item → Loop back to Group Items by Seller
    const item = get().items.find(i => i.id === itemId);
    const productTitle = item?.product?.title || 'Item';
    const userId = item?.user_id;
    
    // Remove locally
    const updatedItems = get().items.filter(item => item.id !== itemId);
    set({ items: updatedItems });
    
    // Save to localStorage
    if (userId && !userId.startsWith('guest-')) {
      localStorage.setItem(`cart_${userId}`, JSON.stringify(updatedItems));
    } else {
      localStorage.setItem('guest_cart', JSON.stringify(updatedItems));
    }
    
    // Show toast notification
    const toastStore = useToastStore.getState();
    toastStore.showToast(`${productTitle} removed from cart`, 'success');
    
    // Flowchart: After removal → Group Items by Seller → Recalculate Subtotal → Calculate Shipping → Calculate Taxes
  },

  clearCart: async (userId: string) => {
    set({ items: [], appliedCoupon: null });
    // Clear from localStorage
    localStorage.removeItem(`cart_${userId}`);
    localStorage.removeItem('guest_cart');
  },

  applyCoupon: async (code: string, subtotal: number, sellerId?: string) => {
    // Flowchart: User Updates Cart → Apply Coupon → Validate Coupon → Apply Discount → Update Cart Summary
    // Note: Coupon validation should be done via API endpoint
    // For now, this is a placeholder that can be extended with API calls
    
    // Simple validation - in production, this should call an API endpoint
    const API_BASE = 'http://localhost:5000/api';
    try {
      const response = await fetch(`${API_BASE}/coupons/validate?code=${encodeURIComponent(code.toUpperCase())}&subtotal=${subtotal}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Invalid coupon code');
      }

      const coupon = await response.json();
      
      // Step 2: Apply Discount
      let discount = 0;
      if (coupon.discount_type === 'percentage') {
        discount = (subtotal * coupon.discount_value) / 100;
        if (coupon.max_discount_amount) {
          discount = Math.min(discount, coupon.max_discount_amount);
        }
      } else {
        discount = coupon.discount_value;
      }

      // Step 3: Update Cart Summary (store discount)
      if (sellerId) {
        set({ sellerCoupons: { ...get().sellerCoupons, [sellerId]: { code: coupon.code, discount } } });
      } else {
        set({ appliedCoupon: { code: coupon.code, discount } });
      }
      // Flowchart: After discount applied → Update Cart Summary → Recalculate totals
    } catch (error: any) {
      throw new Error(error.message || 'Failed to apply coupon');
    }
  },

  removeCoupon: (sellerId?: string) => {
    if (sellerId) {
      const { [sellerId]: removed, ...rest } = get().sellerCoupons;
      set({ sellerCoupons: rest });
    } else {
      set({ appliedCoupon: null });
    }
  },

  getSubtotal: () => {
    return get().items.reduce((sum, item) => {
      const price = item.variant?.price || item.product?.price || 0;
      return sum + (price * item.quantity);
    }, 0);
  },

  getTotal: () => {
    const subtotal = get().getSubtotal();
    const discount = get().appliedCoupon?.discount || 0;
    return Math.max(0, subtotal - discount);
  },

  getSellerGroups: async (): Promise<SellerGroup[]> => {
    // Flowchart: Group Items by Seller → Recalculate Subtotal → Calculate Shipping Per Seller → Calculate Taxes
    const items = get().items;
    const groups: Record<string, SellerGroup> = {};

    // Step 1: Group Items by Seller
    for (const item of items) {
      if (!item.product?.seller_id) continue;
      const sellerId = item.product.seller_id;

      if (!groups[sellerId]) {
        // Fetch seller profile from API
        try {
          const API_BASE = 'http://localhost:5000/api';
          const response = await fetch(`${API_BASE}/sellers/${sellerId}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          let seller: Profile | null = null;
          if (response.ok) {
            const data = await response.json();
            seller = data.seller || data;
          }
          
          groups[sellerId] = {
            sellerId,
            seller,
            items: [],
            subtotal: 0,
            shippingCost: 0,
            tax: 0,
            discount: 0,
            total: 0,
            appliedCoupon: get().sellerCoupons[sellerId] || null,
            isAvailable: true,
            warnings: [],
          };
        } catch (error) {
          console.error('Error fetching seller:', error);
          groups[sellerId] = {
            sellerId,
            seller: null,
            items: [],
            subtotal: 0,
            shippingCost: 0,
            tax: 0,
            discount: 0,
            total: 0,
            appliedCoupon: get().sellerCoupons[sellerId] || null,
            isAvailable: true,
            warnings: [],
          };
        }
      }

      groups[sellerId].items.push(item);
      const price = item.variant?.price || item.product?.price || 0;
      // Step 2: Recalculate Subtotal (per seller)
      groups[sellerId].subtotal += price * item.quantity;
    }

    // Step 3: Calculate totals for each group
    const result = Object.values(groups).map(group => {
      const discount = group.appliedCoupon?.discount || 0;
      const subtotalAfterDiscount = Math.max(0, group.subtotal - discount);
      // Step 4: Calculate Taxes (per seller)
      group.tax = subtotalAfterDiscount * 0.1;
      // Step 5: Calculate Shipping Per Seller
      group.shippingCost = 5;
      group.total = subtotalAfterDiscount + group.tax + group.shippingCost;
      return group;
    });

    return result;
  },

  validateCart: async (): Promise<CartValidation[]> => {
    set({ validating: true });
    const items = get().items;
    const validations: CartValidation[] = [];

    for (const item of items) {
      if (!item.product_id) continue;

      const validation: CartValidation = {
        itemId: item.id,
        isValid: true,
        warnings: [],
      };

      // Fetch current product data from API
      let product = null;
      try {
        const API_BASE = 'http://localhost:5000/api';
        const response = await fetch(`${API_BASE}/products/${item.product_id}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          product = await response.json();
        }
      } catch (error) {
        console.error('Error fetching product for validation:', error);
      }

      if (!product || product.status !== 'active') {
        validation.isValid = false;
        validation.unavailable = true;
        validation.warnings.push('Product is no longer available');
      } else {
        const currentPrice = item.variant_id
          ? product.variant?.find((v: ProductVariant) => v.id === item.variant_id)?.price || product.price
          : product.price;
        const cartPrice = item.variant?.price || item.product?.price || 0;

        if (currentPrice !== cartPrice) {
          validation.priceChanged = true;
          validation.warnings.push(`Price changed from ${cartPrice} to ${currentPrice}`);
        }

        const currentStock = item.variant_id
          ? product.variant?.find((v: ProductVariant) => v.id === item.variant_id)?.stock_quantity || product.stock_quantity
          : product.stock_quantity;

        if (currentStock < item.quantity) {
          validation.isValid = false;
          validation.stockChanged = true;
          validation.warnings.push(`Only ${currentStock} items available (requested ${item.quantity})`);
        }
      }

      validations.push(validation);
    }

    set({ validating: false });
    return validations;
  },

  syncCartPrices: async () => {
    const items = get().items;
    const updatedItems: CartItem[] = [];

    for (const item of items) {
      // Keep guest items and items without product_id as-is
      if (!item.product_id || item.id.startsWith('guest-')) {
        updatedItems.push(item);
        continue;
      }

      // Only sync prices for logged-in user items with product_id
      let product = null;
      try {
        const API_BASE = 'http://localhost:5000/api';
        const response = await fetch(`${API_BASE}/products/${item.product_id}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          product = await response.json();
        }
      } catch (error) {
        console.error('Error fetching product for price sync:', error);
      }

      if (product) {
        const currentPrice = item.variant_id
          ? product.variant?.find((v: ProductVariant) => v.id === item.variant_id)?.price || product.price
          : product.price;

        updatedItems.push({
          ...item,
          product: product as Product,
          variant: item.variant_id
            ? product.variant?.find((v: ProductVariant) => v.id === item.variant_id)
            : undefined,
        });
      } else {
        // Keep item even if product not found (might be deleted)
        updatedItems.push(item);
      }
    }

    set({ items: updatedItems });
  },

  selectSeller: (sellerId: string, selected: boolean) => {
    const selectedSellers = new Set(get().selectedSellers);
    if (selected) {
      selectedSellers.add(sellerId);
    } else {
      selectedSellers.delete(sellerId);
    }
    set({ selectedSellers });
  },

  selectAllSellers: () => {
    const items = get().items;
    const sellerIds = new Set(items.map(item => item.product?.seller_id).filter(Boolean));
    set({ selectedSellers: sellerIds });
  },

  deselectAllSellers: () => {
    set({ selectedSellers: new Set() });
  },

  removeItemsBySeller: async (sellerId: string) => {
    const items = get().items;
    const itemsToRemove = items.filter(item => item.product?.seller_id === sellerId);
    
    for (const item of itemsToRemove) {
      await get().removeItem(item.id);
    }
  },

  getSelectedItems: () => {
    const items = get().items;
    const selectedSellers = get().selectedSellers;
    return items.filter(item => item.product?.seller_id && selectedSellers.has(item.product.seller_id));
  },

  getSelectedSubtotal: () => {
    return get().getSelectedItems().reduce((sum, item) => {
      const price = item.variant?.price || item.product?.price || 0;
      return sum + (price * item.quantity);
    }, 0);
  },

  getSelectedTotal: () => {
    const subtotal = get().getSelectedSubtotal();
    const discount = get().appliedCoupon?.discount || 0;
    // Simple calculation - in real app, calculate shipping and tax per seller
    const estimatedShipping = get().selectedSellers.size * 5;
    const estimatedTax = (subtotal - discount) * 0.1;
    return Math.max(0, subtotal - discount + estimatedShipping + estimatedTax);
  },

  saveForLater: async (itemId: string) => {
    const item = get().items.find(i => i.id === itemId);
    if (!item) return;

    // Remove from cart
    await get().removeItem(itemId);
    
    // Add to saved for later
    set({ savedForLater: [...get().savedForLater, item] });
    
    // Save to localStorage for guest users
    const savedItems = get().savedForLater;
    if (item.user_id?.startsWith('guest-')) {
      localStorage.setItem('saved_for_later', JSON.stringify(savedItems));
    }
  },

  moveToCart: async (itemId: string) => {
    const item = get().savedForLater.find(i => i.id === itemId);
    if (!item || !item.product) return;

    // Remove from saved for later
    set({ savedForLater: get().savedForLater.filter(i => i.id !== itemId) });
    
    // Add back to cart
    const userId = item.user_id && !item.user_id.startsWith('guest-') ? item.user_id : null;
    await get().addToCart(userId, item.product, item.variant, item.quantity);
  },

  selectItem: (itemId: string, selected: boolean) => {
    const selectedItems = new Set(get().selectedItems);
    if (selected) {
      selectedItems.add(itemId);
    } else {
      selectedItems.delete(itemId);
    }
    set({ selectedItems });
  },

  selectAllItems: () => {
    const itemIds = new Set(get().items.map(item => item.id));
    set({ selectedItems: itemIds });
  },

  deselectAllItems: () => {
    set({ selectedItems: new Set() });
  },

  removeSelectedItems: async () => {
    const selectedItems = get().selectedItems;
    for (const itemId of selectedItems) {
      await get().removeItem(itemId);
    }
    set({ selectedItems: new Set() });
  },

  moveSelectedToWishlist: async () => {
    const { useWishlistStore } = await import('./wishlistStore');
    const { addToWishlist } = useWishlistStore.getState();
    const selectedItems = get().selectedItems;
    const items = get().items;
    
    for (const itemId of selectedItems) {
      const item = items.find(i => i.id === itemId);
      if (item?.product) {
        const userId = item.user_id && !item.user_id.startsWith('guest-') ? item.user_id : null;
        await addToWishlist(userId, item.product);
        await get().removeItem(itemId);
      }
    }
    set({ selectedItems: new Set() });
  },
}));
