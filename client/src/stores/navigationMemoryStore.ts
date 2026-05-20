import { create } from 'zustand';
import {
  captureCurrentScroll,
  logicalScrollKey,
  restoreScrollSnapshot,
  saveScrollSnapshot,
} from '../spa/scrollCache';

type RouteUiState = Record<string, unknown>;

type NavigationMemoryState = {
  /** Active logical route when overlay opened */
  frozenRouteKey: string | null;
  frozenWindowY: number;
  overlayDepth: number;
  routeUi: Record<string, RouteUiState>;
  /** Prevent ScrollToTop from zeroing while layers open */
  layersLocked: boolean;

  freezeForOverlay: (pathname: string, search: string) => void;
  unfreezeOverlay: (pathname: string, search: string) => void;
  setRouteUi: (pathname: string, search: string, patch: RouteUiState) => void;
  getRouteUi: (pathname: string, search: string) => RouteUiState | undefined;
  saveActiveScroll: (pathname: string, search: string) => void;
  restoreActiveScroll: (pathname: string, search: string) => boolean;
};

export const useNavigationMemory = create<NavigationMemoryState>((set, get) => ({
  frozenRouteKey: null,
  frozenWindowY: 0,
  overlayDepth: 0,
  routeUi: {},
  layersLocked: false,

  freezeForOverlay: (pathname, search) => {
    const key = logicalScrollKey(pathname, search);
    const y = window.scrollY || document.documentElement.scrollTop || 0;
    saveScrollSnapshot(key, { windowY: y });
    set((s) => {
      if (s.overlayDepth > 0) {
        return { ...s, layersLocked: true };
      }
      return {
        frozenRouteKey: key,
        frozenWindowY: y,
        overlayDepth: 1,
        layersLocked: true,
      };
    });
  },

  unfreezeOverlay: (pathname, search) => {
    const { frozenRouteKey, frozenWindowY, overlayDepth } = get();
    const nextDepth = Math.max(0, overlayDepth - 1);
    const key = frozenRouteKey || logicalScrollKey(pathname, search);
    const y = frozenWindowY;

    set({
      overlayDepth: nextDepth,
      layersLocked: nextDepth > 0,
      frozenRouteKey: nextDepth > 0 ? frozenRouteKey : null,
    });

    if (nextDepth === 0) {
      restoreScrollSnapshot(key, {}, { targetY: y, maxAttempts: 32 });
    }
  },

  setRouteUi: (pathname, search, patch) => {
    const key = logicalScrollKey(pathname, search);
    set((s) => ({
      routeUi: {
        ...s.routeUi,
        [key]: { ...(s.routeUi[key] ?? {}), ...patch },
      },
    }));
  },

  getRouteUi: (pathname, search) => {
    const key = logicalScrollKey(pathname, search);
    return get().routeUi[key];
  },

  saveActiveScroll: (pathname, search) => {
    captureCurrentScroll(logicalScrollKey(pathname, search));
  },

  restoreActiveScroll: (pathname, search) => {
    return restoreScrollSnapshot(logicalScrollKey(pathname, search), {}, { maxAttempts: 32 });
  },
}));
