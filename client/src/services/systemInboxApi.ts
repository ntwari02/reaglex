import { API_BASE_URL } from '@/lib/config';

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('auth_token');
  const h: Record<string, string> = {};
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

export type SystemInboxRow = {
  _id: string;
  title: string;
  message: string;
  type: string;
  priority: string;
  actionUrl?: string;
  actionText?: string;
  createdAt: string;
  readBy?: string[];
};

/** In-app system inbox (same router as `/api/seller/notifications` — role-aware on the server). */
export const systemInboxApi = {
  async list(limit = 40, unreadOnly = false): Promise<{ notifications: SystemInboxRow[] }> {
    const qs = new URLSearchParams({
      limit: String(limit),
      unreadOnly: unreadOnly ? 'true' : 'false',
    });
    const res = await fetch(`${API_BASE_URL}/notifications?${qs}`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!res.ok) {
      let msg = `Request failed (${res.status})`;
      try {
        const d = await res.json();
        msg = (d as { message?: string }).message || msg;
      } catch {
        /* ignore */
      }
      throw new Error(msg);
    }
    return res.json();
  },

  async unreadCount(): Promise<number> {
    const res = await fetch(`${API_BASE_URL}/notifications/unread-count`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!res.ok) return 0;
    const d = await res.json();
    return typeof d?.count === 'number' ? d.count : 0;
  },

  async markRead(notificationId: string): Promise<void> {
    const res = await fetch(
      `${API_BASE_URL}/notifications/${encodeURIComponent(notificationId)}/read`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
      },
    );
    if (!res.ok) {
      let msg = `Request failed (${res.status})`;
      try {
        const d = await res.json();
        msg = (d as { message?: string }).message || msg;
      } catch {
        /* ignore */
      }
      throw new Error(msg);
    }
  },
};
