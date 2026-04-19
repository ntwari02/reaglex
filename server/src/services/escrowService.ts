import { getFlutterwaveClient } from '../config/flutterwave';
import { Order } from '../models/Order';
import { SellerWallet } from '../models/SellerWallet';
import { EscrowWallet } from '../models/EscrowWallet';
import { TransactionLog } from '../models/TransactionLog';
import { sendNotification } from './notificationService';

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

  if (order.escrow?.status !== 'ESCROW_HOLD' && order.escrow?.status !== 'SHIPPED') {
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
    narration: `Reaglex payout for Order ${order._id}`,
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

    await sendNotification(order.sellerId.toString(), 'FUNDS_RELEASED', {
      amount: amountToSeller,
    });
    await sendNotification(order.buyerId.toString(), 'DELIVERY_CONFIRMED');

    return { success: true };
  }

  throw new Error(response.message || 'Failed to release escrow');
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
    await sendNotification(order.sellerId.toString(), 'AUTO_RELEASE_FUNDS');
  }
}

export async function refundBuyer(orderId: string, reason: string) {
  const order = await Order.findById(orderId);
  if (!order || !order.payment?.flutterwaveTransactionId) {
    throw new Error('Order / payment not found');
  }

  const refundPayload: any = {
    id: order.payment.flutterwaveTransactionId,
    amount: order.total,
  };

  const flw = await getFlutterwaveClient();
  const response = await flw.Transaction.refund(refundPayload);

  if (response.status === 'success') {
    await Order.findByIdAndUpdate(orderId, {
      'escrow.status': 'REFUNDED',
    });

    await EscrowWallet.updateOne(
      {},
      {
        $inc: {
          totalHeld: -order.total,
          totalRefunded: order.total,
        },
      }
    );

    await new TransactionLog({
      type: 'REFUND',
      orderId: order._id,
      buyerId: order.buyerId,
      sellerId: order.sellerId,
      amount: order.total,
      currency: order.payment.currency || 'USD',
      status: 'REFUNDED',
      flutterwaveRef: String(order.payment.flutterwaveTransactionId),
      metadata: { reason },
    }).save();

    await sendNotification(order.buyerId.toString(), 'REFUND_INITIATED', {
      amount: order.total,
      reason,
    });
    await sendNotification(order.sellerId.toString(), 'ORDER_REFUNDED', { reason });
  } else {
    throw new Error(response.message || 'Failed to refund buyer');
  }
}

