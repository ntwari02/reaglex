import React, { useState } from 'react';
import {
  Settings,
  Mail,
  MessageSquare,
  Bell,
  Save,
  Clock,
  FileText,
  CheckCircle,
  XCircle,
} from 'lucide-react';

export default function SupportSystemTools() {
  const [autoReplyTime, setAutoReplyTime] = useState('2');
  const [autoCloseDuration, setAutoCloseDuration] = useState('7');
  const [slaResponseTime, setSlaResponseTime] = useState('4');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    // Handle save logic
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">System Settings</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Configure support system automation and templates
        </p>
      </div>

      {/* Settings Sections */}
      <div className="space-y-6">
        {/* Automation Settings */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Automation Settings
          </h3>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Default Auto-Reply Time (hours)
              </label>
              <input
                type="number"
                value={autoReplyTime}
                onChange={(e) => setAutoReplyTime(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Automatically send reply after this time if no response
              </p>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Ticket Auto-Close Duration (days)
              </label>
              <input
                type="number"
                value={autoCloseDuration}
                onChange={(e) => setAutoCloseDuration(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Automatically close inactive tickets after this duration
              </p>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                SLA Response Time (hours)
              </label>
              <input
                type="number"
                value={slaResponseTime}
                onChange={(e) => setSlaResponseTime(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Target response time for SLA compliance
              </p>
            </div>
          </div>
        </div>

        {/* Templates */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Templates</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
              <Mail className="mb-2 h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              <h4 className="mb-2 font-semibold text-gray-900 dark:text-white">Email Templates</h4>
              <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
                Manage email response templates
              </p>
              <button className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
                Manage
              </button>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
              <MessageSquare className="mb-2 h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              <h4 className="mb-2 font-semibold text-gray-900 dark:text-white">SMS Templates</h4>
              <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
                Manage SMS notification templates
              </p>
              <button className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
                Manage
              </button>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
              <Bell className="mb-2 h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              <h4 className="mb-2 font-semibold text-gray-900 dark:text-white">Push Templates</h4>
              <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
                Manage push notification templates
              </p>
              <button className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-emerald-400 dark:border-gray-700 dark:text-gray-300">
                Manage
              </button>
            </div>
          </div>
        </div>

        {/* Integrations */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Integrations</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-gray-200 p-4 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">WhatsApp</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Connect WhatsApp for support</p>
                </div>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input type="checkbox" className="peer sr-only" defaultChecked />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-500 peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-gray-700"></div>
              </label>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-gray-200 p-4 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">Email Provider</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Configure email service</p>
                </div>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input type="checkbox" className="peer sr-only" defaultChecked />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-500 peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-gray-700"></div>
              </label>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-gray-200 p-4 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">AI Classification</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Auto-categorize tickets using AI
                  </p>
                </div>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input type="checkbox" className="peer sr-only" />
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
    </div>
  );
}

