import { useLayoutEffect, useEffect, useRef, type RefObject } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { useNavigationMemory } from '../stores/navigationMemoryStore';
import {
  logicalScrollKey,
  scrollCacheKey,
  readScrollSnapshot,
  saveContainerScroll,
} from './scrollCache';

/**
 * Remember carousel / rail horizontal scrollLeft per route.
 * Restores in useLayoutEffect before paint when revisiting a route.
 */
export function useHorizontalScrollMemory(
  railId: string,
  ref: RefObject<HTMLElement | null>,
  enabled = true,
) {
  const location = useLocation();
  const navigationType = useNavigationType();
  const layersLocked = useNavigationMemory((s) => s.layersLocked);
  const logicKey = logicalScrollKey(location.pathname, location.search);
  const histKey = scrollCacheKey(location.pathname, location.search, location.key);
  const restoredRef = useRef(false);

  useLayoutEffect(() => {
    if (!enabled || layersLocked || !ref.current) return;
    restoredRef.current = false;

    const snap =
      (navigationType === 'POP' ? readScrollSnapshot(histKey) : null) ??
      readScrollSnapshot(logicKey);

    const left = snap?.horizontal?.[railId];
    if (left == null) return;

    const apply = () => {
      const el = ref.current;
      if (!el) return;
      el.scrollLeft = left;
      restoredRef.current = true;
    };

    apply();
    requestAnimationFrame(apply);
  }, [
    logicKey,
    histKey,
    railId,
    enabled,
    navigationType,
    layersLocked,
    ref,
    location.pathname,
    location.search,
  ]);

  useEffect(() => {
    if (!enabled || !ref.current) return undefined;
    const el = ref.current;
    let ticking = false;

    const onScroll = () => {
      if (ticking || layersLocked) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        if (!el) return;
        saveContainerScroll(logicKey, railId, el.scrollTop, el.scrollLeft);
        saveContainerScroll(histKey, railId, el.scrollTop, el.scrollLeft);
      });
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      onScroll();
      el.removeEventListener('scroll', onScroll);
      if (el) {
        saveContainerScroll(logicKey, railId, el.scrollTop, el.scrollLeft);
        saveContainerScroll(histKey, railId, el.scrollTop, el.scrollLeft);
      }
    };
  }, [logicKey, histKey, railId, enabled, layersLocked, ref, location.pathname, location.search]);
}
