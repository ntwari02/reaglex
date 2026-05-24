import mongoose from 'mongoose';
import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { ReturnCase } from '../models/ReturnCase';
import { Order } from '../models/Order';
import { createSystemInboxAndFanout } from '../services/systemInboxFanout';
import { sendRichNotificationEmail } from '../services/emailService';
import { pickCta } from '../email/copyEngine';
import { getClientUrl } from '../config/publicEnv';
import { User } from '../models/User';

const STATUS_FLOW: Record<string, string[]> = {
  requested: ['seller_reviewing', 'approved', 'rejected'],
  seller_reviewing: ['approved', 'rejected'],
  approved: ['item_returned', 'refund_processed'],
  item_returned: ['refund_processed'],
  refund_processed: ['resolved'],
  rejected: ['resolved'],
  resolved: [],
};

function actorId(req: AuthenticatedRequest): string {
  return String(req.user?.id || '');
}

export async function sellerListReturnCases(req: AuthenticatedRequest, res: Response) {
  try {
    const sellerId = actorId(req);
    const { status, page = '1', limit = '20' } = req.query;
    const filter: any = { sellerId: new mongoose.Types.ObjectId(sellerId) };
    if (status && status !== 'all') filter.status = String(status);
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
    const skip = (pageNum - 1) * limitNum;
    const [cases, total] = await Promise.all([
      ReturnCase.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      ReturnCase.countDocuments(filter),
    ]);
    return res.json({ cases, pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) } });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message || 'Failed to fetch return cases' });
  }
}

export async function adminListReturnCases(req: AuthenticatedRequest, res: Response) {
  try {
    const { status, page = '1', limit = '20', search = '' } = req.query;
    const filter: any = {};
    if (status && status !== 'all') filter.status = String(status);
    if (search && String(search).trim()) filter.caseNumber = { $regex: String(search).trim(), $options: 'i' };
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
    const skip = (pageNum - 1) * limitNum;
    const [cases, total] = await Promise.all([
      ReturnCase.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      ReturnCase.countDocuments(filter),
    ]);
    return res.json({ cases, pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) } });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message || 'Failed to fetch return cases' });
  }
}

export async function updateReturnCaseStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const { caseId } = req.params;
    const { status, note = '', refundAmount, refundEtaLabel } = req.body || {};
    if (!mongoose.Types.ObjectId.isValid(caseId)) return res.status(400).json({ message: 'Invalid case ID' });
    if (!status) return res.status(400).json({ message: 'Status is required' });
    const doc = await ReturnCase.findById(caseId);
    if (!doc) return res.status(404).json({ message: 'Return case not found' });

    const role = req.user?.role || '';
    if (role === 'seller' && String(doc.sellerId) !== String(req.user?.id)) {
      return res.status(403).json({ message: 'Forbidden: not your return case' });
    }
    if (!['seller', 'admin'].includes(role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const allowed = STATUS_FLOW[String(doc.status)] || [];
    if (!allowed.includes(String(status))) {
      return res.status(400).json({ message: `Invalid transition from ${doc.status} to ${status}` });
    }

    doc.status = String(status) as any;
    doc.timeline.push({
      stage: doc.status,
      label: String(status).replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase()),
      at: new Date(),
    });
    if (note) {
      doc.chat.push({
        actorRole: role as any,
        actorId: String(req.user?.id || ''),
        text: String(note),
        createdAt: new Date(),
      });
    }
    if (typeof refundAmount === 'number' && Number.isFinite(refundAmount)) {
      doc.refund.amount = Math.max(0, Number(refundAmount));
    }
    if (refundEtaLabel) doc.refund.etaLabel = String(refundEtaLabel);
    if (doc.status === 'refund_processed') doc.refund.processedAt = new Date();
    await doc.save();

    if (doc.status === 'refund_processed' || doc.status === 'resolved' || doc.status === 'rejected') {
      const order = await Order.findById(doc.orderId);
      if (order) {
        const escrow = order.escrow || ({ status: 'PENDING' } as any);
        escrow.status = doc.status === 'rejected' ? 'DELIVERED' : 'REFUNDED';
        if (doc.status === 'resolved' || doc.status === 'rejected') {
          escrow.disputeResolvedAt = new Date();
        }
        order.escrow = escrow;
        await order.save();
      }
    }

    const buyer = await User.findById(doc.buyerId).select('email').lean();
    void createSystemInboxAndFanout({
      title: `Return case ${doc.caseNumber} updated`,
      message: `Status changed to ${doc.status.replace(/_/g, ' ')}.`,
      type: doc.status === 'rejected' ? 'warning' : 'system_announcement',
      priority: doc.status === 'rejected' ? 'high' : 'medium',
      targetAudience: 'specific_user',
      targetUserId: doc.buyerId,
      createdBy: req.user?.id || doc.sellerId,
    });
    if (buyer?.email) {
      const clientUrl = getClientUrl();
      void sendRichNotificationEmail({
        to: buyer.email,
        subject: `Return case ${doc.caseNumber} — update`,
        name: 'there',
        category: 'return',
        headline: `Return ${doc.caseNumber} updated`,
        message: `Your return case is now: ${doc.status.replace(/_/g, ' ')}.`,
        actionUrl: `${clientUrl}/account?tab=orders&returns=${encodeURIComponent(String(doc._id))}`,
        actionLabel: pickCta('return', String(doc.buyerId)),
        accent: doc.status === 'rejected' ? 'warning' : 'brand',
      }).catch(() => {});
    }

    return res.json({ message: 'Return case updated', case: doc });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message || 'Failed to update return case' });
  }
}

