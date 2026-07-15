import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import express, { Request, Response } from 'express';
import axios from 'axios';
import { getServerUrl } from '../config/publicEnv';

/**
 * SEO SSR server (SEO-only renderer for crawlers behind a reverse-proxy).
 * Serves real HTML + meta + JSON-LD for product pages without running the full SPA.
 */

const SEO_SSR_PORT = Number(process.env.SEO_SSR_PORT || process.env.PORT || 5001);
const API_ORIGIN = (process.env.API_ORIGIN || '').trim() || getServerUrl();
const API_BASE = `${API_ORIGIN.replace(/\/$/, '')}/api`;
const MEDIA_ORIGIN = (process.env.MEDIA_ORIGIN || '').trim() || API_ORIGIN;
const SEO_PUBLIC_BASE_URL = process.env.SEO_PUBLIC_BASE_URL;

type Cached = { html: string; expiresAt: number };
const cache = new Map<string, Cached>();
const CACHE_TTL_MS = 5 * 60 * 1000;

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
    (req.headers['x-forwarded-proto'] as string | undefined) || (req.secure ? 'https' : 'http');
  const host = (req.headers['x-forwarded-host'] as string | undefined) || req.get('host');

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
  const brandName = product?.brand || product?.seller?.storeName || product?.sellerName || 'Spacilly';

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
  jsonLd: any[];
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
  const ldJson = jsonLd.length ? JSON.stringify(jsonLd) : '[]';

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
    <meta property="og:site_name" content="Spacilly" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    ${ogImage ? `<meta property="og:image" content="${ogImage}" />` : ''}
    ${ogImage ? `<meta property="og:image:secure_url" content="${ogImage}" />` : ''}
    <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    ${twImage ? `<meta name="twitter:image" content="${twImage}" />` : ''}

    <script type="application/ld+json">${ldJson}</script>
  </head>
  <body>
    <main>
      <h1>${escapeHtml(bodyTitle)}</h1>
      ${img ? `<img src="${img}" alt="${escapeHtml(bodyTitle)}" loading="eager" decoding="async" width="600" height="600" />` : ''}
      <p>${escapeHtml(bodyDescription)}</p>
      ${
        priceText || availabilityText
          ? `<p><strong>${escapeHtml(priceText || '')}</strong>${availabilityText ? ` - ${escapeHtml(availabilityText)}` : ''}</p>`
          : ''
      }
      <p><a href="${escapeHtml(canonicalUrl)}">Open in Spacilly</a></p>
    </main>
  </body>
</html>`;
}

async function fetchProductById(productId: string): Promise<any | null> {
  const url = `${API_BASE}/products/${encodeURIComponent(productId)}`;
  const resp = await axios.get(url, { timeout: 20000 });
  return resp?.data?.product || resp?.data || null;
}

async function fetchProductBySlug(slug: string): Promise<any | null> {
  const url = `${API_BASE}/products/by-slug/${encodeURIComponent(slug)}`;
  const resp = await axios.get(url, { timeout: 20000 });
  return resp?.data?.product || resp?.data || null;
}

async function sendProductSeoPage(
  req: Request,
  res: Response,
  cacheKey: string,
  canonicalPath: string,
  product: any,
) {
    const publicBase = getPublicBaseUrl(req);
  const canonicalUrl = `${publicBase}${canonicalPath}`;

    const title = product?.seoTitle || product?.name || product?.title || 'Product';
    const description =
    product?.seoDescription || product?.description || `Buy ${title} on Spacilly — escrow-protected marketplace.`;

    const images = extractPrimaryImages(product);
    const primaryImage = images[0];

    const price = product?.price ?? 0;
  const currency = product?.listingCurrency || product?.currency || 'USD';
    const priceText = price ? `Price: ${Number(price).toFixed(2)} ${currency}` : undefined;

    const stock = product?.stockQuantity ?? product?.stock ?? 0;
    const status = product?.status;
    const availabilityText =
      status === 'out_of_stock' || stock <= 0 ? 'Out of stock' : 'In stock';

  const productJson = productToJsonLd({
      product,
      canonicalUrl,
      title,
      description,
      primaryImage,
      images,
    });

  const breadcrumbs = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${publicBase}/` },
        { '@type': 'ListItem', position: 2, name: 'Products', item: `${publicBase}/products` },
        {
          '@type': 'ListItem',
          position: 3,
          name: title,
          item: canonicalUrl,
        },
      ],
    },
  ];

    const html = buildSeoHtml({
      canonicalUrl,
    title: `${title} | Spacilly`,
      description,
      openGraphImage: primaryImage,
      twitterImage: primaryImage,
    jsonLd: [...breadcrumbs, productJson],
      bodyTitle: title,
    bodyDescription: description.replace(/<[^>]+>/g, '').slice(0, 320),
      priceText,
      availabilityText,
      primaryImage,
    });

  const now = Date.now();
  cache.set(cacheKey, { html, expiresAt: now + CACHE_TTL_MS });
  res.setHeader('Cache-Control', 'public, max-age=120, stale-while-revalidate=86400');
    res.type('text/html').status(200).send(html);
}

