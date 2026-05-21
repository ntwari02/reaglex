import { SERVER_URL } from '../../../lib/config';

export function extractImageSrc(src) {
  if (!src) return null;
  if (Array.isArray(src)) return extractImageSrc(src[0]);
  if (typeof src === 'string') return src;
  if (typeof src === 'object') {
    return src.url || src.secure_url || src.path || src.src || null;
  }
  return null;
}

export function resolveProductImage(product) {
  const primary = Array.isArray(product?.images)
    ? (product.images.find((img) => img?.is_primary) || product.images[0])
    : product?.images?.[0];
  const raw = extractImageSrc(
    primary || product?.image || product?.thumbnail || product?.thumbnailUrl,
  );
  if (!raw) return 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80';
  return raw.startsWith('http') ? raw : `${SERVER_URL}${raw}`;
}

export function productDisplayName(product) {
  return product?.title || product?.name || 'Product';
}

export function productId(product) {
  return product?._id || product?.id;
}
