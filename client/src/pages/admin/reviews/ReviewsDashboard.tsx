import React, { useState } from 'react';
import {
  Star,
  Clock,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Package,
  Users,
  BarChart3,
} from 'lucide-react';
import { BarChart } from '@/components/charts/BarChart';

const mockStats = {
  totalReviews: 12450,
  pendingReviews: 245,
  rejectedReviews: 89,
  flaggedReviews: 32,
  avgProductRating: 4.3,
  avgSellerRating: 4.6,
};

const mockReviewActivity = [
  { label: 'Mon', value: 45 },
  { label: 'Tue', value: 52 },
  { label: 'Wed', value: 38 },
  { label: 'Thu', value: 61 },
  { label: 'Fri', value: 48 },
  { label: 'Sat', value: 35 },
  { label: 'Sun', value: 28 },
];

const mockMostReviewed = [
  { name: 'Premium Headphones', reviews: 245, rating: 4.8 },
  { name: 'Smart Watch', reviews: 189, rating: 4.6 },
  { name: 'Wireless Earbuds', reviews: 156, rating: 4.5 },
];

export default function ReviewsDashboard() {
  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Reviews</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {mockStats.totalReviews.toLocaleString()}
              </p>
            </div>
            <div className="rounded-full bg-emerald-100 p-3 dark:bg-emerald-900/40">
              <Star className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Pending Approval</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {mockStats.pendingReviews}
              </p>
            </div>
            <div className="rounded-full bg-amber-100 p-3 dark:bg-amber-900/40">
              <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Avg Product Rating</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {mockStats.avgProductRating}
              </p>
            </div>
            <div className="rounded-full bg-blue-100 p-3 dark:bg-blue-900/40">
              <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Avg Seller Rating</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {mockStats.avgSellerRating}
              </p>
            </div>
            <div className="rounded-full bg-purple-100 p-3 dark:bg-purple-900/40">
              <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Rejected</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {mockStats.rejectedReviews}
              </p>
            </div>
            <div className="rounded-full bg-red-100 p-3 dark:bg-red-900/40">
              <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Flagged</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {mockStats.flaggedReviews}
              </p>
            </div>
            <div className="rounded-full bg-orange-100 p-3 dark:bg-orange-900/40">
              <AlertTriangle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts and Lists */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Review Activity
          </h3>
          <div className="h-64">
            <BarChart data={mockReviewActivity} />
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Most Reviewed Products
          </h3>
          <div className="space-y-3">
            {mockMostReviewed.map((product, index) => (
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
        </div>
      </div>
    </div>
  );
}

