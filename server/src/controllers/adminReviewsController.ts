import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import mongoose from 'mongoose';
import { ProductReview } from '../models/ProductReview';
import { SuspiciousReview } from '../models/SuspiciousReview';
import { SellerRating } from '../models/SellerRating';
import { SellerReviewResponse } from '../models/SellerReviewResponse';
import { ReviewMedia } from '../models/ReviewMedia';
import { ReviewModuleSettings } from '../models/ReviewModuleSettings';
import { ReviewRequestSettings } from '../models/ReviewRequestSettings';
import { AIReviewSettings } from '../models/AIReviewSettings';
import { ReviewIntegrationSettings } from '../models/ReviewIntegrationSettings';
import { ReviewModerationSettings } from '../models/ReviewModerationSettings';

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
    const [totalReviews, pendingReviews, rejectedReviews, flaggedReviews, avgProduct, avgSeller, activityAgg, mostReviewed] = await Promise.all([
      ProductReview.countDocuments(),
      ProductReview.countDocuments({ status: 'pending' }),
      ProductReview.countDocuments({ status: 'rejected' }),
      ProductReview.countDocuments({ status: 'flagged' }),
      ProductReview.aggregate([{ $group: { _id: null, avg: { $avg: '$rating' } } }]),
      SellerRating.aggregate([{ $group: { _id: null, avg: { $avg: '$overallRating' } } }]),
      ProductReview.aggregate([
        { $match: { createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } },
        { $group: { _id: { $dayOfWeek: '$createdAt' }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      ProductReview.aggregate([
        { $group: { _id: '$productName', reviews: { $sum: 1 }, rating: { $avg: '$rating' } } },
        { $sort: { reviews: -1 } },
        { $limit: 10 },
      ]),
    ]);

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const activityMap: Record<number, number> = {};
    activityAgg.forEach((a: any) => { activityMap[a._id] = a.count; });
    const reviewActivity = [1, 2, 3, 4, 5, 6, 7].map((d) => ({
      label: days[d % 7],
      value: activityMap[d] ?? 0,
    }));

    const mostReviewedProducts = (mostReviewed as any[]).map((m) => ({
      name: m._id,
      reviews: m.reviews,
      rating: Math.round(m.rating * 10) / 10,
    }));

    res.json({
      stats: {
        totalReviews,
        pendingReviews,
        rejectedReviews,
        flaggedReviews,
        avgProductRating: Math.round((avgProduct[0]?.avg ?? 0) * 10) / 10,
        avgSellerRating: Math.round((avgSeller[0]?.avg ?? 0) * 10) / 10,
      },
      reviewActivity: reviewActivity.length ? reviewActivity : [{ label: 'No data', value: 0 }],
      mostReviewed: mostReviewedProducts.length ? mostReviewedProducts : [],
    });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to fetch dashboard' });
  }
}

// ---------- Product reviews ----------
export async function getReviews(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const query: Record<string, unknown> = {};
    const status = req.query.status as string;
    const rating = req.query.rating as string;
    if (status && status !== 'all') query.status = status;
    if (rating && rating !== 'all') query.rating = Number(rating);
    const list = await ProductReview.find(query).sort({ createdAt: -1 }).limit(200).lean();
    const reviews = (list as any[]).map((r) => ({
      id: toId(r),
      customerName: r.customerName,
      customerEmail: r.customerEmail,
      productName: r.productName,
      productId: r.productId,
      orderId: r.orderId,
      rating: r.rating,
      message: r.message,
      images: r.images || [],
      status: r.status,
      sellerResponse: r.sellerResponse,
      createdAt: r.createdAt,
    }));
    res.json({ reviews });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to fetch reviews' });
  }
}

export async function updateReviewStatus(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const { reviewId } = req.params;
    const body = req.body as { status?: string };
    const doc = await ProductReview.findByIdAndUpdate(
      reviewId,
      { status: body.status || 'pending' },
      { new: true }
    );
    if (!doc) return res.status(404).json({ message: 'Review not found' });
    res.json({ review: { id: toId(doc), status: doc.status } });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to update review' });
  }
}

// ---------- Moderation ----------
export async function getModerationQueue(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const list = await ProductReview.find({ status: 'pending' }).sort({ createdAt: -1 }).limit(100).lean();
    const reviews = (list as any[]).map((r) => ({
      id: toId(r),
      customerName: r.customerName,
      productName: r.productName,
      rating: r.rating,
      message: r.message,
      status: r.status,
      flagged: r.flagged,
      aiScore: r.aiScore,
    }));
    res.json({ reviews });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to fetch queue' });
  }
}

export async function getModerationSettings(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    let doc = await ReviewModerationSettings.findOne();
    if (!doc) doc = await ReviewModerationSettings.create({});
    res.json({ autoModeration: doc.autoModeration });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to fetch settings' });
  }
}

export async function updateModerationSettings(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const body = req.body as { autoModeration?: boolean };
    let doc = await ReviewModerationSettings.findOne();
    if (!doc) doc = await ReviewModerationSettings.create({});
    if (body.autoModeration != null) doc.autoModeration = body.autoModeration;
    await doc.save();
    res.json({ autoModeration: doc.autoModeration });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to update settings' });
  }
}

