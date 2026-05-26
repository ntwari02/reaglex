import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../middleware/auth';
import { Order, OrderStatus } from '../models/Order';
import { Product } from '../models/Product';
import { AbandonedCart } from '../models/AbandonedCart';
import {
  cancelPendingQueueJobs,
  appendTimeline,
  emitRecoveryEvent,
} from '../services/cartRecoveryEngine.service';
import { recordRecommendationActivity } from '../services/recommendationEmail.service';
import { restoreInventoryForOrder } from '../services/inventory.service';
import { convertUsdToCurrency, detectCurrencyFromRequest } from '../services/exchangeRate.service';
import { SharedCart } from '../models/SharedCart';
import { orchestrateCheckoutPlan } from '../services/orderOrchestrationService';
import { buildReorderSuggestion, explainCheckoutShipping } from '../services/cartAIService';
import { splitOrderGroups } from '../services/fulfillmentEngine';
import { createLockerAccess } from '../services/lockerService';
import { digitalEscrowReleaseEligibleAt } from '../services/digitalDeliveryService';
import { predictCancellationReason } from '../services/cancellationIntelligence.service';
import { verifyPickupProof } from '../services/pickupVerificationService';
import { releaseEscrow } from '../services/escrowService';
import { completeAdminOrder } from '../services/orderLifecycle.service';
import {
  buildShipmentGroupsFromLines,
  computeShippingForOrderGroup,
  fingerprintShippingAddress,
} from '../services/reaglexShipping.service';
import type { ReaglexShippingMethodKey } from '../types/reaglexShipping.types';

function normalizeShippingMethodKey(raw?: string): ReaglexShippingMethodKey {
  const m = String(raw || 'standard').toLowerCase();
  if (m === 'express' || m === 'overnight' || m === 'international') return 'express';
  if (m === 'pickup') return 'pickup';
  return 'standard';
}

function resolveMethodForGroup(
  shippingMethods: Record<string, string>,
  groupKey: string,
  sellerId: string
): ReaglexShippingMethodKey {
  if (shippingMethods[groupKey]) return normalizeShippingMethodKey(shippingMethods[groupKey]);
  if (shippingMethods[sellerId]) return normalizeShippingMethodKey(shippingMethods[sellerId]);
  return 'standard';
}

/**
 * Create order(s) from cart checkout
 * POST /api/orders
 * Creates one order per Reaglex shipment group (seller + warehouse).
 */
