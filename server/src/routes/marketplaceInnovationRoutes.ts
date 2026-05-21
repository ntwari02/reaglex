import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { NegotiationSession } from '../models/NegotiationSession';
import { ReverseMarketplaceRequest } from '../models/ReverseMarketplaceRequest';
import { GroupBuyCampaign } from '../models/GroupBuyCampaign';
import { LiveCommerceSession } from '../models/LiveCommerceSession';
import { Order } from '../models/Order';
import { Dispute } from '../models/Dispute';
import { ProductReview } from '../models/ProductReview';
import { User } from '../models/User';
import { Product } from '../models/Product';
import { buildAICounterOffer } from '../services/negotiationService';
import { buildMarketplacePassport } from '../services/marketplacePassport';
import { estimateLiveSessionScore } from '../services/liveCommerceService';

const router = Router();

router.post('/negotiation', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Authentication required' });
    const buyerId = new mongoose.Types.ObjectId(req.user.id);
    const { productId, quantity, targetPrice } = req.body as { productId?: string; quantity?: number; targetPrice?: number };
    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: 'Valid productId is required' });
    }
    const product = await Product.findById(productId).select('sellerId price').lean();
    if (!product) return res.status(404).json({ message: 'Product not found' });
    const q = Math.max(1, Number(quantity) || 1);
    const tp = Math.max(0, Number(targetPrice) || 0);
    const offer = buildAICounterOffer({
      targetPrice: tp,
      quantity: q,
      listUnitPrice: Number((product as any).price || 0),
    });

    const session = await NegotiationSession.create({
      buyerId,
      sellerId: (product as any).sellerId,
      productId: new mongoose.Types.ObjectId(productId),
      quantity: q,
      targetPrice: tp,
      currency: 'USD',
      aiCounterOffer: offer.counterTotal,
      status: 'open',
      transcript: [
        { actor: 'buyer', message: `Can I buy ${q} pieces for ${tp}?`, at: new Date() },
        { actor: 'ai', message: offer.message, at: new Date() },
      ],
    });

    return res.status(201).json({ success: true, negotiation: session, ai: offer });
  } catch (err: any) {
    return res.status(500).json({ message: 'Negotiation failed', error: err.message });
  }
});

router.post('/reverse-rfq', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Authentication required' });
    const buyerId = new mongoose.Types.ObjectId(req.user.id);
    const { title, description, category, budgetMax, currency } = req.body as any;
    if (!title || !budgetMax) return res.status(400).json({ message: 'title and budgetMax are required' });
    const rfq = await ReverseMarketplaceRequest.create({
      buyerId,
      title: String(title),
      description: String(description || ''),
      category: String(category || ''),
      budgetMax: Math.max(0, Number(budgetMax) || 0),
      currency: String(currency || 'USD'),
      status: 'open',
      bids: [],
    });
    return res.status(201).json({ success: true, rfq });
  } catch (err: any) {
    return res.status(500).json({ message: 'Failed to create reverse RFQ', error: err.message });
  }
});

router.post('/reverse-rfq/:rfqId/bids', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'seller') return res.status(403).json({ message: 'Seller only' });
    const { rfqId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(rfqId)) return res.status(400).json({ message: 'Invalid rfqId' });
    const { amount, message, etaDays } = req.body as any;
    const sellerId = new mongoose.Types.ObjectId(req.user.id);
    const rfq = await ReverseMarketplaceRequest.findByIdAndUpdate(
      rfqId,
      {
        $push: {
          bids: {
            sellerId,
            amount: Math.max(0, Number(amount) || 0),
            message: String(message || ''),
            etaDays: Number(etaDays || 0),
            createdAt: new Date(),
          },
        },
      },
      { new: true }
    ).lean();
    if (!rfq) return res.status(404).json({ message: 'RFQ not found' });
    return res.json({ success: true, rfq });
  } catch (err: any) {
    return res.status(500).json({ message: 'Failed to place bid', error: err.message });
  }
});

