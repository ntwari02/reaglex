import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { getDashboardPathForRole } from '../lib/authRouting';

type AdminRouteProps = {
  children: ReactNode;
};

export default function AdminRoute({ children }: AdminRouteProps) {
  const location = useLocation();
  const { user, loading, initialized } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  if (!initialized || loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center" style={{ background: 'var(--bg-page)' }}>
        <div className="w-12 h-12 rounded-full border-4 border-emerald-200 border-t-emerald-500 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        state={{ from: location.pathname, reason: 'admin_required' }}
        replace
      />
    );
  }

  if (user.email_verified !== true) {
    return (
      <Navigate
        to={`/verify-otp?email=${encodeURIComponent(user.email)}`}
        replace
      />
    );
  }

  if (!isAdmin) {
    return <Navigate to={getDashboardPathForRole(user.role)} replace />;
  }

  return <>{children}</>;
}
