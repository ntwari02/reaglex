import { useEffect, useRef } from 'react';
import { API_BASE_URL } from '../lib/config';

const HEARTBEAT_MS = 10_000;

/**
 * YouTube-style presence: heartbeat only while broadcasting.
 * Does NOT end live on pagehide/SPA navigation (avoids false 28s kills).
 * Server ends live after missed heartbeats or socket disconnect grace.
 */
export function useSellerLivePresence(sessionId, { socket, enabled = false, token }) {
  const sessionRef = useRef(sessionId);
  sessionRef.current = sessionId;

  useEffect(() => {
    if (!enabled || !sessionId) return undefined;

    const beatSocket = () => {
      socket?.emit('seller-heartbeat', { sessionId: sessionRef.current });
    };

    const beatHttp = () => {
      if (!token) return;
      void fetch(
        `${API_BASE_URL}/live-commerce/session/${sessionRef.current}/seller-heartbeat`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          keepalive: true,
        }
      ).catch(() => {});
    };

    const beat = () => {
      if (document.visibilityState === 'hidden') return;
      if (socket?.connected) beatSocket();
      else beatHttp();
    };

    beat();
    const interval = window.setInterval(beat, HEARTBEAT_MS);

    const onVisible = () => {
      if (document.visibilityState === 'visible') beat();
    };

    document.addEventListener('visibilitychange', onVisible);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [enabled, sessionId, socket, token]);
}
