import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import mongoose from 'mongoose';
import { MarketingCampaign } from '../models/MarketingCampaign';
import { MarketingCoupon } from '../models/MarketingCoupon';
import { CustomerSegment } from '../models/CustomerSegment';
import { MarketingMessageCampaign } from '../models/MarketingMessageCampaign';
import { AbandonedCart } from '../models/AbandonedCart';
import { getOrCreateCartSettings, settingsToClient } from '../models/AbandonedCartSettings';
import { getOrCreateCartStrategy, strategyToClient } from '../models/AbandonedCartStrategy';
import {
  cancelPendingQueueJobs,
  regenerateQueueFromSettings,
} from '../services/cartRecoveryEngine.service';
import { ProductPromotion } from '../models/ProductPromotion';
import { AdIntegration } from '../models/AdIntegration';
import { TrackingPixel } from '../models/TrackingPixel';
import { MarketingCreative } from '../models/MarketingCreative';
import { ReferralSettings } from '../models/ReferralSettings';
import { MarketingSettings } from '../models/MarketingSettings';
import { AIMarketingSettings } from '../models/AIMarketingSettings';
import { MarketingReferralReward } from '../models/MarketingReferralReward';
import { BuyerInsightProfile } from '../models/BuyerInsightProfile';
import { RecommendationEmailHistory } from '../models/RecommendationEmailHistory';
import {
  MarketingAutomationSettings,
  MarketingFlowKey,
  getMarketingAutomationSettings,
  invalidateMarketingAutomationSettingsCache,
  resolveEmailNotificationSettings,
} from '../models/MarketingAutomationSettings';
import { isEmailConfigured } from '../services/emailService';
import {
  isGeminiApiConfigured,
  invalidateEmailNotificationPolicyCache,
} from '../email/emailNotificationPolicy.service';
import { PushDevice } from '../models/PushDevice';
import { User } from '../models/User';
import {
  runRecommendationOnce,
  sendRecommendationEmailToUser,
} from '../services/recommendationEmail.service';
import { runCartPulseOnce } from '../jobs/cartPulseEmailWorker';
import { runBrowseAbandonOnce } from '../jobs/browseAbandonEmailWorker';
import { runWinbackOnce } from '../jobs/lifecycleEmailWorker';
import { runAbandonedCartOnce } from '../jobs/abandonedCartEmailWorker';
import {
  broadcastPushToBuyers,
  sendPushToUser,
} from '../services/pushNotificationService';

function ensureAdmin(req: AuthenticatedRequest, res: Response): boolean {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ message: 'Forbidden: admin access required' });
    return false;
  }
  return true;
}

function toId(doc: { _id: mongoose.Types.ObjectId }): string {
  return doc._id.toString();
}

// ---------- Dashboard ----------
export async function getDashboard(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalCampaigns,
      activeCampaigns,
      campaignsForChart,
      totalRevenueResult,
      couponCount,
      conversionAgg,
    ] = await Promise.all([
      MarketingCampaign.countDocuments(),
      MarketingCampaign.countDocuments({ status: 'active' }),
      MarketingCampaign.find({})
        .sort({ revenue: -1 })
        .limit(10)
        .lean(),
      MarketingCampaign.aggregate([{ $group: { _id: null, total: { $sum: '$revenue' } } }]),
      MarketingCoupon.countDocuments({ status: 'active' }),
      MarketingCampaign.aggregate([
        { $match: { conversions: { $gt: 0 } } },
        {
          $group: {
            _id: null,
            totalConv: { $sum: '$conversions' },
            totalRev: { $sum: '$revenue' },
          },
        },
      ]),
    ]);

    const totalRevenue = totalRevenueResult[0]?.total ?? 0;
    const totalConversions = conversionAgg[0]?.totalConv ?? 0;
    const conversionRate = totalRevenue > 0 && totalConversions > 0
      ? Math.round((totalConversions / (totalRevenue / 50)) * 1000) / 100
      : 0;
    const customerAcquisitionCost = totalConversions > 0
      ? Math.round((totalRevenue * 0.2) / totalConversions * 100) / 100
      : 0;

    const campaignPerformance = (campaignsForChart as any[]).map((c) => ({
      label: c.name || 'Campaign',
      value: c.revenue ?? 0,
    }));

    res.json({
      metrics: {
        totalCampaigns,
        activeCampaigns,
        totalRevenue,
        conversionRate,
        customerAcquisitionCost,
        emailOpenRate: 42.5,
        emailCTR: 12.8,
      },
      campaignPerformance: campaignPerformance.length ? campaignPerformance : [
        { label: 'No data', value: 0 },
      ],
      insights: [
        'Best time to send emails: 10 AM - 12 PM',
        'Flash sales perform 45% better on weekends',
        'Segment "High-value customers" has 3.5x conversion rate',
        'Consider running a BOGO campaign for electronics category',
      ],
    });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to fetch dashboard' });
  }
}

