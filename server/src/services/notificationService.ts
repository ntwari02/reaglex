// Lightweight notification helper used by payment/escrow flows.
// Currently implemented as a no-op logger to avoid coupling tightly
// with seller/buyer notification UIs. Replace with real implementation
// (e.g. SystemNotification, email, or websockets) as needed.

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

export async function sendNotification(
  userIdOrRole: string,
  type: NotificationType,
  payload?: Record<string, unknown>
): Promise<void> {
  // eslint-disable-next-line no-console
  console.log('[Notification]', { userIdOrRole, type, payload });
}

export async function sendAdminReport(payload: Record<string, unknown>): Promise<void> {
  // eslint-disable-next-line no-console
  console.log('[AdminReport]', payload);
}

