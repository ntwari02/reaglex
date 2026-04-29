import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingBag, Heart, Star } from 'lucide-react';
import { useBuyerCart } from '../stores/buyerCartStore';
import { useTheme } from '../contexts/ThemeContext';

import { SERVER_URL } from '../lib/config';

function extractImageSrc(src) {
  if (!src) return null;
  if (Array.isArray(src)) return extractImageSrc(src[0]);
  if (typeof src === 'string') return src;
  if (typeof src === 'object') {
    return src.url || src.secure_url || src.path || src.src || null;
  }
  return null;
}

function resolveImage(src) {
  const value = extractImageSrc(src);
  if (!value) return 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80';
  return value.startsWith('http') ? value : `${SERVER_URL}${value}`;
}

export function ProductCard({ product, index = 0, onViewProduct, compact = false, ctaStyle = 'default' }) {
  const [wishlisted, setWishlisted] = useState(false);
  const [added, setAdded] = useState(false);
  const addItem = useBuyerCart((s) => s.addItem);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const id = product._id || product.id;
  const name = product.title || product.name || 'Product';
  const price = product.price || 0;
  const oldPrice = product.compareAtPrice || product.originalPrice || null;
  const discount = oldPrice ? Math.round(((oldPrice - price) / oldPrice) * 100) : null;
  const rating = product.averageRating || product.rating || (4 + Math.random()).toFixed(1);
  const reviews = product.totalReviews || product.reviewCount || Math.floor(Math.random() * 200 + 10);
  const primary = Array.isArray(product.images)
    ? (product.images.find((img) => img?.is_primary) || product.images[0])
    : product.images?.[0];
  const imgSrc = resolveImage(primary || product.image || product.imageUrl || product.thumbnail || product.thumbnailUrl);
  const stock = product.stockQuantity ?? product.stock ?? 10;
  const verificationStatus = product.verificationSummary?.status || 'unverified';

  const handleViewProduct = () => onViewProduct?.(product);

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
        boxShadow: 'var(--shadow-card)',
        border: '1px solid var(--border-card)',
        cursor: 'pointer',
      }}
      onClick={onViewProduct ? handleViewProduct : undefined}
    >
      <Link
        to={`/products/${id}`}
        className="block"
        onClick={onViewProduct ? (e) => { e.preventDefault(); handleViewProduct(); } : undefined}
      >
        {/* Image area */}
        <div
          className="relative overflow-hidden product-image-wrapper"
          style={{
            paddingTop: compact ? '60%' : '72%',
            background: 'var(--bg-tertiary)',
          }}
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
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />

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
              style={{ background: 'var(--bg-overlay)' }}
            >
              <span
                className="px-3 py-1 rounded-full text-xs font-semibold"
                style={{
                  color: 'var(--text-secondary)',
                  background: 'var(--card-bg)',
                  border: '1px solid var(--border-card)',
                }}
              >
                Out of stock
              </span>
            </div>
          )}

          {ctaStyle === 'home' && (
            <div className="absolute bottom-0 left-0 right-0 translate-y-0 md:translate-y-full md:group-hover:translate-y-0 transition-transform duration-300">
              <button
                onClick={handleAdd}
                disabled={stock === 0}
                className="w-full py-2.5 flex items-center justify-center gap-2 text-xs font-bold tracking-wide disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: added
                    ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                    : (isDark ? '#ffffff' : '#0f172a'),
                  color: added ? '#ffffff' : (isDark ? '#0f172a' : '#ffffff'),
                  borderTop: isDark && !added ? '1px solid rgba(15,23,42,0.12)' : 'none',
                }}
              >
                <ShoppingBag size={13} />
                {added ? 'ADDED ✓' : 'QUICK ADD'}
              </button>
            </div>
          )}
        </div>

        {/* Wishlist button */}
        <motion.button
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          onClick={(e) => { e.preventDefault(); setWishlisted(!wishlisted); }}
          className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity wishlist-btn"
          style={{
            background: 'var(--card-bg)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
            border: '1px solid var(--border-card)',
          }}
        >
          <Heart
            style={{ width: '14px', height: '14px' }}
            fill={wishlisted ? '#ff8c42' : 'none'}
            stroke={wishlisted ? '#ff8c42' : 'var(--text-muted)'}
          />
        </motion.button>

        {/* Card body */}
        <div className={compact ? 'p-2.5' : 'p-4'}>
          {!compact && verificationStatus && verificationStatus !== 'unverified' && (
            <div
              className="inline-flex mb-2 px-2 py-0.5 rounded-full text-[10px] font-semibold border"
              style={{
                color: verificationStatus === 'verified' ? '#15803d' : '#b45309',
                background: verificationStatus === 'verified' ? '#f0fdf4' : '#fffbeb',
                borderColor: verificationStatus === 'verified' ? '#bbf7d0' : '#fde68a',
              }}
            >
              {verificationStatus === 'verified' ? 'Verified by Reaglex' : 'Verification Pending'}
            </div>
          )}
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

          {!compact && (
            <div className="flex items-center gap-1.5 mb-3">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    style={{ width: '11px', height: '11px' }}
                    fill={i < Math.round(Number(rating)) ? '#ff8c42' : 'none'}
                    stroke={i < Math.round(Number(rating)) ? '#ff8c42' : 'var(--border-card)'}
                  />
                ))}
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>({reviews})</span>
            </div>
          )}

          <div className="flex items-center justify-between gap-1.5">
            <div className="min-w-0">
              <span
                className="font-black product-price"
                style={{ color: 'var(--text-primary)', fontSize: compact ? '12px' : '16px' }}
              >
                ${price.toFixed(2)}
              </span>
              {oldPrice && !compact && (
                <span
                  className="ml-1.5 text-xs line-through"
                  style={{ color: 'var(--text-muted)' }}
                >
                  ${oldPrice.toFixed(2)}
                </span>
              )}
            </div>

            {ctaStyle !== 'home' && (
            <motion.button
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleAdd}
              disabled={stock === 0}
              className="flex-shrink-0 flex items-center justify-center text-white font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: ctaStyle === 'home'
                  ? (added
                    ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                    : (isDark ? '#ffffff' : '#0f172a'))
                  : (added
                    ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                    : 'linear-gradient(135deg, #ff8c42, #ff5f00)'),
                color: ctaStyle === 'home'
                  ? (added ? '#ffffff' : (isDark ? '#0f172a' : '#ffffff'))
                  : '#ffffff',
                transition: 'background 0.3s',
                boxShadow: ctaStyle === 'home' ? 'none' : '0 3px 8px rgba(255,140,66,0.25)',
                borderRadius: compact ? '8px' : '12px',
                padding: compact ? '4px 8px' : '6px 12px',
                fontSize: compact ? '10px' : '12px',
                gap: '4px',
                border: ctaStyle === 'home' && isDark && !added ? '1px solid rgba(15,23,42,0.12)' : 'none',
              }}
            >
              <ShoppingBag style={{ width: compact ? '10px' : '12px', height: compact ? '10px' : '12px' }} />
              {added ? 'ADDED ✓' : (ctaStyle === 'home' ? 'QUICK ADD' : 'Add')}
            </motion.button>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export default ProductCard;
