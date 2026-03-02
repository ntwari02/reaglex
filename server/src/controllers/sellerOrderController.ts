import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../middleware/auth';
import { Order, OrderStatus } from '../models/Order';

// GET /api/seller/orders
export async function getSellerOrders(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const sellerObjectId = new mongoose.Types.ObjectId(req.user.id);

    const orders = await Order.find({ sellerId: sellerObjectId } as any)
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ orders });
  } catch (err: any) {
    console.error('Error fetching seller orders:', err);
    return res.status(500).json({ message: 'Failed to fetch orders' });
  }
}

// PATCH /api/seller/orders/:orderId/status
export async function updateSellerOrderStatus(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const sellerObjectId = new mongoose.Types.ObjectId(req.user.id);
    const { orderId } = req.params;
    const { status, reason } = req.body as { status?: OrderStatus; reason?: string };

    const allowedStatuses: OrderStatus[] = [
      'pending',
      'processing',
      'packed',
      'shipped',
      'delivered',
      'cancelled',
    ];

    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const orderObjectId = new mongoose.Types.ObjectId(orderId);

    const now = new Date();
    const timelineEntry = {
      status: status.charAt(0).toUpperCase() + status.slice(1),
      date: now,
      time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    };

    const update: any = {
      $set: { status },
      $push: { timeline: timelineEntry },
    };

    if (reason && reason.trim()) {
      update.$push.notes = reason.trim();
    }

    const updated = await Order.findOneAndUpdate(
      { _id: orderObjectId, sellerId: sellerObjectId } as any,
      update,
      { new: true }
    ).lean();

    if (!updated) {
      return res.status(404).json({ message: 'Order not found' });
    }

    return res.json({ order: updated });
  } catch (err: any) {
    console.error('Error updating seller order status:', err);
    return res.status(500).json({ message: 'Failed to update order status' });
  }
}

// PATCH /api/seller/orders/:orderId/tracking
export async function updateSellerOrderTracking(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const sellerObjectId = new mongoose.Types.ObjectId(req.user.id);
    const { orderId } = req.params;
    const { trackingNumber, carrier } = req.body as {
      trackingNumber?: string;
      carrier?: string;
    };

    const orderObjectId = new mongoose.Types.ObjectId(orderId);

    const now = new Date();
    const shouldMarkShipped = !!trackingNumber;

    const update: any = {
      $set: {
        trackingNumber: trackingNumber || '',
      },
    };

    if (carrier) {
      update.$set.carrier = carrier;
    }

    if (shouldMarkShipped) {
      update.$set.status = 'shipped';
      update.$push = {
        timeline: {
          status: 'Shipped',
          date: now,
          time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        },
      };
    }

    const updated = await Order.findOneAndUpdate(
      { _id: orderObjectId, sellerId: sellerObjectId } as any,
      update,
      { new: true }
    ).lean();

    if (!updated) {
      return res.status(404).json({ message: 'Order not found' });
    }

    return res.json({ order: updated });
  } catch (err: any) {
    console.error('Error updating seller order tracking:', err);
    return res.status(500).json({ message: 'Failed to update order tracking' });
  }
}

// GET /api/seller/orders/:orderId
export async function getSellerOrderById(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const sellerObjectId = new mongoose.Types.ObjectId(req.user.id);
    const { orderId } = req.params;

    const orderObjectId = new mongoose.Types.ObjectId(orderId);

    const order = await Order.findOne(
      {
        _id: orderObjectId,
        sellerId: sellerObjectId,
      } as any
    ).lean();

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    return res.json({ order });
  } catch (err: any) {
    console.error('Error fetching seller order by id:', err);
    return res.status(500).json({ message: 'Failed to fetch order' });
  }
}


