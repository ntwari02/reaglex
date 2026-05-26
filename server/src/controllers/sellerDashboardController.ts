import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../middleware/auth';
import { Order } from '../models/Order';
import { Product } from '../models/Product';
import { Dispute } from '../models/Dispute';
import { User } from '../models/User';
import { SellerRating } from '../models/SellerRating';

const getSellerId = (req: AuthenticatedRequest): mongoose.Types.ObjectId | null => {
  if (!req.user?.id) return null;
  try {
    return new mongoose.Types.ObjectId(req.user.id);
  } catch {
    return null;
  }
};

/**
 * Helper function to get time ago string
 */
function orderTime(order: { createdAt?: Date; date?: Date }): number {
  const d = order.createdAt || order.date;
  return d ? new Date(d).getTime() : 0;
}

/**
 * First order with seller for a buyer = "new"; later orders = "existing" (chronological).
 */
function assignOrderCustomerSegments(allOrders: any[]): Map<string, 'new' | 'existing'> {
  const sorted = [...allOrders].sort((a, b) => orderTime(a) - orderTime(b));
  const seenBuyers = new Set<string>();
  const map = new Map<string, 'new' | 'existing'>();
  for (const o of sorted) {
    const bid = o.buyerId?.toString();
    if (!bid) continue;
    const wasSeen = seenBuyers.has(bid);
    if (!wasSeen) seenBuyers.add(bid);
    map.set(o._id.toString(), wasSeen ? 'existing' : 'new');
  }
  return map;
}

interface SalesTrendPoint {
  date: string;
  label: string;
  newRevenue: number;
  existingRevenue: number;
  total: number;
}

function buildSalesTrendByCustomerType(allOrders: any[]): {
  weekly: SalesTrendPoint[];
  monthly: SalesTrendPoint[];
  yearly: SalesTrendPoint[];
} {
  const segMap = assignOrderCustomerSegments(allOrders);
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();

  const sumBucket = (start: Date, end: Date) => {
    let newR = 0;
    let exR = 0;
    for (const order of allOrders) {
      const t = orderTime(order);
      if (t < start.getTime() || t >= end.getTime()) continue;
      const amt = Number(order.total || 0);
      const s = segMap.get(order._id.toString());
      if (s === 'existing') exR += amt;
      else newR += amt;
    }
    return { newR: Math.round(newR), exR: Math.round(exR) };
  };

  const weekly: SalesTrendPoint[] = [];
  for (let i = 11; i >= 0; i--) {
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - i * 7);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const { newR, exR } = sumBucket(weekStart, weekEnd);
    weekly.push({
      date: weekStart.toISOString().split('T')[0],
      label: `${weekStart.getMonth() + 1}/${weekStart.getDate()}`,
      newRevenue: newR,
      existingRevenue: exR,
      total: newR + exR,
    });
  }

  const monthly: SalesTrendPoint[] = [];
  for (let i = 11; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const { newR, exR } = sumBucket(monthStart, monthEnd);
    monthly.push({
      date: monthStart.toISOString().split('T')[0],
      label: monthNames[monthStart.getMonth()],
      newRevenue: newR,
      existingRevenue: exR,
      total: newR + exR,
    });
  }

  const yearly: SalesTrendPoint[] = [];
  for (let y = 4; y >= 0; y--) {
    const year = now.getFullYear() - y;
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year + 1, 0, 1);
    const { newR, exR } = sumBucket(yearStart, yearEnd);
    yearly.push({
      date: yearStart.toISOString().split('T')[0],
      label: String(year),
      newRevenue: newR,
      existingRevenue: exR,
      total: newR + exR,
    });
  }

  return { weekly, monthly, yearly };
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

/**
 * Generate revenue trend data for charts
 */
