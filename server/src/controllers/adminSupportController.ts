import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { SupportTicket } from '../models/SupportTicket';
import { Dispute } from '../models/Dispute';
import { FraudAlert } from '../models/FraudAlert';
import { SupportArticle } from '../models/SupportArticle';
import { SupportSettings } from '../models/SupportSettings';
import { User } from '../models/User';
import mongoose from 'mongoose';
import { createSystemInboxAndFanout } from '../services/systemInboxFanout';

function ensureAdmin(req: AuthenticatedRequest, res: Response): boolean {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ message: 'Forbidden: admin access required' });
    return false;
  }
  return true;
}

/** Map backend ticket status to frontend */
function ticketStatusToFrontend(status: string): 'open' | 'pending' | 'resolved' | 'closed' {
  if (status === 'open') return 'open';
  if (status === 'in_progress' || status === 'waiting_customer') return 'pending';
  if (status === 'resolved') return 'resolved';
  return 'closed';
}

/** Map backend category to display label */
function categoryLabel(cat: string): string {
  const map: Record<string, string> = {
    technical: 'Technical',
    billing: 'Payment',
    account: 'Account',
    product: 'Product Quality',
    payout: 'Payment',
    verification: 'Account',
    other: 'Other',
  };
  return map[cat] || cat;
}

/** GET /api/admin/support/dashboard */
export async function getDashboard(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      totalOpenTickets,
      newTicketsToday,
      pendingDisputes,
      fraudAlertsOpen,
      autoClosedCases,
      ticketsWithResponse,
      responseTimeSum,
      satisfactionTickets,
      satisfactionSum,
    ] = await Promise.all([
      SupportTicket.countDocuments({ status: { $in: ['open', 'in_progress', 'waiting_customer'] } }),
      SupportTicket.countDocuments({ createdAt: { $gte: startOfToday } }),
      Dispute.countDocuments({ status: { $nin: ['approved', 'rejected', 'resolved'] } }),
      FraudAlert.countDocuments({ status: { $in: ['open', 'investigating'] } }),
      SupportTicket.countDocuments({ status: 'closed' }),
      SupportTicket.countDocuments({ firstResponseAt: { $exists: true, $ne: null } }),
      SupportTicket.aggregate([
        { $match: { firstResponseAt: { $exists: true, $ne: null } } },
        { $project: { diff: { $subtract: ['$firstResponseAt', '$createdAt'] } } },
        { $group: { _id: null, totalMs: { $sum: '$diff' } } },
      ]),
      SupportTicket.countDocuments({ satisfactionRating: { $exists: true, $gte: 1 } }),
      SupportTicket.aggregate([
        { $match: { satisfactionRating: { $gte: 1 } } },
        { $group: { _id: null, sum: { $sum: '$satisfactionRating' } } },
      ]),
    ]);

    const avgResponseMs = responseTimeSum[0]?.totalMs ?? 0;
    const countWithResponse = ticketsWithResponse || 1;
    const avgResponseHours = avgResponseMs / (countWithResponse * 3600000);
    const satisfactionScore =
      satisfactionTickets > 0 && satisfactionSum[0]?.sum
        ? Math.round((satisfactionSum[0].sum / satisfactionTickets) * 10) / 10
        : 0;

    const ticketsByCategoryRaw = await SupportTicket.aggregate([
      { $match: { createdAt: { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) } } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);
    const ticketsByCategory = ticketsByCategoryRaw.map((r: any) => ({
      label: categoryLabel(r._id),
      value: r.count,
    }));

    const disputesByReason = await Dispute.aggregate([
      { $match: { createdAt: { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) } } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $project: { label: '$_id', value: '$count' } },
    ]);

    const metrics = {
      totalOpenTickets: totalOpenTickets,
      newTicketsToday: newTicketsToday,
      averageResponseTime: `${avgResponseHours.toFixed(1)} hours`,
      pendingDisputes,
      escalatedCases: 0,
      fraudAlerts: fraudAlertsOpen,
      autoClosedCases,
      satisfactionScore,
    };

    const realTime = {
      activeChats: 0,
      staffOnline: 0,
      highPriorityCases: await SupportTicket.countDocuments({
        status: { $in: ['open', 'in_progress'] },
        priority: 'urgent',
      }),
      systemAlerts: fraudAlertsOpen,
    };

    const distribution = {
      ticketsByCategory: ticketsByCategory.length ? ticketsByCategory : [
        { label: 'Payment', value: 0 },
        { label: 'Delivery', value: 0 },
        { label: 'Product Quality', value: 0 },
        { label: 'Refund', value: 0 },
        { label: 'Technical', value: 0 },
        { label: 'Other', value: 0 },
      ],
      disputesByReason: disputesByReason.length ? disputesByReason : [
        { label: 'Item Not Received', value: 0 },
        { label: 'Wrong Item', value: 0 },
        { label: 'Not as Described', value: 0 },
        { label: 'Shipping Delay', value: 0 },
      ],
      frequentProductIssues: [],
      problematicSellers: [],
    };

    return res.json({
      metrics,
      realTime,
      distribution,
    });
  } catch (error: any) {
    console.error('Admin support dashboard error:', error);
    return res.status(500).json({ message: 'Failed to load dashboard' });
  }
}

