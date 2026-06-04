/**
 * Keep seller variant rows aligned with product images / listing fields for PDP.
 */

export function deriveColorsFromVariants(variants = []) {
  const colors = [];
  (variants || []).forEach((v) => {
    const c = String(v?.color || '').trim();
    if (c && !colors.includes(c)) colors.push(c);
  });
  return colors;
}

export function deriveSizesFromVariants(variants = []) {
  const sizes = [];
  (variants || []).forEach((v) => {
    const s = String(v?.size || '').trim();
    if (s && !sizes.includes(s)) sizes.push(s);
  });
  return sizes;
}

/** Assign each variant a thumbnail from uploaded product images when missing. */
export function enrichVariantsWithProductImages(variants = [], images = []) {
  const imgs = (images || []).filter(Boolean);
  if (!imgs.length) return variants || [];

  return (variants || []).map((v, i) => {
    const thumb = v?.thumbnailUrl || imgs[i % imgs.length];
    return {
      ...v,
      thumbnailUrl: thumb,
      label: v?.label || v?.color || undefined,
    };
  });
}

/** Map API variants for seller edit form (optional listing amount from stored USD). */
export function mapVariantsFromApi(variants = [], product = {}) {
  const currency = String(product?.listingCurrency || 'USD').trim().toUpperCase();
  const rate = Number(product?.listingExchangeRate) > 0 ? Number(product.listingExchangeRate) : 1;
  const images = Array.isArray(product?.images) ? product.images : [];

  return enrichVariantsWithProductImages(
    (variants || []).map((v) => {
      let listingPriceAmount = v?.listingPriceAmount;
      if (listingPriceAmount == null && Number(v?.priceUsd) > 0) {
        const usd = Number(v.priceUsd);
        if (currency === 'USD') listingPriceAmount = Math.round(usd);
        else if (rate > 0) listingPriceAmount = Math.round(usd * rate);
      }
      return {
        ...v,
        listingPriceAmount,
      };
    }),
    images,
  );
}

export function resolveColorsForSave(category, colorsInput, variants, categoryNeedsColor) {
  const fromForm = categoryNeedsColor(category) ? (colorsInput || []).filter(Boolean) : [];
  const fromVariants = deriveColorsFromVariants(variants);
  const merged = [...new Set([...fromForm, ...fromVariants])];
  if (merged.length) return merged;
  return categoryNeedsColor(category) ? fromForm : [];
}

export function resolveSizesForSave(category, sizesInput, variants, categoryNeedsSize) {
  const fromForm = categoryNeedsSize(category) ? (sizesInput || []).filter(Boolean) : [];
  const fromVariants = deriveSizesFromVariants(variants);
  const merged = [...new Set([...fromForm, ...fromVariants])];
  if (merged.length) return merged;
  return categoryNeedsSize(category) ? fromForm : [];
}
