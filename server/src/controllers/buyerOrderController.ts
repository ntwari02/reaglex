import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../middleware/auth';
import { Order, OrderStatus } from '../models/Order';
import { Product } from '../models/Product';

/**
 * Create order(s) from cart checkout
 * POST /api/orders
 * Creates separate orders for each seller group
 */
export async function createOrder(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const {
      sellerGroups,
      shippingAddress,
      paymentMethod,
      shippingMethods,
      notes,
    } = req.body as {
      sellerGroups: Array<{
        sellerId: string;
        items: Array<{
          product_id: string;
          variant_id?: string;
          quantity: number;
        }>;
        subtotal: number;
        discount?: number;
      }>;
      shippingAddress: {
        full_name: string;
        phone: string;
        address_line1: string;
        address_line2?: string;
        city: string;
        state: string;
        postal_code: string;
        country: string;
      };
      paymentMethod: string;
      shippingMethods: Record<string, string>;
      notes?: Record<string, string>;
    };

    const buyerId = new mongoose.Types.ObjectId(req.user.id);
    const orders = [];

    // Create one order per seller group
    for (const group of sellerGroups) {
      const sellerId = new mongoose.Types.ObjectId(group.sellerId);
      
      // Generate order number
      const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      // Calculate costs
      const discount = group.discount || 0;
      const subtotalAfterDiscount = group.subtotal - discount;
      const tax = subtotalAfterDiscount * 0.1; // 10% tax
      const shippingCost = shippingMethods[group.sellerId] === 'express' ? 15 :
                          shippingMethods[group.sellerId] === 'international' ? 25 : 5;
      const total = subtotalAfterDiscount + tax + shippingCost;

      // Fetch product details for order items
      const orderItems = [];
      for (const item of group.items) {
        const product = await Product.findById(item.product_id).lean();
        if (!product) {
          return res.status(404).json({ message: `Product ${item.product_id} not found` });
        }

        const price = product.price;
        orderItems.push({
          productId: new mongoose.Types.ObjectId(item.product_id),
          name: product.name,
          quantity: item.quantity,
          price: price,
          variant: item.variant_id || undefined,
        });
      }

      // Create order
      const order = new Order({
        sellerId,
        buyerId,
        orderNumber,
        customer: shippingAddress.full_name,
        customerEmail: req.user.email || '',
        customerPhone: shippingAddress.phone,
        items: orderItems,
        subtotal: group.subtotal,
        shipping: shippingCost,
        tax: tax,
        total: total,
        status: 'pending' as OrderStatus,
        date: new Date(),
        shippingAddress: {
          name: shippingAddress.full_name,
          street: `${shippingAddress.address_line1}${shippingAddress.address_line2 ? `, ${shippingAddress.address_line2}` : ''}`,
          city: shippingAddress.city,
          state: shippingAddress.state || 'N/A', // Fallback if state is missing
          zip: shippingAddress.postal_code || '',
          country: shippingAddress.country,
        },
        paymentMethod: paymentMethod,
        timeline: [{
          status: 'pending',
          date: new Date(),
          time: new Date().toLocaleTimeString(),
        }],
      });

      await order.save();
      orders.push(order);
    }

    return res.status(201).json({ 
      success: true,
      orders: orders.map(o => ({
        id: o._id,
        orderNumber: o.orderNumber,
        status: o.status,
        total: o.total,
      })),
    });
  } catch (err: any) {
    console.error('Error creating order:', err);
    return res.status(500).json({ message: 'Failed to create order', error: err.message });
  }
}

/**
 * Get buyer's orders
 * GET /api/orders
 */
