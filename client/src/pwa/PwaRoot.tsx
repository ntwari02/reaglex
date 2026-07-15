import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import OfflineIndicator from './components/OfflineIndicator';
import InstallBanner from './components/InstallBanner';
import UpdateBanner from './components/UpdateBanner';
import CommandPalette from './components/CommandPalette';
import AssistantFab from './components/AssistantFab';
import { installOfflineQueueBridge } from './offlineQueue';
import { isStandaloneInstalled } from './useInstallPrompt';

/**
 * Single entry-point that mounts every cross-cutting PWA UI piece:
 *  - Offline / sync indicator
 *  - Install prompt banner
 *  - Service-worker update banner
 *  - Global command palette (Ctrl/Cmd+K)
 *  - Floating AI assistant FAB
 *
 * Also wires:
 *  - the IndexedDB offline write queue ↔ service worker bridge
 *  - SW → page navigation messages (notification clicks)
 *  - Body class flag so installed PWA can apply native-style chrome.
 */
export default function PwaRoot() {
  const navigate = useNavigate();

  useEffect(() => {
    installOfflineQueueBridge();
  }, []);

  // Listen for SW messages that need page-side action.
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    function onMessage(event: MessageEvent) {
      const data = event?.data;
      if (!data) return;
      if (data.type === 'SPACILLY_NAVIGATE' && typeof data.url === 'string') {
        try {
          const url = new URL(data.url, window.location.origin);
          if (url.origin === window.location.origin) {
            navigate(url.pathname + url.search + url.hash);
          }
        } catch {
          /* ignore */
        }
      }
      if (data.type === 'SPACILLY_RESUBSCRIBE_PUSH') {
        // Lazily re-import to keep this module light.
        void import('../lib/webPush').then((m) => m.subscribeWebPush().catch(() => undefined));
      }
    }
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, [navigate]);

  // Tag the document so CSS can adapt when running as an installed PWA.
  useEffect(() => {
    function update() {
      const standalone = isStandaloneInstalled();
      document.documentElement.dataset.standalone = standalone ? 'true' : 'false';
      document.documentElement.classList.toggle('pwa-standalone', standalone);
    }
    update();
    const mql = window.matchMedia?.('(display-mode: standalone)');
    if (mql) {
      mql.addEventListener?.('change', update);
      return () => mql.removeEventListener?.('change', update);
    }
    return undefined;
  }, []);

  return (
    <>
      <OfflineIndicator />
      <UpdateBanner />
      <InstallBanner />
      <CommandPalette />
      <AssistantFab />
    </>
  );
}
