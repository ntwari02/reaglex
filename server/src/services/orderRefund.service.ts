import mongoose from 'mongoose';
import { Order } from '../models/Order';
import { SellerWallet } from '../models/SellerWallet';
import { EscrowWallet } from '../models/EscrowWallet';
import { TransactionLog } from '../models/TransactionLog';
import { refundBuyer } from './escrowService';
import { notifyOrderLifecycle } from './orderLifecycleNotifications.service';
import { sendNotification } from './notificationService';
import { orderIsCashOnDelivery } from './codCheckout.service';

export type RefundResult = {
  success: boolean;
  mode: 'flutterwave' | 'ledger' | 'skipped';
  message: string;
  amount?: number;
};

/**
 * Refund a paid order (Flutterwave when possible; internal ledger for MoMo/Airtel/Stripe until PSP refund wired).
 * Africa-trust: always records refund in TransactionLog and notifies buyer.
 */
export async function refundPaidOrder(
  orderId: string,
  reason: string,
  actorUserId: string,
): Promise<RefundResult> {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new Error('Order not found');
  }

  if (orderIsCashOnDelivery(order as any)) {
    return {
      success: true,
      mode: 'skipped',
      message: 'Cash on delivery order — no online payment to refund.',
    };
  }

  const escrowSt = String(order.escrow?.status || '');
  const paid =
    Boolean(order.payment?.paidAt) ||
    escrowSt === 'ESCROW_HOLD' ||
    escrowSt === 'SHIPPED';

  if (!paid) {
    return {
      success: true,
      mode: 'skipped',
      message: 'Order was not paid online — no refund required.',
    };
  }

  if (escrowSt === 'REFUNDED' || escrowSt === 'RELEASED' || escrowSt === 'AUTO_RELEASED') {
    throw new Error('Order funds were already released or refunded');
  }

  const amount = Math.round(Number(order.total || 0) * 100) / 100;
  if (!amount) {
    throw new Error('Invalid order total for refund');
  }

  if (order.payment?.flutterwaveTransactionId) {
    await refundBuyer(orderId, reason, { amount, refundType: 'full' });
    await Order.findByIdAndUpdate(orderId, {
      $set: { status: 'cancelled' },
      $push: {
        timeline: {
          status: 'cancelled',
          date: new Date(),
          time: new Date().toLocaleTimeString(),
        },
      },
    });
    return {
      success: true,
      mode: 'flutterwave',
      amount,
      message: 'Refund initiated to your original payment method.',
    };
  }

  await ledgerRefundOrder(order, amount, reason, actorUserId);

  return {
    success: true,
    mode: 'ledger',
    amount,
    message:
      'Refund recorded. Mobile money refunds (MTN/Airtel) are processed within 1–3 business days to your wallet number on file.',
  };
}

async function ledgerRefundOrder(
  order: InstanceType<typeof Order>,
  amount: number,
  reason: string,
  actorUserId: string,
): Promise<void> {
  const orderId = String(order._id);
  const sellerAmount = Number(order.fees?.sellerAmount || order.escrow?.sellerReserve || 0);

  await Order.findByIdAndUpdate(orderId, {
    $set: {
      'escrow.status': 'REFUNDED',
      'escrow.refundedAmount': amount,
      'escrow.lastRefundAt': new Date(),
      status: 'cancelled',
    },
    $push: {
      timeline: {
        $each: [
          {
            status: 'refund_ledger',
            date: new Date(),
            time: new Date().toLocaleTimeString(),
          },
          {
            status: 'cancelled',
            date: new Date(),
            time: new Date().toLocaleTimeString(),
          },
        ],
      },
    },
  });

  if (sellerAmount > 0) {
    await SellerWallet.updateOne(
      { sellerId: order.sellerId },
      { $inc: { 'balance.pending': -sellerAmount } },
    );
  }

  await EscrowWallet.updateOne(
    {},
    {
      $inc: {
        totalHeld: -amount,
        totalRefunded: amount,
      },
    },
    { upsert: true },
  );

  await new TransactionLog({
    type: 'REFUND',
    orderId: order._id,
    buyerId: order.buyerId,
    sellerId: order.sellerId,
    amount,
    currency: order.payment?.currency || order.currencySnapshot?.currency || 'RWF',
    status: 'REFUNDED',
    metadata: {
      reason,
      refundType: 'full',
      mode: 'ledger',
      provider: order.payment?.provider || 'unknown',
      actorUserId,
    },
  }).save();

  const populated = await Order.findById(orderId).populate('sellerId', 'fullName email');
  if (populated) {
    await notifyOrderLifecycle({
      order: populated as any,
      actorUserId,
      forceEmailStatus: 'REFUNDED',
      notifySellerPayout: false,
    });
  }

  await sendNotification(String(order.buyerId), 'ORDER_REFUNDED', {
    reason,
    orderId,
    orderNumber: order.orderNumber,
    amount,
    currency: order.payment?.currency || 'RWF',
  });

  await sendNotification(String(order.sellerId), 'ORDER_REFUNDED', {
    reason,
    orderId,
    orderNumber: order.orderNumber,
  });
}

export function canBuyerCancelWithRefund(order: {
  status?: string;
  escrow?: { status?: string };
  paymentMethod?: string;
  payment?: { paidAt?: Date; method?: string };
}): boolean {
  if (orderIsCashOnDelivery(order as any)) {
    return ['pending', 'processing', 'paused'].includes(String(order.status || ''));
  }
  const st = String(order.status || '');
  const escrowSt = String(order.escrow?.status || '');
  if (['cancelled', 'shipped', 'delivered', 'completed'].includes(st)) return false;
  if (escrowSt === 'ESCROW_HOLD' && ['pending', 'processing', 'paused', 'paid'].includes(st)) {
    return true;
  }
  return ['pending', 'processing', 'paused'].includes(st) && escrowSt === 'PENDING';
}
