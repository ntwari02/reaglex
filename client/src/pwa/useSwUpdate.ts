import { useCallback, useEffect, useState } from 'react';

/**
 * Watches the registered service worker and exposes a "new version
 * available" signal. Calling `applyUpdate()` activates the waiting worker
 * and reloads the page once it takes control.
 */
export function useSwUpdate() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const [updated, setUpdated] = useState<boolean>(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    let mounted = true;
    let registration: ServiceWorkerRegistration | null = null;

    function bind(reg: ServiceWorkerRegistration) {
      registration = reg;
      if (reg.waiting) setWaiting(reg.waiting);
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            if (mounted) setWaiting(nw);
          }
        });
      });
    }

    navigator.serviceWorker.ready
      .then((reg) => {
        if (!mounted) return;
        bind(reg);
        // Poll every 30 minutes for new builds.
        const interval = setInterval(() => reg.update().catch(() => undefined), 30 * 60 * 1000);
        (registration as any).__pollInterval = interval;
      })
      .catch(() => undefined);

    function onControllerChange() {
      if (!mounted) return;
      setUpdated(true);
      // Soft reload so the user immediately runs the new build.
      setTimeout(() => window.location.reload(), 200);
    }
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    return () => {
      mounted = false;
      try {
        const i = (registration as any)?.__pollInterval;
        if (i) clearInterval(i);
      } catch {
        /* ignore */
      }
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    };
  }, []);

  const applyUpdate = useCallback(() => {
    if (!waiting) return;
    waiting.postMessage({ type: 'SKIP_WAITING' });
  }, [waiting]);

  return { hasUpdate: Boolean(waiting), applyUpdate, updated };
}
