import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import type { Socket } from 'socket.io';
import mongoose from 'mongoose';
import { LiveCommerceSession } from '../models/LiveCommerceSession';
import { Product } from '../models/Product';
import { attachWebRTCSignaling, onWebRTCViewerJoined, onWebRTCSellerDetected } from './webrtcSignaling';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

type LiveSocket = Socket & {
  userId?: string;
  userRole?: string;
  liveSessionId?: string;
};

interface SessionRoomState {
  viewerCount: number;
  pinnedProduct: Record<string, unknown> | null;
}

const roomState = new Map<string, SessionRoomState>();

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

async function appendTimeline(
  sessionId: string,
  type: 'pin' | 'unpin' | 'reaction' | 'status',
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
        const decoded = jwt.verify(token, JWT_SECRET) as { id?: string; role?: string };
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
        if (!isSeller) {
          state.viewerCount += 1;
          await LiveCommerceSession.updateOne({ _id: sessionId }, { $inc: { viewerCount: 1 } });
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
        });

        socket.to(`live:${sessionId}`).emit('viewer-count', {
          sessionId,
          viewerCount: state.viewerCount,
        });
      } catch (err: any) {
        socket.emit('error', { message: err.message || 'join failed' });
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
      const payload = {
        emoji,
        userId: socket.userId || 'guest',
        at: Date.now(),
      };
      await appendTimeline(sessionId, 'reaction', payload);
      liveNs.to(`live:${sessionId}`).emit('reaction', { sessionId, ...payload });
    });

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
