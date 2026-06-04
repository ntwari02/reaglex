import api from '@/services/api';

export type SystemFeatureImpact = 'low' | 'medium' | 'high' | 'critical';

export interface SystemFeatureItem {
  key: string;
  label: string;
  category: string;
  description: string;
  howItWorks: string;
  buyerImpact: string;
  adminImpact: string;
  impact: SystemFeatureImpact;
  enabled: boolean;
  defaultEnabled: boolean;
  hubRoute?: string;
  hubLabel?: string;
}

export interface SystemFeaturesCatalogResponse {
  features: SystemFeatureItem[];
  overrides: Record<string, boolean>;
  auditLog: Array<{
    at: string;
    actorEmail?: string;
    changes: Array<{ key: string; from: boolean; to: boolean }>;
    unlockVerified: boolean;
  }>;
  disableAcknowledgment: string;
  confirmPhraseRequired: string;
}

export const adminSystemFeaturesApi = {
  getCatalog: () =>
    api.get<SystemFeaturesCatalogResponse>('/admin/system-features').then((r) => r.data),

  requestUnlock: (body: {
    superAdminPassword: string;
    acknowledgment: string;
    confirmPhrase: string;
  }) =>
    api
      .post<{ unlockToken: string; expiresInSeconds: number }>('/admin/system-features/unlock', body)
      .then((r) => r.data),

  patchFeatures: (body: {
    updates: Array<{ key: string; enabled: boolean }>;
    unlockToken?: string;
    superAdminPassword?: string;
    acknowledgment?: string;
    confirmPhrase?: string;
  }) =>
    api
      .patch<{ success: boolean; features: SystemFeatureItem[] }>('/admin/system-features', body)
      .then((r) => r.data),

  getHomeLayout: () => api.get('/admin/system-features/home-layout').then((r) => r.data),

  saveHomeLayoutDraft: (sections: unknown) =>
    api
      .put('/admin/system-features/home-layout/draft', { sections })
      .then((r) => r.data),

  publishHomeLayout: (body: {
    superAdminPassword: string;
    acknowledgment: string;
    confirmPhrase: string;
  }) =>
    api.post('/admin/system-features/home-layout/publish', body).then((r) => r.data),

  resetHomeLayout: () =>
    api.post('/admin/system-features/home-layout/reset').then((r) => r.data),
};
