import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000, // 20s — gives the server time to cold-start
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

// ─── Products ────────────────────────────────────────────────────────────────

export const productAPI = {
  /** List products with optional filters — retries on timeout/network errors */
  getProducts: (params = {}) =>
    withRetry(() => api.get('/products', { params }).then((r) => r.data)),

  /** Single product by ID — retries on timeout/network errors */
  getProductById: (id) =>
    withRetry(() => api.get(`/products/${id}`).then((r) => r.data)),

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

// ─── Payments & Escrow ────────────────────────────────────────────────────────

export const paymentAPI = {
  initialize: (orderId) =>
    api.post('/payments/initialize', { orderId }).then((r) => r.data),
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
