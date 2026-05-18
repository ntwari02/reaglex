import { productAPI } from '../../services/api';
import type { ProductSearchFilters } from './productKeys';

export type ProductSearchResult = {
  items: Record<string, unknown>[];
  total: number;
  totalPages: number;
};

export async function fetchProductSearch(
  filters: ProductSearchFilters,
): Promise<ProductSearchResult> {
  const {
    page,
    q,
    category,
    categories,
    sellers,
    activeSort,
    priceRange,
    customMinPrice,
    customMaxPrice,
    minRating,
    freeShipping,
  } = filters;

  const p: Record<string, unknown> = { page, limit: 20 };
  if (q) p.search = q;
  if (category && category !== 'All Categories') p.category = category;
  if (activeSort === 'price_asc') p.sortBy = 'price';
  if (activeSort === 'price_desc') {
    p.sortBy = 'price';
    p.sortOrder = 'desc';
  }
  if (activeSort === 'rating') p.sortBy = 'rating';
  if (activeSort === 'newest' || activeSort === 'free_ship') {
    p.sortBy = 'createdAt';
    p.sortOrder = 'desc';
  }

  const minP =
    priceRange?.min ??
    (customMinPrice !== '' ? Number(customMinPrice) : null);
  const maxP =
    priceRange?.max ??
    (customMaxPrice !== '' ? Number(customMaxPrice) : null);
  if (minP != null) p.minPrice = minP;
  if (maxP != null) p.maxPrice = maxP;
  if (minRating != null) p.minRating = minRating;
  if (freeShipping) p.freeShipping = true;
  if (categories?.length) p.categories = categories.join(',');
  if (sellers?.length) p.sellers = sellers.join(',');

  const data = await productAPI.getProducts(p);
  let items = Array.isArray(data) ? data : data.products || data.items || [];
  if (minP != null) items = items.filter((i) => (i.price || 0) >= minP);
  if (maxP != null) items = items.filter((i) => (i.price || 0) <= maxP);
  if (minRating != null) {
    items = items.filter(
      (i) => (i.averageRating || i.rating || 0) >= minRating,
    );
  }

  return {
    items,
    total: data.pagination?.total ?? items.length,
    totalPages: data.pagination?.totalPages ?? 1,
  };
}