/** GET /api/admin/support/tickets */
export async function getTickets(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
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

    const query: any = {};
    if (status && typeof status === 'string' && status !== 'all') {
      if (status === 'pending') {
        query.status = { $in: ['in_progress', 'waiting_customer'] };
      } else {
        query.status = status;
      }
    }
    if (category && typeof category === 'string' && category !== 'all') query.category = category;
    if (priority && typeof priority === 'string' && priority !== 'all') query.priority = priority;
    if (search && typeof search === 'string') {
      query.$or = [
        { subject: { $regex: search, $options: 'i' } },
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
        .populate('sellerId', 'fullName email')
        .populate('assignedTo', 'fullName email')
        .lean(),
      SupportTicket.countDocuments(query),
    ]);

    const list = tickets.map((t: any) => ({
      id: t._id.toString(),
      ticketNumber: t.ticketNumber,
      userType: 'seller',
      userName: t.sellerId?.fullName ?? 'Seller',
      userEmail: t.sellerId?.email ?? '',
      subject: t.subject,
      category: categoryLabel(t.category),
      status: ticketStatusToFrontend(t.status),
      priority: t.priority,
      assignedTo: t.assignedTo ? (t.assignedTo as any).fullName : undefined,
      createdAt: t.createdAt,
      lastUpdated: t.updatedAt,
      orderId: t.relatedOrderId?.toString(),
      messageCount: t.messages?.length ?? 0,
    }));

    return res.json({
      tickets: list,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
    });
  } catch (error: any) {
    console.error('Admin get tickets error:', error);
    return res.status(500).json({ message: 'Failed to fetch tickets' });
  }
}

/** GET /api/admin/support/tickets/:ticketId */
export async function getTicket(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const { ticketId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(ticketId)) {
      return res.status(400).json({ message: 'Invalid ticket ID' });
    }

    const ticket = await SupportTicket.findById(ticketId)
      .populate('sellerId', 'fullName email')
      .populate('assignedTo', 'fullName email')
      .populate('relatedOrderId', 'orderNumber')
      .lean();

    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    const t = ticket as any;
    return res.json({
      ticket: {
        ...t,
        id: t._id.toString(),
        ticketNumber: t.ticketNumber,
        userType: 'seller',
        userName: t.sellerId?.fullName ?? 'Seller',
        userEmail: t.sellerId?.email ?? '',
        category: categoryLabel(t.category),
        status: ticketStatusToFrontend(t.status),
        assignedTo: t.assignedTo ? (t.assignedTo as any).fullName : undefined,
        messages: t.messages || [],
      },
    });
  } catch (error: any) {
    console.error('Admin get ticket error:', error);
    return res.status(500).json({ message: 'Failed to fetch ticket' });
  }
}

