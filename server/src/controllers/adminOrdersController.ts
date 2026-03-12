import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { Order } from '../models/Order';
import mongoose from 'mongoose';

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

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Derive payment status from order payment/escrow */
function getPaymentStatus(o: any): string {
  if (o.escrow?.status === 'REFUNDED') return 'refunded';
  if (o.payment?.paidAt || o.payment?.amount) return 'paid';
  return 'unpaid';
}

/** Map Order document to admin list/detail shape */
function toOrderShape(o: any): Record<string, unknown> {
  const id = toId(o);
  const paymentStatus = getPaymentStatus(o);
  const paymentMethod = (o.paymentMethod || o.payment?.method || '').toLowerCase();
  const isCod = paymentMethod.includes('cash') || paymentMethod.includes('cod');
  const orderDate = o.date ? new Date(o.date).toISOString().split('T')[0] : (o.createdAt ? new Date(o.createdAt).toISOString().split('T')[0] : '');
  const deliveryEstimate = o.date ? new Date(new Date(o.date).getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : '';

  return {
    id,
    _id: id,
    orderId: o.orderNumber || id,
    customerName: o.customer,
    customerEmail: o.customerEmail,
    customerPhone: o.customerPhone,
    orderDate,
    status: o.status,
    paymentStatus,
    paymentMethod: o.paymentMethod || o.payment?.method || 'card',
    totalAmount: o.total ?? 0,
    itemsCount: Array.isArray(o.items) ? o.items.length : 0,
    sellerName: o.sellerName || '',
    sellerId: o.sellerId ? toId(o.sellerId) : null,
    shippingMethod: 'Standard Shipping',
    deliveryDateEstimate: deliveryEstimate,
    trackingNumber: o.trackingNumber,
    city: o.shippingAddress?.city || '',
    isHighValue: (o.total ?? 0) >= 500,
    isCod,
    isFulfilled: o.status === 'delivered',
    items: o.items || [],
    subtotal: o.subtotal,
    shipping: o.shipping,
    tax: o.tax,
    total: o.total,
    shippingAddress: o.shippingAddress,
    timeline: o.timeline || [],
    payment: o.payment,
    escrow: o.escrow,
    fees: o.fees,
    payout: o.payout,
    buyerId: o.buyerId ? toId(o.buyerId) : null,
  };
}

/** GET /api/admin/orders/dashboard */
export async function getDashboard(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalToday,
      pendingCount,
      revenueTodayAgg,
      cancelledCount,
    ] = await Promise.all([
      Order.countDocuments({ date: { $gte: startOfToday } }),
      Order.countDocuments({ status: 'pending' }),
      Order.aggregate([
        { $match: { date: { $gte: startOfToday } } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
      Order.countDocuments({ status: 'cancelled' }),
    ]);

    const revenueToday = revenueTodayAgg[0]?.total ?? 0;

    res.json({
      totalOrdersToday: totalToday,
      pendingOrders: pendingCount,
      revenueToday,
      cancelledOrders: cancelledCount,
    });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to fetch dashboard' });
  }
}

/** GET /api/admin/orders/facets - distinct sellers and cities */
export async function getOrderFacets(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const [sellers, cities] = await Promise.all([
      Order.aggregate([
        { $match: { sellerId: { $exists: true, $ne: null } } },
        { $lookup: { from: 'users', localField: 'sellerId', foreignField: '_id', as: 'user' } },
        { $unwind: '$user' },
        { $group: { _id: '$sellerId', name: { $first: { $ifNull: ['$user.fullName', '$user.email'] } } } },
        { $sort: { name: 1 } },
        { $project: { id: { $toString: '$_id' }, name: 1, _id: 0 } },
      ]),
      Order.distinct('shippingAddress.city').then((c) => (c || []).filter(Boolean).sort()),
    ]);
    res.json({ sellers, cities });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to fetch facets' });
  }
}

/** GET /api/admin/orders - list with filters and pagination */
export async function getOrders(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const search = (req.query.search as string)?.trim() || '';
    const status = (req.query.status as string)?.trim() || '';
    const paymentStatus = (req.query.paymentStatus as string)?.trim() || '';
    const paymentMethod = (req.query.paymentMethod as string)?.trim() || '';
    const sellerId = (req.query.sellerId as string)?.trim() || '';
    const city = (req.query.city as string)?.trim() || '';
    const dateFrom = (req.query.dateFrom as string)?.trim() || '';
    const dateTo = (req.query.dateTo as string)?.trim() || '';
    const minAmount = req.query.minAmount != null ? Number(req.query.minAmount) : null;
    const maxAmount = req.query.maxAmount != null ? Number(req.query.maxAmount) : null;
    const cod = (req.query.cod as string)?.trim() || '';
    const fulfilled = (req.query.fulfilled as string)?.trim() || '';
    const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit), 10) || 20));
    const sortBy = (req.query.sortBy as string) || 'date_desc';
    const skip = (page - 1) * limit;

    const query: any = {};

    if (sellerId && sellerId !== 'all' && mongoose.Types.ObjectId.isValid(sellerId)) {
      query.sellerId = new mongoose.Types.ObjectId(sellerId);
    }
    if (status && status !== 'all') query.status = status;
    if (city && city !== 'all') query['shippingAddress.city'] = city;
    const dateFromObj = dateFrom ? new Date(dateFrom) : null;
    const dateToObj = dateTo ? new Date(dateTo) : null;
    if (dateFromObj && !isNaN(dateFromObj.getTime())) {
      query.date = query.date || {};
      (query.date as any).$gte = dateFromObj;
    }
    if (dateToObj && !isNaN(dateToObj.getTime())) {
      const d = new Date(dateToObj);
      d.setHours(23, 59, 59, 999);
      query.date = query.date || {};
      (query.date as any).$lte = d;
    }
    if (minAmount != null && !isNaN(minAmount)) {
      query.total = query.total || {};
      (query.total as any).$gte = minAmount;
    }
    if (maxAmount != null && !isNaN(maxAmount)) {
      query.total = query.total || {};
      (query.total as any).$lte = maxAmount;
    }
    if (paymentMethod && paymentMethod !== 'all') {
      query.paymentMethod = new RegExp(escapeRegex(paymentMethod), 'i');
    }
    if (cod === 'cod') query.paymentMethod = new RegExp('cash|cod', 'i');
    if (cod === 'online') query.paymentMethod = { $not: new RegExp('cash|cod', 'i') };
    if (fulfilled === 'fulfilled') query.status = 'delivered';
    if (fulfilled === 'not_fulfilled') query.status = { $ne: 'delivered' };

    const andParts: any[] = [];
    if (paymentStatus && paymentStatus !== 'all') {
      if (paymentStatus === 'paid') query['payment.paidAt'] = { $exists: true, $ne: null };
      else if (paymentStatus === 'unpaid') {
        andParts.push({ $or: [{ 'payment.paidAt': { $exists: false } }, { 'payment.paidAt': null }] });
      } else if (paymentStatus === 'refunded') query['escrow.status'] = 'REFUNDED';
    }
    if (search) {
      const regex = new RegExp(escapeRegex(search), 'i');
      andParts.push({
        $or: [
          { orderNumber: regex },
          { customer: regex },
          { customerEmail: regex },
          { customerPhone: regex },
          { trackingNumber: regex },
        ],
      });
    }
    if (andParts.length > 0) {
      query.$and = query.$and || [];
      query.$and.push(...andParts);
    }

    const sortObj: any = {};
    switch (sortBy) {
      case 'date_asc': sortObj.date = 1; break;
      case 'date_desc': sortObj.date = -1; break;
      case 'amount_asc': sortObj.total = 1; break;
      case 'amount_desc': sortObj.total = -1; break;
      case 'customer_asc': sortObj.customer = 1; break;
      case 'customer_desc': sortObj.customer = -1; break;
      case 'status_asc': sortObj.status = 1; break;
      case 'status_desc': sortObj.status = -1; break;
      default: sortObj.date = -1;
    }

    const [list, total] = await Promise.all([
      Order.find(query).populate('sellerId', 'fullName email').lean().sort(sortObj).skip(skip).limit(limit),
      Order.countDocuments(query),
    ]);

    const orders = list.map((ord: any) => {
      const out = toOrderShape(ord);
      out.sellerName = (ord.sellerId as any)?.fullName || (ord.sellerId as any)?.email || '';
      return out;
    });

    res.json({
      orders,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to fetch orders' });
  }
}