// ---------- Suspicious ----------
export async function getSuspicious(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const list = await SuspiciousReview.find({}).sort({ createdAt: -1 }).limit(100).lean();
    const suspicious = (list as any[]).map((s) => ({
      id: toId(s),
      reviewId: s.reviewId,
      customerName: s.customerName,
      productName: s.productName,
      trigger: s.trigger,
      riskLevel: s.riskLevel,
      evidence: s.evidence || [],
      createdAt: s.createdAt,
    }));
    res.json({ suspicious });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to fetch suspicious' });
  }
}

export async function removeSuspicious(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const { id } = req.params;
    const doc = await SuspiciousReview.findByIdAndDelete(id);
    if (!doc) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Removed' });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to remove' });
  }
}

// ---------- Seller ratings ----------
export async function getSellerRatings(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const list = await SellerRating.find({}).sort({ overallRating: -1 }).lean();
    const sellers = (list as any[]).map((s) => ({
      id: toId(s),
      sellerName: s.sellerName,
      storeName: s.storeName,
      overallRating: s.overallRating,
      communication: s.communication,
      shippingSpeed: s.shippingSpeed,
      productQuality: s.productQuality,
      totalReviews: s.totalReviews,
      status: s.status,
    }));
    res.json({ sellers });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to fetch seller ratings' });
  }
}

// ---------- Seller responses ----------
export async function getSellerResponses(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const status = req.query.status as string;
    const query = status && status !== 'all' ? { status } : {};
    const list = await SellerReviewResponse.find(query).sort({ createdAt: -1 }).limit(100).lean();
    const responses = (list as any[]).map((r) => ({
      id: toId(r),
      sellerName: r.sellerName,
      reviewId: r.reviewId,
      customerName: r.customerName,
      response: r.response,
      status: r.status,
      createdAt: r.createdAt,
      flagged: r.flagged,
    }));
    res.json({ responses });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to fetch responses' });
  }
}

export async function updateSellerResponseStatus(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const { responseId } = req.params;
    const body = req.body as { status?: string };
    const doc = await SellerReviewResponse.findByIdAndUpdate(
      responseId,
      { status: body.status || 'pending' },
      { new: true }
    );
    if (!doc) return res.status(404).json({ message: 'Response not found' });
    res.json({ response: { id: toId(doc), status: doc.status } });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to update response' });
  }
}

// ---------- Media ----------
export async function getMedia(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const list = await ReviewMedia.find({}).sort({ uploadedAt: -1 }).limit(100).lean();
    const media = (list as any[]).map((m) => ({
      id: toId(m),
      reviewId: m.reviewId,
      customerName: m.customerName,
      productName: m.productName,
      imageUrl: m.imageUrl,
      flagged: m.flagged,
      inappropriate: m.inappropriate,
      uploadedAt: m.uploadedAt,
    }));
    res.json({ media });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to fetch media' });
  }
}

// ---------- Analytics ----------
export async function getAnalytics(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const [ratingAgg, productRatings, sellerPerf, totalReviews, orderCount] = await Promise.all([
      ProductReview.aggregate([
        { $group: { _id: null, max: { $max: '$rating' }, min: { $min: '$rating' }, count: { $sum: 1 } } },
      ]),
      ProductReview.aggregate([
        { $group: { _id: '$productName', avg: { $avg: '$rating' } } },
        { $sort: { avg: -1 } },
        { $limit: 10 },
      ]),
      SellerRating.find({}).sort({ overallRating: -1 }).limit(10).lean(),
      ProductReview.countDocuments(),
      0, // would come from Order count for ratio
    ]);
    const r = ratingAgg[0];
    const highestRated = r?.max ?? 0;
    const lowestRated = r?.min ?? 5;
    const mostReviewedCount = await ProductReview.aggregate([
      { $group: { _id: '$productName', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 },
    ]).then((a) => a[0]?.count ?? 0);
    const reviewRatio = totalReviews > 0 ? Math.round((totalReviews / Math.max(orderCount || totalReviews * 8, 1)) * 1000) / 10 : 0;

    res.json({
      highestRated,
      lowestRated,
      mostReviewedCount,
      reviewRatio,
      productRatings: (productRatings as any[]).map((p) => ({ label: p._id, value: Math.round(p.avg * 10) / 10 })),
      sellerPerformance: (sellerPerf as any[]).map((s) => ({ label: s.storeName, value: s.overallRating })),
    });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to fetch analytics' });
  }
}

// ---------- Review request settings ----------
export async function getReviewRequestSettings(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    let doc = await ReviewRequestSettings.findOne();
    if (!doc) doc = await ReviewRequestSettings.create({});
    res.json({
      autoRequestEnabled: doc.autoRequestEnabled,
      delayDays: doc.delayDays,
      requestsSent: doc.requestsSent,
      reviewsReceived: doc.reviewsReceived,
    });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to fetch settings' });
  }
}

