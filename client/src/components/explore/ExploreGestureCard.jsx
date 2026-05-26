import { forwardRef, useRef, useCallback } from 'react';
import { motion, useMotionTemplate, useTransform } from 'framer-motion';
import { Heart, ShoppingBag } from 'lucide-react';
import { useProductCardGestures } from '../../hooks/useProductCardGestures';
import { useAuthStore } from '../../stores/authStore';
import { useWishlistStore } from '../../stores/wishlistStore';
import { useBuyerCart } from '../../stores/buyerCartStore';
import { useMotionUi } from '../../stores/motionUiStore';

/**
 * Swipe right → add to cart · swipe left → wishlist · tap → quick preview · double-tap → add to cart
 */
const ExploreGestureCard = forwardRef(function ExploreGestureCard(
  {
  product,
  wishlistProduct,
  onFlyFromCard,
  className = '',
  children,
  showHint = true,
  },
  ref,
) {
  const innerRef = useRef(null);
  const cardRef = ref || innerRef;
  const lastTap = useRef(0);
  const user = useAuthStore((s) => s.user);
  const addToWishlist = useWishlistStore((s) => s.addToWishlist);
  const addItem = useBuyerCart((s) => s.addItem);
  const openQuickPreview = useMotionUi((s) => s.openQuickPreview);

  const stock = product?.stockQuantity ?? product?.stock ?? 10;

  const handleSwipeCart = useCallback(() => {
    if (stock <= 0) return;
    addItem(product, 1);
    onFlyFromCard?.();
  }, [addItem, onFlyFromCard, product, stock]);

  const handleSwipeWishlist = useCallback(() => {
    addToWishlist(user?.id, wishlistProduct);
  }, [addToWishlist, user?.id, wishlistProduct]);

  const openPreview = useCallback(() => {
    openQuickPreview(product);
  }, [openQuickPreview, product]);

  const {
    bind,
    x,
    cardScale,
    cartReveal,
    wishReveal,
    longPressFired,
  } = useProductCardGestures({
    onSwipeCart: handleSwipeCart,
    onSwipeWishlist: handleSwipeWishlist,
    onLongPress: openPreview,
  });

  const xStyle = useMotionTemplate`translateX(${x}px)`;
  const cartBg = useTransform(cartReveal, [0, 1], ['rgba(34,197,94,0)', 'rgba(34,197,94,0.92)']);
  const wishBg = useTransform(wishReveal, [0, 1], ['rgba(255,122,26,0)', 'rgba(255,122,26,0.9)']);

  const onCardClick = (e) => {
    if (e.target.closest('button, a')) return;
    if (longPressFired.current) {
      longPressFired.current = false;
      e.preventDefault();
      return;
    }
    const now = Date.now();
    if (now - lastTap.current < 300) {
      lastTap.current = 0;
      e.preventDefault();
      handleSwipeCart();
      return;
    }
    lastTap.current = now;
    window.setTimeout(() => {
      if (lastTap.current === now) openPreview();
    }, 310);
  };

  return (
    <motion.article
      ref={cardRef}
      className={`ex-gesture-card ${className}`.trim()}
      style={{ scale: cardScale }}
    >
      <motion.div
        {...bind()}
        style={{ x: xStyle, touchAction: 'pan-y' }}
        className="ex-gesture-card-drag"
        onClick={onCardClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter') openPreview();
        }}
        aria-label="View product. Double-tap or swipe right to add to cart."
      >
        <motion.div
          className="ex-gesture-reveal ex-gesture-reveal--cart"
          style={{ background: cartBg }}
          aria-hidden
        >
          <ShoppingBag size={20} className="text-white" />
          <span>Add</span>
        </motion.div>
        <motion.div
          className="ex-gesture-reveal ex-gesture-reveal--wish"
          style={{ background: wishBg }}
          aria-hidden
        >
          <Heart size={20} className="text-white" fill="white" />
        </motion.div>
        <div className="ex-gesture-card-surface">{children}</div>
      </motion.div>
      {showHint && (
        <p className="ex-gesture-hint" aria-hidden>
          Tap view · Swipe → cart · Double-tap add
        </p>
      )}
    </motion.article>
  );
});

export default ExploreGestureCard;
