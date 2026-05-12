import { useEffect, useRef, useState } from 'react';
import { haptic } from './haptics';

type Options = {
  onRefresh: () => Promise<unknown> | unknown;
  /** Pixel distance the user must drag before we trigger a refresh. */
  threshold?: number;
  /** Disabled when the user is interacting with something that scrolls. */
  enabled?: boolean;
};

/**
 * Native-feeling pull-to-refresh. Attach the returned ref to a container
 * whose scrollTop will be 0 when the user starts the drag (typically the
 * top of a page or a scrollable list).
 *
 * Visual indicator is provided by the consumer using `pullDistance` and
 * `state`, so each page can theme it consistently.
 */
export function usePullToRefresh({ onRefresh, threshold = 70, enabled = true }: Options) {
  const ref = useRef<HTMLDivElement | null>(null);
  const startY = useRef<number | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [state, setState] = useState<'idle' | 'pulling' | 'ready' | 'refreshing'>('idle');
  const hapticArmed = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;

    function atTop() {
      const target = el!;
      return (target.scrollTop || window.scrollY || 0) <= 0;
    }

    function onTouchStart(e: TouchEvent) {
      if (!atTop()) {
        startY.current = null;
        return;
      }
      startY.current = e.touches[0]?.clientY ?? null;
      hapticArmed.current = false;
    }

    function onTouchMove(e: TouchEvent) {
      if (startY.current == null) return;
      const y = e.touches[0]?.clientY ?? startY.current;
      const delta = y - startY.current;
      if (delta <= 0) {
        setPullDistance(0);
        setState('idle');
        return;
      }
      const damped = Math.min(180, delta * 0.5);
      setPullDistance(damped);
      if (damped >= threshold) {
        if (!hapticArmed.current) {
          haptic('selection');
          hapticArmed.current = true;
        }
        setState('ready');
      } else {
        setState('pulling');
      }
    }

    async function onTouchEnd() {
      if (startY.current == null) return;
      const shouldRefresh = state === 'ready' || pullDistance >= threshold;
      startY.current = null;
      if (shouldRefresh) {
        setState('refreshing');
        setPullDistance(threshold);
        try {
          haptic('success');
          await onRefresh();
        } finally {
          setPullDistance(0);
          setState('idle');
        }
      } else {
        setPullDistance(0);
        setState('idle');
      }
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    el.addEventListener('touchcancel', onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [enabled, onRefresh, threshold, pullDistance, state]);

  return { ref, pullDistance, state, threshold };
}
