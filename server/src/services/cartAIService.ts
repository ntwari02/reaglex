import mongoose from 'mongoose';
import { Order } from '../models/Order';

function daysBetween(a: Date, b: Date): number {
  return Math.max(1, Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)));
}

export async function buildReorderSuggestion(params: {
  buyerId: string;
  productId: string;
}) {
  const buyerObjectId = new mongoose.Types.ObjectId(params.buyerId);
  const rows = await Order.find({
    buyerId: buyerObjectId,
    'items.productId': new mongoose.Types.ObjectId(params.productId),
    status: { $in: ['processing', 'packed', 'shipped', 'delivered'] },
  } as any)
    .select('items createdAt')
    .sort({ createdAt: -1 })
    .limit(12)
    .lean();

  if (rows.length < 2) {
    return {
      likelyNeededInDays: 14,
      confidence: 55,
      rationale: 'Not enough purchase history yet. Using marketplace baseline cadence.',
    };
  }

  const dates = rows.map((r) => new Date(r.createdAt)).sort((a, b) => a.getTime() - b.getTime());
  const gaps: number[] = [];
  for (let i = 1; i < dates.length; i += 1) {
    gaps.push(daysBetween(dates[i - 1], dates[i]));
  }
  const avgGap = Math.max(1, Math.round(gaps.reduce((s, g) => s + g, 0) / gaps.length));
  const lastPurchasedAt = dates[dates.length - 1];
  const elapsed = daysBetween(lastPurchasedAt, new Date());
  const likelyNeededInDays = Math.max(0, avgGap - elapsed);
  const variance = gaps.length > 1
    ? gaps.reduce((s, g) => s + Math.abs(g - avgGap), 0) / gaps.length
    : 0;
  const confidence = Math.max(60, Math.min(95, Math.round(92 - variance * 2)));

  return {
    likelyNeededInDays,
    confidence,
    rationale: `Based on your ${gaps.length + 1} previous purchases and an average ${avgGap}-day restock cycle.`,
  };
}

export function explainCheckoutShipping(input: {
  nearestWarehouseAvailable: boolean;
  importTaxApplied: boolean;
  bulkyDimensions: boolean;
  distanceKm?: number;
}) {
  const reasons: string[] = [];
  if (!input.nearestWarehouseAvailable) reasons.push('Nearest warehouse is currently unavailable');
  if (input.importTaxApplied) reasons.push('Cross-border import tax is applied');
  if (input.bulkyDimensions) reasons.push('Package dimensions/weight increase handling cost');
  if ((input.distanceKm || 0) > 200) reasons.push('Long delivery distance increases transport cost');

  const message = reasons.length
    ? `Shipping is higher because: ${reasons.join('; ')}.`
    : 'Shipping is based on selected delivery speed, seller settings, and destination zone.';
  return { reasons, message };
}
