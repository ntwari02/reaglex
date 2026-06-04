import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import {
  canAccessBuyerUi,
  getDashboardPathForRole,
  isBuyerShellPublicPath,
  isValidRole,
} from '../lib/authRouting';

const PageLoader = () => (
  <div
    className="min-h-screen flex flex-col items-center justify-center gap-3"
    style={{ background: 'var(--buyer-page-loader-bg)' }}
  >
    <div
      className="w-12 h-12 rounded-full border-4 animate-spin"
      style={{
        borderColor: 'var(--loading-spinner-track)',
        borderTopColor: 'var(--loading-spinner)',
      }}
      aria-hidden
    />
  </div>
);

/**
 * Blocks authenticated sellers/admins from the buyer shopping shell.
 * Guests and buyers pass through; marketing/legal paths stay public.
 */
export default function BuyerShellGuard() {
  const { user, loading, initialized } = useAuthStore();
  const { pathname } = useLocation();

  if (!initialized || loading) {
    return <PageLoader />;
  }

  if (user && !isValidRole(user.role)) {
    return <Navigate to="/login" replace />;
  }

  if (user && !canAccessBuyerUi(user)) {
    if (isBuyerShellPublicPath(pathname)) {
      return <Outlet />;
    }
    return <Navigate to={getDashboardPathForRole(user.role)} replace />;
  }

  return <Outlet />;
}
