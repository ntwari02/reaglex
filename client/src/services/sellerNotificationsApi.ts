import { API_BASE_URL } from '../lib/config';

function getAuthHeaders() {
  const token = localStorage.getItem('auth_token');
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function handleJson(response: Response) {
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

export const sellerNotificationsApi = {
  async getNotifications(limit = 50, unreadOnly = false) {
    const qs = new URLSearchParams({
      limit: String(limit),
      unreadOnly: unreadOnly ? 'true' : 'false',
    });
    const response = await fetch(`${API_BASE_URL}/seller/notifications?${qs.toString()}`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    return handleJson(response);
  },

  async markAsRead(notificationId: string) {
    const response = await fetch(`${API_BASE_URL}/seller/notifications/${encodeURIComponent(notificationId)}/read`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    return handleJson(response);
  },

  async getUnreadCount() {
    const response = await fetch(`${API_BASE_URL}/seller/notifications/unread-count`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    return handleJson(response);
  },
};

export default sellerNotificationsApi;
