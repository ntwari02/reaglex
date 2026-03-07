import type { ReactNode } from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Shield, LogIn } from 'lucide-react';

type AdminRouteProps = {
  children: ReactNode;
};

function AdminAccessDenied() {
  return (
    <div
      className="min-h-[60vh] flex items-center justify-center px-4 py-12"
      style={{ background: 'var(--bg-page)' }}
    >
      <div
        className="w-full max-w-xl rounded-[24px] px-8 py-10 text-center space-y-6"
        style={{
          background: 'var(--card-bg)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
          <Shield className="h-10 w-10" />
        </div>
        <div className="space-y-3">
          <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Admin access required
          </p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            This area is only accessible to administrators. If you need admin access, please log in with an admin account or contact your system administrator.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 w-full sm:w-auto justify-center rounded-[12px] px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-600"
          >
            <LogIn className="h-4 w-4" />
            Log in with admin account
          </Link>
          <button
            type="button"
            onClick={() => window.history.back()}
            className="w-full sm:w-auto rounded-[12px] px-6 py-2.5 text-sm font-semibold border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Go back
          </button>
        </div>
      </div>
    </div>
  );
}

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

  if (!isAdmin) {
    return <AdminAccessDenied />;
  }

  return <>{children}</>;
}
