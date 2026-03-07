import React, { useState, useEffect } from 'react';
import {
  Megaphone,
  Plus,
  Play,
  Pause,
  Edit,
  Eye,
  Calendar,
  Target,
  DollarSign,
  BarChart3,
} from 'lucide-react';
import { adminMarketingAPI } from '@/lib/api';

interface Campaign {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'paused' | 'ended' | 'scheduled';
  startDate: string;
  endDate: string;
  budget: number;
  revenue: number;
  conversions: number;
  target: string;
}

export default function CampaignManagement() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    adminMarketingAPI
      .getCampaigns()
      .then((res) => {
        const list = (res.campaigns || []).map((c: any) => ({
          id: c.id,
          name: c.name,
          type: c.type,
          status: c.status,
          startDate: c.startDate,
          endDate: c.endDate,
          budget: c.budget ?? 0,
          revenue: c.revenue ?? 0,
          conversions: c.conversions ?? 0,
          target: c.target,
        }));
        setCampaigns(list);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load campaigns'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const getStatusBadge = (status: Campaign['status']) => {
    const styles = {
      active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
      paused: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
      ended: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
      scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200',
    };
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${styles[status]}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Campaign Management</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Create and manage marketing campaigns
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-6 py-2 text-sm font-semibold text-white shadow-lg hover:shadow-xl"
        >
          <Plus className="mr-2 inline h-4 w-4" />
          Create Campaign
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-900/20">
          <p className="text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}
      {loading ? (
        <div className="flex min-h-[120px] items-center justify-center rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <p className="text-gray-500 dark:text-gray-400">Loading campaigns...</p>
        </div>
      ) : (
      <div className="space-y-4">
        {campaigns.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
            <p className="text-gray-500 dark:text-gray-400">No campaigns yet. Create one to get started.</p>
          </div>
        ) : campaigns.map((campaign) => (
          <div
            key={campaign.id}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="mb-3 flex items-center gap-3">
                  <Megaphone className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{campaign.name}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {campaign.type} • Target: {campaign.target}
                    </p>
                  </div>
                </div>

                <div className="mb-3 flex flex-wrap items-center gap-3">
                  {getStatusBadge(campaign.status)}
                  <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {new Date(campaign.startDate).toLocaleDateString()} -{' '}
                      {new Date(campaign.endDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-4">
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Budget</p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        ${campaign.budget.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Revenue</p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        ${campaign.revenue.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Target className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Conversions</p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {campaign.conversions}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <BarChart3 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">ROI</p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {((campaign.revenue / campaign.budget) * 100).toFixed(0)}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <button className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
                  <Eye className="mr-1 inline h-4 w-4" />
                  View
                </button>
                {campaign.status === 'active' ? (
                  <button className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-amber-400 dark:border-gray-700 dark:text-gray-300">
                    <Pause className="mr-1 inline h-4 w-4" />
                    Pause
                  </button>
                ) : (
                  <button className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
                    <Play className="mr-1 inline h-4 w-4" />
                    Resume
                  </button>
                )}
                <button className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
                  <Edit className="mr-1 inline h-4 w-4" />
                  Edit
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      )}
    </div>
  );
}

