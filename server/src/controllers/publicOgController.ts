import { Request, Response } from 'express';
import axios from 'axios';
import { Product } from '../models/Product';
import { getClientUrl, getServerUrl } from '../config/publicEnv';

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function truncate(s: string, max: number): string {
  const t = String(s || '').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

async function loadImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const resp = await axios.get<ArrayBuffer>(url, {
      responseType: 'arraybuffer',
      timeout: 12000,
      maxContentLength: 5 * 1024 * 1024,
    });
    return Buffer.from(resp.data);
  } catch {
    return null;
  }
}

/**
 * Dynamic Open Graph PNG for products (Twitter / Slack / Discord / LinkedIn friendly).
 * Uses `sharp` when installed; otherwise 302 redirects to normalized product hero image + og meta fallbacks elsewhere.
 */
export async function ogProductCard(req: Request, res: Response) {
  const slugParam = req.params.slug;
  const slug = String(slugParam || '').replace(/\.(?:png|jpg|webp)$/i, '').trim().toLowerCase();
  if (!slug) {
    return res.status(400).end();
  }

  const storefront = (getClientUrl() || '').replace(/\/$/, '') || `${req.protocol}://${req.get('host')}`;
  const serverMedia = getServerUrl().replace(/\/$/, '');

  const product = await Product.findOne({ slug })
    .select('name seoTitle listingCurrency slug price images image')
    .lean();

  let redirectFallback = `${storefront}/logo.jpg`;
  if (!product || !(product as any).slug) {
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.redirect(302, redirectFallback);
  }

  const title = truncate(String((product as any).seoTitle || (product as any).name || 'Product'), 72);
  const price = Number((product as any).price || 0);
  const cur = String((product as any).listingCurrency || 'USD');
  const priceLine = `${cur} ${price.toFixed(2)}`;

  let primary = '';
  const imgs = (product as any).images as string[] | undefined;
  if (Array.isArray(imgs) && imgs[0]) primary = imgs[0];
  else if (typeof (product as any).image === 'string') primary = (product as any).image;

  let imageAbs = '';
  if (primary) {
    imageAbs =
      primary.startsWith('http://') || primary.startsWith('https://')
        ? primary
        : `${serverMedia}${primary.startsWith('/') ? primary : `/${primary}`}`;
  }

  // `sharp` is an optional native dep — load via runtime require so the
  // server still builds (and starts) on hosts where the binary isn't available.
  // The route then falls back to a 302 redirect to the product hero image.
  type SharpFactory = (
    input?: Buffer | { create: { width: number; height: number; channels: 4; background: { r: number; g: number; b: number; alpha: number } } },
  ) => {
    resize: (...args: unknown[]) => any;
    composite: (layers: any[]) => any;
    png: (opts?: any) => any;
    toBuffer: () => Promise<Buffer>;
  };
  let sharpFn: SharpFactory | null = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const req: NodeRequire = eval('require');
    const mod = req('sharp');
    sharpFn = (mod && (mod.default || mod)) as SharpFactory;
  } catch {
    sharpFn = null;
  }

  if (!sharpFn || !imageAbs) {
    res.setHeader('Cache-Control', 'public, max-age=1800, stale-while-revalidate=86400');
    return res.redirect(302, imageAbs || redirectFallback);
  }

  try {
    const imgBuf = await loadImageBuffer(imageAbs);
    if (!imgBuf) {
      return res.redirect(302, redirectFallback);
    }

    const W = 1200;
    const H = 630;
    const panelW = 520;

    const hero = await sharpFn(imgBuf)
      .resize(W - panelW, H, { fit: 'cover', position: 'center' })
      .toBuffer();

    const titleSvg = `
<svg width="${panelW}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#0f172a"/>
  <text x="36" y="120" fill="#f8fafc" font-size="34" font-family="system-ui,Segoe UI,Roboto,sans-serif" font-weight="700">${escapeXml(title)}</text>
  <text x="36" y="190" fill="#38bdf8" font-size="28" font-family="system-ui,Segoe UI,Roboto,sans-serif" font-weight="700">${escapeXml(priceLine)}</text>
  <text x="36" y="260" fill="#94a3b8" font-size="20" font-family="system-ui,Segoe UI,Roboto,sans-serif">Spacilly · Escrow-protected marketplace</text>
</svg>`;

    const brandStrip = await sharpFn(Buffer.from(titleSvg)).png().toBuffer();

    const out = await sharpFn({
      create: {
        width: W,
        height: H,
        channels: 4,
        background: { r: 15, g: 23, b: 42, alpha: 1 },
      },
    })
      .composite([
        { input: hero, left: panelW, top: 0 },
        { input: brandStrip, left: 0, top: 0 },
      ])
      .png({ quality: 90 })
      .toBuffer();

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
    return res.status(200).send(out);
  } catch (e) {
    console.error('[og] product card error', e);
    return res.redirect(302, imageAbs || redirectFallback);
  }
}
