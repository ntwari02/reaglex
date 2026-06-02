import { useEffect } from 'react';
import { useScrollChrome as useScrollChromeStore } from '../stores/scrollChromeStore';
import { isStandaloneInstalled } from '../pwa/useInstallPrompt';

/**
 * Single scroll listener for adaptive header + bottom nav (mobile buyer chrome).
 * In installed PWA mode we keep chrome visible — hiding header/nav feels stiff and
 * fights natural scrolling.
 */
export function useScrollChromeSync(threshold = 56) {
  const setChrome = useScrollChromeStore((s) => s.setChrome);

  useEffect(() => {
    const standalone = isStandaloneInstalled();
    let lastY = window.scrollY;
    let ticking = false;

    const update = () => {
      const y = window.scrollY;
      const compact = y > threshold;
      let headerHidden = false;
      let navHidden = false;

      if (!standalone && y > threshold + 72) {
        if (y > lastY + 16) {
          headerHidden = true;
          navHidden = true;
        } else if (y < lastY - 16) {
          headerHidden = false;
          navHidden = false;
        } else {
          headerHidden = useScrollChromeStore.getState().headerHidden;
          navHidden = useScrollChromeStore.getState().navHidden;
        }
      }

      setChrome({ compact, headerHidden, navHidden });
      lastY = y;
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    update();
    return () => window.removeEventListener('scroll', onScroll);
  }, [setChrome, threshold]);
}
