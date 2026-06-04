import { productDisplayName, resolveProductImage } from './productUtils';

export const UPCOMING_DROPS = [
  {
    id: 'drop-aurora-buds',
    title: 'Aurora Pro Buds',
    description: 'Spatial audio · adaptive ANC',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=85',
    launchAt: Date.now() + 2 * 86400000 + 14 * 3600000,
    badge: 'EARLY ACCESS',
  },
  {
    id: 'drop-lumen-watch',
    title: 'Lumen Watch S9',
    description: 'Titanium frame · AI health sync',
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=85',
    launchAt: Date.now() + 4 * 86400000,
    badge: 'LIMITED',
  },
  {
    id: 'drop-nova-pack',
    title: 'Nova Carry Pack',
    description: 'Weather-sealed · modular fit',
    image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&q=85',
    launchAt: Date.now() + 6 * 86400000 + 8 * 3600000,
    badge: 'PREORDER',
  },
  {
    id: 'drop-pulse-sneaker',
    title: 'Pulse Runner X',
    description: 'Reactive foam · night-safe trim',
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=85',
    launchAt: Date.now() + 1 * 86400000 + 6 * 3600000,
    badge: 'COMING SOON',
  },
];

export function formatCountdown(ms) {
  if (!ms || ms <= 0) return '00D : 00H : 00M';
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  return `${String(d).padStart(2, '0')}D : ${String(h).padStart(2, '0')}H : ${String(m).padStart(2, '0')}M`;
}

/** Compact countdown for rail cards (e.g. 2d 14h · 45m 12s) */
export function formatCountdownCompact(ms) {
  if (!ms || ms <= 0) return 'Live soon';
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s}s`;
}

/** HRS : MINS : SECS for featured hero */
export function formatCountdownHMS(ms) {
  if (!ms || ms <= 0) return '00 : 00 : 00';
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, '0')} : ${String(m).padStart(2, '0')} : ${String(s).padStart(2, '0')}`;
}

export function enrichDrop(drop, index = 0) {
  const interested = 24800 - index * 2100;
  return {
    ...drop,
    hypeScore: drop.hypeScore ?? Math.min(99, 88 + index * 2),
    unitsLeft: drop.unitsLeft ?? Math.max(40, 120 - index * 18),
    unitsTotal: drop.unitsTotal ?? 200,
    interestedCount: drop.interestedCount ?? interested,
  };
}

export function mergeUpcomingList(products = []) {
  const fromApi = products.slice(0, 10).map((p, i) => {
    const launchMs = p.launchAt ? new Date(p.launchAt).getTime() : Date.now() + (i + 2) * 86400000;
    return {
      id: p._id || p.id || `api-${i}`,
      title: productDisplayName(p),
      description: p.aiMeta?.topReason || p.description?.slice?.(0, 80) || 'Seller drop · launching soon',
      image: resolveProductImage(p),
      launchAt: launchMs,
      badge: i === 0 ? 'AI PICK' : 'COMING SOON',
      product: p,
    };
  });

  const merged = [...fromApi];
  for (const drop of UPCOMING_DROPS) {
    if (merged.length >= 10) break;
    if (!merged.some((m) => m.title === drop.title)) merged.push(drop);
  }
  return merged.slice(0, 10);
}

export const UPCOMING_HERO_TEASER = {
  id: 'upcoming-hero-teaser',
  variant: 'upcoming',
  eyebrow: 'Next drop',
  line1: 'Upcoming',
  line2: 'Drops',
  detail: 'Be first in line for limited releases',
  cta: 'Notify Me',
  href: '/explore?tab=upcoming',
  image: UPCOMING_DROPS[0].image,
  launchAt: UPCOMING_DROPS[0].launchAt,
};
