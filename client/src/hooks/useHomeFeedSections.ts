import { useQuery } from '@tanstack/react-query';
import { homeFeedApi, type FeedSectionId } from '../services/homeFeedApi';
import { productAPI } from '../services/api';

/** Target product count per home section (8–10). */
export const HOME_PRODUCT_LIMIT = 10;

async function loadSectionProducts(id: FeedSectionId, limit: number) {
  try {
    const section = await homeFeedApi.getSection(id, { limit });
    const list = Array.isArray(section?.products) ? section.products : [];
    if (list.length) return list;
  } catch {
    /* product API fallback */
  }
  const res = await productAPI.getProducts({ limit, sort: '-rating' });
  const list = Array.isArray(res) ? res : res?.products || res?.data || [];
  return list;
}

export function useHomeFeedSection(id: FeedSectionId, limit: number) {
  return useQuery({
    queryKey: ['home-feed', 'section', id, limit],
    queryFn: () => loadSectionProducts(id, limit),
    staleTime: 5 * 60 * 1000,
  });
}

/** Single request for full mobile home when backend supports it. */
export function useHomeFeedBundle(limitPerSection = HOME_PRODUCT_LIMIT) {
  const limit = Math.min(10, Math.max(8, limitPerSection));
  return useQuery({
    queryKey: ['home-feed', 'bundle', limit],
    queryFn: async () => {
      try {
        const feed = await homeFeedApi.getFeed({ limit });
        const map: Partial<Record<FeedSectionId, unknown[]>> = {};
        for (const section of feed.sections || []) {
          if (section?.id && Array.isArray(section.products)) {
            map[section.id] = section.products.slice(0, limit);
          }
        }
        if (Object.keys(map).length) return map;
      } catch {
        /* per-section fallback below */
      }
      const [trending, bestsellers, fresh, foryou] = await Promise.all([
        loadSectionProducts('trending', limit),
        loadSectionProducts('bestsellers', limit),
        loadSectionProducts('fresh', limit),
        loadSectionProducts('foryou', limit),
      ]);
      return {
        trending: trending.slice(0, limit),
        bestsellers: bestsellers.slice(0, limit),
        fresh: fresh.slice(0, limit),
        foryou: foryou.slice(0, limit),
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}
