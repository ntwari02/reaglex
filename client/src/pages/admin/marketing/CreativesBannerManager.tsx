import React, { useState } from 'react';
import { Image, Plus, Edit, Trash2, Calendar, Eye, TrendingUp } from 'lucide-react';

interface Creative {
  id: string;
  name: string;
  type: 'banner' | 'video' | 'poster' | 'carousel';
  location: string;
  impressions: number;
  clicks: number;
  scheduledFrom?: string;
  scheduledTo?: string;
  status: 'active' | 'scheduled' | 'inactive';
}

const mockCreatives: Creative[] = [
  {
    id: '1',
    name: 'Summer Sale Banner',
    type: 'banner',
    location: 'Homepage Top',
    impressions: 125000,
    clicks: 3420,
    status: 'active',
  },
  {
    id: '2',
    name: 'Product Carousel',
    type: 'carousel',
    location: 'Category Page',
    impressions: 89200,
    clicks: 1890,
    scheduledFrom: '2024-03-20',
    scheduledTo: '2024-03-30',
    status: 'scheduled',
  },
];

export default function CreativesBannerManager() {
  const [creatives, setCreatives] = useState<Creative[]>(mockCreatives);
  const [showAddModal, setShowAddModal] = useState(false);

  const getStatusBadge = (status: Creative['status']) => {
    const styles = {
      active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
      scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200',
      inactive: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    };
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${styles[status]}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Creatives & Banner Manager
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage marketing assets and promotional banners
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-6 py-2 text-sm font-semibold text-white shadow-lg hover:shadow-xl"
        >
          <Plus className="mr-2 inline h-4 w-4" />
          Upload Creative
        </button>
      </div>

      {/* Creatives Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {creatives.map((creative) => (
          <div
            key={creative.id}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="mb-4 aspect-video rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <Image className="h-12 w-12 text-gray-400" />
            </div>
            <div className="mb-3">
              <h3 className="font-semibold text-gray-900 dark:text-white">{creative.name}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {creative.type} • {creative.location}
              </p>
            </div>
            <div className="mb-3 flex items-center gap-3">{getStatusBadge(creative.status)}</div>
            <div className="mb-4 grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Impressions</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {creative.impressions.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Clicks</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {creative.clicks.toLocaleString()}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="flex-1 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
                <Edit className="mr-1 inline h-4 w-4" />
                Edit
              </button>
              <button className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-red-400 dark:border-gray-700 dark:text-gray-300">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

