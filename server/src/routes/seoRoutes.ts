import { Router, Request, Response } from 'express';
import { Product } from '../models/Product';
import { getClientUrl } from '../config/publicEnv';
import { STOREFRONT_CATEGORIES } from '../constants/storefrontCategories';

const router = Router();

function getRequestOrigin(req: Request): string {
  const proto =
    (req.headers['x-forwarded-proto'] as string | undefined) ||
    (req.protocol === 'https' ? 'https' : 'http');
  const host = (req.headers['x-forwarded-host'] as string | undefined) || req.get('host');
  return `${proto}://${String(host).replace(/:\d+$/, '')}`;
}

function getPublicStorefrontOrigin(req: Request): string {
  const primary = (process.env.SEO_PUBLIC_SITE_URL || '').trim().replace(/\/$/, '');
  if (primary) return primary;
  const client = getClientUrl().replace(/\/$/, '');
  if (client) return client;
  return getRequestOrigin(req);
}

function xmlEscape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const SITEMAP_CACHE_MS = 60 * 60 * 1000;
const PRODUCT_SITEMAP_CHUNK_SIZE = 45000;
type SitemapCacheEntry = { xml: string; expiresAt: number };
const sitemapCache = new Map<string, SitemapCacheEntry>();

/** Future-ready hreflang variants (query-param locale until localized routes ship). */
const HREFLANG_VARIANTS: Array<{ hreflang: string; qs: string }> = [
  { hreflang: 'x-default', qs: '' },
  { hreflang: 'en-US', qs: '' },
  { hreflang: 'fr-FR', qs: '?lang=fr' },
  { hreflang: 'rw', qs: '?lang=rw' },
  { hreflang: 'sw', qs: '?lang=sw' },
];

function alternateLinksXml(baseStore: string, pathOnly: string): string {
  return HREFLANG_VARIANTS.map(({ hreflang, qs }) => {
    const href = `${baseStore}${pathOnly}${qs}`;
    return `    <xhtml:link rel="alternate" hreflang="${xmlEscape(hreflang)}" href="${xmlEscape(href)}"/>`;
  }).join('\n');
}

/** Extra paths for crawler discovery / sitelinks (match real React routes). */
const STATIC_PUBLIC_PATHS: Array<{ path: string; priority?: number; changefreq?: string; hreflang?: boolean }> =
  [
    { path: '/', priority: 1, changefreq: 'daily', hreflang: true },
    { path: '/products', priority: 0.98, changefreq: 'daily', hreflang: true },
    { path: '/login', priority: 0.85, changefreq: 'monthly' },
    { path: '/signup', priority: 0.85, changefreq: 'monthly' },
    { path: '/auth', priority: 0.35, changefreq: 'monthly' },
    { path: '/cart', priority: 0.35, changefreq: 'weekly' },
    { path: '/checkout', priority: 0.45, changefreq: 'weekly' },
    { path: '/account', priority: 0.35, changefreq: 'weekly' },
    { path: '/profile', priority: 0.35, changefreq: 'weekly' },
    { path: '/contact', priority: 0.82, changefreq: 'monthly', hreflang: true },
    { path: '/about', priority: 0.82, changefreq: 'monthly', hreflang: true },
    { path: '/faq', priority: 0.62, changefreq: 'monthly', hreflang: true },
    { path: '/help', priority: 0.45, changefreq: 'monthly' },
    { path: '/buyer-protection', priority: 0.58, changefreq: 'monthly' },
    { path: '/become-seller', priority: 0.64, changefreq: 'monthly' },
    { path: '/terms', priority: 0.28, changefreq: 'yearly' },
    { path: '/privacy', priority: 0.28, changefreq: 'yearly' },
    { path: '/cookies', priority: 0.18, changefreq: 'yearly' },
    { path: '/sitemap', priority: 0.45, changefreq: 'weekly', hreflang: true },
  ];

router.get('/robots.txt', (req: Request, res: Response) => {
  const storefront = getPublicStorefrontOrigin(req);
  const sitemapUrl = `${storefront}/sitemap.xml`;

  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.type('text/plain').send(
    [
      'User-agent: *',
      'Allow: /',
      '# Faceted / noisy search — rely on meta robots on /search; disallow heavy combinations',
      'Disallow: /admin/',
      'Disallow: /seller/',
      'Disallow: /api/',
      'Disallow: /*?*sort=',
      'Disallow: /*?*minPrice=',
      'Disallow: /*?*maxPrice=',
      'Disallow: /*?*freeShipping=',
      'Disallow: /*?*sellers=',
      '',
      'User-agent: Googlebot',
      'Allow: /',
      '',
      `Sitemap: ${sitemapUrl}`,
      '',
    ].join('\n'),
  );
});

