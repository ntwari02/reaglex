import { SERVER_URL } from './config';

const LOW_QUALITY_PATTERNS = [
  /placeholder/i,
  /picsum\.photos/i,
  /via\.placeholder/i,
  /dummyimage/i,
  /placehold\.co/i,
  /lorempixel/i,
  /[\?&]w=(?:[1-9]|[1-9]\d|1\d{2})(?:&|$)/i,
  /[\?&]h=(?:[1-9]|[1-9]\d|1\d{2})(?:&|$)/i,
  /photo-1523275335684-37898b6baf30/i,
];

export function extractProductImageSrc(src: unknown): string | null {
  if (!src) return null;
  if (Array.isArray(src)) return extractProductImageSrc(src[0]);
  if (typeof src === 'string') return src.trim() || null;
  if (typeof src === 'object' && src !== null) {
    const o = src as Record<string, unknown>;
    return (
      (typeof o.url === 'string' && o.url) ||
      (typeof o.secure_url === 'string' && o.secure_url) ||
      (typeof o.path === 'string' && o.path) ||
      (typeof o.src === 'string' && o.src) ||
      null
    );
  }
  return null;
}

export function isLowQualityImageUrl(url: string | null | undefined): boolean {
  if (!url) return true;
  return LOW_QUALITY_PATTERNS.some((re) => re.test(url));
}

/** Prefer larger renditions for hero / showcase imagery. */
export function toHdImageUrl(url: string): string {
  if (!url?.startsWith('http')) return url;
  try {
    const u = new URL(url);
    if (u.hostname.includes('unsplash.com')) {
      u.searchParams.set('w', '1400');
      u.searchParams.set('q', '90');
      u.searchParams.set('auto', 'format');
      u.searchParams.set('fit', 'crop');
      return u.toString();
    }
    if (u.hostname.includes('cloudinary.com') && u.pathname.includes('/upload/')) {
      const parts = u.pathname.split('/upload/');
      if (parts.length === 2 && !parts[1].startsWith('w_')) {
        u.pathname = `${parts[0]}/upload/w_1400,q_auto:good,f_auto/${parts[1]}`;
        return u.toString();
      }
    }
  } catch {
    /* keep original */
  }
  return url;
}

export function resolveProductImageUrl(
  src: unknown,
  { hd = false }: { hd?: boolean } = {},
): string | null {
  const value = extractProductImageSrc(src);
  if (!value) return null;
  const absolute = value.startsWith('http') ? value : `${SERVER_URL}${value}`;
  const url = hd ? toHdImageUrl(absolute) : absolute;
  return isLowQualityImageUrl(url) ? null : url;
}

export function getProductHeroImage(
  product: Record<string, unknown> | null | undefined,
): string | null {
  if (!product) return null;
  const images = product.images;
  const primary = Array.isArray(images)
    ? (images.find(
        (img) => img && typeof img === 'object' && (img as { is_primary?: boolean }).is_primary,
      ) || images[0])
    : images;
  return resolveProductImageUrl(
    primary || product.image || product.imageUrl || product.thumbnail || product.thumbnailUrl,
    { hd: true },
  );
}

export function productHasCatalogImage(
  product: Record<string, unknown> | null | undefined,
): boolean {
  return Boolean(getProductHeroImage(product));
}

export function productImageAltText(
  product: Record<string, unknown> | null | undefined,
): string {
  const name = String(product?.title || product?.name || 'Product').trim();
  const category = String(product?.category || product?.categoryName || '').trim();
  if (category) return `${name} — ${category} product photo`;
  return `${name} product photo`;
}
