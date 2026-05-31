/**
 * Resolve canonical USD unit price for storefront/checkout.
 * Legacy rows may have price=0 while listingPriceAmount + listingExchangeRate are set.
 */
export function resolveCanonicalProductPriceUsd(product: Record<string, unknown> | null | undefined): number {
  if (!product || typeof product !== 'object') return 0;

  const stored = Number(product.price);
  if (Number.isFinite(stored) && stored > 0) return stored;

  const listingAmount = Math.round(Number(product.listingPriceAmount || 0));
  const listingCurrency = String(product.listingCurrency || 'USD')
    .trim()
    .toUpperCase();
  const listingRate = Number(product.listingExchangeRate);

  if (listingAmount > 0) {
    if (listingCurrency === 'USD') return listingAmount;
    if (Number.isFinite(listingRate) && listingRate > 0) {
      return Math.max(0.01, Math.round((listingAmount / listingRate) * 100) / 100);
    }
  }

  const tiers = product.tiers;
  if (Array.isArray(tiers) && tiers.length) {
    const tierPrices = tiers
      .map((t) => Number((t as { price?: number })?.price))
      .filter((p) => Number.isFinite(p) && p > 0);
    if (tierPrices.length) return Math.min(...tierPrices);
  }

  return 0;
}

export function withResolvedProductPrice<T extends Record<string, unknown>>(product: T): T {
  const resolved = resolveCanonicalProductPriceUsd(product);
  if (resolved > 0 && !(Number(product.price) > 0)) {
    return { ...product, price: resolved };
  }
  return product;
}
