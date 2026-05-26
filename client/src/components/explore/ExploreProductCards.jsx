import { useCallback, useRef } from 'react';
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
import { useCurrencyPricing } from '../../hooks/useCurrencyPricing';
import { useMotionUi } from '../../stores/motionUiStore';
import MobileAddCta from '../home/mobile/MobileAddCta';
import ExploreGestureCard from './ExploreGestureCard';
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

export function ExploreTrendingRailCard({ product, index = 0 }) {
  const cardRef = useRef(null);
  const user = useAuthStore((s) => s.user);
  const addToWishlist = useWishlistStore((s) => s.addToWishlist);
  const isInWishlist = useWishlistStore((s) => s.isInWishlist);
  const addItem = useBuyerCart((s) => s.addItem);
  const openQuickPreview = useMotionUi((s) => s.openQuickPreview);
  const triggerFlyToCart = useMotionUi((s) => s.triggerFlyToCart);
  const currencyPricing = useCurrencyPricing();
  const id = productId(product);
  const wishlisted = isInWishlist(String(id));
  const wishlistProduct = { ...product, id };

  const flyFromCard = useCallback(() => {
    const rect = cardRef.current?.getBoundingClientRect();
    triggerFlyToCart({
      src: resolveProductImage(product),
      from: rect
        ? { x: rect.left + rect.width / 2, y: rect.top + rect.height * 0.35 }
        : { x: window.innerWidth / 2, y: window.innerHeight / 2 },
    });
  }, [product, triggerFlyToCart]);

  const handleAdd = (e) => {
    e?.stopPropagation?.();
    addItem(product, 1);
    flyFromCard();
  };

  return (
    <ExploreGestureCard
      ref={cardRef}
      product={product}
      wishlistProduct={wishlistProduct}
      onFlyFromCard={flyFromCard}
      className="ex-rail-card"
      showHint={false}
    >
      <motion.div
        className="ex-rail-card-hit ex-card-vertical"
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.24, delay: index * 0.03 }}
      >
        <div className="ex-rail-card-media ex-card-media--vertical">
          <img src={resolveProductImage(product)} alt="" loading="lazy" />
          <span className="ex-badge ex-badge--trending">🔥 Hot</span>
          <button
            type="button"
            className="ex-wish-btn ex-wish-btn--sm"
            aria-label="Save"
            onClick={(e) => {
              e.stopPropagation();
              addToWishlist(user?.id, wishlistProduct);
            }}
          >
            <Heart
              size={14}
              strokeWidth={1.75}
              fill={wishlisted ? 'var(--brand-primary)' : 'none'}
              color={wishlisted ? 'var(--brand-primary)' : 'var(--text-muted)'}
            />
          </button>
        </div>
        <div className="ex-rail-card-body">
          <h3 className="ex-card-title">{productDisplayName(product)}</h3>
          <p className="ex-card-price">{currencyPricing.formatLocalWithUsd(product.price || 0)}</p>
          <div className="ex-rating">
            <Star size={10} fill="var(--brand-primary)" color="var(--brand-primary)" />
            <span>{Number(product.rating || product.averageRating || 4.7).toFixed(1)}</span>
          </div>
        </div>
        <ExploreCardActions
          variant="trending"
          onView={(e) => {
            e?.stopPropagation?.();
            openQuickPreview(product);
          }}
          onAdd={handleAdd}
        />
      </motion.div>
    </ExploreGestureCard>
  );
}

