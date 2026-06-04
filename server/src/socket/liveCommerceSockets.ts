import { Server, type Namespace } from 'socket.io';
import jwt from 'jsonwebtoken';
import type { Socket } from 'socket.io';
import mongoose from 'mongoose';
import { LiveCommerceSession } from '../models/LiveCommerceSession';
import { Product } from '../models/Product';
import { attachWebRTCSignaling, onWebRTCViewerJoined, onWebRTCSellerDetected } from './webrtcSignaling';
import {
  getLiveChatHistory,
  postLiveChatMessage,
  resolveDisplayName,
} from '../services/liveCommerceChat';
import {
  cancelSellerDisconnect,
  registerSellerPresence,
  scheduleSellerDisconnect,
  touchSellerHeartbeat,
} from '../services/liveSellerPresence';

import { getJwtSecret } from '../config/jwtSecret';

type LiveSocket = Socket & {
  userId?: string;
  userRole?: string;
  liveSessionId?: string;
  isLiveSellerHost?: boolean;
};

interface SessionRoomState {
  viewerCount: number;
  pinnedProduct: Record<string, unknown> | null;
}

const roomState = new Map<string, SessionRoomState>();

let liveNamespace: Namespace | null = null;

/** Notify all viewers in a session that the live broadcast ended. */
export function broadcastLiveEnded(
  sessionId: string,
  payload: { status?: string; reason?: string } = {}
) {
  if (!liveNamespace) return;
  liveNamespace.to(`live:${sessionId}`).emit('live-ended', {
    sessionId,
    status: payload.status || 'ended',
    reason: payload.reason,
    at: Date.now(),
  });
}

function getRoomState(sessionId: string): SessionRoomState {
  let s = roomState.get(sessionId);
  if (!s) {
    s = { viewerCount: 0, pinnedProduct: null };
    roomState.set(sessionId, s);
  }
  return s;
}

function sessionOffsetMs(session: { startedAt?: Date }) {
  if (!session.startedAt) return 0;
  return Math.max(0, Date.now() - new Date(session.startedAt).getTime());
}

async function loadPinnedProduct(session: {
  pinnedProductId?: mongoose.Types.ObjectId;
}): Promise<Record<string, unknown> | null> {
  if (!session.pinnedProductId) return null;
  const product = await Product.findById(session.pinnedProductId)
    .select('title name price images image')
    .lean();
  if (!product) return null;
  return {
    productId: String(session.pinnedProductId),
    title: (product as any).title || (product as any).name,
    price: (product as any).price,
    image: (product as any).images?.[0] || (product as any).image,
  };
}

async function appendTimeline(
  sessionId: string,
  type: 'pin' | 'unpin' | 'reaction' | 'status' | 'comment',
  payload: Record<string, unknown>
) {
  const session = await LiveCommerceSession.findById(sessionId);
  if (!session) return;
  const offsetMs = sessionOffsetMs(session);
  session.timeline.push({ offsetMs, type, payload, createdAt: new Date() });
  await session.save();
}