export async function createOrder(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  if (req.user.role !== 'buyer') {
    return res.status(403).json({ message: 'Only buyer accounts can place storefront orders' });
  }

  try {
    const {
      sellerGroups,
      shippingAddress,
      paymentMethod,
      shippingMethods,
      notes,
      shippingQuoteLock,
      strategy,
      escrowInsurance,
      products: cartProducts,
      fulfillment,
      fulfillmentByProduct,
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
      displayCurrency?: string;
      /** Client lock from last checkout quote — must match server recomputation (escrow-safe totals). */
      shippingQuoteLock?: {
        addressFingerprint: string;
        totalShipping: number;
        byGroup: Record<string, number>;
      };
      strategy?: 'lowest_cost' | 'fastest_delivery' | 'green_shipping';
      escrowInsurance?: {
        enabled?: boolean;
        premium?: number;
        coverageTypes?: Array<'damaged' | 'lost' | 'late'>;
      };
      products?: Array<{ product_id: string; quantity: number }>;
      fulfillment?: {
        type?: 'shipping' | 'pickup' | 'digital' | 'service';
        pickupLocationId?: string;
        pickupTime?: string;
        pickupLocker?: string;
      };
      fulfillmentByProduct?: Record<string, 'shipping' | 'pickup' | 'digital' | 'service'>;
    };

    const buyerId = new mongoose.Types.ObjectId(req.user.id);
    const orders: mongoose.Document[] = [];

    const requestedCurrency = String(req.body?.displayCurrency || '').trim().toUpperCase();
    const checkoutCurrency = requestedCurrency || detectCurrencyFromRequest(req);

    const qtyByProduct = new Map<string, number>();
    const normalizedGroups =
      Array.isArray(sellerGroups) && sellerGroups.length
        ? sellerGroups
        : [{
            sellerId: '',
            items: Array.isArray(cartProducts)
              ? cartProducts.map((p) => ({ product_id: p.product_id, quantity: p.quantity }))
              : [],
            subtotal: 0,
            discount: 0,
          }];
    for (const group of normalizedGroups || []) {
      for (const item of group.items || []) {
        const pid = String(item.product_id || '').trim();
        if (!pid) continue;
        qtyByProduct.set(pid, (qtyByProduct.get(pid) || 0) + Math.max(1, Math.min(999, Number(item.quantity) || 1)));
      }
    }

    const productIds = [...qtyByProduct.keys()].filter((id) => mongoose.Types.ObjectId.isValid(id));
    if (!productIds.length) {
      return res.status(400).json({ message: 'No valid line items' });
    }

    const productDocs = await Product.find({ _id: { $in: productIds } })
      .select('sellerId name price warehouseId fulfillmentType listingMode launchAt publicationStatus status stock')
      .lean();
    if (productDocs.length !== productIds.length) {
      return res.status(404).json({ message: 'One or more products were not found' });
    }
    const notBuyable = (productDocs as any[]).find(
      (p) =>
        p.listingMode === 'upcoming' ||
        !['in_stock', 'low_stock'].includes(String(p.status || '')) ||
        (p.publicationStatus && p.publicationStatus !== 'published' && p.publicationStatus !== 'pending_verification'),
    );
    if (notBuyable) {
      return res.status(400).json({
        message: 'One or more items are not available for purchase yet (upcoming or unpublished).',
      });
    }

    const pmap = new Map<
      string,
      {
        sellerId: mongoose.Types.ObjectId;
        name: string;
        price: number;
        warehouseId?: string;
        fulfillmentType?: 'shipping' | 'pickup' | 'digital' | 'service';
      }
    >();
    for (const p of productDocs) {
      pmap.set(String(p._id), {
        sellerId: p.sellerId as mongoose.Types.ObjectId,
        name: p.name,
        price: p.price,
        warehouseId: (p as { warehouseId?: string }).warehouseId,
        fulfillmentType: (p as any).fulfillmentType || 'shipping',
      });
    }

    const lines = productIds.map((productId) => ({
      productId,
      quantity: qtyByProduct.get(productId) || 1,
    }));

    const fulfillmentGroups = splitOrderGroups({
      lines,
      productsById: pmap,
      fulfillmentByProduct,
      fallbackType: fulfillment?.type || 'shipping',
    });
    const shippingLines = fulfillmentGroups
      .find((g) => g.type === 'shipping')
      ?.items || [];
    const groupMap = await buildShipmentGroupsFromLines(shippingLines, pmap);
    const orchestration = await orchestrateCheckoutPlan({
      lines,
      shippingAddress,
      strategy,
    });
    const aiSelectedMethods = orchestration.optimized.selectedMethods;

    const discountBySeller = new Map<string, number>();
    for (const g of sellerGroups || []) {
      const sid = String(g.sellerId);
      discountBySeller.set(sid, (discountBySeller.get(sid) || 0) + Math.max(0, Number(g.discount) || 0));
    }

    const sellerSubtotalSum = new Map<string, number>();
    for (const [, g] of groupMap) {
      let s = 0;
      for (const l of g.lines) {
        const p = pmap.get(String(l.productId));
        if (p) s += p.price * l.quantity;
      }
      sellerSubtotalSum.set(g.sellerId, (sellerSubtotalSum.get(g.sellerId) || 0) + s);
    }

    type Planned = {
      groupKey: string;
      sellerOid: mongoose.Types.ObjectId;
      orderNumber: string;
      fulfillmentType: 'shipping' | 'pickup' | 'digital' | 'service';
      initialStatus: OrderStatus;
      orderItems: {
        productId: mongoose.Types.ObjectId;
        name: string;
        quantity: number;
        price: number;
        variant?: string;
      }[];
      groupSubtotal: number;
      subtotalAfterDiscount: number;
      tax: number;
      shippingCost: number;
      snapshot: Record<string, unknown>;
    };

    const planned: Planned[] = [];

    for (const [groupKey, g] of groupMap) {
      const sellerOid = new mongoose.Types.ObjectId(g.sellerId);
      const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      const orderItems: Planned['orderItems'] = [];

      let groupSubtotal = 0;
      for (const l of g.lines) {
        const p = pmap.get(String(l.productId));
        if (!p) continue;
        orderItems.push({
          productId: new mongoose.Types.ObjectId(l.productId),
          name: p.name,
          quantity: l.quantity,
          price: p.price,
        });
        groupSubtotal += p.price * l.quantity;
      }

      const sellerTotal = sellerSubtotalSum.get(g.sellerId) || groupSubtotal;
      const sellerDisc = Math.min(discountBySeller.get(g.sellerId) || 0, sellerTotal);
      const groupDiscount =
        sellerTotal > 0 ? (groupSubtotal / sellerTotal) * sellerDisc : 0;

      const subtotalAfterDiscount = Math.max(0, groupSubtotal - groupDiscount);
      const tax = subtotalAfterDiscount * 0.1;

      const hasManualMethod = Boolean(
        shippingMethods?.[groupKey] || shippingMethods?.[g.sellerId]
      );
      const methodKey = hasManualMethod
        ? resolveMethodForGroup(shippingMethods || {}, groupKey, g.sellerId)
        : aiSelectedMethods[groupKey] || 'standard';
      const { snapshot, shippingTotal } = await computeShippingForOrderGroup({
        sellerId: g.sellerId,
        warehouseId: g.warehouseId,
        lines: g.lines,
        shippingAddress: {
          full_name: shippingAddress.full_name,
          phone: shippingAddress.phone,
          address_line1: shippingAddress.address_line1,
          address_line2: shippingAddress.address_line2,
          city: shippingAddress.city,
          state: shippingAddress.state,
          postal_code: shippingAddress.postal_code,
          country: shippingAddress.country,
        },
        methodKey,
      });

      const shippingCost = shippingTotal;

      planned.push({
        groupKey,
        sellerOid,
        orderNumber,
        fulfillmentType: 'shipping',
        initialStatus: 'pending',
        orderItems,
        groupSubtotal,
        subtotalAfterDiscount,
        tax,
        shippingCost,
        snapshot,
      });
    }

    const nonShippingGroups = fulfillmentGroups.filter((g) => g.type !== 'shipping');
    for (const fg of nonShippingGroups) {
      const bySeller = new Map<string, typeof fg.items>();
      for (const item of fg.items) {
        const sellerId = String(pmap.get(String(item.productId))?.sellerId || '');
        if (!sellerId) continue;
        if (!bySeller.has(sellerId)) bySeller.set(sellerId, []);
        bySeller.get(sellerId)!.push(item);
      }

      for (const [sellerId, itemsForSeller] of bySeller) {
        const sellerOid = new mongoose.Types.ObjectId(sellerId);
        const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        const orderItems: Planned['orderItems'] = [];
        let groupSubtotal = 0;
        for (const l of itemsForSeller) {
          const p = pmap.get(String(l.productId));
          if (!p) continue;
          orderItems.push({
            productId: new mongoose.Types.ObjectId(l.productId),
            name: p.name,
            quantity: l.quantity,
            price: p.price,
          });
          groupSubtotal += p.price * l.quantity;
        }
        const subtotalAfterDiscount = groupSubtotal;
        const tax = fg.type === 'digital' || fg.type === 'service' ? 0 : subtotalAfterDiscount * 0.1;
        planned.push({
          groupKey: `${fg.type}|${sellerId}`,
          sellerOid,
          orderNumber,
          fulfillmentType: fg.type,
          initialStatus:
            fg.type === 'pickup'
              ? 'processing'
              : fg.type === 'digital'
                ? 'paid'
                : fg.type === 'service'
                  ? 'booked'
                  : 'pending',
          orderItems,
          groupSubtotal,
          subtotalAfterDiscount,
          tax,
          shippingCost: 0,
          snapshot: {},
        });
      }
    }

    if (shippingQuoteLock) {
      const fp = fingerprintShippingAddress({
        address_line1: shippingAddress.address_line1,
        city: shippingAddress.city,
        postal_code: shippingAddress.postal_code,
        country: shippingAddress.country,
      });
      if (fp !== shippingQuoteLock.addressFingerprint) {
        return res.status(409).json({
          message: 'Shipping address changed since your quote. Please return to delivery and refresh.',
        });
      }
      const sumShip = planned.reduce((s, p) => s + p.shippingCost, 0);
      const lockSum = Number(shippingQuoteLock.totalShipping);
      if (!Number.isFinite(lockSum) || Math.abs(sumShip - lockSum) > 0.05) {
        return res.status(409).json({
          message: 'Shipping total changed. Please review delivery options and try again.',
        });
      }
      for (const p of planned) {
        const expected = shippingQuoteLock.byGroup[p.groupKey];
        if (expected == null) continue;
        if (Math.abs(p.shippingCost - Number(expected)) > 0.05) {
          return res.status(409).json({
            message: 'A seller shipping charge changed. Please review delivery options and try again.',
          });
        }
      }
    }

    for (const p of planned) {
      const insuranceEnabled = Boolean(escrowInsurance?.enabled);
      const insurancePremium = insuranceEnabled
        ? Math.max(0, Number(escrowInsurance?.premium ?? 2))
        : 0;
      const total = p.subtotalAfterDiscount + p.tax + p.shippingCost + insurancePremium;
      const converted = await convertUsdToCurrency(total, checkoutCurrency, { roundMode: 'round' });

      const order = new Order({
        sellerId: p.sellerOid,
        buyerId,
        orderNumber: p.orderNumber,
        customer: shippingAddress.full_name,
        customerEmail: req.user.email || '',
        customerPhone: shippingAddress.phone,
        items: p.orderItems,
        subtotal: p.groupSubtotal,
        shipping: p.shippingCost,
        tax: p.tax,
        total,
        status: p.initialStatus,
        date: new Date(),
        shippingAddress: {
          name: shippingAddress.full_name,
          street: `${shippingAddress.address_line1}${shippingAddress.address_line2 ? `, ${shippingAddress.address_line2}` : ''}`,
          city: shippingAddress.city,
          state: shippingAddress.state || 'N/A',
          zip: shippingAddress.postal_code || '',
          country: shippingAddress.country,
        },
        paymentMethod,
        reaglexShipping: p.fulfillmentType === 'shipping' ? (p.snapshot as any) : undefined,
        fulfillment: {
          type: p.fulfillmentType,
          pickupLocationId: fulfillment?.pickupLocationId,
          pickupTime: fulfillment?.pickupTime ? new Date(fulfillment.pickupTime) : undefined,
          pickupLocker: fulfillment?.pickupLocker,
          pickupLocation: fulfillment?.pickupLocationId
            ? {
                id: fulfillment.pickupLocationId,
                name: 'Pickup Location',
                openingHours: '08:00-20:00',
                coordinates: [-1.9441, 30.0619],
                readyInMinutes: 30,
              }
            : undefined,
        },
        pickup:
          p.fulfillmentType === 'pickup'
            ? {
                locker: fulfillment?.pickupLocker
                  ? createLockerAccess({ lockerId: fulfillment.pickupLocker })
                  : undefined,
              }
            : undefined,
        orderOptimization: orchestration.optimized.orderOptimization,
        currencySnapshot: {
          totalUsd: total,
          totalLocal: converted.local,
          currency: converted.currency,
          exchangeRate: converted.rate,
          timestamp: new Date(),
          lockedAt: new Date(),
        },
        escrow: {
          status: 'PENDING',
          autoReleaseScheduled: true,
          releaseEligibleAt: p.fulfillmentType === 'digital' ? digitalEscrowReleaseEligibleAt(10) : undefined,
          insurance: {
            enabled: insuranceEnabled,
            plan: 'delivery_protection',
            premium: insurancePremium,
            currency: 'USD',
            coverageTypes:
              escrowInsurance?.coverageTypes?.length
                ? escrowInsurance.coverageTypes
                : ['damaged', 'lost', 'late'],
            compensationCap: insuranceEnabled ? Math.round((p.groupSubtotal + p.shippingCost) * 100) / 100 : 0,
            status: insuranceEnabled ? 'active' : 'expired',
          },
        },
        timeline: [
          {
            status: 'pending',
            date: new Date(),
            time: new Date().toLocaleTimeString(),
          },
        ],
      });

      await order.save();
      orders.push(order);

      for (const item of p.orderItems) {
        void recordRecommendationActivity({
          userId: req.user.id,
          eventType: 'purchase',
          productId: String(item.productId),
          meta: {
            quantity: item.quantity,
            orderNumber: p.orderNumber,
          },
        });
      }
    }

    // Best-effort: mark abandoned carts as recovered and cancel pending recovery emails.
    const activeCarts = await AbandonedCart.find({
      userId: new mongoose.Types.ObjectId(req.user.id),
      recovered: false,
    })
      .select('_id')
      .lean();
    for (const c of activeCarts as any[]) {
      await cancelPendingQueueJobs('cart_purchased', String(c._id));
      await appendTimeline(String(c._id), 'recovered', { source: 'checkout' });
    }
    await AbandonedCart.updateMany(
      { userId: new mongoose.Types.ObjectId(req.user.id), recovered: false },
      { $set: { recovered: true } },
    );
    if (activeCarts.length) {
      void emitRecoveryEvent('cart.recovered', {
        userId: req.user.id,
        count: activeCarts.length,
      });
    }

    // Marketplace AI: record every cross-seller co-purchase pair so the
    // co-occurrence engine can power "Frequently bought together" without
    // any ML. Fire-and-forget — never block checkout completion.
    try {
      const allProductIds = planned
        .flatMap((p) => p.orderItems.map((i: any) => String(i.productId)))
        .filter(Boolean);
      if (allProductIds.length >= 2) {
        // Dynamic import keeps the marketplace AI module optional at runtime
        // — if the file is missing the checkout still succeeds.
        const mod = await import('../services/ai/coOccurrenceEngine');
        void mod.recordBasketPurchase(allProductIds).catch(() => undefined);
      }
    } catch {
      /* ignore */
    }

    return res.status(201).json({
      success: true,
      orderOptimization: orchestration.optimized.orderOptimization,
      aiSplitPlan: orchestration.optimized.byGroup,
      orderGroups: fulfillmentGroups.map((g) => ({ type: g.type, count: g.items.length })),
      orders: orders.map((o) => ({
        id: o._id,
        orderNumber: (o as any).orderNumber,
        status: (o as any).status,
        total: (o as any).total,
        total_usd: (o as any).currencySnapshot?.totalUsd ?? (o as any).total,
        total_local: (o as any).currencySnapshot?.totalLocal ?? (o as any).total,
        currency: (o as any).currencySnapshot?.currency ?? 'USD',
        exchange_rate: (o as any).currencySnapshot?.exchangeRate ?? 1,
        locked_at: (o as any).currencySnapshot?.lockedAt ?? (o as any).createdAt,
        sellerId: String((o as any).sellerId),
        reaglexShipping: (o as any).reaglexShipping,
        fulfillment: (o as any).fulfillment,
        orderOptimization: (o as any).orderOptimization,
      })),
    });
  } catch (err: any) {
    console.error('Error creating order:', err);
    if (typeof err?.message === 'string' && err.message.toLowerCase().includes('insufficient stock')) {
      return res.status(409).json({ message: err.message });
    }
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

    // Only allow cancellation of pending/processing/paused orders
    if (order.status !== 'pending' && order.status !== 'processing' && order.status !== 'paused') {
      return res.status(400).json({ 
        message: `Cannot cancel order with status: ${order.status}. Only pending, processing, or paused orders can be cancelled.` 
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

    void restoreInventoryForOrder(orderId, 'order_cancelled').catch((e) => {
      console.error('Failed to restore inventory on buyer cancellation:', e);
    });

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

export async function createSharedCart(req: AuthenticatedRequest, res: Response) {
  if (!req.user) return res.status(401).json({ message: 'Authentication required' });
  try {
    const ownerId = new mongoose.Types.ObjectId(req.user.id);
    const members = Array.isArray(req.body?.members) ? req.body.members : [];
    const normalizedMembers = members
      .filter((m: any) => mongoose.Types.ObjectId.isValid(String(m?.userId)))
      .map((m: any) => ({
        userId: new mongoose.Types.ObjectId(String(m.userId)),
        role: m?.role === 'editor' ? 'editor' : 'viewer',
      }));

    const cart = await SharedCart.create({
      ownerId,
      name: String(req.body?.name || 'Shared Cart'),
      members: normalizedMembers,
      items: [],
    });
    return res.status(201).json({ success: true, cart });
  } catch (err: any) {
    return res.status(500).json({ message: 'Failed to create shared cart', error: err.message });
  }
}

export async function getSharedCart(req: AuthenticatedRequest, res: Response) {
  if (!req.user) return res.status(401).json({ message: 'Authentication required' });
  try {
    const cartId = String(req.params.cartId || '');
    if (!mongoose.Types.ObjectId.isValid(cartId)) return res.status(400).json({ message: 'Invalid cartId' });

    const userId = new mongoose.Types.ObjectId(req.user.id);
    const cart = await SharedCart.findOne({
      _id: new mongoose.Types.ObjectId(cartId),
      $or: [{ ownerId: userId }, { 'members.userId': userId }],
    }).lean();
    if (!cart) return res.status(404).json({ message: 'Shared cart not found' });
    return res.json({ success: true, cart });
  } catch (err: any) {
    return res.status(500).json({ message: 'Failed to fetch shared cart', error: err.message });
  }
}

export async function upsertSharedCartItem(req: AuthenticatedRequest, res: Response) {
  if (!req.user) return res.status(401).json({ message: 'Authentication required' });
  try {
    const cartId = String(req.params.cartId || '');
    const productId = String(req.body?.productId || req.body?.product_id || '').trim();
    const quantity = Math.max(1, Math.min(999, Number(req.body?.quantity) || 1));
    const variantId = req.body?.variantId ? String(req.body.variantId) : undefined;

    if (!mongoose.Types.ObjectId.isValid(cartId) || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: 'Valid cartId and productId are required' });
    }

    const userId = new mongoose.Types.ObjectId(req.user.id);
    const cart = await SharedCart.findOne({
      _id: new mongoose.Types.ObjectId(cartId),
      $or: [{ ownerId: userId }, { members: { $elemMatch: { userId, role: 'editor' } } }],
    });
    if (!cart) return res.status(403).json({ message: 'Editor access required' });

    const existing = cart.items.find((i) => String(i.productId) === productId && String(i.variantId || '') === String(variantId || ''));
    if (existing) {
      existing.quantity = quantity;
    } else {
      cart.items.push({
        productId: new mongoose.Types.ObjectId(productId),
        quantity,
        variantId,
      } as any);
    }
    await cart.save();
    return res.json({ success: true, cart });
  } catch (err: any) {
    return res.status(500).json({ message: 'Failed to update shared cart', error: err.message });
  }
}

export async function updateSharedCartMembers(req: AuthenticatedRequest, res: Response) {
  if (!req.user) return res.status(401).json({ message: 'Authentication required' });
  try {
    const cartId = String(req.params.cartId || '');
    if (!mongoose.Types.ObjectId.isValid(cartId)) return res.status(400).json({ message: 'Invalid cartId' });
    const ownerId = new mongoose.Types.ObjectId(req.user.id);

    const members = Array.isArray(req.body?.members) ? req.body.members : [];
    const normalized = members
      .filter((m: any) => mongoose.Types.ObjectId.isValid(String(m?.userId)))
      .map((m: any) => ({
        userId: new mongoose.Types.ObjectId(String(m.userId)),
        role: m?.role === 'editor' ? 'editor' : 'viewer',
      }));

    const cart = await SharedCart.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(cartId), ownerId },
      { $set: { members: normalized } },
      { new: true }
    );
    if (!cart) return res.status(404).json({ message: 'Shared cart not found or unauthorized' });
    return res.json({ success: true, cart });
  } catch (err: any) {
    return res.status(500).json({ message: 'Failed to update members', error: err.message });
  }
}

export async function getUnifiedCheckoutIntelligence(req: AuthenticatedRequest, res: Response) {
  if (!req.user) return res.status(401).json({ message: 'Authentication required' });
  try {
    const {
      sellerGroups,
      lines,
      shippingAddress,
      strategy,
      productId,
      assistantContext,
      sharedCartId,
    } = req.body as {
      sellerGroups?: Array<{
        sellerId: string;
        items: Array<{ product_id: string; quantity: number }>;
      }>;
      lines?: Array<{ productId: string; quantity: number }>;
      shippingAddress?: {
        full_name: string;
        phone?: string;
        address_line1: string;
        address_line2?: string;
        city: string;
        state?: string;
        postal_code?: string;
        country: string;
      };
      strategy?: 'lowest_cost' | 'fastest_delivery' | 'green_shipping';
      productId?: string;
      assistantContext?: {
        nearestWarehouseAvailable?: boolean;
        importTaxApplied?: boolean;
        bulkyDimensions?: boolean;
        distanceKm?: number;
      };
      sharedCartId?: string;
    };

    let optimization: any = null;
    if (shippingAddress?.address_line1 && shippingAddress?.city && shippingAddress?.country) {
      const qtyByProduct = new Map<string, number>();
      if (Array.isArray(lines) && lines.length) {
        for (const item of lines) {
          const pid = String(item.productId || '').trim();
          if (!pid) continue;
          qtyByProduct.set(pid, (qtyByProduct.get(pid) || 0) + Math.max(1, Math.min(999, Number(item.quantity) || 1)));
        }
      } else if (Array.isArray(sellerGroups)) {
        for (const group of sellerGroups || []) {
          for (const item of group.items || []) {
            const pid = String(item.product_id || '').trim();
            if (!pid) continue;
            qtyByProduct.set(pid, (qtyByProduct.get(pid) || 0) + Math.max(1, Math.min(999, Number(item.quantity) || 1)));
          }
        }
      }
      const productIds = [...qtyByProduct.keys()].filter((id) => mongoose.Types.ObjectId.isValid(id));
      if (productIds.length) {
        const lines = productIds.map((pid) => ({ productId: pid, quantity: qtyByProduct.get(pid) || 1 }));
        const orchestration = await orchestrateCheckoutPlan({
          lines,
          shippingAddress,
          strategy,
        });
        optimization = {
          strategy: orchestration.optimized.orderOptimization.strategy,
          orderOptimization: orchestration.optimized.orderOptimization,
          selectedMethods: orchestration.optimized.selectedMethods,
          aiSplitPlan: orchestration.optimized.byGroup,
          shipmentGroups: orchestration.quote.groups,
          totalShipping: orchestration.quote.totalShipping,
          addressFingerprint: orchestration.quote.addressFingerprint,
          warnings: orchestration.quote.warnings,
        };
      }
    }

    let reorderSuggestion: any = null;
    const suggestionProductId = String(productId || '').trim();
    if (mongoose.Types.ObjectId.isValid(suggestionProductId)) {
      reorderSuggestion = await buildReorderSuggestion({
        buyerId: req.user.id,
        productId: suggestionProductId,
      });
    }

    const aiAssistant = explainCheckoutShipping({
      nearestWarehouseAvailable: assistantContext?.nearestWarehouseAvailable !== false,
      importTaxApplied: Boolean(assistantContext?.importTaxApplied),
      bulkyDimensions: Boolean(assistantContext?.bulkyDimensions),
      distanceKm: Number(assistantContext?.distanceKm || 0),
    });

    let sharedCart: any = null;
    const sharedId = String(sharedCartId || '').trim();
    if (mongoose.Types.ObjectId.isValid(sharedId)) {
      const userId = new mongoose.Types.ObjectId(req.user.id);
      sharedCart = await SharedCart.findOne({
        _id: new mongoose.Types.ObjectId(sharedId),
        $or: [{ ownerId: userId }, { 'members.userId': userId }],
      }).lean();
    }

    return res.json({
      success: true,
      optimization,
      reorderSuggestion,
      aiAssistant,
      sharedCart,
    });
  } catch (err: any) {
    return res.status(500).json({ message: 'Failed to run unified checkout intelligence', error: err.message });
  }
}

export async function getCancellationIntelligence(req: AuthenticatedRequest, res: Response) {
  if (!req.user) return res.status(401).json({ message: 'Authentication required' });
  try {
    const buyerId = new mongoose.Types.ObjectId(req.user.id);
    const { orderId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ message: 'Invalid order ID' });
    }
    const order = await Order.findOne({ _id: new mongoose.Types.ObjectId(orderId), buyerId } as any).lean();
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (!['pending', 'processing', 'paused'].includes(String(order.status))) {
      return res.status(400).json({ message: 'Cancellation intelligence is only available before shipping' });
    }

    const prediction = await predictCancellationReason(orderId);
    await Order.findByIdAndUpdate(orderId, {
      $set: {
        'cancellationIntelligence.predictedReason': prediction.predictedReason,
        'cancellationIntelligence.predictedConfidence': prediction.predictedConfidence,
        'cancellationIntelligence.retentionOffers': prediction.retentionOffers,
        'cancellationIntelligence.riskScore': prediction.riskScore,
      },
    });

    return res.json({
      success: true,
      cancellationPrediction: prediction,
      message:
        prediction.predictedReason === 'wrong_size'
          ? 'Likely issue: wrong size. Offer size exchange before cancellation.'
          : 'Try retention offers before canceling to avoid order churn.',
    });
  } catch (err: any) {
    return res.status(500).json({ message: 'Failed to generate cancellation intelligence', error: err.message });
  }
}

