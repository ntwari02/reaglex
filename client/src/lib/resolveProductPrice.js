/**
 * Canonical USD price for display/checkout when Product.price is missing or zero.
 */
export function resolveProductPriceUsd(product) {
  if (!product || typeof product !== 'object') return 0;

  const stored = Number(product.price);
  if (Number.isFinite(stored) && stored > 0) return stored;

  const listingAmount = Math.round(Number(product.listingPriceAmount || 0));
  const listingCurrency = String(product.listingCurrency || 'USD').trim().toUpperCase();
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
      .map((t) => Number(t?.price))
      .filter((p) => Number.isFinite(p) && p > 0);
    if (tierPrices.length) return Math.min(...tierPrices);
  }

  return 0;
}

/** Unit price for a variant row, falling back to the parent product. */
export function resolveVariantPriceUsd(variant, product) {
  const variantPrice = Number(variant?.priceUsd);
  if (Number.isFinite(variantPrice) && variantPrice > 0) return variantPrice;
  return resolveProductPriceUsd(product);
}

export function resolveVariantCompareAtUsd(variant, product) {
  const variantWas = Number(variant?.compareAtPriceUsd);
  if (Number.isFinite(variantWas) && variantWas > 0) return variantWas;
  const p = product?.compareAtPrice ?? product?.originalPrice ?? product?.compare_at_price;
  const n = Number(p);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Prefer seller listing amount when buyer currency matches listing currency. */
export function resolveProductDisplayUsd(product, buyerCurrency = 'USD') {
  const usd = resolveProductPriceUsd(product);
  if (usd > 0) return usd;

  const listingAmount = Math.round(Number(product?.listingPriceAmount || 0));
  const listingCurrency = String(product?.listingCurrency || 'USD').trim().toUpperCase();
  if (listingAmount > 0 && listingCurrency === String(buyerCurrency || '').trim().toUpperCase()) {
    return listingAmount;
  }

  return 0;
}
