import { useRef, useCallback } from 'react';
import { useGesture } from '@use-gesture/react';
import { useMotionValue, useTransform, animate } from 'framer-motion';

const SNAP = 88;
const MAX_DRAG = 120;
/** Minimum movement before we decide horizontal swipe vs vertical scroll */
const INTENT_PX = 12;
/** Horizontal must exceed vertical by this ratio to count as swipe */
const HORIZONTAL_RATIO = 1.15;

/**
 * Swipe right → cart, swipe left → wishlist, long-press → quick preview, double-tap → favorite.
 * Vertical scroll is never blocked: only clearly horizontal drags move the card.
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
  const pointerStart = useRef(null);
  const pointerMoved = useRef(false);
  const dragIntent = useRef(null);

  const cartReveal = useTransform(x, [0, SNAP], [0, 1]);
  const wishReveal = useTransform(x, [-SNAP, 0], [1, 0]);

  const resetX = useCallback(() => {
    animate(x, 0, { type: 'spring', stiffness: 420, damping: 36 });
  }, [x]);

  const clearDragIntent = useCallback(() => {
    dragIntent.current = null;
  }, []);

  const bind = useGesture(
    {
      onDrag: ({ movement: [mx, my], direction: [dx], velocity: [vx], last, cancel, event }) => {
        if (!enabled) return;
        if (event?.target?.closest?.('button, a')) return;

        if (dragIntent.current === null) {
          const dist = Math.hypot(mx, my);
          if (dist < INTENT_PX) return;

          if (Math.abs(my) >= Math.abs(mx) * HORIZONTAL_RATIO) {
            dragIntent.current = 'scroll';
            cancel();
            return;
          }
          if (Math.abs(mx) >= Math.abs(my) * HORIZONTAL_RATIO) {
            dragIntent.current = 'x';
          } else {
            dragIntent.current = 'scroll';
            cancel();
            return;
          }
        }

        if (dragIntent.current === 'scroll') {
          if (last) clearDragIntent();
          return;
        }

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
        }

        resetX();
        clearDragIntent();
      },
      onPointerDown: ({ event }) => {
        if (!enabled) return;
        longPressFired.current = false;
        pointerMoved.current = false;
        dragIntent.current = null;
        pointerStart.current = { x: event.clientX, y: event.clientY };
        if (!onLongPress) return;
        const target = event.target;
        clearTimeout(longPressTimer.current);
        longPressTimer.current = window.setTimeout(() => {
          if (pointerMoved.current || target?.closest?.('button')) return;
          longPressFired.current = true;
          animate(cardScale, 0.97, { duration: 0.12 });
          onLongPress();
        }, 520);
      },
      onPointerMove: ({ event }) => {
        const start = pointerStart.current;
        if (!start) return;
        const dx = event.clientX - start.x;
        const dy = event.clientY - start.y;
        if (Math.hypot(dx, dy) > 12) {
          pointerMoved.current = true;
          clearTimeout(longPressTimer.current);
        }
      },
      onPointerUp: () => {
        clearTimeout(longPressTimer.current);
        pointerStart.current = null;
        clearDragIntent();
        animate(cardScale, 1, { type: 'spring', stiffness: 520, damping: 38 });
      },
      onPointerCancel: () => {
        clearTimeout(longPressTimer.current);
        pointerStart.current = null;
        clearDragIntent();
        resetX();
        animate(cardScale, 1, { type: 'spring', stiffness: 520, damping: 38 });
      },
    },
    {
      drag: {
        axis: 'x',
        filterTaps: true,
        threshold: 0,
        preventScroll: false,
        pointer: { touch: true },
      },
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
    pointerMoved,
    onDoubleTapHandler: handleDoubleTap,
    pressCompress,
    releaseCompress,
  };
}
