import { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { fetchProductSearch } from '../hooks/queries/fetchProductSearch';
import { productKeys } from '../hooks/queries/productKeys';
import { useScrollContainer } from '../spa/useScrollContainer';
import { homeFeedApi } from '../services/homeFeedApi';
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
import { PageSeo } from '../components/seo/PageSeo';
import { computeSearchListingSeo } from '../utils/searchSeoPolicy';
import { buildLocaleAlternates } from '../utils/localeAlternateLinks';
import { getPreferredSiteOrigin } from '../lib/siteOrigin';
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
const CARD = { borderRadius: '12px', boxShadow: 'var(--shadow-sm)' };

// ── Star row ──────────────────────────────────────────────────────────────────
function Stars({ rating, showLabel = true }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} style={{ width: 13, height: 13 }}
          fill={i <= rating ? 'var(--size-selector-selected)' : 'none'}
          stroke={i <= rating ? 'var(--size-selector-selected)' : 'var(--divider-strong)'} />
      ))}
      {showLabel && (
        <span className="text-xs ml-0.5" style={{ color: 'var(--text-breadcrumb)' }}>{rating}+</span>
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
          <Filter className="w-4 h-4 filter-icon-pulse" style={{ color: 'var(--brand-primary)' }} />
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
                      ? 'bg-[var(--brand-primary)] text-[var(--text-on-accent)] shadow-sm'
                      : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--link-color)]'
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
              style={{ background: 'var(--brand-primary)' }}
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
              <button type="button" onClick={() => setCategories([])} className="text-[10px] text-[var(--brand-primary)]">{t('buttons.clear')}</button>
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
                  style={{ accentColor: 'var(--brand-primary)' }}
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
              style={{ accentColor: 'var(--brand-primary)' }}
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
                      ? 'bg-[var(--bg-elevated)] border border-[var(--link-color)]/50 shadow-sm'
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
                      className="w-2 h-2 rounded-full bg-[var(--brand-primary)]"
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
              background: 'linear-gradient(90deg, var(--bg-skeleton) 25%, color-mix(in srgb, var(--bg-skeleton) 85%, var(--divider)) 50%, var(--bg-skeleton) 75%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer-skeleton 1.5s infinite',
            }}
          />
          <div className="p-4 space-y-3">
            <div className="h-3 rounded-full overflow-hidden" style={{ width: '60%' }}>
              <div style={{ height: '100%', background: 'linear-gradient(90deg, var(--bg-skeleton) 25%, color-mix(in srgb, var(--bg-skeleton) 85%, var(--divider)) 50%, var(--bg-skeleton) 75%)', backgroundSize: '200% 100%', animation: 'shimmer-skeleton 1.5s infinite' }} />
            </div>
            <div className="h-3 rounded-full overflow-hidden" style={{ width: '40%' }}>
              <div style={{ height: '100%', background: 'linear-gradient(90deg, var(--bg-skeleton) 25%, color-mix(in srgb, var(--bg-skeleton) 85%, var(--divider)) 50%, var(--bg-skeleton) 75%)', backgroundSize: '200% 100%', animation: 'shimmer-skeleton 1.5s infinite' }} />
            </div>
            <div className="h-5 rounded-full overflow-hidden" style={{ width: '35%' }}>
              <div style={{ height: '100%', background: 'linear-gradient(90deg, var(--bg-skeleton) 25%, color-mix(in srgb, var(--bg-skeleton) 85%, var(--divider)) 50%, var(--bg-skeleton) 75%)', backgroundSize: '200% 100%', animation: 'shimmer-skeleton 1.5s infinite' }} />
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
          <div style={{ width: 160, height: 160, borderRadius: 10, background: 'var(--bg-skeleton)', flexShrink: 0 }} />
          <div className="flex-1 space-y-3 py-2">
            <div className="h-3 rounded-full" style={{ background: 'var(--bg-skeleton)', width: '20%' }} />
            <div className="h-5 rounded-full" style={{ background: 'var(--bg-skeleton)', width: '65%' }} />
            <div className="h-3 rounded-full" style={{ background: 'var(--bg-skeleton)', width: '35%' }} />
            <div className="h-3 rounded-full" style={{ background: 'var(--bg-skeleton)', width: '80%' }} />
            <div className="h-3 rounded-full" style={{ background: 'var(--bg-skeleton)', width: '50%' }} />
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

  // Marketplace AI: feed the buyer's live search intent so the next home
  // load reacts within seconds (e.g. searching "gaming keyboard" pivots
  // the feed to gaming products on the very next request).
  useEffect(() => {
    const query = (q || '').trim();
    if (query.length >= 2) {
      homeFeedApi.track({ type: 'search', query });
    }
  }, [q]);

  const origin = typeof window !== 'undefined' ? getPreferredSiteOrigin() : '';
  const seoPolicy = computeSearchListingSeo({
    origin,
    pathname: location.pathname,
    searchParams: params,
    allProductsTitle: 'All products | Spacilly',
    allProductsDescription:
      'Browse Spacilly products from verified sellers — escrow-protected checkout and buyer protection.',
  });
  const hreflangAlternates = (() => {
    if (!origin || seoPolicy.noIndexFlag) return undefined;
    const canonicalPath = seoPolicy.canonicalUrl.replace(origin, '') || '/products';
    return buildLocaleAlternates(origin, canonicalPath);
  })();
  const listingJsonLd = !seoPolicy.noIndexFlag
    ? [
        {
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: seoPolicy.title.replace(/\s\|\sSpacilly$/, ''),
          url: seoPolicy.canonicalUrl,
        },
      ]
    : undefined;

  const [page, setPage] = useState(() => Math.max(1, parseInt(params.get('page') || '1', 10)));
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
  useScrollContainer('search-product-list', productListRef);

  const searchFilters = useMemo(
    () => ({
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
    }),
    [
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
    ],
  );

  const {
    data: searchData,
    isPending,
    isFetching,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: productKeys.search(searchFilters),
    queryFn: () => fetchProductSearch(searchFilters),
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });

  const products = searchData?.items ?? [];
  const totalPages = searchData?.totalPages ?? 1;
  const total = searchData?.total ?? 0;
  const loading = isPending && !searchData;
  const error = queryError ? 'messages.searchLoadError' : null;

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

  useEffect(() => { setPage(1); }, [q, activeSort, priceRange, minRating, category, categories, freeShipping, sellers]);
  useEffect(() => {
    const onInventoryUpdated = () => {
      void refetch();
    };
    window.addEventListener('inventoryUpdated', onInventoryUpdated);
    return () => window.removeEventListener('inventoryUpdated', onInventoryUpdated);
  }, [refetch]);

  // Page title
  useEffect(() => {
    document.title = q ? `${t('search.resultsFor')} '${q}' — Spacilly` : `${t('home.exploreAllProducts')} — Spacilly`;
    return () => { document.title = 'Spacilly'; };
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
      <PageSeo
        title={seoPolicy.title}
        description={seoPolicy.description}
        canonicalUrl={seoPolicy.canonicalUrl}
        robotsContent={seoPolicy.robotsContent}
        ogType="website"
        jsonLd={listingJsonLd}
        hreflangAlternates={hreflangAlternates}
      />
      <div
        className="flex flex-col w-full relative min-h-0 overflow-hidden h-[calc(100dvh-74px-60px-env(safe-area-inset-bottom,0px))] md:h-auto md:min-h-0 lg:h-[calc(100dvh-158px-env(safe-area-inset-top,0px))]"
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
            className="hidden lg:block flex-shrink-0 w-[240px] self-start sticky top-[158px] max-h-[calc(100dvh-170px-env(safe-area-inset-top,0px))] overflow-y-auto overscroll-contain pr-1"
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
            className="flex-1 min-w-0 flex flex-col overflow-y-auto overflow-x-hidden h-full relative [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full px-3 py-3 sm:px-4 sm:py-4 md:px-6 lg:min-h-0"
          >
            {/* "All Products" header row — sticky within scroll area, page-load animation */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="flex-shrink-0 sticky top-0 z-20 mb-3 sm:mb-5 flex flex-col gap-3 lg:flex-row lg:flex-nowrap lg:items-center lg:justify-between lg:gap-4 px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl bg-[var(--card-bg)] border border-[var(--divider)] transition-colors duration-300 shadow-sm"
              style={{ ...CARD, paddingBottom: 12 }}
            >
                {/* Mobile / tablet: filters + sort + view first so they stay visible */}
                <div className="flex lg:hidden items-center gap-2 min-w-0 w-full">
                  <button
                    type="button"
                    onClick={() => setDrawerOpen((o) => !o)}
                    aria-expanded={drawerOpen}
                    aria-controls="search-mobile-filters"
                    className={`relative flex shrink-0 items-center justify-center rounded-lg border p-2.5 transition touch-manipulation border-[var(--divider-strong)] ${hasFilters ? 'bg-[var(--bg-elevated)] text-[var(--link-color)] border-[var(--link-color)]' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'}`}
                    title={t('search.filters')}
                  >
                    <SlidersHorizontal className="w-[18px] h-[18px] text-[var(--brand-primary)]" aria-hidden />
                    {hasFilters && (
                      <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-[var(--brand-primary)] ring-2 ring-[var(--card-bg)]" aria-hidden />
                    )}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-sm leading-tight text-[var(--text-primary)] truncate">
                      {q ? `${t('search.resultsFor')} "${q}"` : t('home.exploreAllProducts')}
                    </p>
                    {!loading && (
                      <p className="text-[11px] mt-0.5 text-[var(--text-faint)] truncate">
                        {total} {t('product.itemsFound')}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setSortOpen(!sortOpen)}
                        className="flex max-w-[7.5rem] items-center gap-1 rounded-lg border border-[var(--divider-strong)] bg-[var(--card-bg)] px-2 py-2 text-[11px] font-medium text-[var(--text-secondary)] touch-manipulation dark:bg-gray-700 dark:text-gray-300"
                      >
                        <span className="truncate">{sortLabel}</span>
                        <ChevronDown className="w-3.5 h-3.5 shrink-0 text-[var(--text-muted)]" />
                      </button>
                      <AnimatePresence>
                        {sortOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: 6, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 6, scale: 0.96 }}
                            transition={{ duration: 0.14 }}
                            className="absolute right-0 top-full z-40 mt-1 max-h-[min(70dvh,360px)] overflow-y-auto overflow-x-hidden rounded-xl border border-[var(--divider)] bg-[var(--card-bg)] py-1 shadow-lg"
                            style={{ minWidth: 'min(100vw-2rem,200px)', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}
                          >
                            {SORT_OPTIONS.map(o => (
                              <button
                                key={o.value}
                                type="button"
                                onClick={() => { setActiveSort(o.value); setSortOpen(false); }}
                                className={`flex w-full items-center justify-between px-3 py-2.5 text-left text-xs transition hover:bg-[var(--brand-tint)] dark:hover:bg-[var(--brand-tint)] ${activeSort === o.value ? 'font-semibold text-[var(--brand-primary)]' : 'text-[var(--text-secondary)] dark:text-gray-300'}`}
                              >
                                {t(o.labelKey)}
                                {activeSort === o.value && <span className="text-[var(--brand-primary)]">✓</span>}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <div className="flex overflow-hidden rounded-lg border border-[var(--divider-strong)]">
                      {[['grid', LayoutGrid], ['list', List]].map(([m, Icon]) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => { setViewMode(m); setSavedViewMode(m); }}
                          className={`touch-manipulation p-2 transition ${viewMode === m ? 'bg-[var(--brand-primary)]' : 'bg-[var(--card-bg)] dark:bg-gray-700 hover:bg-[var(--bg-secondary)] dark:hover:bg-gray-600'}`}
                          title={m === 'grid' ? t('search.gridView') : t('search.listView')}
                        >
                          <Icon className={`h-4 w-4 ${viewMode === m ? 'text-white' : 'text-[var(--text-muted)] dark:text-gray-300'}`} />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* In-page search bar — full width on mobile; fixed width in desktop toolbar row */}
                <form
                  onSubmit={handlePageSearchSubmit}
                  className="search-page-bar order-2 flex w-full min-w-0 items-center gap-2 rounded-lg border border-[var(--divider-strong)] overflow-hidden bg-[var(--bg-secondary)] dark:bg-gray-700 lg:order-1 lg:w-auto lg:min-w-[220px] lg:max-w-[280px] lg:flex-shrink-0"
                >
                  <Search className="w-4 h-4 flex-shrink-0 ml-3 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder={t('search.placeholder')}
                    className="flex-1 py-2 px-1 text-sm outline-none bg-transparent min-w-0 text-[var(--text-primary)] placeholder-gray-400 dark:placeholder-gray-500"
                  />
                  <button type="submit" className="px-3 py-2 text-xs font-semibold text-[var(--brand-primary)] shrink-0 touch-manipulation">{t('buttons.search')}</button>
                </form>

                {/* Title + count — desktop */}
                <div className="hidden min-w-0 flex-1 lg:block lg:order-2 lg:px-2">
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

                {/* Desktop: sort + view (filter sidebar is always visible on lg+) */}
                <div className="hidden lg:flex items-center gap-2 shrink-0 flex-nowrap justify-end lg:order-3">
                  <div className="relative">
                    <button
                      type="button"
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
                              type="button"
                              onClick={() => { setActiveSort(o.value); setSortOpen(false); }}
                              className={`flex items-center justify-between w-full px-4 py-2.5 text-left text-xs transition hover:bg-[var(--brand-tint)] dark:hover:bg-[var(--brand-tint)] ${activeSort === o.value ? 'text-[var(--brand-primary)] font-semibold' : 'text-[var(--text-secondary)] dark:text-gray-300'}`}
                            >
                              {t(o.labelKey)}
                              {activeSort === o.value && <span className="text-[var(--brand-primary)]">✓</span>}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="flex overflow-hidden rounded-lg border border-[var(--divider-strong)]">
                    {[['grid', LayoutGrid], ['list', List]].map(([m, Icon]) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => { setViewMode(m); setSavedViewMode(m); }}
                        className={`p-2 transition ${viewMode === m ? 'bg-[var(--brand-primary)]' : 'bg-[var(--card-bg)] dark:bg-gray-700 hover:bg-[var(--bg-secondary)] dark:hover:bg-gray-600'}`}
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
                        style={{ background: 'var(--bg-elevated)', color: 'var(--link-color)', border: '1px solid var(--border-visible)', boxShadow: 'var(--shadow-sm)' }}
                      >
                        {tag.label}
                        <button type="button" onClick={tag.remove} className="p-0.5 rounded-full hover:bg-[var(--brand-tint-strong)] transition" aria-label={t('buttons.remove')}>
                          <X className="w-3 h-3" />
                        </button>
                      </motion.span>
                    ))}
                    <button type="button" onClick={clearAllFilters} className="text-xs font-semibold" style={{ color: 'var(--badge-error-text)' }}>
                      {t('filters.clearAll')}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Mobile filter panel — max-height + scroll (reliable on small screens; avoids height:auto layout bugs) */}
              <div
                className={`mb-3 overflow-hidden rounded-xl border border-[var(--divider)] bg-[var(--card-bg)] transition-[max-height,opacity] duration-200 ease-out lg:hidden ${drawerOpen ? 'max-h-[min(72dvh,560px)] opacity-100' : 'max-h-0 opacity-0 pointer-events-none border-transparent'}`}
                style={drawerOpen ? CARD : undefined}
                id="search-mobile-filters"
              >
                <div className="flex max-h-[min(72dvh,560px)] flex-col overflow-hidden">
                  <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
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
                  <div className="shrink-0 border-t border-[var(--divider)] bg-[var(--bg-secondary)] px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] dark:bg-gray-800/80">
                    <button
                      type="button"
                      onClick={() => setDrawerOpen(false)}
                      className="w-full touch-manipulation rounded-lg py-2.5 text-sm font-semibold text-white transition active:opacity-90"
                      style={{ background: 'var(--gradient-brand-cta)', boxShadow: 'var(--shadow-cta)' }}
                    >
                      {t('buttons.done')}
                    </button>
                  </div>
                </div>
              </div>

              {/* Loading */}
              {loading && (viewMode === 'grid' ? <GridSkeletons /> : <ListSkeletons />)}

              {/* Error */}
              {error && !loading && (
                <div className="text-center py-20 rounded-xl bg-[var(--card-bg)] border border-[var(--divider)]" style={CARD}>
                  <p className="text-sm mb-4 text-[var(--text-faint)]">{t(error || 'messages.errorGeneric')}</p>
                  <button
                    onClick={() => refetch()}
                    className="px-5 py-2 rounded-full text-white text-xs font-semibold"
                    style={{ background: 'var(--gradient-brand-cta)' }}
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
                      style={{ background: 'var(--brand-primary)' }}
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
                          style={page === i + 1 ? { background: 'var(--gradient-brand-cta)', boxShadow: 'var(--shadow-cta)' } : {}}
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
                    className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] right-4 z-20 flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg sm:bottom-8 sm:right-8 md:bottom-8"
                    style={{ background: 'var(--gradient-brand-cta)', boxShadow: 'var(--shadow-cta)' }}
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
