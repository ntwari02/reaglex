import api from './api';

const BASE = '/live-commerce';

export const liveCommerceApi = {
  getPublicSettings: () => api.get(`${BASE}/settings/public`).then((r) => r.data),
  getProviders: () => api.get(`${BASE}/providers`).then((r) => r.data),
  discover: (limit = 12) => api.get(`${BASE}/discover`, { params: { limit } }).then((r) => r.data),
  getSession: (sessionId) => api.get(`${BASE}/session/${sessionId}`).then((r) => r.data),
  getReplay: (sessionId) => api.get(`${BASE}/session/${sessionId}/replay`).then((r) => r.data),
  startSession: (payload) => api.post(`${BASE}/session`, payload).then((r) => r.data),
  startStream: (sessionId, payload) =>
    api.post(`${BASE}/session/${sessionId}/stream/start`, payload).then((r) => r.data),
  endStream: (sessionId) =>
    api.post(`${BASE}/session/${sessionId}/stream/end`).then((r) => r.data),
  getStreamCredentials: (sessionId) =>
    api.get(`${BASE}/session/${sessionId}/stream/credentials`).then((r) => r.data),
  placeBid: (sessionId, payload) =>
    api.post(`${BASE}/session/${sessionId}/bid`, payload).then((r) => r.data),
  getAdminSettings: () => api.get(`${BASE}/admin/settings`).then((r) => r.data),
  updateAdminSettings: (payload) => api.put(`${BASE}/admin/settings`, payload).then((r) => r.data),
  getAdminSessions: () => api.get(`${BASE}/admin/sessions`).then((r) => r.data),
  patchAdminSession: (sessionId, payload) =>
    api.patch(`${BASE}/admin/session/${sessionId}`, payload).then((r) => r.data),
  setSellerLivePermission: (sellerId, approved) =>
    api.patch(`${BASE}/admin/seller/${sellerId}/live-permission`, { approved }).then((r) => r.data),
  getAdminSellerLivePermissions: (params) =>
    api.get(`${BASE}/admin/sellers/live-permissions`, { params }).then((r) => r.data),
  getSellerLiveStatus: () => api.get(`${BASE}/seller/live-status`).then((r) => r.data),
  endStaleSellerLive: () => api.post(`${BASE}/seller/end-stale-live`).then((r) => r.data),
  getSessionComments: (sessionId) =>
    api.get(`${BASE}/session/${sessionId}/comments`).then((r) => r.data),
  getSellerProducts: (sessionId) =>
    api.get(`${BASE}/session/${sessionId}/seller-products`).then((r) => r.data),
};
