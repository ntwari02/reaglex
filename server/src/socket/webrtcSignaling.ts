import type { Namespace } from 'socket.io';
import type { Socket } from 'socket.io';
import { getStreamingConfig } from '../streaming/streamingSettings';

type LiveSocket = Socket & {
  userId?: string;
  userRole?: string;
  liveSessionId?: string;
  webrtcRole?: 'seller' | 'viewer';
};

interface WebRTCRoom {
  sellerSocketId: string | null;
  viewerSockets: Set<string>;
}

const webrtcRooms = new Map<string, WebRTCRoom>();

function getWebRTCRoom(sessionId: string): WebRTCRoom {
  let room = webrtcRooms.get(sessionId);
  if (!room) {
    room = { sellerSocketId: null, viewerSockets: new Set() };
    webrtcRooms.set(sessionId, room);
  }
  return room;
}

export function clearWebRTCRoom(sessionId: string) {
  webrtcRooms.delete(sessionId);
}

export function attachWebRTCSignaling(liveNs: Namespace): void {
  liveNs.on('connection', (socket: LiveSocket) => {
    socket.on('webrtc-register-seller', ({ sessionId }: { sessionId: string }) => {
      const room = getWebRTCRoom(sessionId);
      room.sellerSocketId = socket.id;
      socket.webrtcRole = 'seller';
      socket.liveSessionId = sessionId;
      socket.join(`webrtc:${sessionId}`);
      socket.emit('webrtc-registered', { role: 'seller', sessionId });

      // Seller may start camera after buyers joined — re-notify so offers are sent.
      for (const viewerId of room.viewerSockets) {
        liveNs.to(socket.id).emit('webrtc-viewer-joined', {
          sessionId,
          viewerSocketId: viewerId,
          viewerCount: room.viewerSockets.size,
        });
      }
    });

    socket.on(
      'webrtc-signal',
      (data: {
        sessionId: string;
        to: string;
        signal: { type: string; sdp?: unknown; candidate?: unknown };
      }) => {
        const { sessionId, to, signal } = data || {};
        if (!sessionId || !to || !signal) return;
        liveNs.to(to).emit('webrtc-signal', {
          from: socket.id,
          sessionId,
          signal,
        });
      }
    );

    socket.on('disconnect', () => {
      for (const [sessionId, room] of webrtcRooms.entries()) {
        if (room.sellerSocketId === socket.id) {
          room.sellerSocketId = null;
          liveNs.to(`live:${sessionId}`).emit('webrtc-seller-left', { sessionId });
        }
        if (room.viewerSockets.delete(socket.id) && room.sellerSocketId) {
          liveNs.to(room.sellerSocketId).emit('webrtc-viewer-left', {
            sessionId,
            viewerSocketId: socket.id,
          });
        }
      }
    });
  });
}

export async function onWebRTCViewerJoined(
  liveNs: Namespace,
  sessionId: string,
  streamProvider: string,
  sellerId: string,
  viewerSocket: LiveSocket
) {
  if (streamProvider !== 'webrtc') return;

  const config = await getStreamingConfig();
  const room = getWebRTCRoom(sessionId);

  if (room.viewerSockets.size >= config.webrtcMaxViewers) {
    viewerSocket.emit('error', { message: 'WebRTC room is full (max viewers reached)' });
    return;
  }

  room.viewerSockets.add(viewerSocket.id);
  viewerSocket.webrtcRole = 'viewer';

  if (room.sellerSocketId) {
    liveNs.to(room.sellerSocketId).emit('webrtc-viewer-joined', {
      sessionId,
      viewerSocketId: viewerSocket.id,
      viewerCount: room.viewerSockets.size,
    });
  }

  viewerSocket.emit('webrtc-waiting-seller', {
    sessionId,
    sellerOnline: Boolean(room.sellerSocketId),
  });
}

export function onWebRTCSellerDetected(
  liveNs: Namespace,
  sessionId: string,
  streamProvider: string,
  sellerSocketId: string,
  sellerUserId: string
) {
  if (streamProvider !== 'webrtc') return;
  const room = getWebRTCRoom(sessionId);
  room.sellerSocketId = sellerSocketId;

  for (const viewerId of room.viewerSockets) {
    liveNs.to(viewerId).emit('webrtc-seller-online', { sessionId, sellerId: sellerUserId });
    liveNs.to(sellerSocketId).emit('webrtc-viewer-joined', {
      sessionId,
      viewerSocketId: viewerId,
      viewerCount: room.viewerSockets.size,
    });
  }
}