// ---------- Buyer insight dashboard ----------
export async function getBuyerInsightsOverview(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const [segAgg, confAgg] = await Promise.all([
      BuyerInsightProfile.aggregate([
        { $group: { _id: '$segment', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      BuyerInsightProfile.aggregate([
        {
          $bucket: {
            groupBy: '$confidenceScore',
            boundaries: [0, 25, 50, 75, 90, 101],
            default: 'unknown',
            output: { count: { $sum: 1 } },
          },
        },
      ]),
    ]);

    const segments = (segAgg as any[]).reduce((acc, r) => {
      acc[String(r._id || 'unknown')] = Number(r.count || 0);
      return acc;
    }, {} as Record<string, number>);

    const confidenceBuckets = (confAgg as any[]).map((b) => ({
      range: String(b._id),
      count: Number(b.count || 0),
    }));

    res.json({ segments, confidenceBuckets });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to fetch buyer insights overview' });
  }
}

export async function getBuyerInsightsList(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const { segment, minConfidence = '0', q = '', page = '1', limit = '30' } = req.query as any;
    const filter: any = {};
    if (segment) filter.segment = String(segment);
    const minC = Math.max(0, Math.min(100, Number(minConfidence) || 0));
    if (minC > 0) filter.confidenceScore = { $gte: minC };
    if (q) filter.email = new RegExp(String(q).trim(), 'i');

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(String(limit), 10) || 30));
    const skip = (pageNum - 1) * limitNum;

    const [rows, total] = await Promise.all([
      BuyerInsightProfile.find(filter)
        .sort({ confidenceScore: -1, score: -1, lastActivityAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      BuyerInsightProfile.countDocuments(filter),
    ]);

    const users = (rows as any[]).map((p) => ({
      userId: toId({ _id: p.userId } as any),
      email: p.email,
      segment: p.segment,
      score: p.score,
      confidenceScore: p.confidenceScore,
      confidenceReason: p.confidenceReason,
      lastActivityAt: p.lastActivityAt,
      lastLoginAt: p.lastLoginAt,
      orderCount: p.orderCount,
      totalSpendUsd: p.totalSpendUsd,
      deviceType: p.deviceType,
      lastKnownCountry: p.lastKnownCountry,
    }));

    res.json({
      users,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
    });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to fetch buyer insights list' });
  }
}

export async function getBuyerInsightByUser(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) return res.status(400).json({ message: 'Invalid user id' });
    const profile = await BuyerInsightProfile.findOne({ userId: new mongoose.Types.ObjectId(userId) }).lean();
    if (!profile) return res.status(404).json({ message: 'Profile not found' });

    // Recent automation performance for this user (last 30 days)
    const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const emailStats = await RecommendationEmailHistory.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId), sentAt: { $gte: since30d } } },
      {
        $group: {
          _id: '$campaign',
          sent: { $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
          opens: { $sum: '$opens' },
          clicks: { $sum: '$clicks' },
        },
      },
      { $sort: { sent: -1 } },
    ]);

    res.json({
      profile,
      emailStats,
    });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to fetch buyer insight profile' });
  }
}

// ---------- Campaigns ----------
export async function getCampaigns(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const list = await MarketingCampaign.find({}).sort({ createdAt: -1 }).lean();
    const campaigns = (list as any[]).map((c) => ({
      id: toId(c),
      name: c.name,
      type: c.type,
      status: c.status,
      startDate: c.startDate,
      endDate: c.endDate,
      budget: c.budget,
      revenue: c.revenue,
      conversions: c.conversions,
      target: c.target,
    }));
    res.json({ campaigns });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to fetch campaigns' });
  }
}

export async function createCampaign(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const body = req.body as Record<string, unknown>;
    const doc = await (MarketingCampaign as any).create({
      name: body.name,
      type: body.type || 'campaign',
      status: body.status || 'scheduled',
      startDate: body.startDate ? new Date(body.startDate as string) : new Date(),
      endDate: body.endDate ? new Date(body.endDate as string) : new Date(),
      budget: Number(body.budget) || 0,
      revenue: Number(body.revenue) || 0,
      conversions: Number(body.conversions) || 0,
      target: body.target || 'All Customers',
    });
    res.status(201).json({
      campaign: {
        id: toId(doc),
        name: doc.name,
        type: doc.type,
        status: doc.status,
        startDate: doc.startDate,
        endDate: doc.endDate,
        budget: doc.budget,
        revenue: doc.revenue,
        conversions: doc.conversions,
        target: doc.target,
      },
    });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to create campaign' });
  }
}

export async function updateCampaign(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const { campaignId } = req.params;
    const body = req.body as Record<string, unknown>;
    const doc = await MarketingCampaign.findByIdAndUpdate(
      campaignId,
      {
        ...(body.name != null && { name: body.name }),
        ...(body.type != null && { type: body.type }),
        ...(body.status != null && { status: body.status }),
        ...(body.startDate != null && { startDate: new Date(body.startDate as string) }),
        ...(body.endDate != null && { endDate: new Date(body.endDate as string) }),
        ...(body.budget != null && { budget: Number(body.budget) }),
        ...(body.revenue != null && { revenue: Number(body.revenue) }),
        ...(body.conversions != null && { conversions: Number(body.conversions) }),
        ...(body.target != null && { target: body.target }),
      },
      { new: true }
    );
    if (!doc) return res.status(404).json({ message: 'Campaign not found' });
    res.json({
      campaign: {
        id: toId(doc),
        name: doc.name,
        type: doc.type,
        status: doc.status,
        startDate: doc.startDate,
        endDate: doc.endDate,
        budget: doc.budget,
        revenue: doc.revenue,
        conversions: doc.conversions,
        target: doc.target,
      },
    });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to update campaign' });
  }
}

export async function deleteCampaign(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const { campaignId } = req.params;
    const doc = await MarketingCampaign.findByIdAndDelete(campaignId);
    if (!doc) return res.status(404).json({ message: 'Campaign not found' });
    res.json({ message: 'Campaign deleted' });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to delete campaign' });
  }
}

// ---------- Coupons ----------
export async function getCoupons(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const list = await MarketingCoupon.find({}).sort({ createdAt: -1 }).lean();
    const coupons = (list as any[]).map((c) => ({
      id: toId(c),
      code: c.code,
      type: c.type,
      value: c.value,
      minOrder: c.minOrder,
      usageLimit: c.usageLimit,
      usedCount: c.usedCount,
      expiryDate: c.expiryDate,
      status: c.status,
      applicableTo: c.applicableTo,
    }));
    res.json({ coupons });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to fetch coupons' });
  }
}

export async function createCoupon(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const body = req.body as Record<string, unknown>;
    const doc = await (MarketingCoupon as any).create({
      code: (body.code as string)?.toUpperCase() || '',
      type: body.type || 'percentage',
      value: Number(body.value) || 0,
      minOrder: body.minOrder != null ? Number(body.minOrder) : undefined,
      usageLimit: body.usageLimit != null ? Number(body.usageLimit) : undefined,
      usedCount: Number(body.usedCount) || 0,
      expiryDate: body.expiryDate ? new Date(body.expiryDate as string) : new Date(),
      status: body.status || 'active',
      applicableTo: body.applicableTo || 'All Products',
    });
    res.status(201).json({
      coupon: {
        id: toId(doc),
        code: doc.code,
        type: doc.type,
        value: doc.value,
        minOrder: doc.minOrder,
        usageLimit: doc.usageLimit,
        usedCount: doc.usedCount,
        expiryDate: doc.expiryDate,
        status: doc.status,
        applicableTo: doc.applicableTo,
      },
    });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to create coupon' });
  }
}

