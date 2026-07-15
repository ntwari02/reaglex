import type { SpacillyShippingMethodKey } from '../types/spacillyShipping.types';

export type OrderOptimizationStrategy = 'lowest_cost' | 'fastest_delivery' | 'green_shipping';

export interface OptimizationCandidateGroup {
  groupKey: string;
  sellerId: string;
  warehouseId: string;
  distanceKm: number;
  methods: Array<{
    key: SpacillyShippingMethodKey;
    enabled: boolean;
    price: number;
    etaDaysMin: number;
    etaDaysMax: number;
  }>;
  sellerPerformanceScore?: number;
  sellerFraudRisk?: number;
  carbonFootprintScore?: number;
  inventoryAvailability?: number;
}

export interface OrderOptimizationResult {
  selectedMethods: Record<string, SpacillyShippingMethodKey>;
  byGroup: Array<{
    groupKey: string;
    selectedMethod: SpacillyShippingMethodKey;
    aiEstimatedDeliveryProbability: number;
    score: number;
  }>;
  orderOptimization: {
    strategy: OrderOptimizationStrategy;
    aiConfidence: number;
    estimatedSavings: number;
  };
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function methodCarbonPenalty(method: SpacillyShippingMethodKey): number {
  if (method === 'pickup') return 0.1;
  if (method === 'standard') return 0.5;
  return 0.9;
}

function estimateDeliveryProbability(input: {
  sellerPerformanceScore: number;
  sellerFraudRisk: number;
  method: SpacillyShippingMethodKey;
  etaDaysMax: number;
  inventoryAvailability: number;
}): number {
  const speedBonus = input.method === 'express' ? 0.08 : input.method === 'pickup' ? 0.05 : 0;
  const etaPenalty = clamp((input.etaDaysMax - 2) * 0.015, 0, 0.2);
  const base =
    input.sellerPerformanceScore * 0.5 +
    (1 - input.sellerFraudRisk) * 0.2 +
    input.inventoryAvailability * 0.2 +
    0.1 +
    speedBonus -
    etaPenalty;
  return clamp(Math.round(base * 100), 45, 99);
}

function scoreMethod(
  strategy: OrderOptimizationStrategy,
  method: OptimizationCandidateGroup['methods'][number],
  group: OptimizationCandidateGroup
): number {
  const maxEta = Math.max(1, method.etaDaysMax);
  const costScore = 1 / Math.max(1, method.price);
  const speedScore = 1 / maxEta;
  const greenScore =
    clamp((group.carbonFootprintScore ?? 70) / 100, 0, 1) * (1 - methodCarbonPenalty(method.key));
  const trustScore =
    clamp((group.sellerPerformanceScore ?? 75) / 100, 0, 1) * 0.7 +
    (1 - clamp(group.sellerFraudRisk ?? 0.15, 0, 1)) * 0.3;

  if (strategy === 'fastest_delivery') {
    return speedScore * 0.5 + trustScore * 0.3 + costScore * 0.1 + greenScore * 0.1;
  }
  if (strategy === 'green_shipping') {
    return greenScore * 0.45 + costScore * 0.2 + speedScore * 0.15 + trustScore * 0.2;
  }
  return costScore * 0.5 + trustScore * 0.2 + speedScore * 0.2 + greenScore * 0.1;
}

export function optimizeOrderSplit(params: {
  strategy: OrderOptimizationStrategy;
  groups: OptimizationCandidateGroup[];
}): OrderOptimizationResult {
  const selectedMethods: Record<string, SpacillyShippingMethodKey> = {};
  const byGroup: OrderOptimizationResult['byGroup'] = [];

  let baselineCost = 0;
  let optimizedCost = 0;
  let scoreTotal = 0;

  for (const group of params.groups) {
    const enabled = group.methods.filter((m) => m.enabled);
    if (!enabled.length) continue;

    const baselineMethod =
      enabled.find((m) => m.key === 'standard') || enabled[0];
    baselineCost += baselineMethod.price;

    let best = enabled[0];
    let bestScore = -Infinity;
    for (const method of enabled) {
      const score = scoreMethod(params.strategy, method, group);
      if (score > bestScore) {
        bestScore = score;
        best = method;
      }
    }

    selectedMethods[group.groupKey] = best.key;
    optimizedCost += best.price;
    scoreTotal += bestScore;
    byGroup.push({
      groupKey: group.groupKey,
      selectedMethod: best.key,
      aiEstimatedDeliveryProbability: estimateDeliveryProbability({
        sellerPerformanceScore: clamp((group.sellerPerformanceScore ?? 75) / 100, 0, 1),
        sellerFraudRisk: clamp(group.sellerFraudRisk ?? 0.15, 0, 1),
        method: best.key,
        etaDaysMax: best.etaDaysMax,
        inventoryAvailability: clamp((group.inventoryAvailability ?? 90) / 100, 0, 1),
      }),
      score: Math.round(bestScore * 1000) / 1000,
    });
  }

  const estimatedSavings = Math.max(0, Math.round((baselineCost - optimizedCost) * 100) / 100);
  const confidence = byGroup.length
    ? clamp(Math.round((scoreTotal / byGroup.length) * 100), 60, 99)
    : 60;

  return {
    selectedMethods,
    byGroup,
    orderOptimization: {
      strategy: params.strategy,
      aiConfidence: confidence,
      estimatedSavings,
    },
  };
}
