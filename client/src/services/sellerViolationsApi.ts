import { API_BASE_URL } from '../lib/config';

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export type ViolationAppealPayload = {
  ticketNumber: string;
  explanation: string;
  evidenceUrls?: string[];
};

export async function uploadAppealEvidence(files: File[]) {
  const form = new FormData();
  files.forEach((file) => form.append('attachments', file));

  const response = await fetch(`${API_BASE_URL}/seller/violations/appeals/upload`, {
    method: 'POST',
    headers: authHeaders(),
    credentials: 'include',
    body: form,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.message || 'Failed to upload evidence');
  }
  return data as { urls: string[]; files: Array<{ path: string; originalName: string }> };
}

export async function submitViolationAppeal(payload: ViolationAppealPayload) {
  const response = await fetch(`${API_BASE_URL}/seller/violations/appeals`, {
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
    throw new Error(data?.message || 'Failed to submit appeal');
  }
  return data as { message: string; appeal: { id: string; ticketNumber: string; status: string } };
}