export async function updateCoupon(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const { couponId } = req.params;
    const body = req.body as Record<string, unknown>;
    const doc = await MarketingCoupon.findByIdAndUpdate(
      couponId,
      {
        ...(body.code != null && { code: (body.code as string).toUpperCase() }),
        ...(body.type != null && { type: body.type }),
        ...(body.value != null && { value: Number(body.value) }),
        ...(body.minOrder != null && { minOrder: Number(body.minOrder) }),
        ...(body.usageLimit != null && { usageLimit: Number(body.usageLimit) }),
        ...(body.usedCount != null && { usedCount: Number(body.usedCount) }),
        ...(body.expiryDate != null && { expiryDate: new Date(body.expiryDate as string) }),
        ...(body.status != null && { status: body.status }),
        ...(body.applicableTo != null && { applicableTo: body.applicableTo }),
      },
      { new: true }
    );
    if (!doc) return res.status(404).json({ message: 'Coupon not found' });
    res.json({
      coupon: {
        id: toId(doc),
        code: doc.code,
        type: doc.type,
        value: doc.value,
        minOrder: doc.minOrder,
        usageLimit: doc.usageLimit,
        usedCount: doc.usedCount,
        expiryDate: doc.expiryDate,
        status: doc.status,
        applicableTo: doc.applicableTo,
      },
    });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to update coupon' });
  }
}

export async function deleteCoupon(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const { couponId } = req.params;
    const doc = await MarketingCoupon.findByIdAndDelete(couponId);
    if (!doc) return res.status(404).json({ message: 'Coupon not found' });
    res.json({ message: 'Coupon deleted' });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to delete coupon' });
  }
}

// ---------- Segments ----------
export async function getSegments(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const list = await CustomerSegment.find({}).sort({ createdAt: -1 }).lean();
    const segments = (list as any[]).map((s) => ({
      id: toId(s),
      name: s.name,
      filters: s.filters || [],
      userCount: s.userCount ?? 0,
      createdAt: s.createdAt,
    }));
    res.json({ segments });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to fetch segments' });
  }
}

export async function createSegment(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const body = req.body as Record<string, unknown>;
    const doc = await (CustomerSegment as any).create({
      name: body.name,
      filters: Array.isArray(body.filters) ? body.filters : [],
      userCount: Number(body.userCount) || 0,
    });
    res.status(201).json({
      segment: {
        id: toId(doc),
        name: doc.name,
        filters: doc.filters,
        userCount: doc.userCount,
        createdAt: doc.createdAt,
      },
    });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to create segment' });
  }
}

export async function updateSegment(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const { segmentId } = req.params;
    const body = req.body as Record<string, unknown>;
    const doc = await CustomerSegment.findByIdAndUpdate(
      segmentId,
      {
        ...(body.name != null && { name: body.name }),
        ...(Array.isArray(body.filters) && { filters: body.filters }),
        ...(body.userCount != null && { userCount: Number(body.userCount) }),
      },
      { new: true }
    );
    if (!doc) return res.status(404).json({ message: 'Segment not found' });
    res.json({
      segment: {
        id: toId(doc),
        name: doc.name,
        filters: doc.filters,
        userCount: doc.userCount,
        createdAt: doc.createdAt,
      },
    });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to update segment' });
  }
}

export async function deleteSegment(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const { segmentId } = req.params;
    const doc = await CustomerSegment.findByIdAndDelete(segmentId);
    if (!doc) return res.status(404).json({ message: 'Segment not found' });
    res.json({ message: 'Segment deleted' });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to delete segment' });
  }
}

// ---------- Message campaigns ----------
export async function getMessageCampaigns(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const list = await MarketingMessageCampaign.find({}).sort({ createdAt: -1 }).lean();
    const campaigns = (list as any[]).map((c) => ({
      id: toId(c),
      name: c.name,
      channel: c.channel,
      target: c.target,
      sent: c.sent,
      opened: c.opened,
      clicked: c.clicked,
      status: c.status,
    }));
    res.json({ campaigns });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to fetch message campaigns' });
  }
}

export async function createMessageCampaign(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const body = req.body as Record<string, unknown>;
    const doc = await (MarketingMessageCampaign as any).create({
      name: body.name,
      channel: body.channel || 'email',
      target: body.target || 'All Customers',
      sent: Number(body.sent) || 0,
      opened: Number(body.opened) || 0,
      clicked: Number(body.clicked) || 0,
      status: body.status || 'draft',
    });
    res.status(201).json({
      campaign: {
        id: toId(doc),
        name: doc.name,
        channel: doc.channel,
        target: doc.target,
        sent: doc.sent,
        opened: doc.opened,
        clicked: doc.clicked,
        status: doc.status,
      },
    });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to create message campaign' });
  }
}

export async function updateMessageCampaign(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const { campaignId } = req.params;
    const body = req.body as Record<string, unknown>;
    const doc = await MarketingMessageCampaign.findByIdAndUpdate(
      campaignId,
      {
        ...(body.name != null && { name: body.name }),
        ...(body.channel != null && { channel: body.channel }),
        ...(body.target != null && { target: body.target }),
        ...(body.sent != null && { sent: Number(body.sent) }),
        ...(body.opened != null && { opened: Number(body.opened) }),
        ...(body.clicked != null && { clicked: Number(body.clicked) }),
        ...(body.status != null && { status: body.status }),
      },
      { new: true }
    );
    if (!doc) return res.status(404).json({ message: 'Message campaign not found' });
    res.json({
      campaign: {
        id: toId(doc),
        name: doc.name,
        channel: doc.channel,
        target: doc.target,
        sent: doc.sent,
        opened: doc.opened,
        clicked: doc.clicked,
        status: doc.status,
      },
    });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to update message campaign' });
  }
}

