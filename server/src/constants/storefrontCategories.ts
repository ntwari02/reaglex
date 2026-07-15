/**
 * Canonical storefront category taxonomy (slug → labels used in Product.category + SEO).
 * Keep in sync with client `src/constants/storefrontCategories.ts`.
 */
export type StorefrontCategoryDef = {
  slug: string;
  /** Primary display name for metadata & H1 */
  displayName: string;
  /** Mongo `Product.category` values that resolve to this slug */
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
    seoDescription:
      'Books and learning titles — shop with confidence via Spacilly buyer protection.',
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

const slugSet = new Map(STOREFRONT_CATEGORIES.map((c) => [c.slug, c]));
const labelNorm = (s: string) => s.trim().toLowerCase();

/** Slugify free-text category → URL segment (fallback when not in catalog). */
export function slugifyCategoryLabel(input: string): string {
  return String(input || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function getCategoryBySlug(slug: string): StorefrontCategoryDef | undefined {
  return slugSet.get(String(slug || '').trim().toLowerCase());
}

export function resolveCategorySlugFromProductLabel(categoryLabel: string | undefined): string | undefined {
  const raw = String(categoryLabel || '').trim();
  if (!raw) return undefined;
  const low = labelNorm(raw);
  for (const def of STOREFRONT_CATEGORIES) {
    if (def.matchLabels.some((l) => labelNorm(l) === low)) return def.slug;
  }
  return slugifyCategoryLabel(raw);
}

/** Mongo filter clause for storefront category slug */
export function buildCategorySlugFilter(slugParam: string): Record<string, unknown> | null {
  const slug = String(slugParam || '').trim().toLowerCase();
  if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return null;
  const def = getCategoryBySlug(slug);
  if (def) {
    return {
      $or: [{ categorySlug: slug }, { category: { $in: def.matchLabels } }],
    };
  }
  return { categorySlug: slug };
}
