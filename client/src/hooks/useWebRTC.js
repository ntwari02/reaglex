import { useEffect, useRef, useState, useCallback } from 'react';
import { acquireLocalMedia } from '../lib/liveMedia';

const ICE_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

function emitSignal(socket, sessionId, to, signal) {
  if (!socket?.connected) return;
  socket.emit('webrtc-signal', { sessionId, to, signal });
}

/**
 * P2P WebRTC over Socket.IO signaling (seller star-topology).
 * Seller media is acquired independently of socket reconnects.
 */
export function useWebRTC({ sessionId, role, socket, enabled = false }) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [camEnabled, setCamEnabled] = useState(true);

  const localStreamRef = useRef(null);
  const peerConnectionsRef = useRef(new Map());
  const sellerSocketIdRef = useRef(null);
  const pendingViewersRef = useRef(new Set());
  const socketRef = useRef(socket);
  const mediaStartedRef = useRef(false);

  socketRef.current = socket;

  const stopLocalMedia = useCallback(() => {
    mediaStartedRef.current = false;
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);
  }, []);

  const closeAllPeers = useCallback(() => {
    peerConnectionsRef.current.forEach((pc) => pc.close());
    peerConnectionsRef.current.clear();
    setRemoteStream(null);
  }, []);

  const retryMedia = useCallback(async () => {
    if (role !== 'seller' || !enabled) return;
    stopLocalMedia();
    setError(null);
    setStatus('connecting');
    try {
      const stream = await acquireLocalMedia();
      localStreamRef.current = stream;
      setLocalStream(stream);
      setMicEnabled(stream.getAudioTracks()[0]?.enabled !== false);
      setCamEnabled(stream.getVideoTracks()[0]?.enabled !== false);
      setStatus('live');
      const s = socketRef.current;
      if (s?.connected) {
        s.emit('webrtc-register-seller', { sessionId });
      }
    } catch (err) {
      setError(err?.message || 'Camera access denied');
      setStatus('error');
    }
  }, [role, enabled, sessionId, stopLocalMedia]);

  // ── Seller: camera/mic (not tied to socket identity) ─────────────────────
  useEffect(() => {
    if (!enabled || !sessionId || role !== 'seller') return undefined;

    let cancelled = false;
    mediaStartedRef.current = true;

    (async () => {
      try {
        setStatus('connecting');
        setError(null);
        const stream = await acquireLocalMedia();
        if (cancelled || !mediaStartedRef.current) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localStreamRef.current = stream;
        setLocalStream(stream);
        setMicEnabled(stream.getAudioTracks()[0]?.enabled !== false);
        setCamEnabled(stream.getVideoTracks()[0]?.enabled !== false);
        setStatus('live');
        if (socketRef.current?.connected) {
          socketRef.current.emit('webrtc-register-seller', { sessionId });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || 'Camera access denied');
          setStatus('error');
        }
      }
    })();

    return () => {
      cancelled = true;
      stopLocalMedia();
      closeAllPeers();
      setStatus('idle');
    };
  }, [sessionId, role, enabled, stopLocalMedia, closeAllPeers]);

  // ── Seller: signaling (socket may connect after media) ───────────────────
  useEffect(() => {
    if (!enabled || !sessionId || role !== 'seller' || !socket?.connected) return undefined;

    const createOfferForViewer = async (viewerSocketId) => {
      if (!localStreamRef.current || peerConnectionsRef.current.has(viewerSocketId)) return;

      const pc = new RTCPeerConnection(ICE_CONFIG);
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          emitSignal(socket, sessionId, viewerSocketId, { type: 'ice', candidate: e.candidate });
        }
      };

      peerConnectionsRef.current.set(viewerSocketId, pc);

      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        emitSignal(socket, sessionId, viewerSocketId, { type: 'offer', sdp: offer });
      } catch {
        pc.close();
        peerConnectionsRef.current.delete(viewerSocketId);
      }
    };

    const flushPendingViewers = () => {
      [...pendingViewersRef.current].forEach((id) => void createOfferForViewer(id));
      pendingViewersRef.current.clear();
    };

    socket.emit('webrtc-register-seller', { sessionId });
    if (localStreamRef.current) flushPendingViewers();

    const onViewerJoined = ({ viewerSocketId }) => {
      if (!viewerSocketId) return;
      if (localStreamRef.current) void createOfferForViewer(viewerSocketId);
      else pendingViewersRef.current.add(viewerSocketId);
    };

    const onSignal = async ({ from, signal }) => {
      const pc = peerConnectionsRef.current.get(from);
      if (!pc || !signal) return;
      try {
        if (signal.type === 'answer' && signal.sdp) {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        }
        if (signal.type === 'ice' && signal.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        }
      } catch {
        /* stale ICE */
      }
    };

    const onViewerLeft = ({ viewerSocketId }) => {
      pendingViewersRef.current.delete(viewerSocketId);
      const pc = peerConnectionsRef.current.get(viewerSocketId);
      pc?.close();
      peerConnectionsRef.current.delete(viewerSocketId);
    };

    socket.on('webrtc-viewer-joined', onViewerJoined);
    socket.on('webrtc-signal', onSignal);
    socket.on('webrtc-viewer-left', onViewerLeft);

    return () => {
      pendingViewersRef.current.clear();
      socket.off('webrtc-viewer-joined', onViewerJoined);
      socket.off('webrtc-signal', onSignal);
      socket.off('webrtc-viewer-left', onViewerLeft);
      peerConnectionsRef.current.forEach((pc) => pc.close());
      peerConnectionsRef.current.clear();
    };
  }, [sessionId, role, enabled, socket?.connected, socket?.id]);

  // ── Viewer: single peer to seller ─────────────────────────────────────────
  useEffect(() => {
    if (!enabled || !socket || !sessionId || role !== 'viewer') return undefined;

    const pc = new RTCPeerConnection(ICE_CONFIG);
    peerConnectionsRef.current.set('seller', pc);

    pc.ontrack = (event) => {
      const stream = event.streams?.[0] || new MediaStream([event.track]);
      setRemoteStream(stream);
      setStatus('live');
    };

    pc.onicecandidate = (e) => {
      if (e.candidate && sellerSocketIdRef.current) {
        emitSignal(socket, sessionId, sellerSocketIdRef.current, {
          type: 'ice',
          candidate: e.candidate,
        });
      }
    };

    const onSignal = async ({ from, signal }) => {
      if (!signal) return;
      sellerSocketIdRef.current = from;
      try {
        if (signal.type === 'offer' && signal.sdp) {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          emitSignal(socket, sessionId, from, { type: 'answer', sdp: answer });
        }
        if (signal.type === 'ice' && signal.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        }
      } catch {
        setStatus('error');
      }
    };

    const onWaiting = () => setStatus('waiting');
    const onSellerOnline = () => setStatus('waiting');

    socket.on('webrtc-signal', onSignal);
    socket.on('webrtc-waiting-seller', onWaiting);
    socket.on('webrtc-seller-online', onSellerOnline);

    setStatus('waiting');

    return () => {
      socket.off('webrtc-signal', onSignal);
      socket.off('webrtc-waiting-seller', onWaiting);
      socket.off('webrtc-seller-online', onSellerOnline);
      pc.close();
      closeAllPeers();
      setStatus('idle');
    };
  }, [sessionId, role, socket, enabled, closeAllPeers]);

  const toggleMic = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const track = stream.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setMicEnabled(track.enabled);
    }
  }, []);

  const toggleCam = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setCamEnabled(track.enabled);
    }
  }, []);

  return {
    localStream,
    remoteStream,
    status,
    error,
    micEnabled,
    camEnabled,
    toggleMic,
    toggleCam,
    retryMedia,
  };
};
