import React, { useState } from 'react';
import {
  Sparkles,
  Shield,
  FileText,
  TrendingUp,
  Target,
  Lightbulb,
  Zap,
  BarChart3,
} from 'lucide-react';

export default function AIReviewAssistant() {
  const [aiEnabled, setAiEnabled] = useState(true);

  const aiFeatures = [
    {
      icon: Shield,
      title: 'Auto-Moderate Reviews',
      description: 'Automatically detect and flag inappropriate content',
      enabled: true,
    },
    {
      icon: FileText,
      title: 'Summarize Long Reviews',
      description: 'AI-generated summaries for lengthy reviews',
      enabled: true,
    },
    {
      icon: TrendingUp,
      title: 'Detect Emotional Tone',
      description: 'Analyze sentiment and emotional context',
      enabled: true,
    },
    {
      icon: Target,
      title: 'Suggest Actions',
      description: 'Recommend moderation actions based on AI analysis',
      enabled: false,
    },
    {
      icon: Lightbulb,
      title: 'Predict Seller Problems',
      description: 'Identify potential issues before they escalate',
      enabled: false,
    },
    {
      icon: BarChart3,
      title: 'Generate Insights Report',
      description: 'Auto-generate comprehensive review insights',
      enabled: true,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">AI Review Assistant</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Leverage AI for intelligent review moderation and insights
        </p>
      </div>

      {/* AI Toggle */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
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
              onChange={(e) => setAiEnabled(e.target.checked)}
              className="peer sr-only"
            />
            <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-500 peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-gray-700"></div>
          </label>
        </div>
      </div>

      {/* AI Features */}
      <div className="grid gap-4 md:grid-cols-2">
        {aiFeatures.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <div
              key={index}
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
    </div>
  );
}

