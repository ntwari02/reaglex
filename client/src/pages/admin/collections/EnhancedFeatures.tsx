import { useState } from 'react';
import {
  Sparkles,
  Lightbulb,
  TestTube,
  Monitor,
  Smartphone,
  Tablet,
  Globe,
  Zap,
} from 'lucide-react';

export default function EnhancedFeatures() {
  const [aiEnabled, setAiEnabled] = useState(true);
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Enhanced Features</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Advanced AI and premium features for collections
        </p>
      </div>

      {/* AI Collection Auto-Generator */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                AI Collection Auto-Generator
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Suggest collections based on trends
              </p>
            </div>
          </div>
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={aiEnabled}
              onChange={(e) => setAiEnabled(e.target.checked)}
              className="peer sr-only"
            />
            <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-500 peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-gray-700"></div>
          </label>
        </div>
        {aiEnabled && (
          <div className="space-y-3">
            <button className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
              <Lightbulb className="mr-2 inline h-4 w-4" />
              Generate Collection Suggestions
            </button>
            <button className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
              <Zap className="mr-2 inline h-4 w-4" />
              Auto-Generate Banners & Titles
            </button>
          </div>
        )}
      </div>

      {/* Recommendation Engine */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex items-center gap-3">
          <Lightbulb className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Recommendation Engine
          </h3>
        </div>
        <div className="space-y-3">
          <button className="w-full rounded-xl border border-gray-200 px-4 py-3 text-left text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
            <span className="block">Suggest Products to Add</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              AI-powered product recommendations
            </span>
          </button>
          <button className="w-full rounded-xl border border-gray-200 px-4 py-3 text-left text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
            <span className="block">Suggest Rule Improvements</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Optimize automated collection rules
            </span>
          </button>
        </div>
      </div>

      {/* A/B Testing */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex items-center gap-3">
          <TestTube className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">A/B Testing</h3>
        </div>
        <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
          Test different layouts and banners to optimize performance
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <button className="rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
            Test Layout Variations
          </button>
          <button className="rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
            Test Banner Variations
          </button>
        </div>
      </div>

      {/* Storefront Preview */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex items-center gap-3">
          <Monitor className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Storefront Preview Mode
          </h3>
        </div>
        <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
          Preview how collection looks on different devices
        </p>
        <div className="mb-4 flex gap-2">
          {(['mobile', 'tablet', 'desktop'] as const).map((device) => {
            const icons = {
              mobile: Smartphone,
              tablet: Tablet,
              desktop: Monitor,
            };
            const Icon = icons[device];
            return (
              <button
                key={device}
                onClick={() => setPreviewDevice(device)}
                className={`flex items-center gap-2 rounded-xl border-2 px-4 py-2 text-sm font-semibold transition-colors ${
                  previewDevice === device
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-500 dark:bg-emerald-900/20 dark:text-emerald-300'
                    : 'border-gray-200 text-gray-700 dark:border-gray-800 dark:text-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                {device.charAt(0).toUpperCase() + device.slice(1)}
              </button>
            );
          })}
        </div>
        <div className="aspect-video rounded-xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-gray-800">
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {previewDevice.charAt(0).toUpperCase() + previewDevice.slice(1)} Preview
            </p>
          </div>
        </div>
      </div>

      {/* Multi-language */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex items-center gap-3">
          <Globe className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Multi-Language Support
          </h3>
        </div>
        <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
          Add translations for collection title, description, and SEO fields
        </p>
        <button className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
          <Globe className="mr-2 inline h-4 w-4" />
          Manage Translations
        </button>
      </div>
    </div>
  );
}

