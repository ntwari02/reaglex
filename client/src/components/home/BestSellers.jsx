import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { Star, Award, ChevronLeft, ChevronRight } from 'lucide-react';
import { productAPI } from '../../services/api';
import { homeFeedApi } from '../../services/homeFeedApi';
import { SERVER_URL } from '../../lib/config';
import { buyerProductPath } from '../../lib/productUrl';
import { useHomeLayoutForSection } from '../../hooks/useHomeLayoutConfig';
import '../../styles/home-layout-cards.css';

function densityArticleClass(density) {
  if (density === 'compact') return 'home-card-density--compact';
  if (density === 'compact_expandable') return 'home-card-density--compact home-card-density--expandable';
  return '';
}

const resolveImg = (src) => {
  if (!src) return 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80';
  if (src.startsWith('http')) return src;
  return `${SERVER_URL}${src}`;
};

const FALLBACK = [
  { _id: 'b1', name: 'AirPods Pro Gen 3', price: 199, rating: 4.9, reviewCount: 1240, thumbnail: 'https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=500&q=85', badge: '#1 in Audio' },
  { _id: 'b2', name: 'iPhone 15 Pro Case', price: 29, rating: 4.8, reviewCount: 876, thumbnail: 'https://images.unsplash.com/photo-1603481588273-2f908a9a7a1b?w=500&q=85', badge: 'Best Seller' },
  { _id: 'b3', name: 'Silk Pillowcase Set', price: 45, rating: 4.7, reviewCount: 543, thumbnail: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=500&q=85', badge: 'Top Rated' },
  { _id: 'b4', name: 'Ceramic Coffee Mug', price: 18, rating: 4.9, reviewCount: 2100, thumbnail: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=500&q=85', badge: '#1 in Kitchen' },
  { _id: 'b5', name: 'Linen Tote Bag', price: 34, rating: 4.6, reviewCount: 420, thumbnail: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=500&q=85', badge: 'Trending' },
  { _id: 'b6', name: 'Bamboo Cutting Board', price: 22, rating: 4.8, reviewCount: 780, thumbnail: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=500&q=85', badge: 'Best Value' },
  { _id: 'b7', name: 'Resistance Band Set', price: 26, rating: 4.7, reviewCount: 635, thumbnail: 'https://images.unsplash.com/photo-1598289431512-b97b0917affc?w=500&q=85', badge: 'Top Seller' },
  { _id: 'b8', name: 'Glass Meal Prep Containers', price: 38, rating: 4.8, reviewCount: 910, thumbnail: 'https://images.unsplash.com/photo-1606166325683-e6deb697d301?w=500&q=85', badge: 'Staff Pick' },
];

const BEST_CACHE_TTL = 5 * 60 * 1000;
let bestCache = { data: null, ts: 0 };

/* ─── Rank badge colors ──────────────────────────────────────────────────── */
const RANK_STYLE = [
  { bg: 'var(--brand-primary)', color: 'var(--text-on-accent)' },
  { bg: 'var(--text-muted)', color: 'var(--text-on-accent)' },
  { bg: 'var(--brand-primary-hover)', color: 'var(--text-on-accent)' },
];

/* ─── Single best seller card ────────────────────────────────────────────── */
function BestCard({ product, rank, cardDensity = 'standard' }) {
  const [expanded, setExpanded] = useState(false);
  const expandable = cardDensity === 'compact_expandable';
  const img = resolveImg(product.thumbnail || product.images?.[0]);
  const rankStyle = RANK_STYLE[rank] || { bg: 'var(--bg-badge)', color: 'var(--text-muted)' };

  return (
    <motion.div
      className={`flex-shrink-0 group ${densityArticleClass(cardDensity)} ${expandable && expanded ? 'home-card-density--expanded' : ''}`.trim()}
      style={{ width: expandable && !expanded ? 'clamp(160px, 18vw, 200px)' : 'clamp(220px, 22vw, 260px)' }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.25 }}
      onClick={expandable ? () => setExpanded((v) => !v) : undefined}
    >
      <Link
        to={buyerProductPath(product)}
        className="block rounded-2xl overflow-hidden"
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--border-card)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        {/* Image */}
        <div
          className="relative overflow-hidden"
          style={{ aspectRatio: '1 / 1', background: 'var(--bg-tertiary)' }}
        >
          <img
            src={img}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-106"
            loading="lazy"
            decoding="async"
            width="500"
            height="500"
          />

          {/* Rank badge */}
          <div
            className="absolute top-3 left-3 w-8 h-8 rounded-full flex items-center justify-center text-xs font-black"
            style={{ background: rankStyle.bg, color: rankStyle.color, boxShadow: 'var(--shadow-sm)' }}
          >
            #{rank + 1}
          </div>

          {/* Text badge */}
          {product.badge && (
            <div
              className="absolute bottom-3 right-3 px-2 py-0.5 rounded-full text-xs font-semibold"
              style={{
                background: 'var(--card-bg)',
                color: 'var(--text-secondary)',
                backdropFilter: 'blur(8px)',
                border: '1px solid var(--border-card)',
              }}
            >
              {product.badge}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4">
          <p
            className="font-semibold text-sm line-clamp-2 leading-snug mb-2"
            style={{ color: 'var(--text-primary)' }}
          >
            {product.name}
          </p>

          <div className="flex items-center gap-1.5 mb-3">
            <div className="flex">
              {[1,2,3,4,5].map(n => (
                <Star
                  key={n}
                  size={11}
                  fill={n <= Math.round(product.rating || 4.5) ? 'var(--brand-primary)' : 'none'}
                  stroke={n <= Math.round(product.rating || 4.5) ? 'var(--brand-primary)' : 'var(--border-card)'}
                />
              ))}
            </div>
            <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              {(product.rating || 4.5).toFixed(1)}
            </span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              ({(product.reviewCount || product.review_count || 0).toLocaleString()})
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="font-black text-base" style={{ color: 'var(--text-price)' }}>
              ${product.price}
            </span>
            <span
              className="text-xs px-2.5 py-1 rounded-full font-semibold"
              style={{
                background: 'var(--brand-tint)',
                color: 'var(--brand-orange-text)',
                border: '1px solid var(--brand-border-subtle)',
              }}
            >
              Best Seller
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

/* ─── Section ────────────────────────────────────────────────────────────── */
export default function BestSellers() {
  const { layout: layoutSettings } = useHomeLayoutForSection('bestsellers', 'desktop');
  const layoutMode = layoutSettings?.mode || 'horizontal_carousel';
  const autoScroll = layoutSettings?.autoScroll !== false;
  const autoScrollStep = Number(layoutSettings?.autoScrollStep) || 0.65;
  const duplicateLoop = layoutSettings?.duplicateLoop !== false;
  const gridCols = layoutSettings?.gridColumns || 4;
  const cardDensity = layoutSettings?.cardDensity || 'standard';
  const gridClass =
    gridCols === 2
      ? 'grid grid-cols-2 gap-4'
      : gridCols === 3
        ? 'grid grid-cols-2 sm:grid-cols-3 gap-4'
        : 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4';

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isInteracting, setIsInteracting] = useState(false);
  const scrollRef = useRef(null);
  const headerRef = useRef(null);
  const inView = useInView(headerRef, { once: true, margin: '-80px' });

  useEffect(() => {
    const now = Date.now();
    if (bestCache.data && now - bestCache.ts < BEST_CACHE_TTL) {
      setProducts(bestCache.data);
      setLoading(false);
      return;
    }

    // Marketplace AI: pull the buyer-specific "bestsellers" section so
    // every shopper sees a list that\u2019s already re-ranked for them.
    homeFeedApi
      .getSection('bestsellers', { limit: 8 })
      .then((section) => {
        const list = Array.isArray(section?.products) ? section.products : [];
        if (!list.length) throw new Error('empty');
        const next = list.slice(0, 8);
        setProducts(next);
        bestCache = { data: next, ts: Date.now() };
      })
      .catch(() =>
        productAPI
          .getProducts({ limit: 8, sort: '-reviewCount' })
          .then((res) => {
            const list = Array.isArray(res) ? res : res?.products || res?.data || [];
            const next = list.slice(0, 8);
            setProducts(next);
            bestCache = { data: next, ts: Date.now() };
          })
          .catch(() => {
            setProducts(FALLBACK);
            bestCache = { data: FALLBACK, ts: Date.now() };
          }),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const onInventoryUpdated = (event) => {
      const payload = event?.detail;
      if (!payload?.productId) return;
      setProducts((prev) => {
        if (!Array.isArray(prev) || prev.length === 0) return prev;
        let changed = false;
        const next = prev.map((p) => {
          const pid = String(p?._id || p?.id || '');
          if (pid !== String(payload.productId)) return p;
          changed = true;
          return {
            ...p,
            stock: Number(payload.stock ?? p.stock ?? 0),
            stockQuantity: Number(payload.stock ?? p.stockQuantity ?? 0),
            status: payload.status || p.status,
          };
        });
        if (changed) bestCache = { data: next, ts: Date.now() };
        return changed ? next : prev;
      });
    };
    window.addEventListener('inventoryUpdated', onInventoryUpdated);
    return () => window.removeEventListener('inventoryUpdated', onInventoryUpdated);
  }, []);

  const scroll = (dir) => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir * 280, behavior: 'smooth' });
  };

  // Auto-slide with seamless loop (duplicated list) — default on for desktop best sellers
  useEffect(() => {
    if (layoutMode !== 'horizontal_carousel' || !autoScroll) return;
    if (loading || products.length < 2) return;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const el = scrollRef.current;
    if (!el) return;
    const id = window.setInterval(() => {
      if (!scrollRef.current || isInteracting) return;
      const node = scrollRef.current;
      node.scrollLeft += autoScrollStep;
      if (duplicateLoop) {
        const half = node.scrollWidth / 2;
        if (node.scrollLeft >= half) {
          node.scrollLeft -= half;
        }
      }
    }, 16);
    return () => window.clearInterval(id);
  }, [layoutMode, autoScroll, autoScrollStep, duplicateLoop, loading, products.length, isInteracting]);

  const displayProducts =
    layoutMode === 'horizontal_carousel' && duplicateLoop && !loading && products.length > 1
      ? [...products, ...products]
      : products;

  return (
    <section
      className="w-full py-20"
      style={{ background: 'var(--bg-page)' }}
    >
      <div className="px-4 sm:px-6 lg:px-10 xl:px-16">
        {/* Header */}
        <div ref={headerRef} className="flex items-end justify-between mb-10">
          <div>
            <motion.p
              className="text-xs font-semibold tracking-[0.2em] uppercase mb-2 flex items-center gap-2"
              style={{ color: 'var(--text-muted)' }}
              initial={{ opacity: 0, y: 12 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5 }}
            >
              <Award size={12} style={{ color: 'var(--brand-primary)' }} />
              Most Popular
            </motion.p>
            <motion.h2
              className="font-black leading-none"
              style={{
                color: 'var(--text-primary)',
                fontSize: 'clamp(1.8rem, 4vw, 3rem)',
                fontFamily: "'Times New Roman', Georgia, serif",
                letterSpacing: '-0.02em',
              }}
              initial={{ opacity: 0, y: 18 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.55, delay: 0.08 }}
            >
              BEST SELLERS
            </motion.h2>
          </div>

          {/* Scroll arrows (carousel mode) */}
          {layoutMode === 'horizontal_carousel' && (
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={() => scroll(-1)}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200"
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--border-card)',
                color: 'var(--text-secondary)',
              }}
              aria-label="Scroll left"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => scroll(1)}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200"
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--border-card)',
                color: 'var(--text-secondary)',
              }}
              aria-label="Scroll right"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          )}
        </div>
      </div>

      {layoutMode === 'grid' ? (
        <div className="px-4 sm:px-6 lg:px-10 xl:px-16">
          {loading ? (
            <div className={gridClass}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl aspect-[0.75] animate-pulse"
                  style={{ background: 'var(--bg-tertiary)' }}
                />
              ))}
            </div>
          ) : products.length > 0 ? (
            <div className={gridClass}>
              {products.map((p, i) => (
                <div key={p._id} className="min-w-0">
                  <BestCard product={p} rank={i} cardDensity={cardDensity} />
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : (
      /* Horizontal scroll strip (default) */
      <div style={{ position: 'relative' }}>
        {/* Futuristic side fades for slider depth */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 36,
            zIndex: 3,
            pointerEvents: 'none',
            background: 'linear-gradient(90deg, var(--bg-page) 0%, transparent 100%)',
          }}
        />
        <div
          aria-hidden
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: 36,
            zIndex: 3,
            pointerEvents: 'none',
            background: 'linear-gradient(270deg, var(--bg-page) 0%, transparent 100%)',
          }}
        />

        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-4 scroll-touch"
          onMouseEnter={() => setIsInteracting(true)}
          onMouseLeave={() => setIsInteracting(false)}
          onTouchStart={() => setIsInteracting(true)}
          onTouchEnd={() => setTimeout(() => setIsInteracting(false), 1200)}
          style={{
            paddingLeft: 'max(1rem, calc((100vw - 1280px) / 2 + 1rem))',
            paddingRight: 'max(1rem, calc((100vw - 1280px) / 2 + 1rem))',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex-shrink-0 rounded-2xl overflow-hidden"
                style={{
                  width: 'clamp(220px, 22vw, 260px)',
                  aspectRatio: '0.75',
                  background: 'var(--bg-tertiary)',
                  animation: 'pulse 1.5s ease-in-out infinite',
                }}
              />
            ))
          : products.length > 0
          ? displayProducts.map((p, i) => (
              <BestCard key={`${p._id}-${i}`} product={p} rank={i % products.length} cardDensity={cardDensity} />
            ))
          : (
            <div
              className="w-full rounded-2xl p-8 text-center"
              style={{
                background: 'var(--bg-tertiary)',
                color: 'var(--text-muted)',
              }}
            >
              Best seller products will appear here once available.
            </div>
          )}
        </div>
      </div>
      )}
    </section>
  );
}
