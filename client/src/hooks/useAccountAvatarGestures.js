import { useCallback, useRef } from 'react';
import { useCommerceTheme } from '../stores/commerceThemeStore';
import { useAccountOverlay } from '../stores/accountOverlayStore';

const DOUBLE_MS = 320;
const LONG_MS = 520;

/**
 * Avatar: single tap → account overlay
 * double tap → appearance layer
 * long press → toggle cinema / ambient
 */
export function useAccountAvatarGestures({ onSingleTap, disabled = false } = {}) {
  const lastTap = useRef(0);
  const longTimer = useRef(null);
  const longFired = useRef(false);

  const clearLong = useCallback(() => {
    if (longTimer.current) {
      window.clearTimeout(longTimer.current);
      longTimer.current = null;
    }
  }, []);

  const onPointerDown = useCallback(() => {
    if (disabled) return;
    longFired.current = false;
    clearLong();
    longTimer.current = window.setTimeout(() => {
      longFired.current = true;
      useCommerceTheme.getState().toggleMode();
    }, LONG_MS);
  }, [clearLong, disabled]);

  const onPointerUp = useCallback(
    (e) => {
      if (disabled) return;
      clearLong();
      if (longFired.current) {
        longFired.current = false;
        e?.preventDefault?.();
        return;
      }

      const now = Date.now();
      if (now - lastTap.current < DOUBLE_MS) {
        lastTap.current = 0;
        e?.preventDefault?.();
        useAccountOverlay.getState().openAppearance();
        return;
      }

      lastTap.current = now;
      window.setTimeout(() => {
        if (lastTap.current !== now) return;
        lastTap.current = 0;
        if (onSingleTap) onSingleTap();
        else useAccountOverlay.getState().openAccount();
      }, DOUBLE_MS + 20);
    },
    [clearLong, disabled, onSingleTap],
  );

  const onPointerLeave = useCallback(() => {
    clearLong();
    longFired.current = false;
  }, [clearLong]);

  return { onPointerDown, onPointerUp, onPointerLeave, onPointerCancel: onPointerLeave };
}