export async function deleteMessageCampaign(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const { campaignId } = req.params;
    const doc = await MarketingMessageCampaign.findByIdAndDelete(campaignId);
    if (!doc) return res.status(404).json({ message: 'Message campaign not found' });
    res.json({ message: 'Message campaign deleted' });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to delete message campaign' });
  }
}

// ---------- Abandoned carts ----------
export async function getAbandonedCarts(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const list = await AbandonedCart.find({ recovered: false })
      .sort({ abandonedAt: -1 })
      .limit(100)
      .lean();
    const carts = (list as any[]).map((c) => ({
      id: toId(c),
      customerName: c.customerName,
      customerEmail: c.customerEmail,
      items: c.items,
      total: c.total,
      abandonedAt: c.abandonedAt,
      lastCartActivityAt: c.lastCartActivityAt,
      remindersSent: c.remindersSent,
      recovered: c.recovered,
      timeline: c.timeline || [],
      aiSuggestedSendAt: c.aiSuggestedSendAt,
    }));
    res.json({ carts });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to fetch abandoned carts' });
  }
}

export async function getAbandonedCartSettings(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const settings = settingsToClient(await getOrCreateCartSettings());
    const first = settings.recoverySteps?.[0];
    res.json({
      enabled: settings.enabled,
      autoReminderEnabled: settings.enabled,
      delayValue: settings.delayValue,
      delayUnit: settings.delayUnit,
      reminderTiming: `${first?.delayValue || settings.delayValue}${first?.delayUnit || settings.delayUnit}`,
      settings,
    });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to fetch settings' });
  }
}

export async function updateAbandonedCartSettings(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const body = req.body as Record<string, unknown>;
    const doc = await getOrCreateCartSettings();
    const d = doc as any;

    if (body.enabled != null) d.enabled = Boolean(body.enabled);
    if (body.autoReminderEnabled != null) d.enabled = Boolean(body.autoReminderEnabled);
    if (body.delayValue != null) d.delayValue = Math.max(1, Number(body.delayValue) || 1);
    if (body.delayUnit != null) d.delayUnit = String(body.delayUnit);
    if (body.maxReminders != null) d.maxReminders = Math.max(1, Math.min(10, Number(body.maxReminders) || 3));
    if (body.cooldownPeriod != null) d.cooldownPeriod = String(body.cooldownPeriod);
    if (body.smartMode != null) d.smartMode = Boolean(body.smartMode);
    if (body.aiOptimizationEnabled != null) d.aiOptimizationEnabled = Boolean(body.aiOptimizationEnabled);
    if (Array.isArray(body.recoverySteps)) d.recoverySteps = body.recoverySteps;
    if (body.reminderTiming != null) {
      const mins = timingLegacyToMinutes(String(body.reminderTiming));
      d.delayValue = mins >= 1440 ? Math.round(mins / 1440) : mins >= 60 ? Math.round(mins / 60) : mins;
      d.delayUnit = mins >= 1440 ? 'days' : mins >= 60 ? 'hours' : 'minutes';
      if (d.recoverySteps?.[0]) {
        d.recoverySteps[0].delayValue = d.delayValue;
        d.recoverySteps[0].delayUnit = d.delayUnit;
      }
    }

    await d.save();
    if (!d.enabled) await cancelPendingQueueJobs('admin_disabled');
    else await regenerateQueueFromSettings();

    const settings = settingsToClient(d);
    res.json({
      enabled: settings.enabled,
      autoReminderEnabled: settings.enabled,
      settings,
      message: settings.enabled
        ? 'Settings saved. Queue rescheduled from admin configuration.'
        : 'Campaign off. Pending emails cancelled.',
    });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to update settings' });
  }
}

function timingLegacyToMinutes(timing: string): number {
  const t = timing.toLowerCase();
  if (t.includes('15')) return 15;
  if (t.includes('48')) return 2880;
  if (t.includes('24')) return 1440;
  if (t.includes('2h') || t === '2hr') return 120;
  return 60;
}

// ---------- Promotions ----------
export async function getPromotions(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const list = await ProductPromotion.find({}).sort({ createdAt: -1 }).lean();
    const promotions = (list as any[]).map((p) => ({
      id: toId(p),
      type: p.type,
      productName: p.productName,
      position: p.position,
      status: p.status,
      impressions: p.impressions,
      clicks: p.clicks,
    }));
    res.json({ promotions });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to fetch promotions' });
  }
}

export async function createPromotion(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const body = req.body as Record<string, unknown>;
    const doc = await (ProductPromotion as any).create({
      type: body.type || 'featured',
      productName: body.productName || '',
      position: body.position || '',
      status: body.status || 'active',
      impressions: Number(body.impressions) || 0,
      clicks: Number(body.clicks) || 0,
    });
    res.status(201).json({
      promotion: {
        id: toId(doc),
        type: doc.type,
        productName: doc.productName,
        position: doc.position,
        status: doc.status,
        impressions: doc.impressions,
        clicks: doc.clicks,
      },
    });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to create promotion' });
  }
}

export async function updatePromotion(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const { promotionId } = req.params;
    const body = req.body as Record<string, unknown>;
    const doc = await ProductPromotion.findByIdAndUpdate(
      promotionId,
      {
        ...(body.type != null && { type: body.type }),
        ...(body.productName != null && { productName: body.productName }),
        ...(body.position != null && { position: body.position }),
        ...(body.status != null && { status: body.status }),
        ...(body.impressions != null && { impressions: Number(body.impressions) }),
        ...(body.clicks != null && { clicks: Number(body.clicks) }),
      },
      { new: true }
    );
    if (!doc) return res.status(404).json({ message: 'Promotion not found' });
    res.json({
      promotion: {
        id: toId(doc),
        type: doc.type,
        productName: doc.productName,
        position: doc.position,
        status: doc.status,
        impressions: doc.impressions,
        clicks: doc.clicks,
      },
    });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to update promotion' });
  }
}

export async function deletePromotion(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const { promotionId } = req.params;
    const doc = await ProductPromotion.findByIdAndDelete(promotionId);
    if (!doc) return res.status(404).json({ message: 'Promotion not found' });
    res.json({ message: 'Promotion deleted' });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to delete promotion' });
  }
}

