import React, { useState } from 'react';
import { Users, ToggleLeft, ToggleRight, Mail, MessageSquare, Smartphone, Bell } from 'lucide-react';

export default function UserNotificationControl() {
  const [customerSettings, setCustomerSettings] = useState({
    orderUpdates: true,
    promotions: true,
    feedbackReminders: false,
  });

  const [sellerSettings, setSellerSettings] = useState({
    newOrderAlerts: true,
    paymentAlerts: true,
    accountStatusUpdates: true,
  });

  const [channelPreferences, setChannelPreferences] = useState({
    email: true,
    sms: true,
    push: true,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">User Notification Control</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Manage notification preferences for customers and sellers
        </p>
      </div>

      {/* Customer Settings */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex items-center gap-3">
          <Users className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Customer Settings</h3>
        </div>
        <div className="space-y-4">
          {Object.entries(customerSettings).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </span>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) =>
                    setCustomerSettings((prev) => ({ ...prev, [key]: e.target.checked }))
                  }
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-500 peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-gray-700"></div>
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Seller Settings */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex items-center gap-3">
          <Users className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Seller Settings</h3>
        </div>
        <div className="space-y-4">
          {Object.entries(sellerSettings).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </span>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) =>
                    setSellerSettings((prev) => ({ ...prev, [key]: e.target.checked }))
                  }
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-500 peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-gray-700"></div>
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Channel Preferences */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Channel Preferences
        </h3>
        <div className="space-y-4">
          {[
            { key: 'email', label: 'Email', icon: Mail },
            { key: 'sms', label: 'SMS', icon: MessageSquare },
            { key: 'push', label: 'Push Notifications', icon: Smartphone },
          ].map((channel) => {
            const Icon = channel.icon;
            return (
              <div
                key={channel.key}
                className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50"
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {channel.label}
                  </span>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={channelPreferences[channel.key as keyof typeof channelPreferences]}
                    onChange={(e) =>
                      setChannelPreferences((prev) => ({
                        ...prev,
                        [channel.key]: e.target.checked,
                      }))
                    }
                    className="peer sr-only"
                  />
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

