/**
 * Human-friendly buyer notification copy — calm, varied, modern tone.
 */

export type BuyerNotificationEvent =
  | 'order_placed'
  | 'order_packed'
  | 'order_shipped'
  | 'order_delivered'
  | 'order_cancelled'
  | 'refund_initiated'
  | 'delivery_confirmed'
  | 'return_submitted'
  | 'return_update'
  | 'new_message'
  | 'dispute_update'
  | 'live_now'
  | 'payment_notice';

export interface BuyerNotificationContext {
  buyerId: string;
  orderId?: string;
  orderNumber?: string;
  caseNumber?: string;
  sellerName?: string;
  status?: string;
  amount?: number;
  currency?: string;
  liveSessionId?: string;
  liveTitle?: string;
  messagePreview?: string;
  reminderCount?: number;
  productImages?: string[];
}

export interface BuyerNotificationCopy {
  title: string;
  message: string;
  tone: string;
  priority: 'low' | 'medium' | 'high';
  actionLabel: string;
  deepLink: string;
  inboxType: 'info' | 'warning' | 'success' | 'system_announcement';
  pushCategory: 'order' | 'message' | 'live' | 'return';
  visualStyle?: {
    showProductPreview: boolean;
    compact: boolean;
    thumbnailCount: number;
  };
}

type Pool = Array<{
  title: (c: BuyerNotificationContext) => string;
  message: (c: BuyerNotificationContext) => string;
  actionLabel: string;
  priority: 'low' | 'medium' | 'high';
  inboxType: BuyerNotificationCopy['inboxType'];
  pushCategory: BuyerNotificationCopy['pushCategory'];
}>;

function ref(c: BuyerNotificationContext) {
  return c.orderNumber ? `#${c.orderNumber}` : 'your order';
}

function pick(seed: string, n: number) {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h % n;
}

function deepLink(event: BuyerNotificationEvent, c: BuyerNotificationContext): string {
  if (event === 'new_message') return '/inbox';
  if (event === 'live_now' && c.liveSessionId) return `/live/${c.liveSessionId}`;
  if (event === 'return_submitted' || event === 'return_update')
    return c.caseNumber ? `/returns?case=${encodeURIComponent(c.caseNumber)}` : '/returns';
  if (c.orderId) return `/orders/${c.orderId}`;
  return '/notifications';
}