/** GET /api/admin/orders/:orderId - single order by id or orderNumber */
export async function getOrder(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const { orderId } = req.params;
    const byId = mongoose.Types.ObjectId.isValid(orderId);
    const order = await Order.findOne(byId ? { _id: orderId } : { orderNumber: orderId })
      .populate('sellerId', 'fullName email')
      .lean();
    if (!order) return res.status(404).json({ message: 'Order not found' });
    const out = toOrderShape(order);
    (out as any).sellerName = (order as any).sellerId?.fullName || (order as any).sellerId?.email || '';
    res.json({ order: out });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to fetch order' });
  }
}

/** PATCH /api/admin/orders/:orderId/status - update order status and optionally tracking */
export async function updateOrderStatus(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const { orderId } = req.params;
    const body = req.body as { status?: string; trackingNumber?: string };
    const allowedStatuses = ['pending', 'processing', 'packed', 'shipped', 'delivered', 'cancelled'];
    const newStatus = body.status && allowedStatuses.includes(body.status) ? body.status : undefined;

    const byId = mongoose.Types.ObjectId.isValid(orderId);
    const order = await Order.findOne(byId ? { _id: orderId } : { orderNumber: orderId });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const update: any = {};
    if (newStatus) {
      update.status = newStatus;
      const timeline = order.timeline || [];
      const now = new Date();
      timeline.push({
        status: newStatus,
        date: now,
        time: now.toTimeString().slice(0, 8),
      });
      update.timeline = timeline;
    }
    if (body.trackingNumber !== undefined) update.trackingNumber = body.trackingNumber;

    const updated = await Order.findByIdAndUpdate(order._id, { $set: update }, { new: true })
      .populate('sellerId', 'fullName email')
      .lean();
    const out = toOrderShape(updated);
    (out as any).sellerName = (updated as any).sellerId?.fullName || (updated as any).sellerId?.email || '';
    res.json({ order: out });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to update order status' });
  }
}

