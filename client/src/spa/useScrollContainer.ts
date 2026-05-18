import { useEffect, useRef, type RefObject } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import {
  readScrollSnapshot,
  saveScrollSnapshot,
  scrollCacheKey,
} from './scrollCache';

/**
 * Persists scroll for a nested scroll container (e.g. search product list).
 * Works together with route keep-alive; also saves on unmount for safety.
 */
export function useScrollContainer(
  containerId: string,
  ref: RefObject<HTMLElement | null>,
  enabled = true,
) {
  const location = useLocation();
  const navigationType = useNavigationType();
  const cacheKey = scrollCacheKey(location.pathname, location.search, location.key);
  const restoredRef = useRef(false);

  useEffect(() => {
    if (!enabled) return undefined;
    restoredRef.current = false;

    if (navigationType === 'POP') {
      const snap = readScrollSnapshot(cacheKey);
      if (snap?.containers[containerId] != null && ref.current) {
        requestAnimationFrame(() => {
          if (ref.current) ref.current.scrollTop = snap.containers[containerId];
        });
        restoredRef.current = true;
      }
    }

    return () => {
      const el = ref.current;
      if (!el) return;
      const prev = readScrollSnapshot(cacheKey);
      saveScrollSnapshot(cacheKey, {
        ...(prev?.containers ?? {}),
        [containerId]: el.scrollTop,
      });
    };
  }, [cacheKey, containerId, enabled, navigationType, ref]);

  useEffect(() => {
    if (!enabled || !ref.current) return undefined;
    const el = ref.current;
    let ticking = false;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const snap = readScrollSnapshot(cacheKey) ?? {
          windowY: window.scrollY,
          containers: {},
        };
        snap.containers[containerId] = el.scrollTop;
        saveScrollSnapshot(cacheKey, snap.containers);
      });
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [cacheKey, containerId, enabled, ref]);
}
