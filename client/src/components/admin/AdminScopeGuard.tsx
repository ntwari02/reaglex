import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { canAccessAdminRoute } from '@/lib/adminPermissions';

type Props = {
  routeId: string;
  children: React.ReactNode;
};

export default function AdminScopeGuard({ routeId, children }: Props) {
  const user = useAuthStore((s) => s.user);
  if (!canAccessAdminRoute(user, routeId)) {
    return <Navigate to="/admin" replace />;
  }
  return <>{children}</>;
}
