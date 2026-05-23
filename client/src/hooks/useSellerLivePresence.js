import { useEffect } from 'react';
import { API_BASE_URL } from '../lib/config';
const HEARTBEAT_MS = 15_000;

/**
 * TikTok/YouTube-style seller presence: heartbeat + end live on tab close / offline.
 */
export function useSellerLivePresence(sessionId, { socket, enabled = false, token }) {
  useEffect(() => {
    if (!enabled || !sessionId) return undefined;

    const beatSocket = () => {
      socket?.emit('seller-heartbeat', { sessionId });
    };

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

    const onOnline = () => beat();
    window.addEventListener('online', onOnline);

    const onPageHide = (e) => {
      if (e.persisted) return;
      socket?.emit('seller-going-offline', { sessionId });
      beatHttp();
    };

    window.addEventListener('pagehide', onPageHide);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [enabled, sessionId, socket, token]);
}
