import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Lightbulb,
  Target,
  Clock,
  TrendingUp,
  Gift,
  Users,
  FileText,
  Zap,
} from 'lucide-react';
import { adminMarketingAPI } from '@/lib/api';

const featureIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  'campaign-ideas': Lightbulb,
  'best-promotion': Target,
  'best-time': Clock,
  'high-value': TrendingUp,
  'discount-suggest': Gift,
  'ai-segments': Users,
  'auto-copy': FileText,
};

export default function AIMarketingTools() {
  const [aiEnabled, setAiEnabled] = useState(true);
  const [features, setFeatures] = useState<Array<{ id: string; title: string; description: string; enabled: boolean }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminMarketingAPI
      .getAISettings()
      .then((res) => {
        setAiEnabled(res.aiEnabled !== false);
        setFeatures(Array.isArray(res.features) ? res.features : []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load AI settings'))
      .finally(() => setLoading(false));
  }, []);

  const handleToggleAi = () => {
    const next = !aiEnabled;
    setAiEnabled(next);
    setSaving(true);
    adminMarketingAPI.updateAISettings({ aiEnabled: next, features }).finally(() => setSaving(false));
  };

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <p className="text-gray-500 dark:text-gray-400">Loading AI settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">AI Marketing Tools</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Leverage AI for intelligent marketing automation
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-900/20">
          <p className="text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Enable AI Marketing
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Activate AI-powered marketing features
              </p>
            </div>
          </div>
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={aiEnabled}
              onChange={handleToggleAi}
              disabled={saving}
              className="peer sr-only"
            />
            <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-500 peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-gray-700"></div>
          </label>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {features.map((feature) => {
          const Icon = featureIcons[feature.id] || Sparkles;
          return (
            <div
              key={feature.id}
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-emerald-100 p-2 dark:bg-emerald-900/40">
                    <Icon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{feature.title}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {feature.description}
                    </p>
                  </div>
                </div>
                {feature.enabled ? (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
                    Active
                  </span>
                ) : (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                    Inactive
                  </span>
                )}
              </div>
              <button className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
                {feature.enabled ? 'Configure' : 'Activate'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Quick Actions</h3>
        <div className="grid gap-3 md:grid-cols-3">
          <button className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 text-left transition-colors hover:border-emerald-400 dark:border-gray-800 dark:bg-gray-800/50">
            <Zap className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                Generate Campaign Idea
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">AI-powered suggestions</p>
            </div>
          </button>
          <button className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 text-left transition-colors hover:border-emerald-400 dark:border-gray-800 dark:bg-gray-800/50">
            <FileText className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                Generate Marketing Copy
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">AI-written content</p>
            </div>
          </button>
          <button className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 text-left transition-colors hover:border-emerald-400 dark:border-gray-800 dark:bg-gray-800/50">
            <Users className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                Create AI Segment
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Smart segmentation</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

