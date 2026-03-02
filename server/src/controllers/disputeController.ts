import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { Dispute } from '../models/Dispute';
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
 * Get next action information for a dispute
 */
const getNextAction = (dispute: any) => {
  if (dispute.status === 'new') {
    return {
      message: 'This dispute requires your response. Please review and respond.',
      deadline: dispute.responseDeadline || null,
      actionRequired: true,
    };
  }
  if (dispute.status === 'buyer_response') {
    return {
      message: 'The buyer has responded. Please review their response and take action.',
      deadline: dispute.responseDeadline || null,
      actionRequired: true,
    };
  }
  if (dispute.status === 'under_review') {
    return {
      message: 'This dispute is under review. No action required at this time.',
      deadline: null,
      actionRequired: false,
    };
  }
  if (dispute.status === 'resolved' || dispute.status === 'approved' || dispute.status === 'rejected') {
    return {
      message: 'This dispute has been resolved.',
      deadline: null,
      actionRequired: false,
    };
  }
  if (dispute.status === 'seller_response') {
    return {
      message: 'Your response has been submitted. Awaiting platform review.',
      deadline: null,
      actionRequired: false,
    };
  }
  return {
    message: 'Awaiting platform review.',
    deadline: null,
    actionRequired: false,
  };
};

/**
 * Get all disputes for seller
 */
export async function getDisputes(req: AuthenticatedRequest, res: Response) {
  try {
    const sellerId = getSellerId(req);
    if (!sellerId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { status, type, page = 1, limit = 20, startDate, endDate, sort } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const filter: any = { sellerId };

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (type && type !== 'all') {
      filter.type = type;
    }

    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate as string);
      }
      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    // Sort order (1 for ascending, -1 for descending)
    // Sort by updatedAt (last updated) instead of createdAt for better relevance
    const sortOrder = sort === '1' ? 1 : -1;

    const disputes = await Dispute.find(filter)
      .populate('orderId', 'orderNumber total items customer customerEmail')
      .populate('buyerId', 'fullName email avatar_url')
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
    console.error('Get disputes error:', error);
    return res.status(500).json({ message: 'Failed to fetch disputes' });
  }
}

/**
 * Get single dispute
 */