/** PUT /api/admin/support/tickets/:ticketId */
export async function updateTicket(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const { ticketId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(ticketId)) {
      return res.status(400).json({ message: 'Invalid ticket ID' });
    }

    const { status, priority, assignedTo } = req.body;
    const ticket = await SupportTicket.findById(ticketId);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
    const previousStatus = ticket.status;

    if (status) {
      ticket.status = status;
      if (status === 'resolved') ticket.resolvedAt = new Date();
      if (status === 'closed') ticket.closedAt = new Date();
    }
    if (priority) ticket.priority = priority;
    if (assignedTo !== undefined) {
      ticket.assignedTo = assignedTo ? new mongoose.Types.ObjectId(assignedTo) : undefined;
    }
    await ticket.save();

    if (status && previousStatus !== ticket.status && req.user?.id) {
      void createSystemInboxAndFanout({
        title: `Ticket ${ticket.ticketNumber} updated`,
        message: `Support ticket status is now: ${ticket.status}.`,
        type: 'info',
        priority: 'medium',
        targetAudience: 'specific_user',
        targetUserId: ticket.sellerId,
        createdBy: req.user.id,
      });
    }

    const updated = await SupportTicket.findById(ticketId)
      .populate('sellerId', 'fullName email')
      .populate('assignedTo', 'fullName email')
      .lean();

    return res.json({
      message: 'Ticket updated',
      ticket: updated,
    });
  } catch (error: any) {
    console.error('Admin update ticket error:', error);
    return res.status(500).json({ message: 'Failed to update ticket' });
  }
}

/** POST /api/admin/support/tickets/:ticketId/messages */
export async function addTicketMessage(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Authentication required' });

    const { ticketId } = req.params;
    const { message, isInternal } = req.body;
    if (!mongoose.Types.ObjectId.isValid(ticketId)) {
      return res.status(400).json({ message: 'Invalid ticket ID' });
    }
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ message: 'Message is required' });
    }

    const ticket = await SupportTicket.findById(ticketId);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
    if (ticket.status === 'closed') {
      return res.status(400).json({ message: 'Cannot add message to closed ticket' });
    }

    const user = await User.findById(userId).select('fullName email').lean();
    const newMessage = {
      senderId: new mongoose.Types.ObjectId(userId),
      senderName: (user as any)?.fullName || (user as any)?.email || 'Admin',
      senderRole: 'admin' as const,
      message: message.trim(),
      attachments: req.body.attachments || [],
      isInternal: !!isInternal,
      createdAt: new Date(),
    };

    ticket.messages.push(newMessage as any);
    if (!ticket.firstResponseAt) ticket.firstResponseAt = new Date();
    if (ticket.status === 'resolved') ticket.status = 'in_progress';
    await ticket.save();

    if (!newMessage.isInternal) {
      void createSystemInboxAndFanout({
        title: `Support update: ${ticket.ticketNumber}`,
        message: message.trim().slice(0, 800),
        type: 'info',
        priority: 'medium',
        targetAudience: 'specific_user',
        targetUserId: ticket.sellerId,
        createdBy: userId,
      });
    }

    const updated = await SupportTicket.findById(ticketId)
      .populate('sellerId', 'fullName email')
      .populate('assignedTo', 'fullName email')
      .lean();

    return res.json({ message: 'Reply added', ticket: updated });
  } catch (error: any) {
    console.error('Admin add ticket message error:', error);
    return res.status(500).json({ message: 'Failed to add message' });
  }
}

/** GET /api/admin/support/disputes */
export async function getDisputes(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const { status, type, page = '1', limit = '20' } = req.query;
    const query: any = {};
    if (status && status !== 'all') query.status = status;
    if (type && type !== 'all') query.type = type;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const [disputes, total] = await Promise.all([
      Dispute.find(query)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('orderId', 'orderNumber total')
        .populate('sellerId', 'fullName email')
        .populate('buyerId', 'fullName email')
        .lean(),
      Dispute.countDocuments(query),
    ]);

    return res.json({
      disputes,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
    });
  } catch (error: any) {
    console.error('Admin get disputes error:', error);
    return res.status(500).json({ message: 'Failed to fetch disputes' });
  }
}

/** GET /api/admin/support/disputes/:disputeId */
export async function getDispute(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const { disputeId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(disputeId)) {
      return res.status(400).json({ message: 'Invalid dispute ID' });
    }

    const dispute = await Dispute.findById(disputeId)
      .populate('orderId', 'orderNumber total items')
      .populate('sellerId', 'fullName email')
      .populate('buyerId', 'fullName email')
      .populate('resolvedBy', 'fullName email')
      .lean();

    if (!dispute) return res.status(404).json({ message: 'Dispute not found' });
    return res.json({ dispute });
  } catch (error: any) {
    console.error('Admin get dispute error:', error);
    return res.status(500).json({ message: 'Failed to fetch dispute' });
  }
}

