import { useCallback, useSyncExternalStore } from 'react';
import { useLocation } from 'react-router-dom';
import { useNavigationMemory } from '../stores/navigationMemoryStore';

/**
 * Persist lightweight UI state (filters, tab index, sort) per logical route.
 */
export function useRouteUiMemory<T extends Record<string, unknown>>(
  defaults: T,
): [T, (patch: Partial<T>) => void] {
  const location = useLocation();
  const pathname = location.pathname;
  const search = location.search;

  const state = useSyncExternalStore(
    (onStoreChange) => {
      const unsub = useNavigationMemory.subscribe(onStoreChange);
      return unsub;
    },
    () => {
      const stored = useNavigationMemory.getState().getRouteUi(pathname, search);
      return { ...defaults, ...(stored as Partial<T>) } as T;
    },
    () => defaults,
  );

  const setState = useCallback(
    (patch: Partial<T>) => {
      useNavigationMemory.getState().setRouteUi(pathname, search, patch);
    },
    [pathname, search],
  );

  return [state, setState];
}
