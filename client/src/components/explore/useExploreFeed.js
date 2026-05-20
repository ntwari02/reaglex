import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { homeFeedApi } from '../../services/homeFeedApi';
import { productAPI } from '../../services/api';
import { useRecentlyViewed } from '../../stores/recentlyViewedStore';
import { mergeUpcomingList, UPCOMING_DROPS } from '../home/mobile/upcomingProductsData';

async function loadSection(id, limit = 24) {
  try {
    const section = await homeFeedApi.getSection(id, { limit });
    if (Array.isArray(section?.products) && section.products.length) return section.products;
  } catch {
    /* fallback */
  }
  const sortMap = {
    trending: '-rating',
    bestsellers: '-rating',
    fresh: '-createdAt',
    foryou: '-rating',
  };
  const res = await productAPI.getProducts({ limit, sort: sortMap[id] || '-rating' });
  return Array.isArray(res) ? res : res?.products || res?.data || [];
}

function interleavePools(pools, keys, cap = 80) {
  const out = [];
  const max = Math.max(0, ...keys.map((k) => pools[k]?.length || 0));
  for (let i = 0; i < max && out.length < cap; i += 1) {
    for (const key of keys) {
      const item = pools[key]?.[i];
      if (item) out.push({ ...item, _exploreSource: key });
    }
  }
  return out;
}

function withMeta(product, tab, sub, index) {
  const id = product._id || product.id || `p-${index}`;
  const sold = 1200 + ((id.length * 97) % 8000);
  const views = 800 + ((id.length * 53) % 24000);
  return {
    ...product,
    _exploreMeta: {
      soldLabel: `${(sold / 1000).toFixed(1)}k sold`,
      viewsLabel: `${views >= 1000 ? `${(views / 1000).toFixed(1)}k` : views} views`,
      addedLabel: sub === 'today' ? 'Added today' : sub === 'week' ? 'New this week' : 'Fresh pick',
    },
  };
}

function upcomingAsProducts() {
  return mergeUpcomingList([]).map((d, i) => ({
    id: d.id,
    _id: d.id,
    name: d.name,
    title: d.name,
    description: d.description,
    price: 0,
    thumbnail: d.image,
    images: [d.image],
    _isUpcoming: true,
    launchAt: d.launchAt,
    _exploreSource: 'upcoming',
    _exploreMeta: { addedLabel: 'Launching soon' },
  }));
}

export function useExploreFeed(tab, sub) {
  const recentItems = useRecentlyViewed((s) => s.items);

  const bundleQuery = useQuery({
    queryKey: ['explore', 'bundle'],
    queryFn: async () => {
      const [trending, bestsellers, fresh, foryou] = await Promise.all([
        loadSection('trending', 30),
        loadSection('bestsellers', 30),
        loadSection('fresh', 30),
        loadSection('foryou', 30),
      ]);
      return { trending, bestsellers, fresh, foryou };
    },
    staleTime: 5 * 60 * 1000,
  });

  const products = useMemo(() => {
    const b = bundleQuery.data || {};
    const trending = b.trending || [];
    const bestsellers = b.bestsellers || [];
    const fresh = b.fresh || [];
    const foryou = b.foryou || [];
    const viewed = recentItems.map((r) => ({
      _id: r._id || r.id,
      id: r._id || r.id,
      name: r.title,
      title: r.title,
      price: r.price,
      thumbnail: r.image,
      images: [r.image],
    }));

    let list = [];
    if (tab === 'all') {
      list = interleavePools(
        { trending, bestsellers, foryou, fresh, viewed },
        ['trending', 'bestsellers', 'foryou', 'viewed', 'fresh'],
        60,
      );
    } else if (tab === 'trending') {
      list = [...trending];
      if (sub === 'week') list = [...list, ...bestsellers.slice(0, 8)];
      if (sub === 'rising') list = [...fresh.slice(0, 12), ...list];
      if (sub === 'near') list = [...list, ...foryou.slice(0, 6)];
    } else if (tab === 'bestseller') {
      list = [...bestsellers];
      if (sub === 'bought') list = [...list, ...trending.slice(0, 6)];
      if (sub === 'rated') list = [...list].sort((a, b) => (b.rating || 0) - (a.rating || 0));
      if (sub === 'premium') list = [...list, ...foryou.slice(0, 8)];
    } else if (tab === 'ai') {
      list = [...foryou];
    } else if (tab === 'new') {
      list = [...fresh];
    } else if (tab === 'viewed') {
      list = viewed.length ? [...viewed, ...trending.slice(0, 12)] : [...trending, ...fresh.slice(0, 8)];
    } else if (tab === 'upcoming') {
      list = upcomingAsProducts();
    }

    return list.map((p, i) => withMeta(p, tab, sub, i));
  }, [tab, sub, bundleQuery.data, recentItems]);

  return {
    products,
    isLoading: bundleQuery.isPending && !products.length,
    isError: bundleQuery.isError,
    refetch: bundleQuery.refetch,
  };
}

export function injectExploreAds(items, interval = 20) {
  const out = [];
  items.forEach((item, i) => {
    out.push(item);
    if ((i + 1) % interval === 0 && i < items.length - 1) {
      const slot = Math.floor((i + 1) / interval);
      if (slot % 2 === 1) {
        out.push({ _type: 'promo', id: `promo-${i}` });
      } else if (slot % 3 === 0) {
        out.push({ _type: 'insight', id: `insight-${i}` });
      } else {
        out.push({ _type: 'sponsored', id: `ad-${i}` });
      }
    }
  });
  return out;
}
