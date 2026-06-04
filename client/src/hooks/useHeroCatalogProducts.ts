import { useQuery } from '@tanstack/react-query';
import { productAPI } from '../services/api';
import { homeFeedApi } from '../services/homeFeedApi';
import { getProductHeroImage, isLowQualityImageUrl, productHasCatalogImage } from '../lib/productImage';

const MIN_HERO_PRODUCTS = 4;
const DEFAULT_LIMIT = 7;

function normalizeProductList(res: unknown): Record<string, unknown>[] {
  if (Array.isArray(res)) return res as Record<string, unknown>[];
  if (res && typeof res === 'object') {
    const o = res as { products?: unknown[]; data?: unknown[] };
    if (Array.isArray(o.products)) return o.products as Record<string, unknown>[];
    if (Array.isArray(o.data)) return o.data as Record<string, unknown>[];
  }
  return [];
}

function dedupeByImage(products: Record<string, unknown>[]): Record<string, unknown>[] {
  const seen = new Set<string>();
  const out: Record<string, unknown>[] = [];
  for (const p of products) {
    const img = getProductHeroImage(p);
    if (!img || isLowQualityImageUrl(img) || seen.has(img)) continue;
    seen.add(img);
    out.push(p);
  }
  return out;
}

async function fetchHeroCatalog(limit: number): Promise<Record<string, unknown>[]> {
  const sources: Record<string, unknown>[][] = [];

  try {
    const section = await homeFeedApi.getSection('trending', { limit: limit + 4 });
    const list = Array.isArray(section?.products) ? (section.products as Record<string, unknown>[]) : [];
    if (list.length) sources.push(list);
  } catch {
    /* fall through */
  }

  try {
    const section = await homeFeedApi.getSection('foryou', { limit: limit + 4 });
    const list = Array.isArray(section?.products) ? (section.products as Record<string, unknown>[]) : [];
    if (list.length) sources.push(list);
  } catch {
    /* fall through */
  }

  try {
    const res = await productAPI.getProducts({ limit: limit + 8, sort: '-rating' });
    sources.push(normalizeProductList(res));
  } catch {
    /* fall through */
  }

  const merged = dedupeByImage(
    sources.flat().filter(productHasCatalogImage),
  );

  return merged.slice(0, limit);
}

export function useHeroCatalogProducts(limit = DEFAULT_LIMIT) {
  return useQuery({
    queryKey: ['hero-catalog-products', limit],
    queryFn: () => fetchHeroCatalog(limit),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    placeholderData: [],
  });
}

export function heroCatalogReady(products: Record<string, unknown>[] | undefined): boolean {
  return (products?.length ?? 0) >= MIN_HERO_PRODUCTS;
}

export { MIN_HERO_PRODUCTS, DEFAULT_LIMIT };
