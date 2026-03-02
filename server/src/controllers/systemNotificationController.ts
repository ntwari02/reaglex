import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { SystemNotification } from '../models/SystemNotification';
import { User } from '../models/User';
import mongoose from 'mongoose';

const getSellerId = (req: AuthenticatedRequest): mongoose.Types.ObjectId | null => {
  if (!req.user?.id) return null;
  try {
    return new mongoose.Types.ObjectId(req.user.id);
  } catch {
    return null;
  }
};

/**
 * Get notifications for seller
 */
export async function getNotifications(req: AuthenticatedRequest, res: Response) {
  try {
    const sellerId = getSellerId(req);
    if (!sellerId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { unreadOnly = false, limit = 50 } = req.query;

    // Get seller info to determine audience
    const seller = await User.findById(sellerId).select('sellerVerificationStatus isSellerVerified').lean();
    const isVerified = seller?.isSellerVerified || false;
    const verificationStatus = seller?.sellerVerificationStatus || 'pending';

    // Build filter
    const filter: any = {
      $or: [
        { targetAudience: 'all_sellers' },
        { targetAudience: 'specific_seller', targetSellerId: sellerId },
      ],
    };

    // Add verified/pending filters
    if (isVerified) {
      filter.$or.push({ targetAudience: 'verified_sellers' });
    } else {
      filter.$or.push({ targetAudience: 'pending_sellers' });
    }

    // Expiration filter
    filter.$or.push({
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: { $gt: new Date() } },
      ],
    });

    if (unreadOnly === 'true') {
      filter.readBy = { $ne: sellerId };
    }

    const notifications = await SystemNotification.find(filter)
      .populate('createdBy', 'fullName email')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .lean();

    // Mark as read by this seller
    const unreadIds = notifications
      .filter((n) => !n.readBy?.some((id) => id.toString() === sellerId.toString()))
      .map((n) => n._id);

    if (unreadIds.length > 0) {
      await SystemNotification.updateMany(
        { _id: { $in: unreadIds } },
        { $addToSet: { readBy: sellerId } }
      );
    }

    return res.json({ notifications });
  } catch (error: any) {
    console.error('Get notifications error:', error);
    return res.status(500).json({ message: 'Failed to fetch notifications' });
  }
}

/**
 * Mark notification as read
 */
export async function markAsRead(req: AuthenticatedRequest, res: Response) {
  try {
    const sellerId = getSellerId(req);
    if (!sellerId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { notificationId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      return res.status(400).json({ message: 'Invalid notification ID' });
    }

    await SystemNotification.updateOne(
      { _id: notificationId },
      { $addToSet: { readBy: sellerId } }
    );

    return res.json({ message: 'Notification marked as read' });
  } catch (error: any) {
    console.error('Mark as read error:', error);
    return res.status(500).json({ message: 'Failed to mark notification as read' });
  }
}

/**
 * Get unread count
 */
export async function getUnreadCount(req: AuthenticatedRequest, res: Response) {
  try {
    const sellerId = getSellerId(req);
    if (!sellerId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const seller = await User.findById(sellerId).select('sellerVerificationStatus isSellerVerified').lean();
    const isVerified = seller?.isSellerVerified || false;

    const filter: any = {
      $or: [
        { targetAudience: 'all_sellers' },
        { targetAudience: 'specific_seller', targetSellerId: sellerId },
      ],
      readBy: { $ne: sellerId },
    };

    if (isVerified) {
      filter.$or.push({ targetAudience: 'verified_sellers' });
    } else {
      filter.$or.push({ targetAudience: 'pending_sellers' });
    }

    // Expiration filter
    filter.$or.push({
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: { $gt: new Date() } },
      ],
    });

    const count = await SystemNotification.countDocuments(filter);

    return res.json({ count });
  } catch (error: any) {
    console.error('Get unread count error:', error);
    return res.status(500).json({ message: 'Failed to get unread count' });
  }
}

