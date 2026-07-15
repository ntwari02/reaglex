/**
 * Canonical storefront category taxonomy — keep in sync with `server/src/constants/storefrontCategories.ts`.
 */

export type StorefrontCategoryDef = {
  slug: string;
  displayName: string;
  matchLabels: string[];
  seoDescription: string;
};

export const STOREFRONT_CATEGORIES: StorefrontCategoryDef[] = [
  {
    slug: 'electronics',
    displayName: 'Electronics',
    matchLabels: ['Electronics'],
    seoDescription:
      'Shop electronics on Spacilly — phones, laptops, audio, and tech with buyer protection and escrow-friendly checkout.',
  },
  {
    slug: 'clothing',
    displayName: 'Clothing',
    matchLabels: ['Clothing', 'Fashion'],
    seoDescription:
      'Browse apparel, shoes, and accessories from verified sellers — fast delivery and easy returns where eligible.',
  },
  {
    slug: 'accessories',
    displayName: 'Accessories',
    matchLabels: ['Accessories'],
    seoDescription:
      'Bags, belts, jewelry and everyday accessories — curated listings with transparent seller policies.',
  },
  {
    slug: 'home-garden',
    displayName: 'Home & Garden',
    matchLabels: ['Home & Garden', 'Home', 'Home & Living'],
    seoDescription:
      'Home decor, kitchen, garden essentials and more — escrow-protected marketplace shopping.',
  },
  {
    slug: 'sports',
    displayName: 'Sports',
    matchLabels: ['Sports'],
    seoDescription:
      'Sports gear, training equipment, and outdoor essentials from trusted Spacilly sellers.',
  },
  {
    slug: 'beauty',
    displayName: 'Beauty',
    matchLabels: ['Beauty'],
    seoDescription:
      'Skincare, makeup, and personal care — discover vetted beauty products with secure checkout.',
  },
  {
    slug: 'books',
    displayName: 'Books',
    matchLabels: ['Books'],
    seoDescription: 'Books and learning titles — shop with confidence via Spacilly buyer protection.',
  },
  {
    slug: 'toys',
    displayName: 'Toys',
    matchLabels: ['Toys', 'Gaming'],
    seoDescription:
      'Toys and games for all ages — verified listings and protected payments on Spacilly.',
  },
  {
    slug: 'automotive',
    displayName: 'Automotive',
    matchLabels: ['Automotive'],
    seoDescription:
      'Automotive parts and accessories — shop categories with clear seller policies.',
  },
  {
    slug: 'food-grocery',
    displayName: 'Food & Grocery',
    matchLabels: ['Food & Grocery'],
    seoDescription:
      'Pantry and specialty food items when available — review seller policies before purchase.',
  },
];

const LABEL_TO_SLUG = new Map<string, string>();
for (const c of STOREFRONT_CATEGORIES) {
  for (const lab of c.matchLabels) {
    LABEL_TO_SLUG.set(lab.trim().toLowerCase(), c.slug);
  }
  LABEL_TO_SLUG.set(c.displayName.trim().toLowerCase(), c.slug);
}

/** Path for category hub (indexable). */
export function categoryPathFromSlug(slug: string): string {
  const s = String(slug || '').trim().toLowerCase();
  return `/category/${encodeURIComponent(s)}`;
}

/** Navbar / mega-menu: map known display label → hub path; otherwise fall back to filtered search. */
export function categoryHrefFromDisplayLabel(label: string): string {
  const raw = String(label || '').trim();
  if (!raw || raw.toLowerCase() === 'all categories') return '/products';
  const slug = LABEL_TO_SLUG.get(raw.toLowerCase());
  return slug ? categoryPathFromSlug(slug) : `/search?category=${encodeURIComponent(raw)}`;
}
