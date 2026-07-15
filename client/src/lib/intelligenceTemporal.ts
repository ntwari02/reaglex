import type { IntelligenceSearchHit } from '@/services/adminIntelligenceSearchApi';

export type TimeBucket = 'today' | 'yesterday' | 'this_week' | 'older';

export type TimeFilterId =
  | 'all'
  | 'today'
  | '24h'
  | 'week'
  | 'month'
  | 'active'
  | 'updated';

export const TIME_FILTER_OPTIONS: Array<{ id: TimeFilterId; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'today', label: 'Today' },
  { id: '24h', label: '24h' },
  { id: 'week', label: 'This week' },
  { id: 'month', label: 'This month' },
  { id: 'active', label: 'Active now' },
  { id: 'updated', label: 'Recently updated' },
];

const BUCKET_LABELS: Record<TimeBucket, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  this_week: 'This week',
  older: 'Older',
};

export interface EnrichedIntelligenceHit extends IntelligenceSearchHit {
  updatedAt: number;
  lastActivityAt: number;
  activityLabel: string;
  isLive: boolean;
  isUnresolved: boolean;
  relativeTime: string;
  timeBucket: TimeBucket;
}

export interface RecentIntelligenceView {
  id: string;
  entityType: IntelligenceSearchHit['entityType'];
  entityId: string;
  title: string;
  subtitle: string;
  deepLink: string;
  moduleLabel: string;
  viewedAt: number;
}

const RECENT_KEY = 'spacilly_admin_intel_recent_v1';
const MAX_RECENT = 8;

const UNRESOLVED = /\b(pending|processing|open|delayed|dispute|failed|unpaid|investigating|active|escalat|review|hold|refund|return)\b/i;
const LIVE = /\b(processing|pending|reconcil|updating|running|in[- ]?progress|active|live)\b/i;

export function parseHitTimestamp(hit: IntelligenceSearchHit): number {
  if (hit.updatedAt && hit.updatedAt > 0) return hit.updatedAt;
  const meta = hit.metadata?.updatedAt || hit.metadata?.lastActivityAt;
  if (meta) {
    const n = Number(meta);
    if (!Number.isNaN(n) && n > 0) return n;
  }
  return 0;
}

export function formatRelativeTime(ts: number, now = Date.now()): string {
  if (!ts || ts <= 0) return '';
  const diff = Math.max(0, now - ts);
  const sec = Math.floor(diff / 1000);
  if (sec < 45) return 'Just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day === 1) return 'Yesterday';
  if (day < 7) return `${day}d ago`;
  if (day < 30) return `${Math.floor(day / 7)}w ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function getTimeBucket(ts: number, now = Date.now()): TimeBucket {
  if (!ts || ts <= 0) return 'older';
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const todayStart = startOfDay(new Date(now));
  const yesterdayStart = todayStart - 86_400_000;
  const weekStart = todayStart - 6 * 86_400_000;
  if (ts >= todayStart) return 'today';
  if (ts >= yesterdayStart) return 'yesterday';
  if (ts >= weekStart) return 'this_week';
  return 'older';
}

export function enrichHit(hit: IntelligenceSearchHit, now = Date.now()): EnrichedIntelligenceHit {
  const updatedAt = parseHitTimestamp(hit) || now - 365 * 86_400_000;
  const lastActivityAt = hit.lastActivityAt && hit.lastActivityAt > 0 ? hit.lastActivityAt : updatedAt;
  const status = String(hit.status || '');
  const isUnresolved = hit.isUnresolved ?? UNRESOLVED.test(status);
  const isLive = hit.isLive ?? LIVE.test(status);
  let activityLabel = hit.activityLabel || 'Updated';
  if (!hit.activityLabel) {
    if (hit.entityType === 'order') activityLabel = isLive ? 'Shipment activity' : 'Order updated';
    else if (hit.entityType === 'payment') activityLabel = isLive ? 'Reconciliation' : 'Payment activity';
    else if (hit.entityType === 'support' || hit.entityType === 'dispute') {
      activityLabel = isUnresolved ? 'Case open' : 'Case updated';
    }
  }
  return {
    ...hit,
    updatedAt,
    lastActivityAt,
    activityLabel,
    isLive,
    isUnresolved,
    relativeTime: formatRelativeTime(lastActivityAt, now),
    timeBucket: getTimeBucket(lastActivityAt, now),
  };
}

export function applyTimeFilter(hits: EnrichedIntelligenceHit[], filter: TimeFilterId, now = Date.now()): EnrichedIntelligenceHit[] {
  if (filter === 'all') return hits;
  const day = 86_400_000;
  const todayStart = new Date(now).setHours(0, 0, 0, 0);
  return hits.filter((h) => {
    const ts = h.lastActivityAt;
    switch (filter) {
      case 'today':
        return ts >= todayStart;
      case '24h':
        return now - ts <= day;
      case 'week':
        return now - ts <= 7 * day;
      case 'month':
        return now - ts <= 30 * day;
      case 'active':
        return h.isLive || h.isUnresolved;
      case 'updated':
        return now - ts <= 3 * day;
      default:
        return true;
    }
  });
}

export function groupHitsByTimeBucket(hits: EnrichedIntelligenceHit[]): Array<{
  bucket: TimeBucket;
  label: string;
  hits: EnrichedIntelligenceHit[];
}> {
  const order: TimeBucket[] = ['today', 'yesterday', 'this_week', 'older'];
  const map = new Map<TimeBucket, EnrichedIntelligenceHit[]>();
  for (const h of hits) {
    const list = map.get(h.timeBucket) || [];
    list.push(h);
    map.set(h.timeBucket, list);
  }
  return order
    .filter((b) => (map.get(b)?.length ?? 0) > 0)
    .map((b) => ({ bucket: b, label: BUCKET_LABELS[b], hits: map.get(b)! }));
}

export function recordRecentView(hit: IntelligenceSearchHit): void {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const prev: RecentIntelligenceView[] = raw ? JSON.parse(raw) : [];
    const entry: RecentIntelligenceView = {
      id: hit.id,
      entityType: hit.entityType,
      entityId: hit.entityId,
      title: hit.title,
      subtitle: hit.subtitle,
      deepLink: hit.deepLink,
      moduleLabel: hit.moduleLabel,
      viewedAt: Date.now(),
    };
    const next = [entry, ...prev.filter((r) => r.id !== hit.id)].slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function getRecentViews(): RecentIntelligenceView[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? (JSON.parse(raw) as RecentIntelligenceView[]) : [];
  } catch {
    return [];
  }
}

export function clearRecentViews(): void {
  try {
    localStorage.removeItem(RECENT_KEY);
  } catch {
    /* ignore */
  }
}
