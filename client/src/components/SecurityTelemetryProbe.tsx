import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { API_BASE_URL } from '@/lib/config';

/**
 * Sends anonymized route beacons for security intelligence (admin SOC view).
 * Path only — no form fields or sensitive data.
 */
export function SecurityTelemetryProbe() {
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const lastSent = useRef<string>('');

  useEffect(() => {
    if (!user?.id) return;
    const path = `${location.pathname}${location.search || ''}`;
    if (path === lastSent.current) return;

    const token = localStorage.getItem('auth_token');
    if (!token) return;

    const t = window.setTimeout(() => {
      lastSent.current = path;
      void fetch(`${API_BASE_URL}/security-analysis/telemetry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          path,
          action: 'navigation',
          category: 'navigation',
        }),
      }).catch(() => {});
    }, 500);

    return () => window.clearTimeout(t);
  }, [location.pathname, location.search, user?.id]);

  return null;
}