// ---------- Ad integrations ----------
export async function getAdIntegrations(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const list = await AdIntegration.find({}).sort({ createdAt: -1 }).lean();
    const integrations = (list as any[]).map((i) => ({
      id: toId(i),
      platform: i.platform,
      status: i.status,
      accountName: i.accountName,
      spend: i.spend,
      conversions: i.conversions,
      roas: i.roas,
    }));
    res.json({ integrations });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to fetch ad integrations' });
  }
}

export async function createAdIntegration(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const body = req.body as Record<string, unknown>;
    const doc = await (AdIntegration as any).create({
      platform: body.platform || 'facebook',
      status: body.status || 'disconnected',
      accountName: body.accountName || '',
      spend: Number(body.spend) || 0,
      conversions: Number(body.conversions) || 0,
      roas: Number(body.roas) || 0,
    });
    res.status(201).json({
      integration: {
        id: toId(doc),
        platform: doc.platform,
        status: doc.status,
        accountName: doc.accountName,
        spend: doc.spend,
        conversions: doc.conversions,
        roas: doc.roas,
      },
    });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to create ad integration' });
  }
}

export async function updateAdIntegration(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const { integrationId } = req.params;
    const body = req.body as Record<string, unknown>;
    const doc = await AdIntegration.findByIdAndUpdate(
      integrationId,
      {
        ...(body.platform != null && { platform: body.platform }),
        ...(body.status != null && { status: body.status }),
        ...(body.accountName != null && { accountName: body.accountName }),
        ...(body.spend != null && { spend: Number(body.spend) }),
        ...(body.conversions != null && { conversions: Number(body.conversions) }),
        ...(body.roas != null && { roas: Number(body.roas) }),
      },
      { new: true }
    );
    if (!doc) return res.status(404).json({ message: 'Ad integration not found' });
    res.json({
      integration: {
        id: toId(doc),
        platform: doc.platform,
        status: doc.status,
        accountName: doc.accountName,
        spend: doc.spend,
        conversions: doc.conversions,
        roas: doc.roas,
      },
    });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to update ad integration' });
  }
}

export async function deleteAdIntegration(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const { integrationId } = req.params;
    const doc = await AdIntegration.findByIdAndDelete(integrationId);
    if (!doc) return res.status(404).json({ message: 'Ad integration not found' });
    res.json({ message: 'Ad integration deleted' });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to delete ad integration' });
  }
}

// ---------- Pixels ----------
export async function getPixels(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const list = await TrackingPixel.find({}).sort({ createdAt: -1 }).lean();
    const pixels = (list as any[]).map((p) => ({
      id: toId(p),
      name: p.name,
      status: p.status,
      pixelId: p.pixelId,
    }));
    res.json({ pixels });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to fetch pixels' });
  }
}

export async function createPixel(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const body = req.body as Record<string, unknown>;
    const doc = await (TrackingPixel as any).create({
      name: body.name || '',
      status: body.status || 'inactive',
      pixelId: body.pixelId || '',
    });
    res.status(201).json({
      pixel: {
        id: toId(doc),
        name: doc.name,
        status: doc.status,
        pixelId: doc.pixelId,
      },
    });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to create pixel' });
  }
}

export async function updatePixel(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const { pixelId } = req.params;
    const body = req.body as Record<string, unknown>;
    const doc = await TrackingPixel.findByIdAndUpdate(
      pixelId,
      {
        ...(body.name != null && { name: body.name }),
        ...(body.status != null && { status: body.status }),
        ...(body.pixelId != null && { pixelId: body.pixelId }),
      },
      { new: true }
    );
    if (!doc) return res.status(404).json({ message: 'Pixel not found' });
    res.json({
      pixel: {
        id: toId(doc),
        name: doc.name,
        status: doc.status,
        pixelId: doc.pixelId,
      },
    });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to update pixel' });
  }
}

export async function deletePixel(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const { pixelId } = req.params;
    const doc = await TrackingPixel.findByIdAndDelete(pixelId);
    if (!doc) return res.status(404).json({ message: 'Pixel not found' });
    res.json({ message: 'Pixel deleted' });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to delete pixel' });
  }
}

// ---------- Creatives ----------
export async function getCreatives(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const list = await MarketingCreative.find({}).sort({ createdAt: -1 }).lean();
    const creatives = (list as any[]).map((c) => ({
      id: toId(c),
      name: c.name,
      type: c.type,
      location: c.location,
      impressions: c.impressions,
      clicks: c.clicks,
      scheduledFrom: c.scheduledFrom,
      scheduledTo: c.scheduledTo,
      status: c.status,
    }));
    res.json({ creatives });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to fetch creatives' });
  }
}

export async function createCreative(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const body = req.body as Record<string, unknown>;
    const doc = await (MarketingCreative as any).create({
      name: body.name,
      type: body.type || 'banner',
      location: body.location || '',
      impressions: Number(body.impressions) || 0,
      clicks: Number(body.clicks) || 0,
      scheduledFrom: body.scheduledFrom ? new Date(body.scheduledFrom as string) : undefined,
      scheduledTo: body.scheduledTo ? new Date(body.scheduledTo as string) : undefined,
      status: body.status || 'active',
    });
    res.status(201).json({
      creative: {
        id: toId(doc),
        name: doc.name,
        type: doc.type,
        location: doc.location,
        impressions: doc.impressions,
        clicks: doc.clicks,
        scheduledFrom: doc.scheduledFrom,
        scheduledTo: doc.scheduledTo,
        status: doc.status,
      },
    });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to create creative' });
  }
}

