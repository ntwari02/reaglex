import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../middleware/auth';
import { Order } from '../models/Order';
import { Product } from '../models/Product';
import { Message, MessageThread } from '../models/MessageThread';
import {
  buildBuyerCommercialProfiles,
  orderMatchesSegmentFilters,
  type BuyerGroupFilter,
  type PaymentTermsFilter,
  type SalesRepFilter,
} from '../utils/analyticsSegmentFilters';

/**
 * Helper to get seller ID from request
 */
const getSellerId = (req: AuthenticatedRequest): mongoose.Types.ObjectId | null => {
  if (!req.user?.id) return null;
  try {
    return new mongoose.Types.ObjectId(req.user.id);
  } catch {
    return null;
  }
};

function orderTimeMs(o: { createdAt?: Date; date?: Date }): number {
  const d = o.createdAt || o.date;
  return d ? new Date(d).getTime() : 0;
}

function assignOrderCustomerSegments(allOrders: any[]): Map<string, 'new' | 'existing'> {
  const sorted = [...allOrders].sort((a, b) => orderTimeMs(a) - orderTimeMs(b));
  const seen = new Set<string>();
  const map = new Map<string, 'new' | 'existing'>();
  for (const o of sorted) {
    const bid = o.buyerId?.toString();
    if (!bid) continue;
    const wasSeen = seen.has(bid);
    if (!wasSeen) seen.add(bid);
    map.set(o._id.toString(), wasSeen ? 'existing' : 'new');
  }
  return map;
}

/**
 * Helper to get date range based on time period
 */
const getDateRange = (timeRange: 'week' | 'month' | 'year'): { start: Date; end: Date } => {
  const end = new Date();
  const start = new Date();

  switch (timeRange) {
    case 'week':
      start.setDate(end.getDate() - 7);
      break;
    case 'month':
      start.setMonth(end.getMonth() - 1);
      break;
    case 'year':
      start.setFullYear(end.getFullYear() - 1);
      break;
  }

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  return { start, end };
};

/**
 * Helper to get previous period for comparison
 */
const getPreviousPeriod = (timeRange: 'week' | 'month' | 'year'): { start: Date; end: Date } => {
  const end = new Date();
  const start = new Date();

  switch (timeRange) {
    case 'week':
      end.setDate(end.getDate() - 7);
      start.setDate(end.getDate() - 7);
      break;
    case 'month':
      // Get first day of current month, then go back one month
      const currentMonth = end.getMonth();
      const currentYear = end.getFullYear();
      start.setFullYear(currentYear, currentMonth - 1, 1);
      end.setFullYear(currentYear, currentMonth, 0); // Last day of previous month
      break;
    case 'year':
      start.setFullYear(end.getFullYear() - 1, 0, 1); // January 1st of previous year
      end.setFullYear(end.getFullYear() - 1, 11, 31); // December 31st of previous year
      break;
  }

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  return { start, end };
};

/**
 * Calculate percentage change
 */
const calculateChange = (current: number, previous: number): { value: string; trend: 'up' | 'down' } => {
  if (previous === 0) {
    return current > 0 ? { value: '+100%', trend: 'up' } : { value: '0%', trend: 'up' };
  }
  const change = ((current - previous) / previous) * 100;
  const sign = change >= 0 ? '+' : '';
  return {
    value: `${sign}${change.toFixed(1)}%`,
    trend: change >= 0 ? 'up' : 'down',
  };
};

/**
 * Get comprehensive analytics data
 */