export async function getDispute(req: AuthenticatedRequest, res: Response) {
  try {
    const sellerId = getSellerId(req);
    if (!sellerId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { disputeId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(disputeId)) {
      return res.status(400).json({ message: 'Invalid dispute ID' });
    }

    const dispute = await Dispute.findOne({
      _id: disputeId,
      sellerId,
    })
      .populate('orderId', 'orderNumber total items customer customerEmail')
      .populate('buyerId', 'fullName email avatar_url')
      .populate('resolvedBy', 'fullName email')
      .lean();

    if (!dispute) {
      return res.status(404).json({ message: 'Dispute not found' });
    }

    // Build next action information
    const nextAction = getNextAction(dispute);
    const requiresAction = dispute.status === 'new' || dispute.status === 'buyer_response';
    const deadlineExpired = dispute.responseDeadline 
      ? new Date(dispute.responseDeadline) < new Date() 
      : false;

    return res.json({ 
      dispute: {
        ...dispute,
        nextAction,
        requiresAction,
        deadlineExpired,
      }
    });
  } catch (error: any) {
    console.error('Get dispute error:', error);
    return res.status(500).json({ message: 'Failed to fetch dispute' });
  }
}

/**
 * Submit seller response to dispute
 */
export async function submitSellerResponse(req: AuthenticatedRequest, res: Response) {
  try {
    const sellerId = getSellerId(req);
    if (!sellerId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { disputeId } = req.params;
    const { response, evidence, actionType } = req.body;

    if (!mongoose.Types.ObjectId.isValid(disputeId)) {
      return res.status(400).json({ message: 'Invalid dispute ID' });
    }

    if (!response || !response.trim()) {
      return res.status(400).json({ message: 'Response is required' });
    }

    const dispute = await Dispute.findOne({
      _id: disputeId,
      sellerId,
    });

    if (!dispute) {
      return res.status(404).json({ message: 'Dispute not found' });
    }

    if (dispute.status === 'resolved' || dispute.status === 'approved' || dispute.status === 'rejected') {
      return res.status(400).json({ message: 'Dispute is already resolved' });
    }

    // Check if deadline has passed (if applicable)
    if (dispute.responseDeadline && new Date(dispute.responseDeadline) < new Date()) {
      // Allow response even after deadline, but log it
      console.warn(`Seller response submitted after deadline for dispute ${dispute._id}`);
    }

    // Add evidence if provided
    const evidenceArray = Array.isArray(evidence) ? evidence : [];
    const newEvidence = evidenceArray.map((ev: any) => ({
      type: ev.type || 'other',
      url: ev.url,
      description: ev.description,
      uploadedAt: new Date(),
    }));

    // Ensure immutability - don't allow editing existing responses
    if (dispute.sellerResponse) {
      return res.status(400).json({ message: 'Response already submitted. Cannot modify existing response.' });
    }

    dispute.sellerResponse = response;
    dispute.sellerResponseAt = new Date();
    dispute.evidence = [...dispute.evidence, ...newEvidence];
    
    // Update status based on action type and current state
    if (dispute.status === 'new' || dispute.status === 'buyer_response') {
      // After seller responds, move to under_review for platform mediation
      dispute.status = 'seller_response';
      // Platform will review and transition to under_review
    }

    // Clear response deadline as seller has responded
    if (dispute.responseDeadline) {
      dispute.responseDeadline = undefined;
    }

    await dispute.save();

    return res.json({
      message: 'Response submitted successfully',
      dispute,
    });
  } catch (error: any) {
    console.error('Submit seller response error:', error);
    return res.status(500).json({ message: 'Failed to submit response' });
  }
}

/**
 * Upload evidence for dispute
 */
export async function uploadEvidence(req: AuthenticatedRequest, res: Response) {
  try {
    const sellerId = getSellerId(req);
    if (!sellerId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { disputeId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(disputeId)) {
      return res.status(400).json({ message: 'Invalid dispute ID' });
    }

    const { notes } = req.body;

    if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
      if (!notes || !notes.trim()) {
        return res.status(400).json({ message: 'No files uploaded and no notes provided' });
      }
    }

    const dispute = await Dispute.findOne({
      _id: disputeId,
      sellerId,
    });

    if (!dispute) {
      return res.status(404).json({ message: 'Dispute not found' });
    }

    // Check if dispute is resolved
    if (dispute.status === 'resolved' || dispute.status === 'approved' || dispute.status === 'rejected') {
      return res.status(400).json({ message: 'Cannot upload evidence to a resolved dispute' });
    }

    const files = (req.files as Express.Multer.File[] || []).map((file) => {
      // Determine file type based on MIME type and extension
      let evidenceType: 'photo' | 'document' | 'video' | 'message' | 'receipt' | 'other' = 'document';
      
      if (file.mimetype.startsWith('image/')) {
        evidenceType = 'photo';
      } else if (file.mimetype.startsWith('video/')) {
        evidenceType = 'video';
      } else {
        const ext = file.originalname.split('.').pop()?.toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif'].includes(ext || '')) {
          evidenceType = 'photo';
        } else if (['pdf', 'doc', 'docx', 'txt'].includes(ext || '')) {
          evidenceType = 'document';
        }
      }

      return {
        type: evidenceType,
        url: `/uploads/disputes/${file.filename}`,
        description: notes || file.originalname,
        uploadedAt: new Date(),
      };
    });

    dispute.evidence = [...dispute.evidence, ...files];
    await dispute.save();

    return res.json({
      message: 'Evidence uploaded successfully',
      files: files.map((f) => ({ url: f.url, description: f.description })),
    });
  } catch (error: any) {
    console.error('Upload evidence error:', error);
    return res.status(500).json({ message: 'Failed to upload evidence' });
  }
}

