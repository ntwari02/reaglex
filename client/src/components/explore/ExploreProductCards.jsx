import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Award,
  Eye,
  Flame,
  Heart,
  Sparkles,
  Star,
  Stars,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useBuyerCart } from '../../stores/buyerCartStore';
import { useWishlistStore } from '../../stores/wishlistStore';
import { resolveProductPriceUsd } from '../../lib/resolveProductPrice';
import { useCurrencyPricing } from '../../hooks/useCurrencyPricing';
import { useMotionUi } from '../../stores/motionUiStore';
import { usePlatformFeature } from '../../hooks/useSystemFeatures';
import { navigateToProduct } from '../../lib/productNavigation';
import MobileAddCta from '../home/mobile/MobileAddCta';
import { EXPLORE_CARD_CTA } from './exploreCardCtas';
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

function ExploreCardActions({ variant, onView, onAdd }) {
  const cta = EXPLORE_CARD_CTA[variant] || EXPLORE_CARD_CTA.trending;
  return (
    <div className="ex-card-actions">
      <button
        type="button"
        className={`ex-card-cta ex-card-cta--${cta.tone}`}
        onClick={onView}
      >
        {cta.label}
      </button>
      <MobileAddCta onClick={onAdd} />
    </div>
  );
}

export function ExploreSponsoredCard({ item }) {
  return (
    <article className="ex-sponsored">
      <span className="ex-sponsored-badge">Sponsored</span>
      <p className="ex-sponsored-title">{item.title || 'Curated for you'}</p>
      <p className="ex-sponsored-sub">{item.subtitle || 'Premium partner · subtle placement'}</p>
      <button type="button" className="ex-sponsored-cta">
        Learn more
      </button>
    </article>
  );
}

export function ExploreTrendingRailCard({ product, index = 0, cardDensity = 'standard', className = '' }) {
  const [expanded, setExpanded] = useState(false);
  const expandable = cardDensity === 'compact_expandable';
  const { enabled: wishlistOn } = usePlatformFeature('product_wishlist');
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
      className={`ex-rail-card ${className} ${expandable && expanded ? 'ex-card--expanded' : ''}`.trim()}
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.24, delay: index * 0.03 }}
      onClick={expandable ? () => setExpanded((v) => !v) : undefined}
    >
      <div className="ex-rail-card-hit">
        {expandable && !expanded && <span className="ex-card-expand-hint">Tap to expand</span>}
        <button
          type="button"
          className="ex-rail-card-tap"
          onClick={(e) => {
            if (expandable) {
              e.stopPropagation();
              setExpanded((v) => !v);
              return;
            }
            navigateToProduct(navigate, product);
          }}
        >
          <div className="ex-rail-card-media">
            <img src={resolveProductImage(product)} alt="" loading="lazy" />
            <span className="ex-badge ex-badge--trending">🔥 Hot</span>
            {wishlistOn && (
              <button
                type="button"
                className="ex-wish-btn ex-wish-btn--sm ex-wish-btn--plain"
                aria-label="Save"
                onClick={(e) => {
                  e.stopPropagation();
                  addToWishlist(user?.id, { ...product, id });
                }}
              >
                <Heart
                  size={14}
                  strokeWidth={1.75}
                  fill={wishlisted ? 'var(--brand-primary)' : 'none'}
                  color={wishlisted ? 'var(--brand-primary)' : 'var(--text-muted)'}
                />
              </button>
            )}
          </div>
          <div className="ex-rail-card-body">
            <h3 className="ex-card-title">{productDisplayName(product)}</h3>
            <p className="ex-card-price">{currencyPricing.formatLocalWithUsd(resolveProductPriceUsd(product))}</p>
            <div className="ex-rating">
              <Star size={10} fill="var(--brand-primary)" color="var(--brand-primary)" />
              <span>{Number(product.rating || product.averageRating || 4.7).toFixed(1)}</span>
            </div>
          </div>
        </button>
        <ExploreCardActions
          variant="trending"
          onView={() => navigateToProduct(navigate, product)}
          onAdd={(e) => {
            e.stopPropagation();
            addItem(product, 1);
          }}
        />
      </div>
    </motion.article>
  );
}