export async function pauseOrder(req: AuthenticatedRequest, res: Response) {
  if (!req.user) return res.status(401).json({ message: 'Authentication required' });
  try {
    const buyerId = new mongoose.Types.ObjectId(req.user.id);
    const { orderId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ message: 'Invalid order ID' });
    }
    const order = await Order.findOne({ _id: new mongoose.Types.ObjectId(orderId), buyerId } as any);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (!['pending', 'processing'].includes(String(order.status))) {
      return res.status(400).json({ message: 'Only pending or processing orders can be paused' });
    }

    const reason = String(req.body?.reason || 'buyer_requested_pause').trim();
    order.status = 'paused';
    (order as any).cancellationIntelligence = {
      ...((order as any).cancellationIntelligence || {}),
      pausedAt: new Date(),
      pauseReason: reason,
    };
    order.timeline.push({
      status: 'paused',
      date: new Date(),
      time: new Date().toLocaleTimeString(),
    });
    await order.save();

    return res.json({
      success: true,
      message: 'Order paused successfully',
      order: {
        id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ message: 'Failed to pause order', error: err.message });
  }
}

export async function confirmPickup(req: AuthenticatedRequest, res: Response) {
  if (!req.user) return res.status(401).json({ message: 'Authentication required' });
  try {
    const buyerId = new mongoose.Types.ObjectId(req.user.id);
    const { orderId, qrToken, otp, gps, faceVerified, sellerScan } = req.body as {
      orderId: string;
      qrToken?: string;
      otp?: string;
      gps?: { lat?: number; lng?: number };
      faceVerified?: boolean;
      sellerScan?: boolean;
    };
    if (!mongoose.Types.ObjectId.isValid(orderId)) return res.status(400).json({ message: 'Invalid order ID' });

    const order = await Order.findOne({ _id: new mongoose.Types.ObjectId(orderId), buyerId } as any);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if ((order as any)?.fulfillment?.type !== 'pickup') {
      return res.status(400).json({ message: 'Order is not pickup fulfillment' });
    }
    if (!['ready_for_pickup', 'processing'].includes(String(order.status))) {
      return res.status(400).json({ message: 'Order is not ready for pickup confirmation' });
    }
    const checks = verifyPickupProof({
      expectedQrToken: (order as any)?.pickup?.qrToken,
      expectedOtp: (order as any)?.pickup?.otp,
      providedQrToken: qrToken,
      providedOtp: otp,
      gps,
      sellerScan: Boolean(sellerScan),
      faceVerified: Boolean(faceVerified),
      requireFace: false,
    });
    if (!checks.ok) {
      return res.status(400).json({ message: 'Pickup verification failed', pickupVerification: checks.checks });
    }

    order.status = 'pickup_confirmed';
    (order as any).escrow = {
      ...((order as any).escrow || {}),
      status: 'PICKUP_CONFIRMED',
    };
    (order as any).pickup = {
      ...((order as any).pickup || {}),
      verification: checks.checks,
    };
    order.timeline.push({
      status: 'pickup_confirmed',
      date: new Date(),
      time: new Date().toLocaleTimeString(),
    });
    await order.save();
    await releaseEscrow(String(order._id), req.user.id);
    await Order.findByIdAndUpdate(order._id, {
      $set: { status: 'completed' },
      $push: {
        timeline: {
          status: 'completed',
          date: new Date(),
          time: new Date().toLocaleTimeString(),
        },
      },
    });

    return res.json({
      success: true,
      order: { id: order._id, orderNumber: order.orderNumber, status: 'completed' },
      pickupVerification: checks.checks,
    });
  } catch (err: any) {
    return res.status(500).json({ message: 'Failed to confirm pickup', error: err.message });
  }
}

