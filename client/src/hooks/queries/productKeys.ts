export type ProductSearchFilters = {
  page: number;
  q: string;
  category: string;
  categories: string[];
  sellers: string[];
  activeSort: string;
  priceRange: { min: number; max: number; label?: string } | null;
  customMinPrice: string;
  customMaxPrice: string;
  minRating: number | null;
  freeShipping: boolean;
};

export const productKeys = {
  all: ['products'] as const,
  search: (filters: ProductSearchFilters) => ['products', 'search', filters] as const,
  detailBySlug: (slug: string) => ['product', 'slug', slug] as const,
  detailById: (id: string) => ['product', 'id', id] as const,
  related: (id: string) => ['product', 'related', id] as const,
};
