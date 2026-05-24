import { io } from 'socket.io-client';
import { SERVER_URL } from '../lib/config';
import { useLiveStreamStore } from '../stores/liveStreamStore';

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
 * Singleton buyer live engine — survives React route changes.
 * One active session at a time; structured for future multi-session maps.
 */
class PersistentLiveEngine {
  constructor() {
    this.sessionId = null;
    this.sessionMeta = null;
    this.token = null;
    this.socket = null;
    this.pc = null;
    this.sellerSocketId = null;
    this.remoteStream = null;
    this.videoSinks = new Set();
    this.listenersBound = false;
    this.started = false;
    this.permanentFailure = false;
  }

  getStore() {
    return useLiveStreamStore.getState();
  }

  syncStore(patch) {
    this.getStore().patchLiveData(patch);
  }

  notifyStream() {
    const revision = (this.getStore().streamRevision || 0) + 1;
    this.syncStore({ streamRevision: revision, webrtcStatus: 'live', connectionError: null });
    this.videoSinks.forEach((el) => {
      if (el && this.remoteStream) {
        if (el.srcObject !== this.remoteStream) el.srcObject = this.remoteStream;
        el.play?.().catch(() => {});
      }
    });
  }

  /** Merge audio + video tracks from separate ontrack events into one stream. */
  mergeRemoteTrack(event) {
    const incoming =
      event.streams?.[0]?.getTracks?.() ?? (event.track ? [event.track] : []);
    if (!incoming.length) return;

    if (!this.remoteStream) {
      this.remoteStream = new MediaStream();
    }

    for (const track of incoming) {
      const exists = this.remoteStream.getTracks().some((t) => t.id === track.id);
      if (!exists) this.remoteStream.addTrack(track);
    }
  }

  /** Attach a <video> element without owning the MediaStream lifecycle. */
  attachVideo(element) {
    if (!element) return;
    this.videoSinks.add(element);
    if (this.remoteStream) {
      element.srcObject = this.remoteStream;
      element.play?.().catch(() => {});
    }
  }

  detachVideo(element) {
    if (!element) return;
    this.videoSinks.delete(element);
    if (element.srcObject) element.srcObject = null;
  }

  async start(session, { token, guestName } = {}) {
    if (!session?.id) return;
    if (this.sessionId === session.id && this.socket?.connected) {
      this.sessionMeta = session;
      this.getStore().setSession(this.normalizeMeta(session));
      return;
    }

    await this.stop('switch');

    this.sessionId = session.id;
    this.sessionMeta = session;
    this.token = token || null;
    this.guestName = guestName || null;
    this.permanentFailure = false;
    this.started = true;

    const meta = this.normalizeMeta(session);
    this.getStore().setSession(meta);
    this.syncStore({ webrtcStatus: 'connecting', connectionError: null });

    this.connectSocket();
  }

  normalizeMeta(session) {
    return {
      id: String(session.id),
      title: session.title,
      subtitle: session.subtitle,
      status: session.status,
      streamProvider: session.streamProvider || 'webrtc',
      playbackUrl: session.playbackUrl || session.streamUrl || '',
      seller: session.seller,
      features: session.features,
    };
  }

  connectSocket() {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
    }

    const socket = io(`${SERVER_URL}/live`, {
      transports: ['websocket', 'polling'],
      auth: this.token ? { token: this.token } : {},
    });
    this.socket = socket;

    socket.on('connect', () => {
      socket.emit('join-session', { sessionId: this.sessionId });
    });

    socket.on('session-state', (state) => {
      if (state.sessionId !== this.sessionId) return;
      this.syncStore({
        viewerCount: state.viewerCount ?? 0,
        pinnedProduct: state.pinnedProduct ?? null,
        chatEnabled: state.chatEnabled !== false,
      });
    });

    socket.on('chat-history', (p) => {
      if (p.sessionId === this.sessionId) {
        this.syncStore({ chatMessages: p.messages || [] });
      }
    });

    socket.on('chat-message', (p) => {
      if (p.sessionId !== this.sessionId || !p.message) return;
      const prev = this.getStore().chatMessages;
      this.syncStore({ chatMessages: [...prev.slice(-79), p.message] });
    });

    socket.on('viewer-count', (p) => {
      if (p.sessionId === this.sessionId) {
        this.syncStore({ viewerCount: p.viewerCount ?? 0 });
      }
    });

    socket.on('pin-product', (p) => {
      if (p.sessionId === this.sessionId) {
        this.syncStore({ pinnedProduct: p.product ?? null });
      }
    });

    socket.on('unpin-product', (p) => {
      if (p.sessionId === this.sessionId) this.syncStore({ pinnedProduct: null });
    });

