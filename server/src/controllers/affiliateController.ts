import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../middleware/auth';
import {
  Affiliate,
  AffiliateLink,
  AffiliateCommission,
  AffiliatePayout,
  IAffiliate,
  IAffiliateLink,
  IAffiliateCommission,
} from '../models/Affiliate';
import { User } from '../models/User';
import { Product } from '../models/Product';
import { Order } from '../models/Order';

// Default commission rates by category
const DEFAULT_COMMISSION_RATES: { [key: string]: number } = {
  electronics: 5,
  fashion: 10,
  cosmetics: 12,
  'local-sellers': 8,
  default: 5,
};

/**
 * Apply to become an affiliate
 */
export async function applyForAffiliate(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Check if user already has an affiliate account
    const existing = await Affiliate.findOne({ userId: req.user.id });
    if (existing) {
      return res.status(400).json({ message: 'You already have an affiliate account' });
    }

    // Create affiliate application
    const affiliate = new Affiliate({
      userId: req.user.id,
      status: 'pending',
      commissionRates: {
        default: DEFAULT_COMMISSION_RATES.default,
        categories: DEFAULT_COMMISSION_RATES,
      },
    });

    await affiliate.save();
    await affiliate.populate('userId', 'fullName email');

    return res.status(201).json({
      message: 'Affiliate application submitted successfully',
      affiliate: {
        id: affiliate._id.toString(),
        code: affiliate.affiliateCode,
        status: affiliate.status,
        userId: (affiliate.userId as any)?._id.toString(),
        user: {
          name: (affiliate.userId as any)?.fullName,
          email: (affiliate.userId as any)?.email,
        },
      },
    });
  } catch (error: any) {
    console.error('Apply for affiliate error:', error);
    return res.status(500).json({ message: 'Failed to submit affiliate application' });
  }
}

/**
 * Get affiliate account (own account)
 */
export async function getMyAffiliateAccount(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const affiliate = await Affiliate.findOne({ userId: req.user.id }).populate(
      'userId',
      'fullName email avatarUrl'
    );

    if (!affiliate) {
      return res.status(404).json({ message: 'Affiliate account not found' });
    }

    // Calculate pending earnings from commissions
    const pendingCommissions = await AffiliateCommission.aggregate([
      { $match: { affiliateId: affiliate._id, status: 'pending' } },
      { $group: { _id: null, total: { $sum: '$commissionAmount' } } },
    ]);

    const pendingAmount = pendingCommissions[0]?.total || 0;

    return res.json({
      affiliate: {
        id: affiliate._id.toString(),
        code: affiliate.affiliateCode,
        status: affiliate.status,
        commissionRates: affiliate.commissionRates,
        totalClicks: affiliate.totalClicks,
        totalConversions: affiliate.totalConversions,
        totalEarnings: affiliate.totalEarnings,
        paidEarnings: affiliate.paidEarnings,
        pendingEarnings: pendingAmount,
        payoutMethod: affiliate.payoutMethod,
        minimumPayout: affiliate.minimumPayout,
        user: {
          name: (affiliate.userId as any)?.fullName,
          email: (affiliate.userId as any)?.email,
          avatar: (affiliate.userId as any)?.avatarUrl,
        },
        createdAt: affiliate.createdAt,
        approvedAt: affiliate.approvedAt,
      },
    });
  } catch (error: any) {
    console.error('Get affiliate account error:', error);
    return res.status(500).json({ message: 'Failed to fetch affiliate account' });
  }
}

/**
 * Generate affiliate link for a product
 */
export async function generateAffiliateLink(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { productId, customCode } = req.body;

    // Get affiliate account
    const affiliate = await Affiliate.findOne({ userId: req.user.id, status: 'approved' });
    if (!affiliate) {
      return res.status(403).json({ message: 'Affiliate account not approved or not found' });
    }

    // Check if link already exists
    const existingLink = await AffiliateLink.findOne({
      affiliateId: affiliate._id,
      productId: productId || null,
      customCode: customCode || null,
    });

    if (existingLink) {
      return res.json({
        link: {
          id: existingLink._id.toString(),
          url: existingLink.url,
          clicks: existingLink.clicks,
          conversions: existingLink.conversions,
        },
      });
    }

    // Generate URL
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const params = new URLSearchParams({
      ref: affiliate.affiliateCode,
      ...(productId && { product: productId }),
      ...(customCode && { code: customCode }),
    });
    const url = `${baseUrl}/products${productId ? `/${productId}` : ''}?${params.toString()}`;

    // Create link
    const link = new AffiliateLink({
      affiliateId: affiliate._id,
      productId: productId || undefined,
      customCode: customCode || undefined,
      url,
    });

    await link.save();

    return res.status(201).json({
      link: {
        id: link._id.toString(),
        url: link.url,
        clicks: link.clicks,
        conversions: link.conversions,
      },
    });
  } catch (error: any) {
    console.error('Generate affiliate link error:', error);
    return res.status(500).json({ message: 'Failed to generate affiliate link' });
  }
}

