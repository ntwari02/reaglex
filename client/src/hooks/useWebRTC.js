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
 * WebRTC — seller must call startMedia() from a user click (required on mobile).
 */
export function useWebRTC({ sessionId, role, socket, enabled = false, mediaActive = false }) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [camEnabled, setCamEnabled] = useState(true);

  const remoteStreamRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerConnectionsRef = useRef(new Map());
  const sellerSocketIdRef = useRef(null);
  const pendingViewersRef = useRef(new Set());
  const socketRef = useRef(socket);

  socketRef.current = socket;

  const mergeRemoteTrack = useCallback((event) => {
    const incoming =
      event.streams?.[0]?.getTracks?.() ?? (event.track ? [event.track] : []);
    if (!incoming.length) return;

    if (!remoteStreamRef.current) {
      remoteStreamRef.current = new MediaStream();
    }

    for (const track of incoming) {
      const exists = remoteStreamRef.current.getTracks().some((t) => t.id === track.id);
      if (!exists) remoteStreamRef.current.addTrack(track);
    }
    setRemoteStream(remoteStreamRef.current);
  }, []);

  const stopLocalMedia = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);
  }, []);

  const closeAllPeers = useCallback(() => {
    peerConnectionsRef.current.forEach((pc) => pc.close());
    peerConnectionsRef.current.clear();
    remoteStreamRef.current = null;
    setRemoteStream(null);
  }, []);

  const startMedia = useCallback(async () => {
    if (role !== 'seller') return false;
    setError(null);
    setStatus('connecting');
    try {
      const stream = await acquireLocalMedia();
      localStreamRef.current = stream;
      setLocalStream(stream);
      setMicEnabled(stream.getAudioTracks()[0]?.enabled !== false);
      setCamEnabled(stream.getVideoTracks()[0]?.enabled !== false);
      setStatus('live');
      if (socketRef.current?.connected && sessionId) {
        socketRef.current.emit('webrtc-register-seller', { sessionId });
      }
      return true;
    } catch (err) {
      setError(err?.message || 'Camera access denied');
      setStatus('error');
      return false;
    }
  }, [role, sessionId]);

  const stopMedia = useCallback(() => {
    stopLocalMedia();
    closeAllPeers();
    setStatus('idle');
    setError(null);
  }, [stopLocalMedia, closeAllPeers]);

  const retryMedia = startMedia;

  useEffect(() => {
    if (role === 'seller' && !mediaActive) {
      stopLocalMedia();
      setStatus('idle');
    }
  }, [role, mediaActive, stopLocalMedia]);

  // Seller signaling
  useEffect(() => {
    if (!enabled || !mediaActive || !sessionId || role !== 'seller' || !socket?.connected) {
      return undefined;
    }

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
        /* stale */
      }
    };

    const onViewerLeft = ({ viewerSocketId }) => {
      pendingViewersRef.current.delete(viewerSocketId);
      peerConnectionsRef.current.get(viewerSocketId)?.close();
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
  }, [sessionId, role, enabled, mediaActive, socket?.connected, socket?.id]);

  // Viewer
  useEffect(() => {
    if (!enabled || !socket || !sessionId || role !== 'viewer') return undefined;

    const pc = new RTCPeerConnection(ICE_CONFIG);
    peerConnectionsRef.current.set('seller', pc);
    remoteStreamRef.current = null;

    pc.ontrack = (event) => {
      mergeRemoteTrack(event);
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
  }, [sessionId, role, socket, enabled, closeAllPeers, mergeRemoteTrack]);

  const toggleMic = useCallback(() => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setMicEnabled(track.enabled);
    }
  }, []);

  const toggleCam = useCallback(() => {
    const track = localStreamRef.current?.getVideoTracks()[0];
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
    startMedia,
    stopMedia,
    retryMedia,
  };
};