    socket.on('reaction', (p) => {
      if (p.sessionId !== this.sessionId) return;
      const prev = this.getStore().reactions;
      this.syncStore({
        reactions: [...prev.slice(-24), { id: `${p.at}-${Math.random()}`, ...p }],
      });
    });

    socket.on('live-ended', (p) => {
      if (p.sessionId !== this.sessionId) return;
      void this.stop('ended');
      this.getStore().closePlayer();
    });

    socket.on('disconnect', () => {
      if (this.started && !this.permanentFailure) {
        this.syncStore({ webrtcStatus: 'reconnecting' });
      }
    });

    this.bindWebRTC(socket);
  }

  bindWebRTC(socket) {
    const provider = this.sessionMeta?.streamProvider || 'webrtc';
    if (provider !== 'webrtc') {
      this.syncStore({ webrtcStatus: 'live' });
      return;
    }

    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }

    const pc = new RTCPeerConnection(ICE_CONFIG);
    this.pc = pc;
    this.sellerSocketId = null;
    this.remoteStream = null;

    pc.ontrack = (event) => {
      this.mergeRemoteTrack(event);
      this.notifyStream();
    };

    pc.onconnectionstatechange = () => {
      const st = pc.connectionState;
      if (st === 'failed' || st === 'closed') {
        this.permanentFailure = true;
        this.syncStore({
          webrtcStatus: 'error',
          connectionError: 'Live connection lost',
        });
        void this.stop('failed');
        this.getStore().closePlayer();
      }
    };

    pc.onicecandidate = (e) => {
      if (e.candidate && this.sellerSocketId) {
        emitSignal(socket, this.sessionId, this.sellerSocketId, {
          type: 'ice',
          candidate: e.candidate,
        });
      }
    };

    const onSignal = async ({ from, signal }) => {
      if (!signal || !this.pc) return;
      this.sellerSocketId = from;
      try {
        if (signal.type === 'offer' && signal.sdp) {
          await this.pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          const answer = await this.pc.createAnswer();
          await this.pc.setLocalDescription(answer);
          emitSignal(socket, this.sessionId, from, { type: 'answer', sdp: answer });
        }
        if (signal.type === 'ice' && signal.candidate) {
          await this.pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        }
      } catch {
        this.syncStore({ webrtcStatus: 'error', connectionError: 'Signaling failed' });
      }
    };

    const onWaiting = () => this.syncStore({ webrtcStatus: 'waiting' });
    const onSellerOnline = () => this.syncStore({ webrtcStatus: 'waiting' });
    const onSellerLeft = () => {
      this.syncStore({ webrtcStatus: 'waiting', connectionError: 'Seller paused stream' });
    };

    socket.off('webrtc-signal', this._onSignal);
    socket.off('webrtc-waiting-seller', this._onWaiting);
    socket.off('webrtc-seller-online', this._onSellerOnline);
    socket.off('webrtc-seller-left', this._onSellerLeft);

    this._onSignal = onSignal;
    this._onWaiting = onWaiting;
    this._onSellerOnline = onSellerOnline;
    this._onSellerLeft = onSellerLeft;

    socket.on('webrtc-signal', onSignal);
    socket.on('webrtc-waiting-seller', onWaiting);
    socket.on('webrtc-seller-online', onSellerOnline);
    socket.on('webrtc-seller-left', onSellerLeft);

    this.syncStore({ webrtcStatus: 'waiting' });
  }

  emitReaction(emoji) {
    this.socket?.emit('reaction', { sessionId: this.sessionId, emoji });
  }

  sendChat(text, replyToId) {
    const trimmed = String(text || '').trim();
    if (!trimmed) return;
    this.socket?.emit('chat-message', {
      sessionId: this.sessionId,
      text: trimmed,
      replyToId: replyToId || undefined,
      guestName: this.guestName || undefined,
    });
  }

  getRemoteStream() {
    return this.remoteStream;
  }

  getSocket() {
    return this.socket;
  }

  setTrackMuted(muted) {
    if (!this.remoteStream) return;
    this.remoteStream.getAudioTracks().forEach((t) => {
      t.enabled = !muted;
    });
  }

  async stop(reason = 'manual') {
    this.started = false;

    if (this.socket) {
      if (this.sessionId) {
        this.socket.emit('leave-session', { sessionId: this.sessionId });
      }
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }

    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach((t) => t.stop());
      this.remoteStream = null;
    }

    this.videoSinks.forEach((el) => {
      if (el?.srcObject) el.srcObject = null;
    });
    this.videoSinks.clear();

    this.sellerSocketId = null;
    this.sessionId = null;
    this.sessionMeta = null;
    this.token = null;

    if (reason !== 'switch') {
      this.getStore().closePlayer();
    }
  }
}

export const persistentLiveEngine = new PersistentLiveEngine();
