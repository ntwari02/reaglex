import { SERVER_URL } from './config';
import { resolveProductImage } from '../components/home/mobile/productUtils';

export function resolveMediaUrl(src) {
  if (!src) return null;
  let c = src;
  if (typeof c === 'object') {
    c =
      c?.url ||
      c?.src ||
      c?.path ||
      c?.video ||
      c?.videoUrl ||
      c?.videoPath ||
      c?.thumbnail ||
      c?.poster;
  }
  if (typeof c !== 'string') return null;
  const t = c.trim();
  if (!t) return null;
  if (t.startsWith('http://') || t.startsWith('https://')) return t;
  if (t.startsWith('//')) return `https:${t}`;
  return `${SERVER_URL}${t.startsWith('/') ? t : `/${t}`}`;
}

/**
 * Normalized gallery items for overlay media strip.
 * @returns {{ id: string, type: 'image'|'video', url: string, thumb: string, duration?: string }[]}
 */
export function buildProductMediaList(product) {
  const items = [];
  const seen = new Set();

  const push = (raw, type = 'image', extra = {}) => {
    const url = resolveMediaUrl(raw);
    if (!url || seen.has(url)) return;
    seen.add(url);
    const thumb = resolveMediaUrl(extra.thumb) || url;
    items.push({
      id: `${type}-${items.length}`,
      type,
      url,
      thumb,
      duration: extra.duration,
    });
  };

  if (Array.isArray(product?.videos)) {
    product.videos.forEach((v) => {
      const isObj = v && typeof v === 'object';
      push(isObj ? v.url || v.src || v.video : v, 'video', {
        thumb: isObj ? v.thumbnail || v.poster || v.cover : undefined,
        duration: isObj ? v.duration || v.length : undefined,
      });
    });
  }

  if (Array.isArray(product?.images) && product.images.length) {
    product.images.forEach((img) => push(img, 'image'));
  } else if (product?.image) {
    push(product.image, 'image');
  }

  if (!items.length) {
    const fallback = resolveProductImage(product);
    if (fallback) {
      items.push({ id: 'main', type: 'image', url: fallback, thumb: fallback });
    }
  }

  return items;
}

export function prefetchMediaUrl(url) {
  if (!url || typeof window === 'undefined') return;
  const img = new Image();
  img.decoding = 'async';
  img.src = url;
}