export async function updateReviewRequestSettings(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const body = req.body as { autoRequestEnabled?: boolean; delayDays?: number };
    let doc = await ReviewRequestSettings.findOne();
    if (!doc) doc = await ReviewRequestSettings.create({});
    if (body.autoRequestEnabled != null) doc.autoRequestEnabled = body.autoRequestEnabled;
    if (body.delayDays != null) doc.delayDays = body.delayDays;
    await doc.save();
    res.json({
      autoRequestEnabled: doc.autoRequestEnabled,
      delayDays: doc.delayDays,
      requestsSent: doc.requestsSent,
      reviewsReceived: doc.reviewsReceived,
    });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to update settings' });
  }
}

// ---------- AI settings ----------
export async function getAISettings(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    let doc = await AIReviewSettings.findOne();
    if (!doc) doc = await AIReviewSettings.create({});
    res.json({ aiEnabled: doc.aiEnabled, features: doc.features || [] });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to fetch AI settings' });
  }
}

export async function updateAISettings(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const body = req.body as { aiEnabled?: boolean; features?: any[] };
    let doc = await AIReviewSettings.findOne();
    if (!doc) doc = await AIReviewSettings.create({});
    if (body.aiEnabled != null) doc.aiEnabled = body.aiEnabled;
    if (Array.isArray(body.features)) doc.features = body.features;
    await doc.save();
    res.json({ aiEnabled: doc.aiEnabled, features: doc.features });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to update AI settings' });
  }
}

// ---------- Integration settings ----------
export async function getIntegrationSettings(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    let doc = await ReviewIntegrationSettings.findOne();
    if (!doc) doc = await ReviewIntegrationSettings.create({});
    res.json({
      verifiedPurchaseOnly: doc.verifiedPurchaseOnly,
      helpfulScoring: doc.helpfulScoring,
      thirdPartyIntegrations: doc.thirdPartyIntegrations || [],
    });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to fetch integration settings' });
  }
}

export async function updateIntegrationSettings(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const body = req.body as { verifiedPurchaseOnly?: boolean; helpfulScoring?: boolean; thirdPartyIntegrations?: any[] };
    let doc = await ReviewIntegrationSettings.findOne();
    if (!doc) doc = await ReviewIntegrationSettings.create({});
    if (body.verifiedPurchaseOnly != null) doc.verifiedPurchaseOnly = body.verifiedPurchaseOnly;
    if (body.helpfulScoring != null) doc.helpfulScoring = body.helpfulScoring;
    if (Array.isArray(body.thirdPartyIntegrations)) doc.thirdPartyIntegrations = body.thirdPartyIntegrations;
    await doc.save();
    res.json({
      verifiedPurchaseOnly: doc.verifiedPurchaseOnly,
      helpfulScoring: doc.helpfulScoring,
      thirdPartyIntegrations: doc.thirdPartyIntegrations,
    });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to update integration settings' });
  }
}

// ---------- Module settings ----------
export async function getModuleSettings(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    let doc = await ReviewModuleSettings.findOne();
    if (!doc) doc = await ReviewModuleSettings.create({});
    res.json({
      requireApproval: doc.requireApproval,
      allowAnonymous: doc.allowAnonymous,
      allowImages: doc.allowImages,
      editingWindow: doc.editingWindow,
      profanityFilter: doc.profanityFilter,
      verifiedPurchaseOnly: doc.verifiedPurchaseOnly,
      helpfulScoring: doc.helpfulScoring,
      requireSellerReplyApproval: doc.requireSellerReplyApproval,
    });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to fetch module settings' });
  }
}

export async function updateModuleSettings(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const body = req.body as Record<string, unknown>;
    let doc = await ReviewModuleSettings.findOne();
    if (!doc) doc = await ReviewModuleSettings.create({});
    if (body.requireApproval != null) doc.requireApproval = Boolean(body.requireApproval);
    if (body.allowAnonymous != null) doc.allowAnonymous = Boolean(body.allowAnonymous);
    if (body.allowImages != null) doc.allowImages = Boolean(body.allowImages);
    if (body.editingWindow != null) doc.editingWindow = Number(body.editingWindow);
    if (body.profanityFilter != null) doc.profanityFilter = String(body.profanityFilter);
    if (body.verifiedPurchaseOnly != null) doc.verifiedPurchaseOnly = Boolean(body.verifiedPurchaseOnly);
    if (body.helpfulScoring != null) doc.helpfulScoring = Boolean(body.helpfulScoring);
    if (body.requireSellerReplyApproval != null) doc.requireSellerReplyApproval = Boolean(body.requireSellerReplyApproval);
    await doc.save();
    res.json({
      requireApproval: doc.requireApproval,
      allowAnonymous: doc.allowAnonymous,
      allowImages: doc.allowImages,
      editingWindow: doc.editingWindow,
      profanityFilter: doc.profanityFilter,
      verifiedPurchaseOnly: doc.verifiedPurchaseOnly,
      helpfulScoring: doc.helpfulScoring,
      requireSellerReplyApproval: doc.requireSellerReplyApproval,
    });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to update module settings' });
  }
}
