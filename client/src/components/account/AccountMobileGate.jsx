import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { shouldUseAccountOverlay } from '../../lib/accountNavigation';
import { useAccountOverlay } from '../../stores/accountOverlayStore';

/**
 * On mobile, /account routes open the layered account OS instead of mounting BuyerDashboard.
 */
export default function AccountMobileGate({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const handled = useRef(false);

  useEffect(() => {
    handled.current = false;
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!shouldUseAccountOverlay() || !user) return;
    if (location.pathname !== '/account') return;
    if (handled.current) return;
    handled.current = true;

    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    const section = params.get('section');
    const store = useAccountOverlay.getState();

    if (section === 'appearance') {
      store.openAppearance();
    } else if (tab === 'settings' || section) {
      store.openPanel('settings', section || 'profile');
    } else if (tab) {
      store.openPanel(tab);
    } else {
      store.openAccount();
    }

    const returnPath = sessionStorage.getItem('rx-account-return') || '/';
    sessionStorage.removeItem('rx-account-return');
    if (returnPath !== '/account') {
      navigate(returnPath, { replace: true });
    } else {
      navigate('/', { replace: true });
    }
  }, [location.pathname, location.search, user, navigate]);

  if (shouldUseAccountOverlay() && user) {
    return <div className="account-os-route-placeholder" aria-hidden style={{ minHeight: 1 }} />;
  }

  return children;
}
