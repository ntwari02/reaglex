import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { SERVER_URL } from '../lib/config';

/**
 * Socket.IO client for /live namespace (reactions, pins, chat, viewer count).
 * Buyer live viewing uses `persistentLiveEngine` + `usePersistentStream` instead
 * so WebRTC survives route changes. Seller studio still uses this hook directly.
 */
export function useLiveSocket(sessionId, { enabled = true, token, guestName } = {}) {
  const socketRef = useRef(null);
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [pinnedProduct, setPinnedProduct] = useState(null);
  const [reactions, setReactions] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [viewerState, setViewerState] = useState(null);
  const [chatEnabled, setChatEnabled] = useState(true);
  const [role, setRole] = useState('viewer');

  const emitReaction = useCallback(
    (emoji) => {
      socketRef.current?.emit('reaction', { sessionId, emoji });
    },
    [sessionId]
  );

  const pinProduct = useCallback(
    (productId) => {
      socketRef.current?.emit('pin-product', { sessionId, productId });
    },
    [sessionId]
  );

  const unpinProduct = useCallback(() => {
    socketRef.current?.emit('unpin-product', { sessionId });
  }, [sessionId]);

  const sendChat = useCallback(
    (text, replyToId) => {
      const trimmed = String(text || '').trim();
      if (!trimmed) return;
      socketRef.current?.emit('chat-message', {
        sessionId,
        text: trimmed,
        replyToId: replyToId || undefined,
        guestName: guestName || undefined,
      });
    },
    [sessionId, guestName]
  );

  useEffect(() => {
    if (!enabled || !sessionId) return undefined;

    const socket = io(`${SERVER_URL}/live`, {
      transports: ['websocket', 'polling'],
      auth: token ? { token } : {},
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      setSocket(socket);
      socket.emit('join-session', { sessionId });
    });

    socket.on('disconnect', () => {
      setConnected(false);
      setSocket(null);
    });

    socket.on('session-state', (state) => {
      setViewerState(state);
      setViewerCount(state.viewerCount ?? 0);
      setPinnedProduct(state.pinnedProduct ?? null);
      setRole(state.role || 'viewer');
      setChatEnabled(state.chatEnabled !== false);
    });

    socket.on('chat-history', (p) => {
      if (p.sessionId === sessionId) setChatMessages(p.messages || []);
    });

    socket.on('chat-message', (p) => {
      if (p.sessionId !== sessionId || !p.message) return;
      setChatMessages((prev) => [...prev.slice(-79), p.message]);
    });

    socket.on('viewer-count', (p) => {
      if (p.sessionId === sessionId) setViewerCount(p.viewerCount ?? 0);
    });

    socket.on('pin-product', (p) => {
      if (p.sessionId === sessionId) setPinnedProduct(p.product ?? null);
    });

    socket.on('unpin-product', (p) => {
      if (p.sessionId === sessionId) setPinnedProduct(null);
    });

    socket.on('reaction', (p) => {
      if (p.sessionId !== sessionId) return;
      setReactions((prev) => [...prev.slice(-24), { id: `${p.at}-${Math.random()}`, ...p }]);
    });

    return () => {
      socket.emit('leave-session', { sessionId });
      socket.disconnect();
      socketRef.current = null;
      setSocket(null);
    };
  }, [sessionId, enabled, token]);

  return {
    socket,
    connected,
    viewerCount,
    pinnedProduct,
    reactions,
    chatMessages,
    viewerState,
    chatEnabled,
    role,
    emitReaction,
    pinProduct,
    unpinProduct,
    sendChat,
  };
}