function urlEl(
  base: string,
  pathOnly: string,
  opts?: { changefreq?: string; priority?: number; lastmod?: string; hreflang?: boolean },
): string {
  const loc = `${base}${pathOnly}`;
  let inner = `<loc>${xmlEscape(loc)}</loc>`;
  if (opts?.lastmod) inner += `<lastmod>${xmlEscape(opts.lastmod)}</lastmod>`;
  if (opts?.changefreq) inner += `<changefreq>${opts.changefreq}</changefreq>`;
  if (opts?.priority != null) inner += `<priority>${opts.priority}</priority>`;
  if (opts?.hreflang) {
    inner += `\n${alternateLinksXml(base, pathOnly)}`;
  }
  return `<url>\n${inner}\n</url>`;
}

function getCached(key: string): string | null {
  const entry = sitemapCache.get(key);
  if (!entry || entry.expiresAt < Date.now()) return null;
  return entry.xml;
}

function setCached(key: string, xml: string): string {
  sitemapCache.set(key, { xml, expiresAt: Date.now() + SITEMAP_CACHE_MS });
  return xml;
}

function sendXml(res: Response, xml: string) {
  res.setHeader('Cache-Control', 'public, max-age=900, stale-while-revalidate=3600');
  return res.type('application/xml').send(xml);
}

function isoDate(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return new Date().toISOString();
}

function resolveImageUrl(base: string, src: unknown): string | null {
  let raw: unknown = src;
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    raw = obj.url || obj.secure_url || obj.path || obj.src || obj.image || obj.imageUrl;
  }
  if (typeof raw !== 'string') return null;
  const value = raw.trim();
  if (!value || value.startsWith('data:')) return null;
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  if (value.startsWith('//')) return `https:${value}`;
  return `${base}${value.startsWith('/') ? value : `/${value}`}`;
}

function sitemapIndexEl(base: string, pathOnly: string, lastmod?: string): string {
  let inner = `<loc>${xmlEscape(`${base}${pathOnly}`)}</loc>`;
  if (lastmod) inner += `<lastmod>${xmlEscape(lastmod)}</lastmod>`;
  return `<sitemap>${inner}</sitemap>`;
}

async function getLatestProductLastmod(): Promise<string> {
  const latest = await Product.findOne(
    { status: { $in: ['in_stock', 'low_stock'] } },
    { updatedAt: 1, createdAt: 1 },
  )
    .sort({ updatedAt: -1, createdAt: -1 })
    .lean()
    .exec();
  return isoDate((latest as any)?.updatedAt || (latest as any)?.createdAt);
}

router.get('/sitemap.xml', async (req: Request, res: Response) => {
  try {
    const base = getPublicStorefrontOrigin(req);
    const cacheKey = `index:${base}`;
    const cached = getCached(cacheKey);
    if (cached) return sendXml(res, cached);

    const [productCount, latestProductLastmod] = await Promise.all([
      Product.countDocuments({ status: { $in: ['in_stock', 'low_stock'] } }),
      getLatestProductLastmod(),
    ]);
    const productSitemapCount = Math.max(1, Math.ceil(productCount / PRODUCT_SITEMAP_CHUNK_SIZE));

    const sitemapEntries = [
      sitemapIndexEl(base, '/sitemap-pages.xml', new Date().toISOString()),
      ...Array.from({ length: productSitemapCount }, (_, i) =>
        sitemapIndexEl(base, `/sitemap-products-${i + 1}.xml`, latestProductLastmod),
      ),
      sitemapIndexEl(base, '/sitemap-images.xml', latestProductLastmod),
    ];

    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...sitemapEntries,
      '</sitemapindex>',
      '',
    ].join('\n');
    return sendXml(res, setCached(cacheKey, xml));
  } catch (err) {
    console.error('sitemap index error:', err);
    return res
      .status(500)
      .type('application/xml')
      .send('<?xml version="1.0"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></sitemapindex>');
  }
});

