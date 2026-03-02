/**
 * Central product filtering and sorting for Reaglex.
 * Used by SearchResults and any client-side product lists.
 * @param {Array} products - List of product objects
 * @param {Object} filters - { search, minPrice, maxPrice, minRating, categories[], freeShipping, sellers[], sort }
 */
export function filterProducts(products, filters = {}) {
  if (!Array.isArray(products)) return [];
  const q = (filters.search || '').toLowerCase().trim();
  const categories = filters.categories && filters.categories.length ? filters.categories : null;
  const sellers = filters.sellers && filters.sellers.length ? filters.sellers : null;

  const filtered = products.filter((p) => {
    if (q) {
      const name = (p.name || p.title || '').toLowerCase();
      const desc = (p.description || '').toLowerCase();
      const cat = (p.category || '').toLowerCase();
      const store = (p.store || p.seller || '').toLowerCase();
      const brand = (p.brand || '').toLowerCase();
      if (!name.includes(q) && !desc.includes(q) && !cat.includes(q) && !store.includes(q) && !brand.includes(q)) return false;
    }
    if (filters.minPrice != null && (p.price || 0) < filters.minPrice) return false;
    if (filters.maxPrice != null && (p.price || 0) > filters.maxPrice) return false;
    const rating = p.averageRating ?? p.rating ?? 0;
    if (filters.minRating != null && rating < filters.minRating) return false;
    if (categories && categories.length) {
      const pCat = (p.category || '').toLowerCase();
      if (!categories.some((c) => String(c).toLowerCase() === pCat)) return false;
    }
    if (filters.freeShipping && !p.freeShipping) return false;
    if (sellers && sellers.length) {
      const pSeller = (p.seller || p.store || '').toLowerCase();
      if (!sellers.some((s) => String(s).toLowerCase() === pSeller)) return false;
    }
    return true;
  });

  const sort = filters.sort || 'newest';
  const sorted = [...filtered].sort((a, b) => {
    switch (sort) {
      case 'price_asc':
        return (a.price || 0) - (b.price || 0);
      case 'price_desc':
        return (b.price || 0) - (a.price || 0);
      case 'rating':
        return (b.averageRating ?? b.rating ?? 0) - (a.averageRating ?? a.rating ?? 0);
      case 'popular':
        return (b.sales ?? b.views ?? 0) - (a.sales ?? a.views ?? 0);
      case 'free_ship':
        if (a.freeShipping && !b.freeShipping) return -1;
        if (!a.freeShipping && b.freeShipping) return 1;
        return new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0);
      case 'newest':
      default:
        return new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0);
    }
  });

  return sorted;
}

const VIEW_KEY = 'reaglex_search_view_mode';
export function getSavedViewMode() {
  try {
    const v = localStorage.getItem(VIEW_KEY);
    return v === 'list' || v === 'grid' ? v : 'list';
  } catch {
    return 'list';
  }
}
export function setSavedViewMode(mode) {
  try {
    localStorage.setItem(VIEW_KEY, mode);
  } catch {}
}

const RECENT_KEY = 'reaglex_recent_searches';
const MAX_RECENT = 8;
export function getRecentSearches() {
  try {
    const s = localStorage.getItem(RECENT_KEY);
    return s ? JSON.parse(s) : [];
  } catch {
    return [];
  }
}
export function addRecentSearch(q) {
  if (!q?.trim()) return;
  const recent = getRecentSearches().filter((r) => r !== q.trim());
  recent.unshift(q.trim());
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
}
export function removeRecentSearch(q) {
  const recent = getRecentSearches().filter((r) => r !== q);
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
}
export function clearRecentSearches() {
  localStorage.setItem(RECENT_KEY, JSON.stringify([]));
}
