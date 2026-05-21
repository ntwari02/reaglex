import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';

import { API_BASE_URL } from '../lib/config';

const publicApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
});

declare module 'axios' {
  export interface InternalAxiosRequestConfig {
    _retryCount?: number;
  }
}

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // 60s — enough time for Render cold start
  headers: { 'Content-Type': 'application/json' },
});

// Attach auth token to every request
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Retry helper — retries up to `retries` times on network / timeout errors
async function withRetry<T>(fn: () => Promise<T>, retries = 2, delayMs = 1500): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      const e = err as {
        code?: string;
        response?: { status?: number };
      };
      const isRetryable =
        e?.code === 'ECONNABORTED' || // timeout
        e?.code === 'ERR_NETWORK' || // no connection
        (e?.response?.status != null && e.response.status >= 500); // server error
      if (attempt === retries || !isRetryable) throw err;
      await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)));
    }
  }
  throw new Error('withRetry: unreachable');
}

// ── Retry logic (global) ───────────────────────────────────────────────────────
// Retry on network errors / timeouts or 5xx responses up to 3 times with backoff.
api.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    const err = error as {
      config?: InternalAxiosRequestConfig;
      response?: { status?: number };
    };
    const config = err?.config;
    if (!config) return Promise.reject(error);

    const status = err?.response?.status;
    const url = String(config.url || '');
    const method = String(config.method || 'get').toLowerCase();
    const noRetryCheckout =
      method === 'post' &&
      (url === '/orders' ||
        url.startsWith('/orders?') ||
        url === '/shipping/quote' ||
        url.startsWith('/shipping/quote?') ||
        url === '/shipping/estimate' ||
        url.startsWith('/shipping/estimate?') ||
        url === '/payments/initialize' ||
        url.startsWith('/payments/initialize?'));
    const shouldRetry = !noRetryCheckout && (!err.response || (status != null && status >= 500));

    if (shouldRetry) {
      config._retryCount = config._retryCount || 0;
      if (config._retryCount < 3) {
        config._retryCount += 1;
        const delay = Math.pow(2, config._retryCount - 1) * 1000; // 1s,2s,4s
        await new Promise((r) => setTimeout(r, delay));
        console.log(`[API] Retrying request (attempt ${config._retryCount}/3):`, config.url);
        return api(config);
      }
    }

    return Promise.reject(error);
  }
);

// ─── Products ────────────────────────────────────────────────────────────────

export const productAPI = {
  /** List products with optional filters — retries on timeout/network errors */
  getProducts: (params: Record<string, unknown> = {}) =>
    api.get('/products', { params }).then((r) => r.data),

  /** Single product by ID — retries on timeout/network errors */
  getProductById: (id: string) => api.get(`/products/${encodeURIComponent(id)}`).then((r) => r.data),

  /** PDP by SEO slug (canonical URL) */
  getProductBySlug: (slug: string) =>
    api.get(`/products/by-slug/${encodeURIComponent(slug)}`).then((r) => r.data),

  /** Track a product view — fire-and-forget, never throws */
  trackView: (id: string) => api.post(`/products/${id}/view`).catch(() => null),

  /** Wishlist status/count (guest-safe) */
  getWishlistStatus: (id: string) => api.get(`/products/${id}/wishlist`).then((r) => r.data),

  /** Toggle wishlist (auth required) */
  toggleWishlist: (id: string) => api.post(`/products/${id}/wishlist`).then((r) => r.data),
};

/** Public category taxonomy + hub metadata (guest-safe, cached on API). */
export const categoriesAPI = {
  list: () => publicApi.get('/categories').then((r) => r.data),
  getBySlug: (slug: string) =>
    publicApi.get(`/categories/slug/${encodeURIComponent(slug)}`).then((r) => r.data),
};

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }).then((r) => r.data),

  register: (data: unknown) => api.post('/auth/register', data).then((r) => r.data),

  getCurrentUser: () => api.get('/auth/me').then((r) => r.data),
};

// ─── Orders (buyer checkout) ─────────────────────────────────────────────────

export const orderAPI = {
  create: (body: unknown) => api.post('/orders', body).then((r) => r.data),
  cancel: (orderId: string) => api.patch(`/orders/${orderId}/cancel`).then((r) => r.data),
  checkoutIntelligence: (body: unknown) =>
    api.post('/orders/checkout-intelligence', body).then((r) => r.data),
};

/** Reaglex multi-seller distance-based shipping quotes (buyer). */
export const shippingAPI = {
  quote: (body: unknown) => api.post('/shipping/quote', body).then((r) => r.data),
  /** Public coarse quote for guests (cart preview). */
  estimate: (body: unknown) => publicApi.post('/shipping/estimate', body).then((r) => r.data),
};

/** Seller shipping rules (warehouses, methods, zones). */
export const sellerShippingAPI = {
  get: () => api.get('/seller/shipping-settings').then((r) => r.data),
  put: (settings: unknown) => api.put('/seller/shipping-settings', settings).then((r) => r.data),
};

// ─── Payments & Escrow ────────────────────────────────────────────────────────

export const paymentAPI = {
  /** @param payload `{ orderId, paymentMethod?: 'flutterwave'|'momo', momoPhone?: string }` or legacy string orderId */
  initialize: (orderIdOrPayload: string | Record<string, unknown>) => {
    const body =
      typeof orderIdOrPayload === 'string' ? { orderId: orderIdOrPayload } : orderIdOrPayload;
    return api.post('/payments/initialize', body).then((r) => r.data);
  },
  getMomoStatus: (referenceId: string) =>
    api
      .get(`/payments/momo/status/${encodeURIComponent(referenceId)}`, {
        params: { _: Date.now() },
        headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
      })
      .then((r) => r.data),
  getAirtelStatus: (transactionId: string) =>
    api
      .get(`/payments/airtel/status/${encodeURIComponent(transactionId)}`, {
        params: { _: Date.now() },
        headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
      })
      .then((r) => r.data),
  /** After Stripe Checkout redirect (`session_id` in query). */
  stripeComplete: (sessionId: string) =>
    api.get('/payments/stripe/complete', { params: { session_id: sessionId } }).then((r) => r.data),
  /** After PayPal approval redirect (`token` = PayPal order id). */
  paypalComplete: (paypalOrderId: string) =>
    api.get('/payments/paypal/complete', { params: { token: paypalOrderId } }).then((r) => r.data),
  verify: (transactionId: string, orderId: string) =>
    api
      .get('/payments/verify', {
        params: { transaction_id: transactionId, order_id: orderId },
      })
      .then((r) => r.data),
  confirmDelivery: (orderId: string) =>
    api.post(`/payments/orders/${orderId}/confirm-delivery`).then((r) => r.data),
  raiseDispute: (orderId: string, payload: unknown) =>
    api.post(`/payments/orders/${orderId}/dispute`, payload).then((r) => r.data),
  getEscrowStatus: (orderId: string) =>
    api.get(`/payments/orders/${orderId}/escrow-status`).then((r) => r.data),
  sellerWallet: () => api.get('/payments/seller/wallet').then((r) => r.data),
  sellerWithdraw: (amount: number, password: string, payoutMethodId?: string) =>
    api.post('/payments/seller/withdraw', { amount, password, payoutMethodId }).then((r) => r.data),
  adminResolveDispute: (disputeId: string, resolution: unknown) =>
    api
      .post(`/payments/admin/disputes/${disputeId}/resolve`, { resolution })
      .then((r) => r.data),
  adminEscrowOverview: () => api.get('/payments/admin/escrow/overview').then((r) => r.data),
};

export default api;
