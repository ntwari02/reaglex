import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { homeFeedApi } from '../../services/homeFeedApi';
import { productAPI } from '../../services/api';

const TAB_SECTION = {
  trending: 'trending',
  bestseller: 'bestsellers',
  ai: 'foryou',
  viewed: 'inspired',
  new: 'fresh',
  upcoming: 'upcoming',
};

async function loadSection(id, limit) {
  try {
    const section = await homeFeedApi.getSection(id, { limit });
    const list = Array.isArray(section?.products) ? section.products : [];
    if (list.length) return list;
  } catch {
    /* fallback */
  }
  const res = await productAPI.getProducts({ limit, sort: '-rating' });
  return Array.isArray(res) ? res : res?.products || res?.data || [];
}

function interleavePools(pools) {
  const out = [];
  const max = Math.max(...pools.map((p) => p.length), 0);
  for (let i = 0; i < max; i += 1) {
    for (const pool of pools) {
      if (pool[i]) out.push({ ...pool[i], _exploreSource: pool[i]._exploreSource });
    }
  }
  return out;
}

function tagPool(products, source) {
  return products.map((p) => ({ ...p, _exploreSource: source }));
}

function applySubFilter(products, tab, sub) {
  if (!products.length) return products;
  const list = [...products];

  if (tab === 'trending') {
    if (sub === 'today') return list.slice(0, Math.ceil(list.length * 0.55));
    if (sub === 'rising') return [...list].sort((a, b) => (b.discount || 0) - (a.discount || 0));
    if (sub === 'near') return [...list].reverse();
    return list;
  }

  if (tab === 'bestseller') {
    if (sub === 'rated') return [...list].sort((a, b) => (b.rating || 0) - (a.rating || 0));
    if (sub === 'bought') return [...list].sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0));
    if (sub === 'premium') return list.filter((p) => (p.price || 0) >= 80).concat(list.filter((p) => (p.price || 0) < 80)).slice(0, list.length);
    return list;
  }

  if (tab === 'ai') {
    if (sub === 'activity') return list.filter((p) => p.aiMeta?.reasons?.length);
    if (sub === 'smart') return [...list].sort((a, b) => (b.aiMeta?.score || 0) - (a.aiMeta?.score || 0));
    if (sub === 'similar') return [...list].reverse();
    return list;
  }

  if (tab === 'viewed') {
    if (sub === 'today') return list.slice(0, Math.ceil(list.length * 0.5));
    if (sub === 'growing') return [...list].sort((a, b) => (b.aiMeta?.badges?.viewersNow || 0) - (a.aiMeta?.badges?.viewersNow || 0));
    if (sub === 'near') return [...list].reverse();
    return list;
  }

  if (tab === 'new') {
    if (sub === 'today') return list.slice(0, Math.ceil(list.length * 0.4));
    if (sub === 'month') return list;
    if (sub === 'fresh') return list.filter((p) => p.aiMeta?.badges?.freshArrival).concat(list).slice(0, list.length);
    return list;
  }

  if (tab === 'upcoming') {
    if (sub === 'preorder') return list.filter((_, i) => i % 2 === 0);
    if (sub === 'limited') return list.filter((p) => (p.price || 0) >= 60);
    if (sub === 'week') return list.slice(0, Math.ceil(list.length * 0.65));
    return list;
  }

  return list;
}

async function fetchExploreProducts(tab, sub) {
  const limit = tab === 'all' ? 36 : 64;

  if (tab === 'all') {
    const [trending, bestsellers, foryou, inspired, fresh] = await Promise.all([
      loadSection('trending', 28).then((p) => tagPool(p, 'trending')),
      loadSection('bestsellers', 28).then((p) => tagPool(p, 'bestseller')),
      loadSection('foryou', 28).then((p) => tagPool(p, 'ai')),
      loadSection('inspired', 28).then((p) => tagPool(p, 'viewed')),
      loadSection('fresh', 28).then((p) => tagPool(p, 'new')),
    ]);
    return interleavePools([trending, bestsellers, foryou, inspired, fresh]);
  }

  const sectionId = TAB_SECTION[tab] || 'trending';
  let products = await loadSection(sectionId, limit);
  if (tab === 'viewed' && products.length < 8) {
    const near = await loadSection('near_you', limit);
    if (near.length) products = near;
  }
  return applySubFilter(products, tab, sub);
}

export function injectExploreAds(products, interval = 20) {
  const out = [];
  let count = 0;
  for (let i = 0; i < products.length; i += 1) {
    out.push(products[i]);
    count += 1;
    if (count >= interval && i < products.length - 1) {
      out.push({
        _id: `sponsored-${i}`,
        _feedInsert: 'sponsored',
        title: 'Curated for you',
        subtitle: 'Sponsored · Premium partner',
      });
      count = 0;
    }
  }
  return out;
}

export function useExploreFeed(tab, sub) {
  const query = useQuery({
    queryKey: ['explore-feed', tab, sub],
    queryFn: () => fetchExploreProducts(tab, sub),
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  });

  const products = useMemo(() => query.data ?? [], [query.data]);

  return {
    products,
    isLoading: query.isPending && !query.data,
    isFetching: query.isFetching,
    refetch: query.refetch,
  };
}
