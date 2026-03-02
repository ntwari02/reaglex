import { Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth';
import { MessageThread, Message, IMessageThread, IMessage } from '../models/MessageThread';
import mongoose from 'mongoose';
import { websocketService } from '../services/websocketService';

// Helper to get buyer ID from request
const getBuyerId = (req: AuthenticatedRequest): mongoose.Types.ObjectId | null => {
  if (!req.user?.id) return null;
  try {
    return new mongoose.Types.ObjectId(req.user.id);
  } catch {
    return null;
  }
};

// Validation schemas
const createThreadSchema = z.object({
  sellerId: z.string().min(1, 'Seller ID is required'),
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
 * Get all threads for the buyer
 */
export async function getThreads(req: AuthenticatedRequest, res: Response) {
  try {
    const buyerId = getBuyerId(req);
    if (!buyerId) {
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

    const query: any = { buyerId };

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
        .populate('sellerId', 'fullName email avatarUrl storeName')
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
    const buyerId = getBuyerId(req);
    if (!buyerId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { threadId } = req.params;
    const { page = '1', limit = '50' } = req.query;

    if (!mongoose.Types.ObjectId.isValid(threadId)) {
      return res.status(400).json({ message: 'Invalid thread ID' });
    }

    const thread = await MessageThread.findOne({
      _id: threadId,
      buyerId,
    })
      .populate('sellerId', 'fullName email avatarUrl storeName')
      .lean();

    if (!thread) {
      return res.status(404).json({ message: 'Thread not found' });
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const [messages, total] = await Promise.all([
      Message.find({ threadId, isDeleted: false })
        .populate('senderId', 'fullName email avatarUrl')
        .populate('replyTo', 'content senderId senderType')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Message.countDocuments({ threadId, isDeleted: false }),
    ]);

    // Reverse to show oldest first
    messages.reverse();

    return res.json({
      thread,
      messages,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    console.error('Get thread error:', error);
    return res.status(500).json({ message: 'Failed to fetch thread', error: error.message });
  }
}

/**
 * Create a new thread (buyer initiates)
 */
export async function createThread(req: AuthenticatedRequest, res: Response) {
  try {
    const buyerId = getBuyerId(req);
    if (!buyerId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const validated = createThreadSchema.parse(req.body);
    const { sellerId, subject, type = 'message', relatedOrderId, relatedRfqId } = validated;

    if (!mongoose.Types.ObjectId.isValid(sellerId)) {
      return res.status(400).json({ message: 'Invalid seller ID' });
    }

    // Check if thread already exists
    const existingThread = await MessageThread.findOne({
      buyerId,
      sellerId,
      subject,
      status: { $in: ['active', 'archived'] },
    })
      .populate('sellerId', 'fullName email avatarUrl storeName')
      .lean();

    if (existingThread) {
      return res.json({ thread: existingThread });
    }

    const thread = await MessageThread.create({
      sellerId,
      buyerId,
      subject,
      type,
      relatedOrderId: relatedOrderId ? new mongoose.Types.ObjectId(relatedOrderId) : undefined,
      relatedRfqId: relatedRfqId ? new mongoose.Types.ObjectId(relatedRfqId) : undefined,
      status: 'active',
      lastMessageAt: new Date(),
      lastMessagePreview: '',
      sellerUnreadCount: 1,
      buyerUnreadCount: 0,
    });

    const populatedThread = await MessageThread.findById(thread._id)
      .populate('sellerId', 'fullName email avatarUrl storeName')
      .lean();

    // Emit WebSocket event
    await websocketService.emitThreadUpdate(thread._id.toString(), populatedThread);

    return res.status(201).json({ thread: populatedThread });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.issues });
    }
    console.error('Create thread error:', error);
    return res.status(500).json({ message: 'Failed to create thread', error: error.message });
  }
}

/**
 * Send a message in a thread
 */
export async function sendMessage(req: AuthenticatedRequest, res: Response) {
  try {
    const buyerId = getBuyerId(req);
    if (!buyerId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { threadId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(threadId)) {
      return res.status(400).json({ message: 'Invalid thread ID' });
    }

    const thread = await MessageThread.findOne({
      _id: threadId,
      buyerId,
    });

    if (!thread) {
      return res.status(404).json({ message: 'Thread not found' });
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

    // Process attachments - determine type
    console.log('[Controller] Processing', attachments.length, 'attachment(s)');
    const processedAttachments = attachments.map((att: any, index: number) => {
      console.log(`[Controller] Attachment ${index + 1}:`, {
        filename: att.filename,
        originalName: att.originalName,
        path: att.path,
        mimetype: att.mimetype,
        type: att.type,
      });
      
      const isAudio = att.mimetype?.startsWith('audio/') || att.type === 'voice';
      const isImage = att.mimetype?.startsWith('image/') || att.type === 'image';
      
      return {
        filename: att.filename || att.path?.split('/').pop() || '',
        originalName: att.originalName || att.filename || '',
        path: att.path || `/uploads/inbox/${att.filename}`,
        size: att.size || 0,
        mimetype: att.mimetype || 'application/octet-stream',
        type: isAudio ? 'voice' : isImage ? 'image' : 'file',
        duration: att.duration,
        uploadedAt: new Date(),
      };
    });
    console.log('[Controller] Processed', processedAttachments.length, 'attachment(s)');

    // Create message - WhatsApp style: allow empty content if attachments exist
    const messageContent = (content ? String(content).trim() : '') || ''; // Always ensure it's a string, default to empty
    console.log('[Controller] Creating message with content length:', messageContent.length, 'and', processedAttachments.length, 'attachment(s)');
    
    if (!messageContent && processedAttachments.length === 0) {
      console.error('[Controller] ERROR: Both content and attachments are empty!');
      return res.status(400).json({
        message: 'Message must have either content or attachments',
      });
    }
    
    const messageData: any = {
      threadId: thread._id,
      senderId: buyerId,
      senderType: 'buyer',
      content: messageContent, // Can be empty string if attachments exist - always explicitly set
      attachments: processedAttachments,
      readBy: [buyerId],
      status: 'sent',
    };

    if (replyTo && mongoose.Types.ObjectId.isValid(replyTo)) {
      messageData.replyTo = new mongoose.Types.ObjectId(replyTo);
    }

    if (forwardedFrom) {
      messageData.forwardedFrom = {
        threadId: new mongoose.Types.ObjectId(forwardedFrom.threadId),
        messageId: new mongoose.Types.ObjectId(forwardedFrom.messageId),
        originalSender: buyerId,
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
    
    thread.lastMessageAt = new Date();
    thread.lastMessagePreview = preview;
    thread.sellerUnreadCount = (thread.sellerUnreadCount || 0) + 1;
    thread.buyerUnreadCount = 0;
    await thread.save();

    // Populate message
    const messageId = (message as any)._id;
    const populatedMessage = await Message.findById(messageId)
      .populate('senderId', 'fullName email avatarUrl')
      .populate('replyTo', 'content senderId senderType')
      .lean();

    // Emit WebSocket event - both seller and buyer get it instantly
    await websocketService.emitNewMessage(threadId, populatedMessage);
    await websocketService.emitThreadUpdate(threadId, thread.toObject());

    // Update message status to 'delivered' after a short delay (simulating delivery)
    setTimeout(async () => {
      await Message.updateOne({ _id: messageId }, { status: 'delivered' });
      const updatedMessage = await Message.findById(messageId)
        .populate('senderId', 'fullName email avatarUrl')
        .populate('replyTo', 'content senderId senderType')
        .lean();
      if (updatedMessage) {
        await websocketService.emitNewMessage(threadId, updatedMessage);
      }
    }, 500);

    return res.status(201).json({ message: populatedMessage });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.issues });
    }
    console.error('Send message error:', error);
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
    const buyerId = getBuyerId(req);
    if (!buyerId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { threadId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(threadId)) {
      return res.status(400).json({ message: 'Invalid thread ID' });
    }

    const thread = await MessageThread.findOne({
      _id: threadId,
      buyerId,
    });

    if (!thread) {
      return res.status(404).json({ message: 'Thread not found' });
    }

    // Mark all messages as read
    await Message.updateMany(
      { threadId, senderType: 'seller', readBy: { $ne: buyerId } },
      { $addToSet: { readBy: buyerId }, $set: { status: 'read', readAt: new Date() } }
    );

    // Update thread unread count
    thread.buyerUnreadCount = 0;
    await thread.save();

    await websocketService.emitThreadUpdate(threadId, thread.toObject());

    return res.json({ message: 'Thread marked as read' });
  } catch (error: any) {
    console.error('Mark thread as read error:', error);
    return res.status(500).json({ message: 'Failed to mark thread as read', error: error.message });
  }
}

/**
 * Update thread
 */
export async function updateThread(req: AuthenticatedRequest, res: Response) {
  try {
    const buyerId = getBuyerId(req);
    if (!buyerId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { threadId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(threadId)) {
      return res.status(400).json({ message: 'Invalid thread ID' });
    }

    const validated = updateThreadSchema.parse(req.body);
    const thread = await MessageThread.findOneAndUpdate(
      { _id: threadId, buyerId },
      validated,
      { new: true }
    )
      .populate('sellerId', 'fullName email avatarUrl storeName')
      .lean();

    if (!thread) {
      return res.status(404).json({ message: 'Thread not found' });
    }

    await websocketService.emitThreadUpdate(threadId, thread);

    return res.json({ thread });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.issues });
    }
    console.error('Update thread error:', error);
    return res.status(500).json({ message: 'Failed to update thread', error: error.message });
  }
}

/**
 * Delete thread (soft delete - archive)
 */
export async function deleteThread(req: AuthenticatedRequest, res: Response) {
  try {
    const buyerId = getBuyerId(req);
    if (!buyerId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { threadId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(threadId)) {
      return res.status(400).json({ message: 'Invalid thread ID' });
    }

    const thread = await MessageThread.findOneAndUpdate(
      { _id: threadId, buyerId },
      { status: 'archived' },
      { new: true }
    );

    if (!thread) {
      return res.status(404).json({ message: 'Thread not found' });
    }

    await websocketService.emitThreadUpdate(threadId, thread.toObject());

    return res.json({ message: 'Thread archived' });
  } catch (error: any) {
    console.error('Delete thread error:', error);
    return res.status(500).json({ message: 'Failed to delete thread', error: error.message });
  }
}

/**
 * Edit a message
 */
export async function editMessage(req: AuthenticatedRequest, res: Response) {
  try {
    const buyerId = getBuyerId(req);
    if (!buyerId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { threadId, messageId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(threadId) || !mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ message: 'Invalid thread or message ID' });
    }

    const thread = await MessageThread.findOne({ _id: threadId, buyerId });
    if (!thread) {
      return res.status(404).json({ message: 'Thread not found' });
    }

    const validated = editMessageSchema.parse(req.body);
    const message = await Message.findOneAndUpdate(
      { _id: messageId, threadId, senderId: buyerId, senderType: 'buyer' },
      {
        content: validated.content,
        isEdited: true,
        editedAt: new Date(),
      },
      { new: true }
    )
      .populate('senderId', 'fullName email avatarUrl')
      .populate('replyTo', 'content senderId senderType')
      .lean();

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    await websocketService.getIO()?.to(`thread:${threadId}`).emit('message_updated', {
      threadId,
      messageId,
      message,
    });

    return res.json({ message });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.issues });
    }
    console.error('Edit message error:', error);
    return res.status(500).json({ message: 'Failed to edit message', error: error.message });
  }
}

/**
 * Delete a message (soft delete)
 */
export async function deleteMessage(req: AuthenticatedRequest, res: Response) {
  try {
    const buyerId = getBuyerId(req);
    if (!buyerId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { threadId, messageId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(threadId) || !mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ message: 'Invalid thread or message ID' });
    }

    const thread = await MessageThread.findOne({ _id: threadId, buyerId });
    if (!thread) {
      return res.status(404).json({ message: 'Thread not found' });
    }

    const message = await Message.findOneAndUpdate(
      { _id: messageId, threadId, senderId: buyerId, senderType: 'buyer' },
      {
        isDeleted: true,
        deletedAt: new Date(),
      },
      { new: true }
    ).lean();

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    await websocketService.getIO()?.to(`thread:${threadId}`).emit('message_deleted', {
      threadId,
      messageId,
    });

    return res.json({ message: 'Message deleted' });
  } catch (error: any) {
    console.error('Delete message error:', error);
    return res.status(500).json({ message: 'Failed to delete message', error: error.message });
  }
}

/**
 * React to a message
 */
export async function reactToMessage(req: AuthenticatedRequest, res: Response) {
  try {
    const buyerId = getBuyerId(req);
    if (!buyerId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { threadId, messageId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(threadId) || !mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ message: 'Invalid thread or message ID' });
    }

    const thread = await MessageThread.findOne({ _id: threadId, buyerId });
    if (!thread) {
      return res.status(404).json({ message: 'Thread not found' });
    }

    const validated = reactToMessageSchema.parse(req.body);
    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Toggle reaction
    const buyerIdStr = buyerId.toString();
    const existingReactionIndex = message.reactions.findIndex(
      (r) => r.userId.toString() === buyerIdStr && r.emoji === validated.emoji
    );

    if (existingReactionIndex >= 0) {
      // Remove reaction
      message.reactions.splice(existingReactionIndex, 1);
    } else {
      // Add reaction
      message.reactions.push({
        emoji: validated.emoji,
        userId: buyerId,
        createdAt: new Date(),
      });
    }

    await message.save();

    const populatedMessage = await Message.findById(messageId)
      .populate('senderId', 'fullName email avatarUrl')
      .populate('replyTo', 'content senderId senderType')
      .lean();

    await websocketService.getIO()?.to(`thread:${threadId}`).emit('message_reacted', {
      threadId,
      messageId,
      message: populatedMessage,
    });

    return res.json({ message: populatedMessage, reactions: populatedMessage?.reactions || [] });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.issues });
    }
    console.error('React to message error:', error);
    return res.status(500).json({ message: 'Failed to react to message', error: error.message });
  }
}

