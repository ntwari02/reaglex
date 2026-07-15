import mongoose from 'mongoose';
import { Order } from '../models/Order';
import { SellerRating } from '../models/SellerRating';
import { User } from '../models/User';

const SLA_OVERDUE_GRACE_HOURS = Number(process.env.ORDER_SLA_OVERDUE_GRACE_HOURS || 48);
const SLA_SEVERE_OVERDUE_DAYS = Number(process.env.ORDER_SLA_SEVERE_OVERDUE_DAYS || 7);
const DEFAULT_ESTIMATE_DAYS = Number(process.env.ORDER_SLA_DEFAULT_ESTIMATE_DAYS || 7);

const ACTIVE_FULFILLMENT_STATUSES = new Set([
  'pending',
  'processing',
  'packed',
  'paused',
  'paid',
  'booked',
  'in_progress',
  'shipped',
  'ready_for_pickup',
]);

export type DeliveryPenaltyCode = 'stale_fulfillment' | 'late_delivery' | 'severe_delay';

const PENALTY_CONFIG: Record<
  DeliveryPenaltyCode,
  { shippingSpeed: number; overall: number; communication?: number; note: string }
> = {
  stale_fulfillment: {
    shippingSpeed: 0.2,
    overall: 0.15,
    note: 'Order exceeded estimated delivery with no completion',
  },
  severe_delay: {
    shippingSpeed: 0.35,
    overall: 0.3,
    communication: 0.1,
    note: 'Order severely overdue — fulfillment stalled',
  },
  late_delivery: {
    shippingSpeed: 0.25,
    overall: 0.2,
    note: 'Delivered later than estimated delivery window',
  },
};

function clampRating(value: number, min = 1, max = 5): number {
  return Math.round(Math.max(min, Math.min(max, value)) * 100) / 100;
}

export function resolveEstimatedDeliveryAt(order: {
  createdAt?: Date;
  date?: Date;
  spacillyShipping?: { estimatedDeliveryTo?: Date; estimatedDeliveryFrom?: Date };
  deliveryPrediction?: { expected?: Date };
  fulfillment?: { carrierOptions?: Array<{ estimatedDays?: number }> };
}): Date {
  const to = order.spacillyShipping?.estimatedDeliveryTo;
  if (to) return new Date(to);
  const expected = order.deliveryPrediction?.expected;
  if (expected) return new Date(expected);
  const from = order.spacillyShipping?.estimatedDeliveryFrom;
  if (from) {
    const end = new Date(from);
    end.setDate(end.getDate() + 2);
    return end;
  }
  const created = new Date(order.createdAt || order.date || Date.now());
  const days =
    order.fulfillment?.carrierOptions?.find((c) => c.estimatedDays)?.estimatedDays ||
    DEFAULT_ESTIMATE_DAYS;
  return new Date(created.getTime() + days * 86400000);
}

function penaltyApplied(order: any, code: DeliveryPenaltyCode): boolean {
  const list = order.deliverySLA?.penalties || [];
  return list.some((p: { code?: string }) => p.code === code);
}

function resolveDeliveredAt(order: any): Date | null {
  if (order.autoCompletion?.deliveredAt) return new Date(order.autoCompletion.deliveredAt);
  const timeline = Array.isArray(order.timeline) ? order.timeline : [];
  const deliveredEntry = [...timeline]
    .reverse()
    .find((e: { status?: string }) => String(e.status || '').toLowerCase() === 'delivered');
  if (deliveredEntry?.date) return new Date(deliveredEntry.date);
  if (order.status === 'delivered' || order.status === 'completed') {
    return new Date(order.updatedAt || Date.now());
  }
  return null;
}

