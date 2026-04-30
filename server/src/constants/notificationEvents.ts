export type NotificationEventGroupKey =
  | 'orders'
  | 'payments'
  | 'products'
  | 'account'
  | 'support';

export type NotificationEventClass = 'transactional' | 'alert' | 'promotional';

export interface NotificationEventDefinition {
  key: string;
  label: string;
  group: NotificationEventGroupKey;
  class: NotificationEventClass;
  defaultTone: 'professional' | 'friendly' | 'urgent' | 'promotional' | 'informative';
  variables: string[];
}

export interface NotificationEventGroupDefinition {
  key: NotificationEventGroupKey;
  label: string;
}

export const NOTIFICATION_EVENT_GROUPS: NotificationEventGroupDefinition[] = [
  { key: 'orders', label: 'Orders' },
  { key: 'payments', label: 'Payments' },
  { key: 'products', label: 'Products' },
  { key: 'account', label: 'Account' },
  { key: 'support', label: 'Support' },
];

export const NOTIFICATION_EVENT_LIBRARY: NotificationEventDefinition[] = [
  { key: 'order_placed', label: 'Order placed', group: 'orders', class: 'transactional', defaultTone: 'professional', variables: ['{{username}}', '{{order_id}}', '{{amount}}'] },
  { key: 'order_confirmed', label: 'Order confirmed', group: 'orders', class: 'transactional', defaultTone: 'professional', variables: ['{{username}}', '{{order_id}}'] },
  { key: 'order_packed', label: 'Order packed', group: 'orders', class: 'transactional', defaultTone: 'informative', variables: ['{{username}}', '{{order_id}}'] },
  { key: 'order_shipped', label: 'Order shipped', group: 'orders', class: 'transactional', defaultTone: 'informative', variables: ['{{username}}', '{{order_id}}', '{{delivery_date}}'] },
  { key: 'out_for_delivery', label: 'Out for delivery', group: 'orders', class: 'transactional', defaultTone: 'informative', variables: ['{{username}}', '{{order_id}}', '{{delivery_date}}'] },
  { key: 'delivery_confirmed', label: 'Delivery confirmed', group: 'orders', class: 'transactional', defaultTone: 'friendly', variables: ['{{username}}', '{{order_id}}', '{{delivery_date}}'] },
  { key: 'order_canceled', label: 'Order canceled', group: 'orders', class: 'alert', defaultTone: 'urgent', variables: ['{{username}}', '{{order_id}}'] },
  { key: 'order_refunded', label: 'Order refunded', group: 'orders', class: 'transactional', defaultTone: 'professional', variables: ['{{username}}', '{{order_id}}', '{{amount}}'] },

  { key: 'payment_pending', label: 'Payment pending', group: 'payments', class: 'alert', defaultTone: 'informative', variables: ['{{username}}', '{{order_id}}', '{{amount}}'] },
  { key: 'payment_confirmed', label: 'Payment confirmed', group: 'payments', class: 'transactional', defaultTone: 'professional', variables: ['{{username}}', '{{order_id}}', '{{amount}}'] },
  { key: 'payment_failed', label: 'Payment failed', group: 'payments', class: 'alert', defaultTone: 'urgent', variables: ['{{username}}', '{{order_id}}', '{{amount}}'] },
  { key: 'subscription_reminder', label: 'Subscription reminder', group: 'payments', class: 'transactional', defaultTone: 'informative', variables: ['{{username}}', '{{delivery_date}}'] },
  { key: 'subscription_renewed', label: 'Subscription renewed', group: 'payments', class: 'transactional', defaultTone: 'professional', variables: ['{{username}}', '{{amount}}'] },
  { key: 'subscription_failed', label: 'Subscription failed', group: 'payments', class: 'alert', defaultTone: 'urgent', variables: ['{{username}}', '{{amount}}'] },
  { key: 'invoice_generated', label: 'Invoice generated', group: 'payments', class: 'transactional', defaultTone: 'informative', variables: ['{{username}}', '{{amount}}'] },
  { key: 'refund_processed', label: 'Refund processed', group: 'payments', class: 'transactional', defaultTone: 'professional', variables: ['{{username}}', '{{amount}}', '{{order_id}}'] },

  { key: 'product_approved', label: 'Product approved', group: 'products', class: 'transactional', defaultTone: 'friendly', variables: ['{{username}}', '{{product_name}}'] },
  { key: 'product_rejected', label: 'Product rejected', group: 'products', class: 'alert', defaultTone: 'professional', variables: ['{{username}}', '{{product_name}}'] },
  { key: 'product_boosted', label: 'Product boosted', group: 'products', class: 'promotional', defaultTone: 'promotional', variables: ['{{username}}', '{{product_name}}'] },
  { key: 'boost_expiring_soon', label: 'Boost expiring soon', group: 'products', class: 'alert', defaultTone: 'informative', variables: ['{{username}}', '{{product_name}}', '{{delivery_date}}'] },
  { key: 'product_out_of_stock', label: 'Product out of stock', group: 'products', class: 'alert', defaultTone: 'urgent', variables: ['{{username}}', '{{product_name}}'] },
  { key: 'low_stock_alert', label: 'Low stock alert', group: 'products', class: 'alert', defaultTone: 'informative', variables: ['{{username}}', '{{product_name}}'] },
  { key: 'product_verified', label: 'Product verified', group: 'products', class: 'transactional', defaultTone: 'professional', variables: ['{{username}}', '{{product_name}}'] },
  { key: 'verification_approved', label: 'Verification approved', group: 'products', class: 'transactional', defaultTone: 'professional', variables: ['{{username}}', '{{product_name}}'] },
  { key: 'verification_rejected', label: 'Verification rejected', group: 'products', class: 'alert', defaultTone: 'professional', variables: ['{{username}}', '{{product_name}}'] },

  { key: 'account_created', label: 'Account created', group: 'account', class: 'transactional', defaultTone: 'friendly', variables: ['{{username}}'] },
  { key: 'account_verified', label: 'Account verified', group: 'account', class: 'transactional', defaultTone: 'professional', variables: ['{{username}}'] },
  { key: 'account_alert', label: 'Account alert', group: 'account', class: 'alert', defaultTone: 'urgent', variables: ['{{username}}'] },
  { key: 'password_reset', label: 'Password reset', group: 'account', class: 'alert', defaultTone: 'urgent', variables: ['{{username}}'] },
  { key: 'login_alert', label: 'Login alert', group: 'account', class: 'alert', defaultTone: 'urgent', variables: ['{{username}}'] },
  { key: 'profile_updated', label: 'Profile updated', group: 'account', class: 'transactional', defaultTone: 'informative', variables: ['{{username}}'] },
  { key: 'suspicious_activity_detected', label: 'Suspicious activity detected', group: 'account', class: 'alert', defaultTone: 'urgent', variables: ['{{username}}'] },

  { key: 'dispute_opened', label: 'Dispute opened', group: 'support', class: 'alert', defaultTone: 'urgent', variables: ['{{username}}', '{{order_id}}'] },
  { key: 'dispute_updated', label: 'Dispute updated', group: 'support', class: 'alert', defaultTone: 'informative', variables: ['{{username}}', '{{order_id}}'] },
  { key: 'dispute_resolved', label: 'Dispute resolved', group: 'support', class: 'transactional', defaultTone: 'professional', variables: ['{{username}}', '{{order_id}}'] },
  { key: 'support_ticket_received', label: 'Support ticket received', group: 'support', class: 'transactional', defaultTone: 'informative', variables: ['{{username}}'] },
  { key: 'support_ticket_replied', label: 'Support ticket replied', group: 'support', class: 'transactional', defaultTone: 'informative', variables: ['{{username}}'] },
  { key: 'seller_approved', label: 'Seller approved', group: 'support', class: 'transactional', defaultTone: 'friendly', variables: ['{{username}}'] },
  { key: 'seller_suspended', label: 'Seller suspended', group: 'support', class: 'alert', defaultTone: 'urgent', variables: ['{{username}}'] },
  { key: 'payout_initiated', label: 'Payout initiated', group: 'support', class: 'transactional', defaultTone: 'professional', variables: ['{{username}}', '{{amount}}'] },
  { key: 'payout_completed', label: 'Payout completed', group: 'support', class: 'transactional', defaultTone: 'professional', variables: ['{{username}}', '{{amount}}'] },
];

const eventByKey = new Map(NOTIFICATION_EVENT_LIBRARY.map((item) => [item.key, item]));

export function getNotificationEventDefinition(key: string): NotificationEventDefinition | null {
  return eventByKey.get(String(key || '').trim()) || null;
}

export function sanitizeCustomEventKey(raw: string): string {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_ -]/g, '')
    .replace(/[\s-]+/g, '_')
    .slice(0, 80);
}
