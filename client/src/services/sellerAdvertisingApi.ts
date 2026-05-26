import { API_BASE_URL } from '../lib/config';

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export type AdvertisingInquiryPayload = {
  companyName: string;
  email: string;
  budget?: string;
  adType: string;
  message?: string;
};

export async function submitAdvertisingInquiry(payload: AdvertisingInquiryPayload) {
  const response = await fetch(`${API_BASE_URL}/public/advertising/inquiries`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.message || 'Failed to submit inquiry');
  }
  return data as { message: string; leadId?: string };
}
