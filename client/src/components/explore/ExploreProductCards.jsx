import { useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Award,
  Eye,
  Flame,
  Heart,
  ShoppingBag,
  Sparkles,
  Star,
  Stars,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useBuyerCart } from '../../stores/buyerCartStore';
import { useWishlistStore } from '../../stores/wishlistStore';
import { useCurrencyPricing } from '../../hooks/useCurrencyPricing';
import { useMotionUi } from '../../stores/motionUiStore';
import { navigateToProduct } from '../../lib/productNavigation';
import {
  productDisplayName,
  productId,
  resolveProductImage,
} from '../home/mobile/productUtils';

const BADGE = {
  trending: { label: 'Trending', icon: Flame, emoji: '🔥' },
  bestseller: { label: 'Best Seller', icon: Award, emoji: '🏆' },
  ai: { label: 'AI Pick', icon: Sparkles, emoji: '✨' },
  viewed: { label: 'Most Viewed', icon: Eye, emoji: '👁' },
  new: { label: 'New', icon: Stars, emoji: '✨' },
};

function formatViews(product) {
  const v = product.aiMeta?.badges?.viewersNow;
  if (v && v > 0) return `${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v} views`;
  const rc = product.reviewCount || 0;
  if (rc > 0) return `${rc >= 1000 ? `${(rc / 1000).toFixed(1)}k` : rc} views`;
  return '12k views';
}

function formatSold(product) {
  const rc = product.reviewCount || product.totalReviews || 0;
  if (rc >= 1000) return `${(rc / 1000).toFixed(1)}k sold`;
  if (rc > 0) return `${rc} sold`;
  return '2.4k sold';
}

function formatNewMeta(sub) {
  if (sub === 'today') return 'Added today';
  if (sub === 'week') return 'New this week';
  return 'Fresh drop';
}

export function ExploreSponsoredCard({ item }) {
  return (
    <article className="ex-sponsored">
      <span className="ex-sponsored-badge">Sponsored</span>
      <p className="ex-sponsored-title">{item.title || 'Curated for you'}</p>
      <p className="ex-sponsored-sub">{item.subtitle || 'Premium partner · subtle placement'}</p>
    </article>
  );
}

export function ExploreTrendingRailCard({ product, index = 0 }) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const addToWishlist = useWishlistStore((s) => s.addToWishlist);
  const isInWishlist = useWishlistStore((s) => s.isInWishlist);
  const addItem = useBuyerCart((s) => s.addItem);
  const currencyPricing = useCurrencyPricing();
  const id = productId(product);
  const wishlisted = isInWishlist(String(id));

  return (
    <motion.article
      className="ex-rail-card"
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.28, delay: index * 0.04 }}
    >
      <button type="button" className="ex-rail-card-hit" onClick={() => navigateToProduct(navigate, product)}>
        <div className="ex-rail-card-media">
          <img src={resolveProductImage(product)} alt="" loading="lazy" />
          <span className="ex-badge ex-badge--trending">🔥 Trending</span>
          <button
            type="button"
            className="ex-wish-btn"
            aria-label="Save"
            onClick={(e) => {
              e.stopPropagation();
              addToWishlist(user?.id, { ...product, id });
            }}
          >
            <Heart size={18} strokeWidth={1.75} fill={wishlisted ? 'var(--brand-primary)' : 'none'} color={wishlisted ? 'var(--brand-primary)' : 'var(--text-muted)'} />
          </button>
        </div>
        <div className="ex-rail-card-body">
          <h3 className="ex-card-title">{productDisplayName(product)}</h3>
          <div className="ex-rail-card-foot">
            <div>
              <p className="ex-card-price">{currencyPricing.formatLocalWithUsd(product.price || 0)}</p>
              <div className="ex-rating">
                <Star size={12} fill="var(--brand-primary)" color="var(--brand-primary)" />
                <span>{Number(product.rating || product.averageRating || 4.7).toFixed(1)}</span>
              </div>
            </div>
            <button
              type="button"
              className="ex-cart-fab"
              aria-label="Add to cart"
              onClick={(e) => {
                e.stopPropagation();
                addItem(product, 1);
              }}
            >
              <ShoppingBag size={18} strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </button>
    </motion.article>
  );
}