function buildMarketingPageHtml(args: {
  canonicalUrl: string;
  title: string;
  description: string;
  robots: string;
  ogType: string;
  jsonLd: any[];
  bodyInner: string;
  ogImage?: string;
}): string {
  const { canonicalUrl, title, description, robots, ogType, jsonLd, bodyInner, ogImage } = args;
  const og = ogImage ? escapeHtml(ogImage) : '';
  const ldJson = jsonLd.length ? JSON.stringify(jsonLd) : '[]';
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
    <meta name="robots" content="${escapeHtml(robots)}" />
    <meta property="og:type" content="${escapeHtml(ogType)}" />
    <meta property="og:site_name" content="Spacilly" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    ${og ? `<meta property="og:image" content="${og}" /><meta property="og:image:secure_url" content="${og}" />` : ''}
    <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    ${og ? `<meta name="twitter:image" content="${og}" />` : ''}
    <script type="application/ld+json">${ldJson}</script>
  </head>
  <body>
    <main>${bodyInner}</main>
  </body>
</html>`;
}

const app = express();

app.get('/product/:slug', async (req: Request, res: Response) => {
  const slug = String(req.params.slug || '').trim().toLowerCase();
  if (!slug) {
    res.status(400).type('text/html').send('<!doctype html><html><body>Bad request</body></html>');
    return;
  }

  try {
    const now = Date.now();
    const cached = cache.get(`s:${slug}`);
    if (cached && cached.expiresAt > now) {
      res.setHeader('Cache-Control', 'public, max-age=120, stale-while-revalidate=86400');
      res.type('text/html').status(200).send(cached.html);
      return;
    }

    const product = await fetchProductBySlug(slug);
    if (!product) {
      res
        .status(404)
        .type('text/html')
        .send(
          `<!doctype html><html><head><title>Product not found</title><meta name="robots" content="noindex"></head><body><h1>Product not found</h1></body></html>`,
        );
      return;
    }

    const canonicalSlug = String(product?.slug || slug).trim().toLowerCase();
    const path = `/product/${encodeURIComponent(canonicalSlug)}`;
    await sendProductSeoPage(req, res, `s:${canonicalSlug}`, path, product);
  } catch (err) {
    console.error('[seo-ssr] error:', err);
    res
      .status(500)
      .type('text/html')
      .send(
        `<!doctype html><html><head><title>SEO render error</title></head><body><h1>SEO render error</h1></body></html>`,
      );
  }
});

app.get('/products/:productId', async (req: Request, res: Response) => {
  const { productId } = req.params;

  try {
    const now = Date.now();
    const cached = cache.get(`id:${productId}`);
    if (cached && cached.expiresAt > now) {
      res.setHeader('Cache-Control', 'public, max-age=120, stale-while-revalidate=86400');
      res.type('text/html').status(200).send(cached.html);
      return;
    }

    const product = await fetchProductById(productId);
    if (!product) {
      res
        .status(404)
        .type('text/html')
        .send(
          `<!doctype html><html><head><title>Product not found</title><meta name="robots" content="noindex"></head><body><h1>Product not found</h1></body></html>`,
        );
      return;
    }

    const slug = String(product?.slug || '').trim();
    const canonicalPath = slug
      ? `/product/${encodeURIComponent(slug)}`
      : `/products/${encodeURIComponent(productId)}`;

    await sendProductSeoPage(req, res, `id:${productId}`, canonicalPath, product);
  } catch (err) {
    console.error('[seo-ssr] error:', err);
    res
      .status(500)
      .type('text/html')
      .send(
        `<!doctype html><html><head><title>SEO render error</title></head><body><h1>SEO render error</h1></body></html>`,
      );
  }
});

app.get('/', async (req: Request, res: Response) => {
  try {
    const cacheKey = 'home';
    const now = Date.now();
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      res.setHeader('Cache-Control', 'public, max-age=120, stale-while-revalidate=86400');
      return res.type('text/html').send(cached.html);
    }
    const publicBase = getPublicBaseUrl(req);
    const canonicalUrl = `${publicBase}/`;
    const og = `${publicBase}/logo.jpg`;
    const html = buildMarketingPageHtml({
      canonicalUrl,
      title: 'Spacilly — Escrow-protected marketplace',
      description:
        'Shop trending products from verified sellers with buyer protection, secure checkout, and global-friendly delivery.',
      robots: 'index,follow',
      ogType: 'website',
      ogImage: og,
      jsonLd: [
        {
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'Spacilly',
          url: canonicalUrl,
        },
      ],
      bodyInner: `<h1>Spacilly marketplace</h1><p>Browse electronics, fashion, home, sports, beauty, and more with escrow-backed checkout.</p><p><a href="${escapeHtml(`${publicBase}/products`)}">View all products</a></p>`,
    });
    cache.set(cacheKey, { html, expiresAt: now + CACHE_TTL_MS });
    res.setHeader('Cache-Control', 'public, max-age=120, stale-while-revalidate=86400');
    res.type('text/html').send(html);
  } catch (e) {
    console.error('[seo-ssr] home', e);
    res.status(500).send('Error');
  }
});

app.get('/products', async (req: Request, res: Response) => {
  try {
    const cacheKey = 'products';
    const now = Date.now();
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      res.setHeader('Cache-Control', 'public, max-age=120, stale-while-revalidate=86400');
      return res.type('text/html').send(cached.html);
    }
    const publicBase = getPublicBaseUrl(req);
    const canonicalUrl = `${publicBase}/products`;
    const html = buildMarketingPageHtml({
      canonicalUrl,
      title: 'All products | Spacilly',
      description: 'Explore in-stock listings from verified sellers — filter by category, price, and rating.',
      robots: 'index,follow',
      ogType: 'website',
      ogImage: `${publicBase}/logo.jpg`,
      jsonLd: [
        {
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: 'All products',
          url: canonicalUrl,
        },
      ],
      bodyInner: `<h1>All products</h1><p>Discover curated SKUs across every category.</p>`,
    });
    cache.set(cacheKey, { html, expiresAt: now + CACHE_TTL_MS });
    res.setHeader('Cache-Control', 'public, max-age=120, stale-while-revalidate=86400');
    res.type('text/html').send(html);
  } catch (e) {
    console.error('[seo-ssr] products', e);
    res.status(500).send('Error');
  }
});

app.get('/category/:slug', async (req: Request, res: Response) => {
  const slug = String(req.params.slug || '').trim().toLowerCase();
  if (!slug) return res.status(400).send('Bad request');
  try {
    const now = Date.now();
    const cacheKey = `cat:${slug}`;
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      res.setHeader('Cache-Control', 'public, max-age=120, stale-while-revalidate=86400');
      return res.type('text/html').send(cached.html);
    }

    const url = `${API_BASE}/categories/slug/${encodeURIComponent(slug)}`;
    const resp = await axios.get(url, { timeout: 15000 });
    const cat = resp?.data?.category;
    if (!cat) {
      return res
        .status(404)
        .type('text/html')
        .send(
          '<!doctype html><html><head><meta name="robots" content="noindex"><title>Not found</title></head><body>Not found</body></html>',
        );
    }

    const publicBase = getPublicBaseUrl(req);
    const canonicalUrl = `${publicBase}/category/${encodeURIComponent(slug)}`;
    const title = `${cat.name} | Spacilly`;
    const description = cat.description || `Shop ${cat.name} on Spacilly.`;
    const breadcrumb = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${publicBase}/` },
        { '@type': 'ListItem', position: 2, name: 'Products', item: `${publicBase}/products` },
        { '@type': 'ListItem', position: 3, name: cat.name, item: canonicalUrl },
      ],
    };
    const collection = {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: cat.name,
      description,
      url: canonicalUrl,
      numberOfItems: cat.productCount,
    };

    const html = buildMarketingPageHtml({
      canonicalUrl,
      title,
      description,
      robots: 'index,follow',
      ogType: 'website',
      ogImage: `${publicBase}/logo.jpg`,
      jsonLd: [breadcrumb, collection],
      bodyInner: `<h1>${escapeHtml(cat.name)}</h1><p>${escapeHtml(description)}</p><p>${Number(cat.productCount || 0)} products</p><p><a href="${escapeHtml(canonicalUrl)}">Open category in Spacilly</a></p>`,
    });
    cache.set(cacheKey, { html, expiresAt: now + CACHE_TTL_MS });
    res.setHeader('Cache-Control', 'public, max-age=120, stale-while-revalidate=86400');
    res.type('text/html').send(html);
  } catch (e) {
    console.error('[seo-ssr] category', e);
    res.status(500).send('Error');
  }
});

app.get('/search', (req: Request, res: Response) => {
  const publicBase = getPublicBaseUrl(req);
  const canonicalUrl = `${publicBase}/search`;
  const html = buildMarketingPageHtml({
    canonicalUrl,
    title: 'Search | Spacilly',
    description: 'Search Spacilly products. Filtered and low-signal search URLs may be excluded from indexing.',
    robots: 'noindex,follow',
    ogType: 'website',
    jsonLd: [],
    bodyInner: `<h1>Search</h1><p>Use the search field in the Spacilly app to find products.</p>`,
  });
  res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=3600');
  res.type('text/html').send(html);
});

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'seo-ssr', port: SEO_SSR_PORT });
});

app.listen(SEO_SSR_PORT, () => {
  console.log(`✅ SEO SSR server listening on port ${SEO_SSR_PORT}`);
  console.log(`✅ API origin: ${API_ORIGIN}`);
});
