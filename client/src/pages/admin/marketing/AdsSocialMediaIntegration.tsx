import React, { useState, useEffect } from 'react';
import {
  Facebook,
  Instagram,
  Search,
  Video,
  CheckCircle,
  XCircle,
  Settings,
  BarChart3,
} from 'lucide-react';
import { adminMarketingAPI } from '@/lib/api';

interface AdIntegration {
  id: string;
  platform: 'facebook' | 'instagram' | 'google' | 'tiktok';
  status: 'connected' | 'disconnected';
  accountName: string;
  spend: number;
  conversions: number;
  roas: number;
}

interface Pixel {
  id: string;
  name: string;
  status: string;
  pixelId: string;
}

export default function AdsSocialMediaIntegration() {
  const [integrations, setIntegrations] = useState<AdIntegration[]>([]);
  const [pixels, setPixels] = useState<Pixel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      adminMarketingAPI.getAdIntegrations(),
      adminMarketingAPI.getPixels(),
    ])
      .then(([intRes, pixRes]) => {
        setIntegrations(intRes.integrations || []);
        setPixels(pixRes.pixels || []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  const getPlatformIcon = (platform: AdIntegration['platform']) => {
    switch (platform) {
      case 'facebook':
        return <Facebook className="h-5 w-5" />;
      case 'instagram':
        return <Instagram className="h-5 w-5" />;
      case 'google':
        return <Search className="h-5 w-5" />;
      case 'tiktok':
        return <Video className="h-5 w-5" />;
    }
  };

  const getStatusBadge = (status: AdIntegration['status']) => {
    return status === 'connected' ? (
      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
        Connected
      </span>
    ) : (
      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
        Disconnected
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Ads & Social Media Integration
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Manage external marketing integrations and ad accounts
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-900/20">
          <p className="text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}
      {loading ? (
        <div className="flex min-h-[120px] items-center justify-center rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <p className="text-gray-500 dark:text-gray-400">Loading integrations...</p>
        </div>
      ) : (
      <div className="grid gap-4 md:grid-cols-2">
        {integrations.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
            <p className="text-gray-500 dark:text-gray-400">No ad integrations yet.</p>
          </div>
        ) : integrations.map((integration) => (
          <div
            key={integration.id}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="mb-4 flex items-start justify-between">
              <div className="flex items-center gap-3">
                {getPlatformIcon(integration.platform)}
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white capitalize">
                    {integration.platform}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {integration.accountName}
                  </p>
                </div>
              </div>
              {getStatusBadge(integration.status)}
            </div>

            <div className="grid gap-4 md:grid-cols-3 mb-4">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Spend</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  ${integration.spend.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Conversions</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {integration.conversions}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">ROAS</p>
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {integration.roas}x
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <button className="flex-1 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
                <BarChart3 className="mr-1 inline h-4 w-4" />
                Analytics
              </button>
              <button className="flex-1 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
                <Settings className="mr-1 inline h-4 w-4" />
                Settings
              </button>
            </div>
          </div>
        ))}
      </div>
      )}

      {/* Pixel Tracking */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Conversion Tracking Pixels
        </h3>
        <div className="space-y-3">
          {pixels.length === 0 ? (
            <p className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-800/50 dark:text-gray-400">
              No pixels from backend.
            </p>
          ) : pixels.map((pixel) => (
            <div
              key={pixel.id}
              className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50"
            >
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{pixel.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">ID: {pixel.pixelId || '—'}</p>
              </div>
              {pixel.status === 'active' ? (
                <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <XCircle className="h-5 w-5 text-gray-400" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

