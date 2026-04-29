import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { Star, ShoppingCart, Heart, TrendingUp, Zap } from 'lucide-react';
import { productAPI } from '../../services/api';
import { useBuyerCart } from '../../stores/buyerCartStore';
import { useTheme } from '../../contexts/ThemeContext';
import { SERVER_URL } from '../../lib/config';

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
function TrendCard({ product, index, isDark, onAdd }) {
  const [wished, setWished] = useState(false);
  const [adding, setAdding] = useState(false);
  const img = resolveImg(product.thumbnail || product.images?.[0]);
  const discount = product.discount || (product.originalPrice ? Math.round((1 - product.price / product.originalPrice) * 100) : 0);

  const handleAdd = async (e) => {
    e.preventDefault();
    setAdding(true);
    await onAdd(product);
    setTimeout(() => setAdding(false), 800);
  };

  return (
    <motion.div
      className="group relative flex-shrink-0 w-56 sm:w-auto"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        to={`/products/${product._id}`}
        className="block rounded-2xl overflow-hidden"
        style={{
          background: isDark ? 'var(--bg-card, #1a1d2e)' : '#fff',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
          boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.35)' : '0 2px 16px rgba(0,0,0,0.07)',
          transition: 'box-shadow 0.3s, transform 0.3s',
        }}
      >
        {/* Image */}
        <div className="relative overflow-hidden" style={{ aspectRatio: '1', background: isDark ? '#141520' : '#f5f5f7' }}>
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
              style={{ background: '#ef4444', color: '#fff' }}
            >
              -{discount}%
            </div>
          )}

          {/* Trending badge */}
          <div
            className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
            style={{ background: isDark ? 'rgba(99,102,241,0.85)' : 'rgba(99,102,241,0.9)', color: '#fff' }}
          >
            <TrendingUp size={10} />
            HOT
          </div>

          {/* Wishlist button */}
          <button
            onClick={(e) => { e.preventDefault(); setWished(!wished); }}
            className="absolute top-10 right-2.5 w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300"
            style={{
              background: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.9)',
              backdropFilter: 'blur(8px)',
            }}
            aria-label="Add to wishlist"
          >
            <Heart size={12} fill={wished ? '#ef4444' : 'none'} stroke={wished ? '#ef4444' : 'currentColor'} />
          </button>

          {/* Quick add overlay */}
          <div className="absolute bottom-0 left-0 right-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
            <button
              onClick={handleAdd}
              className="w-full py-2.5 flex items-center justify-center gap-2 text-xs font-bold tracking-wide"
              style={{
                background: isDark ? '#6366f1' : '#0f172a',
                color: '#fff',
              }}
            >
              <ShoppingCart size={13} />
              {adding ? 'ADDED ✓' : 'QUICK ADD'}
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="p-3">
          <p
            className="text-xs font-medium line-clamp-2 leading-snug mb-2"
            style={{ color: isDark ? '#e2e4ed' : '#0f172a' }}
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
                  fill={n <= Math.round(product.rating || 4.5) ? '#f59e0b' : 'none'}
                  stroke={n <= Math.round(product.rating || 4.5) ? '#f59e0b' : (isDark ? '#3d4159' : '#d1d5db')}
                />
              ))}
            </div>
            <span className="text-xs" style={{ color: isDark ? '#616680' : '#9ca3af' }}>
              ({product.reviewCount || product.review_count || 0})
            </span>
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-2">
            <span className="font-bold text-sm" style={{ color: isDark ? '#e2e4ed' : '#0f172a' }}>
              ${product.price}
            </span>
            {product.originalPrice && (
              <span className="text-xs line-through" style={{ color: isDark ? '#3d4159' : '#9ca3af' }}>
                ${product.originalPrice}
              </span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

/* ─── Section ────────────────────────────────────────────────────────────── */
export default function TrendingProducts() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { addItem } = useBuyerCart();
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

    productAPI
      .getProducts({ limit: 8, sort: '-rating' })
      .then(res => {
        const list = Array.isArray(res) ? res : (res?.products || res?.data || []);
        const next = list.slice(0, 8);
        setProducts(next);
        trendingCache = { data: next, ts: Date.now() };
      })
      .catch(() => {
        setProducts(FALLBACK_PRODUCTS);
        trendingCache = { data: FALLBACK_PRODUCTS, ts: Date.now() };
      })
      .finally(() => setLoading(false));
  }, []);

  const handleAdd = (product) => {
    addItem({
      productId: product._id,
      name: product.name,
      price: product.price,
      image: resolveImg(product.thumbnail || product.images?.[0]),
      quantity: 1,
    });
  };

  return (
    <section
      className="w-full py-20"
      style={{ background: isDark ? 'var(--bg-secondary, #10121c)' : '#fff' }}
    >
      <div className="px-4 sm:px-6 lg:px-10 xl:px-16">
        {/* Header */}
        <div ref={headerRef} className="flex items-end justify-between mb-10">
          <div>
            <motion.p
              className="text-xs font-semibold tracking-[0.2em] uppercase mb-2 flex items-center gap-2"
              style={{ color: isDark ? '#616680' : '#9ca3af' }}
              initial={{ opacity: 0, y: 12 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5 }}
            >
              <Zap size={12} style={{ color: '#f59e0b' }} />
              What&apos;s Hot
            </motion.p>
            <motion.h2
              className="font-black leading-none"
              style={{
                color: isDark ? '#e2e4ed' : '#0f172a',
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
              className="hidden sm:flex items-center gap-2 text-xs font-semibold tracking-wide"
              style={{ color: isDark ? '#6366f1' : '#6366f1' }}
            >
              View all <span>→</span>
            </Link>
          </motion.div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl overflow-hidden"
                style={{ background: isDark ? '#1a1d2e' : '#f5f5f7', aspectRatio: '0.8' }}
              >
                <div className="w-full h-3/5" style={{ background: isDark ? '#141520' : '#ebebed', animation: 'pulse 1.5s ease-in-out infinite' }} />
                <div className="p-3 space-y-2">
                  <div className="h-3 rounded" style={{ background: isDark ? '#1e2235' : '#e5e7eb', width: '75%' }} />
                  <div className="h-3 rounded" style={{ background: isDark ? '#1e2235' : '#e5e7eb', width: '50%' }} />
                </div>
              </div>
            ))}
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {products.map((p, i) => (
              <TrendCard
                key={p._id}
                product={p}
                index={i}
                isDark={isDark}
                onAdd={handleAdd}
              />
            ))}
          </div>
        ) : (
          <div
            className="rounded-2xl p-8 text-center"
            style={{
              background: isDark ? 'rgba(255,255,255,0.03)' : '#f5f5f7',
              color: isDark ? '#9da3be' : '#64748b',
            }}
          >
            Products will appear here once available.
          </div>
        )}
      </div>
    </section>
  );
}
