import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

/**
 * Handles `web+spacilly://` protocol launches declared in site.webmanifest.
 * The OS forwards them to `/deep?target=...` so we can route inside the SPA.
 */
export default function DeepLinkHandler() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const raw = params.get('target') || '';
    try {
      // The target may be a custom URL like `web+spacilly://product/abc123`
      // or a plain path like `/products/abc123`.
      if (!raw) {
        navigate('/', { replace: true });
        return;
      }
      const decoded = decodeURIComponent(raw);
      const path = decoded.replace(/^web\+spacilly:\/\//i, '/');
      const safe = path.startsWith('/') ? path : `/${path}`;
      navigate(safe, { replace: true });
    } catch {
      navigate('/', { replace: true });
    }
  }, [params, navigate]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center text-sm text-gray-500">
      Opening link…
    </div>
  );
}
