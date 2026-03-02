import React, { useState } from 'react';
import { Settings, Globe, Shield, FileText, Palette, DollarSign, Clock, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ToastContainer, useToast } from '@/components/ui/toast';

export default function PlatformSettings() {
  const { toasts, showToast, removeToast } = useToast();
  const [activeTab, setActiveTab] = useState<'general' | 'security' | 'legal' | 'payment'>('general');
  const [settings, setSettings] = useState({
    // General
    platformName: 'REAGLEX',
    platformEmail: 'support@reaglex.com',
    platformPhone: '+1 234 567 8900',
    timezone: 'UTC',
    currency: 'USD',
    language: 'en',
    maintenanceMode: false,
    // Security
    require2FA: false,
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    // Legal
    termsOfService: '',
    privacyPolicy: '',
    sellerAgreement: '',
    // Payment
    commissionRate: 10,
    transactionFee: 3,
    payoutDelay: 7,
  });

  const handleSave = () => {
    // Implement save logic
    console.log('Saving settings:', settings);
    showToast('Settings saved successfully!', 'success');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Platform Settings</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Configure platform-wide settings, security, and legal documents
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="p-4 space-y-2">
              <button
                onClick={() => setActiveTab('general')}
                className={`w-full text-left px-4 py-2 rounded-lg transition ${
                  activeTab === 'general'
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Globe className="h-4 w-4 inline mr-2" />
                General
              </button>
              <button
                onClick={() => setActiveTab('security')}
                className={`w-full text-left px-4 py-2 rounded-lg transition ${
                  activeTab === 'security'
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Shield className="h-4 w-4 inline mr-2" />
                Security
              </button>
              <button
                onClick={() => setActiveTab('legal')}
                className={`w-full text-left px-4 py-2 rounded-lg transition ${
                  activeTab === 'legal'
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <FileText className="h-4 w-4 inline mr-2" />
                Legal
              </button>
              <button
                onClick={() => setActiveTab('payment')}
                className={`w-full text-left px-4 py-2 rounded-lg transition ${
                  activeTab === 'payment'
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <DollarSign className="h-4 w-4 inline mr-2" />
                Payment
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            {/* General Settings */}
            {activeTab === 'general' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Globe className="h-6 w-6" />
                  General Settings
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Platform Name
                    </label>
                    <input
                      type="text"
                      value={settings.platformName}
                      onChange={(e) => setSettings({ ...settings, platformName: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Platform Email
                      </label>
                      <input
                        type="email"
                        value={settings.platformEmail}
                        onChange={(e) => setSettings({ ...settings, platformEmail: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Platform Phone
                      </label>
                      <input
                        type="tel"
                        value={settings.platformPhone}
                        onChange={(e) => setSettings({ ...settings, platformPhone: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                  </div>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Timezone
                      </label>
                      <select
                        value={settings.timezone}
                        onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      >
                        <option value="UTC">UTC</option>
                        <option value="America/New_York">EST</option>
                        <option value="America/Chicago">CST</option>
                        <option value="America/Denver">MST</option>
                        <option value="America/Los_Angeles">PST</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Currency
                      </label>
                      <select
                        value={settings.currency}
                        onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      >
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                        <option value="JPY">JPY</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Language
                      </label>
                      <select
                        value={settings.language}
                        onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      >
                        <option value="en">English</option>
                        <option value="es">Spanish</option>
                        <option value="fr">French</option>
                        <option value="de">German</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.maintenanceMode}
                      onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
                      className="mr-2"
                    />
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Enable Maintenance Mode
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Security Settings */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Shield className="h-6 w-6" />
                  Security Settings
                </h2>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.require2FA}
                      onChange={(e) => setSettings({ ...settings, require2FA: e.target.checked })}
                      className="mr-2"
                    />
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Require 2FA for Admin Accounts
                    </label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Session Timeout (minutes)
                    </label>
                    <input
                      type="number"
                      value={settings.sessionTimeout}
                      onChange={(e) => setSettings({ ...settings, sessionTimeout: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Max Login Attempts
                    </label>
                    <input
                      type="number"
                      value={settings.maxLoginAttempts}
                      onChange={(e) => setSettings({ ...settings, maxLoginAttempts: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Legal Settings */}
            {activeTab === 'legal' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <FileText className="h-6 w-6" />
                  Legal Documents
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Terms of Service
                    </label>
                    <textarea
                      value={settings.termsOfService}
                      onChange={(e) => setSettings({ ...settings, termsOfService: e.target.value })}
                      rows={10}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Enter terms of service..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Privacy Policy
                    </label>
                    <textarea
                      value={settings.privacyPolicy}
                      onChange={(e) => setSettings({ ...settings, privacyPolicy: e.target.value })}
                      rows={10}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Enter privacy policy..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Seller Agreement
                    </label>
                    <textarea
                      value={settings.sellerAgreement}
                      onChange={(e) => setSettings({ ...settings, sellerAgreement: e.target.value })}
                      rows={10}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Enter seller agreement..."
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Payment Settings */}
            {activeTab === 'payment' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <DollarSign className="h-6 w-6" />
                  Payment Settings
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Commission Rate (%)
                    </label>
                    <input
                      type="number"
                      value={settings.commissionRate}
                      onChange={(e) => setSettings({ ...settings, commissionRate: parseFloat(e.target.value) })}
                      min="0"
                      max="100"
                      step="0.1"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Percentage of each sale that goes to the platform
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Transaction Fee (%)
                    </label>
                    <input
                      type="number"
                      value={settings.transactionFee}
                      onChange={(e) => setSettings({ ...settings, transactionFee: parseFloat(e.target.value) })}
                      min="0"
                      max="100"
                      step="0.1"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Additional transaction processing fee
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Payout Delay (days)
                    </label>
                    <input
                      type="number"
                      value={settings.payoutDelay}
                      onChange={(e) => setSettings({ ...settings, payoutDelay: parseInt(e.target.value) })}
                      min="0"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Number of days before seller payouts are processed
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Save Button */}
            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 flex justify-end">
              <Button onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Save Settings
              </Button>
            </div>
          </div>
        </div>
      </div>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