export async function updateCreative(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const { creativeId } = req.params;
    const body = req.body as Record<string, unknown>;
    const doc = await MarketingCreative.findByIdAndUpdate(
      creativeId,
      {
        ...(body.name != null && { name: body.name }),
        ...(body.type != null && { type: body.type }),
        ...(body.location != null && { location: body.location }),
        ...(body.impressions != null && { impressions: Number(body.impressions) }),
        ...(body.clicks != null && { clicks: Number(body.clicks) }),
        ...(body.scheduledFrom != null && { scheduledFrom: new Date(body.scheduledFrom as string) }),
        ...(body.scheduledTo != null && { scheduledTo: new Date(body.scheduledTo as string) }),
        ...(body.status != null && { status: body.status }),
      },
      { new: true }
    );
    if (!doc) return res.status(404).json({ message: 'Creative not found' });
    res.json({
      creative: {
        id: toId(doc),
        name: doc.name,
        type: doc.type,
        location: doc.location,
        impressions: doc.impressions,
        clicks: doc.clicks,
        scheduledFrom: doc.scheduledFrom,
        scheduledTo: doc.scheduledTo,
        status: doc.status,
      },
    });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to update creative' });
  }
}

export async function deleteCreative(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const { creativeId } = req.params;
    const doc = await MarketingCreative.findByIdAndDelete(creativeId);
    if (!doc) return res.status(404).json({ message: 'Creative not found' });
    res.json({ message: 'Creative deleted' });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to delete creative' });
  }
}

// ---------- Referral ----------
export async function getReferralSettings(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    let doc = await ReferralSettings.findOne();
    if (!doc) doc = await (ReferralSettings as any).create({});
    const d = doc as any;
    res.json({
      programEnabled: d.programEnabled !== false,
      rewardType: d.rewardType,
      rewardAmount: d.rewardAmount,
      maxReferralsPerUser: d.maxReferralsPerUser,
      fraudDetection: d.fraudDetection,
    });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to fetch referral settings' });
  }
}

export async function updateReferralSettings(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const body = req.body as Record<string, unknown>;
    let doc = await ReferralSettings.findOne();
    if (!doc) doc = await (ReferralSettings as any).create({});
    const d = doc as any;
    if (body.programEnabled != null) d.programEnabled = Boolean(body.programEnabled);
    if (body.rewardType != null) d.rewardType = body.rewardType as 'cash' | 'points' | 'coupon';
    if (body.rewardAmount != null) d.rewardAmount = Number(body.rewardAmount);
    if (body.maxReferralsPerUser != null) d.maxReferralsPerUser = Number(body.maxReferralsPerUser);
    if (body.fraudDetection != null) d.fraudDetection = Boolean(body.fraudDetection);
    await d.save();
    res.json({
      programEnabled: d.programEnabled !== false,
      rewardType: d.rewardType,
      rewardAmount: d.rewardAmount,
      maxReferralsPerUser: d.maxReferralsPerUser,
      fraudDetection: d.fraudDetection,
    });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to update referral settings' });
  }
}

export async function getReferralStats(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const [totalReferrals, distinctReferrers, paidAgg] = await Promise.all([
      MarketingReferralReward.countDocuments(),
      MarketingReferralReward.distinct('referrerUserId'),
      MarketingReferralReward.aggregate([{ $group: { _id: null, total: { $sum: '$rewardAmount' } } }]),
    ]);
    const rewardsPaid = Math.round((paidAgg[0]?.total ?? 0) * 100) / 100;
    res.json({
      totalReferrals,
      activeReferrers: distinctReferrers.length,
      rewardsPaid,
    });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to fetch referral stats' });
  }
}

// ---------- Analytics ----------
export async function getAnalytics(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const [revenueAgg, campaignRevenue] = await Promise.all([
      MarketingCampaign.aggregate([{ $group: { _id: null, total: { $sum: '$revenue' } } }]),
      MarketingCampaign.find({}).sort({ revenue: -1 }).limit(10).lean(),
    ]);
    const totalRevenue = revenueAgg[0]?.total ?? 0;
    const adSpendAgg = await AdIntegration.aggregate([{ $group: { _id: null, total: { $sum: '$spend' } } }]);
    const adSpend = adSpendAgg[0]?.total ?? 0;
    const roas = adSpend > 0 ? Math.round((totalRevenue / adSpend) * 10) / 10 : 0;

    const trafficSources = [
      { label: 'Organic', value: 45 },
      { label: 'Social Media', value: 28 },
      { label: 'Email', value: 15 },
      { label: 'Direct', value: 12 },
    ];
    const campaignRevenueChart = (campaignRevenue as any[]).map((c) => ({
      label: c.name || 'Campaign',
      value: c.revenue ?? 0,
    }));

    res.json({
      campaignRevenue: totalRevenue,
      emailOpenRate: 42.5,
      adSpend,
      roas,
      trafficSources: campaignRevenueChart.length ? campaignRevenueChart : trafficSources,
      campaignRevenueData: campaignRevenueChart.length ? campaignRevenueChart : [
        { label: 'No data', value: 0 },
      ],
    });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to fetch analytics' });
  }
}

// ---------- AI Settings ----------
export async function getAISettings(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    let doc = await AIMarketingSettings.findOne();
    if (!doc) doc = await (AIMarketingSettings as any).create({});
    const d = doc as any;
    res.json({
      aiEnabled: d.aiEnabled,
      features: d.features || [],
    });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to fetch AI settings' });
  }
}

export async function updateAISettings(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const body = req.body as Record<string, unknown>;
    let doc = await AIMarketingSettings.findOne();
    if (!doc) doc = await (AIMarketingSettings as any).create({});
    const d = doc as any;
    if (body.aiEnabled != null) d.aiEnabled = Boolean(body.aiEnabled);
    if (Array.isArray(body.features)) d.features = body.features as any[];
    await d.save();
    invalidateEmailNotificationPolicyCache();
    res.json({
      aiEnabled: d.aiEnabled,
      features: d.features,
    });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to update AI settings' });
  }
}

// ---------- Marketing settings ----------
export async function getMarketingSettings(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    let doc = await MarketingSettings.findOne();
    if (!doc) doc = await (MarketingSettings as any).create({});
    const d = doc as any;
    res.json({
      budgetLimit: d.budgetLimit,
      spamProtection: d.spamProtection,
      smtp: d.smtp || { host: '', port: '' },
      sms: d.sms || { apiKey: '', apiSecret: '' },
      push: d.push || { fcmKey: '' },
    });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to fetch marketing settings' });
  }
}

