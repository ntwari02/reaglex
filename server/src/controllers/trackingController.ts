import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../middleware/auth';
import { Order } from '../models/Order';
import { Shipment, TrackingEvent, Courier, TrackingStatus } from '../models/Tracking';
import { User } from '../models/User';
import { Product } from '../models/Product';

/**
 * Track order by order number or tracking number
 * GET /api/track/:identifier
 */
export async function trackOrder(req: AuthenticatedRequest, res: Response) {
  try {
    const { identifier } = req.params; // Can be order number or tracking number
    const { email, phone } = req.query as { email?: string; phone?: string };

    // Try to find by tracking number first
    let shipment = await Shipment.findOne({
      trackingNumber: identifier.toUpperCase(),
    })
      .populate('orderId')
      .populate('sellerId', 'fullName')
      .populate('courierId')
      .populate('items.productId', 'name images')
      .lean();

    let order: any = null;

    if (shipment) {
      order = shipment.orderId;
    } else {
      // Try to find by order number
      order = await Order.findOne({ orderNumber: identifier }).lean();
      if (order) {
        // Get all shipments for this order
        shipment = await Shipment.findOne({ orderId: order._id })
          .populate('sellerId', 'fullName')
          .populate('courierId')
          .populate('items.productId', 'name images')
          .lean();
      }
    }

    if (!order && !shipment) {
      return res.status(404).json({ message: 'Order or tracking number not found' });
    }

    // If user is logged in, verify it's their order
    if (req.user) {
      const buyerId = new mongoose.Types.ObjectId(req.user.id);
      if (order && order.buyerId.toString() !== buyerId.toString()) {
        return res.status(403).json({ message: 'Unauthorized to view this order' });
      }
    } else {
      // For guest tracking, verify email or phone matches
      if (order) {
        if (email && order.customerEmail !== email) {
          return res.status(403).json({ message: 'Email does not match order' });
        }
        if (phone && order.customerPhone !== phone) {
          return res.status(403).json({ message: 'Phone does not match order' });
        }
      }
    }

    // Get all shipments for the order
    const shipments = await Shipment.find({ orderId: order?._id || shipment?.orderId })
      .populate('sellerId', 'fullName avatarUrl')
      .populate('courierId')
      .populate('items.productId', 'name images price')
      .sort({ createdAt: 1 })
      .lean();

    // Get tracking events for all shipments
    const shipmentIds = shipments.map((s) => s._id);
    const events = await TrackingEvent.find({
      $or: [{ orderId: order?._id || shipment?.orderId }, { shipmentId: { $in: shipmentIds } }],
    })
      .sort({ timestamp: 1 })
      .lean();

    // Group events by shipment
    const eventsByShipment: { [key: string]: any[] } = {};
    events.forEach((event) => {
      const key = event.shipmentId?.toString() || 'order';
      if (!eventsByShipment[key]) {
        eventsByShipment[key] = [];
      }
      eventsByShipment[key].push(event);
    });

    // Transform shipments to match frontend format
    const packages = await Promise.all(
      shipments.map(async (shipment: any) => {
        const shipmentEvents = eventsByShipment[shipment._id.toString()] || [];

        // Get courier info
        let courier: {
          name: string;
          logo?: string;
          phone?: string;
        } = {
          name: shipment.courierName || 'Unknown Courier',
          logo: undefined,
          phone: undefined,
        };

        if (shipment.courierId) {
          const courierDoc = await Courier.findById(shipment.courierId).lean();
          if (courierDoc) {
            courier = {
              name: courierDoc.name,
              logo: courierDoc.logo,
              phone: courierDoc.phone,
            };
          }
        }

        return {
          id: shipment._id.toString(),
          trackingNumber: shipment.trackingNumber,
          seller: {
            id: shipment.sellerId?._id.toString(),
            name: shipment.sellerId?.fullName || 'Unknown Seller',
          },
          items: shipment.items.map((item: any) => ({
            id: item.productId?._id.toString() || '',
            name: item.name,
            quantity: item.quantity,
            image: item.productId?.images?.[0] || item.image || '',
          })),
          weight: `${shipment.weight} kg`,
          dimensions: `${shipment.dimensions.length} × ${shipment.dimensions.width} × ${shipment.dimensions.height} cm`,
          packageType: shipment.packageType,
          shippingMethod: shipment.shippingMethod,
          courier,
          status: shipment.status,
          events: shipmentEvents.map((event: any) => ({
            id: event._id.toString(),
            timestamp: event.timestamp,
            status: event.status,
            location: event.location,
            description: event.description,
            courier: event.courier,
          })),
          estimatedDelivery: shipment.estimatedDelivery,
          actualDelivery: shipment.actualDelivery,
          deliveryImage: shipment.deliveryImage,
          deliverySignature: shipment.deliverySignature,
          deliveryPerson: shipment.deliveryPerson,
          currentLocation: shipment.currentLocation
            ? {
                lat: shipment.currentLocation.latitude,
                lng: shipment.currentLocation.longitude,
                address: shipment.currentLocation.address,
              }
            : undefined,
          failedDeliveryReason: shipment.failedDeliveryReason,
        };
      })
    );

    // If no shipments exist but order exists, create a basic package from order
    if (packages.length === 0 && order) {
      const seller = await User.findById(order.sellerId).select('fullName avatarUrl').lean();
      packages.push({
        id: 'default',
        trackingNumber: order.trackingNumber || order.orderNumber,
        seller: {
          id: order.sellerId.toString(),
          name: seller?.fullName || 'Unknown Seller',
        },
        items: order.items.map((item: any) => ({
          id: item.productId?.toString() || '',
          name: item.name,
          quantity: item.quantity,
          image: '',
        })),
        weight: 'N/A',
        dimensions: 'N/A',
        packageType: 'Standard Box',
        shippingMethod: 'standard',
        courier: {
          name: 'TBD',
        },
        status: mapOrderStatusToTrackingStatus(order.status),
        events: order.timeline.map((entry: any, index: number) => ({
          id: `event-${index}`,
          timestamp: entry.date,
          status: mapOrderStatusToTrackingStatus(entry.status),
          location: order.shippingAddress.city || 'Unknown',
          description: entry.status,
        })),
        estimatedDelivery: undefined,
        actualDelivery: undefined,
        deliveryImage: undefined,
        deliverySignature: undefined,
        deliveryPerson: undefined,
        currentLocation: undefined,
        failedDeliveryReason: undefined,
      });
    }

    const response = {
      orderId: order?._id.toString() || shipment?.orderId.toString(),
      orderNumber: order?.orderNumber || (shipment?.orderId as any)?.orderNumber,
      packages,
      totalAmount: order?.total || 0,
      shippingAddress: order
        ? {
            fullName: order.shippingAddress.name,
            address: order.shippingAddress.street,
            city: order.shippingAddress.city,
            country: order.shippingAddress.country,
            postalCode: order.shippingAddress.zip,
            phone: order.customerPhone,
          }
        : undefined,
    };

    return res.json(response);
  } catch (error: any) {
    console.error('Track order error:', error);
    return res.status(500).json({ message: 'Failed to track order' });
  }
}

