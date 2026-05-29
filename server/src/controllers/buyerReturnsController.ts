import crypto from 'crypto';
import mongoose from 'mongoose';
import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { Order } from '../models/Order';
import { Product } from '../models/Product';
import { Dispute } from '../models/Dispute';
import { ReturnCase } from '../models/ReturnCase';
import { evaluateReturnPolicy } from '../services/returnsPolicy.service';
import { deliverBuyerNotification } from '../services/buyerNotificationService';
import { deliverSellerNotification } from '../services/sellerNotificationService';
import { User } from '../models/User';
import { ProductReview } from '../models/ProductReview';

const REASONS: Record<string, string> = {
  wrong_item: 'Wrong item received',
  damaged: 'Damaged product',
  counterfeit: 'Counterfeit',
  missing_parts: 'Missing parts',
  not_as_described: 'Not as described',
  changed_mind: 'Changed mind',
  shipping_damage: 'Shipping damage',
};

function buyerIdFrom(req: AuthenticatedRequest): mongoose.Types.ObjectId | null {
  if (!req.user?.id) return null;
  try {
    return new mongoose.Types.ObjectId(req.user.id);
  } catch {
    return null;
  }
}

function deliveredDateOf(order: any): Date | null {
  const timeline = Array.isArray(order?.timeline) ? order.timeline : [];
  const delivered = timeline.find((x: any) => String(x?.status || '').toLowerCase() === 'delivered');
  if (delivered?.date) return new Date(delivered.date);
  if (order?.date) return new Date(order.date);
  return null;
}

function daysSince(date: Date | null): number {
  if (!date) return 999;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)));
}

async function buildOrderPreview(order: any, buyerId: mongoose.Types.ObjectId) {
  const policy = await evaluateReturnPolicy(String(order._id));
  const deliveredAt = deliveredDateOf(order);
  const dayCount = daysSince(deliveredAt);

  const disputes = await Dispute.find({ orderId: order._id, buyerId }).lean();
  const alreadyRefunded = Number(order?.escrow?.refundedAmount || 0) > 0;
  const products = await Product.find({
    _id: { $in: (order.items || []).map((it: any) => it.productId).filter(Boolean) },
  })
    .select('name sellerId images image finalSale barcode verificationSummary')
    .lean();
  const byProduct = new Map(products.map((p: any) => [String(p._id), p]));

  const items = (order.items || []).map((item: any, idx: number) => {
    const product = byProduct.get(String(item.productId));
    const finalSale = !!product?.finalSale;
    const outOfWindow = dayCount > 30;
    const eligible = !alreadyRefunded && !finalSale && !policy.blockReasons.length && !outOfWindow;
    return {
      orderItemId: `${String(order._id)}:${idx}`,
      productId: String(item.productId || ''),
      image: String(product?.image || product?.images?.[0] || ''),
      name: String(item.name || product?.name || 'Item'),
      quantity: Number(item.quantity || 1),
      sellerId: String(product?.sellerId || order.sellerId || ''),
      deliveredAt,
      eligibility: {
        eligible,
        withinWindow: !outOfWindow,
        alreadyRefunded,
        damagedFlagged: false,
        finalSale,
        reason: eligible
          ? 'Eligible'
          : finalSale
            ? 'Final sale item'
            : alreadyRefunded
              ? 'Already refunded'
              : outOfWindow
                ? 'Outside return window'
                : policy.blockReasons[0] || 'Not eligible',
      },
      authenticity: {
        barcode: String(product?.barcode || ''),
        verificationStatus: String(product?.verificationSummary?.status || 'unknown'),
      },
    };
  });

  const analytics = {
    returnFrequency: await ReturnCase.countDocuments({ buyerId, createdAt: { $gte: new Date(Date.now() - 180 * 86400000) } }),
    fraudProbability: Math.min(0.95, disputes.length > 4 ? 0.8 : disputes.length * 0.12),
    sellerDefectRate: disputes.length ? Number((disputes.filter((d) => d.reason?.toLowerCase().includes('damaged')).length / disputes.length).toFixed(2)) : 0,
    resolutionHoursAvg: 72,
  };

  return {
    order: {
      orderId: String(order._id),
      orderNumber: order.orderNumber,
      orderDate: order.date,
      paymentStatus: order?.payment?.paidAt ? 'paid' : 'pending',
      deliveryStatus: order.status,
      escrowStatus: order?.escrow?.status || 'PENDING',
      sellerId: String(order.sellerId || ''),
      deliveryDate: deliveredAt,
    },
    policy,
    items,
    analytics,
    reasons: Object.entries(REASONS).map(([code, label]) => ({ code, label })),
    returnTypes: [
      { code: 'refund_only', label: 'Refund Only' },
      { code: 'return_and_refund', label: 'Return & Refund' },
      { code: 'replacement', label: 'Replacement' },
      { code: 'exchange', label: 'Exchange' },
    ],
    timelineTemplate: [
      'requested',
      'seller_reviewing',
      'approved',
      'item_returned',
      'refund_processed',
    ],
  };
}

