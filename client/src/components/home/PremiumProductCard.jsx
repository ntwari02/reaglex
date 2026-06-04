import { useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useMotionTemplate, useTransform } from 'framer-motion';
import { Heart, Star, ShoppingBag } from 'lucide-react';
import { useBuyerCart } from '../../stores/buyerCartStore';
import { useAuthStore } from '../../stores/authStore';
import { useWishlistStore } from '../../stores/wishlistStore';
import { resolveProductPriceUsd } from '../../lib/resolveProductPrice';
import { useCurrencyPricing } from '../../hooks/useCurrencyPricing';
import { useProductCardGestures } from '../../hooks/useProductCardGestures';
import { useMotionUi } from '../../stores/motionUiStore';
import { SERVER_URL } from '../../lib/config';
import { navigateToProduct } from '../../lib/productNavigation';
import { productImageLayoutId } from '../../motion/presets';

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

export default function PremiumProductCard({ product, index = 0 }) {
  const navigate = useNavigate();
  const cardRef = useRef(null);
  const lastTap = useRef(0);
  const addItem = useBuyerCart((s) => s.addItem);
  const user = useAuthStore((s) => s.user);
  const addToWishlist = useWishlistStore((s) => s.addToWishlist);
  const isInWishlist = useWishlistStore((s) => s.isInWishlist);
  const triggerFlyToCart = useMotionUi((s) => s.triggerFlyToCart);
  const openQuickPreview = useMotionUi((s) => s.openQuickPreview);
  const currencyPricing = useCurrencyPricing();

  const name = product.title || product.name || 'Product';
  const price = resolveProductPriceUsd(product);
  const rating = Number(product.averageRating || product.rating || 4.6);
  const reviews = product.totalReviews || product.reviewCount || 0;
  const primary = Array.isArray(product.images)
    ? (product.images.find((img) => img?.is_primary) || product.images[0])
    : product.images?.[0];
  const imgSrc = resolveImage(primary || product.image || product.thumbnail || product.thumbnailUrl);
  const stock = product.stockQuantity ?? product.stock ?? 10;
  const productId = product._id || product.id;
  const wishlisted = isInWishlist(String(productId));

  const flyFromCard = useCallback(() => {
    const rect = cardRef.current?.getBoundingClientRect();
    triggerFlyToCart({
      src: imgSrc,
      from: rect
        ? { x: rect.left + rect.width / 2, y: rect.top + rect.height * 0.35 }
        : { x: window.innerWidth / 2, y: window.innerHeight / 2 },
    });
  }, [imgSrc, triggerFlyToCart]);

  const handleSwipeCart = useCallback(() => {
    if (stock <= 0) return;
    addItem(product, 1);
    flyFromCard();
  }, [addItem, flyFromCard, product, stock]);

  const wishlistProduct = { ...product, id: product._id || product.id };

  const handleSwipeWishlist = useCallback(() => {
    addToWishlist(user?.id, wishlistProduct);
  }, [addToWishlist, wishlistProduct, user?.id]);

  const {
    bind,
    x,
    cardScale,
    cartReveal,
    wishReveal,
    longPressFired,
    pressCompress,
    releaseCompress,
  } = useProductCardGestures({
    onSwipeCart: handleSwipeCart,
    onSwipeWishlist: handleSwipeWishlist,
    onLongPress: () => openQuickPreview(product),
    onDoubleTap: () => addToWishlist(user?.id, wishlistProduct),
  });

  const xStyle = useMotionTemplate`translateX(${x}px)`;
  const cartBg = useTransform(cartReveal, [0, 1], ['rgba(34,197,94,0)', 'rgba(34,197,94,0.92)']);
  const wishBg = useTransform(wishReveal, [0, 1], ['rgba(255,122,26,0)', 'rgba(255,122,26,0.9)']);

  const openProduct = useCallback(
    (e) => {
      if (longPressFired.current) {
        longPressFired.current = false;
        e?.preventDefault?.();
        return;
      }
      pressCompress();
      navigateToProduct(navigate, product);
      window.setTimeout(releaseCompress, 180);
    },
    [navigate, product, pressCompress, releaseCompress, longPressFired],
  );

  const onCardClick = (e) => {
    const now = Date.now();
    if (now - lastTap.current < 280) {
      lastTap.current = 0;
      e.preventDefault();
      addToWishlist(user?.id, wishlistProduct);
      return;
    }
    lastTap.current = now;
    window.setTimeout(() => {
      if (lastTap.current === now) openProduct(e);
    }, 290);
  };

  const rounded = Math.min(5, Math.max(0, Math.round(rating)));
  const imageLayoutId = productImageLayoutId(product);

  return (
    <motion.article
      ref={cardRef}
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
      className="relative min-w-0"
      style={{ scale: cardScale }}
    >
      <motion.div
        {...bind()}
        style={{ x: xStyle, touchAction: 'pan-y' }}
        className="relative overflow-hidden rounded-[20px]"
        onClick={onCardClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && openProduct(e)}
      >
        <motion.div
          className="pointer-events-none absolute inset-0 z-0 flex items-center justify-end rounded-[20px] px-4"
          style={{ background: cartBg }}
        >
          <ShoppingBag className="text-white" size={22} />
        </motion.div>
        <motion.div
          className="pointer-events-none absolute inset-0 z-0 flex items-center justify-start rounded-[20px] px-4"
          style={{ background: wishBg }}
        >
          <Heart className="text-white" size={22} fill="white" />
        </motion.div>

        <motion.div
          className="relative z-[1] overflow-hidden rounded-[20px]"
          style={{
            background: 'var(--card-bg)',
            boxShadow: 'var(--shadow-card)',
            border: '1px solid color-mix(in srgb, var(--border-card) 65%, transparent)',
          }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 520, damping: 38 }}
        >
          <motion.div
            className="relative overflow-hidden"
            style={{ aspectRatio: '1 / 1.05', background: 'var(--bg-tertiary)' }}
          >
            <motion.img
              layoutId={imageLayoutId}
              layout
              src={imgSrc}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
              decoding="async"
              transition={{ type: 'spring', stiffness: 380, damping: 34 }}
              onError={(e) => {
                e.target.src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80';
              }}
            />

            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={(e) => {
                e.stopPropagation();
                addToWishlist(user?.id, wishlistProduct);
              }}
              className="absolute right-2.5 top-2.5 z-[2] flex h-9 w-9 items-center justify-center rounded-full"
              style={{
                background: 'color-mix(in srgb, var(--card-bg) 92%, transparent)',
                border: '1px solid color-mix(in srgb, var(--border-card) 70%, transparent)',
                backdropFilter: 'blur(10px)',
              }}
              aria-label="Wishlist"
            >
              <Heart
                size={16}
                fill={wishlisted ? 'var(--brand-primary)' : 'none'}
                stroke={wishlisted ? 'var(--brand-primary)' : 'var(--text-muted)'}
              />
            </motion.button>

            <motion.button
              type="button"
              whileTap={{ scale: 0.94 }}
              onClick={(e) => {
                e.stopPropagation();
                if (stock <= 0) return;
                addItem(product, 1);
                flyFromCard();
              }}
              disabled={stock <= 0}
              className="absolute bottom-2.5 right-2.5 z-[2] flex h-10 w-10 items-center justify-center rounded-full disabled:opacity-35"
              style={{
                background: 'var(--brand-primary)',
                color: 'var(--text-on-accent)',
                boxShadow: 'var(--shadow-cta)',
              }}
              aria-label="Add to cart"
            >
              <ShoppingBag size={17} />
            </motion.button>
          </motion.div>

          <div className="space-y-1.5 px-3 pb-3 pt-3">
            <h3 className="line-clamp-2 text-[13px] font-medium leading-snug" style={{ color: 'var(--text-primary)' }}>
              {name}
            </h3>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star
                  key={n}
                  size={11}
                  className={n <= rounded ? 'fill-[var(--brand-primary)] text-[var(--brand-primary)]' : 'fill-transparent text-[var(--border-card)]'}
                />
              ))}
              {reviews > 0 && (
                <span className="text-[11px] tabular-nums" style={{ color: 'var(--text-muted)' }}>
                  ({reviews})
                </span>
              )}
            </div>
            <p className="text-[15px] font-semibold" style={{ color: 'var(--brand-primary)' }}>
              {currencyPricing.formatLocalWithUsd(price)}
            </p>
          </div>
        </motion.div>
      </motion.div>
    </motion.article>
  );
}
