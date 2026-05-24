import { API_BASE_URL } from '@/lib/config';

export type IntelligenceEntityType =
  | 'user'
  | 'seller'
  | 'order'
  | 'payment'
  | 'product'
  | 'vehicle'
  | 'support'
  | 'subscription';

export interface IntelligenceSearchHit {
  id: string;
  entityType: IntelligenceEntityType;
  entityId: string;
  title: string;
  subtitle: string;
  status?: string;
  statusTone?: 'ok' | 'warn' | 'critical' | 'info';
  module: string;
  moduleLabel: string;
  deepLink: string;
  metadata: Record<string, string>;
}

export interface IntelligenceSearchGroup {
  entityType: IntelligenceEntityType;
  label: string;
  icon: string;
  hits: IntelligenceSearchHit[];
}

export interface IntelligenceSearchResponse {
  query: string;
  intent: string;
  intentLabel: string;
  groups: IntelligenceSearchGroup[];
  total: number;
  tookMs: number;
  engine: 'meilisearch' | 'mongodb';
  cached: boolean;
}

export interface IntelligenceEntityPreview {
  entityType: IntelligenceEntityType;
  entityId: string;
  title: string;
  subtitle: string;
  status?: string;
  statusTone?: 'ok' | 'warn' | 'critical' | 'info';
  fields: Array<{ label: string; value: string; masked?: boolean }>;
  actions: Array<{ label: string; href: string; primary?: boolean }>;
  relationships: Array<{ label: string; count: number; href: string }>;
}

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('auth_token');
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

export const adminIntelligenceSearchApi = {
  async search(q: string, limit = 24): Promise<IntelligenceSearchResponse> {
    const qs = new URLSearchParams({ q, limit: String(limit) });
    const res = await fetch(`${API_BASE_URL}/admin/intelligence/search?${qs}`, {
      headers: authHeaders(),
      credentials: 'include',
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw new Error((d as { message?: string }).message || 'Search failed');
    }
    return res.json();
  },

  async preview(entityType: IntelligenceEntityType, entityId: string): Promise<IntelligenceEntityPreview> {
    const res = await fetch(
      `${API_BASE_URL}/admin/intelligence/preview/${encodeURIComponent(entityType)}/${encodeURIComponent(entityId)}`,
      { headers: authHeaders(), credentials: 'include' },
    );
    if (!res.ok) throw new Error('Preview unavailable');
    const data = await res.json();
    return data.preview as IntelligenceEntityPreview;
  },

  async status() {
    const res = await fetch(`${API_BASE_URL}/admin/intelligence/status`, {
      headers: authHeaders(),
      credentials: 'include',
    });
    return res.json();
  },
};