export async function applySellerDeliveryPenalty(params: {
  sellerId: string;
  orderId: string;
  orderNumber: string;
  code: DeliveryPenaltyCode;
}): Promise<void> {
  const cfg = PENALTY_CONFIG[params.code];
  if (!cfg) return;

  const sellerOid = new mongoose.Types.ObjectId(params.sellerId);
  const seller = await User.findById(sellerOid).select('fullName storeName email').lean();
  if (!seller) return;

  let rating = await SellerRating.findOne({ sellerId: sellerOid });
  if (!rating) {
    rating = await SellerRating.create({
      sellerId: sellerOid,
      sellerName: seller.fullName || seller.email || 'Seller',
      storeName: seller.storeName || seller.fullName || 'Store',
      overallRating: 4.5,
      communication: 4.5,
      shippingSpeed: 4.5,
      productQuality: 4.5,
      totalReviews: 0,
      status: 'good',
    });
  }

  const nextShipping = clampRating(Number(rating.shippingSpeed || 4.5) - cfg.shippingSpeed);
  const nextOverall = clampRating(Number(rating.overallRating || 4.5) - cfg.overall);
  const nextCommunication = cfg.communication
    ? clampRating(Number(rating.communication || 4.5) - cfg.communication)
    : Number(rating.communication || 4.5);

  let status: 'good' | 'warning' | 'poor' = 'good';
  if (nextOverall < 3.2) status = 'poor';
  else if (nextOverall < 4) status = 'warning';

  await SellerRating.updateOne(
    { sellerId: sellerOid },
    {
      $set: {
        shippingSpeed: nextShipping,
        overallRating: nextOverall,
        communication: nextCommunication,
        status,
        sellerName: seller.fullName || rating.sellerName,
        storeName: seller.storeName || rating.storeName,
      },
    },
  );

  await Order.updateOne(
    { _id: new mongoose.Types.ObjectId(params.orderId) },
    {
      $push: {
        'deliverySLA.penalties': {
          code: params.code,
          points: cfg.overall,
          appliedAt: new Date(),
          note: cfg.note,
        },
        timeline: {
          status: `seller_penalty_${params.code}`,
          date: new Date(),
          time: new Date().toLocaleTimeString(),
        },
      },
      $set: {
        'deliverySLA.lastEvaluatedAt': new Date(),
      },
    },
  );
}

export async function evaluateOrderDeliverySLA(order: any): Promise<DeliveryPenaltyCode[]> {
  const orderId = String(order._id);
  const sellerId = String(
    (order.sellerId as { _id?: unknown })?._id || order.sellerId || '',
  );
  if (!mongoose.Types.ObjectId.isValid(orderId) || !mongoose.Types.ObjectId.isValid(sellerId)) {
    return [];
  }

  if (['cancelled', 'completed'].includes(String(order.status))) {
    const deliveredAt = resolveDeliveredAt(order);
    const estimatedAt = resolveEstimatedDeliveryAt(order);
    const graceMs = SLA_OVERDUE_GRACE_HOURS * 3600000;
    const applied: DeliveryPenaltyCode[] = [];

    await Order.updateOne(
      { _id: order._id },
      {
        $set: {
          'deliverySLA.estimatedDeliveryAt': estimatedAt,
          'deliverySLA.lastEvaluatedAt': new Date(),
        },
      },
    );

    if (
      deliveredAt &&
      deliveredAt.getTime() > estimatedAt.getTime() + graceMs &&
      !penaltyApplied(order, 'late_delivery')
    ) {
      await applySellerDeliveryPenalty({
        sellerId,
        orderId,
        orderNumber: order.orderNumber,
        code: 'late_delivery',
      });
      applied.push('late_delivery');
    }
    return applied;
  }

  const estimatedAt = resolveEstimatedDeliveryAt(order);
  const graceMs = SLA_OVERDUE_GRACE_HOURS * 3600000;
  const severeMs = SLA_SEVERE_OVERDUE_DAYS * 86400000;
  const overdueMs = Date.now() - estimatedAt.getTime();
  const applied: DeliveryPenaltyCode[] = [];

  await Order.updateOne(
    { _id: order._id },
    {
      $set: {
        'deliverySLA.estimatedDeliveryAt': estimatedAt,
        'deliverySLA.lastEvaluatedAt': new Date(),
      },
    },
  );

  if (overdueMs <= graceMs) return applied;

  const status = String(order.status || '');

  if (overdueMs > severeMs && ACTIVE_FULFILLMENT_STATUSES.has(status) && !penaltyApplied(order, 'severe_delay')) {
    await applySellerDeliveryPenalty({
      sellerId,
      orderId,
      orderNumber: order.orderNumber,
      code: 'severe_delay',
    });
    applied.push('severe_delay');
    return applied;
  }

  if (ACTIVE_FULFILLMENT_STATUSES.has(status) && !penaltyApplied(order, 'stale_fulfillment')) {
    await applySellerDeliveryPenalty({
      sellerId,
      orderId,
      orderNumber: order.orderNumber,
      code: 'stale_fulfillment',
    });
    applied.push('stale_fulfillment');
  }

  if (status === 'delivered' && !penaltyApplied(order, 'late_delivery')) {
    const deliveredAt = resolveDeliveredAt(order);
    if (deliveredAt && deliveredAt.getTime() > estimatedAt.getTime() + graceMs) {
      await applySellerDeliveryPenalty({
        sellerId,
        orderId,
        orderNumber: order.orderNumber,
        code: 'late_delivery',
      });
      applied.push('late_delivery');
    }
  }

  return applied;
}
