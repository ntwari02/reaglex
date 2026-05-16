import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { BuyerHeroCarouselConfig, IHeroCarouselSlide } from '../models/BuyerHeroCarouselConfig';

export const DEFAULT_HERO_CAROUSEL_SLIDES: IHeroCarouselSlide[] = [
  {
    eyebrow: 'AI shopping',
    line1: 'Visual search',
    line2: 'Find it instantly',
    detail: 'Point your camera at any product and discover matches in seconds.',
    cta: 'Try camera search',
    href: '/search',
    imageUrl:
      'https://images.unsplash.com/photo-1556906781-9a412961d289?auto=format&fit=crop&w=1400&q=88',
    imgPosition: '70% center',
    enabled: true,
    sortOrder: 0,
  },
  {
    eyebrow: 'Summer sale',
    line1: 'Up to 40% OFF',
    line2: 'Selected styles',
    detail: 'Premium fashion, footwear, and accessories from verified sellers.',
    cta: 'Shop deals',
    href: '/search?sort=discount',
    imageUrl:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=1400&q=88',
    imgPosition: '92% center',
    enabled: true,
    sortOrder: 1,
  },
  {
    eyebrow: 'New drop',
    line1: 'Street edit',
    line2: 'Built to move',
    detail: 'Layered textures and confident silhouettes for everyday wear.',
    cta: 'Explore fashion',
    href: '/category/clothing',
    imageUrl:
      'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?auto=format&fit=crop&w=1400&q=88',
    imgPosition: '80% center',
    enabled: true,
    sortOrder: 2,
  },
  {
    eyebrow: 'Tech essentials',
    line1: 'Sound & signal',
    line2: 'Refined daily',
    detail: 'Curated audio, wearables, and electronics from top sellers.',
    cta: 'Shop tech',
    href: '/category/electronics',
    imageUrl:
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1400&q=88',
    imgPosition: '75% center',
    enabled: true,
    sortOrder: 3,
  },
];

function isSlideScheduled(slide: IHeroCarouselSlide, now = new Date()): boolean {
  if (slide.scheduledFrom && now < new Date(slide.scheduledFrom)) return false;
  if (slide.scheduledTo && now > new Date(slide.scheduledTo)) return false;
  return true;
}

function normalizeSlides(input: unknown): IHeroCarouselSlide[] {
  if (!Array.isArray(input)) return [];
  return input.map((s: any, i: number) => ({
    eyebrow: String(s.eyebrow || '').slice(0, 80),
    line1: String(s.line1 || 'Featured').slice(0, 120),
    line2: String(s.line2 || '').slice(0, 120),
    detail: String(s.detail || '').slice(0, 280),
    cta: String(s.cta || 'Shop now').slice(0, 48),
    href: String(s.href || '/').slice(0, 500),
    imageUrl: String(s.imageUrl || '').slice(0, 2000),
    videoUrl: s.videoUrl ? String(s.videoUrl).slice(0, 2000) : '',
    imgPosition: String(s.imgPosition || 'center center').slice(0, 80),
    enabled: s.enabled !== false,
    sortOrder: typeof s.sortOrder === 'number' ? s.sortOrder : i,
    scheduledFrom: s.scheduledFrom ? new Date(s.scheduledFrom) : null,
    scheduledTo: s.scheduledTo ? new Date(s.scheduledTo) : null,
  }));
}

function pickActiveSlides(slides: IHeroCarouselSlide[]): IHeroCarouselSlide[] {
  const now = new Date();
  const active = slides
    .filter((s) => s.enabled && s.imageUrl && isSlideScheduled(s, now))
    .sort((a, b) => a.sortOrder - b.sortOrder);
  return active.length > 0 ? active : DEFAULT_HERO_CAROUSEL_SLIDES;
}

/** GET /api/public/hero-carousel */
export async function getPublicHeroCarousel(_req: unknown, res: Response) {
  try {
    const doc = await BuyerHeroCarouselConfig.findById('default').lean();
    const raw = (doc?.slides as IHeroCarouselSlide[]) || [];
    const slides = pickActiveSlides(raw);
    return res.json({ slides });
  } catch (e: any) {
    console.error('getPublicHeroCarousel:', e);
    return res.json({ slides: DEFAULT_HERO_CAROUSEL_SLIDES });
  }
}

/** GET /api/admin/site/hero-carousel */
export async function getAdminHeroCarousel(req: AuthenticatedRequest, res: Response) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin only' });
  }
  try {
    const doc = await BuyerHeroCarouselConfig.findById('default').lean();
    const slides =
      doc?.slides?.length && Array.isArray(doc.slides) ? doc.slides : DEFAULT_HERO_CAROUSEL_SLIDES;
    return res.json({ slides });
  } catch (e: any) {
    return res.status(500).json({ message: e?.message || 'Failed to load' });
  }
}

/** PUT /api/admin/site/hero-carousel */
export async function putAdminHeroCarousel(req: AuthenticatedRequest, res: Response) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin only' });
  }
  try {
    const body = req.body as { slides?: unknown };
    const slides = normalizeSlides(body.slides);
    if (slides.length > 12) {
      return res.status(400).json({ message: 'Maximum 12 slides' });
    }
    if (slides.some((s) => !s.imageUrl)) {
      return res.status(400).json({ message: 'Each slide requires an image URL' });
    }
    await BuyerHeroCarouselConfig.findByIdAndUpdate(
      'default',
      { $set: { slides } },
      { upsert: true, new: true },
    );
    return res.json({ ok: true, slides });
  } catch (e: any) {
    return res.status(500).json({ message: e?.message || 'Failed to save' });
  }
}
