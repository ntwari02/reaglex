import { useEffect } from 'react';
import { io, type Socket } from 'socket.io-client';
import { SERVER_URL } from '@/lib/config';
import {
  useAdminIntelligenceSearchStore,
  type IntelligenceLivePulse,
} from '@/stores/adminIntelligenceSearchStore';

let socket: Socket | null = null;

/**
 * Subscribes admins to live platform pulses (orders, payments, products…).
 * Reuses one socket for the admin session.
 */
export function useAdminIntelligenceLive(enabled = true): void {
  const pushLivePulse = useAdminIntelligenceSearchStore((s) => s.pushLivePulse);
  const setLiveConnected = useAdminIntelligenceSearchStore((s) => s.setLiveConnected);

  useEffect(() => {
    if (!enabled) return;

    const token = localStorage.getItem('auth_token');
    if (!token) return;

    if (!socket) {
      socket = io(SERVER_URL, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
      });
    }

    const onConnect = () => setLiveConnected(true);
    const onDisconnect = () => setLiveConnected(false);
    const onPulse = (payload: Omit<IntelligenceLivePulse, 'id'>) => {
      pushLivePulse({
        ...payload,
        id: `${payload.entityType}:${payload.entityId}:${payload.at}`,
      });
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('admin_intelligence_pulse', onPulse);

    if (socket.connected) setLiveConnected(true);
    if (!socket.connected) socket.connect();

    return () => {
      socket?.off('connect', onConnect);
      socket?.off('disconnect', onDisconnect);
      socket?.off('admin_intelligence_pulse', onPulse);
    };
  }, [enabled, pushLivePulse, setLiveConnected]);
}
