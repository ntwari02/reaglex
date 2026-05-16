import { useEffect, useState, type ReactNode } from 'react';

/**
 * Renders children only after mount — avoids SSR/hydration mismatches for
 * browser-only APIs (localStorage, matchMedia, camera, motion overlays).
 */
export function ClientOnly({
  children,
  fallback = null,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <>{fallback}</>;
  return <>{children}</>;
}
