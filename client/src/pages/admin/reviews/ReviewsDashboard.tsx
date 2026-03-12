import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Star,
  Clock,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Package,
  Users,
} from 'lucide-react';
import { BarChart } from '@/components/charts/BarChart';
import { adminReviewsAPI } from '@/lib/api';
import { staggerItem, statCardHover } from './reviewAnimations';

export default function ReviewsDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalReviews: 0,
    pendingReviews: 0,
    rejectedReviews: 0,
    flaggedReviews: 0,
    avgProductRating: 0,
    avgSellerRating: 0,
  });
  const [reviewActivity, setReviewActivity] = useState<{ label: string; value: number }[]>([]);
  const [mostReviewed, setMostReviewed] = useState<{ name: string; reviews: number; rating: number }[]>([]);

  useEffect(() => {
    adminReviewsAPI
      .getDashboard()
      .then((res) => {
        setStats(res.stats || ({} as typeof stats));
        setReviewActivity(Array.isArray(res.reviewActivity) ? res.reviewActivity : []);
        setMostReviewed(Array.isArray(res.mostReviewed) ? res.mostReviewed : []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <p className="text-gray-500 dark:text-gray-400">Loading dashboard...</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-900/20">
        <p className="text-red-700 dark:text-red-300">{error}</p>
      </div>
    );
  }

  return (
    <motion.div className="space-y-6" initial="initial" animate="animate" variants={{ animate: { transition: { staggerChildren: 0.05 } } }}>
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <motion.div variants={staggerItem} className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900" whileHover={statCardHover.hover} whileTap={statCardHover.tap}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Reviews</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {stats.totalReviews.toLocaleString()}
              </p>
            </div>
            <div className="rounded-full bg-emerald-100 p-3 dark:bg-emerald-900/40">
              <Star className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
        </motion.div>

        <motion.div variants={staggerItem} className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900" whileHover={statCardHover.hover} whileTap={statCardHover.tap}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Pending Approval</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {stats.pendingReviews}
              </p>
            </div>
            <div className="rounded-full bg-amber-100 p-3 dark:bg-amber-900/40">
              <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
        </motion.div>

        <motion.div variants={staggerItem} className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900" whileHover={statCardHover.hover} whileTap={statCardHover.tap}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Avg Product Rating</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {stats.avgProductRating}
              </p>
            </div>
            <div className="rounded-full bg-blue-100 p-3 dark:bg-blue-900/40">
              <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </motion.div>

        <motion.div variants={staggerItem} className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900" whileHover={statCardHover.hover} whileTap={statCardHover.tap}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Avg Seller Rating</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {stats.avgSellerRating}
              </p>
            </div>
            <div className="rounded-full bg-purple-100 p-3 dark:bg-purple-900/40">
              <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </motion.div>

        <motion.div variants={staggerItem} className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900" whileHover={statCardHover.hover} whileTap={statCardHover.tap}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Rejected</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {stats.rejectedReviews}
              </p>
            </div>
            <div className="rounded-full bg-red-100 p-3 dark:bg-red-900/40">
              <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </motion.div>

        <motion.div variants={staggerItem} className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900" whileHover={statCardHover.hover} whileTap={statCardHover.tap}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Flagged</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {stats.flaggedReviews}
              </p>
            </div>
            <div className="rounded-full bg-orange-100 p-3 dark:bg-orange-900/40">
              <AlertTriangle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Charts and Lists */}
      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div variants={staggerItem} className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Review Activity
          </h3>
          <div className="h-64">
            <BarChart data={reviewActivity.length ? reviewActivity : [{ label: 'No data', value: 0 }]} />
          </div>
        </motion.div>

        <motion.div variants={staggerItem} className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Most Reviewed Products
          </h3>
          <div className="space-y-3">
            {mostReviewed.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No review data yet.</p>
            ) : mostReviewed.map((product, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50"
              >
                <div className="flex items-center gap-3">
                  <Package className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {product.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {product.reviews} reviews
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {product.rating}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

