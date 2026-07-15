import { Order } from '../models/Order';

export interface CarrierQuote {
  carrier: string;
  service: 'economy' | 'standard' | 'express' | 'cargo';
  estimatedDays: number;
  cost: number;
  confidence: number;
  score: number;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export async function estimateDeliveryPrediction(orderId: string) {
  const order = await Order.findById(orderId).lean();
  if (!order) throw new Error('Order not found');

  const distanceKm = Number((order as any)?.spacillyShipping?.distanceKm || 40);
  const baseDays = Math.max(1, Math.round(distanceKm / 120) + 2);
  const historicalDelayFactor = distanceKm > 350 ? 2 : distanceKm > 150 ? 1 : 0;
  const trafficFactor = distanceKm > 70 ? 1 : 0;
  const weatherFactor = distanceKm > 250 ? 1 : 0;
  const predictedDays = baseDays + historicalDelayFactor + trafficFactor + weatherFactor;
  const expectedDate = new Date();
  expectedDate.setDate(expectedDate.getDate() + predictedDays);
  const confidence = clamp(Math.round(98 - (historicalDelayFactor + trafficFactor + weatherFactor) * 3), 62, 98);

  return {
    expected: expectedDate.toISOString(),
    confidence,
    factors: {
      weather: weatherFactor,
      traffic: trafficFactor,
      historicalDelays: historicalDelayFactor,
    },
  };
}

export async function compareCarriersForOrder(orderId: string): Promise<{
  recommended: CarrierQuote;
  options: CarrierQuote[];
}> {
  const order = await Order.findById(orderId).lean();
  if (!order) throw new Error('Order not found');
  const distanceKm = Number((order as any)?.spacillyShipping?.distanceKm || 50);
  const subtotal = Number(order.subtotal || 0);

  const options: CarrierQuote[] = [
    {
      carrier: 'DHL',
      service: 'express',
      estimatedDays: Math.max(1, Math.round(distanceKm / 220) + 1),
      cost: Math.round((12 + distanceKm * 0.15 + subtotal * 0.01) * 100) / 100,
      confidence: 94,
      score: 0,
    },
    {
      carrier: 'Local Courier',
      service: 'standard',
      estimatedDays: Math.max(2, Math.round(distanceKm / 140) + 2),
      cost: Math.round((5 + distanceKm * 0.08 + subtotal * 0.004) * 100) / 100,
      confidence: 86,
      score: 0,
    },
    {
      carrier: 'Regional Cargo',
      service: 'cargo',
      estimatedDays: Math.max(3, Math.round(distanceKm / 180) + 3),
      cost: Math.round((7 + distanceKm * 0.06 + subtotal * 0.003) * 100) / 100,
      confidence: 81,
      score: 0,
    },
  ];

  for (const o of options) {
    const costScore = 1 / Math.max(1, o.cost);
    const speedScore = 1 / Math.max(1, o.estimatedDays);
    const confScore = o.confidence / 100;
    o.score = Math.round((costScore * 0.45 + speedScore * 0.35 + confScore * 0.2) * 1000) / 1000;
  }

  options.sort((a, b) => b.score - a.score);
  return { recommended: options[0], options };
}