/**
 * Track affiliate link click
 */
export async function trackClick(req: AuthenticatedRequest, res: Response) {
  try {
    const { linkId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(linkId)) {
      return res.status(400).json({ message: 'Invalid link ID' });
    }

    const link = await AffiliateLink.findById(linkId);
    if (!link) {
      return res.status(404).json({ message: 'Affiliate link not found' });
    }

    // Increment clicks
    link.clicks += 1;
    await link.save();

    // Update affiliate total clicks
    await Affiliate.updateOne({ _id: link.affiliateId }, { $inc: { totalClicks: 1 } });

    return res.json({ success: true, clicks: link.clicks });
  } catch (error: any) {
    console.error('Track click error:', error);
    return res.status(500).json({ message: 'Failed to track click' });
  }
}

/**
 * Get affiliate links
 */
export async function getAffiliateLinks(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const affiliate = await Affiliate.findOne({ userId: req.user.id });
    if (!affiliate) {
      return res.status(404).json({ message: 'Affiliate account not found' });
    }

    const { productId, page = '1', limit = '20' } = req.query as {
      productId?: string;
      page?: string;
      limit?: string;
    };

    const filter: any = { affiliateId: affiliate._id };
    if (productId) {
      filter.productId = productId;
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    const links = await AffiliateLink.find(filter)
      .populate('productId', 'name images price')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await AffiliateLink.countDocuments(filter);

    return res.json({
      links: links.map((link: any) => ({
        id: link._id.toString(),
        url: link.url,
        product: link.productId
          ? {
              id: link.productId._id.toString(),
              name: link.productId.name,
              image: link.productId.images?.[0],
              price: link.productId.price,
            }
          : null,
        clicks: link.clicks,
        conversions: link.conversions,
        createdAt: link.createdAt,
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    console.error('Get affiliate links error:', error);
    return res.status(500).json({ message: 'Failed to fetch affiliate links' });
  }
}

/**
 * Get affiliate analytics
 */
export async function getAffiliateAnalytics(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const affiliate = await Affiliate.findOne({ userId: req.user.id });
    if (!affiliate) {
      return res.status(404).json({ message: 'Affiliate account not found' });
    }

    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };

    const dateFilter: any = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    // Get commissions in date range
    const commissions = await AffiliateCommission.find({
      affiliateId: affiliate._id,
      ...dateFilter,
    }).lean();

    // Calculate stats
    const totalEarnings = commissions
      .filter((c) => c.status !== 'reversed')
      .reduce((sum, c) => sum + c.commissionAmount, 0);

    const pendingEarnings = commissions
      .filter((c) => c.status === 'pending')
      .reduce((sum, c) => sum + c.commissionAmount, 0);

    const paidEarnings = commissions
      .filter((c) => c.status === 'paid')
      .reduce((sum, c) => sum + c.commissionAmount, 0);

    const conversions = commissions.length;
    const conversionRate =
      affiliate.totalClicks > 0 ? (conversions / affiliate.totalClicks) * 100 : 0;

    // Get top products
    const topProducts = await AffiliateCommission.aggregate([
      { $match: { affiliateId: affiliate._id, ...dateFilter } },
      { $group: { _id: '$productId', count: { $sum: 1 }, earnings: { $sum: '$commissionAmount' } } },
      { $sort: { earnings: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
    ]);

    return res.json({
      analytics: {
        totalClicks: affiliate.totalClicks,
        totalConversions: conversions,
        conversionRate: conversionRate.toFixed(2),
        totalEarnings,
        pendingEarnings,
        paidEarnings,
        topProducts: topProducts.map((p) => ({
          productId: p._id?.toString(),
          productName: p.product?.name || 'Unknown',
          conversions: p.count,
          earnings: p.earnings,
        })),
      },
    });
  } catch (error: any) {
    console.error('Get affiliate analytics error:', error);
    return res.status(500).json({ message: 'Failed to fetch analytics' });
  }
}

/**
 * Request payout
 */
export async function requestPayout(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { amount, method, accountDetails } = req.body;

    const affiliate = await Affiliate.findOne({ userId: req.user.id, status: 'approved' });
    if (!affiliate) {
      return res.status(404).json({ message: 'Affiliate account not found or not approved' });
    }

    // Get pending commissions
    const pendingCommissions = await AffiliateCommission.find({
      affiliateId: affiliate._id,
      status: 'pending',
    });

    const availableAmount = pendingCommissions.reduce(
      (sum, c) => sum + c.commissionAmount,
      0
    );

    if (amount > availableAmount) {
      return res.status(400).json({ message: 'Insufficient pending earnings' });
    }

    if (amount < affiliate.minimumPayout) {
      return res.status(400).json({
        message: `Minimum payout amount is $${affiliate.minimumPayout}`,
      });
    }

    // Create payout request
    const payout = new AffiliatePayout({
      affiliateId: affiliate._id,
      amount,
      status: 'pending',
      method,
      accountDetails: accountDetails || affiliate.payoutAccountDetails,
      commissionIds: pendingCommissions
        .slice(0, Math.ceil((amount / availableAmount) * pendingCommissions.length))
        .map((c) => c._id),
    });

    await payout.save();

    return res.status(201).json({
      message: 'Payout request submitted successfully',
      payout: {
        id: payout._id.toString(),
        amount: payout.amount,
        status: payout.status,
        method: payout.method,
      },
    });
  } catch (error: any) {
    console.error('Request payout error:', error);
    return res.status(500).json({ message: 'Failed to request payout' });
  }
}

/**
 * Get payouts
 */
export async function getPayouts(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const affiliate = await Affiliate.findOne({ userId: req.user.id });
    if (!affiliate) {
      return res.status(404).json({ message: 'Affiliate account not found' });
    }

    const payouts = await AffiliatePayout.find({ affiliateId: affiliate._id })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      payouts: payouts.map((p) => ({
        id: p._id.toString(),
        amount: p.amount,
        status: p.status,
        method: p.method,
        transactionId: p.transactionId,
        createdAt: p.createdAt,
        processedAt: p.processedAt,
      })),
    });
  } catch (error: any) {
    console.error('Get payouts error:', error);
    return res.status(500).json({ message: 'Failed to fetch payouts' });
  }
}

// ============ ADMIN ROUTES ============

/**
 * Get all affiliates (admin only)
 */
export async function getAllAffiliates(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: admin access required' });
    }

    const { status, page = '1', limit = '20', search } = req.query as {
      status?: string;
      page?: string;
      limit?: string;
      search?: string;
    };

    const filter: any = {};
    if (status) {
      filter.status = status;
    }

    if (search) {
      const userFilter = {
        $or: [
          { fullName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ],
      };
      const users = await User.find(userFilter).select('_id');
      filter.userId = { $in: users.map((u) => u._id) };
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    const affiliates = await Affiliate.find(filter)
      .populate('userId', 'fullName email avatarUrl')
      .populate('approvedBy', 'fullName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await Affiliate.countDocuments(filter);

    // Get pending earnings for each
    const affiliatesWithPending = await Promise.all(
      affiliates.map(async (affiliate: any) => {
        const pending = await AffiliateCommission.aggregate([
          { $match: { affiliateId: affiliate._id, status: 'pending' } },
          { $group: { _id: null, total: { $sum: '$commissionAmount' } } },
        ]);
        return {
          ...affiliate,
          pendingEarnings: pending[0]?.total || 0,
        };
      })
    );

    return res.json({
      affiliates: affiliatesWithPending.map((affiliate: any) => ({
        id: affiliate._id.toString(),
        code: affiliate.affiliateCode,
        status: affiliate.status,
        user: {
          id: affiliate.userId?._id.toString(),
          name: affiliate.userId?.fullName,
          email: affiliate.userId?.email,
          avatar: affiliate.userId?.avatarUrl,
        },
        commissionRates: affiliate.commissionRates,
        totalClicks: affiliate.totalClicks,
        totalConversions: affiliate.totalConversions,
        totalEarnings: affiliate.totalEarnings,
        paidEarnings: affiliate.paidEarnings,
        pendingEarnings: affiliate.pendingEarnings,
        approvedBy: affiliate.approvedBy?.fullName,
        approvedAt: affiliate.approvedAt,
        createdAt: affiliate.createdAt,
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    console.error('Get all affiliates error:', error);
    return res.status(500).json({ message: 'Failed to fetch affiliates' });
  }
}

/**
 * Update affiliate status (admin only)
 */
export async function updateAffiliateStatus(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: admin access required' });
    }

    const { affiliateId } = req.params;
    const { status, notes } = req.body;

    if (!['pending', 'approved', 'rejected', 'suspended'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const affiliate = await Affiliate.findById(affiliateId);
    if (!affiliate) {
      return res.status(404).json({ message: 'Affiliate not found' });
    }

    affiliate.status = status;
    if (notes) affiliate.notes = notes;
    if (status === 'approved') {
      affiliate.approvedAt = new Date();
      affiliate.approvedBy = new mongoose.Types.ObjectId(req.user.id);
    }

    await affiliate.save();

    return res.json({
      message: 'Affiliate status updated',
      affiliate: {
        id: affiliate._id.toString(),
        status: affiliate.status,
        approvedAt: affiliate.approvedAt,
      },
    });
  } catch (error: any) {
    console.error('Update affiliate status error:', error);
    return res.status(500).json({ message: 'Failed to update affiliate status' });
  }
}

/**
 * Process payout (admin only)
 */
export async function processPayout(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: admin access required' });
    }

    const { payoutId } = req.params;
    const { status, transactionId, failureReason } = req.body;

    const payout = await AffiliatePayout.findById(payoutId);
    if (!payout) {
      return res.status(404).json({ message: 'Payout not found' });
    }

    payout.status = status;
    if (transactionId) payout.transactionId = transactionId;
    if (failureReason) payout.failureReason = failureReason;
    if (status === 'completed') {
      payout.processedAt = new Date();

      // Update commission statuses
      await AffiliateCommission.updateMany(
        { _id: { $in: payout.commissionIds } },
        { status: 'paid', paidAt: new Date() }
      );

      // Update affiliate earnings
      await Affiliate.updateOne(
        { _id: payout.affiliateId },
        {
          $inc: { 
            paidEarnings: payout.amount,
            pendingEarnings: -payout.amount,
          },
        }
      );
    }

    await payout.save();

    return res.json({
      message: 'Payout processed',
      payout: {
        id: payout._id.toString(),
        status: payout.status,
        transactionId: payout.transactionId,
      },
    });
  } catch (error: any) {
    console.error('Process payout error:', error);
    return res.status(500).json({ message: 'Failed to process payout' });
  }
}

/**
 * Record conversion (called when order is placed with affiliate link)
 */
export async function recordConversion(req: AuthenticatedRequest, res: Response) {
  try {
    const { orderId, affiliateCode, productId } = req.body;

    if (!orderId || !affiliateCode) {
      return res.status(400).json({ message: 'Order ID and affiliate code are required' });
    }

    // Find affiliate
    const affiliate = await Affiliate.findOne({ affiliateCode: affiliateCode.toUpperCase() });
    if (!affiliate || affiliate.status !== 'approved') {
      return res.status(404).json({ message: 'Affiliate not found or not approved' });
    }

    // Get order
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if commission already exists for this order
    const existing = await AffiliateCommission.findOne({ orderId: order._id });
    if (existing) {
      return res.status(400).json({ message: 'Commission already recorded for this order' });
    }

    // Find the affiliate link used (if productId provided)
    let link = null;
    if (productId) {
      link = await AffiliateLink.findOne({
        affiliateId: affiliate._id,
        productId,
      });
    }

    // If no specific link found, create a general one
    if (!link) {
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const url = `${baseUrl}/products?ref=${affiliate.affiliateCode}`;
      link = await AffiliateLink.findOneAndUpdate(
        { affiliateId: affiliate._id, productId: null },
        { url, $setOnInsert: { affiliateId: affiliate._id, clicks: 0, conversions: 0 } },
        { upsert: true, new: true }
      );
    }

    // Calculate commission
    const orderAmount = order.total || 0;
    let commissionRate = affiliate.commissionRates.default;

    // Get category-specific rate if product provided
    if (productId) {
      const product = await Product.findById(productId);
      if (product?.category) {
        // Handle both Map and plain object cases
        const categories = affiliate.commissionRates.categories;
        const categoryRate =
          (categories instanceof Map ? categories.get(product.category) : categories?.[product.category]) ||
          DEFAULT_COMMISSION_RATES[product.category] ||
          commissionRate;
        commissionRate = categoryRate;
      }
    }

    const commissionAmount = (orderAmount * commissionRate) / 100;

    // Create commission
    const commission = new AffiliateCommission({
      affiliateId: affiliate._id,
      orderId: order._id,
      productId: productId || undefined,
      linkId: link._id,
      orderAmount,
      commissionRate,
      commissionAmount,
      status: 'pending',
      category: productId ? (await Product.findById(productId))?.category : undefined,
    });

    await commission.save();

    // Update link conversions
    link.conversions += 1;
    await link.save();

    // Update affiliate stats
    await Affiliate.updateOne(
      { _id: affiliate._id },
      {
        $inc: {
          totalConversions: 1,
          totalEarnings: commissionAmount,
          pendingEarnings: commissionAmount,
        },
      }
    );

    return res.status(201).json({
      message: 'Conversion recorded',
      commission: {
        id: commission._id.toString(),
        amount: commission.commissionAmount,
        rate: commission.commissionRate,
      },
    });
  } catch (error: any) {
    console.error('Record conversion error:', error);
    return res.status(500).json({ message: 'Failed to record conversion' });
  }
}