/**
 * Get user's active orders for tracking (if logged in)
 * GET /api/track/my-orders
 */
export async function getMyOrders(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Get recent orders
    // Using string ID - Mongoose will auto-convert to ObjectId
    const filter = { buyerId: req.user.id };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orders = await (Order as any).find(filter)
      .populate('sellerId', 'fullName')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Get shipments for these orders
    const orderIds = orders.map((o: any) => o._id);
    const shipments = await Shipment.find({ orderId: { $in: orderIds } })
      .populate('courierId')
      .lean();

    const ordersWithTracking = orders.map((order: any) => {
      const orderShipments = shipments.filter(
        (s) => s.orderId.toString() === order._id.toString()
      );
      return {
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        status: order.status,
        total: order.total,
        hasTracking: orderShipments.length > 0,
        trackingNumber: orderShipments[0]?.trackingNumber || order.trackingNumber,
        createdAt: order.createdAt,
      };
    });

    return res.json({ orders: ordersWithTracking });
  } catch (error: any) {
    console.error('Get my orders error:', error);
    return res.status(500).json({ message: 'Failed to fetch orders' });
  }
}

/**
 * Add tracking event (for sellers/admins/couriers)
 * POST /api/track/events
 */
export async function addTrackingEvent(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { orderId, shipmentId, status, location, description, courier, latitude, longitude } =
      req.body;

    if (!orderId || !status || !location || !description) {
      return res.status(400).json({
        message: 'Order ID, status, location, and description are required',
      });
    }

    // Verify permissions (seller can only update their orders, admin can update any)
    if (req.user.role !== 'admin') {
      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }
      if (order.sellerId.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Unauthorized to update this order' });
      }
    }

    // Create tracking event
    const event = new TrackingEvent({
      orderId,
      shipmentId: shipmentId || undefined,
      status,
      location,
      description,
      courier: courier || undefined,
      latitude: latitude || undefined,
      longitude: longitude || undefined,
      timestamp: new Date(),
    });

    await event.save();

    // Update shipment status if shipmentId provided
    if (shipmentId) {
      const shipment = await Shipment.findById(shipmentId);
      if (shipment) {
        shipment.status = status;
        shipment.events.push(event._id);

        // Update current location if provided
        if (latitude && longitude) {
          shipment.currentLocation = {
            latitude,
            longitude,
            address: location,
            timestamp: new Date(),
          };
        }

        // Update delivery info if delivered
        if (status === 'delivered') {
          shipment.actualDelivery = new Date();
        }

        await shipment.save();
      }
    }

    // Update order status based on tracking status
    const order = await Order.findById(orderId);
    if (order) {
      const orderStatus = mapTrackingStatusToOrderStatus(status);
      if (orderStatus) {
        (order as any).status = orderStatus;
        order.timeline.push({
          status: orderStatus,
          date: new Date(),
          time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        });
        await order.save();
      }
    }

    return res.status(201).json({
      message: 'Tracking event added',
      event: {
        id: event._id.toString(),
        status: event.status,
        location: event.location,
        description: event.description,
        timestamp: event.timestamp,
      },
    });
  } catch (error: any) {
    console.error('Add tracking event error:', error);
    return res.status(500).json({ message: 'Failed to add tracking event' });
  }
}

