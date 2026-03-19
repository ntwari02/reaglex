import express, { Request, Response } from 'express';
import axios from 'axios';

/**
 * SEO SSR server (SEO-only renderer).
 *
 * Why "SEO-only"?
 * - Your current SPA uses browser-only APIs (`localStorage`) during render.
 * - For crawlers, we only need fully rendered HTML + meta tags + JSON-LD.
 * - This service intentionally does NOT render the full SPA UI.
 */

// Render sets `PORT` dynamically for web services; fall back to SEO_SSR_PORT or 5001.
const SEO_SSR_PORT = Number(process.env.SEO_SSR_PORT || process.env.PORT || 5001);

// Origin of your existing API server (the one serving `/api/products/...`)
const API_ORIGIN = process.env.API_ORIGIN || 'http://localhost:5000';
const API_BASE = `${API_ORIGIN.replace(/\/$/, '')}/api`;

// Where images are served from (defaults to same origin as API server)
const MEDIA_ORIGIN = process.env.MEDIA_ORIGIN || API_ORIGIN;

// If set, use this domain for canonical URLs in HTML.
// Otherwise we infer it from request headers (x-forwarded-host/proto).
const SEO_PUBLIC_BASE_URL = process.env.SEO_PUBLIC_BASE_URL;

type Cached = { html: string; expiresAt: number };
const cache = new Map<string, Cached>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function escapeHtml(input: unknown): string {
  const s = String(input ?? '');
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getPublicBaseUrl(req: Request): string {
  if (SEO_PUBLIC_BASE_URL) return SEO_PUBLIC_BASE_URL.replace(/\/$/, '');

  const proto =
    (req.headers['x-forwarded-proto'] as string | undefined) ||
    (req.secure ? 'https' : 'http');
  const host =
    (req.headers['x-forwarded-host'] as string | undefined) || req.get('host');

  return `${proto}://${String(host).replace(/:\d+$/, '')}`;
}

function resolveMediaUrl(src: any): string | undefined {
  if (!src) return undefined;

  if (typeof src === 'string') {
    const s = src.trim();
    if (!s) return undefined;
    if (s.startsWith('http://') || s.startsWith('https://') || s.startsWith('data:')) return s;
    if (s.startsWith('//')) return `https:${s}`;

    const origin = MEDIA_ORIGIN.replace(/\/$/, '');
    if (s.startsWith('/')) return `${origin}${s}`;
    return `${origin}/${s}`;
  }

  // Support common object shapes from older frontend versions
  if (typeof src === 'object') {
    const candidate = src.src || src.url || src.image || src.imageUrl;
    return resolveMediaUrl(candidate);
  }

  return undefined;
}

function extractPrimaryImages(product: any): string[] {
  const rawImages = product?.images;
  const single = product?.image;

  const list = Array.isArray(rawImages) && rawImages.length ? rawImages : single ? [single] : [];

  // Handle:
  // - string urls
  // - objects with `is_primary`, `src`, `url`
  // - mixed arrays
  const normalized = list
    .map((img) => {
      if (!img) return undefined;
      if (typeof img === 'string') return resolveMediaUrl(img);
      if (typeof img === 'object') {
        const primary = img?.is_primary ? img : undefined;
        const chosen = primary || img;
        return resolveMediaUrl(
          chosen?.src || chosen?.url || chosen?.image || chosen?.imageUrl || img,
        );
      }
      return undefined;
    })
    .filter((u): u is string => typeof u === 'string' && u.length > 0);

  // De-dup while keeping order
  const seen = new Set<string>();
  const result: string[] = [];
  for (const u of normalized) {
    if (seen.has(u)) continue;
    seen.add(u);
    result.push(u);
  }

  return result.slice(0, 10);
}

function productToJsonLd(args: {
  product: any;
  canonicalUrl: string;
  title: string;
  description: string;
  primaryImage?: string;
  images: string[];
}): any {
  const { product, canonicalUrl, title, description, primaryImage, images } = args;

  const price = product?.price ?? product?.currentPrice ?? 0;
  const currency = product?.currency || 'USD';
  const stock = product?.stockQuantity ?? product?.stock ?? 0;
  const status = product?.status;
  const inStock = status === 'out_of_stock' ? false : stock > 0;

  const ratingValue = Number(product?.averageRating ?? product?.rating ?? 0) || 0;
  const reviewCount = Number(product?.totalReviews ?? product?.reviewCount ?? 0) || 0;

  const sku = product?.sku || product?._id || '';
  const brandName = product?.brand || product?.seller?.storeName || product?.sellerName || 'Reaglex';

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: title,
    description,
    sku: sku ? String(sku) : undefined,
    image: images && images.length ? images : primaryImage ? [primaryImage] : undefined,
    brand: { '@type': 'Brand', name: brandName },
    url: canonicalUrl,
    offers: {
      '@type': 'Offer',
      price: Number(price) || 0,
      priceCurrency: currency,
      availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: canonicalUrl,
    },
    ...(ratingValue || reviewCount
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue,
            reviewCount,
          },
        }
      : {}),
  };
}