export async function confirmDigitalAccess(req: AuthenticatedRequest, res: Response) {
  if (!req.user) return res.status(401).json({ message: 'Authentication required' });
  try {
    const buyerId = new mongoose.Types.ObjectId(req.user.id);
    const { orderId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(orderId)) return res.status(400).json({ message: 'Invalid order ID' });
    const order = await Order.findOne({ _id: new mongoose.Types.ObjectId(orderId), buyerId } as any);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if ((order as any)?.fulfillment?.type !== 'digital') {
      return res.status(400).json({ message: 'Order is not digital fulfillment' });
    }
    await Order.findByIdAndUpdate(order._id, {
      $set: {
        status: 'delivered',
        'escrow.status': 'DIGITAL_CONFIRMED',
      },
      $push: {
        timeline: {
          status: 'delivered',
          date: new Date(),
          time: new Date().toLocaleTimeString(),
        },
      },
    });
    await releaseEscrow(String(order._id), req.user.id);
    await Order.findByIdAndUpdate(order._id, {
      $set: { status: 'completed' },
      $push: {
        timeline: {
          status: 'completed',
          date: new Date(),
          time: new Date().toLocaleTimeString(),
        },
      },
    });
    return res.json({ success: true, message: 'Digital access confirmed and escrow released' });
  } catch (err: any) {
    return res.status(500).json({ message: 'Failed to confirm digital access', error: err.message });
  }
}

