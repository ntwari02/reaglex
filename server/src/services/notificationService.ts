export type NotificationType =
  | 'PAYMENT_RECEIVED'
  | 'NEW_ORDER_PAID'
  | 'FUNDS_RELEASED'
  | 'DELIVERY_CONFIRMED'
  | 'AUTO_RELEASE_NOTICE'
  | 'AUTO_RELEASE_FUNDS'
  | 'REFUND_INITIATED'
  | 'ORDER_REFUNDED'
  | 'PAYOUT_CONFIRMED';

import { deliverBuyerNotificationFromLegacy } from './buyerNotificationService';
import { deliverSellerNotificationFromLegacy } from './sellerNotificationService';

const SELLER_TYPES: NotificationType[] = [
  'NEW_ORDER_PAID',
  'FUNDS_RELEASED',
  'PAYOUT_CONFIRMED',
  'ORDER_REFUNDED',
  'AUTO_RELEASE_FUNDS',
];

const BUYER_TYPES: NotificationType[] = [
  'PAYMENT_RECEIVED',
  'DELIVERY_CONFIRMED',
  'AUTO_RELEASE_NOTICE',
  'REFUND_INITIATED',
];

export async function sendNotification(
  userIdOrRole: string,
  type: NotificationType,
  payload?: Record<string, unknown>
): Promise<void> {
  try {
    if (SELLER_TYPES.includes(type)) {
      await deliverSellerNotificationFromLegacy(type, userIdOrRole, payload);
      return;
    }
    if (BUYER_TYPES.includes(type)) {
      await deliverBuyerNotificationFromLegacy(type, userIdOrRole, payload);
      return;
    }
  } catch (err) {
    console.error('[Notification] delivery failed:', type, err);
  }
}

export async function sendAdminReport(payload: Record<string, unknown>): Promise<void> {
  console.log('[AdminReport]', payload);
}
