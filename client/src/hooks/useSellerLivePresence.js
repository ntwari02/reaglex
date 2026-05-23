import { useEffect } from 'react';
import { API_BASE_URL } from '../lib/config';
import { endSellerLiveKeepalive } from '../services/liveSessionCleanup';

const HEARTBEAT_MS = 12_000;

/**
 * Seller presence: heartbeat while live; end stream on tab close / leave / offline.
 */
export function useSellerLivePresence(sessionId, { socket, enabled = false, token }) {
  useEffect(() => {
    if (!enabled || !sessionId) return undefined;

    const beatSocket = () => socket?.emit('seller-heartbeat', { sessionId });

    const beatHttp = () => {
      if (!token) return;
      void fetch(`${API_BASE_URL}/live-commerce/session/${sessionId}/seller-heartbeat`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        keepalive: true,
      }).catch(() => {});
    };

    const beat = () => {
      if (socket?.connected) beatSocket();
      else beatHttp();
    };

    beat();
    const interval = window.setInterval(beat, HEARTBEAT_MS);

    const endNow = () => {
      endSellerLiveKeepalive(sessionId);
      socket?.emit('seller-going-offline', { sessionId });
    };

    const onPageHide = (e) => {
      if (e.persisted) return;
      endNow();
    };

    const onOffline = () => endNow();

    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('beforeunload', endNow);
    window.addEventListener('offline', onOffline);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('beforeunload', endNow);
      window.removeEventListener('offline', onOffline);
    };
  }, [enabled, sessionId, socket, token]);
}