export async function approveServiceCompletion(req: AuthenticatedRequest, res: Response) {
  if (!req.user) return res.status(401).json({ message: 'Authentication required' });
  try {
    const buyerId = new mongoose.Types.ObjectId(req.user.id);
    const { orderId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(orderId)) return res.status(400).json({ message: 'Invalid order ID' });
    const order = await Order.findOne({ _id: new mongoose.Types.ObjectId(orderId), buyerId } as any);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if ((order as any)?.fulfillment?.type !== 'service') {
      return res.status(400).json({ message: 'Order is not service fulfillment' });
    }
    await Order.findByIdAndUpdate(order._id, {
      $set: {
        status: 'completed',
        'escrow.status': 'SERVICE_CONFIRMED',
      },
      $push: {
        timeline: {
          status: 'completed',
          date: new Date(),
          time: new Date().toLocaleTimeString(),
        },
      },
    });
    await releaseEscrow(String(order._id), req.user.id);
    return res.json({ success: true, message: 'Service completion approved and escrow released' });
  } catch (err: any) {
    return res.status(500).json({ message: 'Failed to approve service completion', error: err.message });
  }
}

export async function confirmOrderReceipt(req: AuthenticatedRequest, res: Response) {
  if (!req.user) return res.status(401).json({ message: 'Authentication required' });
  try {
    const buyerId = new mongoose.Types.ObjectId(req.user.id);
    const { orderId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(orderId)) return res.status(400).json({ message: 'Invalid order ID' });

    const order = await Order.findOne({ _id: new mongoose.Types.ObjectId(orderId), buyerId } as any).lean();
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (String(order.status) !== 'delivered') {
      return res.status(400).json({ message: 'Only delivered orders can be confirmed' });
    }

    const result = await completeAdminOrder(orderId, req.user.id, { releasePayout: true });
    await Order.findByIdAndUpdate(orderId, {
      $set: {
        'autoCompletion.state': 'completed',
        'autoCompletion.reason': 'buyer_confirmed',
        'autoCompletion.completedAt': new Date(),
        'autoCompletion.completionSource': 'buyer_confirmed',
      },
      $push: {
        timeline: {
          status: 'buyer_confirmed_receipt',
          date: new Date(),
          time: new Date().toLocaleTimeString(),
        },
      },
    });

    return res.json({
      success: true,
      orderId,
      orderNumber: result.order.orderNumber,
      status: 'completed',
      escrowReleased: result.escrowReleased,
      message: 'Order confirmed and completion flow finished.',
    });
  } catch (err: any) {
    return res.status(500).json({ message: 'Failed to confirm order receipt', error: err.message });
  }
}