export async function getReturnOrderPreview(req: AuthenticatedRequest, res: Response) {
  try {
    const buyerId = buyerIdFrom(req);
    if (!buyerId) return res.status(401).json({ message: 'Authentication required' });
    const { orderId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(orderId)) return res.status(400).json({ message: 'Invalid order ID' });

    const order = await Order.findOne({ _id: new mongoose.Types.ObjectId(orderId), buyerId: buyerId as any }).lean();
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const preview = await buildOrderPreview(order, buyerId);
    return res.json(preview);
  } catch (error: any) {
    return res.status(500).json({ message: error?.message || 'Failed to load return preview' });
  }
}

export async function aiAssistReturnDescription(req: AuthenticatedRequest, res: Response) {
  const description = String(req.body?.description || '').trim();
  if (!description) return res.status(400).json({ message: 'Description is required' });
  const normalized = description.replace(/\s+/g, ' ').trim();
  const sentences = normalized
    .split(/[.!?]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const summary = sentences.slice(0, 2).join('. ') + (sentences.length ? '.' : '');
  const rewritten = `Issue Summary:\n${summary}\n\nDetailed buyer report:\n${normalized}`;
  return res.json({ summary, rewritten });
}

export async function createReturnCase(req: AuthenticatedRequest, res: Response) {
  try {
    const buyerId = buyerIdFrom(req);
    if (!buyerId) return res.status(401).json({ message: 'Authentication required' });

    const {
      orderId,
      selectedOrderItemIds = [],
      reasonCode,
      description,
      returnType,
      aiSummary,
      aiRewrittenDescription,
      refundMethod = 'original_payment',
      shipping = {},
    } = req.body || {};

    if (!orderId || !reasonCode || !description || !returnType) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    if (!Object.prototype.hasOwnProperty.call(REASONS, reasonCode)) {
      return res.status(400).json({ message: 'Invalid reason code' });
    }
    const validReturnTypes = ['refund_only', 'return_and_refund', 'replacement', 'exchange'];
    if (!validReturnTypes.includes(returnType)) return res.status(400).json({ message: 'Invalid return type' });

    const order = await Order.findOne({ _id: new mongoose.Types.ObjectId(orderId), buyerId: buyerId as any });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const preview = await buildOrderPreview(order.toObject(), buyerId);
    const requestedItems = new Set((selectedOrderItemIds as string[]).filter(Boolean));
    const eligibleItems = preview.items.filter((it: any) => it.eligibility?.eligible);
    const selectedEligible = eligibleItems.filter((it: any) => requestedItems.has(it.orderItemId));
    if (!selectedEligible.length) {
      return res.status(400).json({ message: 'Select at least one eligible product' });
    }

    const bySeller = new Map<string, any[]>();
    for (const item of selectedEligible) {
      const key = item.sellerId || String(order.sellerId);
      if (!bySeller.has(key)) bySeller.set(key, []);
      bySeller.get(key)!.push(item);
    }

    const createdCases = [];
    for (const [sellerId, items] of bySeller.entries()) {
      const groupKey = `${String(order._id)}:${sellerId}`;
      const baseAmount = items.reduce((sum, it) => sum + Number(it.quantity || 1) * Number(order.items?.[0]?.price || 0), 0);
      const buyerCaseCount = await ReturnCase.countDocuments({ buyerId });
      const suspiciousPatterns: string[] = [];
      if (buyerCaseCount >= 4) suspiciousPatterns.push('High return frequency');
      if (reasonCode === 'counterfeit') suspiciousPatterns.push('High-severity claim');

      const abuseScore = Math.min(100, buyerCaseCount * 12 + (reasonCode === 'counterfeit' ? 18 : 0));
      const authenticityScore = reasonCode === 'counterfeit' ? 45 : 70;

      const dispute = await Dispute.create({
        orderId: order._id,
        sellerId,
        buyerId,
        type: returnType === 'refund_only' ? 'refund' : 'return',
        reason: REASONS[reasonCode],
        description: String(description).trim(),
        status: 'new',
        priority: abuseScore > 70 ? 'high' : 'medium',
      });

      const doc = await ReturnCase.create({
        orderId: order._id,
        buyerId,
        sellerId,
        splitGroupKey: groupKey,
        orderItemIds: items.map((x) => x.orderItemId),
        reasonCode,
        reasonLabel: REASONS[reasonCode],
        description: String(description).trim(),
        aiSummary: String(aiSummary || '').trim() || undefined,
        aiRewrittenDescription: String(aiRewrittenDescription || '').trim() || undefined,
        returnType,
        fraudSignals: {
          abuseScore,
          suspiciousPatterns,
          consistencyWarnings: [],
          autoApprovalRecommended: abuseScore < 35,
        },
        authenticityCheck: {
          score: authenticityScore,
          notes: authenticityScore < 60 ? ['Low match confidence with seller media.'] : ['Evidence appears consistent.'],
          matchedProductMedia: authenticityScore >= 60,
        },
        resolutionMetrics: {
          sellerDefectRate: preview.analytics.sellerDefectRate,
          buyerReturnFrequency: preview.analytics.returnFrequency,
          estimatedResolutionHours: abuseScore > 70 ? 96 : 72,
        },
        escrowSnapshot: {
          escrowStatus: String(order.escrow?.status || 'PENDING'),
          frozenAt: new Date(),
          freezeReason: 'Return case opened by buyer',
        },
        refund: {
          amount: Number(baseAmount || 0),
          currency: String(order.payment?.currency || 'USD'),
          method: ['momo', 'flutterwave_card', 'wallet', 'original_payment'].includes(refundMethod)
            ? refundMethod
            : 'original_payment',
          etaLabel: '3-7 business days',
        },
        shipping: {
          returnAddress: `${order.shippingAddress?.name || 'Seller'}, ${order.shippingAddress?.city || ''}, ${order.shippingAddress?.country || ''}`,
          qrLabelUrl: '',
          courierOptions: ['DHL', 'FedEx', 'Local Courier'],
          selectedCourier: String(shipping?.selectedCourier || ''),
          trackingNumber: String(shipping?.trackingNumber || ''),
          trackingUrl: String(shipping?.trackingUrl || ''),
        },
        disputeId: dispute._id,
        timeline: [{ stage: 'requested', label: 'Requested', at: new Date() }],
        chat: [
          {
            actorRole: 'system',
            text: 'Return case created and escrow hold activated.',
            createdAt: new Date(),
          },
        ],
      });
      void deliverSellerNotification(
        'return_opened',
        {
          sellerId: String(sellerId),
          orderId: String(order._id),
          orderNumber: String(order.orderNumber || ''),
          caseNumber: String(doc.caseNumber || ''),
        },
        String(buyerId)
      );
      createdCases.push(doc);
    }

    const escrow = order.escrow || ({ status: 'PENDING' } as any);
    escrow.status = 'DISPUTED';
    escrow.disputeRaisedAt = new Date();
    escrow.disputeReason = REASONS[reasonCode];
    order.escrow = escrow;
    await order.save();
    void deliverBuyerNotification(
      'return_submitted',
      {
        buyerId: String(buyerId),
        orderId: String(order._id),
        orderNumber: String(order.orderNumber || ''),
        caseNumber: createdCases[0]?.caseNumber ? String(createdCases[0].caseNumber) : undefined,
      },
      String(buyerId)
    );

    return res.status(201).json({
      message: 'Return case(s) created successfully',
      cases: createdCases,
      splitBySeller: createdCases.length > 1,
    });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message || 'Failed to create return case' });
  }
}

