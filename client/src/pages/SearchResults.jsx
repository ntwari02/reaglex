import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  SlidersHorizontal, Star, ChevronDown, X,
  List, Filter, LayoutGrid, ChevronUp, Search,
} from 'lucide-react';
import BuyerLayout from '../components/buyer/BuyerLayout';
import SearchProductCard from '../components/SearchProductCard';
import ProductListItem from '../components/ProductListItem';
import { productAPI } from '../services/api';
import { getSavedViewMode, setSavedViewMode } from '../utils/filterProducts';
import { useSeo } from '../utils/useSeo';
import { useTranslation } from '../i18n/useTranslation';

const PRICE_RANGES = [
  { labelKey: 'filters.price.under25', min: 0, max: 25 },
  { labelKey: 'filters.price.25to50', min: 25, max: 50 },
  { labelKey: 'filters.price.50to100', min: 50, max: 100 },
  { labelKey: 'filters.price.100to250', min: 100, max: 250 },
  { labelKey: 'filters.price.over250', min: 250, max: 999999 },
];

const RATINGS = [4, 3, 2];

const ALL_CATEGORIES = [
  { value: 'Electronics', key: 'categories.electronics' },
  { value: 'Clothing', key: 'categories.clothing' },
  { value: 'Accessories', key: 'categories.accessories' },
  { value: 'Home & Garden', key: 'categories.homeGarden' },
  { value: 'Sports', key: 'categories.sports' },
  { value: 'Beauty', key: 'categories.beauty' },
  { value: 'Books', key: 'categories.books' },
  { value: 'Toys', key: 'categories.toys' },
  { value: 'Automotive', key: 'categories.automotive' },
  { value: 'Food & Grocery', key: 'categories.foodGrocery' },
];

const SORT_OPTIONS = [
  { value: 'newest', labelKey: 'search.sortNewest' },
  { value: 'discount', labelKey: 'search.sortBestDeals' },
  { value: 'price_asc', labelKey: 'search.sortPriceAsc' },
  { value: 'price_desc', labelKey: 'search.sortPriceDesc' },
  { value: 'rating', labelKey: 'search.sortTopRated' },
  { value: 'popular', labelKey: 'search.sortMostPopular' },
  { value: 'free_ship', labelKey: 'search.sortFreeShippingFirst' },
];

// ── Shared card style ─────────────────────────────────────────────────────────
const CARD = { borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' };

// ── Star row ──────────────────────────────────────────────────────────────────
function Stars({ rating, showLabel = true }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} style={{ width: 13, height: 13 }}
          fill={i <= rating ? '#f59e0b' : 'none'}
          stroke={i <= rating ? '#f59e0b' : '#d1d5db'} />
      ))}
      {showLabel && (
        <span className="text-xs ml-0.5" style={{ color: '#64748b' }}>{rating}+</span>
      )}
    </div>
  );
}

