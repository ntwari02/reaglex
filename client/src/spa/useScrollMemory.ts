import { useLayoutEffect, useEffect, useRef, type RefObject } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { useNavigationMemory } from '../stores/navigationMemoryStore';
import {
  logicalScrollKey,
  scrollCacheKey,
  readScrollSnapshot,
  saveContainerScroll,
  restoreScrollSnapshot,
} from './scrollCache';

/**
 * Persist nested scroll container + optional horizontal scroll.
 * Restores in useLayoutEffect before paint when route becomes active again.
 */
export function useScrollMemory(
  containerId: string,
  ref: RefObject<HTMLElement | null>,
  options: { enabled?: boolean; horizontal?: boolean } = {},
) {
  const { enabled = true, horizontal = false } = options;
  const location = useLocation();
  const navigationType = useNavigationType();
  const layersLocked = useNavigationMemory((s) => s.layersLocked);
  const logicKey = logicalScrollKey(location.pathname, location.search);
  const histKey = scrollCacheKey(location.pathname, location.search, location.key);
  const restoredRef = useRef(false);

  useLayoutEffect(() => {
    if (!enabled || layersLocked || !ref.current) return;
    restoredRef.current = false;

    const refs = { [containerId]: ref.current };
    const snap =
      (navigationType === 'POP' ? readScrollSnapshot(histKey) : null) ??
      readScrollSnapshot(logicKey);

    if (!snap?.containers[containerId] && snap?.horizontal?.[containerId] == null) return;

    const apply = () => {
      const el = ref.current;
      if (!el) return;
      if (snap.containers[containerId] != null) {
        el.scrollTop = snap.containers[containerId];
      }
      if (horizontal && snap.horizontal[containerId] != null) {
        el.scrollLeft = snap.horizontal[containerId];
      }
      restoredRef.current = true;
    };

    apply();
    requestAnimationFrame(apply);
  }, [
    logicKey,
    histKey,
    containerId,
    enabled,
    horizontal,
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
        saveContainerScroll(logicKey, containerId, el.scrollTop, horizontal ? el.scrollLeft : undefined);
        saveContainerScroll(histKey, containerId, el.scrollTop, horizontal ? el.scrollLeft : undefined);
      });
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      onScroll();
      el.removeEventListener('scroll', onScroll);
      if (el) {
        saveContainerScroll(logicKey, containerId, el.scrollTop, horizontal ? el.scrollLeft : undefined);
        saveContainerScroll(histKey, containerId, el.scrollTop, horizontal ? el.scrollLeft : undefined);
      }
    };
  }, [logicKey, histKey, containerId, enabled, horizontal, layersLocked, ref]);
}
