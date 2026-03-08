import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import BuyerLayout from '../components/buyer/BuyerLayout';
import { HELP_ARTICLES, HELP_CATEGORIES } from '../data/helpCenterData';

const PRIMARY = '#f97316';

export default function HelpSearch() {
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const q = (sp.get('q') || '').trim();
  const [categoryFilter, setCategoryFilter] = useState<'all' | string>('all');

  const results = useMemo(() => {
    const query = q.toLowerCase();
    return HELP_ARTICLES.filter((a) => {
      if (!query) return true;
      return (
        a.title.toLowerCase().includes(query) ||
        a.excerpt.toLowerCase().includes(query)
      );
    });
  }, [q]);

  const filteredResults = results.filter((r) =>
    categoryFilter === 'all' ? true : r.categoryId === categoryFilter
  );

  const categoriesInResults = Array.from(
    new Set(results.map((r) => r.categoryId))
  );

  const highlight = (text: string) => {
    if (!q) return text;
    const lower = text.toLowerCase();
    const idx = lower.indexOf(q.toLowerCase());
    if (idx === -1) return text;
    const before = text.slice(0, idx);
    const match = text.slice(idx, idx + q.length);
    const after = text.slice(idx + q.length);
    return (
      <>
        {before}
        <span
          style={{
            background: 'rgba(249,115,22,0.18)',
            color: PRIMARY,
            borderRadius: 4,
            padding: '0 2px',
          }}
        >
          {match}
        </span>
        {after}
      </>
    );
  };

  const getCategory = (id: string) =>
    HELP_CATEGORIES.find((c) => c.id === id) || HELP_CATEGORIES[0];

  const hasResults = filteredResults.length > 0;

  return (
    <BuyerLayout>
      <div
        className="min-h-screen"
        style={{ background: 'var(--bg-page)', color: 'var(--text-primary)' }}
      >
        <div className="w-full px-4 sm:px-6 lg:px-10 py-10 space-y-6">
          {/* Header */}
          <div className="space-y-1">
            <h1
              className="text-xl sm:text-2xl font-bold"
              style={{ color: 'var(--text-primary)' }}
            >
              Search results for{' '}
              <span style={{ color: PRIMARY }}>&ldquo;{q || 'All'}&rdquo;</span>
            </h1>
            <p
              className="text-sm"
              style={{ color: 'var(--text-muted)' }}
            >
              Found {filteredResults.length} articles
            </p>
          </div>

          {/* Category filter pills */}
          <div className="flex flex-wrap gap-2 text-xs sm:text-[13px]">
            <button
              type="button"
              onClick={() => setCategoryFilter('all')}
              className="px-3 py-1.5 rounded-full font-medium"
              style={{
                background: categoryFilter === 'all' ? PRIMARY : 'transparent',
                color:
                  categoryFilter === 'all'
                    ? '#ffffff'
                    : 'var(--text-muted)',
                boxShadow:
                  categoryFilter === 'all'
                    ? '0 0 0 1px rgba(249,115,22,0.5),0 8px 20px rgba(249,115,22,0.45)'
                    : '0 0 0 1px var(--divider-strong)',
              }}
            >
              All
            </button>
            {HELP_CATEGORIES.filter((c) =>
              categoriesInResults.includes(c.id)
            ).map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoryFilter(cat.id)}
                className="px-3 py-1.5 rounded-full font-medium"
                style={{
                  background:
                    categoryFilter === cat.id ? PRIMARY : 'transparent',
                  color:
                    categoryFilter === cat.id
                      ? '#ffffff'
                      : 'var(--text-muted)',
                  boxShadow:
                    categoryFilter === cat.id
                      ? '0 0 0 1px rgba(249,115,22,0.5),0 8px 20px rgba(249,115,22,0.45)'
                      : '0 0 0 1px var(--divider-strong)',
                }}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Results list / empty state */}
          {hasResults ? (
            <div className="space-y-3 mt-3">
              {filteredResults.map((article) => {
                const category = getCategory(article.categoryId);
                return (
                  <motion.button
                    key={article.id}
                    type="button"
                    onClick={() =>
                      navigate(`/help/${category.slug}/${article.slug}`)
                    }
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22 }}
                    className="w-full text-left rounded-[14px] px-4 py-3 sm:px-5 sm:py-4 transition-all"
                    style={{
                      background: 'var(--card-bg)',
                      boxShadow: '0 10px 28px rgba(15,23,42,0.45)',
                    }}
                    whileHover={{
                      y: -2,
                      boxShadow: '0 16px 40px rgba(15,23,42,0.75)',
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3
                          className="text-sm sm:text-[15px] font-semibold mb-1"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {highlight(article.title)}
                        </h3>
                        <p
                          className="text-[11px] mb-1"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          Help Center · {category.name}
                        </p>
                        <p
                          className="text-[13px] line-clamp-2"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          {highlight(article.excerpt)}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                          <span style={{ color: 'var(--text-faint)' }}>
                            {article.readTime}
                          </span>
                          <span style={{ color: 'var(--text-faint)' }}>•</span>
                          <span style={{ color: 'var(--text-faint)' }}>
                            👍 Helpful ({article.helpfulCount.toLocaleString()})
                          </span>
                        </div>
                      </div>
                      <div
                        className="hidden sm:flex items-center justify-center text-lg"
                        style={{ color: 'var(--text-faint)' }}
                      >
                        →
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          ) : (
            <div className="mt-6 rounded-[18px] p-6 sm:p-8 text-center"
              style={{
                background: 'var(--card-bg)',
                boxShadow: '0 16px 40px rgba(15,23,42,0.55)',
              }}
            >
              <div className="text-3xl mb-3">😕</div>
              <h2
                className="text-lg font-semibold mb-1"
                style={{ color: 'var(--text-primary)' }}
              >
                No results for &ldquo;{q || 'your search'}&rdquo;
              </h2>
              <p
                className="text-sm mb-4"
                style={{ color: 'var(--text-muted)' }}
              >
                Try different keywords, or browse our popular topics below.
              </p>
              <div className="flex flex-wrap justify-center gap-2 mb-4 text-xs">
                {['Escrow', 'Payment methods', 'Order tracking', 'Returns'].map(
                  (term) => (
                    <button
                      key={term}
                      type="button"
                      onClick={() =>
                        navigate(
                          `/help/search?q=${encodeURIComponent(term)}`
                        )
                      }
                      className="px-3 py-1.5 rounded-full"
                      style={{
                        background: 'var(--bg-tertiary)',
                        color: 'var(--text-muted)',
                      }}
                    >
                      {term}
                    </button>
                  )
                )}
              </div>
              <button
                type="button"
                className="mt-1 px-5 py-2.5 rounded-[12px] text-xs font-semibold text-white"
                style={{
                  background:
                    'linear-gradient(135deg,#ff8c2a,#f97316,#ea580c)',
                  boxShadow: '0 8px 24px rgba(249,115,22,0.45)',
                }}
              >
                Contact support
              </button>
            </div>
          )}
        </div>
      </div>
    </BuyerLayout>
  );
}

