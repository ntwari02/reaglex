import { resolveVariantCompareAtUsd, resolveVariantPriceUsd } from '../../lib/resolveProductPrice';
import {
  collectProductImages,
  productProofVideoUrl,
  resolvePreviewImage,
  resolveMediaUrl,
} from './productPreviewUtils';

/** Build AliExpress-style color swatch rows from variants, legacy colors[], or product images. */
export function buildProductColorOptions(product, variantOptions = []) {
  if (!product) return [];

  const productImages = collectProductImages(product);

  const withIdentity = variantOptions.filter(
    (v) => v?.color || v?.label || v?.thumbnailUrl || v?.size || v?.sku,
  );
  if (withIdentity.length) {
    const map = new Map();
    withIdentity.forEach((v, variantIdx) => {
      const key = String(v.color || v.label || v.size || v.sku || `variant-${variantIdx}`);
      const existing = map.get(key);
      const thumb =
        v.thumbnailUrl ||
        productImages[variantIdx] ||
        productImages[existing ? existing.variants.length : 0];
      const fallbackLabel =
        v.label ||
        v.color ||
        v.size ||
        (v.sku && !String(v.sku).startsWith('variant-') ? v.sku : `Option ${variantIdx + 1}`);
      const entry = {
        key,
        color: v.color || key,
        label: fallbackLabel,
        thumbnailUrl: thumb,
        swatchHex: v.swatchHex,
        badge: v.badge,
        variants: existing ? [...existing.variants, v] : [v],
      };
      map.set(key, entry);
    });
    return [...map.values()].map((row, i) => ({
      ...row,
      thumbnailUrl:
        row.thumbnailUrl ||
        row.variants.find((v) => v?.thumbnailUrl)?.thumbnailUrl ||
        productImages[i] ||
        productImages[0] ||
        product.image,
    }));
  }

  const legacyColors = Array.isArray(product.colors) ? product.colors.filter(Boolean) : [];
  if (legacyColors.length) {
    return legacyColors.map((c, i) => ({
      key: c,
      color: c,
      label: typeof c === 'string' && c.startsWith('#') ? `Color ${i + 1}` : c,
      thumbnailUrl: productImages[i] || productImages[0] || product.image,
      swatchHex: c,
      variants: [],
    }));
  }

  const imgs = collectProductImages(product);
  if (imgs.length > 1) {
    return imgs.map((img, i) => ({
      key: `image-${i}`,
      color: `image-${i}`,
      label: i === 0 ? 'Main' : `Photo ${i + 1}`,
      thumbnailUrl: img,
      imageIndex: i,
      variants: [],
    }));
  }

  return [];
}

/**
 * Full PDP gallery: product images (first = cover), proof video, then variant thumbnails (deduped).
 * @returns {Array<{ type: 'video'|'image', src: string, poster?: string, label?: string, imageIndex?: number, variantSku?: string, colorKey?: string }>}
 */
export function buildProductDetailGallery(product, variantOptions = [], resolvers = {}) {
  const resolveImg = resolvers.resolveImage || resolvePreviewImage;
  const resolveVid = resolvers.resolveVideo || resolveMediaUrl;
  const productImages = collectProductImages(product);
  const items = [];
  const seen = new Set();

  const addImage = (raw, meta = {}) => {
    const src = resolveImg(raw);
    if (!src || seen.has(src)) return;
    seen.add(src);
    items.push({ type: 'image', src, ...meta });
  };

  productImages.forEach((img, idx) => {
    addImage(img, { imageIndex: idx });
  });

  const videoUrl = productProofVideoUrl(product);
  const poster = resolveImg(productImages[0] || product?.image || product?.thumbnail);
  if (videoUrl) {
    const src = resolveVid(videoUrl) || videoUrl;
    if (src && !seen.has(src)) {
      seen.add(src);
      items.push({ type: 'video', src, poster, label: 'Proof video' });
    }
  }

  (variantOptions || []).forEach((v, variantIdx) => {
    const rawThumb = v?.thumbnailUrl || productImages[variantIdx];
    if (rawThumb) {
      addImage(rawThumb, {
        variantSku: v.sku,
        colorKey: v.color || v.label,
        variantLabel: v.label || v.color,
      });
    }
  });

  if (!items.length) {
    items.push({ type: 'image', src: resolveImg(null) });
  }
  return items;
}

/** Map a color/style option to its index in `buildProductDetailGallery` output. */
export function galleryIndexForColorOption(galleryItems, option, resolveImg = resolvePreviewImage) {
  if (!option || !Array.isArray(galleryItems) || !galleryItems.length) return -1;

  const thumb = option.thumbnailUrl ? resolveImg(option.thumbnailUrl) : null;
  if (thumb) {
    const bySrc = galleryItems.findIndex((g) => g.src === thumb);
    if (bySrc >= 0) return bySrc;
  }

  if (Number.isFinite(option.imageIndex)) {
    const byIdx = galleryItems.findIndex((g) => g.imageIndex === option.imageIndex);
    if (byIdx >= 0) return byIdx;
  }

  const colorKey = option.color || option.key;
  if (colorKey) {
    const byColor = galleryItems.findIndex(
      (g) => g.colorKey === colorKey || g.variantSku && option.variants?.some((v) => v.sku === g.variantSku),
    );
    if (byColor >= 0) return byColor;
  }

  return -1;
}

export function pickVariantForSelection(variantOptions, { colorKey, size }) {
  if (!variantOptions.length) return null;
  if (colorKey?.startsWith('image-')) {
    const idx = Number(colorKey.replace('image-', ''));
    return variantOptions[idx] || variantOptions[0] || null;
  }
  const pool = variantOptions.filter((v) => {
    if (colorKey) {
      const matchesColor = v.color === colorKey || v.label === colorKey;
      if (v.color || v.label) {
        if (!matchesColor) return false;
      }
    }
    if (size && v.size && v.size !== size) return false;
    return true;
  });
  return pool[0] || variantOptions[0] || null;
}

export function flattenReviewGalleryMedia(reviewGallery = [], resolveImg = resolvePreviewImage) {
  const items = [];
  reviewGallery.forEach((row, rowIdx) => {
    if (typeof row === 'string') {
      const src = resolveImg(row);
      if (src) items.push({ id: `s-${rowIdx}`, src });
      return;
    }
    const imgs = Array.isArray(row?.images) ? [...row.images] : [];
    if (!imgs.length && row?.image) imgs.push(row.image);
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
