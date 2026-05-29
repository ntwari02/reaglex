import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  DollarSign,
  ShoppingCart,
  Users,
  TrendingUp,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import SalesChart from '@/components/dashboard/SalesChart';
import RecentOrders from '@/components/dashboard/RecentOrders';
import { API_BASE_URL } from '@/lib/config';
import { useToastStore } from '@/stores/toastStore';
import { useSystemFeatures } from '@/hooks/useSystemFeatures';
// @ts-ignore seller live dashboard (JSX)
import SellerLiveDashboard from '@/components/seller/SellerLiveDashboard';

type Trend = 'up' | 'down';

interface DashboardStats {
  stats: {
    totalSales: { value: string; change: string; trend: Trend };
    activeOrders: { value: string; change: string; trend: Trend };
    totalCustomers?: { value: string; change: string; trend: Trend };
    conversionRate: { value: string; change: string; trend: Trend };
  };
  recentOrders: Array<{
    id: string;
    customer: string;
    amount: string;
    status: 'processing' | 'shipped' | 'delivered';
    time: string;
  }>;
  revenueTrend: Array<{ date: string; value: number }>;
}

function normalizeApiBase(raw: string): string {
  const v = (raw || '').trim();
  if (!v) return API_BASE_URL;
  if (v.startsWith('https//')) return `https://${v.slice('https//'.length)}`;
  if (v.startsWith('http//')) return `http://${v.slice('http//'.length)}`;
  return v;
}

const API_ROOT = normalizeApiBase(API_BASE_URL).replace(/\/$/, '');
const API_BASE = `${API_ROOT}/seller/dashboard/stats`;

function KpiCard(props: {
  title: string;
  value: string;
  change: string;
  trend: Trend;
  icon: React.ReactNode;
  tint: string; // bg
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className="rounded-2xl border border-gray-200/70 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-gray-700/40 dark:bg-gray-900/50"
    >
      <div className="flex items-center justify-between">
        <div className={`h-10 w-10 rounded-2xl flex items-center justify-center ${props.tint}`}>
          {props.icon}
        </div>
        <div
          className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${
            props.trend === 'up'
              ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300'
              : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300'
          }`}
        >
          {props.trend === 'up' ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
          {props.change}
        </div>
      </div>
      <div className="mt-3">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">{props.title}</p>
        <p className="mt-1 text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">
          {props.value}
        </p>
      </div>
    </motion.div>
  );
}

export default function SellerHubHome() {
  const { showToast } = useToastStore();
  const { isEnabled, loading: featuresLoading } = useSystemFeatures();
  const liveCommerceOn = featuresLoading || isEnabled('live_commerce');
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('week');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardStats | null>(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('auth_token');
        const res = await fetch(`${API_BASE}?timeRange=${timeRange}`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          credentials: 'include',
        });
        if (res.status === 401) {
          window.location.href = '/login';
          return;
        }
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || 'Failed to load seller dashboard');
        }
        const json = await res.json();
        setData(json);
      } catch (e: any) {
        setData(null);
        showToast(e?.message || 'Failed to load dashboard', 'error');
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [timeRange, showToast]);

  const kpis = useMemo(() => {
    if (!data?.stats) return [];
    return [
      {
        title: 'Total Sales',
        value: data.stats.totalSales.value,
        change: data.stats.totalSales.change,
        trend: data.stats.totalSales.trend,
        icon: <DollarSign className="h-5 w-5 text-emerald-700 dark:text-emerald-200" />,
        tint: 'bg-emerald-100 dark:bg-emerald-900/30',
      },
      {
        title: 'Active Orders',
        value: data.stats.activeOrders.value,
        change: data.stats.activeOrders.change,
        trend: data.stats.activeOrders.trend,
        icon: <ShoppingCart className="h-5 w-5 text-blue-700 dark:text-blue-200" />,
        tint: 'bg-blue-100 dark:bg-blue-900/30',
      },
      {
        title: 'Total Customers',
        value: data.stats.totalCustomers?.value ?? '—',
        change: data.stats.totalCustomers?.change ?? '0%',
        trend: data.stats.totalCustomers?.trend ?? 'up',
        icon: <Users className="h-5 w-5 text-orange-700 dark:text-orange-200" />,
        tint: 'bg-orange-100 dark:bg-orange-900/30',
      },
      {
        title: 'Conversion Rate',
        value: data.stats.conversionRate.value,
        change: data.stats.conversionRate.change,
        trend: data.stats.conversionRate.trend,
        icon: <TrendingUp className="h-5 w-5 text-purple-700 dark:text-purple-200" />,
        tint: 'bg-purple-100 dark:bg-purple-900/30',
      },
    ] as const;
  }, [data]);

  if (loading) {
    return (
      <div className="flex min-h-[360px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--brand-primary)] border-t-transparent" />
          <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">Loading Seller Hub…</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-2xl border border-gray-200/60 bg-white/80 p-6 text-center shadow-sm dark:border-gray-700/40 dark:bg-gray-900/50">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Failed to load dashboard.</p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Please try again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Greeting + range picker */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">Seller Hub</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            Good morning
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Here’s what’s happening with your store today.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white/80 px-3 py-2 text-sm shadow-sm dark:border-gray-700/40 dark:bg-gray-900/50">
            <Calendar className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="bg-transparent text-sm font-semibold text-gray-800 outline-none dark:text-gray-100"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <KpiCard key={k.title} {...k} />
        ))}
      </div>

      {liveCommerceOn ? <SellerLiveDashboard /> : null}

      {/* Chart + Recent orders */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-gray-200/70 bg-white/80 p-5 shadow-sm backdrop-blur dark:border-gray-700/40 dark:bg-gray-900/50">
          <SalesChart
            timeRange={timeRange === 'today' ? 'week' : timeRange === 'month' ? 'month' : 'week'}
            data={(data.revenueTrend || []).map((x) => ({ date: x.date, revenue: x.value, orders: 0 }))}
          />
        </div>
        <div className="min-h-[340px]">
          <RecentOrders orders={data.recentOrders || []} />
        </div>
      </div>
    </div>
  );
}

