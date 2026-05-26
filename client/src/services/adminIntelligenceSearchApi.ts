import { API_BASE_URL } from '@/lib/config';

export type IntelligenceEntityType =
  | 'user'
  | 'seller'
  | 'order'
  | 'payment'
  | 'product'
  | 'vehicle'
  | 'support'
  | 'subscription'
  | 'dispute';

export interface IntelligenceSearchHit {
  id: string;
  entityType: IntelligenceEntityType;
  entityId: string;
  title: string;
  subtitle: string;
  status?: string;
  statusTone?: 'ok' | 'warn' | 'critical' | 'info';
  riskLevel?: string;
  module: string;
  moduleLabel: string;
  deepLink: string;
  metadata: Record<string, string>;
  score?: number;
  updatedAt?: number;
  lastActivityAt?: number;
  activityLabel?: string;
  isLive?: boolean;
  isUnresolved?: boolean;
}

export interface IntelligenceSearchGroup {
  entityType: IntelligenceEntityType;
  label: string;
  icon: string;
  hits: IntelligenceSearchHit[];
}

export interface IntelligenceQueryUnderstanding {
  intent: string;
  intentLabel: string;
  summary: string;
  searchScope: string[];
  tips: string[];
  keywords: string[];
}

export interface IntelligenceAiInsight {
  interpretation: string;
  nextSteps: string[];
  alternativeQueries: string[];
  extractedTerms: string[];
  focusModules: string[];
}

export type IntelligenceConfidence = 'high' | 'medium' | 'low';

export type IntelligenceAssistantActionKind =
  | 'expand'
  | 'navigate'
  | 'search'
  | 'deep_search';

export interface IntelligenceAssistantAction {
  id: string;
  label: string;
  kind: IntelligenceAssistantActionKind;
  href?: string;
  query?: string;
  sectionId?: string;
}

export interface IntelligenceExpandableSection {
  id: string;
  title: string;
  preview: string;
  items: Array<{ label: string; value: string; href?: string }>;
}

export interface IntelligenceAssistantBrief {
  title: string;
  confidence: IntelligenceConfidence;
  confidenceLabel: string;
  summary: string;
  suggestedAction: string;
  mode: 'rules' | 'gemini';
  topResults: IntelligenceSearchHit[];
  moreResultsCount: number;
  relatedInfo: Array<{ label: string; hint: string; href?: string }>;
  expandableSections: IntelligenceExpandableSection[];
  actions: IntelligenceAssistantAction[];
  alternativeQueries: string[];
}

export interface IntelligenceAiConfig {
  geminiConfigured: boolean;
  platformAiEnabled: boolean;
  userAiAssistEnabled: boolean;
  aiAvailable: boolean;
  canManagePlatformAi?: boolean;
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
  graphExpanded?: number;
  understanding?: IntelligenceQueryUnderstanding;
  truncated?: boolean;
  aiInsight?: IntelligenceAiInsight;
  aiEnabled?: boolean;
  assistant?: IntelligenceAssistantBrief;
}

export interface IntelligenceConnectedRecord {
  entityType: IntelligenceEntityType;
  entityId: string;
  title: string;
  subtitle: string;
  status?: string;
  href: string;
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
  connectedRecords?: IntelligenceConnectedRecord[];
  timeline?: Array<{ label: string; at: string }>;
}

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('auth_token');
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

export const adminIntelligenceSearchApi = {
  async getConfig(): Promise<IntelligenceAiConfig> {
    const res = await fetch(`${API_BASE_URL}/admin/intelligence/config`, {
      headers: authHeaders(),
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to load intelligence config');
    return res.json();
  },

  async setPlatformAi(enabled: boolean): Promise<IntelligenceAiConfig> {
    const res = await fetch(`${API_BASE_URL}/admin/intelligence/settings`, {
      method: 'PATCH',
      headers: authHeaders(),
      credentials: 'include',
      body: JSON.stringify({ platformAiEnabled: enabled }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw new Error((d as { message?: string }).message || 'Failed to update platform AI');
    }
    return res.json();
  },

  async setAiAssist(enabled: boolean): Promise<IntelligenceAiConfig> {
    const res = await fetch(`${API_BASE_URL}/admin/intelligence/preferences`, {
      method: 'PATCH',
      headers: authHeaders(),
      credentials: 'include',
      body: JSON.stringify({ aiAssistEnabled: enabled }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw new Error((d as { message?: string }).message || 'Failed to save AI preference');
    }
    return res.json();
  },

  async suggest(q: string): Promise<{
    understanding: IntelligenceQueryUnderstanding;
    assistant?: IntelligenceAssistantBrief;
    ready: boolean;
    examples: Array<{ label: string; value: string; hint: string }>;
    aiTypingHint?: string;
  }> {
    const qs = new URLSearchParams({ q });
    const res = await fetch(`${API_BASE_URL}/admin/intelligence/suggest?${qs}`, {
      headers: authHeaders(),
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Suggest failed');
    return res.json();
  },

  async search(q: string, limit = 24, signal?: AbortSignal): Promise<IntelligenceSearchResponse> {
    const qs = new URLSearchParams({ q, limit: String(limit) });
    const res = await fetch(`${API_BASE_URL}/admin/intelligence/search?${qs}`, {
      headers: authHeaders(),
      credentials: 'include',
      signal,
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw new Error((d as { message?: string }).message || 'Search failed');
    }
    return res.json();
  },

  async preview(
    entityType: IntelligenceEntityType,
    entityId: string,
    depth: 'lite' | 'full' = 'lite',
    signal?: AbortSignal,
  ): Promise<IntelligenceEntityPreview> {
    const qs = new URLSearchParams({ depth });
    const res = await fetch(
      `${API_BASE_URL}/admin/intelligence/preview/${encodeURIComponent(entityType)}/${encodeURIComponent(entityId)}?${qs}`,
      { headers: authHeaders(), credentials: 'include', signal },
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
