import { useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Award, Eye, Flame, Heart, ShoppingBag, Sparkles, Star } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useBuyerCart } from '../../stores/buyerCartStore';
import { useWishlistStore } from '../../stores/wishlistStore';
import { useCurrencyPricing } from '../../hooks/useCurrencyPricing';
import { useMotionUi } from '../../stores/motionUiStore';
import { openProductExperience } from '../../lib/productNavigation';
import { productImageLayoutId } from '../../motion/presets';
import {
  productDisplayName,
  productId,
  resolveProductImage,
} from '../home/mobile/productUtils';

export function formatReviewCount(reviews) {
  if (!reviews) return '';
  if (reviews >= 1000) return `(${(reviews / 1000).toFixed(1)}k)`;
  return `(${reviews})`;
}

export function formatStoreName(product) {
  return (
    product?.store?.name ||
    product?.sellerName ||
    product?.shopName ||
    product?.vendorName ||
    'Verified Store'
  );
}

export function deriveSoldLabel(product) {
  if (product?._exploreMeta?.soldLabel) return product._exploreMeta.soldLabel;
  const id = String(productId(product) || '');
  const sold = 1200 + ((id.length * 97) % 8000);
  return `${(sold / 1000).toFixed(1)}k sold`;
}

export function deriveViewsLabel(product) {
  if (product?._exploreMeta?.viewsLabel) return product._exploreMeta.viewsLabel;
  const id = String(productId(product) || '');
  const views = 800 + ((id.length * 53) % 24000);
  return views >= 1000 ? `${(views / 1000).toFixed(1)}k views` : `${views} views`;
}

export function useProductCardCore(product, { enableFly = true } = {}) {
  const navigate = useNavigate();
  const cardRef = useRef(null);
  const user = useAuthStore((s) => s.user);
  const addItem = useBuyerCart((s) => s.addItem);
  const addToWishlist = useWishlistStore((s) => s.addToWishlist);
  const isInWishlist = useWishlistStore((s) => s.isInWishlist);
  const triggerFlyToCart = useMotionUi((s) => s.triggerFlyToCart);
  const currencyPricing = useCurrencyPricing();

  const id = productId(product);
  const name = productDisplayName(product);
  const price = product?.price || 0;
  const imgSrc = resolveProductImage(product);
  const rating = Number(product?.averageRating || product?.rating || 4.7);
  const reviews = product?.totalReviews || product?.reviewCount || 0;
  const stock = product?.stockQuantity ?? product?.stock ?? 10;
  const wishlisted = isInWishlist(String(id));
  const reason = product?.aiMeta?.topReason || product?.aiMeta?.reasons?.[0] || 'Based on your activity';

  const flyFromCard = useCallback(() => {
    if (!enableFly) return;
    const rect = cardRef.current?.getBoundingClientRect();
    triggerFlyToCart({
      src: imgSrc,
      from: rect
        ? { x: rect.left + rect.width / 2, y: rect.top + rect.height * 0.35 }
        : { x: window.innerWidth / 2, y: window.innerHeight / 2 },
    });
  }, [enableFly, imgSrc, triggerFlyToCart]);

  const openProduct = useCallback(() => {
    if (product?._isUpcoming) {
      navigate('/upcoming', { state: { focusId: product.id } });
      return;
    }
    openProductExperience(navigate, product);
  }, [navigate, product]);

  const toggleWishlist = useCallback(
    (e) => {
      e?.stopPropagation?.();
      addToWishlist(user?.id, { ...product, id });
    },
    [addToWishlist, id, product, user?.id],
  );

  const addToCart = useCallback(
    (e) => {
      e?.stopPropagation?.();
      if (stock <= 0 || product?._isUpcoming) return;
      addItem(product, 1);
      flyFromCard();
    },
    [addItem, flyFromCard, product, stock],
  );

  return {
    cardRef,
    id,
    name,
    price,
    imgSrc,
    rating,
    reviews,
    stock,
    wishlisted,
    reason,
    currencyPricing,
    openProduct,
    toggleWishlist,
    addToCart,
  };
}

export function CardBadge({ variant, className = '' }) {
  const map = {
    trending: { icon: Flame, label: '🔥 Trending', mod: 'trending' },
    bestseller: { icon: Award, label: '🏆 Best Seller', mod: 'bestseller' },
    viewed: { icon: Eye, label: '👁 Most Viewed', mod: 'viewed' },
    new: { icon: Sparkles, label: '✨ New', mod: 'new' },
    ai: { icon: Sparkles, label: '✨ AI Pick', mod: 'ai' },
    upcoming: { icon: Sparkles, label: '🚀 Soon', mod: 'upcoming' },
  };
  const cfg = map[variant] || map.trending;
  const Icon = cfg.icon;
  return (
    <span className={`rx-card__badge rx-card__badge--${cfg.mod} ${className}`.trim()}>
      <Icon size={10} strokeWidth={2.2} aria-hidden />
      {cfg.label}
    </span>
  );
}

export function CardWishButton({ wishlisted, onClick, size = 'md' }) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.9 }}
      className={`rx-card__wish rx-card__wish--${size}`}
      onClick={onClick}
      aria-label={wishlisted ? 'Remove from wishlist' : 'Save'}
    >
      <Heart
        size={size === 'sm' ? 14 : 16}
        fill={wishlisted ? 'var(--brand-primary)' : 'none'}
        stroke={wishlisted ? 'var(--brand-primary)' : 'currentColor'}
        strokeWidth={1.75}
      />
    </motion.button>
  );
}

export function CardCartFab({ onClick, size = 'md', disabled }) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.92 }}
      className={`rx-card__fab rx-card__fab--${size}`}
      onClick={onClick}
      disabled={disabled}
      aria-label="Add to cart"
    >
      <ShoppingBag size={size === 'sm' ? 14 : 16} strokeWidth={2} />
    </motion.button>
  );
}

export function CardRating({ rating, reviews, compact = false }) {
  return (
    <div className={`rx-card__rating${compact ? ' rx-card__rating--compact' : ''}`}>
      <Star size={compact ? 11 : 12} fill="var(--brand-primary)" stroke="var(--brand-primary)" />
      <span className="rx-card__rating-val">{rating.toFixed(1)}</span>
      {reviews > 0 && <span className="rx-card__rating-meta">{formatReviewCount(reviews)}</span>}
    </div>
  );
}

export function CardProductImage({ product, src, alt = '', className = '' }) {
  const layoutId = productImageLayoutId(product);
  return (
    <motion.img
      layoutId={layoutId}
      layout
      src={src}
      alt={alt}
      className={className || 'rx-card__img'}
      loading="lazy"
      decoding="async"
      transition={{ type: 'spring', stiffness: 380, damping: 34 }}
    />
  );
}

export function CardMotionWrap({ children, index = 0, className = '', layout = 'grid' }) {
  const delay = Math.min(index * 0.03, 0.18);
  const initial = layout === 'rail' ? { opacity: 0, x: 12 } : { opacity: 0, y: 8 };
  const animate = layout === 'rail' ? { opacity: 1, x: 0 } : { opacity: 1, y: 0 };

  return (
    <motion.article
      className={className}
      initial={initial}
      whileInView={animate}
      viewport={{ once: true, margin: '-24px' }}
      transition={{ duration: 0.28, delay }}
      whileTap={{ scale: 0.98 }}
      whileHover={{ y: -2 }}
    >
      {children}
    </motion.article>
  );
}