export async function listReturnCases(req: AuthenticatedRequest, res: Response) {
  try {
    const buyerId = buyerIdFrom(req);
    if (!buyerId) return res.status(401).json({ message: 'Authentication required' });
    const { orderId } = req.query;
    const filter: any = { buyerId };
    if (orderId && mongoose.Types.ObjectId.isValid(String(orderId))) {
      filter.orderId = new mongoose.Types.ObjectId(String(orderId));
    }
    const cases = await ReturnCase.find(filter).sort({ createdAt: -1 }).limit(50).lean();
    return res.json({ cases });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message || 'Failed to fetch return cases' });
  }
}

export async function getReturnCase(req: AuthenticatedRequest, res: Response) {
  try {
    const buyerId = buyerIdFrom(req);
    if (!buyerId) return res.status(401).json({ message: 'Authentication required' });
    const { caseId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(caseId)) return res.status(400).json({ message: 'Invalid case ID' });
    const item = await ReturnCase.findOne({ _id: caseId, buyerId }).lean();
    if (!item) return res.status(404).json({ message: 'Return case not found' });
    return res.json({ case: item });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message || 'Failed to fetch return case' });
  }
}

export async function uploadReturnEvidence(req: AuthenticatedRequest, res: Response) {
  try {
    const buyerId = buyerIdFrom(req);
    if (!buyerId) return res.status(401).json({ message: 'Authentication required' });
    const { caseId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(caseId)) return res.status(400).json({ message: 'Invalid case ID' });

    const files = (req.files as Express.Multer.File[]) || [];
    if (!files.length) return res.status(400).json({ message: 'No evidence files uploaded' });

    const doc = await ReturnCase.findOne({ _id: caseId, buyerId });
    if (!doc) return res.status(404).json({ message: 'Return case not found' });

    const linkedOrderItemId = String(req.body?.linkedOrderItemId || '');
    const allowedItemId = linkedOrderItemId ? doc.orderItemIds.includes(linkedOrderItemId) : true;
    if (!allowedItemId) {
      return res.status(400).json({ message: 'Evidence product link does not match selected return items' });
    }

    const evidenceRows = files.map((file) => {
      const mime = String(file.mimetype || '').toLowerCase();
      const kind = mime.startsWith('video/')
        ? 'video'
        : mime.startsWith('image/')
          ? 'image'
          : /receipt|invoice/.test(file.originalname.toLowerCase())
            ? 'receipt'
            : 'document';
      const integrityHash = crypto
        .createHash('sha256')
        .update(`${file.path}|${file.originalname}|${file.size}|${Date.now()}`)
        .digest('hex');
      return {
        kind,
        url: file.path,
        name: file.originalname,
        sizeBytes: file.size,
        mimeType: file.mimetype,
        linkedOrderItemId: linkedOrderItemId || undefined,
        integrityHash,
        uploadedAt: new Date(),
      };
    });

    doc.evidence.push(...(evidenceRows as any));
    if (!doc.fraudSignals.consistencyWarnings) doc.fraudSignals.consistencyWarnings = [];
    if (linkedOrderItemId && evidenceRows.length < 1) {
      doc.fraudSignals.consistencyWarnings.push('No usable evidence extracted.');
    }
    await doc.save();
    return res.json({ message: 'Evidence uploaded', evidence: doc.evidence });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message || 'Failed to upload evidence' });
  }
}

