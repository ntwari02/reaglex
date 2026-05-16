import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';
import { productAPI } from '../../services/api';
import { homeFeedApi } from '../../services/homeFeedApi';
import PremiumProductCard from './PremiumProductCard';
import PremiumCasualHero from './PremiumCasualHero';
import PremiumCategoryChips from './PremiumCategoryChips';

const FALLBACK_PRODUCTS = [
  { _id: 'f1', name: 'Wireless Headphones Pro', price: 129, rating: 4.8, reviewCount: 324, thumbnail: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=80' },
  { _id: 'f2', name: 'Minimal Runner', price: 89, rating: 4.6, reviewCount: 512, thumbnail: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80' },
  { _id: 'f3', name: 'Everyday Tote', price: 68, rating: 4.5, reviewCount: 187, thumbnail: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&q=80' },
  { _id: 'f4', name: 'Desk Lamp Oak', price: 49, rating: 4.4, reviewCount: 143, thumbnail: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400&q=80' },
  { _id: 'f5', name: 'Smart Watch', price: 249, rating: 4.7, reviewCount: 218, thumbnail: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80' },
  { _id: 'f6', name: 'Polaroid Camera', price: 75, rating: 4.7, reviewCount: 290, thumbnail: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400&q=80' },
];

export default function PremiumMobileHome() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [cat, setCat] = useState('all');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    homeFeedApi
      .getSection('trending', { limit: 8 })
      .then((section) => {
        const list = Array.isArray(section?.products) ? section.products : [];
        if (!list.length) throw new Error('empty');
        setProducts(list.slice(0, 8));
      })
      .catch(() =>
        productAPI
          .getProducts({ limit: 8, sort: '-rating' })
          .then((res) => {
            const list = Array.isArray(res) ? res : res?.products || res?.data || [];
            setProducts(list.slice(0, 8));
          })
          .catch(() => setProducts(FALLBACK_PRODUCTS)),
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <motion.div
      className="md:hidden pb-2"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      style={{
        fontFamily: "'Inter', 'Poppins', system-ui, sans-serif",
        background: 'var(--bg-page)',
      }}
    >
      <PremiumCategoryChips activeId={cat} onSelect={setCat} />

      <PremiumCasualHero isDark={isDark} />

      <section className="px-4 pb-8" aria-labelledby="premium-trending">
        <motion.div
          className="mb-4 flex items-end justify-between gap-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <div>
            <h2 id="premium-trending" className="text-[22px] font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Trending now
            </h2>
            <p className="mt-1 text-[13px]" style={{ color: 'var(--text-muted)' }}>
              Handpicked pieces with calm, confident pricing.
            </p>
          </div>
          <Link
            to="/search"
            className="shrink-0 text-[13px] font-semibold transition-opacity hover:opacity-80"
            style={{ color: 'var(--brand-primary)' }}
          >
            See all
          </Link>
        </motion.div>

        {loading ? (
          <div className="grid grid-cols-2 gap-x-3 gap-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="overflow-hidden rounded-[20px] pwa-skeleton"
                style={{ aspectRatio: '1 / 1.55' }}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-3 gap-y-5">
            {products.map((p, i) => (
              <PremiumProductCard key={p._id || p.id || i} product={p} index={i} />
            ))}
          </div>
        )}
      </section>
    </motion.div>
  );
}
