import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import mongoose from 'mongoose';
import { MarketingCampaign } from '../models/MarketingCampaign';
import { MarketingCoupon } from '../models/MarketingCoupon';
import { CustomerSegment } from '../models/CustomerSegment';
import { MarketingMessageCampaign } from '../models/MarketingMessageCampaign';
import { AbandonedCart } from '../models/AbandonedCart';
import { AbandonedCartSettings } from '../models/AbandonedCartSettings';
import { ProductPromotion } from '../models/ProductPromotion';
import { AdIntegration } from '../models/AdIntegration';
import { TrackingPixel } from '../models/TrackingPixel';
import { MarketingCreative } from '../models/MarketingCreative';
import { ReferralSettings } from '../models/ReferralSettings';
import { MarketingSettings } from '../models/MarketingSettings';
import { AIMarketingSettings } from '../models/AIMarketingSettings';

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
    const doc = await MarketingCampaign.create({
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
    const doc = await MarketingCoupon.create({
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
    const doc = await CustomerSegment.create({
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
    const doc = await MarketingMessageCampaign.create({
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
      remindersSent: c.remindersSent,
      recovered: c.recovered,
    }));
    res.json({ carts });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to fetch abandoned carts' });
  }
}

export async function getAbandonedCartSettings(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    let doc = await AbandonedCartSettings.findOne();
    if (!doc) {
      doc = await AbandonedCartSettings.create({});
    }
    res.json({
      autoReminderEnabled: doc.autoReminderEnabled,
      reminderTiming: doc.reminderTiming,
    });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to fetch settings' });
  }
}

export async function updateAbandonedCartSettings(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const body = req.body as Record<string, unknown>;
    let doc = await AbandonedCartSettings.findOne();
    if (!doc) doc = await AbandonedCartSettings.create({});
    doc.autoReminderEnabled = body.autoReminderEnabled !== false;
    if (body.reminderTiming != null) doc.reminderTiming = String(body.reminderTiming);
    await doc.save();
    res.json({
      autoReminderEnabled: doc.autoReminderEnabled,
      reminderTiming: doc.reminderTiming,
    });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to update settings' });
  }
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
    const doc = await ProductPromotion.create({
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
    const doc = await AdIntegration.create({
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
    const doc = await TrackingPixel.create({
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
    const doc = await MarketingCreative.create({
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
    if (!doc) doc = await ReferralSettings.create({});
    res.json({
      rewardType: doc.rewardType,
      rewardAmount: doc.rewardAmount,
      maxReferralsPerUser: doc.maxReferralsPerUser,
      fraudDetection: doc.fraudDetection,
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
    if (!doc) doc = await ReferralSettings.create({});
    if (body.rewardType != null) doc.rewardType = body.rewardType as 'cash' | 'points' | 'coupon';
    if (body.rewardAmount != null) doc.rewardAmount = Number(body.rewardAmount);
    if (body.maxReferralsPerUser != null) doc.maxReferralsPerUser = Number(body.maxReferralsPerUser);
    if (body.fraudDetection != null) doc.fraudDetection = Boolean(body.fraudDetection);
    await doc.save();
    res.json({
      rewardType: doc.rewardType,
      rewardAmount: doc.rewardAmount,
      maxReferralsPerUser: doc.maxReferralsPerUser,
      fraudDetection: doc.fraudDetection,
    });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to update referral settings' });
  }
}

export async function getReferralStats(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    // Placeholder stats until we have a Referral model / tracking
    res.json({
      totalReferrals: 0,
      activeReferrers: 0,
      rewardsPaid: 0,
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
    if (!doc) doc = await AIMarketingSettings.create({});
    res.json({
      aiEnabled: doc.aiEnabled,
      features: doc.features || [],
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
    if (!doc) doc = await AIMarketingSettings.create({});
    if (body.aiEnabled != null) doc.aiEnabled = Boolean(body.aiEnabled);
    if (Array.isArray(body.features)) doc.features = body.features as any[];
    await doc.save();
    res.json({
      aiEnabled: doc.aiEnabled,
      features: doc.features,
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
    if (!doc) doc = await MarketingSettings.create({});
    res.json({
      budgetLimit: doc.budgetLimit,
      spamProtection: doc.spamProtection,
      smtp: doc.smtp || { host: '', port: '' },
      sms: doc.sms || { apiKey: '', apiSecret: '' },
      push: doc.push || { fcmKey: '' },
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
    if (!doc) doc = await MarketingSettings.create({});
    if (body.budgetLimit != null) doc.budgetLimit = Number(body.budgetLimit);
    if (body.spamProtection != null) doc.spamProtection = Boolean(body.spamProtection);
    if (body.smtp != null && typeof body.smtp === 'object') {
      const s = body.smtp as Record<string, unknown>;
      if (s.host != null) doc.smtp.host = String(s.host);
      if (s.port != null) doc.smtp.port = String(s.port);
    }
    if (body.sms != null && typeof body.sms === 'object') {
      const s = body.sms as Record<string, unknown>;
      if (s.apiKey != null) doc.sms.apiKey = String(s.apiKey);
      if (s.apiSecret != null) doc.sms.apiSecret = String(s.apiSecret);
    }
    if (body.push != null && typeof body.push === 'object') {
      const p = body.push as Record<string, unknown>;
      if (p.fcmKey != null) doc.push.fcmKey = String(p.fcmKey);
    }
    await doc.save();
    res.json({
      budgetLimit: doc.budgetLimit,
      spamProtection: doc.spamProtection,
      smtp: doc.smtp,
      sms: doc.sms,
      push: doc.push,
    });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to update marketing settings' });
  }
}
