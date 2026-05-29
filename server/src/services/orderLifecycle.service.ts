import mongoose from 'mongoose';
import { Order } from '../models/Order';
import type { IOrder } from '../models/Order';
import { releaseEscrow } from './escrowService';
import { notifyOrderLifecycle } from './orderLifecycleNotifications.service';
import { orderIsCashOnDelivery } from './codCheckout.service';

export type CompleteOrderOptions = {
  /** Attempt Flutterwave payout / escrow release */
  releasePayout?: boolean;
  trackingNumber?: string;
};

export type CompleteOrderResult = {
  order: IOrder;
  escrowReleased: boolean;
  notificationsSent: boolean;
};

/**
 * Admin (or system) completes an order: mark delivered/completed, optional escrow release, notify parties.
 */
export async function completeAdminOrder(
  orderId: string,
  adminUserId: string,
  options: CompleteOrderOptions = {},
): Promise<CompleteOrderResult> {
  const order = await Order.findOne(
    mongoose.Types.ObjectId.isValid(orderId) ? { _id: orderId } : { orderNumber: orderId },
  ).populate('sellerId', 'fullName email');

  if (!order) {
    throw new Error('Order not found');
  }

  const now = new Date();
  const graceHours = Number(process.env.ORDER_DELIVERED_GRACE_HOURS || 72);
  const timeline = order.timeline || [];
  let escrowReleased = false;

  if (order.status !== 'delivered' && order.status !== 'completed') {
    timeline.push({
      status: 'delivered',
      date: now,
      time: now.toTimeString().slice(0, 8),
    });
    order.status = 'delivered';
    (order as any).autoCompletion = {
      ...((order as any).autoCompletion || {}),
      deliveredAt: now,
      eligibleAt: new Date(now.getTime() + graceHours * 3600000),
      state: 'scheduled',
    };
  }

  if (options.trackingNumber !== undefined) {
    order.trackingNumber = options.trackingNumber;
  }

  const escrowSt = String(order.escrow?.status || '');
  if (
    order.escrow &&
    ['SHIPPED', 'ESCROW_HOLD', 'PICKUP_CONFIRMED', 'DIGITAL_CONFIRMED', 'SERVICE_CONFIRMED'].includes(escrowSt)
  ) {
    order.escrow.status = 'DELIVERED';
  }

  await order.save();

  const isCod = orderIsCashOnDelivery(order as any);

  if (isCod) {
    order.status = 'completed';
    timeline.push({
      status: 'completed',
      date: new Date(),
      time: new Date().toTimeString().slice(0, 8),
    });
    order.timeline = timeline;
    (order as any).autoCompletion = {
      ...((order as any).autoCompletion || {}),
      state: 'completed',
      reason: 'cod_delivered',
      completedAt: new Date(),
      completionSource: options.releasePayout === false ? 'buyer_confirmed' : 'admin',
    };
    await order.save();
    await notifyOrderLifecycle({
      order: order as IOrder & { sellerId?: { fullName?: string; email?: string } },
      actorUserId: adminUserId,
      forceEmailStatus: 'COMPLETED',
      notifySellerPayout: false,
    });
    return { order, escrowReleased: false, notificationsSent: true };
  }

  if (options.releasePayout !== false) {
    try {
      await releaseEscrow(String(order._id), adminUserId);
      escrowReleased = true;
      const refreshed = await Order.findById(order._id).populate('sellerId', 'fullName email');
      if (refreshed) {
        refreshed.status = 'completed';
        const t2 = refreshed.timeline || [];
        t2.push({
          status: 'completed',
          date: new Date(),
          time: new Date().toTimeString().slice(0, 8),
        });
        refreshed.timeline = t2;
        (refreshed as any).autoCompletion = {
          ...((refreshed as any).autoCompletion || {}),
          state: 'completed',
          reason: 'admin_manual_completion',
          completedAt: new Date(),
          completionSource: 'admin',
        };
        await refreshed.save();
        Object.assign(order, refreshed.toObject());
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes('not eligible') && !msg.includes('dispute')) {
        throw err;
      }
    }
  }

  if (!escrowReleased) {
    await notifyOrderLifecycle({
      order: order as IOrder & { sellerId?: { fullName?: string; email?: string } },
      actorUserId: adminUserId,
      forceEmailStatus: 'DELIVERED',
      notifySellerPayout: false,
    });
  }

  return {
    order,
    escrowReleased,
    notificationsSent: true,
  };
}