export function attachLiveCommerceSockets(io: Server): void {
  const liveNs = io.of('/live');
  liveNamespace = liveNs;
  attachWebRTCSignaling(liveNs);

  liveNs.use((socket: LiveSocket, next) => {
    const handshake = socket.handshake as {
      auth?: { token?: string };
      headers?: { authorization?: string };
    };
    const token =
      handshake.auth?.token ||
      (typeof handshake.headers?.authorization === 'string'
        ? handshake.headers.authorization.replace(/^Bearer\s+/i, '')
        : '');
    if (token) {
      try {
        const decoded = jwt.verify(token, getJwtSecret()) as { id?: string; role?: string };
        socket.userId = decoded.id;
        socket.userRole = decoded.role;
      } catch {
        /* guest viewer */
      }
    }
    next();
  });

  liveNs.on('connection', (socket: LiveSocket) => {
    socket.on('join-session', async (data: { sessionId: string }) => {
      try {
        const { sessionId } = data || {};
        if (!mongoose.Types.ObjectId.isValid(String(sessionId || ''))) {
          socket.emit('error', { message: 'Invalid session' });
          return;
        }

        const session = await LiveCommerceSession.findById(sessionId).lean();
        if (!session) {
          socket.emit('error', { message: 'Session not found' });
          return;
        }

        socket.liveSessionId = sessionId;
        socket.join(`live:${sessionId}`);

        const isSeller =
          Boolean(socket.userId) && String(session.sellerId) === String(socket.userId);
        const streamProvider = session.streamProvider || 'webrtc';

        const state = getRoomState(sessionId);
        if (!state.pinnedProduct && session.pinnedProductId) {
          state.pinnedProduct = await loadPinnedProduct(session);
        }
        if (!isSeller) {
          state.viewerCount += 1;
          await LiveCommerceSession.updateOne({ _id: sessionId }, { $inc: { viewerCount: 1 } });
        }

        const chatHistory = await getLiveChatHistory(sessionId);

        if (isSeller && session.status === 'live') {
          socket.isLiveSellerHost = true;
          await registerSellerPresence(sessionId, String(socket.userId));
          cancelSellerDisconnect(sessionId);
        }

        if (streamProvider === 'webrtc') {
          socket.join(`webrtc:${sessionId}`);
          if (isSeller) {
            onWebRTCSellerDetected(liveNs, sessionId, streamProvider, socket.id, String(socket.userId));
          } else {
            await onWebRTCViewerJoined(liveNs, sessionId, streamProvider, String(session.sellerId), socket);
          }
        }

        socket.emit('session-state', {
          sessionId,
          viewerCount: state.viewerCount,
          pinnedProduct: state.pinnedProduct,
          status: session.status,
          playbackUrl: session.playbackUrl || session.streamUrl,
          streamProvider,
          role: isSeller ? 'seller' : 'viewer',
          sellerId: String(session.sellerId),
          features: session.features,
          chatEnabled: session.features?.chat !== false,
        });

        socket.emit('chat-history', { sessionId, messages: chatHistory });

        socket.to(`live:${sessionId}`).emit('viewer-count', {
          sessionId,
          viewerCount: state.viewerCount,
        });
      } catch (err: any) {
        socket.emit('error', { message: err.message || 'join failed' });
      }
    });

    socket.on('seller-going-offline', async (data: { sessionId: string }) => {
      const sessionId = data?.sessionId || socket.liveSessionId;
      if (!sessionId || !socket.userId) return;
      scheduleSellerDisconnect(sessionId, socket.userId);
    });

    socket.on('seller-heartbeat', async (data: { sessionId: string }) => {
      const sessionId = data?.sessionId || socket.liveSessionId;
      if (!sessionId || !socket.userId) return;
      const result = await touchSellerHeartbeat(sessionId, socket.userId);
      if (result.ok) {
        cancelSellerDisconnect(sessionId);
        socket.emit('seller-heartbeat-ack', { sessionId, at: Date.now() });
      }
    });

    socket.on('leave-session', async (data: { sessionId: string }) => {
      const sessionId = data?.sessionId || socket.liveSessionId;
      if (!sessionId) return;
      socket.leave(`live:${sessionId}`);
      const state = getRoomState(sessionId);
      state.viewerCount = Math.max(0, state.viewerCount - 1);
      await LiveCommerceSession.updateOne(
        { _id: sessionId, viewerCount: { $gt: 0 } },
        { $inc: { viewerCount: -1 } }
      );
      socket.to(`live:${sessionId}`).emit('viewer-count', {
        sessionId,
        viewerCount: state.viewerCount,
      });
    });

    socket.on('reaction', async (data: { sessionId: string; emoji: string }) => {
      const sessionId = data?.sessionId || socket.liveSessionId;
      const emoji = data?.emoji;
      if (!sessionId || !emoji) return;
      const session = await LiveCommerceSession.findById(sessionId).select('features status').lean();
      if (!session || session.status !== 'live' || session.features?.reactions === false) return;
      const payload = {
        emoji,
        userId: socket.userId || 'guest',
        displayName: await resolveDisplayName(socket.userId, 'Viewer'),
        at: Date.now(),
      };
      await appendTimeline(sessionId, 'reaction', payload);
      liveNs.to(`live:${sessionId}`).emit('reaction', { sessionId, ...payload });
    });

    socket.on(
      'chat-message',
      async (data: { sessionId: string; text: string; replyToId?: string; guestName?: string }) => {
        const sessionId = data?.sessionId || socket.liveSessionId;
        if (!sessionId) return;

        const session = await LiveCommerceSession.findById(sessionId).lean();
        if (!session) return;

        const isSeller =
          Boolean(socket.userId) && String(session.sellerId) === String(socket.userId);
        const displayName = data.guestName
          ? String(data.guestName).slice(0, 32)
          : await resolveDisplayName(socket.userId, isSeller ? 'Seller' : 'Guest');

        const msg = await postLiveChatMessage({
          sessionId,
          userId: socket.userId,
          guestId: socket.userId ? undefined : `guest-${socket.id}`,
          displayName,
          text: data.text,
          isSellerReply: Boolean(isSeller && data.replyToId),
          replyToId: data.replyToId,
        });

        if (msg) {
          liveNs.to(`live:${sessionId}`).emit('chat-message', { sessionId, message: msg });
        }
      }
    );

    socket.on('pin-product', async (data: { sessionId: string; productId: string }) => {
      const sessionId = data?.sessionId || socket.liveSessionId;
      const { productId } = data || {};
      if (!sessionId || !mongoose.Types.ObjectId.isValid(String(productId || ''))) return;

      const session = await LiveCommerceSession.findById(sessionId);
      if (!session) return;
      if (socket.userId && String(session.sellerId) !== socket.userId && socket.userRole !== 'admin') {
        socket.emit('error', { message: 'Only the seller can pin products' });
        return;
      }

      const product = await Product.findById(productId)
        .select('title name price images image')
        .lean();
      if (!product) return;

      const pin = {
        productId: String(productId),
        title: (product as any).title || (product as any).name,
        price: (product as any).price,
        image: (product as any).images?.[0] || (product as any).image,
      };

      session.pinnedProductId = new mongoose.Types.ObjectId(productId);
      await session.save();

      const state = getRoomState(sessionId);
      state.pinnedProduct = pin;
      await appendTimeline(sessionId, 'pin', pin);

      liveNs.to(`live:${sessionId}`).emit('pin-product', { sessionId, product: pin });
    });

    socket.on('unpin-product', async (data: { sessionId: string }) => {
      const sessionId = data?.sessionId || socket.liveSessionId;
      if (!sessionId) return;

      const session = await LiveCommerceSession.findById(sessionId);
      if (!session) return;
      if (socket.userId && String(session.sellerId) !== socket.userId && socket.userRole !== 'admin') {
        return;
      }

      session.pinnedProductId = undefined;
      await session.save();

      const state = getRoomState(sessionId);
      state.pinnedProduct = null;
      await appendTimeline(sessionId, 'unpin', {});

      liveNs.to(`live:${sessionId}`).emit('unpin-product', { sessionId });
    });

    socket.on('disconnect', async () => {
      const sessionId = socket.liveSessionId;
      if (socket.userId && socket.userRole === 'seller') {
        const hostSessionId =
          sessionId && socket.isLiveSellerHost
            ? sessionId
            : (
                await LiveCommerceSession.findOne({
                  sellerId: socket.userId,
                  status: 'live',
                })
                  .select('_id')
                  .lean()
              )?._id;
        if (hostSessionId) {
          scheduleSellerDisconnect(String(hostSessionId), socket.userId);
        }
      }
      if (!sessionId) return;
      const state = getRoomState(sessionId);
      state.viewerCount = Math.max(0, state.viewerCount - 1);
      await LiveCommerceSession.updateOne(
        { _id: sessionId, viewerCount: { $gt: 0 } },
        { $inc: { viewerCount: -1 } }
      );
      socket.to(`live:${sessionId}`).emit('viewer-count', {
        sessionId,
        viewerCount: state.viewerCount,
      });
    });
  });

  console.log('✅ Live commerce socket namespace /live ready');
}