// ── Filter sidebar content ────────────────────────────────────────────────────
function SidebarContent({
  priceRange, setPriceRange, minRating, setMinRating,
  customMinPrice, setCustomMinPrice, customMaxPrice, setCustomMaxPrice, onApplyCustomPrice,
  category, setCategory, categories, setCategories,
  freeShipping, setFreeShipping,
}) {
  const { t } = useTranslation();
  const hasFilters = priceRange || minRating || (category && category !== 'All Categories') || categories?.length > 0 || freeShipping;
  const [shake, setShake] = useState(false);

  const handleClearAll = () => {
    setPriceRange(null);
    setMinRating(null);
    setCustomMinPrice?.('');
    setCustomMaxPrice?.('');
    setCategory?.('All Categories');
    setCategories?.([]);
    setFreeShipping?.(false);
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const toggleCategory = (cat) => {
    setCategories((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]));
  };

  return (
    <motion.div animate={shake ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }} transition={{ duration: 0.4 }}>
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--divider)]">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 filter-icon-pulse" style={{ color: '#f97316' }} />
          <span className="font-bold text-sm text-[var(--text-primary)]">{t('search.filters')}</span>
        </div>
        <AnimatePresence>
          {hasFilters && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClearAll}
              className="text-xs font-semibold text-red-500"
            >
              {t('filters.clearAll')}
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <div className="p-5 space-y-6">
        {/* Price Range pills */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wider mb-3 text-[var(--text-faint)]">{t('filters.priceRange')}</p>
          <div className="space-y-1.5">
            {PRICE_RANGES.map((r) => {
              const label = t(r.labelKey);
              const active = priceRange?.label === label;
              return (
                <motion.button
                  key={r.labelKey}
                  onClick={() => setPriceRange(active ? null : { ...r, label })}
                  className={`relative w-full text-left px-3 py-2 rounded-full text-xs font-medium overflow-hidden transition-colors ${
                    active
                      ? 'bg-[#3b82f6] text-white shadow-sm'
                      : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[#bfdbfe]'
                  }`}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="relative z-10 flex items-center justify-between">
                    {label}
                    {active && (
                      <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400 }}>✓</motion.span>
                    )}
                  </span>
                </motion.button>
              );
            })}
          </div>
          {/* Custom price inputs */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              type="number"
              min={0}
              placeholder={t('filters.minPrice')}
              value={customMinPrice}
              onChange={(e) => setCustomMinPrice(e.target.value)}
              className="w-20 px-2 py-1.5 rounded-lg border border-[var(--divider-strong)] bg-[var(--card-bg)] dark:bg-gray-700 text-[var(--text-primary)] text-xs"
            />
            <input
              type="number"
              min={0}
              placeholder={t('filters.maxPrice')}
              value={customMaxPrice}
              onChange={(e) => setCustomMaxPrice(e.target.value)}
              className="w-20 px-2 py-1.5 rounded-lg border border-[var(--divider-strong)] bg-[var(--card-bg)] dark:bg-gray-700 text-[var(--text-primary)] text-xs"
            />
            <button
              type="button"
              onClick={() => onApplyCustomPrice?.()}
              className="px-2 py-1.5 rounded-lg text-xs font-semibold text-white"
              style={{ background: '#f97316' }}
            >
              {t('buttons.apply')}
            </button>
          </div>
        </div>

        <div className="h-px bg-[var(--bg-tertiary)]" />

        {/* Category checkboxes */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center justify-between text-[var(--text-faint)]">
            {t('search.category')}
            {categories?.length > 0 && (
              <button type="button" onClick={() => setCategories([])} className="text-[10px] text-orange-500">{t('buttons.clear')}</button>
            )}
          </p>
          <div className="space-y-1.5">
            {ALL_CATEGORIES.map((cat) => (
              <label key={cat.value} className="flex items-center gap-2 cursor-pointer rounded-md px-1 py-1 hover:bg-[var(--bg-tertiary)] transition-colors">
                <input
                  type="checkbox"
                  checked={categories?.includes(cat.value) || false}
                  onChange={() => toggleCategory(cat.value)}
                  className="rounded border-gray-500/60"
                  style={{ accentColor: '#3b82f6' }}
                />
                <span className="text-xs text-[var(--text-secondary)] dark:text-gray-300">{t(cat.key)}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="h-px bg-[var(--bg-tertiary)]" />

        {/* Free Shipping */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wider mb-2 text-[var(--text-faint)]">{t('filters.freeShipping')}</p>
          <label className="flex items-center gap-2 cursor-pointer rounded-md px-1 py-1 hover:bg-[var(--bg-tertiary)] transition-colors">
            <input
              type="checkbox"
              checked={freeShipping || false}
              onChange={(e) => setFreeShipping(e.target.checked)}
              className="rounded border-gray-500/60"
              style={{ accentColor: '#3b82f6' }}
            />
            <span className="text-xs text-[var(--text-secondary)] dark:text-gray-300">{t('filters.freeShippingOnly')}</span>
          </label>
        </div>

        <div className="h-px bg-[var(--bg-tertiary)]" />

        {/* Min Rating */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wider mb-3 text-[var(--text-faint)]">{t('filters.minimumRating')}</p>
          <div className="space-y-1.5">
            {RATINGS.map(r => {
              const active = minRating === r;
              return (
                <motion.button
                  key={r}
                  onClick={() => setMinRating(active ? null : r)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors ${
                    active
                      ? 'bg-[#0b1120] border border-[#3b82f6]/80 shadow-sm'
                      : 'border border-transparent hover:bg-[var(--bg-tertiary)]'
                  }`}
                  whileTap={active ? {} : { scale: 0.99 }}
                >
                  <Stars rating={r} />
                  {active && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                      className="w-2 h-2 rounded-full bg-orange-500"
                    />
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Skeleton loaders (shimmer) ─────────────────────────────────────────────────
function GridSkeletons() {
  return (
    <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl bg-[var(--card-bg)]" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <div
            className="rounded-t-2xl"
            style={{
              height: 220,
              background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer-skeleton 1.5s infinite',
            }}
          />
          <div className="p-4 space-y-3">
            <div className="h-3 rounded-full overflow-hidden" style={{ width: '60%' }}>
              <div style={{ height: '100%', background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)', backgroundSize: '200% 100%', animation: 'shimmer-skeleton 1.5s infinite' }} />
            </div>
            <div className="h-3 rounded-full overflow-hidden" style={{ width: '40%' }}>
              <div style={{ height: '100%', background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)', backgroundSize: '200% 100%', animation: 'shimmer-skeleton 1.5s infinite' }} />
            </div>
            <div className="h-5 rounded-full overflow-hidden" style={{ width: '35%' }}>
              <div style={{ height: '100%', background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)', backgroundSize: '200% 100%', animation: 'shimmer-skeleton 1.5s infinite' }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ListSkeletons() {
  return (
    <div className="flex flex-col gap-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="animate-pulse flex gap-4 p-4" style={CARD}>
          <div style={{ width: 160, height: 160, borderRadius: 10, background: '#f1f5f9', flexShrink: 0 }} />
          <div className="flex-1 space-y-3 py-2">
            <div className="h-3 rounded-full" style={{ background: '#f1f5f9', width: '20%' }} />
            <div className="h-5 rounded-full" style={{ background: '#f1f5f9', width: '65%' }} />
            <div className="h-3 rounded-full" style={{ background: '#f1f5f9', width: '35%' }} />
            <div className="h-3 rounded-full" style={{ background: '#f1f5f9', width: '80%' }} />
            <div className="h-3 rounded-full" style={{ background: '#f1f5f9', width: '50%' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Build URL from filters ─────────────────────────────────────────────────────
function buildSearchParams({ q, category, minPrice, maxPrice, minRating, sort, freeShipping, categories, sellers, page }) {
  const sp = new URLSearchParams();
  if (q) sp.set('q', q);
  if (category && category !== 'All Categories') sp.set('category', category);
  if (minPrice != null && minPrice !== '') sp.set('minPrice', String(minPrice));
  if (maxPrice != null && maxPrice !== '') sp.set('maxPrice', String(maxPrice));
  if (minRating != null) sp.set('minRating', String(minRating));
  if (sort && sort !== 'newest') sp.set('sort', sort);
  if (freeShipping) sp.set('freeShipping', 'true');
  if (categories?.length) sp.set('categories', categories.join(','));
  if (sellers?.length) sp.set('sellers', sellers.join(','));
  if (page > 1) sp.set('page', String(page));
  return sp;
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function SearchResults() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const q = params.get('q') || params.get('search') || '';

  const canonicalUrl = `${window.location.origin}${location.pathname}${location.search}`;
  useSeo({
    title: q ? `Search results for "${q}" | REAGLE-X` : 'Search | REAGLE-X',
    description: q
      ? `Browse products matching "${q}" on REAGLE-X.`
      : 'Browse products on REAGLE-X.',
    canonicalUrl,
    noIndex: true, // Avoid duplicate indexing from filter/search URLs
    openGraph: {
      title: q ? `Search results for "${q}" | REAGLE-X` : 'Search | REAGLE-X',
      description: q
        ? `Browse products matching "${q}" on REAGLE-X.`
        : 'Browse products on REAGLE-X.',
    },
    twitter: {
      card: 'summary_large_image',
      title: q ? `Search results for "${q}" | REAGLE-X` : 'Search | REAGLE-X',
      description: q
        ? `Browse products matching "${q}" on REAGLE-X.`
        : 'Browse products on REAGLE-X.',
    },
    jsonLdScriptId: 'reaglex-jsonld-search',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: q ? `Search results for "${q}"` : 'Search',
      url: canonicalUrl,
    },
  });

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(() => Math.max(1, parseInt(params.get('page') || '1', 10)));
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [viewMode, setViewMode] = useState(getSavedViewMode);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeSort, setActiveSort] = useState(() => params.get('sort') || 'newest');
  const [sortOpen, setSortOpen] = useState(false);
  const [priceRange, setPriceRange] = useState(() => {
    const min = params.get('minPrice');
    const max = params.get('maxPrice');
    if (min != null || max != null) return { min: min ? Number(min) : 0, max: max ? Number(max) : 999999, label: `$${min || 0} – $${max || '∞'}` };
    return null;
  });
  const [customMinPrice, setCustomMinPrice] = useState(params.get('minPrice') || '');
  const [customMaxPrice, setCustomMaxPrice] = useState(params.get('maxPrice') || '');
  const [minRating, setMinRating] = useState(() => { const r = params.get('minRating'); return r ? Number(r) : null; });
  const [category, setCategory] = useState(() => params.get('category') || 'All Categories');
  const [categories, setCategories] = useState(() => { const c = params.get('categories'); return c ? c.split(',').filter(Boolean) : []; });
  const [freeShipping, setFreeShipping] = useState(() => params.get('freeShipping') === 'true');
  const [sellers, setSellers] = useState(() => { const s = params.get('sellers'); return s ? s.split(',').filter(Boolean) : []; });
  const [searchInput, setSearchInput] = useState(q);
  const [scrollPast100, setScrollPast100] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const productListRef = useRef(null);
  const initialMount = useRef(true);

  const hasFilters = priceRange || minRating || (category && category !== 'All Categories') || freeShipping || categories.length > 0 || sellers.length > 0;

  // Sync state from URL on popstate (browser back/forward) — read from window.location
  useEffect(() => {
    const onPopState = () => {
      const p = new URLSearchParams(window.location.search);
      const newQ = p.get('q') || p.get('search') || '';
      setSearchInput(newQ);
      setPage(Math.max(1, parseInt(p.get('page') || '1', 10)));
      setActiveSort(p.get('sort') || 'newest');
      setCategory(p.get('category') || 'All Categories');
      setCategories(p.get('categories') ? p.get('categories').split(',').filter(Boolean) : []);
      setFreeShipping(p.get('freeShipping') === 'true');
      setSellers(p.get('sellers') ? p.get('sellers').split(',').filter(Boolean) : []);
      const min = p.get('minPrice');
      const max = p.get('maxPrice');
      if (min != null || max != null) setPriceRange({ min: min ? Number(min) : 0, max: max ? Number(max) : 999999, label: `$${min || 0} – $${max || '∞'}` });
      else setPriceRange(null);
      setCustomMinPrice(p.get('minPrice') || '');
      setCustomMaxPrice(p.get('maxPrice') || '');
      const r = p.get('minRating');
      setMinRating(r ? Number(r) : null);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Sync URL when filters change (skip initial mount so we don't overwrite URL on load)
  useEffect(() => {
    if (initialMount.current) { initialMount.current = false; return; }
    const min = priceRange?.min ?? (customMinPrice !== '' && customMinPrice !== undefined ? Number(customMinPrice) : undefined);
    const max = priceRange?.max ?? (customMaxPrice !== '' && customMaxPrice !== undefined ? Number(customMaxPrice) : undefined);
    const sp = buildSearchParams({
      q: q || undefined,
      category: category !== 'All Categories' ? category : undefined,
      minPrice: min,
      maxPrice: max,
      minRating: minRating ?? undefined,
      sort: activeSort !== 'newest' ? activeSort : undefined,
      freeShipping: freeShipping || undefined,
      categories: categories.length ? categories : undefined,
      sellers: sellers.length ? sellers : undefined,
      page: page > 1 ? page : undefined,
    });
    setParams(Object.fromEntries(sp.entries()));
  }, [q, page, activeSort, priceRange, customMinPrice, customMaxPrice, minRating, category, categories, freeShipping, sellers]);

  useEffect(() => {
    const el = productListRef.current;
    if (!el) return;
    const onScroll = () => {
      setScrollPast100(el.scrollTop > 100);
      setShowBackToTop(el.scrollTop > 300);
    };
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const p = { page, limit: 20 };
      if (q) p.search = q;
      if (category && category !== 'All Categories') p.category = category;
      if (activeSort === 'price_asc') { p.sortBy = 'price'; }
      if (activeSort === 'price_desc') { p.sortBy = 'price'; p.sortOrder = 'desc'; }
      if (activeSort === 'rating') p.sortBy = 'rating';
      if (activeSort === 'newest' || activeSort === 'free_ship') { p.sortBy = 'createdAt'; p.sortOrder = 'desc'; }
      const minP = priceRange?.min ?? (customMinPrice !== '' ? Number(customMinPrice) : null);
      const maxP = priceRange?.max ?? (customMaxPrice !== '' ? Number(customMaxPrice) : null);
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
      if (minRating != null) items = items.filter((i) => (i.averageRating || i.rating || 0) >= minRating);

      setProducts(items);
      setTotal(data.pagination?.total ?? items.length);
      setTotalPages(data.pagination?.totalPages ?? 1);
    } catch {
      setError('messages.searchLoadError');
    } finally {
      setLoading(false);
    }
  }, [q, page, activeSort, priceRange, customMinPrice, customMaxPrice, minRating, category, categories, freeShipping, sellers]);

  useEffect(() => { setPage(1); }, [q, activeSort, priceRange, minRating, category, categories, freeShipping, sellers]);
  useEffect(() => { loadProducts(); }, [loadProducts]);

  // Page title
  useEffect(() => {
    document.title = q ? `${t('search.resultsFor')} '${q}' — Reaglex` : `${t('home.exploreAllProducts')} — Reaglex`;
    return () => { document.title = 'Reaglex'; };
  }, [q, t]);

  // Keep search input in sync with URL q when navigating to this page with query
  useEffect(() => {
    setSearchInput(q);
  }, [q]);

  const sortLabel = t(SORT_OPTIONS.find((o) => o.value === activeSort)?.labelKey || 'buttons.sort');

  const handlePageSearchSubmit = (e) => {
    e.preventDefault();
    const val = searchInput.trim();
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (val) next.set('q', val);
      else next.delete('q');
      next.delete('page');
      return Object.fromEntries(next.entries());
    });
  };

  const clearFilter = (key) => {
    if (key === 'category') setCategory('All Categories');
    if (key === 'price') { setPriceRange(null); setCustomMinPrice(''); setCustomMaxPrice(''); }
    if (key === 'rating') setMinRating(null);
    if (key === 'freeShipping') setFreeShipping(false);
    if (key === 'categories') setCategories([]);
    if (key === 'sellers') setSellers([]);
  };

  const clearAllFilters = () => {
    setPriceRange(null);
    setCustomMinPrice('');
    setCustomMaxPrice('');
    setMinRating(null);
    setCategory('All Categories');
    setCategories([]);
    setFreeShipping(false);
    setSellers([]);
  };

  const activeFilterTags = [];
  if (category && category !== 'All Categories') activeFilterTags.push({ key: 'category', label: category, remove: () => clearFilter('category') });
  const minP = priceRange?.min ?? (customMinPrice !== '' ? Number(customMinPrice) : null);
  const maxP = priceRange?.max ?? (customMaxPrice !== '' ? Number(customMaxPrice) : null);
  if (minP != null || maxP != null) activeFilterTags.push({ key: 'price', label: `$${minP ?? 0} – $${maxP ?? '∞'}`, remove: () => clearFilter('price') });
  if (minRating != null) activeFilterTags.push({ key: 'rating', label: `${minRating}+ Stars`, remove: () => clearFilter('rating') });
  if (freeShipping) activeFilterTags.push({ key: 'freeShipping', label: 'Free Ship', remove: () => clearFilter('freeShipping') });
  categories.forEach((c) => activeFilterTags.push({ key: `cat-${c}`, label: c, remove: () => setCategories((prev) => prev.filter((x) => x !== c)) }));
  sellers.forEach((s) => activeFilterTags.push({ key: `seller-${s}`, label: s, remove: () => setSellers((prev) => prev.filter((x) => x !== s)) }));

  return (
    <BuyerLayout>
      <div
        className="flex flex-col w-full relative"
        style={{
          height: '100vh',
          overflow: 'hidden',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        {/* Page background */}
        <div className="absolute inset-0 -z-10 bg-[var(--bg-page)] transition-colors duration-300" />

        {/* ════════ CONTENT AREA (sidebar + product list) — no duplicate search bar ════════ */}
        <div
          className="flex flex-row flex-1 min-h-0 w-full"
          style={{ overflow: 'hidden' }}
        >
          {/* ── Filter sidebar (desktop, sticky with shadow on scroll) ── */}
          <aside
            className="hidden lg:block flex-shrink-0 overflow-y-auto self-start"
            style={{ width: 240, height: '100%', position: 'sticky', top: 80 }}
          >
            <motion.div
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="h-full"
              style={{ boxShadow: scrollPast100 ? '0 4px 20px rgba(0,0,0,0.08)' : 'none', transition: 'box-shadow 0.3s ease', borderRadius: 16 }}
            >
            <div className="bg-[var(--card-bg)] rounded-xl transition-colors duration-300" style={CARD}>
              <SidebarContent
                priceRange={priceRange}
                setPriceRange={setPriceRange}
                minRating={minRating}
                setMinRating={setMinRating}
                customMinPrice={customMinPrice}
                setCustomMinPrice={setCustomMinPrice}
                customMaxPrice={customMaxPrice}
                setCustomMaxPrice={setCustomMaxPrice}
                onApplyCustomPrice={() => {
                  const min = customMinPrice !== '' ? Number(customMinPrice) : null;
                  const max = customMaxPrice !== '' ? Number(customMaxPrice) : null;
                  if (min != null || max != null) setPriceRange({ min: min ?? 0, max: max ?? 999999, label: `$${min ?? 0} – $${max ?? '∞'}` });
                }}
                category={category}
                setCategory={setCategory}
                categories={categories}
                setCategories={setCategories}
                freeShipping={freeShipping}
                setFreeShipping={setFreeShipping}
              />
            </div>
            </motion.div>
          </aside>

          {/* ── Product list area (ONLY this scrolls) ── */}
          <div
            ref={productListRef}
            className="flex-1 min-w-0 flex flex-col overflow-y-auto h-full relative [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full"
            style={{
              padding: '16px 24px',
            }}
          >
            {/* "All Products" header row — sticky within scroll area, page-load animation */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="flex-shrink-0 sticky top-0 z-10 mb-5 flex items-center justify-between flex-wrap gap-3 px-4 py-3 rounded-xl bg-[var(--card-bg)] border border-[var(--divider)] transition-colors duration-300"
              style={{ ...CARD, paddingBottom: 12 }}
            >
                {/* In-page search bar */}
                <form onSubmit={handlePageSearchSubmit} className="search-page-bar flex-1 min-w-0 max-w-sm flex items-center gap-2 rounded-lg border border-[var(--divider-strong)] overflow-hidden bg-[var(--bg-secondary)] dark:bg-gray-700">
                  <Search className="w-4 h-4 flex-shrink-0 ml-3 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder={t('search.placeholder')}
                    className="flex-1 py-2 px-1 text-sm outline-none bg-transparent min-w-0 text-[var(--text-primary)] placeholder-gray-400 dark:placeholder-gray-500"
                  />
                  <button type="submit" className="px-3 py-2 text-xs font-semibold text-orange-500">{t('buttons.search')}</button>
                </form>
                {/* Title + count */}
                <div>
                  <p className="font-bold text-base text-[var(--text-primary)]">
                    {q ? `${t('search.resultsFor')} "${q}"` : t('home.exploreAllProducts')}
                  </p>
                  {!loading && (
                    <motion.p
                      key={total}
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
                      className="text-xs mt-0.5 text-[var(--text-faint)]"
                    >
                      {total} {t('product.itemsFound')}{q ? ` ${t('search.resultsFor')} '${q}'` : ''}
                    </motion.p>
                  )}
                </div>

                {/* Right: controls */}
                <div className="flex items-center gap-2 w-full flex-wrap justify-end">

                  {/* Mobile filter button */}
                  <button
                    onClick={() => setDrawerOpen(!drawerOpen)}
                    className={`lg:hidden flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition text-[var(--text-secondary)] border-[var(--divider-strong)] ${hasFilters ? 'bg-[#0b1120] text-[#bfdbfe] border-[#3b82f6]' : 'bg-[var(--card-bg)]'}`}
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-orange-500" />
                    {t('search.filters')}{hasFilters ? ' •' : ''}
                  </button>

                  {/* Sort dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setSortOpen(!sortOpen)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border border-[var(--divider-strong)] text-[var(--text-secondary)] dark:text-gray-300 bg-[var(--card-bg)] dark:bg-gray-700 transition-colors"
                    >
                      {sortLabel}
                      <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                    </button>
                    <AnimatePresence>
                      {sortOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 6, scale: 0.96 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 6, scale: 0.96 }}
                          transition={{ duration: 0.14 }}
                          className="absolute right-0 top-full mt-2 z-30 overflow-hidden rounded-xl py-1 bg-[var(--card-bg)] border border-[var(--divider)]"
                          style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.12)', minWidth: '180px' }}
                        >
                          {SORT_OPTIONS.map(o => (
                            <button
                              key={o.value}
                              onClick={() => { setActiveSort(o.value); setSortOpen(false); }}
                              className={`flex items-center justify-between w-full px-4 py-2.5 text-left text-xs transition hover:bg-orange-50 dark:hover:bg-orange-900/20 ${activeSort === o.value ? 'text-orange-500 font-semibold' : 'text-[var(--text-secondary)] dark:text-gray-300'}`}
                            >
                              {t(o.labelKey)}
                              {activeSort === o.value && <span className="text-orange-500">✓</span>}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* View toggle */}
                  <div className="flex overflow-hidden rounded-lg border border-[var(--divider-strong)]">
                    {[['grid', LayoutGrid], ['list', List]].map(([m, Icon]) => (
                      <button
                        key={m}
                        onClick={() => { setViewMode(m); setSavedViewMode(m); }}
                        className={`p-2 transition ${viewMode === m ? 'bg-orange-500' : 'bg-[var(--card-bg)] dark:bg-gray-700 hover:bg-[var(--bg-secondary)] dark:hover:bg-gray-600'}`}
                        title={m === 'grid' ? t('search.gridView') : t('search.listView')}
                      >
                        <Icon className={`w-4 h-4 ${viewMode === m ? 'text-white' : 'text-[var(--text-muted)] dark:text-gray-300'}`} />
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>

              {/* Active filters bar — slide down when any filter is active */}
              <AnimatePresence>
                {activeFilterTags.length > 0 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex-shrink-0 flex flex-wrap items-center gap-2 mb-4"
                  >
                    {activeFilterTags.map((tag) => (
                      <motion.span
                        key={tag.key}
                        layout
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                        style={{ background: '#020617', color: '#bfdbfe', border: '1px solid rgba(59,130,246,0.55)', boxShadow: '0 0 0 1px rgba(15,23,42,0.9)' }}
                      >
                        {tag.label}
                        <button type="button" onClick={tag.remove} className="p-0.5 rounded-full hover:bg-orange-200 transition" aria-label={t('buttons.remove')}>
                          <X className="w-3 h-3" />
                        </button>
                      </motion.span>
                    ))}
                    <button type="button" onClick={clearAllFilters} className="text-xs font-semibold" style={{ color: '#ef4444' }}>
                      {t('filters.clearAll')}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Mobile filter drawer */}
              <AnimatePresence>
                {drawerOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22 }}
                    className="overflow-hidden mb-4 lg:hidden rounded-xl bg-[var(--card-bg)] border border-[var(--divider)]"
                    style={CARD}
                  >
                    <SidebarContent
                      priceRange={priceRange}
                      setPriceRange={setPriceRange}
                      minRating={minRating}
                      setMinRating={setMinRating}
                      customMinPrice={customMinPrice}
                      setCustomMinPrice={setCustomMinPrice}
                      customMaxPrice={customMaxPrice}
                      setCustomMaxPrice={setCustomMaxPrice}
                      onApplyCustomPrice={() => {
                        const min = customMinPrice !== '' ? Number(customMinPrice) : null;
                        const max = customMaxPrice !== '' ? Number(customMaxPrice) : null;
                        if (min != null || max != null) setPriceRange({ min: min ?? 0, max: max ?? 999999, label: `$${min ?? 0} – $${max ?? '∞'}` });
                      }}
                      category={category}
                      setCategory={setCategory}
                      categories={categories}
                      setCategories={setCategories}
                      freeShipping={freeShipping}
                      setFreeShipping={setFreeShipping}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Loading */}
              {loading && (viewMode === 'grid' ? <GridSkeletons /> : <ListSkeletons />)}

              {/* Error */}
              {error && !loading && (
                <div className="text-center py-20 rounded-xl bg-[var(--card-bg)] border border-[var(--divider)]" style={CARD}>
                  <p className="text-sm mb-4 text-[var(--text-faint)]">{t(error || 'messages.errorGeneric')}</p>
                  <button
                    onClick={loadProducts}
                    className="px-5 py-2 rounded-full text-white text-xs font-semibold"
                    style={{ background: 'linear-gradient(135deg,#ff8c42,#ff5f00)' }}
                  >
                    {t('buttons.retry')}
                  </button>
                </div>
              )}

              {/* Empty state — magnifying glass swing + bounce-in CTA */}
              {!loading && !error && products.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
                  className="text-center py-24 rounded-2xl bg-[var(--card-bg)] border border-[var(--divider)]"
                  style={CARD}
                >
                  <motion.div
                    animate={{ rotate: [0, -8, 8, -5, 0] }}
                    transition={{ duration: 1.2, repeat: 2, repeatDelay: 0.5 }}
                    className="text-6xl mb-4"
                  >
                    🔍
                  </motion.div>
                  <h3 className="font-bold text-lg mb-2 text-[var(--text-primary)]">
                    {t('messages.noResults')}
                  </h3>
                  <p className="text-sm mb-6 text-[var(--text-muted)]">
                    {t('filters.tryAdjusting')}
                  </p>
                  {hasFilters && (
                    <motion.button
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                      onClick={clearAllFilters}
                      className="px-6 py-3 rounded-xl text-white text-sm font-semibold"
                      style={{ background: '#f97316' }}
                    >
                      {t('search.clearFilters')}
                    </motion.button>
                  )}
                </motion.div>
              )}

              {/* Products */}
              {!loading && !error && products.length > 0 && (
                <>
                  {viewMode === 'grid' ? (
                    <motion.div
                      key="grid"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                      className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                    >
                      {products.map((p, i) => (
                        <SearchProductCard key={p._id || p.id || i} product={p} index={i} />
                      ))}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="list"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                      className="flex flex-col gap-4"
                    >
                      {products.map((p, i) => (
                        <ProductListItem key={p._id || p.id || i} product={p} index={i} />
                      ))}
                    </motion.div>
                  )}

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-2 mt-8 flex-wrap">
                      <button
                        disabled={page === 1}
                        onClick={() => setPage(p => p - 1)}
                        className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-40 border border-[var(--divider-strong)] bg-[var(--card-bg)] text-[var(--text-secondary)] dark:text-gray-300 hover:bg-[var(--bg-secondary)] dark:hover:bg-gray-700 transition"
                      >
                        ← {t('buttons.back')}
                      </button>
                      {[...Array(Math.min(totalPages, 7))].map((_, i) => (
                        <button
                          key={i + 1}
                          onClick={() => setPage(i + 1)}
                          className={`w-9 h-9 rounded-lg text-sm font-semibold transition ${
                            page === i + 1
                              ? 'text-white'
                              : 'bg-[var(--card-bg)] text-[var(--text-secondary)] dark:text-gray-300 border border-[var(--divider-strong)] hover:bg-[var(--bg-secondary)] dark:hover:bg-gray-700'
                          }`}
                          style={page === i + 1 ? { background: 'linear-gradient(135deg,#ff8c42,#ff5f00)', boxShadow: '0 4px 14px rgba(255,140,66,0.35)' } : {}}
                        >
                          {i + 1}
                        </button>
                      ))}
                      <button
                        disabled={page === totalPages}
                        onClick={() => setPage(p => p + 1)}
                        className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-40 border border-[var(--divider-strong)] bg-[var(--card-bg)] text-[var(--text-secondary)] dark:text-gray-300 hover:bg-[var(--bg-secondary)] dark:hover:bg-gray-700 transition"
                      >
                        {t('buttons.next')} →
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* Back to Top — appears after 300px scroll */}
              <AnimatePresence>
                {showBackToTop && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    whileHover={{ scale: 1.1 }}
                    onClick={() => productListRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="fixed bottom-8 right-8 z-20 w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg"
                    style={{ background: '#f97316', boxShadow: '0 4px 20px rgba(249,115,22,0.4)' }}
                    aria-label={t('search.backToTop')}
                  >
                    <ChevronUp className="w-6 h-6" />
                  </motion.button>
                )}
              </AnimatePresence>
          </div>
        </div>
      </div>
    </BuyerLayout>
  );
}
