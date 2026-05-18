import { useQuery } from '@tanstack/react-query';
import { publicSiteContentAPI } from '../lib/api';
import { categoriesAPI } from '../services/api';

export function useHeroCarousel() {
  return useQuery({
    queryKey: ['site', 'hero-carousel'],
    queryFn: () => publicSiteContentAPI.getHeroCarousel(),
    staleTime: 10 * 60 * 1000,
  });
}

export function useHomePromoBanners() {
  return useQuery({
    queryKey: ['site', 'home-promo-banners'],
    queryFn: () => publicSiteContentAPI.getHomePromoBanners(),
    staleTime: 10 * 60 * 1000,
  });
}

export function useStorefrontCategories() {
  return useQuery({
    queryKey: ['categories', 'list'],
    queryFn: async () => {
      const data = await categoriesAPI.list();
      return Array.isArray(data?.categories) ? data.categories : [];
    },
    staleTime: 60 * 60 * 1000,
  });
}