/** POST /api/admin/support/disputes/:disputeId/resolve */
export async function resolveDispute(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const { disputeId } = req.params;
    const { decision, resolution } = req.body; // decision: 'approved' | 'rejected' | 'resolved'
    if (!mongoose.Types.ObjectId.isValid(disputeId)) {
      return res.status(400).json({ message: 'Invalid dispute ID' });
    }

    const dispute = await Dispute.findById(disputeId);
    if (!dispute) return res.status(404).json({ message: 'Dispute not found' });
    if (['approved', 'rejected', 'resolved'].includes(dispute.status)) {
      return res.status(400).json({ message: 'Dispute already resolved' });
    }

    const status = decision === 'resolved' ? 'resolved' : decision;
    if (!['approved', 'rejected', 'resolved'].includes(status)) {
      return res.status(400).json({ message: 'Invalid decision' });
    }

    dispute.adminDecision = resolution || decision;
    dispute.adminDecisionAt = new Date();
    dispute.status = status;
    dispute.resolvedAt = new Date();
    dispute.resolvedBy = new mongoose.Types.ObjectId(req.user!.id);
    dispute.resolution = resolution || '';
    await dispute.save();

    const updated = await Dispute.findById(disputeId)
      .populate('orderId', 'orderNumber total')
      .populate('sellerId', 'fullName email')
      .populate('buyerId', 'fullName email')
      .lean();

    return res.json({ message: 'Dispute resolved', dispute: updated });
  } catch (error: any) {
    console.error('Admin resolve dispute error:', error);
    return res.status(500).json({ message: 'Failed to resolve dispute' });
  }
}

/** GET /api/admin/support/staff */
export async function getStaff(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const admins = await User.find({ role: 'admin' }).select('fullName email').lean();
    const assignedCounts = await SupportTicket.aggregate([
      { $match: { assignedTo: { $exists: true, $ne: null } } },
      { $group: { _id: '$assignedTo', activeTickets: { $sum: 1 } } },
    ]);

    const countByUserId: Record<string, number> = {};
    assignedCounts.forEach((r: any) => {
      countByUserId[r._id.toString()] = r.activeTickets;
    });

    const resolvedCounts = await SupportTicket.aggregate([
      { $match: { status: 'resolved', assignedTo: { $exists: true, $ne: null } } },
      { $group: { _id: '$assignedTo', count: { $sum: 1 } } },
    ]);
    const resolvedByUserId: Record<string, number> = {};
    resolvedCounts.forEach((r: any) => {
      resolvedByUserId[r._id.toString()] = r.count;
    });

    const staff = admins.map((u: any) => ({
      id: u._id.toString(),
      name: u.fullName,
      email: u.email,
      role: 'Support Agent',
      status: 'offline',
      ticketsSolved: resolvedByUserId[u._id.toString()] ?? 0,
      avgResponseTime: '-',
      satisfactionScore: 0,
      activeTickets: countByUserId[u._id.toString()] ?? 0,
      permissions: ['tickets', 'disputes', 'chat'],
    }));

    return res.json({ staff });
  } catch (error: any) {
    console.error('Admin get staff error:', error);
    return res.status(500).json({ message: 'Failed to fetch staff' });
  }
}

/** GET /api/admin/support/articles */
export async function getArticles(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const { search, category, page = '1', limit = '50' } = req.query;
    const query: any = {};
    if (category && category !== 'all') query.category = category;
    if (search && typeof search === 'string') {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
      ];
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const [articles, total] = await Promise.all([
      SupportArticle.find(query)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('authorId', 'fullName')
        .populate('lastUpdatedBy', 'fullName')
        .lean(),
      SupportArticle.countDocuments(query),
    ]);

    const list = (articles as any[]).map((a) => ({
      id: a._id.toString(),
      title: a.title,
      content: a.content,
      category: a.category,
      visibility: a.visibility,
      views: a.views,
      lastUpdated: a.updatedAt,
      author: (a.authorId as any)?.fullName ?? 'Admin',
    }));

    return res.json({
      articles: list,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
    });
  } catch (error: any) {
    console.error('Admin get articles error:', error);
    return res.status(500).json({ message: 'Failed to fetch articles' });
  }
}