export function ExploreAIHeroCard({ product }) {
  const cardRef = useRef(null);
  const addItem = useBuyerCart((s) => s.addItem);
  const openQuickPreview = useMotionUi((s) => s.openQuickPreview);
  const triggerFlyToCart = useMotionUi((s) => s.triggerFlyToCart);
  const currencyPricing = useCurrencyPricing();
  const reason = product.aiMeta?.topReason || product.aiMeta?.reasons?.[0] || 'Based on your activity';
  const id = productId(product);

  const flyFromCard = useCallback(() => {
    const rect = cardRef.current?.getBoundingClientRect();
    triggerFlyToCart({
      src: resolveProductImage(product),
      from: rect
        ? { x: rect.left + rect.width / 2, y: rect.top + rect.height * 0.4 }
        : { x: window.innerWidth / 2, y: window.innerHeight / 2 },
    });
  }, [product, triggerFlyToCart]);

  return (
    <ExploreGestureCard
      ref={cardRef}
      product={product}
      wishlistProduct={{ ...product, id }}
      onFlyFromCard={flyFromCard}
      className="ex-ai-hero-wrap"
      showHint={false}
    >
      <article className="ex-ai-hero ex-card-vertical">
        <div className="ex-ai-hero-media ex-card-media--vertical">
          <img src={resolveProductImage(product)} alt="" loading="lazy" />
        </div>
        <div className="ex-ai-hero-body">
          <span className="ex-badge ex-badge--ai">✨ AI Pick</span>
          <h3 className="ex-ai-hero-title">{productDisplayName(product)}</h3>
          <p className="ex-ai-hero-reason">{reason}</p>
          <p className="ex-card-price ex-ai-hero-price">
            {currencyPricing.formatLocalWithUsd(product.price || 0)}
          </p>
        </div>
        <div className="ex-ai-hero-actions">
          <button
            type="button"
            className="ex-card-cta ex-card-cta--ai"
            onClick={(e) => {
              e.stopPropagation();
              openQuickPreview(product);
            }}
          >
            Quick view
          </button>
          <MobileAddCta
            variant="pill"
            label="Add"
            onClick={(e) => {
              e.stopPropagation();
              addItem(product, 1);
              flyFromCard();
            }}
          />
        </div>
      </article>
    </ExploreGestureCard>
  );
}

export function ExploreGridCard({ product, variant = 'trending', index = 0, sub }) {
  const cardRef = useRef(null);
  const user = useAuthStore((s) => s.user);
  const addToWishlist = useWishlistStore((s) => s.addToWishlist);
  const isInWishlist = useWishlistStore((s) => s.isInWishlist);
  const addItem = useBuyerCart((s) => s.addItem);
  const openQuickPreview = useMotionUi((s) => s.openQuickPreview);
  const triggerFlyToCart = useMotionUi((s) => s.triggerFlyToCart);
  const currencyPricing = useCurrencyPricing();
  const id = productId(product);
  const wishlisted = isInWishlist(String(id));
  const badge = BADGE[variant] || BADGE.trending;
  const BadgeIcon = badge.icon;
  const wishlistProduct = { ...product, id };

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

  const handleAdd = (e) => {
    e.stopPropagation();
    addItem(product, 1);
    flyFromCard();
  };

  return (
    <ExploreGestureCard
      ref={cardRef}
      product={product}
      wishlistProduct={wishlistProduct}
      onFlyFromCard={flyFromCard}
      className={`ex-grid-card ex-grid-card--${variant}`}
      showHint={index < 2}
    >
      <motion.div
        className="ex-grid-card-hit ex-card-vertical"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, delay: Math.min(index * 0.025, 0.2) }}
      >
        <div className="ex-grid-card-media ex-card-media--vertical">
          <img src={resolveProductImage(product)} alt="" loading="lazy" />
          <span className={`ex-badge ex-badge--${variant}`}>
            <BadgeIcon size={10} strokeWidth={1.85} />
            {badge.label}
          </span>
          <button
            type="button"
            className="ex-wish-btn ex-wish-btn--sm"
            aria-label="Save"
            onClick={(e) => {
              e.stopPropagation();
              addToWishlist(user?.id, wishlistProduct);
            }}
          >
            <Heart
              size={14}
              strokeWidth={1.75}
              fill={wishlisted ? 'var(--brand-primary)' : 'none'}
              color={wishlisted ? 'var(--brand-primary)' : 'var(--text-muted)'}
            />
          </button>
        </div>
        <div className="ex-grid-card-body">
          <h3 className="ex-card-title">{productDisplayName(product)}</h3>
          {variant === 'bestseller' && (
            <p className="ex-card-store">{product.sellerName || product.storeName || 'Verified'}</p>
          )}
          {meta && <p className="ex-card-meta">{meta}</p>}
          <p className="ex-card-price">{currencyPricing.formatLocalWithUsd(product.price || 0)}</p>
          {(variant === 'trending' || variant === 'bestseller') && (
            <div className="ex-rating">
              <Star size={10} fill="var(--brand-primary)" color="var(--brand-primary)" />
              <span>{Number(product.rating || 4.6).toFixed(1)}</span>
            </div>
          )}
        </div>
        <ExploreCardActions
          variant={variant}
          onView={(e) => {
            e?.stopPropagation?.();
            openQuickPreview(product);
          }}
          onAdd={handleAdd}
        />
      </motion.div>
    </ExploreGestureCard>
  );
}

export function renderFeedInsert(item) {
  if (item?._feedInsert === 'sponsored') {
    return <ExploreSponsoredCard key={item._id} item={item} />;
  }
  return null;
}
