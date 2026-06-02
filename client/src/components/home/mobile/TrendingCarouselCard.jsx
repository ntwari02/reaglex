import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, Star } from 'lucide-react';
import { useAuthStore } from '../../../stores/authStore';
import { useWishlistStore } from '../../../stores/wishlistStore';
import { useCurrencyPricing } from '../../../hooks/useCurrencyPricing';
import { navigateToProduct } from '../../../lib/productNavigation';
import { productDisplayName, productId, resolveProductImage } from './productUtils';

/** ~3.5 cards visible on 390px viewport */
const CARD_W = 128;

function formatCategory(product) {
  const c = product.category || product.categoryName;
  if (typeof c === 'string' && c) return c;
  if (c?.name) return c.name;
  return "Men's Fashion";
}

export default function TrendingCarouselCard({ product, index = 0 }) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const addToWishlist = useWishlistStore((s) => s.addToWishlist);
  const isInWishlist = useWishlistStore((s) => s.isInWishlist);
  const currencyPricing = useCurrencyPricing();

  const id = productId(product);
  const name = productDisplayName(product);
  const price = product.price || 0;
  const rating = Number(product.averageRating || product.rating || 4.6);
  const reviews = product.totalReviews || product.reviewCount || 0;
  const imgSrc = resolveProductImage(product);
  const wishlisted = isInWishlist(String(id));
  const category = formatCategory(product);

  return (
    <motion.article
      style={{ width: CARD_W }}
      initial={{ opacity: 0, x: 10 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.28, delay: index * 0.035 }}
      className="mob-trending-card overflow-hidden"
    >
      <button
        type="button"
        className="block w-full text-left"
        onClick={() => navigateToProduct(navigate, product)}
      >
        <div className="relative overflow-hidden rounded-t-[12px]" style={{ aspectRatio: '1 / 1' }}>
          <img src={imgSrc} alt="" className="h-full w-full object-cover bg-[var(--bg-tertiary)]" loading="lazy" />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              addToWishlist(user?.id, { ...product, id });
            }}
            className="ex-wish-btn ex-wish-btn--sm ex-wish-btn--plain mob-trending-wish"
            aria-label="Save"
          >
            <Heart
              size={16}
              fill={wishlisted ? 'var(--brand-primary)' : 'none'}
              stroke={wishlisted ? 'var(--brand-primary)' : 'rgba(255,255,255,0.92)'}
              strokeWidth={1.85}
            />
          </button>
        </div>
        <div className="rounded-b-[12px] border border-t-0 border-[color-mix(in_srgb,var(--border-card)_55%,transparent)] bg-[var(--card-bg)] px-2 pb-2 pt-1.5">
          <h3 className="line-clamp-1 text-[13px] font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>
            {name}
          </h3>
          <p className="mt-0.5 line-clamp-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
            {category}
          </p>
          <p className="mt-1 text-[15px] font-bold leading-none" style={{ color: 'var(--text-primary)' }}>
            {currencyPricing.formatLocalWithUsd(price)}
          </p>
          <div className="mt-1 flex items-center gap-1">
            <Star size={11} className="fill-[var(--brand-primary)] text-[var(--brand-primary)]" />
            <span className="text-[11px] font-semibold" style={{ color: 'var(--brand-primary)' }}>
              {rating.toFixed(1)}
            </span>
            {reviews > 0 && (
              <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                ({reviews > 9999 ? '9.9k' : reviews})
              </span>
            )}
          </div>
        </div>
      </button>
    </motion.article>
  );
}