/**
 * Update shipment location (real-time tracking)
 * PATCH /api/track/shipments/:shipmentId/location
 */
export async function updateShipmentLocation(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { shipmentId } = req.params;
    const { latitude, longitude, address } = req.body;

    if (!latitude || !longitude || !address) {
      return res.status(400).json({
        message: 'Latitude, longitude, and address are required',
      });
    }

    const shipment = await Shipment.findById(shipmentId);
    if (!shipment) {
      return res.status(404).json({ message: 'Shipment not found' });
    }

    // Verify permissions
    if (req.user.role !== 'admin') {
      const order = await Order.findById(shipment.orderId);
      if (!order || order.sellerId.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Unauthorized' });
      }
    }

    shipment.currentLocation = {
      latitude,
      longitude,
      address,
      timestamp: new Date(),
    };

    await shipment.save();

    // Create tracking event for location update
    const event = new TrackingEvent({
      orderId: shipment.orderId,
      shipmentId: shipment._id,
      status: shipment.status,
      location: address,
      description: `Location updated: ${address}`,
      latitude,
      longitude,
      timestamp: new Date(),
    });

    await event.save();
    shipment.events.push(event._id);
    await shipment.save();

    return res.json({
      message: 'Location updated',
      location: shipment.currentLocation,
    });
  } catch (error: any) {
    console.error('Update shipment location error:', error);
    return res.status(500).json({ message: 'Failed to update location' });
  }
}

/**
 * Confirm delivery
 * POST /api/track/shipments/:shipmentId/confirm-delivery
 */
