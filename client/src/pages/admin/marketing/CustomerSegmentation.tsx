import React, { useState, useEffect } from 'react';
import { Users, Plus, Filter, Download, Eye } from 'lucide-react';
import { adminMarketingAPI } from '@/lib/api';

interface Segment {
  id: string;
  name: string;
  filters: string[];
  userCount: number;
  createdAt: string;
}

export default function CustomerSegmentation() {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminMarketingAPI
      .getSegments()
      .then((res) => setSegments(res.segments || []))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load segments'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Customer Segmentation</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Create dynamic customer groups for targeted marketing
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-6 py-2 text-sm font-semibold text-white shadow-lg hover:shadow-xl"
        >
          <Plus className="mr-2 inline h-4 w-4" />
          Create Segment
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-900/20">
          <p className="text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}
      {loading ? (
        <div className="flex min-h-[120px] items-center justify-center rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <p className="text-gray-500 dark:text-gray-400">Loading segments...</p>
        </div>
      ) : (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {segments.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
            <p className="text-gray-500 dark:text-gray-400">No segments yet. Create one to get started.</p>
          </div>
        ) : segments.map((segment) => (
          <div
            key={segment.id}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="mb-4 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-emerald-100 p-2 dark:bg-emerald-900/40">
                  <Users className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{segment.name}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {segment.userCount.toLocaleString()} users
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-4 space-y-2">
              {segment.filters.map((filter, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 p-2 dark:border-gray-800 dark:bg-gray-800/50"
                >
                  <Filter className="h-3 w-3 text-gray-400" />
                  <span className="text-xs text-gray-700 dark:text-gray-300">{filter}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <button className="flex-1 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
                <Eye className="mr-1 inline h-4 w-4" />
                View
              </button>
              <button className="flex-1 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
                <Download className="mr-1 inline h-4 w-4" />
                Export
              </button>
            </div>
          </div>
        ))}
      </div>
      )}
    </div>
  );
}

