/**
 * Dynamic copy pools — deterministic variation by seed (user + category + day).
 */

export type EmailCategory =
  | 'auth_welcome'
  | 'auth_verify'
  | 'auth_reset'
  | 'auth_login'
  | 'auth_security'
  | 'order'
  | 'payment'
  | 'shipping'
  | 'refund'
  | 'return'
  | 'marketplace'
  | 'message'
  | 'review'
  | 'recommendation'
  | 'cart'
  | 'wishlist'
  | 'subscription'
  | 'billing'
  | 'marketing'
  | 'live'
  | 'general';

function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function pickVariant<T>(seed: string, pool: T[]): T {
  if (!pool.length) throw new Error('copy pool empty');
  return pool[hashSeed(seed) % pool.length];
}

export function timeGreeting(name: string, hour = new Date().getUTCHours()): string {
  const n = name?.trim() || 'there';
  if (hour < 12) return pickVariant(`greet-am-${n}`, [`Good morning, ${n}`, `Morning, ${n}`, `Hi ${n}`]);
  if (hour < 17) return pickVariant(`greet-pm-${n}`, [`Good afternoon, ${n}`, `Hi ${n}`, `Hello ${n}`]);
  return pickVariant(`greet-eve-${n}`, [`Good evening, ${n}`, `Hi ${n}`, `Hey ${n}`]);
}

const CTA_BY_CATEGORY: Partial<Record<EmailCategory, string[]>> = {
  order: ['Review your order', 'Track package', 'Open order details', 'See order status'],
  payment: ['View payment', 'Check receipt', 'Open transaction'],
  shipping: ['Track shipment', 'Follow delivery', 'See tracking'],
  refund: ['View refund status', 'See refund details', 'Open order'],
  return: ['View return case', 'Check return status', 'Open returns'],
  marketplace: ['Open message', 'Reply now', 'View conversation'],
  recommendation: ['Explore picks', 'Shop recommendations', 'See what’s new', 'Browse deals'],
  cart: ['Resume checkout', 'Return to cart', 'Complete purchase', 'Finish your order'],
  subscription: ['Manage plan', 'View subscription', 'Open billing'],
  billing: ['View invoice', 'Open billing', 'Review payment'],
  live: ['Join live now', 'Watch live', 'Open live session'],
  auth_welcome: ['Get started', 'Open your account', 'Start exploring'],
  auth_verify: ['Verify email', 'Confirm address', 'Complete verification'],
  auth_reset: ['Reset password', 'Choose new password', 'Secure account'],
  general: ['Open dashboard', 'View details', 'Continue', 'Take a look'],
};

export function pickCta(category: EmailCategory, seed: string): string {
  const pool = CTA_BY_CATEGORY[category] || CTA_BY_CATEGORY.general!;
  return pickVariant(`${seed}:cta:${category}`, pool);
}

const REC_SUBJECTS = [
  (n: string) => `${n}, fresh picks for you today`,
  (n: string) => `Trending now — curated for ${n}`,
  (n: string) => `Your next favorite find might be here, ${n}`,
  (n: string) => `Handpicked deals waiting for you, ${n}`,
  (n: string) => `A few discoveries we think you’ll love, ${n}`,
  (n: string) => `Inspired by what you’ve been browsing, ${n}`,
];

const REC_INTROS = [
  'Fresh picks inspired by your recent activity.',
  'Trending items shoppers are loving right now.',
  'A few discoveries waiting in your feed.',
  'Your next favorite product might be here.',
  'Handpicked selections tailored to your interests.',
  'We spotted deals that line up with your style.',
  'New arrivals and discounts picked just for you.',
];

export function recommendationSubject(name: string, userId: string): string {
  const fn = pickVariant(`rec-subj:${userId}`, REC_SUBJECTS);
  return fn(name.split(' ')[0] || 'there');
}

export function recommendationIntro(userId: string, mode?: 'deals_only' | 'mixed'): string {
  if (mode === 'deals_only') {
    return pickVariant(`rec-intro-deals:${userId}`, [
      'Limited-time deal drops you can grab today.',
      'Discount highlights picked from your interests.',
      'Today’s best price cuts, selected for you.',
    ]);
  }
  return pickVariant(`rec-intro:${userId}`, REC_INTROS);
}

const CART_SUBJECTS = [
  'Your cart is still waiting — don’t miss out',
  'Items in your cart may sell out soon',
  'Ready when you are — your picks are saved',
  'Still thinking it over? Your cart is here',
  'Complete checkout before prices change',
];

export function cartSubject(userId: string, template?: string): string {
  if (template === 'low_stock') return pickVariant(`cart-subj-stock:${userId}`, ['Low stock alert on cart items', 'Hurry — limited units left in your cart']);
  if (template === 'discount') return pickVariant(`cart-subj-disc:${userId}`, ['A little incentive for your cart', 'Special offer on items you saved']);
  return pickVariant(`cart-subj:${userId}`, CART_SUBJECTS);
}

export function cartIntro(userId: string): string {
  return pickVariant(`cart-intro:${userId}`, [
    'You left a few great items behind — they’re still available, for now.',
    'Your saved items are waiting. Checkout takes just a minute.',
    'Good news: your cart is intact. Pick up where you left off.',
    'These picks won’t stay reserved forever — grab them while you can.',
  ]);
}

const CART_PULSE_SUBJECTS = [
  (n: string) => `More picks for your cart, ${n}`,
  (n: string) => `${n}, complete your cart with these finds`,
  (n: string) => `Trending add-ons for your cart, ${n}`,
  (n: string) => `Shoppers like you also grabbed these, ${n}`,
];

export function cartPulseSubject(name: string, userId: string): string {
  const fn = pickVariant(`cart-pulse-subj:${userId}`, CART_PULSE_SUBJECTS);
  return fn(name.split(' ')[0] || 'there');
}

const BROWSE_ABANDON_SUBJECTS = [
  (n: string) => `Still on your mind, ${n}?`,
  (n: string) => `${n}, your recent views are still available`,
  (n: string) => `Take another look, ${n}`,
  (n: string) => `Picks from your browsing session, ${n}`,
];

export function browseAbandonSubject(name: string, userId: string): string {
  const fn = pickVariant(`browse-subj:${userId}`, BROWSE_ABANDON_SUBJECTS);
  return fn(name.split(' ')[0] || 'there');
}

const WINBACK_SUBJECTS = [
  (n: string) => `We miss you, ${n} — fresh picks inside`,
  (n: string) => `${n}, see what’s new on Reaglex`,
  (n: string) => `Your marketplace feed has updates, ${n}`,
];

export function winbackSubject(name: string, userId: string): string {
  const fn = pickVariant(`winback-subj:${userId}`, WINBACK_SUBJECTS);
  return fn(name.split(' ')[0] || 'there');
}
