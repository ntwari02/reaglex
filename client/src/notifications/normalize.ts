import type { NormalizedNotification, NotificationVariant, RawBuyerNotification, TimelineGroup } from './types';

function getTimeline(createdAt?: string): TimelineGroup {
  const d = new Date(createdAt || Date.now());
  const now = new Date();
  const diffMin = (now.getTime() - d.getTime()) / 60000;
  if (diffMin < 30) return 'NOW';
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startGiven = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.floor((+startToday - +startGiven) / 86400000);
  if (diffDays <= 0) return 'TODAY';
  if (diffDays <= 7) return 'THIS_WEEK';
  return 'EARLIER';
}

function resolveVariant(row: RawBuyerNotification): NotificationVariant {
  const blob = `${row.title || ''} ${row.message || ''}`.toLowerCase();

  if (row.type === 'order') {
    if (blob.includes('delivered')) return 'delivered';
    if (blob.includes('out for delivery') || blob.includes('out for')) return 'out_for_delivery';
    if (blob.includes('shipped') || blob.includes('transit') || blob.includes('packed')) return 'shipping';
    return 'order_confirmed';
  }

  if (row.type === 'message') return 'social';
  if (row.type === 'review' || blob.includes('review')) return 'deal';

  if (row.type === 'deal') return 'flash_sale';

  if (blob.includes('escrow') || blob.includes('protected') || blob.includes('held')) return 'escrow';
  if (blob.includes('security') || blob.includes('login') || blob.includes('password') || blob.includes('device'))
    return 'security';
  if (blob.includes('live') || blob.includes('streaming') || blob.includes('watching')) return 'live';
  if (blob.includes('launch') || blob.includes('coming soon') || blob.includes('drops in')) return 'upcoming';
  if (blob.includes('ai') || blob.includes('picked') || blob.includes('recommend') || blob.includes('match'))
    return 'ai';
  if (blob.includes('flash') || blob.includes('sale') || blob.includes('% off') || blob.includes('deal'))
    return 'flash_sale';

  return 'system';
}

function shippingProgress(variant: NotificationVariant, message: string): number | undefined {
  if (variant === 'order_confirmed') return 0.22;
  if (variant === 'shipping') return 0.58;
  if (variant === 'out_for_delivery') return 0.82;
  if (variant === 'delivered') return 1;
  const m = message.toLowerCase();
  if (m.includes('shipped')) return 0.55;
  if (m.includes('packed')) return 0.4;
  return undefined;
}

function viewerLabel(id: string): string {
  const n = (id.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 9000) + 1200;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

export function normalizeNotification(row: RawBuyerNotification): NormalizedNotification {
  const variant = resolveVariant(row);
  const timeline =
    variant === 'live' ? 'LIVE_EVENTS' : variant === 'flash_sale' || variant === 'ai' ? 'PROMOTIONS' : getTimeline(row.createdAt);

  const created = row.createdAt ? new Date(row.createdAt).getTime() : Date.now();
  const countdownEnd =
    row.countdownEnd ||
    (variant === 'flash_sale' ? created + 2 * 60 * 60 * 1000 + 18 * 60 * 1000 + 44 * 1000 : undefined);

  return {
    ...row,
    variant,
    timeline,
    progress: shippingProgress(variant, row.message || ''),
    viewerCount: variant === 'live' ? viewerLabel(row.id) : undefined,
    countdownEnd,
    teaserImage: variant === 'upcoming' ? '/logo.jpg' : undefined,
    metaLabel:
      variant === 'order_confirmed'
        ? 'Confirmed'
        : variant === 'delivered'
          ? 'Delivered'
          : variant === 'live'
            ? 'LIVE'
            : variant === 'ai'
              ? 'AI Pick'
              : undefined,
  };
}

export function normalizeList(rows: RawBuyerNotification[]): NormalizedNotification[] {
  return rows.map(normalizeNotification).sort((a, b) => +new Date(b.createdAt || 0) - +new Date(a.createdAt || 0));
}

export function filterNotifications(
  items: NormalizedNotification[],
  filter: string,
  query = '',
): NormalizedNotification[] {
  let list = items;
  if (filter === 'unread') list = list.filter((n) => n.unread);
  else if (filter === 'orders')
    list = list.filter((n) =>
      ['order_confirmed', 'shipping', 'out_for_delivery', 'delivered'].includes(n.variant),
    );
  else if (filter === 'deals')
    list = list.filter((n) => ['flash_sale', 'deal', 'upcoming'].includes(n.variant));
  else if (filter === 'live') list = list.filter((n) => n.variant === 'live');
  else if (filter === 'ai') list = list.filter((n) => n.variant === 'ai');
  else if (filter === 'system')
    list = list.filter((n) => ['system', 'escrow', 'security'].includes(n.variant));

  const q = query.trim().toLowerCase();
  if (q) {
    list = list.filter(
      (n) => n.title?.toLowerCase().includes(q) || n.message?.toLowerCase().includes(q) || n.orderId?.toLowerCase().includes(q),
    );
  }
  return list;
}

export const TIMELINE_ORDER: TimelineGroup[] = ['NOW', 'TODAY', 'LIVE_EVENTS', 'PROMOTIONS', 'THIS_WEEK', 'EARLIER'];

export function groupByTimeline(items: NormalizedNotification[]): Record<TimelineGroup, NormalizedNotification[]> {
  const acc = {} as Record<TimelineGroup, NormalizedNotification[]>;
  for (const g of TIMELINE_ORDER) acc[g] = [];
  for (const n of items) {
    if (!acc[n.timeline]) acc[n.timeline] = [];
    acc[n.timeline].push(n);
  }
  return acc;
}
