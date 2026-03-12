import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Shield,
  FileText,
  TrendingUp,
  Target,
  Lightbulb,
  BarChart3,
} from 'lucide-react';
import { adminReviewsAPI } from '@/lib/api';

const featureIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  'auto-moderate': Shield,
  'summarize': FileText,
  'sentiment': TrendingUp,
  'suggest-actions': Target,
  'predict-problems': Lightbulb,
  'insights-report': BarChart3,
};

export default function AIReviewAssistant() {
  const [aiEnabled, setAiEnabled] = useState(true);
  const [features, setFeatures] = useState<Array<{ id: string; title: string; description: string; enabled: boolean }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminReviewsAPI.getAISettings()
      .then((res) => {
        setAiEnabled(res.aiEnabled !== false);
        setFeatures(Array.isArray(res.features) ? res.features : []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  const handleToggleAi = () => {
    const next = !aiEnabled;
    setAiEnabled(next);
    setSaving(true);
    adminReviewsAPI.updateAISettings({ aiEnabled: next, features }).finally(() => setSaving(false));
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
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">AI Review Assistant</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Leverage AI for intelligent review moderation and insights
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
            <Sparkles className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Enable AI Assistant
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Activate AI-powered review moderation
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
            <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-amber-500 peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-gray-700"></div>
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
                  <div className="rounded-full bg-amber-100 p-2 dark:bg-amber-900/40">
                    <Icon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
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
    </div>
  );
}

