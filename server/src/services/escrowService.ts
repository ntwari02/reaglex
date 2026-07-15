import { getFlutterwaveClient } from '../config/flutterwave';
import { Order } from '../models/Order';
import { SellerWallet } from '../models/SellerWallet';
import { EscrowWallet } from '../models/EscrowWallet';
import { TransactionLog } from '../models/TransactionLog';
import { notifyOrderLifecycle } from './orderLifecycleNotifications.service';
import { sendNotification } from './notificationService';
import { restoreInventoryForOrder } from './inventory.service';
import mongoose from 'mongoose';

export async function scheduleAutoRelease(orderId: string) {
  await Order.findByIdAndUpdate(orderId, {
    'escrow.autoReleaseScheduled': true,
  });
}

export async function releaseEscrow(orderId: string, confirmedBy: string) {
  const order = await Order.findById(orderId).populate('sellerId');

  if (!order) {
    throw new Error('Order not found');
  }

  if (
    order.escrow?.status !== 'ESCROW_HOLD' &&
    order.escrow?.status !== 'SHIPPED' &&
    order.escrow?.status !== 'DELIVERED' &&
    order.escrow?.status !== 'PICKUP_CONFIRMED' &&
    order.escrow?.status !== 'DIGITAL_CONFIRMED' &&
    order.escrow?.status !== 'SERVICE_CONFIRMED'
  ) {
    throw new Error('Order not eligible for release');
  }

  if (order.escrow?.disputeRaisedAt) {
    throw new Error('Cannot release — dispute is active');
  }

  const sellerWallet = await SellerWallet.findOne({ sellerId: order.sellerId });

  if (!sellerWallet) {
    throw new Error('Seller wallet not found');
  }

  const amountToSeller = order.fees?.sellerAmount || 0;

  const transferPayload: any = {
    account_bank: sellerWallet.bankCode,
    account_number: sellerWallet.accountNumber,
    amount: amountToSeller,
    currency: order.payment?.currency || 'USD',
    narration: `Spacilly payout for Order ${order._id}`,
    reference: `PAYOUT-${order._id}-${Date.now()}`,
    debit_currency: order.payment?.currency || 'USD',
    meta: {
      order_id: order._id.toString(),
      seller_id: order.sellerId.toString(),
      confirmed_by: confirmedBy,
    },
  };

  const flw = await getFlutterwaveClient();
  const response = await flw.Transfer.initiate(transferPayload);

  if (response.status === 'success') {
    await Order.findByIdAndUpdate(order._id, {
      'escrow.status': 'RELEASED',
      'escrow.releasedAt': new Date(),
      'escrow.releasedProductAmount': Number(order.escrow?.productAmount || order.subtotal || 0),
      'escrow.releasedShippingAmount': Number(order.escrow?.shippingAmount || order.shipping || 0),
      'escrow.releasedTaxAmount': Number(order.escrow?.taxAmount || order.tax || 0),
      'escrow.releasedSellerReserve': Number(order.escrow?.sellerReserve || amountToSeller || 0),
      'payout.transferId': response.data.id,
      'payout.transferStatus': response.data.status,
      'payout.paidToSellerAt': new Date(),
      'payout.sellerSubaccountId': sellerWallet.flutterwaveSubaccountId,
    });

    await SellerWallet.findOneAndUpdate(
      { sellerId: order.sellerId },
      {
        $inc: {
          'balance.pending': -amountToSeller,
          'balance.available': amountToSeller,
        },
      }
    );

    await EscrowWallet.updateOne(
      {},
      {
        $inc: {
          totalHeld: -order.total,
          totalReleased: amountToSeller,
          totalFees: order.fees?.platformFeeAmount || 0,
        },
      }
    );

    await new TransactionLog({
      type: 'RELEASE',
      orderId: order._id,
      buyerId: order.buyerId,
      sellerId: order.sellerId,
      amount: amountToSeller,
      currency: order.payment?.currency || 'USD',
      status: 'RELEASED',
      flutterwaveRef: String(response.data.id),
    }).save();

    const populated = await Order.findById(order._id).populate('sellerId', 'fullName email');
    if (populated) {
      await notifyOrderLifecycle({
        order: populated as any,
        actorUserId: confirmedBy,
        forceEmailStatus: 'COMPLETED',
        notifySellerPayout: true,
      });
    }

    return { success: true };
  }

  throw new Error(response.message || 'Failed to release escrow');
}

