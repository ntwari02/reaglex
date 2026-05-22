import { useEffect, useRef, useState, useCallback } from 'react';

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
 * P2P WebRTC over Socket.IO signaling (seller star-topology, max ~10 viewers).
 */
export function useWebRTC({ sessionId, role, socket, enabled = false }) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  const localStreamRef = useRef(null);
  const peerConnectionsRef = useRef(new Map());
  const sellerSocketIdRef = useRef(null);
  const pendingViewersRef = useRef(new Set());

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
    setRemoteStream(null);
  }, []);

  // ── Seller: camera + offer per viewer ─────────────────────────────────────
  useEffect(() => {
    if (!enabled || !socket || !sessionId || role !== 'seller') return undefined;

    let cancelled = false;

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
      const ids = [...pendingViewersRef.current];
      pendingViewersRef.current.clear();
      ids.forEach((viewerSocketId) => {
        void createOfferForViewer(viewerSocketId);
      });
    };

    async function startBroadcast() {
      try {
        setStatus('connecting');
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localStreamRef.current = stream;
        setLocalStream(stream);
        socket.emit('webrtc-register-seller', { sessionId });
        setStatus('live');
        flushPendingViewers();
      } catch (err) {
        setError(err?.message || 'Camera access denied');
        setStatus('error');
      }
    }

    startBroadcast();

    const onViewerJoined = ({ viewerSocketId }) => {
      if (!viewerSocketId) return;
      if (localStreamRef.current) {
        void createOfferForViewer(viewerSocketId);
      } else {
        pendingViewersRef.current.add(viewerSocketId);
      }
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
        /* ignore stale ICE */
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
      cancelled = true;
      pendingViewersRef.current.clear();
      socket.off('webrtc-viewer-joined', onViewerJoined);
      socket.off('webrtc-signal', onSignal);
      socket.off('webrtc-viewer-left', onViewerLeft);
      stopLocalMedia();
      closeAllPeers();
      setStatus('idle');
    };
  }, [sessionId, role, socket, enabled, stopLocalMedia, closeAllPeers]);

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

  return { localStream, remoteStream, status, error };
}
