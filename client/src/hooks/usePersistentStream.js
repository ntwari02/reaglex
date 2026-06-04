import { useEffect, useRef, useCallback, useSyncExternalStore } from 'react';
import { useLocation } from 'react-router-dom';
import { persistentLiveEngine } from '../live/persistentLiveEngine';
import { useLiveStreamStore } from '../stores/liveStreamStore';

function subscribeStore(cb) {
  return useLiveStreamStore.subscribe(cb);
}

function getSnapshot() {
  return useLiveStreamStore.getState();
}

/**
 * Buyer persistent live stream — WebRTC + socket survive route changes.
 */
export function usePersistentStream(session, options = {}) {
  const { enabled = true, isReplay = false, token, guestName } = options;
  const location = useLocation();
  const inlineVideoRef = useRef(null);

  const state = useSyncExternalStore(subscribeStore, getSnapshot, getSnapshot);

  const sessionId = session?.id;
  const isOnLivePage =
    Boolean(sessionId) &&
    location.pathname === `/live/${sessionId}`;

  const isActiveForSession = state.active && state.sessionId === sessionId;

  useEffect(() => {
    if (!enabled || !sessionId || isReplay || session?.status !== 'live') return undefined;

    void persistentLiveEngine.start(session, { token, guestName });

    return undefined;
  }, [enabled, sessionId, isReplay, session?.status, token]);

  useEffect(() => {
    const el = inlineVideoRef.current;
    if (!el || !isActiveForSession || !isOnLivePage) return undefined;

    persistentLiveEngine.attachVideo(el);
    return () => persistentLiveEngine.detachVideo(el);
  }, [isOnLivePage, isActiveForSession, state.webrtcStatus, state.streamRevision]);

  useEffect(() => {
    persistentLiveEngine.setTrackMuted(state.muted);
  }, [state.muted, isActiveForSession]);

  const remoteStream = isActiveForSession ? persistentLiveEngine.getRemoteStream() : null;
  const hasVideo = Boolean(remoteStream?.getVideoTracks?.().length);

  const emitReaction = useCallback((emoji) => {
    persistentLiveEngine.emitReaction(emoji);
  }, []);

  const sendChat = useCallback((text, replyToId) => {
    persistentLiveEngine.sendChat(text, replyToId);
  }, []);

  const closePlayer = useCallback(() => {
    void persistentLiveEngine.stop('manual');
  }, []);

  return {
    inlineVideoRef,
    remoteStream,
    socket: persistentLiveEngine.getSocket(),
    isPersistent: isActiveForSession,
    isOnLivePage,
    viewerCount: isActiveForSession ? state.viewerCount : 0,
    pinnedProduct: isActiveForSession ? state.pinnedProduct : null,
    reactions: isActiveForSession ? state.reactions : [],
    chatMessages: isActiveForSession ? state.chatMessages : [],
    chatEnabled: isActiveForSession ? state.chatEnabled : true,
    webrtcStatus: isActiveForSession ? state.webrtcStatus : 'idle',
    hasVideo,
    streamRevision: state.streamRevision,
    connectionError: state.connectionError,
    emitReaction,
    sendChat,
    closePlayer,
    guestName,
  };
}

export function useLiveStreamUi() {
  return useSyncExternalStore(subscribeStore, getSnapshot, getSnapshot);
}