export async function addReturnCaseMessage(req: AuthenticatedRequest, res: Response) {
  try {
    const buyerId = buyerIdFrom(req);
    if (!buyerId) return res.status(401).json({ message: 'Authentication required' });
    const { caseId } = req.params;
    const text = String(req.body?.text || '').trim();
    const attachments = Array.isArray(req.body?.attachments) ? req.body.attachments.map((x: any) => String(x)) : [];
    if (!text) return res.status(400).json({ message: 'Message text is required' });
    if (!mongoose.Types.ObjectId.isValid(caseId)) return res.status(400).json({ message: 'Invalid case ID' });
    const doc = await ReturnCase.findOne({ _id: caseId, buyerId });
    if (!doc) return res.status(404).json({ message: 'Return case not found' });
    doc.chat.push({
      actorRole: 'buyer',
      actorId: String(buyerId),
      text,
      attachments,
      createdAt: new Date(),
    });
    await doc.save();
    return res.json({ message: 'Message sent', chat: doc.chat });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message || 'Failed to send message' });
  }
}

export async function getSmartSatisfactionPrompts(req: AuthenticatedRequest, res: Response) {
  try {
    const buyerId = buyerIdFrom(req);
    if (!buyerId) return res.status(401).json({ message: 'Authentication required' });
    const { orderId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(orderId)) return res.status(400).json({ message: 'Invalid order ID' });

    const order = await Order.findOne({ _id: new mongoose.Types.ObjectId(orderId), buyerId } as any).lean();
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const prompts = (order.items || []).map((item: any, idx: number) => ({
      promptId: `${orderId}:${idx}`,
      productId: String(item.productId || ''),
      question: `Did ${String(item.name || 'this item')} arrive working?`,
      suggestedActions: ['ok', 'damaged', 'not_working', 'late', 'missing'],
    }));

    return res.json({
      orderId,
      smartSatisfactionDetection: true,
      prompts,
    });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message || 'Failed to generate prompts' });
  }
}

