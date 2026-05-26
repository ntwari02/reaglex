import { SERVER_URL } from '../../lib/config';

const FALLBACK_IMG =
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80';

export function resolvePreviewImage(src) {
  if (!src) return FALLBACK_IMG;
  let c = src;
  if (typeof c === 'object') c = c?.url || c?.src || c?.secure_url || c?.path;
  if (typeof c !== 'string') return FALLBACK_IMG;
  const t = c.trim();
  if (!t) return FALLBACK_IMG;
  if (t.startsWith('http://') || t.startsWith('https://')) return t;
  if (t.startsWith('//')) return `https:${t}`;
  return `${SERVER_URL}${t.startsWith('/') ? t : `/${t}`}`;
}

export function previewGalleryImages(product) {
  const list = [];
  if (Array.isArray(product?.images) && product.images.length) {
    product.images.forEach((img) => {
      const u = resolvePreviewImage(img);
      if (u) list.push(u);
    });
  }
  if (!list.length) {
    const single = resolvePreviewImage(product?.image || product?.thumbnail);
    if (single) list.push(single);
  }
  return list.length ? list : [FALLBACK_IMG];
}

export function stripHtml(html) {
  if (!html || typeof html !== 'string') return '';
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function productOldPrice(p) {
  if (!p) return null;
  const v = p.compareAtPrice ?? p.originalPrice ?? p.compare_at_price ?? null;
  return v != null && Number(v) > 0 ? Number(v) : null;
}

export const PREVIEW_SIZES = ['XS', 'S', 'M', 'L', 'XL'];

export const PREVIEW_TRUST = [
  { key: 'ship', label: 'Fast dispatch', sub: '2–4 day handling' },
  { key: 'return', label: 'Easy returns', sub: '30-day window' },
  { key: 'secure', label: 'Secure pay', sub: 'Encrypted checkout' },
  { key: 'protect', label: 'Buyer cover', sub: 'Escrow protected' },
];
