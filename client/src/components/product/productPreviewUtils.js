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

/** Resolve video or image URL (returns null when missing). */
export function resolveMediaUrl(src) {
  if (!src) return null;
  let c = src;
  if (typeof c === 'object') {
    c =
      c?.url ||
      c?.src ||
      c?.secure_url ||
      c?.path ||
      c?.video ||
      c?.videoUrl ||
      c?.videoPath;
  }
  if (typeof c !== 'string') return null;
  const t = c.trim();
  if (!t) return null;
  if (t.startsWith('http://') || t.startsWith('https://')) return t;
  if (t.startsWith('//')) return `https:${t}`;
  return `${SERVER_URL}${t.startsWith('/') ? t : `/${t}`}`;
}

/** Seller proof / verification video for gallery (first slide when present). */
export function productProofVideoUrl(product) {
  if (!product) return null;

  const direct = [
    product.videoUrl,
    product.video,
    product.videoPath,
    product.verificationVideoUrl,
    product.videoProofUrl,
    product.verification?.videoProofUrl,
    product.aiChecks?.videoProofUrl,
    product.media?.video,
    product.media?.videoUrl,
    product.media?.videoPath,
  ];
  for (const candidate of direct) {
    const url = resolveMediaUrl(candidate);
    if (url) return url;
  }

  if (Array.isArray(product.videos) && product.videos.length > 0) {
    const fromVideos = resolveMediaUrl(product.videos[0]);
    if (fromVideos) return fromVideos;
  }

  if (Array.isArray(product.media)) {
    const videoItem = product.media.find((item) => {
      const kind = String(item?.type || item?.kind || item?.mediaType || '').toLowerCase();
      const mime = String(item?.mimeType || item?.mimetype || '').toLowerCase();
      const url = String(item?.url || item?.src || item?.path || '').toLowerCase();
      return (
        kind.includes('video') ||
        mime.startsWith('video/') ||
        /\.(mp4|webm|ogg|mov|m4v|m3u8)$/i.test(url)
      );
    });
    return resolveMediaUrl(videoItem);
  }

  return null;
}

/**
 * Gallery slides for product view / quick preview: proof video first, then images.
 * @returns {Array<{ type: 'video'|'image', src: string, poster?: string }>}
 */
export function previewGalleryItems(product) {
  const items = [];
  const videoUrl = productProofVideoUrl(product);
  const poster = resolvePreviewImage(
    product?.images?.[0] || product?.image || product?.thumbnail,
  );

  if (videoUrl) {
    items.push({ type: 'video', src: videoUrl, poster, label: 'Proof video' });
  }

  if (Array.isArray(product?.images) && product.images.length) {
    product.images.forEach((img) => {
      const u = resolvePreviewImage(img);
      if (u) items.push({ type: 'image', src: u });
    });
  }
  if (!items.some((i) => i.type === 'image')) {
    const single = resolvePreviewImage(product?.image || product?.thumbnail);
    if (single) items.push({ type: 'image', src: single });
  }
  if (!items.length) {
    items.push({ type: 'image', src: FALLBACK_IMG });
  }
  return items;
}

export function previewGalleryImages(product) {
  return previewGalleryItems(product)
    .filter((item) => item.type === 'image')
    .map((item) => item.src);
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

/** Navigation preview from cards — not a full API product payload. */
export function isProductDetailPreview(p) {
  if (!p || typeof p !== 'object') return false;
  if (Array.isArray(p.images) || Array.isArray(p.variants)) return false;
  if (p.slug || p.name) return false;
  if (p.videoUrl || p.verificationVideoUrl || p.videoProofUrl) return false;
  return Boolean(p.title || p.image);
}

function mediaIdentity(raw) {
  if (!raw) return '';
  if (typeof raw === 'object') {
    return String(raw.url || raw.src || raw.secure_url || raw.path || raw.image || '').trim().toLowerCase();
  }
  return String(raw).trim().toLowerCase();
}

/** Merge images from product.images, image, thumbnail, variants, and media[]. */
export function collectProductImages(product) {
  if (!product || typeof product !== 'object') return [];
  const seen = new Set();
  const out = [];
  const add = (raw) => {
    const key = mediaIdentity(raw);
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(raw);
  };

  if (Array.isArray(product.images)) {
    product.images.filter(Boolean).forEach(add);
  } else if (product.images) {
    add(product.images);
  }

  add(product.image);
  add(product.thumbnail);
  add(product.thumbnailUrl);

  if (Array.isArray(product.media)) {
    product.media.forEach((item) => {
      if (!item) return;
      if (typeof item === 'string') {
        add(item);
        return;
      }
      const kind = String(item.type || item.kind || item.mediaType || '').toLowerCase();
      const mime = String(item.mimeType || item.mimetype || '').toLowerCase();
      const url = String(item.url || item.src || item.path || '').toLowerCase();
      const isVideo =
        kind.includes('video') ||
        mime.startsWith('video/') ||
        /\.(mp4|webm|ogg|mov|m4v|m3u8)$/i.test(url);
      if (!isVideo) add(item.url || item.src || item.path || item);
    });
  }

  if (Array.isArray(product.variants)) {
    product.variants.forEach((v) => add(v?.thumbnailUrl));
  }

  return out;
}

export const PREVIEW_SIZES = ['XS', 'S', 'M', 'L', 'XL'];

export const PREVIEW_TRUST = [
  { key: 'ship', label: 'Fast dispatch', sub: '2–4 day handling' },
  { key: 'return', label: 'Easy returns', sub: '30-day window' },
  { key: 'secure', label: 'Secure pay', sub: 'Encrypted checkout' },
  { key: 'protect', label: 'Buyer cover', sub: 'Escrow protected' },
];
