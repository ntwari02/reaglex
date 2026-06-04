import { motion } from 'framer-motion';
import { Heart, Star } from 'lucide-react';
import MobileAddCta from './MobileAddCta';
import { useNavigate } from 'react-router-dom';
import { useBuyerCart } from '../../../stores/buyerCartStore';
import { useAuthStore } from '../../../stores/authStore';
import { useWishlistStore } from '../../../stores/wishlistStore';
import { useCurrencyPricing } from '../../../hooks/useCurrencyPricing';
import { usePlatformFeature } from '../../../hooks/useSystemFeatures';
import { navigateToProduct } from '../../../lib/productNavigation';
import { productDisplayName, resolveProductImage, productId } from './productUtils';
import '../../../styles/recently-viewed-rail.css';

export default function RecentlyViewedRailCard({ product, index = 0, showHotBadge = false }) {
  const navigate = useNavigate();
  const addItem = useBuyerCart((s) => s.addItem);
  const user = useAuthStore((s) => s.user);
  const addToWishlist = useWishlistStore((s) => s.addToWishlist);
  const isInWishlist = useWishlistStore((s) => s.isInWishlist);
  const currencyPricing = useCurrencyPricing();
  const { enabled: wishlistOn } = usePlatformFeature('product_wishlist');

  const id = productId(product);
  const wishlisted = isInWishlist(String(id));
  const name = productDisplayName(product);
  const category = product.category || product.subcategory || '';
  const rating = Number(product.rating || product.averageRating || 4.5);
  const rounded = Math.min(5, Math.max(0, Math.round(rating)));
  const stock = product.stockQuantity ?? product.stock ?? 10;

  return (
    <motion.article
      className="ex-rail-card rv-ymal-card"
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.22, delay: index * 0.03 }}
    >
      <div
        className="rv-ymal-card__inner"
        role="button"
        tabIndex={0}
        onClick={() => navigateToProduct(navigate, product)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            navigateToProduct(navigate, product);
          }
        }}
      >
        <div className="rv-ymal-card__media">
          <img src={resolveProductImage(product)} alt="" loading="lazy" />
          {showHotBadge && (
            <span className="rv-ymal-card__hot" aria-hidden>
              🔥 Hot
            </span>
          )}
          {wishlistOn && (
            <button
              type="button"
              className="rv-ymal-card__wish"
              aria-label="Save to wishlist"
              onClick={(e) => {
                e.stopPropagation();
                addToWishlist(user?.id, { ...product, id });
              }}
            >
              <Heart
                size={14}
                fill={wishlisted ? 'var(--brand-primary)' : 'none'}
                stroke={wishlisted ? 'var(--brand-primary)' : 'var(--text-muted)'}
              />
            </button>
          )}
        </div>
        <div className="rv-ymal-card__body">
          <h3 className="rv-ymal-card__title">{name}</h3>
          {category ? <p className="rv-ymal-card__cat">{category}</p> : null}
          <div className="rv-ymal-card__rating" aria-hidden>
            {[1, 2, 3, 4, 5].map((n) => (
              <Star
                key={n}
                size={8}
                className={
                  n <= rounded
                    ? 'fill-[var(--brand-primary)] text-[var(--brand-primary)]'
                    : 'text-[var(--border-card)]'
                }
              />
            ))}
            <span>{rating.toFixed(1)}</span>
          </div>
          <div className="rv-ymal-card__price-row">
            <p className="rv-ymal-card__price">
              {currencyPricing.formatLocalWithUsd(product.price || 0)}
            </p>
            <MobileAddCta
              iconType="cart"
              disabled={stock <= 0}
              onClick={(e) => {
                e.stopPropagation();
                addItem(product, 1);
              }}
            />
          </div>
        </div>
      </div>
    </motion.article>
  );
}
