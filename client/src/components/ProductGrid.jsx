import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SlidersHorizontal, ChevronDown } from 'lucide-react';
import ProductCard from './ProductCard';
import { productAPI } from '../services/api';
import { useTranslation } from '../i18n/useTranslation';

const SORT_OPTIONS = [
  { value: 'newest', labelKey: 'search.sortNewest' },
  { value: 'price_asc', labelKey: 'search.sortPriceAsc' },
  { value: 'price_desc', labelKey: 'search.sortPriceDesc' },
  { value: 'rating', labelKey: 'search.sortTopRated' },
];

export default function ProductGrid({ searchQuery = '' }) {
  const { t } = useTranslation();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sort, setSort] = useState('newest');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const LIMIT = 12;

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit: LIMIT };
      if (searchQuery) params.search = searchQuery;
      if (sort === 'price_asc') params.sortBy = 'price';
      if (sort === 'price_desc') { params.sortBy = 'price'; params.sortOrder = 'desc'; }
      if (sort === 'rating') params.sortBy = 'rating';

      const data = await productAPI.getProducts(params);

      const items = Array.isArray(data)
        ? data
        : data.products || data.data || data.items || [];
      const total = data.pagination?.totalPages || data.totalPages || 1;

      setProducts(items);
      setTotalPages(total);
    } catch (err) {
      const isTimeout = err?.code === 'ECONNABORTED' || err?.message?.includes('timeout');
      setError(isTimeout ? 'messages.serverSlowOrOffline' : 'messages.productsLoadError');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [page, sort, searchQuery]);

  useEffect(() => { setPage(1); }, [searchQuery, sort]);
  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const currentSort = t(SORT_OPTIONS.find((o) => o.value === sort)?.labelKey || 'buttons.sort');

  return (
    <section>
      {/* Section header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between mb-6 flex-wrap gap-4"
      >
        <div>
          <h2
            className="text-2xl font-black"
            style={{ color: 'var(--text-primary)', letterSpacing: '-0.5px' }}
          >
            {searchQuery ? `${t('search.resultsFor')} "${searchQuery}"` : t('home.exploreAllProducts')}
          </h2>
          {!loading && (
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {products.length} {t('product.itemsFound')}
            </p>
          )}
        </div>

        {/* Sort dropdown */}
        <div className="relative">
          <motion.button
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowSortMenu(!showSortMenu)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
            style={{
              background: 'var(--card-bg)',
              boxShadow: 'var(--shadow-sm)',
              border: '1px solid var(--border-card)',
              color: 'var(--text-primary)',
            }}
          >
            <SlidersHorizontal className="w-4 h-4" style={{ color: '#ff8c42' }} />
            {currentSort}
            <ChevronDown className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
          </motion.button>

          <AnimatePresence>
            {showSortMenu && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 w-48 rounded-2xl overflow-hidden z-20"
                style={{
                  background: 'var(--dropdown-bg)',
                  boxShadow: 'var(--shadow-lg)',
                  border: '1px solid var(--divider)',
                }}
              >
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => { setSort(opt.value); setShowSortMenu(false); }}
                    className="block w-full px-4 py-2.5 text-left text-sm transition"
                    style={{
                      color: sort === opt.value ? '#ff8c42' : 'var(--text-secondary)',
                      fontWeight: sort === opt.value ? 600 : 400,
                      background: sort === opt.value ? 'var(--bg-active)' : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (sort !== opt.value) e.currentTarget.style.background = 'var(--bg-hover)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = sort === opt.value ? 'var(--bg-active)' : 'transparent';
                    }}
                  >
                    {t(opt.labelKey)}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Error */}
      {error && (
        <div className="text-center py-16">
          <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
            {t(error || 'messages.errorGeneric')}
          </p>
          <button
            onClick={fetchProducts}
            className="px-6 py-2.5 rounded-2xl text-white text-sm font-semibold"
            style={{ background: 'linear-gradient(135deg, #ff8c42, #ff5f00)' }}
          >
            {t('buttons.retry')}
          </button>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="rounded-3xl overflow-hidden animate-pulse"
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--border-card)',
              }}
            >
              <div style={{ paddingTop: '72%', background: 'var(--bg-skeleton)' }} />
              <div className="p-4 space-y-2">
                <div className="h-4 rounded-lg" style={{ background: 'var(--bg-skeleton)', width: '70%' }} />
                <div className="h-3 rounded-lg" style={{ background: 'var(--bg-skeleton)', width: '50%' }} />
                <div className="h-5 rounded-lg" style={{ background: 'var(--bg-skeleton)', width: '40%' }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && products.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-20"
        >
          <div className="text-6xl mb-4">🛍️</div>
          <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            {t('messages.noResults')}
          </h3>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {searchQuery ? `${t('search.noMatches')} "${searchQuery}"` : t('home.noProductsYet')}
          </p>
        </motion.div>
      )}

      {/* Product grid */}
      {!loading && !error && products.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
          {products.map((product, idx) => (
            <ProductCard key={product._id || product.id || idx} product={product} index={idx} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && !loading && !error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex justify-center items-center gap-2 mt-10 flex-wrap"
        >
          <motion.button
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.95 }}
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-40"
            style={{
              background: 'var(--card-bg)',
              color: 'var(--text-secondary)',
              boxShadow: 'var(--shadow-sm)',
              border: '1px solid var(--border-card)',
            }}
          >
            ← {t('buttons.back')}
          </motion.button>

          {[...Array(Math.min(totalPages, 7))].map((_, i) => {
            const p = i + 1;
            return (
              <motion.button
                key={p}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setPage(p)}
                className="w-9 h-9 rounded-xl text-sm font-semibold"
                style={{
                  background: page === p ? 'linear-gradient(135deg, #ff8c42, #ff5f00)' : 'var(--card-bg)',
                  color: page === p ? 'white' : 'var(--text-secondary)',
                  boxShadow: page === p ? '0 4px 14px rgba(255,140,66,0.35)' : 'var(--shadow-sm)',
                  border: page === p ? 'none' : '1px solid var(--border-card)',
                }}
              >
                {p}
              </motion.button>
            );
          })}

          <motion.button
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.95 }}
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-40"
            style={{
              background: 'var(--card-bg)',
              color: 'var(--text-secondary)',
              boxShadow: 'var(--shadow-sm)',
              border: '1px solid var(--border-card)',
            }}
          >
            {t('buttons.next')} →
          </motion.button>
        </motion.div>
      )}
    </section>
  );
}
