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
  /** Indexed document freshness (ms epoch) — used for recency ranking & UI grouping */
  updatedAt?: number;
  /** Best-effort last operational touch (defaults to updatedAt) */
  lastActivityAt?: number;
  /** Human label for UI, e.g. "Shipment updated" */
  activityLabel?: string;
  /** Subtle live indicator for in-flight operational states */
  isLive?: boolean;
  /** Open / unresolved operational item */
  isUnresolved?: boolean;
}

export interface IntelligenceSearchGroup {
  entityType: IntelligenceEntityType;
  label: string;
  icon: string;
  hits: IntelligenceSearchHit[];
}

export interface IntelligenceQueryUnderstanding {
  intent: QueryIntent;
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

/** Operational assistant card — rule-based by default, Gemini may refine copy. */
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

export interface IntelligenceSearchResponse {
  query: string;
  intent: QueryIntent;
  intentLabel: string;
  groups: IntelligenceSearchGroup[];
  total: number;
  tookMs: number;
  engine: 'meilisearch' | 'mongodb';
  cached: boolean;
  /** Records linked to primary matches (registry / population-style expansion). */
  graphExpanded?: number;
  /** Rule-based interpretation shown to admin (no AI). */
  understanding?: IntelligenceQueryUnderstanding;
  /** When search was capped for system safety */
  truncated?: boolean;
  /** Present when admin enabled Gemini assist and key is configured */
  aiInsight?: IntelligenceAiInsight;
  aiEnabled?: boolean;
  /** Primary operational card for the admin */
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
  /** Full registry view: buyer, seller, payments, disputes, etc. */
  connectedRecords?: IntelligenceConnectedRecord[];
  timeline?: Array<{ label: string; at: string }>;
}