export async function submitSatisfactionResponse(req: AuthenticatedRequest, res: Response) {
  try {
    const buyerId = buyerIdFrom(req);
    if (!buyerId) return res.status(401).json({ message: 'Authentication required' });
    const { orderId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(orderId)) return res.status(400).json({ message: 'Invalid order ID' });
    const responses = Array.isArray(req.body?.responses) ? req.body.responses : [];
    if (!responses.length) return res.status(400).json({ message: 'responses are required' });

    const order = await Order.findOne({ _id: new mongoose.Types.ObjectId(orderId), buyerId } as any);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    (order as any).postDelivery = {
      ...((order as any).postDelivery || {}),
      satisfactionResponses: responses.map((r: any) => ({
        productId: String(r?.productId || ''),
        sentiment: String(r?.sentiment || 'ok'),
        comment: String(r?.comment || ''),
        at: new Date(),
      })),
      lastSatisfactionCheckAt: new Date(),
    };
    await order.save();
    return res.json({ success: true, message: 'Satisfaction responses saved' });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message || 'Failed to save response' });
  }
}

export async function createInstantResolution(req: AuthenticatedRequest, res: Response) {
  try {
    const buyerId = buyerIdFrom(req);
    if (!buyerId) return res.status(401).json({ message: 'Authentication required' });
    const { orderId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(orderId)) return res.status(400).json({ message: 'Invalid order ID' });

    const resolutionType = String(req.body?.resolutionType || '').toLowerCase();
    if (!['replacement', 'exchange', 'repair'].includes(resolutionType)) {
      return res.status(400).json({ message: 'resolutionType must be replacement|exchange|repair' });
    }
    const reasonCode = String(req.body?.reasonCode || 'not_as_described');
    const description = String(req.body?.description || 'Instant resolution requested by buyer');

    const order = await Order.findOne({ _id: new mongoose.Types.ObjectId(orderId), buyerId } as any);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const caseDoc = await ReturnCase.create({
      orderId: order._id,
      buyerId,
      sellerId: order.sellerId,
      splitGroupKey: `${String(order._id)}:${String(order.sellerId)}`,
      orderItemIds: (order.items || []).map((_x: any, idx: number) => `${String(order._id)}:${idx}`),
      reasonCode,
      reasonLabel: REASONS[reasonCode] || 'Post-delivery issue',
      description,
      returnType: resolutionType === 'replacement' ? 'replacement' : 'exchange',
      fraudSignals: {
        abuseScore: 15,
        suspiciousPatterns: [],
        consistencyWarnings: [],
        autoApprovalRecommended: true,
      },
      authenticityCheck: {
        score: 80,
        notes: ['Instant resolution path'],
        matchedProductMedia: true,
      },
      resolutionMetrics: {
        sellerDefectRate: 0,
        buyerReturnFrequency: 0,
        estimatedResolutionHours: 48,
      },
      escrowSnapshot: {
        escrowStatus: String(order.escrow?.status || 'PENDING'),
        frozenAt: new Date(),
        freezeReason: `Instant ${resolutionType} request`,
      },
      refund: {
        amount: 0,
        currency: String(order.payment?.currency || 'USD'),
        method: 'original_payment',
        etaLabel: 'N/A',
      },
      shipping: {
        returnAddress: `${order.shippingAddress?.name || 'Seller'}, ${order.shippingAddress?.city || ''}, ${order.shippingAddress?.country || ''}`,
        qrLabelUrl: '',
        courierOptions: ['DHL', 'FedEx', 'Local Courier'],
        selectedCourier: '',
        trackingNumber: '',
        trackingUrl: '',
      },
      timeline: [{ stage: 'requested', label: `Instant ${resolutionType} requested`, at: new Date() }],
      chat: [{ actorRole: 'system', text: `Instant ${resolutionType} initiated.`, createdAt: new Date() }],
      postDeliveryResolution: {
        kind: resolutionType,
        status: 'open',
      },
    } as any);

    return res.status(201).json({
      success: true,
      resolutionType,
      case: caseDoc,
    });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message || 'Failed to create instant resolution' });
  }
}