export function ExploreAIHeroCard({ product }) {
  const navigate = useNavigate();
  const addItem = useBuyerCart((s) => s.addItem);
  const user = useAuthStore((s) => s.user);
  const addToWishlist = useWishlistStore((s) => s.addToWishlist);
  const isInWishlist = useWishlistStore((s) => s.isInWishlist);
  const currencyPricing = useCurrencyPricing();
  const id = productId(product);
  const wishlisted = isInWishlist(String(id));
  const reason = product.aiMeta?.topReason || product.aiMeta?.reasons?.[0] || 'Based on your activity';

  return (
    <article className="ex-ai-hero">
      <div className="ex-ai-hero-media">
        <img src={resolveProductImage(product)} alt="" loading="lazy" />
      </div>
      <div className="ex-ai-hero-body">
        <span className="ex-badge ex-badge--ai">✨ AI Pick</span>
        <h3 className="ex-ai-hero-title">{productDisplayName(product)}</h3>
        <div className="ex-rating">
          <Star size={14} fill="var(--brand-primary)" color="var(--brand-primary)" />
          <span>{Number(product.rating || 4.8).toFixed(1)}</span>
        </div>
        <p className="ex-ai-hero-reason">{reason}</p>
        <p className="ex-card-price ex-ai-hero-price">{currencyPricing.formatLocalWithUsd(product.price || 0)}</p>
        <div className="ex-ai-hero-actions">
          <button
            type="button"
            className="ex-ai-ghost-btn"
            onClick={() => addToWishlist(user?.id, { ...product, id })}
          >
            <Heart size={18} fill={wishlisted ? 'var(--brand-primary)' : 'none'} color={wishlisted ? 'var(--brand-primary)' : 'currentColor'} />
          </button>
          <button type="button" className="ex-ai-cta" onClick={() => navigateToProduct(navigate, product)}>
            View Details
          </button>
          <button type="button" className="ex-cart-fab ex-cart-fab--inline" onClick={() => addItem(product, 1)}>
            <ShoppingBag size={18} strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </article>
  );
}

export function ExploreGridCard({ product, variant = 'trending', index = 0, sub }) {
  const navigate = useNavigate();
  const cardRef = useRef(null);
  const user = useAuthStore((s) => s.user);
  const addToWishlist = useWishlistStore((s) => s.addToWishlist);
  const isInWishlist = useWishlistStore((s) => s.isInWishlist);
  const addItem = useBuyerCart((s) => s.addItem);
  const triggerFlyToCart = useMotionUi((s) => s.triggerFlyToCart);
  const currencyPricing = useCurrencyPricing();
  const id = productId(product);
  const wishlisted = isInWishlist(String(id));
  const badge = BADGE[variant] || BADGE.trending;
  const BadgeIcon = badge.icon;

  const flyFromCard = useCallback(() => {
    const rect = cardRef.current?.getBoundingClientRect();
    triggerFlyToCart({
      src: resolveProductImage(product),
      from: rect
        ? { x: rect.left + rect.width / 2, y: rect.top + rect.height * 0.35 }
        : { x: window.innerWidth / 2, y: window.innerHeight / 2 },
    });
  }, [product, triggerFlyToCart]);

  const meta =
    variant === 'bestseller'
      ? formatSold(product)
      : variant === 'viewed'
        ? formatViews(product)
        : variant === 'new'
          ? formatNewMeta(sub)
          : null;

  return (
    <motion.article
      ref={cardRef}
      className={`ex-grid-card ex-grid-card--${variant}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.26, delay: Math.min(index * 0.03, 0.24) }}
      whileTap={{ scale: 0.98 }}
    >
      <button type="button" className="ex-grid-card-hit" onClick={() => navigateToProduct(navigate, product)}>
        <div className="ex-grid-card-media">
          <img src={resolveProductImage(product)} alt="" loading="lazy" />
          <span className={`ex-badge ex-badge--${variant}`}>
            <BadgeIcon size={12} strokeWidth={1.85} />
            {badge.emoji} {badge.label}
          </span>
          <button
            type="button"
            className="ex-wish-btn ex-wish-btn--sm"
            aria-label="Save"
            onClick={(e) => {
              e.stopPropagation();
              addToWishlist(user?.id, { ...product, id });
            }}
          >
            <Heart size={16} strokeWidth={1.75} fill={wishlisted ? 'var(--brand-primary)' : 'none'} color={wishlisted ? 'var(--brand-primary)' : 'var(--text-muted)'} />
          </button>
        </div>
        <div className="ex-grid-card-body">
          <h3 className="ex-card-title">{productDisplayName(product)}</h3>
          {variant === 'bestseller' && (
            <p className="ex-card-store">{product.sellerName || product.storeName || 'Verified store'}</p>
          )}
          {meta && <p className="ex-card-meta">{meta}</p>}
          <div className="ex-grid-card-foot">
            <div>
              <p className="ex-card-price">{currencyPricing.formatLocalWithUsd(product.price || 0)}</p>
              {(variant === 'trending' || variant === 'bestseller') && (
                <div className="ex-rating">
                  <Star size={11} fill="var(--brand-primary)" color="var(--brand-primary)" />
                  <span>{Number(product.rating || 4.6).toFixed(1)}</span>
                </div>
              )}
            </div>
            <button
              type="button"
              className="ex-cart-fab ex-cart-fab--sm"
              aria-label="Add to cart"
              onClick={(e) => {
                e.stopPropagation();
                addItem(product, 1);
                flyFromCard();
              }}
            >
              <ShoppingBag size={16} strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </button>
    </motion.article>
  );
}

export function renderFeedInsert(item) {
  if (item?._feedInsert === 'sponsored') {
    return <ExploreSponsoredCard key={item._id} item={item} />;
  }
  return null;
}
