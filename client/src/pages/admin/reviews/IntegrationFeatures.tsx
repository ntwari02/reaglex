import React, { useState } from 'react';
import {
  Link,
  CheckCircle,
  XCircle,
  Download,
  Upload,
  Code,
  ExternalLink,
  Shield,
} from 'lucide-react';

export default function IntegrationFeatures() {
  const [verifiedPurchaseOnly, setVerifiedPurchaseOnly] = useState(true);
  const [helpfulScoring, setHelpfulScoring] = useState(true);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Integration Features</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Advanced integrations and review display options
        </p>
      </div>

      {/* Display Options */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Display Options</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  Verified Purchase Only
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Show only reviews from verified purchases
                </p>
              </div>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={verifiedPurchaseOnly}
                onChange={(e) => setVerifiedPurchaseOnly(e.target.checked)}
                className="peer sr-only"
              />
              <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-500 peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-gray-700"></div>
            </label>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  Helpful / Not Helpful Scoring
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Allow customers to rate review helpfulness
                </p>
              </div>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={helpfulScoring}
                onChange={(e) => setHelpfulScoring(e.target.checked)}
                className="peer sr-only"
              />
              <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-500 peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-gray-700"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Export/Import */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex items-center gap-3">
            <Download className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Export Reviews</h3>
          </div>
          <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
            Export all reviews to CSV format
          </p>
          <button className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
            <Download className="mr-2 inline h-4 w-4" />
            Export CSV
          </button>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex items-center gap-3">
            <Upload className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Import Reviews</h3>
          </div>
          <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
            Import reviews from previous platform
          </p>
          <button className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
            <Upload className="mr-2 inline h-4 w-4" />
            Import CSV
          </button>
        </div>
      </div>

      {/* Third-Party Integrations */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Third-Party Integrations
        </h3>
        <div className="space-y-3">
          {[
            { name: 'TrustPilot', status: 'connected' },
            { name: 'JudgeMe', status: 'disconnected' },
            { name: 'Review.io', status: 'disconnected' },
          ].map((integration) => (
            <div
              key={integration.name}
              className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50"
            >
              <div className="flex items-center gap-3">
                <Link className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {integration.name}
                </span>
              </div>
              {integration.status === 'connected' ? (
                <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <XCircle className="h-5 w-5 text-gray-400" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* API Access */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex items-center gap-3">
          <Code className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">API Access</h3>
        </div>
        <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
          Generate API keys for programmatic access to reviews
        </p>
        <button className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
          <Code className="mr-2 inline h-4 w-4" />
          Generate API Key
        </button>
      </div>
    </div>
  );
}