router.get('/trust-passport/:userId', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) return res.status(400).json({ message: 'Invalid userId' });
    const uid = new mongoose.Types.ObjectId(userId);
    const [orders, disputes, reviews, user] = await Promise.all([
      Order.countDocuments({ buyerId: uid } as any),
      Dispute.countDocuments({ buyerId: uid } as any),
      ProductReview.countDocuments({ userId: uid, status: 'approved' }),
      User.findById(uid).select('emailVerified sellerVerificationStatus').lean(),
    ]);
    const delivered = await Order.countDocuments({
      buyerId: uid,
      status: { $in: ['delivered', 'completed'] },
    } as any);
    const deliveryRate = orders > 0 ? Math.round((delivered / orders) * 100) : 0;
    const disputeRate = orders > 0 ? Math.round((disputes / orders) * 100) : 0;
    const out = buildMarketplacePassport({
      deliveryRate,
      disputeRate,
      reviews,
      kycVerified: Boolean((user as any)?.emailVerified || (user as any)?.sellerVerificationStatus === 'approved'),
    });
    return res.json({ userId, ...out });
  } catch (err: any) {
    return res.status(500).json({ message: 'Failed to build passport', error: err.message });
  }
});

router.post('/group-buy', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Authentication required' });
    const ownerBuyerId = new mongoose.Types.ObjectId(req.user.id);
    const { productId, targetParticipants = 10, discountPercent = 40, expiresAt } = req.body as any;
    if (!mongoose.Types.ObjectId.isValid(String(productId || ''))) {
      return res.status(400).json({ message: 'Valid productId required' });
    }
    const product = await Product.findById(productId).select('sellerId').lean();
    if (!product) return res.status(404).json({ message: 'Product not found' });
    const campaign = await GroupBuyCampaign.create({
      productId: new mongoose.Types.ObjectId(productId),
      sellerId: (product as any).sellerId,
      ownerBuyerId,
      targetParticipants: Math.max(2, Number(targetParticipants) || 10),
      discountPercent: Math.max(1, Math.min(95, Number(discountPercent) || 40)),
      status: 'active',
      participants: [ownerBuyerId],
      expiresAt: expiresAt ? new Date(expiresAt) : new Date(Date.now() + 48 * 60 * 60 * 1000),
    });
    return res.status(201).json({ success: true, campaign });
  } catch (err: any) {
    return res.status(500).json({ message: 'Failed to create group buy', error: err.message });
  }
});

router.post('/group-buy/:campaignId/join', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Authentication required' });
    const { campaignId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(campaignId)) return res.status(400).json({ message: 'Invalid campaignId' });
    const buyerId = new mongoose.Types.ObjectId(req.user.id);
    const campaign = await GroupBuyCampaign.findById(campaignId);
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
    if (campaign.status !== 'active') return res.status(400).json({ message: 'Campaign is not active' });
    if (!campaign.participants.some((p) => String(p) === String(buyerId))) {
      campaign.participants.push(buyerId);
    }
    if (campaign.participants.length >= campaign.targetParticipants) campaign.status = 'unlocked';
    await campaign.save();
    return res.json({ success: true, campaign });
  } catch (err: any) {
    return res.status(500).json({ message: 'Failed to join campaign', error: err.message });
  }
});

router.post('/live-commerce/session', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'seller') return res.status(403).json({ message: 'Seller only' });
    const sellerId = new mongoose.Types.ObjectId(req.user.id);
    const { title, streamUrl } = req.body as any;
    if (!title) return res.status(400).json({ message: 'title is required' });
    const session = await LiveCommerceSession.create({
      sellerId,
      title: String(title),
      streamUrl: String(streamUrl || ''),
      status: 'live',
      startedAt: new Date(),
      clips: [],
    });
    return res.status(201).json({ success: true, session });
  } catch (err: any) {
    return res.status(500).json({ message: 'Failed to start live commerce session', error: err.message });
  }
});

router.post('/live-commerce/:sessionId/clip', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'seller') return res.status(403).json({ message: 'Seller only' });
    const { sessionId } = req.params;
    const { url, productId } = req.body as any;
    if (!mongoose.Types.ObjectId.isValid(sessionId)) return res.status(400).json({ message: 'Invalid sessionId' });
    if (!url) return res.status(400).json({ message: 'url is required' });

    const session = await LiveCommerceSession.findById(sessionId);
    if (!session) return res.status(404).json({ message: 'Session not found' });
    if (String(session.sellerId) !== req.user.id) return res.status(403).json({ message: 'Access denied' });
    session.clips.push({
      url: String(url),
      productId: mongoose.Types.ObjectId.isValid(String(productId || ''))
        ? new mongoose.Types.ObjectId(productId)
        : undefined,
      createdAt: new Date(),
    } as any);
    await session.save();
    const score = estimateLiveSessionScore({ clips: session.clips.length });
    return res.json({ success: true, clips: session.clips, liveScore: score.score });
  } catch (err: any) {
    return res.status(500).json({ message: 'Failed to add clip', error: err.message });
  }
});

export default router;
