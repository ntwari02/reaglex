import type {
  SellerNotificationContext,
  SellerNotificationEvent,
  SellerNotificationTone,
  SellerNotificationCopy,
} from './types';

export function orderRef(ctx: SellerNotificationContext): string {
  return ctx.orderNumber ? `#${ctx.orderNumber}` : 'this order';
}

export function countLabel(n?: number): string {
  const c = Math.max(1, Number(n || 1));
  return c === 1 ? '1 order' : `${c} orders`;
}

export function hoursLabel(h?: number): string {
  const hrs = Math.max(1, Math.round(Number(h || 24)));
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'}`;
  const days = Math.round(hrs / 24);
  return `${days} day${days === 1 ? '' : 's'}`;
}

export function pickVariant(seed: string, size: number): number {
  if (size <= 0) return 0;
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % size;
}

export function wordCount(text: string): number {
  return String(text || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

/** Target 8–22 words for message body */
export function clampMessageWords(message: string, min = 8, max = 22): string {
  const words = String(message || '')
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .filter(Boolean);
  if (!words.length) return 'Please review this update in your seller dashboard.';
  if (words.length > max) return `${words.slice(0, max).join(' ')}.`;
  if (words.length < min) return words.join(' ');
  return words.join(' ');
}

export function normalizeTone(raw: string): SellerNotificationTone {
  const t = String(raw || '').toLowerCase().trim();
  const map: Record<string, SellerNotificationTone> = {
    soft: 'soft',
    medium: 'medium',
    operational: 'operational',
    reassuring: 'reassuring',
    'clear-operational': 'clear-operational',
    direct: 'clear-operational',
    'action-oriented': 'operational',
    observational: 'medium',
  };
  return map[t] || 'operational';
}

export function normalizePriority(
  raw: string,
  fallback: 'low' | 'medium' | 'high',
): 'low' | 'medium' | 'high' {
  const p = String(raw || '').toLowerCase();
  if (p === 'low' || p === 'medium' || p === 'high') return p;
  return fallback;
}

export function deepLinkFor(event: SellerNotificationEvent, ctx: SellerNotificationContext): string {
  switch (event) {
    case 'new_order':
    case 'shipping_delay':
    case 'shipping_soon':
    case 'order_refunded':
    case 'order_cancelled':
    case 'funds_released':
      return ctx.orderId ? `/seller/orders/${ctx.orderId}` : '/seller/orders';
    case 'return_opened':
      return ctx.caseNumber ? `/seller/returns?case=${encodeURIComponent(ctx.caseNumber)}` : '/seller/returns';
    case 'dispute_opened':
      return ctx.disputeNumber
        ? `/seller/disputes?ref=${encodeURIComponent(ctx.disputeNumber)}`
        : '/seller/disputes';
    case 'payout_received':
      return '/seller/finance/payouts';
    case 'low_stock':
      return '/seller/inventory';
    case 'new_review':
      return '/seller/reviews';
    case 'new_message':
      return '/seller/inbox';
    case 'subscription_upgraded':
    case 'subscription_renewed':
    case 'subscription_plan_changed':
    case 'subscription_payment_failed':
    case 'subscription_limit_reached':
      return '/seller/subscription';
    default:
      return '/seller/notifications';
  }
}

export function inboxTypeFor(
  event: SellerNotificationEvent,
  priority: 'low' | 'medium' | 'high',
): SellerNotificationCopy['inboxType'] {
  if (priority === 'high' || event === 'dispute_opened' || event === 'subscription_payment_failed') {
    return 'warning';
  }
  if (
    event === 'payout_received' ||
    event === 'funds_released' ||
    event === 'new_order' ||
    event === 'subscription_upgraded' ||
    event === 'subscription_renewed'
  ) {
    return 'success';
  }
  return 'info';
}

export function buildVisualStyle(
  event: SellerNotificationEvent,
  ctx: SellerNotificationContext,
): SellerNotificationCopy['visualStyle'] {
  const thumbs = (ctx.productImages || []).filter(Boolean).slice(0, 3);
  const showProducts = ['new_order', 'shipping_delay', 'return_opened', 'low_stock'].includes(event);
  const count = showProducts ? Math.min(3, Math.max(thumbs.length, thumbs.length ? thumbs.length : 1)) : 0;
  return {
    showProductPreview: showProducts && thumbs.length > 0,
    compact: true,
    thumbnailCount: count,
  };
}

export function applyBehavioralRules(
  copy: Omit<SellerNotificationCopy, 'source' | 'inboxType' | 'deepLink' | 'visualStyle'> & {
    deepLink?: string;
    visualStyle?: SellerNotificationCopy['visualStyle'];
  },
  event: SellerNotificationEvent,
  ctx: SellerNotificationContext,
): Omit<SellerNotificationCopy, 'source'> {
  let { title, message, tone, priority, actionLabel } = copy;
  const reminderCount = ctx.reminderCount || 0;

  if (ctx.sellerActiveOnOrder) {
    if (event === 'shipping_delay' && priority !== 'low') priority = 'low';
    if (event === 'new_message' && priority === 'high') priority = 'medium';
    if (tone === 'clear-operational') tone = 'medium';
  }

  if (event === 'shipping_delay' && (ctx.hoursSinceUpdate || 0) >= 48 && !ctx.sellerActiveOnOrder) {
    if (priority === 'low') priority = 'medium';
    if (reminderCount < 2) tone = reminderCount > 0 ? 'clear-operational' : 'medium';
  }

  if (reminderCount >= 2) {
    message =
      reminderCount === 2
        ? `${message} Still open when you have a moment.`
        : `Friendly reminder — ${message.charAt(0).toLowerCase()}${message.slice(1)}`;
    priority = reminderCount >= 3 ? 'high' : priority === 'low' ? 'medium' : priority;
    tone = reminderCount >= 3 ? 'clear-operational' : tone;
  } else if (reminderCount === 1 && !ctx.sellerActiveOnOrder) {
    message = clampMessageWords(message);
  }

  message = clampMessageWords(message);

  return {
    title: title.slice(0, 80),
    message,
    tone,
    priority,
    actionLabel: actionLabel.slice(0, 40),
    deepLink: copy.deepLink || deepLinkFor(event, ctx),
    visualStyle: copy.visualStyle || buildVisualStyle(event, ctx),
    inboxType: inboxTypeFor(event, priority),
  };
}
