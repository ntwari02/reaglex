import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { getDashboardPathForRole, isValidRole } from '../lib/authRouting';

const PageLoader = () => (
  <div
    className="min-h-screen flex items-center justify-center"
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

/** Unknown routes: guests → storefront home; authenticated users → role dashboard. */
export default function NotFoundRedirect() {
  const { user, loading, initialized } = useAuthStore();

  if (!initialized || loading) {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (!isValidRole(user.role)) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={getDashboardPathForRole(user.role)} replace />;
}
