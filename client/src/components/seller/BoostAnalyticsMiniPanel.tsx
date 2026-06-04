import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, TrendingDown, TrendingUp } from 'lucide-react';
import { API_BASE_URL } from '@/lib/config';

type TrendDir = 'up' | 'down' | 'flat';

interface BoostMetrics {
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  conversionRate: number;
  estimatedLift?: number;
  trends: {
    impressions: TrendDir;
    clicks: TrendDir;
    conversions: TrendDir;
  };
}

interface BoostAnalyticsMiniPanelProps {
  boostUsed: number;
  boostLimit: number;
  planKey: string;
}

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('auth_token');
  if (!token) return { 'Content-Type': 'application/json' };
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

const Stat: React.FC<{
  label: string;
  value: string;
  trend: TrendDir;
}> = ({ label, value, trend }) => {
  const trendIcon =
    trend === 'up' ? (
      <TrendingUp className="w-3.5 h-3.5 text-green-500" />
    ) : trend === 'down' ? (
      <TrendingDown className="w-3.5 h-3.5 text-red-500" />
    ) : (
      <span className="w-3.5 h-3.5 inline-block rounded-full bg-gray-300 dark:bg-gray-600" />
    );

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
        {trendIcon}
      </div>
      <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
    </div>
  );
};

const BoostAnalyticsMiniPanel: React.FC<BoostAnalyticsMiniPanelProps> = ({
  boostUsed,
  boostLimit,
  planKey,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<BoostMetrics | null>(null);

  const boostRemaining = Number.isFinite(boostLimit)
    ? Math.max(0, boostLimit - boostUsed)
    : Number.POSITIVE_INFINITY;

  useEffect(() => {
    let mounted = true;

    const fetchMetrics = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`${API_BASE_URL}/seller/analytics?timeRange=month`, {
          method: 'GET',
          headers: getAuthHeaders(),
          credentials: 'include',
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data?.message || 'Failed to load boost analytics');
        }

        const funnel = Array.isArray(data?.conversionFunnel) ? data.conversionFunnel : [];
        const getVal = (label: string) =>
          Number(funnel.find((f: any) => String(f.label).toLowerCase() === label.toLowerCase())?.value || 0);

        const impressions =
          getVal('Catalog views (sum of product.views)') ||
          getVal('Product Views');
        const clicks = getVal('Orders (period, excl. cancelled)') || getVal('Add to Cart');
        const conversions = clicks;
        const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
        const conversionRate = clicks > 0 ? (conversions / clicks) * 100 : 0;
        const revenue = Number(data?.salesStats?.totalRevenue?.value || 0);
        const estimatedLift = revenue > 0 ? Math.round(revenue * 0.08) : undefined;

        const trendFrom = (s: string | undefined): TrendDir => {
          if (!s) return 'flat';
          if (s.startsWith('+')) return 'up';
          if (s.startsWith('-')) return 'down';
          return 'flat';
        };
        const orderTrend = trendFrom(data?.salesStats?.totalOrders?.change);

        if (!mounted) return;
        setMetrics({
          impressions,
          clicks,
          conversions,
          ctr,
          conversionRate,
          estimatedLift,
          trends: {
            impressions: orderTrend,
            clicks: orderTrend,
            conversions: orderTrend,
          },
        });
      } catch (err: any) {
        if (!mounted) return;
        setError(err?.message || 'Failed to load boost analytics');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchMetrics();
    return () => {
      mounted = false;
    };
  }, [planKey]);

  const noActivity = useMemo(() => {
    if (!metrics) return false;
    return metrics.impressions <= 0 && metrics.clicks <= 0 && metrics.conversions <= 0;
  }, [metrics]);

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-red-500" />
            Boost Analytics
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Boost performance this month</p>
        </div>
        <button
          type="button"
          className="text-xs font-medium text-red-500 hover:text-red-600"
          onClick={() => window.location.assign('/seller/analytics')}
        >
          View details
        </button>
      </div>

      {loading ? (
        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-2">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="h-16 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="mt-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 px-3 py-2 text-xs text-red-600 dark:text-red-300">
          {error}
        </div>
      ) : noActivity ? (
        <div className="mt-4 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 px-3 py-4 text-xs text-gray-500 dark:text-gray-400 text-center">
          No boost activity yet this month. Start boosting products to track impressions, clicks, and conversions.
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            <Stat label="Impressions" value={String(metrics?.impressions || 0)} trend={metrics?.trends.impressions || 'flat'} />
            <Stat label="Clicks" value={String(metrics?.clicks || 0)} trend={metrics?.trends.clicks || 'flat'} />
            <Stat label="Conversions" value={String(metrics?.conversions || 0)} trend={metrics?.trends.conversions || 'flat'} />
            <Stat label="CTR" value={`${(metrics?.ctr || 0).toFixed(1)}%`} trend={metrics?.trends.clicks || 'flat'} />
            <Stat label="Conversion Rate" value={`${(metrics?.conversionRate || 0).toFixed(1)}%`} trend={metrics?.trends.conversions || 'flat'} />
            <Stat
              label="Boost Usage"
              value={
                Number.isFinite(boostLimit)
                  ? `${boostUsed}/${boostLimit} used`
                  : `${boostUsed} used`
              }
              trend="flat"
            />
          </div>
          <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-red-500 to-[var(--brand-primary)]"
              style={{
                width: `${
                  Number.isFinite(boostLimit) && boostLimit > 0
                    ? Math.max(0, Math.min(100, Math.round((boostUsed / boostLimit) * 100)))
                    : 0
                }%`,
              }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>
              Remaining:{' '}
              {Number.isFinite(boostRemaining) ? `${boostRemaining}` : 'Unlimited'}
            </span>
            {typeof metrics?.estimatedLift === 'number' && (
              <span>Estimated monthly lift: ${metrics.estimatedLift.toLocaleString()}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BoostAnalyticsMiniPanel;
