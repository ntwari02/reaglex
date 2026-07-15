import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../middleware/auth';
import { Order, OrderStatus } from '../models/Order';
import { notifyBuyerOrderStatusChange } from '../services/orderInboxNotifications';
import { restoreInventoryForOrder } from '../services/inventory.service';
import {
  compareCarriersForOrder,
  estimateDeliveryPrediction,
} from '../services/fulfillmentIntelligence.service';
import { buildPickupCredentials } from '../services/pickupService';
import { evaluateOrderDeliverySLA } from '../services/sellerDeliverySLA.service';

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
      'paused',
      'ready_for_pickup',
      'pickup_confirmed',
      'booked',
      'in_progress',
      'shipped',
      'delivered',
      'completed',
      'cancelled',
    ];

    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const orderObjectId = new mongoose.Types.ObjectId(orderId);

    const prior = await Order.findOne({ _id: orderObjectId, sellerId: sellerObjectId } as any).lean();
    if (!prior) {
      return res.status(404).json({ message: 'Order not found' });
    }

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
    if (status === 'delivered') {
      const graceHours = Number(process.env.ORDER_DELIVERED_GRACE_HOURS || 72);
      update.$set.autoCompletion = {
        ...(prior as any).autoCompletion,
        deliveredAt: now,
        eligibleAt: new Date(now.getTime() + graceHours * 3600000),
        state: 'scheduled',
      };
    } else if (status === 'completed') {
      update.$set['autoCompletion.state'] = 'completed';
      update.$set['autoCompletion.completedAt'] = now;
      update.$set['autoCompletion.completionSource'] = 'admin';
    }

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

    if (prior.status !== updated.status) {
      if (updated.status === 'cancelled') {
        void restoreInventoryForOrder(String(updated._id), 'order_cancelled').catch((e) => {
          console.error('Failed to restore inventory on seller cancellation:', e);
        });
      }
      void notifyBuyerOrderStatusChange({
        buyerId: updated.buyerId,
        orderId: String(updated._id),
        orderNumber: updated.orderNumber,
        newStatus: updated.status,
        previousStatus: prior.status,
        actorUserId: req.user.id,
      });
      if (updated.status === 'delivered') {
        void evaluateOrderDeliverySLA(updated).catch((e) =>
          console.error('[sellerDeliverySLA] evaluate on delivered:', e),
        );
      }
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

    const prior = await Order.findOne({ _id: orderObjectId, sellerId: sellerObjectId } as any).lean();
    if (!prior) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const now = new Date();
    const shouldMarkShipped = !!trackingNumber;
    const carrierAnalysis = await compareCarriersForOrder(orderId);
    const prediction = await estimateDeliveryPrediction(orderId);
    const selectedCarrier = carrier || carrierAnalysis.recommended.carrier;

    const update: any = {
      $set: {
        trackingNumber: trackingNumber || '',
        'spacillyShipping.trackingNumber': trackingNumber || '',
        'spacillyShipping.shipmentStatus': shouldMarkShipped ? 'shipped' : 'pending',
        deliveryPrediction: {
          expected: new Date(prediction.expected),
          confidence: prediction.confidence,
          factors: prediction.factors,
        },
        'fulfillment.carrierOptions': carrierAnalysis.options,
        'fulfillment.recommendedCarrier': {
          carrier: carrierAnalysis.recommended.carrier,
          service: carrierAnalysis.recommended.service,
        },
      },
    };

    update.$set.carrier = selectedCarrier;

    if (shouldMarkShipped) {
      update.$set.status = 'shipped';
      const paid = Boolean((prior as any).payment?.paidAt);
      const escrowSt = (prior as any).escrow?.status;
      // Escrow pipeline: paid → ESCROW_HOLD → seller ships (here) → SHIPPED → buyer delivery / auto-release.
      if (paid && escrowSt === 'ESCROW_HOLD') {
        update.$set['escrow.status'] = 'SHIPPED';
      }
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

    if (prior.status !== updated.status) {
      void notifyBuyerOrderStatusChange({
        buyerId: updated.buyerId,
        orderId: String(updated._id),
        orderNumber: updated.orderNumber,
        newStatus: updated.status,
        previousStatus: prior.status,
        actorUserId: req.user.id,
      });
    }

    return res.json({ order: updated });
  } catch (err: any) {
    console.error('Error updating seller order tracking:', err);
    return res.status(500).json({ message: 'Failed to update order tracking' });
  }
}

