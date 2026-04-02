import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { BuyerHomePromoConfig, IHomePromoBanner } from '../models/BuyerHomePromoConfig';

export const DEFAULT_HOME_PROMO_BANNERS: IHomePromoBanner[] = [
  {
    title: 'Mega Sale — Up to 70% Off',
    sub: 'Biggest deals of the season. Limited time only.',
    cta: 'Shop Now',
    href: '/search?sort=discount',
    bg: 'linear-gradient(135deg,#ff8c42 0%,#ff5f00 100%)',
    emoji: '🔥',
    enabled: true,
    sortOrder: 0,
  },
  {
    title: 'Free Shipping on Orders $30+',
    sub: 'Shop from hundreds of verified sellers worldwide.',
    cta: 'Browse All',
    href: '/search',
    bg: 'linear-gradient(135deg,#6c63ff 0%,#4f46e5 100%)',
    emoji: '🚀',
    enabled: true,
    sortOrder: 1,
  },
  {
    title: 'New Arrivals Every Day',
    sub: 'Fresh products added daily from top sellers.',
    cta: 'See New',
    href: '/search?sort=newest',
    bg: 'linear-gradient(135deg,#059669 0%,#047857 100%)',
    emoji: '✨',
    enabled: true,
    sortOrder: 2,
  },
];

function normalizeBanners(input: unknown): IHomePromoBanner[] {
  if (!Array.isArray(input)) return [];
  return input.map((b: any, i: number) => ({
    title: String(b.title || 'Promo').slice(0, 120),
    sub: String(b.sub || '').slice(0, 240),
    cta: String(b.cta || 'Shop').slice(0, 40),
    href: String(b.href || '/').slice(0, 500),
    bg: String(b.bg || 'linear-gradient(135deg,#6c63ff 0%,#4f46e5 100%)').slice(0, 500),
    emoji: String(b.emoji || '✨').slice(0, 8),
    enabled: b.enabled !== false,
    sortOrder: typeof b.sortOrder === 'number' ? b.sortOrder : i,
  }));
}

/** GET /api/public/home-promo-banners */
export async function getPublicHomePromoBanners(_req: unknown, res: Response) {
  try {
    const doc = await BuyerHomePromoConfig.findById('default').lean();
    const raw = (doc?.banners as IHomePromoBanner[]) || [];
    const active = raw.filter((b) => b.enabled).sort((a, b) => a.sortOrder - b.sortOrder);
    const banners = active.length > 0 ? active : DEFAULT_HOME_PROMO_BANNERS;
    return res.json({ banners });
  } catch (e: any) {
    console.error('getPublicHomePromoBanners:', e);
    return res.json({ banners: DEFAULT_HOME_PROMO_BANNERS });
  }
}

/** GET /api/admin/site/home-promo-banners */
export async function getAdminHomePromoBanners(req: AuthenticatedRequest, res: Response) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin only' });
  }
  try {
    const doc = await BuyerHomePromoConfig.findById('default').lean();
    const banners =
      doc?.banners?.length && Array.isArray(doc.banners) ? doc.banners : DEFAULT_HOME_PROMO_BANNERS;
    return res.json({ banners });
  } catch (e: any) {
    return res.status(500).json({ message: e?.message || 'Failed to load' });
  }
}

/** PUT /api/admin/site/home-promo-banners */
export async function putAdminHomePromoBanners(req: AuthenticatedRequest, res: Response) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin only' });
  }
  try {
    const body = req.body as { banners?: unknown };
    const banners = normalizeBanners(body.banners);
    if (banners.length > 20) {
      return res.status(400).json({ message: 'Maximum 20 banners' });
    }
    await BuyerHomePromoConfig.findByIdAndUpdate(
      'default',
      { $set: { banners } },
      { upsert: true, new: true },
    );
    return res.json({ ok: true, banners });
  } catch (e: any) {
    return res.status(500).json({ message: e?.message || 'Failed to save' });
  }
}
