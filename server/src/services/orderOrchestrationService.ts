import { User } from '../models/User';
import { quoteSpacillyShipments, type QuoteCartLine } from './spacillyShipping.service';
import {
  optimizeOrderSplit,
  type OrderOptimizationStrategy,
  type OptimizationCandidateGroup,
} from './orderOptimizationEngine';
import type { SpacillyShippingMethodKey } from '../types/spacillyShipping.types';

export async function orchestrateCheckoutPlan(params: {
  lines: QuoteCartLine[];
  shippingAddress: {
    full_name: string;
    phone?: string;
    address_line1: string;
    address_line2?: string;
    city: string;
    state?: string;
    postal_code?: string;
    country: string;
  };
  strategy?: OrderOptimizationStrategy;
  selectedMethods?: Record<string, SpacillyShippingMethodKey>;
}) {
  const strategy = params.strategy || 'lowest_cost';
  const initialQuote = await quoteSpacillyShipments({
    lines: params.lines,
    shippingAddress: params.shippingAddress,
  });

  const sellerIds = [...new Set(initialQuote.groups.map((g) => g.sellerId))];
  const sellers = await User.find({ _id: { $in: sellerIds } })
    .select('isSellerVerified accountStatus warningCount')
    .lean();
  const sellerMap = new Map<string, any>(sellers.map((s) => [String(s._id), s]));

  const candidates: OptimizationCandidateGroup[] = initialQuote.groups.map((group) => {
    const seller = sellerMap.get(group.sellerId);
    const warningCount = Number(seller?.warningCount || 0);
    const isVerified = Boolean(seller?.isSellerVerified);
    const accountStatus = String(seller?.accountStatus || 'active');
    const sellerPerformanceScore = isVerified ? 88 - warningCount * 4 : 68 - warningCount * 4;
    const sellerFraudRisk =
      accountStatus === 'warned' ? 0.35 : accountStatus === 'active' ? 0.12 : 0.2;
    const inventoryAvailability = 94;
    const carbonFootprintScore = Math.max(40, 95 - Math.round(group.distanceKm * 0.8));

    return {
      groupKey: group.groupKey,
      sellerId: group.sellerId,
      warehouseId: group.warehouseId,
      distanceKm: group.distanceKm,
      methods: group.methods,
      sellerPerformanceScore,
      sellerFraudRisk,
      inventoryAvailability,
      carbonFootprintScore,
    };
  });

  const optimized = optimizeOrderSplit({
    strategy,
    groups: candidates,
  });

  const selectedMethods = {
    ...optimized.selectedMethods,
    ...(params.selectedMethods || {}),
  };

  const quote = await quoteSpacillyShipments({
    lines: params.lines,
    shippingAddress: params.shippingAddress,
    selectedMethods,
  });

  return {
    quote,
    optimized: {
      ...optimized,
      selectedMethods,
    },
  };
}
