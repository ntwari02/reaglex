import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Clock, TrendingUp } from 'lucide-react';
import { useImmersiveSearch } from '../../stores/immersiveSearchStore';
import { productAPI } from '../../services/api';
import { SERVER_URL } from '../../lib/config';
import { buyerProductPath } from '../../lib/productUrl';
import { EASE_OUT_EXPO } from '../../motion/presets';

const SUGGESTIONS = ['Shoes for men', 'Nike shoes', 'Wireless earbuds', 'Summer sale', 'Smart watch'];
const RECENT_KEY = 'reaglex_recent_searches';

function getRecent() {
  try {
    const s = localStorage.getItem(RECENT_KEY);
    return s ? JSON.parse(s) : [];
  } catch {
    return [];
  }
}

function resolveImg(src) {
  if (!src) return null;
  const v = typeof src === 'string' ? src : src?.url || src?.src;
  if (!v) return null;
  return v.startsWith('http') ? v : `${SERVER_URL}${v}`;
}

export default function ImmersiveSearchLayer() {
  const navigate = useNavigate();
  const open = useImmersiveSearch((s) => s.open);
  const initialQuery = useImmersiveSearch((s) => s.initialQuery);
  const closeSearch = useImmersiveSearch((s) => s.closeSearch);
  const inputRef = useRef(null);
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setQuery(initialQuery || '');
      const t = window.setTimeout(() => inputRef.current?.focus(), 120);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [open, initialQuery]);

  useEffect(() => {
    if (!open || !query.trim()) {
      setProducts([]);
      return undefined;
    }
    const t = window.setTimeout(async () => {
      setLoading(true);
      try {
        const data = await productAPI.getProducts({ search: query.trim(), limit: 6 });
        const list = Array.isArray(data) ? data : data?.products || data?.data || [];
        setProducts(list.slice(0, 6));
      } catch {
        setProducts([]);
      } finally {
        setLoading(false);
      }
    }, 280);
    return () => window.clearTimeout(t);
  }, [query, open]);

  const submit = (q) => {
    const term = (q || query).trim();
    if (!term) return;
    try {
      const recent = getRecent().filter((r) => r !== term);
      recent.unshift(term);
      localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, 8)));
    } catch {}
    closeSearch();
    navigate(`/search?q=${encodeURIComponent(term)}`);
  };

  const recent = getRecent().slice(0, 5);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[200] md:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28, ease: EASE_OUT_EXPO }}
        >
          <motion.button
            type="button"
            className="absolute inset-0"
            style={{
              background: 'color-mix(in srgb, var(--bg-page) 72%, rgba(0,0,0,0.45))',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
            }}
            aria-label="Close search"
            onClick={closeSearch}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <motion.div
            className="relative flex h-full flex-col"
            initial={{ y: -24, opacity: 0.98 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -16, opacity: 0 }}
            transition={{ duration: 0.38, ease: EASE_OUT_EXPO }}
            style={{
              paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))',
              background: 'color-mix(in srgb, var(--bg-page) 94%, transparent)',
            }}
          >
            <div className="flex items-center gap-2 px-4 pb-3">
              <div
                className="flex flex-1 items-center gap-2 rounded-full px-4 min-h-[52px]"
                style={{
                  background: 'var(--card-bg)',
                  border: '1px solid color-mix(in srgb, var(--brand-primary) 35%, var(--border-card))',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <Search className="h-[18px] w-[18px] shrink-0" style={{ color: 'var(--text-muted)' }} />
                <input
                  ref={inputRef}
                  type="search"
                  enterKeyHint="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submit()}
                  placeholder="Search products, brands, stores…"
                  className="min-w-0 flex-1 bg-transparent text-[16px] outline-none"
                  style={{ color: 'var(--text-primary)' }}
                />
              </div>
              <button
                type="button"
                onClick={closeSearch}
                className="flex h-11 w-11 items-center justify-center rounded-full"
                style={{ background: 'var(--card-bg)', border: '1px solid var(--border-card)' }}
                aria-label="Close"
              >
                <X size={20} style={{ color: 'var(--text-secondary)' }} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-8">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>
                Suggestions
              </p>
              <div className="mb-6 flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => submit(s)}
                    className="rounded-full px-3.5 py-2 text-[13px] font-medium transition active:scale-[0.98]"
                    style={{
                      background: 'var(--card-bg)',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border-card)',
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>

              {recent.length > 0 && (
                <>
                  <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>
                    <Clock size={12} /> Recent
                  </p>
                  <div className="mb-6 space-y-1">
                    {recent.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => submit(r)}
                        className="w-full rounded-xl px-3 py-2.5 text-left text-[14px]"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </>
              )}

              <p className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>
                <TrendingUp size={12} style={{ color: 'var(--brand-primary)' }} /> Popular products
              </p>

              {loading && (
                <motion.div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-16 rounded-2xl pwa-skeleton" />
                  ))}
                </motion.div>
              )}

              {!loading && products.length > 0 && (
                <motion.div className="space-y-2">
                  {products.map((p, i) => {
                    const img = resolveImg(p.thumbnail || p.images?.[0]);
                    const name = p.title || p.name;
                    return (
                      <motion.button
                        key={p._id || p.id || i}
                        type="button"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04, duration: 0.32, ease: EASE_OUT_EXPO }}
                        onClick={() => {
                          closeSearch();
                          navigate(buyerProductPath(p));
                        }}
                        className="flex w-full items-center gap-3 rounded-2xl p-2.5 text-left"
                        style={{
                          background: 'var(--card-bg)',
                          border: '1px solid var(--border-card)',
                          boxShadow: 'var(--shadow-xs)',
                        }}
                      >
                        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl" style={{ background: 'var(--bg-tertiary)' }}>
                          {img && <img src={img} alt="" className="h-full w-full object-cover" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[14px] font-medium" style={{ color: 'var(--text-primary)' }}>{name}</p>
                          <p className="text-[13px] font-semibold" style={{ color: 'var(--brand-primary)' }}>
                            ${Number(p.price || 0).toFixed(2)}
                          </p>
                        </div>
                      </motion.button>
                    );
                  })}
                </motion.div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
