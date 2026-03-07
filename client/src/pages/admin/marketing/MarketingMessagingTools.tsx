import React, { useState, useEffect } from 'react';
import {
  Mail,
  MessageCircle,
  Smartphone,
  Bell,
  Megaphone,
  Plus,
  BarChart3,
} from 'lucide-react';
import { adminMarketingAPI } from '@/lib/api';

interface MessageCampaign {
  id: string;
  name: string;
  channel: 'email' | 'sms' | 'push' | 'inapp' | 'popup';
  target: string;
  sent: number;
  opened: number;
  clicked: number;
  status: 'draft' | 'scheduled' | 'sent';
}

export default function MarketingMessagingTools() {
  const [campaigns, setCampaigns] = useState<MessageCampaign[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminMarketingAPI
      .getMessageCampaigns()
      .then((res) => setCampaigns(res.campaigns || []))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load campaigns'))
      .finally(() => setLoading(false));
  }, []);

  const getChannelIcon = (channel: MessageCampaign['channel']) => {
    switch (channel) {
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'sms':
        return <MessageCircle className="h-4 w-4" />;
      case 'push':
        return <Smartphone className="h-4 w-4" />;
      case 'inapp':
        return <Bell className="h-4 w-4" />;
      case 'popup':
        return <Megaphone className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Marketing Messaging Tools
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Broadcast messages to user segments across multiple channels
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
          <p className="text-gray-500 dark:text-gray-400">Loading message campaigns...</p>
        </div>
      ) : (
      <div className="space-y-4">
        {campaigns.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
            <p className="text-gray-500 dark:text-gray-400">No message campaigns yet.</p>
          </div>
        ) : campaigns.map((campaign) => (
          <div
            key={campaign.id}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="mb-3 flex items-center gap-3">
                  {getChannelIcon(campaign.channel)}
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{campaign.name}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {campaign.channel} • {campaign.target}
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Sent</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {campaign.sent.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Opened</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {campaign.opened.toLocaleString()}
                    </p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">
                      {((campaign.opened / campaign.sent) * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Clicked</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {campaign.clicked.toLocaleString()}
                    </p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">
                      {((campaign.clicked / campaign.opened) * 100).toFixed(1)}% CTR
                    </p>
                  </div>
                </div>
              </div>
              <button className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
                <BarChart3 className="mr-1 inline h-4 w-4" />
                Analytics
              </button>
            </div>
          </div>
        ))}
      </div>
      )}
    </div>
  );
}