export async function listMyReviews(req: AuthenticatedRequest, res: Response) {
  try {
    const buyerId = buyerIdFrom(req);
    if (!buyerId) return res.status(401).json({ message: 'Authentication required' });

    const reviews = await ProductReview.find({ userId: buyerId })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return res.json({
      reviews: reviews.map((r) => ({
        id: String(r._id),
        productId: String(r.productId),
        productName: r.productName,
        orderId: r.orderId,
        rating: r.rating,
        message: r.message,
        status: r.status,
        createdAt: r.createdAt,
        verifiedPurchase: r.verifiedPurchase,
      })),
    });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message || 'Failed to load reviews' });
  }
}

export async function submitRewardedReview(req: AuthenticatedRequest, res: Response) {
  try {
    const { isSystemFeatureEnabled } = await import('../services/systemFeatureSettings.service');
    if (!(await isSystemFeatureEnabled('product_reviews'))) {
      return res.status(503).json({
        message: 'Product reviews are temporarily disabled',
        code: 'FEATURE_DISABLED',
      });
    }

    const buyerId = buyerIdFrom(req);
    if (!buyerId) return res.status(401).json({ message: 'Authentication required' });
    const {
      orderId,
      productId,
      rating,
      message,
      images = [],
      videos = [],
      liveShoppingClips = [],
    } = req.body || {};

    if (!orderId || !productId || !rating) {
      return res.status(400).json({ message: 'orderId, productId and rating are required' });
    }
    if (!mongoose.Types.ObjectId.isValid(orderId) || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: 'Invalid orderId or productId' });
    }

    const order = await Order.findOne({
      _id: new mongoose.Types.ObjectId(orderId),
      buyerId,
      status: { $in: ['delivered', 'shipped', 'completed'] },
    } as any).lean();
    if (!order) return res.status(404).json({ message: 'Eligible order not found for review' });

    const product = await Product.findById(productId).select('name').lean();
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const existing = await ProductReview.findOne({
      userId: buyerId,
      productId: new mongoose.Types.ObjectId(productId),
      orderId: String(orderId),
    }).lean();
    if (existing) return res.status(400).json({ message: 'Review already submitted for this product in this order' });

    const rewardPoints = 20;
    const review = await ProductReview.create({
      userId: buyerId,
      customerName: String((req.user as any)?.fullName || 'Verified Buyer'),
      customerEmail: String((req.user as any)?.email || ''),
      productId: new mongoose.Types.ObjectId(productId),
      productName: String((product as any).name || 'Product'),
      orderId: String(orderId),
      rating: Math.max(1, Math.min(5, Number(rating))),
      message: String(message || '').trim(),
      images: Array.isArray(images) ? images.map((x: any) => String(x)) : [],
      videos: Array.isArray(videos) ? videos.map((x: any) => String(x)) : [],
      liveShoppingClips: Array.isArray(liveShoppingClips) ? liveShoppingClips.map((x: any) => String(x)) : [],
      verifiedPurchase: true,
      rewardPoints,
      status: 'approved',
      flagged: false,
    });

    await User.updateOne(
      { _id: buyerId },
      {
        $inc: {
          'rewards.points': rewardPoints,
          'rewards.lifetimePoints': rewardPoints,
        },
        $set: { 'rewards.lastEarnedAt': new Date() },
      }
    );

    const sellerIdForReview = String((product as { sellerId?: unknown }).sellerId || '');
    if (sellerIdForReview) {
      void deliverSellerNotification(
        'new_review',
        {
          sellerId: sellerIdForReview,
          orderId: String(orderId),
          orderNumber: String(orderId),
        },
        String(buyerId)
      );
    }

    return res.status(201).json({
      success: true,
      reward: { points: rewardPoints },
      review,
    });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message || 'Failed to submit review' });
  }
}

export async function getBuyerRewardsSummary(req: AuthenticatedRequest, res: Response) {
  try {
    const buyerId = buyerIdFrom(req);
    if (!buyerId) return res.status(401).json({ message: 'Authentication required' });

    const user = await User.findById(buyerId).select('rewards').lean();
    const recentReviews = await ProductReview.find({
      userId: buyerId,
      verifiedPurchase: true,
      rewardPoints: { $gt: 0 },
    })
      .select('productName rewardPoints createdAt orderId')
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    const history = recentReviews.map((r: any) => ({
      type: 'review_reward',
      points: Number(r.rewardPoints || 0),
      productName: String(r.productName || 'Product'),
      orderId: String(r.orderId || ''),
      earnedAt: r.createdAt,
    }));

    return res.json({
      rewards: {
        points: Number((user as any)?.rewards?.points || 0),
        lifetimePoints: Number((user as any)?.rewards?.lifetimePoints || 0),
        lastEarnedAt: (user as any)?.rewards?.lastEarnedAt || null,
      },
      history,
    });
  } catch (error: any) {
    return res.status(500).json({ message: error?.message || 'Failed to load rewards summary' });
  }
}

