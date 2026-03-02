import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, ShoppingCart, AlertTriangle, Package, TrendingUp, MessageCircle, Star, ShieldCheck, Calendar, Clock, CheckCircle, XCircle, Truck } from 'lucide-react';
import StatCard from '@/components/dashboard/StatCard';
import RecentOrders from '@/components/dashboard/RecentOrders';
import SalesChart from '@/components/dashboard/SalesChart';
import { BarChart } from '@/components/charts/BarChart';
import { ComboChart } from '@/components/charts/ComboChart';
import { DonutChart } from '@/components/charts/DonutChart';
import { useAuthStore } from '@/stores/authStore';
import { useToastStore } from '@/stores/toastStore';

interface Stat {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

interface DashboardStats {
  stats: {
    totalSales: { value: string; change: string; trend: 'up' | 'down' };
    activeOrders: { value: string; change: string; trend: 'up' | 'down' };
    conversionRate: { value: string; change: string; trend: 'up' | 'down' };
    lowStockItems: { value: string; change: string; trend: 'up' | 'down' };
    avgOrderValue: { value: string; change: string; trend: 'up' | 'down' };
    pendingRFQs: { value: string; change: string; trend: 'up' | 'down' };
  };
  orderStats: {
    pending: number;
    inTransit: number;
    completed: number;
    cancelled: number;
  };
  bestSellingProducts: Array<{
    name: string;
    sales: number;
    revenue: string;
    stock: number;
  }>;
  recentOrders: Array<{
    id: string;
    customer: string;
    amount: string;
    status: 'processing' | 'shipped' | 'delivered';
    time: string;
  }>;
  revenueTrend: Array<{ date: string; value: number }>;
  dailySales: Array<{ day: string; sales: number }>;
  conversionData: {
    value: number;
    thisWeek: number;
    lastWeek: number;
  };
  performanceData: Array<{ label: string; barValue: number; lineValue: number }>;
  accountStatus: {
    tier: string;
    verificationStatus: string;
    isVerified: boolean;
    storeRating: number;
    reviewCount: number;
  };
  actionRequired: Array<{
    title: string;
    meta: string;
    priority: 'High' | 'Medium' | 'Low';
    due: string;
  }>;
  timeRange: string;
}

const API_BASE = 'http://localhost:5000/api/seller/dashboard/stats';

const DashboardOverview: React.FC = () => {
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('week');
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardStats | null>(null);
  const { user } = useAuthStore();
  const { showToast } = useToastStore();

  // Fetch dashboard stats from backend
  useEffect(() => {
    fetchDashboardStats();
  }, [timeRange]);

  const fetchDashboardStats = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE}?timeRange=${timeRange}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        credentials: 'include',
      });

      if (response.status === 401) {
        window.location.href = '/login';
        return;
      }
      if (response.status === 403) {
        window.location.href = '/';
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to fetch dashboard stats' }));
        throw new Error(errorData.message || 'Failed to fetch dashboard stats');
      }

      const data = await response.json();
      console.log('Dashboard data received:', data);
      // API returns { stats: {...}, orderStats: {...}, ... } directly
      if (data && data.stats) {
        setDashboardData(data);
      } else {
        throw new Error('Invalid response format from server');
      }
    } catch (error: any) {
      console.error('Error fetching dashboard stats:', error);
      showToast(error.message || 'Failed to load dashboard', 'error');
      setDashboardData(null);
    } finally {
      setLoading(false);
    }
  };

  // Build stats arrays from API data
  const salesStats: Stat[] = dashboardData ? [
    {
      title: 'Total Sales',
      value: dashboardData.stats.totalSales.value,
      change: dashboardData.stats.totalSales.change,
      trend: dashboardData.stats.totalSales.trend,
      icon: DollarSign,
      color: 'from-green-500 to-emerald-500',
    },
    {
      title: 'Active Orders',
      value: dashboardData.stats.activeOrders.value,
      change: dashboardData.stats.activeOrders.change,
      trend: dashboardData.stats.activeOrders.trend,
      icon: ShoppingCart,
      color: 'from-blue-500 to-cyan-500',
    },
    {
      title: 'Conversion Rate',
      value: dashboardData.stats.conversionRate.value,
      change: dashboardData.stats.conversionRate.change,
      trend: dashboardData.stats.conversionRate.trend,
      icon: TrendingUp,
      color: 'from-purple-500 to-pink-500',
    },
    {
      title: 'Low Stock Items',
      value: dashboardData.stats.lowStockItems.value,
      change: dashboardData.stats.lowStockItems.change,
      trend: dashboardData.stats.lowStockItems.trend,
      icon: Package,
      color: 'from-red-500 to-orange-500',
    },
  ] : [];

  // B2B-focused KPIs
  const b2bStats: Stat[] = dashboardData ? [
    {
      title: 'Pending RFQs',
      value: dashboardData.stats.pendingRFQs.value,
      change: dashboardData.stats.pendingRFQs.change,
      trend: dashboardData.stats.pendingRFQs.trend,
      icon: AlertTriangle,
      color: 'from-amber-500 to-orange-500',
    },
    {
      title: 'Avg. Order Value (AOV)',
      value: dashboardData.stats.avgOrderValue.value,
      change: dashboardData.stats.avgOrderValue.change,
      trend: dashboardData.stats.avgOrderValue.trend,
      icon: DollarSign,
      color: 'from-sky-500 to-indigo-500',
    },
  ] : [];

  const orderStats = dashboardData ? [
    { label: 'Pending', count: dashboardData.orderStats.pending, color: 'bg-yellow-500', icon: Clock },
    { label: 'In Transit', count: dashboardData.orderStats.inTransit, color: 'bg-blue-500', icon: Truck },
    { label: 'Completed', count: dashboardData.orderStats.completed, color: 'bg-green-500', icon: CheckCircle },
    { label: 'Cancelled', count: dashboardData.orderStats.cancelled, color: 'bg-red-500', icon: XCircle },
  ] : [];

  const bestSellingProducts = dashboardData?.bestSellingProducts || [];
  const actionRequired = dashboardData?.actionRequired || [];
  const accountStatus = dashboardData?.accountStatus;
  
  // Placeholder notifications (would come from notifications API)
  const notifications: Array<{ type: string; text: string; time: string; unread: boolean }> = [];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-500 mb-2">Failed to load dashboard data</p>
          <button
            onClick={fetchDashboardStats}
            className="text-red-500 hover:text-red-600 underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white transition-colors duration-300">Dashboard Overview</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 transition-colors duration-300">Welcome back! Here's what's happening with your store.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 transition-colors duration-300">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Live Updates Active
          </div>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as 'today' | 'week' | 'month')}
            className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        </div>
      </div>

      {/* All Stats in 3 Columns */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        {[...salesStats, ...b2bStats].map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2">
          <SalesChart data={dashboardData?.dailySales || []} />
        </div>

        {/* Recent Orders */}
        <div>
          <RecentOrders orders={dashboardData?.recentOrders || []} />
        </div>
      </div>

      {/* Revenue, Conversions & Performance Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Revenue Trend & Forecast - Bar Chart */}
        <div className="bg-white/50 dark:bg-gray-900/50 rounded-xl p-6 border border-gray-200 dark:border-gray-700/30 shadow-xl transition-colors duration-300 h-full">
          <BarChart
            title="Revenue Trend & Forecast"
            data={dashboardData?.revenueTrend.map(item => ({ date: item.date, value: item.value })) || []}
            forecastData={[]}
            height={350}
            yAxisLabel="Revenue ($)"
          />
        </div>

        {/* Conversions - Donut Chart */}
        <div className="bg-white/50 dark:bg-gray-900/50 rounded-xl p-6 border border-gray-200 dark:border-gray-700/30 shadow-xl transition-colors duration-300 flex flex-col h-full">
          <DonutChart
            title="Conversions"
            value={dashboardData?.conversionData.value || 0}
            maxValue={100}
            label="Returning Customer"
            size={180}
            strokeWidth={16}
          />
          <div className="mt-6 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">This Week</span>
              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                {dashboardData?.conversionData.thisWeek.toLocaleString() || '0'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Last Week</span>
              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                {dashboardData?.conversionData.lastWeek.toLocaleString() || '0'}
              </span>
            </div>
            <button className="w-full mt-4 bg-red-600 hover:bg-red-700 text-white text-sm py-2 rounded-lg transition-colors">
              View Details
            </button>
          </div>
        </div>

        {/* Performance Chart - Combo Chart */}
        <div className="bg-white/50 dark:bg-gray-900/50 rounded-xl p-6 border border-gray-200 dark:border-gray-700/30 shadow-xl transition-colors duration-300 h-full">
          <ComboChart
            title="Performance"
            data={dashboardData?.performanceData || []}
            barLabel="Revenue (scaled)"
            lineLabel="Orders"
            height={350}
          />
        </div>
      </div>

      {/* Orders Summary */}
      <div className="bg-white/50 dark:bg-gray-900/50 rounded-xl p-6 border border-gray-200 dark:border-gray-700/30 transition-colors duration-300">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 transition-colors duration-300 flex items-center gap-2">
          <ShoppingCart className="w-6 h-6 text-red-400" />
          Orders Summary
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {orderStats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700/50 transition-colors duration-300"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 ${stat.color} rounded-lg`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white transition-colors duration-300">{stat.count}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 transition-colors duration-300">{stat.label}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Product Performance */}
        <div className="bg-white/50 dark:bg-gray-900/50 rounded-xl p-6 border border-gray-200 dark:border-gray-700/30 transition-colors duration-300">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white transition-colors duration-300 flex items-center gap-2">
              <Package className="w-6 h-6 text-red-400" />
              Product Performance
            </h2>
            <button className="text-sm text-red-500 dark:text-red-400 hover:underline transition-colors">View All</button>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-2">
              <span className="text-sm font-semibold text-gray-900 dark:text-white transition-colors duration-300">Best Selling</span>
            </div>
            {bestSellingProducts.map((product, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700/50 transition-colors duration-300"
              >
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white transition-colors duration-300">{product.name}</p>
                  <div className="flex items-center gap-4 mt-1 text-xs text-gray-600 dark:text-gray-400 transition-colors duration-300">
                    <span>{product.sales} sold</span>
                    <span>{product.revenue} revenue</span>
                  </div>
                </div>
                <div className={`px-2 py-1 rounded text-xs font-medium ${
                  product.stock === 0 
                    ? 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400' 
                    : product.stock < 20
                    ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400'
                    : 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                }`}>
                  {product.stock === 0 ? 'Out of Stock' : `${product.stock} in stock`}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Notifications, Action Required & Account Status */}
        <div className="space-y-6">
          {/* Action Required - B2B Task List */}
          <div className="bg-white/50 dark:bg-gray-900/50 rounded-xl p-6 border border-gray-200 dark:border-gray-700/30 transition-colors duration-300">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 transition-colors duration-300 flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-amber-500" />
              Action Required
            </h2>
            <div className="space-y-3">
              {actionRequired.length > 0 ? (
                actionRequired.map((task, index) => (
                <motion.div
                  key={task.title}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * index }}
                  className="flex items-start justify-between gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 transition-colors duration-300"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40">
                      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white transition-colors duration-300">
                        {task.title}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 transition-colors duration-300">
                        {task.meta}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                        <span
                          className={`px-2 py-0.5 rounded-full font-medium ${
                            task.priority === 'High'
                              ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                              : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                          }`}
                        >
                          {task.priority} Priority
                        </span>
                        <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400 transition-colors duration-300">
                          <Clock className="h-3 w-3" />
                          {task.due}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    className="mt-1 inline-flex items-center justify-center rounded-full border border-gray-300 dark:border-gray-600 bg-white/70 dark:bg-gray-900/50 p-1.5 text-gray-500 hover:text-green-600 hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors duration-200"
                    aria-label="Mark task as done"
                  >
                    <CheckCircle className="h-4 w-4" />
                  </button>
                </motion.div>
              ))
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  No actions required at this time
                </p>
              )}
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-white/50 dark:bg-gray-900/50 rounded-xl p-6 border border-gray-200 dark:border-gray-700/30 transition-colors duration-300">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 transition-colors duration-300 flex items-center gap-2">
              <MessageCircle className="w-6 h-6 text-red-400" />
              Notifications
            </h2>
            <div className="space-y-2">
              {notifications.map((notif, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`p-3 rounded-lg border transition-colors duration-300 ${
                    notif.unread
                      ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-500/30'
                      : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700/50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <p className="text-sm text-gray-900 dark:text-white transition-colors duration-300">{notif.text}</p>
                    {notif.unread && <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0 mt-1"></div>}
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 transition-colors duration-300">{notif.time}</p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Account Status */}
          <div className="bg-white/50 dark:bg-gray-900/50 rounded-xl p-6 border border-gray-200 dark:border-gray-700/30 transition-colors duration-300">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 transition-colors duration-300 flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-red-400" />
              Account Status
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-red-500/10 to-orange-500/10 dark:from-red-500/20 dark:to-orange-500/20 rounded-lg border border-red-200 dark:border-red-500/30">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 transition-colors duration-300">Seller Tier</p>
                  <p className="font-bold text-gray-900 dark:text-white transition-colors duration-300">
                    {accountStatus?.tier || 'Starter'}
                  </p>
                </div>
                <Star className="w-8 h-8 text-yellow-400 fill-yellow-400" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400 transition-colors duration-300">Verification Status</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    accountStatus?.isVerified
                      ? 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                      : 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400'
                  }`}>
                    {accountStatus?.verificationStatus === 'approved' ? 'Verified' : accountStatus?.verificationStatus || 'Pending'}
                  </span>
                </div>
                {accountStatus && accountStatus.storeRating > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400 transition-colors duration-300">Store Rating</span>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                      <span className="text-sm font-semibold text-gray-900 dark:text-white transition-colors duration-300">
                        {accountStatus.storeRating.toFixed(1)}
                      </span>
                      <span className="text-xs text-gray-600 dark:text-gray-400 transition-colors duration-300">
                        ({accountStatus.reviewCount.toLocaleString()} reviews)
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;
