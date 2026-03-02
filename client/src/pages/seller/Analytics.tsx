import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Users, DollarSign, ShoppingCart, Eye, Star, TrendingDown, Filter, ArrowUpRight, ArrowDownRight, Loader2 } from 'lucide-react';
import StatCard from '@/components/dashboard/StatCard';
import SalesChart from '@/components/dashboard/SalesChart';
import { FunnelChart } from '@/components/charts/FunnelChart';
import { ParetoChart } from '@/components/charts/ParetoChart';
import { useToastStore } from '@/stores/toastStore';

const API_BASE = 'http://localhost:5000/api/seller/analytics';

interface AnalyticsData {
  salesStats: {
    totalRevenue: { value: number; formatted: string; change: string; trend: 'up' | 'down' };
    totalOrders: { value: number; formatted: string; change: string; trend: 'up' | 'down' };
    averageOrderValue: { value: number; formatted: string; change: string; trend: 'up' | 'down' };
    repeatCustomerRate: { value: number; formatted: string; change: string; trend: 'up' | 'down' };
  };
  productAnalytics: {
    mostViewed: Array<{ name: string; views: number; sold: number; revenue: number; rating: number }>;
    mostSold: Array<{ name: string; views: number; sold: number; revenue: number; rating: number }>;
    highestRevenue: Array<{ name: string; views: number; sold: number; revenue: number; rating: number }>;
    lowPerforming: Array<{ name: string; views: number; sold: number; revenue: number }>;
  };
  customerMetrics: {
    returnRate: { value: number; formatted: string; change: string; trend: 'up' | 'down' };
    customerLifetimeValue: { value: number; formatted: string; change: string; trend: 'up' | 'down' };
    newCustomers: { value: number; formatted: string; change: string; trend: 'up' | 'down' };
  };
  rfqStats: {
    totalRfqs: number;
    quotesSent: number;
    quotesAccepted: number;
    rfqConversionRate: string;
    rfqToOrderRate: string;
  };
  salesChartData: Array<{ date: string; revenue: number; orders: number }>;
  marketingInsights: Array<{ source: string; traffic: number; conversions: string }>;
  conversionFunnel: Array<{ label: string; value: number; percentage: string | number; dropOff?: string }>;
}