const POOLS: Record<BuyerNotificationEvent, Pool> = {
  order_placed: [
    {
      priority: 'medium',
      inboxType: 'success',
      pushCategory: 'order',
      actionLabel: 'View order',
      title: () => 'Order confirmed',
      message: (c) => `${ref(c)} is in — we will keep you posted as the seller prepares it.`,
    },
    {
      priority: 'medium',
      inboxType: 'success',
      pushCategory: 'order',
      actionLabel: 'Track order',
      title: () => 'You are all set',
      message: (c) => `Payment went through for ${ref(c)}. Tap to see details anytime.`,
    },
  ],
  order_packed: [
    {
      priority: 'low',
      inboxType: 'info',
      pushCategory: 'order',
      actionLabel: 'View order',
      title: () => 'Packed and ready',
      message: (c) => `${ref(c)} is packed — shipping should follow soon.`,
    },
  ],
  order_shipped: [
    {
      priority: 'medium',
      inboxType: 'success',
      pushCategory: 'order',
      actionLabel: 'Track shipment',
      title: () => 'On the way',
      message: (c) => `${ref(c)} left the seller — your delivery is in motion.`,
    },
    {
      priority: 'medium',
      inboxType: 'success',
      pushCategory: 'order',
      actionLabel: 'See tracking',
      title: () => 'Package shipped',
      message: (c) => `Good news — ${ref(c)} is heading your way.`,
    },
  ],
  order_delivered: [
    {
      priority: 'low',
      inboxType: 'success',
      pushCategory: 'order',
      actionLabel: 'View order',
      title: () => 'Delivered',
      message: (c) => `${ref(c)} arrived. Hope everything looks great.`,
    },
  ],
  order_cancelled: [
    {
      priority: 'high',
      inboxType: 'warning',
      pushCategory: 'order',
      actionLabel: 'View details',
      title: () => 'Order updated',
      message: (c) => `${ref(c)} was cancelled. Refund timing depends on your payment method.`,
    },
  ],
  refund_initiated: [
    {
      priority: 'medium',
      inboxType: 'info',
      pushCategory: 'order',
      actionLabel: 'View refund',
      title: () => 'Refund started',
      message: (c) => `We are processing a refund for ${ref(c)} — no action needed from you.`,
    },
  ],
  delivery_confirmed: [
    {
      priority: 'low',
      inboxType: 'success',
      pushCategory: 'order',
      actionLabel: 'View order',
      title: () => 'Delivery confirmed',
      message: (c) => `${ref(c)} is marked delivered. Thanks for shopping with us.`,
    },
  ],
  return_submitted: [
    {
      priority: 'medium',
      inboxType: 'info',
      pushCategory: 'return',
      actionLabel: 'Track return',
      title: () => 'Return submitted',
      message: (c) => `We received your return for ${ref(c)} — the seller will review it.`,
    },
  ],
  return_update: [
    {
      priority: 'medium',
      inboxType: 'info',
      pushCategory: 'return',
      actionLabel: 'View return',
      title: (c) => (c.caseNumber ? `Return ${c.caseNumber}` : 'Return update'),
      message: () => 'There is a new update on your return request.',
    },
  ],
  new_message: [
    {
      priority: 'medium',
      inboxType: 'info',
      pushCategory: 'message',
      actionLabel: 'Reply',
      title: (c) => (c.sellerName ? `Message from ${c.sellerName}` : 'New message'),
      message: (c) => c.messagePreview || 'You have a new reply in your inbox.',
    },
  ],
  dispute_update: [
    {
      priority: 'high',
      inboxType: 'warning',
      pushCategory: 'order',
      actionLabel: 'View dispute',
      title: () => 'Dispute update',
      message: (c) => `There is movement on the case for ${ref(c)}.`,
    },
  ],
  live_now: [
    {
      priority: 'medium',
      inboxType: 'system_announcement',
      pushCategory: 'live',
      actionLabel: 'Watch live',
      title: (c) => (c.sellerName ? `${c.sellerName} is live` : 'Live now'),
      message: (c) =>
        c.liveTitle ? `Join "${c.liveTitle}" and shop in real time.` : 'A seller you follow just went live.',
    },
  ],
  payment_notice: [
    {
      priority: 'low',
      inboxType: 'info',
      pushCategory: 'order',
      actionLabel: 'View order',
      title: () => 'Payment note',
      message: (c) => `There is an update on payment for ${ref(c)}.`,
    },
  ],
};

const STATUS_EVENT: Record<string, BuyerNotificationEvent> = {
  packed: 'order_packed',
  shipped: 'order_shipped',
  delivered: 'order_delivered',
  completed: 'delivery_confirmed',
  cancelled: 'order_cancelled',
};

export function buyerEventFromOrderStatus(status: string): BuyerNotificationEvent | null {
  return STATUS_EVENT[status] || null;
}

export function generateBuyerNotificationCopy(
  event: BuyerNotificationEvent,
  ctx: BuyerNotificationContext
): BuyerNotificationCopy {
  const pool = POOLS[event] || POOLS.payment_notice;
  const seed = `${event}:${ctx.buyerId}:${ctx.orderId || ''}:${new Date().toISOString().slice(0, 10)}`;
  const v = pool[pick(seed, pool.length)];
  const thumbs = (ctx.productImages || []).filter(Boolean).slice(0, 3);
  const showProducts = thumbs.length > 0 && (event.startsWith('order_') || event === 'live_now');
  return {
    title: v.title(ctx),
    message: v.message(ctx),
    tone: 'soft',
    priority: v.priority,
    actionLabel: v.actionLabel,
    deepLink: deepLink(event, ctx),
    inboxType: v.inboxType,
    pushCategory: v.pushCategory,
    visualStyle: {
      showProductPreview: showProducts,
      compact: true,
      thumbnailCount: showProducts ? Math.min(3, thumbs.length) : 0,
    },
  };
}