export async function getAnalytics(req: AuthenticatedRequest, res: Response) {
  try {
    const sellerId = getSellerId(req);
    if (!sellerId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const {
      timeRange = 'month',
      buyerGroup = 'all',
      paymentTerms = 'all',
      salesRep = 'all',
    } = req.query;

    const { start, end } = getDateRange(timeRange as 'week' | 'month' | 'year');
    const { start: prevStart, end: prevEnd } = getPreviousPeriod(timeRange as 'week' | 'month' | 'year');

    const allSellerOrders = await Order.find({
      sellerId: sellerId as any,
      status: { $ne: 'cancelled' },
    } as any).lean();

    const segmentFilters = {
      buyerGroup: String(buyerGroup) as BuyerGroupFilter,
      paymentTerms: String(paymentTerms) as PaymentTermsFilter,
      salesRep: String(salesRep) as SalesRepFilter,
    };
    const commercialProfiles = buildBuyerCommercialProfiles(allSellerOrders);
    const hasSegmentFilter =
      segmentFilters.buyerGroup !== 'all' ||
      segmentFilters.paymentTerms !== 'all' ||
      segmentFilters.salesRep !== 'all';

    const applySegment = <T extends { buyerId?: { toString(): string } }>(list: T[]) =>
      hasSegmentFilter
        ? list.filter((o) => orderMatchesSegmentFilters(o, segmentFilters, commercialProfiles))
        : list;

    const orders = applySegment(
      allSellerOrders.filter(
        (o) => orderTimeMs(o) >= start.getTime() && orderTimeMs(o) <= end.getTime(),
      ),
    );
    const prevOrders = applySegment(
      allSellerOrders.filter(
        (o) => orderTimeMs(o) >= prevStart.getTime() && orderTimeMs(o) <= prevEnd.getTime(),
      ),
    );

    // Calculate sales stats
    const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);
    const prevTotalRevenue = prevOrders.reduce((sum, order) => sum + (order.total || 0), 0);
    const revenueChange = calculateChange(totalRevenue, prevTotalRevenue);

    const totalOrders = orders.length;
    const prevTotalOrders = prevOrders.length;
    const ordersChange = calculateChange(totalOrders, prevTotalOrders);

    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const prevAverageOrderValue = prevTotalOrders > 0 ? prevTotalRevenue / prevTotalOrders : 0;
    const aovChange = calculateChange(averageOrderValue, prevAverageOrderValue);

    const segMap = assignOrderCustomerSegments(allSellerOrders);
    const returningOrders = orders.filter((o) => segMap.get(o._id.toString()) === 'existing').length;
    const repeatCustomerRate = totalOrders > 0 ? (returningOrders / totalOrders) * 100 : 0;
    const prevReturningOrders = prevOrders.filter((o) => segMap.get(o._id.toString()) === 'existing').length;
    const prevRepeatCustomerRate = prevTotalOrders > 0 ? (prevReturningOrders / prevTotalOrders) * 100 : 0;
    const repeatCustomerChange = calculateChange(repeatCustomerRate, prevRepeatCustomerRate);

    const uniqueBuyers = new Set(orders.map((o) => o.buyerId.toString()));
    const prevUniqueBuyers = new Set(prevOrders.map((o) => o.buyerId.toString()));

    // Get all products for this seller
    const products = await Product.find({ sellerId: sellerId as any } as any).lean();

    // Calculate product analytics
    const productStats = new Map<string, { views: number; sold: number; revenue: number; rating: number }>();

    // Initialize all products with real view data
    products.forEach((product) => {
      productStats.set(product._id.toString(), {
        views: (product.views || 0), // Use actual views from product model
        sold: 0,
        revenue: 0,
        rating: 0, // Will be calculated if we have ratings
      });
    });

    // Sold quantity and revenue from orders (views = product.views only — no synthetic inflation)
    orders.forEach((order) => {
      order.items.forEach((item) => {
        const productId = item.productId.toString();
        const stats = productStats.get(productId);
        if (stats) {
          stats.sold += item.quantity;
          stats.revenue += item.price * item.quantity;
        }
      });
    });

    // Convert to array and sort
    const productAnalytics = Array.from(productStats.entries())
      .map(([productId, stats]) => {
        const product = products.find((p) => p._id.toString() === productId);
        return {
          productId,
          name: product?.name || 'Unknown Product',
          views: stats.views,
          sold: stats.sold,
          revenue: stats.revenue,
          rating: stats.rating,
        };
      })
      .filter((p) => p.name !== 'Unknown Product');

    // Most viewed - use real view data
    const mostViewed = productAnalytics
      .sort((a, b) => b.views - a.views)
      .slice(0, 10)
      .map((p) => ({
        name: p.name,
        views: p.views, // Real view data from product model
        sold: p.sold,
        revenue: p.revenue,
        rating: p.rating,
      }));

    // Most sold
    const mostSold = productAnalytics
      .sort((a, b) => b.sold - a.sold)
      .slice(0, 10)
      .map((p) => ({
        name: p.name,
        views: p.views,
        sold: p.sold,
        revenue: p.revenue,
        rating: p.rating,
      }));

    // Highest revenue
    const highestRevenue = productAnalytics
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
      .map((p) => ({
        name: p.name,
        views: p.views,
        sold: p.sold,
        revenue: p.revenue,
        rating: p.rating,
      }));

    // Low performing (products with low sales)
    const lowPerforming = productAnalytics
      .filter((p) => p.sold < 5 && p.revenue < 100)
      .sort((a, b) => a.sold - b.sold)
      .slice(0, 10)
      .map((p) => ({
        name: p.name,
        views: p.views,
        sold: p.sold,
        revenue: p.revenue,
      }));

    // Calculate customer metrics
    // Return rate (orders with status that indicates return - for now using cancelled as proxy)
    const cancelledOrders = await Order.countDocuments({
      sellerId: sellerId as any,
      date: { $gte: start, $lte: end },
      status: 'cancelled',
    } as any);
    const returnRate = totalOrders > 0 ? (cancelledOrders / (totalOrders + cancelledOrders)) * 100 : 0;

    const prevCancelledOrders = await Order.countDocuments({
      sellerId: sellerId as any,
      date: { $gte: prevStart, $lte: prevEnd },
      status: 'cancelled',
    } as any);
    const prevReturnRate = prevTotalOrders > 0 ? (prevCancelledOrders / (prevTotalOrders + prevCancelledOrders)) * 100 : 0;
    const returnRateChange = calculateChange(returnRate, prevReturnRate);

    // Customer Lifetime Value (average revenue per customer)
    const customerRevenue = new Map<string, number>();
    orders.forEach((order) => {
      const buyerId = order.buyerId.toString();
      customerRevenue.set(buyerId, (customerRevenue.get(buyerId) || 0) + order.total);
    });
    const totalCustomerRevenue = Array.from(customerRevenue.values()).reduce((sum, rev) => sum + rev, 0);
    const customerLifetimeValue = uniqueBuyers.size > 0 ? totalCustomerRevenue / uniqueBuyers.size : 0;

    const prevCustomerRevenue = new Map<string, number>();
    prevOrders.forEach((order) => {
      const buyerId = order.buyerId.toString();
      prevCustomerRevenue.set(buyerId, (prevCustomerRevenue.get(buyerId) || 0) + order.total);
    });
    const prevTotalCustomerRevenue = Array.from(prevCustomerRevenue.values()).reduce((sum, rev) => sum + rev, 0);
    const prevCustomerLifetimeValue = prevUniqueBuyers.size > 0 ? prevTotalCustomerRevenue / prevUniqueBuyers.size : 0;
    const clvChange = calculateChange(customerLifetimeValue, prevCustomerLifetimeValue);

    // New customers (first order with seller in this period)
    const allPreviousBuyers = new Set<string>();
    allSellerOrders.forEach((order) => {
      if (orderTimeMs(order) < start.getTime()) {
        allPreviousBuyers.add(order.buyerId.toString());
      }
    });

    const newCustomers = Array.from(uniqueBuyers).filter((buyerId) => !allPreviousBuyers.has(buyerId)).length;

    const beforePrevBuyers = new Set<string>();
    allSellerOrders.forEach((order) => {
      if (orderTimeMs(order) < prevStart.getTime()) {
        beforePrevBuyers.add(order.buyerId.toString());
      }
    });
    
    const prevNewCustomers = Array.from(prevUniqueBuyers).filter((buyerId) => !beforePrevBuyers.has(buyerId)).length;
    const newCustomersChange = calculateChange(newCustomers, prevNewCustomers);

    const rfqThreads = await MessageThread.find({
      sellerId: sellerId as any,
      type: 'rfq',
      createdAt: { $gte: start, $lte: end },
    } as any)
      .select('_id relatedOrderId status')
      .lean();

    const rfqThreadIds = rfqThreads.map((t) => t._id);
    let quotesSent = 0;
    if (rfqThreadIds.length > 0) {
      const sellerReplyThreads = await Message.distinct('threadId', {
        threadId: { $in: rfqThreadIds },
        senderType: 'seller',
        createdAt: { $gte: start, $lte: end },
      });
      quotesSent = sellerReplyThreads.length;
    }

    const totalRfqs = rfqThreads.length;
    const quotesAccepted = rfqThreads.filter((t) => t.relatedOrderId).length;
    const rfqConversionRate =
      totalRfqs > 0 ? ((quotesSent / totalRfqs) * 100).toFixed(1) : '0.0';
    const rfqToOrderRate =
      totalRfqs > 0 ? ((quotesAccepted / totalRfqs) * 100).toFixed(1) : '0.0';

    const rfqStats = {
      totalRfqs,
      quotesSent,
      quotesAccepted,
      rfqConversionRate,
      rfqToOrderRate,
    };

    // Sales chart data (daily breakdown)
    const salesChartData: Array<{ date: string; revenue: number; orders: number }> = [];
    const currentDate = new Date(start);
    const endDate = new Date(end);

    while (currentDate <= endDate) {
      const dayStart = new Date(currentDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(currentDate);
      dayEnd.setHours(23, 59, 59, 999);

      const dayOrders = orders.filter((order) => {
        const t = orderTimeMs(order);
        return t >= dayStart.getTime() && t <= dayEnd.getTime();
      });

      const dayRevenue = dayOrders.reduce((sum, order) => sum + (order.total || 0), 0);
      const dayOrdersCount = dayOrders.length;

      salesChartData.push({
        date: currentDate.toISOString().split('T')[0],
        revenue: dayRevenue,
        orders: dayOrdersCount,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // No third-party ad traffic — only store facts from the database
    const marketingInsights: Array<{ source: string; traffic: number; conversions: string }> = [];

    const catalogViewSum = products.reduce((sum, p) => sum + (p.views || 0), 0);
    const orderToViewPct =
      catalogViewSum > 0 && totalOrders > 0 ? ((totalOrders / catalogViewSum) * 100).toFixed(2) : '0.0';
    const conversionFunnel = [
      {
        label: 'Catalog views (sum of product.views)',
        value: catalogViewSum,
        percentage: 100,
        dropOff: catalogViewSum > 0 ? (((catalogViewSum - totalOrders) / catalogViewSum) * 100).toFixed(1) : '0.0',
      },
      {
        label: 'Orders (period, excl. cancelled)',
        value: totalOrders,
        percentage: orderToViewPct,
        dropOff: '0',
      },
    ];

    return res.json({
      salesStats: {
        totalRevenue: {
          value: totalRevenue,
          formatted: `$${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          change: revenueChange.value,
          trend: revenueChange.trend,
        },
        totalOrders: {
          value: totalOrders,
          formatted: totalOrders.toLocaleString(),
          change: ordersChange.value,
          trend: ordersChange.trend,
        },
        averageOrderValue: {
          value: averageOrderValue,
          formatted: `$${averageOrderValue.toFixed(2)}`,
          change: aovChange.value,
          trend: aovChange.trend,
        },
        repeatCustomerRate: {
          value: repeatCustomerRate,
          formatted: `${repeatCustomerRate.toFixed(1)}%`,
          change: repeatCustomerChange.value,
          trend: repeatCustomerChange.trend,
        },
      },
      productAnalytics: {
        mostViewed,
        mostSold,
        highestRevenue,
        lowPerforming,
      },
      customerMetrics: {
        returnRate: {
          value: returnRate,
          formatted: `${returnRate.toFixed(1)}%`,
          change: returnRateChange.value,
          trend: returnRateChange.trend,
        },
        customerLifetimeValue: {
          value: customerLifetimeValue,
          formatted: `$${customerLifetimeValue.toFixed(2)}`,
          change: clvChange.value,
          trend: clvChange.trend,
        },
        newCustomers: {
          value: newCustomers,
          formatted: newCustomers.toString(),
          change: newCustomersChange.value,
          trend: newCustomersChange.trend,
        },
      },
      rfqStats,
      salesChartData,
      marketingInsights,
      conversionFunnel,
      timeRange,
      filters: {
        buyerGroup,
        paymentTerms,
        salesRep,
        applied: hasSegmentFilter,
        segmentSource:
          'Derived from order history: buyer GMV tiers, payment method, and buyer assignment heuristics.',
      },
    });
  } catch (error: any) {
    console.error('Get analytics error:', error);
    return res.status(500).json({ message: 'Failed to fetch analytics' });
  }
}

/**
 * Get sales chart data
 */
export async function getSalesChartData(req: AuthenticatedRequest, res: Response) {
  try {
    const sellerId = getSellerId(req);
    if (!sellerId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { timeRange = 'month' } = req.query;
    const { start, end } = getDateRange(timeRange as 'week' | 'month' | 'year');

    const allSeller = await Order.find({
      sellerId: sellerId as any,
      status: { $ne: 'cancelled' },
    } as any).lean();
    const orders = allSeller.filter(
      (o) => orderTimeMs(o) >= start.getTime() && orderTimeMs(o) <= end.getTime(),
    );

    // Group by day
    const salesChartData: Array<{ date: string; revenue: number; orders: number }> = [];
    const currentDate = new Date(start);
    const endDate = new Date(end);

    while (currentDate <= endDate) {
      const dayStart = new Date(currentDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(currentDate);
      dayEnd.setHours(23, 59, 59, 999);

      const dayOrders = orders.filter((order) => {
        const t = orderTimeMs(order);
        return t >= dayStart.getTime() && t <= dayEnd.getTime();
      });

      const dayRevenue = dayOrders.reduce((sum, order) => sum + (order.total || 0), 0);
      const dayOrdersCount = dayOrders.length;

      salesChartData.push({
        date: currentDate.toISOString().split('T')[0],
        revenue: dayRevenue,
        orders: dayOrdersCount,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return res.json({ salesChartData });
  } catch (error: any) {
    console.error('Get sales chart data error:', error);
    return res.status(500).json({ message: 'Failed to fetch sales chart data' });
  }
}

