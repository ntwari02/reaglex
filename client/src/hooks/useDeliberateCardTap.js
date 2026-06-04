import { useRef, useCallback } from 'react';

const MOVE_PX = 14;
const SCROLL_PX = 10;
const DOUBLE_MS = 300;

/**
 * Fires onTap only for a deliberate release (minimal movement, no scroll drift).
 * Ignores stray clicks while the user is scrolling past the card.
 */
export function useDeliberateCardTap({ onTap, onDoubleTap, disabled = false } = {}) {
  const startRef = useRef(null);
  const movedRef = useRef(false);
  const lastTapRef = useRef(0);

  const clearStart = useCallback(() => {
    startRef.current = null;
    movedRef.current = false;
  }, []);

  const onPointerDown = useCallback(
    (e) => {
      if (disabled || e.button !== 0) return;
      if (e.target?.closest?.('button, a, input, textarea, select')) return;
      movedRef.current = false;
      startRef.current = {
        x: e.clientX,
        y: e.clientY,
        scrollY: typeof window !== 'undefined' ? window.scrollY : 0,
        t: Date.now(),
      };
    },
    [disabled],
  );

  const onPointerMove = useCallback((e) => {
    const start = startRef.current;
    if (!start || movedRef.current) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.hypot(dx, dy) > MOVE_PX) {
      movedRef.current = true;
    }
  }, []);

  const onPointerUp = useCallback(
    (e) => {
      const start = startRef.current;
      if (!start || disabled) {
        clearStart();
        return;
      }
      if (e.target?.closest?.('button, a, input, textarea, select')) {
        clearStart();
        return;
      }

      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      const scrollDrift = Math.abs((typeof window !== 'undefined' ? window.scrollY : 0) - start.scrollY);
      const moved = movedRef.current || Math.hypot(dx, dy) > MOVE_PX || scrollDrift > SCROLL_PX;

      clearStart();

      if (moved) return;

      const now = Date.now();
      if (onDoubleTap && now - lastTapRef.current < DOUBLE_MS) {
        lastTapRef.current = 0;
        e.preventDefault?.();
        onDoubleTap(e);
        return;
      }

      lastTapRef.current = now;
      if (onTap) {
        e.preventDefault?.();
        onTap(e);
      }
    },
    [clearStart, disabled, onDoubleTap, onTap],
  );

  const onPointerCancel = useCallback(() => {
    clearStart();
  }, [clearStart]);

  const tapHandlers = {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
  };

  return { tapHandlers, movedRef, clearStart };
}
