import type { BuyerNotificationEvent } from '../services/buyerNotificationAssistant.service';
import type { SellerNotificationEvent } from '../services/sellerNotificationAssistant.service';
import type { EmailCategory } from './copyEngine';
import type { EmailAccent } from './layout';

export function buyerEventCategory(event: BuyerNotificationEvent): EmailCategory {
  const map: Partial<Record<BuyerNotificationEvent, EmailCategory>> = {
    order_placed: 'order',
    order_packed: 'shipping',
    order_shipped: 'shipping',
    order_delivered: 'shipping',
    order_cancelled: 'order',
    refund_initiated: 'refund',
    delivery_confirmed: 'order',
    return_submitted: 'return',
    return_update: 'return',
    new_message: 'message',
    dispute_update: 'marketplace',
    live_now: 'live',
    payment_notice: 'payment',
  };
  return map[event] || 'general';
}

export function sellerEventCategory(event: SellerNotificationEvent): EmailCategory {
  const map: Partial<Record<SellerNotificationEvent, EmailCategory>> = {
    new_order: 'order',
    dispute_opened: 'marketplace',
    return_opened: 'return',
    payout_received: 'payment',
    funds_released: 'payment',
    low_stock: 'marketplace',
    new_message: 'message',
    new_review: 'review',
    shipping_delay: 'shipping',
    shipping_soon: 'shipping',
    subscription_upgraded: 'subscription',
    subscription_renewed: 'subscription',
    subscription_plan_changed: 'subscription',
    subscription_payment_failed: 'billing',
    subscription_limit_reached: 'subscription',
  };
  return map[event] || 'general';
}

export function buyerEventAccent(event: BuyerNotificationEvent): EmailAccent {
  if (event === 'refund_initiated' || event === 'order_cancelled') return 'warning';
  if (event === 'live_now') return 'promo';
  if (event.startsWith('order_') || event === 'delivery_confirmed') return 'success';
  return 'brand';
}

export function sellerEventAccent(event: SellerNotificationEvent): EmailAccent {
  if (event === 'dispute_opened' || event === 'return_opened') return 'warning';
  if (event === 'subscription_payment_failed') return 'danger';
  if (event === 'funds_released' || event === 'payout_received' || event === 'subscription_renewed') return 'success';
  if (event === 'low_stock' || event === 'subscription_limit_reached') return 'warning';
  if (event.startsWith('subscription_')) return 'brand';
  return 'brand';
}
