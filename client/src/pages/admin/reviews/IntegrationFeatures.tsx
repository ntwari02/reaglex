import React, { useState, useEffect } from 'react';
import {
  Link,
  CheckCircle,
  XCircle,
  Download,
  Upload,
  Code,
  Shield,
} from 'lucide-react';
import { adminReviewsAPI } from '@/lib/api';

export default function IntegrationFeatures() {
  const [verifiedPurchaseOnly, setVerifiedPurchaseOnly] = useState(true);
  const [helpfulScoring, setHelpfulScoring] = useState(true);
  const [integrations, setIntegrations] = useState<{ name: string; status: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminReviewsAPI.getIntegrationSettings()
      .then((res) => {
        setVerifiedPurchaseOnly(res.verifiedPurchaseOnly !== false);
        setHelpfulScoring(res.helpfulScoring !== false);
        setIntegrations(Array.isArray(res.thirdPartyIntegrations) ? res.thirdPartyIntegrations : []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = () => {
    setSaving(true);
    adminReviewsAPI.updateIntegrationSettings({ verifiedPurchaseOnly, helpfulScoring, thirdPartyIntegrations: integrations }).catch(() => setError('Failed to save')).finally(() => setSaving(false));
  };

  if (loading) {
    return (
      <div className="flex min-h-[120px] items-center justify-center rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <p className="text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Integration Features</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Advanced integrations and review display options
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-900/20">
          <p className="text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Display Options</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-amber-600 dark:text-amber-400" />
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
              <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-amber-500 peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-gray-700"></div>
            </label>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
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
              <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-amber-500 peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-gray-700"></div>
            </label>
          </div>
        </div>
        <button type="button" onClick={handleSave} disabled={saving} className="mt-4 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50">
          {saving ? 'Saving...' : 'Save display options'}
        </button>
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

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Third-Party Integrations
        </h3>
        <div className="space-y-3">
          {integrations.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No integrations from backend.</p>
          ) : integrations.map((integration) => (
            <div
              key={integration.name}
              className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50"
            >
              <div className="flex items-center gap-3">
                <Link className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {integration.name}
                </span>
              </div>
              {integration.status === 'connected' ? (
                <CheckCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
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

