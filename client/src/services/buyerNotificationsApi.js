import { API_BASE_URL } from '../lib/config';

function getAuthHeaders() {
  const token = localStorage.getItem('auth_token');
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function handleJson(response) {
  if (!response.ok) {
    let msg = `Request failed (${response.status})`;
    try {
      const data = await response.json();
      msg = data?.message || msg;
    } catch {
      // ignore parse failures
    }
    throw new Error(msg);
  }
  return response.json();
}

export const buyerNotificationsApi = {
  async getNotifications(limit = 50) {
    const response = await fetch(`${API_BASE_URL}/buyer/notifications?limit=${encodeURIComponent(limit)}`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    return handleJson(response);
  },

  async getUnreadCount() {
    const response = await fetch(`${API_BASE_URL}/buyer/notifications/unread-count`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    return handleJson(response);
  },

  /** Persist read state for system inbox rows (`id` like `system:<mongoId>`). */
  async markSystemNotificationRead(compositeId) {
    if (typeof compositeId !== 'string' || !compositeId.startsWith('system:')) return;
    const raw = compositeId.slice('system:'.length);
    const response = await fetch(`${API_BASE_URL}/notifications/${encodeURIComponent(raw)}/read`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    return handleJson(response);
  },
};

export default buyerNotificationsApi;
