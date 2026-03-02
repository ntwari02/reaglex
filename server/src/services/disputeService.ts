import mongoose from 'mongoose';
import { Order } from '../models/Order';
import { Dispute } from '../models/Dispute';
import { refundBuyer, releaseEscrow } from './escrowService';

export async function raiseDispute(
  orderId: string,
  buyerId: string,
  reason: string,
  evidence?: any
) {
  const order = await Order.findById(orderId);

  if (!order) {
    throw new Error('Order not found');
  }

  if (order.buyerId.toString() !== buyerId.toString()) {
    throw new Error('Unauthorized');
  }

  if (!['ESCROW_HOLD', 'SHIPPED', 'DELIVERED'].includes(order.escrow?.status || '')) {
    throw new Error('Cannot dispute at this stage');
  }

  await Order.findByIdAndUpdate(orderId, {
    'escrow.status': 'DISPUTED',
    'escrow.disputeRaisedAt': new Date(),
    'escrow.disputeReason': reason,
    'escrow.autoReleaseScheduled': false,
  });

  const disputeNumber = `DSP-${Date.now()}-${Math.floor(Math.random() * 1000000)
    .toString()
    .padStart(6, '0')}`;

  await new Dispute({
    disputeNumber,
    orderId: new mongoose.Types.ObjectId(orderId),
    sellerId: order.sellerId,
    buyerId: order.buyerId,
    type: 'refund',
    reason,
    description: reason,
    priority: 'medium',
    status: 'new',
    evidence: evidence || [],
  }).save();
}

export async function resolveDispute(
  disputeId: string,
  resolution: 'BUYER_WINS' | 'SELLER_WINS',
  adminId: string
) {
  const dispute = await Dispute.findById(disputeId);
  if (!dispute) {
    throw new Error('Dispute not found');
  }

  if (resolution === 'BUYER_WINS') {
    await refundBuyer(dispute.orderId.toString(), dispute.reason);
  } else {
    await releaseEscrow(dispute.orderId.toString(), adminId);
  }

  await Dispute.findByIdAndUpdate(disputeId, {
    status: 'resolved',
    resolution,
    resolvedBy: new mongoose.Types.ObjectId(adminId),
    resolvedAt: new Date(),
  } as any);

  await Order.findByIdAndUpdate(dispute.orderId, {
    'escrow.disputeResolvedAt': new Date(),
  });
}

