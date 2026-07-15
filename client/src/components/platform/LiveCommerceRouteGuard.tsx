import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSystemFeatures } from '@/hooks/useSystemFeatures';

export default function LiveCommerceRouteGuard({ children }: { children: React.ReactNode }) {
  const { isEnabled, loading } = useSystemFeatures();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !isEnabled('live_commerce')) {
      document.title = 'Spacilly';
    }
  }, [loading, isEnabled]);

  if (!loading && !isEnabled('live_commerce')) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
