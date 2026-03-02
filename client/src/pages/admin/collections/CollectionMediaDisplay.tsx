import { useState } from 'react';
import { Image as ImageIcon, Upload, Layout, Eye, Star, TrendingUp } from 'lucide-react';

export default function CollectionMediaDisplay() {
  const [selectedCollection, setSelectedCollection] = useState('1');
  const [layoutStyle, setLayoutStyle] = useState<'grid' | 'list' | 'carousel' | 'masonry'>('grid');
  const [homepageHighlight, setHomepageHighlight] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Collection Media & Display Control
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Manage banners, layouts, and display settings
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

      {/* Media Upload */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex items-center gap-3">
            <ImageIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Banner Image</h3>
          </div>
          <div className="mb-4 aspect-video rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center dark:border-gray-700 dark:bg-gray-800">
            <div className="text-center">
              <Upload className="mx-auto h-8 w-8 text-gray-400" />
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Upload banner image</p>
            </div>
          </div>
          <button className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
            <Upload className="mr-2 inline h-4 w-4" />
            Upload Banner
          </button>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex items-center gap-3">
            <ImageIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Mobile Banner
            </h3>
          </div>
          <div className="mb-4 aspect-video rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center dark:border-gray-700 dark:bg-gray-800">
            <div className="text-center">
              <Upload className="mx-auto h-8 w-8 text-gray-400" />
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Upload mobile-optimized banner
              </p>
            </div>
          </div>
          <button className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
            <Upload className="mr-2 inline h-4 w-4" />
            Upload Mobile Banner
          </button>
        </div>
      </div>

      {/* Layout Style */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex items-center gap-3">
          <Layout className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Layout Style</h3>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {(['grid', 'list', 'carousel', 'masonry'] as const).map((layout) => (
            <button
              key={layout}
              onClick={() => setLayoutStyle(layout)}
              className={`rounded-xl border-2 p-4 text-center transition-colors ${
                layoutStyle === layout
                  ? 'border-emerald-500 bg-emerald-50 dark:border-emerald-500 dark:bg-emerald-900/20'
                  : 'border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-800/50'
              }`}
            >
              <Layout className="mx-auto h-6 w-6 text-gray-600 dark:text-gray-400" />
              <p className="mt-2 text-xs font-semibold capitalize text-gray-900 dark:text-white">
                {layout}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Homepage Settings */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Eye className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Homepage Highlight
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Display this collection on homepage
              </p>
            </div>
          </div>
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={homepageHighlight}
              onChange={(e) => setHomepageHighlight(e.target.checked)}
              className="peer sr-only"
            />
            <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-500 peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-gray-700"></div>
          </label>
        </div>
        {homepageHighlight && (
          <div className="mt-4">
            <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">
              Position on Homepage
            </label>
            <input
              type="number"
              min="1"
              placeholder="1"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
        )}
      </div>

      {/* Collection Badges */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
        <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">Collection Badges</h3>
        <div className="space-y-3">
          {[
            { name: 'New', icon: Star },
            { name: 'Trending', icon: TrendingUp },
            { name: 'Top Rated', icon: Star },
          ].map((badge) => {
            const Icon = badge.icon;
            return (
              <div
                key={badge.name}
                className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50"
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {badge.name}
                  </span>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input type="checkbox" className="peer sr-only" />
                  <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-500 peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-gray-700"></div>
                </label>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

