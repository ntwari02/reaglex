import type { NavigateFunction } from 'react-router-dom';
// @ts-expect-error JS zustand store
import { useAccountOverlay } from '../stores/accountOverlayStore';

export function shouldUseAccountOverlay() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(max-width: 767px)').matches;
}

function rememberAccountReturnPath() {
  if (typeof window === 'undefined') return;
  const path = window.location.pathname + window.location.search;
  if (!path.startsWith('/account')) {
    sessionStorage.setItem('rx-account-return', path);
  }
}

/** Mobile: layered account OS. Desktop: classic /account route. */
export function openAccountExperience(
  navigate: NavigateFunction,
  tab?: string,
  section?: string,
) {
  if (shouldUseAccountOverlay()) {
    rememberAccountReturnPath();
    const store = useAccountOverlay.getState();
    if (tab === 'appearance' || section === 'appearance') {
      store.openAppearance();
      return;
    }
    if (tab === 'settings' || section) {
      store.openPanel('settings', section || 'profile');
      return;
    }
    if (tab && tab !== 'overview') {
      store.openPanel(tab);
      return;
    }
    store.openAccount();
    return;
  }
  const path = tab ? `/account?tab=${encodeURIComponent(tab)}` : '/account';
  navigate(path);
}
