import axios from 'axios';

import { API_BASE_URL } from '../lib/config';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // 60s — enough time for Render cold start
  headers: { 'Content-Type': 'application/json' },
});

// Attach auth token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Retry helper — retries up to `retries` times on network / timeout errors
async function withRetry(fn, retries = 2, delayMs = 1500) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isRetryable =
        err?.code === 'ECONNABORTED' || // timeout
        err?.code === 'ERR_NETWORK'  || // no connection
        (err?.response?.status >= 500);  // server error
      if (attempt === retries || !isRetryable) throw err;
      await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)));
    }
  }
}

// ── Retry logic (global) ───────────────────────────────────────────────────────
// Retry on network errors / timeouts or 5xx responses up to 3 times with backoff.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error?.config;
    if (!config) return Promise.reject(error);

    const status = error?.response?.status;
    const shouldRetry = !error.response || status >= 500;

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
  getProducts: (params = {}) => api.get('/products', { params }).then((r) => r.data),

  /** Single product by ID — retries on timeout/network errors */
  getProductById: (id) => api.get(`/products/${id}`).then((r) => r.data),

  /** Track a product view — fire-and-forget, never throws */
  trackView: (id) => api.post(`/products/${id}/view`).catch(() => null),
};

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authAPI = {
  login: (email, password) =>
    api.post('/auth/login', { email, password }).then((r) => r.data),

  register: (data) => api.post('/auth/register', data).then((r) => r.data),

  getCurrentUser: () => api.get('/auth/me').then((r) => r.data),
};

// ─── Orders (buyer checkout) ─────────────────────────────────────────────────

export const orderAPI = {
  create: (body) => api.post('/orders', body).then((r) => r.data),
};

// ─── Payments & Escrow ────────────────────────────────────────────────────────

export const paymentAPI = {
  /** @param payload `{ orderId, paymentMethod?: 'flutterwave'|'momo', momoPhone?: string }` or legacy string orderId */
  initialize: (orderIdOrPayload) => {
    const body =
      typeof orderIdOrPayload === 'string' ? { orderId: orderIdOrPayload } : orderIdOrPayload;
    return api.post('/payments/initialize', body).then((r) => r.data);
  },
  getMomoStatus: (referenceId) =>
    api
      .get(`/payments/momo/status/${encodeURIComponent(referenceId)}`, {
        params: { _: Date.now() },
        headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
      })
      .then((r) => r.data),
  verify: (transactionId, orderId) =>
    api
      .get('/payments/verify', {
        params: { transaction_id: transactionId, order_id: orderId },
      })
      .then((r) => r.data),
  confirmDelivery: (orderId) =>
    api.post(`/payments/orders/${orderId}/confirm-delivery`).then((r) => r.data),
  raiseDispute: (orderId, payload) =>
    api.post(`/payments/orders/${orderId}/dispute`, payload).then((r) => r.data),
  getEscrowStatus: (orderId) =>
    api.get(`/payments/orders/${orderId}/escrow-status`).then((r) => r.data),
  sellerWithdraw: (amount) =>
    api.post('/payments/seller/withdraw', { amount }).then((r) => r.data),
  adminResolveDispute: (disputeId, resolution) =>
    api
      .post(`/payments/admin/disputes/${disputeId}/resolve`, { resolution })
      .then((r) => r.data),
  adminEscrowOverview: () =>
    api.get('/payments/admin/escrow/overview').then((r) => r.data),
};

export default api;
