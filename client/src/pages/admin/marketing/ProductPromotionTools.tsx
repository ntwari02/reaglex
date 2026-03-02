import React, { useState } from 'react';
import { Star, Plus, Edit, Trash2, TrendingUp, Package, Home, Sparkles } from 'lucide-react';

interface Promotion {
  id: string;
  type: 'featured' | 'homepage' | 'trending' | 'recommended' | 'boost';
  productName: string;
  position: string;
  status: 'active' | 'inactive';
  impressions: number;
  clicks: number;
}

const mockPromotions: Promotion[] = [
  {
    id: '1',
    type: 'featured',
    productName: 'Premium Headphones',
    position: 'Homepage Top',
    status: 'active',
    impressions: 45230,
    clicks: 3420,
  },
  {
    id: '2',
    type: 'trending',
    productName: 'Smart Watch',
    position: 'Trending Section',
    status: 'active',
    impressions: 28450,
    clicks: 1890,
  },
];

export default function ProductPromotionTools() {
  const [promotions, setPromotions] = useState<Promotion[]>(mockPromotions);
  const [showAddModal, setShowAddModal] = useState(false);

  const getTypeIcon = (type: Promotion['type']) => {
    switch (type) {
      case 'featured':
        return <Star className="h-4 w-4" />;
      case 'homepage':
        return <Home className="h-4 w-4" />;
      case 'trending':
        return <TrendingUp className="h-4 w-4" />;
      case 'recommended':
        return <Sparkles className="h-4 w-4" />;
      case 'boost':
        return <Package className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Product Promotion Tools
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Highlight products across the platform
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-6 py-2 text-sm font-semibold text-white shadow-lg hover:shadow-xl"
        >
          <Plus className="mr-2 inline h-4 w-4" />
          Promote Product
        </button>
      </div>

      {/* Promotions List */}
      <div className="space-y-4">
        {promotions.map((promotion) => (
          <div
            key={promotion.id}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="mb-3 flex items-center gap-3">
                  {getTypeIcon(promotion.type)}
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {promotion.productName}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {promotion.type} • {promotion.position}
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Impressions</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {promotion.impressions.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Clicks</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {promotion.clicks.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">CTR</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {((promotion.clicks / promotion.impressions) * 100).toFixed(2)}%
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
                  <Edit className="mr-1 inline h-4 w-4" />
                  Edit
                </button>
                <button className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-red-400 dark:border-gray-700 dark:text-gray-300">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