/** POST /api/admin/support/articles */
export async function createArticle(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Authentication required' });

    const { title, content, category, visibility } = req.body;
    if (!title || !content || !category) {
      return res.status(400).json({ message: 'Title, content, and category are required' });
    }

    const article = await SupportArticle.create({
      title,
      content,
      category: category || 'Other',
      visibility: visibility || 'public',
      authorId: new mongoose.Types.ObjectId(userId),
    });

    const populated = await SupportArticle.findById(article._id)
      .populate('authorId', 'fullName')
      .lean();

    return res.status(201).json({
      message: 'Article created',
      article: { ...(populated as any), id: (populated as any)._id.toString() },
    });
  } catch (error: any) {
    console.error('Admin create article error:', error);
    return res.status(500).json({ message: 'Failed to create article' });
  }
}

/** PUT /api/admin/support/articles/:articleId */
export async function updateArticle(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const { articleId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(articleId)) {
      return res.status(400).json({ message: 'Invalid article ID' });
    }

    const { title, content, category, visibility } = req.body;
    const article = await SupportArticle.findById(articleId);
    if (!article) return res.status(404).json({ message: 'Article not found' });

    if (title !== undefined) article.title = title;
    if (content !== undefined) article.content = content;
    if (category !== undefined) article.category = category;
    if (visibility !== undefined) article.visibility = visibility;
    article.lastUpdatedBy = new mongoose.Types.ObjectId(req.user!.id);
    await article.save();

    const updated = await SupportArticle.findById(articleId)
      .populate('authorId', 'fullName')
      .lean();

    return res.json({ message: 'Article updated', article: updated });
  } catch (error: any) {
    console.error('Admin update article error:', error);
    return res.status(500).json({ message: 'Failed to update article' });
  }
}

/** DELETE /api/admin/support/articles/:articleId */
export async function deleteArticle(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const { articleId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(articleId)) {
      return res.status(400).json({ message: 'Invalid article ID' });
    }

    const deleted = await SupportArticle.findByIdAndDelete(articleId);
    if (!deleted) return res.status(404).json({ message: 'Article not found' });
    return res.json({ message: 'Article deleted' });
  } catch (error: any) {
    console.error('Admin delete article error:', error);
    return res.status(500).json({ message: 'Failed to delete article' });
  }
}

/** GET /api/admin/support/alerts */
export async function getAlerts(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const { status, severity, type, search, page = '1', limit = '50' } = req.query;
    const query: any = {};
    if (status && status !== 'all') query.status = status;
    if (severity && severity !== 'all') query.severity = severity;
    if (type && type !== 'all') query.type = type;
    if (search && typeof search === 'string') {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { entityName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const [alerts, total] = await Promise.all([
      FraudAlert.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      FraudAlert.countDocuments(query),
    ]);

    const list = (alerts as any[]).map((a) => {
      const { _id, ...rest } = a;
      return { ...rest, id: _id.toString(), createdAt: a.createdAt };
    });

    return res.json({
      alerts: list,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
    });
  } catch (error: any) {
    console.error('Admin get alerts error:', error);
    return res.status(500).json({ message: 'Failed to fetch alerts' });
  }
}

/** POST /api/admin/support/alerts */
export async function createAlert(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const { type, severity, title, description, entityName, entityId } = req.body;
    if (!type || !severity || !title || !description || !entityName || !entityId) {
      return res.status(400).json({ message: 'type, severity, title, description, entityName, entityId are required' });
    }

    const alert = await FraudAlert.create({
      type,
      severity,
      title,
      description,
      entityName,
      entityId,
      status: 'open',
    });

    return res.status(201).json({ message: 'Alert created', alert });
  } catch (error: any) {
    console.error('Admin create alert error:', error);
    return res.status(500).json({ message: 'Failed to create alert' });
  }
}