/**
 * Forward a message
 */
export async function forwardMessage(req: AuthenticatedRequest, res: Response) {
  try {
    const buyerId = getBuyerId(req);
    if (!buyerId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { threadId, messageId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(threadId) || !mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ message: 'Invalid thread or message ID' });
    }

    const validated = forwardMessageSchema.parse(req.body);
    const sourceMessage = await Message.findById(messageId);

    if (!sourceMessage) {
      return res.status(404).json({ message: 'Source message not found' });
    }

    const targetThread = await MessageThread.findOne({
      _id: validated.targetThreadId,
      buyerId,
    });

    if (!targetThread) {
      return res.status(404).json({ message: 'Target thread not found' });
    }

    const forwardedMessage = await Message.create({
      threadId: targetThread._id,
      senderId: buyerId,
      senderType: 'buyer',
      content: sourceMessage.content,
      attachments: sourceMessage.attachments,
      forwardedFrom: {
        threadId: sourceMessage.threadId,
        messageId: sourceMessage._id,
        originalSender: sourceMessage.senderId,
      },
      status: 'sent',
      readBy: [buyerId],
    });

    // Update target thread
    targetThread.lastMessageAt = new Date();
    targetThread.lastMessagePreview = sourceMessage.content.substring(0, 200);
    targetThread.sellerUnreadCount = (targetThread.sellerUnreadCount || 0) + 1;
    await targetThread.save();

    const populatedMessage = await Message.findById(forwardedMessage._id)
      .populate('senderId', 'fullName email avatarUrl')
      .lean();

    await websocketService.emitNewMessage(validated.targetThreadId, populatedMessage);
    await websocketService.emitThreadUpdate(validated.targetThreadId, targetThread.toObject());

    return res.json({ message: populatedMessage });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.issues });
    }
    console.error('Forward message error:', error);
    return res.status(500).json({ message: 'Failed to forward message', error: error.message });
  }
}

/**
 * Get available sellers (for creating new threads)
 */
export async function getAvailableSellers(req: AuthenticatedRequest, res: Response) {
  try {
    const User = mongoose.model('User');
    const sellers = await User.find({ role: 'seller' })
      .select('fullName email avatarUrl storeName')
      .limit(100)
      .lean();

    return res.json({ sellers });
  } catch (error: any) {
    console.error('Get sellers error:', error);
    return res.status(500).json({ message: 'Failed to fetch sellers', error: error.message });
  }
}

/**
 * Get inbox statistics
 */
export async function getInboxStats(req: AuthenticatedRequest, res: Response) {
  try {
    const buyerId = getBuyerId(req);
    if (!buyerId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const [totalThreads, unreadThreads, activeThreads, archivedThreads] = await Promise.all([
      MessageThread.countDocuments({ buyerId }),
      MessageThread.countDocuments({ buyerId, buyerUnreadCount: { $gt: 0 } }),
      MessageThread.countDocuments({ buyerId, status: 'active' }),
      MessageThread.countDocuments({ buyerId, status: 'archived' }),
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

