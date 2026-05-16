import { useRef, useCallback } from 'react';
import { useGesture } from '@use-gesture/react';
import { useMotionValue, useTransform, animate } from 'framer-motion';

const SNAP = 88;
const MAX_DRAG = 120;

/**
 * Swipe right → cart, swipe left → wishlist, long-press → quick preview, double-tap → favorite.
 */
export function useProductCardGestures({
  onSwipeCart,
  onSwipeWishlist,
  onLongPress,
  onDoubleTap,
  enabled = true,
}) {
  const x = useMotionValue(0);
  const cardScale = useMotionValue(1);
  const longPressTimer = useRef(null);
  const longPressFired = useRef(false);

  const cartReveal = useTransform(x, [0, SNAP], [0, 1]);
  const wishReveal = useTransform(x, [-SNAP, 0], [1, 0]);

  const resetX = useCallback(() => {
    animate(x, 0, { type: 'spring', stiffness: 420, damping: 36 });
  }, [x]);

  const bind = useGesture(
    {
      onDrag: ({ movement: [mx], direction: [dx], velocity: [vx], last, cancel, event }) => {
        if (!enabled) return;
        if (event?.target?.closest?.('button, a')) return;

        const clamped = Math.max(-MAX_DRAG, Math.min(MAX_DRAG, mx));
        if (!last) {
          x.set(clamped);
          return;
        }

        if (mx > SNAP && dx > 0) {
          onSwipeCart?.();
          cancel();
        } else if (mx < -SNAP && dx < 0) {
          onSwipeWishlist?.();
          cancel();
        } else if (Math.abs(mx) < 24 && Math.abs(vx) < 0.4) {
          /* tap handled elsewhere */
        }

        resetX();
      },
      onPointerDown: ({ event }) => {
        if (!enabled || !onLongPress) return;
        longPressFired.current = false;
        const target = event.target;
        clearTimeout(longPressTimer.current);
        longPressTimer.current = window.setTimeout(() => {
          if (target?.closest?.('button')) return;
          longPressFired.current = true;
          animate(cardScale, 0.97, { duration: 0.12 });
          onLongPress();
        }, 480);
      },
      onPointerUp: () => {
        clearTimeout(longPressTimer.current);
        animate(cardScale, 1, { type: 'spring', stiffness: 520, damping: 38 });
      },
    },
    {
      drag: { axis: 'x', filterTaps: true, threshold: 8 },
    },
  );

  const handleDoubleTap = useCallback(() => {
    if (!enabled) return;
    onDoubleTap?.();
  }, [enabled, onDoubleTap]);

  const pressCompress = useCallback(() => {
    animate(cardScale, 0.96, { duration: 0.1 });
  }, [cardScale]);

  const releaseCompress = useCallback(() => {
    animate(cardScale, 1, { type: 'spring', stiffness: 480, damping: 32 });
  }, [cardScale]);

  return {
    bind,
    x,
    cardScale,
    cartReveal,
    wishReveal,
    resetX,
    longPressFired,
    onDoubleTapHandler: handleDoubleTap,
    pressCompress,
    releaseCompress,
  };
}
