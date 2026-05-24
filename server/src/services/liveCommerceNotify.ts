import mongoose from 'mongoose';
import { LiveCommerceSession } from '../models/LiveCommerceSession';
import { User } from '../models/User';
import { createSystemInboxAndFanout } from './systemInboxFanout';
import { safeSendPushToUser } from './pushNotificationService';

/**
 * Notify buyers when a seller goes live (in-app + push + real-time fan-out).
 */
export async function notifySellerWentLive(sessionId: string, sellerId: string) {
  const session = await LiveCommerceSession.findById(sessionId).select('title sellerId status').lean();
  if (!session || session.status !== 'live') return;

  const seller = await User.findById(sellerId).select('fullName storeName email').lean();
  const sellerName =
    (seller as { fullName?: string; storeName?: string })?.storeName ||
    (seller as { fullName?: string })?.fullName ||
    'A seller';
  const title = `${sellerName} is live now`;
  const message = session.title
    ? `Watch "${session.title}" — tap to join the live show.`
    : 'Join the live stream and shop products in real time.';

  const admin = await User.findOne({ role: 'admin' }).select('_id').lean();
  await createSystemInboxAndFanout({
    title,
    message,
    type: 'system_announcement',
    priority: 'high',
    targetAudience: 'all_buyers',
    actionUrl: `/live/${sessionId}`,
    actionText: 'Watch live',
    createdBy: admin?._id || new mongoose.Types.ObjectId(sellerId),
    metadata: {
      category: 'live_now',
      eventKey: 'live_now',
      entityId: sessionId,
      visualStyle: { showProductPreview: false, compact: true, thumbnailCount: 0 },
    },
  });

  const recentBuyers = await User.find({ role: 'buyer' })
    .select('_id')
    .sort({ updatedAt: -1 })
    .limit(200)
    .lean();

  await Promise.allSettled(
    recentBuyers.map((b) =>
      safeSendPushToUser(String(b._id), {
        title,
        body: message,
        url: `/live/${sessionId}`,
        category: 'live',
        data: { liveSessionId: sessionId },
      })
    )
  );
}