/** PATCH /api/admin/support/alerts/:alertId */
export async function updateAlertStatus(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const { alertId } = req.params;
    const { status } = req.body;
    if (!mongoose.Types.ObjectId.isValid(alertId)) {
      return res.status(400).json({ message: 'Invalid alert ID' });
    }
    if (!['open', 'investigating', 'resolved', 'dismissed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const alert = await FraudAlert.findById(alertId);
    if (!alert) return res.status(404).json({ message: 'Alert not found' });

    alert.status = status;
    if (status === 'resolved' || status === 'dismissed') {
      alert.resolvedAt = new Date();
      alert.resolvedBy = new mongoose.Types.ObjectId(req.user!.id);
    }
    await alert.save();

    return res.json({ message: 'Alert updated', alert });
  } catch (error: any) {
    console.error('Admin update alert error:', error);
    return res.status(500).json({ message: 'Failed to update alert' });
  }
}

/** GET /api/admin/support/reports/analytics */
export async function getReportsAnalytics(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const { dateRange = 'week' } = req.query;
    const now = new Date();
    let days = 7;
    if (dateRange === 'month') days = 30;
    else if (dateRange === 'quarter') days = 90;
    else if (dateRange === 'year') days = 365;
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const [totalTickets, ticketVolume, categoryAgg, responseTimeAgg] = await Promise.all([
      SupportTicket.countDocuments({ createdAt: { $gte: startDate } }),
      SupportTicket.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, value: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      SupportTicket.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: '$category', value: { $sum: 1 } } },
        { $project: { label: '$_id', value: 1, _id: 0 } },
      ]),
      SupportTicket.aggregate([
        { $match: { firstResponseAt: { $exists: true }, createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%W', date: '$createdAt' } },
            avgHours: { $avg: { $divide: [{ $subtract: ['$firstResponseAt', '$createdAt'] }, 3600000] } },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const ticketVolumeFormatted = ticketVolume.map((r: any) => ({ label: r._id, value: r.value }));
    const commonIssues = categoryAgg.map((r: any) => ({ label: categoryLabel(r.label), value: r.value }));
    const responseTimeData = responseTimeAgg.map((r: any) => ({ label: r._id, value: Math.round(r.avgHours * 10) / 10 }));

    const avgResponseHours =
      responseTimeAgg.length > 0
        ? responseTimeAgg.reduce((acc: number, r: any) => acc + r.avgHours, 0) / responseTimeAgg.length
        : 0;

    return res.json({
      totalTickets,
      avgResponseTimeHours: Math.round(avgResponseHours * 10) / 10,
      ticketVolume: ticketVolumeFormatted,
      responseTimeByWeek: responseTimeData,
      commonIssues,
    });
  } catch (error: any) {
    console.error('Admin reports analytics error:', error);
    return res.status(500).json({ message: 'Failed to load analytics' });
  }
}

/** GET /api/admin/support/settings */
export async function getSettings(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    let settings = await SupportSettings.findOne().lean();
    if (!settings) {
      await SupportSettings.create({});
      settings = await SupportSettings.findOne().lean();
    }
    return res.json({ settings: settings || {} });
  } catch (error: any) {
    console.error('Admin get support settings error:', error);
    return res.status(500).json({ message: 'Failed to load settings' });
  }
}

/** PUT /api/admin/support/settings */
export async function updateSettings(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const { autoReplyTimeHours, autoCloseInactiveDays, slaResponseTimeHours } = req.body;

    const updated = await SupportSettings.findOneAndUpdate(
      {},
      {
        ...(autoReplyTimeHours !== undefined && { autoReplyTimeHours: Number(autoReplyTimeHours) }),
        ...(autoCloseInactiveDays !== undefined && { autoCloseInactiveDays: Number(autoCloseInactiveDays) }),
        ...(slaResponseTimeHours !== undefined && { slaResponseTimeHours: Number(slaResponseTimeHours) }),
      },
      { new: true, upsert: true }
    ).lean();

    return res.json({ message: 'Settings saved', settings: updated });
  } catch (error: any) {
    console.error('Admin update support settings error:', error);
    return res.status(500).json({ message: 'Failed to save settings' });
  }
}

/** GET /api/admin/support/chats - placeholder for live chat */
export async function getChats(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    return res.json({ chats: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to load chats' });
  }
}
