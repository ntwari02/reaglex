import { STOREFRONT_CATEGORIES } from '../constants/storefrontCategories';

const THIN_QUERIES = new Set(['a', 'aa', 'b', 'q', 'qq', 'test', 'demo', 'abc', 'asd', 'qw', 'qwerty', 'xxx']);

function slugFromCategoryParam(category: string): string | null {
  const c = String(category || '').trim().toLowerCase();
  if (!c) return null;
  for (const def of STOREFRONT_CATEGORIES) {
    if (def.slug === c) return def.slug;
    if (def.displayName.toLowerCase() === c) return def.slug;
    if (def.matchLabels.some((l) => l.toLowerCase() === c)) return def.slug;
  }
  return null;
}

export type SearchListingSeo = {
  /** Full URL for <link rel="canonical"> */
  canonicalUrl: string;
  /** Pass to PageSeo robotsContent */
  robotsContent: string;
  noIndexFlag: boolean;
  title: string;
  description: string;
};

/**
 * SEO for `/products` and `/search` listing views: avoid indexing thin / duplicate faceted URLs.
 */
export function computeSearchListingSeo(args: {
  origin: string;
  pathname: string;
  searchParams: URLSearchParams;
  /** i18n fallback title for all products */
  allProductsTitle: string;
  allProductsDescription: string;
}): SearchListingSeo {
  const { origin, pathname, searchParams, allProductsTitle, allProductsDescription } = args;
  const q = (searchParams.get('q') || searchParams.get('search') || '').trim();
  const category = (searchParams.get('category') || '').trim();
  const categories = (searchParams.get('categories') || '').trim();
  const sellers = (searchParams.get('sellers') || '').trim();
  const sort = (searchParams.get('sort') || '').trim();
  const pageRaw = (searchParams.get('page') || '').trim();
  const page = pageRaw ? Math.max(1, parseInt(pageRaw, 10) || 1) : 1;
  const minPrice = searchParams.get('minPrice');
  const maxPrice = searchParams.get('maxPrice');
  const minRating = searchParams.get('minRating');
  const freeShipping = searchParams.get('freeShipping');

  const hasFacet =
    !!q ||
    !!category ||
    !!categories ||
    !!sellers ||
    (sort && sort !== 'newest') ||
    page > 1 ||
    minPrice != null ||
    maxPrice != null ||
    minRating != null ||
    freeShipping === 'true';

  const qLow = q.toLowerCase();
  const thinQ = q.length > 0 && (q.length <= 2 || THIN_QUERIES.has(qLow));

  let canonicalPath = '/products';
  let robotsContent = 'index,follow';
  let noIndexFlag = false;

  if (pathname === '/search') {
    noIndexFlag = true;
    robotsContent = 'noindex,follow';
    if (!q || thinQ) {
      canonicalPath = '/products';
    } else {
      canonicalPath = `/search?q=${encodeURIComponent(q)}`;
    }
  } else if (pathname === '/category/all') {
    canonicalPath = page > 1 ? `/category/all?page=${page}` : '/category/all';
    robotsContent = hasFacet && (sort !== 'newest' || q || categories || sellers) ? 'noindex,follow' : 'index,follow';
    noIndexFlag = robotsContent.startsWith('noindex');
  } else if (pathname === '/products') {
    if (!hasFacet) {
      canonicalPath = '/products';
      robotsContent = 'index,follow';
    } else if (category && !q && !categories && !sellers && sort === '' && page <= 1 && !minPrice && !maxPrice && !minRating && freeShipping !== 'true') {
      const slug = slugFromCategoryParam(category);
      canonicalPath = slug ? `/category/${slug}` : `/products?category=${encodeURIComponent(category)}`;
      noIndexFlag = true;
      robotsContent = 'noindex,follow';
    } else {
      noIndexFlag = true;
      robotsContent = thinQ && q ? 'noindex,nofollow' : 'noindex,follow';
      canonicalPath = '/products';
    }
  }

  const canonicalUrl = `${origin}${canonicalPath}`;
  const description =
    q && !thinQ
      ? `Browse products matching “${q.slice(0, 120)}” on Spacilly — verified sellers and secure checkout.`
      : allProductsDescription;
  const title =
    q && !thinQ
      ? `Search: ${q.slice(0, 60)} | Spacilly`
      : category && category !== 'All Categories'
        ? `${category} | Spacilly`
        : allProductsTitle;

  return {
    canonicalUrl,
    robotsContent,
    noIndexFlag,
    title,
    description,
  };
}
