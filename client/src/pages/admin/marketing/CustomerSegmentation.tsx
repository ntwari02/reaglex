import React, { useState } from 'react';
import { Users, Plus, Filter, Download, Eye, Edit, Trash2 } from 'lucide-react';

interface Segment {
  id: string;
  name: string;
  filters: string[];
  userCount: number;
  createdAt: string;
}

const mockSegments: Segment[] = [
  {
    id: '1',
    name: 'High-Value Customers',
    filters: ['Total spent > $500', 'Orders > 5'],
    userCount: 1245,
    createdAt: '2024-03-10',
  },
  {
    id: '2',
    name: 'Abandoned Cart Users',
    filters: ['Cart items > 0', 'Last login < 7 days'],
    userCount: 3420,
    createdAt: '2024-03-12',
  },
  {
    id: '3',
    name: 'Inactive Users',
    filters: ['Last login > 30 days', 'No orders in 60 days'],
    userCount: 8920,
    createdAt: '2024-03-08',
  },
];

export default function CustomerSegmentation() {
  const [segments, setSegments] = useState<Segment[]>(mockSegments);
  const [showAddModal, setShowAddModal] = useState(false);

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

      {/* Segments Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {segments.map((segment) => (
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
    </div>
  );
}

