import { useState } from 'react';
import {
  ArrowUpDown,
  Star,
  TrendingUp,
  DollarSign,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react';

export default function SortingDisplayRules() {
  const [selectedCollection, setSelectedCollection] = useState('1');
  const [sortOrder, setSortOrder] = useState('featured');
  const [hideOutOfStock, setHideOutOfStock] = useState(false);
  const [pushDiscounted, setPushDiscounted] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Collection Sorting & Display Rules
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Configure how products are sorted and displayed
        </p>
      </div>

      {/* Collection Selection */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
        <label className="mb-2 block text-sm font-semibold text-gray-900 dark:text-white">
          Select Collection
        </label>
        <select
          value={selectedCollection}
          onChange={(e) => setSelectedCollection(e.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        >
          <option value="1">Summer Sale</option>
          <option value="2">New Arrivals</option>
          <option value="3">Best Sellers</option>
        </select>
      </div>

      {/* Sorting Options */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex items-center gap-3">
          <ArrowUpDown className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Sorting Options</h3>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {[
            { value: 'featured', label: 'Featured (Manual)', icon: Star },
            { value: 'best-selling', label: 'Best Selling', icon: TrendingUp },
            { value: 'newest', label: 'Newest', icon: Sparkles },
            { value: 'oldest', label: 'Oldest', icon: Sparkles },
            { value: 'price-low', label: 'Price: Low to High', icon: DollarSign },
            { value: 'price-high', label: 'Price: High to Low', icon: DollarSign },
            { value: 'rating', label: 'Rating: High to Low', icon: Star },
            { value: 'most-reviewed', label: 'Most Reviewed', icon: Eye },
          ].map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.value}
                onClick={() => setSortOrder(option.value)}
                className={`flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-colors ${
                  sortOrder === option.value
                    ? 'border-emerald-500 bg-emerald-50 dark:border-emerald-500 dark:bg-emerald-900/20'
                    : 'border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-800/50'
                }`}
              >
                <Icon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {option.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Advanced Display Rules */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
        <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">
          Advanced Display Rules
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
            <div className="flex items-center gap-3">
              <EyeOff className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  Hide Out-of-Stock Products
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Automatically hide products with zero stock
                </p>
              </div>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={hideOutOfStock}
                onChange={(e) => setHideOutOfStock(e.target.checked)}
                className="peer sr-only"
              />
              <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-500 peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-gray-700"></div>
            </label>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  Push Discounted Items to Top
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Show products with discounts first
                </p>
              </div>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={pushDiscounted}
                onChange={(e) => setPushDiscounted(e.target.checked)}
                className="peer sr-only"
              />
              <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-500 peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-gray-700"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