/** GET /api/admin/orders/:orderId/logs - activity timeline from order.timeline */
export async function getOrderLogs(req: AuthenticatedRequest, res: Response) {
  if (!ensureAdmin(req, res)) return;
  try {
    const { orderId } = req.params;
    const byId = mongoose.Types.ObjectId.isValid(orderId);
    const order = await Order.findOne(byId ? { _id: orderId } : { orderNumber: orderId })
      .select('orderNumber timeline createdAt')
      .lean();
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const timeline = (order as any).timeline || [];
    const logs = timeline.map((t: any, i: number) => ({
      id: `LOG-${i + 1}`,
      action: `${t.status} (order status)`,
      performedBy: 'System',
      date: t.date ? new Date(t.date).toISOString().replace('T', ' ').slice(0, 19) : '',
      type: t.status,
    }));

    if (logs.length === 0 && (order as any).createdAt) {
      logs.push({
        id: 'LOG-0',
        action: 'Order created',
        performedBy: 'Customer',
        date: new Date((order as any).createdAt).toISOString().replace('T', ' ').slice(0, 19),
        type: 'created',
      });
    }

    res.json({ orderId: (order as any).orderNumber || orderId, logs });
  } catch (e) {
    res.status(500).json({ message: e instanceof Error ? e.message : 'Failed to fetch order logs' });
  }
}