export async function getBuyerOrders(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const buyerId = new mongoose.Types.ObjectId(req.user.id);
    const { status, page = '1', limit = '20' } = req.query as {
      status?: OrderStatus;
      page?: string;
      limit?: string;
    };

    const filter: any = { buyerId };
    if (status) {
      filter.status = status;
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    // Debug logging
    console.log('Fetching orders for buyerId:', buyerId.toString());
    console.log('Filter:', filter);
    console.log('User ID from token:', req.user.id);

    const orders = await Order.find(filter)
      .populate('sellerId', 'fullName email')
      .populate('items.productId', 'name images price')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await Order.countDocuments(filter);

    console.log(`Found ${orders.length} orders out of ${total} total for buyer ${buyerId.toString()}`);

    return res.json({
      orders: orders.map(order => {
        const seller = order.sellerId as any;
        return {
          id: order._id,
          order_number: order.orderNumber,
          status: order.status,
          created_at: order.createdAt,
          updated_at: order.updatedAt,
          items: order.items.map(item => {
            const product = item.productId as any;
            const productId = product?._id || product || item.productId;
            const productName = product?.name || '';
            // Handle images - could be array of strings or array of objects with url
            let productImage = '';
            if (product?.images && Array.isArray(product.images)) {
              if (product.images.length > 0) {
                const firstImage = product.images[0];
                productImage = typeof firstImage === 'string' 
                  ? firstImage 
                  : firstImage?.url || firstImage?.path || '';
              }
            }
            
            return {
              id: String(productId),
              product_id: String(productId),
              product_title: productName,
              product_image: productImage,
              variant: item.variant || '',
              quantity: item.quantity,
              price: item.price,
              total: item.price * item.quantity,
            };
          }),
          subtotal: order.subtotal,
          shipping: order.shipping,
          tax: order.tax,
          discount: 0, // Add discount field (can be calculated from coupons if needed)
          total: order.total,
          shipping_address: {
            fullName: order.shippingAddress.name,
            address: order.shippingAddress.street,
            city: order.shippingAddress.city,
            country: order.shippingAddress.country,
            postalCode: order.shippingAddress.zip,
            phone: order.customerPhone,
          },
          payment_method: order.paymentMethod,
          tracking_number: order.trackingNumber,
          estimated_delivery: order.status === 'shipped' 
            ? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
            : undefined,
          seller: {
            id: seller?._id || order.sellerId,
            name: seller?.fullName || 'Unknown Seller',
          },
          timeline: order.timeline,
        };
      }),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (err: any) {
    console.error('Error fetching buyer orders:', err);
    return res.status(500).json({ message: 'Failed to fetch orders' });
  }
}

/**
 * Get order by ID
 * GET /api/orders/:orderId
 */
export async function getOrderById(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const buyerId = new mongoose.Types.ObjectId(req.user.id);
    const { orderId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ message: 'Invalid order ID' });
    }

    const orderObjectId = new mongoose.Types.ObjectId(orderId);
    const order = await Order.findOne({
      _id: orderObjectId,
      buyerId,
    } as any)
      .populate('sellerId', 'name email')
      .populate('items.productId', 'name images price description')
      .lean();

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const seller = order.sellerId as any;
    return res.json({
      order: {
        id: order._id,
        order_number: order.orderNumber,
        status: order.status,
        created_at: order.createdAt,
        updated_at: order.updatedAt,
        items: order.items.map(item => {
          const product = item.productId as any;
          const productId = product?._id || product || item.productId;
          const productName = product?.name || '';
          const productImage = product?.images?.[0] || '';
          
          return {
            id: productId,
            product_id: productId,
            product_title: productName,
            product_image: productImage,
            variant: item.variant,
            quantity: item.quantity,
            price: item.price,
            total: item.price * item.quantity,
          };
        }),
        subtotal: order.subtotal,
        shipping: order.shipping,
        tax: order.tax,
        total: order.total,
        shipping_address: {
          fullName: order.shippingAddress.name,
          address: order.shippingAddress.street,
          city: order.shippingAddress.city,
          country: order.shippingAddress.country,
          postalCode: order.shippingAddress.zip,
          phone: order.customerPhone,
        },
        payment_method: order.paymentMethod,
        tracking_number: order.trackingNumber,
        estimated_delivery: order.status === 'shipped' 
          ? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
          : undefined,
        seller: {
          id: seller?._id || order.sellerId,
          name: seller?.name || 'Unknown Seller',
        },
        timeline: order.timeline,
      },
    });
  } catch (err: any) {
    console.error('Error fetching order:', err);
    return res.status(500).json({ message: 'Failed to fetch order' });
  }
}

/**
 * Track order by order number
 * GET /api/orders/track/:orderNumber
 */
export async function trackOrder(req: AuthenticatedRequest, res: Response) {
  try {
    const { orderNumber } = req.params;
    const { email, phone } = req.query as { email?: string; phone?: string };

    // Find order by order number
    const order = await Order.findOne({ orderNumber })
      .populate('sellerId', 'name')
      .populate('items.productId', 'name images')
      .lean();

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // If user is logged in, verify it's their order
    if (req.user) {
      const buyerId = new mongoose.Types.ObjectId(req.user.id);
      if (order.buyerId.toString() !== buyerId.toString()) {
        return res.status(403).json({ message: 'Unauthorized to view this order' });
      }
    } else {
      // For guest tracking, verify email or phone matches
      if (email && order.customerEmail !== email) {
        return res.status(403).json({ message: 'Email does not match order' });
      }
      if (phone && order.customerPhone !== phone) {
        return res.status(403).json({ message: 'Phone does not match order' });
      }
    }

    return res.json({
      order: {
        orderNumber: order.orderNumber,
        status: order.status,
        trackingNumber: order.trackingNumber,
        timeline: order.timeline,
        estimatedDelivery: order.status === 'shipped' 
          ? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
          : undefined,
        seller: {
          name: (order.sellerId as any)?.name || 'Unknown Seller',
        },
      },
    });
  } catch (err: any) {
    console.error('Error tracking order:', err);
    return res.status(500).json({ message: 'Failed to track order' });
  }
}

/**
 * Cancel an order
 * PATCH /api/orders/:orderId/cancel
 */
export async function cancelOrder(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const buyerId = new mongoose.Types.ObjectId(req.user.id);
    const { orderId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ message: 'Invalid order ID' });
    }

    const orderObjectId = new mongoose.Types.ObjectId(orderId);
    const order = await Order.findOne({
      _id: orderObjectId,
      buyerId: buyerId,
    } as any);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Only allow cancellation of pending or processing orders
    if (order.status !== 'pending' && order.status !== 'processing') {
      return res.status(400).json({ 
        message: `Cannot cancel order with status: ${order.status}. Only pending or processing orders can be cancelled.` 
      });
    }

    // Update order status to cancelled
    order.status = 'cancelled';
    order.timeline.push({
      status: 'cancelled',
      date: new Date(),
      time: new Date().toLocaleTimeString(),
    });
    await order.save();

    return res.json({ 
      success: true,
      message: 'Order cancelled successfully',
      order: {
        id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
      }
    });
  } catch (err: any) {
    console.error('Error cancelling order:', err);
    return res.status(500).json({ message: 'Failed to cancel order', error: err.message });
  }
}