const Analytics: React.FC = () => {
  const { showToast } = useToastStore();
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');
  const [buyerGroup, setBuyerGroup] = useState<'all' | 'enterprise' | 'smb' | 'long_tail'>('all');
  const [paymentTerms, setPaymentTerms] = useState<'all' | 'prepaid' | 'net30' | 'net60'>('all');
  const [salesRep, setSalesRep] = useState<'all' | 'team_north' | 'team_south' | 'team_inbound'>('all');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch analytics data
  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const params = new URLSearchParams();
      params.append('timeRange', timeRange);
      if (buyerGroup !== 'all') params.append('buyerGroup', buyerGroup);
      if (paymentTerms !== 'all') params.append('paymentTerms', paymentTerms);
      if (salesRep !== 'all') params.append('salesRep', salesRep);

      const response = await fetch(`${API_BASE}?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const data = await response.json();
      setAnalyticsData(data);
    } catch (error: any) {
      console.error('Failed to fetch analytics:', error);
      showToast('Failed to load analytics data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange, buyerGroup, paymentTerms, salesRep]);

  // Transform data for components
  const salesStats = analyticsData ? [
    {
      title: 'Total Revenue',
      value: analyticsData.salesStats.totalRevenue.formatted,
      change: analyticsData.salesStats.totalRevenue.change,
      trend: analyticsData.salesStats.totalRevenue.trend,
      icon: DollarSign,
      color: 'from-green-500 to-emerald-500',
    },
    {
      title: 'Total Orders',
      value: analyticsData.salesStats.totalOrders.formatted,
      change: analyticsData.salesStats.totalOrders.change,
      trend: analyticsData.salesStats.totalOrders.trend,
      icon: ShoppingCart,
      color: 'from-blue-500 to-cyan-500',
    },
    {
      title: 'Average Order Value',
      value: analyticsData.salesStats.averageOrderValue.formatted,
      change: analyticsData.salesStats.averageOrderValue.change,
      trend: analyticsData.salesStats.averageOrderValue.trend,
      icon: TrendingUp,
      color: 'from-purple-500 to-pink-500',
    },
    {
      title: 'Repeat Customer Rate',
      value: analyticsData.salesStats.repeatCustomerRate.formatted,
      change: analyticsData.salesStats.repeatCustomerRate.change,
      trend: analyticsData.salesStats.repeatCustomerRate.trend,
      icon: Users,
      color: 'from-orange-500 to-red-500',
    },
  ] : [];

  const customerMetrics = analyticsData ? [
    { 
      label: 'Return Rate', 
      value: analyticsData.customerMetrics.returnRate.formatted, 
      trend: analyticsData.customerMetrics.returnRate.trend, 
      change: analyticsData.customerMetrics.returnRate.change 
    },
    { 
      label: 'Customer Lifetime Value', 
      value: analyticsData.customerMetrics.customerLifetimeValue.formatted, 
      trend: analyticsData.customerMetrics.customerLifetimeValue.trend, 
      change: analyticsData.customerMetrics.customerLifetimeValue.change 
    },
    { 
      label: 'New Customers', 
      value: analyticsData.customerMetrics.newCustomers.formatted, 
      trend: analyticsData.customerMetrics.newCustomers.trend, 
      change: analyticsData.customerMetrics.newCustomers.change 
    },
  ] : [];
  const marketingInsights = analyticsData?.marketingInsights || [];
  const rfqStats = analyticsData?.rfqStats || {
    totalRfqs: 0,
    quotesSent: 0,
    quotesAccepted: 0,
    rfqConversionRate: '0.0',
    rfqToOrderRate: '0.0',
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-red-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading analytics data...</p>
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <p className="text-gray-600 dark:text-gray-400">No analytics data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2 transition-colors duration-300">
            <BarChart3 className="w-8 h-8 text-red-400" />
            Analytics Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 transition-colors duration-300">Track your business performance and insights</p>
        </div>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value as 'week' | 'month' | 'year')}
          className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
        >
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="year">This Year</option>
        </select>
      </div>

      {/* Sales & RFQ Analytics */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 transition-colors duration-300">Sales Analytics</h2>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
        >
          {salesStats.map((stat, index) => (
            <StatCard key={index} {...stat} />
          ))}
        </motion.div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 bg-white/50 dark:bg-gray-900/50 rounded-xl p-6 border border-gray-200 dark:border-gray-700/30 transition-colors duration-300 min-h-[400px]">
            <SalesChart data={analyticsData.salesChartData} timeRange={timeRange} />
          </div>

          {/* RFQ Conversion Metrics */}
          <div className="bg-white/50 dark:bg-gray-900/50 rounded-xl p-6 border border-gray-200 dark:border-gray-700/30 transition-colors duration-300 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white transition-colors duration-300">
                  RFQ Conversion Metrics
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 transition-colors duration-300">
                  Performance for the selected time range, filtered by the segments below.
                </p>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                RFQs → Quotes → Orders
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60">
                <p className="text-gray-500 dark:text-gray-400">RFQs Received</p>
                <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                  {rfqStats.totalRfqs.toLocaleString()}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60">
                <p className="text-gray-500 dark:text-gray-400">Quotes Sent</p>
                <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                  {rfqStats.quotesSent.toLocaleString()}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700/50">
                <p className="text-gray-600 dark:text-gray-300">Quotes Accepted</p>
                <p className="mt-1 text-lg font-semibold text-green-700 dark:text-green-300">
                  {rfqStats.quotesAccepted.toLocaleString()}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700/50">
                <p className="text-gray-600 dark:text-gray-300">RFQ → Order Rate</p>
                <p className="mt-1 text-lg font-semibold text-blue-700 dark:text-blue-300">
                  {rfqStats.rfqToOrderRate}%
                </p>
              </div>
            </div>

            <div className="mt-1 p-3 rounded-lg bg-gradient-to-r from-red-500/10 to-orange-500/10 dark:from-red-500/25 dark:to-orange-500/25 border border-red-200 dark:border-red-600/60">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-700 dark:text-gray-200 font-medium">
                  Quote Conversion
                </span>
                <span className="text-gray-600 dark:text-gray-300">
                  {rfqStats.rfqConversionRate}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-1.5">
                <div
                  className="h-1.5 rounded-full bg-gradient-to-r from-red-500 to-orange-500"
                  style={{ width: `${rfqStats.rfqConversionRate}%` }}
                />
              </div>
              <p className="mt-2 text-[11px] text-gray-600 dark:text-gray-300">
                Of all quotes issued, this is the share that converted into confirmed B2B orders.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Product Analytics */}
        <div className="bg-white/50 dark:bg-gray-900/50 rounded-xl p-6 border border-gray-200 dark:border-gray-700/30 transition-colors duration-300">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 transition-colors duration-300 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-red-400" />
            Product Analytics
          </h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 transition-colors duration-300">Most Viewed</h3>
              <div className="space-y-2">
                {analyticsData?.productAnalytics.mostViewed.slice(0, 3).map((product, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg transition-colors duration-300">
                    <span className="text-sm text-gray-900 dark:text-white transition-colors duration-300">{product.name}</span>
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-semibold text-gray-900 dark:text-white transition-colors duration-300">{product.views}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 transition-colors duration-300">Most Sold</h3>
              <div className="space-y-2">
                {analyticsData?.productAnalytics.mostSold && analyticsData.productAnalytics.mostSold.length > 0 ? (
                  analyticsData.productAnalytics.mostSold.slice(0, 3).map((product, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg transition-colors duration-300">
                      <span className="text-sm text-gray-900 dark:text-white transition-colors duration-300">{product.name}</span>
                      <div className="flex items-center gap-2">
                        <ShoppingCart className="w-4 h-4 text-green-500" />
                        <span className="text-sm font-semibold text-green-500 dark:text-green-400 transition-colors duration-300">{product.sold}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-2">No sales data available</p>
                )}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 transition-colors duration-300">Highest Revenue</h3>
              <div className="space-y-2">
                {analyticsData?.productAnalytics.highestRevenue && analyticsData.productAnalytics.highestRevenue.length > 0 ? (
                  analyticsData.productAnalytics.highestRevenue.slice(0, 3).map((product, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg transition-colors duration-300">
                      <span className="text-sm text-gray-900 dark:text-white transition-colors duration-300">{product.name}</span>
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-green-500" />
                        <span className="text-sm font-semibold text-green-500 dark:text-green-400 transition-colors duration-300">${product.revenue.toLocaleString()}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-2">No revenue data available</p>
                )}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-red-600 dark:text-red-400 mb-3 transition-colors duration-300">Low Performing</h3>
              <div className="space-y-2">
                {analyticsData?.productAnalytics.lowPerforming && analyticsData.productAnalytics.lowPerforming.length > 0 ? (
                  analyticsData.productAnalytics.lowPerforming.slice(0, 5).map((product, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-500/30 transition-colors duration-300">
                      <span className="text-sm text-gray-900 dark:text-white transition-colors duration-300">{product.name}</span>
                      <div className="flex items-center gap-2">
                        <TrendingDown className="w-4 h-4 text-red-500" />
                        <span className="text-sm font-semibold text-red-600 dark:text-red-400 transition-colors duration-300">{product.sold} sold</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-2">No low performing products</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Customer & Segment Analytics */}
        <div className="bg-white/50 dark:bg-gray-900/50 rounded-xl p-6 border border-gray-200 dark:border-gray-700/30 transition-colors duration-300">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 transition-colors duration-300 flex items-center gap-2">
            <Users className="w-6 h-6 text-red-400" />
            Customer & Segment Analytics
          </h2>

          {/* Segment Filters */}
          <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <p className="text-[11px] font-medium text-gray-600 dark:text-gray-300">Buyer group</p>
              <select
                value={buyerGroup}
                onChange={(e) => setBuyerGroup(e.target.value as typeof buyerGroup)}
                className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-2 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="all">All buyers</option>
                <option value="enterprise">Enterprise</option>
                <option value="smb">SMB</option>
                <option value="long_tail">Long-tail</option>
              </select>
            </div>
            <div className="space-y-1">
              <p className="text-[11px] font-medium text-gray-600 dark:text-gray-300">Payment terms</p>
              <select
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value as typeof paymentTerms)}
                className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-2 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="all">All terms</option>
                <option value="prepaid">Prepaid</option>
                <option value="net30">Net 30</option>
                <option value="net60">Net 60</option>
              </select>
            </div>
            <div className="space-y-1">
              <p className="text-[11px] font-medium text-gray-600 dark:text-gray-300">Sales team</p>
              <select
                value={salesRep}
                onChange={(e) => setSalesRep(e.target.value as typeof salesRep)}
                className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-2 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="all">All reps</option>
                <option value="team_north">Team North</option>
                <option value="team_south">Team South</option>
                <option value="team_inbound">Inbound Desk</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            {customerMetrics.map((metric, index) => (
              <div key={index} className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700/50 transition-colors duration-300">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400 transition-colors duration-300">{metric.label}</span>
                  <div className={`flex items-center gap-1 ${
                    metric.trend === 'up' ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {metric.trend === 'up' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                    <span className="text-xs font-semibold">{metric.change}</span>
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white transition-colors duration-300">{metric.value}</p>
              </div>
            ))}
            <div className="p-4 bg-gradient-to-r from-red-500/10 to-orange-500/10 dark:from-red-500/20 dark:to-orange-500/20 rounded-lg border border-red-200 dark:border-red-500/30">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1 transition-colors duration-300">
                Segmented RFQ & buyer reports
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 transition-colors duration-300">
                In a live environment, these filters would drive segment-specific dashboards (by buyer cohort,
                payment terms, and sales team performance).
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Marketing Insights */}
      <div className="bg-white/50 dark:bg-gray-900/50 rounded-xl p-6 border border-gray-200 dark:border-gray-700/30 transition-colors duration-300">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 transition-colors duration-300">Marketing Insights</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 transition-colors duration-300">Traffic Sources</h3>
            <div className="space-y-3">
              {marketingInsights.map((insight, index) => {
                // Calculate total traffic for percentage calculation
                const totalTraffic = marketingInsights.reduce((sum, item) => sum + item.traffic, 0);
                const trafficPercentage = totalTraffic > 0 ? ((insight.traffic / totalTraffic) * 100).toFixed(0) : '0';
                
                return (
                  <div key={index} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-900 dark:text-white transition-colors duration-300">{insight.source}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600 dark:text-gray-400 transition-colors duration-300">{trafficPercentage}%</span>
                        <span className="text-xs text-gray-500 dark:text-gray-500">({insight.conversions}% conv.)</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-red-500 to-orange-500 h-2 rounded-full transition-all"
                        style={{ width: `${trafficPercentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 transition-colors duration-300">Conversion Funnel</h3>
            <FunnelChart
              data={analyticsData.conversionFunnel}
              height={300}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
