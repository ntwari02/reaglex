import { useLayoutEffect, useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { useNavigationMemory } from '../stores/navigationMemoryStore';
import {
  logicalScrollKey,
  scrollCacheKey,
  saveScrollSnapshot,
  restoreScrollSnapshot,
  readScrollSnapshot,
} from './scrollCache';
import { logicalRouteKey } from './logicalRouteKey';

const THROTTLE_MS = 120;

/**
 * Global SPA scroll memory — restores position before paint on return visits.
 * Replaces aggressive scroll-to-top on tab revisits.
 */
export function NavigationMemoryBridge() {
  const { pathname, search, key: locationKey, hash } = useLocation();
  const navigationType = useNavigationType();
  const layersLocked = useNavigationMemory((s) => s.layersLocked);
  const prevRouteRef = useRef<string | null>(null);
  const throttleRef = useRef(0);

  const logicKey = logicalScrollKey(pathname, search);
  const histKey = scrollCacheKey(pathname, search, locationKey);

  // Save outgoing route scroll when location changes
  useLayoutEffect(() => {
    const prev = prevRouteRef.current;
    if (prev && prev !== logicKey && !layersLocked) {
      saveScrollSnapshot(prev, {});
    }
    prevRouteRef.current = logicKey;
  }, [logicKey, layersLocked]);

  // Restore on enter (POP, tab revisit, or overlay close)
  useLayoutEffect(() => {
    if (layersLocked || hash) return;

    const restore = () => {
      const fromHist = navigationType === 'POP' && readScrollSnapshot(histKey);
      const fromLogic = readScrollSnapshot(logicKey);

      if (fromHist) {
        restoreScrollSnapshot(histKey, {}, { maxAttempts: 32 });
        return;
      }
      if (fromLogic) {
        restoreScrollSnapshot(logicKey, {}, { maxAttempts: 32 });
        return;
      }

      if (navigationType === 'PUSH' || navigationType === 'REPLACE') {
        const isProduct =
          pathname.startsWith('/product/') || pathname.startsWith('/products/');
        if (!isProduct) {
          window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        }
      }
    };

    restore();
  }, [pathname, search, locationKey, navigationType, logicKey, histKey, hash, layersLocked]);

  // Continuous save (throttled) while user scrolls
  useEffect(() => {
    if (layersLocked) return undefined;

    const onScroll = () => {
      const now = Date.now();
      if (now - throttleRef.current < THROTTLE_MS) return;
      throttleRef.current = now;
      requestAnimationFrame(() => {
        saveScrollSnapshot(logicKey, {});
        saveScrollSnapshot(histKey, {});
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      onScroll();
      window.removeEventListener('scroll', onScroll);
    };
  }, [logicKey, histKey, layersLocked]);

  // Persist logical key for debugging / future hooks
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.rxRoute = logicalRouteKey(pathname, search);
    }
  }, [pathname, search]);

  return null;
}
