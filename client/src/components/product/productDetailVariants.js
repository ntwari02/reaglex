import { resolveVariantCompareAtUsd, resolveVariantPriceUsd } from '../../lib/resolveProductPrice';
import { resolvePreviewImage } from './productPreviewUtils';

/** Build AliExpress-style color swatch rows from variants or legacy colors[]. */
export function buildProductColorOptions(product, variantOptions = []) {
  if (!product) return [];

  const withColor = variantOptions.filter((v) => v?.color || v?.label);
  if (withColor.length) {
    const map = new Map();
    withColor.forEach((v) => {
      const key = String(v.color || v.label || v.sku);
      const existing = map.get(key);
      const entry = {
        key,
        color: v.color || key,
        label: v.label || v.color || key,
        thumbnailUrl: v.thumbnailUrl,
        swatchHex: v.swatchHex,
        badge: v.badge,
        variants: existing ? [...existing.variants, v] : [v],
      };
      map.set(key, entry);
    });
    return [...map.values()].map((row) => ({
      ...row,
      thumbnailUrl: row.thumbnailUrl || product.images?.[0] || product.image,
    }));
  }

  const legacyColors = Array.isArray(product.colors) ? product.colors.filter(Boolean) : [];
  return legacyColors.map((c, i) => ({
    key: c,
    color: c,
    label: typeof c === 'string' && c.startsWith('#') ? `Color ${i + 1}` : c,
    thumbnailUrl: product.images?.[i] || product.images?.[0] || product.image,
    swatchHex: c,
    variants: [],
  }));
}

export function pickVariantForSelection(variantOptions, { colorKey, size }) {
  if (!variantOptions.length) return null;
  const pool = variantOptions.filter((v) => {
    if (colorKey && v.color && v.color !== colorKey) return false;
    if (size && v.size && v.size !== size) return false;
    return true;
  });
  return pool[0] || variantOptions[0] || null;
}

export function flattenReviewGalleryMedia(reviewGallery = [], resolveImg = resolvePreviewImage) {
  const items = [];
  reviewGallery.forEach((row, rowIdx) => {
    const imgs = Array.isArray(row?.images) ? row.images : [];
    imgs.forEach((img, imgIdx) => {
      const src = resolveImg(img);
      if (src) {
        items.push({
          id: `${row?.id || rowIdx}-${imgIdx}`,
          src,
          rating: row?.rating,
          customerName: row?.customerName,
        });
      }
    });
  });
  return items;
}

export function productPricingForVariant(product, variant) {
  const unitUsd = resolveVariantPriceUsd(variant, product);
  const compareUsd = resolveVariantCompareAtUsd(variant, product);
  const baseUsd = resolveVariantPriceUsd(null, product);
  const priceDiffers = variant && unitUsd > 0 && Math.abs(unitUsd - baseUsd) > 0.009;
  return { unitUsd, compareUsd, priceDiffers };
}
