import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { ShoppingBag, Heart, Star, Truck, Eye } from 'lucide-react';
import { useBuyerCart } from '../stores/buyerCartStore';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';
const PRIMARY = '#f97316';
const ease = [0.25, 0.46, 0.45, 0.94];

function resolveImg(src) {
  if (!src) return 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80';
  return src.startsWith('http') ? src : `${SERVER_URL}${src}`;
}

export function SearchProductCard({ product, index = 0 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const [wishlisted, setWishlisted] = useState(false);
  const [addState, setAddState] = useState('idle'); // idle | adding | added
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [showBurst, setShowBurst] = useState(false);
  const addItem = useBuyerCart((s) => s.addItem);

  const id = product._id || product.id;
  const name = product.title || product.name || 'Product';
  const price = product.price || 0;
  const oldPrice = product.compareAtPrice || product.originalPrice || null;
  const discount = oldPrice && oldPrice > price ? Math.round(((oldPrice - price) / oldPrice) * 100) : null;
  const rating = Number(product.averageRating || product.rating || 4.5);
  const reviews = product.totalReviews || product.reviewCount || 24;
  const imgSrc = resolveImg(product.images?.[0] || product.image);
  const stock = product.stockQuantity ?? product.stock ?? 10;
  const category = product.category || 'Accessories';
  const storeName = product.seller?.storeName || product.sellerName || 'Store';

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (stock === 0 || addState !== 'idle') return;
    setAddState('adding');
    addItem(product, 1);
    setTimeout(() => setAddState('added'), 400);
    setTimeout(() => setAddState('idle'), 1900);
  };

  const handleWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setWishlisted((w) => !w);
    if (!wishlisted) {
      setShowBurst(true);
      setShowSavedToast(true);
      setTimeout(() => setShowBurst(false), 600);
      setTimeout(() => setShowSavedToast(false), 2000);
    }
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, ease, delay: index * 0.08 }}
      whileHover={{
        y: -4,
        scale: 1.02,
        boxShadow: 'var(--shadow-hover)',
        transition: { duration: 0.3, ease },
      }}
      className="relative rounded-2xl overflow-hidden group search-card-group cursor-pointer transition-colors duration-300"
      style={{
        background: 'var(--card-bg)',
        boxShadow: 'var(--shadow-md)',
        willChange: 'transform',
      }}
    >
      <Link to={`/products/${id}`} className="block">
        {/* Image container: 220px height, no padding */}
        <div
          className="relative overflow-hidden bg-[var(--bg-tertiary)]"
          style={{ height: 220 }}
        >
          <motion.img
            src={imgSrc}
            alt={name}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ scale: 1 }}
            whileHover={{ scale: 1.08 }}
            transition={{ duration: 0.4, ease }}
            onError={(e) => { e.target.src = resolveImg(null); }}
          />
          {/* Dark overlay on card hover */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/35 flex items-end justify-center gap-2 pb-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <motion.button
              type="button"
              initial={{ y: 20, opacity: 0 }}
              className="group-hover:opacity-100 group-hover:translate-y-0 translate-y-5 opacity-0 transition-all duration-300 delay-75 px-4 py-2 rounded-full bg-white font-bold text-sm text-gray-800 shadow-lg flex items-center gap-2 hover:scale-105"
              style={{ transitionDelay: '50ms' }}
              onClick={handleAddToCart}
            >
              <ShoppingBag className="w-4 h-4" /> Add to Cart
            </motion.button>
            <Link to={`/products/${id}`} onClick={(e) => e.stopPropagation()} className="translate-y-5 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white font-bold text-sm text-gray-800 shadow-lg" style={{ transitionDelay: '100ms' }}>
              <Eye className="w-4 h-4" /> Quick View
            </Link>
          </div>

          {/* SALE badge */}
          {discount > 0 && (
            <span
              className="absolute top-3 left-3 px-2 py-0.5 rounded text-xs font-bold text-white"
              style={{
                background: '#ef4444',
                animation: 'discountPulse 3s ease-in-out infinite',
              }}
            >
              -{discount}%
            </span>
          )}

          {/* Wishlist heart - always visible */}
          <motion.button
            type="button"
            onClick={handleWishlist}
            className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-white/95 shadow flex items-center justify-center"
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.9 }}
            transition={{ duration: 0.2 }}
            title="Save to Wishlist"
            aria-label={wishlisted ? 'Remove from wishlist' : 'Save to Wishlist'}
          >
            <Heart
              className="w-4 h-4"
              fill={wishlisted ? '#ef4444' : 'none'}
              stroke={wishlisted ? '#ef4444' : '#6b7280'}
            />
          </motion.button>

          {/* Heart burst */}
          <AnimatePresence>
            {showBurst && (
              <>
                {[0, 1, 2, 3, 4].map((i) => (
                  <motion.span
                    key={i}
                    initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
                    animate={{
                      scale: 0.4,
                      x: Math.cos((i / 5) * Math.PI * 2) * 24,
                      y: Math.sin((i / 5) * Math.PI * 2) * 24,
                      opacity: 0,
                    }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="absolute top-6 right-6 text-red-500 pointer-events-none"
                  >
                    ❤️
                  </motion.span>
                ))}
              </>
            )}
          </AnimatePresence>

          {/* Saved toast */}
          <AnimatePresence>
            {showSavedToast && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-white shadow-lg text-sm font-semibold text-gray-800"
              >
                Saved! ❤️
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Card body - padding 16px */}
        <div className="p-4">
          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium mb-2 bg-orange-50 dark:bg-orange-900/30 text-orange-500 dark:text-orange-400">
            {category}
          </span>
          <h3 className="font-bold text-[15px] leading-snug line-clamp-2 mb-1 text-gray-900 dark:text-white">
            {name}
          </h3>
          <p className="text-xs mb-2 text-gray-500 dark:text-gray-400">by {storeName}</p>

          {/* Stars - stagger fill on load */}
          <div className="flex items-center gap-1 mb-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={inView ? { opacity: 1, scale: 1 } : {}}
                transition={{ delay: 0.5 + i * 0.1, duration: 0.2 }}
              >
                <Star
                  className="w-3.5 h-3.5"
                  fill={i <= Math.round(rating) ? '#f59e0b' : 'none'}
                  stroke="#f59e0b"
                />
              </motion.span>
            ))}
            <span className="text-xs ml-1 text-gray-500 dark:text-gray-400">{rating} ({reviews})</span>
          </div>

          {/* Price */}
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className="font-bold text-lg" style={{ color: PRIMARY }}>${price.toFixed(2)}</span>
            {oldPrice && (
              <span className="text-[13px] line-through" style={{ color: '#9ca3af' }}>
                ${oldPrice.toFixed(2)}
              </span>
            )}
          </div>

          {/* Free ship badge - truck wiggles on card hover */}
          <div className="mb-3">
            <span className="free-ship-truck inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-emerald-700 bg-emerald-50">
              <Truck className="w-3 h-3" /> Free Ship
            </span>
          </div>

          {/* Buttons */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); handleWishlist(e); }}
              className={`flex-1 py-2 rounded-full text-sm font-semibold border-2 transition ${wishlisted ? 'border-red-200 text-red-500' : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500'}`}
            >
              {wishlisted ? '♡ Remove' : '♡ Save'}
            </button>
            <motion.button
              type="button"
              onClick={handleAddToCart}
              disabled={stock === 0 || addState === 'adding'}
              className="flex-1 py-2 rounded-full text-sm font-semibold text-white flex items-center justify-center gap-2"
              style={{
                background: addState === 'added' ? '#10b981' : PRIMARY,
                transition: 'background 0.3s',
              }}
              whileHover={addState === 'idle' ? { scale: 1.03 } : {}}
              whileTap={{ scale: 0.95 }}
            >
              {addState === 'adding' && (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {addState === 'idle' && <ShoppingBag className="w-4 h-4" />}
              {addState === 'idle' && 'Add to Cart'}
              {addState === 'adding' && 'Adding...'}
              {addState === 'added' && 'Added ✓'}
            </motion.button>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export default SearchProductCard;
