import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronRight, Clock, Star, Zap, Tag, TrendingUp, Eye, ShoppingBag, ArrowRight } from 'lucide-react';
import BuyerLayout from '../components/buyer/BuyerLayout';
import HeroProduct from '../components/HeroProduct';
import ProductCarousel from '../components/ProductCarousel';
import ProductGrid from '../components/ProductGrid';
import ProductCard from '../components/ProductCard';
import { productAPI } from '../services/api';
import { useRecentlyViewed } from '../stores/recentlyViewedStore';
import { useBuyerCart } from '../stores/buyerCartStore';
import { useSeo } from '../utils/useSeo';

import { SERVER_URL } from '../lib/config';
const resolveImg = (src) => {
  if (!src) return 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80';
  if (src.startsWith('http')) return src;
  return `${SERVER_URL}${src}`;
};

// ── Static categories ─────────────────────────────────────────────────────────
const CATEGORIES = [
  { icon: '📱', label: 'Electronics',  q: 'electronics' },
  { icon: '👗', label: 'Fashion',      q: 'fashion' },
  { icon: '🏠', label: 'Home & Garden',q: 'home' },
  { icon: '⚽', label: 'Sports',       q: 'sports' },
  { icon: '📚', label: 'Books',        q: 'books' },
  { icon: '🧸', label: 'Toys',         q: 'toys' },
  { icon: '💄', label: 'Beauty',       q: 'beauty' },
  { icon: '🚗', label: 'Automotive',   q: 'automotive' },
  { icon: '🍔', label: 'Food',         q: 'food' },
  { icon: '🎮', label: 'Gaming',       q: 'gaming' },
  { icon: '🌿', label: 'Health',       q: 'health' },
  { icon: '🛠️', label: 'Tools',        q: 'tools' },
];

// ── Promo banners ─────────────────────────────────────────────────────────────
const BANNERS = [
  {
    title: 'Mega Sale — Up to 70% Off',
    sub: 'Biggest deals of the season. Limited time only.',
    cta: 'Shop Now',
    href: '/search?sort=discount',
    bg: 'linear-gradient(135deg,#ff8c42 0%,#ff5f00 100%)',
    emoji: '🔥',
  },
  {
    title: 'Free Shipping on Orders $30+',
    sub: 'Shop from hundreds of verified sellers worldwide.',
    cta: 'Browse All',
    href: '/search',
    bg: 'linear-gradient(135deg,#6c63ff 0%,#4f46e5 100%)',
    emoji: '🚀',
  },
  {
    title: 'New Arrivals Every Day',
    sub: 'Fresh products added daily from top sellers.',
    cta: 'See New',
    href: '/search?sort=newest',
    bg: 'linear-gradient(135deg,#059669 0%,#047857 100%)',
    emoji: '✨',
  },
];