export async function updateMarketingSettings(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const body = req.body as Record<string, unknown>;
    let doc = await MarketingSettings.findOne();
    if (!doc) doc = await (MarketingSettings as any).create({});
    const d = doc as any;
    if (body.budgetLimit != null) d.budgetLimit = Number(body.budgetLimit);
    if (body.spamProtection != null) d.spamProtection = Boolean(body.spamProtection);
    if (body.smtp != null && typeof body.smtp === 'object') {
      const s = body.smtp as Record<string, unknown>;
      if (s.host != null) d.smtp.host = String(s.host);
      if (s.port != null) d.smtp.port = String(s.port);
    }
    if (body.sms != null && typeof body.sms === 'object') {
      const s = body.sms as Record<string, unknown>;
      if (s.apiKey != null) d.sms.apiKey = String(s.apiKey);
      if (s.apiSecret != null) d.sms.apiSecret = String(s.apiSecret);
    }
    if (body.push != null && typeof body.push === 'object') {
      const p = body.push as Record<string, unknown>;
      if (p.fcmKey != null) d.push.fcmKey = String(p.fcmKey);
    }
    await d.save();
    res.json({
      budgetLimit: d.budgetLimit,
      spamProtection: d.spamProtection,
      smtp: d.smtp,
      sms: d.sms,
      push: d.push,
    });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to update marketing settings' });
  }
}

// ---------- Marketing automation (recommendation, cart pulse, browse abandon, winback, abandoned cart) ----------

const ALL_FLOWS: MarketingFlowKey[] = [
  'recommendation',
  'cart_pulse',
  'browse_abandon',
  'winback',
  'abandoned_cart',
];

const FLOW_LABELS: Record<MarketingFlowKey, { label: string; description: string }> = {
  recommendation: {
    label: 'Recommendation deals',
    description: 'Personalized product picks emailed and pushed based on each buyer\u2019s wishlist, views, cart and purchase history.',
  },
  cart_pulse: {
    label: 'Cart Pulse',
    description: 'Sends extra recommendations within hours of a cart_add so buyers see related deals while intent is high.',
  },
  browse_abandon: {
    label: 'Browse Abandon',
    description: 'Reminds buyers about products they viewed multiple times but never added to cart.',
  },
  winback: {
    label: 'Win-back',
    description: 'Re-engages dormant buyers (30+ days inactive) with fresh personalized picks.',
  },
  abandoned_cart: {
    label: 'Abandoned Cart',
    description: 'Recovers abandoned shopping carts with reminder emails and pushes.',
  },
};

async function getFlowStats(flow: MarketingFlowKey, sinceDays: number) {
  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);
  const agg = await RecommendationEmailHistory.aggregate([
    { $match: { campaign: flow, sentAt: { $gte: since } } },
    {
      $group: {
        _id: null,
        sent: { $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] } },
        skipped: { $sum: { $cond: [{ $eq: ['$status', 'skipped'] }, 1, 0] } },
        failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
        opens: { $sum: { $ifNull: ['$opens', 0] } },
        clicks: { $sum: { $ifNull: ['$clicks', 0] } },
      },
    },
  ]);
  const row = (agg[0] as any) || { sent: 0, skipped: 0, failed: 0, opens: 0, clicks: 0 };
  return {
    sent: Number(row.sent || 0),
    skipped: Number(row.skipped || 0),
    failed: Number(row.failed || 0),
    opens: Number(row.opens || 0),
    clicks: Number(row.clicks || 0),
  };
}

export async function getAutomationOverview(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const settings = await getMarketingAutomationSettings();
    const [pushDeviceCount, pushEnabledUsers] = await Promise.all([
      PushDevice.countDocuments({ enabled: true }),
      PushDevice.distinct('userId', { enabled: true }),
    ]);

    const flows = await Promise.all(
      ALL_FLOWS.map(async (key) => {
        const f = (settings.flows as any)?.[key] || {};
        const [d7, d30] = await Promise.all([
          getFlowStats(key, 7),
          getFlowStats(key, 30),
        ]);
        return {
          key,
          label: FLOW_LABELS[key].label,
          description: FLOW_LABELS[key].description,
          enabled: Boolean(f.enabled ?? true),
          pushEnabled: Boolean(f.pushEnabled ?? true),
          lastRunAt: f.lastRunAt || null,
          lastRunSent: Number(f.lastRunSent ?? 0),
          lastRunSkipped: Number(f.lastRunSkipped ?? 0),
          lastRunFailed: Number(f.lastRunFailed ?? 0),
          lastError: f.lastError || '',
          stats7d: d7,
          stats30d: d30,
        };
      }),
    );

    const email = resolveEmailNotificationSettings(settings);
    res.json({
      globalEnabled: Boolean(settings.globalEnabled),
      dailyEmailCap: Number(settings.dailyEmailCap ?? 4),
      email,
      system: {
        emailProviderConfigured: isEmailConfigured(),
        geminiApiConfigured: isGeminiApiConfigured(),
      },
      pushDeviceCount,
      pushEnabledUserCount: pushEnabledUsers.length,
      flows,
    });
  } catch (e) {
    res
      .status(500)
      .json({ message: e instanceof Error ? e.message : 'Failed to fetch automation overview' });
  }
}

export async function updateAutomationFlow(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const { flow } = req.params as { flow: MarketingFlowKey };
    if (!ALL_FLOWS.includes(flow)) {
      return res.status(400).json({ message: 'Unknown flow' });
    }
    const body = (req.body || {}) as { enabled?: boolean; pushEnabled?: boolean };
    let doc = await MarketingAutomationSettings.findOne();
    if (!doc) doc = await MarketingAutomationSettings.create({});
    const current = (doc.flows as any)[flow] || { enabled: true, pushEnabled: true };
    if (body.enabled != null) current.enabled = Boolean(body.enabled);
    if (body.pushEnabled != null) current.pushEnabled = Boolean(body.pushEnabled);
    (doc.flows as any)[flow] = current;
    doc.markModified('flows');
    await doc.save();
    invalidateMarketingAutomationSettingsCache();
    res.json({
      flow,
      enabled: Boolean(current.enabled),
      pushEnabled: Boolean(current.pushEnabled),
    });
  } catch (e) {
    res
      .status(500)
      .json({ message: e instanceof Error ? e.message : 'Failed to update automation flow' });
  }
}