function buildSeoHtml(args: {
  canonicalUrl: string;
  title: string;
  description: string;
  openGraphImage?: string;
  twitterImage?: string;
  jsonLd: any;
  bodyTitle: string;
  bodyDescription: string;
  priceText?: string;
  availabilityText?: string;
  primaryImage?: string;
}): string {
  const {
    canonicalUrl,
    title,
    description,
    openGraphImage,
    twitterImage,
    jsonLd,
    bodyTitle,
    bodyDescription,
    priceText,
    availabilityText,
    primaryImage,
  } = args;

  const img = primaryImage ? escapeHtml(primaryImage) : '';
  const ogImage = openGraphImage ? escapeHtml(openGraphImage) : undefined;
  const twImage = twitterImage ? escapeHtml(twitterImage) : undefined;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />

    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />

    <meta name="robots" content="index,follow" />

    <meta property="og:type" content="product" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    ${ogImage ? `<meta property="og:image" content="${ogImage}" />` : ''}
    <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    ${twImage ? `<meta name="twitter:image" content="${twImage}" />` : ''}

    <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
  </head>
  <body>
    <main>
      <h1>${escapeHtml(bodyTitle)}</h1>
      ${img ? `<img src="${img}" alt="${escapeHtml(bodyTitle)}" loading="eager" width="600" />` : ''}
      <p>${escapeHtml(bodyDescription)}</p>
      ${
        priceText || availabilityText
          ? `<p><strong>${escapeHtml(priceText || '')}</strong>${availabilityText ? ` - ${escapeHtml(availabilityText)}` : ''}</p>`
          : ''
      }
    </main>
  </body>
</html>`;
}

async function fetchProduct(productId: string): Promise<any | null> {
  const url = `${API_BASE}/products/${productId}`;
  const resp = await axios.get(url, { timeout: 20000 });
  return resp?.data?.product || resp?.data || null;
}

const app = express();

app.get('/products/:productId', async (req: Request, res: Response) => {
  const { productId } = req.params;

  try {
    const now = Date.now();
    const cached = cache.get(productId);
    if (cached && cached.expiresAt > now) {
      res.type('text/html').status(200).send(cached.html);
      return;
    }

    const product = await fetchProduct(productId);
    if (!product) {
      res.status(404).type('text/html').send(`<!doctype html><html><head><title>Product not found</title></head><body><h1>Product not found</h1></body></html>`);
      return;
    }

    const publicBase = getPublicBaseUrl(req);
    const canonicalUrl = `${publicBase}/products/${productId}`;

    const title = product?.seoTitle || product?.name || product?.title || 'Product';
    const description =
      product?.seoDescription || product?.description || `Buy ${title} at REAGLE-X.`;

    const images = extractPrimaryImages(product);
    const primaryImage = images[0];

    const price = product?.price ?? 0;
    const currency = product?.currency || 'USD';
    const priceText = price ? `Price: ${Number(price).toFixed(2)} ${currency}` : undefined;

    const stock = product?.stockQuantity ?? product?.stock ?? 0;
    const status = product?.status;
    const availabilityText =
      status === 'out_of_stock' || stock <= 0 ? 'Out of stock' : 'In stock';

    const jsonLd = productToJsonLd({
      product,
      canonicalUrl,
      title,
      description,
      primaryImage,
      images,
    });

    const html = buildSeoHtml({
      canonicalUrl,
      title,
      description,
      openGraphImage: primaryImage,
      twitterImage: primaryImage,
      jsonLd,
      bodyTitle: title,
      bodyDescription: description,
      priceText,
      availabilityText,
      primaryImage,
    });

    cache.set(productId, { html, expiresAt: now + CACHE_TTL_MS });
    res.type('text/html').status(200).send(html);
  } catch (err) {
    console.error('[seo-ssr] error:', err);
    res.status(500).type('text/html').send(`<!doctype html><html><head><title>SEO render error</title></head><body><h1>SEO render error</h1></body></html>`);
  }
});

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'seo-ssr', port: SEO_SSR_PORT });
});

app.listen(SEO_SSR_PORT, () => {
  console.log(`✅ SEO SSR server listening on port ${SEO_SSR_PORT}`);
  console.log(`✅ API origin: ${API_ORIGIN}`);
});