export function ExploreAIHeroCard({ product }) {
  const navigate = useNavigate();
  const addItem = useBuyerCart((s) => s.addItem);
  const currencyPricing = useCurrencyPricing();
  const reason = product.aiMeta?.topReason || product.aiMeta?.reasons?.[0] || 'Based on your activity';

  return (
    <article className="ex-ai-hero">
      <button
        type="button"
        className="ex-ai-hero-tap"
        onClick={() => navigateToProduct(navigate, product)}
      >
        <div className="ex-ai-hero-media">
          <img src={resolveProductImage(product)} alt="" loading="lazy" />
        </div>
        <div className="ex-ai-hero-body">
          <span className="ex-badge ex-badge--ai">✨ AI Pick</span>
          <h3 className="ex-ai-hero-title">{productDisplayName(product)}</h3>
          <p className="ex-ai-hero-reason">{reason}</p>
          <p className="ex-card-price ex-ai-hero-price">
            {currencyPricing.formatLocalWithUsd(resolveProductPriceUsd(product))}
          </p>
        </div>
      </button>
      <div className="ex-ai-hero-actions">
        <button type="button" className="ex-card-cta ex-card-cta--ai" onClick={() => navigateToProduct(navigate, product)}>
          View pick
        </button>
        <MobileAddCta
          variant="pill"
          label="Add"
          onClick={() => addItem(product, 1)}
        />
      </div>
    </article>
  );
}

export function ExploreGridCard({
  product,
  variant = 'trending',
  index = 0,
  sub,
  cardDensity = 'standard',
  className = '',
  cartNearPrice = false,
}) {
  const [expanded, setExpanded] = useState(false);
  const expandable = cardDensity === 'compact_expandable';
  const { enabled: wishlistOn } = usePlatformFeature('product_wishlist');
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
      className={`ex-grid-card ex-grid-card--${variant} ${className} ${expandable && expanded ? 'ex-card--expanded' : ''}`.trim()}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: Math.min(index * 0.025, 0.2) }}
      whileTap={expandable ? undefined : { scale: 0.98 }}
      onClick={expandable ? () => setExpanded((v) => !v) : undefined}
    >
      <div className="ex-grid-card-hit">
        {expandable && !expanded && <span className="ex-card-expand-hint">Tap to expand</span>}
        <button
          type="button"
          className="ex-grid-card-tap"
          onClick={(e) => {
            if (expandable) {
              e.stopPropagation();
              setExpanded((v) => !v);
              return;
            }
            navigateToProduct(navigate, product);
          }}
        >
          <div className="ex-grid-card-media">
            <img src={resolveProductImage(product)} alt="" loading="lazy" />
            <span className={`ex-badge ex-badge--${variant}`}>
              <BadgeIcon size={10} strokeWidth={1.85} />
              {badge.label}
            </span>
            {wishlistOn && (
              <button
                type="button"
                className="ex-wish-btn ex-wish-btn--sm ex-wish-btn--plain"
                aria-label="Save"
                onClick={(e) => {
                  e.stopPropagation();
                  addToWishlist(user?.id, { ...product, id });
                }}
              >
                <Heart
                  size={14}
                  strokeWidth={1.75}
                  fill={wishlisted ? 'var(--brand-primary)' : 'none'}
                  color={wishlisted ? 'var(--brand-primary)' : 'var(--text-muted)'}
                />
              </button>
            )}
          </div>
          <div className="ex-grid-card-body">
            <h3 className="ex-card-title">{productDisplayName(product)}</h3>
            {variant === 'bestseller' && (
              <p className="ex-card-store">{product.sellerName || product.storeName || 'Verified'}</p>
            )}
            {meta && <p className="ex-card-meta">{meta}</p>}
            {cartNearPrice && variant === 'trending' ? (
              <div className="ex-price-cart-row">
                <p className="ex-card-price ex-card-price--inline">
                  {currencyPricing.formatLocalWithUsd(resolveProductPriceUsd(product))}
                </p>
                <MobileAddCta
                  iconType="cart"
                  onClick={(e) => {
                    e.stopPropagation();
                    addItem(product, 1);
                    flyFromCard();
                  }}
                />
              </div>
            ) : (
              <p className="ex-card-price">{currencyPricing.formatLocalWithUsd(resolveProductPriceUsd(product))}</p>
            )}
            {(variant === 'trending' || variant === 'bestseller') && (
              <div className="ex-rating">
                <Star size={10} fill="var(--brand-primary)" color="var(--brand-primary)" />
                <span>{Number(product.rating || 4.6).toFixed(1)}</span>
              </div>
            )}
          </div>
        </button>
        {!(cartNearPrice && variant === 'trending') && (
          <ExploreCardActions
            variant={variant}
            onView={() => navigateToProduct(navigate, product)}
            onAdd={(e) => {
              e.stopPropagation();
              addItem(product, 1);
              flyFromCard();
            }}
          />
        )}
      </div>
    </motion.article>
  );
}

export function renderFeedInsert(item) {
  if (item?._feedInsert === 'sponsored') {
    return <ExploreSponsoredCard key={item._id} item={item} />;
  }
  return null;
}
