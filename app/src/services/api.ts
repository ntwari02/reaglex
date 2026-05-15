import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await AsyncStorage.getItem('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

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
        const delay = Math.pow(2, config._retryCount - 1) * 1000;
        await new Promise((r) => setTimeout(r, delay));
        console.log(`[API] Retrying request (attempt ${config._retryCount}/3):`, config.url);
        return api(config);
      }
    }

    return Promise.reject(error);
  },
);

export const productAPI = {
  getProducts: (params: Record<string, unknown> = {}) =>
    api.get('/products', { params }).then((r) => r.data),
  getProductById: (id: string) => api.get(`/products/${id}`).then((r) => r.data),
  trackView: (id: string) => api.post(`/products/${id}/view`).catch(() => null),
};

export const orderAPI = {
  create: (body: unknown) => api.post('/orders', body).then((r) => r.data),
  cancel: (orderId: string) => api.patch(`/orders/${orderId}/cancel`).then((r) => r.data),
};

export const shippingAPI = {
  quote: (body: unknown) => api.post('/shipping/quote', body).then((r) => r.data),
  estimate: (body: unknown) => publicApi.post('/shipping/estimate', body).then((r) => r.data),
};

export const sellerShippingAPI = {
  get: () => api.get('/seller/shipping-settings').then((r) => r.data),
  put: (settings: unknown) => api.put('/seller/shipping-settings', settings).then((r) => r.data),
};

export const paymentAPI = {
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
  stripeComplete: (sessionId: string) =>
    api.get('/payments/stripe/complete', { params: { session_id: sessionId } }).then((r) => r.data),
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
  sellerWithdraw: (amount: number, password: string) =>
    api.post('/payments/seller/withdraw', { amount, password }).then((r) => r.data),
  sellerWallet: () => api.get('/payments/seller/wallet').then((r) => r.data),
  adminResolveDispute: (disputeId: string, resolution: unknown) =>
    api.post(`/payments/admin/disputes/${disputeId}/resolve`, { resolution }).then((r) => r.data),
  adminEscrowOverview: () => api.get('/payments/admin/escrow/overview').then((r) => r.data),
};

export const sellerSubscriptionAPI = {
  getPlans: () => api.get('/seller/subscription/plans').then((r) => r.data),
  getCurrent: () => api.get('/seller/subscription/current').then((r) => r.data),
  upgrade: (tierId: string) => api.post('/seller/subscription/upgrade', { tierId }).then((r) => r.data),
};

export const publicPaymentGatewayAPI = {
  getEnabled: () => publicApi.get('/public/payment-gateways').then((r) => r.data),
};

export default api;
