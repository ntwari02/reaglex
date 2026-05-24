/**
 * Intelligent seller notification copy — varied, calm, contextual (not robotic templates).
 */

export type SellerNotificationEvent =
  | 'new_order'
  | 'shipping_delay'
  | 'shipping_soon'
  | 'return_opened'
  | 'dispute_opened'
  | 'payout_received'
  | 'funds_released'
  | 'order_refunded'
  | 'low_stock'
  | 'new_review'
  | 'new_message'
  | 'subscription_upgraded'
  | 'subscription_renewed'
  | 'subscription_plan_changed'
  | 'subscription_payment_failed'
  | 'subscription_limit_reached';

export type SellerNotificationTone =
  | 'soft'
  | 'direct'
  | 'observational'
  | 'action-oriented'
  | 'reassuring'
  | 'operational';

export interface SellerNotificationContext {
  sellerId: string;
  orderId?: string;
  orderNumber?: string;
  caseNumber?: string;
  disputeNumber?: string;
  amount?: number;
  currency?: string;
  affectedCount?: number;
  productImages?: string[];
  productNames?: string[];
  hoursSinceUpdate?: number;
  daysSinceShipped?: number;
  sellerActiveOnOrder?: boolean;
  reminderCount?: number;
  planName?: string;
  previousPlanName?: string;
  renewalDate?: string;
}

export interface SellerNotificationCopy {
  title: string;
  message: string;
  tone: SellerNotificationTone;
  priority: 'low' | 'medium' | 'high';
  actionLabel: string;
  deepLink: string;
  visualStyle: {
    showProductPreview: boolean;
    compact: boolean;
    thumbnailCount: number;
  };
  inboxType: 'info' | 'warning' | 'success' | 'system_announcement';
}

type CopyPool = Array<{
  title: (ctx: SellerNotificationContext) => string;
  message: (ctx: SellerNotificationContext) => string;
  tone: SellerNotificationTone;
  actionLabel: string;
  priority: 'low' | 'medium' | 'high';
}>;

function orderRef(ctx: SellerNotificationContext): string {
  return ctx.orderNumber ? `#${ctx.orderNumber}` : 'this order';
}

function countLabel(n?: number): string {
  const c = Math.max(1, Number(n || 1));
  return c === 1 ? '1 order' : `${c} orders`;
}

function hoursLabel(h?: number): string {
  const hrs = Math.max(1, Math.round(Number(h || 24)));
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'}`;
  const days = Math.round(hrs / 24);
  return `${days} day${days === 1 ? '' : 's'}`;
}

function pickVariant(seed: string, size: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return h % size;
}

