type ScrollSnapshot = {
  windowY: number;
  containers: Record<string, number>;
};

const memory = new Map<string, ScrollSnapshot>();

export function scrollCacheKey(pathname: string, search: string, locationKey: string) {
  return `${pathname}${search}::${locationKey}`;
}

export function saveScrollSnapshot(
  key: string,
  containers: Record<string, number> = {},
) {
  const prev = memory.get(key);
  memory.set(key, {
    windowY: window.scrollY || document.documentElement.scrollTop || 0,
    containers: { ...(prev?.containers ?? {}), ...containers },
  });
}

export function readScrollSnapshot(key: string): ScrollSnapshot | undefined {
  return memory.get(key);
}

export function restoreScrollSnapshot(
  key: string,
  containerRefs: Record<string, HTMLElement | null | undefined>,
) {
  const snap = memory.get(key);
  if (!snap) return false;

  requestAnimationFrame(() => {
    window.scrollTo({ top: snap.windowY, left: 0, behavior: 'auto' });
    for (const [id, top] of Object.entries(snap.containers)) {
      const el = containerRefs[id];
      if (el) el.scrollTop = top;
    }
  });
  return true;
}

export function clearScrollSnapshot(key: string) {
  memory.delete(key);
}