function generateRevenueTrend(orders: any[]): Array<{ date: string; value: number }> {
  const trend: Array<{ date: string; value: number }> = [];
  const now = new Date();
  
  // Generate last 12 weeks
  for (let i = 11; i >= 0; i--) {
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - (i * 7));
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    
    const weekOrders = orders.filter(order => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= weekStart && orderDate < weekEnd;
    });
    
    const weekRevenue = weekOrders.reduce((sum, order) => sum + (order.total || 0), 0);
    
    trend.push({
      date: weekStart.toISOString().split('T')[0],
      value: Math.round(weekRevenue),
    });
  }
  
  return trend;
}

/**
 * Generate daily sales data for SalesChart
 */
function generateDailySales(orders: any[], timeRange: string): Array<{ day: string; sales: number }> {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dailyData: Array<{ day: string; sales: number }> = [];
  const now = new Date();
  
  // Get last 7 days
  for (let i = 6; i >= 0; i--) {
    const dayStart = new Date(now);
    dayStart.setDate(dayStart.getDate() - i);
    dayStart.setHours(0, 0, 0, 0);
    
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);
    
    const dayOrders = orders.filter(order => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= dayStart && orderDate <= dayEnd;
    });
    
    const daySales = dayOrders.reduce((sum, order) => sum + (order.total || 0), 0);
    const dayName = days[dayStart.getDay()];
    
    dailyData.push({
      day: dayName,
      sales: Math.round(daySales),
    });
  }
  
  return dailyData;
}

/**
 * Returning customer % = share of orders in slice from buyers who had ordered before (same seller).
 */
function calculateConversionData(
  allOrders: any[],
  currentOrders: any[],
  previousOrders: any[],
): {
  value: number;
  thisWeek: number;
  lastWeek: number;
} {
  const seg = assignOrderCustomerSegments(allOrders);
  const countRet = (slice: any[]) => {
    let ret = 0;
    let tot = 0;
    for (const o of slice) {
      const bid = o.buyerId?.toString();
      if (!bid) continue;
      tot++;
      if (seg.get(o._id.toString()) === 'existing') ret++;
    }
    return { ret, tot };
  };
  const cur = countRet(currentOrders);
  const prev = countRet(previousOrders);
  const value = cur.tot > 0 ? Math.round((cur.ret / cur.tot) * 1000) / 10 : 0;
  return {
    value,
    thisWeek: cur.ret,
    lastWeek: prev.ret,
  };
}

/**
 * Generate performance data for ComboChart (last 12 months)
 */
function generatePerformanceData(orders: any[]): Array<{ label: string; barValue: number; lineValue: number }> {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const performance: Array<{ label: string; barValue: number; lineValue: number }> = [];
  const now = new Date();
  
  for (let i = 11; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
    
    const monthOrders = orders.filter(order => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= monthStart && orderDate <= monthEnd;
    });
    
    // Bar value: total revenue (scaled down for chart)
    const monthRevenue = monthOrders.reduce((sum, order) => sum + (order.total || 0), 0);
    const barValue = Math.round(monthRevenue / 100); // Scale down
    
    // Line value: order count
    const lineValue = monthOrders.length;
    
    performance.push({
      label: months[monthStart.getMonth()],
      barValue,
      lineValue,
    });
  }
  
  return performance;
}

/**
 * Generate action required items
 */
async function generateActionRequired(sellerId: mongoose.Types.ObjectId): Promise<Array<{
  title: string;
  meta: string;
  priority: 'High' | 'Medium' | 'Low';
  due: string;
}>> {
  const actions: Array<{ title: string; meta: string; priority: 'High' | 'Medium' | 'Low'; due: string }> = [];
  
  // Check disputes needing response
  const urgentDisputes = await Dispute.countDocuments({
    sellerId,
    status: { $in: ['new', 'buyer_response'] },
    responseDeadline: { $lte: new Date(Date.now() + 2 * 60 * 60 * 1000) }, // Due in 2 hours
  } as any);
  
    if (urgentDisputes > 0) {
    actions.push({
      title: 'Respond to open disputes',
      meta: `${urgentDisputes} disputes require immediate response`,
      priority: 'High',
      due: 'Due in 2 hours',
    });
  }
  
  // Check low stock items
  const criticalLowStock = await Product.countDocuments({
    sellerId,
    stock: { $lt: 5 },
  } as any);
  
  if (criticalLowStock > 0) {
    actions.push({
      title: 'Restock critical items',
      meta: `${criticalLowStock} products with less than 5 units in stock`,
      priority: 'High',
      due: 'Today',
    });
  }
  
  // Check pending orders
  const pendingOrders = await Order.countDocuments({
    sellerId,
    status: 'pending',
  } as any);
  
  if (pendingOrders > 0) {
    actions.push({
      title: 'Process pending orders',
      meta: `${pendingOrders} orders waiting for processing`,
      priority: 'Medium',
      due: 'Today',
    });
  }
  
  return actions;
}

