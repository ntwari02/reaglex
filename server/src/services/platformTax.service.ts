import { getPlatformShippingPolicy } from './platformShippingPolicy.service';

let cachedRate: number | null = null;
let cachedAt = 0;
const TTL_MS = 5 * 60 * 1000;

/** Rwanda VAT default 18% — single source for order tax calculations. */
export async function getPlatformSalesTaxRate(): Promise<number> {
  if (cachedRate != null && Date.now() - cachedAt < TTL_MS) {
    return cachedRate;
  }
  const policy = await getPlatformShippingPolicy();
  const rate = Number(policy.salesTaxRate);
  cachedRate = Number.isFinite(rate) && rate >= 0 && rate <= 1 ? rate : 0.18;
  cachedAt = Date.now();
  return cachedRate;
}

export function computeSalesTax(
  subtotalAfterDiscount: number,
  rate: number,
  options?: { exempt?: boolean },
): number {
  if (options?.exempt) return 0;
  const base = Math.max(0, Number(subtotalAfterDiscount) || 0);
  const r = Number.isFinite(rate) && rate >= 0 ? rate : 0.18;
  return Math.round(base * r * 100) / 100;
}

export function invalidatePlatformTaxCache(): void {
  cachedRate = null;
  cachedAt = 0;
}
