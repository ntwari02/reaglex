export type IntelligenceEntityType =
  | 'user'
  | 'seller'
  | 'order'
  | 'payment'
  | 'product'
  | 'vehicle'
  | 'support'
  | 'subscription';

export type QueryIntent =
  | 'email'
  | 'phone'
  | 'order_id'
  | 'payment_ref'
  | 'plate'
  | 'object_id'
  | 'general';

export interface IntelligenceSearchDocument {
  id: string;
  entityType: IntelligenceEntityType;
  entityId: string;
  title: string;
  subtitle: string;
  status?: string;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  module: string;
  moduleLabel: string;
  deepLink: string;
  searchText: string;
  metadata: Record<string, string>;
  updatedAt: number;
}

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
}

export interface IntelligenceSearchGroup {
  entityType: IntelligenceEntityType;
  label: string;
  icon: string;
  hits: IntelligenceSearchHit[];
}

export interface IntelligenceSearchResponse {
  query: string;
  intent: QueryIntent;
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
