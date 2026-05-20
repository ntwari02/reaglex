import { logicalRouteKey } from './logicalRouteKey';

export type ScrollSnapshot = {
  windowY: number;
  windowX: number;
  containers: Record<string, number>;
  horizontal: Record<string, number>;
  savedAt: number;
};

const memory = new Map<string, ScrollSnapshot>();

/** History-specific key (browser back/forward stack). */
export function scrollCacheKey(pathname: string, search: string, locationKey: string) {
  return `hist:${pathname}${search}::${locationKey}`;
}

/** Stable tab/feed key (bottom nav, return visits). */
export function logicalScrollKey(pathname: string, search = '') {
  return `logic:${logicalRouteKey(pathname, search)}`;
}

export function saveScrollSnapshot(
  key: string,
  partial?: {
    containers?: Record<string, number>;
    horizontal?: Record<string, number>;
    windowY?: number;
    windowX?: number;
  },
) {
  const prev = memory.get(key);
  memory.set(key, {
    windowY: partial?.windowY ?? window.scrollY ?? document.documentElement.scrollTop ?? 0,
    windowX: partial?.windowX ?? window.scrollX ?? 0,
    containers: { ...(prev?.containers ?? {}), ...(partial?.containers ?? {}) },
    horizontal: { ...(prev?.horizontal ?? {}), ...(partial?.horizontal ?? {}) },
    savedAt: Date.now(),
  });
}

export function saveContainerScroll(
  key: string,
  containerId: string,
  scrollTop: number,
  scrollLeft?: number,
) {
  const prev = memory.get(key);
  const containers = { ...(prev?.containers ?? {}), [containerId]: scrollTop };
  const horizontal =
    scrollLeft != null
      ? { ...(prev?.horizontal ?? {}), [containerId]: scrollLeft }
      : { ...(prev?.horizontal ?? {}) };
  saveScrollSnapshot(key, {
    windowY: prev?.windowY,
    windowX: prev?.windowX,
    containers,
    horizontal,
  });
}

export function readScrollSnapshot(key: string): ScrollSnapshot | undefined {
  return memory.get(key);
}

function applySnapshot(
  snap: ScrollSnapshot,
  containerRefs: Record<string, HTMLElement | null | undefined>,
) {
  window.scrollTo({ top: snap.windowY, left: snap.windowX ?? 0, behavior: 'auto' });
  document.documentElement.scrollTop = snap.windowY;
  document.body.scrollTop = snap.windowY;

  for (const [id, top] of Object.entries(snap.containers)) {
    const el = containerRefs[id];
    if (el) el.scrollTop = top;
  }
  for (const [id, left] of Object.entries(snap.horizontal)) {
    const el = containerRefs[id];
    if (el) el.scrollLeft = left;
  }
}

/**
 * Restore scroll before paint; retries until content height can hold position.
 */
export function restoreScrollSnapshot(
  key: string,
  containerRefs: Record<string, HTMLElement | null | undefined> = {},
  options: { maxAttempts?: number; targetY?: number } = {},
): boolean {
  const snap = memory.get(key);
  if (!snap) return false;

  const targetY = options.targetY ?? snap.windowY;
  const maxAttempts = options.maxAttempts ?? 24;
  let attempts = 0;

  const tryRestore = () => {
    attempts += 1;
    applySnapshot({ ...snap, windowY: targetY }, containerRefs);

    const maxScroll =
      Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight,
      ) - window.innerHeight;
    const canHold = targetY <= maxScroll + 2 || targetY <= 8;

    if (canHold || attempts >= maxAttempts) return;
    requestAnimationFrame(tryRestore);
  };

  tryRestore();
  return true;
}

export function clearScrollSnapshot(key: string) {
  memory.delete(key);
}

export function captureCurrentScroll(key: string, containerRefs?: Record<string, HTMLElement | null>) {
  const containers: Record<string, number> = {};
  const horizontal: Record<string, number> = {};
  if (containerRefs) {
    for (const [id, el] of Object.entries(containerRefs)) {
      if (!el) continue;
      containers[id] = el.scrollTop;
      horizontal[id] = el.scrollLeft;
    }
  }
  saveScrollSnapshot(key, { containers, horizontal });
}
