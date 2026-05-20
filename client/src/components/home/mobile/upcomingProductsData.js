/** Curated upcoming drops — home section + /upcoming page */
export const UPCOMING_DROPS = [
  {
    id: 'up-iphone-17',
    name: 'iPhone 17 Pro Max',
    description: 'Titanium design · A20 chip · Pro camera',
    image:
      'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=600&q=88',
    launchAt: daysFromNow(2, 14, 22),
    label: 'Limited drop',
    edition: 'Early access',
  },
  {
    id: 'up-ps6',
    name: 'PlayStation 6',
    description: 'Next-gen immersion · Ray-traced worlds',
    image:
      'https://images.unsplash.com/photo-1606144042614-bcd56bc53f32?auto=format&fit=crop&w=600&q=88',
    launchAt: daysFromNow(5, 8, 10),
    label: 'Pre-order',
    edition: 'Founder edition',
  },
  {
    id: 'up-nike-air',
    name: 'Nike Air Max 2026',
    description: 'Reactive foam · Carbon weave upper',
    image:
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=88',
    launchAt: daysFromNow(1, 6, 40),
    label: 'AI pick',
    edition: 'Exclusive colorway',
  },
  {
    id: 'up-watch-ultra',
    name: 'Galaxy Watch Ultra 3',
    description: 'Satellite SOS · 14-day battery',
    image:
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=88',
    launchAt: daysFromNow(3, 2, 15),
    label: 'Coming soon',
    edition: 'Titanium',
  },
  {
    id: 'up-headphones',
    name: 'Studio Pro X',
    description: 'Spatial audio · Adaptive ANC 3.0',
    image:
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=88',
    launchAt: daysFromNow(0, 18, 55),
    label: 'Flash preview',
    edition: 'Midnight',
  },
];

function daysFromNow(d, h, m) {
  return Date.now() + ((d * 24 + h) * 60 + m) * 60 * 1000;
}

export function mapProductToUpcoming(product, index = 0) {
  const id = product?._id || product?.id || `up-map-${index}`;
  const offsets = [2, 4, 1, 6, 3];
  const d = offsets[index % offsets.length];
  return {
    id: `up-${id}`,
    name: product?.title || product?.name || 'Upcoming drop',
    description: product?.shortDescription || 'Launching soon on Reaglex · Notify to get early access.',
    image:
      product?.thumbnail ||
      product?.images?.[0]?.url ||
      product?.images?.[0] ||
      UPCOMING_DROPS[0].image,
    launchAt: daysFromNow(d, (index * 3) % 20, (index * 11) % 50),
    label: product?.aiMeta?.badges?.freshArrival ? 'New drop' : 'Coming soon',
    edition: 'Notify early',
    productRef: product,
  };
}

export function mergeUpcomingList(apiProducts = []) {
  const mapped = apiProducts.slice(0, 3).map(mapProductToUpcoming);
  const ids = new Set(mapped.map((m) => m.name));
  const extras = UPCOMING_DROPS.filter((d) => !ids.has(d.name));
  return [...mapped, ...extras].slice(0, 8);
}

/** Hello carousel single upcoming slide payload */
export function getHelloUpcomingSlide() {
  const hero = UPCOMING_DROPS[0];
  return {
    id: 'hello-upcoming',
    type: 'upcoming',
    title: hero.name,
    subtitle: 'Launching soon · Early access open',
    cta: 'Notify me',
    href: '/upcoming',
    countdownEnd: hero.launchAt,
    image: hero.image,
  };
}
