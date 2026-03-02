import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { Dispute } from '../models/Dispute';
import { Order } from '../models/Order';
import mongoose from 'mongoose';

const getBuyerId = (req: AuthenticatedRequest): mongoose.Types.ObjectId | null => {
  if (!req.user?.id) return null;
  try {
    return new mongoose.Types.ObjectId(req.user.id);
  } catch {
    return null;
  }
};

/**
 * Create a new dispute
 */
export async function createDispute(req: AuthenticatedRequest, res: Response) {
  try {
    const buyerId = getBuyerId(req);
    if (!buyerId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { orderId, type, reason, description, priority = 'medium' } = req.body;

    // Validate required fields
    if (!orderId || !type || !reason || !description) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Validate dispute type
    const validTypes = ['refund', 'return', 'quality', 'delivery', 'other'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ message: 'Invalid dispute type' });
    }

    // Validate priority
    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    if (!validPriorities.includes(priority)) {
      return res.status(400).json({ message: 'Invalid priority' });
    }

    // Check if order exists and belongs to buyer
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ message: 'Invalid order ID' });
    }

    const order = await Order.findOne({
      _id: new mongoose.Types.ObjectId(orderId),
      buyerId,
    } as any).lean();

    if (!order) {
      return res.status(404).json({ message: 'Order not found or access denied' });
    }

    // Check if dispute already exists for this order
    const existingDispute = await Dispute.findOne({
      orderId,
      buyerId,
      status: { $in: ['new', 'under_review', 'seller_response', 'buyer_response'] },
    });

    if (existingDispute) {
      return res.status(400).json({ 
        message: 'An active dispute already exists for this order',
        disputeId: existingDispute._id,
      });
    }

    // Generate unique dispute number
    const disputeCount = await Dispute.countDocuments();
    const disputeNumber = `DSP-${Date.now()}-${String(disputeCount + 1).padStart(6, '0')}`;

    // Set response deadline (7 days from now)
    const responseDeadline = new Date();
    responseDeadline.setDate(responseDeadline.getDate() + 7);

    // Create dispute
    const dispute = new Dispute({
      disputeNumber,
      orderId,
      sellerId: order.sellerId,
      buyerId,
      type,
      reason,
      description,
      priority,
      status: 'new',
      evidence: [],
      responseDeadline,
    });

    await dispute.save();

    // Populate order and seller info
    await dispute.populate('orderId', 'orderNumber total items');
    await dispute.populate('sellerId', 'fullName email');

    return res.status(201).json({
      message: 'Dispute created successfully',
      dispute,
    });
  } catch (error: any) {
    console.error('Create dispute error:', error);
    return res.status(500).json({ message: 'Failed to create dispute' });
  }
}

/**
 * Get all disputes for buyer
 */
export async function getBuyerDisputes(req: AuthenticatedRequest, res: Response) {
  try {
    const buyerId = getBuyerId(req);
    if (!buyerId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { status, type, page = 1, limit = 20, sort } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const filter: any = { buyerId };

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (type && type !== 'all') {
      filter.type = type;
    }

    // Sort order
    const sortOrder = sort === '1' ? 1 : -1;

    const disputes = await Dispute.find(filter)
      .populate('orderId', 'orderNumber total items')
      .populate('sellerId', 'fullName email storeName avatar_url')
      .sort({ updatedAt: sortOrder })
      .limit(Number(limit))
      .skip(skip)
      .lean();

    const total = await Dispute.countDocuments(filter);

    return res.json({
      disputes,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    console.error('Get buyer disputes error:', error);
    return res.status(500).json({ message: 'Failed to fetch disputes' });
  }
}

/**
 * Get single dispute
 */
export async function getBuyerDispute(req: AuthenticatedRequest, res: Response) {
  try {
    const buyerId = getBuyerId(req);
    if (!buyerId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { disputeId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(disputeId)) {
      return res.status(400).json({ message: 'Invalid dispute ID' });
    }

    const dispute = await Dispute.findOne({
      _id: disputeId,
      buyerId,
    })
      .populate('orderId', 'orderNumber total items shippingAddress')
      .populate('sellerId', 'fullName email storeName avatar_url')
      .populate('resolvedBy', 'fullName email')
      .lean();

    if (!dispute) {
      return res.status(404).json({ message: 'Dispute not found' });
    }

    return res.json({ dispute });
  } catch (error: any) {
    console.error('Get buyer dispute error:', error);
    return res.status(500).json({ message: 'Failed to fetch dispute' });
  }
}

/**
 * Submit buyer response to dispute
 */
export async function submitBuyerResponse(req: AuthenticatedRequest, res: Response) {
  try {
    const buyerId = getBuyerId(req);
    if (!buyerId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { disputeId } = req.params;
    const { response } = req.body;

    if (!response || !response.trim()) {
      return res.status(400).json({ message: 'Response is required' });
    }

    if (!mongoose.Types.ObjectId.isValid(disputeId)) {
      return res.status(400).json({ message: 'Invalid dispute ID' });
    }

    const dispute = await Dispute.findOne({
      _id: disputeId,
      buyerId,
    });

    if (!dispute) {
      return res.status(404).json({ message: 'Dispute not found' });
    }

    // Check if buyer can respond
    if (dispute.status !== 'seller_response') {
      return res.status(400).json({ 
        message: 'You can only respond when the seller has submitted a response' 
      });
    }

    // Update dispute
    dispute.buyerResponse = response.trim();
    dispute.buyerResponseAt = new Date();
    dispute.status = 'buyer_response';
    
    // Set new response deadline for seller (7 days)
    const responseDeadline = new Date();
    responseDeadline.setDate(responseDeadline.getDate() + 7);
    dispute.responseDeadline = responseDeadline;

    await dispute.save();

    return res.json({
      message: 'Response submitted successfully',
      dispute,
    });
  } catch (error: any) {
    console.error('Submit buyer response error:', error);
    return res.status(500).json({ message: 'Failed to submit response' });
  }
}

/**
 * Upload evidence for dispute
 */
export async function uploadBuyerEvidence(req: AuthenticatedRequest, res: Response) {
  try {
    const buyerId = getBuyerId(req);
    if (!buyerId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { disputeId } = req.params;
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    if (!mongoose.Types.ObjectId.isValid(disputeId)) {
      return res.status(400).json({ message: 'Invalid dispute ID' });
    }

    const dispute = await Dispute.findOne({
      _id: disputeId,
      buyerId,
    });

    if (!dispute) {
      return res.status(404).json({ message: 'Dispute not found' });
    }

    // Add evidence
    const evidence = files.map(file => {
      let evidenceType: 'photo' | 'document' | 'video' = 'document';
      if (file.mimetype.startsWith('image/')) {
        evidenceType = 'photo';
      } else if (file.mimetype.startsWith('video/')) {
        evidenceType = 'video';
      }
      return {
        type: evidenceType,
        url: `/uploads/disputes/${file.filename}`,
        description: file.originalname,
        uploadedAt: new Date(),
      };
    });

    dispute.evidence.push(...evidence);
    await dispute.save();

    return res.json({
      message: 'Evidence uploaded successfully',
      evidence: dispute.evidence,
    });
  } catch (error: any) {
    console.error('Upload buyer evidence error:', error);
    return res.status(500).json({ message: 'Failed to upload evidence' });
  }
}