/**
 * Get dashboard statistics for seller
 * GET /api/seller/dashboard/stats
 */
export async function getDashboardStats(req: AuthenticatedRequest, res: Response) {
  try {
    const sellerId = getSellerId(req);
    if (!sellerId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { timeRange = 'week' } = req.query;
    
    // Calculate date range
    const now = new Date();
    let startDate: Date;
    
    switch (timeRange) {
      case 'today':
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      default:
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
    }

    const sellerObjectId = sellerId;

    // Get all orders for calculations
    const allOrders = await Order.find({ sellerId: sellerObjectId } as any).lean();
    const ordersInRange = allOrders.filter(order => 
      new Date(order.createdAt) >= startDate
    );

    // Calculate total sales
    const totalSales = ordersInRange.reduce((sum, order) => sum + (order.total || 0), 0);
    
    // Get previous period for comparison
    const previousStartDate = new Date(startDate);
    const previousEndDate = new Date(startDate);
    if (timeRange === 'today') {
      previousStartDate.setDate(previousStartDate.getDate() - 1);
      previousEndDate.setDate(previousEndDate.getDate() - 1);
    } else if (timeRange === 'week') {
      previousStartDate.setDate(previousStartDate.getDate() - 7);
    } else if (timeRange === 'month') {
      previousStartDate.setMonth(previousStartDate.getMonth() - 1);
    }
    
    const previousOrders = allOrders.filter(order => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= previousStartDate && orderDate < previousEndDate;
    });
    const previousSales = previousOrders.reduce((sum, order) => sum + (order.total || 0), 0);
    const salesChange = previousSales > 0 
      ? ((totalSales - previousSales) / previousSales * 100).toFixed(1)
      : '0';

    // Active orders (pending, processing, packed, shipped)
    const activeOrders = allOrders.filter(order => 
      ['pending', 'processing', 'packed', 'shipped'].includes(order.status)
    ).length;
    
    // Previous active orders
    const previousActiveOrders = previousOrders.filter(order => 
      ['pending', 'processing', 'packed', 'shipped'].includes(order.status)
    ).length;
    const activeOrdersChange = previousActiveOrders > 0
      ? ((activeOrders - previousActiveOrders) / previousActiveOrders * 100).toFixed(1)
      : '0';

    const totalSkus = await Product.countDocuments({ sellerId: sellerObjectId });

    // Low stock items (stock < 20)
    const lowStockItems = await Product.countDocuments({
      sellerId: sellerObjectId,
      stock: { $lt: 20 }
    });
    const lowStockPct = totalSkus > 0 ? (lowStockItems / totalSkus) * 100 : 0;

    // Order status breakdown
    const orderStats = {
      pending: allOrders.filter(o => o.status === 'pending').length,
      inTransit: allOrders.filter(o => ['packed', 'shipped'].includes(o.status)).length,
      completed: allOrders.filter(o => o.status === 'delivered').length,
      paused: allOrders.filter(o => o.status === 'paused').length,
      cancelled: allOrders.filter(o => o.status === 'cancelled').length,
    };

    const cancellationRiskOrders = allOrders.filter((o: any) =>
      ['pending', 'processing', 'paused'].includes(String(o.status))
    );
    const riskTotal = cancellationRiskOrders.reduce((sum: number, o: any) => {
      const existing = Number(o?.cancellationIntelligence?.riskScore || 0);
      if (existing > 0) return sum + existing;
      const base = o.status === 'paused' ? 82 : o.status === 'pending' ? 68 : 54;
      return sum + base;
    }, 0);
    const cancellationRiskScore = cancellationRiskOrders.length
      ? Math.round(riskTotal / cancellationRiskOrders.length)
      : 0;

    // Best selling products (top 4 by quantity sold)
    const productSales: { [key: string]: { name: string; sales: number; revenue: number; stock: number } } = {};
    
    allOrders.forEach(order => {
      order.items.forEach(item => {
        const productId = item.productId.toString();
        if (!productSales[productId]) {
          productSales[productId] = {
            name: item.name,
            sales: 0,
            revenue: 0,
            stock: 0,
          };
        }
        productSales[productId].sales += item.quantity;
        productSales[productId].revenue += item.price * item.quantity;
      });
    });

    // Get stock for best selling products
    const bestSellingProductIds = Object.keys(productSales)
      .sort((a, b) => productSales[b].sales - productSales[a].sales)
      .slice(0, 4);
    
    const products = await Product.find({
      _id: { $in: bestSellingProductIds.map(id => new mongoose.Types.ObjectId(id)) },
      sellerId: sellerObjectId,
    } as any).lean();

    const bestSellingProducts = bestSellingProductIds.map(id => {
      const product = products.find(p => p._id.toString() === id);
      return {
        name: productSales[id].name,
        sales: productSales[id].sales,
        revenue: `$${productSales[id].revenue.toLocaleString()}`,
        stock: product?.stock || 0,
      };
    });

    // Average Order Value
    const avgOrderValue = ordersInRange.length > 0
      ? totalSales / ordersInRange.length
      : 0;
    const previousAvgOrderValue = previousOrders.length > 0
      ? previousSales / previousOrders.length
      : 0;
    const aovChange = previousAvgOrderValue > 0
      ? ((avgOrderValue - previousAvgOrderValue) / previousAvgOrderValue * 100).toFixed(1)
      : '0';

    const openDisputes = await Dispute.countDocuments({
      sellerId: sellerObjectId,
      status: 'new',
    });

    // Recent orders (last 5)
    const recentOrders = allOrders
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
      .map((order) => {
        let st: 'processing' | 'shipped' | 'delivered' = 'processing';
        if (order.status === 'delivered') st = 'delivered';
        else if (order.status === 'shipped' || order.status === 'packed') st = 'shipped';
        return {
          id: order.orderNumber,
          customer: order.customer,
          amount: `$${Number(order.total || 0).toFixed(2)}`,
          status: st,
          time: getTimeAgo(new Date(order.createdAt)),
        };
      });

    // Revenue trend data (last 12 weeks)
    const revenueTrend = generateRevenueTrend(allOrders);

    // Pixel chart: new vs existing customer revenue by week / month / year
    const salesTrend = buildSalesTrendByCustomerType(allOrders);

    // Daily sales for SalesChart (last 7 days)
    const dailySales = generateDailySales(allOrders, timeRange as string);

    // Conversion data for DonutChart (returning buyer order share)
    const conversionData = calculateConversionData(allOrders, ordersInRange, previousOrders);
    const conversionRate = conversionData.value;
    const prevRet = previousOrders.length
      ? (() => {
          const seg = assignOrderCustomerSegments(allOrders);
          let r = 0;
          let t = 0;
          for (const o of previousOrders) {
            if (!o.buyerId) continue;
            t++;
            if (seg.get(o._id.toString()) === 'existing') r++;
          }
          return t > 0 ? (r / t) * 100 : 0;
        })()
      : 0;
    const conversionChangePct =
      prevRet > 0 ? (((conversionRate - prevRet) / prevRet) * 100).toFixed(1) : conversionRate > 0 ? '100' : '0';
    const conversionChange = `${parseFloat(conversionChangePct) >= 0 ? '+' : ''}${conversionChangePct}%`;

    // Performance data for ComboChart (last 12 months)
    const performanceData = generatePerformanceData(allOrders);

    // Account status from user + aggregate seller rating
    const seller = await User.findById(sellerId).lean();
    const sellerRating = await SellerRating.findOne({ sellerId: sellerObjectId }).lean();
    const accountStatus = {
      tier: (seller as any)?.subscriptionTier || 'Starter',
      verificationStatus: seller?.sellerVerificationStatus || 'pending',
      isVerified: seller?.isSellerVerified || false,
      storeRating: sellerRating?.overallRating ?? 0,
      reviewCount: sellerRating?.totalReviews ?? 0,
    };

    const dayMs = 86400000;
    const today0 = new Date(now);
    today0.setHours(0, 0, 0, 0);
    const y0 = new Date(today0.getTime() - dayMs);
    const newDisputesToday = await Dispute.countDocuments({
      sellerId: sellerObjectId,
      status: 'new',
      createdAt: { $gte: today0 },
    } as any);
    const newDisputesYesterday = await Dispute.countDocuments({
      sellerId: sellerObjectId,
      status: 'new',
      createdAt: { $gte: y0, $lt: today0 },
    } as any);
    const rfqChange =
      newDisputesYesterday > 0
        ? `${newDisputesToday >= newDisputesYesterday ? '+' : ''}${newDisputesToday - newDisputesYesterday} vs yday`
        : newDisputesToday > 0
          ? `+${newDisputesToday} today`
          : '0 new today';

    // Action required items (disputes needing response, low stock items, etc.)
    const actionRequired = await generateActionRequired(sellerObjectId);

    return res.json({
      stats: {
        totalSales: {
          value: `$${totalSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          change: `${salesChange.startsWith('-') ? '' : '+'}${salesChange}%`,
          trend: parseFloat(salesChange) >= 0 ? 'up' : 'down',
        },
        activeOrders: {
          value: activeOrders.toString(),
          change: `${activeOrdersChange.startsWith('-') ? '' : '+'}${activeOrdersChange}%`,
          trend: parseFloat(activeOrdersChange) >= 0 ? 'up' : 'down',
        },
        conversionRate: {
          value: `${conversionRate.toFixed(1)}%`,
          change: conversionChange,
          trend: parseFloat(conversionChangePct) >= 0 ? ('up' as const) : ('down' as const),
        },
        lowStockItems: {
          value: lowStockItems.toString(),
          change: `${lowStockPct.toFixed(1)}% of SKUs`,
          trend: lowStockItems > 0 ? ('up' as const) : ('down' as const),
        },
        avgOrderValue: {
          value: `$${avgOrderValue.toFixed(2)}`,
          change: `${aovChange.startsWith('-') ? '' : '+'}${aovChange}%`,
          trend: parseFloat(aovChange) >= 0 ? 'up' : 'down',
        },
        openDisputes: {
          value: openDisputes.toString(),
          change: rfqChange,
          trend: newDisputesToday >= newDisputesYesterday ? ('up' as const) : ('down' as const),
        },
        /** @deprecated use openDisputes */
        pendingRFQs: {
          value: openDisputes.toString(),
          change: rfqChange,
          trend: newDisputesToday >= newDisputesYesterday ? ('up' as const) : ('down' as const),
        },
      },
      orderStats,
      cancellationAnalytics: {
        riskScore: cancellationRiskScore,
        highRiskOrders: cancellationRiskOrders.filter((o: any) => Number(o?.cancellationIntelligence?.riskScore || 0) >= 70).length,
        monitoredOrders: cancellationRiskOrders.length,
      },
      bestSellingProducts,
      recentOrders,
      revenueTrend,
      salesTrend,
      dailySales,
      conversionData,
      performanceData,
      accountStatus,
      actionRequired,
      timeRange,
    });
  } catch (error: any) {
    console.error('Get dashboard stats error:', error);
    return res.status(500).json({ message: 'Failed to fetch dashboard statistics' });
  }
}

