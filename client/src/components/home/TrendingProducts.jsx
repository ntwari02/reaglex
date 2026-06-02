import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { Star, ShoppingCart, Heart, TrendingUp, Zap } from 'lucide-react';
import { useCurrencyPricing } from '../../hooks/useCurrencyPricing';
import { productAPI } from '../../services/api';
import { homeFeedApi } from '../../services/homeFeedApi';
import { useBuyerCart } from '../../stores/buyerCartStore';
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

const FALLBACK_PRODUCTS = [
  { _id: 'f1', name: 'Wireless Headphones Pro', price: 129, originalPrice: 199, rating: 4.8, reviewCount: 324, thumbnail: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=80', discount: 35 },
  { _id: 'f2', name: 'Smart Watch Series X', price: 249, originalPrice: 349, rating: 4.7, reviewCount: 218, thumbnail: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80', discount: 29 },
  { _id: 'f3', name: 'Running Shoes Elite', price: 89, originalPrice: 130, rating: 4.6, reviewCount: 512, thumbnail: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80', discount: 32 },
  { _id: 'f4', name: 'Leather Crossbody Bag', price: 68, originalPrice: 95, rating: 4.5, reviewCount: 187, thumbnail: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&q=80', discount: 28 },
  { _id: 'f5', name: 'Polaroid Instant Camera', price: 75, originalPrice: 99, rating: 4.7, reviewCount: 290, thumbnail: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400&q=80', discount: 24 },
  { _id: 'f6', name: 'Minimalist Desk Lamp', price: 49, originalPrice: 75, rating: 4.4, reviewCount: 143, thumbnail: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400&q=80', discount: 35 },
  { _id: 'f7', name: 'Stainless Water Bottle', price: 28, originalPrice: 40, rating: 4.8, reviewCount: 650, thumbnail: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400&q=80', discount: 30 },
  { _id: 'f8', name: 'Laptop Stand Aluminum', price: 42, originalPrice: 60, rating: 4.6, reviewCount: 389, thumbnail: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=400&q=80', discount: 30 },
];

const TRENDING_CACHE_TTL = 5 * 60 * 1000;
let trendingCache = { data: null, ts: 0 };

/* ─── Product card ───────────────────────────────────────────────────────── */
function TrendCard({ product, index, onAdd, cardDensity = 'standard', layout = 'vertical' }) {
  const [expanded, setExpanded] = useState(false);
  const expandable = cardDensity === 'compact_expandable';
  const [wished, setWished] = useState(false);
  const [adding, setAdding] = useState(false);
  const currencyPricing = useCurrencyPricing();
  const isRail = layout === 'horizontal';
  const img = resolveImg(product.thumbnail || product.images?.[0]);
  const discount = product.discount || (product.originalPrice ? Math.round((1 - product.price / product.originalPrice) * 100) : 0);
  const stock = Number(product.stockQuantity ?? product.stock ?? 0);

  const handleAdd = async (e) => {
    e.preventDefault();
    setAdding(true);
    await onAdd(product);
    setTimeout(() => setAdding(false), 800);
  };

  return (
    <motion.div
      className={`group relative w-full min-w-0 ${densityArticleClass(cardDensity)} ${expandable && expanded ? 'home-card-density--expanded' : ''}`.trim()}
      initial={{ opacity: 0, y: 24 }}
      onClick={expandable ? () => setExpanded((v) => !v) : undefined}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        to={buyerProductPath(product)}
        className={`block rounded-2xl overflow-hidden ${isRail ? 'trend-card--rail' : 'trend-card--grid'}`}
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--border-card)',
          boxShadow: 'var(--shadow-card)',
          transition: 'box-shadow 0.3s, transform 0.3s',
        }}
      >
        {/* Image */}
        <div
          className="relative overflow-hidden trend-card__media"
          style={{ aspectRatio: isRail ? '4 / 5' : '1', background: 'var(--bg-tertiary)' }}
        >
          <img
            src={img}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-600 group-hover:scale-108"
            loading="lazy"
            decoding="async"
            width="480"
            height="480"
          />

          {/* Discount badge */}
          {discount > 0 && (
            <div
              className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full text-xs font-bold"
              style={{
                background: 'var(--badge-error-bg)',
                color: 'var(--badge-error-text)',
                border: '1px solid var(--badge-error-border)',
              }}
            >
              -{discount}%
            </div>
          )}

          {/* Trending badge */}
          <div
            className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
            style={{ background: 'var(--brand-primary)', color: 'var(--text-on-accent)' }}
          >
            <TrendingUp size={10} />
            HOT
          </div>

          {/* Wishlist button */}
          <button
            onClick={(e) => { e.preventDefault(); setWished(!wished); }}
            className="absolute top-10 right-2.5 w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300"
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--border-card)',
              color: 'var(--text-secondary)',
              backdropFilter: 'blur(8px)',
            }}
            aria-label="Add to wishlist"
          >
            <Heart size={12} fill={wished ? 'var(--badge-error-text)' : 'none'} stroke={wished ? 'var(--badge-error-text)' : 'currentColor'} />
          </button>

        </div>

        {/* Info */}
        <div className="p-3">
          <p
            className="text-xs font-medium line-clamp-2 leading-snug mb-2"
            style={{ color: 'var(--text-primary)' }}
          >
            {product.name}
          </p>

          {/* Rating */}
          <div className="flex items-center gap-1 mb-2">
            <div className="flex">
              {[1,2,3,4,5].map(n => (
                <Star
                  key={n}
                  size={10}
                  fill={n <= Math.round(product.rating || 4.5) ? 'var(--brand-primary)' : 'none'}
                  stroke={n <= Math.round(product.rating || 4.5) ? 'var(--brand-primary)' : 'var(--border-card)'}
                />
              ))}
            </div>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              ({product.reviewCount || product.review_count || 0})
            </span>
          </div>

          {/* Price + cart */}
          <div className="trend-card__price-row">
            <div className="flex flex-col min-w-0 flex-1">
              <span className="font-bold text-sm leading-tight" style={{ color: 'var(--text-price)' }}>
                {currencyPricing.formatLocalWithUsd(product.price)}
              </span>
              {product.originalPrice && (
                <span className="text-xs line-through" style={{ color: 'var(--text-muted)' }}>
                  {currencyPricing.formatLocalWithUsd(product.originalPrice)}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={handleAdd}
              disabled={stock <= 0}
              className="trend-card__cart-btn"
              aria-label={stock <= 0 ? 'Out of stock' : adding ? 'Added to cart' : 'Add to cart'}
            >
              <ShoppingCart size={15} strokeWidth={2} />
            </button>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

/* ─── Section ────────────────────────────────────────────────────────────── */
export default function TrendingProducts() {
  const { addItem } = useBuyerCart();
  const { layout: layoutSettings } = useHomeLayoutForSection('trending', 'desktop');
  const layoutMode = layoutSettings?.mode || 'grid';
  const railCount = Math.max(1, Math.min(8, Number(layoutSettings?.railCount) || 4));
  const gridCols = layoutSettings?.gridColumns || 4;
  const gridClass =
    gridCols === 2
      ? 'grid grid-cols-2 gap-4'
      : gridCols === 3
        ? 'grid grid-cols-2 sm:grid-cols-3 gap-4'
        : 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-5 sm:gap-5 md:gap-6';
  const cardDensity = layoutSettings?.cardDensity || 'standard';

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const headerRef = useRef(null);
  const inView = useInView(headerRef, { once: true, margin: '-80px' });

  useEffect(() => {
    const now = Date.now();
    if (trendingCache.data && now - trendingCache.ts < TRENDING_CACHE_TTL) {
      setProducts(trendingCache.data);
      setLoading(false);
      return;
    }

    // Marketplace AI: prefer the personalised "trending" section so every
    // buyer sees a slightly different list. Falls back to the legacy
    // product list when the AI endpoint is unavailable (e.g. fresh DB).
    homeFeedApi
      .getSection('trending', { limit: 8 })
      .then((section) => {
        const list = Array.isArray(section?.products) ? section.products : [];
        if (!list.length) throw new Error('empty');
        const next = list.slice(0, 8);
        setProducts(next);
        trendingCache = { data: next, ts: Date.now() };
      })
      .catch(() =>
        productAPI
          .getProducts({ limit: 8, sort: '-rating' })
          .then((res) => {
            const list = Array.isArray(res) ? res : res?.products || res?.data || [];
            const next = list.slice(0, 8);
            setProducts(next);
            trendingCache = { data: next, ts: Date.now() };
          })
          .catch(() => {
            setProducts(FALLBACK_PRODUCTS);
            trendingCache = { data: FALLBACK_PRODUCTS, ts: Date.now() };
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
        if (changed) trendingCache = { data: next, ts: Date.now() };
        return changed ? next : prev;
      });
    };
    window.addEventListener('inventoryUpdated', onInventoryUpdated);
    return () => window.removeEventListener('inventoryUpdated', onInventoryUpdated);
  }, []);

  const handleAdd = (product) => {
    addItem({
      _id: product._id,
      id: product._id || product.id,
      name: product.name,
      title: product.name,
      price: product.price,
      images: product.images,
      image: product.thumbnail || product.images?.[0],
    }, 1);
  };

  return (
    <section
      className="trending-now-section w-full py-20"
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
              <Zap size={12} style={{ color: 'var(--brand-primary)' }} />
              What&apos;s Hot
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
              TRENDING NOW
            </motion.h2>
          </div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Link
              to="/search"
              className="flex sm:justify-end items-center gap-2 text-xs font-semibold tracking-wide self-start sm:self-auto"
              style={{ color: 'var(--link-color)' }}
            >
              View all <span>→</span>
            </Link>
          </motion.div>
        </div>

        {/* Product layout (configurable; default = 4-col grid) */}
        {loading ? (
          <>
            <div className="trending-now-rail flex gap-4 overflow-x-auto pb-4 mb-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={`sk-rail-${i}`}
                  className="trending-now-rail__item flex-shrink-0 rounded-2xl"
                  style={{ background: 'var(--bg-tertiary)', aspectRatio: '0.75' }}
                />
              ))}
            </div>
            <div className={gridClass}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl overflow-hidden"
                style={{ background: 'var(--bg-tertiary)', aspectRatio: '0.8' }}
              >
                <div className="w-full h-3/5" style={{ background: 'var(--bg-skeleton)', animation: 'pulse 1.5s ease-in-out infinite' }} />
                <div className="p-3 space-y-2">
                  <div className="h-3 rounded" style={{ background: 'var(--bg-skeleton)', width: '75%' }} />
                  <div className="h-3 rounded" style={{ background: 'var(--bg-skeleton)', width: '50%' }} />
                </div>
              </div>
            ))}
            </div>
          </>
        ) : products.length > 0 && (layoutMode === 'trending_rail' || layoutMode === 'grid') ? (
          <>
            <div
              className="trending-now-rail flex gap-4 overflow-x-auto pb-4 scroll-touch mb-6"
              style={{ scrollbarWidth: 'none' }}
            >
              {products.slice(0, Math.min(4, railCount)).map((p, i) => (
                <div key={p._id} className="trending-now-rail__item flex-shrink-0">
                  <TrendCard
                    product={p}
                    index={i}
                    onAdd={handleAdd}
                    cardDensity={cardDensity}
                    layout="horizontal"
                  />
                </div>
              ))}
            </div>
            {products.length > Math.min(4, railCount) && (
              <div className={gridClass}>
                {products.slice(Math.min(4, railCount)).map((p, i) => (
                  <TrendCard
                    key={p._id}
                    product={p}
                    index={i + Math.min(4, railCount)}
                    onAdd={handleAdd}
                    cardDensity={cardDensity}
                    layout="vertical"
                  />
                ))}
              </div>
            )}
          </>
        ) : products.length > 0 && layoutMode === 'horizontal_carousel' ? (
          <div
            className="flex gap-4 overflow-x-auto pb-4 scroll-touch"
            style={{ scrollbarWidth: 'none' }}
          >
            {products.map((p, i) => (
              <div key={p._id} className="flex-shrink-0 w-[min(72vw,260px)]">
                <TrendCard product={p} index={i} onAdd={handleAdd} cardDensity={cardDensity} />
              </div>
            ))}
          </div>
        ) : products.length > 0 ? (
          <div className={gridClass}>
            {products.map((p, i) => (
              <TrendCard
                key={p._id}
                product={p}
                index={i}
                onAdd={handleAdd}
                cardDensity={cardDensity}
              />
            ))}
          </div>
        ) : (
          <div
            className="rounded-2xl p-8 text-center"
            style={{
              background: 'var(--bg-tertiary)',
              color: 'var(--text-muted)',
            }}
          >
            Products will appear here once available.
          </div>
        )}
      </div>
    </section>
  );
}
