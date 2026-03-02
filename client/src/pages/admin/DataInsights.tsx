import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, ShoppingCart, DollarSign, Package, Download, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { TrendLineChart } from '@/components/charts/TrendLineChart';
import { CohortChart } from '@/components/charts/CohortChart';
import { SankeyChart } from '@/components/charts/SankeyChart';

export default function DataInsights() {
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [analytics, setAnalytics] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    totalUsers: 0,
    totalProducts: 0,
    averageOrderValue: 0,
    conversionRate: 0,
    topCategories: [] as any[],
    topSellers: [] as any[],
    revenueByDay: [] as any[],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [dateRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const endDate = new Date();
      const startDate = new Date();
      
      switch (dateRange) {
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(startDate.getDate() - 90);
          break;
        case '1y':
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
      }

      // Load orders
      const { data: orders } = await supabase
        .from('orders')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .eq('payment_status', 'completed');

      // Load users
      const { count: userCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startDate.toISOString());

      // Load products
      const { count: productCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startDate.toISOString());

      const totalRevenue = orders?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;
      const totalOrders = orders?.length || 0;
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Top categories (mock data - would need proper aggregation)
      const topCategories = [
        { name: 'Electronics', orders: 234, revenue: 45678 },
        { name: 'Fashion', orders: 189, revenue: 34567 },
        { name: 'Home & Living', orders: 156, revenue: 28901 },
        { name: 'Sports', orders: 98, revenue: 18765 },
      ];

      // Top sellers
      const { data: sellers } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'seller')
        .limit(5);

      setAnalytics({
        totalRevenue,
        totalOrders,
        totalUsers: userCount || 0,
        totalProducts: productCount || 0,
        averageOrderValue,
        conversionRate: 2.5, // Mock conversion rate
        topCategories,
        topSellers: sellers || [],
        revenueByDay: [], // Would need proper aggregation
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Analytics & Insights</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Advanced analytics and data insights
          </p>
        </div>
        <div className="flex gap-2">
          {['7d', '30d', '90d', '1y'].map((range) => (
            <Button
              key={range}
              variant={dateRange === range ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDateRange(range as any)}
            >
              {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : range === '90d' ? '90 Days' : '1 Year'}
            </Button>
          ))}
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Revenue</h3>
            <DollarSign className="h-5 w-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            ${analytics.totalRevenue.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            <TrendingUp className="h-3 w-3 inline" /> 12% increase
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Orders</h3>
            <ShoppingCart className="h-5 w-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {analytics.totalOrders.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            <TrendingUp className="h-3 w-3 inline" /> 8% increase
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Order Value</h3>
            <BarChart3 className="h-5 w-5 text-purple-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            ${analytics.averageOrderValue.toFixed(2)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            <TrendingUp className="h-3 w-3 inline" /> 5% increase
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Conversion Rate</h3>
            <Users className="h-5 w-5 text-orange-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {analytics.conversionRate}%
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            <TrendingUp className="h-3 w-3 inline" /> 0.3% increase
          </p>
        </div>
      </div>

      {/* Revenue Trend Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <TrendLineChart
          title="Revenue Trend with Forecast"
          data={[
            { date: '2024-01-01', value: 125000 },
            { date: '2024-01-15', value: 145000 },
            { date: '2024-02-01', value: 168000 },
            { date: '2024-02-15', value: 192000 },
            { date: '2024-03-01', value: 215000 },
            { date: '2024-03-15', value: 238000 },
            { date: '2024-04-01', value: 265000 },
            { date: '2024-04-15', value: 289000 },
            { date: '2024-05-01', value: 312000 },
            { date: '2024-05-15', value: 335000 },
            { date: '2024-06-01', value: 358000 },
            { date: '2024-06-15', value: 382000 },
          ]}
          forecastData={[
            { date: '2024-07-01', value: 405000, isForecast: true },
            { date: '2024-07-15', value: 428000, isForecast: true },
            { date: '2024-08-01', value: 452000, isForecast: true },
            { date: '2024-08-15', value: 475000, isForecast: true },
          ]}
          annotations={[
            { date: '2024-03-01', label: 'Q1 End', value: 215000 },
            { date: '2024-06-01', label: 'Q2 End', value: 358000 },
          ]}
          height={350}
          yAxisLabel="Revenue ($)"
        />
      </div>

      {/* Cohort Analysis */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <CohortChart
          title="Customer Retention Cohort Analysis"
          data={[
            {
              cohort: 'Jan 2024',
              periods: {
                'Month 1': 100,
                'Month 2': 85,
                'Month 3': 72,
                'Month 4': 68,
                'Month 5': 65,
                'Month 6': 62,
              },
            },
            {
              cohort: 'Feb 2024',
              periods: {
                'Month 1': 100,
                'Month 2': 88,
                'Month 3': 75,
                'Month 4': 70,
                'Month 5': 67,
              },
            },
            {
              cohort: 'Mar 2024',
              periods: {
                'Month 1': 100,
                'Month 2': 90,
                'Month 3': 78,
                'Month 4': 73,
              },
            },
            {
              cohort: 'Apr 2024',
              periods: {
                'Month 1': 100,
                'Month 2': 92,
                'Month 3': 80,
              },
            },
            {
              cohort: 'May 2024',
              periods: {
                'Month 1': 100,
                'Month 2': 94,
              },
            },
            {
              cohort: 'Jun 2024',
              periods: {
                'Month 1': 100,
              },
            },
          ]}
        />
      </div>

      {/* Traffic Flow - Sankey Diagram */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <SankeyChart
          title="Traffic Source to Conversion Flow"
          nodes={[
            { id: 'organic', label: 'Organic Search' },
            { id: 'direct', label: 'Direct' },
            { id: 'social', label: 'Social Media' },
            { id: 'email', label: 'Email' },
            { id: 'paid', label: 'Paid Ads' },
            { id: 'home', label: 'Homepage' },
            { id: 'products', label: 'Products' },
            { id: 'collections', label: 'Collections' },
            { id: 'cart', label: 'Cart' },
            { id: 'checkout', label: 'Checkout' },
            { id: 'converted', label: 'Converted' },
            { id: 'bounced', label: 'Bounced' },
          ]}
          links={[
            { source: 'organic', target: 'home', value: 4500 },
            { source: 'organic', target: 'products', value: 3200 },
            { source: 'direct', target: 'home', value: 2800 },
            { source: 'direct', target: 'collections', value: 1500 },
            { source: 'social', target: 'products', value: 1800 },
            { source: 'email', target: 'collections', value: 1200 },
            { source: 'paid', target: 'products', value: 2500 },
            { source: 'home', target: 'products', value: 5200 },
            { source: 'home', target: 'bounced', value: 2100 },
            { source: 'products', target: 'cart', value: 6800 },
            { source: 'products', target: 'bounced', value: 2700 },
            { source: 'collections', target: 'cart', value: 1800 },
            { source: 'collections', target: 'bounced', value: 900 },
            { source: 'cart', target: 'checkout', value: 5200 },
            { source: 'cart', target: 'bounced', value: 3400 },
            { source: 'checkout', target: 'converted', value: 3800 },
            { source: 'checkout', target: 'bounced', value: 1400 },
          ]}
          height={400}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Categories */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Top Categories</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {analytics.topCategories.map((category, index) => (
                <div key={index}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{category.name}</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      ${category.revenue.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${(category.revenue / analytics.topCategories[0].revenue) * 100}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {category.orders} orders
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Sellers */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Top Sellers</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {analytics.topSellers.map((seller, index) => (
                <div
                  key={seller.id}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {seller.full_name || seller.email}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{seller.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900 dark:text-white">$12,345</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Revenue</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">User Growth</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">New Users</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">{analytics.totalUsers}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Growth Rate</span>
              <span className="text-sm font-semibold text-green-600">+15%</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Product Stats</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">New Products</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">{analytics.totalProducts}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Active Listings</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">1,234</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Order Stats</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Total Orders</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">{analytics.totalOrders}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Avg Order Value</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                ${analytics.averageOrderValue.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
