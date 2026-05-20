import { useCallback, useRef } from 'react';

const DOUBLE_TAP_MS = 300;
const LONG_PRESS_MS = 480;

/**
 * Mobile search bar gestures:
 * - single tap → onOpenSearch
 * - double tap → onVoiceSearch
 * - long press → onCameraSearch
 */
export function useSearchBarGestures({ onOpenSearch, onVoiceSearch, onCameraSearch }) {
  const clickTimerRef = useRef(null);
  const longPressRef = useRef(null);
  const longPressFiredRef = useRef(false);

  const clearClickTimer = useCallback(() => {
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
  }, []);

  const onPointerDown = useCallback(
    (e) => {
      if (e.button !== 0) return;
      longPressFiredRef.current = false;
      longPressRef.current = window.setTimeout(() => {
        longPressFiredRef.current = true;
        clearClickTimer();
        onCameraSearch?.();
        if (navigator.vibrate) navigator.vibrate(12);
      }, LONG_PRESS_MS);
    },
    [clearClickTimer, onCameraSearch],
  );

  const onPointerUp = useCallback(() => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
  }, []);

  const onPointerCancel = onPointerUp;

  const onClick = useCallback(
    (e) => {
      if (longPressFiredRef.current) {
        longPressFiredRef.current = false;
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      if (clickTimerRef.current) {
        clearClickTimer();
        e.preventDefault();
        e.stopPropagation();
        onVoiceSearch?.();
        if (navigator.vibrate) navigator.vibrate(8);
        return;
      }

      clickTimerRef.current = window.setTimeout(() => {
        clickTimerRef.current = null;
        onOpenSearch?.();
      }, DOUBLE_TAP_MS);
    },
    [clearClickTimer, onOpenSearch, onVoiceSearch],
  );

  return {
    onPointerDown,
    onPointerUp,
    onPointerCancel,
    onClick,
  };
}
