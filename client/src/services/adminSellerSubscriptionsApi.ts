import { API_BASE_URL } from '@/lib/config';

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('auth_token');
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const d = await res.json();
      msg = (d as { message?: string })?.message || msg;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

export const adminSellerSubscriptionsApi = {
  async listPlans() {
    const res = await fetch(`${API_BASE_URL}/admin/seller-subscriptions/plans`, {
      headers: authHeaders(),
      credentials: 'include',
    });
    return json<{ plans: Array<Record<string, unknown>> }>(res);
  },

  async list(params: { page?: number; limit?: number; search?: string }) {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', String(params.page));
    if (params.limit) qs.set('limit', String(params.limit));
    if (params.search) qs.set('search', params.search);
    const res = await fetch(`${API_BASE_URL}/admin/seller-subscriptions?${qs}`, {
      headers: authHeaders(),
      credentials: 'include',
    });
    return json<{
      items: Array<{
        id: string;
        userId: string;
        email: string;
        fullName: string;
        store_name: string;
        tier_id?: string;
        tier_name?: string;
        plan_status?: string;
        subscription_status?: string;
        is_active: boolean;
        renewal_date?: string;
        auto_renew?: boolean;
      }>;
      total: number;
      page: number;
      limit: number;
    }>(res);
  },

  async getBySellerUserId(userId: string) {
    const res = await fetch(
      `${API_BASE_URL}/admin/seller-subscriptions/seller/${encodeURIComponent(userId)}`,
      { headers: authHeaders(), credentials: 'include' },
    );
    return json<{ subscription: Record<string, unknown>; user: { email: string; fullName: string; id: string } }>(
      res,
    );
  },

  async assignTier(userId: string, tierId: string) {
    const res = await fetch(
      `${API_BASE_URL}/admin/seller-subscriptions/seller/${encodeURIComponent(userId)}/tier`,
      {
        method: 'PATCH',
        headers: authHeaders(),
        credentials: 'include',
        body: JSON.stringify({ tierId }),
      },
    );
    return json<{ message: string }>(res);
  },

  async setStatus(userId: string, action: 'suspend' | 'reactivate' | 'pause') {
    const res = await fetch(
      `${API_BASE_URL}/admin/seller-subscriptions/seller/${encodeURIComponent(userId)}/status`,
      {
        method: 'PATCH',
        headers: authHeaders(),
        credentials: 'include',
        body: JSON.stringify({ action }),
      },
    );
    return json<{ message: string }>(res);
  },

  async cancel(userId: string, reason: string) {
    const res = await fetch(
      `${API_BASE_URL}/admin/seller-subscriptions/seller/${encodeURIComponent(userId)}/cancel`,
      {
        method: 'PATCH',
        headers: authHeaders(),
        credentials: 'include',
        body: JSON.stringify({ reason }),
      },
    );
    return json<{ message: string }>(res);
  },

  async setAutoRenew(userId: string, autoRenew: boolean) {
    const res = await fetch(
      `${API_BASE_URL}/admin/seller-subscriptions/seller/${encodeURIComponent(userId)}/auto-renew`,
      {
        method: 'PATCH',
        headers: authHeaders(),
        credentials: 'include',
        body: JSON.stringify({ autoRenew }),
      },
    );
    return json<{ message: string }>(res);
  },

  async extendRenewal(userId: string, days: number) {
    const res = await fetch(
      `${API_BASE_URL}/admin/seller-subscriptions/seller/${encodeURIComponent(userId)}/extend-renewal`,
      {
        method: 'POST',
        headers: authHeaders(),
        credentials: 'include',
        body: JSON.stringify({ days }),
      },
    );
    return json<{ message: string; renewal_date?: string }>(res);
  },

  async extendTrial(userId: string, days: number) {
    const res = await fetch(
      `${API_BASE_URL}/admin/seller-subscriptions/seller/${encodeURIComponent(userId)}/extend-trial`,
      {
        method: 'POST',
        headers: authHeaders(),
        credentials: 'include',
        body: JSON.stringify({ days }),
      },
    );
    return json<{ message: string; trial_end_date?: string }>(res);
  },

  async overrideLimits(
    userId: string,
    body: { productLimit?: number | null; apiCallsPerMonth?: number | null; storageBytes?: number | null },
  ) {
    const res = await fetch(
      `${API_BASE_URL}/admin/seller-subscriptions/seller/${encodeURIComponent(userId)}/override-limits`,
      {
        method: 'PATCH',
        headers: authHeaders(),
        credentials: 'include',
        body: JSON.stringify(body),
      },
    );
    return json<{ message: string; overrides: Record<string, unknown> }>(res);
  },

  async applyCoupon(userId: string, code: string) {
    const res = await fetch(
      `${API_BASE_URL}/admin/seller-subscriptions/seller/${encodeURIComponent(userId)}/apply-coupon`,
      {
        method: 'POST',
        headers: authHeaders(),
        credentials: 'include',
        body: JSON.stringify({ code }),
      },
    );
    return json<{ message: string; code: string }>(res);
  },

  async retryPayment(userId: string) {
    const res = await fetch(
      `${API_BASE_URL}/admin/seller-subscriptions/seller/${encodeURIComponent(userId)}/retry-payment`,
      {
        method: 'POST',
        headers: authHeaders(),
        credentials: 'include',
      },
    );
    return json<{ message: string; simulated?: boolean }>(res);
  },
};
