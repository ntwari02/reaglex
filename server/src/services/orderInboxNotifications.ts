import { notifyBuyerOrderStatusChangeEnhanced } from './orderLifecycleNotifications.service';

/**
 * Order status change → buyer in-app + push + rule-based email (payment & payout aware).
 */
export async function notifyBuyerOrderStatusChange(params: {
  buyerId: unknown;
  orderId?: string;
  orderNumber: string;
  newStatus: string;
  previousStatus?: string | null;
  actorUserId: string;
}): Promise<void> {
  await notifyBuyerOrderStatusChangeEnhanced(params);
}