export async function partialReleaseEscrow(
  orderId: string,
  component: 'product' | 'shipping' | 'tax' | 'seller_reserve',
  amount: number,
  confirmedBy: string
) {
  const order = await Order.findById(orderId);
  if (!order) throw new Error('Order not found');
  if (!order.escrow || !['ESCROW_HOLD', 'SHIPPED', 'DISPUTED'].includes(order.escrow.status)) {
    throw new Error('Order not eligible for partial release');
  }
  const releaseAmount = Math.max(0, Number(amount || 0));
  if (!releaseAmount) throw new Error('Invalid partial release amount');

  const map: Record<string, { total: number; released: number; totalKey: string; releasedKey: string }> = {
    product: {
      total: Number(order.escrow.productAmount || order.subtotal || 0),
      released: Number(order.escrow.releasedProductAmount || 0),
      totalKey: 'escrow.productAmount',
      releasedKey: 'escrow.releasedProductAmount',
    },
    shipping: {
      total: Number(order.escrow.shippingAmount || order.shipping || 0),
      released: Number(order.escrow.releasedShippingAmount || 0),
      totalKey: 'escrow.shippingAmount',
      releasedKey: 'escrow.releasedShippingAmount',
    },
    tax: {
      total: Number(order.escrow.taxAmount || order.tax || 0),
      released: Number(order.escrow.releasedTaxAmount || 0),
      totalKey: 'escrow.taxAmount',
      releasedKey: 'escrow.releasedTaxAmount',
    },
    seller_reserve: {
      total: Number(order.escrow.sellerReserve || order.fees?.sellerAmount || 0),
      released: Number(order.escrow.releasedSellerReserve || 0),
      totalKey: 'escrow.sellerReserve',
      releasedKey: 'escrow.releasedSellerReserve',
    },
  };
  const target = map[component];
  const remaining = Math.max(0, target.total - target.released);
  if (releaseAmount > remaining) throw new Error(`Release exceeds remaining ${component} balance`);

  await Order.findByIdAndUpdate(orderId, {
    $inc: { [target.releasedKey]: releaseAmount },
    $set: { 'escrow.lastPartialReleaseAt': new Date(), 'escrow.lastPartialReleaseBy': confirmedBy },
  } as any);

  await new TransactionLog({
    type: 'RELEASE',
    orderId: order._id,
    buyerId: order.buyerId,
    sellerId: order.sellerId,
    amount: releaseAmount,
    currency: order.payment?.currency || 'USD',
    status: 'RELEASED',
    metadata: { partial: true, component, confirmedBy },
  }).save();

  return { success: true, component, released: releaseAmount, remaining: remaining - releaseAmount };
}

export async function autoReleaseEscrow(orderId: string) {
  const order = await Order.findById(orderId);
  if (!order || !order.escrow) return;

  if (
    order.escrow.status === 'SHIPPED' &&
    !order.escrow.disputeRaisedAt &&
    order.escrow.releaseEligibleAt &&
    new Date() >= order.escrow.releaseEligibleAt
  ) {
    await releaseEscrow(orderId, 'AUTO_SYSTEM');
    await Order.findByIdAndUpdate(orderId, {
      'escrow.status': 'AUTO_RELEASED',
    });

    await sendNotification(order.buyerId.toString(), 'AUTO_RELEASE_NOTICE');
    await sendNotification(order.sellerId.toString(), 'AUTO_RELEASE_FUNDS', {
      orderId: String(order._id),
      orderNumber: order.orderNumber,
    });
  }
}

export async function refundBuyer(
  orderId: string,
  reason: string,
  options?: {
    amount?: number;
    refundType?: 'full' | 'partial';
    disputeId?: string;
  }
) {
  const order = await Order.findById(orderId);
  if (!order || !order.payment?.flutterwaveTransactionId) {
    throw new Error('Order / payment not found');
  }

  const refundedAgg = await TransactionLog.aggregate([
    {
      $match: {
        type: 'REFUND',
        orderId: new mongoose.Types.ObjectId(orderId),
        status: 'REFUNDED',
      },
    },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  const alreadyRefunded = Number(refundedAgg[0]?.total || 0);
  const maxRefundable = Math.max(0, Number(order.total || 0) - alreadyRefunded);
  const requestedAmount = Number(options?.amount ?? order.total);
  const amount = Number.isFinite(requestedAmount) ? Number(requestedAmount.toFixed(2)) : NaN;

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Invalid refund amount');
  }
  if (amount > maxRefundable) {
    throw new Error(`Refund exceeds remaining refundable amount (${maxRefundable.toFixed(2)})`);
  }

  const refundPayload: any = {
    id: order.payment.flutterwaveTransactionId,
    amount,
  };

  const flw = await getFlutterwaveClient();
  const response = await flw.Transaction.refund(refundPayload);

  if (response.status === 'success') {
    const cumulativeRefunded = alreadyRefunded + amount;
    const isFullyRefunded = cumulativeRefunded >= Number(order.total || 0);

    await Order.findByIdAndUpdate(orderId, {
      ...(isFullyRefunded ? { 'escrow.status': 'REFUNDED' } : {}),
      'escrow.refundedAmount': cumulativeRefunded,
      'escrow.lastRefundAt': new Date(),
    });

    await EscrowWallet.updateOne(
      {},
      {
        $inc: {
          totalHeld: -amount,
          totalRefunded: amount,
        },
      }
    );

    await new TransactionLog({
      type: 'REFUND',
      orderId: order._id,
      buyerId: order.buyerId,
      sellerId: order.sellerId,
      amount,
      currency: order.payment.currency || 'USD',
      status: 'REFUNDED',
      flutterwaveRef: String(order.payment.flutterwaveTransactionId),
      metadata: {
        reason,
        refundType: options?.refundType || (isFullyRefunded ? 'full' : 'partial'),
        disputeId: options?.disputeId,
        refundedAmount: amount,
        cumulativeRefunded,
      },
    }).save();

    const populated = await Order.findById(orderId).populate('sellerId', 'fullName email');
    if (populated) {
      await notifyOrderLifecycle({
        order: populated as any,
        actorUserId: 'system',
        forceEmailStatus: 'REFUNDED',
        notifySellerPayout: false,
      });
    }
    await sendNotification(order.sellerId.toString(), 'ORDER_REFUNDED', {
      reason,
      orderId: String(order._id),
      orderNumber: order.orderNumber,
    });

    if (isFullyRefunded) {
      await restoreInventoryForOrder(orderId, 'order_refunded');
    }
  } else {
    throw new Error(response.message || 'Failed to refund buyer');
  }
}

