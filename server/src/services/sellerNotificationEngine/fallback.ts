/**
 * Deterministic seller notification copy — template rotation, synonyms, anti-repetition.
 */
import type {
  SellerNotificationContext,
  SellerNotificationEvent,
  SellerNotificationCopy,
  SellerNotificationTone,
} from './types';
import { isDuplicate, memoryKey, rememberNotification } from './memory';
import {
  applyBehavioralRules,
  buildVisualStyle,
  clampMessageWords,
  countLabel,
  deepLinkFor,
  hoursLabel,
  orderRef,
  pickVariant,
} from './utils';

type PoolVariant = {
  title: (ctx: SellerNotificationContext) => string;
  message: (ctx: SellerNotificationContext) => string;
  tone: SellerNotificationTone;
  actionLabel: string;
  priority: 'low' | 'medium' | 'high';
};

const MESSAGE_OPENINGS = [
  '',
  'Quick note — ',
  'Heads-up — ',
  'When you can — ',
  'For your queue — ',
];

const CTA_POOLS: Record<string, string[]> = {
  order: ['Review order', 'Open order', 'View order', 'Continue fulfillment'],
  ship: ['Continue shipping', 'Update tracking', 'Ship order', 'Review shipment'],
  return: ['Review return', 'View return case', 'Respond to buyer', 'Open return'],
  dispute: ['View dispute', 'Respond now', 'Review concern', 'Open dispute'],
  payout: ['View payout', 'Check finance', 'See earnings', 'Open wallet'],
  inventory: ['Restock items', 'View inventory', 'Update stock', 'Manage listings'],
  review: ['View review', 'Read feedback', 'See review', 'Open reviews'],
  message: ['View message', 'Open inbox', 'Reply now', 'Read message'],
  subscription: ['Manage plan', 'View subscription', 'Open billing', 'Review plan'],
  default: ['Open dashboard', 'View details', 'Take a look', 'Continue'],
};

