import { Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth';
import { SupportTicket, ISupportTicket } from '../models/SupportTicket';
import mongoose from 'mongoose';

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
const createTicketSchema = z.object({
  subject: z.string().min(3, 'Subject must be at least 3 characters').max(200, 'Subject must be less than 200 characters'),
  category: z.enum(['technical', 'billing', 'account', 'product', 'payout', 'verification', 'other']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  description: z.string().min(10, 'Description must be at least 10 characters').max(5000, 'Description must be less than 5000 characters'),
  tags: z.array(z.string()).optional(),
  relatedOrderId: z.string().optional(),
  relatedProductId: z.string().optional(),
});

const updateTicketSchema = z.object({
  subject: z.string().min(3).max(200).optional(),
  category: z.enum(['technical', 'billing', 'account', 'product', 'payout', 'verification', 'other']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  status: z.enum(['open', 'in_progress', 'waiting_customer', 'resolved', 'closed']).optional(),
  tags: z.array(z.string()).optional(),
});

const addMessageSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(5000, 'Message must be less than 5000 characters'),
  attachments: z.array(z.string()).optional(),
  isInternal: z.boolean().optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(['open', 'in_progress', 'waiting_customer', 'resolved', 'closed']),
});

const satisfactionSchema = z.object({
  rating: z.number().min(1).max(5),
  feedback: z.string().max(1000).optional(),
});

/**
 * Get all tickets for the seller
 */
export async function getTickets(req: AuthenticatedRequest, res: Response) {
  try {
    const sellerId = getSellerId(req);
    if (!sellerId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const {
      status,
      category,
      priority,
      search,
      page = '1',
      limit = '20',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const query: any = { sellerId };

    // Filters
    if (status && typeof status === 'string') {
      query.status = status;
    }
    if (category && typeof category === 'string') {
      query.category = category;
    }
    if (priority && typeof priority === 'string') {
      query.priority = priority;
    }
    if (search && typeof search === 'string') {
      query.$or = [
        { subject: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { ticketNumber: { $regex: search, $options: 'i' } },
      ];
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const sort: any = {};
    sort[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

    const [tickets, total] = await Promise.all([
      SupportTicket.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .populate('assignedTo', 'fullName email')
        .lean(),
      SupportTicket.countDocuments(query),
    ]);

    // Filter out internal messages for seller
    const ticketsWithFilteredMessages = tickets.map((ticket: any) => ({
      ...ticket,
      messages: ticket.messages?.filter((msg: any) => !msg.isInternal) || [],
    }));

    return res.json({
      tickets: ticketsWithFilteredMessages,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    console.error('Get tickets error:', error);
    return res.status(500).json({ message: 'Failed to fetch tickets' });
  }
}

/**
 * Get a single ticket by ID
 */
export async function getTicket(req: AuthenticatedRequest, res: Response) {
  try {
    const sellerId = getSellerId(req);
    if (!sellerId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { ticketId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(ticketId)) {
      return res.status(400).json({ message: 'Invalid ticket ID' });
    }

    const ticket = await SupportTicket.findOne({
      _id: ticketId,
      sellerId,
    })
      .populate('assignedTo', 'fullName email')
      .populate('relatedOrderId', 'orderNumber')
      .populate('relatedProductId', 'name sku')
      .lean();

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Filter out internal messages for seller
    const filteredTicket = {
      ...ticket,
      messages: ticket.messages?.filter((msg: any) => !msg.isInternal) || [],
    };

    // Mark messages as read
    await SupportTicket.updateOne(
      { _id: ticketId },
      {
        $set: {
          'messages.$[].readBy': mongoose.Types.ObjectId.createFromHexString(sellerId.toString()),
        },
      }
    );

    return res.json({ ticket: filteredTicket });
  } catch (error: any) {
    console.error('Get ticket error:', error);
    return res.status(500).json({ message: 'Failed to fetch ticket' });
  }
}

/**
 * Create a new support ticket
 */
export async function createTicket(req: AuthenticatedRequest, res: Response) {
  try {
    const sellerId = getSellerId(req);
    if (!sellerId || !req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const validation = createTicketSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: 'Validation error',
        errors: validation.error.issues,
      });
    }

    const data = validation.data;

    // Create initial message from description
    const initialMessage = {
      senderId: sellerId,
      senderName: req.user.email || 'Seller',
      senderRole: 'seller' as const,
      message: data.description,
      attachments: req.body.attachments || [],
      createdAt: new Date(),
    };

    const ticket = await SupportTicket.create({
      sellerId,
      subject: data.subject,
      category: data.category,
      priority: data.priority || 'medium',
      description: data.description,
      messages: [initialMessage],
      tags: data.tags || [],
      relatedOrderId: data.relatedOrderId ? new mongoose.Types.ObjectId(data.relatedOrderId) : undefined,
      relatedProductId: data.relatedProductId ? new mongoose.Types.ObjectId(data.relatedProductId) : undefined,
      status: 'open',
    });

    return res.status(201).json({
      message: 'Ticket created successfully',
      ticket,
    });
  } catch (error: any) {
    console.error('Create ticket error:', error);
    return res.status(500).json({ message: 'Failed to create ticket' });
  }
}

/**
 * Add a message to a ticket
 */
export async function addMessage(req: AuthenticatedRequest, res: Response) {
  try {
    const sellerId = getSellerId(req);
    if (!sellerId || !req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { ticketId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(ticketId)) {
      return res.status(400).json({ message: 'Invalid ticket ID' });
    }

    const validation = addMessageSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: 'Validation error',
        errors: validation.error.issues,
      });
    }

    const ticket = await SupportTicket.findOne({
      _id: ticketId,
      sellerId,
    });

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Check if ticket is closed
    if (ticket.status === 'closed') {
      return res.status(400).json({ message: 'Cannot add message to closed ticket' });
    }

    const newMessage = {
      senderId: sellerId,
      senderName: req.user.email || 'Seller',
      senderRole: 'seller' as const,
      message: validation.data.message,
      attachments: validation.data.attachments || [],
      isInternal: false,
      createdAt: new Date(),
    };

    ticket.messages.push(newMessage as any);

    // Update status if it was resolved (closed tickets are already handled above)
    if (ticket.status === 'resolved') {
      ticket.status = 'open';
    }

    // Set first response time if this is the first admin response
    if (!ticket.firstResponseAt && ticket.assignedTo) {
      ticket.firstResponseAt = new Date();
    }

    await ticket.save();

    return res.json({
      message: 'Message added successfully',
      ticket,
    });
  } catch (error: any) {
    console.error('Add message error:', error);
    return res.status(500).json({ message: 'Failed to add message' });
  }
}

/**
 * Update ticket (seller can update subject, category, priority, tags)
 */
export async function updateTicket(req: AuthenticatedRequest, res: Response) {
  try {
    const sellerId = getSellerId(req);
    if (!sellerId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { ticketId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(ticketId)) {
      return res.status(400).json({ message: 'Invalid ticket ID' });
    }

    const validation = updateTicketSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: 'Validation error',
        errors: validation.error.issues,
      });
    }

    const ticket = await SupportTicket.findOne({
      _id: ticketId,
      sellerId,
    });

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Sellers can only update certain fields
    if (validation.data.subject) ticket.subject = validation.data.subject;
    if (validation.data.category) ticket.category = validation.data.category;
    if (validation.data.priority) ticket.priority = validation.data.priority;
    if (validation.data.tags) ticket.tags = validation.data.tags;

    // Sellers can only close their own tickets, not change to other statuses
    if (validation.data.status === 'closed') {
      ticket.status = 'closed';
      ticket.closedAt = new Date();
    }

    await ticket.save();

    return res.json({
      message: 'Ticket updated successfully',
      ticket,
    });
  } catch (error: any) {
    console.error('Update ticket error:', error);
    return res.status(500).json({ message: 'Failed to update ticket' });
  }
}

/**
 * Submit satisfaction rating
 */
export async function submitSatisfaction(req: AuthenticatedRequest, res: Response) {
  try {
    const sellerId = getSellerId(req);
    if (!sellerId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { ticketId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(ticketId)) {
      return res.status(400).json({ message: 'Invalid ticket ID' });
    }

    const validation = satisfactionSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: 'Validation error',
        errors: validation.error.issues,
      });
    }

    const ticket = await SupportTicket.findOne({
      _id: ticketId,
      sellerId,
    });

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    ticket.satisfactionRating = validation.data.rating;
    ticket.satisfactionFeedback = validation.data.feedback;

    await ticket.save();

    return res.json({
      message: 'Satisfaction rating submitted successfully',
      ticket,
    });
  } catch (error: any) {
    console.error('Submit satisfaction error:', error);
    return res.status(500).json({ message: 'Failed to submit satisfaction rating' });
  }
}

/**
 * Get ticket statistics
 */
export async function getTicketStats(req: AuthenticatedRequest, res: Response) {
  try {
    const sellerId = getSellerId(req);
    if (!sellerId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const [total, open, inProgress, resolved, closed] = await Promise.all([
      SupportTicket.countDocuments({ sellerId }),
      SupportTicket.countDocuments({ sellerId, status: 'open' }),
      SupportTicket.countDocuments({ sellerId, status: 'in_progress' }),
      SupportTicket.countDocuments({ sellerId, status: 'resolved' }),
      SupportTicket.countDocuments({ sellerId, status: 'closed' }),
    ]);

    return res.json({
      stats: {
        total,
        open,
        inProgress,
        resolved,
        closed,
      },
    });
  } catch (error: any) {
    console.error('Get ticket stats error:', error);
    return res.status(500).json({ message: 'Failed to fetch ticket statistics' });
  }
}

