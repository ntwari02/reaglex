import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../middleware/auth';
import { Order, OrderStatus } from '../models/Order';
import { Product } from '../models/Product';
import { Dispute } from '../models/Dispute';
import { User } from '../models/User';

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
 * Calculate conversion data for DonutChart
 */
function calculateConversionData(currentOrders: any[], previousOrders: any[]): {
  value: number;
  thisWeek: number;
  lastWeek: number;
} {
  // Simplified: using order count as proxy for conversions
  // In real system, would track actual visitors/conversions
  const thisWeekCount = currentOrders.length;
  const lastWeekCount = previousOrders.length;
  
  // Calculate returning customer rate (simplified)
  const uniqueBuyers = new Set(currentOrders.map(o => o.buyerId?.toString()).filter(Boolean));
  const returningRate = uniqueBuyers.size > 0 ? (uniqueBuyers.size / thisWeekCount) * 100 : 0;
  
  return {
    value: Math.round(returningRate * 10) / 10, // Round to 1 decimal
    thisWeek: thisWeekCount * 100, // Scale for display
    lastWeek: lastWeekCount * 100,
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
      title: 'Review high-value RFQs',
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

    // Conversion rate (simplified: orders / total visitors - using orders as proxy)
    // In a real system, you'd track actual visitors
    const conversionRate = 3.24; // Placeholder - would need analytics integration
    const conversionChange = '+2.3'; // Placeholder

    // Low stock items (stock < 20)
    const lowStockItems = await Product.countDocuments({
      sellerId: sellerObjectId,
      stock: { $lt: 20 }
    });

    // Order status breakdown
    const orderStats = {
      pending: allOrders.filter(o => o.status === 'pending').length,
      inTransit: allOrders.filter(o => ['packed', 'shipped'].includes(o.status)).length,
      completed: allOrders.filter(o => o.status === 'delivered').length,
      cancelled: allOrders.filter(o => o.status === 'cancelled').length,
    };

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

    // Pending RFQs (using disputes as proxy for now - in real system would have RFQ model)
    const pendingRFQs = await Dispute.countDocuments({
      sellerId: sellerObjectId,
      status: 'new',
    });

    // Recent orders (last 5)
    const recentOrders = allOrders
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
      .map(order => ({
        id: order.orderNumber,
        customer: order.customer,
        amount: `$${order.total.toFixed(2)}`,
        status: order.status === 'processing' ? 'processing' as const
          : order.status === 'shipped' ? 'shipped' as const
          : 'delivered' as const,
        time: getTimeAgo(new Date(order.createdAt)),
      }));

    // Revenue trend data (last 12 weeks)
    const revenueTrend = generateRevenueTrend(allOrders);

    // Daily sales for SalesChart (last 7 days)
    const dailySales = generateDailySales(allOrders, timeRange as string);

    // Conversion data for DonutChart
    const conversionData = calculateConversionData(ordersInRange, previousOrders);

    // Performance data for ComboChart (last 12 months)
    const performanceData = generatePerformanceData(allOrders);

    // Account status from user
    const seller = await User.findById(sellerId).lean();
    const accountStatus = {
      tier: (seller as any)?.subscriptionTier || 'Starter',
      verificationStatus: seller?.sellerVerificationStatus || 'pending',
      isVerified: seller?.isSellerVerified || false,
      storeRating: 0, // Would need reviews model
      reviewCount: 0, // Would need reviews model
    };

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
          value: `${conversionRate}%`,
          change: conversionChange,
          trend: 'up' as const,
        },
        lowStockItems: {
          value: lowStockItems.toString(),
          change: '+5.4%', // Placeholder
          trend: 'up' as const,
        },
        avgOrderValue: {
          value: `$${avgOrderValue.toFixed(2)}`,
          change: `${aovChange.startsWith('-') ? '' : '+'}${aovChange}%`,
          trend: parseFloat(aovChange) >= 0 ? 'up' : 'down',
        },
        pendingRFQs: {
          value: pendingRFQs.toString(),
          change: '+6 new today', // Placeholder
          trend: 'up' as const,
        },
      },
      orderStats,
      bestSellingProducts,
      recentOrders,
      revenueTrend,
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

