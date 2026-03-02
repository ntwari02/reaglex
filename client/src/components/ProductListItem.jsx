import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingBag, Heart, Star, Truck } from 'lucide-react';
import { useBuyerCart } from '../stores/buyerCartStore';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';

function resolveImage(src) {
  if (!src) return 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80';
  return src.startsWith('http') ? src : `${SERVER_URL}${src}`;
}

export default function ProductListItem({ product, index = 0 }) {
  const [wishlisted, setWishlisted] = useState(false);
  const [added,      setAdded]      = useState(false);
  const [hovered,    setHovered]    = useState(false);
  const addItem = useBuyerCart(s => s.addItem);

  const id          = product._id || product.id;
  const name        = product.title || product.name || 'Product';
  const price       = product.price || 0;
  const oldPrice    = product.compareAtPrice || product.originalPrice || null;
  const discount    = oldPrice ? Math.round(((oldPrice - price) / oldPrice) * 100) : null;
  const rating      = product.averageRating || product.rating || (4 + Math.random()).toFixed(1);
  const reviews     = product.totalReviews  || product.reviewCount || Math.floor(Math.random() * 200 + 20);
  const imgSrc      = resolveImage(product.images?.[0] || product.image);
  const stock       = product.stockQuantity ?? product.stock ?? 10;
  const seller      = product.seller?.storeName || product.sellerName || 'Premium Store';
  const category    = product.category || product.categoryName || '';
  const description = product.description?.slice(0, 130) || 'Premium quality product with exceptional craftsmanship and attention to detail.';

  const handleAdd = (e) => {
    e.preventDefault();
    addItem(product, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1300);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className="relative overflow-hidden bg-white dark:bg-gray-800 transition-colors duration-300"
      style={{
        borderRadius:  '12px',
        boxShadow:     hovered
          ? '0 8px 24px rgba(0,0,0,0.12)'
          : '0 1px 4px rgba(0,0,0,0.08)',
        border:        `1.5px solid ${hovered ? '#fde68a' : 'transparent'}`,
        transition:    'box-shadow 0.22s, border-color 0.22s, background 0.3s',
      }}
    >
      <Link to={`/products/${id}`} className="flex gap-0">

        {/* ── Image (160 × 160) ── */}
        <div
          className="flex-shrink-0 relative overflow-hidden"
          className="bg-gray-50 dark:bg-gray-700"
          style={{ width: 168, height: 168, borderRadius: '10px 0 0 10px' }}
        >
          <motion.img
            src={imgSrc}
            alt={name}
            className="w-full h-full object-cover"
            animate={{ scale: hovered ? 1.05 : 1 }}
            transition={{ duration: 0.3 }}
            onError={e => { e.target.src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80'; }}
          />
          {/* Discount badge */}
          {discount && (
            <div
              className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full text-white font-bold"
              style={{ background: '#ff8c42', fontSize: '11px' }}
            >
              -{discount}%
            </div>
          )}
          {/* Out of stock overlay */}
          {stock === 0 && (
            <div className="absolute inset-0 flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.75)' }}>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full border bg-white"
                style={{ color: '#64748b', borderColor: '#cbd5e1' }}>
                Out of stock
              </span>
            </div>
          )}
        </div>

        {/* ── Product details ── */}
        <div className="flex-1 flex flex-col justify-between p-4 min-w-0">

          {/* Top row: category + wishlist */}
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              {category && (
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: '#ede9fe', color: '#7c3aed' }}
                >
                  {category}
                </span>
              )}
            </div>
            {/* Wishlist heart — top right */}
            <motion.button
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              onClick={e => { e.preventDefault(); setWishlisted(w => !w); }}
              className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition"
              style={{ background: wishlisted ? '#fef2f2' : '#f8fafc' }}
              title={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            >
              <Heart
                style={{ width: 15, height: 15 }}
                fill={wishlisted ? '#ef4444' : 'none'}
                stroke={wishlisted ? '#ef4444' : '#94a3b8'}
              />
            </motion.button>
          </div>

          {/* Name */}
          <h3
            className="font-bold leading-snug mb-0.5 line-clamp-1 text-gray-900 dark:text-white"
            style={{ fontSize: '16px' }}
          >
            {name}
          </h3>

          {/* Seller */}
          <p className="text-xs mb-1.5 text-gray-400 dark:text-gray-500">
            by <span className="text-gray-500 dark:text-gray-400 font-medium">{seller}</span>
          </p>

          {/* Description */}
          <p className="text-xs leading-relaxed mb-3 line-clamp-2 hidden sm:block text-gray-400 dark:text-gray-500">
            {description}{description.length >= 130 ? '…' : ''}
          </p>

          {/* Bottom row: rating + price + add to cart */}
          <div className="flex items-center justify-between gap-3 flex-wrap">

            {/* Rating + free ship */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Stars */}
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map(i => (
                  <Star key={i} style={{ width: 13, height: 13 }}
                    fill={i <= Math.round(Number(rating)) ? '#f59e0b' : 'none'}
                    stroke={i <= Math.round(Number(rating)) ? '#f59e0b' : '#e2e8f0'} />
                ))}
                <span className="ml-1 font-semibold text-gray-600 dark:text-gray-300" style={{ fontSize: '12px' }}>
                  {Number(rating).toFixed(1)}
                </span>
                <span className="text-gray-400 dark:text-gray-500" style={{ fontSize: '11px' }}>({reviews})</span>
              </div>

              {/* Free ship badge */}
              <span
                className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold"
                style={{ background: '#dcfce7', color: '#16a34a', fontSize: '11px' }}
              >
                <Truck style={{ width: 11, height: 11 }} />
                Free ship
              </span>
            </div>

            {/* Price + button */}
            <div className="flex items-center gap-3">
              <div>
                <span className="font-bold text-gray-900 dark:text-white" style={{ fontSize: '18px' }}>
                  ${price.toFixed(2)}
                </span>
                {oldPrice && (
                  <span className="ml-1.5 text-xs line-through" style={{ color: '#cbd5e1' }}>
                    ${oldPrice.toFixed(2)}
                  </span>
                )}
              </div>

              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={handleAdd}
                disabled={stock === 0}
                className="flex items-center gap-2 text-white font-semibold text-xs disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background:    added
                    ? 'linear-gradient(135deg,#22c55e,#16a34a)'
                    : 'linear-gradient(135deg,#ff8c42,#ff5f00)',
                  transition:    'background 0.3s',
                  borderRadius:  '9999px',
                  padding:       '8px 18px',
                  boxShadow:     '0 4px 12px rgba(255,140,66,0.3)',
                  width:         '140px',
                  justifyContent: 'center',
                }}
              >
                <ShoppingBag style={{ width: 13, height: 13 }} />
                {added ? 'Added!' : 'Add to Cart'}
              </motion.button>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
