import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingBag, Heart, Star } from 'lucide-react';
import { useBuyerCart } from '../stores/buyerCartStore';
import { useCurrencyPricing } from '../hooks/useCurrencyPricing';

import { SERVER_URL } from '../lib/config';
import { buyerProductPath } from '../lib/productUrl';

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
  const currencyPricing = useCurrencyPricing();

  if (!product || typeof product !== 'object') return null;

  const id = product._id || product.id;
  const name = product.title || product.name || 'Product';
  const price = product.price || 0;
  const oldPrice = product.compareAtPrice ?? product.originalPrice ?? null;
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
        to={buyerProductPath(product)}
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
              className="absolute top-3 left-3 px-2 py-0.5 rounded-full font-bold text-xs"
              style={{ background: 'var(--brand-primary)', color: 'var(--text-on-accent)' }}
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
                    ? 'var(--accent-success-gradient)'
                    : 'var(--gradient-brand-cta)',
                  color: added ? 'var(--text-on-accent)' : 'var(--text-on-accent)',
                  borderTop: !added ? '1px solid var(--border-subtle)' : 'none',
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
            fill={wishlisted ? 'var(--brand-primary)' : 'none'}
            stroke={wishlisted ? 'var(--brand-primary)' : 'var(--text-muted)'}
          />
        </motion.button>

        {/* Card body */}
        <div className={compact ? 'p-2.5' : 'p-4'}>
          {!compact && verificationStatus && verificationStatus !== 'unverified' && (
            <div
              className="inline-flex mb-2 px-2 py-0.5 rounded-full text-[10px] font-semibold border"
              style={{
                color: verificationStatus === 'verified' ? 'var(--badge-success-text)' : 'var(--badge-warning-text)',
                background: verificationStatus === 'verified' ? 'var(--badge-success-bg)' : 'var(--badge-warning-bg)',
                borderColor: verificationStatus === 'verified' ? 'var(--badge-success-border)' : 'var(--badge-warning-border)',
              }}
            >
              {verificationStatus === 'verified' ? 'Verified by Spacilly' : 'Verification Pending'}
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
                    fill={i < Math.round(Number(rating)) ? 'var(--brand-primary)' : 'none'}
                    stroke={i < Math.round(Number(rating)) ? 'var(--brand-primary)' : 'var(--border-card)'}
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
                style={{ color: 'var(--text-price)', fontSize: compact ? '12px' : '16px' }}
              >
                {currencyPricing.formatLocalWithUsd(price)}
              </span>
              {oldPrice && !compact && (
                <span
                  className="ml-1.5 text-xs line-through"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {currencyPricing.formatLocalWithUsd(oldPrice)}
                </span>
              )}
            </div>

            {ctaStyle !== 'home' && (
            <motion.button
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleAdd}
              disabled={stock === 0}
              className="flex-shrink-0 flex items-center justify-center font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: added
                  ? 'var(--accent-success-gradient)'
                  : 'var(--gradient-brand-cta)',
                color: 'var(--text-on-accent)',
                transition: 'background 0.3s',
                boxShadow: added ? 'none' : 'var(--shadow-cta)',
                borderRadius: compact ? '8px' : '12px',
                padding: compact ? '4px 8px' : '6px 12px',
                fontSize: compact ? '10px' : '12px',
                gap: '4px',
                border: ctaStyle === 'home' && !added ? '1px solid var(--border-subtle)' : 'none',
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
