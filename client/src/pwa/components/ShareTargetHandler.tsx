import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

/**
 * Receives `share_target` payloads from the OS share sheet (declared in
 * site.webmanifest). We map the incoming text/url to a product search so
 * users can quickly look up something they shared into Spacilly.
 *
 * Route: `/share`
 */
export default function ShareTargetHandler() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const title = params.get('title') || '';
    const text = params.get('text') || '';
    const url = params.get('url') || '';
    const query = (text || title || url || '').trim();
    if (query) {
      navigate(`/search?q=${encodeURIComponent(query)}&src=share`, { replace: true });
    } else {
      navigate('/', { replace: true });
    }
  }, [params, navigate]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center text-sm text-gray-500">
      Opening shared item…
    </div>
  );
}
