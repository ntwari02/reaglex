import { Order } from '../models/Order';

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export async function predictCancellationReason(orderId: string) {
  const order = await Order.findById(orderId).lean();
  if (!order) throw new Error('Order not found');

  const names = (order.items || []).map((i: any) => String(i.name || '').toLowerCase());
  const sizeLike = names.some((n: string) =>
    /(shoe|shirt|dress|pant|size|jacket|sneaker|hoodie|jean)/i.test(n)
  );
  const bulkLike = names.some((n: string) => /(furniture|table|chair|sofa|cargo|bulk)/i.test(n));

  let predictedReason = 'delivery_too_slow';
  let confidence = 70;
  const retentionOffers: Array<'size_exchange' | 'shipping_speed_upgrade' | 'coupon'> = ['shipping_speed_upgrade', 'coupon'];

  if (sizeLike) {
    predictedReason = 'wrong_size';
    confidence = 86;
    retentionOffers.unshift('size_exchange');
  } else if (bulkLike) {
    predictedReason = 'shipping_cost_concern';
    confidence = 78;
  }

  const riskBase = order.status === 'pending' ? 72 : order.status === 'processing' ? 58 : 30;
  const riskScore = clamp(
    Math.round(riskBase + (predictedReason === 'wrong_size' ? 8 : 0) + (Number(order.shipping || 0) > 15 ? 7 : 0)),
    5,
    97
  );

  return {
    predictedReason,
    predictedConfidence: confidence,
    retentionOffers: [...new Set(retentionOffers)],
    riskScore,
  };
}
