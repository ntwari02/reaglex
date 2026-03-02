import { Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { AuthenticatedRequest } from '../middleware/auth';
import { MessageThread, Message, IMessageThread, IMessage } from '../models/MessageThread';
import mongoose from 'mongoose';
import { websocketService } from '../services/websocketService';

// Helper to get seller ID from request
const getSellerId = (req: AuthenticatedRequest): mongoose.Types.ObjectId | null => {
  if (!req.user?.id) return null;
  try {
    return new mongoose.Types.ObjectId(req.user.id);
  } catch {
    return null;
  }
};

// Validation schemas
const createThreadSchema = z.object({
  buyerId: z.string().min(1, 'Buyer ID is required'),
  subject: z.string().min(3, 'Subject must be at least 3 characters').max(200, 'Subject must be less than 200 characters'),
  type: z.enum(['rfq', 'message', 'order']).optional(),
  relatedOrderId: z.string().optional(),
  relatedRfqId: z.string().optional(),
});

// WhatsApp-like: Allow empty content if attachments are present
const sendMessageSchema = z.object({
  content: z.preprocess(
    (val) => {
      // Convert any value to string, default to empty string
      if (val === null || val === undefined) return '';
      return String(val);
    },
    z.string().max(5000, 'Message must be less than 5000 characters')
  ).optional().default(''),
  attachments: z.array(z.any()).optional().default([]),
  replyTo: z.string().optional(),
  forwardedFrom: z.object({
    threadId: z.string(),
    messageId: z.string(),
  }).optional(),
}).refine(
  (data) => {
    // Either content must have text OR attachments must be present (like WhatsApp)
    const contentStr = data.content ? String(data.content).trim() : '';
    const hasContent = contentStr.length > 0;
    
    // Ensure attachments is treated as array
    let attachmentsArray: any[] = [];
    if (data.attachments) {
      if (Array.isArray(data.attachments)) {
        attachmentsArray = data.attachments;
      } else if (typeof data.attachments === 'string') {
        // Try to parse if it's a JSON string
        try {
          const parsed = JSON.parse(data.attachments);
          attachmentsArray = Array.isArray(parsed) ? parsed : [];
        } catch (e) {
          console.error('[Schema Validation] Failed to parse attachments string:', e);
          attachmentsArray = [];
        }
      } else {
        // If it's not an array or string, treat as empty
        attachmentsArray = [];
      }
    }
    
    const hasAttachments = Array.isArray(attachmentsArray) && attachmentsArray.length > 0;
    
    console.log('[Schema Validation] hasContent:', hasContent, 'hasAttachments:', hasAttachments);
    console.log('[Schema Validation] content:', contentStr.substring(0, 50), '(length:', contentStr.length, ')');
    console.log('[Schema Validation] attachments type:', typeof data.attachments, 'isArray:', Array.isArray(data.attachments), 'length:', attachmentsArray.length);
    
    return hasContent || hasAttachments;
  },
  {
    message: 'Please add a message text or attach a file/image/voice note. You cannot send an empty message.',
    path: ['content'], // Point to content field for better error message
  }
);

const editMessageSchema = z.object({
  content: z.string().min(1, 'Message cannot be empty').max(5000, 'Message must be less than 5000 characters'),
});

const reactToMessageSchema = z.object({
  emoji: z.string().min(1, 'Emoji is required').max(10, 'Emoji must be less than 10 characters'),
});

const forwardMessageSchema = z.object({
  targetThreadId: z.string().min(1, 'Target thread ID is required'),
});

const updateThreadSchema = z.object({
  status: z.enum(['active', 'archived', 'resolved', 'closed']).optional(),
  subject: z.string().min(3).max(200).optional(),
});

/**
 * Get all threads for the seller
 */
export async function getThreads(req: AuthenticatedRequest, res: Response) {
  try {
    const sellerId = getSellerId(req);
    if (!sellerId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const {
      status,
      type,
      search,
      page = '1',
      limit = '20',
      sortBy = 'lastMessageAt',
      sortOrder = 'desc',
    } = req.query;

    const query: any = { sellerId };

    // Filters
    if (status && typeof status === 'string') {
      query.status = status;
    }
    if (type && typeof type === 'string') {
      query.type = type;
    }
    if (search && typeof search === 'string') {
      query.$or = [
        { subject: { $regex: search, $options: 'i' } },
        { lastMessagePreview: { $regex: search, $options: 'i' } },
      ];
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const sort: any = {};
    sort[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

    const [threads, total] = await Promise.all([
      MessageThread.find(query)
        .populate('buyerId', 'fullName email avatarUrl')
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      MessageThread.countDocuments(query),
    ]);

    return res.json({
      threads,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    console.error('Get threads error:', error);
    return res.status(500).json({ message: 'Failed to fetch threads', error: error.message });
  }
}

/**
 * Get a single thread with messages
 */
export async function getThread(req: AuthenticatedRequest, res: Response) {
  try {
    const sellerId = getSellerId(req);
    if (!sellerId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { threadId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(threadId)) {
      return res.status(400).json({ message: 'Invalid thread ID' });
    }

    const thread = await MessageThread.findOne({
      _id: threadId,
      sellerId,
    })
      .populate('buyerId', 'fullName email avatarUrl')
      .populate('sellerId', 'fullName email avatarUrl')
      .lean();

    if (!thread) {
      return res.status(404).json({ message: 'Thread not found' });
    }

    // Get messages with pagination
    const {
      page = '1',
      limit = '50',
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const [messages, totalMessages] = await Promise.all([
      Message.find({ threadId })
        .populate('senderId', 'fullName email avatarUrl')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Message.countDocuments({ threadId }),
    ]);

    // Mark thread as read for seller
    await MessageThread.updateOne(
      { _id: threadId, sellerId },
      { $set: { sellerUnreadCount: 0 } }
    );

    return res.json({
      thread,
      messages: messages.reverse(), // Reverse to show oldest first
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalMessages,
        pages: Math.ceil(totalMessages / limitNum),
      },
    });
  } catch (error: any) {
    console.error('Get thread error:', error);
    return res.status(500).json({ message: 'Failed to fetch thread', error: error.message });
  }
}

/**
 * Create a new thread
 */
export async function createThread(req: AuthenticatedRequest, res: Response) {
  try {
    const sellerId = getSellerId(req);
    if (!sellerId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const validation = createThreadSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: 'Validation error',
        errors: validation.error.issues,
      });
    }

    const { buyerId, subject, type, relatedOrderId, relatedRfqId } = validation.data;

    if (!mongoose.Types.ObjectId.isValid(buyerId)) {
      return res.status(400).json({ message: 'Invalid buyer ID' });
    }

    // Check if thread already exists
    const existingThread = await MessageThread.findOne({
      sellerId,
      buyerId,
      subject,
      status: { $in: ['active', 'resolved'] },
    });

    if (existingThread) {
      return res.status(409).json({
        message: 'Thread already exists',
        thread: existingThread,
      });
    }

    const threadData: any = {
      sellerId,
      buyerId,
      subject,
      type: type || 'message',
      sellerUnreadCount: 0,
      buyerUnreadCount: 0,
    };

    if (relatedOrderId && mongoose.Types.ObjectId.isValid(relatedOrderId)) {
      threadData.relatedOrderId = relatedOrderId;
    }
    if (relatedRfqId && mongoose.Types.ObjectId.isValid(relatedRfqId)) {
      threadData.relatedRfqId = relatedRfqId;
    }

    const thread = await MessageThread.create(threadData);
    await (thread as any).populate('buyerId', 'fullName email avatarUrl');

    return res.status(201).json({ thread });
  } catch (error: any) {
    console.error('Create thread error:', error);
    return res.status(500).json({ message: 'Failed to create thread', error: error.message });
  }
}

/**
 * Send a message in a thread
 */
export async function sendMessage(req: AuthenticatedRequest, res: Response) {
  try {
    const sellerId = getSellerId(req);
    if (!sellerId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { threadId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(threadId)) {
      return res.status(400).json({ message: 'Invalid thread ID' });
    }

    console.log('[Controller] Validating send message request');
    console.log('[Controller] Request body:', {
      content: req.body.content,
      contentType: typeof req.body.content,
      contentLength: req.body.content?.length || 0,
      attachments: req.body.attachments,
      attachmentsType: typeof req.body.attachments,
      attachmentsLength: Array.isArray(req.body.attachments) ? req.body.attachments.length : 'not array',
    });
    
    const validation = sendMessageSchema.safeParse(req.body);
    if (!validation.success) {
      console.error('[Controller] Validation failed:', validation.error.issues);
      console.error('[Controller] Request body content:', req.body.content);
      console.error('[Controller] Request body attachments:', req.body.attachments);
      
      // Extract clean error messages - avoid including content text in error
      const errorMessages = validation.error.issues
        .map((e: any) => {
          // Only include the validation message, not the content value
          // Remove any content value that might be included in the message
          let msg = e.message || '';
          // Remove any potential content value patterns from error message
          if (msg.includes('content:') && msg.length > 100) {
            // Likely contains content value, extract just the validation message
            const parts = msg.split('content:');
            if (parts.length > 1) {
              // Take only the first part (the validation message)
              msg = parts[0].trim() || e.message;
            }
          }
          return msg;
        })
        .filter((msg: string, idx: number, arr: string[]) => arr.indexOf(msg) === idx);
      
      // Use a clean, user-friendly message
      const mainMessage = errorMessages.length > 0 
        ? (errorMessages[0].includes('Please add') 
            ? errorMessages[0] 
            : `Message validation failed: ${errorMessages[0]}`)
        : 'Please add a message text or attach a file/image/voice note. You cannot send an empty message.';
      
      return res.status(400).json({
        message: mainMessage,
        errors: validation.error.issues,
        details: validation.error.issues.map((e: any) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    const { content, attachments = [], replyTo, forwardedFrom } = validation.data;
    console.log('[Controller] Validation passed');
    console.log('[Controller] Content:', content, '(length:', content?.length || 0, ')');
    console.log('[Controller] Attachments:', attachments.length);

    // Verify thread exists and belongs to seller
    const thread = await MessageThread.findOne({
      _id: threadId,
      sellerId,
    });

    if (!thread) {
      return res.status(404).json({ message: 'Thread not found' });
    }

    // Verify replyTo message exists if provided
    let replyToMessage = null;
    if (replyTo && mongoose.Types.ObjectId.isValid(replyTo)) {
      replyToMessage = await Message.findOne({
        _id: replyTo,
        threadId,
      });
      if (!replyToMessage) {
        return res.status(404).json({ message: 'Reply-to message not found' });
      }
    }

    // Verify forwarded message exists if provided
    let forwardedMessage = null;
    if (forwardedFrom && forwardedFrom.messageId && mongoose.Types.ObjectId.isValid(forwardedFrom.messageId)) {
      forwardedMessage = await Message.findById(forwardedFrom.messageId).lean();
      if (!forwardedMessage) {
        return res.status(404).json({ message: 'Forwarded message not found' });
      }
    }

    // Process attachments - if attachments are file objects from upload, use them directly
    // Otherwise, if they're paths from previous upload, we need to get file info
    let processedAttachments: any[] = [];
    
    if (attachments.length > 0) {
      // Check if attachments are file objects (from multer) or paths (strings)
      if (typeof attachments[0] === 'object' && (attachments[0] as any).path) {
        // File objects from multer
        processedAttachments = attachments.map((file: any) => {
          const isAudio = file.mimetype?.startsWith('audio/');
          const isImage = file.mimetype?.startsWith('image/');
          
          return {
            filename: file.filename || file.path.split('/').pop() || '',
            originalName: file.originalname || file.originalName || '',
            path: file.path || file.path,
            size: file.size || 0,
            mimetype: file.mimetype || 'application/octet-stream',
            type: isAudio ? 'voice' : isImage ? 'image' : 'file',
            duration: file.duration,
            uploadedAt: file.uploadedAt ? new Date(file.uploadedAt) : new Date(),
          };
        });
      } else {
        // Object attachments from previous upload
        processedAttachments = attachments.map((att: any) => {
          if (typeof att === 'string') {
            // String path
            return {
              filename: att.split('/').pop() || '',
              originalName: att.split('/').pop() || '',
              path: att,
              size: 0,
              mimetype: 'application/octet-stream',
              type: 'file',
              uploadedAt: new Date(),
            };
          }
          // Already an object
          return att;
        });
      }
    }

    // Create message - WhatsApp style: allow empty content if attachments exist
    const messageContent = (content ? String(content).trim() : '') || ''; // Always ensure it's a string, default to empty
    const messageData: any = {
      threadId,
      senderId: sellerId,
      senderType: 'seller',
      content: messageContent, // Can be empty string if attachments exist - always explicitly set
      attachments: processedAttachments,
      readBy: [sellerId],
      status: 'sent',
      isEdited: false,
      isDeleted: false,
    };

    // Add reply reference if provided
    if (replyToMessage) {
      messageData.replyTo = replyToMessage._id;
    }

    // Add forward reference if provided
    if (forwardedMessage && forwardedFrom) {
      messageData.forwardedFrom = {
        threadId: forwardedFrom.threadId,
        messageId: forwardedFrom.messageId,
        originalSender: forwardedMessage.senderId,
      };
    }

    const message = await Message.create(messageData);
    await (message as any).populate('senderId', 'fullName email avatarUrl');

    // Update thread - create preview from content or attachment info (WhatsApp style)
    let preview = messageContent && messageContent.trim() ? messageContent : '';
    if (!preview && processedAttachments.length > 0) {
      const firstAtt = processedAttachments[0];
      if (firstAtt.type === 'voice') {
        preview = '🎤 Voice note';
      } else if (firstAtt.type === 'image') {
        preview = '📷 Image';
      } else {
        preview = `📎 ${firstAtt.originalName || 'File'}`;
      }
      if (processedAttachments.length > 1) {
        preview += ` (+${processedAttachments.length - 1} more)`;
      }
    }
    preview = preview.length > 200 ? preview.substring(0, 200) + '...' : preview;
    
    await MessageThread.updateOne(
      { _id: threadId },
      {
        $set: {
          lastMessageAt: new Date(),
          lastMessagePreview: preview,
          buyerUnreadCount: (thread.buyerUnreadCount || 0) + 1,
        },
      }
    );

    // Populate message fully before emitting
    const messageId = (message as any)._id;
    const populatedMessage = await Message.findById(messageId)
      .populate('senderId', 'fullName email avatarUrl')
      .populate('replyTo', 'content senderId senderType')
      .lean();

    // Emit WebSocket event for new message - both seller and buyer get it instantly
    await websocketService.emitNewMessage(threadId, populatedMessage);

    // Update message status to 'delivered' after a short delay (simulating delivery)
    setTimeout(async () => {
      await Message.updateOne({ _id: messageId }, { status: 'delivered' });
      const updatedMessage = await Message.findById(messageId).lean();
      if (updatedMessage) {
        await websocketService.emitNewMessage(threadId, updatedMessage);
      }
    }, 500);

    return res.status(201).json({ message: populatedMessage });
  } catch (error: any) {
    console.error('[Controller] Send message error:', error);
    console.error('[Controller] Error stack:', error.stack);
    console.error('[Controller] Error name:', error.name);
    console.error('[Controller] Error message:', error.message);
    
    // Return more detailed error information
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Validation error: ' + error.message,
        error: error.message 
      });
    }
    
    return res.status(500).json({ 
      message: 'Failed to send message: ' + (error.message || 'Unknown error'),
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

/**
 * Mark thread as read
 */
export async function markThreadAsRead(req: AuthenticatedRequest, res: Response) {
  try {
    const sellerId = getSellerId(req);
    if (!sellerId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { threadId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(threadId)) {
      return res.status(400).json({ message: 'Invalid thread ID' });
    }

    const thread = await MessageThread.findOne({
      _id: threadId,
      sellerId,
    });

    if (!thread) {
      return res.status(404).json({ message: 'Thread not found' });
    }

    // Mark all messages in thread as read
    await Message.updateMany(
      { threadId, senderType: 'buyer' },
      {
        $addToSet: { readBy: sellerId },
        $set: { readAt: new Date() },
      }
    );

    // Update thread unread count
    await MessageThread.updateOne(
      { _id: threadId },
      { $set: { sellerUnreadCount: 0 } }
    );

    return res.json({ message: 'Thread marked as read' });
  } catch (error: any) {
    console.error('Mark thread as read error:', error);
    return res.status(500).json({ message: 'Failed to mark thread as read', error: error.message });
  }
}

/**
 * Update thread (status, subject, etc.)
 */
export async function updateThread(req: AuthenticatedRequest, res: Response) {
  try {
    const sellerId = getSellerId(req);
    if (!sellerId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { threadId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(threadId)) {
      return res.status(400).json({ message: 'Invalid thread ID' });
    }

    const validation = updateThreadSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: 'Validation error',
        errors: validation.error.issues,
      });
    }

    const thread = await MessageThread.findOneAndUpdate(
      { _id: threadId, sellerId },
      { $set: validation.data },
      { new: true }
    )
      .populate('buyerId', 'fullName email avatarUrl')
      .lean();

    if (!thread) {
      return res.status(404).json({ message: 'Thread not found' });
    }

    // Emit WebSocket event for thread update
    await websocketService.emitThreadUpdate(threadId, validation.data);

    return res.json({ thread });
  } catch (error: any) {
    console.error('Update thread error:', error);
    return res.status(500).json({ message: 'Failed to update thread', error: error.message });
  }
}

/**
 * Delete thread
 */
export async function deleteThread(req: AuthenticatedRequest, res: Response) {
  try {
    const sellerId = getSellerId(req);
    if (!sellerId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { threadId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(threadId)) {
      return res.status(400).json({ message: 'Invalid thread ID' });
    }

    const thread = await MessageThread.findOne({
      _id: threadId,
      sellerId,
    });

    if (!thread) {
      return res.status(404).json({ message: 'Thread not found' });
    }

    // Delete all messages in thread
    await Message.deleteMany({ threadId });

    // Delete thread
    await MessageThread.deleteOne({ _id: threadId });

    return res.json({ message: 'Thread deleted successfully' });
  } catch (error: any) {
    console.error('Delete thread error:', error);
    return res.status(500).json({ message: 'Failed to delete thread', error: error.message });
  }
}

/**
 * Get inbox statistics
 */
export async function getInboxStats(req: AuthenticatedRequest, res: Response) {
  try {
    const sellerId = getSellerId(req);
    if (!sellerId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const [totalThreads, unreadThreads, activeThreads, archivedThreads] = await Promise.all([
      MessageThread.countDocuments({ sellerId }),
      MessageThread.countDocuments({ sellerId, sellerUnreadCount: { $gt: 0 } }),
      MessageThread.countDocuments({ sellerId, status: 'active' }),
      MessageThread.countDocuments({ sellerId, status: 'archived' }),
    ]);

    return res.json({
      totalThreads,
      unreadThreads,
      activeThreads,
      archivedThreads,
    });
  } catch (error: any) {
    console.error('Get inbox stats error:', error);
    return res.status(500).json({ message: 'Failed to fetch stats', error: error.message });
  }
}

/**
 * Get available buyers (for creating new threads)
 */
export async function getAvailableBuyers(req: AuthenticatedRequest, res: Response) {
  try {
    const sellerId = getSellerId(req);
    if (!sellerId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Get all buyers (users with role 'buyer')
    const buyers = await mongoose.model('User').find(
      { role: 'buyer' },
      'fullName email avatarUrl'
    )
      .limit(100)
      .lean();

    return res.json({ buyers });
  } catch (error: any) {
    console.error('Get buyers error:', error);
    return res.status(500).json({ message: 'Failed to fetch buyers', error: error.message });
  }
}

/**
 * Seed test threads for current seller
 */
export async function seedTestThreads(req: AuthenticatedRequest, res: Response) {
  try {
    const sellerId = getSellerId(req);
    if (!sellerId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Find or create test buyers
    const User = mongoose.model('User');
    const testPasswordHash = await bcrypt.hash('test123', 10);

    let buyer1 = await User.findOne({ email: 'buyer1@test.com' });
    if (!buyer1) {
      buyer1 = await User.create({
        fullName: 'Acme Corp',
        email: 'buyer1@test.com',
        passwordHash: testPasswordHash,
        role: 'buyer',
      });
    }

    let buyer2 = await User.findOne({ email: 'buyer2@test.com' });
    if (!buyer2) {
      buyer2 = await User.create({
        fullName: 'Global Retailers Ltd',
        email: 'buyer2@test.com',
        passwordHash: testPasswordHash,
        role: 'buyer',
      });
    }

    let buyer3 = await User.findOne({ email: 'buyer3@test.com' });
    if (!buyer3) {
      buyer3 = await User.create({
        fullName: 'Startup Hub',
        email: 'buyer3@test.com',
        passwordHash: testPasswordHash,
        role: 'buyer',
      });
    }

    // Clear existing threads for this seller
    const existingThreads = await MessageThread.find({ sellerId }).distinct('_id');
    if (existingThreads.length > 0) {
      await Message.deleteMany({ threadId: { $in: existingThreads } });
    }
    await MessageThread.deleteMany({ sellerId });

    // Create test threads
    const thread1 = await MessageThread.create({
      sellerId,
      buyerId: buyer1._id,
      subject: 'RFQ: 500 units of Wireless Headphones',
      type: 'rfq',
      status: 'active',
      lastMessageAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      lastMessagePreview: 'Can you confirm lead time to EU warehouse?',
      sellerUnreadCount: 1,
      buyerUnreadCount: 0,
    });

    await Message.create({
      threadId: thread1._id,
      senderId: buyer1._id,
      senderType: 'buyer',
      content: 'Hi, we\'re interested in a quote for 500 units shipped to the EU. Can you share lead times and payment terms?',
      status: 'read',
      readBy: [sellerId],
    });

    await Message.create({
      threadId: thread1._id,
      senderId: sellerId,
      senderType: 'seller',
      content: 'Thanks for reaching out—standard lead time is 10–14 days. For this volume we can offer Net 30 terms for approved enterprise buyers.',
      status: 'read',
      readBy: [buyer1._id, sellerId],
    });

    await Message.create({
      threadId: thread1._id,
      senderId: buyer1._id,
      senderType: 'buyer',
      content: 'Can you confirm lead time to EU warehouse?',
      status: 'sent',
      readBy: [],
    });

    const thread2 = await MessageThread.create({
      sellerId,
      buyerId: buyer2._id,
      subject: 'Order #ORD-2847 – Shipping address clarification',
      type: 'order',
      status: 'active',
      lastMessageAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
      lastMessagePreview: 'We need to update the delivery contact.',
      sellerUnreadCount: 0,
      buyerUnreadCount: 1,
    });

    await Message.create({
      threadId: thread2._id,
      senderId: buyer2._id,
      senderType: 'buyer',
      content: 'We need to update the delivery contact for order #ORD-2847. The contact person has changed.',
      status: 'read',
      readBy: [sellerId],
    });

    await Message.create({
      threadId: thread2._id,
      senderId: sellerId,
      senderType: 'seller',
      content: 'No problem! Please provide the new contact details and I\'ll update the order immediately.',
      status: 'read',
      readBy: [buyer2._id, sellerId],
    });

    const thread3 = await MessageThread.create({
      sellerId,
      buyerId: buyer3._id,
      subject: 'RFQ: Annual subscription & support',
      type: 'rfq',
      status: 'active',
      lastMessageAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      lastMessagePreview: 'Can you share enterprise pricing for 3 regions?',
      sellerUnreadCount: 0,
      buyerUnreadCount: 0,
    });

    await Message.create({
      threadId: thread3._id,
      senderId: buyer3._id,
      senderType: 'buyer',
      content: 'Can you share enterprise pricing for 3 regions? We\'re looking at expanding our operations.',
      status: 'read',
      readBy: [sellerId],
    });

    await Message.create({
      threadId: thread3._id,
      senderId: sellerId,
      senderType: 'seller',
      content: 'I\'ll prepare a comprehensive quote for all 3 regions. Should I include volume discounts?',
      status: 'read',
      readBy: [buyer3._id, sellerId],
    });

    return res.json({
      message: 'Test threads created successfully',
      threadsCreated: 3,
    });
  } catch (error: any) {
    console.error('Seed test threads error:', error);
    return res.status(500).json({ message: 'Failed to seed test threads', error: error.message });
  }
}

/**
 * Edit a message
 */
export async function editMessage(req: AuthenticatedRequest, res: Response) {
  try {
    const sellerId = getSellerId(req);
    if (!sellerId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { threadId, messageId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(threadId) || !mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ message: 'Invalid thread or message ID' });
    }

    const validation = editMessageSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: 'Validation error',
        errors: validation.error.issues,
      });
    }

    // Verify thread belongs to seller
    const thread = await MessageThread.findOne({
      _id: threadId,
      sellerId,
    });

    if (!thread) {
      return res.status(404).json({ message: 'Thread not found' });
    }

    // Verify message exists and belongs to seller
    const message = await Message.findOne({
      _id: messageId,
      threadId,
      senderId: sellerId,
      isDeleted: false,
    });

    if (!message) {
      return res.status(404).json({ message: 'Message not found or cannot be edited' });
    }

    // Update message
    message.content = validation.data.content;
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();
    await message.populate('senderId', 'fullName email avatarUrl');

    // Emit WebSocket event
    await websocketService.emitThreadUpdate(threadId, {
      messageId: messageId,
      action: 'edited',
      message: message,
    });

    return res.json({ message });
  } catch (error: any) {
    console.error('Edit message error:', error);
    return res.status(500).json({ message: 'Failed to edit message', error: error.message });
  }
}

/**
 * Delete a message (soft delete)
 */
export async function deleteMessage(req: AuthenticatedRequest, res: Response) {
  try {
    const sellerId = getSellerId(req);
    if (!sellerId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { threadId, messageId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(threadId) || !mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ message: 'Invalid thread or message ID' });
    }

    // Verify thread belongs to seller
    const thread = await MessageThread.findOne({
      _id: threadId,
      sellerId,
    });

    if (!thread) {
      return res.status(404).json({ message: 'Thread not found' });
    }

    // Verify message exists and belongs to seller
    const message = await Message.findOne({
      _id: messageId,
      threadId,
      senderId: sellerId,
    });

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Soft delete message
    message.isDeleted = true;
    message.deletedAt = new Date();
    message.content = 'This message was deleted';
    await message.save();

    // Emit WebSocket event
    await websocketService.emitThreadUpdate(threadId, {
      messageId: messageId,
      action: 'deleted',
    });

    return res.json({ message: 'Message deleted successfully' });
  } catch (error: any) {
    console.error('Delete message error:', error);
    return res.status(500).json({ message: 'Failed to delete message', error: error.message });
  }
}

/**
 * React to a message (add/remove emoji reaction)
 */
export async function reactToMessage(req: AuthenticatedRequest, res: Response) {
  try {
    const sellerId = getSellerId(req);
    if (!sellerId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { threadId, messageId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(threadId) || !mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ message: 'Invalid thread or message ID' });
    }

    const validation = reactToMessageSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: 'Validation error',
        errors: validation.error.issues,
      });
    }

    const { emoji } = validation.data;

    // Verify thread belongs to seller
    const thread = await MessageThread.findOne({
      _id: threadId,
      sellerId,
    });

    if (!thread) {
      return res.status(404).json({ message: 'Thread not found' });
    }

    // Get message
    const message = await Message.findOne({
      _id: messageId,
      threadId,
      isDeleted: false,
    });

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Check if user already reacted with this emoji
    const existingReaction = message.reactions.find(
      (r) => r.emoji === emoji && r.userId.toString() === sellerId.toString()
    );

    if (existingReaction) {
      // Remove reaction
      message.reactions = message.reactions.filter(
        (r) => !(r.emoji === emoji && r.userId.toString() === sellerId.toString())
      );
    } else {
      // Add reaction
      message.reactions.push({
        emoji,
        userId: sellerId,
        createdAt: new Date(),
      });
    }

    await message.save();
    await message.populate('senderId', 'fullName email avatarUrl');

    // Emit WebSocket event
    await websocketService.emitThreadUpdate(threadId, {
      messageId: messageId,
      action: 'reaction',
      reactions: message.reactions,
    });

    return res.json({ message, reactions: message.reactions });
  } catch (error: any) {
    console.error('React to message error:', error);
    return res.status(500).json({ message: 'Failed to react to message', error: error.message });
  }
}

/**
 * Forward a message to another thread
 */
export async function forwardMessage(req: AuthenticatedRequest, res: Response) {
  try {
    const sellerId = getSellerId(req);
    if (!sellerId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { threadId, messageId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(threadId) || !mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ message: 'Invalid thread or message ID' });
    }

    const validation = forwardMessageSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: 'Validation error',
        errors: validation.error.issues,
      });
    }

    const { targetThreadId } = validation.data;

    // Verify source thread belongs to seller
    const sourceThread = await MessageThread.findOne({
      _id: threadId,
      sellerId,
    });

    if (!sourceThread) {
      return res.status(404).json({ message: 'Source thread not found' });
    }

    // Verify target thread belongs to seller
    const targetThread = await MessageThread.findOne({
      _id: targetThreadId,
      sellerId,
    });

    if (!targetThread) {
      return res.status(404).json({ message: 'Target thread not found' });
    }

    // Get original message
    const originalMessage = await Message.findOne({
      _id: messageId,
      threadId,
      isDeleted: false,
    }).populate('senderId', 'fullName email avatarUrl');

    if (!originalMessage) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Create forwarded message
    const forwardedMessageData: any = {
      threadId: new mongoose.Types.ObjectId(targetThreadId),
      senderId: sellerId,
      senderType: 'seller',
      content: originalMessage.content,
      attachments: originalMessage.attachments,
      forwardedFrom: {
        threadId: threadId,
        messageId: messageId,
        originalSender: originalMessage.senderId,
      },
      status: 'sent',
      readBy: [sellerId],
    };
    const forwardedMessage = await Message.create(forwardedMessageData);

    await (forwardedMessage as any).populate('senderId', 'fullName email avatarUrl');

    // Update target thread
    const preview = originalMessage.content.length > 200
      ? originalMessage.content.substring(0, 200) + '...'
      : originalMessage.content;
    await MessageThread.updateOne(
      { _id: targetThreadId },
      {
        $set: {
          lastMessageAt: new Date(),
          lastMessagePreview: preview,
          buyerUnreadCount: (targetThread.buyerUnreadCount || 0) + 1,
        },
      }
    );

    // Emit WebSocket events
    await websocketService.emitNewMessage(targetThreadId, forwardedMessage);
    await websocketService.emitThreadUpdate(threadId, {
      messageId: messageId,
      action: 'forwarded',
    });

    return res.status(201).json({ message: forwardedMessage });
  } catch (error: any) {
    console.error('Forward message error:', error);
    return res.status(500).json({ message: 'Failed to forward message', error: error.message });
  }
}

/**
 * Update message status (delivered, read)
 */
export async function updateMessageStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const sellerId = getSellerId(req);
    if (!sellerId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { threadId, messageId } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(threadId) || !mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ message: 'Invalid thread or message ID' });
    }

    if (!['delivered', 'read'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be "delivered" or "read"' });
    }

    // Verify thread belongs to seller
    const thread = await MessageThread.findOne({
      _id: threadId,
      sellerId,
    });

    if (!thread) {
      return res.status(404).json({ message: 'Thread not found' });
    }

    // Update message status
    const updateData: any = { status };
    if (status === 'read') {
      updateData.$addToSet = { readBy: sellerId };
      updateData.readAt = new Date();
    }

    const message = await Message.findOneAndUpdate(
      { _id: messageId, threadId },
      { $set: updateData },
      { new: true }
    )
      .populate('senderId', 'fullName email avatarUrl')
      .lean();

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Emit WebSocket event
    await websocketService.emitThreadUpdate(threadId, {
      messageId: messageId,
      action: 'status_update',
      status: status,
    });

    return res.json({ message });
  } catch (error: any) {
    console.error('Update message status error:', error);
    return res.status(500).json({ message: 'Failed to update message status', error: error.message });
  }
}