export async function confirmDelivery(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { shipmentId } = req.params;
    const { deliveryPerson, deliveryImage, deliverySignature } = req.body;

    const shipment = await Shipment.findById(shipmentId);
    if (!shipment) {
      return res.status(404).json({ message: 'Shipment not found' });
    }

    // Verify permissions
    if (req.user.role !== 'admin') {
      const order = await Order.findById(shipment.orderId);
      if (!order || order.sellerId.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Unauthorized' });
      }
    }

    shipment.status = 'delivered';
    shipment.actualDelivery = new Date();
    if (deliveryPerson) shipment.deliveryPerson = deliveryPerson;
    if (deliveryImage) shipment.deliveryImage = deliveryImage;
    if (deliverySignature) shipment.deliverySignature = deliverySignature;

    await shipment.save();

    // Create delivery event
    const event = new TrackingEvent({
      orderId: shipment.orderId,
      shipmentId: shipment._id,
      status: 'delivered',
      location: shipment.currentLocation?.address || 'Delivery address',
      description: 'Package delivered successfully',
      timestamp: new Date(),
    });

    await event.save();
    shipment.events.push(event._id);
    await shipment.save();

    // Update order status
    const order = await Order.findById(shipment.orderId);
    if (order) {
      order.status = 'delivered';
      order.timeline.push({
        status: 'delivered',
        date: new Date(),
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      });
      await order.save();
    }

    return res.json({
      message: 'Delivery confirmed',
      shipment: {
        id: shipment._id.toString(),
        status: shipment.status,
        actualDelivery: shipment.actualDelivery,
      },
    });
  } catch (error: any) {
    console.error('Confirm delivery error:', error);
    return res.status(500).json({ message: 'Failed to confirm delivery' });
  }
}

/**
 * Record failed delivery
 * POST /api/track/shipments/:shipmentId/failed-delivery
 */
export async function recordFailedDelivery(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { shipmentId } = req.params;
    const { reason } = req.body;

    const shipment = await Shipment.findById(shipmentId);
    if (!shipment) {
      return res.status(404).json({ message: 'Shipment not found' });
    }

    shipment.status = 'failed_delivery';
    shipment.failedDeliveryReason = reason || 'Recipient not available';
    shipment.failedDeliveryAttempts = (shipment.failedDeliveryAttempts || 0) + 1;

    await shipment.save();

    // Create failed delivery event
    const event = new TrackingEvent({
      orderId: shipment.orderId,
      shipmentId: shipment._id,
      status: 'failed_delivery',
      location: shipment.currentLocation?.address || 'Delivery address',
      description: `Delivery attempt failed: ${shipment.failedDeliveryReason}`,
      timestamp: new Date(),
    });

    await event.save();
    shipment.events.push(event._id);
    await shipment.save();

    return res.json({
      message: 'Failed delivery recorded',
      shipment: {
        id: shipment._id.toString(),
        status: shipment.status,
        failedDeliveryReason: shipment.failedDeliveryReason,
        failedDeliveryAttempts: shipment.failedDeliveryAttempts,
      },
    });
  } catch (error: any) {
    console.error('Record failed delivery error:', error);
    return res.status(500).json({ message: 'Failed to record failed delivery' });
  }
}

// Helper functions
function mapOrderStatusToTrackingStatus(orderStatus: string): TrackingStatus {
  const mapping: { [key: string]: TrackingStatus } = {
    pending: 'pending',
    processing: 'seller_confirmed',
    packed: 'packed',
    shipped: 'shipped',
    delivered: 'delivered',
    cancelled: 'returned',
  };
  return mapping[orderStatus] || 'pending';
}

function mapTrackingStatusToOrderStatus(trackingStatus: TrackingStatus): string | null {
  const mapping: { [key: string]: string } = {
    pending: 'pending',
    payment_verified: 'pending',
    seller_confirmed: 'processing',
    packed: 'packed',
    shipped: 'shipped',
    in_transit: 'shipped',
    out_for_delivery: 'shipped',
    delivered: 'delivered',
    failed_delivery: 'shipped',
    returned: 'cancelled',
  };
  return mapping[trackingStatus] || null;
}

