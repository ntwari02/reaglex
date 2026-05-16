import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useImmersiveSearch } from '../../stores/immersiveSearchStore';
import { useMotionUi } from '../../stores/motionUiStore';
import { isBuyerChromeHidden } from '../../config/buyerNavVisibility';
import { useScrollChromeSync } from '../../hooks/useScrollChrome';

/**
 * Global mobile buyer gestures:
 * - pull down at scroll top → immersive search
 * - swipe up from bottom center → visual search
 */
export default function BuyerGestureShell({ children }) {
  const { pathname } = useLocation();
  const openSearch = useImmersiveSearch((s) => s.openSearch);
  const openVisualSearch = useMotionUi((s) => s.openVisualSearch);
  const touchRef = useRef({ startY: 0, startX: 0, startAt: 0, mode: null });

  useScrollChromeSync(56);

  useEffect(() => {
    if (isBuyerChromeHidden(pathname)) return undefined;

    const onStart = (e) => {
      const t = e.touches?.[0];
      if (!t) return;
      touchRef.current = {
        startY: t.clientY,
        startX: t.clientX,
        startAt: Date.now(),
        mode:
          t.clientY > window.innerHeight - 120 && Math.abs(t.clientX - window.innerWidth / 2) < 90
            ? 'visual'
            : window.scrollY < 6
              ? 'search'
              : null,
      };
    };

    const onMove = (e) => {
      const st = touchRef.current;
      if (!st.mode) return;
      const t = e.touches?.[0];
      if (!t) return;
      const dy = t.clientY - st.startY;

      if (st.mode === 'search' && dy > 72) {
        st.mode = null;
        openSearch('');
      }
      if (st.mode === 'visual' && dy < -64) {
        st.mode = null;
        openVisualSearch();
      }
    };

    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchmove', onMove);
    };
  }, [pathname, openSearch, openVisualSearch]);

  return children;
}