router.get('/sitemap-pages.xml', async (req: Request, res: Response) => {
  try {
    const base = getPublicStorefrontOrigin(req);
    const cacheKey = `pages:${base}`;
    const cached = getCached(cacheKey);
    if (cached) return sendXml(res, cached);

    const urls: string[] = [];

    const nowIso = new Date().toISOString();

    for (const row of STATIC_PUBLIC_PATHS) {
      urls.push(
        urlEl(base, row.path, {
          changefreq: row.changefreq,
          priority: row.priority,
          lastmod: nowIso,
          hreflang: row.hreflang,
        }),
      );
    }

    for (const c of STOREFRONT_CATEGORIES) {
      urls.push(
        urlEl(base, `/category/${encodeURIComponent(c.slug)}`, {
          changefreq: 'daily',
          priority: 0.92,
          lastmod: nowIso,
          hreflang: true,
        }),
      );
    }

    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
      ...urls,
      '</urlset>',
      '',
    ].join('\n');

    return sendXml(res, setCached(cacheKey, xml));
  } catch (err) {
    console.error('sitemap pages error:', err);
    return res
      .status(500)
      .type('application/xml')
      .send(
        '<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>',
      );
  }
});

router.get('/sitemap-products-:page.xml', async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(String(req.params.page || '1'), 10) || 1);
    const base = getPublicStorefrontOrigin(req);
    const cacheKey = `products:${base}:${page}`;
    const cached = getCached(cacheKey);
    if (cached) return sendXml(res, cached);

    const skip = (page - 1) * PRODUCT_SITEMAP_CHUNK_SIZE;
    const filter = { status: { $in: ['in_stock', 'low_stock'] } };
    const productRows = await Product.find(filter, { _id: 1, slug: 1, updatedAt: 1, createdAt: 1, status: 1, stock: 1 })
      .sort({ updatedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(PRODUCT_SITEMAP_CHUNK_SIZE)
      .lean()
      .exec();

    const urls: string[] = [];

    for (const p of productRows) {
      const id = p._id?.toString?.() ?? String(p._id);
      const slugStr =
        typeof (p as any).slug === 'string' && String((p as any).slug).trim()
          ? String((p as any).slug).trim()
          : '';
      const pathOnly = slugStr ? `/product/${encodeURIComponent(slugStr)}` : `/products/${id}`;
      const lm = isoDate((p as any).updatedAt || (p as any).createdAt);
      const stock = Number((p as any).stock || 0);
      const priority = stock > 0 ? 0.88 : 0.58;
      urls.push(
        urlEl(base, pathOnly, { changefreq: stock > 0 ? 'weekly' : 'monthly', priority, lastmod: lm, hreflang: true }),
      );
    }

    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
      ...urls,
      '</urlset>',
      '',
    ].join('\n');

    return sendXml(res, setCached(cacheKey, xml));
  } catch (err) {
    console.error('sitemap products error:', err);
    return res
      .status(500)
      .type('application/xml')
      .send(
        '<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>',
      );
  }
});

router.get('/sitemap-images.xml', async (req: Request, res: Response) => {
  try {
    const base = getPublicStorefrontOrigin(req);
    const cacheKey = `images:${base}`;
    const cached = getCached(cacheKey);
    if (cached) return sendXml(res, cached);

    const productRows = await Product.find(
      { status: { $in: ['in_stock', 'low_stock'] }, $or: [{ images: { $exists: true, $ne: [] } }, { image: { $exists: true, $ne: '' } }] },
      { _id: 1, slug: 1, name: 1, images: 1, image: 1, updatedAt: 1, createdAt: 1 },
    )
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(PRODUCT_SITEMAP_CHUNK_SIZE)
      .lean()
      .exec();

    const urls: string[] = [];
    for (const p of productRows) {
      const id = p._id?.toString?.() ?? String(p._id);
      const slugStr =
        typeof (p as any).slug === 'string' && String((p as any).slug).trim()
          ? String((p as any).slug).trim()
          : '';
      const pathOnly = slugStr ? `/product/${encodeURIComponent(slugStr)}` : `/products/${id}`;
      const rawImages = Array.isArray((p as any).images) ? (p as any).images : [];
      const candidates = [...rawImages, (p as any).image].filter(Boolean).slice(0, 8);
      const images = candidates
        .map((img) => resolveImageUrl(base, img))
        .filter((u): u is string => Boolean(u));
      if (!images.length) continue;

      const caption = xmlEscape(String((p as any).name || 'Spacilly product').slice(0, 200));
      const imageXml = images
        .map(
          (img) =>
            `  <image:image><image:loc>${xmlEscape(img)}</image:loc><image:title>${caption}</image:title></image:image>`,
        )
        .join('\n');
      urls.push(`<url>\n<loc>${xmlEscape(`${base}${pathOnly}`)}</loc>\n${imageXml}\n</url>`);
    }

    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
      ...urls,
      '</urlset>',
      '',
    ].join('\n');

    return sendXml(res, setCached(cacheKey, xml));
  } catch (err) {
    console.error('sitemap images error:', err);
    return res
      .status(500)
      .type('application/xml')
      .send(
        '<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"></urlset>',
      );
  }
});

export default router;
