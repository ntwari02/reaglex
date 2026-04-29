import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { Star, Award, ChevronLeft, ChevronRight } from 'lucide-react';
import { productAPI } from '../../services/api';
import { useTheme } from '../../contexts/ThemeContext';
import { SERVER_URL } from '../../lib/config';

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
  { bg: '#f59e0b', color: '#fff' },
  { bg: '#94a3b8', color: '#fff' },
  { bg: '#cd7f32', color: '#fff' },
];

/* ─── Single best seller card ────────────────────────────────────────────── */
function BestCard({ product, rank, isDark }) {
  const img = resolveImg(product.thumbnail || product.images?.[0]);
  const rankStyle = RANK_STYLE[rank] || { bg: isDark ? '#1e2235' : '#f1f5f9', color: isDark ? '#9da3be' : '#64748b' };

  return (
    <motion.div
      className="flex-shrink-0 group"
      style={{ width: 'clamp(220px, 22vw, 260px)' }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.25 }}
    >
      <Link
        to={`/products/${product._id}`}
        className="block rounded-2xl overflow-hidden"
        style={{
          background: isDark ? 'var(--bg-card, #1a1d2e)' : '#fff',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'}`,
          boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 2px 12px rgba(0,0,0,0.06)',
        }}
      >
        {/* Image */}
        <div
          className="relative overflow-hidden"
          style={{ aspectRatio: '1 / 1', background: isDark ? '#141520' : '#f5f5f7' }}
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
            style={{ background: rankStyle.bg, color: rankStyle.color, boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}
          >
            #{rank + 1}
          </div>

          {/* Text badge */}
          {product.badge && (
            <div
              className="absolute bottom-3 right-3 px-2 py-0.5 rounded-full text-xs font-semibold"
              style={{
                background: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.9)',
                color: isDark ? '#9da3be' : '#374151',
                backdropFilter: 'blur(8px)',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
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
            style={{ color: isDark ? '#e2e4ed' : '#0f172a' }}
          >
            {product.name}
          </p>

          <div className="flex items-center gap-1.5 mb-3">
            <div className="flex">
              {[1,2,3,4,5].map(n => (
                <Star
                  key={n}
                  size={11}
                  fill={n <= Math.round(product.rating || 4.5) ? '#f59e0b' : 'none'}
                  stroke={n <= Math.round(product.rating || 4.5) ? '#f59e0b' : (isDark ? '#3d4159' : '#d1d5db')}
                />
              ))}
            </div>
            <span className="text-xs font-medium" style={{ color: isDark ? '#9da3be' : '#374151' }}>
              {(product.rating || 4.5).toFixed(1)}
            </span>
            <span className="text-xs" style={{ color: isDark ? '#3d4159' : '#9ca3af' }}>
              ({(product.reviewCount || product.review_count || 0).toLocaleString()})
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="font-black text-base" style={{ color: isDark ? '#e2e4ed' : '#0f172a' }}>
              ${product.price}
            </span>
            <span
              className="text-xs px-2.5 py-1 rounded-full font-semibold"
              style={{
                background: isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.1)',
                color: '#6366f1',
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
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
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

    productAPI
      .getProducts({ limit: 8, sort: '-reviewCount' })
      .then(res => {
        const list = Array.isArray(res) ? res : (res?.products || res?.data || []);
        const next = list.slice(0, 8);
        setProducts(next);
        bestCache = { data: next, ts: Date.now() };
      })
      .catch(() => {
        setProducts(FALLBACK);
        bestCache = { data: FALLBACK, ts: Date.now() };
      })
      .finally(() => setLoading(false));
  }, []);

  const scroll = (dir) => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir * 280, behavior: 'smooth' });
  };

  return (
    <section
      className="w-full py-20"
      style={{ background: isDark ? 'var(--bg-primary, #0d0f1c)' : '#f8f8f8' }}
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
              <Award size={12} style={{ color: '#f59e0b' }} />
              Most Popular
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
              BEST SELLERS
            </motion.h2>
          </div>

          {/* Scroll arrows */}
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={() => scroll(-1)}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200"
              style={{
                background: isDark ? 'rgba(255,255,255,0.06)' : '#fff',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                color: isDark ? '#9da3be' : '#374151',
              }}
              aria-label="Scroll left"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => scroll(1)}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200"
              style={{
                background: isDark ? 'rgba(255,255,255,0.06)' : '#fff',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                color: isDark ? '#9da3be' : '#374151',
              }}
              aria-label="Scroll right"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal scroll strip */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-4"
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
                  background: isDark ? '#1a1d2e' : '#f5f5f7',
                  animation: 'pulse 1.5s ease-in-out infinite',
                }}
              />
            ))
          : products.length > 0
          ? products.map((p, i) => (
              <BestCard key={p._id} product={p} rank={i} isDark={isDark} />
            ))
          : (
            <div
              className="w-full rounded-2xl p-8 text-center"
              style={{
                background: isDark ? 'rgba(255,255,255,0.03)' : '#f5f5f7',
                color: isDark ? '#9da3be' : '#64748b',
              }}
            >
              Best seller products will appear here once available.
            </div>
          )}
      </div>
    </section>
  );
}
