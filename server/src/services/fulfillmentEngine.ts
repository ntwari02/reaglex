import mongoose from 'mongoose';

export type FulfillmentType = 'shipping' | 'pickup' | 'digital' | 'service';

export interface FulfillmentGroup {
  type: FulfillmentType;
  items: Array<{ productId: string; quantity: number; variantSku?: string }>;
}

export function splitOrderGroups(params: {
  lines: Array<{ productId: string; quantity: number; variantSku?: string }>;
  productsById: Map<string, { fulfillmentType?: FulfillmentType }>;
  fulfillmentByProduct?: Record<string, FulfillmentType>;
  fallbackType?: FulfillmentType;
}): FulfillmentGroup[] {
  const byType = new Map<FulfillmentType, Array<{ productId: string; quantity: number; variantSku?: string }>>();
  const fallback = params.fallbackType || 'shipping';
  for (const line of params.lines || []) {
    if (!mongoose.Types.ObjectId.isValid(String(line.productId))) continue;
    const fromRequest = params.fulfillmentByProduct?.[String(line.productId)];
    const fromProduct = params.productsById.get(String(line.productId))?.fulfillmentType;
    const type = (fromRequest || fromProduct || fallback) as FulfillmentType;
    if (!byType.has(type)) byType.set(type, []);
    byType.get(type)!.push({
      productId: String(line.productId),
      quantity: Math.max(1, Math.min(999, Number(line.quantity) || 1)),
      variantSku: line.variantSku ? String(line.variantSku).trim() : undefined,
    });
  }

  return [...byType.entries()].map(([type, items]) => ({ type, items }));
}