// ── Flash Sale countdown hook ─────────────────────────────────────────────────
function useCountdown(targetHours = 6) {
  const end = useRef(Date.now() + targetHours * 3600 * 1000);
  const [time, setTime] = useState({ h: targetHours, m: 0, s: 0 });

  useEffect(() => {
    const tick = () => {
      const diff = Math.max(0, end.current - Date.now());
      setTime({
        h: Math.floor(diff / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return time;
}

const pad = (n) => String(n).padStart(2, '0');

// ── Reusable section header ───────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, subtitle, href, color = '#ff8c42' }) {
  return (
    <div className="flex items-end justify-between mb-5">
      <div className="flex items-center gap-3">
        <div className="w-1.5 h-7 rounded-full" style={{ background: color }} />
        <div>
          <div className="flex items-center gap-2">
            {Icon && <Icon className="w-4 h-4" style={{ color }} />}
            <h2
              className="text-lg font-black"
              style={{ color: 'var(--text-primary)', letterSpacing: '-0.3px' }}
            >
              {title}
            </h2>
          </div>
          {subtitle && (
            <p
              className="text-xs mt-0.5"
              style={{ color: 'var(--text-muted)' }}
            >
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {href && (
        <Link to={href} className="flex items-center gap-1 text-xs font-semibold hover:underline transition"
          style={{ color }}>
          See all <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function Home() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [heroProduct, setHeroProduct]   = useState(null);
  const [allProducts, setAllProducts]   = useState([]);
  const [loadingFeatured, setLoadingFeatured] = useState(true);
  const [featuredError, setFeaturedError] = useState(null);
  const [activeBanner, setActiveBanner] = useState(0);
  const countdown = useCountdown(5);

  const recentItems = useRecentlyViewed((s) => s.items);

  const canonicalUrl = `${window.location.origin}/`;
  useSeo({
    title: 'REAGLE-X | Shop',
    description:
      'REAGLE-X - Shop trending products from verified sellers. Secure checkout, fast shipping, and protected payments.',
    canonicalUrl,
    openGraph: {
      title: 'REAGLE-X | Shop',
      description:
        'REAGLE-X - Shop trending products from verified sellers. Secure checkout, fast shipping, and protected payments.',
      image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1200&q=80',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'REAGLE-X | Shop',
      description:
        'REAGLE-X - Shop trending products from verified sellers. Secure checkout, fast shipping, and protected payments.',
      image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1200&q=80',
    },
    jsonLdScriptId: 'reaglex-jsonld-website',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'REAGLE-X',
      url: canonicalUrl,
    },
  });

  // Auto-rotate banners
  useEffect(() => {
    const id = setInterval(() => setActiveBanner(p => (p + 1) % BANNERS.length), 4500);
    return () => clearInterval(id);
  }, []);

  const fetchFeatured = useCallback(async () => {
    setLoadingFeatured(true);
    setFeaturedError(null);
    try {
      const data = await productAPI.getProducts({ limit: 16, page: 1 });
      const items = Array.isArray(data) ? data : data.products || data.data || data.items || [];
      setAllProducts(items);
      setFeaturedProducts(items.slice(0, 8));
      if (items.length > 0) setHeroProduct(items[0]);
    } catch (err) {
      const isTimeout = err?.code === 'ECONNABORTED' || err?.message?.includes('timeout');
      setFeaturedError(isTimeout ? 'Server is slow — start the backend on port 5000.' : 'Could not load products.');
    } finally {
      setLoadingFeatured(false);
    }
  }, []);

  useEffect(() => { fetchFeatured(); }, [fetchFeatured]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchInput.trim()) navigate(`/search?q=${encodeURIComponent(searchInput.trim())}`);
  };

  // Derived slices
  const deals     = allProducts.filter(p => p.compareAtPrice || p.originalPrice).slice(0, 4);
  const topRated  = [...allProducts].sort((a,b) => (b.averageRating||b.rating||0) - (a.averageRating||a.rating||0)).slice(0, 4);
  const flashSale = allProducts.filter(p => p.compareAtPrice || p.originalPrice).slice(0, 6);

  return (
    <BuyerLayout>
      <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-16 pb-20 space-y-12">

        {/* ── Hero Search Bar ── */}
        <motion.section
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="pt-8"
        >
          <div className="text-center mb-6">
            <h1
              className="text-3xl sm:text-4xl font-black mb-2"
              style={{ color: 'var(--text-primary)', letterSpacing: '-1px' }}
            >
              Find anything you need
            </h1>
            <p
              className="text-sm"
              style={{ color: 'var(--text-muted)' }}
            >
              Thousands of products from verified sellers
            </p>
          </div>

          <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
            <div className="flex gap-2">
              <div
                className="flex-1 flex items-center rounded-2xl overflow-hidden px-4 gap-3"
                style={{ background: 'var(--search-bg)', boxShadow: 'var(--shadow-md)', border: '2px solid transparent' }}
              >
                <Search className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--text-faint)' }} />
                <input
                  type="text"
                  placeholder='Search products, brands, sellers…'
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  className="flex-1 py-3.5 text-sm outline-none bg-transparent"
                  style={{ color: 'var(--input-text)' }}
                />
              </div>
              <motion.button
                type="submit"
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                className="px-6 py-3 rounded-2xl text-white font-semibold text-sm"
                style={{ background: 'linear-gradient(135deg,#ff8c42,#ff5f00)', boxShadow: '0 6px 20px rgba(255,140,66,0.35)' }}
              >
                Search
              </motion.button>
            </div>
          </form>

          {/* Quick category pills */}
          <div className="flex gap-2 flex-wrap justify-center mt-4">
            {['Electronics','Fashion','Sports','Gaming','Beauty'].map(c => (
              <Link key={c} to={`/search?q=${c.toLowerCase()}`}
                className="px-3 py-1 rounded-full text-xs font-medium transition hover:shadow-md"
                style={{
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-secondary)',
                  border: '1px solid transparent',
                }}
              >
                {c}
              </Link>
            ))}
          </div>
        </motion.section>

        {/* ── Promo Banners ── */}
        <section>
          <div className="relative rounded-3xl overflow-hidden" style={{ minHeight: '160px' }}>
            <AnimatePresence mode="wait">
              {BANNERS.map((b, i) => i === activeBanner && (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  transition={{ duration: 0.45 }}
                  className="flex items-center justify-between px-8 py-10 sm:px-12"
                  style={{ background: b.bg }}
                >
                  <div>
                    <p className="text-4xl mb-2">{b.emoji}</p>
                    <h3 className="text-xl sm:text-2xl font-black text-white mb-1">{b.title}</h3>
                    <p className="text-sm text-white/80 mb-4">{b.sub}</p>
                    <Link to={b.href}>
                      <motion.button
                        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
                        className="px-5 py-2 rounded-xl font-bold text-sm"
                        style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: '2px solid rgba(255,255,255,0.4)' }}>
                        {b.cta} →
                      </motion.button>
                    </Link>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {/* Dots */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {BANNERS.map((_, i) => (
                <button key={i} onClick={() => setActiveBanner(i)}
                  className="h-1.5 rounded-full transition-all"
                  style={{ width: i === activeBanner ? 20 : 6, background: i === activeBanner ? 'white' : 'rgba(255,255,255,0.5)' }} />
              ))}
            </div>
          </div>
        </section>

        {/* ── Categories ── */}
        <section>
          <SectionHeader icon={Tag} title="Browse Categories" href="/search" color="#6c63ff" />
          <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
            {CATEGORIES.map(({ icon, label, q }) => (
              <Link key={q} to={`/search?q=${q}`}>
                <motion.div
                  whileHover={{ y: -4, boxShadow: '0 12px 28px rgba(0,0,0,0.12)' }}
                  className="flex-shrink-0 flex flex-col items-center gap-2 px-5 py-4 rounded-2xl cursor-pointer"
                  style={{ background: 'white', boxShadow: '0 4px 14px rgba(0,0,0,0.06)', minWidth: '88px' }}
                >
                  <span className="text-2xl">{icon}</span>
                  <span className="text-xs font-semibold text-center whitespace-nowrap" style={{ color: '#374151' }}>{label}</span>
                </motion.div>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Browse Collection carousel ── */}
        {featuredProducts.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-3 px-1">
              <div className="w-1 h-4 rounded-full flex-shrink-0" style={{ background: 'linear-gradient(180deg,#ff8c42,#ff5f00)' }} />
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#9ca3af' }}>Browse Collection</span>
            </div>
            <ProductCarousel
              products={featuredProducts}
              activeId={heroProduct?._id || heroProduct?.id}
              onSelect={setHeroProduct}
              compact
            />
          </section>
        )}

        {/* ── Hero Product ── */}
        <section>
          {loadingFeatured && !heroProduct ? (
            <div className="flex flex-col items-center justify-center h-80 gap-4">
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                className="w-12 h-12 rounded-full border-4 border-orange-200 border-t-orange-500" />
              <p className="text-sm" style={{ color: '#9ca3af' }}>Loading products…</p>
            </div>
          ) : featuredError ? (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center h-64 gap-4 rounded-3xl"
              style={{ background: 'rgba(255,255,255,0.7)', border: '1px dashed #e5e7eb' }}>
              <span className="text-4xl">⚡</span>
              <p className="font-semibold text-sm text-center px-8" style={{ color: '#6b7280' }}>{featuredError}</p>
              <motion.button whileTap={{ scale: 0.97 }} onClick={fetchFeatured}
                className="px-5 py-2 rounded-xl text-white text-sm font-semibold"
                style={{ background: 'linear-gradient(135deg,#ff8c42,#ff5f00)' }}>
                Retry
              </motion.button>
            </motion.div>
          ) : (
            <HeroProduct product={heroProduct} />
          )}
        </section>

        {/* ── Flash Sale ── */}
        {(flashSale.length > 0 || !loadingFeatured) && (
          <section>
            <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-7 rounded-full" style={{ background: '#ef4444' }} />
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4" style={{ color: '#ef4444' }} />
                  <h2 className="text-lg font-black" style={{ color: '#1a1a1a' }}>Flash Sale</h2>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" style={{ color: '#ef4444' }} />
                <span className="text-xs font-semibold" style={{ color: '#6b7280' }}>Ends in:</span>
                {[pad(countdown.h), pad(countdown.m), pad(countdown.s)].map((v, i) => (
                  <span key={i} className="flex items-center gap-1">
                    <AnimatePresence mode="wait">
                      <motion.span key={v} initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 8, opacity: 0 }} transition={{ duration: 0.15 }}
                        className="inline-block w-8 text-center font-black text-sm rounded-lg py-1"
                        style={{ background: '#1a1a1a', color: 'white' }}>
                        {v}
                      </motion.span>
                    </AnimatePresence>
                    {i < 2 && <span className="font-bold text-sm" style={{ color: '#9ca3af' }}>:</span>}
                  </span>
                ))}
              </div>
            </div>

            {flashSale.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                {flashSale.map((p, i) => (
                  <ProductCard key={p._id || p.id || i} product={p} index={i} />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                {allProducts.slice(0, 8).map((p, i) => (
                  <ProductCard key={p._id || p.id || i} product={p} index={i} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── Deals & Discounts ── */}
        {(deals.length > 0 || allProducts.length > 4) && (
          <section>
            <SectionHeader icon={TrendingUp} title="Deals & Discounts" subtitle="Best value products right now"
              href="/search?sort=discount" color="#ef4444" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-5">
              {(deals.length > 0 ? deals : allProducts.slice(4, 8)).map((p, i) => (
                <ProductCard key={p._id || p.id || i} product={p} index={i} />
              ))}
            </div>
          </section>
        )}

        {/* ── Top Rated ── */}
        {topRated.length > 0 && (
          <section>
            <SectionHeader icon={Star} title="Top Rated Products" subtitle="Highest rated by our community"
              href="/search?sort=rating" color="#f59e0b" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-5">
              {topRated.map((p, i) => (
                <ProductCard key={p._id || p.id || i} product={p} index={i} />
              ))}
            </div>
          </section>
        )}

        {/* ── Recently Viewed ── */}
        {recentItems.length > 0 && (
          <section>
            <SectionHeader icon={Eye} title="Recently Viewed" href="/search" color="#6c63ff" />
            <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
              {recentItems.map((p, i) => (
                <Link key={p._id || p.id || i} to={`/products/${p._id || p.id}`}>
                  <motion.div
                    whileHover={{ y: -6, boxShadow: '0 16px 40px rgba(0,0,0,0.12)' }}
                    className="flex-shrink-0 rounded-2xl overflow-hidden"
                    style={{ width: 140, background: 'white', boxShadow: '0 4px 14px rgba(0,0,0,0.07)' }}
                  >
                    <div style={{ height: 100, background: '#f9fafb' }}>
                      <img src={resolveImg(p.image)} alt={p.title}
                        className="w-full h-full object-cover"
                        onError={e => { e.target.src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&q=80'; }} />
                    </div>
                    <div className="p-2.5">
                      <p className="text-xs font-semibold truncate" style={{ color: '#1a1a1a' }}>{p.title}</p>
                      <p className="text-xs font-bold mt-0.5" style={{ color: '#ff8c42' }}>${(p.price || 0).toFixed(2)}</p>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Buyer Trust Strip ── */}
        <section>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-4">
            {[
              { icon: '🔒', title: 'Buyer Protection', sub: 'Full refund if item not received' },
              { icon: '🚚', title: 'Fast Delivery', sub: 'Ships within 24–48 hours' },
              { icon: '✅', title: 'Verified Sellers', sub: 'All sellers are KYC-verified' },
              { icon: '💳', title: 'Secure Payments', sub: 'Escrow-protected transactions' },
            ].map(({ icon, title, sub }) => (
              <motion.div key={title} whileHover={{ y: -3 }}
                className="flex items-start gap-3 p-4 rounded-2xl"
                style={{ background: 'white', boxShadow: '0 4px 14px rgba(0,0,0,0.06)' }}>
                <span className="text-2xl flex-shrink-0">{icon}</span>
                <div>
                  <p className="text-xs font-bold" style={{ color: '#1a1a1a' }}>{title}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#9ca3af' }}>{sub}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── Divider ── */}
        <div className="border-t border-white/60" />

        {/* ── Full Product Grid (search-driven) ── */}
        <section>
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-6 rounded-full" style={{ background: 'linear-gradient(180deg,#6c63ff,#a78bfa)' }} />
              <h2 className="text-lg font-bold" style={{ color: '#1a1a1a' }}>
                {searchQuery ? `Results for "${searchQuery}"` : 'Explore All Products'}
              </h2>
            </div>
            <Link to="/search" className="flex items-center gap-1.5 text-xs font-semibold hover:underline"
              style={{ color: '#6c63ff' }}>
              Advanced Search <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <ProductGrid searchQuery={searchQuery} />
        </section>
      </div>
    </BuyerLayout>
  );
}