// GET /api/seller/orders/:orderId/carrier-options
export async function getSellerCarrierOptions(req: AuthenticatedRequest, res: Response) {
  if (!req.user) return res.status(401).json({ message: 'Authentication required' });
  try {
    const sellerObjectId = new mongoose.Types.ObjectId(req.user.id);
    const { orderId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(orderId)) return res.status(400).json({ message: 'Invalid order ID' });
    const order = await Order.findOne({ _id: new mongoose.Types.ObjectId(orderId), sellerId: sellerObjectId } as any).lean();
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const carriers = await compareCarriersForOrder(orderId);
    const prediction = await estimateDeliveryPrediction(orderId);
    return res.json({
      orderId,
      deliveryPrediction: prediction,
      recommended: carriers.recommended,
      options: carriers.options,
    });
  } catch (err: any) {
    return res.status(500).json({ message: 'Failed to compare carriers', error: err.message });
  }
}

// POST /api/seller/orders/bulk-process
export async function bulkProcessSellerOrders(req: AuthenticatedRequest, res: Response) {
  if (!req.user) return res.status(401).json({ message: 'Authentication required' });
  try {
    const sellerObjectId = new mongoose.Types.ObjectId(req.user.id);
    const { orderIds, action } = req.body as {
      orderIds: string[];
      action: 'print_labels' | 'ship' | 'package';
    };
    if (!Array.isArray(orderIds) || !orderIds.length) {
      return res.status(400).json({ message: 'orderIds is required' });
    }
    if (!['print_labels', 'ship', 'package'].includes(String(action))) {
      return res.status(400).json({ message: 'Invalid action' });
    }
    const validIds = orderIds.filter((id) => mongoose.Types.ObjectId.isValid(id)).map((id) => new mongoose.Types.ObjectId(id));
    const orders = await Order.find({ _id: { $in: validIds }, sellerId: sellerObjectId } as any);
    const now = new Date();
    const results: Array<{ orderId: string; status: string }> = [];

    for (const order of orders) {
      const update: any = {
        $push: {
          'fulfillment.batchActionHistory': {
            action,
            at: now,
            actorId: req.user.id,
          },
        },
      };
      if (action === 'package') {
        update.$set = { status: 'packed' };
      }
      if (action === 'ship') {
        update.$set = {
          status: 'shipped',
          'spacillyShipping.shipmentStatus': 'shipped',
        };
      }
      if (action === 'print_labels') {
        update.$set = {
          'spacillyShipping.shipmentStatus': String((order as any)?.spacillyShipping?.shipmentStatus || 'pending'),
        };
      }
      const updated = await Order.findByIdAndUpdate(order._id, update, { new: true }).lean();
      results.push({ orderId: String(order._id), status: String((updated as any)?.status || order.status) });
    }

    return res.json({
      success: true,
      action,
      processed: results.length,
      results,
    });
  } catch (err: any) {
    return res.status(500).json({ message: 'Failed bulk processing', error: err.message });
  }
}

// PATCH /api/seller/orders/:orderId/ready
export async function markOrderReadyForPickup(req: AuthenticatedRequest, res: Response) {
  if (!req.user) return res.status(401).json({ message: 'Authentication required' });
  try {
    const sellerObjectId = new mongoose.Types.ObjectId(req.user.id);
    const { orderId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(orderId)) return res.status(400).json({ message: 'Invalid order ID' });

    const order = await Order.findOne({ _id: new mongoose.Types.ObjectId(orderId), sellerId: sellerObjectId } as any);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if ((order as any)?.fulfillment?.type !== 'pickup') {
      return res.status(400).json({ message: 'Only pickup fulfillment orders can be marked ready' });
    }

    const pickup = buildPickupCredentials(24 * 60);
    order.status = 'ready_for_pickup';
    (order as any).pickup = {
      ...((order as any).pickup || {}),
      code: pickup.code,
      otp: pickup.otp,
      qrToken: pickup.qrToken,
      expiresAt: pickup.expiresAt,
    };
    order.timeline.push({
      status: 'ready_for_pickup',
      date: new Date(),
      time: new Date().toLocaleTimeString(),
    });
    await order.save();

    return res.json({
      success: true,
      pickup: {
        code: (order as any)?.pickup?.code,
        qrToken: (order as any)?.pickup?.qrToken,
        otp: (order as any)?.pickup?.otp,
        expiresAt: (order as any)?.pickup?.expiresAt,
      },
      order: { id: order._id, orderNumber: order.orderNumber, status: order.status },
    });
  } catch (err: any) {
    return res.status(500).json({ message: 'Failed to mark order ready', error: err.message });
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


