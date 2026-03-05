import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingBag, Heart, Star } from 'lucide-react';
import { useBuyerCart } from '../stores/buyerCartStore';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';

function resolveImage(src) {
  if (!src) return 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80';
  if (src.startsWith('http')) return src;
  return `${SERVER_URL}${src}`;
}

// Named + default export so both `import { ProductCard }` and `import ProductCard` work
export function ProductCard({ product, index = 0, onViewProduct, compact = false }) {
  const [wishlisted, setWishlisted] = useState(false);
  const [added, setAdded] = useState(false);
  const addItem = useBuyerCart((s) => s.addItem);

  const id = product._id || product.id;
  const name = product.title || product.name || 'Product';
  const price = product.price || 0;
  const oldPrice = product.compareAtPrice || product.originalPrice || null;
  const discount = oldPrice ? Math.round(((oldPrice - price) / oldPrice) * 100) : null;
  const rating = product.averageRating || product.rating || (4 + Math.random()).toFixed(1);
  const reviews = product.totalReviews || product.reviewCount || Math.floor(Math.random() * 200 + 10);
  const imgSrc = resolveImage(product.images?.[0] || product.image);
  const stock = product.stockQuantity ?? product.stock ?? 10;

  const handleViewProduct = () => {
    onViewProduct?.(product);
  };

  const handleAdd = (e) => {
    e.preventDefault();
    addItem(product, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.45, delay: index * 0.07 }}
      whileHover={{ y: -4, scale: 1.02, boxShadow: 'var(--shadow-hover)' }}
      className="relative rounded-3xl overflow-hidden group product-card"
      style={{
        background: 'var(--card-bg)',
        boxShadow: 'var(--shadow-md)',
        cursor: 'pointer',
      }}
      onClick={onViewProduct ? handleViewProduct : undefined}
    >
      <Link to={`/products/${id}`} className="block" onClick={onViewProduct ? (e) => { e.preventDefault(); handleViewProduct(); } : undefined}>
        {/* Image */}
        <div
          className="relative overflow-hidden product-image-wrapper"
          style={{ paddingTop: compact ? '60%' : '72%', background: '#f9fafb' }}
        >
          <motion.img
            src={imgSrc}
            alt={name}
            className="absolute inset-0 w-full h-full object-cover"
            whileHover={{ scale: 1.08 }}
            transition={{ duration: 0.4 }}
            onError={(e) => {
              e.target.src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80';
            }}
          />
          {/* Overlay on hover */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300" />

          {/* Discount badge */}
          {discount && (
            <div
              className="absolute top-3 left-3 px-2 py-0.5 rounded-full text-white font-bold text-xs"
              style={{ background: '#ff8c42' }}
            >
              -{discount}%
            </div>
          )}

          {/* Out of stock */}
          {stock === 0 && (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.75)' }}
            >
              <span className="px-3 py-1 rounded-full text-xs font-semibold text-gray-600 border border-gray-300 bg-white">
                Out of stock
              </span>
            </div>
          )}
        </div>

        {/* Wishlist button */}
        <motion.button
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          onClick={(e) => { e.preventDefault(); setWishlisted(!wishlisted); }}
          className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity wishlist-btn"
          style={{ background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}
        >
          <Heart
            style={{ width: '14px', height: '14px' }}
            fill={wishlisted ? '#ff8c42' : 'none'}
            stroke={wishlisted ? '#ff8c42' : '#374151'}
          />
        </motion.button>

        {/* Card body */}
        <div className={compact ? 'p-2.5' : 'p-4'}>
          {/* Name */}
          <h3
            className="font-semibold truncate product-title"
            style={{
              color: 'var(--text-primary)',
              fontSize: compact ? '11px' : '14px',
              marginBottom: compact ? '2px' : '4px',
            }}
          >
            {name}
          </h3>

          {/* Rating — hide in compact mode to save space */}
          {!compact && (
            <div className="flex items-center gap-1.5 mb-3">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    style={{ width: '11px', height: '11px' }}
                    fill={i < Math.round(Number(rating)) ? '#ff8c42' : 'none'}
                    stroke={i < Math.round(Number(rating)) ? '#ff8c42' : '#d1d5db'}
                  />
                ))}
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>({reviews})</span>
            </div>
          )}

          {/* Price + Add button */}
          <div className="flex items-center justify-between gap-1.5">
            <div className="min-w-0">
              <span
                className="font-black product-price"
                style={{ color: 'var(--text-primary)', fontSize: compact ? '12px' : '16px' }}
              >
                ${price.toFixed(2)}
              </span>
              {oldPrice && !compact && (
                <span className="ml-1.5 text-xs line-through" style={{ color: '#9ca3af' }}>
                  ${oldPrice.toFixed(2)}
                </span>
              )}
            </div>

            <motion.button
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleAdd}
              disabled={stock === 0}
              className="flex-shrink-0 flex items-center justify-center text-white font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: added
                  ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                  : 'linear-gradient(135deg, #ff8c42, #ff5f00)',
                transition: 'background 0.3s',
                boxShadow: '0 3px 8px rgba(255,140,66,0.25)',
                borderRadius: compact ? '8px' : '12px',
                padding: compact ? '4px 8px' : '6px 12px',
                fontSize: compact ? '10px' : '12px',
                gap: '4px',
              }}
            >
              <ShoppingBag style={{ width: compact ? '10px' : '12px', height: compact ? '10px' : '12px' }} />
              {added ? '✓' : 'Add'}
            </motion.button>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export default ProductCard;