const POOLS: Record<SellerNotificationEvent, PoolVariant[]> = {
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
      message: (c) => `${orderRef(c)} is waiting — confirm items and share your ship window.`,
    },
    {
      tone: 'operational',
      priority: 'medium',
      actionLabel: 'View details',
      title: (c) => `Fresh order ${orderRef(c)}`,
      message: () => 'Payment cleared. Pick, pack, and add tracking when you ship.',
    },
    {
      tone: 'medium',
      priority: 'medium',
      actionLabel: 'Start fulfillment',
      title: () => 'Ready when you are',
      message: (c) => `Order ${orderRef(c)} is in your queue with escrow protected.`,
    },
  ],
  shipping_delay: [
    {
      tone: 'medium',
      priority: 'medium',
      actionLabel: 'Continue shipping',
      title: () => 'Orders still need shipping updates',
      message: (c) =>
        c.sellerActiveOnOrder
          ? `${countLabel(c.affectedCount)} approaching their window — you're already on it.`
          : `${countLabel(c.affectedCount)} could use tracking after ${hoursLabel(c.hoursSinceUpdate)}.`,
    },
    {
      tone: 'soft',
      priority: 'medium',
      actionLabel: 'Update tracking',
      title: () => 'This package has been quiet',
      message: (c) =>
        `Order ${orderRef(c)} hasn't moved in ${hoursLabel(c.hoursSinceUpdate)} — buyers appreciate small updates.`,
    },
    {
      tone: 'operational',
      priority: 'medium',
      actionLabel: 'Resolve delay',
      title: (c) => `${countLabel(c.affectedCount)} awaiting ship action`,
      message: () => 'A brief status note keeps delivery expectations calm for customers.',
    },
    {
      tone: 'clear-operational',
      priority: 'high',
      actionLabel: 'Review order',
      title: () => 'This order may need attention',
      message: (c) =>
        `Order ${orderRef(c)} is still unshipped — sharing an ETA helps avoid extra messages.`,
    },
  ],
  shipping_soon: [
    {
      tone: 'operational',
      priority: 'low',
      actionLabel: 'Continue shipping',
      title: () => 'Deliveries approaching their window',
      message: (c) => `${countLabel(c.affectedCount)} ship soon — good time to verify labels and stock.`,
    },
    {
      tone: 'soft',
      priority: 'low',
      actionLabel: 'View orders',
      title: () => 'Shipping window coming up',
      message: (c) => `Order ${orderRef(c)} is next in your fulfillment queue.`,
    },
  ],
  return_opened: [
    {
      tone: 'soft',
      priority: 'medium',
      actionLabel: 'Review return',
      title: (c) => (c.caseNumber ? `Return ${c.caseNumber} opened` : 'Buyer opened a return'),
      message: (c) => `For order ${orderRef(c)} — a clear reply keeps trust intact.`,
    },
    {
      tone: 'medium',
      priority: 'medium',
      actionLabel: 'View customer reply',
      title: () => 'Return request to review',
      message: (c) => `Order ${orderRef(c)} has a return case waiting on your side.`,
    },
    {
      tone: 'reassuring',
      priority: 'high',
      actionLabel: 'Resolve return',
      title: () => 'Buyer shared return details',
      message: (c) => `${orderRef(c)} needs a look — most cases close quickly with clarity.`,
    },
  ],
  dispute_opened: [
    {
      tone: 'soft',
      priority: 'high',
      actionLabel: 'View dispute',
      title: () => 'Buyer raised a concern',
      message: (c) => `Order ${orderRef(c)} — your perspective helps resolve this fairly.`,
    },
    {
      tone: 'clear-operational',
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
      message: (c) => `${orderRef(c)} is closed and payout follows your usual schedule.`,
    },
  ],
  order_refunded: [
    {
      tone: 'medium',
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
  order_cancelled: [
    {
      tone: 'operational',
      priority: 'medium',
      actionLabel: 'View order',
      title: () => 'Order cancelled by buyer',
      message: (c) => `Order ${orderRef(c)} was cancelled before fulfillment — inventory has been restored.`,
    },
    {
      tone: 'soft',
      priority: 'low',
      actionLabel: 'Open orders',
      title: () => 'A pending order was cancelled',
      message: (c) => `${orderRef(c)} is no longer active in your queue.`,
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
          ? `${c.affectedCount} listings are low — restock before demand spikes.`
          : 'A popular listing is low — a quick restock avoids missed sales.',
    },
    {
      tone: 'soft',
      priority: 'low',
      actionLabel: 'View inventory',
      title: () => 'Inventory nudge',
      message: () => 'A SKU you sell often is nearly out — worth a glance when you can.',
    },
  ],
  new_review: [
    {
      tone: 'soft',
      priority: 'low',
      actionLabel: 'View review',
      title: () => 'New review on your store',
      message: () => 'A buyer left feedback — public replies build trust over time.',
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
        c.messagePreview
          ? `"${String(c.messagePreview).slice(0, 60)}${c.messagePreview.length > 60 ? '…' : ''}" — reply when you can.`
          : c.sellerActiveOnOrder
            ? 'You were recently in this thread — reply when you are ready.'
            : 'A customer reached out — short replies usually prevent follow-ups.',
    },
    {
      tone: 'medium',
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
          ? `Subscription active. We charged ${c.currency || 'USD'} ${c.amount.toFixed(2)} this cycle.`
          : 'Your new plan is live — explore the features in Subscription & Billing.',
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
          ? `Auto-renew succeeded (${c.currency || 'USD'} ${c.amount.toFixed(2)}). Next: ${c.renewalDate || 'billing tab'}.`
          : 'Your subscription renewed automatically. Invoice is in billing history.',
    },
  ],
  subscription_plan_changed: [
    {
      tone: 'clear-operational',
      priority: 'medium',
      actionLabel: 'Review plan',
      title: () => 'Your plan was updated',
      message: (c) =>
        c.planName && c.previousPlanName
          ? `Moved from ${c.previousPlanName} to ${c.planName} by an administrator.`
          : c.planName
            ? `Your subscription is now on ${c.planName}.`
            : 'Your subscription plan was changed by an administrator.',
    },
  ],
  subscription_payment_failed: [
    {
      tone: 'clear-operational',
      priority: 'high',
      actionLabel: 'Fix payment',
      title: () => 'Subscription payment failed',
      message: () =>
        'We could not charge your default payment method. Update billing before limits apply.',
    },
  ],
  subscription_limit_reached: [
    {
      tone: 'operational',
      priority: 'medium',
      actionLabel: 'Upgrade plan',
      title: () => 'Plan limit reached',
      message: (c) =>
        c.affectedCount != null
          ? `${c.affectedCount} products listed — your plan cap is full. Upgrade to list more.`
          : 'You reached a limit on your current plan. Upgrade for more capacity.',
    },
  ],
};

function ctaPoolFor(event: SellerNotificationEvent): string[] {
  if (event === 'shipping_delay' || event === 'shipping_soon') return CTA_POOLS.ship;
  if (event === 'new_order' || event === 'order_refunded' || event === 'order_cancelled' || event === 'funds_released') {
    return CTA_POOLS.order;
  }
  if (event === 'return_opened') return CTA_POOLS.return;
  if (event === 'dispute_opened') return CTA_POOLS.dispute;
  if (event === 'payout_received') return CTA_POOLS.payout;
  if (event === 'low_stock') return CTA_POOLS.inventory;
  if (event === 'new_review') return CTA_POOLS.review;
  if (event === 'new_message') return CTA_POOLS.message;
  if (event.startsWith('subscription_')) return CTA_POOLS.subscription;
  return CTA_POOLS.default;
}

function rotateCta(base: string, seed: string, event: SellerNotificationEvent): string {
  const pool = ctaPoolFor(event);
  if (pool.includes(base)) {
    const idx = pickVariant(`${seed}:cta`, pool.length);
    return pool[idx];
  }
  return pool[pickVariant(`${seed}:cta`, pool.length)] || base;
}

function applyOpening(message: string, seed: string): string {
  const opening = MESSAGE_OPENINGS[pickVariant(`${seed}:open`, MESSAGE_OPENINGS.length)];
  if (!opening) return message;
  return clampMessageWords(`${opening}${message.charAt(0).toLowerCase()}${message.slice(1)}`);
}

export function generateSellerNotificationFallback(
  event: SellerNotificationEvent,
  ctx: SellerNotificationContext,
  key?: string,
): SellerNotificationCopy {
  const pool = POOLS[event] || POOLS.new_order;
  const entityId = ctx.orderId || ctx.caseNumber || ctx.disputeNumber || '';
  const memKey = key || memoryKey(ctx.sellerId, event, entityId);
  const daySeed = new Date().toISOString().slice(0, 10);
  const baseSeed = `${event}:${ctx.sellerId}:${entityId}:${ctx.reminderCount || 0}:${daySeed}`;

  let chosen: PoolVariant | null = null;
  let title = '';
  let message = '';

  for (let attempt = 0; attempt < pool.length + 2; attempt += 1) {
    const idx = (pickVariant(`${baseSeed}:${attempt}`, pool.length) + attempt) % pool.length;
    const variant = pool[idx];
    const seed = `${baseSeed}:${attempt}`;
    title = variant.title(ctx);
    message = applyOpening(clampMessageWords(variant.message(ctx)), seed);
    const actionLabel = rotateCta(variant.actionLabel, seed, event);

    const draft = applyBehavioralRules(
      {
        title,
        message,
        tone: variant.tone,
        priority: variant.priority,
        actionLabel,
        deepLink: deepLinkFor(event, ctx),
        visualStyle: buildVisualStyle(event, ctx),
      },
      event,
      ctx,
    );

    if (!isDuplicate(memKey, draft)) {
      chosen = variant;
      title = draft.title;
      message = draft.message;
      const result: SellerNotificationCopy = {
        ...draft,
        source: 'fallback',
      };
      rememberNotification(memKey, result);
      return result;
    }
  }

  const variant = chosen || pool[0];
  const seed = `${baseSeed}:final`;
  const result = applyBehavioralRules(
    {
      title: variant.title(ctx),
      message: applyOpening(clampMessageWords(variant.message(ctx)), seed),
      tone: variant.tone,
      priority: variant.priority,
      actionLabel: rotateCta(variant.actionLabel, seed, event),
      deepLink: deepLinkFor(event, ctx),
      visualStyle: buildVisualStyle(event, ctx),
    },
    event,
    ctx,
  );

  const copy: SellerNotificationCopy = { ...result, source: 'fallback' };
  rememberNotification(memKey, copy);
  return copy;
}
