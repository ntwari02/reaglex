import React, { useState } from 'react';
import {
  Settings,
  Shield,
  User,
  Image,
  Clock,
  MessageSquare,
  Save,
  CheckCircle,
} from 'lucide-react';

export default function ReviewModuleSettings() {
  const [settings, setSettings] = useState({
    requireApproval: true,
    allowAnonymous: false,
    allowImages: true,
    editingWindow: 60,
    profanityFilter: 'medium',
    verifiedPurchaseOnly: true,
    helpfulScoring: true,
  });
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Review Module Settings
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Configure review system behavior and rules
        </p>
      </div>

      {/* Approval Settings */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex items-center gap-3">
          <Shield className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Approval Settings</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                Require Approval Before Publishing
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                All reviews must be approved before appearing publicly
              </p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={settings.requireApproval}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, requireApproval: e.target.checked }))
                }
                className="peer sr-only"
              />
              <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-500 peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-gray-700"></div>
            </label>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                Allow Anonymous Reviews
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Allow users to post reviews without account
              </p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={settings.allowAnonymous}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, allowAnonymous: e.target.checked }))
                }
                className="peer sr-only"
              />
              <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-500 peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-gray-700"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Media Settings */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex items-center gap-3">
          <Image className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Media Settings</h3>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              Allow Image Reviews
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Allow customers to upload images with reviews
            </p>
          </div>
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={settings.allowImages}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, allowImages: e.target.checked }))
              }
              className="peer sr-only"
            />
            <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-500 peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-gray-700"></div>
          </label>
        </div>
      </div>

      {/* Editing Settings */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex items-center gap-3">
          <Clock className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Editing Settings</h3>
        </div>
        <div>
          <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">
            Review Editing Time Window (minutes)
          </label>
          <input
            type="number"
            value={settings.editingWindow}
            onChange={(e) =>
              setSettings((prev) => ({ ...prev, editingWindow: Number(e.target.value) }))
            }
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Users can edit their review within this time after posting
          </p>
        </div>
      </div>

      {/* Profanity Filter */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex items-center gap-3">
          <Shield className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Profanity Filter</h3>
        </div>
        <div>
          <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">
            Filter Strength
          </label>
          <select
            value={settings.profanityFilter}
            onChange={(e) =>
              setSettings((prev) => ({ ...prev, profanityFilter: e.target.value }))
            }
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>

      {/* Seller Reply Permissions */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex items-center gap-3">
          <MessageSquare className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Seller Reply Permissions
          </h3>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              Require Approval for Seller Replies
            </span>
            <label className="relative inline-flex cursor-pointer items-center">
              <input type="checkbox" className="peer sr-only" defaultChecked />
              <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-500 peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-gray-700"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-8 py-3 text-sm font-semibold text-white shadow-lg hover:shadow-xl"
        >
          {saved ? (
            <>
              <CheckCircle className="mr-2 inline h-4 w-4" />
              Saved!
            </>
          ) : (
            <>
              <Save className="mr-2 inline h-4 w-4" />
              Save Settings
            </>
          )}
        </button>
      </div>
    </div>
  );
}