export async function addReturnCaseStaffMessage(req: AuthenticatedRequest, res: Response) {
  try {
    const { caseId } = req.params;
    const text = String(req.body?.text || '').trim();
    const attachments = Array.isArray(req.body?.attachments) ? req.body.attachments.map((x: any) => String(x)) : [];
    if (!text) return res.status(400).json({ message: 'Message text is required' });
    if (!mongoose.Types.ObjectId.isValid(caseId)) return res.status(400).json({ message: 'Invalid case ID' });
    const doc = await ReturnCase.findById(caseId);
    if (!doc) return res.status(404).json({ message: 'Return case not found' });

    const role = req.user?.role || '';
    if (!['seller', 'admin'].includes(role)) return res.status(403).json({ message: 'Forbidden' });
    if (role === 'seller' && String(doc.sellerId) !== String(req.user?.id)) {
      return res.status(403).json({ message: 'Forbidden: not your return case' });
    }

    doc.chat.push({
      actorRole: role as any,
      actorId: String(req.user?.id || ''),
      text,
      attachments,
      createdAt: new Date(),
    });
    await doc.save();

    const buyer = await User.findById(doc.buyerId).select('email').lean();
    void createSystemInboxAndFanout({
      title: `New message on return case ${doc.caseNumber}`,
      message: 'Seller/Admin posted a new message in your return resolution thread.',
      type: 'system_announcement',
      priority: 'medium',
      targetAudience: 'specific_user',
      targetUserId: doc.buyerId,
      createdBy: req.user?.id || doc.sellerId,
    });
    if (buyer?.email) {
      const clientUrl = getClientUrl();
      void sendRichNotificationEmail({
        to: buyer.email,
        subject: `Return ${doc.caseNumber} — new message`,
        name: 'there',
        category: 'return',
        headline: 'New message on your return',
        message: 'A new message was posted in your return case thread.',
        actionUrl: `${clientUrl}/account?tab=orders&returns=${encodeURIComponent(String(doc._id))}`,
        actionLabel: pickCta('return', String(doc.buyerId)),
        accent: 'brand',
      }).catch(() => {});
    }

    return res.json({ message: 'Message sent', chat: doc.chat });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message || 'Failed to send message' });
  }
}

export async function adminBulkUpdateReturnCases(req: AuthenticatedRequest, res: Response) {
  try {
    const role = req.user?.role || '';
    if (role !== 'admin') return res.status(403).json({ message: 'Forbidden: admin access required' });
    const { caseIds = [], status, note = '', refundEtaLabel } = req.body || {};
    if (!Array.isArray(caseIds) || caseIds.length === 0) {
      return res.status(400).json({ message: 'caseIds is required' });
    }
    if (!status) return res.status(400).json({ message: 'status is required' });

    const ids = caseIds
      .map((x: any) => String(x))
      .filter((x: string) => mongoose.Types.ObjectId.isValid(x))
      .map((x: string) => new mongoose.Types.ObjectId(x));
    if (!ids.length) return res.status(400).json({ message: 'No valid case IDs provided' });

    const docs = await ReturnCase.find({ _id: { $in: ids } });
    const updated: string[] = [];
    const skipped: Array<{ caseId: string; reason: string }> = [];

    for (const doc of docs) {
      const allowed = STATUS_FLOW[String(doc.status)] || [];
      if (!allowed.includes(String(status))) {
        skipped.push({ caseId: String(doc._id), reason: `Invalid transition from ${doc.status}` });
        continue;
      }
      doc.status = String(status) as any;
      doc.timeline.push({
        stage: doc.status,
        label: String(status).replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase()),
        at: new Date(),
      });
      if (note) {
        doc.chat.push({
          actorRole: 'admin',
          actorId: String(req.user?.id || ''),
          text: String(note),
          createdAt: new Date(),
        });
      }
      if (refundEtaLabel) doc.refund.etaLabel = String(refundEtaLabel);
      if (doc.status === 'refund_processed') doc.refund.processedAt = new Date();
      await doc.save();
      updated.push(String(doc._id));

      const buyer = await User.findById(doc.buyerId).select('email').lean();
      void createSystemInboxAndFanout({
        title: `Return case ${doc.caseNumber} updated`,
        message: `Status changed to ${doc.status.replace(/_/g, ' ')}.`,
        type: doc.status === 'rejected' ? 'warning' : 'system_announcement',
        priority: doc.status === 'rejected' ? 'high' : 'medium',
        targetAudience: 'specific_user',
        targetUserId: doc.buyerId,
        createdBy: req.user?.id || doc.sellerId,
      });
      if (buyer?.email) {
        const clientUrl = getClientUrl();
        void sendRichNotificationEmail({
          to: buyer.email,
          subject: `Return case ${doc.caseNumber} — update`,
          name: 'there',
          category: 'return',
          headline: `Return ${doc.caseNumber} updated`,
          message: `Your return case is now: ${doc.status.replace(/_/g, ' ')}.`,
          actionUrl: `${clientUrl}/account?tab=orders&returns=${encodeURIComponent(String(doc._id))}`,
          actionLabel: pickCta('return', String(doc.buyerId)),
          accent: doc.status === 'rejected' ? 'warning' : 'brand',
        }).catch(() => {});
      }
    }

    return res.json({
      message: 'Bulk status update completed',
      updatedCount: updated.length,
      updated,
      skipped,
    });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message || 'Failed to bulk update return cases' });
  }
}

