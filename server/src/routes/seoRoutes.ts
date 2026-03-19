import { Router, Request, Response } from 'express';
import { Product } from '../models/Product';

const router = Router();

function getBaseUrl(req: Request) {
  const proto =
    (req.headers['x-forwarded-proto'] as string | undefined) ||
    (req.protocol === 'https' ? 'https' : 'http');
  const host = (req.headers['x-forwarded-host'] as string | undefined) || req.get('host');
  return `${proto}://${host}`;
}

const SITEMAP_CACHE_MS = 60 * 60 * 1000; // 1 hour
let cachedSitemapXml: string | null = null;
let cachedAt = 0;

router.get('/robots.txt', (req: Request, res: Response) => {
  const baseUrl = getBaseUrl(req);
  const sitemapUrl = `${baseUrl}/sitemap.xml`;

  // Keep auth/admin pages out of search indexing; content indexing focus is on products.
  res.type('text/plain').send(
    [
      'User-agent: *',
      'Allow: /',
      'Disallow: /auth',
      'Disallow: /login',
      'Disallow: /signup',
      'Disallow: /forgot-password',
      'Disallow: /reset-password',
      'Disallow: /verify-email',
      'Disallow: /verify-otp',
      'Disallow: /admin',
      'Disallow: /account',
      `Sitemap: ${sitemapUrl}`,
      '',
    ].join('\n'),
  );
});

router.get('/sitemap.xml', async (req: Request, res: Response) => {
  try {
    if (cachedSitemapXml && Date.now() - cachedAt < SITEMAP_CACHE_MS) {
      res.type('application/xml').send(cachedSitemapXml);
      return;
    }

    const baseUrl = getBaseUrl(req);

    const products = await Product.find(
      { status: { $in: ['in_stock', 'low_stock'] } },
      { _id: 1 },
    )
      .lean()
      .exec();

    const urls = products.map((p: any) => {
      const id = p._id?.toString?.() ?? String(p._id);
      return `<url><loc>${baseUrl}/products/${id}</loc></url>`;
    });

    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      `<url><loc>${baseUrl}/</loc></url>`,
      ...urls,
      '</urlset>',
      '',
    ].join('\n');

    cachedSitemapXml = xml;
    cachedAt = Date.now();

    res.type('application/xml').send(xml);
  } catch (err) {
    console.error('sitemap error:', err);
    res.status(500).type('application/xml').send('<urlset></urlset>');
  }
});

export default router;

