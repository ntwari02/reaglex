import React, { useState } from 'react';
import {
  Settings,
  Mail,
  MessageSquare,
  Smartphone,
  Webhook,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Save,
} from 'lucide-react';

export default function IntegrationSettings() {
  const [smtpSettings, setSmtpSettings] = useState({
    host: '',
    port: '',
    username: '',
    password: '',
    fromEmail: '',
  });

  const [smsSettings, setSmsSettings] = useState({
    provider: 'twilio',
    apiKey: '',
    apiSecret: '',
  });

  const [pushSettings, setPushSettings] = useState({
    fcmKey: '',
    fcmSecret: '',
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
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Integration Settings</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Configure email, SMS, and push notification providers
        </p>
      </div>

      {/* Email SMTP */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex items-center gap-3">
          <Mail className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Email SMTP Setup</h3>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">
              SMTP Host
            </label>
            <input
              type="text"
              value={smtpSettings.host}
              onChange={(e) => setSmtpSettings((prev) => ({ ...prev, host: e.target.value }))}
              placeholder="smtp.example.com"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">
              Port
            </label>
            <input
              type="text"
              value={smtpSettings.port}
              onChange={(e) => setSmtpSettings((prev) => ({ ...prev, port: e.target.value }))}
              placeholder="587"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">
              Username
            </label>
            <input
              type="text"
              value={smtpSettings.username}
              onChange={(e) => setSmtpSettings((prev) => ({ ...prev, username: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">
              Password
            </label>
            <input
              type="password"
              value={smtpSettings.password}
              onChange={(e) => setSmtpSettings((prev) => ({ ...prev, password: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">
              From Email
            </label>
            <input
              type="email"
              value={smtpSettings.fromEmail}
              onChange={(e) => setSmtpSettings((prev) => ({ ...prev, fromEmail: e.target.value }))}
              placeholder="noreply@example.com"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* SMS Provider */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex items-center gap-3">
          <MessageSquare className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">SMS Provider</h3>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">
              Provider
            </label>
            <select
              value={smsSettings.provider}
              onChange={(e) => setSmsSettings((prev) => ({ ...prev, provider: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option value="twilio">Twilio</option>
              <option value="africas_talking">Africa's Talking</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">
              API Key
            </label>
            <input
              type="text"
              value={smsSettings.apiKey}
              onChange={(e) => setSmsSettings((prev) => ({ ...prev, apiKey: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">
              API Secret
            </label>
            <input
              type="password"
              value={smsSettings.apiSecret}
              onChange={(e) => setSmsSettings((prev) => ({ ...prev, apiSecret: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Push Notifications */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex items-center gap-3">
          <Smartphone className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Push Notifications (FCM)</h3>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">
              FCM Key
            </label>
            <input
              type="text"
              value={pushSettings.fcmKey}
              onChange={(e) => setPushSettings((prev) => ({ ...prev, fcmKey: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold text-gray-700 dark:text-gray-300">
              FCM Secret
            </label>
            <input
              type="password"
              value={pushSettings.fcmSecret}
              onChange={(e) => setPushSettings((prev) => ({ ...prev, fcmSecret: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Webhooks */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex items-center gap-3">
          <Webhook className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Webhooks</h3>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">External System</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">https://api.example.com/webhook</p>
            </div>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
              Active
            </span>
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

