import { useQuery } from '@tanstack/react-query';
import { homeFeedApi, type FeedSectionId } from '../services/homeFeedApi';
import { productAPI } from '../services/api';

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
export function useHomeFeedBundle(limitPerSection = 10) {
  return useQuery({
    queryKey: ['home-feed', 'bundle', limitPerSection],
    queryFn: async () => {
      try {
        const feed = await homeFeedApi.getFeed({ limit: limitPerSection });
        const map: Partial<Record<FeedSectionId, unknown[]>> = {};
        for (const section of feed.sections || []) {
          if (section?.id && Array.isArray(section.products)) {
            map[section.id] = section.products;
          }
        }
        if (Object.keys(map).length) return map;
      } catch {
        /* per-section fallback below */
      }
      const [trending, bestsellers, fresh, foryou] = await Promise.all([
        loadSectionProducts('trending', limitPerSection),
        loadSectionProducts('bestsellers', limitPerSection),
        loadSectionProducts('fresh', Math.min(8, limitPerSection)),
        loadSectionProducts('foryou', 7),
      ]);
      return {
        trending,
        bestsellers,
        fresh,
        foryou,
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}
