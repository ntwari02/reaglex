import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { Star, ShoppingCart, Sparkles, Heart } from 'lucide-react';
import { productAPI } from '../../services/api';
import { useBuyerCart } from '../../stores/buyerCartStore';
import { useTheme } from '../../contexts/ThemeContext';
import { SERVER_URL } from '../../lib/config';

const resolveImg = (src) => {
  if (!src) return 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80';
  if (src.startsWith('http')) return src;
  return `${SERVER_URL}${src}`;
};

const FALLBACK = [
  { _id: 'r1', name: 'Vintage Film Camera', price: 165, rating: 4.8, reviewCount: 92, thumbnail: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=500&q=85' },
  { _id: 'r2', name: 'Scented Soy Candle', price: 22, rating: 4.9, reviewCount: 341, thumbnail: 'https://images.unsplash.com/photo-1602028915047-37269d1a73f7?w=500&q=85' },
  { _id: 'r3', name: 'Wooden Chess Set', price: 58, rating: 4.7, reviewCount: 136, thumbnail: 'https://images.unsplash.com/photo-1586165368502-1bad197a6461?w=500&q=85' },
  { _id: 'r4', name: 'Matcha Tea Gift Set', price: 38, rating: 4.8, reviewCount: 215, thumbnail: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500&q=85' },
  { _id: 'r5', name: 'Minimalist Backpack', price: 79, rating: 4.6, reviewCount: 284, thumbnail: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500&q=85' },
  { _id: 'r6', name: 'Gold Hoop Earrings', price: 34, rating: 4.7, reviewCount: 178, thumbnail: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=500&q=85' },
  { _id: 'r7', name: 'Smart Plant Sensor', price: 45, rating: 4.5, reviewCount: 99, thumbnail: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500&q=85' },
  { _id: 'r8', name: 'Leather Journal', price: 29, rating: 4.9, reviewCount: 430, thumbnail: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500&q=85' },
];

const RECOMMENDED_CACHE_TTL = 5 * 60 * 1000;
const recommendedCache = new Map();

/* ─── Rec card ───────────────────────────────────────────────────────────── */
function RecCard({ product, index, isDark, onAdd }) {
  const [wished, setWished] = useState(false);
  const [adding, setAdding] = useState(false);
  const img = resolveImg(product.thumbnail || product.images?.[0]);

  const handleAdd = async (e) => {
    e.preventDefault();
    setAdding(true);
    await onAdd(product);
    setTimeout(() => setAdding(false), 800);
  };

  return (
    <motion.div
      className="group"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        to={`/products/${product._id}`}
        className="block rounded-2xl overflow-hidden transition-all duration-300 group-hover:-translate-y-1"
        style={{
          background: isDark ? 'var(--bg-card, #1a1d2e)' : '#fff',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'}`,
          boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.3)' : '0 2px 12px rgba(0,0,0,0.06)',
        }}
      >
        {/* Image */}
        <div
          className="relative overflow-hidden"
          style={{ aspectRatio: '1', background: isDark ? '#141520' : '#f5f5f7' }}
        >
          <img
            src={img}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-108"
            loading="lazy"
            decoding="async"
            width="500"
            height="500"
          />

          {/* For You badge */}
          <div
            className="absolute top-2.5 left-2.5 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
            style={{ background: 'rgba(236,72,153,0.85)', color: '#fff' }}
          >
            <Sparkles size={9} />
            For You
          </div>

          {/* Wishlist */}
          <button
            onClick={(e) => { e.preventDefault(); setWished(!wished); }}
            className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300"
            style={{
              background: isDark ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.9)',
              backdropFilter: 'blur(8px)',
            }}
            aria-label="Wishlist"
          >
            <Heart size={12} fill={wished ? '#ef4444' : 'none'} stroke={wished ? '#ef4444' : 'currentColor'} />
          </button>

          {/* Quick add */}
          <div className="absolute bottom-0 left-0 right-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
            <button
              onClick={handleAdd}
              className="w-full py-2.5 flex items-center justify-center gap-2 text-xs font-bold"
              style={{
                background: isDark ? '#ec4899' : '#0f172a',
                color: '#fff',
              }}
            >
              <ShoppingCart size={12} />
              {adding ? 'ADDED ✓' : 'ADD TO CART'}
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="p-3">
          <p
            className="font-semibold text-xs line-clamp-2 leading-snug mb-2"
            style={{ color: isDark ? '#e2e4ed' : '#0f172a' }}
          >
            {product.name}
          </p>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Star size={10} fill="#f59e0b" stroke="#f59e0b" />
              <span className="text-xs font-medium" style={{ color: isDark ? '#9da3be' : '#374151' }}>
                {(product.rating || 4.5).toFixed(1)}
              </span>
            </div>
            <span className="font-bold text-sm" style={{ color: isDark ? '#e2e4ed' : '#0f172a' }}>
              ${product.price}
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

/* ─── Filter tabs ────────────────────────────────────────────────────────── */
const TABS = ['For You', 'New Arrivals', 'Popular', 'Deals'];

/* ─── Section ────────────────────────────────────────────────────────────── */
export default function RecommendedSection() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { addItem } = useBuyerCart();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const headerRef = useRef(null);
  const inView = useInView(headerRef, { once: true, margin: '-80px' });

  const sortParam = ['', '-createdAt', '-rating', '-discount'][activeTab] || '';

  useEffect(() => {
    setLoading(true);
    const params = { limit: 8 };
    if (sortParam) params.sort = sortParam;
    const key = sortParam || 'default';
    const now = Date.now();
    const cached = recommendedCache.get(key);
    if (cached && now - cached.ts < RECOMMENDED_CACHE_TTL) {
      setProducts(cached.data);
      setLoading(false);
      return;
    }

    productAPI
      .getProducts(params)
      .then(res => {
        const list = Array.isArray(res) ? res : (res?.products || res?.data || []);
        const next = list.slice(0, 8);
        setProducts(next);
        recommendedCache.set(key, { data: next, ts: Date.now() });
      })
      .catch(() => {
        setProducts(FALLBACK);
        recommendedCache.set(key, { data: FALLBACK, ts: Date.now() });
      })
      .finally(() => setLoading(false));
  }, [activeTab, sortParam]);

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
      className="w-full px-4 sm:px-6 lg:px-10 xl:px-16 py-20"
      style={{ background: isDark ? 'var(--bg-primary, #0d0f1c)' : '#f8f8f8' }}
    >
      {/* Header */}
      <div ref={headerRef} className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-10">
        <div>
          <motion.p
            className="text-xs font-semibold tracking-[0.2em] uppercase mb-2 flex items-center gap-2"
            style={{ color: isDark ? '#616680' : '#9ca3af' }}
            initial={{ opacity: 0, y: 12 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
          >
            <Sparkles size={12} style={{ color: '#ec4899' }} />
            Picked For You
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
            RECOMMENDED
          </motion.h2>
        </div>

        {/* Tab pills */}
        <motion.div
          className="flex gap-2 flex-wrap"
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {TABS.map((tab, i) => (
            <button
              key={tab}
              onClick={() => setActiveTab(i)}
              className="px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200"
              style={
                i === activeTab
                  ? {
                      background: isDark ? '#6366f1' : '#0f172a',
                      color: '#fff',
                    }
                  : {
                      background: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
                      color: isDark ? '#616680' : '#6b7280',
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                    }
              }
            >
              {tab}
            </button>
          ))}
        </motion.div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl overflow-hidden"
              style={{
                background: isDark ? '#1a1d2e' : '#f5f5f7',
                aspectRatio: '0.8',
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            />
          ))}
        </div>
      ) : products.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {products.map((p, i) => (
            <RecCard key={p._id} product={p} index={i} isDark={isDark} onAdd={handleAdd} />
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
          Recommended products will appear here once available.
        </div>
      )}

      {/* View more */}
      <motion.div
        className="mt-10 text-center"
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <Link
          to="/search"
          className="inline-flex items-center gap-3 px-8 py-3.5 rounded-full text-xs font-bold tracking-[0.15em] uppercase transition-all duration-300"
          style={{
            background: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
            color: isDark ? '#e2e4ed' : '#0f172a',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
            boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.2)' : '0 2px 10px rgba(0,0,0,0.06)',
          }}
        >
          DISCOVER MORE
          <span>→</span>
        </Link>
      </motion.div>
    </section>
  );
}
