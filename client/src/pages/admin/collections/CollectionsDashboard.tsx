import React, { useState, useEffect } from 'react';
import {
  Folder,
  CheckCircle,
  Zap,
  Eye,
} from 'lucide-react';
import { BarChart } from '@/components/charts/BarChart';
import { adminCollectionsAPI } from '@/lib/api';

export default function CollectionsDashboard() {
  const [stats, setStats] = useState<Record<string, number | string> | null>(null);
  const [performance, setPerformance] = useState<{ date: string; value: number }[]>([]);
  const [mostViewedCollections, setMostViewedCollections] = useState<{ name: string; views: number; products: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    adminCollectionsAPI
      .getDashboard()
      .then((res) => {
        if (cancelled) return;
        setStats(res.stats ?? null);
        setPerformance(res.performance ?? []);
        setMostViewedCollections(res.mostViewedCollections ?? []);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load dashboard');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-200">
        {error}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="h-4 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
              <div className="mt-2 h-8 w-20 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const s = stats || {};

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Collections</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {s.totalCollections ?? 0}
              </p>
            </div>
            <div className="rounded-full bg-emerald-100 p-3 dark:bg-emerald-900/40">
              <Folder className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {s.activeCollections ?? 0}
              </p>
            </div>
            <div className="rounded-full bg-blue-100 p-3 dark:bg-blue-900/40">
              <CheckCircle className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Automated</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {s.automatedCollections ?? 0}
              </p>
            </div>
            <div className="rounded-full bg-purple-100 p-3 dark:bg-purple-900/40">
              <Zap className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Homepage</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {s.homepageCollections ?? 0}
              </p>
            </div>
            <div className="rounded-full bg-amber-100 p-3 dark:bg-amber-900/40">
              <Eye className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts and Lists */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Performance Analytics
          </h3>
          <div className="h-64">
            <BarChart data={performance.length ? performance : [{ date: new Date().toISOString().slice(0, 10), value: 0 }]} />
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Most Viewed Collections
          </h3>
          <div className="space-y-3">
            {mostViewedCollections.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No collections yet.</p>
            ) : (
              mostViewedCollections.map((collection, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50"
                >
                  <div className="flex items-center gap-3">
                    <Folder className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {collection.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {collection.products} products
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {(collection.views ?? 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