function deepLinkFor(event: SellerNotificationEvent, ctx: SellerNotificationContext): string {
  switch (event) {
    case 'new_order':
    case 'shipping_delay':
    case 'shipping_soon':
    case 'order_refunded':
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

const POOLS: Record<SellerNotificationEvent, CopyPool> = {
  new_order: [
    {
      tone: 'reassuring',
      priority: 'medium',
      actionLabel: 'Review order',
      title: () => 'New order just landed',
      message: (c) => `Order ${orderRef(c)} is paid and ready for you to prepare.`,
    },
    {
      tone: 'soft',
      priority: 'medium',
      actionLabel: 'Open order',
      title: () => 'Someone chose your store',
      message: (c) => `${orderRef(c)} is waiting — a nice moment to confirm items and ship window.`,
    },
    {
      tone: 'operational',
      priority: 'medium',
      actionLabel: 'View details',
      title: (c) => `Fresh order ${orderRef(c)}`,
      message: () => 'Payment cleared. Pick, pack, and share tracking when you ship.',
    },
    {
      tone: 'action-oriented',
      priority: 'medium',
      actionLabel: 'Start fulfillment',
      title: () => 'Ready when you are',
      message: (c) => `Order ${orderRef(c)} is in your queue with escrow protected.`,
    },
  ],
  shipping_delay: [
    {
      tone: 'observational',
      priority: 'medium',
      actionLabel: 'Continue shipping',
      title: () => 'A few orders still need shipping updates',
      message: (c) =>
        c.sellerActiveOnOrder
          ? `${countLabel(c.affectedCount)} approaching their expected window — you're already on it.`
          : `${countLabel(c.affectedCount)} could use a tracking update after ${hoursLabel(c.hoursSinceUpdate)}.`,
    },
    {
      tone: 'soft',
      priority: 'medium',
      actionLabel: 'Update tracking',
      title: () => 'This package has been quiet for a while',
      message: (c) => `Order ${orderRef(c)} hasn't moved since ${hoursLabel(c.hoursSinceUpdate)} — buyers notice small updates.`,
    },
    {
      tone: 'operational',
      priority: 'medium',
      actionLabel: 'Resolve delay',
      title: (c) => `${countLabel(c.affectedCount)} awaiting ship action`,
      message: () => 'A quick status note keeps delivery expectations calm for customers.',
    },
    {
      tone: 'direct',
      priority: 'high',
      actionLabel: 'Review order',
      title: () => 'Looks like this order may need attention',
      message: (c) => `Order ${orderRef(c)} is still unshipped — sharing ETA helps avoid unnecessary messages.`,
    },
  ],
  shipping_soon: [
    {
      tone: 'operational',
      priority: 'low',
      actionLabel: 'Continue shipping',
      title: () => '2 deliveries are approaching their expected window',
      message: (c) => `${countLabel(c.affectedCount)} ship soon — perfect time to double-check labels and stock.`,
    },
    {
      tone: 'soft',
      priority: 'low',
      actionLabel: 'View orders',
      title: () => 'Shipping window coming up',
      message: (c) => `Order ${orderRef(c)} is on deck for the next leg of fulfillment.`,
    },
  ],
  return_opened: [
    {
      tone: 'soft',
      priority: 'medium',
      actionLabel: 'Review return',
      title: (c) => (c.caseNumber ? `Return ${c.caseNumber} opened` : 'Buyer opened a return'),
      message: (c) => `For order ${orderRef(c)} — a thoughtful reply keeps trust intact.`,
    },
    {
      tone: 'action-oriented',
      priority: 'medium',
      actionLabel: 'View customer reply',
      title: () => 'Return request to review',
      message: (c) => `Order ${orderRef(c)} has a new return case waiting on your side.`,
    },
    {
      tone: 'observational',
      priority: 'high',
      actionLabel: 'Resolve return',
      title: () => 'Buyer shared return details',
      message: (c) => `${orderRef(c)} needs a look — most cases close quickly with a clear response.`,
    },
  ],
  dispute_opened: [
    {
      tone: 'soft',
      priority: 'high',
      actionLabel: 'View dispute',
      title: () => 'Buyer raised a concern',
      message: (c) => `Order ${orderRef(c)} — your perspective helps us resolve this fairly.`,
    },
    {
      tone: 'direct',
      priority: 'high',
      actionLabel: 'Respond now',
      title: (c) => (c.disputeNumber ? `Dispute ${c.disputeNumber}` : 'Dispute opened'),
      message: () => 'Share order context when you can; early clarity usually shortens the process.',
    },
  ],
  payout_received: [
    {
      tone: 'reassuring',
      priority: 'low',
      actionLabel: 'View payout',
      title: () => 'Payout on the way',
      message: (c) => {
        const amt =
          c.amount != null ? `${c.currency || ''} ${Number(c.amount).toFixed(2)}`.trim() : 'Your earnings';
        return `${amt} is processing to your payout method.`;
      },
    },
    {
      tone: 'soft',
      priority: 'low',
      actionLabel: 'Check finance',
      title: () => 'Earnings moving out',
      message: () => 'Another payout batch was submitted — details are in your finance tab.',
    },
  ],
  funds_released: [
    {
      tone: 'reassuring',
      priority: 'low',
      actionLabel: 'Review order',
      title: () => 'Escrow released for an order',
      message: (c) => `Order ${orderRef(c)} completed — funds are headed to your balance.`,
    },
    {
      tone: 'soft',
      priority: 'low',
      actionLabel: 'View order',
      title: () => 'Order wrapped up nicely',
      message: (c) => `${orderRef(c)} is closed and payout timing follows your usual schedule.`,
    },
  ],
  order_refunded: [
    {
      tone: 'observational',
      priority: 'medium',
      actionLabel: 'Review order',
      title: () => 'Refund processed on an order',
      message: (c) => `Order ${orderRef(c)} was refunded — ledger and inventory notes are updated.`,
    },
    {
      tone: 'soft',
      priority: 'medium',
      actionLabel: 'View details',
      title: () => 'Buyer refund completed',
      message: (c) => `${orderRef(c)} reflects the refund; no extra steps unless you add a note.`,
    },
  ],
  low_stock: [
    {
      tone: 'operational',
      priority: 'medium',
      actionLabel: 'Restock items',
      title: () => 'Stock running light',
      message: (c) =>
        c.affectedCount && c.affectedCount > 1
          ? `${c.affectedCount} listings are low — restock before ads or live sessions spike demand.`
          : 'One of your popular listings is low — a quick restock avoids missed sales.',
    },
    {
      tone: 'soft',
      priority: 'low',
      actionLabel: 'View inventory',
      title: () => 'Inventory nudge',
      message: () => 'A SKU you sell often is nearly out — worth a glance when you have a minute.',
    },
  ],
  new_review: [
    {
      tone: 'soft',
      priority: 'low',
      actionLabel: 'View review',
      title: () => 'New review on your store',
      message: () => 'A buyer left feedback — replies show up publicly and build trust.',
    },
    {
      tone: 'reassuring',
      priority: 'low',
      actionLabel: 'Read feedback',
      title: () => 'Fresh buyer feedback',
      message: () => 'Someone shared how the order went. Take a look when it suits you.',
    },
  ],
  new_message: [
    {
      tone: 'soft',
      priority: 'medium',
      actionLabel: 'View message',
      title: () => 'Buyer message waiting',
      message: (c) =>
        c.sellerActiveOnOrder
          ? 'You were recently in this thread — reply when you are ready.'
          : 'A customer reached out — short replies usually prevent follow-ups.',
    },
    {
      tone: 'action-oriented',
      priority: 'medium',
      actionLabel: 'Open inbox',
      title: () => 'New conversation',
      message: () => 'Check your inbox for the latest buyer question.',
    },
  ],
  subscription_upgraded: [
    {
      tone: 'reassuring',
      priority: 'medium',
      actionLabel: 'View plan',
      title: (c) => (c.planName ? `Welcome to ${c.planName}` : 'Plan upgraded'),
      message: (c) =>
        c.amount != null
          ? `Your subscription is active. We charged ${c.currency || 'USD'} ${c.amount.toFixed(2)} for this cycle.`
          : 'Your new plan is live — explore the features included in your subscription.',
    },
    {
      tone: 'soft',
      priority: 'low',
      actionLabel: 'Open billing',
      title: () => 'Subscription updated',
      message: (c) =>
        c.planName
          ? `${c.planName} is now your active plan. Billing details are in Subscription & Billing.`
          : 'Your subscription tier changed successfully.',
    },
  ],
  subscription_renewed: [
    {
      tone: 'operational',
      priority: 'low',
      actionLabel: 'View invoice',
      title: () => 'Subscription renewed',
      message: (c) =>
        c.amount != null
          ? `Auto-renew succeeded (${c.currency || 'USD'} ${c.amount.toFixed(2)}). Next renewal: ${c.renewalDate || 'see billing tab'}.`
          : 'Your subscription renewed automatically. Invoice is in billing history.',
    },
  ],
  subscription_plan_changed: [
    {
      tone: 'direct',
      priority: 'medium',
      actionLabel: 'Review plan',
      title: () => 'Your plan was updated',
      message: (c) =>
        c.planName && c.previousPlanName
          ? `An administrator moved you from ${c.previousPlanName} to ${c.planName}.`
          : c.planName
            ? `Your subscription is now on ${c.planName}.`
            : 'Your subscription plan was changed by an administrator.',
    },
  ],
  subscription_payment_failed: [
    {
      tone: 'action-oriented',
      priority: 'high',
      actionLabel: 'Fix payment',
      title: () => 'Subscription payment failed',
      message: () =>
        'We could not charge your default payment method. Update billing before features are limited.',
    },
  ],
  subscription_limit_reached: [
    {
      tone: 'action-oriented',
      priority: 'medium',
      actionLabel: 'Upgrade plan',
      title: () => 'Plan limit reached',
      message: (c) =>
        c.affectedCount != null
          ? `You have ${c.affectedCount} products — your plan cap is full. Upgrade to list more.`
          : 'You reached a limit on your current plan. Upgrade to unlock more capacity.',
    },
  ],
};

function adjustForReminders(copy: SellerNotificationCopy, reminderCount: number): SellerNotificationCopy {
  if (reminderCount < 2) return copy;
  if (reminderCount === 2) {
    return {
      ...copy,
      message: `${copy.message} Still open when you get a moment.`,
      priority: copy.priority === 'low' ? 'medium' : copy.priority,
    };
  }
  return {
    ...copy,
    title: copy.title.replace(/\.$/, ''),
    message: `Friendly reminder — ${copy.message.charAt(0).toLowerCase()}${copy.message.slice(1)}`,
    priority: copy.priority === 'low' ? 'medium' : 'high',
    tone: 'direct',
  };
}

export function generateSellerNotificationCopy(
  event: SellerNotificationEvent,
  ctx: SellerNotificationContext
): SellerNotificationCopy {
  const pool = POOLS[event] || POOLS.new_order;
  const seed = `${event}:${ctx.sellerId}:${ctx.orderId || ''}:${ctx.caseNumber || ''}:${ctx.reminderCount || 0}:${new Date().toISOString().slice(0, 10)}`;
  const variant = pool[pickVariant(seed, pool.length)];
  const thumbs = (ctx.productImages || []).filter(Boolean).slice(0, 3);
  const showProducts = ['new_order', 'shipping_delay', 'return_opened', 'low_stock'].includes(event);

  const base: SellerNotificationCopy = {
    title: variant.title(ctx),
    message: variant.message(ctx),
    tone: variant.tone,
    priority: ctx.sellerActiveOnOrder && event === 'shipping_delay' ? 'low' : variant.priority,
    actionLabel: variant.actionLabel,
    deepLink: deepLinkFor(event, ctx),
    visualStyle: {
      showProductPreview: showProducts && thumbs.length > 0,
      compact: true,
      thumbnailCount: Math.min(3, thumbs.length || (showProducts ? 1 : 0)),
    },
    inboxType:
      variant.priority === 'high' || event === 'dispute_opened' || event === 'subscription_payment_failed'
        ? 'warning'
        : event === 'payout_received' ||
            event === 'funds_released' ||
            event === 'new_order' ||
            event === 'subscription_upgraded' ||
            event === 'subscription_renewed'
          ? 'success'
          : 'info',
  };

  return adjustForReminders(base, ctx.reminderCount || 0);
}