export async function updateAutomationGlobals(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const body = (req.body || {}) as {
      globalEnabled?: boolean;
      dailyEmailCap?: number;
      email?: {
        richTemplatesEnabled?: boolean;
        geminiMarketingCopy?: boolean;
        geminiTransactionalPolish?: boolean;
        geminiSellerNotifications?: boolean;
      };
    };
    let doc = await MarketingAutomationSettings.findOne();
    if (!doc) doc = await MarketingAutomationSettings.create({});
    if (body.globalEnabled != null) doc.globalEnabled = Boolean(body.globalEnabled);
    if (body.dailyEmailCap != null) {
      const cap = Math.max(0, Math.min(50, Math.floor(Number(body.dailyEmailCap) || 0)));
      doc.dailyEmailCap = cap;
    }
    if (body.email && typeof body.email === 'object') {
      const current = resolveEmailNotificationSettings(doc);
      const next = {
        richTemplatesEnabled:
          body.email.richTemplatesEnabled != null
            ? Boolean(body.email.richTemplatesEnabled)
            : current.richTemplatesEnabled,
        geminiMarketingCopy:
          body.email.geminiMarketingCopy != null
            ? Boolean(body.email.geminiMarketingCopy)
            : current.geminiMarketingCopy,
        geminiTransactionalPolish:
          body.email.geminiTransactionalPolish != null
            ? Boolean(body.email.geminiTransactionalPolish)
            : current.geminiTransactionalPolish,
        geminiSellerNotifications:
          body.email.geminiSellerNotifications != null
            ? Boolean(body.email.geminiSellerNotifications)
            : current.geminiSellerNotifications,
      };
      (doc as any).email = next;
      doc.markModified('email');
    }
    await doc.save();
    invalidateMarketingAutomationSettingsCache();
    invalidateEmailNotificationPolicyCache();
    res.json({
      globalEnabled: doc.globalEnabled,
      dailyEmailCap: doc.dailyEmailCap,
      email: resolveEmailNotificationSettings(doc),
    });
  } catch (e) {
    res
      .status(500)
      .json({ message: e instanceof Error ? e.message : 'Failed to update automation globals' });
  }
}

export async function runAutomationFlow(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const { flow } = req.params as { flow: MarketingFlowKey };
    let result: { sent: number; skipped: number; failed: number };
    switch (flow) {
      case 'recommendation':
        result = await runRecommendationOnce();
        break;
      case 'cart_pulse':
        result = await runCartPulseOnce();
        break;
      case 'browse_abandon':
        result = await runBrowseAbandonOnce();
        break;
      case 'winback':
        result = await runWinbackOnce();
        break;
      case 'abandoned_cart':
        result = await runAbandonedCartOnce();
        break;
      default:
        return res.status(400).json({ message: 'Unknown flow' });
    }
    res.json({ flow, result });
  } catch (e) {
    res
      .status(500)
      .json({ message: e instanceof Error ? e.message : 'Failed to run automation flow' });
  }
}

export async function testAutomationEmail(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const { email } = (req.body || {}) as { email?: string };
    if (!email) return res.status(400).json({ message: 'email is required' });
    const user = await User.findOne({ email: String(email).toLowerCase().trim() })
      .select('_id email fullName')
      .lean();
    if (!user) return res.status(404).json({ message: 'User not found for that email' });
    const result = await sendRecommendationEmailToUser(String(user._id));
    res.json({ result, user: { id: String(user._id), email: user.email } });
  } catch (e) {
    res
      .status(500)
      .json({ message: e instanceof Error ? e.message : 'Failed to send test email' });
  }
}

export async function sendAutomationPush(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const body = (req.body || {}) as {
      title?: string;
      body?: string;
      url?: string;
      target?: 'all_buyers' | 'specific_user';
      email?: string;
      category?: string;
    };
    const title = String(body.title || '').trim();
    const message = String(body.body || '').trim();
    if (!title || !message) {
      return res.status(400).json({ message: 'title and body are required' });
    }
    const target = body.target === 'specific_user' ? 'specific_user' : 'all_buyers';

    if (target === 'specific_user') {
      if (!body.email) return res.status(400).json({ message: 'email required for specific_user target' });
      const user = await User.findOne({ email: String(body.email).toLowerCase().trim() })
        .select('_id email')
        .lean();
      if (!user) return res.status(404).json({ message: 'User not found' });
      const result = await sendPushToUser(String(user._id), {
        title,
        body: message,
        url: body.url || '',
        category: body.category || 'admin',
      });
      return res.json({ target: 'specific_user', user: user.email, result });
    }

    const result = await broadcastPushToBuyers({
      title,
      body: message,
      url: body.url || '',
      category: body.category || 'admin',
    });
    res.json({ target: 'all_buyers', result });
  } catch (e) {
    res
      .status(500)
      .json({ message: e instanceof Error ? e.message : 'Failed to send push' });
  }
}

export async function getAutomationRecentSends(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const { flow, limit = '30' } = req.query as any;
    const filter: any = {};
    if (flow && ALL_FLOWS.includes(flow as MarketingFlowKey)) filter.campaign = flow;
    const lim = Math.max(1, Math.min(200, parseInt(String(limit), 10) || 30));
    const rows = await RecommendationEmailHistory.find(filter)
      .sort({ sentAt: -1 })
      .limit(lim)
      .select('userId email campaign subject status error opens clicks sentAt')
      .lean();
    res.json({
      items: (rows as any[]).map((r) => ({
        id: String(r._id),
        userId: r.userId ? String(r.userId) : '',
        email: r.email || '',
        campaign: r.campaign || '',
        subject: r.subject || '',
        status: r.status || '',
        error: r.error || '',
        opens: Number(r.opens || 0),
        clicks: Number(r.clicks || 0),
        sentAt: r.sentAt,
      })),
    });
  } catch (e) {
    res
      .status(500)
      .json({ message: e instanceof Error ? e.message : 'Failed to load recent sends' });
  }
}
